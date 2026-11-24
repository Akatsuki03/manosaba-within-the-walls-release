import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { isProxy } from 'node:util/types';
import {
  RELATIONSHIP_AUTHORING_POLICY, RELATIONSHIP_AUTHORING_LIMITS,
  normalizeRelationshipAuthoringInput, normalizeRelationshipCandidate, relationshipActorIds,
} from '../../public/player-creation-rules.mjs';

export { RELATIONSHIP_AUTHORING_LIMITS };
const hash = value => createHash('sha256').update(value).digest('hex');
const frozen = value => {
  if (value && typeof value === 'object') { Object.values(value).forEach(frozen); Object.freeze(value); }
  return value;
};
export function relationshipAuthoringInvalid(code = 'INVALID_CREATION') {
  throw Object.assign(new Error(code === 'ERR_MODEL_RESPONSE'
    ? '关系候选未通过安全与格式校验，原稿保持不变。'
    : '关系助手请求或当前来源无效，请核对草稿后重新请求。'), { code });
}

// This authoring witness is independent of the issued 13/14/15 world policies.
// Hash actual loaded sources, then reject disk drift rather than pretend hot
// code was loaded. Only source code is read; never CFG, saves or NPC/private DB.
export const RELATIONSHIP_AUTHORING_CONSUMERS = Object.freeze([
  'public/player-creation-rules.mjs', 'src/creation/relationship-authoring.mjs', 'src/agents/model-gateway.mjs',
  'src/agents/llm-settings.mjs', 'src/agents/agent-prompts.mjs', 'src/prologue.mjs', 'src/server.mjs',
  'public/player-creator.mjs', 'public/settings.js',
]);
function sourceHashes() {
  return Object.fromEntries(RELATIONSHIP_AUTHORING_CONSUMERS.map(path => [path,
    hash(readFileSync(new URL('../../' + path, import.meta.url)))]));
}
const loadedHashes = frozen(sourceHashes());
const consumerFingerprint = hash(JSON.stringify(loadedHashes));
export const RELATIONSHIP_AUTHORING_POLICY_FINGERPRINT = hash(JSON.stringify(RELATIONSHIP_AUTHORING_POLICY));
const descriptor = frozen({
  contract: RELATIONSHIP_AUTHORING_POLICY.contract,
  principal: { kind: 'service', id: 'setup_assistant', principalId: 'host:setup_assistant' },
  slot: 'relationships', codec: RELATIONSHIP_AUTHORING_POLICY.codec,
  sourceKind: 'creation-draft', version: 2, limits: { ...RELATIONSHIP_AUTHORING_LIMITS },
  policyFingerprint: RELATIONSHIP_AUTHORING_POLICY_FINGERPRINT, consumerFingerprint,
});
const descriptorFingerprint = hash(JSON.stringify(descriptor));
export function relationshipAuthoringDescriptor() {
  try { if (JSON.stringify(sourceHashes()) !== JSON.stringify(loadedHashes)) relationshipAuthoringInvalid(); }
  catch { relationshipAuthoringInvalid(); }
  return frozen({ ...descriptor, descriptorFingerprint, sourceHashes: { ...loadedHashes } });
}

// Do not evaluate caller getters/proxy traps while normalizing Host API data.
// HTTP JSON already has this shape; the same guard protects direct Host calls.
function publicData(value, active = new Set()) {
  if (!value || typeof value !== 'object') return;
  if (isProxy(value) || active.has(value)) relationshipAuthoringInvalid();
  const prototype = Object.getPrototypeOf(value);
  if (Array.isArray(value) ? prototype !== Array.prototype : ![Object.prototype, null].includes(prototype)) relationshipAuthoringInvalid();
  active.add(value);
  for (const key of Reflect.ownKeys(value)) {
    const field = Object.getOwnPropertyDescriptor(value, key);
    if (typeof key !== 'string' || !Object.hasOwn(field, 'value')
      || (!field.enumerable && !(Array.isArray(value) && key === 'length'))) relationshipAuthoringInvalid();
    publicData(field.value, active);
  }
  active.delete(value);
}
const grants = new WeakMap();
const consumed = new WeakSet();

/** Host mints one current draft grant. There is no persistent slot or world ID.
 * Browser input can neither supply a sourceSnapshot nor manufacture this grant. */
export function buildRelationshipAuthoringContext(raw) {
  publicData(raw);
  const input = normalizeRelationshipAuthoringInput(raw);
  if (Buffer.byteLength(JSON.stringify(input), 'utf8') > RELATIONSHIP_AUTHORING_LIMITS.normalizedInputBytes) relationshipAuthoringInvalid();
  const current = relationshipAuthoringDescriptor();
  const sourceSnapshot = { kind: 'creation-draft', contractVersion: 2,
    policyFingerprint: RELATIONSHIP_AUTHORING_POLICY_FINGERPRINT, draftHash: hash(JSON.stringify(input)),
    consumerFingerprint: current.consumerFingerprint, descriptorFingerprint: current.descriptorFingerprint };
  const context = frozen({ version: 2, role: 'setup_assistant', principal: { ...current.principal },
    slot: current.slot, codec: current.codec, budget: { ...RELATIONSHIP_AUTHORING_LIMITS },
    sourceSnapshot, data: input });
  grants.set(context, JSON.stringify(context));
  return context;
}
function assertContext(context) {
  if (!context || typeof context !== 'object' || isProxy(context) || !grants.has(context)) relationshipAuthoringInvalid();
  const current = relationshipAuthoringDescriptor();
  if (JSON.stringify(context) !== grants.get(context)
    || context.sourceSnapshot.consumerFingerprint !== current.consumerFingerprint
    || context.sourceSnapshot.descriptorFingerprint !== current.descriptorFingerprint
    || context.sourceSnapshot.draftHash !== hash(JSON.stringify(normalizeRelationshipAuthoringInput(context.data)))) relationshipAuthoringInvalid();
  return context;
}

/** Only the private codec consumes a minted grant, at most once before fetch. */
export function relationshipAuthoringPacket(context) {
  assertContext(context);
  if (consumed.has(context)) relationshipAuthoringInvalid();
  consumed.add(context);
  return context;
}
export function serializeRelationshipAuthoringPacket(context) {
  assertContext(context);
  const packet = JSON.stringify({ ...context.data, actorIds: relationshipActorIds(context.data.draft.playerMode) });
  if (Buffer.byteLength(packet, 'utf8') > RELATIONSHIP_AUTHORING_LIMITS.packetBytes) relationshipAuthoringInvalid();
  return packet;
}
export function normalizeRelationshipAuthoringOutput(context, raw) {
  try {
    assertContext(context);
    if (!consumed.has(context)) relationshipAuthoringInvalid();
    publicData(raw);
    const candidate = normalizeRelationshipCandidate(raw, context.data);
    const { kind, contractVersion, policyFingerprint, draftHash } = context.sourceSnapshot;
    const result = frozen({ kind: 'relationships', source: { kind, contractVersion, policyFingerprint, draftHash }, entries: candidate.entries });
    if (Buffer.byteLength(JSON.stringify(result), 'utf8') > RELATIONSHIP_AUTHORING_LIMITS.candidateHTTPBytes) relationshipAuthoringInvalid();
    return result;
  } catch { relationshipAuthoringInvalid('ERR_MODEL_RESPONSE'); }
}

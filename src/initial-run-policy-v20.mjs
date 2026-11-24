import { isDeepStrictEqual } from 'node:util';
import { isProxy } from 'node:util/types';
import { normalizeCreation } from '../public/player-creation-rules.mjs';
import { RP_FOUNDATION_RUNTIME_REVISION } from './runtime-capabilities.mjs';
import { RELATIONSHIP_RUNTIME_REVISION, INTENT_RUNTIME_REVISION, PLAN_CARDINALITY_RUNTIME_REVISION, isRelationshipRuntime } from './relationship-context-policy.mjs';

const fail = (code = 'INVALID_AGENT_JOB', message = '初始玩法配置的来源或封存绑定不一致。') => {
  throw Object.assign(new Error(message), { code });
};
const exact = (value, keys) => value !== null && typeof value === 'object' && !isProxy(value)
  && Object.getPrototypeOf(value) === Object.prototype && Reflect.ownKeys(value).length === keys.length
  && keys.every(key => { const d = Object.getOwnPropertyDescriptor(value, key); return d?.enumerable && Object.hasOwn(d, 'value'); });
const identifier = value => typeof value === 'string' && value.length > 0 && value.length <= 256 && !/[\u0000-\u001f\u007f]/u.test(value);
const digestReference = value => typeof value === 'string' && /^[a-f0-9]{64}$/u.test(value);

export function assertFoundationCreation(creation, runtimeRevision) {
  if (creation?.version !== 2) return creation;
  const id = typeof runtimeRevision === 'string' ? runtimeRevision : runtimeRevision?.id;
  const reject = message => fail('INVALID_CREATION', message);
  if (id === PLAN_CARDINALITY_RUNTIME_REVISION && creation.playPolicy?.cases === 'excluded' && (creation.scenarioId || creation.storyArcId))
    reject('固定案件起点或预制案件故事弧与本局排除案件的初始边界冲突；创建草稿未被修改。');
  if (isRelationshipRuntime(id)) {
    if (creation.scenarioId || creation.storyArcId) reject('创建资料 v2 不支持固定案件起点或预制案件故事弧。');
    return creation;
  }
  if (id !== RP_FOUNDATION_RUNTIME_REVISION) reject('当前执行修订不支持创建资料 v2。');
  if (creation.relationships.length) reject('当前基础修订仅支持空关系条目；关系初始化尚未开放。');
  if (creation.playPolicy.cases !== 'allowed') reject('当前基础修订不支持排除案件。');
  if (creation.playPolicy.boundaries.length) reject('当前基础修订尚不支持自然语言玩法边界。');
  if (creation.scenarioId || creation.storyArcId) reject('创建资料 v2 基础暂不支持固定案件起点或预制案件故事弧。');
  return creation;
}

export function composeInitialRunPolicy({ creation, runId, setupRef, executionRevision }) {
  if (creation?.version !== 2) return undefined;
  creation = normalizeCreation(creation);
  assertFoundationCreation(creation, executionRevision?.revisionId);
  if (!identifier(runId) || !digestReference(setupRef)
    || !exact(executionRevision, ['schemaVersion', 'revisionId', 'policyRef', 'policyFingerprint'])
    || executionRevision.schemaVersion !== 1 || ![PLAN_CARDINALITY_RUNTIME_REVISION].includes(executionRevision.revisionId)
    || executionRevision.policyRef !== 'agent-runtime-policy@20'
    || !digestReference(executionRevision.policyFingerprint)) fail();
  const relationship = isRelationshipRuntime(executionRevision.revisionId);
  return Object.freeze({ version: relationship ? 2 : 1,
    source: Object.freeze({ runId, setupRef, creationVersion: 2, executionRevision: Object.freeze({ ...executionRevision }) }),
    directorPreferences: creation.directorPreferences,
    playPolicy: Object.freeze(relationship ? { cases: creation.playPolicy.cases, boundaries: Object.freeze([...creation.playPolicy.boundaries]) }
      : { cases: 'allowed', boundaries: Object.freeze([]) }) });
}

// With no second argument this checks the wire contract only. The Engine and
// turn store always supply their independently reconstructed immutable source.
export function assertInitialRunPolicy(value, expected) {
  if (arguments.length < 2) expected = value;
  if (value === undefined && expected === undefined) return undefined;
  if (!exact(value, ['version', 'source', 'directorPreferences', 'playPolicy']) || ![1, 2].includes(value.version)
    || !exact(value.source, ['runId', 'setupRef', 'creationVersion', 'executionRevision']) || value.source.creationVersion !== 2) fail();
  let canonical;
  try {
    canonical = composeInitialRunPolicy({ creation: { version: 2, directorPreferences: value.directorPreferences, playPolicy: value.playPolicy },
      runId: value.source.runId, setupRef: value.source.setupRef, executionRevision: value.source.executionRevision });
  } catch { fail(); }
  if (!isDeepStrictEqual(value, canonical) || !isDeepStrictEqual(value, expected)) fail();
  return canonical;
}

// Explicit @20 implementation; the dispatcher preserves the executable v12
// asset for all historical identities. No identity is relabelled here. State creation is the immutable root configuration;
// packet consumers additionally prove the sealed source through the Domain.
export function initialBoundaryPolicy(value) {
  const sealed = value?.source?.executionRevision?.revisionId === PLAN_CARDINALITY_RUNTIME_REVISION;
  if (!sealed && value?.agentRuntimeRevision !== PLAN_CARDINALITY_RUNTIME_REVISION) return null;
  const policy = sealed ? value.playPolicy : value.creation?.playPolicy;
  if (!policy || !['allowed', 'excluded'].includes(policy.cases) || !Array.isArray(policy.boundaries)) fail();
  return policy;
}
export const requiresInitialBoundaryReview = value => Boolean(initialBoundaryPolicy(value)?.boundaries.length);
export function initialBoundaryRules(value) {
  return (initialBoundaryPolicy(value)?.boundaries || []).map(boundary => {
    // Whole, finite clauses only. An exception or extra clause is NOT silently
    // discarded: it stays semantic and must be clarified when uncertain.
    const clause = boundary.trim().replace(/[。！!]$/u, '');
    const topic = /^不要出现字面文本「([^「」\r\n]{1,32})」$/u.exec(clause);
    return topic ? { kind: 'literal-text', topic: topic[1] } : { kind: 'semantic' };
  });
}
const caseKinds = new Set(['identify', 'adopt', 'resume', 'prepare', 'record-preparation', 'fix-gaze', 'attack', 'report', 'case', 'execution', 'discovery']);
export function initialMechanismDecision(value, kind, { semantic = false } = {}) {
  const policy = initialBoundaryPolicy(value); if (!policy) return null;
  const rules = initialBoundaryRules(value);
  if (caseKinds.has(kind) && policy.cases === 'excluded') return 'initial_cases_excluded';
  // Free prose is never an injury immunity, new setting or magic rule. Direct
  // typed effect APIs have no semantic service: unsupported meaning clarifies
  // before publication. Explicit literal-publication boundaries have a real
  // deterministic consumer below; they do not forbid the physical effect.
  if (!semantic && ['magic', 'execution'].includes(kind) && rules.some(row => row.kind === 'semantic')) return 'initial_policy_clarification';
  return null;
}
export function initialPublicBoundaryConflict(value, output) {
  const rules = initialBoundaryRules(value); const strings = [];
  const visit = row => {
    if (!row || typeof row !== 'object') return;
    for (const [key, child] of Object.entries(row)) {
      if (['text', 'action', 'utterance'].includes(key) && typeof child === 'string') strings.push(child);
      else if (child && typeof child === 'object') visit(child);
    }
  };
  visit(output);
  return rules.some(row => row.kind === 'literal-text' && strings.some(text => text.includes(row.topic)));
}
export function assertInitialBoundaryTransition(before, after, { magic = false } = {}) {
  if (!initialBoundaryPolicy(before)) return;
  if (!isDeepStrictEqual(before.creation?.playPolicy, after.creation?.playPolicy)) fail('INITIAL_POLICY_CONFLICT', '普通行动不能修改本局初始玩法边界。');
  const reject = reason => fail(reason === 'initial_policy_clarification' ? 'INITIAL_POLICY_CLARIFICATION' : 'INITIAL_POLICY_CONFLICT', '这项实际操作与本局初始玩法边界冲突或尚需澄清；没有执行该操作，也没有改写世界规则。');
  if (magic) { const reason = initialMechanismDecision(before, 'magic'); if (reason) reject(reason); }
  const player = before.creation.playerMode === 'custom' ? 'player' : before.creation.actorId;
  const publicEntries = (after.entries || []).slice(before.entries?.length || 0).filter(row => row.delivery !== 'reflection'
    && (!Array.isArray(row.audienceIds) || row.audienceIds.includes(player)));
  if (initialPublicBoundaryConflict(before, publicEntries)) reject('initial_publication_conflict');
  const old = before.caseRuntime, next = after.caseRuntime;
  const caseChanged = Boolean(after.caseOne && !before.caseOne || after.storyArc && !before.storyArc
    || next && ((next.plans?.length || 0) > (old?.plans?.length || 0) || (next.incidents?.length || 0) > (old?.incidents?.length || 0)
      || !isDeepStrictEqual(next.procedure ?? null, old?.procedure ?? null)));
  const death = Object.entries(next?.conditionsByActor || {}).some(([id, row]) => ['dead', 'executed'].includes(row?.status || row)
    && !['dead', 'executed'].includes(old?.conditionsByActor?.[id]?.status || old?.conditionsByActor?.[id]));
  if (caseChanged || death) { const reason = initialMechanismDecision(before, 'case'); if (reason) reject(reason); }

}

// A public-only model verdict is never permission for an unseen case effect.
// Match real changed case-operation receipts to the exact events presented in
// the public document. Unknown/unrepresented effects clarify without exposing
// their private facts to the reviewer or adopting any detached world prefix.
export function initialBoundaryHasUnreviewedCaseChange(before, after, events, publicEvents) {
  if (!initialBoundaryRules(before).some(row => row.kind === 'semantic')) return false;
  const old = before.caseRuntime, next = after.caseRuntime;
  if (!next || ['plans', 'incidents', 'procedure', 'conditionsByActor'].every(field =>
    isDeepStrictEqual(old?.[field] ?? null, next[field] ?? null))) return false;
  const changed = (next.operations || []).filter(row => caseKinds.has(row.kind)
    && !isDeepStrictEqual(row, old?.operations?.find(prior => prior.id === row.id)));
  if (!changed.length) return true;
  const publicIds = new Set(publicEvents.map(row => row.id));
  return changed.some(operation => {
    const sources = events.filter(row => row.entry?.observationKey?.startsWith(`case:${operation.id}:`));
    return !sources.length || sources.some(row => !publicIds.has(row.id));
  });
}

export function validateInitialBoundaryAssessments(policy, assessments) {
  const boundaries = initialBoundaryPolicy(policy)?.boundaries;
  if (!boundaries || !Array.isArray(assessments) || isProxy(assessments) || assessments.length !== boundaries.length
    || Reflect.ownKeys(assessments).length !== assessments.length + 1) fail('INVALID_AGENT_OUTPUT');
  for (let index = 0; index < assessments.length; index++) {
    const row = assessments[index];
    if (!exact(row, ['index', 'status']) || row.index !== index || !['compatible', 'conflict', 'uncertain'].includes(row.status)) fail('INVALID_AGENT_OUTPUT');
  }
  return assessments.every(row => row.status === 'compatible');
}

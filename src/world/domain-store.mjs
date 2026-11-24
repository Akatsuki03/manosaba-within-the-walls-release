import { buildRoleplayContext } from '../agents/agent-boundaries.mjs';
import { applyCooperativeRephraseResult, captureCooperativeRephrase, SOFT_SLOT } from '../agents/cooperative-rephrase.mjs';
import { hasSoftRuntime, hasSemanticOrdinaryRuntime } from '../content/relationship-context-policy.mjs';
import { sceneBeatsDraft, setSceneStageClocks, setSceneDomainStore } from '../scenes/scene-beats.mjs';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { openSqliteScope, withSqliteScopeOwner, assertSqliteScopeOwner } from '../host/sqlite-scope-owner.mjs';
import { runtimeCapabilityId } from '../content/runtime-capabilities.mjs';
import { isRelationshipRuntime } from '../content/relationship-context-policy.mjs';
import { relationshipOwnerBlueprint } from '../creation/relationship-setup.mjs';
import { composeInitialRunPolicy } from '../content/initial-run-policy.mjs';
import { EVENT_DIRECTOR_RUNTIME_REVISION } from '../director/director-event-runtime.mjs';
import { captureHiddenSupplyChoice, hiddenSupplyA2Source, hiddenSupplyJobPin, initializeHiddenSupply, playerAssemblyOccurrence, publishHiddenSupply, publishHiddenSupplyA2, readHiddenSupply, registerHiddenSupplyRoot } from './hidden-supply.mjs';
import { PRIVATE_SUPPLY_OBSERVATION_EVENT } from '../cognition/private-supply-observation.mjs';
import { initializeRunPolicyAuthority, readRunPolicyAuthority, prepareRunPolicyAdoption, isRunPolicyReceiptAncestor } from './run-policy-authority.mjs';
import { RandomDrawLedger, RNG_VERSION, canonicalJson } from './random-draws.mjs';
import { validateMagicBranchRequest } from './magic/magic-timeline.mjs';
import { validateMagicIdentity, bodyForMind, grantMatchesIdentity } from './magic/magic-identity.mjs';
import { reduceMagicEffect, establishOriginalSwapReturnAuthority, restoreOriginalSwapRelation } from './magic/magic-effects.mjs';
import { magicDefinition, magicJson, magicExact, magicId, abilityDigest, MAGIC_PROTOCOL } from './magic/ability-definitions.mjs';
import { MagicRepository, validateRosterMagicState, knownMagicActions } from './magic/ability-runtime.mjs';
import { applyCustomAbilityWorld, refreshHostMagic, hostMagicCapabilities, executeHostMagic, attachNpcMagicProjection } from './magic/magic-host.mjs';
import { MagicCognitionStore, publishMagicCognition } from './magic/magic-cognition.mjs';
import { prisonClock } from './prison-activity.mjs';
import { guardEnabled } from './guard-reaction.mjs';
import { CognitionStore } from '../cognition/cognition-store.mjs';
import { customAbilityProfileFact } from '../cognition/witchbook-cognition.mjs';
import { isDeepStrictEqual } from 'node:util';
import { isProxy } from 'node:util/types';
import { DecisionStateStore } from '../cognition/decision-state.mjs';
import { psychologySeedBlueprint } from '../cognition/psychology-profile.mjs';
const CUSTOM_SOURCE_HASH = "";
const customPresentation = () => { throw new Error("Legacy fixtures are not included in this distribution."); };
const PROTOTYPE_SCENARIO_REF = "unsupported-legacy";
const parsePrototypeIntent = () => { throw new Error("Legacy fixtures are not included in this distribution."); };
import { AGENT_SCENARIO_REF } from '../content/agent-scenario.mjs';
import { parseAgentIntent, applyAgentAction } from '../agent-play.mjs';
import { activeProcedure, executionLifeAction, applyProcedureExecution } from '../cases/case-procedure.mjs';
import { actorsForState, createdPlayerId, CREATED_SETUP_REF, CREATED_ROOMS, relationshipRootForRows } from '../creation/player-setup.mjs';
import { ownerWorldFacts, PRISON_WORLD_REF, prisonRulebook } from '../content/card-world.mjs';
import { buildBallotInstrumentContext } from '../cases/ballot-instrument-assertions.mjs';
import { assertNarrativeBallotInstrument } from '../agents/narrative-guards.mjs';
import { hasCaseOne, CASE_ONE_REF } from '../cases/case-one.mjs';
import { runtimeContinuousScene, hasCaseRuntime, occupiedBodyWorld, runtimeBodyActorId, runtimePhysicalRoom, runtimeSwapReady } from '../case-runtime.mjs';
import { CONTENT_REVISIONS, runtimeRevisionForState, guardRuleReference } from '../content/content-revisions.mjs';
import { actorObservationId, observationPerformer } from '../characters/observation-identity.mjs';
import { abilityRuleReference } from './magic/ability-definitions.mjs';
import { caseItemPolicyPin } from '../cases/case-item-policy.mjs';
import { hasBunkSupplement, bunkStartingKnowledge, bunkKnowledgeClassification, bunkPsychologyBlueprint, usesBunkSettingV2 } from './prison-bunks.mjs';

import { buildDurableMemoryAcquisitionPlan, assertDurableMemoryAcquisitionPlan } from '../cognition/durable-memory-acquisition.mjs';
import { compileTrustedGrowthProfile, planMagicGrowthEvents, growthMetadataDigest } from './magic/magic-growth-events.mjs';
import { applyProtocolGrowthObligations } from './magic/ability-runtime.mjs';

import { CustomAbilityStore } from './magic/custom-ability-store.mjs';
import { compileCustomAbilityInterpretation, bridgeCustomAbilityCatalogDeclaration, restoreCustomAbilityCatalogDeclaration, CUSTOM_ABILITY_EXECUTABLE_COMPILER_REF } from './magic/custom-ability-compiler.mjs';
import { validateCustomAbilityAuthorConfirmation } from './magic/custom-ability-contracts.mjs';
import { CUSTOM_ABILITY_MECHANISMS, CUSTOM_ABILITY_RUNTIME_CAPABILITIES, planInterpretedCustomAbilityUse } from './magic/custom-ability-runtime.mjs';
import { COGNITION_AUTHORIZED_SQL, COGNITION_HISTORY_SQL } from '../cognition/cognition-access-policy.mjs';
import { runtimeActive, runtimeRoom } from '../case-runtime.mjs';

const GROWTH_QUALIFICATION = 'explicit-protocol-profile-not-production';
const growthSchema = {
  domain_growth_declarations: `declaration_id TEXT PRIMARY KEY,run_id TEXT NOT NULL REFERENCES domain_runs(run_id),
    commit_ref TEXT NOT NULL REFERENCES domain_commits(commit_ref),body_id TEXT NOT NULL,factor_id TEXT NOT NULL,
    data_json TEXT NOT NULL,integrity_hash TEXT NOT NULL,schema_version INTEGER NOT NULL CHECK(schema_version=1)`,
  domain_growth_evidence: `event_id TEXT PRIMARY KEY,run_id TEXT NOT NULL REFERENCES domain_runs(run_id),
    commit_ref TEXT NOT NULL REFERENCES domain_commits(commit_ref),declaration_id TEXT NOT NULL REFERENCES domain_growth_declarations(declaration_id),
    episode_id TEXT NOT NULL,role TEXT NOT NULL,data_json TEXT NOT NULL,integrity_hash TEXT NOT NULL,
    schema_version INTEGER NOT NULL CHECK(schema_version=1),UNIQUE(run_id,episode_id,role)`,
  domain_growth_applications: `application_id TEXT PRIMARY KEY,run_id TEXT NOT NULL REFERENCES domain_runs(run_id),
    commit_ref TEXT NOT NULL UNIQUE REFERENCES domain_commits(commit_ref),source_head_ref TEXT NOT NULL REFERENCES domain_commits(commit_ref),
    use_id TEXT NOT NULL,deepening_event_id TEXT NOT NULL REFERENCES domain_growth_evidence(event_id),
    command_json TEXT NOT NULL,plan_json TEXT NOT NULL,projection_hash TEXT NOT NULL,integrity_hash TEXT NOT NULL,
    schema_version INTEGER NOT NULL CHECK(schema_version=1),UNIQUE(run_id,use_id),UNIQUE(run_id,deepening_event_id)`,
  domain_growth_factor_slots: `slot_id TEXT PRIMARY KEY,run_id TEXT NOT NULL REFERENCES domain_runs(run_id),
    commit_ref TEXT NOT NULL REFERENCES domain_commits(commit_ref),application_id TEXT NOT NULL REFERENCES domain_growth_applications(application_id),
    body_id TEXT NOT NULL,factor_id TEXT NOT NULL,data_json TEXT NOT NULL,integrity_hash TEXT NOT NULL,
    schema_version INTEGER NOT NULL CHECK(schema_version=1),UNIQUE(application_id,body_id,factor_id)`,
};
import { assemblePlayerTaskRecall, assembleNpcDecisionTaskPayload, finalizeActorTaskPacket,
  playerPerformanceTaskData, npcDecisionTaskInput } from '../agents/actor-task-packets.mjs';
import { actorPerception, playerPerceivedScene } from '../characters/actor-perception.mjs';
import { agentScene } from '../agent-play.mjs';
import { actorForState } from '../creation/player-setup.mjs';

export const DURABLE_EXECUTION_REF = 'host-durable-memory-execution@1';
const durablePolicy = Object.freeze({ ref: 'user-gameplay-policy@20261024-v1',
  fingerprint: abilityDigest({ executionRef: DURABLE_EXECUTION_REF, policy: 'scene-durable-all;complete-lawful-owned-at-cast;no-consent;no-ttl;no-stream' }) });
const durableChannels = new WeakMap();
const durableSchema = {
  domain_durable_acquisitions: `acquisition_id TEXT PRIMARY KEY,commit_ref TEXT NOT NULL UNIQUE REFERENCES domain_commits(commit_ref),
    source_head_ref TEXT NOT NULL REFERENCES domain_commits(commit_ref),run_id TEXT NOT NULL REFERENCES domain_runs(run_id),
    branch_id TEXT NOT NULL REFERENCES domain_branches(branch_id),use_id TEXT NOT NULL,execution_ref TEXT NOT NULL CHECK(execution_ref='host-durable-memory-execution@1'),
    command_json TEXT NOT NULL,plan_json TEXT NOT NULL,result_json TEXT NOT NULL,integrity_hash TEXT NOT NULL,schema_version INTEGER NOT NULL CHECK(schema_version=1),UNIQUE(run_id,use_id)`,
  cognition_durable_origins: `observation_id TEXT PRIMARY KEY REFERENCES cognition_observations(id),acquisition_id TEXT NOT NULL REFERENCES domain_durable_acquisitions(acquisition_id),
    commit_ref TEXT NOT NULL REFERENCES domain_commits(commit_ref),recipient_owner_id TEXT NOT NULL,recipient_mind_id TEXT NOT NULL,
    source_owner_id TEXT NOT NULL,source_mind_id TEXT NOT NULL,source_observation_id TEXT NOT NULL REFERENCES cognition_observations(id),
    source_commit_ref TEXT NOT NULL REFERENCES domain_commits(commit_ref),schema_version INTEGER NOT NULL CHECK(schema_version=1),UNIQUE(acquisition_id,recipient_mind_id,source_observation_id)`,
  domain_durable_delivery_receipts: `receipt_id TEXT PRIMARY KEY,acquisition_id TEXT NOT NULL REFERENCES domain_durable_acquisitions(acquisition_id),
    recipient_mind_id TEXT NOT NULL,job_id TEXT NOT NULL,slot TEXT NOT NULL,task_input_hash TEXT NOT NULL,
    delivery_commit_ref TEXT NOT NULL REFERENCES domain_commits(commit_ref),observation_ids_json TEXT NOT NULL,
    schema_version INTEGER NOT NULL CHECK(schema_version=1),UNIQUE(acquisition_id,recipient_mind_id,job_id,slot)`,
};
export const DOMAIN_SCHEMA_VERSION = 1;
const RULES_REF = 'prologue-fixture-rules@1';
const MESSAGES = Object.freeze({
  INVALID_DOMAIN_STATE: '领域历史或来源校验失败，未修改当前进度。',
  INVALID_DOMAIN_TRANSACTION: '领域写入必须包含在宿主提交事务内。',
  INVALID_SAVE_ANCHOR: '存档锚点或其恢复依赖不一致，未修改当前进度。',
  INVALID_ROOT_SEED: '剧情种子须为六十四位小写十六进制字符。',
  INVALID_STORY_FORK: '故事回溯依据不完整或已失效；请暂停并保留当前进度，未裁定永久死亡。',
  UNSUPPORTED_DOMAIN_VERSION: '此领域资料版本暂不受支持，原始资料保持不变。',
  SOURCE_VERSION_MISMATCH: '领域历史使用了不同的场景或规则版本，未修改当前进度。',
});
const fail = code => { throw Object.assign(new Error(MESSAGES[code] || MESSAGES.INVALID_DOMAIN_STATE), { code }); };
const hash = text => createHash('sha256').update(text).digest('hex');
const integer = (value, minimum = 0) => Number.isSafeInteger(value) && value >= minimum;
function canonical(value) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number' && Number.isSafeInteger(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && Object.getPrototypeOf(value) === Object.prototype) {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  }
  fail('INVALID_DOMAIN_STATE');
}
const digest = value => hash(canonical(value));
function parse(json) {
  try { return JSON.parse(json); } catch { fail('INVALID_DOMAIN_STATE'); }
}
function ballotCaseSourceRefs(state, entry) {
  if (state.exampleId !== 'agent' || runtimeCapabilityId(state.agentRuntimeRevision) !== 'agent-prison-runtime@8'
    || ['narration', 'reflection'].includes(entry.delivery)) return [];
  if (hasCaseOne(state) || entry.observationKey?.startsWith('story-arc:case-one-day3@1:')) {
    return [{ caseRef: `fixed:${runtimeRevisionForState(state).caseOneHash}`, kind: 'delivery' }];
  }
  const runtime = state.caseRuntime; if (!runtime) return [];
  const refs = [];
  for (const incident of runtime.incidents || []) {
    if (entry.observationKey?.startsWith(`case:discovery:${incident.id}:`)
      || runtime.procedure?.incidentId === incident.id && entry.occurredAt >= runtime.procedure.reportedAt) {
      refs.push({ caseRef: `causal:${incident.id}`, kind: 'delivery' });
    }
    if (incident.causeOperationId && entry.observationKey?.startsWith(`case:${incident.causeOperationId}:`)) {
      refs.push({ caseRef: `operation:${incident.causeOperationId}`, kind: 'operation' });
    }
  }
  // Real preparatory operations can precede incident creation. Preserve their
  // host operation link now; later ballot selection binds the actual incident.
  for (const operation of runtime.operations || []) if (entry.observationKey?.startsWith(`case:${operation.id}:`)) {
    for (const ref of [`operation:${operation.id}`, ...(operation.planId ? [`plan:${operation.planId}`] : [])]) {
      if (!refs.some(row => row.caseRef === ref)) refs.push({ caseRef: ref, kind: 'operation' });
    }
  }
  return refs;
}
function ballotCaseScope(state, actorId) {
  if (hasCaseOne(state)) return { caseRef: `fixed:${runtimeRevisionForState(state).caseOneHash}`,
    since: state.storyArc?.deliveredAt ?? 0,
    // Existing @8 deliveries predate the additive case sidecar. Their immutable
    // actual event keys, not world truth or prose matching, supply source IDs.
    requiredObservationIds: [...state.entries, ...(state.agentAutonomy?.events || [])]
      .filter(row => row.audienceIds?.includes(actorId) && row.observationKey?.startsWith('story-arc:case-one-day3@1:'))
      .map(row => actorObservationId(state, row.observationKey, actorId)) };
  const procedure = state.caseRuntime?.procedure;
  const incident = state.caseRuntime?.incidents?.find(row => row.id === procedure?.incidentId);
  if (!procedure || !incident) fail('INVALID_DOMAIN_STATE');
  const operation = state.caseRuntime.operations?.find(row => row.id === incident.causeOperationId);
  const related = new Set([incident.causeOperationId, ...(operation?.planId
    ? (state.caseRuntime.operations || []).filter(row => row.planId === operation.planId).map(row => row.id) : [])].filter(Boolean));
  return { caseRef: `causal:${incident.id}`, since: incident.occurredAt,
    requiredObservationIds: [...state.entries, ...(state.agentAutonomy?.events || [])]
      .filter(row => row.audienceIds?.includes(actorId) && [...related].some(id => row.observationKey?.startsWith(`case:${id}:`)))
      .map(row => actorObservationId(state, row.observationKey, actorId)),
    ...(operation?.planId ? { operationRef: `plan:${operation.planId}` }
      : incident.causeOperationId ? { operationRef: `operation:${incident.causeOperationId}` } : {}) };
}
function presented(state) { return state.exampleId === 'custom' ? customPresentation(state).entries : state.entries; }
function story(state) {
  // Envelope upgrades, migrated floor IDs and execution fences are NOT a new
  // story. This fingerprint still binds every gameplay and cosmetic field.
  const { generation, revision, turnIds, restoredFrom, stateFormatVersion, customFormatVersion, customSourceHash, ...body } = state;
  return { ...body, exampleId: state.exampleId || 'emma', entries: presented(state) };
}
export const domainFingerprint = state => digest(story(state));
const PARSED_AGENT_NATIVE = Object.freeze({
  root: globalThis, json: JSON, object: Object, array: Array, number: Number, symbol: Symbol, speciesKey: Symbol.species,
  parse: JSON.parse, stringify: JSON.stringify, own: Object.getOwnPropertyDescriptor, keys: Object.keys, proto: Object.getPrototypeOf, isArray: Array.isArray,
  objectPrototype: Object.prototype, arrayPrototype: Array.prototype, map: Array.prototype.map, sort: Array.prototype.sort, join: Array.prototype.join, push: Array.prototype.push, isSafe: Number.isSafeInteger,
  arraySpecies: Object.getOwnPropertyDescriptor(Array, Symbol.species),
});
const parsedAgentData = (object, key) => {
  const descriptor = PARSED_AGENT_NATIVE.own(object, key);
  return descriptor && PARSED_AGENT_NATIVE.own(descriptor, 'value');
};
const parsedAgentValue = (object, key) => parsedAgentData(object, key)?.value;
const parsedAgentIntrinsicsStable = () => {
  const N = PARSED_AGENT_NATIVE, species = N.own(N.array, N.speciesKey);
  const speciesGet = species && N.own(species, 'get'), speciesSet = species && N.own(species, 'set'), speciesValue = species && N.own(species, 'value');
  return parsedAgentValue(N.root, 'JSON') === N.json && parsedAgentValue(N.root, 'Object') === N.object && parsedAgentValue(N.root, 'Array') === N.array
    && parsedAgentValue(N.root, 'Number') === N.number && parsedAgentValue(N.root, 'Symbol') === N.symbol && parsedAgentValue(N.symbol, 'species') === N.speciesKey
    && parsedAgentValue(N.json, 'parse') === N.parse && parsedAgentValue(N.json, 'stringify') === N.stringify
    && parsedAgentValue(N.object, 'keys') === N.keys && parsedAgentValue(N.object, 'getOwnPropertyDescriptor') === N.own && parsedAgentValue(N.object, 'getPrototypeOf') === N.proto
    && parsedAgentValue(N.object, 'prototype') === N.objectPrototype && parsedAgentValue(N.array, 'isArray') === N.isArray && parsedAgentValue(N.array, 'prototype') === N.arrayPrototype
    && parsedAgentValue(N.arrayPrototype, 'constructor') === N.array && parsedAgentValue(N.arrayPrototype, 'map') === N.map && parsedAgentValue(N.arrayPrototype, 'sort') === N.sort
    && parsedAgentValue(N.arrayPrototype, 'join') === N.join && parsedAgentValue(N.arrayPrototype, 'push') === N.push && parsedAgentValue(N.number, 'isSafeInteger') === N.isSafe
    && speciesGet && speciesGet.value === parsedAgentValue(N.arraySpecies, 'get') && speciesSet && speciesSet.value === parsedAgentValue(N.arraySpecies, 'set') && !speciesValue;
};
function parsedAgentCanonical(value) {
  const N = PARSED_AGENT_NATIVE;
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return N.stringify(value);
  if (typeof value === 'number' && N.isSafe(value)) return N.stringify(value);
  if (N.isArray(value)) {
    let out = '[';
    for (let index = 0; index < value.length; index += 1) out += (index ? ',' : '') + parsedAgentCanonical(value[index]);
    return out + ']';
  }
  if (!value || N.proto(value) !== N.objectPrototype) fail('INVALID_DOMAIN_STATE');
  const keys = N.keys(value);
  keys.sort();
  let out = '{';
  for (let index = 0; index < keys.length; index += 1) out += (index ? ',' : '') + `${N.stringify(keys[index])}:${parsedAgentCanonical(value[keys[index]])}`;
  return out + '}';
}
export function parsedAgentSnapshotFingerprint(json) {
  const N = PARSED_AGENT_NATIVE;
  if (typeof json !== 'string' || !parsedAgentIntrinsicsStable()) return domainFingerprint(parse(json));
  let parsed;
  try { parsed = N.parse(json); } catch { fail('INVALID_DOMAIN_STATE'); }
  if (!parsed || typeof parsed !== 'object' || N.isArray(parsed) || N.proto(parsed) !== N.objectPrototype) return domainFingerprint(parsed);
  const example = parsedAgentData(parsed, 'exampleId'), entries = parsedAgentData(parsed, 'entries');
  if (!example || example.value !== 'agent' || !entries || !N.isArray(entries.value)) return domainFingerprint(parsed);
  return hash(parsedAgentCanonical(story(parsed)));
}
// A synchronous Host transaction may read the same committed snapshot many
// times. Reuse only the computation over exact SQLite bytes, never a row,
// the caller's state, branch authorization, ownership, or an ancestry proof.
const verifiedDomainBytes = new WeakMap();
export function withVerifiedDomainCommitBytes(db, work) {
  if (db.isTransaction !== true) fail('INVALID_DOMAIN_TRANSACTION');
  if (verifiedDomainBytes.has(db)) return work();
  verifiedDomainBytes.set(db, new Map());
  try { return work(); }
  finally { verifiedDomainBytes.delete(db); }
}
function validCommitSnapshot(db, row) {
  const scope = verifiedDomainBytes.get(db);
  const memo = scope && db.isTransaction === true && parsedAgentIntrinsicsStable() ? scope : null;
  const checked = memo?.get(row.commit_ref);
  if (checked && checked.json === row.snapshot_json && checked.byteHash === row.snapshot_hash
    && checked.storyHash === row.story_fingerprint) {
    memo.delete(row.commit_ref); memo.set(row.commit_ref, checked); return true;
  }
  if (hash(row.snapshot_json) !== row.snapshot_hash || parsedAgentSnapshotFingerprint(row.snapshot_json) !== row.story_fingerprint) return false;
  // Bounded recency, not first-four-ever: a full journal visits a new exact
  // checkpoint on every floor. Keep only the same four byte-proof entries.
  if (memo) {
    memo.delete(row.commit_ref);
    if (memo.size >= 4) memo.delete(memo.keys().next().value);
    memo.set(row.commit_ref, { json: row.snapshot_json, byteHash: row.snapshot_hash, storyHash: row.story_fingerprint });
  }
  return true;
}
const scenario = state => {
  if (state.exampleId === 'agent') {
    const runtime = runtimeRevisionForState(state);
    return hasCaseOne(state) && !state.creation?.storyArcId ? `${CASE_ONE_REF}:${runtime.caseOneHash}`
      : state.creation ? `${CREATED_SETUP_REF}:loop-${state.creation.loop}:${runtime.scenarioHash}`
        : `${runtime.scenarioRef}:${runtime.scenarioHash}`;
  }
  return state.exampleId === 'prototype' ? PROTOTYPE_SCENARIO_REF
    : state.exampleId === 'custom' ? `yakumo-xiao@${CUSTOM_SOURCE_HASH}` : 'emma-prologue@1';
};
const rulesFor = scenarioRef => scenarioRef.startsWith(CASE_ONE_REF + ':') ? 'case-one-procedure@1:six-abilities@1' : scenarioRef.startsWith(CREATED_SETUP_REF + ':') ? 'created-prison-rules@1:six-abilities@1' : scenarioRef.startsWith(AGENT_SCENARIO_REF + ':') ? 'agent-prison-rules@1' : scenarioRef === PROTOTYPE_SCENARIO_REF ? 'daily-prototype-rules@1' : RULES_REF;
const causalVersionRefs = state => hasCaseRuntime(state)
  ? { causalCases: { version: state.caseRuntime.version, rules: state.caseRuntime.rulesRef } } : {};
const versionKey = state => `${state.generation}:${state.revision}`;
const playerId = state => state.exampleId === 'custom' ? 'xiao' : createdPlayerId(state);
const commitFields = ['commit_ref', 'run_id', 'branch_id', 'parent_commit_ref', 'previous_execution_ref', 'sequence',
  'generation', 'revision', 'world_time', 'kind', 'causal_key', 'snapshot_json', 'snapshot_hash', 'story_fingerprint',
  'turn_depth', 'legacy_event_id', 'schema_version'];
const runFields = ['run_id', 'root_seed', 'rng_version', 'scenario_ref', 'rules_ref', 'initial_config_hash',
  'initial_setup_ref', 'random_lineage_ref', 'seed_origin', 'schema_version'];
const anchorFields = ['anchor_ref', 'run_id', 'branch_id', 'commit_ref', 'snapshot_ref', 'cognition_watermarks',
  'random_manifest', 'version_refs', 'schema_version'];
const selected = (row, fields) => Object.fromEntries(fields.map(key => [key, row[key]]));
// Unforgeable and connection-local. Only runMemoryChannel can create entries;
// neither a JSON certificate nor a Domain-shaped object can issue authority.
const memoryChannels = new WeakMap();
const memoryGate = hook => { throw Object.assign(new Error('记忆通道缺少已审核的来源规则；世界保持不变。'), {
  code: 'MAGIC_HOST_RULE_GATED', requiredHook: hook, disposition: 'pause-without-world-commit',
  hostDiagnostic: { version: 1, channel: 'memory-source-effect', policyDecision: hook } }); };

// recordWithSwapLifecycle has already authenticated the exact prepared
// establish/restore after-state. Both establish (first occupancy or a later
// cycle after a real return) and restore are transition records, not ordinary
// mirror edits; every other act still takes the normal occupied-body audit.
export function isPreparedSwapTransition(swapWrite, state) {
  return Boolean(swapWrite && state?.caseRuntime?.occupiedBody
    && ['magic_swap_establish', 'magic_swap_restore'].includes(swapWrite.command?.type));
}

/** First vertical adapter for the domain repositories. The fixed prologue is
 * still reduced/validated by PrologueEngine, whose old tables remain validated
 * compatibility snapshots during this incremental migration. These immutable
 * records identify runs, causal history, knowledge and save dependencies.
 * No host repository below is exposed as a browser/model tool.
 * The caller owns ONE transaction including the old projections and outbox.
 */
export class DomainStore {
  #db;
  #random;
  #cognition;
  #decisions;
  #storyWrite;
  #magicWrite;
  #magicBaselineWrite;
  #durableWrite;
  #swapWrite;
  #customWrite;
  #customRoot;
  #durableChannel;
  #durableTaskPreflight;
  #rootTaskPreflight;
  #lifeWrite;
  #memoryPolicy;
  #memoryChannel;
  constructor(db, { memoryChannelPolicy, durableTaskPreflight, rootTaskPreflight, decisionStatementCache = false } = {}) {
    // HOST-only engine projection. This callback cannot authorize sources:
    // Domain derives every source/body/plan before invoking it synchronously.
    if (typeof decisionStatementCache !== 'boolean') fail('INVALID_DOMAIN_STATE');
    if (durableTaskPreflight !== undefined && typeof durableTaskPreflight !== 'function') fail('INVALID_DOMAIN_STATE');
    this.#durableTaskPreflight = durableTaskPreflight;
    if (rootTaskPreflight !== undefined && typeof rootTaskPreflight !== 'function') fail('INVALID_DOMAIN_STATE');
    this.#rootTaskPreflight = rootTaskPreflight;
    if (memoryChannelPolicy !== undefined) {
      // Executable HOST policy is deliberately not a JSON approval API. Until
      // P01/P02/growth are settled only explicitly qualified protocol policies
      // can exercise the complete consumer path; production defaults gate.
      if (!memoryChannelPolicy || isProxy(memoryChannelPolicy)
        || Object.getPrototypeOf(memoryChannelPolicy) !== Object.prototype
        || Reflect.ownKeys(memoryChannelPolicy).some(key => !Object.hasOwn(Object.getOwnPropertyDescriptor(memoryChannelPolicy, key), 'value'))
        || !magicExact(memoryChannelPolicy, ['ref', 'qualification', 'resolve', 'connectionAuthorizer'])
        || memoryChannelPolicy.connectionAuthorizer !== null && typeof memoryChannelPolicy.connectionAuthorizer !== 'function'
        || !magicId(memoryChannelPolicy.ref)
        || memoryChannelPolicy.qualification !== 'explicit-protocol-policy-not-production'
        || typeof memoryChannelPolicy.resolve !== 'function') fail('MAGIC_MEMORY_POLICY_INVALID');
      // node:sqlite has no authorizer getter. Require explicit HOST ownership:
      // null declares no existing policy; otherwise supply the ACTUAL callback
      // already installed on this connection for composition and restoration.
      // No inference from policy JSON/ref or a silently assumed null owner.
      this.#memoryPolicy = Object.freeze({ ...memoryChannelPolicy });
    }
    this.#db = db;
    this.#random = new RandomDrawLedger(db);
    this.#cognition = new CognitionStore(db);
    // Default fresh; even a HOST cache request never applies on a connection
    // that carries a memoryChannelPolicy (externally owned authorizer path).
    this.#decisions = new DecisionStateStore(db, { cacheLatest: decisionStatementCache === true && memoryChannelPolicy === undefined });
  }
  #transaction() { if (!this.#db.isTransaction) fail('INVALID_DOMAIN_TRANSACTION'); }
  #immutable(table) {
    // REPLACE can delete a conflicting row without firing DELETE triggers.
    // Guard EVERY unique key, not only the primary identity (e.g. a new commit
    // UUID must not replace the old generation/revision or event mapping).
    const keys = this.#db.prepare(`PRAGMA index_list(${table})`).all().filter(index => index.unique)
      .map(index => this.#db.prepare(`PRAGMA index_info("${index.name}")`).all().map(column => column.name));
    if (!keys.length || keys.some(key => !key.length || key.some(name => !/^[a-z_]+$/u.test(name)))) fail('INVALID_DOMAIN_STATE');
    const collision = keys.map(key => `(${key.map(name => `${name}=NEW.${name}`).join(' AND ')})`).join(' OR ');
    this.#db.exec(`CREATE TRIGGER IF NOT EXISTS ${table}_immutable_update BEFORE UPDATE ON ${table}
      BEGIN SELECT RAISE(ABORT,'immutable domain record'); END;
      CREATE TRIGGER IF NOT EXISTS ${table}_immutable_delete BEFORE DELETE ON ${table}
      BEGIN SELECT RAISE(ABORT,'immutable domain record'); END;
      CREATE TRIGGER IF NOT EXISTS ${table}_immutable_replace BEFORE INSERT ON ${table}
      WHEN EXISTS(SELECT 1 FROM ${table} WHERE ${collision})
      BEGIN SELECT RAISE(ABORT,'immutable domain record'); END;`);
  }
  initialize() {
    this.#transaction();
    this.#db.exec(`CREATE TABLE IF NOT EXISTS domain_custom_visibility_roots (run_id TEXT PRIMARY KEY REFERENCES domain_runs(run_id),root_commit_ref TEXT NOT NULL UNIQUE REFERENCES domain_commits(commit_ref),version INTEGER NOT NULL CHECK(version=1));
      CREATE TABLE IF NOT EXISTS custom_ability_root_requests (request_id TEXT PRIMARY KEY, data_json TEXT NOT NULL, data_hash TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS custom_ability_preset_drafts (preset_id TEXT NOT NULL, preset_version INTEGER NOT NULL, draft_id TEXT NOT NULL, draft_revision INTEGER NOT NULL, data_json TEXT NOT NULL, data_hash TEXT NOT NULL, PRIMARY KEY(preset_id,preset_version));
      CREATE TABLE IF NOT EXISTS custom_ability_interpretations (job_id TEXT PRIMARY KEY, data_json TEXT NOT NULL, data_hash TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS custom_ability_author_actions (action_id TEXT PRIMARY KEY, request_id TEXT NOT NULL UNIQUE, definition_id TEXT NOT NULL, revision INTEGER NOT NULL, data_json TEXT NOT NULL, data_hash TEXT NOT NULL, UNIQUE(definition_id,revision));
      CREATE TABLE IF NOT EXISTS domain_custom_bindings (binding_id TEXT PRIMARY KEY, run_id TEXT NOT NULL, root_commit_ref TEXT NOT NULL, definition_id TEXT NOT NULL, revision INTEGER NOT NULL, data_json TEXT NOT NULL, data_hash TEXT NOT NULL, UNIQUE(run_id,definition_id,revision));
      CREATE TABLE IF NOT EXISTS domain_custom_uses (commit_ref TEXT PRIMARY KEY, run_id TEXT NOT NULL, request_id TEXT NOT NULL, source_commit_ref TEXT NOT NULL, data_json TEXT NOT NULL, data_hash TEXT NOT NULL, UNIQUE(run_id,request_id));
      CREATE TABLE IF NOT EXISTS domain_custom_effects (effect_id TEXT PRIMARY KEY, commit_ref TEXT NOT NULL, data_json TEXT NOT NULL, data_hash TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS domain_custom_receipts (commit_ref TEXT PRIMARY KEY, data_json TEXT NOT NULL, data_hash TEXT NOT NULL);`);
    for (const name of ['domain_custom_visibility_roots','custom_ability_root_requests','custom_ability_preset_drafts','custom_ability_interpretations','custom_ability_author_actions','domain_custom_bindings','domain_custom_uses','domain_custom_effects','domain_custom_receipts']) this.#immutable(name);
    this.#db.exec(`CREATE TRIGGER IF NOT EXISTS domain_custom_visibility_roots_sealed BEFORE INSERT ON domain_custom_visibility_roots
      WHEN EXISTS(SELECT 1 FROM domain_save_anchors WHERE commit_ref=NEW.root_commit_ref) BEGIN SELECT RAISE(ABORT,'sealed generic visibility root'); END;`);
    for (const name of ['domain_custom_bindings','domain_custom_uses','domain_custom_effects','domain_custom_receipts']) {
      const column = name === 'domain_custom_bindings' ? 'root_commit_ref' : 'commit_ref';
      this.#db.exec(`CREATE TRIGGER IF NOT EXISTS ${name}_sealed BEFORE INSERT ON ${name} WHEN EXISTS(SELECT 1 FROM domain_save_anchors WHERE commit_ref=NEW.${column}) BEGIN SELECT RAISE(ABORT,'sealed generic ability'); END;`);
    }
    this.#db.exec(`CREATE TABLE IF NOT EXISTS domain_swap_lifecycle (
      commit_ref TEXT PRIMARY KEY REFERENCES domain_commits(commit_ref),source_commit_ref TEXT NOT NULL,
      request_id TEXT NOT NULL,operation TEXT NOT NULL,command_json TEXT NOT NULL,command_hash TEXT NOT NULL,
      result_hash TEXT NOT NULL,proof_json TEXT NOT NULL);
      CREATE TRIGGER IF NOT EXISTS swap_lifecycle_sealed BEFORE INSERT ON domain_swap_lifecycle
      WHEN EXISTS(SELECT 1 FROM domain_save_anchors WHERE commit_ref=NEW.commit_ref)
      BEGIN SELECT RAISE(ABORT,'sealed swap lifecycle'); END;`);
    this.#immutable('domain_swap_lifecycle');
    this.#db.exec(`CREATE TABLE IF NOT EXISTS domain_swap_contacts (
      evidence_id TEXT PRIMARY KEY,commit_ref TEXT NOT NULL REFERENCES domain_commits(commit_ref),
      job_id TEXT NOT NULL,actor_id TEXT NOT NULL,event_json TEXT NOT NULL,event_hash TEXT NOT NULL);
      CREATE TRIGGER IF NOT EXISTS swap_contact_sealed BEFORE INSERT ON domain_swap_contacts
      WHEN EXISTS(SELECT 1 FROM domain_save_anchors WHERE commit_ref=NEW.commit_ref)
      BEGIN SELECT RAISE(ABORT,'sealed swap contact'); END;`);
    this.#immutable('domain_swap_contacts');
    this.#db.exec(`CREATE TABLE IF NOT EXISTS domain_execution_life (
      commit_ref TEXT PRIMARY KEY REFERENCES domain_commits(commit_ref), source_commit_ref TEXT NOT NULL,
      request_id TEXT NOT NULL, verdict_id TEXT NOT NULL, death_id TEXT NOT NULL REFERENCES domain_story_deaths(death_id),
      proof_json TEXT NOT NULL, proof_hash TEXT NOT NULL);
      CREATE TRIGGER IF NOT EXISTS domain_execution_life_sealed BEFORE INSERT ON domain_execution_life
      WHEN EXISTS(SELECT 1 FROM domain_save_anchors WHERE commit_ref=NEW.commit_ref)
      BEGIN SELECT RAISE(ABORT,'sealed execution life'); END;`);
    this.#immutable('domain_execution_life');
    this.#db.exec(`CREATE TABLE IF NOT EXISTS domain_occupied_primaries (
      commit_ref TEXT PRIMARY KEY REFERENCES domain_commits(commit_ref),
      source_commit_ref TEXT NOT NULL REFERENCES domain_commits(commit_ref),
      command_json TEXT NOT NULL, command_hash TEXT NOT NULL);
      CREATE TRIGGER IF NOT EXISTS occupied_primary_sealed BEFORE INSERT ON domain_occupied_primaries
      WHEN EXISTS(SELECT 1 FROM domain_save_anchors WHERE commit_ref=NEW.commit_ref)
      BEGIN SELECT RAISE(ABORT,'sealed occupied primary'); END;`);
    this.#immutable('domain_occupied_primaries');
    this.#db.exec(`CREATE TABLE IF NOT EXISTS domain_memory_channels (
      commit_ref TEXT PRIMARY KEY REFERENCES domain_commits(commit_ref), source_commit_ref TEXT NOT NULL,
      policy_ref TEXT NOT NULL, qualification TEXT NOT NULL, command_json TEXT NOT NULL, input_json TEXT NOT NULL,
      law_json TEXT NOT NULL, records_json TEXT NOT NULL, publication_hash TEXT NOT NULL);
      CREATE TRIGGER IF NOT EXISTS domain_memory_channels_no_update BEFORE UPDATE ON domain_memory_channels BEGIN SELECT RAISE(ABORT,'immutable memory channel'); END;
      CREATE TRIGGER IF NOT EXISTS domain_memory_channels_no_delete BEFORE DELETE ON domain_memory_channels BEGIN SELECT RAISE(ABORT,'immutable memory channel'); END;
      CREATE TRIGGER IF NOT EXISTS domain_memory_channels_no_replace BEFORE INSERT ON domain_memory_channels
      WHEN EXISTS(SELECT 1 FROM domain_memory_channels WHERE commit_ref=NEW.commit_ref) BEGIN SELECT RAISE(ABORT,'immutable memory channel'); END;`);
    this.#db.exec(`CREATE TABLE IF NOT EXISTS domain_schema(id INTEGER PRIMARY KEY CHECK(id=1), version INTEGER NOT NULL);
      INSERT INTO domain_schema VALUES(1,1) ON CONFLICT(id) DO NOTHING;`);
    if (this.#db.prepare('SELECT version FROM domain_schema WHERE id=1').get()?.version !== DOMAIN_SCHEMA_VERSION) fail('UNSUPPORTED_DOMAIN_VERSION');
    this.#db.exec(`
      CREATE TABLE IF NOT EXISTS domain_runs (
        run_id TEXT PRIMARY KEY, root_seed TEXT NOT NULL CHECK(length(root_seed)=64), rng_version TEXT NOT NULL,
        scenario_ref TEXT NOT NULL, rules_ref TEXT NOT NULL, initial_config_hash TEXT NOT NULL,
        initial_setup_ref TEXT NOT NULL UNIQUE, random_lineage_ref TEXT NOT NULL,
        seed_origin TEXT NOT NULL CHECK(seed_origin IN ('native','legacy_future_only')),
        schema_version INTEGER NOT NULL CHECK(schema_version=1), integrity_hash TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS domain_setups (
        setup_ref TEXT PRIMARY KEY, run_id TEXT NOT NULL UNIQUE REFERENCES domain_runs(run_id),
        configuration TEXT NOT NULL, manifest TEXT NOT NULL, schema_version INTEGER NOT NULL CHECK(schema_version=1)
      );
      CREATE TABLE IF NOT EXISTS domain_branches (
        branch_id TEXT PRIMARY KEY, run_id TEXT NOT NULL REFERENCES domain_runs(run_id),
        parent_id TEXT REFERENCES domain_branches(branch_id), fork_commit_ref TEXT REFERENCES domain_commits(commit_ref),
        branch_kind TEXT NOT NULL CHECK(branch_kind IN ('root','load','rewind')),
        random_lineage_ref TEXT NOT NULL, inheritance_policy_ref TEXT NOT NULL CHECK(inheritance_policy_ref='technical-history@1'),
        schema_version INTEGER NOT NULL CHECK(schema_version=1)
      );
      CREATE TABLE IF NOT EXISTS domain_commits (
        commit_ref TEXT PRIMARY KEY, run_id TEXT NOT NULL REFERENCES domain_runs(run_id),
        branch_id TEXT NOT NULL REFERENCES domain_branches(branch_id), parent_commit_ref TEXT REFERENCES domain_commits(commit_ref),
        previous_execution_ref TEXT REFERENCES domain_commits(commit_ref), sequence INTEGER NOT NULL CHECK(sequence>=0),
        generation INTEGER NOT NULL CHECK(generation>0), revision INTEGER NOT NULL CHECK(revision>=0),
        world_time INTEGER NOT NULL CHECK(world_time>=0), kind TEXT NOT NULL,
        causal_key TEXT NOT NULL, snapshot_json TEXT NOT NULL, snapshot_hash TEXT NOT NULL,
        story_fingerprint TEXT NOT NULL, turn_depth INTEGER NOT NULL CHECK(turn_depth>=0),
        legacy_event_id INTEGER NOT NULL UNIQUE, schema_version INTEGER NOT NULL CHECK(schema_version=1),
        integrity_hash TEXT NOT NULL, UNIQUE(generation,revision)
      );
      CREATE INDEX IF NOT EXISTS domain_commit_parent ON domain_commits(parent_commit_ref);
      CREATE TABLE IF NOT EXISTS domain_world_events (
        event_ref TEXT PRIMARY KEY, run_id TEXT NOT NULL REFERENCES domain_runs(run_id),
        branch_id TEXT NOT NULL REFERENCES domain_branches(branch_id), commit_ref TEXT NOT NULL REFERENCES domain_commits(commit_ref),
        kind TEXT NOT NULL, payload TEXT NOT NULL, payload_hash TEXT NOT NULL,
        schema_version INTEGER NOT NULL CHECK(schema_version=1)
      );
      CREATE INDEX IF NOT EXISTS domain_event_commit ON domain_world_events(commit_ref);
      CREATE TABLE IF NOT EXISTS domain_actions (
        action_ref TEXT PRIMARY KEY, run_id TEXT NOT NULL REFERENCES domain_runs(run_id),
        branch_id TEXT NOT NULL REFERENCES domain_branches(branch_id), commit_ref TEXT NOT NULL UNIQUE REFERENCES domain_commits(commit_ref),
        turn_ref TEXT NOT NULL UNIQUE, actor_id TEXT NOT NULL, intent_key TEXT NOT NULL,
        causal_key TEXT NOT NULL, input_fingerprint TEXT NOT NULL, schema_version INTEGER NOT NULL CHECK(schema_version=1)
      );
      CREATE TABLE IF NOT EXISTS domain_turn_aliases (
        turn_ref TEXT PRIMARY KEY, action_ref TEXT NOT NULL REFERENCES domain_actions(action_ref)
      );
      CREATE TABLE IF NOT EXISTS domain_commit_draws (
        commit_ref TEXT NOT NULL REFERENCES domain_commits(commit_ref), draw_id TEXT NOT NULL REFERENCES domain_random_draws(draw_id),
        PRIMARY KEY(commit_ref,draw_id)
      );
      CREATE TABLE IF NOT EXISTS domain_save_anchors (
        anchor_ref TEXT PRIMARY KEY, run_id TEXT NOT NULL REFERENCES domain_runs(run_id),
        branch_id TEXT NOT NULL REFERENCES domain_branches(branch_id), commit_ref TEXT NOT NULL UNIQUE REFERENCES domain_commits(commit_ref),
        snapshot_ref TEXT NOT NULL, cognition_watermarks TEXT NOT NULL, random_manifest TEXT NOT NULL,
        version_refs TEXT NOT NULL, schema_version INTEGER NOT NULL CHECK(schema_version=1), integrity_hash TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS domain_save_slots (
        slot_id TEXT PRIMARY KEY, slot_version INTEGER NOT NULL CHECK(slot_version>0),
        anchor_ref TEXT NOT NULL REFERENCES domain_save_anchors(anchor_ref)
      );
      CREATE TABLE IF NOT EXISTS domain_head (
        id INTEGER PRIMARY KEY CHECK(id=1), run_id TEXT NOT NULL REFERENCES domain_runs(run_id),
        branch_id TEXT NOT NULL REFERENCES domain_branches(branch_id), commit_ref TEXT NOT NULL REFERENCES domain_commits(commit_ref)
      );
    `);
    // Additive namespace: v1 branch CHECKs and technical-history@1 are frozen.
    // Story identities are NOT masqueraded as v1 load/rewind branches. The
    // v1 commit branch remains an authorization namespace; narrative ancestry
    // is still the actual restored anchor, never the abandoned future.
    this.#db.exec(`
      CREATE TABLE IF NOT EXISTS domain_story_anchors (
        anchor_id TEXT PRIMARY KEY, commit_ref TEXT NOT NULL REFERENCES domain_commits(commit_ref),
        actor_id TEXT NOT NULL, mind_id TEXT NOT NULL, at INTEGER NOT NULL, day INTEGER NOT NULL,
        policy_ref TEXT NOT NULL CHECK(policy_ref='morning-waking@1'), identity_json TEXT NOT NULL,
        evidence_event_ref TEXT NOT NULL REFERENCES domain_world_events(event_ref), integrity_hash TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS domain_story_deaths (
        death_id TEXT PRIMARY KEY, commit_ref TEXT NOT NULL REFERENCES domain_commits(commit_ref),
        actor_id TEXT NOT NULL, mind_id TEXT NOT NULL, body_id TEXT NOT NULL, at INTEGER NOT NULL,
        day INTEGER NOT NULL, identity_json TEXT NOT NULL, evidence_event_ref TEXT NOT NULL REFERENCES domain_world_events(event_ref),
        integrity_hash TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS domain_story_branches (
        branch_id TEXT PRIMARY KEY, branch_kind TEXT NOT NULL CHECK(branch_kind='story_magic'),
        namespace_ref TEXT NOT NULL CHECK(namespace_ref='domain-story@1'),
        policy_ref TEXT NOT NULL CHECK(policy_ref='owner-mind-source-closure@1'),
        request_id TEXT NOT NULL UNIQUE, request_fingerprint TEXT NOT NULL, request_json TEXT NOT NULL,
        validation_json TEXT NOT NULL,
        source_execution_ref TEXT NOT NULL REFERENCES domain_commits(commit_ref),
        anchor_id TEXT NOT NULL REFERENCES domain_story_anchors(anchor_id),
        authorization_branch_id TEXT NOT NULL REFERENCES domain_branches(branch_id),
        activation TEXT NOT NULL, snapshot_json TEXT NOT NULL, snapshot_hash TEXT NOT NULL,
        random_lineage_ref TEXT NOT NULL, receipt_json TEXT NOT NULL, integrity_hash TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS domain_story_commit_memberships (
        commit_ref TEXT PRIMARY KEY REFERENCES domain_commits(commit_ref),
        story_branch_id TEXT NOT NULL REFERENCES domain_story_branches(branch_id)
      );
      CREATE TABLE IF NOT EXISTS domain_story_reaction_queue (
        reaction_ref TEXT PRIMARY KEY, death_id TEXT NOT NULL UNIQUE REFERENCES domain_story_deaths(death_id),
        commit_ref TEXT NOT NULL REFERENCES domain_commits(commit_ref),
        certificate_json TEXT NOT NULL, integrity_hash TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS domain_story_reactions (
        death_id TEXT PRIMARY KEY REFERENCES domain_story_deaths(death_id),
        commit_ref TEXT NOT NULL REFERENCES domain_commits(commit_ref),
        phase_limit INTEGER NOT NULL, completed_phase_ids TEXT NOT NULL,
        command_json TEXT NOT NULL, result_json TEXT NOT NULL, integrity_hash TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS domain_story_save_pins (
        anchor_ref TEXT PRIMARY KEY REFERENCES domain_save_anchors(anchor_ref),
        story_branch_id TEXT NOT NULL REFERENCES domain_story_branches(branch_id),
        policy_ref TEXT NOT NULL CHECK(policy_ref='owner-mind-source-closure@1'),
        request_fingerprint TEXT NOT NULL
      );
    `);
    for (const table of ['domain_story_anchors', 'domain_story_deaths', 'domain_story_branches', 'domain_story_commit_memberships', 'domain_story_save_pins', 'domain_story_reactions', 'domain_story_reaction_queue']) this.#immutable(table);
    for (const table of ['domain_story_reaction_queue', 'domain_story_reactions']) this.#db.exec(`
      CREATE TRIGGER IF NOT EXISTS ${table}_sealed_commit BEFORE INSERT ON ${table}
      WHEN EXISTS(SELECT 1 FROM domain_save_anchors WHERE commit_ref=NEW.commit_ref)
      BEGIN SELECT RAISE(ABORT,'sealed story reaction'); END;`);
    initializeRunPolicyAuthority(this.#db);
    initializeHiddenSupply(this.#db);
    this.#random.initialize();
    this.#cognition.initialize();
    this.#decisions.initialize();
    // Retry reservations are execution metadata, not sealed story evidence.
    // Immutable binding survives failed completion/close; resolution shares the
    // actual successful act (or explicit branch cancellation) transaction.
    const growthRetrySchema = {
      domain_growth_reservations: `reservation_id TEXT PRIMARY KEY,run_id TEXT NOT NULL REFERENCES domain_runs(run_id),
        source_head_ref TEXT NOT NULL REFERENCES domain_commits(commit_ref),operation_json TEXT NOT NULL,operation_hash TEXT NOT NULL`,
      domain_growth_job_bindings: `reservation_id TEXT PRIMARY KEY REFERENCES domain_growth_reservations(reservation_id),
        job_id TEXT NOT NULL UNIQUE,request_id TEXT NOT NULL,text_hash TEXT NOT NULL`,
      domain_growth_resolutions: `reservation_id TEXT PRIMARY KEY REFERENCES domain_growth_reservations(reservation_id),
        commit_ref TEXT NOT NULL REFERENCES domain_commits(commit_ref),disposition TEXT NOT NULL CHECK(disposition IN ('applied-act','cancelled-branch'))`,
    };
    for (const [name, definition] of Object.entries(growthRetrySchema)) {
      const expected = `CREATE TABLE ${name} (${definition}) STRICT`;
      const prior = this.#db.prepare('SELECT type,sql FROM sqlite_schema WHERE name=?').get(name);
      const normalize = sql => sql.replace(/\s+/gu, ' ').trim();
      if (prior && (prior.type !== 'table' || normalize(prior.sql) !== normalize(expected))) fail('UNSUPPORTED_DOMAIN_VERSION');
      if (!prior) this.#db.exec(expected);
      this.#immutable(name);
    }
    for (const [name, definition] of Object.entries(growthSchema)) {
      const expected = `CREATE TABLE ${name} (${definition}) STRICT`;
      const existing = this.#db.prepare('SELECT type,sql FROM sqlite_schema WHERE name=?').get(name);
      const normalize = sql => sql.replace(/\s+/gu, ' ').trim();
      if (existing && (existing.type !== 'table' || normalize(existing.sql) !== normalize(expected))) fail('UNSUPPORTED_DOMAIN_VERSION');
      if (!existing) this.#db.exec(expected);
      this.#immutable(name);
      this.#db.exec(`CREATE TRIGGER IF NOT EXISTS ${name}_sealed BEFORE INSERT ON ${name}
        WHEN EXISTS(SELECT 1 FROM domain_save_anchors WHERE commit_ref=NEW.commit_ref)
        BEGIN SELECT RAISE(ABORT,'sealed growth metadata'); END;`);
    }
    for (const [name, definition] of Object.entries(durableSchema)) {
      const expected = `CREATE TABLE ${name} (${definition}) STRICT`;
      const existing = this.#db.prepare('SELECT type,sql FROM sqlite_schema WHERE name=?').get(name);
      const normalized = sql => sql.replace(/\s+/gu, ' ').trim();
      if (existing && (existing.type !== 'table' || normalized(existing.sql) !== normalized(expected))) fail('UNSUPPORTED_DOMAIN_VERSION');
      if (!existing) this.#db.exec(expected);
      this.#immutable(name);
      if (name !== 'domain_durable_delivery_receipts') this.#db.exec(`CREATE TRIGGER IF NOT EXISTS ${name}_sealed BEFORE INSERT ON ${name}
        WHEN EXISTS(SELECT 1 FROM domain_save_anchors WHERE commit_ref=NEW.commit_ref)
        BEGIN SELECT RAISE(ABORT,'sealed durable acquisition'); END;`);
    }
    for (const table of ['cognition_observations', 'cognition_records', 'cognition_revocations', 'cognition_decision_states']) {
      this.#db.exec(`CREATE TRIGGER IF NOT EXISTS ${table}_sealed_commit BEFORE INSERT ON ${table}
        WHEN EXISTS(SELECT 1 FROM domain_save_anchors WHERE commit_ref=NEW.commit_ref)
        BEGIN SELECT RAISE(ABORT,'sealed cognitive commit'); END;`);
    }
    this.#db.exec(`CREATE TRIGGER IF NOT EXISTS cognition_case_sources_sealed_commit BEFORE INSERT ON cognition_case_sources
      WHEN EXISTS(SELECT 1 FROM cognition_observations o JOIN domain_save_anchors a ON a.commit_ref=o.commit_ref WHERE o.id=NEW.observation_id)
      BEGIN SELECT RAISE(ABORT,'sealed cognitive commit'); END;`);
    this.#db.exec(`CREATE TRIGGER IF NOT EXISTS cognition_performers_sealed_commit BEFORE INSERT ON cognition_observation_performers
      WHEN EXISTS(SELECT 1 FROM cognition_observations o JOIN domain_save_anchors a ON a.commit_ref=o.commit_ref WHERE o.id=NEW.observation_id)
      BEGIN SELECT RAISE(ABORT,'sealed cognitive commit'); END;`);
    this.#db.exec(`CREATE TRIGGER IF NOT EXISTS cognition_record_sources_sealed_commit BEFORE INSERT ON cognition_record_sources
      WHEN EXISTS(SELECT 1 FROM cognition_records r JOIN domain_save_anchors a ON a.commit_ref=r.commit_ref WHERE r.id=NEW.record_id)
      BEGIN SELECT RAISE(ABORT,'sealed cognitive commit'); END;`);
    for (const table of ['domain_world_events', 'domain_actions', 'domain_commit_draws']) {
      this.#db.exec(`CREATE TRIGGER IF NOT EXISTS ${table}_sealed_commit BEFORE INSERT ON ${table}
        WHEN EXISTS(SELECT 1 FROM domain_save_anchors WHERE commit_ref=NEW.commit_ref)
        BEGIN SELECT RAISE(ABORT,'sealed domain commit'); END;`);
    }
    for (const table of ['domain_runs', 'domain_setups', 'domain_branches', 'domain_commits', 'domain_world_events',
      'domain_actions', 'domain_turn_aliases', 'domain_commit_draws', 'domain_save_anchors']) {
      this.#immutable(table);
    }
    this.#db.exec(`CREATE TRIGGER IF NOT EXISTS domain_commit_requires_current_head BEFORE INSERT ON domain_commits
      WHEN (NEW.kind<>'initial' AND NOT EXISTS(SELECT 1 FROM domain_head WHERE commit_ref=NEW.previous_execution_ref))
        OR (NEW.kind='initial' AND EXISTS(SELECT 1 FROM domain_commits))
      BEGIN SELECT RAISE(ABORT,'invalid domain commit head'); END;`);
  }
  #run(id) {
    const row = this.#db.prepare('SELECT * FROM domain_runs WHERE run_id=?').get(id);
    if (!row || row.schema_version !== 1 || digest(selected(row, runFields)) !== row.integrity_hash) fail('INVALID_DOMAIN_STATE');
    if (row.rng_version !== RNG_VERSION || row.rules_ref !== rulesFor(row.scenario_ref)) fail('SOURCE_VERSION_MISMATCH');
    const setup = this.#db.prepare('SELECT * FROM domain_setups WHERE setup_ref=? AND run_id=?').get(row.initial_setup_ref, id);
    if (!setup || setup.schema_version !== 1 || digest(parse(setup.configuration)) !== row.initial_config_hash
      || digest(parse(setup.manifest)) !== row.initial_setup_ref) fail('INVALID_DOMAIN_STATE');
    const manifest = parse(setup.manifest);
    const agentRun = row.scenario_ref.startsWith(AGENT_SCENARIO_REF + ':')
      || row.scenario_ref.startsWith(CREATED_SETUP_REF + ':') || row.scenario_ref.startsWith(CASE_ONE_REF + ':');
    if (agentRun) {
      CONTENT_REVISIONS.resolve({ scenarioRef: row.scenario_ref, contentPackage: manifest.contentPackage,
        executionRevision: manifest.executionRevision });
    } else if (!['emma-prologue@1', `yakumo-xiao@${CUSTOM_SOURCE_HASH}`, PROTOTYPE_SCENARIO_REF].includes(row.scenario_ref)
      || manifest.contentPackage !== undefined || manifest.executionRevision !== undefined) fail('SOURCE_VERSION_MISMATCH');
    return row;
  }
  #commit(ref) {
    const row = this.#db.prepare('SELECT * FROM domain_commits WHERE commit_ref=?').get(ref);
    if (!row || row.schema_version !== 1 || digest(selected(row, commitFields)) !== row.integrity_hash
      || !validCommitSnapshot(this.#db, row)) fail('INVALID_DOMAIN_STATE');
    const branch = this.#db.prepare('SELECT * FROM domain_branches WHERE branch_id=? AND run_id=?').get(row.branch_id, row.run_id);
    if (!branch || branch.schema_version !== 1 || !['root', 'load', 'rewind'].includes(branch.branch_kind)
      || branch.inheritance_policy_ref !== 'technical-history@1') fail('INVALID_DOMAIN_STATE');
    if (branch.branch_kind === 'root') {
      if (branch.parent_id !== null || branch.fork_commit_ref !== null) fail('INVALID_DOMAIN_STATE');
    } else {
      const fork = this.#db.prepare('SELECT branch_id,run_id FROM domain_commits WHERE commit_ref=?').get(branch.fork_commit_ref);
      if (!fork || fork.run_id !== row.run_id || fork.branch_id !== branch.parent_id) fail('INVALID_DOMAIN_STATE');
    }
    const parent = row.parent_commit_ref && this.#db.prepare('SELECT run_id,sequence FROM domain_commits WHERE commit_ref=?').get(row.parent_commit_ref);
    if ((row.parent_commit_ref && (!parent || parent.run_id !== row.run_id || row.sequence !== parent.sequence + 1))
      || (!row.parent_commit_ref && row.sequence !== 0)) fail('INVALID_DOMAIN_STATE');
    const membership = this.#db.prepare('SELECT story_branch_id FROM domain_story_commit_memberships WHERE commit_ref=?').get(row.commit_ref);
    if (row.kind === 'story_rewind' && !membership) fail('INVALID_STORY_FORK');
    if (membership) {
      const storyBranch = this.#db.prepare('SELECT * FROM domain_story_branches WHERE branch_id=?').get(membership.story_branch_id);
      if (!storyBranch) fail('INVALID_STORY_FORK');
      const { integrity_hash: integrity, ...fields } = storyBranch;
      if (digest(fields) !== integrity || hash(storyBranch.snapshot_json) !== storyBranch.snapshot_hash
        || storyBranch.branch_kind !== 'story_magic' || storyBranch.namespace_ref !== 'domain-story@1'
        || storyBranch.policy_ref !== 'owner-mind-source-closure@1') fail('INVALID_STORY_FORK');
      if (row.kind === 'story_rewind') {
        const anchor = this.#storyFact('domain_story_anchors', 'anchor_id', storyBranch.anchor_id);
        if (row.previous_execution_ref !== storyBranch.source_execution_ref || row.parent_commit_ref !== anchor.commit_ref
          || parse(storyBranch.receipt_json).commitRef !== row.commit_ref || row.snapshot_json !== storyBranch.snapshot_json) fail('INVALID_STORY_FORK');
      }
    }
    return row;
  }
  #at(state) {
    if (!state || !integer(state.generation, 1) || !integer(state.revision) || !Array.isArray(state.turnIds)) fail('INVALID_DOMAIN_STATE');
    const row = this.#db.prepare('SELECT commit_ref FROM domain_commits WHERE generation=? AND revision=?').get(state.generation, state.revision);
    if (!row) fail('INVALID_DOMAIN_STATE');
    const commit = this.#commit(row.commit_ref);
    if (commit.story_fingerprint !== domainFingerprint(state) || commit.turn_depth !== state.turnIds.length) fail('INVALID_DOMAIN_STATE');
    const path = this.#db.prepare(`WITH RECURSIVE history(commit_ref,parent_commit_ref) AS (
      SELECT commit_ref,parent_commit_ref FROM domain_commits WHERE commit_ref=?
      UNION ALL SELECT c.commit_ref,c.parent_commit_ref FROM domain_commits c JOIN history h ON c.commit_ref=h.parent_commit_ref
    ) SELECT a.action_ref FROM domain_actions a JOIN history h ON a.commit_ref=h.commit_ref
      JOIN domain_commits c ON c.commit_ref=a.commit_ref ORDER BY c.sequence`).all(commit.commit_ref);
    if (path.length !== state.turnIds.length) fail('INVALID_DOMAIN_STATE');
    if (path.length) {
      const alias = this.#db.prepare('SELECT action_ref FROM domain_turn_aliases WHERE turn_ref=?');
      if (path.some((action, index) => alias.get(state.turnIds[index])?.action_ref !== action.action_ref)) fail('INVALID_DOMAIN_STATE');
    }
    const run = this.#run(commit.run_id);
    if (state.exampleId === 'agent') {
      const setup = parse(this.#db.prepare('SELECT manifest FROM domain_setups WHERE setup_ref=?').get(run.initial_setup_ref).manifest);
      const runtime = CONTENT_REVISIONS.resolve({ scenarioRef: run.scenario_ref, contentPackage: setup.contentPackage,
        executionRevision: setup.executionRevision });
      if (runtime.id !== runtimeRevisionForState(state).id) fail('SOURCE_VERSION_MISMATCH');
      guardRuleReference(state);
    }
    return commit;
  }
  // Host engine validates immutable extension checkpoints without requiring
  // them to be the active execution head (save/load and causal replay).
  assertSnapshot(state) { return this.#at(state); }
  /** Private actual-connection admission. A mirror or its hash alone has no
   * authority; select the exact snapshot's narrative ancestry before any RAG. */
  assertOccupiedBodyWorld(state) {
    const commit = this.#at(state);
    const mirror = state.caseRuntime?.occupiedBody;
    if (!mirror) return commit;
    const saved = new MagicRepository(this.#db).readAt({ commitRef: commit.commit_ref, runId: commit.run_id });
    if (!saved || canonical(mirror) !== canonical(occupiedBodyWorld(saved.state.identity))) fail('INVALID_DOMAIN_STATE');
    for (const id of Object.keys(mirror.occupants)) {
      runtimeBodyActorId(state, id);
      if (!runtimePhysicalRoom(state, id) && state.agentPositions?.[id] !== 'unavailable') fail('INVALID_DOMAIN_STATE');
    }
    const playerBody = runtimeBodyActorId(state, createdPlayerId(state));
    const physicalLabels = { ...CREATED_ROOMS, court: '审判庭', infirmary: '医务室' };
    if (state.location !== (physicalLabels[runtimePhysicalRoom(state, playerBody)] || 'unavailable')) fail('INVALID_DOMAIN_STATE');
    return commit;
  }
  assertHead(state) {
    const current = this.#at(state);
    const head = this.#db.prepare('SELECT * FROM domain_head WHERE id=1').get();
    if (!head || head.commit_ref !== current.commit_ref || head.run_id !== current.run_id || head.branch_id !== current.branch_id) fail('INVALID_DOMAIN_STATE');
    return current;
  }
  /** Host-only proof for initializing a transient magic projection on the
   * current committed head. It is not an activation receipt, is not persisted,
   * and cannot be supplied by text/model input. */
  assertMagicInitialization(proof, state, journalAnchor) {
    if (!proof || typeof proof !== 'object' || Array.isArray(proof) || proof.version !== 1) return false;
    if (proof.mode === 'ancestor') {
      const source = this.#at(state);
      const head = journalAnchor ? this.#at(journalAnchor) : this.#db.prepare('SELECT * FROM domain_head WHERE id=1').get();
      if (!head || head.run_id !== source.run_id || proof.headCommitRef !== head.commit_ref
        || proof.headRunId !== head.run_id) return false;
      const ancestor = this.#db.prepare(`WITH RECURSIVE history AS (
        SELECT commit_ref,parent_commit_ref,0 AS depth FROM domain_commits WHERE commit_ref=? AND run_id=?
        UNION ALL SELECT c.commit_ref,c.parent_commit_ref,h.depth+1 FROM domain_commits c
          JOIN history h ON c.commit_ref=h.parent_commit_ref WHERE c.run_id=? AND h.depth<4096
      ) SELECT 1 FROM history WHERE commit_ref=?`).get(head.commit_ref, head.run_id, head.run_id, source.commit_ref);
      if (!ancestor || proof.commitRef !== source.commit_ref || proof.runId !== source.run_id
        || proof.branchId !== source.branch_id || proof.generation !== state.generation
        || proof.revision !== state.revision) return false;
      return true;
    }
    const head = this.assertHead(state);
    return proof.commitRef === head.commit_ref && proof.runId === head.run_id
      && proof.generation === state.generation && proof.revision === state.revision
      && proof.branchId === head.branch_id;
  }
  #newRun(state, { seed, legacy }) {
    if (seed !== undefined && (typeof seed !== 'string' || !/^[a-f0-9]{64}$/u.test(seed))) fail('INVALID_ROOT_SEED');
    const runId = randomUUID();
    // Only material initialization inputs participate in rule random identity;
    // avatars and impression colors belong to presentation, not the dice key.
    const configuration = { exampleId: state.exampleId || 'emma', ...(state.creation ? { creation: state.creation } : {}),
      ...(state.customAbilitySetup ? { customAbilitySetup: state.customAbilitySetup } : {}) };
    if (configuration.creation?.character) {
      configuration.creation = structuredClone(configuration.creation);
      delete configuration.creation.character.impressionColor;
    }
    const configHash = digest(configuration);
    const rulesRef = rulesFor(scenario(state));
    const setup = { format: state.creation ? CREATED_SETUP_REF : 'fixed-fixture-setup@1', runId, configuration, scenarioRef: scenario(state), rulesRef,
      initialStoryFingerprint: domainFingerprint(state), randomSetup: false,
      ...(hasBunkSupplement(state) ? { settingSupplement: structuredClone(state.settingSupplement) } : {}),
      ...(!legacy && state.exampleId === 'agent' ? { contentPackage: runtimeRevisionForState(state).contentPackage } : {}),
      ...(state.agentRuntimeRevision ? { executionRevision: runtimeRevisionForState(state).executionRevision } : {}) };
    const row = { run_id: runId, root_seed: seed ?? randomBytes(32).toString('hex'), rng_version: RNG_VERSION,
      scenario_ref: scenario(state), rules_ref: rulesRef, initial_config_hash: configHash, initial_setup_ref: digest(setup),
      random_lineage_ref: digest(['random-lineage@1', scenario(state), rulesRef, configHash]),
      seed_origin: legacy ? 'legacy_future_only' : 'native', schema_version: 1 };
    // Setup manifests are immutable and per run, even for identical fixed
    // fixture content. The gameplay causal key below excludes this opaque ID.
    this.#db.prepare(`INSERT INTO domain_runs(${runFields.join(',')},integrity_hash)
      VALUES(${[...runFields, 'integrity_hash'].map(() => '?').join(',')})`).run(...runFields.map(key => row[key]), digest(row));
    this.#db.prepare('INSERT INTO domain_setups VALUES(?,?,?,?,1)')
      .run(row.initial_setup_ref, runId, canonical(configuration), canonical(setup));
    return row;
  }
  #newBranch(run, kind, source) {
    const row = { branch_id: randomUUID(), run_id: run.run_id, parent_id: source?.branch_id ?? null,
      fork_commit_ref: source?.commit_ref ?? null, branch_kind: kind,
      random_lineage_ref: run.random_lineage_ref, inheritance_policy_ref: 'technical-history@1', schema_version: 1 };
    this.#db.prepare(`INSERT INTO domain_branches VALUES(?,?,?,?,?,?,?,?)`).run(...Object.values(row));
    return row;
  }
  #event(commit, kind, payload) {
    const eventRef = randomUUID(); const json = canonical(payload);
    this.#db.prepare('INSERT INTO domain_world_events VALUES(?,?,?,?,?,?,?,1)')
      .run(eventRef, commit.run_id, commit.branch_id, commit.commit_ref, kind, json, hash(json));
    return eventRef;
  }
  #anchor(commit, run) {
    const snapshot = parse(commit.snapshot_json);
    const guardRules = snapshot.exampleId === 'agent' ? guardRuleReference(snapshot) : undefined;
    const magicRules = snapshot.exampleId === 'agent' ? abilityRuleReference(snapshot) : undefined;
    const caseItemPolicy = snapshot.exampleId === 'agent' ? caseItemPolicyPin(snapshot) : undefined;
    const draws = this.#db.prepare(`WITH RECURSIVE history(commit_ref,parent_commit_ref) AS (
      SELECT commit_ref,parent_commit_ref FROM domain_commits WHERE commit_ref=?
      UNION ALL SELECT c.commit_ref,c.parent_commit_ref FROM domain_commits c JOIN history h ON c.commit_ref=h.parent_commit_ref
    ) SELECT DISTINCT d.draw_id FROM domain_commit_draws d JOIN history h ON d.commit_ref=h.commit_ref ORDER BY d.draw_id`)
      .all(commit.commit_ref).map(row => row.draw_id);
    const setup = parse(this.#db.prepare('SELECT manifest FROM domain_setups WHERE setup_ref=?').get(run.initial_setup_ref).manifest);
    const row = { anchor_ref: randomUUID(), run_id: run.run_id, branch_id: commit.branch_id, commit_ref: commit.commit_ref,
      snapshot_ref: commit.snapshot_hash,
      cognition_watermarks: canonical({ historyHead: commit.commit_ref, accessPolicy: 'technical-history@1' }),
      random_manifest: canonical({ seedRef: run.run_id, seedFingerprint: hash(run.root_seed), lineageRef: run.random_lineage_ref,
        rngVersion: run.rng_version, drawIds: draws }),
      version_refs: canonical({ schema: 1, scenario: run.scenario_ref, rules: run.rules_ref, rng: run.rng_version, setup: run.initial_setup_ref,
        ...causalVersionRefs(snapshot),
        ...(guardRules ? { guardRules } : {}),
        ...(magicRules ? { magicRules } : {}),
        ...(caseItemPolicy ? { caseItemPolicy } : {}),
        ...(setup.contentPackage ? { contentPackage: setup.contentPackage } : {}),
        ...(setup.executionRevision ? { executionRevision: setup.executionRevision } : {}) }),
      schema_version: 1 };
    this.#db.prepare(`INSERT INTO domain_save_anchors(${anchorFields.join(',')},integrity_hash)
      VALUES(${[...anchorFields, 'integrity_hash'].map(() => '?').join(',')})`).run(...anchorFields.map(key => row[key]), digest(row));
    return row;
  }
  #ancestor(headRef, sourceRef) {
    return Boolean(this.#db.prepare(`WITH RECURSIVE history(commit_ref,parent_commit_ref,depth) AS (
      SELECT commit_ref,parent_commit_ref,0 FROM domain_commits WHERE commit_ref=?
      UNION ALL SELECT c.commit_ref,c.parent_commit_ref,h.depth+1 FROM domain_commits c
        JOIN history h ON c.commit_ref=h.parent_commit_ref WHERE h.depth<4096
    ) SELECT 1 FROM history WHERE commit_ref=?`).get(headRef, sourceRef));
  }
  #storyFact(table, idColumn, id) {
    const row = this.#db.prepare(`SELECT * FROM ${table} WHERE ${idColumn}=?`).get(id);
    if (!row) fail('INVALID_STORY_FORK');
    const { integrity_hash: integrity, ...fields } = row;
    if (digest(fields) !== integrity) fail('INVALID_STORY_FORK');
    const event = this.#db.prepare('SELECT kind,payload,payload_hash FROM domain_world_events WHERE event_ref=? AND commit_ref=?')
      .get(row.evidence_event_ref, row.commit_ref);
    if (!event || event.kind !== (table === 'domain_story_anchors' ? 'story_morning_waking' : 'story_actual_death')
      || hash(event.payload) !== event.payload_hash) fail('INVALID_STORY_FORK');
    const payload = parse(event.payload);
    if (payload.actorId !== row.actor_id || payload.mindId !== row.mind_id || payload.at !== row.at || payload.day !== row.day
      || table === 'domain_story_deaths' && payload.bodyId !== row.body_id) fail('INVALID_STORY_FORK');
    return row;
  }
  #swapHandle(scope, kind, id) { return `swap-${abilityDigest([scope.runId, scope.branchId, scope.commitRef, scope.generation, 'milia', kind, id]).slice(0, 40)}`; }
  #swapTargetHandle(scope, magic, targetBodyId) {
    return `magic-${abilityDigest([{ branchId: magic.branchId, headCommitRef: magic.headCommitRef, generation: magic.generation },
      magic.time, 'mind:milia', 'body', targetBodyId]).slice(0, 40)}`;
  }
  swapLifecycleCapabilities(state) {
    return this.#swapLifecycleCapabilities(state, this.scope(state));
  }
  // Historical replay uses the exact committed snapshot, never the live head.
  swapLifecycleCapabilitiesAt(state) {
    return this.#swapLifecycleCapabilities(state, this.scopeAt(state));
  }
  #swapLifecycleCapabilities(state, scope) {
    if (!state.caseRuntime?.swapLifecycle || playerId(state) !== 'milia') return { version: 1, offers: [], relations: [] };
    this.assertSwapLifecycleHistory(state);
    const saved = new MagicRepository(this.#db).readAt(scope);
    if (!saved) return { version: 1, offers: [], relations: [] };
    const magic = refreshHostMagic(state, saved.state, scope, { domainStore: this });
    return { version: 1, offers: state.caseRuntime.swapLifecycle.offers.filter(row => row.status === 'holding').map(row => ({
      handle: this.#swapHandle(scope, 'offer', row.id), targetHandle: this.#swapTargetHandle(scope, magic, `body:${row.targetBodyId}`),
      label: '已完成本次同意与牵手的互换请求' })),
      relations: magic.effects.filter(row => row.event.operation === 'body-swap' && row.event.expiresAt === null && row.status !== 'ended')
        .map(row => ({ handle: this.#swapHandle(scope, 'relation', row.id), label: '归还本人原先建立的互换关系' })) };
  }
  #deriveSwapLifecycle(state, command) {
    const source = this.#at(state);
    const scope = { runId: source.run_id, branchId: source.branch_id, commitRef: source.commit_ref, generation: source.generation, revision: source.revision };
    const saved = new MagicRepository(this.#db).readAt(scope);
    if (!saved || !state.caseRuntime?.swapLifecycle || playerId(state) !== 'milia' || !runtimeSwapReady(state, 'milia')) fail('MAGIC_HOST_RULE_GATED');
    const base = refreshHostMagic(state, saved.state, scope, { domainStore: this });
    if (!magicExact(command, ['type', 'version', 'useId', 'handle', 'targetHandle']) || command.version !== 1
      || !magicId(command.useId) || !['magic_swap_establish', 'magic_swap_restore'].includes(command.type)
      || base.effects.some(row => row.status === 'suppressed') || base.constraints.length) fail('MAGIC_HOST_RULE_GATED');
    let magic, receipt, events, proof;
    if (command.type === 'magic_swap_establish') {
      const offer = state.caseRuntime.swapLifecycle.offers.find(row => this.#swapHandle(scope, 'offer', row.id) === command.handle);
      if (!offer || offer.status !== 'holding' || offer.sourceId !== 'milia' || offer.sourceBodyId !== 'milia'
        || runtimeBodyActorId(state, 'milia') !== 'milia' || runtimeBodyActorId(state, offer.targetId) !== offer.targetBodyId
        || !runtimeSwapReady(state, offer.targetId) || runtimePhysicalRoom(state, offer.sourceBodyId) !== offer.room
        || runtimePhysicalRoom(state, offer.targetBodyId) !== offer.room) fail('MAGIC_HOST_RULE_GATED');
      const targetBodyId = `body:${offer.targetBodyId}`;
      const targetToken = this.#swapTargetHandle(scope, base, targetBodyId);
      if (command.targetHandle !== targetToken) fail('MAGIC_HANDLE_PERMISSION');
      const evidence = state.caseRuntime.swapLifecycle.journal.filter(row => row.offerId === offer.id);
      if (evidence.length !== 2 || evidence[0].kind !== 'swap-offer-hand' || evidence[1].kind !== 'swap-accept-hand'
        || evidence[1].actorId !== offer.targetId) fail('MAGIC_HOST_RULE_GATED');
      for (const row of evidence) {
        const source = this.#db.prepare('SELECT * FROM domain_swap_contacts WHERE evidence_id=?').get(row.id);
        if (!source || source.event_hash !== digest(row) || source.event_json !== canonical(row) || !this.#ancestor(scope.commitRef, source.commit_ref)) fail('INVALID_DOMAIN_STATE');
        const job = this.#db.prepare('SELECT status FROM agent_turn_jobs WHERE job_id=?').get(source.job_id);
        if (job?.status !== 'committed') fail('INVALID_DOMAIN_STATE');
        const sourceCommit = this.#commit(source.commit_ref);
        const sourceParent = this.#commit(sourceCommit.parent_commit_ref);
        this.#publishSwapContacts(sourceCommit, parse(sourceParent.snapshot_json), parse(sourceCommit.snapshot_json), true);
      }
      const acceptedSource = this.#db.prepare('SELECT commit_ref FROM domain_swap_contacts WHERE evidence_id=?').get(evidence[1].id);
      const continuity = this.#db.prepare(`WITH RECURSIVE h AS (SELECT commit_ref,parent_commit_ref,snapshot_json FROM domain_commits WHERE commit_ref=?
        UNION ALL SELECT c.commit_ref,c.parent_commit_ref,c.snapshot_json FROM domain_commits c JOIN h ON c.commit_ref=h.parent_commit_ref
        WHERE h.commit_ref<>?) SELECT snapshot_json FROM h`).all(scope.commitRef, acceptedSource.commit_ref);
      for (const row of continuity) {
        const current = parse(row.snapshot_json);
        if (!runtimeSwapReady(current, 'milia') || !runtimeSwapReady(current, offer.targetId)
          || runtimeBodyActorId(current, 'milia') !== offer.sourceBodyId || runtimeBodyActorId(current, offer.targetId) !== offer.targetBodyId
          || runtimePhysicalRoom(current, offer.sourceBodyId) !== offer.room || runtimePhysicalRoom(current, offer.targetBodyId) !== offer.room)
          fail('MAGIC_HOST_RULE_GATED');
      }
      const grant = base.grants.find(row => row.definitionRef === 'milia:basic@1' && row.enabled);
      if (!grant || !grantMatchesIdentity(grant, base.identity, 'milia') || !knownMagicActions(base, 'milia').some(row => row.grantId === grant.id)
        || base.uses.some(row => row.id === command.useId)) fail('MAGIC_GRANT_PERMISSION');
      const definition = magicDefinition(grant.definitionRef);
      const event = { id: `effect:${command.useId}`, type: 'MagicEffectEstablished', family: definition.family, operation: definition.operation,
        definitionRef: definition.ref, definitionFingerprint: definition.fingerprint, grantId: grant.id,
        sourceMindId: 'mind:milia', sourceBodyId: 'body:milia', targetId: targetBodyId, at: base.time, expiresAt: null,
        sourceDeath: 'persist', payload: { returnPolicy: 'persist', originalTargetMindId: base.identity.occupants[targetBodyId] },
        authorizationRef: `swap-evidence:${abilityDigest(evidence)}` };
      magic = reduceMagicEffect(base, event);
      receipt = { useId: command.useId, type: 'OriginalSwapEstablished', version: 1, effectId: event.id, at: base.time };
      magic.uses.push({ id: command.useId, commandHash: abilityDigest(command), operation: command.type,
        branchId: base.branchId, headCommitRef: base.headCommitRef, at: base.time, receipt });
      events = [event]; proof = { offerId: offer.id, evidenceIds: evidence.map(row => row.id) };
    } else {
      if (command.targetHandle !== null) fail('INVALID_DOMAIN_STATE');
      const effect = base.effects.find(row => this.#swapHandle(scope, 'relation', row.id) === command.handle);
      if (!effect) fail('MAGIC_ORIGINAL_RETURN_EFFECT');
      const established = this.#db.prepare(`SELECT x.*,c.run_id FROM domain_swap_lifecycle x JOIN domain_commits c USING(commit_ref)
        WHERE x.operation='magic_swap_establish' AND json_extract(x.proof_json,'$.effectId')=?`).all(effect.id)
        .find(row => row.run_id === scope.runId && this.#ancestor(scope.commitRef, row.commit_ref));
      if (!established) fail('INVALID_DOMAIN_STATE');
      const relation = establishOriginalSwapReturnAuthority(base, effect.id);
      const result = restoreOriginalSwapRelation(base, { requestId: command.useId, relation }, {
        resolveCurrentReturnReadiness: () => ({ version: 1, type: 'HostOriginalSwapReturnReadiness',
          sourceEventId: `return-readiness:${abilityDigest([scope.commitRef, command.useId])}`, actingMindId: 'mind:milia',
          occupiedBodyId: bodyForMind(base.identity, 'mind:milia'), canAct: runtimeSwapReady(state, 'milia'), restorationSuppressed: false }) });
      magic = result.state; receipt = { useId: command.useId, type: 'OriginalSwapReturnPublication', version: 1, originalReturn: result.receipt };
      events = []; proof = { establishmentCommitRef: established.commit_ref, effectId: effect.id,
        readiness: { sourceCommitRef: scope.commitRef, actingMindId: 'mind:milia',
          occupiedBodyId: bodyForMind(base.identity, 'mind:milia'), condition: 'ordinary-capable-no-applicable-modelled-suppression' } };
    }
    const next = structuredClone(state); next.revision++;
    next.caseRuntime.occupiedBody = occupiedBodyWorld(magic.identity);
    for (const offer of next.caseRuntime.swapLifecycle.offers) if (['offered', 'holding'].includes(offer.status)) offer.status = 'consumed';
    const occupiedRoom = magic.identity.bodies[bodyForMind(magic.identity, magic.identity.playerMindId)].locationId;
    next.location = CREATED_ROOMS[occupiedRoom]; next.phase = `agent_${occupiedRoom}`;
    if (!next.location) fail('MAGIC_HOST_RULE_GATED');
    return { state: next, projection: magic, receipt, events, proof: { ...proof, effectId: receipt.effectId || proof.effectId } };
  }
  prepareSwapLifecycle(state, request) {
    this.assertSwapLifecycleHistory(state);
    if (this.#growthReservation()) fail('GROWTH_RESERVED_FOR_OTHER_REQUEST');
    const command = { type: request.type, version: 1, useId: request.requestId, handle: request.handle, targetHandle: request.targetHandle ?? null };
    return { ...this.#deriveSwapLifecycle(state, command), command };
  }
  recordWithSwapLifecycle(input, publication) {
    this.#transaction(); this.assertHead(input.previousState);
    if (this.#swapWrite || this.#magicWrite || this.#durableWrite || !['magic_cast', 'act'].includes(input.kind)) fail('INVALID_DOMAIN_STATE');
    const expected = this.prepareSwapLifecycle(input.previousState, { type: publication.command.type, requestId: publication.command.useId,
      handle: publication.command.handle, targetHandle: publication.command.targetHandle });
    const act = input.kind === 'act';
    if (act ? canonical(expected.projection) !== canonical(publication.projection)
      || canonical(expected.receipt) !== canonical(publication.receipt) || canonical(expected.command) !== canonical(publication.command)
      || canonical(expected.events) !== canonical(publication.events) || canonical(expected.proof) !== canonical(publication.proof)
      || input.state.generation !== expected.state.generation || input.state.revision !== expected.state.revision
      || canonical(input.state.caseRuntime?.swapLifecycle) !== canonical(expected.state.caseRuntime?.swapLifecycle)
      || canonical(input.state.caseRuntime?.occupiedBody) !== canonical(expected.state.caseRuntime?.occupiedBody)
      : canonical(expected.state) !== canonical(input.state) || canonical(expected.projection) !== canonical(publication.projection)
        || canonical(expected.receipt) !== canonical(publication.receipt) || canonical(expected.command) !== canonical(publication.command)
        || canonical(expected.events) !== canonical(publication.events) || canonical(expected.proof) !== canonical(publication.proof)) fail('INVALID_DOMAIN_STATE');
    const sqlScope = openSqliteScope(this.#db, `swap_lifecycle_${randomUUID().replaceAll('-', '')}`);
    this.#swapWrite = expected;
    try { const commit = this.record(input); this.assertSwapLifecycleHistory(input.state); sqlScope.release(); return commit; }
    catch (error) { sqlScope.rollback(); throw error; }
    finally { this.#swapWrite = undefined; }
  }
  assertSwapLifecycleHistory(state) {
    const head = this.#at(state);
    // Contact source acts are authoritative BEFORE any establishment exists.
    // Start from the expected complete journal, not only surviving SQL rows.
    const expectedContacts = state.caseRuntime?.swapLifecycle?.journal || [];
    const contacts = this.#db.prepare(`WITH RECURSIVE h AS (
      SELECT commit_ref,parent_commit_ref FROM domain_commits WHERE commit_ref=?
      UNION ALL SELECT c.commit_ref,c.parent_commit_ref FROM domain_commits c JOIN h ON c.commit_ref=h.parent_commit_ref
    ) SELECT x.* FROM h JOIN domain_swap_contacts x USING(commit_ref)`).all(head.commit_ref);
    if (new Set(expectedContacts.map(row => row.id)).size !== expectedContacts.length
      || contacts.length !== expectedContacts.length || new Set(contacts.map(row => row.evidence_id)).size !== contacts.length
      || expectedContacts.some(evidence => {
        const row = contacts.find(item => item.evidence_id === evidence.id);
        return !row || row.actor_id !== evidence.actorId || row.event_json !== canonical(evidence) || row.event_hash !== digest(evidence);
      })) fail('INVALID_DOMAIN_STATE');
    const sources = this.#db.prepare(`WITH RECURSIVE h AS (
      SELECT commit_ref,parent_commit_ref FROM domain_commits WHERE commit_ref=?
      UNION ALL SELECT c.commit_ref,c.parent_commit_ref FROM domain_commits c JOIN h ON c.commit_ref=h.parent_commit_ref
    ) SELECT c.commit_ref FROM h JOIN domain_commits c USING(commit_ref)
      JOIN domain_commits p ON p.commit_ref=c.parent_commit_ref
      WHERE json_extract(c.snapshot_json,'$.caseRuntime.swapLifecycle.version')=1
        AND coalesce(json_array_length(c.snapshot_json,'$.caseRuntime.swapLifecycle.journal'),0)
          > coalesce(json_array_length(p.snapshot_json,'$.caseRuntime.swapLifecycle.journal'),0)`).all(head.commit_ref);
    // Include commits derived from the journal even if ALL their SQL rows are
    // absent; surviving-row iteration alone cannot prove source completeness.
    for (const ref of new Set([...contacts.map(row => row.commit_ref), ...sources.map(row => row.commit_ref)])) {
      const commit = this.#commit(ref), parent = this.#commit(commit.parent_commit_ref);
      if (commit.kind !== 'act' || commit.run_id !== head.run_id) fail('INVALID_DOMAIN_STATE');
      this.#publishSwapContacts(commit, parse(parent.snapshot_json), parse(commit.snapshot_json), true);
    }
    const rows = this.#db.prepare(`WITH RECURSIVE h AS (SELECT commit_ref,parent_commit_ref FROM domain_commits WHERE commit_ref=?
      UNION ALL SELECT c.commit_ref,c.parent_commit_ref FROM domain_commits c JOIN h ON c.commit_ref=h.parent_commit_ref)
      SELECT x.* FROM h JOIN domain_swap_lifecycle x USING(commit_ref)`).all(head.commit_ref);
    const ledgerRefs = this.#db.prepare(`WITH RECURSIVE h AS (SELECT commit_ref,parent_commit_ref FROM domain_commits WHERE commit_ref=?
      UNION ALL SELECT c.commit_ref,c.parent_commit_ref FROM domain_commits c JOIN h ON c.commit_ref=h.parent_commit_ref)
      SELECT m.commit_ref FROM h JOIN host_magic_commits_v2 m USING(commit_ref)
      WHERE json_extract(m.receipt_json,'$.type') IN ('OriginalSwapEstablished','OriginalSwapReturnPublication')`).all(head.commit_ref);
    if (ledgerRefs.some(row => !rows.some(proof => proof.commit_ref === row.commit_ref))) fail('INVALID_DOMAIN_STATE');
    for (const row of rows) {
      const commit = this.#commit(row.commit_ref), parent = this.#commit(row.source_commit_ref);
      const ledger = new MagicRepository(this.#db).readAt({ commitRef: commit.commit_ref, runId: head.run_id });
      if (commit.parent_commit_ref !== parent.commit_ref || commit.previous_execution_ref !== parent.commit_ref
        || !ledger || ledger.commitRef !== commit.commit_ref || ledger.commandHash !== row.command_hash
        || abilityDigest(parse(row.command_json)) !== row.command_hash) fail('INVALID_DOMAIN_STATE');
      const expected = this.#deriveSwapLifecycleAt(parent, parse(row.command_json));
      const snapshot = parse(commit.snapshot_json);
      const same = commit.kind === 'act'
        ? canonical(expected.state.caseRuntime?.swapLifecycle) === canonical(snapshot.caseRuntime?.swapLifecycle)
          && canonical(expected.state.caseRuntime?.occupiedBody) === canonical(snapshot.caseRuntime?.occupiedBody)
        : canonical(expected.state) === canonical(snapshot);
      if (abilityDigest({ state: ledger.state, receipt: ledger.receipt, events: ledger.events }) !== row.result_hash
        || canonical(expected.projection) !== canonical(ledger.state) || canonical(expected.receipt) !== canonical(ledger.receipt)
        || canonical(expected.events) !== canonical(ledger.events) || canonical(expected.proof) !== row.proof_json
        || !same) fail('INVALID_DOMAIN_STATE');
    }
    return true;
  }
  #deriveSwapLifecycleAt(parent, command) {
    // Historical derivation uses its real snapshot; scope() is deliberately
    // head-only, so the temporary source is explicitly resolved via #at below.
    return this.#deriveSwapLifecycle(parse(parent.snapshot_json), command);
  }
  #publishSwapContacts(commit, before, state, verifyOnly = false) {
    const action = state.agentActions.at(-1);
    if (verifyOnly) {
      // Historical independent swap calls predate the ordinary-act pin; they
      // still authenticate the same journal when the parent carries lifecycle.
      if (!before.caseRuntime?.swapLifecycle) fail('INVALID_DOMAIN_STATE');
    } else if (action?.swapLifecycleVersion !== 1 || !before.caseRuntime?.swapLifecycle) fail('INVALID_DOMAIN_STATE');
    if (!verifyOnly) {
      if (this.#swapWrite) {
        if (canonical(this.#swapWrite.state.caseRuntime?.swapLifecycle) !== canonical(state.caseRuntime.swapLifecycle)) fail('INVALID_DOMAIN_STATE');
      } else {
        const expected = structuredClone(before); applyAgentAction(expected, action);
        if (canonical(expected.caseRuntime.swapLifecycle) !== canonical(state.caseRuntime.swapLifecycle)) fail('INVALID_DOMAIN_STATE');
      }
    }
    const old = before.caseRuntime.swapLifecycle.journal;
    if (canonical(state.caseRuntime.swapLifecycle.journal.slice(0, old.length)) !== canonical(old)) fail('INVALID_DOMAIN_STATE');
    const evidenceSet = state.caseRuntime.swapLifecycle.journal.slice(old.length);
    if (new Set(evidenceSet.map(row => row.id)).size !== evidenceSet.length) fail('INVALID_DOMAIN_STATE');
    if (!evidenceSet.length) {
      // Ordinary regeneration publishes on a new execution branch while its
      // immutable model job belongs to the original source checkpoint/fence.
      // With no new contact there is no contact task to authenticate. Still
      // prove the complete unchanged journal and the exact empty SQL delta;
      // do not skip replay, prior-source history or source completeness.
      const source = this.#at(before);
      this.assertSwapLifecycleHistory(before);
      if (commit.parent_commit_ref !== source.commit_ref || commit.run_id !== source.run_id
        || canonical(state.caseRuntime.swapLifecycle.journal) !== canonical(old)
        || this.#db.prepare('SELECT 1 FROM domain_swap_contacts WHERE commit_ref=?').get(commit.commit_ref)) fail('INVALID_DOMAIN_STATE');
      return;
    }
    const job = this.#db.prepare('SELECT * FROM agent_turn_jobs WHERE job_id=?').get(action.jobId);
    if (!job || hash(job.context_json) !== job.context_hash) fail('INVALID_DOMAIN_STATE');
    const plan = parse(job.context_json);
    if (plan.regeneration) {
      const checkpoint = this.#at(plan.regeneration.checkpoint), source = this.#at(before);
      if (source.kind !== 'rewind' || source.parent_commit_ref !== checkpoint.commit_ref
        || source.run_id !== checkpoint.run_id || !this.#db.prepare(`SELECT 1 FROM domain_commits
          WHERE commit_ref=? AND branch_id=? AND generation=? AND revision=?`).get(source.previous_execution_ref,
            job.branch_id, job.generation, job.base_revision)) fail('INVALID_DOMAIN_STATE');
      throw Object.assign(new Error('重生成中的新增接触须有独立执行来源；未提交接触或世界。'),
        { code: 'MAGIC_HOST_RULE_GATED', requiredHook: 'regenerated-swap-contact-source' });
    }
    if (job.generation !== before.generation || job.base_revision !== before.revision || job.branch_id !== commit.branch_id) fail('INVALID_DOMAIN_STATE');
    for (const evidence of evidenceSet) {
      if (evidence.kind === 'swap-offer-hand') {
        const parent = this.#at(before), saved = new MagicRepository(this.#db).readAt({ commitRef: parent.commit_ref, runId: parent.run_id });
        // The first ordinary act of a new original-Milia root carries the
        // native baseline projection in this same record, before any saved
        // parent head exists. Only that host-written baseline may stand in:
        // it is tied to this exact parent by the immutable ledger row. A later
        // history reopen verifies the same commit row; it never borrows an
        // arbitrary later grant. Older roots and every later offer keep the
        // saved-head gate.
        const baselineRow = this.#db.prepare('SELECT request_id, expected_head FROM host_magic_commits_v2 WHERE branch_id=? AND commit_ref=?')
          .get(commit.branch_id, commit.commit_ref);
        const ownBaseline = baselineRow?.request_id === `magic-baseline:${parent.commit_ref}`
          && baselineRow.expected_head === parent.commit_ref
          ? new MagicRepository(this.#db).readAt({ commitRef: commit.commit_ref, runId: commit.run_id }) : null;
        const projection = saved?.state || this.#magicBaselineWrite?.projection || ownBaseline?.state;
        if (!projection || !knownMagicActions(projection, 'milia').some(row => row.definitionRef === 'milia:basic@1')
          || projection.identity.occupants['body:milia'] !== 'mind:milia') fail('MAGIC_GRANT_PERMISSION');
      }
      const rows = this.#db.prepare('SELECT * FROM agent_turn_tasks WHERE job_id=? AND actor_id=?').all(action.jobId, evidence.actorId);
      const task = rows.find(row => {
        if (!row.result_json || hash(row.input_json) !== row.input_hash || hash(row.result_json) !== row.result_hash) return false;
        const result = parse(row.result_json), packet = parse(row.input_json);
        if (evidence.actorId === playerId(before)) return row.role === 'player_performance'
          && packet.context?.data?.intent?.type === 'runtime'
          && packet.context.data.intent.subjectId === action.intent.subjectId
          && canonical(result) === canonical(action.performance);
        const option = packet.context?.situation?.caseOptions?.find(item => item.kind === evidence.kind
          && item.id === result.decision?.operation?.subjectId);
        return row.role === 'roleplay' && action.beats.some(beat => row.slot === `npc:${beat.beat}:${evidence.actorId}`
          && beat.decisions.some(decision => decision.actorId === evidence.actorId && canonical(decision.proposal) === canonical(result)))
          && result.decision?.operation?.type === 'case_step'
          && result.decision.operation.subjectId === option?.id
          && evidence.sourceObservationIds.every(id => packet.context.observations.some(obs => obs.id === id));
      });
      if (!task) fail('INVALID_DOMAIN_STATE');
      if (verifyOnly) {
        const row = this.#db.prepare('SELECT * FROM domain_swap_contacts WHERE evidence_id=?').get(evidence.id);
        if (!row || row.commit_ref !== commit.commit_ref || row.job_id !== action.jobId || row.actor_id !== evidence.actorId
          || row.event_json !== canonical(evidence) || row.event_hash !== digest(evidence)) fail('INVALID_DOMAIN_STATE');
      } else this.#db.prepare('INSERT INTO domain_swap_contacts VALUES(?,?,?,?,?,?)').run(evidence.id, commit.commit_ref,
        action.jobId, evidence.actorId, canonical(evidence), digest(evidence));
    }
    if (!verifyOnly) {
      // SQLite may successfully ignore an INSERT. Re-read the whole expected
      // set and all provenance after the batch, before the save anchor seals it.
      this.#publishSwapContacts(commit, before, state, true);
      return;
    }
    const persisted = this.#db.prepare('SELECT * FROM domain_swap_contacts WHERE commit_ref=?').all(commit.commit_ref);
    if (persisted.length !== evidenceSet.length || persisted.some(row => {
      const evidence = evidenceSet.find(item => item.id === row.evidence_id);
      return !evidence || row.job_id !== action.jobId || row.actor_id !== evidence.actorId
        || row.event_json !== canonical(evidence) || row.event_hash !== digest(evidence);
    })) fail('INVALID_DOMAIN_STATE');
  }
  #publishStoryFacts(commit, state, facts) {
    if (!facts) return;
    const identity = JSON.parse(canonicalJson(facts.identity));
    validateMagicIdentity(identity);
    const known = new Set(actorsForState(state).map(actor => actor.id));
    if (Object.values(identity.minds).some(mind => !known.has(mind.actorId))
      || identity.minds[identity.playerMindId]?.actorId !== playerId(state)) fail('INVALID_STORY_FORK');
    const at = state.worldTime; const clock = prisonClock(state);
    for (const waking of facts.waking || []) {
      const mind = Object.values(identity.minds).find(row => row.actorId === waking.actorId);
      const body = identity.bodies[bodyForMind(identity, mind?.id)];
      if (!mind || !body?.alive || clock.hour < 5 || clock.hour >= 10
        || !waking.id || (commit.kind !== 'initial' && commit.kind !== 'new_game'
          && !state.entries.some(entry => entry.observationKey === waking.evidenceKey && entry.delivery === 'action'
            && entry.speakerId === waking.actorId && entry.audienceIds?.includes(waking.actorId) && entry.occurredAt === at
            && entry.storyTimelineEvent?.kind === 'morning-waking' && entry.storyTimelineEvent.actorId === waking.actorId
            && entry.storyTimelineEvent.mindId === mind.id && entry.storyTimelineEvent.at === at))) fail('INVALID_STORY_FORK');
      const eventRef = this.#event(commit, 'story_morning_waking', { actorId: waking.actorId, mindId: mind.id, at, day: clock.day });
      const row = { anchor_id: waking.id, commit_ref: commit.commit_ref, actor_id: waking.actorId,
        mind_id: mind.id, at, day: clock.day, policy_ref: 'morning-waking@1', identity_json: canonical(identity), evidence_event_ref: eventRef };
      this.#db.prepare('INSERT INTO domain_story_anchors VALUES(?,?,?,?,?,?,?,?,?,?)').run(...Object.values(row), digest(row));
    }
    for (const death of facts.deaths || []) {
      const mind = Object.values(identity.minds).find(row => row.actorId === death.actorId);
      const bodyId = bodyForMind(identity, mind?.id); const body = identity.bodies[bodyId];
      const condition = state.caseRuntime?.conditionsByActor?.[body?.actorId];
      const confirmedCondition = condition?.status === 'dead' && condition.occurredAt === at
        || condition?.status === 'executed' && (condition.executedAt ?? condition.occurredAt) === at
        || state.caseOne?.executedIds?.includes(body?.actorId) && state.caseOne?.verdict
          && state.entries.some(entry => entry.executionScene?.verdictId === state.caseOne.verdict.id
            && entry.executionScene.step === 'completion' && entry.occurredAt === at);
      if (!mind || body?.alive !== false || !confirmedCondition || !death.id) fail('INVALID_STORY_FORK');
      const eventRef = this.#event(commit, 'story_actual_death', { actorId: death.actorId, mindId: mind.id, bodyId, at, day: clock.day });
      const row = { death_id: death.id, commit_ref: commit.commit_ref, actor_id: death.actorId, mind_id: mind.id,
        body_id: bodyId, at, day: clock.day, identity_json: canonical(identity), evidence_event_ref: eventRef };
      this.#db.prepare('INSERT INTO domain_story_deaths VALUES(?,?,?,?,?,?,?,?,?,?)').run(...Object.values(row), digest(row));
    }
  }
  /** Authenticate a detached execution slice from one real narrative base.
   * No caller callback, world hash or mutable projection installs occupancy. */
  assertOccupiedBodyProjection(state, magic, sourceState = state) {
    const source = this.assertOccupiedBodyWorld(sourceState);
    const saved = new MagicRepository(this.#db).readAt({ commitRef: source.commit_ref, runId: source.run_id });
    if (!saved || canonical(state.caseRuntime?.occupiedBody) !== canonical(occupiedBodyWorld(saved.state.identity))
      || canonical(magic.identity.occupants) !== canonical(saved.state.identity.occupants)) fail('INVALID_DOMAIN_STATE');
    return true;
  }
  /** Metadata-only adapter for the pure magic protocol. Neither request
   * authors nor models may invent anchors, death facts or memory references. */
  storyForkContext(state, actorId) {
    const execution = this.assertHead(state);
    const row = this.#db.prepare('SELECT death_id FROM domain_story_deaths WHERE commit_ref=? AND actor_id=?').get(execution.commit_ref, actorId);
    if (!row) fail('INVALID_STORY_FORK');
    const death = this.#storyFact('domain_story_deaths', 'death_id', row.death_id);
    const identity = parse(death.identity_json); const mindId = death.mind_id;
    const anchorRows = this.#db.prepare(`WITH RECURSIVE history(commit_ref,parent_commit_ref,depth) AS (
      SELECT commit_ref,parent_commit_ref,0 FROM domain_commits WHERE commit_ref=?
      UNION ALL SELECT c.commit_ref,c.parent_commit_ref,h.depth+1 FROM domain_commits c JOIN history h
        ON c.commit_ref=h.parent_commit_ref WHERE h.depth<4096
    ) SELECT a.anchor_id FROM domain_story_anchors a JOIN history h ON h.commit_ref=a.commit_ref
      WHERE a.actor_id=? AND a.mind_id=? AND a.at<? ORDER BY a.at DESC LIMIT 128`)
      .all(execution.commit_ref, actorId, mindId, death.at);
    const branchId = this.scope(state).branchId;
    return { actorId, mindId, playerMindId: identity.playerMindId,
      branch: { id: branchId, headCommitRef: execution.commit_ref, generation: execution.generation, time: execution.world_time },
      death: { kind: 'actual-death', id: death.death_id, mindId, branchId, at: death.at, day: death.day, reactionsClosed: false },
      anchors: anchorRows.map(row => {
        const anchor = this.#storyFact('domain_story_anchors', 'anchor_id', row.anchor_id);
        return { kind: 'morning-waking', id: anchor.anchor_id, actorId, branchId, commitRef: anchor.commit_ref,
          at: anchor.at, day: anchor.day, authorizedMindIds: [mindId], ancestorVerified: true };
      }),
      memoryRecords: this.#cognition.storyMemoryReferences({ commitRef: execution.commit_ref, actorId, mindId, branchId }) };
  }
  /** HOST_ONLY. Consume an already host-validated pure magic request. This
   * method independently proves its committed head, death, waking ancestor and
   * owner source closure; caller booleans are never ancestry authority.
   * A savepoint makes even a caught storage failure atomic. Caller MUST commit
   * compatibility projections/outbox/cancellation with the returned hooks.
   */
  applyStoryFork({ request, validatedInput, expectedRequestFingerprint, previousState, legacyEventId }) {
    this.#transaction();
    const savepoint = `story_${randomUUID().replaceAll('-', '')}`;
    const sqlScope = openSqliteScope(this.#db, savepoint);
    try {
      request = JSON.parse(canonicalJson(request));
      validatedInput = JSON.parse(canonicalJson(validatedInput));
      validateMagicBranchRequest(request, validatedInput);
      const { fingerprint, ...body } = request;
      if (fingerprint !== expectedRequestFingerprint || hash(canonicalJson(body)) !== fingerprint) fail('INVALID_STORY_FORK');
      const existing = this.#db.prepare('SELECT * FROM domain_story_branches WHERE request_id=?').get(request.requestId);
      if (existing) {
        const { integrity_hash: integrity, ...fields } = existing;
        if (digest(fields) !== integrity || existing.request_fingerprint !== fingerprint
          || existing.validation_json !== canonical(validatedInput)) fail('INVALID_STORY_FORK');
        sqlScope.release(); return JSON.parse(existing.receipt_json);
      }
      const execution = this.assertHead(previousState);
      const anchor = this.#storyFact('domain_story_anchors', 'anchor_id', request.target.anchorId);
      const death = this.#storyFact('domain_story_deaths', 'death_id', request.source.deathEventId);
      const source = this.#commit(anchor.commit_ref); const run = this.#run(execution.run_id);
      const identity = parse(death.identity_json); const originalIdentity = parse(anchor.identity_json);
      validateMagicIdentity(identity); validateMagicIdentity(originalIdentity);
      if (request.source.branchId !== this.scope(previousState).branchId || request.source.headCommitRef !== execution.commit_ref
        || request.source.generation !== execution.generation || death.commit_ref !== execution.commit_ref
        || death.mind_id !== request.mindId || death.actor_id !== request.actorId || death.at !== execution.world_time
        || identity.occupants[death.body_id] !== request.mindId || identity.bodies[death.body_id]?.alive !== false
        || identity.minds[request.mindId]?.actorId !== request.actorId
        || originalIdentity.minds[request.mindId]?.actorId !== request.actorId
        || originalIdentity.playerMindId !== identity.playerMindId
        || !originalIdentity.bodies[bodyForMind(originalIdentity, request.mindId)]?.alive
        || anchor.mind_id !== request.mindId || anchor.actor_id !== request.actorId
        || anchor.commit_ref !== request.target.commitRef || anchor.at !== request.target.at
        || source.run_id !== execution.run_id || !this.#ancestor(execution.commit_ref, source.commit_ref)
        || source.world_time >= execution.world_time || source.world_time !== anchor.at
        || validatedInput.anchor.at !== anchor.at || validatedInput.anchor.day !== anchor.day
        || validatedInput.death.day !== death.day || validatedInput.death.at !== death.at
        || validatedInput.playerMindId !== identity.playerMindId) fail('INVALID_STORY_FORK');
      if (previousState.storyLifeVersion === 1) {
        const reaction = this.#db.prepare('SELECT * FROM domain_story_reactions WHERE death_id=? AND commit_ref=?')
          .get(death.death_id, execution.commit_ref);
        if (!reaction) fail('INVALID_STORY_FORK');
        const { integrity_hash, ...fields } = reaction;
        const result = parse(reaction.result_json); const phases = parse(reaction.completed_phase_ids);
        if (digest(fields) !== integrity_hash || reaction.phase_limit !== MAGIC_PROTOCOL.maxReactionPhases
          || !Array.isArray(phases) || phases.length !== 1 || phases[0] !== parse(reaction.command_json).useId
          || result.receipt.useId !== phases[0] || result.state.branchRequests.at(-1)?.fingerprint !== request.fingerprint)
          fail('INVALID_STORY_FORK');
      }
      const definition = magicDefinition(request.definitionRef);
      if (!definition || definition.operation !== 'death-rewind' || definition.actorId !== request.actorId
        || canonical(definition) !== canonical(validatedInput.definition)
        || (definition.stage === 'basic' && anchor.day !== death.day)) fail('INVALID_STORY_FORK');
      const active = identity.playerMindId === request.mindId;
      if (request.activation !== (active ? 'activate-player-fork' : 'retain-player-original-NPC-fork-dormant')) fail('INVALID_STORY_FORK');
      // Authorize all refs (including record closure) before any body is read.
      this.#cognition.validateStoryCarry({ sourceCommitRef: execution.commit_ref, ownerId: request.actorId,
        memories: request.carry.memories, mindId: request.mindId, sourceBranchId: request.source.branchId });
      const state = parse(source.snapshot_json);
      state.generation = execution.generation + 1; state.revision = execution.revision + 1;
      state.restoredFrom = { generation: source.generation, revision: source.revision };
      const branchId = `story:${randomUUID()}`;
      const snapshotJson = JSON.stringify(state); const snapshotRef = `story-snapshot:${hash(snapshotJson + branchId)}`;
      const receipt = { requestId: request.requestId, requestFingerprint: fingerprint, branchId,
        commitRef: snapshotRef, namespaceRef: 'domain-story@1', branchKind: 'story_magic',
        active, dormant: !active, backgroundSimulation: false, sourceCommitRef: execution.commit_ref,
        anchorCommitRef: source.commit_ref, state: active ? state : null,
        restoredIdentity: active ? originalIdentity : null,
        callerHooks: { replaceCompatibilityHead: active, appendLegacyEvent: active,
          legacyEventId: active ? legacyEventId : null, legacyEventKind: active ? 'story_rewind' : null,
          sourceExecution: { branchId: execution.branch_id, commitRef: execution.commit_ref,
            generation: execution.generation, revision: execution.revision },
          invalidateGeneration: active ? execution.generation : null,
          cancelSourceTasks: active, publishOutboxAfterCommit: active, permanentDeathGate: 'fork-receipt-required' } };
      // Insert explicit story namespace first; its authorization branch is the
      // anchor's existing v1 namespace, NOT a fake load/rewind branch.
      if (active) {
        if (!integer(legacyEventId, 1)) fail('INVALID_STORY_FORK');
        receipt.commitRef = randomUUID();
      }
      const row = { branch_id: branchId, branch_kind: 'story_magic', namespace_ref: 'domain-story@1',
        policy_ref: 'owner-mind-source-closure@1', request_id: request.requestId, request_fingerprint: fingerprint,
        request_json: canonical(request), validation_json: canonical(validatedInput), source_execution_ref: execution.commit_ref, anchor_id: anchor.anchor_id,
        authorization_branch_id: source.branch_id, activation: request.activation, snapshot_json: snapshotJson,
        snapshot_hash: hash(snapshotJson), random_lineage_ref: run.random_lineage_ref, receipt_json: canonical(receipt) };
      this.#db.prepare(`INSERT INTO domain_story_branches VALUES(${Array(17).fill('?').join(',')})`).run(...Object.values(row), digest(row));
      if (active) {
        this.#storyWrite = { request, source, execution, branchId, commitRef: receipt.commitRef };
        try { this.record({ legacyEventId, kind: 'story_rewind', state, previousState, storySource: { requestId: request.requestId, requestFingerprint: fingerprint } }); }
        finally { this.#storyWrite = undefined; }
      }
      sqlScope.release(); return receipt;
    } catch (error) {
      sqlScope.rollback();
      if (typeof error?.code === 'string' && (/^(?:INVALID_|SOURCE_VERSION_|MAGIC_|ERR_COGNITION_)/u.test(error.code))) throw error;
      fail('INVALID_STORY_FORK');
    }
  }
  /** Versioned HOST queue. Certificate bodies are read only from immutable
   * Domain facts, never accepted from an actor or an arbitrary callback. */
  storyDeathReaction(state, ref) {
    const commit = this.assertHead(state);
    const row = this.#db.prepare('SELECT * FROM domain_story_reaction_queue WHERE reaction_ref=? AND commit_ref=?').get(ref, commit.commit_ref);
    if (!row) fail('INVALID_STORY_FORK');
    const { integrity_hash, ...fields } = row;
    if (digest(fields) !== integrity_hash || this.#db.prepare('SELECT 1 FROM domain_story_reactions WHERE death_id=?').get(row.death_id)) fail('INVALID_STORY_FORK');
    const certificate = parse(row.certificate_json);
    const death = this.#storyFact('domain_story_deaths', 'death_id', row.death_id);
    if (death.commit_ref !== commit.commit_ref || certificate.rootEventId !== death.death_id
      || certificate.actorId !== death.actor_id || certificate.phaseLimit !== MAGIC_PROTOCOL.maxReactionPhases
      || !Array.isArray(certificate.completedPhaseIds) || certificate.completedPhaseIds.length
      || certificate.id !== ref || certificate.type !== 'death-reaction-phase' || certificate.definitionRef !== 'hiro:basic@1'
      || certificate.at !== commit.world_time || certificate.branchId !== commit.branch_id || certificate.headCommitRef !== commit.commit_ref
      || certificate.generation !== commit.generation || certificate.revision !== commit.revision) fail('INVALID_STORY_FORK');
    return { ...certificate, entry: { observationKey: ref, delivery: 'action', speakerId: death.actor_id,
      audienceIds: [death.actor_id], occurredAt: death.at } };
  }
  /** Life publication is a closed HOST extension, not a callback. The actual
   * death and observations are inserted first; queue, magic ledger and any
   * cognition deltas precede sealing. The outer engine transaction owns COMMIT. */
  recordWithStoryLife(input, projection) {
    this.#transaction();
    if (this.#lifeWrite || this.#magicWrite || input.kind !== 'act' || input.state?.storyLifeVersion !== 1
      || input.state?.agentActions?.at(-1)?.storyLifeVersion !== 1) fail('INVALID_STORY_FORK');
    validateRosterMagicState(projection);
    const savepoint = `story_life_${randomUUID().replaceAll('-', '')}`;
    const sqlScope = openSqliteScope(this.#db, savepoint);
    const execution = input.state.agentActions.at(-1);
    if (execution.executionLife) this.#validateExecutionLife(input.previousState, input.state, projection);
    this.#lifeWrite = { projection, reaction: null, previousState: input.previousState };
    try {
      const commit = this.record(input); const reaction = this.#lifeWrite.reaction;
      if (execution.executionLife) this.assertExecutionLifeHistory(input.state);
      sqlScope.release(); return { commit, reaction };
    } catch (error) { sqlScope.rollback(); throw error; }
    finally { this.#lifeWrite = undefined; }
  }
  #validateExecutionLife(before, state, projection) {
    const source = this.#at(before); const action = state.agentActions.at(-1);
    const expectedAction = executionLifeAction(before, action.executionLife?.requestId);
    if (!magicId(expectedAction.executionLife.requestId) || canonical(action) !== canonical(expectedAction)) fail('INVALID_STORY_FORK');
    const saved = new MagicRepository(this.#db).readAt({ commitRef: source.commit_ref, runId: source.run_id });
    const canonicalProjection = saved && refreshHostMagic(before, saved.state, { branchId: source.branch_id, commitRef: source.commit_ref,
      generation: before.generation, revision: before.revision }, { domainStore: this });
    if (!saved || canonical(projection.identity) !== canonical(canonicalProjection.identity)
      || canonical(projection.grants) !== canonical(canonicalProjection.grants)
      || canonicalProjection.identity.bodies['body:hiro']?.alive !== true
      || projection.identity.occupants['body:hiro'] !== 'mind:hiro'
      || bodyForMind(projection.identity, 'mind:hiro') !== 'body:hiro'
      || canonical(projection.identity.occupants) !== canonical(saved.state.identity.occupants)) fail('INVALID_STORY_FORK');
    const expected = structuredClone(before); applyProcedureExecution(expected, expectedAction);
    const actual = structuredClone(state); actual.turnIds = before.turnIds;
    if (canonical(expected) !== canonical(actual)) fail('INVALID_STORY_FORK');
    const proof = state.caseRuntime.executionLife;
    return structuredClone(proof);
  }
  assertExecutionLifeHistory(state) {
    const head = this.#at(state);
    const rows = this.#db.prepare(`WITH RECURSIVE history AS (
      SELECT commit_ref,parent_commit_ref FROM domain_commits WHERE commit_ref=?
      UNION ALL SELECT c.commit_ref,c.parent_commit_ref FROM domain_commits c JOIN history h ON c.commit_ref=h.parent_commit_ref
    ) SELECT c.* FROM history h JOIN domain_commits c USING(commit_ref)
      WHERE json_extract(c.snapshot_json,'$.agentActions[#-1].executionLife.version')=1 AND c.kind='act'`).all(head.commit_ref);
    for (const commit of rows) {
      const after = parse(commit.snapshot_json); const parent = this.#commit(commit.parent_commit_ref); const before = parse(parent.snapshot_json);
      const row = this.#db.prepare('SELECT * FROM domain_execution_life WHERE commit_ref=?').get(commit.commit_ref);
      const magic = new MagicRepository(this.#db).readAt({ commitRef: parent.commit_ref, runId: parent.run_id });
      if (!row || !magic || row.source_commit_ref !== parent.commit_ref || digest(parse(row.proof_json)) !== row.proof_hash) fail('INVALID_STORY_FORK');
      const sourceProjection = refreshHostMagic(before, magic.state, { branchId: parent.branch_id, commitRef: parent.commit_ref,
        generation: before.generation, revision: before.revision }, { domainStore: this });
      const proof = this.#validateExecutionLife(before, after, sourceProjection);
      const payload = parse(row.proof_json); const { eventRef, deathId, ...savedProof } = payload;
      const death = this.#storyFact('domain_story_deaths', 'death_id', row.death_id);
      const event = this.#db.prepare('SELECT kind,payload,payload_hash FROM domain_world_events WHERE event_ref=? AND commit_ref=?').get(eventRef, commit.commit_ref);
      if (canonical(proof) !== canonical(savedProof) || row.request_id !== proof.requestId || row.verdict_id !== proof.verdictId
        || deathId !== death.death_id || death.commit_ref !== commit.commit_ref || death.body_id !== 'body:hiro'
        || !event || event.kind !== 'execution_reaction_closed' || hash(event.payload) !== event.payload_hash
        || canonical(parse(event.payload)) !== canonical({ ...proof, deathId })) fail('INVALID_STORY_FORK');
    }
    return true;
  }
  #publishStoryLife(commit, state, storyFacts) {
    if (!this.#lifeWrite) return;
    if (state.caseOutcome?.status === 'pending' && state.caseOutcome.subjectId === 'hiro'
      && !storyFacts?.deaths?.some(row => row.actorId === 'hiro')) fail('INVALID_STORY_FORK');
    if (!storyFacts?.deaths?.some(row => row.actorId === 'hiro')) return;
    if (state.agentActions.at(-1)?.executionLife) {
      const death = this.#db.prepare("SELECT death_id FROM domain_story_deaths WHERE commit_ref=? AND actor_id='hiro' AND body_id='body:hiro'").get(commit.commit_ref);
      if (!death) fail('INVALID_STORY_FORK');
      const proof = this.#validateExecutionLife(this.#lifeWrite.previousState, state, this.#lifeWrite.projection);
      const eventRef = this.#event(commit, 'execution_reaction_closed', { ...proof, deathId: death.death_id });
      const payload = { ...proof, deathId: death.death_id, eventRef };
      this.#db.prepare('INSERT INTO domain_execution_life VALUES(?,?,?,?,?,?,?)').run(commit.commit_ref, commit.parent_commit_ref,
        proof.requestId, proof.verdictId, death.death_id, canonical(payload), digest(payload));
      return; // Source-authored noose suppression closes applicability BEFORE any rewind/anchor/queue.
    }
    const projection = refreshHostMagic(state, this.#lifeWrite.projection, this.scope(state));
    const grant = projection.grants.find(row => row.actorId === 'hiro' && row.definitionRef === 'hiro:basic@1' && row.enabled);
    if (!grant || projection.grants.some(row => row.actorId === 'hiro' && row.enabled && row.stage === 'awakened'))
      fail('INVALID_STORY_FORK');
    const context = this.storyForkContext(state, 'hiro');
    const bodyId = bodyForMind(projection.identity, context.mindId);
    if (grant.binding.kind === 'mind' && grant.binding.id !== context.mindId
      || grant.binding.kind === 'body' && grant.binding.id !== bodyId
      || grant.binding.kind === 'medium' && !projection.identity.bodies[bodyId]?.inventory.includes(grant.binding.id)) fail('INVALID_STORY_FORK');
    const anchor = context.anchors.find(row => row.day === context.death.day);
    if (!anchor) fail('INVALID_STORY_FORK');
    const ref = `death-phase:${context.death.id}`;
    const certificate = { id: ref, type: 'death-reaction-phase', actorId: 'hiro', definitionRef: grant.definitionRef,
      rootEventId: context.death.id, phaseLimit: MAGIC_PROTOCOL.maxReactionPhases, completedPhaseIds: [], at: state.worldTime,
      branchId: commit.branch_id, headCommitRef: commit.commit_ref, generation: state.generation, revision: state.revision };
    const queue = { reaction_ref: ref, death_id: context.death.id, commit_ref: commit.commit_ref, certificate_json: canonical(certificate) };
    this.#db.prepare('INSERT INTO domain_story_reaction_queue VALUES(?,?,?,?,?)').run(...Object.values(queue), digest(queue));
    const sources = this.retrieveCognition(state, 'hiro', { recentLimit: 1, recallLimit: 0 });
    // Existing magic-host accepts typed certificates in a world execution
    // envelope. This private entry is materialized ONLY from the durable queue,
    // never added to the canonical snapshot, player transcript or cognition.
    const certified = this.storyDeathReaction(state, ref);
    const executionState = structuredClone(state);
    executionState.entries.push({ ...certified.entry, id: ref, speaker: '本人', text: '实际死亡反应阶段。',
      hostMagicEvent: certificate });
    const executionProjection = refreshHostMagic(executionState, projection, this.scope(state));
    const domainAdapter = { storyForkContext: (supplied, actorId) => {
      if (actorId !== 'hiro' || canonical(supplied) !== canonical(executionState)) fail('INVALID_STORY_FORK');
      return this.storyForkContext(state, actorId);
    } };
    const targets = hostMagicCapabilities(executionState, executionProjection, 'hiro', sources).targets;
    const self = targets.find(row => row.kind === 'body' && row.label === '本人身体');
    if (!self) fail('INVALID_STORY_FORK');
    const command = { type: 'magic_cast', useId: `auto:${context.death.id}`, actorId: 'hiro', grantId: grant.id,
      definitionRef: grant.definitionRef, activation: 'reaction', targetHandle: self.handle,
      parameters: { anchorId: anchor.id, memoryWhitelist: context.memoryRecords.map(row => row.id) } };
    const result = executeHostMagic({ ...executionState, magic: executionProjection }, 'hiro', command, sources,
      { refs: [ref], domainStore: domainAdapter });
    if (result.domainDeltas.observations.length || result.domainDeltas.memoryAccess.length || result.domainDeltas.sharedMemories.length
      || result.entries.length || result.requiredHooks.some(hook => hook !== 'domain-story-fork-transaction')) fail('INVALID_STORY_FORK');
    const request = result.state.magic.branchRequests.at(-1);
    if (!request || request.source.deathEventId !== context.death.id) fail('INVALID_STORY_FORK');
    // A reaction is authorized BY this actual death commit, not its parent.
    // Keep the authentic result in its own immutable reaction ledger; never
    // falsify projection.headCommitRef to fit active-cast repository semantics.
    const ledgerResult = { state: result.state.magic, receipt: result.receipt,
      events: result.state.magic.effects.filter(row => result.receipt.effectIds.includes(row.id)).map(row => row.event) };
    const resolved = { death_id: context.death.id, commit_ref: commit.commit_ref, phase_limit: MAGIC_PROTOCOL.maxReactionPhases,
      completed_phase_ids: canonical([command.useId]), command_json: canonical(command), result_json: canonical(ledgerResult) };
    this.#db.prepare('INSERT INTO domain_story_reactions VALUES(?,?,?,?,?,?,?)').run(...Object.values(resolved), digest(resolved));
    this.#event(commit, 'story_death_reaction', { deathId: context.death.id, reactionRef: ref,
      phaseLimit: MAGIC_PROTOCOL.maxReactionPhases, completedPhaseIds: [command.useId], commandFingerprint: abilityDigest(command),
      requestFingerprint: request.fingerprint });
    this.#lifeWrite.reaction = { command, request,
      projection: refreshHostMagic(state, result.state.magic, this.scope(state)), anchorId: anchor.id,
      memoryWhitelist: command.parameters.memoryWhitelist };
  }
  #durableOccupancy(state) {
    if (!state.caseRuntime?.occupiedBody) return;
    const commit = this.assertOccupiedBodyWorld(state);
    const rows = this.#db.prepare(`WITH RECURSIVE h AS (
      SELECT commit_ref,parent_commit_ref,run_id,0 depth FROM domain_commits WHERE commit_ref=?
      UNION ALL SELECT c.commit_ref,c.parent_commit_ref,c.run_id,h.depth+1 FROM domain_commits c JOIN h ON c.commit_ref=h.parent_commit_ref WHERE h.depth<4096
    ) SELECT c.snapshot_json,m.events_json,m.projection_json FROM h JOIN domain_commits c USING(commit_ref)
      JOIN host_magic_commits_v2 m ON m.commit_ref=c.commit_ref AND m.branch_id=c.branch_id ORDER BY h.depth DESC`).all(commit.commit_ref);
    let occupants;
    for (const row of rows) {
      const projection = parse(row.projection_json), snapshot = parse(row.snapshot_json), events = parse(row.events_json);
      if (occupants && canonical(occupants) !== canonical(projection.identity.occupants)
        || events.some(event => event.operation === 'body-swap')) {
        if (this.#db.prepare('SELECT 1 FROM domain_swap_lifecycle WHERE commit_ref=?').get(this.#at(snapshot).commit_ref)) this.assertSwapLifecycleHistory(snapshot);
        else this.assertOccupiedBodyPrimary(snapshot);
      }
      else if (!occupants && Object.entries(projection.identity.occupants).some(([body, mind]) =>
        projection.identity.bodies[body].actorId !== projection.identity.minds[mind].actorId)) fail('INVALID_DOMAIN_STATE');
      occupants = projection.identity.occupants;
    }
    if (!occupants) fail('INVALID_DOMAIN_STATE');
  }
  #durablePlan(state, command, magic, commit = this.#at(state)) {
    this.#durableOccupancy(state);
    const definition = magicDefinition(command.definitionRef);
    if (!magicExact(command, ['type','useId','actorId','grantId','definitionRef','activation','targetHandle','parameters'])
      || command.type !== 'magic_cast' || command.activation !== 'intent' || !magicId(command.useId)
      || definition?.ref !== 'milia:awakened@1' || !magicExact(command.parameters, ['channel'])
      || command.parameters.channel !== 'scene-durable-all@1') fail('MAGIC_PARAMETER_SCHEMA');
    const grant = magic.grants.find(row => row.id === command.grantId && row.enabled);
    const mind = Object.values(magic.identity.minds).find(row => row.actorId === command.actorId);
    if (!grant || grant.binding.kind !== 'body' || !mind || grant.definitionRef !== definition.ref
      || !grantMatchesIdentity(grant, magic.identity, command.actorId)
      || !knownMagicActions(magic, command.actorId).some(row => row.grantId === grant.id)) memoryGate('durable-enabled-awakened-body-grant-and-independent-recognition');
    if (state.completed || state.guardReaction?.pending || state.guardReaction?.detention
      || magic.effects.some(row => row.status === 'suppressed' && row.event.definitionRef === definition.ref
        && row.event.sourceMindId === mind.id)) memoryGate('durable-current-cast-eligibility');
    const scene = runtimeContinuousScene(state, command.actorId, state.caseRuntime?.occupiedBody ? { occupiedBodyVersion: 1 } : {});
    if (scene.status !== 'resolved') memoryGate(`durable-scene:${scene.reason}`);
    const participants = scene.participantActorIds.map(actorId => {
      const owner = Object.values(magic.identity.minds).find(row => row.actorId === actorId);
      if (!owner) fail('INVALID_DOMAIN_STATE');
      return { mindId: owner.id, actorId, bodyId: bodyForMind(magic.identity, owner.id) };
    });
    const scope = { version: 1, runId: commit.run_id, branchId: commit.branch_id, headCommitRef: commit.commit_ref,
      generation: commit.generation, revision: commit.revision, worldTime: commit.world_time, useId: command.useId,
      definition: { ref: definition.ref, fingerprint: definition.fingerprint }, sourcePolicy: { ...durablePolicy } };
    const metadata = participants.flatMap(({ actorId }) => this.#cognition.durableMemoryMetadata({ commitRef: commit.commit_ref,
      actorId, generation: commit.generation, revision: commit.revision }));
    if (metadata.length > 128) fail('ERR_COGNITION_BUDGET');
    const sources = metadata.map(row => ({ observationId: row.id,
      sourceOwnerMindId: participants.find(p => p.actorId === row.owner_id).mindId, ownerActorId: row.owner_id,
      sourceCommitRef: row.commit_ref, sourceRunId: row.run_id, sourceOriginBranchId: row.origin_branch_id,
      learnedAt: row.learned_at, citation: { ref: row.event_ref, fingerprint: abilityDigest(row) },
      authorizationRef: `durable-source:${abilityDigest([scope, row]).slice(0, 40)}`, authorizationScope: structuredClone(scope) }));
    const plan = buildDurableMemoryAcquisitionPlan({ scope, casterMindId: mind.id,
      scene: { sceneId: scene.roomId, continuityRef: `scene:${abilityDigest(scene).slice(0, 40)}` }, participants,
      participantManifest: { kind: 'complete-cast-scene-participants', closureRef: `scene:${abilityDigest(scene).slice(0, 40)}`,
        mindIds: participants.map(row => row.mindId) }, sources,
      sourceManifest: { kind: 'complete-cast-owned-memory-metadata', closureRef: `sources:${abilityDigest(metadata).slice(0, 40)}`,
        owners: participants.map(row => ({ sourceOwnerMindId: row.mindId, closureRef: `owner:${abilityDigest([row, metadata]).slice(0, 40)}`,
          observationIds: sources.filter(source => source.sourceOwnerMindId === row.mindId).map(source => source.observationId) })) }, priorUses: [] });
    return plan;
  }
  runDurableMemoryAcquisition(state, rawCommand, work) {
    this.#transaction();
    if (this.#durableChannel || this.#memoryChannel || typeof work !== 'function') memoryGate('domain-private-durable-authority');
    const command = magicJson(rawCommand), scope = this.scope(state);
    this.assertDurableMemoryAcquisitionHistory(state);
    const saved = new MagicRepository(this.#db).readAt(scope);
    if (!saved) memoryGate('durable-enabled-awakened-body-grant-and-independent-recognition');
    const magic = refreshHostMagic(state, saved.state, scope, { domainStore: this });
    if (!hostMagicCapabilities(state, magic, command.actorId, {}).targets.some(row => row.handle === command.targetHandle && row.kind === 'body'))
      fail('MAGIC_HANDLE_PERMISSION');
    if (magic.uses.some(row => row.id === command.useId) || this.#db.prepare('SELECT 1 FROM domain_durable_acquisitions WHERE run_id=? AND use_id=?')
      .get(scope.runId, command.useId)) fail('MAGIC_IDEMPOTENCY_CONFLICT');
    const plan = this.#durablePlan(state, command, magic);
    // All owners' metadata above has authorized before this FIRST source-body read.
    const bodies = new Map();
    for (const p of plan.request.participants) {
      const ids = plan.request.sources.filter(s => s.sourceOwnerMindId === p.mindId).map(s => s.observationId);
      for (const row of this.#cognition.durableMemoryBodies({ commitRef: scope.commitRef, actorId: p.actorId,
        generation: scope.generation, revision: scope.revision }, ids)) bodies.set(row.id, row);
    }
    // Project the current supported post-cast mandatory base with exact copy
    // identities. No job/task/receipt writes. Future input growth still validates
    // again at the real task boundary; admission never promises arbitrary fit.
    const prospectiveState = structuredClone(state); prospectiveState.revision++;
    const projections = [];
    for (const p of plan.request.participants) {
      const pending = this.#cognition.durablePending({ commitRef: scope.commitRef, actorId: p.actorId,
        generation: scope.generation, revision: scope.revision });
      const acquisitionId = `acquisition:${abilityDigest([plan.planDigest, command.useId]).slice(0, 48)}`;
      const rows = plan.request.sources.map(s => ({ id: s.sourceOwnerMindId === p.mindId ? s.observationId
        : `durable:${abilityDigest([acquisitionId, p.mindId, s.observationId]).slice(0, 48)}`, text: bodies.get(s.observationId).text,
        channel: s.sourceOwnerMindId === p.mindId ? bodies.get(s.observationId).channel : 'durable_memory_acquisition',
        occurredAt: s.sourceOwnerMindId === p.mindId ? bodies.get(s.observationId).occurred_at : state.worldTime,
        learnedAt: s.sourceOwnerMindId === p.mindId ? bodies.get(s.observationId).learned_at : state.worldTime,
        ...(s.sourceOwnerMindId === p.mindId && bodies.get(s.observationId).source_actor_handle
          ? { sourceActorHandle: bodies.get(s.observationId).source_actor_handle, sourceRelation: bodies.get(s.observationId).source_relation } : {}),
        revision: state.revision, actorId: p.actorId, branchId: scope.branchId, generation: state.generation }));
      const closure = [...new Map([...pending.requiredDurableAcquisitionObservations, ...rows].map(row => [row.id, row])).values()];
      const retrieval = this.#cognition.retrieve({ commitRef: scope.commitRef, actorId: p.actorId,
        generation: scope.generation, revision: scope.revision, query: '', recentLimit: 6, recallLimit: 0, includeBackground: true });
      const execution = { actorId: p.actorId, branchId: scope.branchId, generation: state.generation, revision: prospectiveState.revision };
      for (const key of ['recentObservations','backgroundObservations','sourceObservations','requiredObservations','recall','relationshipObservations'])
        if (retrieval[key]) retrieval[key] = retrieval[key].map(row => ({ ...row, ...execution }));
      retrieval.scope = execution;
      retrieval.requiredDurableAcquisitionObservations = closure.map(row => ({ ...row, ...execution }));
      const subjective = this.#decisions.read({ commitRef: scope.commitRef, actorId: p.actorId,
        generation: scope.generation, revision: scope.revision });
      const workingSources = this.#decisions.readSourceObservations({ commitRef: scope.commitRef, actorId: p.actorId,
        generation: scope.generation, revision: scope.revision }).map(row => ({ ...row, ...execution }));
      projections.push({ actorId: p.actorId, retrieval, subjective, workingSources });
    }
    const packetPlan = { version: 6, dialogueContextVersion: runtimeRevisionForState(state).policy.playerPerformanceVersion === 2 ? 1 : undefined };
    for (const projected of projections) {
      if (projected.actorId === createdPlayerId(state))
        assemblePlayerTaskRecall(projected.retrieval, actorForState(prospectiveState, projected.actorId).persona, prospectiveState.location);
      else if (projected.subjective) {
        const input = npcDecisionTaskInput(prospectiveState, projected.actorId, projected.subjective, packetPlan);
        const { context } = assembleNpcDecisionTaskPayload({ ownerId: projected.actorId,
          runtimePolicy: runtimeRevisionForState(prospectiveState).policy, worldTime: prospectiveState.worldTime,
          dialogueContextVersion: packetPlan.dialogueContextVersion, actorInput: input, subjective: projected.subjective,
          retrieval: projected.retrieval, workingSourceObservations: projected.workingSources, receivedObservations: [] });
        finalizeActorTaskPacket({ role: 'roleplay', context, behaviorPrompt: '', maxBytes: 32000 }, packetPlan);
      }
    }
    if (this.#durableTaskPreflight) {
      const outcome = this.#durableTaskPreflight({ state: structuredClone(prospectiveState), sourceHeadRef: scope.commitRef,
        command: structuredClone(command), plan, projections: structuredClone(projections) });
      if (outcome && typeof outcome.then === 'function') fail('INVALID_DOMAIN_STATE');
      if (this.assertHead(state).commit_ref !== scope.commitRef) fail('INVALID_DOMAIN_STATE');
    }
    const capability = Object.freeze(Object.create(null));
    const channel = { capability, active: true, consumed: false, stateHash: abilityDigest(state), magicHash: abilityDigest(magic),
      command, magic, plan, bodies, scope, published: false };
    durableChannels.set(capability, { domain: this, channel }); this.#durableChannel = channel;
    try { return withSqliteScopeOwner(this.#db, this.#memoryPolicy?.connectionAuthorizer ?? null, () => work(capability)); }
    finally { channel.active = false; durableChannels.delete(capability); this.#durableChannel = undefined; }
  }
  #durableLifetime(channel) {
    if (!channel?.active || this.#durableChannel !== channel || !this.#db.isTransaction) memoryGate('domain-private-durable-authority');
    assertSqliteScopeOwner(this.#db);
  }
  consumeDurableMemoryAcquisition(capability, state, magic, command) {
    const issued = durableChannels.get(capability), channel = issued?.channel;
    if (issued?.domain !== this || channel?.consumed) memoryGate('domain-private-durable-authority');
    this.#durableLifetime(channel);
    if (channel.stateHash !== abilityDigest(state) || channel.magicHash !== abilityDigest(magic)
      || abilityDigest(command) !== abilityDigest(channel.command) || this.scope(state).commitRef !== channel.scope.commitRef)
      memoryGate('domain-private-durable-authority');
    channel.consumed = true;
    return channel.plan;
  }
  #assertDurablePrimary(previousState, nextState, publication, base, plan) {
    if (publication.executionRef !== DURABLE_EXECUTION_REF || canonical(publication.plan) !== canonical(plan)) fail('INVALID_DOMAIN_STATE');
    const { command, result } = publication;
    assertDurableMemoryAcquisitionPlan(plan);
    const grant = base.grants.find(row => row.id === command.grantId), mindId = plan.request.casterMindId;
    const acquisitionId = `acquisition:${abilityDigest([plan.planDigest, command.useId]).slice(0, 48)}`;
    const receipt = { useId: command.useId, actorId: command.actorId, status: 'acquired', occurredAt: base.time,
      executionRef: DURABLE_EXECUTION_REF, acquisitionIds: [acquisitionId], effectIds: [], planDigest: plan.planDigest,
      obligationDigest: plan.obligationDigest };
    const event = { id: acquisitionId, type: 'DurableMemoryAcquisitionEstablished', operation: 'durable-memory-acquisition',
      executionRef: DURABLE_EXECUTION_REF, useId: command.useId, definitionRef: command.definitionRef,
      definitionFingerprint: plan.request.scope.definition.fingerprint, grantId: command.grantId, sourceMindId: mindId,
      sourceBodyId: bodyForMind(base.identity, mindId), at: base.time, planDigest: plan.planDigest, obligationDigest: plan.obligationDigest };
    const use = { id: command.useId, commandHash: abilityDigest(command), definitionRef: command.definitionRef, grantId: grant.id,
      stage: grant.stage, binding: grant.binding, source: grant.source, branchId: base.branchId, headCommitRef: base.headCommitRef,
      at: base.time, sourceMindId: mindId, triggerEventId: null, receipt };
    if (base.uses.some(row => row.id === use.id) || canonical(result.receipt) !== canonical(receipt) || canonical(result.events) !== canonical([event])
      || canonical(result.state.uses) !== canonical([...base.uses, use])) fail('INVALID_DOMAIN_STATE');
    const expected = structuredClone(base); expected.uses.push(use);
    expected.host.appliedUseIds = [...base.host.appliedUseIds, command.useId];
    expected.host.worldFingerprint = abilityDigest(nextState);
    if (canonical(result.state) !== canonical(expected)) fail('INVALID_DOMAIN_STATE');
    const normalized = structuredClone(nextState); normalized.revision = previousState.revision;
    if (canonical(normalized) !== canonical(previousState)) fail('INVALID_DOMAIN_STATE');
    return acquisitionId;
  }
  recordWithDurableMemoryAcquisition(input, rawPublication) {
    const channel = this.#durableChannel; this.#durableLifetime(channel);
    const publication = magicJson(rawPublication);
    if (!magicExact(publication, ['executionRef','command','result','plan']) || !magicExact(publication.result, ['state','receipt','events'])
      || !channel.consumed || channel.published || this.#magicWrite || this.#durableWrite || input.kind !== 'magic_cast'
      || abilityDigest(publication.command) !== abilityDigest(channel.command)) fail('INVALID_DOMAIN_STATE');
    this.assertHead(input.previousState);
    this.#assertDurablePrimary(input.previousState, input.state, publication, channel.magic, channel.plan);
    const sqlScope = openSqliteScope(this.#db, 'durable_publish');
    this.#durableWrite = publication;
    try { const commit = this.record(input); this.#assertDurableRows(commit, publication.plan);
      channel.published = true; sqlScope.release(); return commit;
    } catch (error) { sqlScope.rollback(); throw error; } finally { this.#durableWrite = undefined; }
  }
  #publishDurableBeforeSeal(commit, publication) {
    const channel = this.#durableChannel; this.#durableLifetime(channel);
    if (commit.parent_commit_ref !== channel.scope.commitRef) fail('INVALID_DOMAIN_STATE');
    const id = publication.result.receipt.acquisitionIds[0];
    new MagicRepository(this.#db).append({ branchId: commit.branch_id, commitRef: commit.commit_ref,
      expectedHead: commit.parent_commit_ref, command: publication.command, result: publication.result });
    const payload = { command: publication.command, plan: publication.plan, result: publication.result };
    this.#db.prepare('INSERT INTO domain_durable_acquisitions VALUES(?,?,?,?,?,?,?,?,?,?,?,1)').run(id, commit.commit_ref,
      commit.parent_commit_ref, commit.run_id, commit.branch_id, publication.command.useId, DURABLE_EXECUTION_REF,
      canonical(publication.command), canonical(publication.plan), canonical(publication.result), abilityDigest(payload));
    for (const recipient of publication.plan.request.participants) {
      const eventRef = this.#event(commit, 'durable_memory_acquisition', { acquisitionId: id, recipientMindId: recipient.mindId,
        planDigest: publication.plan.planDigest, obligationDigest: publication.plan.obligationDigest });
      for (const obligation of publication.plan.obligations.filter(row => row.recipientMindId === recipient.mindId)) {
        const targetId = `durable:${abilityDigest([id, recipient.mindId, obligation.observationId]).slice(0, 48)}`;
        this.#cognition.appendObservations({ commitRef: commit.commit_ref, observations: [{ id: targetId, ownerId: recipient.actorId,
          eventRef, text: channel.bodies.get(obligation.observationId).text, channel: 'durable_memory_acquisition',
          occurredAt: commit.world_time, learnedAt: commit.world_time }] });
        this.#db.prepare('INSERT INTO cognition_durable_origins VALUES(?,?,?,?,?,?,?,?,?,1)').run(targetId, id, commit.commit_ref,
          recipient.actorId, recipient.mindId, obligation.ownerActorId, obligation.sourceOwnerMindId,
          obligation.observationId, obligation.sourceCommitRef);
      }
    }
  }
  #assertDurableRows(commit, plan) {
    const rows = this.#db.prepare(`SELECT d.*,o.owner_id,o.channel,o.learned_at,o.occurred_at,o.commit_ref AS actual_commit,
      o.run_id,o.origin_branch_id,o.event_ref FROM cognition_durable_origins d JOIN cognition_observations o ON o.id=d.observation_id
      WHERE d.commit_ref=? ORDER BY d.recipient_mind_id,d.source_observation_id`).all(commit.commit_ref);
    const expected = plan.obligations.map(row => [row.recipientMindId,row.observationId,row.sourceOwnerMindId,row.ownerActorId,row.sourceCommitRef]);
    const actual = rows.map(row => {
      const recipient = plan.request.participants.find(p => p.mindId === row.recipient_mind_id);
      if (!recipient || row.owner_id !== recipient.actorId || row.recipient_owner_id !== recipient.actorId
        || row.channel !== 'durable_memory_acquisition' || row.actual_commit !== commit.commit_ref || row.run_id !== commit.run_id
        || row.origin_branch_id !== commit.branch_id || row.learned_at !== commit.world_time || row.occurred_at !== commit.world_time
        || !this.#db.prepare("SELECT 1 FROM domain_world_events WHERE event_ref=? AND commit_ref=? AND kind='durable_memory_acquisition'")
          .get(row.event_ref, commit.commit_ref)) fail('INVALID_DOMAIN_STATE');
      return [row.recipient_mind_id,row.source_observation_id,row.source_mind_id,row.source_owner_id,row.source_commit_ref];
    });
    if (canonical(actual) !== canonical(expected)) fail('INVALID_DOMAIN_STATE');
  }
  assertDurableMemoryAcquisitionHistory(state) {
    const head = this.#at(state);
    const rows = this.#db.prepare(`WITH RECURSIVE h AS (
      SELECT commit_ref,parent_commit_ref,0 depth FROM domain_commits WHERE commit_ref=?
      UNION ALL SELECT c.commit_ref,c.parent_commit_ref,h.depth+1 FROM domain_commits c JOIN h ON c.commit_ref=h.parent_commit_ref WHERE h.depth<4096
    ) SELECT a.* FROM domain_durable_acquisitions a JOIN h USING(commit_ref) ORDER BY h.depth DESC`).all(head.commit_ref);
    const recordedCommits = new Set(rows.map(row => row.commit_ref));
    const magicCommits = this.#db.prepare("SELECT 1 FROM sqlite_schema WHERE type='table' AND name='host_magic_commits_v2'").get();
    const events = magicCommits ? this.#db.prepare(`WITH RECURSIVE h AS (
      SELECT commit_ref,parent_commit_ref FROM domain_commits WHERE commit_ref=?
      UNION ALL SELECT c.commit_ref,c.parent_commit_ref FROM domain_commits c JOIN h ON c.commit_ref=h.parent_commit_ref
    ) SELECT m.commit_ref FROM h JOIN host_magic_commits_v2 m USING(commit_ref)
      WHERE EXISTS(SELECT 1 FROM json_each(m.events_json) e WHERE json_extract(e.value,'$.operation')='durable-memory-acquisition')`).all(head.commit_ref) : [];
    if (events.some(row => !recordedCommits.has(row.commit_ref))) fail('INVALID_DOMAIN_STATE');
    for (const row of rows) {
      const commit = this.#commit(row.commit_ref), source = this.#commit(row.source_head_ref), previous = parse(source.snapshot_json);
      const command = parse(row.command_json), plan = parse(row.plan_json), result = parse(row.result_json);
      if (source.commit_ref !== commit.parent_commit_ref || row.run_id !== commit.run_id || row.branch_id !== commit.branch_id
        || abilityDigest({ command, plan, result }) !== row.integrity_hash) fail('INVALID_DOMAIN_STATE');
      const saved = new MagicRepository(this.#db).readAt({ commitRef: source.commit_ref, runId: source.run_id });
      const base = refreshHostMagic(previous, saved.state, { branchId: source.branch_id, commitRef: source.commit_ref,
        generation: source.generation, revision: source.revision }, { domainStore: this });
      const rebuilt = this.#durablePlan(previous, command, base, source);
      this.#assertDurablePrimary(previous, parse(commit.snapshot_json), { executionRef: row.execution_ref, command, plan, result }, base, rebuilt);
      const ledger = new MagicRepository(this.#db).readAt({ commitRef: commit.commit_ref, runId: commit.run_id });
      if (ledger.commitRef !== commit.commit_ref || ledger.commandHash !== abilityDigest(command)
        || canonical(ledger.state) !== canonical(result.state) || canonical(ledger.receipt) !== canonical(result.receipt)
        || canonical(ledger.events) !== canonical(result.events)) fail('INVALID_DOMAIN_STATE');
      this.#assertDurableRows(commit, plan);
    }
    return true;
  }
  recordDurableMemoryTaskDelivery(state, { jobId, slot }) {
    this.#transaction(); const scope = this.scope(state);
    const row = this.#db.prepare(`SELECT t.*,j.status,j.branch_id,j.generation,j.base_revision FROM agent_turn_tasks t
      JOIN agent_turn_jobs j USING(job_id) WHERE t.job_id=? AND t.slot=?`).get(jobId, slot);
    if (!row || row.status === 'cancelled' || row.branch_id !== scope.branchId || row.generation !== scope.generation
      || row.base_revision !== scope.revision || hash(row.input_json) !== row.input_hash) fail('INVALID_DOMAIN_STATE');
    const task = parse(row.input_json);
    if (!['roleplay','player_performance'].includes(task.role)) return;
    const pending = this.#cognition.durablePending({ commitRef: scope.commitRef, actorId: row.actor_id,
      generation: scope.generation, revision: scope.revision });
    const packet = task.role === 'player_performance' ? task.context?.data?.recall : task.context;
    const observations = packet?.observations;
    if (packet?.scope?.actorId !== row.actor_id || packet.scope.branchId !== scope.branchId
      || packet.scope.generation !== scope.generation || packet.scope.revision !== scope.revision) {
      if (pending.durableAcquisitionManifest.length) fail('INVALID_DOMAIN_STATE');
    }
    if (!pending.durableAcquisitionManifest.length) return;
    if (!Array.isArray(observations)) fail('INVALID_DOMAIN_STATE');
    for (const required of pending.requiredDurableAcquisitionObservations) {
      const matching = observations.filter(row => row.id === required.id);
      if (matching.length !== 1 || matching[0].text !== required.text
        || matching[0].revision !== scope.revision || matching[0].channel !== required.channel) fail('INVALID_DOMAIN_STATE');
    }
    for (const manifest of pending.durableAcquisitionManifest) {
      const id = `delivery:${abilityDigest([manifest.acquisitionId, row.actor_id, jobId, slot]).slice(0, 48)}`;
      if (!this.#db.prepare('SELECT 1 FROM domain_durable_delivery_receipts WHERE receipt_id=?').get(id))
        this.#db.prepare('INSERT INTO domain_durable_delivery_receipts VALUES(?,?,?,?,?,?,?,?,1)').run(id, manifest.acquisitionId,
          `mind:${row.actor_id}`, jobId, slot, row.input_hash, scope.commitRef, canonical(manifest.observationIds));
    }
  }

  /** Real cast scope: resolve policy without reading foreign cognition, then
   * select metadata using THIS Domain's private DatabaseSync. Callback lifetime
   * includes the engine's pre-seal publication/receipt/outbox, not COMMIT. */
  runMemoryChannel(state, rawCommand, work) {
    this.#transaction();
    if (this.#memoryChannel || typeof work !== 'function') memoryGate('domain-private-memory-transaction-authority');
    const command = magicJson(rawCommand);
    if (!magicExact(command, ['type', 'useId', 'actorId', 'grantId', 'definitionRef', 'activation', 'targetHandle', 'parameters'])
      || command.type !== 'magic_cast' || ![command.useId, command.actorId, command.grantId, command.definitionRef, command.targetHandle].every(magicId))
      fail('MAGIC_COMMAND_SCHEMA');
    const scope = this.scope(state);
    const saved = new MagicRepository(this.#db).readAt({ commitRef: scope.commitRef, runId: scope.runId });
    if (!saved) memoryGate('memory-enabled-known-awakened-acquisition');
    const magic = refreshHostMagic(state, saved.state, scope);
    const definition = magicDefinition(command.definitionRef);
    if (definition?.operation === 'mental-heal') memoryGate('P05-source-backed-mental-stabilization-not-memory-ACL-restoration');
    if (definition?.ref !== 'milia:awakened@1' || command.activation !== 'intent'
      || !knownMagicActions(magic, command.actorId).some(row => row.grantId === command.grantId && row.definitionRef === definition.ref)
      || magic.uses.some(row => row.id === command.useId)) memoryGate('memory-enabled-known-awakened-acquisition');
    // No fixture growth JSON is promoted to production lore. The default
    // resolver remains absent even when the SQL projection has fixture grants.
    if (!this.#memoryPolicy) memoryGate('P01-P02-approved-binding-growth-surrounding-direction-coverage-persistence');
    const casterBody = magic.identity.bodies[bodyForMind(magic.identity, `mind:${command.actorId}`)];
    const condition = state.caseRuntime?.conditionsByActor?.[casterBody?.actorId];
    if (!casterBody?.alive || state.completed || state.guardReaction?.pending || state.guardReaction?.detention
      || ['incapacitated', 'unavailable'].includes(condition?.status || condition)
      || magic.effects.some(effect => effect.status === 'suppressed' && effect.event.sourceMindId === `mind:${command.actorId}`
        && effect.event.definitionRef === definition.ref)) memoryGate('memory-current-cast-eligibility');
    const capabilities = hostMagicCapabilities(state, magic, command.actorId, {});
    const target = capabilities.targets.find(row => row.kind === 'body' && row.handle === command.targetHandle);
    if (!target || !magicExact(command.parameters, ['channel']) || command.parameters.channel !== 'surrounding-memory@1')
      fail('MAGIC_PARAMETER_SCHEMA');
    const law = magicJson(this.#memoryPolicy.resolve(Object.freeze({ state: structuredClone(state),
      magic: structuredClone(magic), command: structuredClone(command), scope: { ...scope } })));
    if (!magicExact(law, ['sourceActorIds', 'recipientActorIds', 'endsAt', 'acquisitionRef'])
      || !magicId(law.acquisitionRef) || !integer(law.endsAt) || law.endsAt <= state.worldTime
      || [law.sourceActorIds, law.recipientActorIds].some(rows => !Array.isArray(rows) || !rows.length || rows.length > 16
        || new Set(rows).size !== rows.length || rows.some(id => !magic.identity.minds[`mind:${id}`]
          || !magic.identity.bodies[bodyForMind(magic.identity, `mind:${id}`)]?.alive))) memoryGate('P02-complete-source-recipient-law-scope');
    const targetBody = Object.values(magic.identity.bodies).find(body =>
      `magic-${abilityDigest([{ branchId: magic.branchId, headCommitRef: magic.headCommitRef, generation: magic.generation },
        magic.time, `mind:${command.actorId}`, 'body', body.id]).slice(0, 40)}` === target.handle);
    if (!targetBody || !law.recipientActorIds.includes(magic.identity.minds[magic.identity.occupants[targetBody.id]].actorId))
      memoryGate('P02-complete-source-recipient-law-scope');
    // All source-owner closures authorize before ANY source text/summary read.
    const records = law.sourceActorIds.flatMap(actorId => this.#cognition.memoryChannelMetadata({
      commitRef: scope.commitRef, actorId, generation: scope.generation, revision: scope.revision }));
    if (!records.length || records.length > 128 || new Set(records.map(row => row.id)).size !== records.length)
      memoryGate('memory-source-complete-closure-budget');
    const capability = Object.freeze(Object.create(null));
    const channel = { capability, db: this.#db, domain: this, active: true, scope, stateHash: abilityDigest(state),
      magicHash: abilityDigest(magic), command, records, law, policyRef: this.#memoryPolicy.ref, result: null };
    memoryChannels.set(capability, channel); this.#memoryChannel = channel;
    try {
      // Engineering contract: raw SQL controls are DENIED for this interval.
      // Nested semantics use opaque owner scopes, never prepared raw controls.
      return withSqliteScopeOwner(this.#db, this.#memoryPolicy.connectionAuthorizer,
        scopes => work(capability, scopes));
    } finally {
      channel.active = false; this.#memoryChannel = undefined; memoryChannels.delete(capability);
    }
  }
  #assertMemoryChannelLifetime(channel) {
    if (!channel || !channel.active || channel.domain !== this || channel.db !== this.#db
      || this.#memoryChannel !== channel || !this.#db.isTransaction)
      memoryGate('domain-private-memory-transaction-authority');
    assertSqliteScopeOwner(this.#db);
  }
  /** Consumer, never issuer: actual private fields brand the Domain instance.
   * No db argument, raw retrieval, records, facts or caller proof is accepted. */
  consumeMemoryChannel(capability, state, magic, command) {
    const channel = memoryChannels.get(capability);
    if (!channel || !channel.active || channel.domain !== this || channel.db !== this.#db
      || this.#memoryChannel !== channel || !this.#db.isTransaction
      || channel.stateHash !== abilityDigest(state) || channel.magicHash !== abilityDigest(magic)
      || abilityDigest(command) !== abilityDigest(channel.command)
      || channel.consumed || channel.scope.commitRef !== this.scope(state).commitRef) memoryGate('domain-private-memory-transaction-authority');
    this.#assertMemoryChannelLifetime(channel);
    channel.consumed = true;
    return { records: structuredClone(channel.records), law: structuredClone(channel.law), policyRef: channel.policyRef };
  }
  /** HOST-only atomic publication. The world/events exist before cognition
   * sharing, but its save anchor does not. No arbitrary callback can bypass
   * the normal sealed-commit trigger. Caller still owns the outer COMMIT. */
  recordWithMagic(input, publication) {
    // Admission precedes record(), its ledger/sidecar and the first foreign
    // source body query. A replacement transaction remains untouched/committable.
    if (this.#memoryChannel) this.#assertMemoryChannelLifetime(this.#memoryChannel);
    this.#transaction();
    if (this.#magicWrite || input?.kind !== 'magic_cast') fail('INVALID_DOMAIN_STATE');
    publication = magicJson(publication);
    const keys = ['command', 'result', 'accessChanges', 'sharedMemories'];
    if ((!magicExact(publication, keys) && !magicExact(publication, [...keys, 'commandBinding']))
      || !Array.isArray(publication.accessChanges) || publication.accessChanges.length > 128
      || !Array.isArray(publication.sharedMemories) || publication.sharedMemories.length > 128
      || !magicId(publication.command?.useId) || publication.result?.receipt?.useId !== publication.command.useId
      || !Array.isArray(publication.result?.events)) fail('INVALID_DOMAIN_STATE');
    // An escaped issued result may acknowledge its exact immutable old commit,
    // but cannot enter record() as a NEW publication after callback lifetime.
    // Preserve old-signature primitives and the later exact saved-retry checks.
    if (!this.#memoryChannel && publication.result.events.some(event => event.authorizationRef?.startsWith('memory-channel:'))
      && !this.#db.prepare('SELECT 1 FROM domain_commits WHERE legacy_event_id=?').get(input.legacyEventId))
      memoryGate('domain-private-memory-transaction-authority');
    validateRosterMagicState(publication.result.state);
    if (input.previousState?.caseRuntime?.occupiedBody) {
      const existing = this.#db.prepare('SELECT commit_ref FROM domain_commits WHERE legacy_event_id=?').get(input.legacyEventId);
      if (existing) {
        if (publication.result.events.some(event => event.operation === 'body-swap')) this.assertOccupiedBodyPrimary(input.state);
      }
      else { this.assertHead(input.previousState); this.#occupiedPrimary(input.previousState, input.state, publication.result, publication.command); }
    }
    this.#validateMagicCommandBinding(publication);
    this.#validateMagicCognitionMapping(publication);
    const savedChannel = this.#db.prepare(`SELECT commit_ref FROM domain_memory_channels
      WHERE json_extract(command_json,'$.useId')=?`).get(publication.command.useId);
    if (savedChannel) this.assertMemoryChannelHistory(input.state);
    const savepoint = `magic_domain_${randomUUID().replaceAll('-', '')}`;
    const sqlScope = openSqliteScope(this.#db, savepoint);
    this.#magicWrite = publication;
    try {
      const commit = this.record(input);
      // Retry only acknowledges the ledger and source mapping already sealed
      // with this commit; never append observations to an old save anchor.
      this.#assertMagicPublication(commit, publication);
      sqlScope.release();
      return commit;
    } catch (error) {
      sqlScope.rollback();
      throw error;
    } finally { this.#magicWrite = undefined; }
  }
  /** Publish the native host baseline in the same ordinary act commit. This
   * adds no activation receipt, use, effect or revision; it only makes the
   * source projection recoverable by the next legal plan. */
  recordWithMagicBaseline(input, publication) {
    if (this.#magicWrite || this.#magicBaselineWrite || input?.kind !== 'act') fail('INVALID_DOMAIN_STATE');
    publication = magicJson(publication);
    if (!magicExact(publication, ['projection']) || !publication.projection) fail('INVALID_DOMAIN_STATE');
    this.#transaction();
    const savepoint = `magic_baseline_${randomUUID().replaceAll('-', '')}`;
    const sqlScope = openSqliteScope(this.#db, savepoint);
    this.#magicBaselineWrite = publication;
    try {
      const commit = this.record(input);
      this.#assertMagicBaseline(commit, publication.projection);
      sqlScope.release();
      return commit;
    } catch (error) {
      sqlScope.rollback();
      throw error;
    } finally { this.#magicBaselineWrite = undefined; }
  }
  // Scoped identity publication proof, not contact/consent source authority.
  // The parent is read on this private connection; caller JSON never supplies it.
  #occupiedPrimary(previousState, nextState, result, command, savedHash) {
    const parent = this.#at(previousState);
    const prior = new MagicRepository(this.#db).readAt({ commitRef: parent.commit_ref, runId: parent.run_id });
    if (!prior) fail('INVALID_DOMAIN_STATE');
    const base = refreshHostMagic(previousState, prior.state, { branchId: parent.branch_id, commitRef: parent.commit_ref,
      generation: parent.generation, revision: parent.revision }, { domainStore: this });
    const after = result.state;
    const changed = canonical(base.identity.occupants) !== canonical(after.identity.occupants);
    if (!changed && !result.events.some(event => event.operation === 'body-swap')) return false;
    const bad = () => fail('INVALID_DOMAIN_STATE');
    if (!previousState.caseRuntime?.occupiedBody || !nextState.caseRuntime?.occupiedBody
      || !magicExact(command, ['type', 'useId', 'actorId', 'grantId', 'definitionRef', 'activation', 'targetHandle', 'parameters'])
      || command.type !== 'magic_cast' || command.activation !== 'intent' || !magicId(command.useId)
      || savedHash !== undefined && savedHash !== abilityDigest(command)
      || after.branchId !== parent.branch_id || after.headCommitRef !== parent.commit_ref || after.generation !== parent.generation
      || after.time !== parent.world_time || nextState.worldTime !== parent.world_time
      || nextState.generation !== parent.generation || nextState.revision !== parent.revision + 1
      || base.uses.some(use => use.id === command.useId)) bad();
    const definition = magicDefinition(command.definitionRef);
    const uses = after.uses.filter(use => use.id === command.useId); const use = uses[0];
    const grant = base.grants.find(row => row.id === command.grantId && row.enabled);
    const sourceMindId = Object.values(base.identity.minds).find(row => row.actorId === command.actorId)?.id;
    const sourceBodyId = bodyForMind(base.identity, sourceMindId);
    if (!definition || definition.operation !== 'body-swap' || !grant || grant.definitionRef !== definition.ref
      || !grantMatchesIdentity(grant, base.identity, command.actorId) || !sourceBodyId
      || !base.knowledge.some(row => row.ownerMindId === sourceMindId && row.definitionRef === definition.ref && row.belief === 'known')
      || uses.length !== 1 || use.commandHash !== abilityDigest(command) || use.definitionRef !== definition.ref || use.grantId !== grant.id
      || use.branchId !== parent.branch_id || use.headCommitRef !== parent.commit_ref || use.at !== parent.world_time
      || use.sourceMindId !== sourceMindId || canonical(use.receipt) !== canonical(result.receipt)
      || result.receipt.useId !== command.useId || result.receipt.actorId !== command.actorId || result.receipt.status !== 'established'
      || result.receipt.occurredAt !== parent.world_time || !Array.isArray(result.receipt.effectIds)
      || result.receipt.effectIds.length !== 1 || new Set(result.receipt.effectIds).size !== 1
      || result.events.length !== 1 || result.events[0].id !== result.receipt.effectIds[0]
      || canonical(after.uses.filter(row => row.id !== command.useId)) !== canonical(base.uses)) bad();
    const expectedUse = { id: command.useId, commandHash: abilityDigest(command), definitionRef: definition.ref, grantId: grant.id,
      stage: grant.stage, binding: grant.binding, source: grant.source, branchId: parent.branch_id, headCommitRef: parent.commit_ref,
      at: parent.world_time, sourceMindId, triggerEventId: null, receipt: result.receipt };
    if (canonical(use) !== canonical(expectedUse)) bad();
    const event = result.events[0]; const effects = after.effects.filter(row => row.id === event.id);
    if (event.id !== `effect:${command.useId}` || base.effects.some(row => row.id === event.id)
      || effects.length !== 1 || canonical(effects[0].event) !== canonical(event)
      || event.type !== 'MagicEffectEstablished' || event.family !== 'identity' || event.operation !== 'body-swap'
      || event.definitionRef !== definition.ref || event.definitionFingerprint !== definition.fingerprint || event.grantId !== grant.id
      || event.sourceMindId !== sourceMindId || event.sourceBodyId !== sourceBodyId || event.at !== parent.world_time
      || event.sourceDeath !== definition.lifecycle.sourceDeath || !magicId(event.authorizationRef)
      || !base.identity.bodies[event.targetId] || event.targetId === sourceBodyId
      || event.payload?.originalTargetMindId !== base.identity.occupants[event.targetId]
      || Object.keys(command.parameters).length !== 0) bad();
    // Re-run the existing reducer from the genuine parent, not the supplied
    // final occupants. It checks living targets, overlap and exact payload.
    const expected = reduceMagicEffect(base, event);
    if (canonical(after.identity) !== canonical(expected.identity) || canonical(after.effects) !== canonical(expected.effects)
      || canonical(after.grants) !== canonical(base.grants) || canonical(after.knowledge) !== canonical(base.knowledge)
      || canonical(nextState.caseRuntime.occupiedBody) !== canonical(occupiedBodyWorld(expected.identity))) bad();
    for (const key of ['agentPositions', 'creation']) if (canonical(nextState[key] ?? null) !== canonical(previousState[key] ?? null)) bad();
    for (const key of ['objects', 'conditionsByActor', 'posesByActor', 'poseSourcesByActor'])
      if (canonical(nextState.caseRuntime[key] ?? null) !== canonical(previousState.caseRuntime[key] ?? null)) bad();
    const playerBody = expected.identity.bodies[bodyForMind(expected.identity, expected.identity.playerMindId)];
    if (nextState.location !== CREATED_ROOMS[playerBody.locationId]) bad();
    return true;
  }
  /** Actual saved primary proof before recovery adopts compatibility/outbox.
   * The exact command is immutable and sealed alongside the canonical ledger. */
  assertOccupiedBodyPrimary(state) {
    const commit = this.#at(state);
    const row = this.#db.prepare('SELECT * FROM domain_occupied_primaries WHERE commit_ref=?').get(commit.commit_ref);
    const saved = new MagicRepository(this.#db).readAt({ commitRef: commit.commit_ref, runId: commit.run_id });
    if (!row || !saved || saved.commitRef !== commit.commit_ref || saved.expectedHead !== commit.parent_commit_ref || commit.kind !== 'magic_cast'
      || row.source_commit_ref !== commit.parent_commit_ref || commit.previous_execution_ref !== commit.parent_commit_ref) fail('INVALID_DOMAIN_STATE');
    const parent = this.#commit(row.source_commit_ref);
    if (parent.run_id !== commit.run_id || parent.branch_id !== commit.branch_id
      || row.command_hash !== saved.commandHash
      || !this.#occupiedPrimary(parse(parent.snapshot_json), state,
        { state: saved.state, receipt: saved.receipt, events: saved.events }, parse(row.command_json), row.command_hash)) fail('INVALID_DOMAIN_STATE');
    return true;
  }
  #validateMagicCommandBinding(publication) {
    if (!Object.hasOwn(publication, 'commandBinding')) {
      const memoryIds = new Set(publication.result.events.filter(event =>
        ['mental-heal', 'memory-share', 'memory-revoke'].includes(event.operation)).map(event => event.id));
      if (publication.result.state.uses.some(use => use.receipt?.effectIds?.some(effectId => memoryIds.has(effectId))))
        fail('ERR_MAGIC_COGNITION_COMMAND_BINDING_REQUIRED');
      return;
    }
    // Internal producer transport, NOT a source-authority certificate. Only
    // retain an actual executed command; never reconstruct it from deltas or
    // rewrite the public/core hashes. Host memory authority remains gated.
    const binding = publication.commandBinding;
    if (!magicExact(binding, ['version', 'publicCommand', 'coreCommand'])
      || binding.version !== 'domain-magic-command-binding@1'
      || abilityDigest(binding.publicCommand) !== abilityDigest(publication.command)) fail('INVALID_DOMAIN_STATE');
    const command = binding.coreCommand;
    const state = publication.result.state;
    const use = state.uses.find(row => row.id === publication.command.useId);
    if (!use || command?.type !== 'magic_cast' || command.useId !== use.id
      || abilityDigest(command) !== use.commandHash
      || abilityDigest(publication.result.receipt) !== abilityDigest(use.receipt)
      || use.branchId !== state.branchId || use.headCommitRef !== state.headCommitRef || use.at !== state.time
      || !Array.isArray(use.receipt.effectIds) || !use.receipt.effectIds.length
      || use.receipt.effectIds.some(effectId => {
        const effect = state.effects.find(row => row.id === effectId);
        const events = publication.result.events.filter(row => row.id === effectId);
        return !effect || events.length !== 1 || abilityDigest(events[0]) !== abilityDigest(effect.event);
      })) fail('INVALID_DOMAIN_STATE');
    // One primary core command, plus validated reducer/lifecycle events, is
    // supported. Multiple genuine core casts need a separately reviewed batch
    // contract; a dummy request ID must not silently bypass their bindings.
    const eventIds = new Set(publication.result.events.map(row => row.id));
    if (state.uses.some(row => row.id !== use.id && row.receipt?.effectIds?.some(effectId => eventIds.has(effectId))))
      fail('INVALID_DOMAIN_STATE');
  }
  #validateMagicCognitionMapping(publication) {
    const sourceIds = ids => Array.isArray(ids) && ids.length > 0 && ids.length <= 128
      && new Set(ids).size === ids.length && ids.every(id => typeof id === 'string' && id.length > 0 && id.length <= 192);
    for (const row of publication.accessChanges) {
      if (!magicExact(row, ['ownerId', 'mindId', 'changes']) || !magicId(row.ownerId) || !magicId(row.mindId)
        || !Array.isArray(row.changes) || !row.changes.length || row.changes.length > 128) fail('INVALID_DOMAIN_STATE');
      for (const change of row.changes) if (!magicExact(change, ['effectId', 'observationIds', 'mode', 'status'])
        || !magicId(change.effectId) || !sourceIds(change.observationIds) || !['blocked', 'restored'].includes(change.mode)
        || !['active', 'suppressed', 'ended'].includes(change.status)) fail('INVALID_DOMAIN_STATE');
    }
    for (const row of publication.sharedMemories) if (!magicExact(row,
      ['effectId', 'ownerId', 'mindId', 'sourceOwnerId', 'sourceMindId', 'sourceObservationIds', 'sourceEntryRef'])
      || ![row.effectId, row.ownerId, row.mindId, row.sourceOwnerId, row.sourceMindId].every(magicId)
      || !sourceIds(row.sourceObservationIds) || typeof row.sourceEntryRef !== 'string' || !row.sourceEntryRef.length
      || row.sourceEntryRef.length > 192) fail('INVALID_DOMAIN_STATE');
  }
  #magicCognitionInput(commit, publication) {
    const accessChanges = publication.accessChanges.map(row => ({ ...row, commitRef: commit.commit_ref }));
    const sharedMemories = publication.sharedMemories.map(row => {
      // Resolve only the actual entry published in THIS commit. A guessed
      // event UUID or a previous event cannot authorize new knowledge.
      const events = this.#db.prepare(`SELECT event_ref FROM domain_world_events WHERE commit_ref=?
        AND run_id=? AND branch_id=? AND kind='statement' AND json_extract(payload,'$.sourceEntryRef')=?`)
        .all(commit.commit_ref, commit.run_id, commit.branch_id, row.sourceEntryRef);
      if (events.length !== 1) fail('INVALID_DOMAIN_STATE');
      const { sourceEntryRef, ...shared } = row;
      return { ...shared, commitRef: commit.commit_ref, eventRef: events[0].event_ref };
    });
    const ledger = { branchId: commit.branch_id, requestId: publication.command.useId,
      expectedHead: commit.parent_commit_ref, commandHash: abilityDigest(publication.command),
      ...(publication.commandBinding ? { publicCommand: publication.command, coreCommand: publication.commandBinding.coreCommand } : {}) };
    return { commitRef: commit.commit_ref, ledger, accessChanges, sharedMemories };
  }
  #assertMemoryChannelPlan(publication, channel) {
    const events = publication.result.events;
    const recipients = events.map(event => publication.result.state.identity.minds[
      publication.result.state.identity.occupants[event.targetId]]?.actorId).sort();
    if (abilityDigest(recipients) !== abilityDigest([...channel.law.recipientActorIds].sort())
      || events.some(event => event.operation !== 'memory-share' || event.definitionRef !== channel.command.definitionRef
        || event.grantId !== channel.command.grantId || event.sourceMindId !== `mind:${channel.command.actorId}`
        || event.at !== publication.result.state.time || event.expiresAt !== channel.law.endsAt
        || abilityDigest(event.payload.recordIds) !== abilityDigest(channel.records.map(row => row.id))
        || abilityDigest([...event.payload.localMindIds].sort()) !== abilityDigest([...new Set([
          ...channel.law.sourceActorIds, ...channel.law.recipientActorIds].map(id => `mind:${id}`))].sort())))
      fail('ERR_MAGIC_COGNITION_INCOMPLETE_PUBLICATION');
  }
  assertMemoryChannelHistory(state) {
    const scope = this.scope(state);
    if (!this.#db.prepare('SELECT 1 FROM domain_memory_channels LIMIT 1').get()) return true;
    const rows = this.#db.prepare(`WITH RECURSIVE h AS (
      SELECT commit_ref,parent_commit_ref FROM domain_commits WHERE commit_ref=?
      UNION ALL SELECT c.commit_ref,c.parent_commit_ref FROM domain_commits c JOIN h ON c.commit_ref=h.parent_commit_ref
    ) SELECT a.*,m.projection_json,m.receipt_json,m.events_json FROM domain_memory_channels a JOIN h USING(commit_ref)
      JOIN host_magic_commits_v2 m USING(commit_ref)`).all(scope.commitRef);
    for (const row of rows) {
      const publication = { command: parse(row.command_json), result: { state: parse(row.projection_json),
        receipt: parse(row.receipt_json), events: parse(row.events_json) } };
      if (abilityDigest(publication) !== row.publication_hash) fail('ERR_MAGIC_COGNITION_EFFECT_NOT_COMMITTED');
      this.#assertMemoryChannelPlan(publication, { command: publication.command,
        law: parse(row.law_json), records: parse(row.records_json) });
      const commit = this.#commit(row.commit_ref);
      const primary = publication.result.state.uses.find(use => use.id === publication.command.useId);
      const effect = publication.result.events.find(event => primary?.receipt.effectIds.includes(event.id));
      const originalInput = parse(row.input_json);
      if (!effect || row.source_commit_ref !== commit.parent_commit_ref
        || !magicExact(originalInput.parameters, ['channel']) || originalInput.parameters.channel !== 'surrounding-memory@1'
        || abilityDigest({ ...originalInput, parameters: null }) !== abilityDigest({ ...publication.command, parameters: null }))
        fail('ERR_MAGIC_COGNITION_EFFECT_NOT_COMMITTED');
      const coreCommand = { ...publication.command, parameters: { recordIds: effect.payload.recordIds } };
      const origins = this.#db.prepare(`SELECT origin.*,o.event_ref FROM magic_cognition_origins origin
        JOIN cognition_observations o ON o.id=origin.observation_id WHERE origin.commit_ref=?`).all(row.commit_ref);
      const access = this.#db.prepare(`SELECT a.* FROM magic_cognition_access a WHERE a.commit_ref=?
        AND NOT EXISTS(SELECT 1 FROM magic_cognition_origins o WHERE o.observation_id=a.observation_id)`).all(row.commit_ref);
      new MagicCognitionStore(this.#db).assertPublicationComplete({ commitRef: row.commit_ref,
        ledger: { branchId: commit.branch_id, requestId: publication.command.useId, expectedHead: commit.parent_commit_ref,
          commandHash: abilityDigest(publication.command), publicCommand: publication.command, coreCommand },
        accessChanges: access.map(item => ({ commitRef: row.commit_ref, ownerId: item.owner_id, mindId: item.mind_id,
          changes: [{ effectId: item.effect_id, observationIds: [item.observation_id], mode: item.access_mode, status: item.effect_status }] })),
        sharedMemories: origins.map(item => ({ commitRef: row.commit_ref, effectId: item.effect_id, ownerId: item.owner_id,
          mindId: item.mind_id, sourceOwnerId: item.source_owner_id, sourceMindId: item.source_mind_id,
          sourceObservationIds: [item.source_observation_id], eventRef: item.event_ref })) });
    }
    return true;
  }
  #publishMagicBaselineBeforeSeal(commit, publication) {
    const projection = publication.projection;
    if (!projection || projection.branchId !== commit.branch_id || projection.headCommitRef !== commit.parent_commit_ref
      || projection.generation !== commit.generation) fail('INVALID_DOMAIN_STATE');
    const ledger = new MagicRepository(this.#db); ledger.initialize();
    const useId = `magic-baseline:${commit.parent_commit_ref}`;
    // The roster projection has no top-level revision; its host receipt keeps
    // the actual source revision. Never serialize `undefined` into the ledger
    // command, and never invent a new revision on the magic projection.
    const revision = projection.host?.revision;
    if (!Number.isSafeInteger(revision) || revision < 0) fail('INVALID_DOMAIN_STATE');
    const command = { type: 'magic_baseline', useId, generation: projection.generation, revision };
    const result = { state: projection, receipt: { useId, status: 'baseline', effectIds: [],
      occurredAt: projection.time }, events: [] };
    ledger.append({ branchId: commit.branch_id, commitRef: commit.commit_ref,
      expectedHead: commit.parent_commit_ref, command, result });
  }
  #assertMagicBaseline(commit, projection) {
    const saved = new MagicRepository(this.#db).readAt({ commitRef: commit.commit_ref, runId: commit.run_id });
    if (!saved || canonical(saved.state) !== canonical(projection)) fail('INVALID_DOMAIN_STATE');
  }
  #publishMagicBeforeSeal(commit, publication) {
    const projection = publication.result.state;
    const channel = this.#memoryChannel;
    if (!channel && publication.result.events.some(event => event.authorizationRef?.startsWith('memory-channel:')))
      memoryGate('domain-private-memory-transaction-authority');
    if (channel) {
      this.#assertMemoryChannelLifetime(channel);
      if (!channel.active || !channel.consumed || channel.published || channel.scope.commitRef !== commit.parent_commit_ref)
        memoryGate('domain-private-memory-transaction-authority');
      channel.published = true;
      this.#assertMemoryChannelPlan(publication, channel);
      this.#db.prepare('INSERT INTO domain_memory_channels VALUES(?,?,?,?,?,?,?,?,?)').run(commit.commit_ref,
        channel.scope.commitRef, channel.policyRef, 'explicit-protocol-policy-not-production', canonical(publication.command),
        canonical(channel.command), canonical(channel.law), canonical(channel.records), abilityDigest({ command: publication.command, result: publication.result }));
    }
    if (projection.branchId !== commit.branch_id || projection.headCommitRef !== commit.parent_commit_ref
      || projection.generation !== commit.generation || projection.time !== commit.world_time) fail('INVALID_DOMAIN_STATE');
    const ledger = new MagicRepository(this.#db);
    ledger.initialize();
    if (ledger.read(commit.branch_id, publication.command?.useId)) fail('MAGIC_IDEMPOTENCY_CONFLICT');
    ledger.append({ branchId: commit.branch_id, commitRef: commit.commit_ref, expectedHead: commit.parent_commit_ref,
      command: publication.command, result: publication.result });
    if (parse(commit.snapshot_json).caseRuntime?.occupiedBody) {
      const parent = this.#commit(commit.parent_commit_ref);
      if (this.#occupiedPrimary(parse(parent.snapshot_json), parse(commit.snapshot_json), publication.result, publication.command))
        this.#db.prepare('INSERT INTO domain_occupied_primaries VALUES(?,?,?,?)').run(commit.commit_ref, parent.commit_ref,
          canonical(publication.command), abilityDigest(publication.command));
    }
    publishMagicCognition(this.#db, this.#magicCognitionInput(commit, publication));
  }
  #assertMagicPublication(commit, publication) {
    if (!this.#db.prepare("SELECT 1 FROM sqlite_schema WHERE type='table' AND name='host_magic_commits_v2'").get())
      fail('MAGIC_IDEMPOTENCY_CONFLICT');
    const ledger = this.#db.prepare(`SELECT command_hash,expected_head,projection_json,events_json,receipt_json
      FROM host_magic_commits_v2 WHERE branch_id=? AND commit_ref=? AND request_id=?`)
      .get(commit.branch_id, commit.commit_ref, publication.command.useId);
    if (!ledger || ledger.expected_head !== commit.parent_commit_ref || ledger.command_hash !== abilityDigest(publication.command)
      || abilityDigest(JSON.parse(ledger.projection_json)) !== abilityDigest(publication.result.state)
      || abilityDigest(JSON.parse(ledger.events_json)) !== abilityDigest(publication.result.events)
      || abilityDigest(JSON.parse(ledger.receipt_json)) !== abilityDigest(publication.result.receipt)) fail('MAGIC_IDEMPOTENCY_CONFLICT');
    const deltas = this.#magicCognitionInput(commit, publication);
    const canonicalRows = rows => rows.map(row => canonical(row)).sort();
    const expectedShared = deltas.sharedMemories.flatMap(row => row.sourceObservationIds.map(sourceId => ({
      ownerId: row.ownerId, mindId: row.mindId, sourceOwnerId: row.sourceOwnerId, sourceMindId: row.sourceMindId,
      sourceId, effectId: row.effectId, eventRef: row.eventRef })));
    const actualShared = this.#db.prepare(`SELECT origin.observation_id AS observationId,origin.owner_id AS ownerId,
      origin.mind_id AS mindId,origin.source_owner_id AS sourceOwnerId,origin.source_mind_id AS sourceMindId,
      origin.source_observation_id AS sourceId,origin.effect_id AS effectId,o.event_ref AS eventRef
      FROM magic_cognition_origins origin JOIN cognition_observations o ON o.id=origin.observation_id
      WHERE origin.commit_ref=?`).all(commit.commit_ref);
    if (canonical(canonicalRows(expectedShared)) !== canonical(canonicalRows(actualShared.map(({ observationId, ...row }) => row))))
      fail('MAGIC_IDEMPOTENCY_CONFLICT');
    const expectedAccess = deltas.accessChanges.flatMap(row => row.changes.flatMap(change => change.observationIds.map(sourceId => ({
      ownerId: row.ownerId, mindId: row.mindId, sourceId, effectId: change.effectId, mode: change.mode, status: change.status }))));
    expectedAccess.push(...actualShared.map(row => ({ ownerId: row.ownerId, mindId: row.mindId,
      sourceId: row.observationId, effectId: row.effectId, mode: 'restored', status: 'active' })));
    const actualAccess = this.#db.prepare(`SELECT owner_id AS ownerId,mind_id AS mindId,observation_id AS sourceId,
      effect_id AS effectId,access_mode AS mode,effect_status AS status FROM magic_cognition_access WHERE commit_ref=?`).all(commit.commit_ref);
    if (canonical(canonicalRows(expectedAccess)) !== canonical(canonicalRows(actualAccess.map(row => ({ ...row }))))) fail('MAGIC_IDEMPOTENCY_CONFLICT');
    // Saved SQL/caller agreement is not proof of completeness: independently
    // rederive effect, lifecycle and historical source obligations on retry too.
    new MagicCognitionStore(this.#db).assertPublicationComplete(deltas);
  }
  /** HOST-only engineering harness. Qualification never authorizes emotional
   * truth. There is intentionally NO production producer/profile registration,
   * recognition issuer, constructor evaluator callback or HTTP transport here. */
  growthStatus(state) {
    this.assertHead(state);
    return Object.freeze({ version: 1, productionRegistrationEnabled: false,
      gates: Object.freeze(['GROWTH_PROFILE_MISSING', 'GROWTH_SETTLED_PRODUCER_MISSING']),
      recognitionGate: 'GROWTH_LEARNED_RECOGNITION_PRODUCER_MISSING' });
  }
  stageProtocolGrowth(state, raw, activeJob = null) {
    this.#transaction();
    // canonical strict snapshot rejects executable metadata before inspection.
    growthMetadataDigest(raw);
    const operation = magicJson(raw);
    const shapes = { declare: ['qualification', 'type', 'profile', 'bodyId', 'factorId', 'slots'],
      evidence: ['qualification', 'type', 'declarationId', 'episodeId', 'mindId', 'emotionPatternRef', 'deepeningPatternRef'],
      apply: ['qualification', 'type', 'declarationId', 'episodeId', 'useId'] };
    if (operation.qualification !== GROWTH_QUALIFICATION || !Object.hasOwn(shapes, operation.type)
      || !magicExact(operation, shapes[operation.type])) fail('GROWTH_PROTOCOL_INPUT');
    const head = this.assertHead(state);
    if (operation.type === 'declare') {
      if (![operation.bodyId, operation.factorId].every(magicId) || !Array.isArray(operation.slots)
        || !operation.slots.length || operation.slots.length > 8) fail('GROWTH_PROTOCOL_INPUT');
      operation.slots.forEach(slot => {
        if (!magicExact(slot, ['basicGrantId', 'enhancedGrantId']) || ![slot.basicGrantId, slot.enhancedGrantId].every(magicId)) fail('GROWTH_PROTOCOL_INPUT');
      });
      // Declaration ref is selected at the real act commit, never a caller head.
      this.#compileGrowthProfile({ ...operation.profile, declaredAtCommitRef: head.commit_ref });
    } else if (shapes[operation.type].filter(key => !['qualification', 'type'].includes(key)).some(key => !magicId(operation[key]))) fail('GROWTH_PROTOCOL_INPUT');
    if (operation.type === 'apply') {
      const prior = this.#db.prepare('SELECT * FROM domain_growth_applications WHERE run_id=? AND use_id=?').get(head.run_id, operation.useId);
      if (prior) {
        if (digest(parse(prior.command_json)) !== digest(operation)) fail('GROWTH_REPLAY_CONFLICT');
        if (!this.#ancestor(head.commit_ref, prior.commit_ref)) fail('GROWTH_ABANDONED_APPLICATION');
        this.assertGrowthHistory(state);
        return { version: 1, status: 'replay', receipt: parse(prior.plan_json).receipt, productionRegistrationEnabled: false };
      }
    }
    const pending = this.#growthReservation();
    if (pending) {
      if (pending.run_id !== head.run_id || pending.source_head_ref !== head.commit_ref) fail('GROWTH_STALE_RESERVATION');
      if (pending.operation_hash !== digest(operation)) fail('GROWTH_RESERVATION_CONFLICT');
      if (activeJob && pending.job_id !== activeJob.job_id) fail('GROWTH_TASK_PENDING');
      return { version: 1, status: 'reserved-protocol-only', productionRegistrationEnabled: false };
    }
    if (activeJob) fail('GROWTH_TASK_PENDING');
    this.#db.prepare('INSERT INTO domain_growth_reservations VALUES(?,?,?,?,?)').run(randomUUID(), head.run_id,
      head.commit_ref, canonical(operation), digest(operation));
    return { version: 1, status: 'staged-protocol-only', productionRegistrationEnabled: false };
  }
  #growthReservation() {
    const rows = this.#db.prepare(`SELECT r.*,b.job_id,b.request_id,b.text_hash FROM domain_growth_reservations r
      LEFT JOIN domain_growth_job_bindings b USING(reservation_id)
      WHERE NOT EXISTS(SELECT 1 FROM domain_growth_resolutions x WHERE x.reservation_id=r.reservation_id)`).all();
    if (rows.length > 1) fail('GROWTH_RESERVATION_CONFLICT');
    const row = rows[0];
    if (row && digest(parse(row.operation_json)) !== row.operation_hash) fail('GROWTH_SOURCE_INTEGRITY');
    return row;
  }
  assertGrowthRequest(state, request) {
    const head = this.assertHead(state), pending = this.#growthReservation();
    if (!pending) return;
    if (pending.run_id !== head.run_id || pending.source_head_ref !== head.commit_ref) fail('GROWTH_STALE_RESERVATION');
    if (request === null) fail('GROWTH_TASK_PENDING');
    if (pending.job_id && (pending.request_id !== request.requestId || pending.text_hash !== hash(request.text))) fail('GROWTH_RESERVED_FOR_OTHER_REQUEST');
  }
  bindGrowthRequest(state, job, request) {
    this.#transaction(); this.assertGrowthRequest(state, request);
    const pending = this.#growthReservation();
    if (!pending) return;
    const actual = this.#db.prepare('SELECT * FROM agent_turn_jobs WHERE job_id=?').get(job.job_id);
    if (!actual || actual.request_id !== request.requestId || actual.text !== request.text
      || actual.generation !== state.generation || actual.base_revision !== state.revision
      || actual.branch_id !== this.assertHead(state).branch_id || ['committed', 'cancelled'].includes(actual.status)) fail('GROWTH_RESERVED_FOR_OTHER_REQUEST');
    if (pending.job_id && pending.job_id !== job.job_id) fail('GROWTH_RESERVED_FOR_OTHER_REQUEST');
    if (!pending.job_id) this.#db.prepare('INSERT INTO domain_growth_job_bindings VALUES(?,?,?,?)')
      .run(pending.reservation_id, job.job_id, request.requestId, hash(request.text));
  }
  #compileGrowthProfile(profile) {
    return compileTrustedGrowthProfile(profile, { version: 1, profileRef: profile.ref,
      fingerprint: growthMetadataDigest(profile), policySourceRef: profile.policySourceRef,
      source: profile.source, declarationCommitRef: profile.declaredAtCommitRef, qualification: GROWTH_QUALIFICATION });
  }
  #growthRows(table, head) {
    return this.#db.prepare(`WITH RECURSIVE history AS (
      SELECT commit_ref,parent_commit_ref,run_id,0 depth FROM domain_commits WHERE commit_ref=? AND run_id=?
      UNION ALL SELECT c.commit_ref,c.parent_commit_ref,c.run_id,h.depth+1 FROM domain_commits c
      JOIN history h ON c.commit_ref=h.parent_commit_ref WHERE c.run_id=? AND h.depth<4096
    ) SELECT g.* FROM ${table} g JOIN history h ON g.commit_ref=h.commit_ref WHERE g.run_id=? ORDER BY h.depth DESC,g.rowid`)
      .all(head.commit_ref, head.run_id, head.run_id, head.run_id);
  }
  #growthData(row) {
    if (!row || row.schema_version !== 1 || hash(row.data_json) !== row.integrity_hash) fail('GROWTH_SOURCE_INTEGRITY');
    return parse(row.data_json);
  }
  #growthDeclaration(head, declarationId) {
    const row = this.#growthRows('domain_growth_declarations', head).find(item => item.declaration_id === declarationId);
    const data = this.#growthData(row);
    if (data.qualification !== GROWTH_QUALIFICATION || data.profile.declaredAtCommitRef !== row.commit_ref
      || data.bodyId !== row.body_id || data.factorId !== row.factor_id) fail('GROWTH_SOURCE_INTEGRITY');
    this.#compileGrowthProfile(data.profile);
    return { row, data };
  }
  #growthMagic(commit) {
    const state = parse(commit.snapshot_json);
    if (state.caseRuntime?.occupiedBody) { this.assertOccupiedBodyWorld(state); this.assertSwapLifecycleHistory(state); }
    const saved = new MagicRepository(this.#db).readAt({ commitRef: commit.commit_ref, runId: commit.run_id });
    if (!saved) fail('GROWTH_MAGIC_REQUIRED');
    return saved.state;
  }
  #growthEvent(row, declaration, head) {
    const event = this.#growthData(row), commit = this.#commit(row.commit_ref);
    const { fingerprint, ...metadata } = event;
    if (!['occupied-body', 'settled-emotion', 'witchification-deepening'].includes(row.role)
      || event.sourceRef !== 'protocol-only:settled-act-not-emotion-truth' || event.evidenceRef !== commit.commit_ref) fail('GROWTH_SOURCE_INTEGRITY');
    if (event.id !== row.event_id || event.kind !== row.role || event.runId !== head.run_id
      || row.declaration_id !== declaration.row.declaration_id || event.commitRef !== commit.commit_ref
      || event.branchId !== commit.branch_id || event.generation !== commit.generation || event.revision !== commit.revision
      || event.storyTime !== commit.world_time || event.settlement !== 'settled'
      || fingerprint !== growthMetadataDigest(metadata) || !this.#ancestor(head.commit_ref, commit.commit_ref)
      || !this.#ancestor(commit.parent_commit_ref, declaration.row.commit_ref)) fail('GROWTH_SOURCE_INTEGRITY');
    const parent = this.#commit(commit.parent_commit_ref);
    const magic = this.#growthMagic(parent);
    // Current engineering markers only support occupancy-stable actual acts.
    // A within-act identity change would need the unleased settled journal.
    const after = this.#growthMagic(commit);
    if (commit.kind !== 'act' || canonical(magic.identity.occupants) !== canonical(after.identity.occupants)
      || magic.identity.occupants[event.bodyId] !== event.mindId || event.bodyId !== declaration.data.bodyId
      || event.factorId !== declaration.data.factorId) fail('GROWTH_EVENT_OCCUPANCY');
    return event;
  }
  #publishGrowthBeforeSeal(commit, pending) {
    if (pending.headRef !== commit.parent_commit_ref || pending.runId !== commit.run_id || commit.kind !== 'act'
      || this.#magicWrite || this.#durableWrite
      || this.#db.prepare('SELECT 1 FROM host_magic_commits_v2 WHERE commit_ref=?').get(commit.commit_ref)
      || this.#db.prepare('SELECT 1 FROM domain_story_deaths WHERE commit_ref=?').get(commit.commit_ref)) fail('GROWTH_STALE_OPERATION');
    const operation = pending.operation, head = this.#commit(commit.parent_commit_ref);
    const beforeMagic = this.#growthMagic(head);
    if (operation.type === 'declare') {
      const profile = { ...operation.profile, declaredAtCommitRef: commit.commit_ref };
      this.#compileGrowthProfile(profile);
      const body = beforeMagic.identity.bodies[operation.bodyId];
      if (!body) fail('GROWTH_EVENT_OCCUPANCY');
      if (profile.rule.recognition !== null) fail('GROWTH_RECOGNITION_PRODUCER_MISSING');
      const factorDeclaration = this.#db.prepare('SELECT * FROM domain_growth_declarations WHERE run_id=? AND (body_id=? OR factor_id=?) ORDER BY rowid LIMIT 1')
        .get(head.run_id, operation.bodyId, operation.factorId);
      if (factorDeclaration && (factorDeclaration.body_id !== operation.bodyId || factorDeclaration.factor_id !== operation.factorId
        || canonical(this.#growthData(factorDeclaration).profile.factorOrigin) !== canonical(profile.factorOrigin))) fail('GROWTH_FACTOR_ORIGIN_CONFLICT');
      for (const slot of operation.slots) {
        const basic = beforeMagic.grants.find(row => row.id === slot.basicGrantId);
        const enhanced = beforeMagic.grants.find(row => row.id === slot.enhancedGrantId);
        const spec = profile.rule.grants.find(row => row.grantId === slot.basicGrantId);
        if (!basic || !enhanced || !spec || basic.binding.kind !== 'body' || enhanced.binding.kind !== 'body'
          || basic.binding.id !== body.id || enhanced.binding.id !== body.id || basic.stage !== 'basic' || enhanced.stage !== 'awakened'
          || basic.definitionRef !== spec.fromDefinition.ref || basic.definitionFingerprint !== spec.fromDefinition.fingerprint
          || enhanced.definitionRef !== spec.toDefinition.ref || enhanced.definitionFingerprint !== spec.toDefinition.fingerprint
          || !basic.issuance.approval.bindingPolicy || !enhanced.issuance.approval.bindingPolicy) fail('GROWTH_BODY_GRANT');
      }
      if (!operation.slots.some(slot => {
        const grant = beforeMagic.grants.find(row => row.id === slot.basicGrantId);
        return grant.definitionRef === profile.bodyDefinition.ref && grant.definitionFingerprint === profile.bodyDefinition.fingerprint;
      })) fail('GROWTH_PROFILE_BODY_ORIGIN');
      if (operation.slots.length !== profile.rule.grants.length || new Set(operation.slots.map(row => row.basicGrantId)).size !== operation.slots.length
        || new Set(operation.slots.map(row => row.enhancedGrantId)).size !== operation.slots.length) fail('GROWTH_BODY_GRANT');
      const data = { ...operation, profile }, json = canonical(data);
      const id = `growth-declaration:${digest([commit.run_id, profile.ref, commit.commit_ref])}`;
      this.#db.prepare('INSERT INTO domain_growth_declarations VALUES(?,?,?,?,?,?,?,1)').run(id, commit.run_id, commit.commit_ref,
        operation.bodyId, operation.factorId, json, hash(json));
      return;
    }
    const declaration = this.#growthDeclaration(head, operation.declarationId);
    if (operation.type === 'evidence') {
      if (beforeMagic.identity.occupants[declaration.data.bodyId] !== operation.mindId) fail('GROWTH_EVENT_OCCUPANCY');
      // These are explicitly qualified protocol markers on an actual settled
      // act, NOT inferred emotions, real factor observations or story approval.
      // The sealed act itself is the immutable fixture provenance source.
      const roles = ['occupied-body', 'settled-emotion', 'witchification-deepening'];
      let previous = null;
      for (const [index, role] of roles.entries()) {
        const eventId = `growth-evidence:${digest([commit.run_id, operation.episodeId, role])}`;
        const metadata = { id: eventId, kind: role,
          patternRef: index === 0 ? 'protocol:occupied-body' : index === 1 ? operation.emotionPatternRef : operation.deepeningPatternRef,
          sourceRef: 'protocol-only:settled-act-not-emotion-truth', evidenceRef: commit.commit_ref,
          commitRef: commit.commit_ref, branchId: commit.branch_id, runId: commit.run_id,
          generation: commit.generation, revision: commit.revision, storyTime: commit.world_time, sequence: index,
          settlement: 'settled', mindId: operation.mindId, bodyId: declaration.data.bodyId, factorId: declaration.data.factorId,
          causeEventIds: previous ? [previous] : [], definitionRefs: [] };
        const json = canonical({ ...metadata, fingerprint: growthMetadataDigest(metadata) });
        this.#db.prepare('INSERT INTO domain_growth_evidence VALUES(?,?,?,?,?,?,?,?,1)').run(eventId, commit.run_id, commit.commit_ref,
          declaration.row.declaration_id, operation.episodeId, role, json, hash(json));
        previous = eventId;
      }
      return;
    }
    const commandHash = digest(operation);
    const old = this.#db.prepare('SELECT * FROM domain_growth_applications WHERE run_id=? AND use_id=?').get(commit.run_id, operation.useId);
    if (old) {
      if (digest(parse(old.command_json)) !== commandHash) fail('GROWTH_REPLAY_CONFLICT');
      if (!this.#ancestor(head.commit_ref, old.commit_ref)) fail('GROWTH_ABANDONED_APPLICATION');
      return;
    }
    const rows = this.#growthRows('domain_growth_evidence', head).filter(row => row.episode_id === operation.episodeId);
    if (rows.length !== 3) fail('GROWTH_EVIDENCE_CLOSURE');
    const events = rows.map(row => this.#growthEvent(row, declaration, head)).sort((a, b) => a.sequence - b.sequence);
    const applied = this.#growthRows('domain_growth_applications', head);
    const priorApplied = applied.map(row => parse(row.plan_json).receipt);
    // SQL uniqueness is run-wide, independent of body/profile or current branch.
    if (this.#db.prepare('SELECT 1 FROM domain_growth_applications WHERE run_id=? AND deepening_event_id=?')
      .get(commit.run_id, events[2].id)) fail('GROWTH_SOURCE_ALREADY_APPLIED');
    const profile = declaration.data.profile;
    const history = this.#db.prepare(`WITH RECURSIVE history AS (
      SELECT *,0 depth FROM domain_commits WHERE commit_ref=? AND run_id=?
      UNION ALL SELECT c.*,h.depth+1 FROM domain_commits c JOIN history h ON c.commit_ref=h.parent_commit_ref WHERE c.run_id=? AND h.depth<128
    ) SELECT * FROM history ORDER BY depth DESC`).all(head.commit_ref, head.run_id, head.run_id);
    if (history[0]?.parent_commit_ref !== null) fail('GROWTH_TECHNICAL_BUDGET');
    const commits = history.map(row => ({ commitRef: row.commit_ref, parentCommitRef: row.parent_commit_ref,
      branchId: row.branch_id, storyTime: row.world_time }));
    const scope = { runId: head.run_id, branchId: head.branch_id, headCommitRef: head.commit_ref,
      generation: head.generation, revision: head.revision, storyTime: head.world_time };
    const previousSlot = this.#growthRows('domain_growth_factor_slots', head).filter(row => row.body_id === declaration.data.bodyId
      && row.factor_id === declaration.data.factorId).at(-1);
    const conditionRef = previousSlot ? this.#growthData(previousSlot).conditionRef : profile.rule.fromConditionRef;
    const bodyFactor = { bodyId: declaration.data.bodyId, factorId: declaration.data.factorId, bodyDefinition: profile.bodyDefinition,
      origin: profile.factorOrigin, conditionRef, bindingPolicySourceRef: profile.policySourceRef,
      grantApprovalRef: beforeMagic.host.setupRef, grants: declaration.data.slots.map(slot => {
        const grant = beforeMagic.grants.find(row => row.id === slot.basicGrantId);
        return { id: grant.id, bodyId: declaration.data.bodyId, factorId: declaration.data.factorId,
          definition: { ref: grant.definitionRef, fingerprint: grant.definitionFingerprint }, enabled: grant.enabled };
      }) };
    const plan = planMagicGrowthEvents(this.#compileGrowthProfile(profile), { version: 1, useId: operation.useId, scope,
      authorization: { ref: 'domain-private:protocol-growth', headCommitRef: head.commit_ref,
        scopeFingerprint: growthMetadataDigest(scope), ancestryFingerprint: growthMetadataDigest(commits),
        eventFingerprints: events.map(({ id, fingerprint }) => ({ id, fingerprint })) }, commits, events,
      chain: { occupancyEventId: events[0].id, emotionEventId: events[1].id, deepeningEventId: events[2].id, recognitionEventId: null },
      bodyFactor, priorApplied });
    if (plan.status !== 'planned') return;
    const projection = applyProtocolGrowthObligations(beforeMagic, plan, declaration.data.slots);
    projection.branchId = commit.branch_id; projection.headCommitRef = head.commit_ref;
    projection.time = commit.world_time; projection.generation = commit.generation;
    const applicationId = `growth-application:${digest([commit.run_id, operation.useId])}`;
    const planJson = canonical(plan), commandJson = canonical(operation), projectionHash = abilityDigest(projection);
    const integrity = digest({ applicationId, commitRef: commit.commit_ref, sourceHeadRef: head.commit_ref,
      command: operation, plan, projectionHash });
    this.#db.prepare('INSERT INTO domain_growth_applications VALUES(?,?,?,?,?,?,?,?,?,?,1)').run(applicationId, commit.run_id,
      commit.commit_ref, head.commit_ref, operation.useId, events[2].id, commandJson, planJson, projectionHash, integrity);
    const slotData = canonical({ qualification: GROWTH_QUALIFICATION, conditionRef: plan.obligations[0].toConditionRef,
      origin: profile.factorOrigin, bodyDefinition: profile.bodyDefinition, slots: declaration.data.slots });
    this.#db.prepare('INSERT INTO domain_growth_factor_slots VALUES(?,?,?,?,?,?,?,?,1)').run(`growth-slot:${applicationId}`,
      commit.run_id, commit.commit_ref, applicationId, declaration.data.bodyId, declaration.data.factorId, slotData, hash(slotData));
    new MagicRepository(this.#db).append({ branchId: commit.branch_id, commitRef: commit.commit_ref, expectedHead: head.commit_ref,
      command: { type: 'protocol-growth-act-publication', useId: operation.useId },
      result: { state: projection, receipt: { useId: operation.useId, qualification: GROWTH_QUALIFICATION, growthReceipt: plan.receipt }, events: [] } });
    const saved = this.#db.prepare('SELECT * FROM domain_growth_applications WHERE application_id=?').get(applicationId);
    if (!saved || !this.#db.prepare('SELECT 1 FROM domain_growth_factor_slots WHERE application_id=?').get(applicationId)) fail('GROWTH_APPLICATION_INCOMPLETE');
  }
  assertGrowthHistory(state) {
    const head = this.#at(state);
    for (const row of this.#growthRows('domain_growth_declarations', head)) this.#growthDeclaration(head, row.declaration_id);
    for (const row of this.#growthRows('domain_growth_evidence', head)) this.#growthEvent(row, this.#growthDeclaration(head, row.declaration_id), head);
    // A growth projection without its preseal application is never recovered
    // merely because MagicRepository can parse its grant shape.
    const growthLedgers = this.#db.prepare(`WITH RECURSIVE history AS (
      SELECT commit_ref,parent_commit_ref FROM domain_commits WHERE commit_ref=? AND run_id=?
      UNION ALL SELECT c.commit_ref,c.parent_commit_ref FROM domain_commits c JOIN history h
      ON c.commit_ref=h.parent_commit_ref WHERE c.run_id=?
    ) SELECT m.commit_ref,m.request_id FROM host_magic_commits_v2 m JOIN history h ON h.commit_ref=m.commit_ref
      WHERE json_extract(m.receipt_json,'$.growthReceipt') IS NOT NULL`).all(head.commit_ref, head.run_id, head.run_id);
    for (const ledger of growthLedgers) if (!this.#db.prepare('SELECT 1 FROM domain_growth_applications WHERE commit_ref=? AND use_id=?')
      .get(ledger.commit_ref, ledger.request_id)) fail('GROWTH_APPLICATION_INCOMPLETE');
    for (const row of this.#growthRows('domain_growth_applications', head)) {
      const plan = parse(row.plan_json), command = parse(row.command_json);
      const integrity = digest({ applicationId: row.application_id, commitRef: row.commit_ref, sourceHeadRef: row.source_head_ref,
        command, plan, projectionHash: row.projection_hash });
      const saved = new MagicRepository(this.#db).readAt({ commitRef: row.commit_ref, runId: head.run_id });
      const slots = this.#growthRows('domain_growth_factor_slots', head).filter(slot => slot.application_id === row.application_id);
      const evidence = this.#growthRows('domain_growth_evidence', head).find(event => event.event_id === row.deepening_event_id);
      if (integrity !== row.integrity_hash || row.schema_version !== 1 || plan.productionRegistrationEnabled !== false
        || saved?.commitRef !== row.commit_ref || abilityDigest(saved.state) !== row.projection_hash || slots.length !== 1
        || !evidence || !this.#ancestor(row.source_head_ref, evidence.commit_ref)) fail('GROWTH_APPLICATION_INCOMPLETE');
      const declaration = this.#growthDeclaration(head, evidence.declaration_id);
      const profile = declaration.data.profile;
      const chain = this.#growthRows('domain_growth_evidence', head).filter(event => event.episode_id === command.episodeId)
        .map(event => this.#growthEvent(event, declaration, head)).sort((a, b) => a.sequence - b.sequence);
      const { integrity: planIntegrity, ...planData } = plan;
      if (planIntegrity !== growthMetadataDigest(planData) || chain.length !== 3
        || chain[1].id !== plan.receipt.emotionEventId || chain[1].fingerprint !== plan.receipt.emotionFingerprint
        || chain[2].id !== plan.receipt.deepeningEventId || chain[2].fingerprint !== plan.receipt.deepeningFingerprint
        || plan.receipt.profileFingerprint !== growthMetadataDigest(profile) || plan.knowledgeEffects.length !== 0
        || canonical(plan.obligations[1].grants) !== canonical(profile.rule.grants)
        || plan.obligations[0].quality !== profile.rule.quality || plan.obligations[0].mechanismRef !== profile.rule.mechanismRef
        || plan.obligations[0].fromConditionRef !== profile.rule.fromConditionRef || plan.obligations[0].toConditionRef !== profile.rule.toConditionRef
        || chain[1].patternRef !== profile.rule.emotionPatternRef || chain[2].patternRef !== profile.rule.deepeningPatternRef
        || canonical(chain.map(event => event.causeEventIds)) !== canonical([[], [chain[0].id], [chain[1].id]])) fail('GROWTH_APPLICATION_INCOMPLETE');
      const parent = this.#commit(row.source_head_ref), current = this.#commit(row.commit_ref);
      const expected = applyProtocolGrowthObligations(this.#growthMagic(parent), plan, declaration.data.slots);
      expected.branchId = current.branch_id; expected.headCommitRef = parent.commit_ref;
      expected.time = current.world_time; expected.generation = current.generation;
      if (abilityDigest(expected) !== row.projection_hash || current.parent_commit_ref !== parent.commit_ref || current.kind !== 'act') fail('GROWTH_APPLICATION_INCOMPLETE');
      const slot = this.#growthData(slots[0]);
      if (slot.conditionRef !== plan.obligations[0].toConditionRef || slots[0].body_id !== plan.receipt.bodyId
        || slots[0].factor_id !== plan.receipt.factorId) fail('GROWTH_APPLICATION_INCOMPLETE');
    }
    return true;
  }
  assertCustomRootAdmission(state) {
    this.assertHead(state); if(this.#growthReservation())fail('GROWTH_RESERVED_FOR_OTHER_REQUEST');
  }
  customRootRequest(input) {
    const row=this.#db.prepare('SELECT * FROM custom_ability_root_requests WHERE request_id=?').get(input.requestId);
    if(!row)return null; const p=this.#customData(row);
    if(canonical(p.input)!==canonical(input))fail('IDEMPOTENCY_CONFLICT');
    const source=this.#commit(p.sourceCommitRef),root=this.#commit(p.rootCommitRef),state=parse(root.snapshot_json);
    if(source.generation!==input.expectedGeneration||source.revision!==input.expectedRevision||root.kind!=='new_game'
      ||root.previous_execution_ref!==source.commit_ref||root.run_id!==p.runId||canonical(state.customAbilitySetup)!==canonical(p.setup)
      ||parse(p.resultJson).generation!==root.generation||parse(p.resultJson).revision!==root.revision)fail('INVALID_DOMAIN_STATE');
    this.assertCustomAbilityHistory(state);return parse(p.resultJson);
  }
  publishCustomRootRequest(input,source,state,result) {
    this.#transaction();const root=this.#at(state);this.assertCustomAbilityHistory(state);
    // Public view contains legitimate fractional display values; retain exact
    // original JSON wire separately from integer-only Domain canonical data.
    const resultJson=JSON.stringify(result);
    const proof={input,sourceCommitRef:source.commitRef,rootCommitRef:root.commit_ref,runId:root.run_id,setup:state.customAbilitySetup,resultJson};
    const json=canonical(proof);this.#db.prepare('INSERT INTO custom_ability_root_requests VALUES(?,?,?)').run(input.requestId,json,hash(json));
    if(JSON.stringify(this.customRootRequest(input))!==resultJson)fail('INVALID_DOMAIN_STATE');
    return parse(resultJson);
  }
  #customStore() { return new CustomAbilityStore(this.#db, { catalogId: 'local-author' }); }
  #customData(row) { if (!row || hash(row.data_json) !== row.data_hash) fail('INVALID_DOMAIN_STATE'); return parse(row.data_json); }
  linkCustomPresetDraft(saved,draft) {
    this.#transaction();const row=this.#db.prepare("SELECT * FROM prologue_creation_presets WHERE id=? AND kind='character' AND version=?").get(saved.id,saved.version);
    const current=this.#customStore().readDraft(draft.draftId);if(!row||current.draftRevision!==draft.draftRevision)fail('CUSTOM_ABILITY_CATALOG_STALE');
    const json=canonical({preset:saved,draftId:current.draftId,draftRevision:current.draftRevision,sourceDigest:current.sourceDigest});
    this.#db.prepare('INSERT INTO custom_ability_preset_drafts VALUES(?,?,?,?,?,?)').run(saved.id,saved.version,current.draftId,current.draftRevision,json,hash(json));
    return {presetId:saved.id,presetVersion:saved.version,draftId:current.draftId,draftRevision:current.draftRevision};
  }
  completeCustomCompilation(draft, job, candidate, definitionId, revision, requestId) {
    this.#transaction();
    const compiled = compileCustomAbilityInterpretation({ version: 1, definitionId, revision, draft, job, candidate });
    const bridged = bridgeCustomAbilityCatalogDeclaration(compiled.declaration, draft, job);
    const completed = this.#customStore().completeCompile({ requestId, jobId: job.jobId, inputDigest: job.inputDigest, pins: job.pins, candidate: bridged.catalogDeclaration });
    const data = { compiled, bridged, draft, job, completed, candidate }; const json = canonical(data);
    const prior = this.#db.prepare('SELECT * FROM custom_ability_interpretations WHERE job_id=?').get(job.jobId);
    if (prior) { if (canonical(this.#customData(prior)) !== json) fail('INVALID_DOMAIN_STATE'); }
    else this.#db.prepare('INSERT INTO custom_ability_interpretations VALUES(?,?,?)').run(job.jobId, json, hash(json));
    if (canonical(this.#customData(this.#db.prepare('SELECT * FROM custom_ability_interpretations WHERE job_id=?').get(job.jobId))) !== json) fail('INVALID_DOMAIN_STATE');
    return { ...completed, executionStatus: compiled.executionStatus, semanticDigest: compiled.declaration.semanticDigest, attachmentDigest: compiled.interpretation.attachmentDigest };
  }
  customCompilation(jobId) {
    const job=this.#customStore().readJob(jobId);
    if(job.status!=='completed')return {version:1,jobId:job.jobId,draftId:job.draftId,draftRevision:job.draftRevision,status:job.status,...(job.status==='failed'?{failureCode:job.failureCode}:{})};
    const data = this.#customData(this.#db.prepare('SELECT * FROM custom_ability_interpretations WHERE job_id=?').get(jobId));
    return { ...data.completed, declaration: data.compiled.declaration, interpretation: data.compiled.interpretation, executionStatus: data.compiled.executionStatus,
      semanticDigest:data.compiled.declaration.semanticDigest,attachmentDigest:data.compiled.interpretation.attachmentDigest };
  }
  confirmCustomDefinition(input) {
    this.#transaction();
    const data = this.#customData(this.#db.prepare('SELECT * FROM custom_ability_interpretations WHERE job_id=?').get(input.jobId));
    if (data.compiled.executionStatus !== 'candidate-ready' || input.expectedAttachmentDigest !== data.compiled.interpretation.attachmentDigest
      || input.expectedSemanticDigest !== data.compiled.declaration.semanticDigest) fail('CUSTOM_ABILITY_NOT_READY');
    const prior = this.#db.prepare('SELECT * FROM custom_ability_author_actions WHERE request_id=?').get(input.requestId);
    if (prior) { const p = this.#customData(prior); if (canonical(p.input) !== canonical(input)) fail('IDEMPOTENCY_CONFLICT'); this.#customDefinition(p.result.definitionId,p.result.revision); return p.result; }
    const current = this.#customStore().readDraft(input.draftId);
    if (current.version !== input.expectedVersion || current.draftRevision !== input.draftRevision || current.sourceDigest !== data.draft.sourceDigest) fail('CUSTOM_ABILITY_CATALOG_STALE');
    const result = this.#customStore().confirmCandidate({ requestId: input.requestId, draftId: input.draftId, expectedVersion: input.expectedVersion,
      draftRevision: input.draftRevision, jobId: input.jobId, candidateDigest: data.completed.candidateDigest });
    const declaration = restoreCustomAbilityCatalogDeclaration(this.#customStore().readDefinition(result.definitionId, result.revision).declaration, data.bridged.bridge, data.draft, data.job);
    const actionId = `author:${abilityDigest(input)}`;
    validateCustomAbilityAuthorConfirmation({ version: 1, definitionId: declaration.definitionId, revision: declaration.revision,
      semanticDigest: declaration.semanticDigest, draftId: declaration.provenance.draftId, draftRevision: declaration.provenance.draftRevision, authorActionId: actionId }, declaration);
    const presetLinks=this.#db.prepare('SELECT * FROM custom_ability_preset_drafts WHERE draft_id=? AND draft_revision=?').all(input.draftId,input.draftRevision).map(row=>this.#customData(row));
    const proof = { input, result, jobId: input.jobId, actionId, presetLinks }; const json = canonical(proof);
    this.#db.prepare('INSERT INTO custom_ability_author_actions VALUES(?,?,?,?,?,?)').run(actionId,input.requestId,result.definitionId,result.revision,json,hash(json));
    this.#customDefinition(result.definitionId,result.revision); return result;
  }
  #customDefinition(definitionId, revision) {
    const author = this.#customData(this.#db.prepare('SELECT * FROM custom_ability_author_actions WHERE definition_id=? AND revision=?').get(definitionId,revision));
    const data = this.#customData(this.#db.prepare('SELECT * FROM custom_ability_interpretations WHERE job_id=?').get(author.jobId));
    const definition = this.#customStore().readDefinition(definitionId,revision);
    const actualJob=this.#customStore().readJob(author.jobId);
    if(actualJob.inputDigest!==data.job.inputDigest||actualJob.candidateDigest!==data.completed.candidateDigest||actualJob.status!=='completed')fail('INVALID_DOMAIN_STATE');
    const actualOperation=this.#db.prepare("SELECT * FROM custom_ability_catalog_requests WHERE catalog_id='local-author' AND request_id=?").get(author.input.requestId);
    const confirmationInput={requestId:author.input.requestId,draftId:author.input.draftId,expectedVersion:author.input.expectedVersion,draftRevision:author.input.draftRevision,jobId:author.jobId,candidateDigest:data.completed.candidateDigest};
    if(!actualOperation||actualOperation.operation!=='confirm-candidate'||actualOperation.input_digest!==abilityDigest(confirmationInput)||canonical(parse(actualOperation.result_json))!==canonical(author.result))fail('INVALID_DOMAIN_STATE');
    const declaration = restoreCustomAbilityCatalogDeclaration(definition.declaration,data.bridged.bridge,data.draft,data.job);
    const recompiled = compileCustomAbilityInterpretation({ version:1,definitionId,revision,draft:data.draft,job:data.job,candidate:data.candidate });
    if (recompiled.executionStatus!=='candidate-ready' || canonical(recompiled)!==canonical(data.compiled) || definition.candidateDigest!==data.completed.candidateDigest
      || author.input.expectedAttachmentDigest!==recompiled.interpretation.attachmentDigest) fail('INVALID_DOMAIN_STATE');
    return { ...data,author };
  }
  customSetup(selections, profile = 'ordinary-unguarded@1') {
    if(!['ordinary-unguarded@1','ordinary-guarded@1'].includes(profile))fail('CUSTOM_ABILITY_PROFILE_UNSUPPORTED');
    if(!Array.isArray(selections)||!selections.length||selections.length>4)fail('CUSTOM_ABILITY_NOT_READY');
    return { version:profile==='ordinary-guarded@1'?2:1,...(profile==='ordinary-guarded@1'?{profile}:{}),selections:selections.map(s=> { if(!s||Object.keys(s).sort().join(',')!=='definitionId,expectedSemanticDigest,revision')fail('CUSTOM_ABILITY_NOT_READY');
      const data=this.#customDefinition(s.definitionId,s.revision),d=data.compiled.declaration;
      if(s.expectedSemanticDigest!==d.semanticDigest || data.compiled.interpretation.mechanismContract.nodes.length!==1) fail('CUSTOM_ABILITY_NOT_READY');
      return {definitionId:d.definitionId,revision:d.revision,semanticDigest:d.semanticDigest,attachmentDigest:data.compiled.interpretation.attachmentDigest,initialState:d.initialState}; }) };
  }
  recordWithCustomRoot(input) {
    if(this.#customRoot || !input.state.customAbilitySetup || input.kind!=='new_game') fail('INVALID_DOMAIN_STATE');
    this.assertCustomRootAdmission(input.previousState);
    this.#customRoot=true; try { const c=this.record(input); this.assertCustomAbilityHistory(input.state); return c; } finally {this.#customRoot=false;}
  }
  #customBindingRows(state) {
    const head=this.#at(state);
    const rows=this.#db.prepare('SELECT * FROM domain_custom_bindings WHERE run_id=? ORDER BY binding_id').all(head.run_id);
    const root=this.#db.prepare(`${COGNITION_HISTORY_SQL} SELECT c.* FROM history h JOIN domain_commits c USING(commit_ref) WHERE c.parent_commit_ref IS NULL`).get({$commitRef:head.commit_ref,$runId:head.run_id});
    if(!root||canonical(parse(root.snapshot_json).customAbilitySetup)!==canonical(state.customAbilitySetup))fail('INVALID_DOMAIN_STATE');
    if(rows.length!==state.customAbilitySetup.selections.length) fail('INVALID_DOMAIN_STATE');
    return rows.map(row=> { const p=this.#customData(row); const data=this.#customDefinition(row.definition_id,row.revision);
      if(!this.#ancestor(head.commit_ref,row.root_commit_ref) || canonical(p.selection)!==canonical(state.customAbilitySetup.selections.find(s=>s.definitionId===row.definition_id))
        || row.root_commit_ref!==root.commit_ref || p.root!==root.commit_ref || p.mindId!=='mind:player'
        || p.selection.attachmentDigest!==data.compiled.interpretation.attachmentDigest || p.actorId!=='player' || p.bodyId!=='body:player') fail('INVALID_DOMAIN_STATE');
      const events=this.#db.prepare("SELECT * FROM domain_world_events WHERE commit_ref=? AND kind='custom_ability_initial_setup'").all(root.commit_ref);
      const event=events.find(e=>{const payload=parse(e.payload);return payload.bindingId===row.binding_id && canonical(payload.selection)===canonical(p.selection);});
      if(!event||hash(event.payload)!==event.payload_hash)fail('INVALID_DOMAIN_STATE');
      const memories=this.#db.prepare("SELECT * FROM cognition_observations WHERE commit_ref=? AND event_ref=? AND owner_id='player' AND channel='private_recollection'").all(root.commit_ref,event.event_ref);
      if(memories.length!==(p.selection.initialState.recognition==='known'?1:0)||memories.some(o=>o.text!=='我知道本局已确认的一项自定义能力；实际可用目标以当前合法句柄为准。'||o.occurred_at!==root.world_time||o.learned_at!==root.world_time))fail('INVALID_DOMAIN_STATE');
      return {row,proof:p,data}; });
  }
  customAbilityCapabilities(state) {
    if(!state.customAbilitySetup) return {version:1,actions:[],sources:[],destinations:[]};
    this.assertCustomAbilityHistory(state); const scope=this.#customScope(state),bindings=this.#customBindingRows(state);
    const handle=(kind,id)=>`custom:${abilityDigest([scope,kind,id]).slice(0,48)}`;
    const sources=this.#customHearing(state).map(o=>({handle:handle('source',o.id),label:o.text}));
    return {version:1,actions:bindings.filter(b=>b.proof.selection.initialState.recognition==='known').map(b=>({bindingHandle:handle('binding',b.row.binding_id),
      definitionId:b.row.definition_id,stage:b.proof.selection.initialState.stage,mechanism:b.data.compiled.interpretation.mechanismContract.nodes.length===1?b.data.compiled.interpretation.mechanismContract.nodes[0].mechanism.ref:'composition-unsupported'})),
      sources,destinations:this.#customDestinations(state).map(row=>({handle:handle('destination',row.destinationId),label:CREATED_ROOMS[row.destinationId]||row.destinationId}))};
  }
  #customCurrentVisibility(state) {
    const commit=this.#at(state),roomId=runtimeRoom(state,'player');
    // Same admitted minimum as native magic-host handlesFor: the occupied
    // current room, not adjacent/permitted rooms or inferred optical geometry.
    // actorPerception independently projects the native owner/body viewpoint;
    // no description/door text participates in this authority decision.
    if(state.caseRuntime?.occupiedBody||!runtimeActive(state,'player')||!roomId||actorPerception(state,'player').roomId!==roomId)return null;
    const expected={version:1,ref:'native-current-room-visibility@1',runId:commit.run_id,branchId:commit.branch_id,
      sourceCommitRef:commit.commit_ref,generation:commit.generation,revision:commit.revision,worldTime:commit.world_time,
      bodyId:'body:player',mindId:'mind:player',roomId};
    const pin=this.#db.prepare('SELECT * FROM domain_custom_visibility_roots WHERE run_id=?').get(commit.run_id);
    if(!pin){
      if(this.#db.prepare(`${COGNITION_HISTORY_SQL} SELECT 1 FROM history h JOIN domain_world_events e USING(commit_ref) WHERE e.kind='custom_ability_current_visibility' LIMIT 1`).get({$commitRef:commit.commit_ref,$runId:commit.run_id}))fail('INVALID_DOMAIN_STATE');
      return null; // Historical no-pin roots retain their visited-only contract.
    }
    const root=this.#db.prepare(`${COGNITION_HISTORY_SQL} SELECT commit_ref FROM history WHERE parent_commit_ref IS NULL`).get({$commitRef:commit.commit_ref,$runId:commit.run_id});
    if(!root||root.commit_ref!==pin.root_commit_ref||pin.version!==1)fail('INVALID_DOMAIN_STATE');
    const events=this.#db.prepare("SELECT * FROM domain_world_events WHERE commit_ref=? AND kind='custom_ability_current_visibility'").all(commit.commit_ref);
    if(events.length!==1||events[0].run_id!==commit.run_id||events[0].branch_id!==commit.branch_id
      ||hash(events[0].payload)!==events[0].payload_hash||canonical(parse(events[0].payload))!==canonical(expected))fail('INVALID_DOMAIN_STATE');
    return {...expected,eventRef:events[0].event_ref};
  }
  #customDestinations(state) {
    const scope=this.#customScope(state);
    const rows=this.#db.prepare(`${COGNITION_HISTORY_SQL} SELECT h.commit_ref,c.snapshot_json FROM history h JOIN domain_commits c USING(commit_ref) ORDER BY h.depth DESC`).all({$commitRef:scope.commitRef,$runId:scope.runId});
    const destinations=new Map();for(const row of rows){const s=parse(row.snapshot_json),room=runtimeRoom(s,'player');
      const event=this.#db.prepare("SELECT * FROM domain_world_events WHERE commit_ref=? AND kind='fixture_transition'").get(row.commit_ref);
      if(room&&CREATED_ROOMS[room]&&event&&hash(event.payload)===event.payload_hash&&parse(event.payload).location===s.location)
        destinations.set(room,{destinationId:room,sourceCommitRef:row.commit_ref,eventRef:event.event_ref});}
    const visible=this.#customCurrentVisibility(state);
    if(visible&&!destinations.has(visible.roomId))destinations.set(visible.roomId,{destinationId:visible.roomId,sourceCommitRef:visible.sourceCommitRef,eventRef:visible.eventRef,relation:'visible-now'});
    return [...destinations.values()];
  }
  #customHearing(state) {
    const scope=this.#customScope(state);
    return this.#db.prepare(`${COGNITION_AUTHORIZED_SQL} SELECT o.* FROM visible_observations v JOIN cognition_observations o ON o.id=v.id
      WHERE o.owner_id=$actorId AND o.channel='hearing' ORDER BY o.learned_at,o.id LIMIT 129`).all({$commitRef:scope.commitRef,$runId:scope.runId,$actorId:'player',$worldTime:state.worldTime});
  }
  #customScope(state) { const c=this.#at(state); return {runId:c.run_id,branchId:c.branch_id,commitRef:c.commit_ref,generation:state.generation,revision:state.revision}; }
  prepareCustomUse(state, command, historical = false) {
    if(!historical) {this.assertHead(state); this.assertCustomAbilityHistory(state);} else this.#at(state);
    const guarded = state.customAbilitySetup?.profile === 'ordinary-guarded@1';
    // The guarded profile is the only custom profile that may coexist with
    // active guard rules. It still requires a quiescent guard state; capture,
    // detention, resolution and protection boundaries block a custom use.
    const guardBlocked = guarded ? (!guardEnabled(state) || !state.guardReaction
      || state.guardReaction.pending || state.guardReaction.detention
      || state.guardReaction.resolution || state.guardReaction.protection)
      : (guardEnabled(state) || Boolean(state.guardReaction));
    if((!historical && this.#growthReservation()) || state.completed || guardBlocked || state.caseRuntime?.occupiedBody || state.caseRuntime?.swapLifecycle
      || state.creation?.storyArcId || !runtimeActive(state,'player') || ![undefined,'daily','aftermath'].includes(activeProcedure(state)?.stage)) fail('CUSTOM_ABILITY_PROFILE_UNSUPPORTED');
    const scope=this.#customScope(state),handle=(kind,id)=>`custom:${abilityDigest([scope,kind,id]).slice(0,48)}`;
    const binding=this.#customBindingRows(state).find(b=>handle('binding',b.row.binding_id)===command.bindingHandle);
    if(!binding || binding.proof.selection.initialState.recognition!=='known') fail('CUSTOM_ABILITY_NOT_READY');
    const condition=state.caseRuntime.conditionsByActor?.player;
    if(condition && (typeof condition!=='object'||condition.status && condition.status!=='alive' || condition.magicSuppressed || condition.incapacitated))fail('CUSTOM_ABILITY_PROFILE_UNSUPPORTED');
    const compiled=binding.data.compiled,contract=compiled.interpretation.mechanismContract;
    const unsupportedLaw=expression=>expression.op==='predicate'?expression.ref==='source.categoryIs'
      :expression.op==='not'?unsupportedLaw(expression.term):expression.terms.some(unsupportedLaw);
    if(compiled.interpretation.semanticLaw.rules.some(r=>unsupportedLaw(r.expression)))fail('CUSTOM_ABILITY_MECHANISM_EXTENSION_REQUIRED');
    if(contract.nodes.length!==1) fail('CUSTOM_ABILITY_NOT_READY');
    if(historical && (command.expectedGeneration!==state.generation||command.expectedRevision!==state.revision))fail('INVALID_DOMAIN_STATE');
    const ancestry=this.#db.prepare(`${COGNITION_HISTORY_SQL} SELECT * FROM history ORDER BY depth DESC`).all({$commitRef:scope.commitRef,$runId:scope.runId});
    if(ancestry.length>128) fail('CUSTOM_ABILITY_NOT_READY');
    const actors=actorsForState(state).filter(a=>a.id!=='warden' && runtimeActive(state,a.id));
    const bodies=actors.map(a=>({id:`body:${a.id}`,islandId:'prison-island',locationId:runtimeRoom(state,a.id),alive:true,
      inventoryIds:Object.values(state.caseRuntime.objects).filter(o=>o.holderId===a.id && o.destroyedAt===undefined).map(o=>o.id)}));
    const cs={runId:scope.runId,branchId:scope.branchId,headCommitRef:scope.commitRef,generation:scope.generation,revision:scope.revision,storyTime:state.worldTime};
    const heard=this.#customHearing(state),sourceBodies={},currentVisibility=this.#customCurrentVisibility(state); let parameters;
    const readsVisible=expression=>expression.op==='predicate'?expression.ref==='destination.visibleAtCurrentBoundary'
      :expression.op==='not'?readsVisible(expression.term):expression.terms.some(readsVisible);
    if(command.intent.kind==='sound-replay') { const source=heard.find(o=>handle('source',o.id)===command.intent.sourceHandle);
      if(!source || contract.nodes[0].mechanism.ref!=='sound-reproduction') fail('CUSTOM_ABILITY_SOURCE');
      const e=this.#db.prepare('SELECT * FROM domain_world_events WHERE event_ref=? AND commit_ref=?').get(source.event_ref,source.commit_ref);
      const payload=e && parse(e.payload); if(!e || hash(e.payload)!==e.payload_hash || payload.delivery!=='speech' || !payload.audienceIds?.includes('player')
        || !state.entries.some(x=>x.id===payload.sourceEntryRef && x.delivery==='speech' && x.text===source.text && x.audienceIds?.includes('player'))) fail('CUSTOM_ABILITY_SOURCE');
      sourceBodies[source.id]=source; parameters={observationId:source.id,audienceMindIds:bodies.filter(b=>b.locationId===runtimeRoom(state,'player')).map(b=>`mind:${b.id.slice(5)}`)};
    } else if(command.intent.kind==='position-change' && contract.nodes[0].mechanism.ref==='body-relocation') {
      const destination=this.#customDestinations(state).find(d=>command.intent.destinationHandle===handle('destination',d.destinationId));
      if(!destination) fail('CUSTOM_ABILITY_SOURCE');
      if(compiled.interpretation.semanticLaw.rules.some(r=>readsVisible(r.expression))&&destination.destinationId!==currentVisibility?.roomId)fail('CUSTOM_ABILITY_MECHANISM_EXTENSION_REQUIRED');
      parameters={bodyId:'body:player',destinationId:destination.destinationId};
    } else fail('CUSTOM_ABILITY_NOT_READY');
    const observations=Object.values(sourceBodies).map(o=>({id:o.id,ownerMindId:'mind:player',channel:'hearing',occurredAt:o.occurred_at,learnedAt:o.learned_at,
      eventRef:o.event_ref,sourceCommitRef:o.commit_ref,sourceEntryRef:parse(this.#db.prepare('SELECT payload FROM domain_world_events WHERE event_ref=?').get(o.event_ref).payload).sourceEntryRef,
      representationRef:`representation:${abilityDigest(o.text)}`,acquisitionRef:o.id}));
    const evidence={version:1,scope:cs,invocation:{mindId:'mind:player',bodyId:'body:player',bindingRef:binding.row.binding_id,eligibilityRef:`scope:${scope.commitRef}`,
      stage:binding.proof.selection.initialState.stage,recognition:'known'},observations,bodies,locations:[...new Set([...bodies.map(b=>b.locationId),...this.#customDestinations(state).map(d=>d.destinationId)])].map(id=>({id,islandId:'prison-island'})),occupants:bodies.map(b=>({bodyId:b.id,mindId:`mind:${b.id.slice(5)}`})),
      ancestry:ancestry.map(c=>({commitRef:c.commit_ref,parentCommitRef:c.parent_commit_ref,branchId:c.branch_id,generation:c.generation,revision:c.revision,storyTime:c.world_time}))};
    const plan={version:1,useId:command.requestId,definition:contract.definition,scope:cs,nodes:[{id:'use:main',contractNodeId:contract.nodes[0].id,dependsOn:[],parameters}]};
    const lawEvidence={version:1,scope:cs,invocation:{mode:'intent',bindingBodyId:'body:player'},destinationRelations:[...this.#customDestinations(state).filter(d=>d.relation!=='visible-now').map(d=>({destinationId:d.destinationId,mindId:'mind:player',relation:'visited',sourceCommitRef:d.sourceCommitRef,eventRef:d.eventRef})),...(currentVisibility?[{destinationId:currentVisibility.roomId,mindId:currentVisibility.mindId,relation:'visible-now',sourceCommitRef:currentVisibility.sourceCommitRef,eventRef:currentVisibility.eventRef}]:[])],sourceCategories:[]};
    const result=planInterpretedCustomAbilityUse({declaration:compiled.declaration,interpretation:compiled.interpretation,plan,evidence,lawEvidence,consumerCapabilities:CUSTOM_ABILITY_RUNTIME_CAPABILITIES,priorApplications:[]});
    if(result.status!=='planned') fail('CUSTOM_ABILITY_NOT_READY');
    return {command, bindingId:binding.row.binding_id, result,sourceBodies,destinationEvidence:currentVisibility,next:applyCustomAbilityWorld(state,result,sourceBodies)};
  }
  recordWithCustomAbilityUse(input,command) {
    if(this.#customWrite || input.kind!=='magic_cast') fail('INVALID_DOMAIN_STATE');
    const prepared=this.prepareCustomUse(input.previousState,command);
    if(canonical(prepared.next)!==canonical(input.state)) fail('INVALID_DOMAIN_STATE');
    this.#customWrite=prepared;try{const c=this.record(input);this.assertCustomAbilityHistory(input.state);return c;}finally{this.#customWrite=undefined;}
  }
  /** Act-specific custom publication. The ordinary act keeps its own turn,
   * action, elapsed time and later entries; only the prepared custom world
   * delta must survive exactly. The old neutral magic_cast helper above keeps
   * its full-equality contract. */
  recordWithCustomAbilityAct(input,command,{ magicBaseline, life } = {}) {
    if(this.#customWrite || this.#lifeWrite || input.kind!=='act') fail('INVALID_DOMAIN_STATE');
    if (magicBaseline !== undefined && (!magicExact(magicBaseline, ['projection']) || !magicBaseline.projection))
      fail('INVALID_DOMAIN_STATE');
    if (life) validateRosterMagicState(life);
    const prepared={...this.prepareCustomUse(input.previousState,command),act:true};
    const source=input.previousState,state=input.state,delta=prepared.next;
    if(!source||!state||state.generation!==source.generation||state.revision!==source.revision+1)fail('INVALID_DOMAIN_STATE');
    const customEntries=delta.entries.slice(source.entries.length);
    const sourceEffects=new Set(source.entries.flatMap(row=>row.customAbilityEvent?.effectId?[row.customAbilityEvent.effectId]:[]));
    const finalCustom=state.entries.filter(row=>row.customAbilityEvent&&!sourceEffects.has(row.customAbilityEvent.effectId));
    const strip=row=>{const {id,...rest}=row;return rest;};
    if(!isDeepStrictEqual(finalCustom.map(strip),customEntries.map(strip)))fail('INVALID_DOMAIN_STATE');
    const expectedEffects=[...new Set(prepared.result.obligations.map(row=>row.id))].sort();
    const actualEffects=[...new Set(finalCustom.flatMap(row=>row.customAbilityEvent?.effectId?[row.customAbilityEvent.effectId]:[]))].sort();
    if(!isDeepStrictEqual(actualEffects,expectedEffects))fail('INVALID_DOMAIN_STATE');
    const sourceSignals=source.caseRuntime?.signals||[],deltaSignals=delta.caseRuntime?.signals||[];
    const customSignals=deltaSignals.slice(sourceSignals.length);
    const sourceSignalIds=new Set(sourceSignals.map(row=>row.id));
    const finalSignals=(state.caseRuntime?.signals||[]).filter(row=>row.id?.startsWith('generic:')
      && row.sourceEffectId&&!sourceSignalIds.has(row.id));
    if(!isDeepStrictEqual(finalSignals,customSignals))fail('INVALID_DOMAIN_STATE');
    if(runtimeRoom(state,'player')!==runtimeRoom(delta,'player'))fail('INVALID_DOMAIN_STATE');
    this.#customWrite=prepared;this.#magicBaselineWrite=magicBaseline;
    if(life)this.#lifeWrite={projection:life,reaction:null,previousState:input.previousState};
    try{const c=this.record(input);
      const reaction=this.#lifeWrite?.reaction||null;
      if(magicBaseline)this.#assertMagicBaseline(c,magicBaseline.projection);
      this.assertCustomAbilityHistory(input.state);return{commit:c,reaction};
    }finally{
      this.#customWrite=undefined;this.#magicBaselineWrite=undefined;this.#lifeWrite=undefined;
    }
  }
  #publishCustom(commit,state) {
    if(this.#customRoot) {
      for(const selection of state.customAbilitySetup.selections) {this.#customDefinition(selection.definitionId,selection.revision);
        const bindingId=`binding:${abilityDigest([commit.run_id,selection])}`;
        const proof={selection,actorId:'player',bodyId:'body:player',mindId:'mind:player',root:commit.commit_ref}; const json=canonical(proof);
        this.#db.prepare('INSERT INTO domain_custom_bindings VALUES(?,?,?,?,?,?,?)').run(bindingId,commit.run_id,commit.commit_ref,selection.definitionId,selection.revision,json,hash(json));
        const read=this.#db.prepare('SELECT * FROM domain_custom_bindings WHERE binding_id=?').get(bindingId);if(canonical(this.#customData(read))!==json)fail('INVALID_DOMAIN_STATE');
        const eventRef=this.#event(commit,'custom_ability_initial_setup',{bindingId,selection});
        if(selection.initialState.recognition==='known')this.#cognition.appendObservations({commitRef:commit.commit_ref,observations:[{ownerId:'player',eventRef,text:'我知道本局已确认的一项自定义能力；实际可用目标以当前合法句柄为准。',channel:'private_recollection',occurredAt:state.worldTime,learnedAt:state.worldTime}]});
      }
      this.#customBindingRows(state);
    }
    if(this.#customWrite) {
      const p=this.#customWrite,json=canonical({command:p.command,bindingId:p.bindingId,result:p.result,destinationEvidence:p.destinationEvidence});
      this.#db.prepare('INSERT INTO domain_custom_uses VALUES(?,?,?,?,?,?)').run(commit.commit_ref,commit.run_id,p.command.requestId,commit.parent_commit_ref,json,hash(json));
      for(const effect of p.result.obligations){const e=canonical(effect);this.#db.prepare('INSERT INTO domain_custom_effects VALUES(?,?,?,?)').run(effect.id,commit.commit_ref,e,hash(e));}
      const receipt=canonical({useId:p.command.requestId,requestDigest:p.result.receiptObligation.requestDigest,effectIds:p.result.obligations.map(e=>e.id),sourceCommitRef:commit.parent_commit_ref,commitRef:commit.commit_ref});
      this.#db.prepare('INSERT INTO domain_custom_receipts VALUES(?,?,?)').run(commit.commit_ref,receipt,hash(receipt));
      if(canonical(this.#customData(this.#db.prepare('SELECT * FROM domain_custom_receipts WHERE commit_ref=?').get(commit.commit_ref)))!==receipt)fail('INVALID_DOMAIN_STATE');
      const saved=this.#db.prepare('SELECT * FROM domain_custom_uses WHERE commit_ref=?').get(commit.commit_ref);
      if(canonical(this.#customData(saved))!==json)fail('INVALID_DOMAIN_STATE');
      const effects=this.#db.prepare('SELECT * FROM domain_custom_effects WHERE commit_ref=? ORDER BY effect_id').all(commit.commit_ref);
      if(canonical(effects.map(e=>this.#customData(e)).sort((a,b)=>a.id.localeCompare(b.id)))!==canonical([...p.result.obligations].sort((a,b)=>a.id.localeCompare(b.id))))fail('INVALID_DOMAIN_STATE');
      const parentEntries=parse(this.#commit(commit.parent_commit_ref).snapshot_json).entries.length;
      const act=p.act===true;
      const expected=act
        ? state.entries.slice(parentEntries).filter(entry=>entry.customAbilityEvent)
        : state.entries.slice(parentEntries);
      this.#assertCustomObservations(commit,expected,{exact:!act});
    }
  }
  #assertCustomObservations(commit,entries,{ exact = true } = {}) {
    const expected=entries.flatMap(entry=>entry.audienceIds.map(owner=>({id:actorObservationId(parse(commit.snapshot_json),entry.observationKey,owner),owner,entry})));
    const actual=this.#db.prepare('SELECT * FROM cognition_observations WHERE commit_ref=? ORDER BY id').all(commit.commit_ref);
    // Neutral custom casts own the whole commit. An act also carries ordinary
    // narration/action observations, so it proves only its typed custom closure.
    if(exact && actual.length!==expected.length)fail('INVALID_DOMAIN_STATE');
    for(const {id,owner,entry} of expected){const matches=actual.filter(o=>o.id===id);
      if(matches.length!==1)fail('INVALID_DOMAIN_STATE');
      const o=matches[0],e=this.#db.prepare('SELECT * FROM domain_world_events WHERE event_ref=? AND commit_ref=?').get(o.event_ref,commit.commit_ref);
      const expectedLearnedAt = entry.learnedAt ?? commit.world_time;
      if(o.owner_id!==owner||o.text!==entry.text||o.channel!==(owner==='player'?'self_expression':entry.delivery==='speech'?'hearing':'sight')
        ||o.occurred_at!==entry.occurredAt
        ||(o.learned_at!==expectedLearnedAt && !(entry.customAbilityEvent && o.learned_at===entry.occurredAt))
        ||!e||hash(e.payload)!==e.payload_hash)fail('INVALID_DOMAIN_STATE');
      const p=parse(e.payload);if(p.sourceEntryRef!==entry.id||p.text!==entry.text||p.delivery!==entry.delivery||p.speakerId!==entry.speakerId||canonical(p.audienceIds)!==canonical(entry.audienceIds))fail('INVALID_DOMAIN_STATE');
    }
  }
  #assertCustomActHistory(c,before,after,use,proof,prepared) {
    const delta=prepared.next;
    if(c.kind!=='act'||c.parent_commit_ref===null||use.source_commit_ref!==c.parent_commit_ref
      ||use.request_id!==proof.command.requestId||use.run_id!==c.run_id
      ||canonical(prepared.result)!==canonical(proof.result)||proof.bindingId!==prepared.bindingId
      ||canonical(proof.destinationEvidence??null)!==canonical(prepared.destinationEvidence)
      ||after.generation!==before.generation||after.revision!==before.revision+1)fail('INVALID_DOMAIN_STATE');
    const customEntries=delta.entries.slice(before.entries.length);
    const sourceEffects=new Set(before.entries.flatMap(row=>row.customAbilityEvent?.effectId?[row.customAbilityEvent.effectId]:[]));
    const finalCustom=after.entries.filter(row=>row.customAbilityEvent&&!sourceEffects.has(row.customAbilityEvent.effectId));
    const strip=row=>{const {id,...rest}=row;return rest;};
    if(!isDeepStrictEqual(finalCustom.map(strip),customEntries.map(strip)))fail('INVALID_DOMAIN_STATE');
    const expectedEffects=[...new Set(prepared.result.obligations.map(row=>row.id))].sort();
    const actualEffects=[...new Set(finalCustom.flatMap(row=>row.customAbilityEvent?.effectId?[row.customAbilityEvent.effectId]:[]))].sort();
    if(!isDeepStrictEqual(actualEffects,expectedEffects))fail('INVALID_DOMAIN_STATE');
    const sourceSignals=before.caseRuntime?.signals||[],deltaSignals=delta.caseRuntime?.signals||[];
    const customSignals=deltaSignals.slice(sourceSignals.length);
    const sourceSignalIds=new Set(sourceSignals.map(row=>row.id));
    const finalSignals=(after.caseRuntime?.signals||[]).filter(row=>row.id?.startsWith('generic:')
      && row.sourceEffectId&&!sourceSignalIds.has(row.id));
    if(!isDeepStrictEqual(finalSignals,customSignals))fail('INVALID_DOMAIN_STATE');
    if(runtimeRoom(after,'player')!==runtimeRoom(delta,'player'))fail('INVALID_DOMAIN_STATE');
    const customObservations=after.entries.slice(before.entries.length).filter(entry=>entry.customAbilityEvent);
    this.#assertCustomObservations(c,customObservations,{exact:false});
    const receipt=this.#customData(this.#db.prepare('SELECT * FROM domain_custom_receipts WHERE commit_ref=?').get(c.commit_ref));
    if(canonical(receipt)!==canonical({useId:proof.command.requestId,requestDigest:prepared.result.receiptObligation.requestDigest,effectIds:prepared.result.obligations.map(e=>e.id),sourceCommitRef:c.parent_commit_ref,commitRef:c.commit_ref}))fail('INVALID_DOMAIN_STATE');
    const effects=this.#db.prepare('SELECT * FROM domain_custom_effects WHERE commit_ref=? ORDER BY effect_id').all(c.commit_ref);
    if(canonical(effects.map(e=>this.#customData(e)).sort((a,b)=>a.id.localeCompare(b.id)))!==canonical([...proof.result.obligations].sort((a,b)=>a.id.localeCompare(b.id))))fail('INVALID_DOMAIN_STATE');
  }
  assertCustomAbilityHistory(state) {
    if(!state.customAbilitySetup)return true;
    const head=this.#at(state); this.#customBindingRows(state);
    const rows=this.#db.prepare(`${COGNITION_HISTORY_SQL} SELECT c.* FROM history h JOIN domain_commits c USING(commit_ref) ORDER BY h.depth DESC`).all({$commitRef:head.commit_ref,$runId:head.run_id});
    for(const c of rows){
      if(c.kind==='magic_activate'){
        // Guarded custom worlds may enable the original NPC-only MagicHost.
        // The activation must be sealed at this exact commit and must not
        // grant the created player any original magic.
        const saved=new MagicRepository(this.#db).readAt({commitRef:c.commit_ref,runId:c.run_id});
        if(!saved||saved.commitRef!==c.commit_ref||saved.state.grants?.some(row=>row.actorId==='player'))fail('CUSTOM_ABILITY_PROFILE_UNSUPPORTED');
        continue;
      }
      this.#customCurrentVisibility(parse(c.snapshot_json));
      if(c.kind==='act') {
        const before=parse(this.#commit(c.parent_commit_ref).snapshot_json),after=parse(c.snapshot_json);
        const action=after.agentActions?.at(-1);
        const typedCustom=after.entries.slice(before.entries.length).some(entry=>entry.customAbilityEvent)
          || action?.intent?.magic?.customBinding!==undefined;
        const use=this.#db.prepare('SELECT * FROM domain_custom_uses WHERE commit_ref=?').get(c.commit_ref);
        if(use) {
          const proof=this.#customData(use);
          const prepared=this.prepareCustomUseForHistory(before,proof.command);
          this.#assertCustomActHistory(c,before,after,use,proof,prepared);
        } else if(typedCustom) {
          // A typed custom act that lost its publication row is not a normal act.
          fail('INVALID_DOMAIN_STATE');
        }
      }
    }
    for(const c of rows)if(c.kind==='magic_cast') {
      const use=this.#db.prepare('SELECT * FROM domain_custom_uses WHERE commit_ref=?').get(c.commit_ref);
      if(!use){
        // A guarded custom world may also carry original NPC MagicHost casts.
        // They stay NPC-only and are proven by their exact sealed projection.
        const saved=new MagicRepository(this.#db).readAt({commitRef:c.commit_ref,runId:c.run_id});
        if(!saved||saved.commitRef!==c.commit_ref||saved.state.grants?.some(row=>row.actorId==='player'))fail('INVALID_DOMAIN_STATE');
        continue;
      }
      const proof=this.#customData(use),before=parse(this.#commit(c.parent_commit_ref).snapshot_json),after=parse(c.snapshot_json);
      // Re-derive actual old checkpoint sources, not latest branch/current text.
      const prepared=this.prepareCustomUseForHistory(before,proof.command);
      if(canonical(prepared.next)!==canonical(after)||canonical(prepared.result)!==canonical(proof.result)||proof.bindingId!==prepared.bindingId||canonical(proof.destinationEvidence??null)!==canonical(prepared.destinationEvidence)
        || use.source_commit_ref!==c.parent_commit_ref||use.request_id!==proof.command.requestId||use.run_id!==c.run_id)fail('INVALID_DOMAIN_STATE');
      this.#assertCustomObservations(c,after.entries.slice(before.entries.length));
      const receipt=this.#customData(this.#db.prepare('SELECT * FROM domain_custom_receipts WHERE commit_ref=?').get(c.commit_ref));
      if(canonical(receipt)!==canonical({useId:proof.command.requestId,requestDigest:prepared.result.receiptObligation.requestDigest,effectIds:prepared.result.obligations.map(e=>e.id),sourceCommitRef:c.parent_commit_ref,commitRef:c.commit_ref}))fail('INVALID_DOMAIN_STATE');
      const effects=this.#db.prepare('SELECT * FROM domain_custom_effects WHERE commit_ref=? ORDER BY effect_id').all(c.commit_ref);
      if(canonical(effects.map(e=>this.#customData(e)).sort((a,b)=>a.id.localeCompare(b.id)))!==canonical([...proof.result.obligations].sort((a,b)=>a.id.localeCompare(b.id))))fail('INVALID_DOMAIN_STATE');
    }
    return true;
  }
  prepareCustomUseForHistory(state,command) {
    // Historical source is independently joined, without replacing live head.
    return this.prepareCustomUse(state,command,true);
  }
  /** Record an already validated fixture transition. Random requests and adopted
   * cognitive records are host-only extension points, never parsed from prose.
   * A restored commit's narrative parent is its SOURCE, not the abandoned head.
   */
  record({ legacyEventId, kind, state, previousState, action, seed, legacy = false, randomDraws = [], records = [], decisionStates = [], storyFacts, storySource, runPolicyRequest, hiddenSupplyRoot = false, hiddenSupplyMode = 'off' }) {
    this.#transaction();
    if (kind === 'act' && state?.agentActions?.at(-1)?.executionLife && !this.#lifeWrite) fail('INVALID_STORY_FORK');
    if (state?.customAbilitySetup && ['initial','new_game'].includes(kind) && !this.#customRoot) fail('INVALID_DOMAIN_STATE');
    if (state?.customAbilitySetup && kind==='magic_cast' && !this.#customWrite) fail('INVALID_DOMAIN_STATE');
    const storyWrite = kind === 'story_rewind' ? this.#storyWrite : null;
    if (kind === 'story_rewind' && (!storyWrite || storySource?.requestId !== storyWrite.request.requestId
      || storySource?.requestFingerprint !== storyWrite.request.fingerprint)) fail('INVALID_STORY_FORK');
    if (!integer(legacyEventId, 1) || !['initial', 'new_game', 'act', 'load', 'rewind', 'story_rewind', 'magic_activate', 'magic_cast', 'player_avatar', 'run_policy'].includes(kind)
      || (kind === 'run_policy') !== (runPolicyRequest !== undefined)
      || !state || !integer(state.generation, 1) || !integer(state.revision) || !integer(state.worldTime)
      || !Array.isArray(state.turnIds) || !Array.isArray(randomDraws) || randomDraws.length > 64
      || !Array.isArray(records) || records.length > 128) fail('INVALID_DOMAIN_STATE');
    const existing = this.#db.prepare('SELECT commit_ref FROM domain_commits WHERE legacy_event_id=?').get(legacyEventId);
    if (existing) {
      const commit = this.#at(state);
      if (commit.commit_ref !== existing.commit_ref || commit.kind !== kind) fail('INVALID_DOMAIN_STATE');
      return commit;
    }
    const execution = previousState ? this.assertHead(previousState) : null;
    if (hiddenSupplyRoot && (kind !== 'new_game' || legacy || this.#customRoot)) fail('INVALID_DOMAIN_STATE');
    let policyWrite;
    if (kind === 'run_policy') {
      if (!execution || legacy || action || seed !== undefined || randomDraws.length || records.length || decisionStates.length) fail('INVALID_DOMAIN_STATE');
      policyWrite = prepareRunPolicyAdoption(this.#db, { generation: execution.generation, revision: execution.revision, branch_id: execution.branch_id },
        previousState, state, this.effectiveRunPolicy(previousState), runPolicyRequest);
    }
    if (kind === 'act' && state?.exampleId === 'agent') this.assertOrdinaryAttemptPublication(previousState, state.agentActions?.at(-1), state);
    if (kind === 'act' && state.agentActions?.at(-1)?.jobId) this.assertBallotInstrumentPublication(previousState, state.agentActions.at(-1));
    // A prepared swap record is its own host transition: establish introduces
    // occupancy from an unoccupied parent, and a later establish may reintroduce
    // it after a real return left an identity mirror behind. Restore replaces the
    // prepared mirror while both parents are occupied. Every such after-state was
    // already compared by recordWithSwapLifecycle against prepareSwapLifecycle's
    // authenticated projection, so do not re-audit it against the pre-transition
    // saved identity. Ordinary acts with a mirror still take the normal audit.
    const preparedSwapTransition = isPreparedSwapTransition(this.#swapWrite, state);
    if (state.caseRuntime?.occupiedBody && !preparedSwapTransition
      && !['magic_activate', 'magic_cast', 'load', 'rewind', 'initial', 'new_game'].includes(kind)) {
      this.assertOccupiedBodyWorld(previousState);
      const saved = new MagicRepository(this.#db).readAt({ commitRef: execution.commit_ref, runId: execution.run_id });
      if (!saved || canonical(state.caseRuntime.occupiedBody) !== canonical(occupiedBodyWorld(saved.state.identity))) fail('INVALID_DOMAIN_STATE');
    }
    if (kind === 'initial') {
      if (execution || state.generation !== 1 || state.revision !== 0 || state.turnIds.length) fail('INVALID_DOMAIN_STATE');
    } else {
      const nextGeneration = ['new_game', 'load', 'rewind', 'story_rewind'].includes(kind) ? 1 : 0;
      if (!execution || state.generation !== execution.generation + nextGeneration || state.revision !== execution.revision + 1) fail('INVALID_DOMAIN_STATE');
    }
    const starting = kind === 'initial' || kind === 'new_game';
    let parent = execution;
    if (storyWrite) {
      parent = storyWrite.source;
      if (execution.commit_ref !== storyWrite.execution.commit_ref
        || domainFingerprint(parse(parent.snapshot_json)) !== domainFingerprint(state)
        || parent.turn_depth !== state.turnIds.length) fail('INVALID_STORY_FORK');
    }
    if (kind === 'load' || kind === 'rewind') {
      if (!state.restoredFrom) fail('INVALID_DOMAIN_STATE');
      const source = this.#db.prepare('SELECT commit_ref FROM domain_commits WHERE generation=? AND revision=?')
        .get(state.restoredFrom.generation, state.restoredFrom.revision);
      if (!source) fail('INVALID_DOMAIN_STATE');
      parent = this.#commit(source.commit_ref);
      // Rewind deliberately preserves the current avatar. Every other field
      // must match the checkpoint it claims to restore.
      const original = parse(parent.snapshot_json);
      if (kind === 'rewind') {
        if (state.playerAvatarId) original.playerAvatarId = state.playerAvatarId;
        else delete original.playerAvatarId;
        const path = this.#db.prepare(`WITH RECURSIVE history(commit_ref,parent_commit_ref) AS (
          SELECT commit_ref,parent_commit_ref FROM domain_commits WHERE commit_ref=?
          UNION ALL SELECT c.commit_ref,c.parent_commit_ref FROM domain_commits c JOIN history h ON c.commit_ref=h.parent_commit_ref
        ) SELECT commit_ref FROM history WHERE commit_ref=?`).get(execution.commit_ref, parent.commit_ref);
        if (!path || parent.turn_depth >= execution.turn_depth) fail('INVALID_DOMAIN_STATE');
      }
      if (domainFingerprint(original) !== domainFingerprint(state) || parent.turn_depth !== state.turnIds.length) fail('INVALID_DOMAIN_STATE');
    }
    const run = starting ? this.#newRun(state, { seed, legacy }) : this.#run(parent.run_id);
    if (run.scenario_ref !== scenario(state)) fail('SOURCE_VERSION_MISMATCH');
    if (state.exampleId === 'agent') {
      const setup = parse(this.#db.prepare('SELECT manifest FROM domain_setups WHERE setup_ref=?').get(run.initial_setup_ref).manifest);
      if (CONTENT_REVISIONS.resolve({ scenarioRef: run.scenario_ref, contentPackage: setup.contentPackage,
        executionRevision: setup.executionRevision }).id !== runtimeRevisionForState(state).id) fail('SOURCE_VERSION_MISMATCH');
      guardRuleReference(state);
    }
    const branch = starting ? this.#newBranch(run, 'root')
      : ['load', 'rewind'].includes(kind) ? this.#newBranch(run, kind, parent)
        : this.#db.prepare('SELECT * FROM domain_branches WHERE branch_id=?').get(parent.branch_id);
    if (!branch || branch.run_id !== run.run_id || branch.random_lineage_ref !== run.random_lineage_ref) fail('INVALID_DOMAIN_STATE');
    if (['magic_activate', 'magic_cast'].includes(kind) && (state.turnIds.length !== parent.turn_depth
      || state.worldTime !== previousState.worldTime || canonical(state.agentActions) !== canonical(previousState.agentActions))) fail('INVALID_DOMAIN_STATE');
    if (kind === 'magic_activate') {
      const { caseRuntime, itemPolicyVersion, agentAutonomy, storyLifeVersion, ...after } = story(state);
      const { caseRuntime: oldRuntime, itemPolicyVersion: oldItems, agentAutonomy: oldAutonomy, storyLifeVersion: oldLife, ...before } = story(previousState);
      if (caseRuntime?.occupiedBody) {
        if (oldRuntime?.occupiedBody || caseRuntime.occupiedBody.version !== 1) fail('INVALID_DOMAIN_STATE');
        const ids = actorsForState(previousState).filter(row => row.id !== 'warden').map(row => row.id);
        if (canonical(caseRuntime.occupiedBody.occupants) !== canonical(Object.fromEntries(ids.map(id => [id, id])))
          || ids.some(id => runtimePhysicalRoom(state, id) !== runtimePhysicalRoom(previousState, id))) fail('INVALID_DOMAIN_STATE');
        delete before.agentPositions; delete after.agentPositions;
      }
      if (storyLifeVersion !== oldLife && !(storyLifeVersion === 1 && oldLife === undefined)) fail('INVALID_DOMAIN_STATE');
      if (canonical(after) !== canonical(before)) fail('INVALID_DOMAIN_STATE');
    }
    if (kind === 'player_avatar') {
      const before = story(previousState); const after = story(state);
      delete before.playerAvatarId; delete after.playerAvatarId;
      if (digest(before) !== digest(after) || state.turnIds.length !== parent.turn_depth) fail('INVALID_DOMAIN_STATE');
    }
    if (starting) {
      if (state.turnIds.length) fail('INVALID_DOMAIN_STATE');
      parent = null;
    }
    const input = { phase: previousState?.phase ?? null, customStage: previousState?.customStage ?? null,
      worldTime: previousState?.worldTime ?? 0, location: previousState?.location ?? null };
    const intentKey = kind === 'act' ? action?.intentKey : kind;
    if (kind === 'act' && (typeof intentKey !== 'string' || !intentKey.length || state.turnIds.length !== parent.turn_depth + 1)) fail('INVALID_DOMAIN_STATE');
    const causalKey = starting ? digest(['fixture-root@1', run.scenario_ref, run.rules_ref, run.initial_config_hash])
      : kind === 'act' ? digest(['fixture-action@1', parent.causal_key, playerId(state), intentKey, input]) : parent.causal_key;
    const json = JSON.stringify(state);
    const commit = { commit_ref: storyWrite?.commitRef ?? randomUUID(), run_id: run.run_id, branch_id: branch.branch_id,
      parent_commit_ref: parent?.commit_ref ?? null, previous_execution_ref: execution?.commit_ref ?? null,
      sequence: parent ? parent.sequence + 1 : 0, generation: state.generation, revision: state.revision,
      world_time: state.worldTime, kind, causal_key: causalKey, snapshot_json: json, snapshot_hash: hash(json),
      story_fingerprint: domainFingerprint(state), turn_depth: state.turnIds.length, legacy_event_id: legacyEventId, schema_version: 1 };
    this.#db.prepare(`INSERT INTO domain_commits(${commitFields.join(',')},integrity_hash)
      VALUES(${[...commitFields, 'integrity_hash'].map(() => '?').join(',')})`).run(...commitFields.map(key => commit[key]), digest(commit));
    if (policyWrite) this.#db.prepare('INSERT INTO domain_run_policy_v1 VALUES(?,?,?,?,1)').run(commit.commit_ref, ...policyWrite);
    if (kind === 'act') {
      const actionRef = randomUUID();
      this.#db.prepare('INSERT INTO domain_actions VALUES(?,?,?,?,?,?,?,?,?,1)')
        .run(actionRef, run.run_id, branch.branch_id, commit.commit_ref, state.turnIds.at(-1), playerId(state), intentKey, causalKey, digest(input));
      this.#db.prepare('INSERT INTO domain_turn_aliases VALUES(?,?)').run(state.turnIds.at(-1), actionRef);
    }
    if (starting || kind === 'act' || kind === 'magic_cast') {
      this.#event(commit, legacy ? 'legacy_fixture_checkpoint' : 'fixture_transition',
        { phase: state.phase, location: state.location, worldTime: state.worldTime, completed: state.completed });
      const beforeEntries = starting ? 0 : presented(previousState).length;
      const offscreenStart = starting ? 0 : previousState?.agentAutonomy?.events?.length || 0;
      const entries = [...presented(state).slice(beforeEntries), ...(state.agentAutonomy?.events || []).slice(offscreenStart)];
      if (state.agentAutonomy && entries.some(entry => !Number.isSafeInteger(entry.occurredAt) || entry.occurredAt < 0 || entry.occurredAt > state.worldTime)) fail('INVALID_DOMAIN_STATE');
      const caseSources = [];
      const ordinarySources = new Map();
      const observations = entries.map(entry => {
        // Openings and verdict executions can recur verbatim on another run or
        // restored branch. Their newly delivered observations belong to this
        // commit; inherited source IDs and the deterministic story stay intact.
        const hostActionType = state.agentActions?.at(-1)?.type;
        const commitScoped = entry.openingSource || entry.observationKey?.startsWith('guard:')
          || (kind === 'act' && (hostActionType === 'case_execution' || hostActionType?.startsWith('guard_')));
        const delivery = entry.delivery || (entry.speaker.endsWith('（书写）') ? 'writing'
          : ['旁白', '验证说明'].includes(entry.speaker) ? 'narration' : 'speech');
        // A statement is evidence of what was said, NOT proof of its claims.
        // Narration is player-facing fixture material, never omniscient NPC data.
        let ordinaryPayload;
        if (entry.ordinaryAttemptEvent) {
          const expected = this.assertOrdinaryAttemptPublication(previousState, state.agentActions.at(-1));
          if (!expected || !isDeepStrictEqual(entry.ordinaryAttemptEvent, expected.ordinaryAttemptEvent)
            || entry.text !== expected.text || entry.delivery !== 'action' || entry.speakerId !== null
            || !isDeepStrictEqual(entry.audienceIds, expected.audienceIds) || entry.occurredAt !== expected.occurredAt
            || entry.learnedAt !== expected.learnedAt) fail('INVALID_DOMAIN_STATE');
          ordinaryPayload = structuredClone(entry.ordinaryAttemptEvent);
          for (const binding of ordinaryPayload.sourceRefs) for (const cert of binding.certificates) if (cert.kind === 'prefix-perception') {
            const prior = ordinarySources.get(cert.entryKey);
            if (!prior || prior.entry.delivery !== 'speech' || hash(JSON.stringify(prior.entry)) !== cert.entryHash
              || prior.entry.occurredAt !== cert.occurredAt || !prior.entry.audienceIds.includes(cert.ownerId)
              || !isDeepStrictEqual(prior.entry.audienceIds, cert.audienceIds)) fail('INVALID_DOMAIN_STATE');
            cert.eventRef = prior.eventRef;
            cert.observationId = actorObservationId(state, cert.entryKey, cert.ownerId);
          }
        }
        const eventRef = this.#event(commit, ordinaryPayload ? 'ordinary_attempt_result' : delivery === 'narration' ? 'player_narration' : 'statement',
          ordinaryPayload ||
          { speakerLabel: entry.speaker, text: entry.text, delivery, sourceEntryRef: entry.id,
            sourceFormat: legacy ? 'legacy-delivery' : 'fixture-delivery',
            ...(['prototype','agent'].includes(state.exampleId) ? { speakerId: entry.speakerId ?? null, audienceIds: entry.audienceIds } : {}) });
        if (entry.observationKey && delivery === 'speech') ordinarySources.set(entry.observationKey, { entry, eventRef });
        const audience = ['prototype','agent'].includes(state.exampleId) ? entry.audienceIds : [playerId(state)];
        if (!Array.isArray(audience) || !audience.length || (!state.agentAutonomy && !audience.includes(playerId(state)))
          || new Set(audience).size !== audience.length
          || (state.exampleId === 'prototype' && audience.some(id => !['emma', 'anan', 'hiro'].includes(id)))
          || (state.exampleId === 'agent' && audience.some(id => !actorsForState(state).some(actor => actor.id === id)))
          || (delivery === 'narration' && (audience.length !== 1 || audience[0] !== playerId(state)))) fail('INVALID_DOMAIN_STATE');
        if (delivery === 'reflection' && (state.exampleId !== 'agent' || runtimeRevisionForState(state).policy.playerPerformanceVersion !== 2
          || audience.length !== 1 || audience[0] !== playerId(state) || entry.speakerId !== playerId(state))) fail('INVALID_DOMAIN_STATE');
        const caseRefs = ballotCaseSourceRefs(state, entry);
        return audience.map(ownerId => {
          const observationId = state.exampleId === 'agent' && entry.observationKey
            ? actorObservationId(state, `${commitScoped ? `${commit.commit_ref}:` : ''}${entry.observationKey}`, ownerId) : randomUUID();
          caseSources.push(...caseRefs.map(source => ({ observationId, ...source })));
          return { ownerId, eventRef, id: observationId, text: entry.textByActor?.[ownerId] || entry.text,
          ...observationPerformer(state, ownerId, entry.speakerId),
          channel: entry.ordinaryAttemptEvent ? 'hearing' : !['prototype','agent'].includes(state.exampleId)
            ? delivery === 'speech' ? 'hearing' : delivery === 'writing' ? 'reading' : 'player_narration'
            : delivery === 'reflection' ? 'private_reflection' : delivery === 'narration' ? 'player_narration' : delivery === 'reading' ? 'reading' : ownerId === entry.speakerId ? 'self_expression'
              : delivery === 'speech' ? 'hearing' : delivery === 'action' ? 'sight' : 'reading',
          occurredAt: state.exampleId === 'agent' ? entry.occurredAt : state.worldTime,
          learnedAt: state.exampleId === 'agent' && runtimeRevisionForState(state).policy.sceneBeatVersion === 1
            ? entry.learnedAt ?? (entry.customAbilityEvent
              || state.agentActions?.at(-1)?.selfFloatEndObservationVersion === 1
                && entry.magicObservation?.version === 1 && entry.magicObservation.kind === 'self-float-landing'
                && entry.magicObservation.lifecycle === 'ended' && entry.magicObservation.channel === 'sight'
              ? entry.occurredAt : state.worldTime) : state.worldTime }; });
      }).flat();
      const adopted = [];
      for (let offset = 0; offset < observations.length; offset += 128) {
        adopted.push(...this.#cognition.appendObservations({ commitRef: commit.commit_ref, observations: observations.slice(offset, offset + 128) }));
      }
      for (let offset = 0; offset < caseSources.length; offset += 128) this.#cognition.appendCaseSources({
        commitRef: commit.commit_ref, sources: caseSources.slice(offset, offset + 128) });
      if (state.exampleId === 'agent' && state.agentWorld) {
        const beforeActivities = starting ? 0 : previousState?.agentWorld?.activityLog?.length || 0;
        for (const activity of state.agentWorld.activityLog.slice(beforeActivities)) {
          const eventRef = this.#event(commit, 'prison_activity', structuredClone(activity));
          // The same authored activity can recur after regeneration/load. Its
          // observation belongs to this commit, never the abandoned branch.
          this.#cognition.appendObservations({ commitRef: commit.commit_ref, observations: activity.witnessIds.map(ownerId => ({
            id: activity.observationKey ? actorObservationId(state, activity.observationKey, ownerId) : actorObservationId(state, `${activity.id}:${commit.commit_ref}`, ownerId), ownerId, eventRef, text: activity.textByActor?.[ownerId] || activity.text,
            ...observationPerformer(state, ownerId, activity.actorId),
            channel: 'sight', occurredAt: activity.occurredAt,
            learnedAt: runtimeRevisionForState(state).policy.sceneBeatVersion === 1 ? activity.learnedAt ?? state.worldTime : state.worldTime })) });
        }
      }
      if (state.exampleId === 'agent' && !starting && state.agentWorld && !previousState?.agentWorld) {
        // Activation on a historical run appends owner-local knowledge at the
        // present commit; no sealed starting observations are retrofitted.
        for (const actor of actorsForState(state)) {
          const facts = ownerWorldFacts(actor.id, state);
          if (!facts.length) continue;
          const eventRef = this.#event(commit, 'actor_world_knowledge', { ownerId: actor.id, source: PRISON_WORLD_REF, sha256: runtimeRevisionForState(state).worldHash });
          this.#cognition.appendObservations({ commitRef: commit.commit_ref, observations: facts.map(text => ({
            ownerId: actor.id, eventRef, text, channel: 'private_recollection', occurredAt: state.worldTime, learnedAt: state.worldTime })) });
        }
      }
      if (state.exampleId === 'agent' && starting) {
        // Private starting recollections are actor-owned authored setup data,
        // never shared narration or confirmed objective truth.
        for (const actor of actorsForState(state)) {
          if (!actor.initialKnowledge.length) continue;
          const supplementary = bunkStartingKnowledge(state, actor);
          const original = actor.initialKnowledge.filter(text => !supplementary.includes(text));
          const eventRef = this.#event(commit, 'actor_initial_knowledge', { ownerId: actor.id, source: hasCaseOne(state) ? runtimeRevisionForState(state).caseOneHash : runtimeRevisionForState(state).scenarioHash,
            ...(usesBunkSettingV2(state) ? { wordingAdaptation: structuredClone(state.settingSupplement) } : {}) });
          const initial = this.#cognition.appendObservations({ commitRef: commit.commit_ref, observations: original.map(text => ({
            ownerId: actor.id, eventRef, text, channel: 'private_recollection', occurredAt: 0, learnedAt: 0 })) });
          if (runtimeCapabilityId(state.agentRuntimeRevision) === 'agent-prison-runtime@8' && hasCaseOne(state)) {
            const baseline = runtimeRevisionForState(state).actors.find(row => row.id === actor.id)?.initialKnowledge || [];
            const experiences = initial.filter(row => !baseline.includes(row.text));
            if (experiences.length) this.#cognition.appendCaseSources({ commitRef: commit.commit_ref,
              sources: experiences.map(row => ({ observationId: row.id, caseRef: ballotCaseScope(state).caseRef, kind: 'experience' })) });
          }
          if (supplementary.length) {
            const supplementEvent = this.#event(commit, 'actor_setting_supplement', { ownerId: actor.id,
              source: structuredClone(state.settingSupplement), classification: bunkKnowledgeClassification(state, actor.id) });
            this.#cognition.appendObservations({ commitRef: commit.commit_ref, observations: supplementary.map(text => ({
              ownerId: actor.id, eventRef: supplementEvent, text, channel: 'private_recollection', occurredAt: 0, learnedAt: 0 })) });
          }
        }
      }
      if (state.exampleId === 'prototype') {
        // The offline prototype adopts literal episodic memories of actual local
        // exchanges, not inferred beliefs, global narration or model decisions.
        const memories = ['anan', 'hiro'].flatMap(ownerId => {
          const own = adopted.filter(observation => observation.actorId === ownerId);
          return own.length ? [{ ownerId, kind: 'memory',
            summary: `本次交流记录（不代表相信其内容）：${own.map(observation => observation.text).join(' / ')}`,
            sourceObservationIds: own.map(observation => observation.id) }] : [];
        });
        if (memories.length) this.#cognition.appendRecords({ commitRef: commit.commit_ref, records: memories });
      }
    }
    for (const request of randomDraws) {
      const draw = this.#random.draw({ ...request, runId: run.run_id, lineageRef: run.random_lineage_ref,
        semanticKey: { causalKey, purpose: request.semanticKey } });
      this.#db.prepare('INSERT INTO domain_commit_draws VALUES(?,?)').run(commit.commit_ref, draw.drawId);
    }
    if (records.length) this.#cognition.appendRecords({ commitRef: commit.commit_ref, records });
    if (starting && state.exampleId === 'agent' && runtimeRevisionForState(state).policy.psychologicalInitialization === 1) {
      if (legacy || decisionStates.length) fail('INVALID_DOMAIN_STATE');
      const runtime = runtimeRevisionForState(state);
      // A canonical source prologue may advance time before player handoff.
      // Root identity, not a zero clock, authorizes this one-time initialization.
      // Source observations, initial decisions and recovery anchor share THIS
      // root transaction. A view, load, rewind or reopen never seeds again.
      for (const actor of actorsForState(state)) {
        const verified = isRelationshipRuntime(runtime) ? relationshipRootForRows({ run: this.#run(commit.run_id),
          root: this.#commit(commit.commit_ref), setup: this.#db.prepare('SELECT * FROM domain_setups WHERE setup_ref=? AND run_id=?')
            .get(run.initial_setup_ref, run.run_id) }) : null;
        const blueprint = verified ? relationshipOwnerBlueprint(verified.setup, actor.id, verified.context)
          : bunkPsychologyBlueprint(state, psychologySeedBlueprint(runtime, actor, commit.commit_ref));
        const eventRef = this.#event(commit, 'actor_psychology_initialization', { ownerId: actor.id,
          revision: runtime.executionRevision, profileFingerprint: runtime.psychology.fingerprint,
          sources: blueprint.observations.map(({ id, source }) => ({ observationId: id, ...source })) });
        if (blueprint.observations.length) this.#cognition.appendObservations({ commitRef: commit.commit_ref,
          observations: blueprint.observations.map(({ id, ownerId, text }) => ({ id, ownerId, eventRef, text,
            channel: 'private_recollection', occurredAt: 0, learnedAt: 0 })) });
        this.#decisions.appendInitial({ commitRef: commit.commit_ref, ownerId: actor.id });
      }
    }
    const maxDecisionActors = state.exampleId === 'agent' ? runtimeRevisionForState(state).policy.sceneBudget?.actors || 3 : 3;
    if (!Array.isArray(decisionStates) || decisionStates.length > maxDecisionActors) fail('INVALID_DOMAIN_STATE');
    for (const decision of decisionStates) {
      if (decision.journal) this.#decisions.appendSceneTransition({ commitRef: commit.commit_ref, ownerId: decision.ownerId,
        journal: decision.journal, state: decision.state });
      else this.#decisions.append({ commitRef: commit.commit_ref, ownerId: decision.ownerId, state: decision.state });
    }
    if (storyWrite) {
      this.#db.prepare('INSERT INTO domain_story_commit_memberships VALUES(?,?)').run(commit.commit_ref, storyWrite.branchId);
      const eventRef = this.#event(commit, 'story_memory_carry', { requestId: storyWrite.request.requestId,
        ownerId: storyWrite.request.actorId, sourceExecutionRef: execution.commit_ref });
      this.#cognition.carryStoryMemories({ sourceCommitRef: execution.commit_ref, commitRef: commit.commit_ref,
        ownerId: storyWrite.request.actorId, mindId: storyWrite.request.mindId,
        sourceBranchId: storyWrite.request.source.branchId, memories: storyWrite.request.carry.memories, eventRef });
    } else if (!starting) {
      const membership = this.#db.prepare('SELECT story_branch_id FROM domain_story_commit_memberships WHERE commit_ref=?').get(parent.commit_ref);
      if (membership) this.#db.prepare('INSERT INTO domain_story_commit_memberships VALUES(?,?)').run(commit.commit_ref, membership.story_branch_id);
    }
    if (kind === 'act' && state.caseRuntime?.swapLifecycle
      && state.agentActions?.at(-1)?.swapLifecycleVersion === 1) this.#publishSwapContacts(commit, previousState, state);
    this.#publishStoryFacts(commit, state, storyFacts);
    if (this.#lifeWrite && (storyFacts?.deaths?.some(row => row.actorId === 'hiro') || state.caseOutcome?.status === 'pending')) {
      this.#db.prepare(`INSERT INTO domain_head VALUES(1,?,?,?) ON CONFLICT(id) DO UPDATE SET
        run_id=excluded.run_id,branch_id=excluded.branch_id,commit_ref=excluded.commit_ref`)
        .run(run.run_id, branch.branch_id, commit.commit_ref);
      this.#publishStoryLife(commit, state, storyFacts);
    }
    if (this.#swapWrite) {
      const publication = this.#swapWrite;
      const result = { state: publication.projection, receipt: publication.receipt, events: publication.events };
      new MagicRepository(this.#db).append({ branchId: commit.branch_id, commitRef: commit.commit_ref,
        expectedHead: commit.parent_commit_ref, command: publication.command, result });
      this.#db.prepare('INSERT INTO domain_swap_lifecycle VALUES(?,?,?,?,?,?,?,?)').run(commit.commit_ref, commit.parent_commit_ref,
        publication.command.useId, publication.command.type, canonical(publication.command), abilityDigest(publication.command),
        abilityDigest(result), canonical(publication.proof));
    }
    if (this.#magicWrite && this.#durableWrite) fail('INVALID_DOMAIN_STATE');
    if (this.#magicWrite && this.#magicBaselineWrite) fail('INVALID_DOMAIN_STATE');
    if (this.#magicWrite) this.#publishMagicBeforeSeal(commit, this.#magicWrite);
    if (this.#magicBaselineWrite) this.#publishMagicBaselineBeforeSeal(commit, this.#magicBaselineWrite);
    if (this.#durableWrite) this.#publishDurableBeforeSeal(commit, this.#durableWrite);
    const growthReservation = this.#growthReservation();
    if (kind === 'act' && growthReservation) {
      const pending = { operation: parse(growthReservation.operation_json), runId: growthReservation.run_id,
        headRef: growthReservation.source_head_ref };
      const jobId = state.agentActions?.at(-1)?.jobId;
      const job = jobId && this.#db.prepare('SELECT * FROM agent_turn_jobs WHERE job_id=?').get(jobId);
      if (!job || jobId !== growthReservation.job_id || job.request_id !== growthReservation.request_id
        || hash(job.text) !== growthReservation.text_hash) fail('GROWTH_RESERVED_FOR_OTHER_REQUEST');
      const growthScope = openSqliteScope(this.#db, `growth_${randomUUID().replaceAll('-', '')}`);
      try {
        this.#publishGrowthBeforeSeal(commit, pending);
        const table = pending.operation.type === 'declare' ? 'domain_growth_declarations'
          : pending.operation.type === 'evidence' ? 'domain_growth_evidence' : null;
        if (table && this.#db.prepare(`SELECT count(*) n FROM ${table} WHERE commit_ref=?`).get(commit.commit_ref).n
          !== (pending.operation.type === 'evidence' ? 3 : 1)) fail('GROWTH_APPLICATION_INCOMPLETE');
        this.assertGrowthHistory(state);
        this.#db.prepare('INSERT INTO domain_growth_resolutions VALUES(?,?,?)')
          .run(growthReservation.reservation_id, commit.commit_ref, 'applied-act');
        growthScope.release();
      } catch (error) { growthScope.rollback(); throw error; }
    }
    if (growthReservation && ['load', 'rewind', 'new_game', 'story_rewind'].includes(kind)) {
      // Explicit branch replacement cancels, never transfers the reserved act.
      this.#db.prepare('INSERT INTO domain_growth_resolutions VALUES(?,?,?)')
        .run(growthReservation.reservation_id, commit.commit_ref, 'cancelled-branch');
    } else if (growthReservation && kind !== 'act') fail('GROWTH_RESERVED_FOR_OTHER_REQUEST');
    if(state.customAbilitySetup&&this.#customRoot){
      this.#db.prepare('INSERT INTO domain_custom_visibility_roots VALUES(?,?,1)').run(commit.run_id,commit.commit_ref);
      if(!this.#db.prepare('SELECT 1 FROM domain_custom_visibility_roots WHERE run_id=? AND root_commit_ref=? AND version=1').get(commit.run_id,commit.commit_ref))fail('INVALID_DOMAIN_STATE');
    }
    if(state.customAbilitySetup&&this.#db.prepare('SELECT 1 FROM domain_custom_visibility_roots WHERE run_id=?').get(commit.run_id)){
      const roomId=runtimeRoom(state,'player');
      if(state.caseRuntime?.occupiedBody||!runtimeActive(state,'player')||!roomId||actorPerception(state,'player').roomId!==roomId)fail('CUSTOM_ABILITY_PROFILE_UNSUPPORTED');
      this.#event(commit,'custom_ability_current_visibility',{version:1,ref:'native-current-room-visibility@1',runId:commit.run_id,branchId:commit.branch_id,
        sourceCommitRef:commit.commit_ref,generation:commit.generation,revision:commit.revision,worldTime:commit.world_time,bodyId:'body:player',mindId:'mind:player',roomId});
      this.#customCurrentVisibility(state);
    }
    if (this.#customRoot || this.#customWrite) this.#publishCustom(commit,state);
    // Both ordinary and actual confirmed-binding roots enter this SAME gate,
    // after sources/decisions/bindings, before the save seal/outer transaction.
    if (starting && state.exampleId === 'agent' && isRelationshipRuntime(state)) {
      if (typeof this.#rootTaskPreflight !== 'function') fail('INVALID_DOMAIN_STATE');
      // Transaction-local head enables the SAME authorized production reads.
      // Neither this head nor any source/binding survives a failed gate.
      this.#db.prepare(`INSERT INTO domain_head VALUES(1,?,?,?) ON CONFLICT(id) DO UPDATE SET
        run_id=excluded.run_id,branch_id=excluded.branch_id,commit_ref=excluded.commit_ref`)
        .run(run.run_id, branch.branch_id, commit.commit_ref);
      this.#rootTaskPreflight({ state, commitRef: commit.commit_ref, runId: run.run_id, setupRef: run.initial_setup_ref });
    }
    if (hiddenSupplyRoot) registerHiddenSupplyRoot(this.#db, commit, state);
    if (execution && !legacy && kind === 'act' && state.agentRuntimeRevision === EVENT_DIRECTOR_RUNTIME_REVISION) {
      const read = ref => this.#commit(ref), ancestor = (head, source) => this.#ancestor(head, source);
      const policy = snapshot => this.effectiveRunPolicy(snapshot)?.pin;
      const acquired = publishHiddenSupply(this.#db, commit, execution, state, previousState, read, ancestor, policy, hiddenSupplyMode);
      if (acquired?.length) this.#cognition.appendObservations({ commitRef: commit.commit_ref,
        observations: acquired.map(({ binding, ...row }) => ({ ...row, eventRef: this.#event(commit, PRIVATE_SUPPLY_OBSERVATION_EVENT, binding) })) });
      publishHiddenSupplyA2(this.#db, commit, execution, state, previousState, read, ancestor, policy);
    }
    const saveAnchor = this.#anchor(commit, run);
    const storyMembership = this.#db.prepare('SELECT story_branch_id FROM domain_story_commit_memberships WHERE commit_ref=?').get(commit.commit_ref);
    if (storyMembership) {
      const storyBranch = this.#db.prepare('SELECT policy_ref,request_fingerprint FROM domain_story_branches WHERE branch_id=?').get(storyMembership.story_branch_id);
      this.#db.prepare('INSERT INTO domain_story_save_pins VALUES(?,?,?,?)').run(saveAnchor.anchor_ref,
        storyMembership.story_branch_id, storyBranch.policy_ref, storyBranch.request_fingerprint);
    }
    this.#db.prepare(`INSERT INTO domain_head VALUES(1,?,?,?) ON CONFLICT(id) DO UPDATE SET
      run_id=excluded.run_id,branch_id=excluded.branch_id,commit_ref=excluded.commit_ref`)
      .run(run.run_id, branch.branch_id, commit.commit_ref);
    return commit;
  }
  reconcileLegacyPaths(events) {
    this.#transaction();
    // A supported old floor migration may replace IDs with legacy-event IDs.
    // Keep both names as immutable aliases of the SAME historical action.
    // Never loosen path checking for arbitrary load-time changes.
    for (const event of events) {
      if (event.kind !== 'act') continue;
      const state = parse(event.state);
      const commit = this.#db.prepare('SELECT commit_ref,story_fingerprint FROM domain_commits WHERE legacy_event_id=?').get(event.id);
      if (!commit || commit.story_fingerprint !== domainFingerprint(state)) fail('INVALID_DOMAIN_STATE');
      const action = this.#db.prepare('SELECT action_ref FROM domain_actions WHERE commit_ref=?').get(commit.commit_ref);
      if (!action || !state.turnIds.at(-1)) fail('INVALID_DOMAIN_STATE');
      const turn = state.turnIds.at(-1);
      const alias = this.#db.prepare('SELECT action_ref FROM domain_turn_aliases WHERE turn_ref=?').get(turn);
      if (alias && alias.action_ref !== action.action_ref) fail('INVALID_DOMAIN_STATE');
      if (!alias) this.#db.prepare('INSERT INTO domain_turn_aliases VALUES(?,?)').run(turn, action.action_ref);
    }
  }
  /** Import known historical snapshots once. Seeds are marked future-only;
   * no old random draws, unobserved NPC knowledge or inferred beliefs are made.
   * Supported directory entries gain sidecar references without rewriting JSON.
   */
  importLegacy({ events, head, saves, validate, fresh = false }) {
    this.#transaction();
    if (this.#db.prepare('SELECT 1 FROM domain_commits LIMIT 1').get()
      || this.#db.prepare('SELECT 1 FROM domain_runs LIMIT 1').get()) fail('INVALID_DOMAIN_STATE');
    let previous;
    const versions = new Map();
    for (const event of events) {
      const state = parse(event.state);
      validate(state);
      if (event.generation !== state.generation || event.revision !== state.revision || versions.has(versionKey(state))) fail('INVALID_DOMAIN_STATE');
      // Truly old load records may lack a source hint. The legacy floor
      // migration already proved the path; use that path, never equal prose.
      let imported = state;
      if (['load', 'rewind'].includes(event.kind) && !state.restoredFrom) {
        const candidates = [...versions.values()].filter(candidate => {
          if (candidate.turnIds.length !== state.turnIds.length || !candidate.turnIds.every((id, index) => id === state.turnIds[index])) return false;
          const restored = { ...candidate };
          if (event.kind === 'rewind') {
            if (state.playerAvatarId) restored.playerAvatarId = state.playerAvatarId;
            else delete restored.playerAvatarId;
          }
          return domainFingerprint(restored) === domainFingerprint(state);
        });
        const roots = new Set(candidates.map(candidate => this.#at(candidate).run_id));
        if (roots.size !== 1 || !candidates.length) fail('INVALID_DOMAIN_STATE');
        const source = candidates.at(-1);
        imported = { ...state, restoredFrom: { generation: source.generation, revision: source.revision } };
      }
      let action;
      if (event.kind === 'act') {
        const turn = this.#db.prepare('SELECT text FROM prologue_turns WHERE id=?').get(state.turnIds.at(-1));
        action = { intentKey: this.intentKey(previous, turn?.text) };
      }
      this.record({ legacyEventId: event.id, kind: event.kind, state: imported, previousState: previous, action, legacy: !fresh });
      versions.set(versionKey(state), state);
      previous = state;
    }
    if (!previous || versionKey(previous) !== versionKey(head) || domainFingerprint(previous) !== domainFingerprint(head)) fail('INVALID_DOMAIN_STATE');
    this.assertHead(head);
    for (const slot of saves) {
      try {
        const state = parse(slot.state); validate(state);
        this.bindSlot(slot.id, slot.version, state);
      } catch (error) {
        // Damaged inactive saves remain visible/deletable and are never repaired
        // by borrowing the active run or giving them a new seed.
        if (!error.code || !/^(INVALID_|UNSUPPORTED_|SOURCE_VERSION_)/u.test(error.code)) throw error;
      }
    }
  }
  intentKey(before, text) {
    if (typeof text !== 'string') fail('INVALID_DOMAIN_STATE');
    if (before.exampleId === 'agent') {
      const procedure = hasCaseOne(before) ? before.caseOne : before.caseRuntime?.procedure;
      if (procedure?.stage === 'execution_ready' && text === '确认处刑推进') return `case-execution:${procedure.verdict.id}`;
      const parsed = parseAgentIntent(before, text);
      if (!parsed.accepted) fail('INVALID_DOMAIN_STATE');
      // Exact player speech participates in causal identity, but the model is
      // not claimed to be reproducible from the seed. Its accepted text is saved.
      return `agent-action:${digest(parsed.intent)}`;
    }
    if (before.exampleId === 'prototype') {
      const intent = parsePrototypeIntent(before, text);
      if (!intent.accepted) fail('INVALID_DOMAIN_STATE');
      return intent.intentKey;
    }
    const command = text === '继续（旧版行动）' ? '继续' : text.trim().replace(/[。！!？?]+$/u, '');
    if (before.exampleId === 'custom') return `custom-stage:${before.customStage}:continue`;
    if (before.phase === 'hiro_warning') return ['劝阻希罗', '阻止希罗'].includes(command) ? 'hiro-warning:intervene' : 'hiro-warning:observe';
    // Fixture suggestions in the other phases are aliases of one transition;
    // wording/punctuation must not buy a different rule draw on replay.
    return `emma-phase:${before.phase}:advance`;
  }
  bindSlot(slotId, slotVersion, state) {
    this.#transaction();
    const commit = this.#at(state);
    const anchor = this.#db.prepare('SELECT anchor_ref FROM domain_save_anchors WHERE commit_ref=?').get(commit.commit_ref);
    if (!anchor || !integer(slotVersion, 1)) fail('INVALID_SAVE_ANCHOR');
    this.#db.prepare(`INSERT INTO domain_save_slots VALUES(?,?,?) ON CONFLICT(slot_id) DO UPDATE SET
      slot_version=excluded.slot_version,anchor_ref=excluded.anchor_ref`).run(slotId, slotVersion, anchor.anchor_ref);
  }
  advanceSlotVersion(slotId, expectedVersion, nextVersion) {
    this.#transaction();
    if (!integer(expectedVersion, 1) || !integer(nextVersion, 1) || nextVersion !== expectedVersion + 1) fail('INVALID_SAVE_ANCHOR');
    const pointer = this.#db.prepare('SELECT slot_version FROM domain_save_slots WHERE slot_id=?').get(slotId);
    // Damaged legacy slots may have no anchor; a label edit must not repair one
    // by borrowing the current run. Existing anchors stay bound to their source.
    if (!pointer) return;
    if (pointer.slot_version !== expectedVersion) fail('INVALID_SAVE_ANCHOR');
    const result = this.#db.prepare('UPDATE domain_save_slots SET slot_version=? WHERE slot_id=? AND slot_version=?').run(nextVersion, slotId, expectedVersion);
    if (result.changes !== 1) fail('INVALID_SAVE_ANCHOR');
  }
  deleteSlot(slotId) {
    this.#transaction();
    this.#db.prepare('DELETE FROM domain_save_slots WHERE slot_id=?').run(slotId);
  }
  resolveSlot(slotId, slotVersion, state) {
    const pointer = this.#db.prepare('SELECT * FROM domain_save_slots WHERE slot_id=?').get(slotId);
    if (!pointer || pointer.slot_version !== slotVersion) fail('INVALID_SAVE_ANCHOR');
    const anchor = this.#db.prepare('SELECT * FROM domain_save_anchors WHERE anchor_ref=?').get(pointer.anchor_ref);
    if (!anchor || anchor.schema_version !== 1 || digest(selected(anchor, anchorFields)) !== anchor.integrity_hash) fail('INVALID_SAVE_ANCHOR');
    const commit = this.#at(state); const run = this.#run(commit.run_id);
    const storyMembership = this.#db.prepare('SELECT story_branch_id FROM domain_story_commit_memberships WHERE commit_ref=?').get(commit.commit_ref);
    const storyPin = this.#db.prepare('SELECT * FROM domain_story_save_pins WHERE anchor_ref=?').get(anchor.anchor_ref);
    if (storyMembership) {
      const storyBranch = this.#db.prepare('SELECT * FROM domain_story_branches WHERE branch_id=?').get(storyMembership.story_branch_id);
      if (!storyPin || !storyBranch || storyPin.story_branch_id !== storyMembership.story_branch_id
        || storyPin.policy_ref !== storyBranch.policy_ref || storyPin.request_fingerprint !== storyBranch.request_fingerprint) fail('INVALID_SAVE_ANCHOR');
    } else if (storyPin) fail('INVALID_SAVE_ANCHOR');
    const manifest = parse(anchor.random_manifest); const versions = parse(anchor.version_refs);
    const guardRules = state.exampleId === 'agent' ? guardRuleReference(state) : undefined;
    if (guardRules === undefined ? Object.hasOwn(versions, 'guardRules')
      : !Object.hasOwn(versions, 'guardRules') || canonical(versions.guardRules) !== canonical(guardRules)) fail('INVALID_SAVE_ANCHOR');
    const magicRules = state.exampleId === 'agent' ? abilityRuleReference(state) : undefined;
    if (magicRules === undefined ? Object.hasOwn(versions, 'magicRules')
      : !Object.hasOwn(versions, 'magicRules') || canonical(versions.magicRules) !== canonical(magicRules)) fail('INVALID_SAVE_ANCHOR');
    const caseItemPolicy = state.exampleId === 'agent' ? caseItemPolicyPin(state) : undefined;
    if (caseItemPolicy === undefined ? Object.hasOwn(versions, 'caseItemPolicy')
      : !Object.hasOwn(versions, 'caseItemPolicy') || canonical(versions.caseItemPolicy) !== canonical(caseItemPolicy)) fail('INVALID_SAVE_ANCHOR');
    const cognition = parse(anchor.cognition_watermarks);
    const setup = parse(this.#db.prepare('SELECT manifest FROM domain_setups WHERE setup_ref=?').get(run.initial_setup_ref).manifest);
    if (canonical(versions.contentPackage ?? null) !== canonical(setup.contentPackage ?? null)
      || canonical(versions.executionRevision ?? null) !== canonical(setup.executionRevision ?? null)) fail('INVALID_SAVE_ANCHOR');
    if (!Array.isArray(manifest.drawIds) || new Set(manifest.drawIds).size !== manifest.drawIds.length
      || cognition.historyHead !== commit.commit_ref || cognition.accessPolicy !== 'technical-history@1') fail('INVALID_SAVE_ANCHOR');
    if (anchor.commit_ref !== commit.commit_ref || anchor.run_id !== run.run_id || anchor.branch_id !== commit.branch_id
      || anchor.snapshot_ref !== commit.snapshot_hash || manifest.seedRef !== run.run_id || manifest.seedFingerprint !== hash(run.root_seed)
      || manifest.lineageRef !== run.random_lineage_ref || manifest.rngVersion !== run.rng_version
      || versions.scenario !== run.scenario_ref || versions.rules !== run.rules_ref || versions.rng !== run.rng_version
      || versions.setup !== run.initial_setup_ref
      || canonical(versions.causalCases ?? null) !== canonical(causalVersionRefs(state).causalCases ?? null)) fail('INVALID_SAVE_ANCHOR');
    const inheritedDraws = this.#db.prepare(`WITH RECURSIVE history(commit_ref,parent_commit_ref) AS (
      SELECT commit_ref,parent_commit_ref FROM domain_commits WHERE commit_ref=?
      UNION ALL SELECT c.commit_ref,c.parent_commit_ref FROM domain_commits c JOIN history h ON c.commit_ref=h.parent_commit_ref
    ) SELECT DISTINCT d.draw_id FROM domain_commit_draws d JOIN history h ON d.commit_ref=h.commit_ref ORDER BY d.draw_id`)
      .all(commit.commit_ref).map(row => row.draw_id);
    if (canonical(inheritedDraws) !== canonical(manifest.drawIds)) fail('INVALID_SAVE_ANCHOR');
    for (const drawId of manifest.drawIds) {
      if (!this.#db.prepare('SELECT draw_id FROM domain_random_draws WHERE draw_id=? AND run_id=?').get(drawId, run.run_id)) fail('INVALID_SAVE_ANCHOR');
    }
    return commit;
  }
  hiddenSupplyJob(state) {
    return state?.agentRuntimeRevision === EVENT_DIRECTOR_RUNTIME_REVISION
      ? hiddenSupplyJobPin(this.#db, this.#at(state), ref => this.#commit(ref), (head, root) => this.#ancestor(head, root))
      : null;
  }
  playerAssemblyNoticeEntry(state, ownerId) {
    if (state?.agentRuntimeRevision !== EVENT_DIRECTOR_RUNTIME_REVISION
      || !state.agentWorld?.broadcasts.some(row => /^broadcast:[a-f0-9]{64}:assembly$/u.test(row.id))) return null;
    return playerAssemblyOccurrence(this.#db, this.#at(state), ownerId, ref => this.#commit(ref),
      (head, source) => this.#ancestor(head, source));
  }
  hiddenSupplyChoice(state, jobId) {
    if (state?.agentRuntimeRevision !== EVENT_DIRECTOR_RUNTIME_REVISION) return null;
    return captureHiddenSupplyChoice(this.#db, this.#at(state), state, jobId, ref => this.#commit(ref),
      (head, source) => this.#ancestor(head, source), snapshot => this.effectiveRunPolicy(snapshot)?.pin);
  }
  hiddenSupplyA2(state) {
    return state?.agentRuntimeRevision === EVENT_DIRECTOR_RUNTIME_REVISION
      ? hiddenSupplyA2Source(this.#db, this.#at(state), state, ref => this.#commit(ref), (head, source) => this.#ancestor(head, source),
        snapshot => this.effectiveRunPolicy(snapshot)?.pin) : null;
  }
  hiddenSupplyOwnerSource(state, actorId) {
    if (!['warden', 'meruru'].includes(actorId)) return null;
    return this.#readHiddenSupply(state)?.ownerSources?.find(row => row.ownerId === actorId) ?? null;
  }
  #readHiddenSupply(state) {
    return state?.agentRuntimeRevision === EVENT_DIRECTOR_RUNTIME_REVISION
      ? readHiddenSupply(this.#db, this.#at(state), ref => this.#commit(ref), (head, source) => this.#ancestor(head, source),
        snapshot => this.effectiveRunPolicy(snapshot)?.pin) : null;
  }
  assertHiddenSupplyHistory(state) { this.#readHiddenSupply(state); }
  // Internal owner-specific world receipt only, not a public view, transcript,
  // model wire or developer inspection. Disclosure needs its own legal source.
  hiddenSupplyOwnerReceipt(state, ownerId) {
    if (!['warden', 'meruru'].includes(ownerId)) return null;
    return this.#readHiddenSupply(state)?.receipts.find(row => row.ownerId === ownerId) ?? null;
  }
  effectiveRunPolicy(state) {
    if (state?.agentRuntimeRevision !== EVENT_DIRECTOR_RUNTIME_REVISION) return null;
    const head = this.#at(state);
    // The ordinary policy reader already proved this exact input in the same
    // synchronous Host operation. The pre-policy root still goes through the
    // independent historical snapshot check; custom proof paths stay fresh.
    const ownOrdinaryRead = this.#db.isTransaction && verifiedDomainBytes.has(this.#db)
      && this.#memoryPolicy === undefined && !Object.hasOwn(state, 'customAbilitySetup');
    return readRunPolicyAuthority(this.#db, state, head, ref => this.#commit(ref),
      snapshot => ownOrdinaryRead && snapshot === state ? this.#initialRunPolicyAt(state, head) : this.initialRunPolicy(snapshot),
      (root, snapshot) => this.#assertCustomPolicyRoot(root, snapshot));
  }
  #assertCustomPolicyRoot(root, snapshot) {
    // Reuse the existing immutable custom-root publication and binding proof.
    // A snapshot/agent-job marker alone cannot admit a custom-ability root.
    const rows = this.#db.prepare("SELECT * FROM custom_ability_root_requests WHERE json_extract(data_json,'$.rootCommitRef')=? LIMIT 2").all(root.commit_ref);
    if (rows.length !== 1) fail('INVALID_DOMAIN_STATE');
    const proof = this.#customData(rows[0]);
    const input = proof.input;
    if (input?.requestId !== rows[0].request_id || input.apiVersion !== 1 || input.confirmed !== true
      || input.creation?.version !== 2 || input.creation.playerMode !== 'custom'
      || proof.rootCommitRef !== root.commit_ref || proof.runId !== root.run_id
      || !isDeepStrictEqual(proof.setup, snapshot.customAbilitySetup)
      || !this.customRootRequest(input)) fail('INVALID_DOMAIN_STATE');
  }
  runPolicyAncestor(state, ref) { return isRunPolicyReceiptAncestor(this.#db, this.assertHead(state), ref); }
  initialRunPolicy(state) {
    if (state.creation?.version !== 2) return undefined;
    return this.#initialRunPolicyAt(state, this.#at(state));
  }
  #initialRunPolicyAt(state, commit) {
    if (state.creation?.version !== 2) return undefined;
    const run = this.#run(commit.run_id);
    const saved = this.#db.prepare('SELECT manifest FROM domain_setups WHERE setup_ref=?').get(run.initial_setup_ref);
    if (!saved) fail('SOURCE_VERSION_MISMATCH');
    const setup = parse(saved.manifest);
    if (setup.runId !== run.run_id || setup.configuration?.creation?.version !== 2
      || !isDeepStrictEqual(setup.executionRevision, runtimeRevisionForState(state).executionRevision)
      || setup.configuration.creation.directorPreferences !== state.creation.directorPreferences
      || !isDeepStrictEqual(setup.configuration.creation.playPolicy, state.creation.playPolicy)) fail('SOURCE_VERSION_MISMATCH');
    try {
      return composeInitialRunPolicy({ creation: setup.configuration.creation, runId: run.run_id,
        setupRef: run.initial_setup_ref, executionRevision: setup.executionRevision });
    } catch { fail('SOURCE_VERSION_MISMATCH'); }
  }
  scope(state) {
    return this.#scopeForCommit(state, this.assertHead(state));
  }
  /** Scope of an already-committed snapshot. Read-only; the caller must prove
   * current-head authority or ancestry separately. */
  scopeAt(state) {
    return this.#scopeForCommit(state, this.#at(state));
  }
  #scopeForCommit(state, commit) {
    const membership = this.#db.prepare('SELECT story_branch_id FROM domain_story_commit_memberships WHERE commit_ref=?').get(commit.commit_ref);
    return Object.freeze({ runId: commit.run_id, branchId: commit.branch_id,
      ...(membership ? { storyBranchId: membership.story_branch_id, storyNamespace: 'domain-story@1' } : {}), commitRef: commit.commit_ref,
      generation: state.generation, revision: state.revision, causalKey: commit.causal_key });
  }
  // Exact current/historical private checkpoint + owner-authorized acquired
  // rule, never a keyword match on model text. Reading source action is replayed
  // by the engine history validator; event+observation bytes must match here.
  ordinaryScriptSources(state, { ownerId = createdPlayerId(state), refs, targetId } = {}) {
    this.#transaction();
    const semantic = hasSemanticOrdinaryRuntime(state);
    if (!hasSoftRuntime(state) || state.caseRuntime?.occupiedBody) return { sources: [], bindings: [], observationsByOwner: {},
      ...(semantic ? { selection: { status: 'unavailable_body', capacity: 16, maxSelected: 3, scanned: 0, eligibleInWindow: 0, oversizeInWindow: 0, mayHaveEarlier: false } } : {}) };
    const commit = this.#at(state);
    const query = owner => ({ $commitRef: commit.commit_ref, $runId: commit.run_id, $actorId: owner, $worldTime: state.worldTime });
    // @16 authenticates ordinary heard statements; fiction is interpreted by the
    // SAME existing intent service, never certified by a free-text prefix here.
    // The bounded window is deterministic at this immutable request base.
    const rows = this.#db.prepare(`${COGNITION_AUTHORIZED_SQL} SELECT o.* FROM visible_observations v JOIN cognition_observations o ON o.id=v.id
      WHERE o.owner_id=$actorId AND o.channel='hearing' ${semantic ? '' : "AND (instr(o.text,'虚构练习短文：')>0 OR instr(o.text,'这是虚构练习：')>0)"}
      ORDER BY o.learned_at DESC,o.id LIMIT ${semantic ? 33 : 4}`).all(query(ownerId));
    if (!semantic && rows.length > 3) return { sources: [], bindings: [], observationsByOwner: {} };
    const candidates = []; let oversizeInWindow = 0;
    for (const row of rows) {
      const event = this.#db.prepare('SELECT * FROM domain_world_events WHERE event_ref=?').get(row.event_ref);
      if (!event || event.run_id !== commit.run_id || event.commit_ref !== row.commit_ref
        || hash(event.payload) !== event.payload_hash || !this.#ancestor(commit.commit_ref, row.commit_ref)) fail('INVALID_DOMAIN_STATE');
      if (event.kind !== 'statement') { if (semantic) continue; fail('INVALID_DOMAIN_STATE'); }
      const body = parse(event.payload);
      if (body.delivery !== 'speech' || body.text !== row.text || !body.audienceIds?.includes(ownerId)) continue;
      if (row.text.length > 512) { oversizeInWindow++; continue; }
      if (/[<>\u0000-\u001f\u007f]/u.test(row.text)) continue;
      if (semantic && (!body.speakerId || body.speakerId === ownerId
        || !actorsForState(state).some(actor => actor.id === body.speakerId))) continue;
      candidates.push({ row, event, ref: `s${candidates.length + 1}` });
    }
    const eligibleCount = candidates.length;
    const selection = { status: eligibleCount ? eligibleCount > 16 ? 'bounded_selection' : eligibleCount > 3 ? 'selection_required' : 'available'
      : oversizeInWindow ? 'source_capacity_exceeded' : 'no_candidate_in_window',
      capacity: 16, maxSelected: 3, scanned: rows.length, eligibleInWindow: eligibleCount, oversizeInWindow, mayHaveEarlier: rows.length === 33 };
    if (semantic) candidates.splice(16); // whole catalog entries; the existing intent service selects at most three
    if (semantic && refs !== undefined && (!Array.isArray(refs) || isProxy(refs) || !refs.length || refs.length > 3
      || new Set(refs).size !== refs.length)) fail('INVALID_AGENT_JOB');
    const empty = status => ({ sources: [], bindings: [], observationsByOwner: {},
      ...(semantic ? { selection: { ...selection, status } } : {}) });
    const selected = refs === undefined ? candidates : refs.map(ref => {
      const source = candidates.find(row => row.ref === ref); if (!source) fail('INVALID_AGENT_JOB'); return source;
    });
    const owners = [...new Set([ownerId, ...(targetId ? [targetId] : [])])];
    const observationsByOwner = Object.fromEntries(owners.map(owner => [owner, []]));
    const bindings = [], scriptSpeakers = [], sourceHandles = [];
    for (const source of selected) {
      const speakerId = parse(source.event.payload).speakerId;
      if (!speakerId || owners.includes(speakerId) || !actorsForState(state).some(actor => actor.id === speakerId)) return empty('source_speaker_is_participant');
      let declared = scriptSpeakers.find(row => row.actorId === speakerId);
      if (!declared) { declared = { handle: `r${scriptSpeakers.length + 1}`, actorId: speakerId }; scriptSpeakers.push(declared); }
      sourceHandles.push({ ref: source.ref, handle: declared.handle });
      const certificates = [];
      for (const owner of owners) {
        const observation = this.#db.prepare(`${COGNITION_AUTHORIZED_SQL} SELECT o.* FROM visible_observations v JOIN cognition_observations o ON o.id=v.id
          WHERE o.owner_id=$actorId AND o.channel='hearing' AND o.event_ref=?`).get(query(owner), source.row.event_ref);
        if (!observation || observation.text !== source.row.text) return empty('target_did_not_hear_source');
        certificates.push({ kind: 'committed-observation', runId: commit.run_id, commitRef: observation.commit_ref,
          eventRef: observation.event_ref, ownerId: owner, observationId: observation.id, textHash: hash(observation.text) });
        observationsByOwner[owner].push({ id: observation.id, text: observation.text, channel: observation.channel,
          occurredAt: observation.occurred_at, learnedAt: observation.learned_at });
      }
      bindings.push({ ref: source.ref, certificates });
    }
    return { sources: selected.map(source => ({ ref: source.ref, text: source.row.text })), bindings, observationsByOwner, scriptSpeakers, sourceHandles,
      ...(semantic ? { selection } : {}) };
  }
  assertOrdinaryAttemptPublication(before, action, after) {
    this.#transaction();
    const suffix = action?.softResult;
    const fresh = after ? [...after.entries.slice(before.entries.length),
      ...(after.agentAutonomy?.events || []).slice(before.agentAutonomy?.events?.length || 0)].filter(entry => entry.ordinaryAttemptEvent) : [];
    if (!suffix) { if (fresh.length) fail('INVALID_DOMAIN_STATE'); return null; }
    if (!hasSoftRuntime(before) || action.softResultVersion !== 1 || before.caseRuntime?.occupiedBody || action.intent?.type !== 'conversation') fail('INVALID_DOMAIN_STATE');
    const base = this.#at(before), row = this.#db.prepare('SELECT * FROM agent_turn_jobs WHERE job_id=?').get(action.jobId);
    if (!row || row.branch_id !== base.branch_id || row.generation !== before.generation || row.base_revision !== before.revision
      || !['running', 'committed'].includes(row.status) || hash(row.context_json) !== row.context_hash) fail('INVALID_DOMAIN_STATE');
    const plan = parse(row.context_json);
    const task = this.#db.prepare('SELECT * FROM agent_turn_tasks WHERE job_id=? AND slot=?').get(row.job_id, SOFT_SLOT);
    const stages = this.#db.prepare('SELECT * FROM agent_turn_stages WHERE job_id=? ORDER BY stage').all(row.job_id);
    const last = stages.at(-1);
    if (plan.version !== 7 || !task || task.actor_id !== 'host:world_adjudicator' || task.role !== 'world_adjudicator'
      || hash(task.input_json) !== task.input_hash || !task.result_json || hash(task.result_json) !== task.result_hash
      || suffix.taskInputHash !== task.input_hash || suffix.taskResultHash !== task.result_hash || !last
      || hash(last.receipt_json) !== last.receipt_hash || stages.length !== action.beats.length + 1) fail('INVALID_DOMAIN_STATE');
    const revisionId = runtimeRevisionForState(before).id;
    const expected = applyCooperativeRephraseResult(suffix, revisionId);
    const input = parse(task.input_json), result = parse(task.result_json);
    const fullCandidate = { type: 'ordinary_attempt_result', version: 1, attemptRef: 'a1',
      outcome: suffix.candidate.outcome, criteria: suffix.candidate.criteria, usedSourceRefs: suffix.candidate.usedSourceRefs };
    const captured = captureCooperativeRephrase(Object.fromEntries(Object.entries(input.manifest).filter(([key]) => key !== 'version')), revisionId);
    if (!isDeepStrictEqual(suffix.manifest, captured.manifest) || !isDeepStrictEqual(fullCandidate, result)
      || !isDeepStrictEqual(input.context.data.attempt, captured.attempt) || !isDeepStrictEqual(input.context.data.sources, captured.sources) || !isDeepStrictEqual(input.context.data.scriptSpeakers, captured.scriptSpeakers)
      || captured.manifest.jobId !== action.jobId || captured.manifest.runId !== base.run_id
      || captured.manifest.branchId !== base.branch_id || captured.manifest.prefix.baseCommitRef !== base.commit_ref
      || captured.manifest.prefix.receiptHash !== last.receipt_hash || captured.manifest.prefix.stage !== last.stage
      || captured.manifest.prefix.stateHash !== parse(last.receipt_json).stateHash) fail('INVALID_DOMAIN_STATE');
    // All ordinary sources are actual owner-authorized ancestor observations.
    // No certificate supplied by a model or another branch can authorize one.
    for (const binding of captured.manifest.bindings) for (const cert of binding.certificates) {
      if (cert.kind === 'committed-observation') {
        const source = this.#db.prepare(`${COGNITION_AUTHORIZED_SQL} SELECT o.* FROM visible_observations v JOIN cognition_observations o ON o.id=v.id
          WHERE o.owner_id=$actorId AND o.id=?`).get({ $commitRef: base.commit_ref, $runId: base.run_id,
            $actorId: cert.ownerId, $worldTime: before.worldTime }, cert.observationId);
        const event = this.#db.prepare('SELECT * FROM domain_world_events WHERE event_ref=?').get(cert.eventRef);
        if (!source || source.run_id !== cert.runId || source.commit_ref !== cert.commitRef || source.event_ref !== cert.eventRef
          || source.channel !== 'hearing' || hash(source.text) !== cert.textHash || !event || hash(event.payload) !== event.payload_hash
          || event.kind !== 'statement' || parse(event.payload).delivery !== 'speech' || parse(event.payload).text !== source.text) fail('INVALID_DOMAIN_STATE');
        const script = captured.sources.find(row => row.ref === binding.ref);
        const declared = captured.manifest.scriptSpeakers.find(row => row.handle === script.performerHandle);
        if (script.kind !== 'script' || !declared || parse(event.payload).speakerId !== declared.actorId
          || captured.manifest.participants.includes(declared.actorId)) fail('INVALID_DOMAIN_STATE');
      } else if (['sealed-packet-delivery', 'sealed-expression'].includes(cert.kind)) {
        const original = this.#db.prepare('SELECT * FROM agent_turn_tasks WHERE job_id=? AND slot=?').get(row.job_id, cert.slot);
        if (!original || hash(original.input_json) !== original.input_hash || original.input_hash !== cert.inputHash
          || original.actor_id !== cert.ownerId) fail('INVALID_DOMAIN_STATE');
        const sealed = parse(original.input_json);
        if (cert.kind === 'sealed-packet-delivery') {
          const packet = buildRoleplayContext(sealed.context, { maxBytes: sealed.maxBytes });
          const delivered = packet.observations.find(source => source.id === cert.sourceObservationId);
          if (hash(JSON.stringify(packet)) !== cert.packetHash || !delivered || delivered.channel !== 'hearing'
            || hash(delivered.text) !== cert.textHash) fail('INVALID_DOMAIN_STATE');
        } else {
          if (!original.result_json || hash(original.result_json) !== original.result_hash || original.result_hash !== cert.resultHash) fail('INVALID_DOMAIN_STATE');
          const proposal = parse(original.result_json);
          const source = captured.sources.find(source => source.ref === binding.ref);
          if (source.kind === 'participation') {
            if (hash(JSON.stringify(proposal.ordinaryParticipation)) !== cert.textHash || proposal.ordinaryParticipation?.choice !== 'contribute'
              || proposal.ordinaryParticipation.attemptRef !== 'a1'
              || proposal.ordinaryParticipation.invitationSourceRef !== sealed.context.ordinaryInvitation?.invitationSourceRef) fail('INVALID_DOMAIN_STATE');
          } else if (proposal.utterance !== source.text || hash(proposal.utterance) !== cert.textHash) fail('INVALID_DOMAIN_STATE');
          if (original.role === 'roleplay' && proposal.decision?.operation.type !== 'speak') fail('INVALID_DOMAIN_STATE');
        }
      }
    }
    if (after) {
      const replayState = structuredClone(before);
      if (plan.npcMagicCastVersion === 1) {
        const repository = new MagicRepository(this.#db);
        if (!replayState.magic && !attachNpcMagicProjection(replayState, plan, this, repository)) {
          let projection = this.#magicBaselineWrite?.projection;
          if (!projection && row.status === 'committed' && row.turn_id) {
            const published = this.#db.prepare(`SELECT a.* FROM domain_turn_aliases t
              JOIN domain_actions a ON a.action_ref=t.action_ref WHERE t.turn_ref=?`).get(row.turn_id);
            if (!published || published.schema_version !== 1 || published.run_id !== base.run_id || published.branch_id !== base.branch_id) fail('INVALID_DOMAIN_STATE');
            const child = this.#commit(published.commit_ref), snapshot = parse(child.snapshot_json);
            if (child.parent_commit_ref !== base.commit_ref || child.run_id !== base.run_id || child.branch_id !== base.branch_id
              || child.generation !== before.generation || child.revision !== before.revision + 1 || child.kind !== 'act'
              || snapshot.turnIds.at(-1) !== row.turn_id || !isDeepStrictEqual(snapshot.agentActions.at(-1), action)
              || this.#at(snapshot).commit_ref !== child.commit_ref) fail('INVALID_DOMAIN_STATE');
            const baseline = this.#db.prepare('SELECT request_id,expected_head FROM host_magic_commits_v2 WHERE branch_id=? AND commit_ref=?')
              .get(child.branch_id, child.commit_ref);
            if (baseline?.request_id === `magic-baseline:${base.commit_ref}` && baseline.expected_head === base.commit_ref)
              projection = repository.readAt({ commitRef: child.commit_ref, runId: child.run_id })?.state;
          }
          if (!projection || projection.branchId !== base.branch_id || projection.headCommitRef !== base.commit_ref
            || projection.generation !== before.generation || projection.time !== before.worldTime
            || projection.host?.revision !== before.revision) fail('INVALID_DOMAIN_STATE');
          // Preserve the exact source baseline, including its initial knowledge clocks.
          validateRosterMagicState(projection); replayState.magic = structuredClone(projection);
        }
      }
      setSceneStageClocks(replayState, stages.map(stage => parse(stage.receipt_json).conversationEventClockVersion === 1 ? 1 : undefined));
      setSceneDomainStore(replayState, this, before);
      let replay;
      try { replay = sceneBeatsDraft(replayState, action); }
      finally { setSceneStageClocks(replayState, null); setSceneDomainStore(replayState, null); }
      const replayRows = [...replay.draft.entries.slice(before.entries.length),
        ...(replay.draft.agentAutonomy?.events || []).slice(before.agentAutonomy?.events?.length || 0)].filter(entry => entry.ordinaryAttemptEvent);
      if (fresh.length !== 1 || !isDeepStrictEqual(fresh, replayRows)
        || !isDeepStrictEqual(fresh[0].ordinaryAttemptEvent, expected.ordinaryAttemptEvent)) fail('INVALID_DOMAIN_STATE');
    }
    return expected;
  }
  ballotInstrumentSource(state, { ownerId, intent, operationRef, historical = false }) {
    this.#transaction();
    const commit = historical ? this.#at(state) : this.assertHead(state);
    if (ownerId !== createdPlayerId(state) || intent?.type !== 'case' || intent.operation !== 'vote'
      || typeof intent.subjectId !== 'string') fail('INVALID_AGENT_JOB');
    const rule = prisonRulebook(state).find(row => row.id === 'trial');
    if (!rule || !rule.paragraphs.includes('审判开始时，参加者依通知前往审判庭，并使用配发手机参与投票。')) fail('SOURCE_VERSION_MISMATCH');
    const content = `阅读记录【${rule.name}】：${rule.text}`;
    const sources = this.#db.prepare(`${COGNITION_AUTHORIZED_SQL} SELECT o.* FROM visible_observations v JOIN cognition_observations o ON o.id=v.id
      WHERE o.owner_id=$actorId AND o.channel='reading' AND o.text=? ORDER BY o.learned_at DESC,o.id LIMIT 2`)
      .all({ $commitRef: commit.commit_ref, $runId: commit.run_id, $actorId: ownerId, $worldTime: state.worldTime }, content);
    const acquired = sources.find(source => {
      const event = this.#db.prepare('SELECT * FROM domain_world_events WHERE event_ref=?').get(source.event_ref);
      if (!event || event.kind !== 'statement' || event.commit_ref !== source.commit_ref || event.run_id !== commit.run_id
        || hash(event.payload) !== event.payload_hash) return false;
      const body = parse(event.payload);
      const origin = parse(this.#db.prepare('SELECT snapshot_json FROM domain_commits WHERE commit_ref=?').get(source.commit_ref)?.snapshot_json || '{}');
      const action = origin.agentActions?.at(-1);
      return body.delivery === 'reading' && body.text === content && body.speakerId === ownerId
        && body.audienceIds?.length === 1 && body.audienceIds[0] === ownerId
        && action?.intent?.type === 'read' && action.intent.subjectId === 'rule:trial';
    });
    // One exact authored self-knowledge source, never infer inventory from a
    // noun in an arbitrary observation/model statement or another actor's card.
    const notebookKnowledge = '我知道自己的有声表达在得到对方认同时可能让对方按我的话行事，因此平常尽量不说话，使用笔与素描本交流。本轮没有魔法执行，不能借说话或写字控制别人。';
    const hasAuthoredNotebook = actorForState(state, ownerId).initialKnowledge.includes(notebookKnowledge);
    const notebook = hasAuthoredNotebook && this.#db.prepare(`${COGNITION_AUTHORIZED_SQL} SELECT o.id FROM visible_observations v JOIN cognition_observations o ON o.id=v.id
      JOIN domain_world_events e ON e.event_ref=o.event_ref WHERE o.owner_id=$actorId AND o.channel='private_recollection'
      AND o.text=? AND e.kind='actor_initial_knowledge' AND e.commit_ref=o.commit_ref LIMIT 1`)
      .get({ $commitRef: commit.commit_ref, $runId: commit.run_id, $actorId: ownerId, $worldTime: state.worldTime }, notebookKnowledge);
    const context = { version: 1, scope: { ownerId, branchId: commit.branch_id, headRef: commit.commit_ref,
      generation: state.generation, revision: state.revision, roomId: agentScene(state).roomId, worldTime: state.worldTime },
      intent: { type: 'case', operation: 'vote', subjectId: intent.subjectId },
      ballot: acquired ? { operationRef, candidateId: intent.subjectId, state: 'resolved', carrier: 'phone', sourceRef: acquired.id } : null,
      focus: 'ballot-instrument', otherMaterials: notebook ? [{ id: 'own-writing-notebook', aliases: ['素描本'], sourceRef: notebook.id }] : [] };
    buildBallotInstrumentContext(context);
    return { context, evidence: acquired ? { observationId: acquired.id, sourceCommitRef: acquired.commit_ref,
      eventRef: acquired.event_ref, sha256: hash(content) } : null };
  }
  assertBallotInstrumentPublication(before, action) {
    const job = this.#db.prepare('SELECT * FROM agent_turn_jobs WHERE job_id=?').get(action.jobId);
    if (!job || hash(job.context_json) !== job.context_hash) fail('INVALID_AGENT_JOB');
    const plan = parse(job.context_json);
    if (plan.ballotInstrumentVersion === undefined) return;
    if (plan.ballotInstrumentVersion !== 1 || plan.regeneration) fail('INVALID_AGENT_JOB');
    const expected = this.ballotInstrumentSource(before, { ownerId: job.actor_id, intent: plan.intentHint, operationRef: job.job_id });
    const tasks = this.#db.prepare("SELECT * FROM agent_turn_tasks WHERE job_id=? AND slot IN ('performance','scene','scene-repair') ORDER BY rowid").all(job.job_id);
    if (!tasks.some(row => row.slot === 'performance') || !tasks.some(row => row.slot === 'scene')) fail('INVALID_AGENT_JOB');
    for (const row of tasks) {
      if (hash(row.input_json) !== row.input_hash || hash(row.result_json || '') !== row.result_hash) fail('INVALID_AGENT_JOB');
      const task = parse(row.input_json), output = parse(row.result_json);
      if (task.context.data.ballotInstrumentVersion !== 1 || canonical(task.context.data.ballotInstrumentSource) !== canonical(expected)) fail('INVALID_AGENT_JOB');
      assertNarrativeBallotInstrument(task.context.data, output, task.role);
    }
  }
  /** Read-only dossier sources. Reuse the existing SQL owner/branch/time and
   * memory-access policy before text leaves SQL; never read another actor's
   * recollections, a raw author draft or a full magic definition as knowledge. */
  witchBookKnowledge(state, ownerId) {
    const scope = this.scope(state);
    // A replayed voice is not the player's own assertion. Native replay used
    // `magicObservation`; custom replay uses the typed `customAbilityEvent`
    // marker. Both must stay out of the owner's biography/statement projection.
    const replayedVoices = new Set((state.entries || []).filter(row => row.delivery === 'speech'
      && (row.magicObservation || row.customAbilityEvent))
      .map(row => row.observationKey));
    const ledgerStatements = Object.entries(state.actorKnowledge?.byActor?.[ownerId] || {})
      .flatMap(([subjectId, row]) => (row.statements || []).map(item => ({ ...item, subjectId })))
      .filter(row => !replayedVoices.has(row.key));
    // Names are not a prerequisite for noticing a present speaker's disclosure.
    // Old ledger versions skipped anonymous statements; their actual delivered
    // entries + owner SQL observation are sufficient, without rewriting history.
    const communications = (state.entries || []).filter(row => ['speech', 'writing'].includes(row.delivery)
      && !row.magicObservation && !row.customAbilityEvent && row.speakerId && row.observationKey && row.audienceIds?.includes(ownerId))
      .map(row => ({ key: row.observationKey, at: row.occurredAt, subjectId: row.speakerId,
        text: row.textByActor?.[ownerId] || row.text }));
    const statements = [...new Map([...ledgerStatements, ...communications]
      .filter(row => row.at <= state.worldTime).map(row => [row.key, row])).values()]
      .sort((a, b) => a.at - b.at).slice(-4096);
    const effects = (state.entries || []).filter(row => row.magicObservation?.version === 1
      && row.delivery === 'action' && row.audienceIds?.includes(ownerId) && row.occurredAt <= state.worldTime
      && typeof row.text === 'string' && row.text.length <= 480).slice(-256);
    const keys = [...statements.map(row => row.key), ...effects.map(row => row.observationKey)].filter(Boolean);
    const ids = [...new Set(keys.map(key => actorObservationId(state, key, ownerId)))];
    const rows = this.#db.prepare(COGNITION_AUTHORIZED_SQL +
      " SELECT o.id,o.text,o.channel,o.occurred_at,o.learned_at,e.kind,e.event_ref FROM visible_observations v JOIN cognition_observations o ON o.id=v.id" +
      " JOIN domain_world_events e ON e.event_ref=o.event_ref WHERE o.owner_id=$actorId AND (o.id IN (SELECT value FROM json_each($ids))" +
      " OR (o.channel='private_recollection' AND e.kind IN ('actor_initial_knowledge','custom_ability_initial_setup'))) ORDER BY CASE WHEN o.channel='private_recollection' THEN 0 ELSE 1 END,o.learned_at DESC,o.id DESC LIMIT 4096")
      .all({ $commitRef: scope.commitRef, $runId: scope.runId, $actorId: ownerId, $worldTime: state.worldTime, $ids: JSON.stringify(ids) });
    // A long save may outgrow this disposable display window; leave all source
    // records intact and never reject the whole player view because of it.
    const byId = new Map(rows.map(row => [row.id, row]));
    const authorizedSourceKeys = new Set();
    const statementsBySubject = {};
    for (const row of statements) {
      const actual = byId.get(actorObservationId(state, row.key, ownerId));
      if (actual && actual.text === row.text && actual.occurred_at === row.at) {
        authorizedSourceKeys.add(row.key);
        (statementsBySubject[row.subjectId] ||= []).push(row);
      }
    }
    const factsBySubject = {};
    for (const entry of effects) {
      const actual = byId.get(actorObservationId(state, entry.observationKey, ownerId));
      if (actual && actual.text === (entry.textByActor?.[ownerId] || entry.text) && actual.occurred_at === entry.occurredAt) {
        (factsBySubject[entry.speakerId] ||= []).push({ field: 'observed_magic', text: actual.text,
          sourceKey: entry.observationKey, acquiredAt: actual.learned_at });
      }
    }
    const ownRecollections = rows.filter(row => row.channel === 'private_recollection' && row.kind === 'actor_initial_knowledge')
      .map(row => ({ key: row.id, at: row.learned_at, text: row.text }));
    if (ownerId === 'player' && state.customAbilitySetup) {
      // Binding validation proves this run selected this immutable definition.
      // The independent authorized initial-cognition observation, NOT the author
      // confirmation or executable grant, is what permits its display here.
      const bindings = this.#customBindingRows(state);
      for (const binding of bindings) {
        if (binding.proof.selection.initialState.recognition !== 'known') continue;
        const event = this.#db.prepare("SELECT event_ref,payload FROM domain_world_events WHERE commit_ref=? AND kind='custom_ability_initial_setup'")
          .all(binding.row.root_commit_ref).find(row => parse(row.payload).bindingId === binding.row.binding_id);
        const cognition = rows.find(row => row.event_ref === event?.event_ref && row.kind === 'custom_ability_initial_setup');
        if (!cognition) continue;
        const fact = customAbilityProfileFact({ selection: binding.proof.selection,
          declaration: binding.data.compiled.declaration, trace: binding.data.compiled.trace, key: cognition.id, at: cognition.learned_at });
        if (fact) (factsBySubject.player ||= []).push(fact);
      }
    }
    return { authorizedSourceKeys, ownRecollections, factsBySubject, statementsBySubject };
  }
  readCognition(state, actorId) {
    const scope = this.scope(state);
    return this.#cognition.read({ commitRef: scope.commitRef, actorId, generation: scope.generation, revision: scope.revision });
  }
  readDecisionState(state, actorId) {
    const scope = this.scope(state);
    return this.#decisions.read({ commitRef: scope.commitRef, actorId, generation: scope.generation, revision: scope.revision });
  }
  // Host-only bounded roster read. Validate the committed world once, not once
  // per character; every subjective snapshot still uses owner-local SQL guards.
  readDecisionStates(state, actorIds) {
    if (!Array.isArray(actorIds) || actorIds.length > 16 || new Set(actorIds).size !== actorIds.length) fail('INVALID_DOMAIN_STATE');
    const scope = this.scope(state);
    return new Map(actorIds.map(actorId => [actorId, this.#decisions.read({ commitRef: scope.commitRef,
      actorId, generation: scope.generation, revision: scope.revision })]));
  }
  readCheckpointDecisionState(head, checkpoint, actorId) {
    // Reuse the ancestry guard, without a text query, before subjective recall.
    this.retrieveCheckpointCognition(head, checkpoint, actorId, { query: '' });
    const source = this.#at(checkpoint);
    return this.#decisions.read({ commitRef: source.commit_ref, actorId, generation: checkpoint.generation, revision: checkpoint.revision });
  }
  withRelationshipDisplayActions(memo, work) {
    return this.#cognition.withRelationshipDisplayActions(memo, work);
  }
  retrieveCognition(state, actorId, options) {
    const scope = this.scope(state);
    const { caseRecallVersion, ...retrievalOptions } = options || {};
    if (caseRecallVersion !== undefined && (caseRecallVersion !== 1 || runtimeCapabilityId(state.agentRuntimeRevision) !== 'agent-prison-runtime@8')) fail('INVALID_DOMAIN_STATE');
    this.assertDurableMemoryAcquisitionHistory(state);
    const retrieval = { ...this.#cognition.retrieve({ ...retrievalOptions, commitRef: scope.commitRef, actorId,
      generation: scope.generation, revision: scope.revision }), ...this.#cognition.durablePending({ commitRef: scope.commitRef, actorId,
      generation: scope.generation, revision: scope.revision }) };
    return caseRecallVersion === 1 ? { ...retrieval, requiredCaseObservations: this.#cognition.readRequiredCaseObservations({
      commitRef: scope.commitRef, actorId, generation: scope.generation, revision: scope.revision, ...ballotCaseScope(state, actorId) }) } : retrieval;
  }
  // A regeneration reads a validated ancestor, never the current future. This
  // host-only read does not move either head or create a speculative branch.
  retrieveCheckpointCognition(head, checkpoint, actorId, options, { journalAnchor = false } = {}) {
    const current = journalAnchor ? this.#at(head) : this.assertHead(head); const source = this.#at(checkpoint);
    const ancestor = this.#db.prepare(`WITH RECURSIVE history(commit_ref,parent_commit_ref) AS (
      SELECT commit_ref,parent_commit_ref FROM domain_commits WHERE commit_ref=?
      UNION ALL SELECT c.commit_ref,c.parent_commit_ref FROM domain_commits c JOIN history h ON c.commit_ref=h.parent_commit_ref
    ) SELECT commit_ref FROM history WHERE commit_ref=?`).get(current.commit_ref, source.commit_ref);
    if (!ancestor || source.run_id !== current.run_id || source.turn_depth >= current.turn_depth) fail('INVALID_DOMAIN_STATE');
    const { caseRecallVersion, ...retrievalOptions } = options || {};
    if (caseRecallVersion !== undefined && (caseRecallVersion !== 1 || runtimeCapabilityId(checkpoint.agentRuntimeRevision) !== 'agent-prison-runtime@8')) fail('INVALID_DOMAIN_STATE');
    this.assertDurableMemoryAcquisitionHistory(checkpoint);
    const retrieval = { ...this.#cognition.retrieve({ ...retrievalOptions, commitRef: source.commit_ref, actorId,
      generation: checkpoint.generation, revision: checkpoint.revision }), ...this.#cognition.durablePending({ commitRef: source.commit_ref, actorId,
      generation: checkpoint.generation, revision: checkpoint.revision }, { ignoreDelivery: true }) };
    return caseRecallVersion === 1 ? { ...retrieval, requiredCaseObservations: this.#cognition.readRequiredCaseObservations({
      commitRef: source.commit_ref, actorId, generation: checkpoint.generation, revision: checkpoint.revision, ...ballotCaseScope(checkpoint, actorId) }) } : retrieval;
  }
  searchCognition(state, actorId, query, options = {}) {
    const scope = this.scope(state);
    return this.#cognition.search({ commitRef: scope.commitRef, actorId, generation: scope.generation, revision: scope.revision,
      query, limit: options.limit ?? 10 });
  }
}

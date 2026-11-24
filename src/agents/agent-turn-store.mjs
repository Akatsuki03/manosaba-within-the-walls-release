import { ADMISSION_RUNTIME_REVISION, ORDINARY_ADMISSION32, hostOrdinaryTailMs, novelCompositionReserveMs, ordinarySoftFits, recoverableOrdinaryServiceFailure } from './ordinary-admission32.mjs';
import { EVENT_DIRECTOR_RUNTIME_REVISION, usesOrdinaryAdmission32, DIRECTOR_EVENT_ATTEMPT_MS } from '../director/director-event-runtime.mjs';
import { PUBLICATION_RUNTIME_REVISION } from '../scenes/ordinary-publication31.mjs';
import { ordinaryCapacityForRevision } from '../content/ordinary-capacity30.mjs';
import { CAPACITY_RUNTIME_REVISION } from '../content/ordinary-capacity30.mjs';
import { KNOWN_TARGET_RUNTIME_REVISION } from '../content/relationship-context-policy.mjs';
import { TRUSTED_COMMUNICATION_RUNTIME_REVISION } from '../content/relationship-context-policy.mjs';
import {SOURCE_ACQUISITION_RUNTIME_REVISION} from '../content/relationship-context-policy.mjs';
import {SCREEN_BROADCAST_RUNTIME_REVISION} from '../content/relationship-context-policy.mjs';
import { SOFT_EXECUTION_BUDGET, SOFT_SLOT, SOFT_PURPOSE, applyCooperativeRephraseResult, captureCooperativeRephrase } from './cooperative-rephrase.mjs';
import { projectActionOutcome } from '../world/action-outcome.mjs';
import { resolvePlayerPlanStep } from '../scenes/causal-scene.mjs';
import { supportsOpenPlayerAction } from './open-player-action.mjs';
import { projectIntentAdmissionPlan } from './intent-admission-contract.mjs';
import { authoredMagicContext } from './authored-magic-intent.mjs';
import { INTENT_RUNTIME_REVISION, CASE_BOUNDARY_RUNTIME_REVISION, SOFT_RUNTIME_REVISION, EXPLICIT_INTENT_RUNTIME_REVISION, ORDINARY_PLAN_RUNTIME_REVISION, SEMANTIC_ORDINARY_RUNTIME_REVISION, SEMANTIC_ADMISSION_RUNTIME_REVISION, INTENT_OBJECT_RUNTIME_REVISION, EXPLICIT_STANDARD_RUNTIME_REVISION, PLAN_CARDINALITY_RUNTIME_REVISION, UNIQUE_RECIPIENT_RUNTIME_REVISION, ATOMIC_SOURCE_RUNTIME_REVISION, LOSSLESS_PLAN_RUNTIME_REVISION, ATOMIC_PLAN_RUNTIME_REVISION, SOFT_REFERENCE_RUNTIME_REVISION, hasSoftRuntime, hasIntentRuntime, hasIntentAdmissionRuntime } from '../content/relationship-context-policy.mjs';
import { createHash, randomUUID } from 'node:crypto';
import { dialogueContextPin, validateSystemSeal } from '../cognition/dialogue-context-policy.mjs';
import { runtimeCapabilityId, RP_FOUNDATION_RUNTIME_REVISION } from '../content/runtime-capabilities.mjs';
import { composeInitialRunPolicy, assertInitialRunPolicy, requiresInitialBoundaryReview, validateInitialBoundaryAssessments, initialPublicBoundaryConflict } from '../content/initial-run-policy.mjs';
import { matchesLegacySoft32SystemSeal, modelSystemPolicySeal } from './model-gateway.mjs';
import { buildNarrativeContext } from './narrative-boundaries.mjs';
import { buildServiceTaskContext, validateServiceTaskOutput, WORLD_SERVICE_PRINCIPAL, INITIAL_BOUNDARY_REVIEW_SLOT, initialBoundaryReviewProposal } from './service-task-contract.mjs';
import { ballotInstrumentTaskPin, customAbilityTaskPin, SCENE_EXTENSION_FIELDS, sceneExtensionPin, validateSceneExtensions } from '../scenes/scene-event-policy.mjs';
import { captureEffectiveDirectorEventPin, isDirectorEventWire, isDirectorExtension, isDirectorEventExtension, isSealedDirectorExtension, isPrivateDirectorExtension, isPrivateDirectorPacket, validateDirectorOutput, DIRECTOR_LIFECYCLE_EXTENSION, DIRECTOR_PLANNING_EXTENSION, DIRECTOR_PRINCIPAL } from '../director/director-effective-private-contract.mjs';
import { directorEventMayReviewIntent } from '../director/director-event-source.mjs';
import { hasPrivateSupplyObservation } from '../cognition/private-supply-observation.mjs';
import { hiddenSupplyIntent, isHiddenSupplyMode } from '../world/hidden-supply.mjs';
import { DirectorPlanningStore, validateDirectorPlanningPin } from '../director/director-policy.mjs';
import { isDeepStrictEqual } from 'node:util';
import { DomainStore } from '../world/domain-store.mjs';
import { adjudicationPolicy, effectiveAdjudicationData } from '../content/effective-run-boundary.mjs';
import { isProxy } from 'node:util/types';
import { playerPerceivedScene, resolvePerceivedIntent } from '../characters/actor-perception.mjs';
import { runtimeApplyItemPolicy, enableCaseRuntime } from '../case-runtime.mjs';
import { runtimeRevisionForState, relationshipPacketPolicy } from '../content/content-revisions.mjs';
import { RELATIONSHIP_RUNTIME_REVISION, RELATIONSHIP_CONTEXT_BUDGETS, isRelationshipRuntime, relationshipContextPin } from '../content/relationship-context-policy.mjs';
import { relationshipRootForRows } from '../creation/player-setup.mjs';
import { guardRuleReference, isGuardRuleReference } from '../world/guard-rules.mjs';
import { TRACE_EVENTS, traceUsage, traceRejection, traceRequestRef, traceReview, projectTaskTrace, traceFailure, failureClockError } from './turn-trace.mjs';
import { MagicRepository } from '../world/magic/ability-runtime.mjs';
import { hostSceneDocument } from '../scenes/scene-document.mjs';
import { hostCaseChoicePlan } from '../cases/case-procedure.mjs';
import { withRunBoundary } from '../content/effective-run-boundary.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
const fail = (code = 'INVALID_AGENT_JOB', clock) => { const error = Object.assign(new Error(code === 'STALE_AGENT_TURN'
  ? '这次角色任务已过期或仍由另一执行者处理，未采纳迟到结果。' : '角色任务记录或恢复依据校验失败。'), { code }); throw clock ? failureClockError(error, clock) : error; };
const resultField = role => role === 'roleplay' ? 'roleplay' : role === 'character_data' ? 'character_data' : fail();
const decode = (json, digest) => {
  if (typeof json !== 'string' || hash(json) !== digest) fail();
  try { return JSON.parse(json); } catch { fail(); }
};
const digest = value => typeof value === 'string' && /^[a-f0-9]{64}$/u.test(value);
const plain = value => value !== null && typeof value === 'object' && !isProxy(value)
  && [Object.prototype, null].includes(Object.getPrototypeOf(value));
const exact = (value, keys) => plain(value) && Reflect.ownKeys(value).length === keys.length
  && keys.every(key => {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    return descriptor?.enumerable && Object.hasOwn(descriptor, 'value');
  });
const identifier = value => typeof value === 'string' && value.length > 0 && value.length <= 256
  && !/[\u0000-\u001f\u007f]/u.test(value);
const STAGE_FIELDS = ['stage', 'kind', 'baseCommitRef', 'executionRevision', 'contentFingerprint',
  'previousHash', 'inputHash', 'stateHash', 'events', 'sources', 'journal', 'stopReason'];
// Legacy stage receipts keep their original exact shape. Only a fresh host
// receipt may carry the optional clock marker, and only with its one value.
const stageFields = receipt => Reflect.ownKeys(receipt).length === STAGE_FIELDS.length
  ? STAGE_FIELDS : [...STAGE_FIELDS, 'conversationEventClockVersion'];
const STAGE_BYTES = 2 * 1024 * 1024;

// These private receipts may contain enacted source bodies, unlike telemetry.
// Accept only bounded JSON data: no getters, proxies, toJSON hooks or lossy JSON
// coercions can change the bytes between validation, hashing and persistence.
function stageJson(receipt) {
  let nodes = 0; let bytes = 0; const active = new Set();
  const visit = (value, depth = 0) => {
    if (++nodes > 50000 || depth > 32) fail();
    if (value === null || typeof value === 'boolean') return;
    if (typeof value === 'number') { if (!Number.isFinite(value)) fail(); return; }
    if (typeof value === 'string') {
      bytes += Buffer.byteLength(value, 'utf8');
      if (value.length > 128 * 1024 || bytes > STAGE_BYTES) fail();
      return;
    }
    if (typeof value !== 'object' || isProxy(value) || active.has(value)) fail();
    const array = Array.isArray(value);
    if (array ? Object.getPrototypeOf(value) !== Array.prototype : !plain(value)) fail();
    const keys = Reflect.ownKeys(value);
    if (array ? value.length > 4096 || keys.length !== value.length + 1 : keys.length > 512) fail();
    active.add(value);
    for (const key of keys) {
      if (array && key === 'length') continue;
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (typeof key !== 'string' || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')
        || (array && (!/^(?:0|[1-9][0-9]*)$/u.test(key) || Number(key) >= value.length))) fail();
      bytes += Buffer.byteLength(key, 'utf8');
      if (bytes > STAGE_BYTES) fail();
      visit(descriptor.value, depth + 1);
    }
    active.delete(value);
  };
  visit(receipt);
  const fields = stageFields(receipt);
  if (!exact(receipt, fields) || fields.length > STAGE_FIELDS.length && receipt.conversationEventClockVersion !== 1
    || !Number.isInteger(receipt.stage) || receipt.stage < 0 || receipt.stage > 3
    || receipt.kind !== (receipt.stage === 0 ? 'root' : 'beat') || !identifier(receipt.baseCommitRef)
    || !plain(receipt.executionRevision) || !digest(receipt.contentFingerprint)
    || (receipt.stage === 0 ? receipt.previousHash !== null : !digest(receipt.previousHash))
    || !digest(receipt.inputHash) || !digest(receipt.stateHash)
    || !['events', 'sources', 'journal'].every(key => Array.isArray(receipt[key]))
    || (receipt.stopReason !== null && !identifier(receipt.stopReason))) fail();
  const json = JSON.stringify(receipt);
  if (Buffer.byteLength(json, 'utf8') > STAGE_BYTES) fail();
  return json;
}

export function agentCheckpointCapacity(receipt) {
  const json = stageJson(receipt);
  return Object.freeze({ bytes: Buffer.byteLength(json, 'utf8'), limit: STAGE_BYTES, sha256: hash(json), stage: receipt.stage });
}
function assertTaskSceneExtensions(task, plan, row, authoredMagic) {
  const magicOwnerSlot = task.role === 'player_performance' || task.role === 'world_adjudicator' && task.id === 'intent';
  if (Object.hasOwn(task.context || {}, 'authoredMagic')
    || !isDeepStrictEqual(task.context?.data?.authoredMagic, magicOwnerSlot ? authoredMagic : undefined)) fail();
  const visual = [2, 3].includes(plan.visualPerformanceGuidanceVersion) && task.role === 'player_performance'
    && ['look', 'inspect', 'examine'].includes(task.context?.data?.intent?.type);
  if (task.context?.data?.visualPerformanceSystemVersion !== (visual ? 2 : undefined)) fail();
  const conversation = plan.visualPerformanceGuidanceVersion === 3 && task.role === 'player_performance'
    && task.context?.data?.intent?.type === 'conversation';
  if (task.context?.data?.conversationPerformanceSystemVersion !== (conversation ? 1 : undefined)) fail();
  const actPreflight = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14].includes(plan.npcActPreflightVersion) && task.role === 'roleplay' && task.id.startsWith('npc:')
    && task.sceneFrame && task.context?.decisionPolicy?.mode === 'act';
  if (task.context?.npcActPreflightVersion !== (actPreflight ? plan.npcActPreflightVersion : undefined)) fail();
  const relationship = isRelationshipRuntime(plan) && task.role !== 'director';
  if (relationshipContextPin(task.context || {}).relationshipContextVersion !== (relationship ? 1 : undefined)) fail();
  if (relationship) {
    const policy = ['roleplay', 'character_data'].includes(task.role) ? task.context.initialRunPolicy : task.context.data?.initialRunPolicy;
    if (!isDeepStrictEqual(relationshipPacketPolicy(task.context, policy).executionRevision, plan.executionRevision)
      || plan.initialRunPolicy?.version !== 2) fail();
    assertInitialRunPolicy(policy, plan.initialRunPolicy);
    const maximum = task.role === 'player_performance' ? RELATIONSHIP_CONTEXT_BUDGETS.player_performance
      : task.role === 'roleplay' ? RELATIONSHIP_CONTEXT_BUDGETS.roleplay : RELATIONSHIP_CONTEXT_BUDGETS.narrative;
    if (task.maxBytes !== (task.id === SOFT_SLOT ? 49152 : maximum)) fail();
  }
  const policyRelevant = ['intent_parser', 'player_performance', 'narrator', 'scene_composer', 'world_adjudicator'].includes(task.role);
  assertInitialRunPolicy(task.context?.data?.initialRunPolicy, policyRelevant ? plan.initialRunPolicy : undefined);
  const runBoundary = task.role === 'world_adjudicator' && ['intent', INITIAL_BOUNDARY_REVIEW_SLOT].includes(task.id) ? effectiveAdjudicationData(plan).runBoundary : undefined;
  if (!isDeepStrictEqual(task.context?.data?.runBoundary, runBoundary)) fail();
  if (task.role === 'world_adjudicator') {
   if (![RP_FOUNDATION_RUNTIME_REVISION, RELATIONSHIP_RUNTIME_REVISION, INTENT_RUNTIME_REVISION, CASE_BOUNDARY_RUNTIME_REVISION, SOFT_RUNTIME_REVISION, EXPLICIT_INTENT_RUNTIME_REVISION, ORDINARY_PLAN_RUNTIME_REVISION, SEMANTIC_ORDINARY_RUNTIME_REVISION, SEMANTIC_ADMISSION_RUNTIME_REVISION, INTENT_OBJECT_RUNTIME_REVISION, EXPLICIT_STANDARD_RUNTIME_REVISION, PLAN_CARDINALITY_RUNTIME_REVISION, UNIQUE_RECIPIENT_RUNTIME_REVISION, ATOMIC_SOURCE_RUNTIME_REVISION, LOSSLESS_PLAN_RUNTIME_REVISION, ATOMIC_PLAN_RUNTIME_REVISION, SOFT_REFERENCE_RUNTIME_REVISION, SCREEN_BROADCAST_RUNTIME_REVISION, SOURCE_ACQUISITION_RUNTIME_REVISION, TRUSTED_COMMUNICATION_RUNTIME_REVISION, KNOWN_TARGET_RUNTIME_REVISION, CAPACITY_RUNTIME_REVISION, PUBLICATION_RUNTIME_REVISION, ADMISSION_RUNTIME_REVISION, EVENT_DIRECTOR_RUNTIME_REVISION].includes(plan.executionRevision?.revisionId) || plan.initialRunPolicy === undefined
      || (!(task.id === INITIAL_BOUNDARY_REVIEW_SLOT && requiresInitialBoundaryReview(adjudicationPolicy(plan)))
        && !(plan.version === 7 && task.id === SOFT_SLOT)
         && (plan.intentHint?.type !== 'interpret' || task.id !== 'intent')) || task.actorId !== WORLD_SERVICE_PRINCIPAL) fail();
    const packet = buildServiceTaskContext(task.context);
    if (!row || packet.data.viewpointActorId !== row.actor_id || (![INITIAL_BOUNDARY_REVIEW_SLOT, SOFT_SLOT].includes(task.id) && packet.data.rawInput !== row.text)
      || !isDeepStrictEqual(packet.scope, { principalId: WORLD_SERVICE_PRINCIPAL, branchId: row.branch_id,
        generation: row.generation, revision: row.base_revision })) fail();
  } else if (plan.initialRunPolicy !== undefined && task.id === 'intent') fail();
  if (!isDeepStrictEqual(ballotInstrumentTaskPin(task), ballotInstrumentTaskPin(plan))) fail();
  const ballotRelevant = ['player_performance', 'scene_composer'].includes(task.role);
  if (task.context?.data?.ballotInstrumentVersion !== (ballotRelevant ? plan.ballotInstrumentVersion : undefined)) fail();
  if (plan.ballotInstrumentVersion === 1 && ballotRelevant) {
    try { buildNarrativeContext(task.context); } catch { fail(); }
  }
  const pin = dialogueContextPin(plan);
  if (!isDeepStrictEqual(dialogueContextPin(task), pin)) fail();
  const contextPin = task.role === 'roleplay' ? dialogueContextPin(task.context || {})
    : ['intent_parser', 'world_adjudicator', 'player_performance', 'narrator', 'scene_composer'].includes(task.role) ? dialogueContextPin(task.context?.data || {}) : {};
  if (task.role !== 'director' && !isDeepStrictEqual(contextPin, pin)) fail();
  if ((pin.dialogueContextVersion === 1 || task.context?.data?.ballotInstrumentVersion === 1) && task.role !== 'director') {
    try {
      const sealed = validateSystemSeal(task.context.systemPolicySeal);
      const current = modelSystemPolicySeal(task.context, task.behaviorPrompt || '');
      // A pending task may carry the exact pre-change base seal. Accept only
      // the host-rebuilt legacy seal for that role/contract; gateway still
      // verifies the same exact base. The legacy rebuild is intentionally
      // skipped once the current seal matches.
      if (!isDeepStrictEqual(sealed, current)) {
        const legacy = task.role === 'scene_composer' && task.context?.data?.outputContractVersion === 1
          ? modelSystemPolicySeal(task.context, task.behaviorPrompt || '', 'legacy')
          : task.role === 'roleplay' && task.context?.decisionPolicy?.version === 2
            && task.context.decisionPolicy.mode === 'act'
            ? modelSystemPolicySeal(task.context, task.behaviorPrompt || '', 'legacy-roleplay') : null;
        if (!isDeepStrictEqual(sealed, legacy) && !(task.role === 'world_adjudicator' && task.id === SOFT_SLOT
          && matchesLegacySoft32SystemSeal(task.context, task.behaviorPrompt || '', sealed))) fail();
      }
    } catch { fail(); }
  } else if (task.context && Object.hasOwn(task.context, 'systemPolicySeal')) fail();
  if (!isDeepStrictEqual(sceneExtensionPin(task), sceneExtensionPin(plan))) fail();
  if (Object.hasOwn(task.context?.data || {}, 'playerTextSwapVersion')
    && (task.context.data.playerTextSwapVersion !== 1 || task.context.data.playerTextMagicVersion !== 1)) fail();
  if (task.role === 'roleplay') {
    if (Object.hasOwn(task.context || {}, 'physicalFactsVersion')) fail();
    const npcSlot = typeof task.id === 'string' && task.id.startsWith('npc:');
    if ((task.context?.npcMagicCastVersion === 1) !== (plan.npcMagicCastVersion === 1 && npcSlot)) fail();
    return;
  }
  if (task.role === 'director') return;
  // The authenticated wire4 review has no actor intent/presentation data. Its
  // root, scope, system seal and OUTER scene pins were all checked above.
  if (task.role === 'world_adjudicator' && [INITIAL_BOUNDARY_REVIEW_SLOT, SOFT_SLOT].includes(task.id)) return;
  const data = task.context?.data;
  if (data?.postureActionVersion !== plan.postureActionVersion) fail();
  if (data?.outputContractVersion !== plan.outputContractVersion) fail();
  const composer = task.role === 'scene_composer';
  if (data?.narrationPacingVersion !== (composer && plan.outputContractVersion === 1 ? plan.narrationPacingVersion : undefined)) fail();
  if (data?.sceneEventTimeVersion !== (composer ? plan.sceneEventTimeVersion : undefined)) fail();
  if (data?.ambientContinuityVersion !== (composer || task.role === 'player_performance' ? plan.ambientContinuityVersion : undefined)) fail();
  if (data?.materialProseVersion !== (composer || task.role === 'player_performance' ? plan.materialProseVersion : undefined)) fail();
  if (data?.physicalFactsVersion !== (composer || task.role === 'player_performance' ? plan.physicalFactsVersion : undefined)) fail();
  if (data?.materialProseVersion === 2 || data?.physicalFactsVersion === 2) {
    try { buildNarrativeContext(task.context); } catch { fail(); }
  }
}

function assertSceneTasks(tasks, plan) {
  const slots = new Set(); const owners = new Map(); const beats = new Map(); let npcs = 0;
  if (plan.hostCaseChoiceVersion === 1 && tasks.some(task => task.id === 'intent' || /^performance:[12]$/u.test(task.id) || task.id === SOFT_SLOT)) fail();
  const expanded = ['agent-prison-runtime@3', 'agent-prison-runtime@4', 'agent-prison-runtime@5', 'agent-prison-runtime@6', 'agent-prison-runtime@7', 'agent-prison-runtime@8'].includes(runtimeCapabilityId(plan?.executionRevision?.revisionId));
  const maxDecisions = expanded ? 8 : 6; const maxActors = expanded ? 4 : 3; const maxNonBallot = maxDecisions + 4 + ([1, 2].includes(plan.intentContractVersion) ? 2 : 0) + (plan.directorExtension ? 1 : 0) + (requiresInitialBoundaryReview(adjudicationPolicy(plan)) ? 1 : 0) + (plan.version === 7 ? 1 : 0);
  // Ballots have their historical larger total budget, but cannot be used to
  // smuggle more than the budgeted ordinary tasks into the same job.
  if (tasks.length > 20 || tasks.filter(task => typeof task?.id !== 'string' || !task.id.startsWith('ballot:')).length > maxNonBallot) fail();
  for (const task of tasks) {
    if (!identifier(task.id) || task.id.length > 128 || !identifier(task.actorId)
      || !['roleplay', 'character_data', 'intent_parser', 'world_adjudicator', 'player_performance', 'narrator', 'scene_composer', 'director'].includes(task.role)
      || slots.has(task.id)) fail();
    slots.add(task.id);
    if (task.id === SOFT_SLOT && (plan.version !== 7 || task.role !== 'world_adjudicator'
      || task.actorId !== WORLD_SERVICE_PRINCIPAL || task.context?.purpose !== SOFT_PURPOSE || !task.manifest)) fail();
    if (task.id === INITIAL_BOUNDARY_REVIEW_SLOT && (!requiresInitialBoundaryReview(adjudicationPolicy(plan))
      || task.role !== 'world_adjudicator' || task.actorId !== WORLD_SERVICE_PRINCIPAL)) fail();
    if (task.role === 'director' || task.id === 'director') {
      const privateSupply = isPrivateDirectorExtension(plan.directorExtension);
      if (task.id !== 'director' || task.role !== 'director' || task.actorId !== DIRECTOR_PRINCIPAL
        || !isDirectorExtension(plan.directorExtension)
        || (privateSupply ? !isPrivateDirectorPacket(task.context) || !isDeepStrictEqual(task.context, plan.hiddenSupplyChoice?.packet)
          : !plan.directorBoundary)) fail();
    }
    if (!task.id.startsWith('npc:')) continue;
    const match = /^npc:([1-3]):([a-z0-9_-]+)$/u.exec(task.id);
    if (!match || match[2] !== task.actorId || task.role !== 'roleplay') fail();
    owners.set(task.actorId, (owners.get(task.actorId) || 0) + 1);
    beats.set(match[1], (beats.get(match[1]) || 0) + 1);
    if (++npcs > maxDecisions || owners.size > maxActors || owners.get(task.actorId) > 2 || beats.get(match[1]) > 3) fail();
  }
}

/** Durable inputs/results for one bounded conversation. No credential or provider
 * payload is stored; validated structured proposals are data, not world events.
 * The engine owns the transaction that publishes a reply and closes its job. */
export class AgentTurnStore {
  #db;
  #owner = randomUUID();
  #clock;
  #directorPlanning;
  #planReadEpoch = null;
  constructor(db, { clock = Date.now, directorPlanning = new DirectorPlanningStore(db) } = {}) {
    this.#db = db; this.#clock = clock; this.#directorPlanning = directorPlanning;
  }
  #transaction() { if (!this.#db.isTransaction) fail(); }
  initialize() {
    this.#transaction();
    this.#db.exec(`CREATE TABLE IF NOT EXISTS agent_runtime_schema(id INTEGER PRIMARY KEY CHECK(id=1),version INTEGER NOT NULL);
      INSERT INTO agent_runtime_schema VALUES(1,1) ON CONFLICT DO NOTHING;`);
    if (this.#db.prepare('SELECT version FROM agent_runtime_schema WHERE id=1').get().version !== 1) fail();
    this.#db.exec(`CREATE TABLE IF NOT EXISTS agent_turn_jobs(
      job_id TEXT PRIMARY KEY, request_id TEXT NOT NULL UNIQUE, text TEXT NOT NULL,
      generation INTEGER NOT NULL, base_revision INTEGER NOT NULL, branch_id TEXT NOT NULL,
      actor_id TEXT NOT NULL, context_json TEXT NOT NULL, context_hash TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('pending','running','failed','committed','cancelled')),
      fencing_token INTEGER NOT NULL DEFAULT 0, lease_owner TEXT, lease_expires INTEGER,
      roleplay_json TEXT, roleplay_hash TEXT, character_data_json TEXT, character_data_hash TEXT,
      review_json TEXT, error_code TEXT, turn_id TEXT, receipt_json TEXT
    );
    CREATE INDEX IF NOT EXISTS agent_jobs_generation ON agent_turn_jobs(generation,status);
    CREATE TRIGGER IF NOT EXISTS agent_job_context_immutable BEFORE UPDATE ON agent_turn_jobs
      WHEN NEW.job_id<>OLD.job_id OR NEW.request_id<>OLD.request_id OR NEW.text<>OLD.text
        OR NEW.generation<>OLD.generation OR NEW.base_revision<>OLD.base_revision OR NEW.branch_id<>OLD.branch_id
        OR NEW.actor_id<>OLD.actor_id OR NEW.context_json<>OLD.context_json OR NEW.context_hash<>OLD.context_hash
        OR (OLD.roleplay_json IS NOT NULL AND (NEW.roleplay_json IS NOT OLD.roleplay_json OR NEW.roleplay_hash IS NOT OLD.roleplay_hash))
        OR (OLD.character_data_json IS NOT NULL AND (NEW.character_data_json IS NOT OLD.character_data_json OR NEW.character_data_hash IS NOT OLD.character_data_hash))
        OR (OLD.status='committed' AND (NEW.status<>'committed' OR NEW.receipt_json IS NOT OLD.receipt_json OR NEW.turn_id IS NOT OLD.turn_id OR NEW.review_json IS NOT OLD.review_json))
      BEGIN SELECT RAISE(ABORT,'immutable agent input/result'); END;
    CREATE TRIGGER IF NOT EXISTS agent_job_no_delete BEFORE DELETE ON agent_turn_jobs
      BEGIN SELECT RAISE(ABORT,'immutable agent audit'); END;
    CREATE TRIGGER IF NOT EXISTS agent_job_no_replace BEFORE INSERT ON agent_turn_jobs
      WHEN EXISTS(SELECT 1 FROM agent_turn_jobs WHERE job_id=NEW.job_id OR request_id=NEW.request_id)
      BEGIN SELECT RAISE(ABORT,'immutable agent audit'); END;`);
  }
  initializeNarrative() {
    this.#transaction();
    this.#db.exec(`CREATE TABLE IF NOT EXISTS agent_turn_optional_terminals(
      job_id TEXT NOT NULL, slot TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('failed_optional','skipped_optional')),
      details_json TEXT NOT NULL, details_hash TEXT NOT NULL, PRIMARY KEY(job_id,slot),
      FOREIGN KEY(job_id,slot) REFERENCES agent_turn_tasks(job_id,slot));
      CREATE TRIGGER IF NOT EXISTS agent_optional_no_update BEFORE UPDATE ON agent_turn_optional_terminals
      BEGIN SELECT RAISE(ABORT,'immutable optional terminal'); END;
      CREATE TRIGGER IF NOT EXISTS agent_optional_no_delete BEFORE DELETE ON agent_turn_optional_terminals
      BEGIN SELECT RAISE(ABORT,'immutable optional terminal'); END;
      CREATE TRIGGER IF NOT EXISTS agent_optional_no_replace BEFORE INSERT ON agent_turn_optional_terminals
      WHEN EXISTS(SELECT 1 FROM agent_turn_optional_terminals WHERE job_id=NEW.job_id AND slot=NEW.slot)
      BEGIN SELECT RAISE(ABORT,'immutable optional terminal'); END;
      CREATE TRIGGER IF NOT EXISTS agent_optional_valid BEFORE INSERT ON agent_turn_optional_terminals
      WHEN NOT EXISTS(SELECT 1 FROM agent_turn_tasks WHERE job_id=NEW.job_id AND slot=NEW.slot AND role='director' AND result_json IS NULL)
      BEGIN SELECT RAISE(ABORT,'invalid optional terminal'); END;
      CREATE TABLE IF NOT EXISTS agent_turn_tasks(
      job_id TEXT NOT NULL REFERENCES agent_turn_jobs(job_id), slot TEXT NOT NULL,
      role TEXT NOT NULL, actor_id TEXT NOT NULL, input_json TEXT NOT NULL, input_hash TEXT NOT NULL,
      result_json TEXT, result_hash TEXT, PRIMARY KEY(job_id,slot));
      CREATE TRIGGER IF NOT EXISTS agent_task_immutable BEFORE UPDATE ON agent_turn_tasks
      WHEN NEW.job_id<>OLD.job_id OR NEW.slot<>OLD.slot OR NEW.role<>OLD.role OR NEW.actor_id<>OLD.actor_id
        OR NEW.input_json<>OLD.input_json OR NEW.input_hash<>OLD.input_hash
        OR (OLD.result_json IS NOT NULL AND (NEW.result_json IS NOT OLD.result_json OR NEW.result_hash IS NOT OLD.result_hash))
      BEGIN SELECT RAISE(ABORT,'immutable narrative task'); END;
      CREATE TRIGGER IF NOT EXISTS agent_optional_result_final BEFORE UPDATE ON agent_turn_tasks
      WHEN EXISTS(SELECT 1 FROM agent_turn_optional_terminals WHERE job_id=OLD.job_id AND slot=OLD.slot)
        AND (NEW.result_json IS NOT OLD.result_json OR NEW.result_hash IS NOT OLD.result_hash)
      BEGIN SELECT RAISE(ABORT,'immutable optional outcome'); END;
      CREATE TRIGGER IF NOT EXISTS agent_task_no_delete BEFORE DELETE ON agent_turn_tasks
      BEGIN SELECT RAISE(ABORT,'immutable narrative audit'); END;
      CREATE TRIGGER IF NOT EXISTS agent_task_no_replace BEFORE INSERT ON agent_turn_tasks
      WHEN EXISTS(SELECT 1 FROM agent_turn_tasks WHERE job_id=NEW.job_id AND slot=NEW.slot)
      BEGIN SELECT RAISE(ABORT,'immutable narrative audit'); END;
      CREATE TABLE IF NOT EXISTS agent_turn_trace(
        sequence INTEGER PRIMARY KEY AUTOINCREMENT, job_id TEXT NOT NULL REFERENCES agent_turn_jobs(job_id),
        slot TEXT, kind TEXT NOT NULL, details_json TEXT NOT NULL, details_hash TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS agent_trace_job ON agent_turn_trace(job_id,sequence);
      CREATE TRIGGER IF NOT EXISTS agent_trace_no_update BEFORE UPDATE ON agent_turn_trace
      BEGIN SELECT RAISE(ABORT,'immutable turn trace'); END;
      CREATE TRIGGER IF NOT EXISTS agent_trace_no_delete BEFORE DELETE ON agent_turn_trace
      BEGIN SELECT RAISE(ABORT,'immutable turn trace'); END;
      CREATE TRIGGER IF NOT EXISTS agent_trace_no_replace BEFORE INSERT ON agent_turn_trace
      WHEN EXISTS(SELECT 1 FROM agent_turn_trace WHERE sequence=NEW.sequence)
      BEGIN SELECT RAISE(ABORT,'immutable turn trace'); END;
      CREATE TABLE IF NOT EXISTS agent_turn_stages(
        job_id TEXT NOT NULL REFERENCES agent_turn_jobs(job_id), stage INTEGER NOT NULL CHECK(stage BETWEEN 0 AND 3),
        branch_id TEXT NOT NULL, generation INTEGER NOT NULL, base_revision INTEGER NOT NULL,
        base_commit_ref TEXT NOT NULL, execution_revision_json TEXT NOT NULL, content_fingerprint TEXT NOT NULL,
        previous_hash TEXT, receipt_json TEXT NOT NULL, receipt_hash TEXT NOT NULL,
        PRIMARY KEY(job_id,stage), CHECK((stage=0 AND previous_hash IS NULL) OR (stage>0 AND previous_hash IS NOT NULL)));
      CREATE TRIGGER IF NOT EXISTS agent_stage_no_update BEFORE UPDATE ON agent_turn_stages
      BEGIN SELECT RAISE(ABORT,'immutable scene stage'); END;
      CREATE TRIGGER IF NOT EXISTS agent_stage_no_delete BEFORE DELETE ON agent_turn_stages
      BEGIN SELECT RAISE(ABORT,'immutable scene stage'); END;
      CREATE TRIGGER IF NOT EXISTS agent_stage_no_replace BEFORE INSERT ON agent_turn_stages
      WHEN EXISTS(SELECT 1 FROM agent_turn_stages WHERE job_id=NEW.job_id AND stage=NEW.stage)
      BEGIN SELECT RAISE(ABORT,'immutable scene stage'); END;
      CREATE TRIGGER IF NOT EXISTS agent_stage_append BEFORE INSERT ON agent_turn_stages
      WHEN NOT EXISTS(SELECT 1 FROM agent_turn_jobs WHERE job_id=NEW.job_id AND branch_id=NEW.branch_id
          AND generation=NEW.generation AND base_revision=NEW.base_revision)
        OR NEW.stage<>(SELECT count(*) FROM agent_turn_stages WHERE job_id=NEW.job_id)
        OR NEW.previous_hash IS NOT (SELECT receipt_hash FROM agent_turn_stages WHERE job_id=NEW.job_id AND stage=NEW.stage-1)
        OR EXISTS(SELECT 1 FROM agent_turn_stages WHERE job_id=NEW.job_id AND stage=0
          AND (base_commit_ref<>NEW.base_commit_ref OR execution_revision_json<>NEW.execution_revision_json
            OR content_fingerprint<>NEW.content_fingerprint))
      BEGIN SELECT RAISE(ABORT,'invalid scene stage prefix'); END;`);
  }
  #stageBinding(row, plan = this.input(row)) {
    if (![6, 7].includes(plan.version) || plan.jobId !== row.job_id || !digest(plan.contentFingerprint)
      || !plain(plan.executionRevision)) fail();
    let baseCommitRef = plan.baseCommitRef;
    // The host may pin the base directly in its immutable plan. Existing domain
    // commits additionally bind that pin to the historical checkpoint (which is
    // the source base, not the execution head, for a regeneration job).
    const domain = this.#db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='domain_commits'").get();
    if (domain) {
      const checkpoint = plan.regeneration?.checkpoint;
      const base = checkpoint
        ? this.#db.prepare('SELECT commit_ref FROM domain_commits WHERE generation=? AND revision=?')
          .get(checkpoint.generation, checkpoint.revision)
        : this.#db.prepare('SELECT commit_ref FROM domain_commits WHERE branch_id=? AND generation=? AND revision=?')
          .get(row.branch_id, row.generation, row.base_revision);
      if (!base || (baseCommitRef !== undefined && baseCommitRef !== base.commit_ref)) fail();
      baseCommitRef = base.commit_ref;
    }
    return { baseCommitRef, executionRevision: plan.executionRevision,
      executionRevisionJson: JSON.stringify(plan.executionRevision), contentFingerprint: plan.contentFingerprint };
  }
  #assertStageBinding(receipt, binding) {
    if (receipt.baseCommitRef !== binding.baseCommitRef || receipt.contentFingerprint !== binding.contentFingerprint
      || !isDeepStrictEqual(receipt.executionRevision, binding.executionRevision)) fail();
  }
  /** Private detached receipt prefix. Stage hashes cover the ENTIRE exact JSON
   * receipt, never a telemetry projection or a lease/fencing token. */
  stages(row) { return this.#readStages(this.get(row.job_id)); }
  #readStages(current, binding) {
    const records = this.#db.prepare('SELECT * FROM agent_turn_stages WHERE job_id=? ORDER BY stage').all(current.job_id);
    if (records.length > 4) fail();
    // Every row and receipt remains authenticated. All receipts in this read
    // share the same immutable job and base binding; do not revalidate the
    // entire job/base separately for each member of the prefix.
    let previousHash = null; let root;
    return records.map((record, stage) => {
      const receipt = decode(record.receipt_json, record.receipt_hash);
      const json = stageJson(receipt);
      binding ??= this.#stageBinding(current);
      this.#assertStageBinding(receipt, binding);
      if (record.stage !== stage || receipt.stage !== stage || json !== record.receipt_json
        || record.branch_id !== current.branch_id || record.generation !== current.generation
        || record.base_revision !== current.base_revision || record.base_commit_ref !== receipt.baseCommitRef
        || record.execution_revision_json !== binding.executionRevisionJson
        || record.content_fingerprint !== receipt.contentFingerprint || record.previous_hash !== previousHash
        || receipt.previousHash !== previousHash || (root && receipt.baseCommitRef !== root.baseCommitRef)) fail();
      root ||= receipt; previousHash = record.receipt_hash;
      return { stage, previousHash: record.previous_hash, hash: record.receipt_hash, receipt };
    });
  }
  /** Append one host receipt under a freshly read execution fence. Returning
   * stages() keeps retries and reclaimed leases on the same detached prefix. */
  sealStage(row, receipt, token) {
    this.#transaction();
    const current = this.get(row.job_id); const plan = this.assertLease(current, token);
    const json = stageJson(receipt); const binding = this.#stageBinding(current, plan);
    this.#assertStageBinding(receipt, binding);
    const stages = this.#readStages(current, binding); const existing = stages[receipt.stage];
    if (existing) {
      if (existing.hash !== hash(json) || JSON.stringify(existing.receipt) !== json) fail();
      return stages;
    }
    if (receipt.stage !== stages.length || receipt.previousHash !== (stages.at(-1)?.hash || null)
      || (stages.length && receipt.baseCommitRef !== stages[0].receipt.baseCommitRef)) fail();
    this.#db.prepare(`INSERT INTO agent_turn_stages(job_id,stage,branch_id,generation,base_revision,base_commit_ref,
      execution_revision_json,content_fingerprint,previous_hash,receipt_json,receipt_hash) VALUES(?,?,?,?,?,?,?,?,?,?,?)`)
      .run(current.job_id, receipt.stage, current.branch_id, current.generation, current.base_revision,
        receipt.baseCommitRef, binding.executionRevisionJson, receipt.contentFingerprint, receipt.previousHash, json, hash(json));
    this.renew(current, token);
    return this.#readStages(current, binding);
  }
  trace(row, kind, slot = null, details = {}) {
    this.#transaction();
    if (!TRACE_EVENTS.includes(kind) || (slot !== null && (typeof slot !== 'string' || slot.length > 128))) fail();
    // The append-only table accepts ONLY host enums/counters. Never persist
    // validation exceptions, model outputs, prompts, URLs or arbitrary metadata.
    const safe = kind === 'usage' ? traceUsage(details)
      : ['rejected', 'attempt_failed', 'failed'].includes(kind)
        ? traceFailure(details, { developer: kind !== 'rejected' }) : {};
    // A slot attempt owns its detailed failure. The job's terminal record
    // carries job-level guards and retry denial, not another copy of the DTO
    // comparison or clock that was already emitted by that attempt.
    if (kind === 'failed' && safe.attempt !== undefined) {
      delete safe.shapeDiff; delete safe.failureClock;
      delete safe.modelNotDispatched; delete safe.hostValidationNotRun;
    }
    const json = JSON.stringify(safe);
    this.#db.prepare('INSERT INTO agent_turn_trace(job_id,slot,kind,details_json,details_hash) VALUES(?,?,?,?,?)')
      .run(row.job_id, slot, kind, json, hash(json));
  }
  modelAttemptLedger(row) { return this.#readModelAttemptLedger(row, this.input(row)); }
  #readModelAttemptLedger(row, plan) {
    if (plan.version !== 7) return undefined;
    // One bounded read preserves every attempt, including orphaned slots. An
    // inner join could hide corruption; the extra row detects overflow without
    // decoding it or loading an unbounded trace into JavaScript.
    const rows = this.#db.prepare(`SELECT s.slot,s.details_json,s.details_hash,t.role AS task_role,t.input_hash AS task_input_hash
      FROM agent_turn_trace s LEFT JOIN agent_turn_tasks t ON t.job_id=s.job_id AND t.slot=s.slot
      WHERE s.job_id=? AND s.kind='attempt_started' ORDER BY s.sequence LIMIT ?`)
      .all(row.job_id, SOFT_EXECUTION_BUDGET.maxModelAttempts + 1);
    const count = rows.length;
    if (count > SOFT_EXECUTION_BUDGET.maxModelAttempts) fail();
    let firstStartedAt; let hardDeadline; const slots = new Map();
    const base = this.#db.prepare('SELECT commit_ref FROM domain_commits WHERE branch_id=? AND generation=? AND revision=?')
      .get(row.branch_id, row.generation, row.base_revision);
    for (const [i, entry] of rows.entries()) {
      const d = decode(entry.details_json, entry.details_hash);
      if (!exact(d, ['version', 'ordinal', 'slotOrdinal', 'inputHash', 'leaseHash', 'baseCommitRef', 'firstStartedAt', 'hardDeadline'])
        || d.version !== 1 || d.ordinal !== i + 1 || !digest(d.inputHash) || !digest(d.leaseHash) || d.baseCommitRef !== base?.commit_ref
        || !Number.isSafeInteger(d.firstStartedAt) || d.firstStartedAt < 0 || d.hardDeadline !== d.firstStartedAt + SOFT_EXECUTION_BUDGET.sceneHardDurationMs) fail();
      if (i === 0) { firstStartedAt = d.firstStartedAt; hardDeadline = d.hardDeadline; }
      if (d.firstStartedAt !== firstStartedAt || d.hardDeadline !== hardDeadline) fail();
      const ordinal = (slots.get(entry.slot) || 0) + 1; slots.set(entry.slot, ordinal);
      if (entry.task_role === null || entry.task_input_hash !== d.inputHash || d.slotOrdinal !== ordinal
        || ordinal > (entry.task_role === 'director' ? 1 : 2)) fail();
    }
    return { count, ...(count ? { firstStartedAt, hardDeadline } : {}), slots: Object.fromEntries(slots) };
  }
  ordinaryAdmissionClock(row, ledger = this.modelAttemptLedger(row)) {
    const now = this.#clock();
    return { now, elapsedMs: ledger.count ? now - ledger.firstStartedAt : 0,
      remainingMs: ledger.count ? ledger.hardDeadline - now : SOFT_EXECUTION_BUDGET.sceneHardDurationMs,
      ...(ledger.count ? { jobStartedAt: ledger.firstStartedAt, deadlineAt: ledger.hardDeadline } : {}) };
  }
  assertOrdinaryDeadline(row) {
    const { now, remainingMs, jobStartedAt, deadlineAt } = this.ordinaryAdmissionClock(row);
    if (remainingMs <= 0) fail('AGENT_TIMEOUT', { check: 'host-job-deadline', checkedAt: now, jobStartedAt, deadlineAt, remainingMs, requiredMs: 0 });
  }
  #provedSoftDispatchFailure(row) {
    const last = this.#db.prepare("SELECT kind,details_json,details_hash FROM agent_turn_trace WHERE job_id=? AND slot=? AND kind IN ('attempt_started','attempt_failed') ORDER BY sequence DESC LIMIT 1")
      .get(row.job_id, SOFT_SLOT);
    return last?.kind === 'attempt_failed' && recoverableOrdinaryServiceFailure(decode(last.details_json, last.details_hash));
  }
  #assertDirectorEventTask(task, plan, row) {
    const v4 = task.role === 'director' && isSealedDirectorExtension(plan.directorExtension);
    if (!v4) {
      if (Object.hasOwn(task, 'directorSystemSeal') || task.role === 'director' && isDirectorEventWire(task.context?.data?.version)) fail();
      return;
    }
    const intent = this.#db.prepare("SELECT result_json,result_hash FROM agent_turn_tasks WHERE job_id=? AND slot='intent'").get(row.job_id);
    const packet = plan.directorEventPin?.packet ?? plan.hiddenSupplyChoice?.packet;
    const checkIntent = isPrivateDirectorPacket(packet)
      ? value => hiddenSupplyIntent(value, plan.hiddenSupplyCapability?.lifecycle) : directorEventMayReviewIntent;
    if (!packet || !intent || intent.result_json === null || !checkIntent(decode(intent.result_json, intent.result_hash))
      || !isDeepStrictEqual(task.context, packet) || task.maxBytes !== 16000 || task.behaviorPrompt !== ''
      || !isDeepStrictEqual(task.directorSystemSeal, modelSystemPolicySeal(task.context))) fail();
    if (task.result !== undefined) validateDirectorOutput(task.context, task.result, packet.scope);
  }
  #ordinaryReviewPending(plan, tasks) {
    return requiresInitialBoundaryReview(adjudicationPolicy(plan))
      && !tasks.some(task => task.id === INITIAL_BOUNDARY_REVIEW_SLOT && task.result);
  }
  canRetryOrdinaryAdjudication(row, delayMs, onDenied) {
    const plan = this.input(row);
    if (!usesOrdinaryAdmission32(plan.executionRevision?.revisionId)) return false;
    const ledger = this.modelAttemptLedger(row);
    if (ledger.slots[SOFT_SLOT] !== 1 || ledger.count >= SOFT_EXECUTION_BUDGET.maxModelAttempts || !this.#provedSoftDispatchFailure(row)) return false;
    const tasks = this.tasks(row), task = tasks.find(task => task.id === SOFT_SLOT);
    if (!task || task.result || task.terminal) return false;
    const clock = this.ordinaryAdmissionClock(row, ledger), needsReview = this.#ordinaryReviewPending(plan, tasks);
    const compositionReserveMs = novelCompositionReserveMs(plan);
    const fits = ordinarySoftFits(clock.remainingMs - delayMs, needsReview, compositionReserveMs);
    if (!fits && typeof onDenied === 'function') onDenied({ check: 'soft-retry-reserve', checkedAt: clock.now, jobStartedAt: clock.jobStartedAt,
      deadlineAt: clock.deadlineAt, remainingMs: clock.remainingMs,
      requiredMs: ORDINARY_ADMISSION32.softCallMs + hostOrdinaryTailMs(needsReview) + compositionReserveMs + delayMs, retryDelayMs: delayMs });
    return fits;
  }
  #isLatePrivateHostTail(plan, task, tasks) {
    if (plan.privateDirectorTailVersion !== 1 || !isPrivateDirectorPacket(task.context)
      || task.context.data.version !== 7 || plan.hiddenSupplyCapability?.lifecycle !== 1) return false;
    const scene = tasks.find(row => row.id === 'scene');
    // v7 is only offered after lawful positive staged replay. At this narrow
    // Host-presentation endpoint an unsaved scene is rendered locally, not
    // another provider call. Keep the old reserve if that shape is unproved.
    return scene?.role === 'scene_composer' && !scene.result && !scene.terminal
      && scene.outputContractVersion === 1 && scene.context?.data?.outputContractVersion === 1 && Boolean(scene.scheduling)
      && hiddenSupplyIntent(tasks.find(row => row.id === 'intent')?.result, 1)
      && tasks.some(row => row.id === 'performance' && row.result)
      && tasks.every(row => row.id === 'director' || row.id === 'scene' || row.id === INITIAL_BOUNDARY_REVIEW_SLOT || Boolean(row.result));
  }
  #npcResumeFeedback(row, task, inputHash, version) {
    if (task.role !== 'roleplay' || !task.id.startsWith('npc:') || !task.sceneFrame) return undefined;
    // The same pending slot failed on the immediately preceding lease. Use
    // only the hashed host diagnostics, never a candidate or provider string.
    const [rejected, started] = this.#db.prepare(`SELECT sequence,kind,details_json,details_hash FROM agent_turn_trace
      WHERE job_id=? AND slot=? AND kind IN ('attempt_started','attempt_failed') ORDER BY sequence DESC LIMIT 2`).all(row.job_id, task.id);
    if (rejected?.kind !== 'attempt_failed' || started?.kind !== 'attempt_started') return undefined;
    const dispatch = decode(started.details_json, started.details_hash);
    if (dispatch.slotOrdinal !== 1 || dispatch.inputHash !== inputHash
      || dispatch.leaseHash !== hash(String(row.fencing_token - 1))) return undefined;
    const terminal = this.#db.prepare(`SELECT sequence,details_json,details_hash FROM agent_turn_trace
      WHERE job_id=? AND kind='failed' ORDER BY sequence DESC LIMIT 1`).get(row.job_id);
    if (!terminal || terminal.sequence <= rejected.sequence) return undefined;
    const reason = decode(rejected.details_json, rejected.details_hash);
    const final = decode(terminal.details_json, terminal.details_hash);
    if (!['stage', 'phase', 'code', 'taskRole', 'rule', 'issue'].every(key => final[key] === reason[key])
      || reason.taskRole !== 'roleplay' || reason.stage !== 'validation' || reason.modelNotDispatched
      || !(reason.phase === 'proposal' && reason.code === 'ERR_MODEL_RESPONSE'
        || reason.phase === 'host_validation' && ['ERR_AGENT_DECISION', 'INVALID_AGENT_OUTPUT'].includes(reason.code))) return undefined;
    if (reason.rule === 'roleplay-structure') return 'npc-manual-structure@1';
    if (reason.rule === 'roleplay-utterance-mixed' && reason.issue === 'utterance_mixed_content')
      return version === 3 && task.context?.dialogueContextVersion === 1 && task.context?.decisionPolicy?.mode === 'act'
        ? 'npc-manual-mixed@2' : 'npc-manual-mixed@1';
    if (version >= 2 && reason.rule === 'roleplay-communication-request-sender'
      && task.context?.dialogueContextVersion === 1 && task.context?.decisionPolicy?.mode === 'act') return 'npc-manual-request-sender@1';
    return undefined;
  }
  reserveModelAttempt(row, slot, token, verifyTask, manualNpcResume = false) {
    this.#transaction();
    // Read and authenticate the whole stage once. The Host receives this same
    // selected task and prefix for its synchronous material-source check. This
    // callback only reads; no task list is accepted from outside the store.
    const tasks = this.tasks(row); const task = tasks.find(task => task.id === slot);
    verifyTask(task, tasks);
    const plan = this.assertLease(row, token);
    if (plan.version !== 7 || !task || task.result || task.terminal) fail();
    const ledger = this.#readModelAttemptLedger(row, plan); const now = this.#clock();
    const firstStartedAt = ledger.firstStartedAt ?? now;
    const hardDeadline = ledger.hardDeadline ?? firstStartedAt + SOFT_EXECUTION_BUDGET.sceneHardDurationMs;
    const slotOrdinal = (ledger.slots[slot] || 0) + 1;
    const remainingMs = hardDeadline - now;
    const deny = (check, requiredMs) => fail('AGENT_TIMEOUT', { check, checkedAt: now,
      jobStartedAt: ledger.firstStartedAt, deadlineAt: hardDeadline, remainingMs, requiredMs });
    if (now >= hardDeadline) deny('host-job-deadline', 0);
    if (ledger.count >= 40) deny('model-attempt-limit');
    if (slotOrdinal > (task.role === 'director' ? 1 : 2)) deny('slot-attempt-limit');
    const admission32 = usesOrdinaryAdmission32(plan.executionRevision?.revisionId);
    const compositionReserveMs = admission32 ? novelCompositionReserveMs(plan) : 0;
    if (slot === 'director' && isSealedDirectorExtension(plan.directorExtension)) {
      const needsReview = this.#ordinaryReviewPending(plan, tasks);
      const latePrivate = this.#isLatePrivateHostTail(plan, task, tasks);
      // Early public/legacy and any uncertain late shape still protect future
      // performance and possible soft service. At proven late v7, those phases
      // are finished; only composition (for pinned novel plans), the actual
      // review (if any), and Host commit remain.
      const required = DIRECTOR_EVENT_ATTEMPT_MS + hostOrdinaryTailMs(needsReview) + compositionReserveMs
        + (latePrivate ? 0 : ORDINARY_ADMISSION32.requiredServiceMs + ORDINARY_ADMISSION32.softCallMs);
      if (now - firstStartedAt >= SOFT_EXECUTION_BUDGET.sceneSoftDurationMs || remainingMs <= required)
        deny('director-optional-reserve', required);
    }
    if (slot === SOFT_SLOT) {
      if (admission32) {
        const needsReview = this.#ordinaryReviewPending(plan, tasks);
        if (!ordinarySoftFits(remainingMs, needsReview, compositionReserveMs))
          deny('soft-reserve', ORDINARY_ADMISSION32.softCallMs + hostOrdinaryTailMs(needsReview) + compositionReserveMs);
        if (slotOrdinal === 2 && !this.#provedSoftDispatchFailure(row)) deny('soft-retry-proof');
      } else if (now - firstStartedAt >= 90000 || remainingMs <= 20000) deny('legacy-soft-window');
    }
    const reviewRequired = hostOrdinaryTailMs(true);
    if (admission32 && slot === INITIAL_BOUNDARY_REVIEW_SLOT
      && tasks.some(task => task.id === SOFT_SLOT && task.result?.type === 'ordinary_attempt_result')
      && remainingMs <= reviewRequired) deny('review-reserve', reviewRequired);
    // A model document must be final before the required review is sealed. Use
    // the live remainder (up to the configured scene-call cap), but leave the
    // downstream review and transactional publication their existing windows.
    const downstreamReserveMs = compositionReserveMs === 0 ? 0
      : task.role === 'scene_composer' ? hostOrdinaryTailMs(this.#ordinaryReviewPending(plan, tasks))
      : slot === INITIAL_BOUNDARY_REVIEW_SLOT ? hostOrdinaryTailMs(false) : 0;
    if (downstreamReserveMs > 0 && remainingMs <= downstreamReserveMs)
      deny(slot === INITIAL_BOUNDARY_REVIEW_SLOT ? 'review-reserve' : 'scene-reserve', downstreamReserveMs);
    const stored = this.#db.prepare('SELECT input_hash FROM agent_turn_tasks WHERE job_id=? AND slot=?').get(row.job_id, slot);
    const base = this.#db.prepare('SELECT commit_ref FROM domain_commits WHERE branch_id=? AND generation=? AND revision=?')
      .get(row.branch_id, row.generation, row.base_revision);
    const npcResumeFeedback = [1, 2, 3].includes(plan.npcManualRecoveryVersion) && manualNpcResume === true && slotOrdinal === 2
      ? this.#npcResumeFeedback(row, task, stored.input_hash, plan.npcManualRecoveryVersion) : undefined;
    const details = { version: 1, ordinal: ledger.count + 1, slotOrdinal, inputHash: stored.input_hash,
      leaseHash: hash(token), baseCommitRef: base.commit_ref, firstStartedAt, hardDeadline };
    const json = JSON.stringify(details);
    this.#db.prepare("INSERT INTO agent_turn_trace(job_id,slot,kind,details_json,details_hash) VALUES(?,?,'attempt_started',?,?)")
      .run(row.job_id, slot, json, hash(json));
    this.#renewAfterAuthenticatedLocalWrite(row, token, plan);
    return { firstStartedAt, hardDeadline, ordinal: details.ordinal, slotOrdinal,
      ...(downstreamReserveMs > 0 ? { downstreamReserveMs } : {}),
      ...(npcResumeFeedback ? { npcResumeFeedback } : {}) };
  }
  reserveContinuation(row, token) {
    this.#transaction();
    if (this.assertLease(row, token).version !== 7) return;
    const entries = this.#db.prepare("SELECT details_json,details_hash FROM agent_turn_trace WHERE job_id=? AND kind='continuation_started' ORDER BY sequence").all(row.job_id);
    for (const [i, entry] of entries.entries()) {
      const d = decode(entry.details_json, entry.details_hash);
      if (!exact(d, ['version', 'ordinal']) || d.version !== 1 || d.ordinal !== i + 1) fail();
    }
    if (entries.length >= 13) fail('AGENT_TIMEOUT');
    const json = JSON.stringify({ version: 1, ordinal: entries.length + 1 });
    this.#db.prepare("INSERT INTO agent_turn_trace(job_id,slot,kind,details_json,details_hash) VALUES(?,NULL,'continuation_started',?,?)")
      .run(row.job_id, json, hash(json));
  }
  traceEvents(row) {
    return this.#db.prepare('SELECT * FROM agent_turn_trace WHERE job_id=? ORDER BY sequence DESC LIMIT 256').all(row.job_id).reverse()
      .map(event => ({ sequence: event.sequence, slot: event.slot, kind: event.kind, details: decode(event.details_json, event.details_hash) }));
  }
  taskSummary(row) {
    const plan = this.input(row);
    if (![2, 3, 4, 5, 6, 7].includes(plan.version)) {
      const completedTasks = (plan.tasks || []).filter(task => this.result(row, task.role) !== undefined).length;
      return { completedTasks, pendingTasks: (plan.tasks || []).length - completedTasks };
    }
    const counts = this.#db.prepare(`SELECT COUNT(*) AS total, COALESCE(SUM(CASE WHEN result_json IS NOT NULL OR EXISTS(
      SELECT 1 FROM agent_turn_optional_terminals o WHERE o.job_id=t.job_id AND o.slot=t.slot) THEN 1 ELSE 0 END), 0) AS completed
      FROM agent_turn_tasks t WHERE job_id=?${isPrivateDirectorExtension(plan.directorExtension) ? " AND t.slot IS NOT 'director'" : ''}`).get(row.job_id);
    return { completedTasks: counts.completed, pendingTasks: counts.total - counts.completed };
  }
  latestFailure(row, options) {
    const event = this.#db.prepare("SELECT details_json,details_hash FROM agent_turn_trace WHERE job_id=? AND kind='failed' ORDER BY sequence DESC LIMIT 1").get(row.job_id);
    if (!event) return undefined;
    const failure = traceFailure(decode(event.details_json, event.details_hash), options);
    return Object.keys(failure).length ? failure : undefined;
  }
  developerTrace(state, scope, contentFingerprint) {
    const rows = this.#db.prepare(`SELECT * FROM agent_turn_jobs WHERE branch_id=? AND generation=? AND base_revision<=?
      ORDER BY rowid DESC LIMIT 12`).all(scope.branchId, state.generation, state.revision);
    const turns = rows.map(row => {
      const plan = this.input(row); const privateChoice = isPrivateDirectorExtension(plan.directorExtension);
      const events = this.traceEvents(row).filter(event => !privateChoice || event.slot !== 'director');
      const tasks = [2, 3, 4, 5, 6, 7].includes(plan.version) ? this.tasks(row)
        : (plan.tasks || []).map(task => ({ ...task, id: task.role, actorId: row.actor_id,
          ...(this.result(row, task.role) === undefined ? {} : { result: this.result(row, task.role) }) }));
      return { jobId: row.job_id, requestRef: traceRequestRef(row.request_id), status: row.status,
        generation: row.generation, baseRevision: row.base_revision, turnId: row.turn_id,
        contentFingerprint: plan.contentFingerprint || null,
        review: traceReview(row.review_json ? JSON.parse(row.review_json) : {}),
        ...(row.status === 'failed' && this.latestFailure(row) ? { failure: { ...this.latestFailure(row), ...this.taskSummary(row) } } : {}),
        failures: events.filter(event => ['failed', 'attempt_failed'].includes(event.kind)).slice(-32)
          .map(event => ({ sequence: event.sequence, kind: event.kind, ...traceFailure(event.details) })),
        tasks: tasks.filter(task => !isPrivateDirectorPacket(task.context) && !hasPrivateSupplyObservation(task.context)).map(task => projectTaskTrace(task, events)) };
    });
    const result = { version: 1, audience: 'developer-only', generation: state.generation, revision: state.revision,
      contentFingerprint, turns };
    while (Buffer.byteLength(JSON.stringify(result), 'utf8') > 250 * 1024 && result.turns.length > 1) result.turns.pop();
    // Keep all task identities even when a pathological source-ID manifest is
    // too large: hashes remain useful without returning unbounded source tails.
    if (Buffer.byteLength(JSON.stringify(result), 'utf8') > 250 * 1024) {
      result.truncated = true;
      for (const turn of result.turns) for (const task of turn.tasks) delete task.manifest;
    }
    if (Buffer.byteLength(JSON.stringify(result), 'utf8') > 250 * 1024) {
      result.truncated = true;
      for (const turn of result.turns) for (const task of turn.tasks) {
        task.deliveredObservationIds = []; task.deliveredSourceHandleIds = [];
      }
    }
    return result;
  }
  publicProgress(state, scope, { after = 0, generation = state.generation, jobRef } = {}) {
    if (!Number.isSafeInteger(after) || after < 0 || !Number.isSafeInteger(generation) || generation < 1
      || (jobRef !== undefined && (typeof jobRef !== 'string' || !/^[a-f0-9]{64}$/u.test(jobRef)))) fail('INVALID_AGENT_PROGRESS');
    const row = this.#db.prepare(`SELECT job_id,status,turn_id,base_revision,
      CASE WHEN status='committed' AND turn_id IS NULL AND base_revision=? THEN review_json END AS review_json
      FROM agent_turn_jobs WHERE branch_id=? AND generation=? AND base_revision<=?
      ORDER BY rowid DESC LIMIT 1`).get(state.revision, scope.branchId, state.generation, state.revision);
    const intentOnly = row?.status === 'committed' && row.turn_id === null && row.base_revision === state.revision
      && ['intent-resolution@1', ...([CASE_BOUNDARY_RUNTIME_REVISION, SOFT_RUNTIME_REVISION, EXPLICIT_INTENT_RUNTIME_REVISION, ORDINARY_PLAN_RUNTIME_REVISION, SEMANTIC_ORDINARY_RUNTIME_REVISION, SEMANTIC_ADMISSION_RUNTIME_REVISION, INTENT_OBJECT_RUNTIME_REVISION, EXPLICIT_STANDARD_RUNTIME_REVISION, PLAN_CARDINALITY_RUNTIME_REVISION, UNIQUE_RECIPIENT_RUNTIME_REVISION, ATOMIC_SOURCE_RUNTIME_REVISION, LOSSLESS_PLAN_RUNTIME_REVISION, ATOMIC_PLAN_RUNTIME_REVISION, SOFT_REFERENCE_RUNTIME_REVISION, SCREEN_BROADCAST_RUNTIME_REVISION, SOURCE_ACQUISITION_RUNTIME_REVISION, TRUSTED_COMMUNICATION_RUNTIME_REVISION, KNOWN_TARGET_RUNTIME_REVISION, CAPACITY_RUNTIME_REVISION, PUBLICATION_RUNTIME_REVISION, ADMISSION_RUNTIME_REVISION, EVENT_DIRECTOR_RUNTIME_REVISION].includes(state.agentRuntimeRevision) ? ['initial-policy-resolution@1'] : []), ...(hasSoftRuntime(state) ? ['ordinary-attempt-resolution@1'] : [])].includes(JSON.parse(row.review_json || '{}').policy) && hasIntentRuntime(state.agentRuntimeRevision);
    const current = row && (row.status === 'committed' ? intentOnly || state.turnIds.at(-1) === row.turn_id : row.base_revision === state.revision);
    const base = { version: 1, generation: state.generation, revision: state.revision,
      reset: generation !== state.generation || after > 0 || jobRef !== undefined, cursor: 0, status: 'idle', events: [] };
    if (!current) return base;
    // Public telemetry never needs to decode private task contexts, candidates
    // or usage details. Filter BEFORE applying the bounded replay window, so
    // private diagnostic traffic cannot silently evict observable progress.
    const roles = new Set(['roleplay', 'character_data', 'intent_parser', 'world_adjudicator', 'player_performance', 'narrator', 'scene_composer', 'director']);
    const roleBySlot = new Map(this.#db.prepare('SELECT slot,role FROM agent_turn_tasks WHERE job_id=?').all(row.job_id)
      .filter(task => roles.has(task.role)).map(task => [task.slot, task.role]));
    const publicKinds = "kind IN ('prepared','validated','failed','committed','cancelled')"
      + (state.agentRuntimeRevision === EVENT_DIRECTOR_RUNTIME_REVISION ? " AND slot IS NOT 'director'" : '');
    const compactCursor = state.agentRuntimeRevision === EVENT_DIRECTOR_RUNTIME_REVISION && this.#db.prepare(`
      SELECT 1 FROM agent_turn_jobs j JOIN domain_hidden_supply_style_roots_v5 r
        ON r.root_commit_ref=json_extract(j.context_json,'$.hiddenSupplyCapability.rootCommitRef') WHERE j.job_id=?`)
      .get(row.job_id);
    // Private usage/validation must not be inferable from cursor gaps.
    const publicEdges = compactCursor
      ? `SELECT row_number() OVER (ORDER BY sequence) AS sequence,slot,kind FROM agent_turn_trace WHERE job_id=? AND ${publicKinds}`
      : `SELECT sequence,slot,kind FROM agent_turn_trace WHERE job_id=? AND ${publicKinds}`;
    const events = this.#db.prepare(`SELECT * FROM (${publicEdges}) ORDER BY sequence DESC LIMIT 256`).all(row.job_id).reverse();
    const cursor = events.at(-1)?.sequence || 0;
    const ref = traceRequestRef(row.job_id);
    // Sequence gaps from private diagnostics are normal. Reset only when an
    // actual public edge was omitted, including a truncated initial replay.
    // A short window contains every public edge; private gaps are not omissions.
    // Keep the original check at the inclusive 256-row boundary.
    const omitted = events.length === 256 && !!this.#db.prepare(`SELECT 1 FROM (${publicEdges}) WHERE sequence>? AND sequence<? LIMIT 1`).get(row.job_id, after, events[0].sequence);
    const reset = generation !== state.generation || after > cursor || (jobRef !== undefined && jobRef !== ref) || omitted;
    return { ...base, reset, status: row.status, cursor, jobRef: ref,
      ...(intentOnly ? { actionOutcome: projectActionOutcome({ version: 1, phase: 'stopped', steps: [], stop: JSON.parse(row.review_json).actionOutcome.stop }) } : {}),
      events: events.filter(event => event.sequence > (reset ? 0 : after)).map(event => ({
        id: event.sequence, kind: event.kind,
        ...(roleBySlot.has(event.slot) ? { role: roleBySlot.get(event.slot) } : {}),
      })) };
  }
  developerContext(state, scope) {
    const row = this.#db.prepare(`SELECT * FROM agent_turn_jobs WHERE branch_id=? AND generation=? AND base_revision<=?
      ORDER BY rowid DESC LIMIT 1`).get(scope.branchId, state.generation, state.revision);
    const result = { version: 1, audience: 'developer-context-only', generation: state.generation,
      revision: state.revision, jobId: row?.job_id || null, tasks: [] };
    if (!row) return result;
    const plan = this.input(row);
    const tasks = [2, 3, 4, 5, 6, 7].includes(plan.version) ? this.tasks(row) : plan.tasks || [];
    // Full context is a separate explicit local-development endpoint. Do not
    // include results, leases, candidate reasoning, providers or credentials.
    for (const task of tasks) {
      if (isPrivateDirectorPacket(task.context) || hasPrivateSupplyObservation(task.context)) continue;
      const entry = { id: task.id || task.role, role: task.role, actorId: task.actorId || row.actor_id,
        context: task.context, behaviorPrompt: task.behaviorPrompt || '' };
      if (Buffer.byteLength(JSON.stringify({ ...result, tasks: [...result.tasks, entry] }), 'utf8') > 250 * 1024) break;
      result.tasks.push(entry);
    }
    return result;
  }
  tasks(row) {
    const current = this.get(row.job_id);
    return this.#readTasks(row, this.input(current));
  }
  // Status already read the active job in this read-only transaction. Reuse
  // that verified plan, keep all existing task/result/terminal validation, and
  // never hand the parsed private task data to the public status formatter.
  statusActivities(row) {
    this.#transaction();
    const plan = this.input(row);
    const tasks = [2, 3, 4, 5, 6, 7].includes(plan.version) ? this.#readTasks(row, plan)
      : plan.tasks.map(task => ({ ...task, id: task.role, actorId: row.actor_id, result: this.result(row, task.role) }));
    return tasks.filter(task => task.role !== 'director' || !isSealedDirectorExtension(plan.directorExtension))
      .map((task, index) => ({ id: [5, 6, 7].includes(plan.version) ? 'activity-' + (index + 1) : task.id,
        role: task.role, actorId: task.actorId, completed: Boolean(task.terminal || task.result) }));
  }
  // The plan is validated from the same database read inside the caller; no
  // caller-supplied plan and no reuse across task writes or transactions.
  #authoredMagicSource(row, plan) {
    if (plan.authoredMagicVersion === undefined) return undefined;
    const source = plan.regeneration?.checkpoint ?? JSON.parse(this.#db.prepare(
      'SELECT snapshot_json FROM domain_commits WHERE branch_id=? AND generation=? AND revision=?')
      .get(row.branch_id, row.generation, row.base_revision)?.snapshot_json || 'null');
    const context = authoredMagicContext(source, plan);
    if (!context) fail();
    return context;
  }
  #readTasks(row, plan) {
    const authoredMagic = this.#authoredMagicSource(row, plan);
    const tasks = this.#db.prepare(`SELECT t.*, o.status AS terminal_status, o.details_json AS terminal_json, o.details_hash AS terminal_hash
      FROM agent_turn_tasks t LEFT JOIN agent_turn_optional_terminals o ON o.job_id=t.job_id AND o.slot=t.slot
      WHERE t.job_id=? ORDER BY t.rowid`).all(row.job_id).map(task => {
      const input = decode(task.input_json, task.input_hash);
      assertTaskSceneExtensions(input, plan, row, authoredMagic);
      if (Object.hasOwn(plan, 'caseActionTimingVersion')
        ? input.caseActionTimingVersion !== plan.caseActionTimingVersion
        : Object.hasOwn(input, 'caseActionTimingVersion')) fail();
      if (input.id !== task.slot || input.role !== task.role || input.actorId !== task.actor_id
        || (Object.hasOwn(plan, 'itemPolicyVersion')
          ? input.itemPolicyVersion !== plan.itemPolicyVersion
          : Object.hasOwn(input, 'itemPolicyVersion'))) fail();
      const terminal = task.terminal_status !== null;
      if (terminal && (input.role !== 'director' || task.result_json !== null)) fail();
      return { ...input, ...(task.result_json === null ? {} : { result: decode(task.result_json, task.result_hash) }),
        ...(terminal ? { terminal: { status: task.terminal_status, failure: decode(task.terminal_json, task.terminal_hash) } } : {}) };
    });
    if ([6, 7].includes(plan.version)) assertSceneTasks(tasks, plan);
    for (const task of tasks) this.#assertDirectorEventTask(task, plan, row);
    const review = tasks.find(task => task.id === INITIAL_BOUNDARY_REVIEW_SLOT);
    if (review && (plan.novelScenePresentationVersion === 1 && !tasks.some(task => task.id === 'scene' && task.result)
      || !isDeepStrictEqual(review.context.data.proposed, initialBoundaryReviewProposal(tasks)))) fail();
    if (isDeepStrictEqual(plan.directorExtension, DIRECTOR_PLANNING_EXTENSION)) {
      const packet = this.#directorPlanning.packet(plan.directorPlanning);
      const director = tasks.find(task => task.id === 'director');
      if (director && (!packet || !isDeepStrictEqual(director.context, packet))) fail();
    }
    return tasks;
  }
  addTask(row, task, token) {
    this.#transaction(); this.assertLease(row, token);
    const plan = this.input(this.get(row.job_id));
    const tasks = this.#readTasks(row, plan);
    assertTaskSceneExtensions(task, plan, row, this.#authoredMagicSource(row, plan));
    this.#assertDirectorEventTask(task, plan, row);
    const timing = Object.getOwnPropertyDescriptor(task, 'caseActionTimingVersion');
    if (Object.hasOwn(plan, 'caseActionTimingVersion')
      ? !timing?.enumerable || !Object.hasOwn(timing, 'value') || timing.value !== plan.caseActionTimingVersion
      : timing !== undefined) fail();
    const policy = Object.getOwnPropertyDescriptor(task, 'itemPolicyVersion');
    if (Object.hasOwn(plan, 'itemPolicyVersion')
      ? !policy?.enumerable || !Object.hasOwn(policy, 'value') || policy.value !== plan.itemPolicyVersion
      : policy !== undefined) fail();
    if (task.role === 'director' && isDeepStrictEqual(plan.directorExtension, DIRECTOR_PLANNING_EXTENSION)
      && !isDeepStrictEqual(task.context, this.#directorPlanning.packet(plan.directorPlanning))) fail();
    const existing = tasks.find(entry => entry.id === task.id);
    if (existing) return existing;
    if ([6, 7].includes(plan.version)) assertSceneTasks([...tasks, task], plan);
    if ([4, 5].includes(plan.version) && (tasks.length >= 20 || (task.id.startsWith('npc:')
      && (tasks.filter(entry => entry.id.startsWith('npc:')).length >= 3
        || tasks.some(entry => entry.id.startsWith('npc:') && entry.actorId === task.actorId))))) fail();
    const json = JSON.stringify(task);
    if (task.id === SOFT_SLOT && Buffer.byteLength(json, 'utf8') > 65536) fail();
    this.#db.prepare('INSERT INTO agent_turn_tasks(job_id,slot,role,actor_id,input_json,input_hash) VALUES(?,?,?,?,?,?)')
      .run(row.job_id, task.id, task.role, task.actorId, json, hash(json));
    this.trace(row, 'prepared', task.id);
    this.renew(row, token); return task;
  }
  terminateOptional(row, slot, token, status, diagnostic) {
    this.#transaction(); const plan = this.assertLease(row, token);
    const task = this.tasks(row).find(entry => entry.id === slot);
    if (![6, 7].includes(plan.version) || !isDirectorExtension(plan.directorExtension)
      || slot !== 'director' || task?.role !== 'director' || task.result !== undefined
      || !['failed_optional', 'skipped_optional'].includes(status)) fail();
    if (task.terminal) return;
    const json = JSON.stringify(traceFailure(diagnostic));
    this.#db.prepare('INSERT INTO agent_turn_optional_terminals(job_id,slot,status,details_json,details_hash) VALUES(?,?,?,?,?)')
      .run(row.job_id, slot, status, json, hash(json));
    this.renew(row, token);
  }
  saveTaskResult(row, slot, output, token) {
    this.#transaction(); const plan = this.assertLease(row, token);
    const task = this.#db.prepare('SELECT * FROM agent_turn_tasks WHERE job_id=? AND slot=?').get(row.job_id, slot);
    if (!task || this.#db.prepare('SELECT 1 FROM agent_turn_optional_terminals WHERE job_id=? AND slot=?').get(row.job_id, slot)) fail(); decode(task.input_json, task.input_hash);
    const json = JSON.stringify(output);
    if (slot === SOFT_SLOT && Buffer.byteLength(json, 'utf8') > 4096) fail();
    if (task.result_json !== null) { if (task.result_json !== json || task.result_hash !== hash(json)) fail(); return; }
    this.#db.prepare('UPDATE agent_turn_tasks SET result_json=?,result_hash=? WHERE job_id=? AND slot=?').run(json, hash(json), row.job_id, slot);
    this.trace(row, 'validated', slot);
    this.#renewAfterAuthenticatedLocalWrite(row, token, plan);
  }
  #renewAfterAuthenticatedLocalWrite(row, token, plan) {
    if (plan.executionRevision?.revisionId !== EVENT_DIRECTOR_RUNTIME_REVISION || plan.regeneration) {
      this.renew(row, token); return;
    }
    // The caller checked the full plan/source in the existing IMMEDIATE
    // transaction. Its only intervening writes are the task result or attempt
    // and trace. Recheck the actual exact job bytes and live SQL lease at the
    // write, not the old JS expiry or a parsed plan across transactions.
    const now = this.#clock();
    const changed = this.#db.prepare(
      "UPDATE agent_turn_jobs SET lease_expires=? WHERE job_id=? AND status='running' AND lease_owner=? AND fencing_token=? AND lease_expires>? AND context_hash=? AND context_json=?")
      .run(now + 120000, row.job_id, this.#owner, Number(token), now, row.context_hash, row.context_json);
    if (changed.changes !== 1) fail('STALE_AGENT_TURN');
  }
  renew(row, token) {
    this.#transaction(); this.assertLease(row, token);
    this.#db.prepare('UPDATE agent_turn_jobs SET lease_expires=? WHERE job_id=?').run(this.#clock() + 120000, row.job_id);
  }
  assertNarrativeAction(action) {
    const row = this.get(action.jobId); const plan = this.input(row);
    const tasks = this.#readTasks(row, plan); const output = id => tasks.find(task => task.id === id)?.result;
    if (requiresInitialBoundaryReview(adjudicationPolicy(plan))) {
      const review = tasks.find(task => task.id === INITIAL_BOUNDARY_REVIEW_SLOT);
      if (!review?.result || !isDeepStrictEqual(review.context.data.proposed, initialBoundaryReviewProposal(tasks))) fail();
      validateServiceTaskOutput(review.context, review.result);
      if (!validateInitialBoundaryAssessments(adjudicationPolicy(plan), review.result.assessments)
        || review.context.data.runBoundary && initialPublicBoundaryConflict(adjudicationPolicy(plan), review.context.data.proposed)) fail();
    }
    if ([4, 5].includes(plan.version) && (tasks.some(task => !task.result && !task.terminal) || tasks.filter(task => task.id.startsWith('npc:')).length > 3)) fail();
    let beats;
    let hostScene = false;
    if ([6, 7].includes(plan.version)) {
      const sceneTask = tasks.find(task => task.id === 'scene');
      if (plan.novelScenePresentationVersion !== 1 && sceneTask && !sceneTask.result && !sceneTask.terminal && !output('scene-repair')) {
        try { hostScene = isDeepStrictEqual(action.document, hostSceneDocument(sceneTask.context.data.events)); }
        catch { hostScene = false; }
      }
      if (tasks.some(task => !task.result && !task.terminal && !(hostScene && task.id === 'scene'))
        || !output('performance') || !(output('scene-repair') || output('scene') || hostScene)
        || !Array.isArray(action.beats) || action.beats.length > 3) fail();
      const stages = this.stages(row);
      if (stages.length !== action.beats.length + 1) fail();
      // Stable slots bind every actor/result to its beat. Within a selected
      // batch, insertion order is the host's immutable selection order. Phase
      // selection and replay of the private receipt journal remain host checks.
      beats = action.beats.map((beat, index) => {
        if (!exact(beat, ['beat', 'phase', 'decisions']) || beat.beat !== index + 1
          || !['reaction', 'npc'].includes(beat.phase) || !Array.isArray(beat.decisions) || beat.decisions.length > 3) fail();
        const own = tasks.filter(task => task.id.startsWith(`npc:${beat.beat}:`));
        const decisions = own.map(task => ({ actorId: task.actorId, proposal: task.result }));
        if (!isDeepStrictEqual(beat.decisions, decisions)) fail();
        if (plan.schedulingVersion === 1 && (own.length === 0 || !plain(own[0].scheduling)
          || own.some(task => !isDeepStrictEqual(task.scheduling, own[0].scheduling)))) fail();
        return { beat: beat.beat, phase: beat.phase, decisions };
      });
      if (beats.reduce((count, beat) => count + beat.decisions.length, 0) !== tasks.filter(task => task.id.startsWith('npc:')).length) fail();
    }
    const rawIntent = plan.intentHint.type === 'interpret' ? output('intent') : plan.intentHint;
    const extensionBase = Object.hasOwn(plan, 'guardRules')
      || ['agent-prison-runtime@5', 'agent-prison-runtime@6', 'agent-prison-runtime@7', 'agent-prison-runtime@8'].includes(runtimeCapabilityId(plan.executionRevision?.revisionId));
    const origin = plan.regeneration?.checkpoint || (plan.perceptionVersion === 1 || extensionBase
      ? this.#db.prepare('SELECT snapshot_json FROM domain_commits WHERE branch_id=? AND generation=? AND revision=?')
        .get(row.branch_id, row.generation, row.base_revision) : undefined);
    const base = typeof origin?.snapshot_json === 'string' ? JSON.parse(origin.snapshot_json) : origin;
    if ((plan.perceptionVersion === 1 || Object.hasOwn(plan, 'guardRules')) && !base) fail();
    if (base) {
      let guardRules;
      try { guardRules = guardRuleReference(base); } catch { fail(); }
      if (guardRules === undefined ? Object.hasOwn(plan, 'guardRules')
        : !Object.hasOwn(plan, 'guardRules') || !isDeepStrictEqual(plan.guardRules, guardRules)) fail();
    }
    const planningBase = base && (Object.hasOwn(plan, 'itemPolicyVersion') || [1, 2].includes(plan.intentContractVersion)) ? structuredClone(base) : base;
    if (planningBase && Object.hasOwn(plan, 'itemPolicyVersion')) runtimeApplyItemPolicy(planningBase, plan.itemPolicyVersion);
    if ([1, 2].includes(plan.intentContractVersion) && !planningBase.caseOne) enableCaseRuntime(planningBase);
    const targets = plan.perceptionVersion === 1 ? playerPerceivedScene(planningBase, plan.scene).targetIds : {};
    const hostChoice = plan.hostCaseChoiceVersion === 1 ? withRunBoundary(planningBase,
       plan.runPolicyConsumersVersion === 1 ? plan.effectiveRunPolicy : undefined, () => hostCaseChoicePlan(planningBase, row.text)) : null;
    if (plan.hostCaseChoiceVersion === 1 && (!hostChoice?.accepted || !isDeepStrictEqual(hostChoice.intent, plan.intentHint))) fail();
    const intentPlan = plan.intentHint.type === 'interpret' && rawIntent?.type === 'plan' && hasIntentAdmissionRuntime(plan)
      ? projectIntentAdmissionPlan(rawIntent) : rawIntent;
    const playerIntentPlan = hostChoice?.plan || ([1, 2].includes(plan.intentContractVersion) && intentPlan?.type === 'plan'
      ? { ...intentPlan, steps: intentPlan.steps.map(step => ({ ...step, intent: resolvePerceivedIntent(step.intent, targets) })) } : undefined);
    if ([1, 2].includes(plan.intentContractVersion) && (!playerIntentPlan || playerIntentPlan.route !== 'steps' || !action.actionOutcome)) fail();
    const intent = hostChoice?.intent || (playerIntentPlan ? resolvePlayerPlanStep(planningBase, playerIntentPlan.steps[0])
      : plan.perceptionVersion === 1 ? resolvePerceivedIntent(rawIntent, targets) : rawIntent);
    const intentFields = playerIntentPlan ? { playerIntentPlan,
      playerPerformances: tasks.filter(task => /^performance:[12]$/u.test(task.id) && task.result)
        .sort((a, b) => a.id.localeCompare(b.id)).map(task => ({ index: Number(task.id.at(-1)), performance: task.result })),
      // The canonical scene reducer independently replays and checks these
      // facts at publication/recovery. This layer closes DTO and task identity.
      actionOutcome: projectActionOutcome({ version: 1, phase: 'committed', steps: action.actionOutcome.steps,
        ...(action.actionOutcome.stop ? { stop: action.actionOutcome.stop } : {}) }) } : {};
    const soft = tasks.find(task => task.id === SOFT_SLOT);
    let softFields = {};
    if (soft) {
      if (plan.version !== 7 || !soft.result || soft.result.type !== 'ordinary_attempt_result') fail();
      const stored = this.#db.prepare('SELECT input_hash,result_hash FROM agent_turn_tasks WHERE job_id=? AND slot=?').get(row.job_id, SOFT_SLOT);
      const revisionId = runtimeRevisionForState(base).id;
      const capture = captureCooperativeRephrase(Object.fromEntries(Object.entries(soft.manifest).filter(([key]) => key !== 'version')), revisionId);
      if (!isDeepStrictEqual(capture.manifest, soft.manifest) || !isDeepStrictEqual(capture.attempt, soft.context.data.attempt)
        || !isDeepStrictEqual(capture.sources, soft.context.data.sources) || !isDeepStrictEqual(capture.scriptSpeakers, soft.context.data.scriptSpeakers)) fail();
      const candidate = { outcome: soft.result.outcome, criteria: soft.result.criteria, usedSourceRefs: soft.result.usedSourceRefs };
      const suffix = { manifest: capture.manifest, candidate, taskInputHash: stored.input_hash, taskResultHash: stored.result_hash };
      if (Buffer.byteLength(JSON.stringify(suffix), 'utf8') > ordinaryCapacityForRevision(revisionId).suffixBytes) fail();
      applyCooperativeRephraseResult(suffix, revisionId); softFields = { softResult: suffix };
    }
    const expected = [3, 4, 5, 6, 7].includes(plan.version) ? { type: 'scene', ...dialogueContextPin(plan), ...sceneExtensionPin(plan),
      ...(plan.authoredMagicVersion === 1 ? { authoredMagicVersion: 1 } : {}),
       ...(plan.authoredMagicDestinationVersion === 1 ? { authoredMagicDestinationVersion: 1 } : {}), ...intentFields, ...softFields, jobId: row.job_id, rawInput: row.text, intent,
      performance: output('performance'), ...(output('npc') ? { response: output('npc') } : {}),
      ...(intent?.operation === 'vote' ? { ballots: Object.fromEntries(tasks.filter(task => task.id.startsWith('ballot:')).map(task => [task.actorId, task.result?.ballot?.candidateId])) } : {}),
      questionKey: plan.questionKey, answerKey: plan.answerKey,
      ...(plan.roomLabelVersion !== undefined ? { roomLabelVersion: plan.roomLabelVersion } : {}),
      ...(plan.performanceVersion !== undefined ? { performanceVersion: plan.performanceVersion } : {}),
      ...(plan.storyArcVersion !== undefined ? { storyArcVersion: plan.storyArcVersion } : {}),
      ...(plan.worldVersion !== undefined ? { worldVersion: plan.worldVersion } : {}),
      ...(plan.itemPolicyVersion !== undefined ? { itemPolicyVersion: plan.itemPolicyVersion } : {}),
      ...(plan.rootCaseOptionsVersion === 1 ? { rootCaseOptionsVersion: 1 } : {}),
      ...(plan.caseActionTimingVersion !== undefined ? { caseActionTimingVersion: plan.caseActionTimingVersion } : {}),
      ...(Object.hasOwn(plan, 'guardRules') ? { guardRules: plan.guardRules } : {}),
      ...([4, 5].includes(plan.version) ? { decisionVersion: 1, decisions: tasks.filter(task => task.id.startsWith('npc:')).map(task => ({ actorId: task.actorId, proposal: task.result })) } : {}),
      ...([5, 6, 7].includes(plan.version) ? { causalVersion: 1, ...(([6, 7].includes(plan.version) || plan.causalTimingVersion === 1) ? { causalTimingVersion: 1 } : {}) } : {}),
      ...([6, 7].includes(plan.version) ? { decisionVersion: 1, decisions: [], sceneBeatVersion: 1, beats,
        ...(plan.directorEventLifecycle?.due ? { directorEventDue: plan.directorEventLifecycle.due } : {}),
        ...(plan.effectiveRunPolicy?.source.adoptedCommitRef ? { effectiveRunPolicy: plan.effectiveRunPolicy } : {}),
         ...(plan.schedulingVersion === 1 ? { schedulingVersion: 1,
          schedulingBeats: beats.map(beat => tasks.find(task => task.id.startsWith(`npc:${beat.beat}:`)).scheduling),
          schedulingEnd: tasks.find(task => task.id === 'scene')?.scheduling } : {}),
        ...(plan.decisionAuditVersion === 1 ? { decisionAuditVersion: 1 } : {}),
        ...(plan.introductionVersion !== undefined ? { introductionVersion: plan.introductionVersion } : {}),
        ...(plan.scheduleWaitVersion !== undefined ? { scheduleWaitVersion: plan.scheduleWaitVersion } : {}),
        ...(plan.npcMagicCastVersion !== undefined ? { npcMagicCastVersion: plan.npcMagicCastVersion } : {}),
        ...(plan.npcVoluntaryFloatVersion !== undefined ? { npcVoluntaryFloatVersion: plan.npcVoluntaryFloatVersion } : {}),
        ...(plan.npcMedicalContactVersion === 1 ? { npcMedicalContactVersion: 1 } : {}),
        ...(plan.playerRuntimeCommunicationVersion === 1 ? { playerRuntimeCommunicationVersion: 1 } : {}),
        ...(plan.storyLifeVersion !== undefined ? { storyLifeVersion: plan.storyLifeVersion } : {}) } : {}),
      document: hostScene ? action.document : output('scene-repair') || output('scene') }
      : { type: 'narrative', jobId: row.job_id, rawInput: row.text, intent,
        performance: output('performance'), ...(output('npc') ? { response: output('npc') } : {}),
        narration: output('narrator')?.text, questionKey: plan.questionKey, answerKey: plan.answerKey };
    if (!['running', 'committed'].includes(row.status)
      || ([6, 7].includes(plan.version) ? !exact(action, Object.keys(expected)) || !isDeepStrictEqual(action, expected)
        : JSON.stringify(action) !== JSON.stringify(expected))) fail();
  }
  getByRequest(requestId) { return this.#db.prepare('SELECT * FROM agent_turn_jobs WHERE request_id=?').get(requestId); }
  get(jobId) { const row = this.#db.prepare('SELECT * FROM agent_turn_jobs WHERE job_id=?').get(jobId); if (!row) fail(); return row; }
  #assertInitialPolicySource(row, plan) {
    if (![RP_FOUNDATION_RUNTIME_REVISION, RELATIONSHIP_RUNTIME_REVISION, INTENT_RUNTIME_REVISION, CASE_BOUNDARY_RUNTIME_REVISION, SOFT_RUNTIME_REVISION, EXPLICIT_INTENT_RUNTIME_REVISION, ORDINARY_PLAN_RUNTIME_REVISION, SEMANTIC_ORDINARY_RUNTIME_REVISION, SEMANTIC_ADMISSION_RUNTIME_REVISION, INTENT_OBJECT_RUNTIME_REVISION, EXPLICIT_STANDARD_RUNTIME_REVISION, PLAN_CARDINALITY_RUNTIME_REVISION, UNIQUE_RECIPIENT_RUNTIME_REVISION, ATOMIC_SOURCE_RUNTIME_REVISION, LOSSLESS_PLAN_RUNTIME_REVISION, ATOMIC_PLAN_RUNTIME_REVISION, SOFT_REFERENCE_RUNTIME_REVISION, SCREEN_BROADCAST_RUNTIME_REVISION, SOURCE_ACQUISITION_RUNTIME_REVISION, TRUSTED_COMMUNICATION_RUNTIME_REVISION, KNOWN_TARGET_RUNTIME_REVISION, CAPACITY_RUNTIME_REVISION, PUBLICATION_RUNTIME_REVISION, ADMISSION_RUNTIME_REVISION, EVENT_DIRECTOR_RUNTIME_REVISION].includes(plan.executionRevision?.revisionId)) fail('SOURCE_VERSION_MISMATCH');
    const base = this.#db.prepare('SELECT commit_ref,run_id,snapshot_json FROM domain_commits WHERE branch_id=? AND generation=? AND revision=?')
      .get(row.branch_id, row.generation, row.base_revision);
    if (!base) fail();
    let source = base;
    if (plan.regeneration) {
      const checkpoint = plan.regeneration.checkpoint;
      source = this.#db.prepare('SELECT commit_ref,run_id,snapshot_json FROM domain_commits WHERE generation=? AND revision=?')
        .get(checkpoint?.generation, checkpoint?.revision);
      if (!source || source.run_id !== base.run_id || !isDeepStrictEqual(JSON.parse(source.snapshot_json), checkpoint)) fail();
      const ancestor = this.#db.prepare(`WITH RECURSIVE history(commit_ref,parent_commit_ref) AS (
        SELECT commit_ref,parent_commit_ref FROM domain_commits WHERE commit_ref=?
        UNION ALL SELECT c.commit_ref,c.parent_commit_ref FROM domain_commits c JOIN history h ON c.commit_ref=h.parent_commit_ref
      ) SELECT commit_ref FROM history WHERE commit_ref=?`).get(base.commit_ref, source.commit_ref);
      if (!ancestor) fail();
    }
    const saved = this.#db.prepare(`SELECT r.initial_setup_ref,s.manifest FROM domain_runs r
      JOIN domain_setups s ON s.setup_ref=r.initial_setup_ref WHERE r.run_id=?`).get(source.run_id);
    if (!saved) fail();
    const setup = JSON.parse(saved.manifest); const snapshot = JSON.parse(source.snapshot_json);
    if (setup.runId !== source.run_id || snapshot.agentRuntimeRevision !== plan.executionRevision.revisionId
      || !isDeepStrictEqual(setup.executionRevision, plan.executionRevision)
      || !isDeepStrictEqual(runtimeRevisionForState(snapshot).executionRevision, plan.executionRevision)
      || snapshot.creation?.version !== setup.configuration?.creation?.version
      || snapshot.creation?.directorPreferences !== setup.configuration?.creation?.directorPreferences
      || !isDeepStrictEqual(snapshot.creation?.playPolicy, setup.configuration?.creation?.playPolicy)) fail('SOURCE_VERSION_MISMATCH');
    if (isRelationshipRuntime(plan)) {
      const run = this.#db.prepare('SELECT * FROM domain_runs WHERE run_id=?').get(source.run_id);
      const root = this.#db.prepare(`WITH RECURSIVE ancestry(commit_ref,parent_commit_ref,sequence) AS (
        SELECT commit_ref,parent_commit_ref,sequence FROM domain_commits WHERE commit_ref=?
        UNION ALL SELECT c.commit_ref,c.parent_commit_ref,c.sequence FROM domain_commits c JOIN ancestry a ON c.commit_ref=a.parent_commit_ref)
        SELECT c.* FROM ancestry a JOIN domain_commits c ON c.commit_ref=a.commit_ref
        WHERE a.parent_commit_ref IS NULL AND a.sequence=0`).get(source.commit_ref);
      const actualSetup = this.#db.prepare('SELECT * FROM domain_setups WHERE run_id=? AND setup_ref=?').get(source.run_id, run.initial_setup_ref);
      const verified = relationshipRootForRows({ run, root, setup: actualSetup });
      const creation = structuredClone(snapshot.creation), original = structuredClone(verified.snapshot.creation);
      if (creation.character) delete creation.character.impressionColor;
      if (original.character) delete original.character.impressionColor;
      if (!isDeepStrictEqual(creation, original)) fail('SOURCE_VERSION_MISMATCH');
      if ((plan.authoredMagicDestinationVersion !== undefined && (plan.authoredMagicDestinationVersion !== 1 || plan.authoredMagicVersion !== 1))
         || snapshot.authoredMagicVersion !== verified.snapshot.authoredMagicVersion
        || snapshot.authoredMagicVersion !== plan.authoredMagicVersion
        || (plan.authoredMagicVersion !== undefined && (plan.authoredMagicVersion !== 1 || !hasIntentAdmissionRuntime(plan)
          || !authoredMagicContext(snapshot, plan)))) fail('SOURCE_VERSION_MISMATCH');
    }
    const expected = composeInitialRunPolicy({ creation: setup.configuration?.creation, runId: source.run_id,
      setupRef: saved.initial_setup_ref, executionRevision: setup.executionRevision });
    assertInitialRunPolicy(plan.initialRunPolicy, expected);
  }
  // The Host opts in inside one synchronous SQLite transaction. Any write
  // on this connection (including rolled-back changes) invalidates the read
  // epoch; the next transaction, different bytes or old plans validate afresh.
  withExactPlanReads(work) {
    this.#transaction();
    if (this.#planReadEpoch) fail();
    const epoch = this.#planReadEpoch = { read: null };
    try { return work(); }
    finally { epoch.read = null; this.#planReadEpoch = null; }
  }
  input(row) {
    const epoch = this.#planReadEpoch;
    if (!epoch) return this.#readPlan(row);
    this.#transaction();
    const changes = this.#db.prepare('SELECT total_changes() AS changes').get().changes;
    const cache = epoch.read;
    if (cache?.changes === changes && Object.keys(row).length === cache.fields.length
        && cache.fields.every(([key, value]) => Object.hasOwn(row, key) && Object.is(row[key], value))) {
      return structuredClone(cache.plan);
    }
    epoch.read = null;
    const plan = this.#readPlan(row);
    if (plan.version === 7 && plan.executionRevision?.revisionId === EVENT_DIRECTOR_RUNTIME_REVISION && !plan.regeneration) {
      epoch.read = { changes, fields: Object.entries(row), plan: structuredClone(plan) };
    }
    return plan;
  }
  #readPlan(row) {
    const plan = decode(row.context_json, row.context_hash);
    if ([RP_FOUNDATION_RUNTIME_REVISION, RELATIONSHIP_RUNTIME_REVISION, INTENT_RUNTIME_REVISION, CASE_BOUNDARY_RUNTIME_REVISION, SOFT_RUNTIME_REVISION, EXPLICIT_INTENT_RUNTIME_REVISION, ORDINARY_PLAN_RUNTIME_REVISION, SEMANTIC_ORDINARY_RUNTIME_REVISION, SEMANTIC_ADMISSION_RUNTIME_REVISION, INTENT_OBJECT_RUNTIME_REVISION, EXPLICIT_STANDARD_RUNTIME_REVISION, PLAN_CARDINALITY_RUNTIME_REVISION, UNIQUE_RECIPIENT_RUNTIME_REVISION, ATOMIC_SOURCE_RUNTIME_REVISION, LOSSLESS_PLAN_RUNTIME_REVISION, ATOMIC_PLAN_RUNTIME_REVISION, SOFT_REFERENCE_RUNTIME_REVISION, SCREEN_BROADCAST_RUNTIME_REVISION, SOURCE_ACQUISITION_RUNTIME_REVISION, TRUSTED_COMMUNICATION_RUNTIME_REVISION, KNOWN_TARGET_RUNTIME_REVISION, CAPACITY_RUNTIME_REVISION, PUBLICATION_RUNTIME_REVISION, ADMISSION_RUNTIME_REVISION, EVENT_DIRECTOR_RUNTIME_REVISION].includes(plan.executionRevision?.revisionId) || Object.hasOwn(plan, 'initialRunPolicy')) this.#assertInitialPolicySource(row, plan);
    if (hasSoftRuntime(plan.executionRevision?.revisionId)) {
      if (plan.version !== 7 || plan.softResultVersion !== 1 || plan.ordinaryParticipationVersion !== 1
        || plan.intentContractVersion !== 2 || !isDeepStrictEqual(plan.executionBudget, SOFT_EXECUTION_BUDGET)) fail();
    } else if (plan.version === 7 || ['softResultVersion', 'ordinaryParticipationVersion', 'executionBudget'].some(key => Object.hasOwn(plan, key))) fail();
    if (Object.hasOwn(plan, 'novelScenePresentationVersion') && (plan.novelScenePresentationVersion !== 1 || ![4, 5, 6, 7].includes(plan.version))) fail();
    if (Object.hasOwn(plan, 'narrationPacingVersion') && (plan.narrationPacingVersion !== 1 || plan.novelScenePresentationVersion !== 1)) fail();
    if (Object.hasOwn(plan, 'npcManualRecoveryVersion') && (![1, 2, 3].includes(plan.npcManualRecoveryVersion) || plan.version !== 7
      || plan.executionRevision?.revisionId !== EVENT_DIRECTOR_RUNTIME_REVISION || plan.regeneration)) fail();
    if (Object.hasOwn(plan, 'visualPerformanceGuidanceVersion') && (![1, 2, 3].includes(plan.visualPerformanceGuidanceVersion)
      || plan.version !== 7 || plan.materialProseVersion !== 2 || plan.executionRevision?.revisionId !== EVENT_DIRECTOR_RUNTIME_REVISION
      || plan.regeneration)) fail();
    if (Object.hasOwn(plan, 'privateDirectorTailVersion') && (plan.privateDirectorTailVersion !== 1
      || plan.version !== 7 || plan.regeneration || plan.executionRevision?.revisionId !== EVENT_DIRECTOR_RUNTIME_REVISION
      || plan.hiddenSupplyCapability?.lifecycle !== 1 || plan.hiddenSupplyChoice?.packet?.data?.version !== 7)) fail();
    if (Object.hasOwn(plan, 'npcActPreflightVersion') && (![1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14].includes(plan.npcActPreflightVersion) || plan.version !== 7
      || plan.regeneration || plan.executionRevision?.revisionId !== EVENT_DIRECTOR_RUNTIME_REVISION)) fail();
    if (Object.hasOwn(plan, 'npcIdentifySourceClosureVersion') && (plan.npcIdentifySourceClosureVersion !== 1
      || plan.version !== 7 || plan.executionRevision?.revisionId !== EVENT_DIRECTOR_RUNTIME_REVISION || plan.regeneration
      || plan.explicitNewAttemptOf !== undefined || plan.hostCaseChoiceVersion === 1
      || (plan.effectiveRunPolicy?.source?.adoptedCommitRef
        ? plan.effectiveRunPolicy.playPolicy.cases : plan.initialRunPolicy?.playPolicy?.cases) !== 'allowed')) fail();
    if (Object.hasOwn(plan, 'privateUnissuedAskVersion') && (plan.privateUnissuedAskVersion !== 1
      || plan.version !== 7 || plan.regeneration || plan.executionRevision?.revisionId !== EVENT_DIRECTOR_RUNTIME_REVISION
      || plan.hiddenSupplyCapability?.lifecycle !== 1 || plan.hiddenSupplyChoice?.packet?.data?.version !== 7)) fail();
    validateSceneExtensions(plan);
    if (plan.hostCaseChoiceVersion === 1) {
      const source = plan.regeneration?.checkpoint || JSON.parse(this.#db.prepare('SELECT snapshot_json FROM domain_commits WHERE branch_id=? AND generation=? AND revision=?')
        .get(row.branch_id, row.generation, row.base_revision)?.snapshot_json || 'null');
      const choice = source && withRunBoundary(source, plan.runPolicyConsumersVersion === 1 ? plan.effectiveRunPolicy : undefined,
         () => hostCaseChoicePlan(source, row.text));
      if (plan.version !== 7 || plan.jobId !== row.job_id || !choice?.accepted || !isDeepStrictEqual(choice.intent, plan.intentHint)) fail();
      if (plan.regeneration) {
        const original = this.#db.prepare("SELECT context_json,context_hash FROM agent_turn_jobs WHERE turn_id=? AND status='committed'").get(plan.regeneration.turnId);
        if (!original || decode(original.context_json, original.context_hash).hostCaseChoiceVersion !== 1) fail();
      }
    }
    customAbilityTaskPin(plan);
    ballotInstrumentTaskPin(plan);
    if (plan.ballotInstrumentVersion === 1 && (![4, 5, 6, 7].includes(plan.version)
      || plan.regeneration || plan.intentHint?.type !== 'case' || plan.intentHint.operation !== 'vote')) fail();
    if (plan.customAbilityVersion === 1) {
      if(![6, 7].includes(plan.version)||runtimeCapabilityId(plan.executionRevision?.revisionId)!=='agent-prison-runtime@8'||!Array.isArray(plan.customAbilityRefs)||!plan.customAbilityRefs.length)fail();
      const snapshot=plan.regeneration?.checkpoint ?? this.#db.prepare('SELECT snapshot_json FROM domain_commits WHERE branch_id=? AND generation=? AND revision=?').get(row.branch_id,row.generation,row.base_revision);
      const source=plan.regeneration?.checkpoint ?? (snapshot && JSON.parse(snapshot.snapshot_json));
      if(!source?.customAbilitySetup||!isDeepStrictEqual(plan.customAbilityRefs,source.customAbilitySetup.selections))fail();
      if (plan.executionRevision?.revisionId === EVENT_DIRECTOR_RUNTIME_REVISION && Object.hasOwn(plan, 'directorEventLifecycle')) fail();
    } else if(Object.hasOwn(plan,'customAbilityRefs'))fail();
    if (plan.swapLifecycleVersion === 1 && ![6, 7].includes(plan.version)) fail();
    if (Object.hasOwn(plan, 'playerTextSwapVersion')
      && (plan.playerTextSwapVersion !== 1 || plan.swapLifecycleVersion !== 1)) fail();
    if (Object.hasOwn(plan, 'playerRuntimeCommunicationVersion')
      && (plan.playerRuntimeCommunicationVersion !== 1 || plan.swapLifecycleVersion !== 1)) fail();
    if (plan.occupiedBodyVersion === 1 && (![6, 7].includes(plan.version) || runtimeCapabilityId(plan.executionRevision?.revisionId) !== 'agent-prison-runtime@8')) fail();
    if (plan.postureActionVersion === 1 && (![6, 7].includes(plan.version) || plan.itemPolicyVersion !== 2
      || plan.physicalFactsVersion !== 2 || runtimeCapabilityId(plan.executionRevision?.revisionId) !== 'agent-prison-runtime@8')) fail();
    if (dialogueContextPin(plan).dialogueContextVersion === 1
      && (![6, 7].includes(plan.version) || runtimeCapabilityId(plan.executionRevision?.revisionId) !== 'agent-prison-runtime@8' || plan.performanceVersion !== 2)) fail();
    if (SCENE_EXTENSION_FIELDS.some(key => Object.hasOwn(plan, key)) && ![4, 5, 6, 7].includes(plan.version)) fail();
    if (Object.hasOwn(plan, 'directorExtension') && (!isDirectorExtension(plan.directorExtension) || ![6, 7].includes(plan.version)
      || (plan.directorExtension.id === DIRECTOR_LIFECYCLE_EXTENSION.id && (!Array.isArray(plan.directorCandidates) || plan.directorCandidates.length > 3)))) fail();
    const planning = isDeepStrictEqual(plan.directorExtension, DIRECTOR_PLANNING_EXTENSION);
    if (planning) {
      const pin = validateDirectorPlanningPin(plan.directorPlanning);
      if (!isDeepStrictEqual(pin.scope, { actorId: DIRECTOR_PRINCIPAL, branchId: row.branch_id,
        generation: row.generation, revision: row.base_revision })
        || plan.directorSnapshotHash !== pin.snapshotHash
        || (plan.directorBoundary ?? null) !== pin.boundary) fail();
      if (plan.regeneration) {
        const source = this.#db.prepare('SELECT snapshot_json FROM domain_commits WHERE commit_ref=?').get(pin.sourceCommitRef);
        if (!source || !isDeepStrictEqual(JSON.parse(source.snapshot_json), plan.regeneration.checkpoint)) fail();
      } else if (pin.sourceCommitRef !== pin.provenance.executionCommitRef) fail();
      this.#directorPlanning.packet(pin);
    } else if (Object.hasOwn(plan, 'directorPlanning')) fail();
    const v4 = isDirectorEventExtension(plan.directorExtension);
    if (Object.hasOwn(plan, 'runBoundary')
      || Object.hasOwn(plan, 'runPolicyConsumersVersion') && (plan.runPolicyConsumersVersion !== 1 || !plan.effectiveRunPolicy)) fail();
    if (Object.hasOwn(plan, 'effectiveRunPolicy')) {
      if (plan.version !== 7 || plan.executionRevision?.revisionId !== EVENT_DIRECTOR_RUNTIME_REVISION) fail();
      const snapshot = this.#db.prepare('SELECT snapshot_json FROM domain_commits WHERE branch_id=? AND generation=? AND revision=?')
        .get(row.branch_id, row.generation, row.base_revision);
      const expectedSource = plan.regeneration?.checkpoint || (snapshot && JSON.parse(snapshot.snapshot_json));
      const expected = expectedSource && new DomainStore(this.#db).effectiveRunPolicy(expectedSource)?.pin;
      if (!expected || !isDeepStrictEqual(expected, plan.effectiveRunPolicy)) fail();
    }
    if (Object.hasOwn(plan, 'hiddenSupplyCapability')) {
      if (plan.version !== 7 || plan.regeneration || plan.executionRevision?.revisionId !== EVENT_DIRECTOR_RUNTIME_REVISION) fail();
      const source = this.#db.prepare('SELECT snapshot_json FROM domain_commits WHERE branch_id=? AND generation=? AND revision=?')
        .get(row.branch_id, row.generation, row.base_revision);
      const expected = source && new DomainStore(this.#db).hiddenSupplyJob(JSON.parse(source.snapshot_json));
      if (!expected || !isDeepStrictEqual(plan.hiddenSupplyCapability, expected)) fail();
    }
    if (plan.hiddenSupplyCapability?.lifecycle === 1 ? !isHiddenSupplyMode(plan.hiddenSupplyMode)
      : Object.hasOwn(plan, 'hiddenSupplyMode')) fail();
    if (Object.hasOwn(plan, 'directorEventLifecycle') && (plan.version !== 7 || plan.regeneration
      || plan.executionRevision?.revisionId !== EVENT_DIRECTOR_RUNTIME_REVISION
      || !isDeepStrictEqual(plan.directorEventLifecycle, this.#directorPlanning.eventJobPin({
        branchId: row.branch_id, generation: row.generation, revision: row.base_revision }, row.job_id)))) fail();
    if (plan.executionRevision?.revisionId === EVENT_DIRECTOR_RUNTIME_REVISION) {
      const expected = plan.regeneration ? null : captureEffectiveDirectorEventPin(this.#db, {
        branchId: row.branch_id, generation: row.generation, revision: row.base_revision, jobId: row.job_id,
        initialRunPolicy: plan.initialRunPolicy, executionRevision: plan.executionRevision,
        effectiveRunPolicy: plan.runPolicyConsumersVersion === 1 ? plan.effectiveRunPolicy : undefined,
      });
      const privateChoice = isPrivateDirectorExtension(plan.directorExtension);
      if (privateChoice) {
        if (expected || plan.regeneration || plan.hiddenSupplyCapability?.version !== 2 || plan.directorEventPin || plan.directorBoundary
          || plan.hiddenSupplyCapability.lifecycle === 1 && plan.hiddenSupplyMode !== 'active') fail();
        const source = this.#db.prepare('SELECT snapshot_json FROM domain_commits WHERE branch_id=? AND generation=? AND revision=?')
          .get(row.branch_id, row.generation, row.base_revision);
        const choice = source && new DomainStore(this.#db).hiddenSupplyChoice(JSON.parse(source.snapshot_json), row.job_id);
        if (!choice || !isDeepStrictEqual(plan.hiddenSupplyChoice, choice)) fail();
      } else if (Object.hasOwn(plan, 'hiddenSupplyChoice')) fail();
      if (!privateChoice && (expected ? !v4 || plan.version !== 7 || !isDeepStrictEqual(plan.directorExtension, expected.packet.data.extension) || !isDeepStrictEqual(plan.directorEventPin, expected)
        || plan.directorBoundary !== expected.packet.data.boundary
        : Object.hasOwn(plan, 'directorExtension') || Object.hasOwn(plan, 'directorEventPin') || Object.hasOwn(plan, 'directorBoundary'))) fail();
      if (Object.hasOwn(plan, 'directorSnapshotHash') || Object.hasOwn(plan, 'directorCandidates')) fail();
    } else if (v4 || isPrivateDirectorExtension(plan.directorExtension) || Object.hasOwn(plan, 'directorEventPin') || Object.hasOwn(plan, 'hiddenSupplyChoice')) fail();
    if (Object.hasOwn(plan, 'caseRecallVersion') && (plan.caseRecallVersion !== 1
      || ![4, 6, 7].includes(plan.version) || runtimeCapabilityId(plan.executionRevision?.revisionId) !== 'agent-prison-runtime@8')) fail();
    if (Object.hasOwn(plan, 'performanceVersion') && (plan.performanceVersion !== 2
      || ![4, 6, 7].includes(plan.version) || runtimeCapabilityId(plan.executionRevision?.revisionId) !== 'agent-prison-runtime@8')) fail();
    if (Object.hasOwn(plan, 'antiClicheVersion') && (plan.antiClicheVersion !== 1 || ![4, 5, 6, 7].includes(plan.version))) fail();
    if (Object.hasOwn(plan, 'openActionVersion') && (plan.openActionVersion !== 1 || plan.version !== 7
      || !supportsOpenPlayerAction(plan.executionRevision?.revisionId))) fail();
    if (Object.hasOwn(plan, 'actorAddressVersion') && (![1, 2].includes(plan.actorAddressVersion) || ![4, 5, 6, 7].includes(plan.version))) fail();
    if (Object.hasOwn(plan, 'storyArcVersion') && (plan.storyArcVersion !== 1 || ![4, 6, 7].includes(plan.version))) fail();
    if (Object.hasOwn(plan, 'decisionAuditVersion') && (plan.decisionAuditVersion !== 1
      || ![6, 7].includes(plan.version) || plan.schedulingVersion !== 1)) fail();
    if (Object.hasOwn(plan, 'introductionVersion') && (![1, 2, 3, 4, 5].includes(plan.introductionVersion) || ![6, 7].includes(plan.version)
      || plan.introductionVersion === 4 && !['agent-prison-runtime@4', 'agent-prison-runtime@5', 'agent-prison-runtime@6', 'agent-prison-runtime@7', 'agent-prison-runtime@8'].includes(runtimeCapabilityId(plan.executionRevision?.revisionId)))) fail();
    if (Object.hasOwn(plan, 'scheduleWaitVersion') && (plan.scheduleWaitVersion !== 1 || ![6, 7].includes(plan.version)
      || !['agent-prison-runtime@3', 'agent-prison-runtime@4', 'agent-prison-runtime@5', 'agent-prison-runtime@6', 'agent-prison-runtime@7', 'agent-prison-runtime@8'].includes(runtimeCapabilityId(plan.executionRevision?.revisionId)))) fail();
    if (Object.hasOwn(plan, 'storyLifeVersion') && (plan.storyLifeVersion !== 1 || ![6, 7].includes(plan.version)
      || runtimeCapabilityId(plan.executionRevision?.revisionId) !== 'agent-prison-runtime@8')) fail();
    if (plan.npcMagicCastVersion === 1) {
      if (![6, 7].includes(plan.version) || plan.regeneration
        || runtimeCapabilityId(plan.executionRevision?.revisionId) !== 'agent-prison-runtime@8') fail();
      const head = this.#db.prepare('SELECT commit_ref, run_id, snapshot_json FROM domain_commits WHERE branch_id=? AND generation=? AND revision=?')
        .get(row.branch_id, row.generation, row.base_revision);
      if (!head) fail();
      if (!new MagicRepository(this.#db).readAt({ commitRef: head.commit_ref, runId: head.run_id })) {
        // A first ordinary act on a committed, not-yet-activated agent root has
        // no saved magic yet. The Host emitted this pin only after constructing
        // the same-before native baseline that the act itself will publish; the
        // plan's existing playerTextMagicVersion captures that ordinary-text
        // path. Keep the saved-magic check for every other pinned plan instead
        // of treating a model-selected or arbitrary new field as permission.
        let base;
        try { base = JSON.parse(head.snapshot_json); } catch { fail(); }
        if (!(plan.playerTextMagicVersion === 1 && base?.exampleId === 'agent' && !base.magic
          && runtimeCapabilityId(base.agentRuntimeRevision) === 'agent-prison-runtime@8'
          && runtimeRevisionForState(base).policy.sceneBeatVersion === 1)) fail();
      }
    } else if (Object.hasOwn(plan, 'npcMagicCastVersion')) fail();
    if (Object.hasOwn(plan, 'npcVoluntaryFloatVersion') && (plan.npcVoluntaryFloatVersion !== 1
      || plan.npcMagicCastVersion !== 1 || ![6, 7].includes(plan.version) || plan.regeneration)) fail();
    if (Object.hasOwn(plan, 'npcMedicalContactVersion') && (plan.npcMedicalContactVersion !== 1
      || plan.npcMagicCastVersion !== 1 || ![6, 7].includes(plan.version) || plan.regeneration)) fail();
    if (Object.hasOwn(plan, 'npcMagicPersonaPolicyVersion')
      && (![1, 2, 3].includes(plan.npcMagicPersonaPolicyVersion) || plan.npcMagicCastVersion !== 1
        || ![6, 7].includes(plan.version) || plan.regeneration)) fail();
    if (Object.hasOwn(plan, 'itemPolicyVersion') && (![1, 2].includes(plan.itemPolicyVersion) || ![5, 6, 7].includes(plan.version))) fail();
    if (Object.hasOwn(plan, 'rootCaseOptionsVersion') && (plan.rootCaseOptionsVersion !== 1
      || ![6, 7].includes(plan.version) || runtimeCapabilityId(plan.executionRevision?.revisionId) !== 'agent-prison-runtime@8')) fail();
    if (Object.hasOwn(plan, 'objectInspectionTimingVersion') && (plan.objectInspectionTimingVersion !== 1
      || ![6, 7].includes(plan.version) || plan.itemPolicyVersion !== 2
      || runtimeCapabilityId(plan.executionRevision?.revisionId) !== 'agent-prison-runtime@8')) fail();
    if (Object.hasOwn(plan, 'caseActionTimingVersion') && (plan.caseActionTimingVersion !== 2
      || ![4, 5, 6, 7].includes(plan.version) || runtimeCapabilityId(plan.executionRevision?.revisionId) !== 'agent-prison-runtime@8')) fail();
    if (Object.hasOwn(plan, 'guardRules') && (!isGuardRuleReference(plan.guardRules) || ![4, 5, 6, 7].includes(plan.version)
      || !['agent-prison-runtime@5', 'agent-prison-runtime@6', 'agent-prison-runtime@7', 'agent-prison-runtime@8'].includes(runtimeCapabilityId(plan.executionRevision?.revisionId)))) fail();
    return plan;
  }
  result(row, role) {
    const field = resultField(role);
    return row[`${field}_json`] === null ? undefined : decode(row[`${field}_json`], row[`${field}_hash`]);
  }
  activeBaseRevision(generation) {
    return this.#db.prepare("SELECT base_revision FROM agent_turn_jobs WHERE generation=? AND status IN ('pending','running','failed') ORDER BY rowid LIMIT 1").get(generation)?.base_revision;
  }
  active(generation) {
    return this.#db.prepare("SELECT * FROM agent_turn_jobs WHERE generation=? AND status IN ('pending','running','failed') ORDER BY rowid LIMIT 1").get(generation);
  }
  insert({ requestId, text, scope, actorId, plan }) {
    this.#transaction(); dialogueContextPin(plan); const jobId = plan.jobId; const json = JSON.stringify(plan);
    this.#db.prepare(`INSERT INTO agent_turn_jobs(job_id,request_id,text,generation,base_revision,branch_id,actor_id,context_json,context_hash,status)
      VALUES(?,?,?,?,?,?,?,?,?,'pending')`).run(jobId, requestId, text, scope.generation, scope.revision, scope.branchId, actorId, json, hash(json));
    return this.get(jobId);
  }
  cancelObsolete(scope) {
    this.#transaction();
    const obsolete = this.#db.prepare(`SELECT job_id FROM agent_turn_jobs
      WHERE status IN ('pending','running','failed') AND (generation<>? OR base_revision<>? OR branch_id<>?)`)
      .all(scope.generation, scope.revision, scope.branchId);
    this.#db.prepare(`UPDATE agent_turn_jobs SET status='cancelled',lease_owner=NULL,lease_expires=NULL,fencing_token=fencing_token+1
      WHERE status IN ('pending','running','failed') AND (generation<>? OR base_revision<>? OR branch_id<>?)`)
      .run(scope.generation, scope.revision, scope.branchId);
    for (const row of obsolete) this.trace(row, 'cancelled');
  }
  cancelFailed(jobId) {
    this.#transaction();
    const row = this.#db.prepare("SELECT job_id FROM agent_turn_jobs WHERE job_id=? AND status='failed'").get(jobId);
    if (!row) return false;
    this.#db.prepare("UPDATE agent_turn_jobs SET status='cancelled',lease_owner=NULL,lease_expires=NULL,fencing_token=fencing_token+1 WHERE job_id=? AND status='failed'")
      .run(jobId);
    this.trace(row, 'cancelled');
    return true;
  }
  claim(row) {
    this.#transaction(); const now = this.#clock();
    if (row.status === 'cancelled' || row.status === 'committed') fail('STALE_AGENT_TURN');
    if (row.status === 'running' && row.lease_owner !== this.#owner && row.lease_expires > now) return null;
    if (!(row.status === 'running' && row.lease_owner === this.#owner && row.lease_expires > now)) {
      this.#db.prepare(`UPDATE agent_turn_jobs SET status='running',lease_owner=?,lease_expires=?,fencing_token=fencing_token+1,error_code=NULL WHERE job_id=?`)
        .run(this.#owner, now + 120000, row.job_id);
    }
    return String(this.get(row.job_id).fencing_token);
  }
  assertLease(row, token) {
    if (row.status !== 'running' || row.lease_owner !== this.#owner || String(row.fencing_token) !== token || row.lease_expires <= this.#clock()) fail('STALE_AGENT_TURN');
    // Callers may use this exact authenticated plan for the same row and
    // synchronous operation; a later read or lease still validates freshly.
    return this.input(row);
  }
  saveResult(row, role, output, token) {
    this.#transaction(); this.assertLease(row, token);
    const field = resultField(role); const json = JSON.stringify(output);
    if (row[`${field}_json`] !== null) { if (row[`${field}_json`] !== json || row[`${field}_hash`] !== hash(json)) fail(); return; }
    this.#db.prepare(`UPDATE agent_turn_jobs SET ${field}_json=?,${field}_hash=? WHERE job_id=?`).run(json, hash(json), row.job_id);
    this.renew(row, token);
  }
  fail(row, token, code, details = {}) {
    this.#transaction(); this.assertLease(row, token);
    const safe = new Set(['ERR_LLM_TURN_FAILED','LLM_NOT_CONFIGURED','AGENT_TIMEOUT','AGENT_BATCH_CANCELLED','INVALID_AGENT_OUTPUT','ERR_AGENT_DECISION','ERR_AGENT_PROPOSAL']);
    this.#db.prepare("UPDATE agent_turn_jobs SET status='failed',error_code=?,lease_owner=NULL,lease_expires=NULL WHERE job_id=?")
      .run(safe.has(code) ? code : 'ERR_LLM_TURN_FAILED', row.job_id);
    this.trace(row, 'failed', null, details);
  }
  commit(row, token, { review, turnId, receipt }) {
    this.#transaction(); this.assertLease(row, token);
    if (usesOrdinaryAdmission32(this.input(row).executionRevision?.revisionId)) this.assertOrdinaryDeadline(row);
    this.#db.prepare("UPDATE agent_turn_jobs SET status='committed',review_json=?,turn_id=?,receipt_json=?,lease_owner=NULL,lease_expires=NULL WHERE job_id=?")
      .run(JSON.stringify(review), turnId, JSON.stringify(receipt), row.job_id);
    this.trace(row, 'committed');
  }
  assertAction(action) {
    const row = this.get(action.jobId); const input = this.input(row);
    const result = this.result(row, 'roleplay');
    if (!['running','committed'].includes(row.status) || !result || input.intent.targetId !== action.targetId
      || input.intent.playerText !== action.playerText || result.utterance !== action.reply
      || input.questionKey !== action.questionKey || input.answerKey !== action.answerKey) fail();
  }
  close() {
    // Release only this instance's unfinished leases. A different process cannot
    // steal a live lease until expiry; expired work is fenced on reclamation.
    this.#db.prepare("UPDATE agent_turn_jobs SET status='pending',lease_owner=NULL,lease_expires=NULL,fencing_token=fencing_token+1 WHERE lease_owner=? AND status='running'").run(this.#owner);
  }
}

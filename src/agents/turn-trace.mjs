import { SOFT_FAILURE_RULES, projectSoftShapeDiff } from './cooperative-rephrase.mjs';
import { createHash } from 'node:crypto';
import { validateSystemSeal } from '../cognition/dialogue-context-policy.mjs';
import { buildDirectorContext } from '../director/director-effective-private-contract.mjs';
import { isProxy } from 'node:util/types';
import { buildRoleplayContext, buildCharacterDataContext, ROLEPLAY_DECISION_FAILURE_RULES, NPC_HOST_TEXT_FAILURE_RULES } from './agent-boundaries.mjs';
import { buildNarrativeContext } from './narrative-boundaries.mjs';
import { buildServiceTaskContext, SERVICE_INTENT_FAILURE_RULES } from './service-task-contract.mjs';
import { MODEL_FAILURE_PHASES, MODEL_FAILURE_ISSUES, MODEL_PROPOSAL_FAILURE_RULES } from './model-gateway.mjs';
import { DECISION_STATE_FAILURE_ISSUES } from '../cognition/decision-state.mjs';
import { MATERIAL_PROSE_FAILURE_RULES, NPC_HOST_FAILURE_RULES } from './narrative-guards.mjs';

export const TURN_FAILURE_STAGES = Object.freeze(['prepare', 'context', 'configuration', 'model', 'validation', 'continuation', 'commit']);
export const TURN_FAILURE_CODES = Object.freeze([
  'ERR_LLM_TURN_FAILED', 'LLM_NOT_CONFIGURED', 'SETTINGS_UNAVAILABLE', 'AGENT_TIMEOUT', 'STALE_AGENT_TURN',
  'ERR_MODEL_CONFIG', 'ERR_MODEL_PACKET', 'ERR_MODEL_REQUEST', 'ERR_MODEL_RESPONSE', 'ERR_MODEL_TIMEOUT', 'ERR_MODEL_CANCELLED',
  'INVALID_AGENT_OUTPUT', 'INVALID_AGENT_JOB', 'INVALID_AGENT_STATE', 'INVALID_NARRATIVE_OUTPUT',
  'ERR_AGENT_DECISION', 'ERR_AGENT_PROPOSAL', 'ERR_AGENT_EVIDENCE', 'ERR_AGENT_CONTEXT_TOO_LARGE',
  'ERR_COGNITION_INVALID', 'ERR_COGNITION_SOURCE', 'ERR_COGNITION_CONFLICT', 'ERR_DECISION_STATE', 'INVALID_DOMAIN_STATE',
  'SOURCE_VERSION_MISMATCH', 'INVALID_CONVERSATION_STATE', 'ERR_CONVERSATION_STATE', 'INVALID_SCENE_STAGE',
]);
const TASK_KINDS = ['intent', 'soft', 'initial-boundary-review', 'performance', 'npc', 'ballot', 'scene', 'scene-repair', 'roleplay', 'character_data', 'narrator', 'director'];

const CLOCK_CHECKS = ['gateway-call-timeout', 'runner-call-timeout', 'runner-job-deadline', 'host-job-deadline',
  'model-attempt-limit', 'slot-attempt-limit', 'soft-reserve', 'soft-retry-proof', 'review-reserve', 'scene-reserve', 'soft-retry-reserve', 'legacy-soft-window',
  'director-optional-reserve'];
const failureClocks = new WeakMap();
export const authenticatedFailureClock = error => failureClocks.get(error);
export function failureClockError(error, clock) {
  const safe = projectFailureClock(clock);
  if (safe) failureClocks.set(error, safe);
  return error;
}
function projectFailureClock(value) {
  if (!value || typeof value !== 'object' || isProxy(value)) return undefined;
  const own = key => {
    const d = Object.getOwnPropertyDescriptor(value, key);
    return d?.enumerable && Object.hasOwn(d, 'value') ? d.value : undefined;
  };
  const check = own('check');
  if (!CLOCK_CHECKS.includes(check)) return undefined;
  const result = { check };
  for (const key of ['jobStartedAt', 'attemptStartedAt', 'checkedAt', 'deadlineAt', 'remainingMs', 'requiredMs', 'retryDelayMs']) {
    const n = own(key);
    if (Number.isSafeInteger(n) && n >= (key === 'remainingMs' ? -Number.MAX_SAFE_INTEGER : 0)) result[key] = n;
  }
  return Object.freeze(result);
}
/** A closed projection, not a serializer for errors or provider metadata. */
export function traceFailure(value, { developer = true } = {}) {
  if (!value || typeof value !== 'object' || isProxy(value)
    || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) return {};
  const own = key => {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    return descriptor?.enumerable && Object.hasOwn(descriptor, 'value') ? descriptor.value : undefined;
  };
  const result = {};
  for (const [key, allowed] of [
    ['stage', TURN_FAILURE_STAGES], ['code', TURN_FAILURE_CODES],
    ['phase', [...MODEL_FAILURE_PHASES, 'host_validation']],
    ['issue', [...MODEL_FAILURE_ISSUES, ...DECISION_STATE_FAILURE_ISSUES]],
    ['taskRole', ['roleplay', 'character_data', 'intent_parser', 'world_adjudicator', 'player_performance', 'narrator', 'scene_composer', 'director']],
    ['taskKind', TASK_KINDS], ['retryAdvice', ['manual_retry', 'check_settings', 'inspect_commit', 'refresh_state']],
    ['retryRequiresModel', ['no', 'possible']],
    ['attemptPolicyState', ['sealed-base', 'absent']], ['ordinaryDispatch', ['confirmed']],
  ]) {
    const entry = own(key); if (allowed.includes(entry)) result[key] = entry;
  }
  for (const [key, minimum, maximum] of [
    ['httpStatus', 100, 599], ['attempt', 1, 11], ['retryLimit', 0, 10], ['modelCalls', 0, 1000],
    ['reusedTasks', 0, 32], ['completedTasks', 0, 32], ['pendingTasks', 0, 32],
  ]) {
    const entry = own(key);
    if (Number.isSafeInteger(entry) && entry >= minimum && entry <= maximum) result[key] = entry;
  }
  const jobRef = own('jobRef');
  if (typeof jobRef === 'string' && /^[a-f0-9]{64}$/u.test(jobRef)) result.jobRef = jobRef;
  const duration = own('attemptDurationMs');
  if (Number.isFinite(duration) && duration >= 0 && duration <= 86_400_000 && !Object.is(duration, -0))
    result.attemptDurationMs = Math.round(duration);
  if (result.attemptPolicyState === 'sealed-base') {
    try { result.attemptBaseSystemPolicySeal = validateSystemSeal(own('attemptBaseSystemPolicySeal')); }
    catch { delete result.attemptPolicyState; }
  }
  if (developer) {
    const clock = projectFailureClock(own('failureClock'));
    if (clock) result.failureClock = clock;
    const retryClock = projectFailureClock(own('retryBlockedClock'));
    if (retryClock?.check === 'soft-retry-reserve') result.retryBlockedClock = retryClock;
    for (const field of ['modelNotDispatched', 'hostValidationNotRun', 'hostCommitNotRun', 'hostContinuationNotRun']) {
      if (own(field) === true) result[field] = true;
    }
    if (own('rule') === 'soft-output-structure') {
      const shapeDiff = projectSoftShapeDiff(own('shapeDiff'));
      if (shapeDiff) result.shapeDiff = shapeDiff;
    }
  }
  return Object.assign(result, traceRejection(value));
}

const hash = value => createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex');
const bytes = value => Buffer.byteLength(JSON.stringify(value), 'utf8');
const id = value => typeof value === 'string' && value.length > 0 && value.length <= 256 && !/[\u0000-\u001f\u007f]/u.test(value);
const count = value => Number.isSafeInteger(value) && value >= 0 && value <= 1_000_000_000;
const ROLES = new Set(['roleplay', 'character_data', 'intent_parser', 'world_adjudicator', 'player_performance', 'narrator', 'scene_composer', 'director']);
export const TRACE_EVENTS = Object.freeze(['attempt_started', 'continuation_started', 'prepared', 'validated', 'rejected', 'usage', 'attempt_failed', 'failed', 'committed', 'cancelled']);

function sourceManifest(value) {
  if (!value || typeof value !== 'object') return undefined;
  const ids = rows => Array.isArray(rows) ? rows.filter(id).slice(0, 128) : [];
  const result = {
    policyVersion: id(value.policyVersion) ? value.policyVersion : 'unknown',
    requiredObservationIds: ids(value.requiredObservationIds),
    deliveredObservationIds: ids(value.deliveredObservationIds),
    selected: Array.isArray(value.selected) ? value.selected.filter(row => row && ['observation', 'record'].includes(row.type) && id(row.id))
      .slice(0, 128).map(row => ({ type: row.type, id: row.id, sourceObservationIds: ids(row.sourceObservationIds) })) : [],
    skippedForBudget: count(value.skippedForBudget) ? value.skippedForBudget : 0,
    authorizedRecallCount: count(value.authorizedRecallCount) ? value.authorizedRecallCount : 0,
    candidates: Array.isArray(value.candidates) ? value.candidates.filter(row => row && ['observation', 'record'].includes(row.type) && id(row.id))
      .slice(0, 128).map(row => ({ type: row.type, id: row.id, sourceObservationIds: ids(row.sourceObservationIds), delivered: row.delivered === true })) : [],
  };
  if (Array.isArray(value.requiredCaseObservationIds)) result.requiredCaseObservationIds = ids(value.requiredCaseObservationIds);
  if (Array.isArray(value.observationPerformers)) result.observationPerformers = value.observationPerformers
    .filter(row => row && id(row.id) && /^person-[a-f0-9]{16}$/u.test(row.sourceActorHandle) && ['self', 'other'].includes(row.sourceRelation))
    .slice(0, 128).map(({ id, sourceActorHandle, sourceRelation }) => ({ id, sourceActorHandle, sourceRelation }));
  if (value.compression) result.compression = {
    ...(id(value.compression.policy) ? { policy: value.compression.policy } : {}),
    mode: value.compression.mode === 'auto' ? 'auto' : 'off', active: value.compression.active === true,
    sourceCount: count(value.compression.sourceCount) ? value.compression.sourceCount : 0,
    rawPacketBytes: count(value.compression.rawPacketBytes) ? value.compression.rawPacketBytes : 0,
    savedBytes: count(value.compression.savedBytes) ? value.compression.savedBytes : 0,
  };
  return result;
}

function sceneFrame(value) {
  if (!value || typeof value !== 'object' || isProxy(value) || Object.getPrototypeOf(value) !== Object.prototype) return undefined;
  const field = key => {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    return descriptor?.enumerable && Object.hasOwn(descriptor, 'value') ? descriptor.value : undefined;
  };
  const beat = field('beat'); const worldTime = field('worldTime'); const prefixHash = field('prefixHash');
  if (!Number.isSafeInteger(beat) || beat < 1 || beat > 3 || !Number.isSafeInteger(worldTime) || worldTime < 0
    || typeof prefixHash !== 'string' || !/^[a-f0-9]{64}$/u.test(prefixHash)) return undefined;
  return { beat, worldTime, prefixHash };
}
function decisionBudget(packet) {
  const policy = packet.decisionPolicy;
  return policy?.version === 2 ? { mode: policy.mode, updatesRemaining: policy.maxUpdates,
    utteranceChars: policy.maxUtteranceChars,
    relationshipRemaining: policy.relationshipBudget.map(row => ({ targetHandle: row.targetHandle, remaining: row.remaining })) } : undefined;
}

/** Hash the exact whitelist packet, not a parallel prompt builder. Private
 * bodies remain solely in the existing durable task input, never this trace. */
export function traceTask(task, manifest) {
  if (!ROLES.has(task.role)) throw new TypeError('Unsupported trace role.');
  const build = task.role === 'roleplay' ? buildRoleplayContext
    : task.role === 'character_data' ? buildCharacterDataContext : task.role === 'director' ? buildDirectorContext
      : task.role === 'world_adjudicator' ? buildServiceTaskContext : buildNarrativeContext;
  const packet = build(task.context, { maxBytes: task.maxBytes });
  const frame = sceneFrame(task.sceneFrame); const budget = decisionBudget(packet);
  return { version: 1, contextHash: hash(task.context), packetHash: hash(packet),
    ...(frame ? { sceneFrame: frame } : {}), ...(budget ? { decisionBudget: budget } : {}),
    promptHash: hash(task.behaviorPrompt || ''),
    ...(packet.systemPolicySeal ? { systemPolicySeal: validateSystemSeal(packet.systemPolicySeal) } : {}), packetBytes: bytes(packet), maxBytes: task.maxBytes,
    deliveredObservationIds: (packet.observations || packet.data?.recall?.observations || []).map(row => row.id),
    deliveredSourceHandleIds: (packet.recallSources || packet.data?.recall?.recallSources || []).map(row => row.id),
    ...(manifest ? { manifest: sourceManifest({ ...manifest,
      deliveredObservationIds: (packet.observations || packet.data?.recall?.observations || []).map(row => row.id) }) } : {}) };
}

export function traceRejection(value) {
  if (!value || typeof value !== 'object' || isProxy(value)
    || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) return {};
  const own = key => {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    return descriptor?.enumerable && Object.hasOwn(descriptor, 'value') ? descriptor.value : undefined;
  };
  const rule = own('rule');
  const allowed = ['structure', 'unlock', 'lock', 'movement', 'harm', 'lethal-action', 'death', 'wound', 'healing',
    'magic', 'compulsion', 'transfer', 'discovery', 'creation', 'arrival', 'other-action', 'social-result', 'private-reasoning', 'private-mind', 'private-action',
    'self-reference', 'foreign-appearance', ...MATERIAL_PROSE_FAILURE_RULES, ...NPC_HOST_FAILURE_RULES, ...NPC_HOST_TEXT_FAILURE_RULES, ...ROLEPLAY_DECISION_FAILURE_RULES, ...MODEL_PROPOSAL_FAILURE_RULES, ...SOFT_FAILURE_RULES, ...SERVICE_INTENT_FAILURE_RULES];
  if (!allowed.includes(rule)) return {};
  const result = { rule };
  for (const key of ['blockIndex', 'eventIndex']) {
    const index = own(key);
    if (Number.isSafeInteger(index) && index >= 0 && index <= 32) result[key] = index;
  }
  return result;
}

export function traceUsage(value) {
  const result = {};
  if (value?.wireSystemPolicySeal) {
    try { result.wireSystemPolicySeal = validateSystemSeal(value.wireSystemPolicySeal); } catch { /* Untrusted telemetry is omitted. */ }
  }
  for (const key of ['inputTokens', 'outputTokens', 'cacheReadTokens', 'cacheWriteTokens', 'requestBytes', 'packetBytes', 'compactSourceCount']) {
    if (count(value?.[key])) result[key] = value[key];
  }
  if (['openai', 'anthropic'].includes(value?.protocol)) result.protocol = value.protocol;
  if (['hit', 'miss', 'unknown'].includes(value?.cacheStatus)) result.cacheStatus = value.cacheStatus;
  if (Number.isFinite(value?.durationMs) && value.durationMs >= 0 && value.durationMs <= 86_400_000) result.durationMs = Math.round(value.durationMs);
  return result;
}

function softAttemptEdges(events) {
  const attempts = [];
  let current;
  for (const { sequence, kind, details } of events) {
    if (kind === 'attempt_started') {
      current = { reservedSequence: sequence, model: 'unknown', host: 'unknown' };
      attempts.push(current);
    } else if (kind === 'usage' && current) current.model = 'gateway-accepted';
    else if (kind === 'rejected' && current) current.firstRejectionSequence ??= sequence;
    else if (kind === 'attempt_failed') {
      if (!current) { current = { model: 'unknown', host: 'unknown' }; attempts.push(current); }
      const failure = traceFailure(details);
      current.failureSequence = sequence;
      current.model = failure.modelNotDispatched ? 'not-dispatched' : failure.httpStatus !== undefined ? 'http-observed'
        : current.model === 'gateway-accepted' ? current.model : failure.ordinaryDispatch === 'confirmed' ? 'dispatch-confirmed' : 'unknown';
      current.host = failure.phase === 'host_validation' ? 'rejected'
        : failure.hostValidationNotRun || failure.modelNotDispatched || ['candidate_json', 'proposal'].includes(failure.phase) ? 'not-run' : 'unknown';
      current = undefined;
    } else if (kind === 'validated' && current) {
      current.acceptedSequence = sequence;
      current.host = 'accepted';
      current = undefined;
    }
  }
  return attempts.slice(-12);
}
export function projectTaskTrace(task, events = []) {
  const trace = task.trace || traceTask(task, task.manifest);
  const selected = events.filter(event => event.slot === task.id);
  const attempts = task.id === 'soft:1' ? softAttemptEdges(selected) : [];
  return { id: task.id, role: task.role, actorId: task.actorId, status: task.terminal?.status || (task.result === undefined ? 'pending' : 'validated'),
    contextHash: trace.contextHash, packetHash: trace.packetHash, promptHash: trace.promptHash,
    ...(trace.systemPolicySeal ? { systemPolicySeal: validateSystemSeal(trace.systemPolicySeal) } : {}),
    packetBytes: trace.packetBytes, maxBytes: trace.maxBytes,
    ...(sceneFrame(trace.sceneFrame) ? { sceneFrame: sceneFrame(trace.sceneFrame) } : {}),
    ...(trace.decisionBudget ? { decisionBudget: { mode: trace.decisionBudget.mode,
      updatesRemaining: trace.decisionBudget.updatesRemaining, utteranceChars: trace.decisionBudget.utteranceChars,
      relationshipRemaining: trace.decisionBudget.relationshipRemaining.map(row => ({ targetHandle: row.targetHandle, remaining: row.remaining })) } } : {}),
    deliveredObservationIds: trace.deliveredObservationIds || [], deliveredSourceHandleIds: trace.deliveredSourceHandleIds || [],
    ...(trace.manifest ? { manifest: sourceManifest(trace.manifest) } : {}),
    ...(attempts.length ? { attempts } : {}),
    validation: { accepted: selected.filter(event => event.kind === 'validated').length,
      rejected: selected.filter(event => event.kind === 'rejected').length },
    failures: selected.filter(event => ['rejected', 'attempt_failed'].includes(event.kind)).slice(-12)
      .map(event => ({ sequence: event.sequence, kind: event.kind, ...traceFailure(event.details) })), 
    ...(selected.some(event => event.kind === 'usage') ? { usage: traceUsage(selected.findLast(event => event.kind === 'usage').details) } : {}) };
}

export const traceRequestRef = value => hash(value);
export const traceReview = value => {
  const result = {};
  if (id(value?.policy)) result.policy = value.policy;
  for (const key of ['adoptedHostMemories', 'adoptedSubjective', 'deferredSubjective', 'npcDecisions', 'deferredProposalCount', 'compositionRepairs', 'beats']) {
    if (count(value?.[key])) result[key] = value[key];
  }
  if (value?.presentationOrigin === 'host' && value.hostPresentationVersion === 1) {
    result.presentationOrigin = 'host'; result.hostPresentationVersion = 1;
  }
  return result;
};

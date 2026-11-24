import { ADMISSION_RUNTIME_REVISION } from './ordinary-admission32.mjs';
import { EVENT_DIRECTOR_RUNTIME_REVISION } from '../director/director-event-runtime.mjs';
import { adjudicationPolicy, validateRunBoundary } from '../content/effective-run-boundary.mjs';
import { PUBLICATION_RUNTIME_REVISION } from '../scenes/ordinary-publication31.mjs';
import { CAPACITY_RUNTIME_REVISION } from '../content/ordinary-capacity30.mjs';
import { KNOWN_TARGET_RUNTIME_REVISION } from '../content/relationship-context-policy.mjs';
import { supportsOpenPlayerAction } from './open-player-action.mjs';
import { validateCommunicationPlan } from './communication-selection30.mjs';
import { TRUSTED_COMMUNICATION_RUNTIME_REVISION } from '../content/relationship-context-policy.mjs';
import {SOURCE_ACQUISITION_RUNTIME_REVISION} from '../content/relationship-context-policy.mjs';
import {SCREEN_BROADCAST_RUNTIME_REVISION} from '../content/relationship-context-policy.mjs';
import { SOFT_PURPOSE, SOFT_SLOT, captureCooperativeRephrase, validateCooperativeRephraseCandidate, softBoundaryDiagnostic } from './cooperative-rephrase.mjs';
import { mergeHostSceneEvents, hostSceneDocument } from '../scenes/scene-document.mjs';
import { INTENT_RUNTIME_REVISION, CASE_BOUNDARY_RUNTIME_REVISION, SOFT_RUNTIME_REVISION, EXPLICIT_INTENT_RUNTIME_REVISION, ORDINARY_PLAN_RUNTIME_REVISION, SEMANTIC_ORDINARY_RUNTIME_REVISION, SEMANTIC_ADMISSION_RUNTIME_REVISION, INTENT_OBJECT_RUNTIME_REVISION, EXPLICIT_STANDARD_RUNTIME_REVISION, PLAN_CARDINALITY_RUNTIME_REVISION, UNIQUE_RECIPIENT_RUNTIME_REVISION, ATOMIC_SOURCE_RUNTIME_REVISION, LOSSLESS_PLAN_RUNTIME_REVISION, ATOMIC_PLAN_RUNTIME_REVISION, SOFT_REFERENCE_RUNTIME_REVISION, hasSoftRuntime, hasIntentRuntime, hasSemanticOrdinaryRuntime, hasIntentAdmissionRuntime } from '../content/relationship-context-policy.mjs';
import { validateIntentPlan, intentPlanDiagnostic, INTENT_PLAN_FAILURE_RULES } from './player-intent-contract.mjs';
import { isAuthoredMagicContext } from './authored-magic-intent.mjs';
import { INTENT_ADMISSION_PURPOSE, validateIntentAdmission, intentAdmissionDiagnostic, INTENT_ADMISSION_FAILURE_RULES } from './intent-admission-contract.mjs';
import { isDeepStrictEqual } from 'node:util';
import { relationshipPacketPolicy } from '../content/content-revisions.mjs';
import { RELATIONSHIP_CONTEXT_BUDGETS, relationshipContextPin } from '../content/relationship-context-policy.mjs';
import { isProxy } from 'node:util/types';
import { buildNarrativeContext, validateNarrativeOutput } from './narrative-boundaries.mjs';
import { validateSystemSeal } from '../cognition/dialogue-context-policy.mjs';
import { assertInitialRunPolicy, requiresInitialBoundaryReview, validateInitialBoundaryAssessments, initialBoundaryAssessmentDiagnostic, INITIAL_BOUNDARY_FAILURE_RULES } from '../content/initial-run-policy.mjs';

export const INITIAL_BOUNDARY_REVIEW_SLOT = 'initial-boundary-review';
export const WORLD_SERVICE_PRINCIPAL = 'host:world_adjudicator';
const principal = Object.freeze({ kind: 'service', id: 'world_adjudicator' });
export const SETUP_ASSISTANT_CONTRACT = Object.freeze({ principalId: 'host:setup_assistant', available: false,
  slot: 'relationships', sourceKind: 'creation-draft', codec: 'setup-relationships-candidate@1',
  maxInputBytes: 65536, maxOutputBytes: 49152, maxTokens: 4096, timeoutMs: 60000 });
export const SERVICE_INTENT_FAILURE_RULES = Object.freeze([...INTENT_ADMISSION_FAILURE_RULES, ...INTENT_PLAN_FAILURE_RULES, ...INITIAL_BOUNDARY_FAILURE_RULES, 'intent-service-scope', 'intent-service-output-cap']);
const SERVICE_OUTPUT_DIAGNOSTICS = new WeakMap();
export const serviceTaskOutputDiagnostic = error => SERVICE_OUTPUT_DIAGNOSTICS.get(error) ?? null;
const fail = (code = 'INVALID_AGENT_JOB', diagnostic) => {
  const error = Object.assign(new Error(code === 'SERVICE_UNAVAILABLE' ? '此宿主服务尚未开放。' : '宿主服务任务不符合固定主体、来源或输出契约。'), { code });
  if (diagnostic) SERVICE_OUTPUT_DIAGNOSTICS.set(error, diagnostic);
  throw error;
};
function record(value, fields, required = fields) {
  if (!value || typeof value !== 'object' || isProxy(value) || Object.getPrototypeOf(value) !== Object.prototype
    || Reflect.ownKeys(value).some(key => typeof key !== 'string' || !fields.includes(key)
      || !Object.getOwnPropertyDescriptor(value, key)?.enumerable
      || !Object.hasOwn(Object.getOwnPropertyDescriptor(value, key), 'value'))
    || required.some(key => !Object.hasOwn(value, key))) fail();
  return value;
}
const acquisitionGuidance = "Requesting that a present NPC invent or first tell a new explicitly fictional story is ordinary conversation, even when the request describes three ordered causal events. It does not select cooperative rephrasing of an already delivered story: do not demand existing source refs or a completion criterion for that acquisition request. Let the NPC freely respond, decline, or remain silent; do not assume a story was told. Only an actual invitation to jointly rephrase an existing heard script selects ordinaryAttempt and retains every authenticated-source, voluntary-participation, and independent completion-criterion requirement. This distinction explains the existing contract; it authorizes no action, consent, source, result or policy change.";
const dataFields = ['viewpointActorId', 'rawInput', 'scene', 'contractVersion', 'playerTextMagicVersion', 'magic',
  'playerTextSwapVersion', 'playerRuntimeSelfServiceVersion', 'playerRuntimeOfferedInspectionVersion',
  'postureActionVersion', 'postureActions', 'outputContractVersion', 'dialogueContextVersion', 'initialRunPolicy', 'intentContractVersion', 'runBoundary'];

export function requireServicePrincipal(id) {
  if (id !== 'world_adjudicator') fail('SERVICE_UNAVAILABLE');
  return principal;
}
function intentContext(packet) {
  const { viewpointActorId, initialRunPolicy, ...data } = packet.data;
  const pin = relationshipContextPin(packet).relationshipContextVersion === 1
    ? relationshipPacketPolicy(packet, initialRunPolicy) : {};
  return buildNarrativeContext({ role: 'intent_parser', ...pin, scope: { actorId: viewpointActorId,
    branchId: packet.scope.branchId, generation: packet.scope.generation, revision: packet.scope.revision }, data: pin.relationshipContextVersion === 1 ? { ...data, initialRunPolicy } : data });
}

// Wire reconstruction is not issuance authority. Engine/turn-store preflight
// independently proves this exact context belongs to the immutable root and job.
export function buildServiceTaskContext(input) {
  record(input, ['version', 'role', 'principal', 'slot', 'scope', 'data', 'systemPolicySeal', 'relationshipContextVersion', 'executionRevision', 'purpose'],
    ['version', 'role', 'principal', 'slot', 'scope', 'data']);
  record(input.principal, ['kind', 'id']);
  requireServicePrincipal(input.principal.id);
  if ([1, 2, 3, 4].includes(input.version) && Object.hasOwn(input, 'purpose')) fail();
  if (input.version === 5 || input.slot === SOFT_SLOT) return buildCooperativeRephraseContext(input);
  if (input.version === 4 || input.slot === INITIAL_BOUNDARY_REVIEW_SLOT) return buildInitialBoundaryReviewContext(input);
  record(input.data, [...dataFields, ...([6, 7].includes(input.version) ? ['ordinarySources', 'ordinarySourceSelection', 'acquisitionGuidance'] : []),
    ...(input.version === 7 ? ['authoredMagic', 'openActionVersion'] : [])], ['viewpointActorId', 'rawInput', 'scene', 'contractVersion', 'dialogueContextVersion', 'initialRunPolicy']);
  const relationship = relationshipContextPin(input).relationshipContextVersion === 1
    ? relationshipPacketPolicy(input, input.data.initialRunPolicy) : {};
  const soft = hasSoftRuntime(relationship.executionRevision?.revisionId);
  const admission = hasIntentAdmissionRuntime(relationship.executionRevision);
  if (soft ? input.purpose !== (admission ? INTENT_ADMISSION_PURPOSE : 'intent-plan@2') : Object.hasOwn(input, 'purpose')) fail();
  const intentPlan = hasIntentRuntime(relationship.executionRevision?.revisionId);
  if (intentPlan ? input.data.intentContractVersion !== (soft ? 2 : 1) : Object.hasOwn(input.data, 'intentContractVersion')) fail();
  if (input.version !== (admission ? 7 : soft ? 6 : intentPlan ? 3 : relationship.relationshipContextVersion === 1 ? 2 : 1) || input.role !== 'world_adjudicator' || input.principal.kind !== 'service' || input.slot !== 'intent') fail();
  record(input.scope, ['principalId', 'branchId', 'generation', 'revision']);
  if (input.scope.principalId !== WORLD_SERVICE_PRINCIPAL) fail();
  record(input.data, [...dataFields, ...([6, 7].includes(input.version) ? ['ordinarySources', 'ordinarySourceSelection', 'acquisitionGuidance'] : []),
    ...(input.version === 7 ? ['authoredMagic', 'openActionVersion'] : [])], ['viewpointActorId', 'rawInput', 'scene', 'contractVersion', 'dialogueContextVersion', 'initialRunPolicy']);
  if (input.data.contractVersion !== (admission ? 9 : soft ? 8 : intentPlan ? 5 : 4) || input.data.dialogueContextVersion !== 1) fail();
  if (Object.hasOwn(input.data, 'openActionVersion') && (input.data.openActionVersion !== 1
    || !supportsOpenPlayerAction(relationship.executionRevision?.revisionId))) fail();
  if (Object.hasOwn(input.data, 'authoredMagic') && !isAuthoredMagicContext(input.data.authoredMagic)) fail();
  if (typeof input.data.viewpointActorId !== 'string' || !input.data.viewpointActorId
    || typeof input.scope.branchId !== 'string' || !input.scope.branchId
    || !Number.isSafeInteger(input.scope.generation) || input.scope.generation < 1
    || !Number.isSafeInteger(input.scope.revision) || input.scope.revision < 0) fail();
  if (intentPlan && (typeof input.data.rawInput !== 'string' || !input.data.rawInput.trim() || input.data.rawInput.length > 2000
    || !input.data.scene || Object.getPrototypeOf(input.data.scene) !== Object.prototype
    || !Array.isArray(input.data.scene.nearby) || !Array.isArray(input.data.scene.adjacent))) fail();
  const policy = assertInitialRunPolicy(input.data.initialRunPolicy);
  validateRunBoundary(input.data, relationship.executionRevision?.revisionId);
  if (policy === undefined || policy.version !== (relationship.relationshipContextVersion === 1 ? 2 : 1)) fail();
  if (soft) validateOrdinarySources(input.data.ordinarySources, relationship.executionRevision?.revisionId);
  if (hasSemanticOrdinaryRuntime(relationship.executionRevision))
    validateOrdinarySourceSelection(input.data.ordinarySourceSelection, input.data.ordinarySources);
  else if (Object.hasOwn(input.data, 'ordinarySourceSelection')) fail();
  const semanticOrdinary = relationship.executionRevision?.revisionId === SEMANTIC_ORDINARY_RUNTIME_REVISION;
  if (Object.hasOwn(input.data, 'acquisitionGuidance') && (!semanticOrdinary || input.data.acquisitionGuidance !== acquisitionGuidance)) fail();
  const { viewpointActorId, initialRunPolicy, ...intentData } = input.data;
  if (semanticOrdinary) intentData.acquisitionGuidance = acquisitionGuidance;
  const intent = intentPlan ? { scope: { actorId: viewpointActorId }, data: intentData } : intentContext(input);
  const packet = Object.freeze({ version: admission ? 7 : soft ? 6 : intentPlan ? 3 : relationship.relationshipContextVersion === 1 ? 2 : 1, role: 'world_adjudicator', principal, slot: 'intent', ...(soft ? { purpose: admission ? INTENT_ADMISSION_PURPOSE : 'intent-plan@2' } : {}), ...relationship,
    scope: Object.freeze({ ...input.scope }),
    data: Object.freeze({ viewpointActorId: intent.scope.actorId, ...intent.data, initialRunPolicy: policy }),
    ...(Object.hasOwn(input, 'systemPolicySeal') ? { systemPolicySeal: Object.freeze(validateSystemSeal(input.systemPolicySeal)) } : {}) });
  const packetBytes = Buffer.byteLength(JSON.stringify(packet), 'utf8');
  const packetLimit = relationship.relationshipContextVersion === 1 ? RELATIONSHIP_CONTEXT_BUDGETS.narrative : 48000;
  if (packetBytes > packetLimit) {
    if (hasSemanticOrdinaryRuntime(relationship.executionRevision))
      throw Object.assign(new Error('本次完整意图上下文超过固定字节容量；没有裁剪来源正文，也没有把容量不足说成缺少来源。'),
        { code: 'INVALID_AGENT_JOB', reason: 'context_capacity_exceeded', limitBytes: packetLimit, actualBytes: packetBytes });
    fail();
  }
  return packet;
}

export function validateServiceTaskOutput(context, candidate, scope = context.scope) {
  const packet = buildServiceTaskContext(context);
  if (!isDeepStrictEqual(packet.scope, scope)) fail('INVALID_AGENT_OUTPUT', Object.freeze({ rule: 'intent-service-scope' }));
  try {
    if (packet.version === 5) return validateCooperativeRephraseCandidate(candidate, packet.data);
    if (packet.version === 4) {
      record(candidate, ['type', 'summary', 'assessments']);
      if (candidate.type !== 'initial_boundary_review' || typeof candidate.summary !== 'string' || !candidate.summary.trim()
        || candidate.summary.length > 400 || /[<>\u0000-\u001f\u007f]/u.test(candidate.summary)) fail('INVALID_AGENT_OUTPUT');
      validateInitialBoundaryAssessments(adjudicationPolicy(packet.data), candidate.assessments);
      return structuredClone(candidate);
    }
    const output = packet.version === 7 ? validateCommunicationPlan(validateIntentAdmission(candidate, packet.data), packet.data)
      : [3, 6].includes(packet.version) ? validateIntentPlan(candidate, packet.data)
      : validateNarrativeOutput(intentContext(packet), candidate);
    if (Buffer.byteLength(JSON.stringify(output), 'utf8') > ([3, 6, 7].includes(packet.version) ? 16384 : 6000)) fail('INVALID_AGENT_OUTPUT', Object.freeze({ rule: 'intent-service-output-cap' }));
    return output;
  } catch (error) { fail('INVALID_AGENT_OUTPUT', softBoundaryDiagnostic(error) ?? intentAdmissionDiagnostic(error) ?? intentPlanDiagnostic(error) ?? initialBoundaryAssessmentDiagnostic(error) ?? serviceTaskOutputDiagnostic(error)); }
}

// This is the SAME service principal, with one finite source-authenticated
// pre-publication slot. Proposals/reviews never enter the world as actions.
export function initialBoundaryReviewProposal(tasks) {
  const scene = tasks.find(task => task.id === 'scene');
  const document = tasks.find(task => task.id === 'scene-repair')?.result || scene?.result
    || (scene?.outputContractVersion === 1 ? hostSceneDocument(scene.context.data.events) : undefined);
  if (!document || !scene?.context?.data?.events) fail();
  return { performances: tasks.filter(task => task.role === 'player_performance' && task.result)
    .map(task => ({ slot: task.id, result: { action: task.result.action, ...(task.result.utterance ? { utterance: task.result.utterance } : {}) } })),
    scene: structuredClone(mergeHostSceneEvents(document, scene.context.data.customEventIds || [])), events: structuredClone(scene.context.data.events) };
}
function buildInitialBoundaryReviewContext(input) {
  record(input.data, ['viewpointActorId', 'proposed', 'contractVersion', 'dialogueContextVersion', 'initialRunPolicy', 'runBoundary'],
    ['viewpointActorId', 'proposed', 'contractVersion', 'dialogueContextVersion', 'initialRunPolicy']);
  record(input.scope, ['principalId', 'branchId', 'generation', 'revision']);
  const policy = assertInitialRunPolicy(input.data.initialRunPolicy);
  const relationship = relationshipPacketPolicy(input, policy);
  validateRunBoundary(input.data, relationship.executionRevision?.revisionId);
  if (![CASE_BOUNDARY_RUNTIME_REVISION, SOFT_RUNTIME_REVISION, EXPLICIT_INTENT_RUNTIME_REVISION, ORDINARY_PLAN_RUNTIME_REVISION, SEMANTIC_ORDINARY_RUNTIME_REVISION, SEMANTIC_ADMISSION_RUNTIME_REVISION, INTENT_OBJECT_RUNTIME_REVISION, EXPLICIT_STANDARD_RUNTIME_REVISION, PLAN_CARDINALITY_RUNTIME_REVISION, UNIQUE_RECIPIENT_RUNTIME_REVISION, ATOMIC_SOURCE_RUNTIME_REVISION, LOSSLESS_PLAN_RUNTIME_REVISION, ATOMIC_PLAN_RUNTIME_REVISION, SOFT_REFERENCE_RUNTIME_REVISION, SCREEN_BROADCAST_RUNTIME_REVISION, SOURCE_ACQUISITION_RUNTIME_REVISION, TRUSTED_COMMUNICATION_RUNTIME_REVISION, KNOWN_TARGET_RUNTIME_REVISION, CAPACITY_RUNTIME_REVISION, PUBLICATION_RUNTIME_REVISION, ADMISSION_RUNTIME_REVISION, EVENT_DIRECTOR_RUNTIME_REVISION].includes(relationship.executionRevision?.revisionId) || !requiresInitialBoundaryReview(adjudicationPolicy(input.data))
    || input.version !== 4 || input.role !== 'world_adjudicator' || input.principal.kind !== 'service'
    || input.slot !== INITIAL_BOUNDARY_REVIEW_SLOT || input.scope.principalId !== WORLD_SERVICE_PRINCIPAL
    || typeof input.scope.branchId !== 'string' || !input.scope.branchId
    || !Number.isSafeInteger(input.scope.generation) || input.scope.generation < 1
    || !Number.isSafeInteger(input.scope.revision) || input.scope.revision < 0
    || input.data.contractVersion !== 6 || input.data.dialogueContextVersion !== 1
    || typeof input.data.viewpointActorId !== 'string' || !input.data.viewpointActorId) fail();
  record(input.data.proposed, ['performances', 'scene', 'events']);
  if (!Array.isArray(input.data.proposed.performances) || input.data.proposed.performances.length > 3
    || !input.data.proposed.performances.length || !Array.isArray(input.data.proposed.events)) fail();
  const packet = Object.freeze({ ...input, ...relationship, principal,
    data: Object.freeze({ ...input.data, initialRunPolicy: policy }), scope: Object.freeze({ ...input.scope }),
    ...(Object.hasOwn(input, 'systemPolicySeal') ? { systemPolicySeal: Object.freeze(validateSystemSeal(input.systemPolicySeal)) } : {}) });
  if (Buffer.byteLength(JSON.stringify(packet), 'utf8') > RELATIONSHIP_CONTEXT_BUDGETS.narrative) fail();
  return packet;
}

// Diagnostics describe only the authenticated bounded window, never hidden older
// history or an assertion that all heard statements are fictional/authorized actions.
export function validateOrdinarySourceSelection(selection, sources) {
  record(selection, ['status', 'capacity', 'maxSelected', 'scanned', 'eligibleInWindow', 'oversizeInWindow', 'mayHaveEarlier']);
  if (selection.capacity !== 16 || selection.maxSelected !== 3 || !Number.isSafeInteger(selection.scanned) || selection.scanned < 0 || selection.scanned > 33
    || !Number.isSafeInteger(selection.eligibleInWindow) || selection.eligibleInWindow < 0
    || !Number.isSafeInteger(selection.oversizeInWindow) || selection.oversizeInWindow < 0
    || selection.eligibleInWindow + selection.oversizeInWindow > selection.scanned
    || selection.mayHaveEarlier !== (selection.scanned === 33)
    || sources.length !== Math.min(16, selection.eligibleInWindow)) fail();
  const status = selection.eligibleInWindow ? selection.eligibleInWindow > 16 ? 'bounded_selection' : selection.eligibleInWindow > 3 ? 'selection_required' : 'available'
    : selection.oversizeInWindow ? 'source_capacity_exceeded' : 'no_candidate_in_window';
  if (selection.status !== status && !(selection.status === 'unavailable_body' && selection.scanned === 0)) fail();
  return structuredClone(selection);
}
export function validateOrdinarySources(sources, revisionId) {
  const semantic = hasSemanticOrdinaryRuntime(revisionId);
  if (!Array.isArray(sources) || isProxy(sources) || sources.length > (semantic ? 16 : 3) || Reflect.ownKeys(sources).length !== sources.length + 1) fail();
  let chars = 0; const refs = new Set();
  for (const source of sources) {
    record(source, ['ref', 'text']);
    if (typeof source.ref !== 'string' || !(semantic ? /^s(?:[1-9]|1[0-6])$/u : /^s[1-3]$/u).test(source.ref) || refs.has(source.ref)
      || typeof source.text !== 'string' || !source.text.trim() || (!semantic && !['虚构练习短文：', '这是虚构练习：'].some(prefix => source.text.includes(prefix))) || source.text.length > 512
      || /[<>\u0000-\u001f\u007f]/u.test(source.text)) fail();
    refs.add(source.ref); chars += source.text.length;
  }
  if (chars > (semantic ? 8192 : 1536)) fail(); return structuredClone(sources);
}
function buildCooperativeRephraseContext(input) {
  if (input.version !== 5 || input.role !== 'world_adjudicator' || input.slot !== SOFT_SLOT || input.purpose !== SOFT_PURPOSE
    || input.principal.kind !== 'service') fail();
  record(input.scope, ['principalId', 'branchId', 'generation', 'revision']);
  if (input.scope.principalId !== WORLD_SERVICE_PRINCIPAL || typeof input.scope.branchId !== 'string'
    || !Number.isSafeInteger(input.scope.generation) || input.scope.generation < 1
    || !Number.isSafeInteger(input.scope.revision) || input.scope.revision < 0) fail();
  record(input.data, ['contractVersion', 'dialogueContextVersion', 'initialRunPolicy', 'viewpointActorId', 'attempt', 'scriptSpeakers', 'prefix', 'sources']);
  const relationship = relationshipPacketPolicy(input, input.data.initialRunPolicy);
  if (!hasSoftRuntime(relationship.executionRevision?.revisionId) || input.data.contractVersion !== 7
    || input.data.dialogueContextVersion !== 1 || typeof input.data.viewpointActorId !== 'string') fail();
  const policy = assertInitialRunPolicy(input.data.initialRunPolicy);
  // Candidate validator authenticates exact finite source DTOs without inventing
  // a dummy outcome or requiring a model result at input construction time.
  validateCooperativeRephraseCandidate({ type: 'ordinary_attempt_unresolved', version: 1, attemptRef: 'a1',
    reason: 'insufficient_source', sourceRefs: input.data.sources.map(row => row.ref) }, input.data);
  record(input.data.prefix, ['baseCommitRef', 'stage', 'receiptHash', 'stateHash']);
  if (!Number.isSafeInteger(input.data.prefix.stage) || input.data.prefix.stage < 0 || input.data.prefix.stage > 3
    || !['receiptHash', 'stateHash'].every(key => /^[a-f0-9]{64}$/u.test(input.data.prefix[key]))) fail();
  const packet = { version: 5, role: 'world_adjudicator', principal, slot: SOFT_SLOT, purpose: SOFT_PURPOSE,
    ...relationship, scope: { ...input.scope }, data: { ...structuredClone(input.data), initialRunPolicy: policy },
    ...(Object.hasOwn(input, 'systemPolicySeal') ? { systemPolicySeal: validateSystemSeal(input.systemPolicySeal) } : {}) };
  if (Buffer.byteLength(JSON.stringify(packet), 'utf8') > 49152) fail();
  return Object.freeze(packet);
}

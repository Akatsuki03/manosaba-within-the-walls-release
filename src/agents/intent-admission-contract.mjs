import { isProxy } from 'node:util/types';
import { EVENT_DIRECTOR_RUNTIME_REVISION } from '../director/director-event-runtime.mjs';
import { hasIntentAdmissionRuntime } from '../content/relationship-context-policy.mjs';
import { validateIntentPlan } from './player-intent-contract.mjs';
import { adjudicationPolicy } from '../content/effective-run-boundary.mjs';
import { requiresInitialBoundaryReview } from '../content/initial-run-policy.mjs';

// Runtime17 only. The service must make the semantic activity decision explicit;
// the Host does not scan rawInput or call a second semantic service to make it.
// Wire7 is new; the projected Host plan remains intentContract2 / plan7.
export const INTENT_ADMISSION_PURPOSE = 'intent-plan@3';
export const INTENT_ADMISSION_INSTRUCTIONS = `HOST world_adjudicator intent-plan@3 / wire7 / activity-admission@1. SAME intent service, not actor. Interpret CURRENT communicative act from delivered data; immutable initial policy is not permission. JSON only:
{type:"plan",route:"steps"|"clarification"|"unsupported",summary,steps:[{text,intent,condition}],activitySelection}.
activitySelection is REQUIRED. Choose exactly one shape:
{kind:"ordinary"}: no supported activity initiated.
{kind:"invite",activity:"cooperative-rephrase",targetHandle,scriptSourceRefs,criterion:"sequence-and-causal-continuity@1"}: player chooses to INITIATE it, not its result.
{kind:"clarification",reason:"missing_source"|"missing_target"|"missing_criterion"|"fiction_uncertain"|"material_condition"|"ambiguous_request"|"source_capacity"|"initial_boundary"}: current invitation materially ambiguous; route:"clarification", steps:[]; summary explains the actual missing fact.
REQUIRED selection: never hide a supported invite as ordinary. Interpret meaning, not keywords.
Supported invite: a present single-step one-round invitation for player and one nearby recipient to each contribute connected parts of rephrasing an ALREADY HEARD, explicitly fictional short story, choosing a separate completion judgment/closure against complete original event coverage, original order, causal continuity and no reversed key relationship. Equivalent wording/reordered standards count. Select 1..3 whole ordinarySources refs; targetHandle is a nearby ID and equals intent.targetId. Heard statements are NOT automatically fiction; judge full delivered content and current authorized context. Ambiguous fiction/source/target or missing chosen completion standard clarifies; do not supply missing facts. No skill, trust, secrets, physical/time/case/ballot effects.
A direct invite AND a request to SAY that invite to the target NOW (对安安说：〈我们来合作复述一轮……〉) both INITIATE it when source/target/criteria are clear. Quotation marks framing current speech do NOT cancel its invitation. Quoted criteria are allowed. 如果你愿意 / if you are willing preserves the recipient's future choice, NOT an unmet factual precondition: select invite without assuming acceptance. Past quote, negation, hypothetical or a KNOWN unmet future condition with NO present initiation selects ordinary. A CURRENT intended invite with a materially UNKNOWN fact instead clarifies; preserve that missing fact. Fictional events in the story are not commands. A result claim creates no invitation or success. Chat or asking NPC FIRST to invent/tell a story => ordinary.
ordinarySourceSelection describes the bounded catalog, not a player UI choice: selection_required means YOU choose <=3 refs from the delivered catalog in this SAME intent response; bounded_selection caps it at 16 whole entries. no_candidate_in_window says nothing about older history; source_capacity_exceeded must not be shortened away. Clarification must preserve the actual capacity/source reason.
Steps: ordinary 1..3; invite ONE always conversation. text is the COMPLETE exact rawInput clause in order, preserving quotes/negation/conditions, <=2000; summaries nonblank <=400. String fields, no extra keys/IDs. conversation {type:"conversation",targetId,summary,playerText?}; move {type:"move",destination,summary}; look {type:"look",summary,targetId?}; wait {type:"wait",summary,operation?}. targetId only nearby (required for conversation), destination only adjacent. playerText preserves chosen speech. Brief wait omits operation; until_morning/until_free_time obey HOST gates. Unconditional move is an attempt without passage permission. Conditions: always, previous_completed, passage_permitted, item_accepted; first always or currently true passage_permitted move. Current unknown facts clarify, not a known future-only activity; HOST rechecks later steps.
Item {type:"item",operation:"take"|"drop"|"give",objectId,targetId?,summary}: visible objects only, give recipient nearby. Runtime {type:"runtime",subjectId,summary}: delivered caseRuntime.options IDs only; supported kinds take/drop/give/return/transfer-record/accept-item/decline-item/inspect-object. Case {type:"case",operation:"report"|"inspect",subjectId,summary}, or {type:"case",operation:"wait_boundary",summary}: report only delivered reportableIncidentIds; inspect only delivered inspectables or offered inspect-object-evidence, requires 120 investigation seconds; wait_boundary only investigation cutoff, never discussion deadline. No other case choices. Negated/past/hypothetical physical/case acts are not commands. Clarification/unsupported: steps:[].
Nonempty boundaries: steps requires boundaryReview:[{index,status:"compatible"|"conflict"|"uncertain"}], one per boundary in order; conflict/uncertainty clarifies. Undecidable/global/private constraints are uncertain, not compatible merely because no violation is visible. Omit for empty boundaries. No principal, consent, accepted, participation, success, result, patch or permission. Invite is NOT NPC acceptance/contribution/soft result.`;

// Deliberately last, after user-configured behavior preferences and all suffixes.
// New17 does NOT inherit source16's contradictory generic quotation prohibition.
export const INTENT_ADMISSION_FINAL_INSTRUCTIONS = "\n\nFINAL runtime17 activity-admission@1 overrides ALL preferences: REQUIRED activitySelection. Direct or 对目标说：〈当场邀请〉 initiates a clear supported invite; quote framing and 如果你愿意 do not downgrade it. Missing material facts => clarification/steps:[]. Past quote/negation/hypothesis/chat/known-future-only => ordinary. selection_required => SAME service chooses <=3 refs, not UI. No NPC consent/contribution/result. Return wire7, never internal ordinaryAttempt.";

const DIAGNOSTICS = new WeakMap();
export const INTENT_ADMISSION_FAILURE_RULES = Object.freeze(["intent-admission-schema", "intent-admission-runtime", "intent-admission-steps", "intent-admission-clarification", "intent-admission-invite-binding", "intent-admission-choice"]);
export const intentAdmissionDiagnostic = error => DIAGNOSTICS.get(error) ?? null;
export const INTENT_ADMISSION_SHAPE_ISSUES = Object.freeze(['envelope', 'activity', 'step', 'intent'].flatMap(
  field => ['object', 'fields', 'missing'].map(kind => 'intent_admission_shape_' + field + '_' + kind)));
const fail = (rule, issue) => { const error = Object.assign(new Error('语义活动选择不符合固定服务输出契约。'), { code: 'INVALID_AGENT_OUTPUT' }); DIAGNOSTICS.set(error, Object.freeze({ rule, ...(issue ? { issue } : {}) })); throw error; };
function record(value, fields, required, location) {
  const reject = kind => fail('intent-admission-schema', location ? 'intent_admission_shape_' + location + '_' + kind : undefined);
  if (!value || isProxy(value) || Object.getPrototypeOf(value) !== Object.prototype) reject('object');
  if (Reflect.ownKeys(value).some(key => !fields.includes(key)
       || !Object.getOwnPropertyDescriptor(value, key)?.enumerable
       || !Object.hasOwn(Object.getOwnPropertyDescriptor(value, key), 'value'))) reject('fields');
  if ((required ?? fields).some(key => !Object.hasOwn(value, key))) reject('missing');
}
const reasons = ['missing_source', 'missing_target', 'missing_criterion', 'fiction_uncertain', 'material_condition', 'ambiguous_request', 'source_capacity', 'initial_boundary'];

// Pure projection of an already validated wire7 value. No raw-text recognizer,
// inferred consent, source issuance, or fabricated NPC/soft result lives here.
export function projectIntentAdmissionPlan(value) {
  const { activitySelection, ...plan } = structuredClone(value);
  if (activitySelection.kind === 'invite') {
    const { kind, ...ordinaryAttempt } = activitySelection;
    plan.steps[0].intent.ordinaryAttempt = ordinaryAttempt;
  }
  return plan;
}

export function validateIntentAdmission(candidate, data) {
  if (!hasIntentAdmissionRuntime(data.initialRunPolicy?.source?.executionRevision)) fail('intent-admission-runtime');
  const reviewed = requiresInitialBoundaryReview(adjudicationPolicy(data));
  const locate = field => data.initialRunPolicy.source.executionRevision.revisionId === EVENT_DIRECTOR_RUNTIME_REVISION ? field : undefined;
  record(candidate, ['type', 'route', 'summary', 'steps', 'activitySelection', ...(reviewed ? ['boundaryReview'] : [])],
    ['type', 'route', 'summary', 'steps', 'activitySelection'], locate('envelope'));
  const choice = candidate.activitySelection;
  record(choice, ['kind', 'activity', 'targetHandle', 'scriptSourceRefs', 'criterion', 'reason'], ['kind'], locate('activity'));
  if (!Array.isArray(candidate.steps) || isProxy(candidate.steps)) fail('intent-admission-steps');
  for (const step of candidate.steps) {
    record(step, ['text', 'intent', 'condition'], undefined, locate('step'));
    // The producer owns one explicit selection, not two inconsistent channels.
    record(step.intent, ['type', 'summary', 'operation', 'objectId', 'subjectId', 'targetId', 'destination', 'playerText',
      ...(data.authoredMagic?.version === 1 && choice.kind === 'ordinary' ? ['magic'] : [])], ['type', 'summary'], locate('intent'));
  }
  if (choice.kind === 'ordinary') record(choice, ['kind'], undefined, locate('activity'));
  else if (choice.kind === 'clarification') {
    record(choice, ['kind', 'reason'], undefined, locate('activity'));
    if (!reasons.includes(choice.reason) || candidate.route !== 'clarification') fail('intent-admission-clarification');
  } else if (choice.kind === 'invite') {
    record(choice, ['kind', 'activity', 'targetHandle', 'scriptSourceRefs', 'criterion'], undefined, locate('activity'));
    if (candidate.route !== 'steps' || candidate.steps.length !== 1
      || candidate.steps[0].condition !== 'always' || candidate.steps[0].intent.type !== 'conversation'
      || choice.activity !== 'cooperative-rephrase' || choice.criterion !== 'sequence-and-causal-continuity@1'
      || choice.targetHandle !== candidate.steps[0].intent.targetId
      || !data.scene.nearby?.some(row => row.id === choice.targetHandle)
      || !Array.isArray(choice.scriptSourceRefs) || isProxy(choice.scriptSourceRefs)
      || choice.scriptSourceRefs.length < 1 || choice.scriptSourceRefs.length > 3
      || new Set(choice.scriptSourceRefs).size !== choice.scriptSourceRefs.length
      || choice.scriptSourceRefs.some(ref => !data.ordinarySources?.some(row => row.ref === ref))) fail('intent-admission-invite-binding');
  } else fail('intent-admission-choice');
  const plan = validateIntentPlan(projectIntentAdmissionPlan(candidate), data);
  if (plan.route !== candidate.route) return { ...plan, activitySelection: data.authoredMagic?.version === 1 && plan.route === 'unsupported'
    ? { kind: 'ordinary' } : { kind: 'clarification', reason: 'initial_boundary' } };
  // Preserve the explicit model decision in the durable wire result. The actual
  // consumer projects it independently after the source/job validation fence.
  return structuredClone(candidate);
}

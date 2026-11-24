import { ADMISSION_RUNTIME_REVISION } from './ordinary-admission32.mjs';
import { EVENT_DIRECTOR_RUNTIME_REVISION } from '../director/director-event-runtime.mjs';
import { PUBLICATION_RUNTIME_REVISION } from '../scenes/ordinary-publication31.mjs';
import { CAPACITY_RUNTIME_REVISION } from '../content/ordinary-capacity30.mjs';
import { KNOWN_TARGET_RUNTIME_REVISION } from '../content/relationship-context-policy.mjs';
import { TRUSTED_COMMUNICATION_RUNTIME_REVISION } from '../content/relationship-context-policy.mjs';
import {SOURCE_ACQUISITION_RUNTIME_REVISION} from '../content/relationship-context-policy.mjs';
import {SCREEN_BROADCAST_RUNTIME_REVISION} from '../content/relationship-context-policy.mjs';
import { hasSoftRuntime, hasSemanticOrdinaryRuntime } from '../content/relationship-context-policy.mjs';
import { adjudicationPolicy } from '../content/effective-run-boundary.mjs';
import { requiresInitialBoundaryReview, validateInitialBoundaryAssessments, initialMechanismDecision } from '../content/initial-run-policy.mjs';
import { isProxy } from 'node:util/types';
import { isAuthoredMagicContext, validAuthoredMagicIntent } from './authored-magic-intent.mjs';

// Selected only by the source-authenticated @11 service. A plan is not a result.
export const PLAYER_INTENT_INSTRUCTIONS = 'Intent contract1 / wire3: Return only {type:"plan",route:"steps"|"clarification"|"unsupported",summary,steps:[{text,intent,condition}]}. Maximum three ordered steps. text is the exact complete authorized clause from rawInput, retaining negation, quotes and conditions. Quoted/negated/hypothetical actions are NOT commands. Supported intent: {type:"item",operation:"take"|"drop"|"give",objectId,targetId?,summary}; or currently delivered {type:"runtime",subjectId,summary}; or existing move/conversation/look/wait fields. Bind objectId only to scene.objects[].id (already visible and delivered); caseRuntime.options exposes only id/label/kind, never object/target metadata. Bind runtime subjectId to current options and targets to nearby participants. Later steps may refer to the same visible object; HOST re-resolves its current menu. condition: always, previous_completed, passage_permitted, item_accepted. Important ambiguity or unsupported effect returns steps:[]. Offer is not acceptance, custody, knowledge or permission: the actual recipient decides. Never output accepted/outcome/patch/source/authority/principal/commit. Initial natural-language boundaries without a HOST consumer require clarification, not a claim they were enforced.';
const PLAYER_CASE_INTENT_INSTRUCTIONS = '\nOnly contract2/source13 also supports these EXACT case choices: {type:"case",operation:"report"|"inspect",subjectId,summary}, or {type:"case",operation:"wait_boundary",summary}. report subjectId must be a delivered scene.case.reportableIncidentIds entry, never a host incident or another owner discovery. inspect subjectId must be a delivered scene.case.inspectables[].id, or scene.objects[].id with its currently delivered inspect-object-evidence option; inspect-object only looks at an object and is NOT evidence acquisition. Inspection requires 120 story seconds remaining in investigation. wait_boundary is only the current investigation cutoff, never the discussion deadline. Do not output inspectionEvidenceVersion, targetId, effects, sources, evidence, outcomes or permission fields. HOST revalidates the current owner, body, scene, stage, object offer and cutoff for EACH step; an unavailable later step does not execute. Quoted, negated or hypothetical report/inspection/wait requests are not commands. No present, testimony, ballot, execution confirmation or other case operation is supported by this natural plan.';
export const PLAYER_INTENT_V2_INSTRUCTIONS = PLAYER_INTENT_INSTRUCTIONS + '\nIntent contract2 / wire6 / intent-plan@2: Only an explicit single-step invitation for a one-round two-person cooperative rephrasing of an explicitly fictional short story may have intent.ordinaryAttempt:{activity:"cooperative-rephrase",targetHandle,scriptSourceRefs,criterion:"sequence-and-causal-continuity@1"}. Choose scriptSourceRefs only from delivered ordinarySources[].ref and targetHandle only from scene.nearby[].id; intent.targetId must equal that handle. No exact repetition/counting, trust/consent/skill/secret/permission, physical effect, time, case or ballot consequences. Raw authorized clause must explicitly choose one round, contributions from both participants, and a separate completion judgment or closure against ordered coverage and causal continuity without reversing the key relationship. For example, 各接一部分，按“顺序与因果承接完整、没有把关键关系说反”收束此次练习 is valid; never require an invented verbatim passphrase. Without the original completion question and standard, or when only quoted, negated or hypothetical, clarify before performance; the service cannot supply or authorize them itself. Mixed steps must clarify before any enactment. Omit ordinaryAttempt on ordinary dialogue. The activity is a selection, never a result.' + PLAYER_CASE_INTENT_INSTRUCTIONS;
// Current plan instructions make the already-supported ordinary fields explicit.
// Keep both original exported strings above byte-for-byte for exact pending seals.
const PLAYER_INTENT_FIELDS_INSTRUCTIONS = '\nOrdinary intent shapes (only ? fields are optional): move {type:"move",destination,summary}; conversation {type:"conversation",targetId,summary,playerText?}; look {type:"look",summary,targetId?}; wait {type:"wait",summary,operation?}. These values are strings. destination is ONLY scene.adjacent[].id, never a label, destinationId or targetId. targetId is ONLY scene.nearby[].id and is required for conversation; never put a room there. playerText only preserves the player\'s explicitly chosen speech/writing, not new words or permission; omit it for mere movement, observation or waiting. Brief wait omits operation; until_morning/until_free_time remain subject to the existing HOST long-wait and case/confinement gates. Return the plan object above, not a bare intent; every step has text, intent and condition. First condition is always unless the player explicitly requires passage_permitted; later conditions use only the listed contract values. Missing/ambiguous target or destination clarifies with steps:[], not an invented id or extra field. HOST alone settles permission and results.';
export const PLAYER_INTENT_COMPLETE_INSTRUCTIONS = PLAYER_INTENT_INSTRUCTIONS + PLAYER_INTENT_FIELDS_INSTRUCTIONS;
export const PLAYER_INTENT_V2_COMPLETE_INSTRUCTIONS = "Intent contract2 / wire6 / intent-plan@2: Return only {type:\"plan\",route:\"steps\"|\"clarification\"|\"unsupported\",summary,steps:[{text,intent,condition}]}; max3 ordered steps. Summaries<=400, text<=2000, nonempty strings without angle/control characters. text is the exact complete authorized rawInput clause in order; retain negation/quotes/conditions. Quoted, negated or hypothetical actions are not commands. Ambiguous bindings/effects clarify or unsupported with steps:[]; never invent IDs/extra fields.\nOrdinary intent shapes (? optional): move {type:\"move\",destination,summary}; conversation {type:\"conversation\",targetId,summary,playerText?}; look {type:\"look\",summary,targetId?}; wait {type:\"wait\",summary,operation?}. These fields are strings. destination is ONLY scene.adjacent[].id, not label/destinationId/targetId. targetId is ONLY scene.nearby[].id, required for conversation, never a room. playerText preserves explicitly chosen speech/writing only; otherwise omit, never invent speech or consent. wait omits operation or uses until_morning/until_free_time under existing HOST wait/case/confinement gates.\nItem {type:\"item\",operation:\"take\"|\"drop\"|\"give\",objectId,targetId?,summary}: objectId only scene.objects[].id; give targetId only nearby. Runtime {type:\"runtime\",subjectId,summary}: subjectId only current scene.caseRuntime.options[].id; labels are not IDs or hidden object/target metadata. Supported runtime kinds: take/drop/give/return/transfer-record/accept-item/decline-item/inspect-object; other mechanisms unsupported. Later steps may reuse a visible object; HOST re-resolves its actual current offer/menu.\nConditions: always, previous_completed, passage_permitted, item_accepted. First condition is always, or passage_permitted for a move in scene.permittedDestinations; absent prior completion/acceptance or unmet passage clarifies with steps:[]. HOST rechecks later conditions/availability before each step. An offer is not acceptance, custody, knowledge or permission; the recipient decides.\nOnly contract2 on this authenticated source supports case {type:\"case\",operation:\"report\"|\"inspect\",subjectId,summary} or {type:\"case\",operation:\"wait_boundary\",summary}. report binds scene.case.reportableIncidentIds, never host incidents/other owners' discoveries. inspect binds scene.case.inspectables[].id or scene.objects[].id with its delivered inspect-object-evidence option; object inspection is not evidence acquisition. report/inspect require daily/discovery/investigation/aftermath; investigation report needs remainingSeconds>0, inspect>=120. wait_boundary requires investigation remainingSeconds>0 and means its cutoff, not discussion deadline. No other case operation, present/testimony/ballot/execution confirmation. Never output targetId/inspectionEvidenceVersion/effects/evidence/sources/permission for case; HOST revalidates owner/body/scene/stage/offer/cutoff per step.\nOnly an explicitly chosen single-step conversation invitation for one round of two-person cooperative rephrasing of an explicitly fictional short story may add intent.ordinaryAttempt:{activity:\"cooperative-rephrase\",targetHandle,scriptSourceRefs,criterion:\"sequence-and-causal-continuity@1\"}. targetHandle is scene.nearby[].id and equals intent.targetId; scriptSourceRefs are1-3 unique delivered ordinarySources[].ref. Use ONE conversation step with text equal to COMPLETE rawInput, including unquoted choice, assessment and standards; do not split them into other steps. Raw choice must select both contributions (e.g. 各接一部分/我先说), one round, and a separate original completion judgment/closure: complete original ordered event coverage, causal/key-relationship consistency without reversal, and effective linkage of both contributions. Quoted standards may be evidence, quoted invitations are not choices. No invented question/standard or verbatim password. Missing, ambiguous, negated/hypothetical choices or mixed steps clarify before any performance. Omit ordinaryAttempt on ordinary dialogue. No exact repetition/counting, trust/consent/skill/secrets, physical/time/case/ballot consequences; selection is not a result.\nNever output accepted/outcome/patch/source/authority/principal/commit or change initial policy. HOST alone settles actions, consequences and permission.";
// Authenticated source15 only; append after style preferences, without changing issued instructions.
export const PLAYER_ORDINARY_PLAN15_FINAL_INSTRUCTIONS = "\nFinal source15 rules (override style): Ordinary commands allow 1..3 ordered steps; single-step/mixed-step limits concern cooperative invitations only. Brief wait (等待片刻) is wait without operation. Unconditional move attempts bind scene.adjacent IDs even if not permitted; HOST checks movement/arrival. These alone do not require clarification. Explicit first-step conditions require current truth. Quotes/negation/hypotheses are not commands.";
// @16 only: the existing intent service interprets language; Host still owns
// the actual source, target, lease, typed choice, contribution and commit checks.
export const PLAYER_SEMANTIC_ORDINARY16_INSTRUCTIONS = PLAYER_INTENT_COMPLETE_INSTRUCTIONS + PLAYER_CASE_INTENT_INSTRUCTIONS + '\nSource16 ordinary invitation: interpret meaning, not a passphrase. Source16 retains the contract2 case choices above. A single voluntary invitation for one round of two-person cooperative rephrasing may select ordinaryAttempt:{activity:"cooperative-rephrase",targetHandle,scriptSourceRefs,criterion:"sequence-and-causal-continuity@1"}. Select only delivered ordinarySources refs and a delivered nearby target; targetId must equal targetHandle. The complete authorized raw clause must choose both contributions and a separate completion assessment against original ordered event coverage, preserved causal relations and a valid connection between contributions. Equivalent formulations and reordered standards are valid. A conditional invitation such as if you are willing is not an assertion of consent; the actual recipient must still choose and contribute. Quotation, negation, hypothetical performance or an unresolved material condition is not a choice: clarify rather than enact it. A quoted criterion is allowed when the surrounding clause actually selects it. Do not reject an invitation merely because its quoted fictional story mentions a sensitive action. ordinarySourceSelection describes only a bounded window: selection_required means choose at most three from the complete catalog; bounded_selection means the catalog itself is capped at sixteen whole sources rather than missing; source_capacity_exceeded means text could not fit and must not be shortened; no_candidate_in_window is not proof about older hidden history. Preserve the actual reason in clarification. Sources are authenticated heard statements, NOT automatically fiction: select only when their complete delivered content and authorized current context establish an explicitly fictional exercise. Ambiguous fiction status, unclear source selection, absent standard or unsupported consequences require clarification with no steps. Never infer fiction from a prefix, name or room. The catalog contains at most sixteen complete sources; select at most three complete script sources; do not truncate them or assert missing sources merely because more may exist. The target need not have spoken before invitation. This is not permission, acceptance, a real-world effect or a result. Do not add a second judgment task. Ordinary non-cooperative commands retain one to three steps; the single-step limit applies only to cooperative invitations.';
const DIAGNOSTICS = new WeakMap();
export const INTENT_PLAN_FAILURE_RULES = Object.freeze(["intent-plan-schema", "intent-plan-shape", "intent-plan-step", "intent-plan-clause-gap", "intent-plan-activity-gate", "intent-plan-kind", "intent-plan-case", "intent-plan-item", "intent-plan-runtime-binding", "intent-plan-destination", "intent-plan-target", "intent-plan-clause-tail"]);
export const intentPlanDiagnostic = error => DIAGNOSTICS.get(error) ?? null;
const fail = rule => { const error = Object.assign(new Error('自然意图计划字段或授权绑定无效。'), { code: 'INVALID_AGENT_OUTPUT' }); DIAGNOSTICS.set(error, Object.freeze({ rule })); throw error; };
function record(value, fields, required = fields) {
  if (!value || isProxy(value) || Object.getPrototypeOf(value) !== Object.prototype
    || Reflect.ownKeys(value).some(key => !fields.includes(key) || !Object.getOwnPropertyDescriptor(value, key)?.enumerable
      || !Object.hasOwn(Object.getOwnPropertyDescriptor(value, key), 'value'))
    || required.some(key => !Object.hasOwn(value, key))) fail('intent-plan-schema');
}
const text = (value, max = 2000) => typeof value === 'string' && value.trim() && value.length <= max && !/[<>\u0000-\u001f\u007f]/u.test(value);
export function validateIntentPlan(candidate, { rawInput, scene, initialRunPolicy, intentContractVersion, ordinarySources, runBoundary, authoredMagic }) {
  const canCastAuthoredMagic = intentContractVersion === 2 && isAuthoredMagicContext(authoredMagic);
  const boundary = adjudicationPolicy({ initialRunPolicy, runBoundary });
  const soft = hasSoftRuntime(initialRunPolicy?.source?.executionRevision?.revisionId) && intentContractVersion === 2;
  const semanticOrdinary = hasSemanticOrdinaryRuntime(initialRunPolicy?.source?.executionRevision?.revisionId);
  const screen26 = [SCREEN_BROADCAST_RUNTIME_REVISION, SOURCE_ACQUISITION_RUNTIME_REVISION, TRUSTED_COMMUNICATION_RUNTIME_REVISION, KNOWN_TARGET_RUNTIME_REVISION, CAPACITY_RUNTIME_REVISION, PUBLICATION_RUNTIME_REVISION, ADMISSION_RUNTIME_REVISION, EVENT_DIRECTOR_RUNTIME_REVISION].includes(initialRunPolicy?.source?.executionRevision?.revisionId);
  const reviewed = requiresInitialBoundaryReview(boundary);
  record(candidate, ['type', 'route', 'summary', 'steps', ...(reviewed ? ['boundaryReview'] : [])], ['type', 'route', 'summary', 'steps']);
  if (candidate.type !== 'plan' || !['steps', 'clarification', 'unsupported'].includes(candidate.route)
    || !text(candidate.summary, 400) || !Array.isArray(candidate.steps) || isProxy(candidate.steps)
    || candidate.steps.length > 3 || candidate.route === 'steps' && !candidate.steps.length
    || candidate.route !== 'steps' && candidate.steps.length) fail('intent-plan-shape');
  if (reviewed && (candidate.route === 'steps' || Object.hasOwn(candidate, 'boundaryReview'))) {
    if (!validateInitialBoundaryAssessments(boundary, candidate.boundaryReview))
      return { type: 'plan', route: 'clarification', summary: '这项请求与本局初始边界冲突或尚不能确定兼容；请澄清当前请求。初始边界没有被更改，动作没有执行。', steps: [] };
  }
  const objects = new Set((scene.objects || []).map(row => row.id));
  let cursor = 0;
  for (const step of candidate.steps) {
    record(step, ['text', 'intent', 'condition']);
    if (!text(step.text) || !['always', 'previous_completed', 'passage_permitted', 'item_accepted'].includes(step.condition)) fail('intent-plan-step');
    const offset = rawInput.indexOf(step.text, cursor);
    if (offset < 0 || rawInput.slice(cursor, offset).replace(/[，,；;。\s]/gu, '')) fail('intent-plan-clause-gap');
    cursor = offset + step.text.length;
    record(step.intent, ['type', 'summary', 'operation', 'objectId', 'subjectId', 'targetId', 'destination', 'playerText', ...(soft ? ['ordinaryAttempt'] : []), ...(canCastAuthoredMagic ? ['magic'] : [])], ['type', 'summary']);
    const intent = step.intent;
    if (Object.hasOwn(intent, 'ordinaryAttempt')) {
      if (!soft) fail('intent-plan-activity-gate');
      if (candidate.steps.length !== 1 || step.condition !== 'always')
        return { type: 'plan', route: 'clarification', summary: '请把本次合作复述作为单独的一步明确选择；没有执行本轮任何步骤。', steps: [] };
      const selected = intent.ordinaryAttempt;
      record(selected, ['activity', 'targetHandle', 'scriptSourceRefs', 'criterion']);
      if (semanticOrdinary && (intent.type !== 'conversation' || selected.activity !== 'cooperative-rephrase'
        || selected.criterion !== 'sequence-and-causal-continuity@1' || selected.targetHandle !== intent.targetId
        || !scene.nearby?.some(row => row.id === selected.targetHandle)
        || !Array.isArray(selected.scriptSourceRefs) || isProxy(selected.scriptSourceRefs)
        || selected.scriptSourceRefs.length < 1 || selected.scriptSourceRefs.length > 3
        || new Set(selected.scriptSourceRefs).size !== selected.scriptSourceRefs.length
        || selected.scriptSourceRefs.some(ref => !ordinarySources?.some(row => row.ref === ref))))
        return { type: 'plan', route: 'clarification', summary: '请明确本次邀请的在场对象及已实际听到的有限短文来源；没有执行，也没有替对方选择。', steps: [] };
      // Issued @13..15 keep their exact legacy admission, including pending jobs.
      if (!semanticOrdinary) {
      // Only this activity's finite explicit requirements; quoted criteria remain
      // evidence, but quoted invitations cannot choose participation/judgment.
      const choice = rawInput.replace(/“[^”]*”|‘[^’]*’|「[^」]*」|『[^』]*』|"[^"]*"|'[^']*'/gu, '');
      // Four short propositions of this fixed criterion, not complete-sentence passwords.
      // Quoted standards are allowed; the activity/assessment choice below is not.
      const standards = rawInput.split(/[，,。；;、：:“”‘’「」『』"'！？!?\n]/u);
      const complete = value => /完整|齐全|全部|三(?:段|件|个)/u.test(value);
      const ordered = value => /顺序|次序|先后/u.test(value);
      const causal = value => /因果|关键关系/u.test(value);
      const linked = value => /承接|接续|衔接|接起来|接上/u.test(value);
      const compact = standards.some(value => ordered(value) && causal(value) && linked(value) && complete(value));
      const coverage = compact || standards.some(value => /事件|三件事|三段|原文|原故事|短文/u.test(value)
        && /覆盖|复述/u.test(value) && complete(value));
      const sequence = standards.some(value => ordered(value)
        && /按原|不颠倒|不反转|不弄反|不打乱|完整|正确|一致/u.test(value));
      const causality = standards.some(value => causal(value)
        && /一致|正确|完整|不说反|不颠倒|不反转|没有把.{0,12}说反/u.test(value));
      const contributionLink = standards.some(value => /双方|两人|彼此/u.test(value) && linked(value)
        && /有效|完整|一致|能|起来|接上/u.test(value))
        || compact && /各接一部分/u.test(choice);
      // A negated positive token is not a selected standard. Keep correct
      // negative requirements (不颠倒 / 不说反 / 没有把关键关系说反) legal.
      const contrary = value => /不管|不必|无需|忽略|不用|不正确|不一致|不完整|不齐全/u.test(value)
        || /(?:不|未)(?:按|依照|遵循).{0,8}(?:顺序|次序)/u.test(value)
        || /(?:不|未)(?:完整)?覆盖/u.test(value)
        || /(?:无|没有|缺乏|不能|无法).{0,8}(?:承接|接续|衔接)/u.test(value);
      const criterion = coverage && sequence && causality && contributionLink
        && !standards.some(value => contrary(value) && /顺序|次序|因果|覆盖|承接|接续|衔接/u.test(value));
      const assessment = /(?:判断|评估|核对)(?:本轮|本次|这次|此次|这轮)(?:复述|练习)?的?(?:完成度|完整度|是否完整)/u.test(choice)
        || /收束(?:本次|此次|这次|本轮|这轮)(?:练习|复述)/u.test(choice);
      if (intent.type !== 'conversation' || selected.activity !== 'cooperative-rephrase'
        || selected.criterion !== 'sequence-and-causal-continuity@1' || selected.targetHandle !== intent.targetId
        || !scene.nearby?.some(row => row.id === selected.targetHandle)
        || !Array.isArray(selected.scriptSourceRefs) || isProxy(selected.scriptSourceRefs)
        || selected.scriptSourceRefs.length < 1 || selected.scriptSourceRefs.length > 3
        || new Set(selected.scriptSourceRefs).size !== selected.scriptSourceRefs.length
        || selected.scriptSourceRefs.some(ref => !ordinarySources?.some(row => row.ref === ref))
        || !/(?:合作|一起|共同)/u.test(choice) || !/(?:换说法|换个说法|改写)/u.test(choice)
        || !/(?:复述|接续)/u.test(choice) || !/(?:只(?:做|进行)?一轮|只(?:做|进行)?一次)/u.test(choice)
        || !/(?:各接一部分|我先说)/u.test(choice) || !assessment || !criterion
        || /(?:不要|不必|不需要|无需|不做|不进行|并非|不是|未选择|没有选择|假如|假设|如果|只(?:是|想)(?:引用|转述)|仅仅?(?:引用|转述))/u.test(choice)
        || /(?:^|[，,；;。！？!?\s])(?:请)?别/u.test(choice) || /(?:逐字|复读|数到|信任|同意|技能|秘密|给我|开门|杀|治伤|魔力|庭审|投票|处刑|推进时间)/u.test(rawInput))
        return { type: 'plan', route: 'clarification', summary: '请单独明确选择双方自愿的三段虚构短文合作换说法复述，并在原话中选择本轮独立完成度判断及三段原顺序覆盖、因果一致、双方贡献有效承接的标准；没有执行发言或其它后果。', steps: [] };
      }
    }
    const mechanism = intent.type === 'runtime' ? scene.caseRuntime?.options.find(row => row.id === intent.subjectId)?.kind : intent.type;
    if (initialMechanismDecision(boundary, mechanism, { semantic: true }))
      return { type: 'plan', route: 'clarification', summary: '这项机制与本局明确的初始边界冲突；没有执行，也没有把结果改成无伤版本。', steps: [] };
    if (canCastAuthoredMagic && intent.type === 'magic') {
      if (!text(intent.summary, 400) || !validAuthoredMagicIntent(intent, scene, rawInput, authoredMagic)
        || candidate.steps.length !== 1 || step.condition !== 'always' || step.text !== rawInput)
        return { type: 'plan', route: 'unsupported', summary: '本次没有执行魔法。同行须有明确的在场对象、目的地和当下手部接触。', steps: [] };
      continue;
    }
    if (Object.hasOwn(intent, 'magic') || !text(intent.summary, 400) || !['item', 'runtime', 'move', 'conversation', 'look', 'wait', ...(soft ? ['case'] : []), ...(screen26 ? ['broadcast'] : [])].includes(intent.type)) fail('intent-plan-kind');
    if (screen26 && intent.type === 'broadcast') {
      record(intent, ['type', 'summary']);
      if (scene.screenAvailable !== true) fail('intent-plan-kind');
    }
    if (intent.type === 'case') {
      const wait = intent.operation === 'wait_boundary';
      record(intent, ['type', 'operation', 'summary', ...(wait ? [] : ['subjectId'])]);
      const c = scene.case;
      if (c?.kind !== 'causal' || !['report', 'inspect', 'wait_boundary'].includes(intent.operation)) fail('intent-plan-case');
      if (intent.operation === 'report' && (!['daily', 'discovery', 'investigation', 'aftermath'].includes(c.stage)
        || !c.reportableIncidentIds?.includes(intent.subjectId) || c.stage === 'investigation' && !(c.remainingSeconds > 0))) fail('intent-plan-case');
      if (intent.operation === 'inspect' && (!['daily', 'discovery', 'investigation', 'aftermath'].includes(c.stage)
        || !(c.inspectables?.some(row => row.id === intent.subjectId)
          || scene.objects?.some(row => row.id === intent.subjectId)
            && scene.caseRuntime?.options.some(row => row.kind === 'inspect-object-evidence' && row.id === `inspect-object-evidence:${intent.subjectId}`))
        || c.stage === 'investigation' && !(c.remainingSeconds >= 120))) fail('intent-plan-case');
      if (wait && (c.stage !== 'investigation' || !(c.remainingSeconds > 0))) fail('intent-plan-case');
    }
    if (intent.type === 'item' && (!['take', 'drop', 'give'].includes(intent.operation) || !objects.has(intent.objectId)
      || intent.operation === 'give' && !scene.nearby?.some(row => row.id === intent.targetId))) fail('intent-plan-item');
    if (intent.type === 'runtime') {
      const option = scene.caseRuntime?.options.find(row => row.id === intent.subjectId);
      if (!option) fail('intent-plan-runtime-binding');
      if (!['take', 'drop', 'give', 'return', 'transfer-record', 'accept-item', 'decline-item', 'inspect-object'].includes(option.kind))
        return { type: 'plan', route: 'unsupported', summary: '这项机制尚未接入当前自然行动合同；没有执行该操作。', steps: [] };
    }
    if (candidate.steps[0] === step && step.condition !== 'always'
      && !(step.condition === 'passage_permitted' && intent.type === 'move' && scene.permittedDestinations.includes(intent.destination)))
      return { type: 'plan', route: 'clarification', summary: '尚无实际成立的前序条件；请先确认当前要执行的步骤。', steps: [] };
    if (intent.type === 'move' && !scene.adjacent?.some(row => row.id === intent.destination)) fail('intent-plan-destination');
    if (intent.targetId && !scene.nearby?.some(row => row.id === intent.targetId)) fail('intent-plan-target');
    if (!semanticOrdinary && ['item', 'runtime', 'move', ...(soft ? ['case'] : [])].includes(intent.type) && (/[「」“”"']/u.test(step.text)
      || /(?:不要|不打算|没有|不曾|别|勿|假如|假设)/u.test(step.text) || /如果/u.test(step.text) && step.condition === 'always')) {
      return { type: 'plan', route: 'clarification', summary: '请确认这是要执行的动作，还是引用、否定或尚未成立的条件。', steps: [] };
    }
  }
  if (candidate.route === 'steps' && rawInput.slice(cursor).replace(/[。！!\s]/gu, '')) fail('intent-plan-clause-tail');
  return structuredClone(candidate);
}
export function firstPlanIntent(value) { return value?.type === 'plan' ? value.steps[0]?.intent : value; }
// hostOptions is supplied only by the current-state HOST bridge, never a model packet.
export function resolvePlanStep(step, scene, hostOptions = []) {
  if (step.intent.type !== 'item') { const { ordinaryAttempt, ...intent } = step.intent; return structuredClone(intent); }
  if (!scene.objects?.some(row => row.id === step.intent.objectId)) return null;
  const offered = new Set((scene.caseRuntime?.options || []).map(row => row.id));
  const choice = hostOptions.find(row => offered.has(row.id) && row.objectId === step.intent.objectId
    && (step.intent.operation === 'give' ? ['give', 'return', 'transfer-record'].includes(row.kind) && row.targetId === step.intent.targetId : row.kind === step.intent.operation));
  return choice ? { type: 'runtime', subjectId: choice.id, summary: step.intent.summary } : null;
}

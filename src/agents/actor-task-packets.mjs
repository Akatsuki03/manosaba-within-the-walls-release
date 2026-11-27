import { communicationSelection, isCommunicationRuntime, ordinaryAddressRequiresVerbatim } from './communication-selection30.mjs';
import { INTENT_RUNTIME_REVISION, CASE_BOUNDARY_RUNTIME_REVISION, hasIntentRuntime } from '../content/relationship-context-policy.mjs';
import { assembleRagContext, assembleDecisionContext } from '../cognition/rag-context.mjs';
import { RELATIONSHIP_CONTEXT_BUDGETS, isRelationshipRuntime, relationshipContextPin } from '../content/relationship-context-policy.mjs';
import { buildRoleplayContext } from './agent-boundaries.mjs';
import { buildNarrativeContext } from './narrative-boundaries.mjs';
import { chosenPlayerSpeech } from './narrative-guards.mjs';
import { dialogueContextPin } from '../cognition/dialogue-context-policy.mjs';
import { assertInitialRunPolicy } from '../content/initial-run-policy.mjs';
import { buildServiceTaskContext } from './service-task-contract.mjs';
import { modelSystemPolicySeal, modelPacketCapacity } from './model-gateway.mjs';
import { actorForState, createdPlayerId, isCreatedCustom, usesRelationshipSetup, relationshipSetupForState } from '../creation/player-setup.mjs';
import { isKnowledgeGated, recognizesPerson } from '../characters/actor-knowledge.mjs';
import { actorHandle, recognizedActors } from '../characters/actor-perception.mjs';
import { approvedAddressActorIds, approvedSpeakerLabel, cocoHasAffection, hasCharacterAddressPolicy, projectAddressVoice } from './character-address-policy.mjs';
import { runtimeOptions, runtimePhysicalActor } from '../case-runtime.mjs';
import { policyForActor } from './actor-performance-policy.mjs';
import { playerPerformanceGuidance, roleplayGuidance } from './persona-guidance.mjs';
import { decisionActorInput, projectSocialRequests } from './agent-autonomy.mjs';
import { runtimeRevisionForState } from '../content/content-revisions.mjs';
import { deriveSituationalGoalTemplates } from '../cognition/decision-state.mjs';
import { authoredMagicContext } from './authored-magic-intent.mjs';
import { novelNarrationFocusTaskPin } from '../scenes/scene-event-policy.mjs';
import { dialogueSequencePerformance } from './player-address-resolution.mjs';

// Pure persona-boundary projection for the NPC magic decision packet. Policy 1
// and 2 retain their historical literal replacements; policy 3 is captured only
// into a newly-created ordinary job, and the packet replaces the legacy text
// only when the real Host menu supplies both actions and targets. None of this
// authorizes a cast: refusal, speech and waiting stay legal, and the Host still
// settles every actual action.
export const NPC_MAGIC_PERSONA_POLICY_VERSION_V3 = 3;
export const NPC_MAGIC_PERSONA_BOUNDARY_V1 = '本轮仅可对实际交付的可执行魔法菜单作结构化提议；读取他人心声、爆炸、他人的能力及其他未列在菜单中的魔法仍不可执行；是否使用由本人决定，拒绝、发言或等待同样合法；提议效果只由宿主裁决。';
export const NPC_MAGIC_PERSONA_BOUNDARY_V2 = `${NPC_MAGIC_PERSONA_BOUNDARY_V1}旧背景中关于“本轮不执行/不能执行”的旧版试运行说明，不再额外禁止本任务菜单明确提供的这次魔法提议；以当前菜单和宿主实际结算条件为准。这不改写本人过去经历或先前拒绝，也不开放菜单以外的能力。`;
export const NPC_MAGIC_PERSONA_BOUNDARY_V3 = `${NPC_MAGIC_PERSONA_BOUNDARY_V1}旧背景中关于“本轮不执行/不能执行”的旧版试运行说明，不再额外禁止本任务菜单明确提供的这次魔法提议；以当前菜单和宿主实际结算条件为准，当前菜单实际列出的动作及其目标优先，未列出的能力仍不可执行。这不改写本人过去经历或先前拒绝。`;
export const NPC_MAGIC_PERSONA_BOUNDARY_SOUND_V1 = '本轮声音模仿与其他魔法不可执行，也不具备读取别人心声的权限。';
export const NPC_MAGIC_PERSONA_BOUNDARY_FIRE_V1 = '本轮点火、爆炸与其他魔法不可执行，不能宣告物体已被烧毁。';
export const NPC_MAGIC_PERSONA_BOUNDARY_MEDICAL_V1 = '本轮只交谈、移动、观察，治疗与再生均不可执行，不宣告伤势已消失。';
export const NPC_MAGIC_PERSONA_BOUNDARY_STRENGTH_V1 = '本轮怪力与其他魔法不可执行，不宣告已打破物品或伤害任何人。';
const NPC_MAGIC_PERSONA_BOUNDARY_REPLACEMENTS = new Map([
  [NPC_MAGIC_PERSONA_BOUNDARY_SOUND_V1, [NPC_MAGIC_PERSONA_BOUNDARY_V1, NPC_MAGIC_PERSONA_BOUNDARY_V2, NPC_MAGIC_PERSONA_BOUNDARY_V3]],
  [NPC_MAGIC_PERSONA_BOUNDARY_FIRE_V1, [NPC_MAGIC_PERSONA_BOUNDARY_V1, NPC_MAGIC_PERSONA_BOUNDARY_V2, NPC_MAGIC_PERSONA_BOUNDARY_V3]],
  [NPC_MAGIC_PERSONA_BOUNDARY_MEDICAL_V1, [null, null, NPC_MAGIC_PERSONA_BOUNDARY_V3]],
  [NPC_MAGIC_PERSONA_BOUNDARY_STRENGTH_V1, [null, null, NPC_MAGIC_PERSONA_BOUNDARY_V3]],
]);
export function npcMagicPersonaBoundaries(boundaries, policyVersion = 1) {
  if (!Array.isArray(boundaries) || ![1, 2, 3].includes(policyVersion)) return boundaries;
  return boundaries.map(text => NPC_MAGIC_PERSONA_BOUNDARY_REPLACEMENTS.get(text)?.[policyVersion - 1] ?? text);
}
/** Menu-gated packet projection: without both a real action list and at least
 * one actual target the historical persona text is returned unchanged. */
export function npcMagicPersonaPacketBoundaries(boundaries, policyVersion, menu) {
  if (!Array.isArray(menu?.actions) || !Array.isArray(menu.targets)
    || menu.actions.length === 0 || menu.targets.length === 0) return boundaries;
  return npcMagicPersonaBoundaries(boundaries, policyVersion);
}

/** Actual task serialization shared by admission and task persistence. No DB,
 * authority issuance, jobs, provider calls or budget estimation. Inputs are
 * private engine-derived task bases and Domain-authorized owner retrieval. */
export function assemblePlayerTaskRecall(retrieval, persona, location) {
  return assembleRagContext({ retrieval, role: 'roleplay', persona,
    situation: { locationLabel: location, perceivedParticipants: [] }, allowedActions: [] }, { maxBytes: retrieval.relationshipContextVersion === 1 ? RELATIONSHIP_CONTEXT_BUDGETS.playerRecall : 16000 });
}
// Scoped guidance for newly materialized tasks only. Bytes are saved through
// the ordinary task behavior field, so already materialized tasks keep their
// exact prompt. This neither rewrites proposed actions nor changes validation.
export function firstOfferReliabilityGuidance(task, revision, firstOfferVersion) {
  if (revision !== 'agent-prison-runtime@33') return '';
  const { id, role, context } = task;
  if (role === 'world_adjudicator' && id === 'intent' && context.version === 7) {
    const grounding = [11, 12, 13, 14].includes(firstOfferVersion) ? "\n\n感官观察分栏：当前没有要另行辨认的人或物时，留意当下的声音、光影、气味或附近环境是普通感官观察；未知的观察结果不是缺少行动目标。对于这样的单请求，用 ordinary 和一个 always 的 look 步，环境观察不加 targetId，逐字覆盖完整原话。不提前宣称感知结果，不擅自改为触碰、物证检查、移动或发问；实际缺失目标、受限或歧义仍依法澄清、拒绝或保留条件。" : '';
    const multi = typeof context.data.rawInput === 'string' && /[，,；;。][^\s，,；;。]/u.test(context.data.rawInput);
    const copying = multi ? '\n\n原话覆盖检查（先分步骤，再从原句抄边界）：step.text 是 data.rawInput 的连续原文切片，不是 summary。第一步从原句的第一个非空、非分隔字符开始；下一步从上一步紧接的文字开始，间隙只可省略空白或 ， , ； ; 。 这五种标点。诸如“先/接着/如果/抵达后/再”、方位、目的、引号、语气文字都不能留在间隙；按原位置归入覆盖它的那一步，就算 summary 不复述它。最后一步一直抄到结尾，末尾也只能省略上述分隔符。用逐段对应检查，不能换词、压缩、加省略号或重排。示例原话“先看看告示；如果走得通，就去门边。抵达后再看看地面。”，相应三个原样 text 是“先看看告示”、“如果走得通，就去门边”、“抵达后再看看地面”，保留原条件；示例不是现场动作或许可，不照抄进结果。如果确有必要澄清，维持原有 clarification 契约，不能用它代替这种分栏。' : '';
    if (!Array.isArray(context.data.scene?.nearby) || context.data.scene.nearby.length !== 0) return copying + grounding;
    return copying + grounding + '\n\n空场目标分栏：scene.nearby 没有任何人物句柄。环境 look 只要 type 与 summary，不填 targetId；不是地点、物件、视线方向或玩家自己的 ID，也不要填 null 或占位。地点只用于规则允许的 move.destination，物件只用当前契约中独立的物件字段。若原话确实要求与未提供的人互动，不改成观察来代替，也不猜句柄。每步仍原样覆盖玩家原话并保留当前准入条件。';
  }
  if (role === 'roleplay' && /^npc:/u.test(id) && context.decisionPolicy?.mode === 'act'
      && context.npcActPreflightVersion === 8) {
    return "\n\n实际台词分栏：utterance 只填角色此刻实际说出或写下的字，不加说话者前缀、括号动作、星号动作或情绪旁白。比如写 \"utterance\":\"我先听听。\"，不能写 \"（她压低声音）我先听听。\"。若自主选择发言或书写，仍须有对应许可、真实 operation 与来源；可见动作只能在 gesture 获准且在上限内放入 action。只等待、观察或移动时，不补台词。复核规则与其他字段不变。\n当前目标引用：从同一包 decisionContext.goals 中找 status 恰为 active 的一项，原样抄它的 id 到 decision.goalId。即使 wait 也要这样选，不能填目标标题、策略、别的角色或旧回合的 id，也不能填示例占位。选择哪一个当前目标和采取什么获准操作仍由角色决定；来源列只使用同包已交付观察。\n结构补充：最外层和 decision、operation 都是 JSON 对象；不写 null、未知字段或整包数组。decision.sourceObservationIds 是同包 ID 字符串的数组；可选的 stateUpdates 无实际更新时省略，不能写空对象或占位字段。不要把动作或台词再包一层。\n写完前逐字核对 utterance：如果把这串字读出或写下，是否每一个字都真由角色说写？连续多句可以保留，但只写一段纯原话。错误：\"「我在听。」她点点头。「请继续。」\"；纯台词：\"我在听。请继续。\"。真实引用词句可保留『』，不是演出。本人安静、停顿、眨眼、表情和心理不能当作原话，不用括号或星号塞进台词。如果确有许可且角色选择呈现可见动作，另填 action；不要为了模板另造动作、删掉交流或改成等待。";
  }
  if (role === 'player_performance' && firstOfferVersion >= 13 && context.data.intent?.type === 'case'
      && context.data.intent.operation === 'inspect') {
    return '\n\n本槽是宿主已选定的目视案件检查。action 只写从当前地点用眼睛察看所选目标的可见部分，例如“我抬眼细看眼前可见的部分。”不触碰、不翻动、不打开、不拿取，不额外走近或宣称新增痕迹；检查记录与结果由宿主另行结算。只检查时不增加台词，仍只输出当前演绎契约的 JSON。';
  }
  if (role === 'player_performance' && context.data.visualPerformanceSystemVersion === 2
      && context.data.performanceVersion === 2) {
    const later = /^performance:[12]$/u.test(id)
      ? '\n当前包只演绎这一个视觉步骤。原话若以“抵达后”或“到了那里以后”引出观察，抵达是前序步骤的条件，不是此步要再表演的移动。只从 scene 所给位置观察；不再写走过、进门、靠到别处或刚抵达。' : '';
    return '\n\n观察演绎分栏：本步只返回一个 JSON 对象；action 是必填非空字符串（最多 1200 字符，不含尖括号或控制字符）。只有需要时才加字符串 reflection；没有发言时省略 utterance。不输出 null、数组或额外字段，不加代码围栏。action 只写旁人可以看到的当下动作，例如 {"action":"我在原地抬眼扫视四周。"}。原话中的私下目的、悬念、推测或打算，不是可见动作；确需表现时只写可选的 reflection，例如 {"action":"我抬眼看去。","reflection":"我想弄清那一处为何显眼。"}。不要把“我打算/我觉得/我怀疑”等想法接到 action 里，不需要填空的 reflection。仍只表现本步已裁决的观察，不抢写后续步骤、发现、接触或结果；玩家明确选定的真实发言仍按既有契约逐字保留。' + later;
  }
  return '';
}

// Explain the existing material-contact constraint on the first delivery of a
// new, opt-in visual task. This does not add actions or rewrite model output.
const VISUAL_PERFORMANCE_GUIDANCE = '\n视觉演绎边界（宿主已裁决）：普通观察不等于触碰。只表现当前 intent 已准许的观察；不得擅加触摸、拿取、移动或翻动。看见物品不表示已经接触或操作。其他动作示例只展示 JSON 字段结构，不授权改变本次行动。';
export function playerPerformanceTaskData(state, plan, rawInput, intent, scene, cognition, recall) {
  const playerId = createdPlayerId(state), player = actorForState(state, playerId);
  const visual = ['look', 'inspect', 'examine'].includes(intent.type);
  const authoredMagic = authoredMagicContext(state, plan);
  const sequence = dialogueSequencePerformance(rawInput, scene, intent, plan.ordinaryDialogueSequenceVersion);
  const deliveryInput = sequence?.rawInput ?? rawInput;
  const addressPin = { ...([1, 2, 3].includes(plan.ordinaryAddressVersion) ? { ordinaryAddressVersion: plan.ordinaryAddressVersion } : {}),
    ...(plan.roomGroupSpeechVersion === 1 && intent.speechScope === 'room' ? { roomGroupSpeechVersion: 1 } : {}),
     ...([1,2,3].includes(plan.ordinaryLocalApproachVersion) ? { ordinaryLocalApproachVersion: plan.ordinaryLocalApproachVersion } : {}),
     ...(plan.localApproachHostPerformanceVersion === 1 ? { localApproachHostPerformanceVersion: 1 } : {}),
     ...([1,2,3,4].includes(plan.ordinaryLocalAmbientSpeechVersion) ? { ordinaryLocalAmbientSpeechVersion: plan.ordinaryLocalAmbientSpeechVersion } : {}),
     ...(plan.ordinaryLocalSearchConversationVersion === 1 ? { ordinaryLocalSearchConversationVersion: 1 } : {}) };
  return { rawInput: deliveryInput, intent, scene, ...addressPin, ...(sequence ?? {}), ...(authoredMagic ? { authoredMagic } : {}),
    ...(plan.openActionVersion === 1 && intent.type === 'act' ? { openActionVersion: 1 } : {}),
    ...([2, 3].includes(plan.visualPerformanceGuidanceVersion) && visual ? { visualPerformanceSystemVersion: 2 } : {}),
    ...(plan.visualPerformanceGuidanceVersion === 3 && intent.type === 'conversation' ? { conversationPerformanceSystemVersion: 1 } : {}),
    ...(isCommunicationRuntime(plan) ? { communicationSelection: communicationSelection({ rawInput: deliveryInput, intent, scene, ...addressPin, ...(sequence ?? {}),
      initialRunPolicy: plan.initialRunPolicy, scope: cognition.scope }) } : {}),
    persona: isKnowledgeGated(state) ? { ...player.persona, appearance: runtimePhysicalActor(state, playerId).appearance } : player.persona,
    guidance: playerPerformanceGuidance(playerId, { ...dialogueContextPin(plan), custom: isCreatedCustom(state),
      addressVersioned: [1, 2].includes(plan.actorAddressVersion) && hasCharacterAddressPolicy(playerId),
      ...(usesRelationshipSetup(state) ? { relationshipSetup: relationshipSetupForState(state) } : {}),
      ...(isKnowledgeGated(state) ? { performancePolicy: policyForActor(playerId, { player: true }) } : {}) })
       + ([1, 2, 3].includes(plan.visualPerformanceGuidanceVersion) && visual ? VISUAL_PERFORMANCE_GUIDANCE : ''),
    communication: player.communication, ...(plan.dialogueContextVersion === 1 ? {
      acquiredBackgroundObservationIds: recall.context.observations.filter(row => row.channel === 'private_recollection').map(row => row.id),
      currentDeliveryObservationIds: recall.context.observations.filter(row => row.channel !== 'private_recollection').map(row => row.id),
    } : { observations: cognition.recentObservations.map(({ text, channel, sourceActorHandle, sourceRelation }) => ({ text, channel,
      ...(sourceActorHandle ? { sourceActorHandle, sourceRelation } : {}) })), recollections: cognition.backgroundObservations.map(row => row.text) }),
    ...([4, 5, 6, 7].includes(plan.version) ? { contractVersion: 4, recall: recall.context } : {}) };
}
export function npcDecisionTaskInput(state, id, subjective, plan, { boundary, remaining, pendingAction, entryStart } = {}) {
  const runtime = runtimeRevisionForState(state), budget = runtime.policy.sceneBudget, player = createdPlayerId(state);
  const input = decisionActorInput(state, id, subjective, {
    ...(plan.physicalFactsVersion === 2
      ? { physicalFactsVersion: 2, ...(plan.postureActionVersion === 1 ? { postureActionVersion: 1 } : {}), boundary } : {}),
    ...(plan.npcCurrentSituationVersion === 1 ? { npcCurrentSituationVersion: 1 } : {}),
    ...(pendingAction !== undefined ? { pendingAction } : {}),
    ...(entryStart !== undefined ? { entryStart } : {}),
  });
  if (isKnowledgeGated(state)) {
    input.performancePolicy = policyForActor(id, { unidentified: !recognizesPerson(state, player, id) });
    input.persona.appearance = runtimePhysicalActor(state, id).appearance;
  }
  Object.assign(input, dialogueContextPin(plan));
  if (plan.shortObservationReferenceVersion === 1) input.shortObservationReferenceVersion = 1;
  input.decisionPolicy = { version: 2, mode: subjective.goals.some(goal => goal.status === 'active') ? 'act' : 'review',
    maxUpdates: remaining?.updatesRemaining ?? 6, maxUtteranceChars: budget.utteranceChars,
    relationshipBudget: input.situation.perceivedParticipants.map(targetHandle => ({ targetHandle,
      remaining: remaining?.relationshipRemaining.find(row => row.targetHandle === targetHandle)?.remaining ?? 1 })) };
  const relationshipSetup = usesRelationshipSetup(state) ? relationshipSetupForState(state) : null;
  const psychology = (relationshipSetup?.psychology ?? runtime.psychology.actors).find(profile => profile.actorId === id);
  input.situation.bodyCondition += `\n${roleplayGuidance(id, player, { ...dialogueContextPin(plan), mode: input.decisionPolicy.mode, loop: state.creation?.loop || 1, evolving: true, addressVersioned: [1, 2].includes(plan.actorAddressVersion) && hasCharacterAddressPolicy(id), ...(relationshipSetup ? { relationshipSetup } : {}), ...(isKnowledgeGated(state) ? { performancePolicy: policyForActor(id) } : {}) })}${psychology
    ? `\n稳定需求：${psychology.needs.join('；')}。\n需求冲突：${psychology.conflicts.join('；')}。\n敏感处境：${psychology.triggers.join('；')}。\n应对倾向：${psychology.coping.join('；')}。这些倾向不强制行动或结局，当前判断随本人实际经历演化。` : ''}\n当前目标、信念和单向关系以 decisionContext 和实际交付来源为准。表态接受不等于已经移动或完成；只表现本人，不替其他角色接话。可见动作最多 ${budget.actionChars} 字，发言最多 ${budget.utteranceChars} 字。`;
  // situation.bodyCondition is capped at 2000. Structured case options and
  // situation.objects already carry the inventory, so the prose inventory and
  // plan dump are the only parts removed when the joined guidance no longer fits.
  if (hasIntentRuntime(state.agentRuntimeRevision)) input.situation.bodyCondition += '\n具体递物只是一项仍由递物人持有的提议，不是接物或本人同意。若本人当前决定接过或拒收，必须选择本人本轮菜单内的 accept-item / decline-item case_step，并引用该提议的本人实际收到来源；普通聊天accept、目标、关系或发言不搬动物品。没有真实来源/条件时不宣称接物完成。';
  input.situation.bodyCondition = fitNpcBodyCondition(input.situation.bodyCondition);
  input.situation.socialRequests = projectSocialRequests(state, id);
  return input;
}
function fitNpcBodyCondition(text) {
  if (text.length <= 2000) return text;
  let next = text.replace(/当前已授权物理状态：\{[\s\S]*?\}。/u,
    '当前已授权物理状态：门、房间与姿势仍以上文为准；眼前物品清单以 situation.objects 为准。');
  if (next.length > 2000) next = next.replace(/\n本人已采纳计划与实际已知步骤：[^\n]*/u,
    '\n本人已采纳计划与实际已知步骤见结构化案件选项。');
  return next.length <= 2000 ? next : next.slice(0, 2000);
}
export function npcRequiredDecisionClosure(subjective, input) {
  const requests = input.situation.socialRequests;
  const partners = new Set([...requests.map(row => row.senderHandle), ...input.situation.perceivedParticipants]);
  const latestRelations = new Map(subjective.relationships.filter(row => partners.has(row.targetHandle)).map(row => [row.targetHandle, row]));
  const currentBeliefs = subjective.beliefs.slice(-3);
  const opposingIds = new Set(currentBeliefs.flatMap(row => row.contradicts ? [row.contradicts] : []));
  const salient = [...new Map([...subjective.goals.filter(row => row.status !== 'completed'), ...latestRelations.values(),
    ...subjective.beliefs.slice(0, 3), ...currentBeliefs, ...subjective.beliefs.filter(row => opposingIds.has(row.id))].map(row => [row.id, row])).values()];
  return { requiredDecisionRecordIds: salient.map(row => row.id),
    requiredSourceObservationIds: [...new Set([...salient.flatMap(row => row.sourceObservationIds), ...requests.map(row => row.sourceObservationId)])] };
}
export function npcTaskGoalTemplates(state, id, input, workingSources) {
  return deriveSituationalGoalTemplates({ ownerId: id, policy: runtimeRevisionForState(state).policy,
    observations: workingSources, socialRequests: input.situation.socialRequests, worldTime: state.worldTime });
}
export function assembleNpcTaskContext(input, dialogueVersion) {
  return assembleDecisionContext(input, input.retrieval?.relationshipContextVersion === 1
    ? { maxBytes: RELATIONSHIP_CONTEXT_BUDGETS.roleplay } : dialogueVersion === 1 ? { maxBytes: 31600 } : {});
}
// Assemble only already-authorized, owner-local decision inputs. Host/Domain
// keep retrieval, menus, offer selection and transaction/lease authority.
export function assembleNpcDecisionTaskPayload(input) {
  const { actorInput, subjective, workingSourceObservations, ordinaryOffer } = input;
  const goalTemplates = deriveSituationalGoalTemplates({ ownerId: input.ownerId, policy: input.runtimePolicy,
    observations: workingSourceObservations, socialRequests: actorInput.situation.socialRequests,
    worldTime: input.worldTime });
  const closure = npcRequiredDecisionClosure(subjective, actorInput);
  if (ordinaryOffer) closure.requiredSourceObservationIds = [...new Set([
    ...closure.requiredSourceObservationIds, ...ordinaryOffer.scriptSourceRefs, ordinaryOffer.invitationSourceRef])];
  // actorInput is a caller-local projection, never an authority. Former callers
  // assigned goalTemplates and did not observe that local again after assembly;
  // preserve its spread/key order without mutating the supplied projection.
  const assembled = assembleNpcTaskContext({ retrieval: input.retrieval, ...actorInput, goalTemplates,
    workingSourceObservations, receivedObservations: input.receivedObservations,
    ...(Object.hasOwn(input, 'acquiredEvidenceEntries') ? { acquiredEvidenceEntries: input.acquiredEvidenceEntries } : {}),
    ...closure }, input.dialogueContextVersion);
  let context = ordinaryOffer
    ? { ...assembled.context, ordinaryParticipationVersion: 1, ordinaryInvitation: ordinaryOffer } : assembled.context;
  if (input.npcMagicCastVersion === 1) context = { ...context, npcMagicCastVersion: 1 };
  let manifest = assembled.manifest;
  const menu = context.situation.caseOptions;
  // The Host supplies the same owner scene only for opted-in act slots. Do not
  // promote a source, backfill a menu entry, or expose the option-to-source map.
  if (input.identifyOwnerState && context.decisionPolicy?.mode === 'act'
      && menu?.some(row => row.kind === 'identify')) {
    const options = new Map(runtimeOptions(input.identifyOwnerState, input.ownerId, { perceived: true })
      .filter(row => row.kind === 'identify').map(row => [row.id, row.sourceObservationIds]));
    const delivered = new Set(context.scope.actorId === input.ownerId ? context.observations.map(row => row.id) : []);
    const caseOptions = menu.filter(row => row.kind !== 'identify' || options.get(row.id)?.some(id => delivered.has(id)));
    if (caseOptions.length !== menu.length) {
      const allowedActions = caseOptions.length ? context.allowedActions : context.allowedActions.filter(action => action !== 'case_step');
      const menuBytes = (rows, actions) => Buffer.byteLength(JSON.stringify([rows, actions]), 'utf8');
      const removed = menuBytes(menu, context.allowedActions) - menuBytes(caseOptions, allowedActions);
      context = { ...context, situation: { ...context.situation, caseOptions }, allowedActions };
      manifest = { ...manifest, packetBytes: manifest.packetBytes - removed,
        compression: { ...manifest.compression, rawPacketBytes: manifest.compression.rawPacketBytes - removed } };
    }
  }
  return { context, manifest };
}
function addressVoiceForTask(state, actorId, packet, version) {
  // In a body swap no ordinary rule may identify a mind from the body/name.
  const known = state.caseRuntime?.occupiedBody ? new Set() : recognizedActors(state, actorId);
  const ownRelationships = packet.decisionContext?.relationships || [];
  const participants = packet.situation?.participants || packet.data?.scene?.nearby || [];
  return projectAddressVoice(actorId, approvedAddressActorIds().filter(id => id !== actorId && (
    known.has(id) || (id === 'warden' || id === 'jailer') && participants.some(row => row.label === approvedSpeakerLabel(id))
  )).map(id => ({ id, close: actorId === 'coco' && cocoHasAffection(ownRelationships.findLast(row => row.targetHandle === actorHandle(actorId, id))) })), version);
}
export function finalizeActorTaskPacket(task, plan, { playerId, addressState } = {}) {
  if (isRelationshipRuntime(plan) && task.role !== 'director') {
    if (plan.initialRunPolicy?.version !== 2) throw Object.assign(new Error('关系任务缺少封存初始策略。'), { code: 'INVALID_AGENT_JOB' });
    const pin = { relationshipContextVersion: 1, executionRevision: plan.executionRevision };
    task.context = { ...task.context, ...pin,
      ...(task.role === 'roleplay' || task.role === 'character_data' ? { initialRunPolicy: assertInitialRunPolicy(plan.initialRunPolicy) } : {}) };
    task.maxBytes = task.role === 'player_performance' ? RELATIONSHIP_CONTEXT_BUDGETS.player_performance
      : task.role === 'roleplay' ? RELATIONSHIP_CONTEXT_BUDGETS.roleplay : task.context.version === 5 && task.role === 'world_adjudicator' ? 49152 : RELATIONSHIP_CONTEXT_BUDGETS.narrative;
  } else if (relationshipContextPin(task.context).relationshipContextVersion === 1) {
    throw Object.assign(new Error('旧任务不能选择关系上下文策略。'), { code: 'INVALID_AGENT_JOB' });
  }
  if (plan.initialRunPolicy !== undefined && ['intent_parser', 'player_performance', 'narrator', 'scene_composer', 'world_adjudicator'].includes(task.role)) {
    task.context = { ...task.context, data: { ...task.context.data, initialRunPolicy: assertInitialRunPolicy(plan.initialRunPolicy) } };
  }
  const narrationFocus = novelNarrationFocusTaskPin(plan, task);
  if (narrationFocus.novelNarrationFocusVersion === 1)
    task.context = { ...task.context, data: { ...task.context.data, ...narrationFocus } };
  if (task.role === 'player_performance' && chosenPlayerSpeech(task.context.data)
    && !ordinaryAddressRequiresVerbatim(task.context.data, task.context.scope)) {
    task.context = { ...task.context, data: { ...task.context.data, playerSpeechVoiceVersion: 1 } };
  }
  if (task.role === 'roleplay' && task.context.allowedActions.some(action => ['gesture', 'speak', 'write'].includes(action))) {
    const owner = task.context.scope?.actorId;
    const visible = task.context.situation?.perceivedParticipants;
    // The viewpoint marker may only alias a person already delivered here.
    const viewer = owner && playerId && owner !== playerId
      ? [actorHandle(owner, playerId), playerId].find(handle => visible?.includes(handle)) : undefined;
    task.context = { ...task.context, npcActionPerspectiveVersion: 3, ...(viewer ? { narrationPlayerHandle: viewer } : {}) };
  }
  if ([1, 2].includes(plan.actorAddressVersion) && addressState && hasCharacterAddressPolicy(task.context.scope?.actorId)) {
    const actorId = task.context.scope.actorId;
    if (task.role === 'roleplay' && task.context.npcActionPerspectiveVersion === 3 && task.context.decisionPolicy?.mode !== 'review') {
      task.context = { ...task.context, addressVoice: addressVoiceForTask(addressState, actorId, task.context, plan.actorAddressVersion) };
    } else if (task.role === 'player_performance') {
      task.context = { ...task.context, data: { ...task.context.data, addressVoice: addressVoiceForTask(addressState, actorId, task.context, plan.actorAddressVersion) } };
    }
  }
  if (plan.antiClicheVersion === 1) {
    if (task.role === 'roleplay' && task.context.decisionPolicy?.mode !== 'review' && task.context.allowedActions.some(action => ['gesture', 'speak', 'write'].includes(action))) {
      task.context = { ...task.context, antiClicheVersion: 1 };
    } else if (['player_performance', 'scene_composer', 'narrator'].includes(task.role)) {
      task.context = { ...task.context, data: { ...task.context.data, antiClicheVersion: 1 } };
    }
  }
  if (plan.dialogueContextVersion === 1 && task.role !== 'director') {
    task.context = task.role === 'roleplay' ? { ...task.context, ...dialogueContextPin(plan) }
      : { ...task.context, data: { ...task.context.data, ...dialogueContextPin(plan) } };
    task.context.systemPolicySeal = modelSystemPolicySeal(task.context, task.behaviorPrompt);
  }
  // Validate EXACT final wire form, not a raw retrieval or bare observations.
  // Older tasks retain their historical boundary behavior unless opted into a
  // durable lane; builders are still the same ones used by the actual runner.
  if (task.role === 'roleplay') buildRoleplayContext(task.context, { maxBytes: task.maxBytes });
  else if (task.role === 'world_adjudicator') buildServiceTaskContext(task.context);
  else if (task.role === 'player_performance') buildNarrativeContext(task.context, { maxBytes: task.maxBytes });
  if (isRelationshipRuntime(plan) && task.role !== 'director') modelPacketCapacity(task.context, { behaviorPrompt: task.behaviorPrompt });
  return task;
}

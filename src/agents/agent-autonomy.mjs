import { INTENT_RUNTIME_REVISION, CASE_BOUNDARY_RUNTIME_REVISION, hasIntentRuntime } from '../content/relationship-context-policy.mjs';
import { actorsForState, actorForState, createdPlayerId, ROOM_CODES, CREATED_ROOMS } from '../creation/player-setup.mjs';
import { runtimeCapabilityId } from '../content/runtime-capabilities.mjs';
import { isKnowledgeGated, acquireDeliveredIdentity } from '../characters/actor-knowledge.mjs';
import { deliveredSelfIntroduction } from '../characters/identity-assertion-policy.mjs';
import { policyForActor } from './actor-performance-policy.mjs';
import { actorRoom, actorPerception, actorHandle, actorTarget, acquisitionAudience, readingMaterial, recognizedActors } from '../characters/actor-perception.mjs';
import { hasCaseOne, caseNpcOperation, caseNpcMove } from '../cases/case-one.mjs';
import { caseActionSeconds } from '../cases/case-action-timing.mjs';
import { hasCaseRuntime, runtimeActive, runtimeOptions, runtimeOperation, runtimeSetRoom, runtimeAcquire, runtimePlanView, runtimeRoom, runtimePhysicalFacts, runtimePhysicalActor, runtimeBodyActorId, runtimeSwapOptions, runtimeSettleSwapStep } from '../case-runtime.mjs';
import { activeProcedure, settleProcedureIntent, procedureActorScene, validateProcedureIntent,
  inspectionAcquisition } from '../cases/case-procedure.mjs';
import { decisionWorkingState } from '../cognition/decision-state.mjs';
import { runtimeRevisionForState } from '../content/content-revisions.mjs';
import { actorObservationId, observationPerformer } from '../characters/observation-identity.mjs';
import { initialConversationState, applyConversationEvent, advanceConversationState } from '../cognition/conversation-state.mjs';
import { dialogueContextPin } from '../cognition/dialogue-context-policy.mjs';
import { prisonClock } from '../world/prison-activity.mjs';

export const AUTONOMY_VERSION = 1;
export const NPC_DECISION_BUDGET = 3;
// Host-owned codes only. Historical decisions without an explicit action/job
// audit marker retain their exact old bytes and are never backfilled.
export const NPC_REJECTION_REASONS = Object.freeze(['target_unavailable', 'communication_unavailable',
  'destination_unavailable', 'reading_unavailable', 'case_step_unavailable', 'report_unavailable',
  'inspection_unavailable', 'presentation_unavailable', 'operation_unsupported', 'communication_mode_unavailable']);
// Count received enactments, not wall-clock timestamps: a sibling's later
// proposal can have the same story time and must remain pending next round.
export function receivedEnactmentCount(state, actorId) {
  const receives = row => !['narration', 'reflection'].includes(row.delivery) && row.audienceIds?.includes(actorId)
    && !(row.delivery === 'action' && (row.observationKey?.startsWith('gesture:') || row.observationKey?.startsWith('item:')))
    && (row.speakerId !== actorId || row.delivery === 'reading');
  return [...state.entries, ...(state.agentAutonomy?.events || [])].filter(receives).length
    + (state.agentWorld?.activityLog || []).filter(row => row.actorId !== actorId && row.witnessIds.includes(actorId)).length;
}
/** Exact pre-decision enactments, with the same IDs/channels used at commit. */
export function decisionSnapshotObservations(before, snapshot, actorId) {
  const rows = [...snapshot.entries.slice(before.entries.length),
    ...(snapshot.agentAutonomy?.events || []).slice(before.agentAutonomy?.events?.length || 0)]
    .filter(row => !['narration', 'reflection'].includes(row.delivery) && row.audienceIds.includes(actorId) && row.observationKey)
    .map(row => ({ id: actorObservationId(snapshot, row.observationKey, actorId), text: row.textByActor?.[actorId] || row.text,
      ...observationPerformer(snapshot, actorId, row.speakerId),
      channel: row.delivery === 'reading' ? 'reading' : row.speakerId === actorId ? 'self_expression'
        : row.delivery === 'speech' ? 'hearing' : row.delivery === 'action' ? 'sight' : 'reading',
      occurredAt: row.occurredAt, learnedAt: row.learnedAt ?? (row.customAbilityEvent ? row.occurredAt : snapshot.worldTime) }));
  for (const activity of (snapshot.agentWorld?.activityLog || []).slice(before.agentWorld?.activityLog?.length || 0)) {
    if (activity.observationKey && activity.witnessIds.includes(actorId)) rows.push({
      id: actorObservationId(snapshot, activity.observationKey, actorId), text: activity.textByActor?.[actorId] || activity.text, channel: 'sight',
      ...observationPerformer(snapshot, actorId, activity.actorId),
      occurredAt: activity.occurredAt, learnedAt: activity.learnedAt ?? snapshot.worldTime,
    });
  }
  return rows;
}
const fail = () => { throw Object.assign(new Error('自主回合记录不符合版本化执行契约。'), { code: 'INVALID_AGENT_STATE' }); };
export function enableAutonomy(state) {
  if (!state.agentAutonomy) state.agentAutonomy = { version: 1, cursor: 0, considered: {}, recognizedByActor: {}, events: [], decisions: [] };
  if (state.agentAutonomy.version !== AUTONOMY_VERSION) fail();
  if (runtimeRevisionForState(state).policy.conversationVersion === 1) state.agentAutonomy.conversation ??= initialConversationState();
  return state.agentAutonomy;
}
function decisionRoster(state) {
  const player = createdPlayerId(state);
  return actorsForState(state).filter(actor => actor.id !== player && actor.id !== 'warden'
    && !['unavailable', undefined].includes(actorRoom(state, actor.id))
    && (!hasCaseOne(state) || !['hiro', 'noah', ...state.caseOne.executedIds].includes(actor.id))
    && (!hasCaseRuntime(state) || runtimeActive(state, actor.id)));
}
/** One bounded selection from the fixed pre-decision snapshot. Fairness is
 * round-robin, not a global motive/secret score. Missing budget stays pending. */
/** An offscreen victim must receive a packet-backed opportunity before the
 * shared clock can spend the reaction window. This is a scheduling capability,
 * never an automatic dodge or knowledge delivered to the player. */
const PUBLIC_ROOMS = new Set(['corridor', 'reception', 'court', 'cafeteria', 'kitchen', 'courtyard', 'lake', 'infirmary', 'hall']);
/** Heard the assembly and has not left a private cell. A notice is still not
 * consent; this only keeps a decision available where the player can witness it. */
export function pendingAssemblyDeparture(state, actorId, options = {}) {
  const notice = state.agentWorld?.broadcasts.at(-1);
  if (!notice?.audienceIds?.includes(actorId)) return false;
  if (dialogueContextPin(options).dialogueContextVersion === 1) {
    // Host-set lifecycle records only actual completed travel or an explicit
    // source-bound rejection, never a selected/proposed move or inferred prose.
    if (state.agentAutonomy?.assemblyLifecycle?.[actorId]?.noticeId === notice.id) return false;
    if ((state.agentWorld?.activityLog || []).some(row => row.actorId === actorId
      && row.occurredAt > notice.occurredAt && row.from !== row.to)) return false;
  }
  const room = actorRoom(state, actorId);
  return Boolean(room) && !PUBLIC_ROOMS.has(room);
}
export function pendingReactionActors(state) {
  if (!hasCaseRuntime(state)) return [];
  const player = createdPlayerId(state);
  return [...new Set(state.caseRuntime.operations.filter(operation => operation.kind === 'attack' && operation.status === 'pending'
    && operation.targetId !== player && runtimeActive(state, operation.targetId)
    && actorRoom(state, operation.targetId) === operation.room
    && state.caseRuntime.signals.some(signal => signal.kind === 'threat' && signal.operationId === operation.id
      && signal.occurredAt <= state.worldTime && !signal.audienceIds.includes(player)
      && signal.audienceIds.includes(operation.targetId) && !signal.reactionActorIds?.includes(operation.targetId)))
    .map(operation => operation.targetId))];
}
export function selectDecisionActors(state, { targetId, performance, triggerLocal = false, previewBroadcast = false, decisionStates = {}, dialogueContextVersion } = {}) {
  const dialogue = dialogueContextVersion === undefined ? {} : dialogueContextPin({ dialogueContextVersion });
  if (hasCaseOne(state) && ['ballot', 'execution_ready', 'ending', 'assembly'].includes(state.caseOne.stage)) return [];
  if (hasCaseRuntime(state) && ['ballot', 'execution_ready', 'ending', 'assembly'].includes(activeProcedure(state)?.stage)) return [];
  const player = createdPlayerId(state); const ledger = state.agentAutonomy;
  const roster = decisionRoster(state);
  const currentRoom = actorRoom(state, player); const cursor = ledger?.cursor || 0;
  const notice = state.agentWorld?.broadcasts.at(-1);
  const ordered = [...roster.slice(cursor % Math.max(roster.length, 1)), ...roster.slice(0, cursor % Math.max(roster.length, 1))];
  const eligible = ordered.filter(actor => {
    // Paused goals still need a bounded owner review when due or when new
    // perception arrives. The packet admits only a review-only wait until the
    // owner explicitly resumes a goal; scheduling never resumes it for her.
    if (runtimeRevisionForState(state).policy.sceneBeatVersion !== 1
      && decisionStates[actor.id] && !decisionStates[actor.id].goals.some(goal => goal.status !== 'completed')) return false;
    const local = actorRoom(state, actor.id) === currentRoom;
    const last = ledger?.considered[actor.id] ?? -1;
    const unseen = receivedEnactmentCount(state, actor.id) > (ledger?.receivedCounts?.[actor.id] || 0);
    const due = decisionStates[actor.id]?.goals.some(goal => goal.status !== 'completed' && goal.reviewAt <= state.worldTime)
      && (runtimeRevisionForState(state).policy.sceneBeatVersion !== 1 || (ledger?.reviewAtByActor?.[actor.id] ?? 0) <= state.worldTime);
    const publicClockDue = Boolean(ledger && state.worldTime - last >= 60);
    return pendingSocialRequests(state, actor.id).some(request => request.reviewAt <= state.worldTime)
      || (hasCaseRuntime(state) && state.caseRuntime.pendingActorIds.includes(actor.id))
      || actor.id === targetId || previewBroadcast || Boolean(notice?.audienceIds.includes(actor.id) && notice.occurredAt > last)
      || (['corridor', 'reception'].includes(currentRoom) && pendingAssemblyDeparture(state, actor.id, dialogue))
      || unseen || due || publicClockDue || (local && Boolean(triggerLocal || performance?.utterance));
  });
  const addressed = runtimeRevisionForState(state).policy.conversationVersion === 1
    ? eligible.filter(actor => pendingSocialRequests(state, actor.id).some(request => request.reviewAt <= state.worldTime)).map(actor => actor.id) : [];
  return [...new Set([...(targetId && eligible.some(actor => actor.id === targetId) ? [targetId] : []), ...addressed, ...eligible.map(actor => actor.id)])].slice(0, NPC_DECISION_BUDGET);
}
/** Current ordinary action and the pre-action entry count are supplied by the
 * scene caller from the actual unsettled prefix. They are never inferred from
 * the last committed agent action (which still points at the previous act). */
function currentOwnerCustomHearing(state, ownerId, { pendingAction, entryStart } = {}) {
  if (!pendingAction?.intent?.magic || pendingAction.intent.magic.customBinding === undefined) return null;
  if (!Number.isSafeInteger(entryStart) || entryStart < 0 || entryStart > (state.entries?.length || 0)) return null;
  const entries = state.entries || [];
  const current = entries.slice(entryStart).filter(row => row.customAbilityEvent
    && row.audienceIds?.includes(ownerId) && row.delivery === 'speech');
  const entry = current.at(-1);
  if (!entry || !entry.text) return null;
  // Only this owner's own earlier delivered hearing is a relation; other
  // owners' observations and trace ids never enter the packet. An earlier
  // custom replay is still a real delivered hearing, so it is not excluded.
  const prior = entries.slice(0, entryStart).filter(row => row.audienceIds?.includes(ownerId)
    && row.delivery === 'speech' && row.text === entry.text
    && row.occurredAt <= entry.occurredAt).at(-1);
  const clock = prisonClock(state, entry.occurredAt);
  const previous = prior && prisonClock(state, prior.occurredAt);
  return { text: entry.text, occurredAt: entry.occurredAt, heardAtLabel: `第${clock.day}天 ${clock.label}`,
    ...(previous ? { previouslyHeardAt: prior.occurredAt, previouslyHeardLabel: `第${previous.day}天 ${previous.label}` } : {}) };
}
export function decisionActorInput(state, actorId, subjective, options = {}) {
  const actor = actorForState(state, actorId); const view = actorPerception(state, actorId, options);
  const persona = structuredClone(actor.persona);
  if (state.caseRuntime?.occupiedBody) persona.appearance = runtimePhysicalActor(state, actorId).appearance;
  persona.boundaries = persona.boundaries.filter(text => !text.includes('玩家控制'));
  if (hasCaseRuntime(state) && actorId === 'leia') {
    // Preserve the save-bound persona and literal recollections. Their old
    // blanket ability ban described the historical executor, not an in-world
    // loss of magic. Only this owner's current, delivered capability can lift
    // it; no target, unobserved condition or desired outcome is supplied here.
    persona.boundaries = persona.boundaries.map(text => text === '不把舞台感写成真实读心、验尸定论或强制注视。'
      ? '不把舞台感写成真实读心或验尸定论；不以文字宣告强制注视，能力效果只由已交付的有限步骤裁决。'
      : text === '本轮诱导视线及其强化效果不可执行，不能宣告别人已被吸引或改变兴趣。'
        ? '当前仅支持本人已交付的短时视线固定步骤。旧回忆中的“本轮不能执行该能力”属于旧执行边界，不是本人失去能力的经历；未交付步骤、远程控制、强化及改变他人兴趣仍不可执行。'
        : text);
  }
  if (state.agentAutonomy) {
    // Current distance is a versioned one-way assessment, not an immutable
    // instruction that resets this relationship on every model invocation.
    persona.voice = persona.voice.replace('对艾玛则明显冷淡、容易绷紧。', '对旧识的当前距离以本人主观关系与实际见闻为准。');
  }
  const allowedActions = [actor.communication === 'writing' ? 'write' : 'speak', 'gesture', 'wait'];
  const readingOpen = !hasCaseRuntime(state) || !['assembly', 'discussion', 'ballot', 'execution_ready', 'ending'].includes(view.case?.stage);
  if (readingOpen) allowedActions.push('read');
  if (view.permittedDestinations.length) allowedActions.push('move');
  if (view.case?.inspectables.length) allowedActions.push('inspect');
  if (view.case?.stage === 'discussion' && view.case.knownEvidence.length) allowedActions.push('present');
  const caseOptions = hasCaseRuntime(state) ? runtimeOptions(state, actorId, { perceived: true }).slice(0, 32).map(({ id, label, kind }) => ({ id, label, kind })) : undefined;
  if (caseOptions?.length) allowedActions.push('case_step');
  if (caseOptions?.some(row => row.kind === 'report')) allowedActions.push('report');
  // Keep capability IDs in knownEvidenceIds, not beside a quotable title.
  // Names and complete literal bodies come only from this owner's perception;
  // historical dialogue/recollections are never rewritten or used as a lookup.
  const acquired = (view.case?.knownEvidence || []).map(row => `【${row.name}】${row.description}`).join('\n');
  const evidenceGuidance = view.case ? '内部证据标识仅供 operation.subjectId 等结构化操作使用；对白、动作和【材料名】只能使用本人已取得记录中的实际材料名，不得把内部标识当作材料名。历史见闻中混入的内部标识不是材料名或原文，不得照搬到新发言。' : '';
  const citationGuidance = view.case?.stage === 'discussion'
    ? '讨论本人已取得或已公开的材料时，可在合适的证词里用【材料名】记载「短句原文」准确引用一处关键措辞。短句摘引不代表原记录全文，不能将选引的一句说成“只有这一句”或“唯一可读内容”。无需句句引用，不要为提供线索编造证据或强制认错；引用不等于证明责任。' : '';
  const localPlans = hasCaseRuntime(state) ? runtimePlanView(state, actorId, { perceived: true }) : null;
  const trialRestricted = state.itemPolicyVersion === 2
    && ['discussion', 'ballot', 'execution_ready', 'outcome_pending', 'ending'].includes(view.case?.stage);
  const passageDescription = trialRestricted
    ? '当前程序不提供离庭通行；这不说明门锁的物理状态。'
    : `铁门${view.doorOpen ? '可通行' : '保持上锁'}。`;
  const physicalDescription = (state.itemPolicyVersion === 2 || options.physicalFactsVersion === 2) && view.physicalFacts
    ? `当前已授权物理状态：${JSON.stringify(options.postureActionVersion === 1
      ? { roomId: view.physicalFacts.roomId, door: view.physicalFacts.door, pose: view.physicalFacts.pose,
        objects: view.physicalFacts.objects, carriers: view.physicalFacts.carriers } : view.physicalFacts)}。` : '';
  const localPoseDescription = options.postureActionVersion === 1 ? `眼前已结算的身体姿势：${JSON.stringify(
    actorsForState(state).filter(other => other.id !== actorId && other.id !== 'warden' && runtimeActive(state, other.id)
      && runtimeRoom(state, other.id) === runtimeRoom(state, actorId)).map(other => ({ handle: actorHandle(actorId, other.id),
      pose: runtimePhysicalFacts(state, other.id)?.pose || { posture: 'unknown', support: 'unknown' } }))) }。NPC_TYPED_POSE_NOT_IMPLEMENTED。` : '';
  const currentSituation = options.npcCurrentSituationVersion === 1;
  const currentPlace = currentSituation ? { label: view.location, ...(view.roomId ? { roomId: view.roomId } : {}),
    ...(view.clock ? { timeLabel: view.clock.label } : {}) } : null;
  const currentHearing = currentSituation ? currentOwnerCustomHearing(state, actorId,
    { pendingAction: options.pendingAction, entryStart: options.entryStart }) : null;
  return { persona, situation: { locationLabel: view.location,
    ...(currentPlace ? { currentPlace } : {}),
    ...(currentHearing ? { currentHearing } : {}),
    bodyCondition: `${view.description}${passageDescription}${physicalDescription}${localPoseDescription}${view.clock ? `公共时钟：${view.clock.label}，${view.clock.period}。` : ''}${view.case ? `阶段：${view.case.stage}。${view.case.rules}` : ''}${evidenceGuidance}${citationGuidance}${localPlans ? `\n本人已采纳计划与实际已知步骤：${JSON.stringify(localPlans).slice(0, 600)}` : ''}`,
    ...(acquired ? { acquiredEvidence: acquired } : {}),
    ...(caseOptions ? { caseOptions } : {}),
    ...(view.objects ? { objects: view.objects } : {}),
    perceivedParticipants: view.nearby.map(row => row.id),
    participants: view.nearby.map(row => ({ handle: row.id, label: row.label, appearance: row.appearance })),
    permittedDestinations: view.permittedDestinations,
    readableIds: readingOpen ? view.readable.map(row => row.id) : [], inspectableIds: view.case?.inspectables.map(row => row.id) || [],
    knownEvidenceIds: view.case?.knownEvidence.map(row => row.id) || [],
  }, allowedActions, ...(subjective ? { decisionContext: decisionWorkingState(subjective) } : {}) };
}
function event(state, text, actorId, options = {}) {
  const delivery = options.delivery || 'action';
  const readers = runtimeRevisionForState(state).policy.conversationVersion === 1 && delivery === 'writing' && options.addresseeIds
    ? [...new Set([actorId, ...options.addresseeIds.filter(id => actorRoom(state, id) === actorRoom(state, actorId))])] : undefined;
  return { text, speakerId: actorId, delivery,
    audienceIds: options.audienceIds || readers || acquisitionAudience(state, actorId, { delivery, targetId: options.targetId }),
    ...(runtimeRevisionForState(state).policy.conversationVersion === 1 && ['speech', 'writing'].includes(delivery)
      ? { addresseeIds: options.addresseeIds || (options.targetId ? [options.targetId] : []),
        communication: options.communication || { kind: 'statement' } } : {}),
    occurredAt: state.worldTime, ...(options.observationKey ? { observationKey: options.observationKey } : {}) };
}
function explicitSelfIntroduction(actor, utterance, introductionVersion) {
  const name = actor.name.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
  const quotes = new Map([['「', '」'], ['『', '』'], ['“', '”'], ['"', '"']]);
  let text = utterance.trim();
  // A dialogue-wide wrapper is presentation, but nested/attributed quotations
  // are not the speaker's own assertion. Only unwrap one enclosing pair.
  if (quotes.get(text[0]) === text.at(-1) && text.indexOf(text.at(-1), 1) === text.length - 1) text = text.slice(1, -1);
  for (const [open, close] of quotes) text = text.replaceAll(`${open}${actor.name}${close}`, actor.name);
  let unquoted = ''; const closing = [];
  for (const char of text) {
    if (closing.length && char === closing.at(-1)) { closing.pop(); unquoted += ' '; }
    else if (quotes.has(char)) { closing.push(quotes.get(char)); unquoted += ' '; }
    else unquoted += closing.length ? ' ' : char;
  }
  // First person plus exact own name, at a clause boundary. "大叔" is Milia's
  // authored self-reference, not a generic third-person subject for everyone.
  // Freeze v1/v2 replay. v2 adds 吾辈名; v3 also permits a bare exact
  // full name immediately confirmed by the speaker's own matching nickname.
  const subject = `(?:我叫|我是|吾辈是${introductionVersion >= 2 ? '|吾辈名为|吾辈名' : ''}|本小姐是|我的名字是${actor.id === 'milia' ? '|大叔是' : ''})`;
  const full = `(?:${subject}\\s*${name}|(?:那)?我先报名字[：:]\\s*${name}|我自己先说[，,：:]\\s*${name})`;
  const split = '(?:我|吾辈|本小姐)姓\\s*(?<surname>\\p{Script=Han}+)[，,]\\s*名\\s*(?<given>\\p{Script=Han}+)';
  const nickname = introductionVersion === 3
    ? `|${name}[\\s，,。；;：:…—–]+(?:你(?:们)?(?:可以)?|大家(?:可以)?|直接|就)?叫我\\s*(?<nickname>\\p{Script=Han}{1,8})(?:就好|就行|好了|吧)` : '';
  const pattern = new RegExp(`(?:^|[。！？!?；;，,\\n—–])\\s*(?<assertion>${full}|${split}${nickname})(?=$|[\\s，,。.!！?？；;—–])`, 'gu');
  for (const match of unquoted.matchAll(pattern)) {
    if (match.groups.surname && match.groups.surname + match.groups.given !== actor.name) continue;
    if (match.groups.nickname && !actor.name.endsWith(match.groups.nickname)) continue;
    const start = match.index + match[0].length - match.groups.assertion.length;
    const prefix = unquoted.slice(0, start).split(/[。！？!?；;]/u).at(-1);
    // Do not promote reported speech, a reading/quotation, or a hypothetical.
    if (/(?:说|說|问|問|写|寫|读|讀|念|告诉|告訴|转述|轉述|引用|复述|複述|听说|聽說|据|據|如果|假如|假设|假設|要是|以为|以為|不是|并非|並非)/u.test(prefix)) continue;
    const sentence = unquoted.slice(start).split(/[。！!；;\n]/u)[0];
    if (/[？?]|(?:不是|并非|並非|不叫|是假|假的|[她他它]的名字|这句|這句|台词|臺詞|引文|假名|开玩笑|開玩笑|别当真|別當真|否认|否認|才怪|不对|不對)/u.test(sentence)) continue;
    return true;
  }
  return false;
}
/** A delivered nickname confirmation also authenticates historical display
 * labels, without replaying or upgrading any saved recognition state. */
export function isNicknameSelfIntroduction(actor, utterance) {
  return typeof utterance === 'string' && utterance.includes(actor.name) && utterance.includes('叫我')
    && explicitSelfIntroduction(actor, utterance, 3) && !explicitSelfIntroduction(actor, utterance, 2);
}
export function enactedSelfIntroduction(actor, row) {
  return Boolean(actor && actor.id === row.speakerId && deliveredSelfIntroduction(row, {
    name: actor.name, selfReference: policyForActor(actor.id).selfReference,
  }));
}
function learnIntroductions(state, row, introductionVersion) {
  if (state.caseRuntime?.occupiedBody) return; // Self-reported mind names never silently identify physical occupants.
  if (isKnowledgeGated(state)) { acquireDeliveredIdentity(state, row, { explicitDelivery: introductionVersion === 5 }); return; }
  if (!['speech', 'writing'].includes(row.delivery) || !row.speakerId) return;
  const actor = actorForState(state, row.speakerId);
  // Absence of an action-owned version keeps every historical execution,
  // including @3, byte-exact. Never infer an upgrade or rescan stored rows.
  if (introductionVersion === 5) {
    if (!enactedSelfIntroduction(actor, row) && !explicitSelfIntroduction(actor, row.text, 3)) return;
  } else if ([1, 2, 3, 4].includes(introductionVersion)) {
    if (!explicitSelfIntroduction(actor, row.text, introductionVersion)) return;
  } else {
    // Merely mentioning somebody's name does not identify that person's body.
    const name = actor.name.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
    if (!new RegExp(`(?:我叫|我是|吾辈是|本小姐是|名字是)[「『\\s]*${name}`, 'u').test(row.text)) return;
  }
  for (const owner of row.audienceIds) {
    const known = state.agentAutonomy.recognizedByActor[owner] ||= [];
    if (!known.includes(actor.id)) known.push(actor.id);
  }
  if (row.audienceIds.includes(createdPlayerId(state)) && !state.known.includes(actor.id)) state.known.push(actor.id);
}
export function enactedPlayerObservations(state, actorId, performance, intent, jobId) {
  const player = createdPlayerId(state); const visible = actorRoom(state, player) === actorRoom(state, actorId);
  if (!visible) return [];
  const rows = [{ id: `gesture:${jobId}:${actorId}`, text: performance.action, channel: 'sight' }];
  const delivery = actorForState(state, player).communication;
  if (performance.utterance && (delivery !== 'writing' || actorId === intent.targetId)) rows.push({
    id: `question:${jobId}:${actorId}`, text: performance.utterance, channel: delivery === 'writing' ? 'reading' : 'hearing',
  });
  return rows.map(row => ({ ...row, ...observationPerformer(state, actorId, player), occurredAt: state.worldTime, learnedAt: state.worldTime }));
}

/** Applies only host-capability checked operations. The caller owns the draft
 * and atomic commit. Each event computes witnesses at its actual position. */
export function applyNpcDecisions(state, decisions, jobId, { followTargetId, onElapsed = () => {}, causalTimingVersion, caseActionTimingVersion, objectInspectionTimingVersion, decisionAuditVersion, introductionVersion, dialogueContextVersion, npcMagicCastVersion, settleNpcMagic } = {}) {
  const dialogue = dialogueContextVersion === undefined ? {} : dialogueContextPin({ dialogueContextVersion });
  if (caseActionTimingVersion !== undefined && (caseActionTimingVersion !== 2 || runtimeCapabilityId(state.agentRuntimeRevision) !== 'agent-prison-runtime@8')) fail();
  if (objectInspectionTimingVersion !== undefined && (objectInspectionTimingVersion !== 1
    || runtimeCapabilityId(state.agentRuntimeRevision) !== 'agent-prison-runtime@8' || state.itemPolicyVersion !== 2 || hasCaseOne(state))) fail();
  const semanticTiming = caseActionTimingVersion === 2;
  if (introductionVersion !== undefined && (![1, 2, 3, 4, 5].includes(introductionVersion)
    || introductionVersion === 4 && !isKnowledgeGated(state))) fail();
  if (!Array.isArray(decisions) || decisions.length > NPC_DECISION_BUDGET
    || new Set(decisions.map(row => row.actorId)).size !== decisions.length) fail();
  const ledger = enableAutonomy(state); const player = createdPlayerId(state); const events = [];
  const sceneBeat = runtimeRevisionForState(state).policy.sceneBeatVersion === 1
    ? Number(/:beat:([1-3])$/u.exec(jobId)?.[1] || 0) : 0;
  if (decisionAuditVersion !== undefined && (decisionAuditVersion !== 1 || !sceneBeat)) fail();
  const audit = (accepted, rejectionReason) => {
    if (decisionAuditVersion !== 1) return {};
    if (!accepted && !NPC_REJECTION_REASONS.includes(rejectionReason)) fail();
    return { auditVersion: 1, rejectionReason: accepted ? null : rejectionReason };
  };
  const receivedCounts = Object.fromEntries(decisions.map(({ actorId }) => [actorId, receivedEnactmentCount(state, actorId)]));
  // Causal proposals all reference one pre-decision snapshot. Resolve competing
  // resource claims in a fixed roster order, not model/network completion order.
  const rosterOrder = actorsForState(state).map(actor => actor.id);
  const schedulerRoster = hasCaseRuntime(state) ? decisionRoster(state) : null;
  const consideredActors = new Set();
  const ordered = hasCaseRuntime(state) ? [...decisions].sort((a, b) => rosterOrder.indexOf(a.actorId) - rosterOrder.indexOf(b.actorId)) : decisions;
  for (const { actorId, proposal } of ordered) {
    if (semanticTiming && hasCaseOne(state) && ['assembly', 'ballot', 'execution_ready', 'ending', 'outcome_pending'].includes(state.caseOne.stage)) break;
    if (hasCaseRuntime(state) && ['assembly', 'ballot', 'execution_ready', 'ending'].includes(activeProcedure(state)?.stage)) break;
    (ledger.receivedCounts ||= {})[actorId] = receivedCounts[actorId];
    if (actorId === player || actorId === 'warden' || !actorForState(state, actorId)) fail();
    const op = proposal.decision?.operation || { type: 'wait' };
    if (proposal.movement) fail();
    if (hasCaseRuntime(state) && !runtimeActive(state, actorId)) continue;
    consideredActors.add(actorId);
    if (op.type === 'magic_cast') {
      // Voluntary cast is a host operation. Model action/utterance is not the effect.
      const finish = (accepted, rejectionReason, magicEntries = []) => {
        ledger.considered[actorId] = state.worldTime;
        if (sceneBeat) (ledger.reviewAtByActor ||= {})[actorId] = state.worldTime + 30;
        ledger.decisions.push({ actorId, accepted, at: state.worldTime, operation: structuredClone(op), ...(sceneBeat ? { sceneBeat } : {}),
          ...audit(accepted, rejectionReason) });
        if (accepted) events.push(...magicEntries);
      };
      if (npcMagicCastVersion !== 1 || typeof settleNpcMagic !== 'function' || !state.magic) {
        finish(false, 'operation_unsupported');
        continue;
      }
      const settled = settleNpcMagic(state, actorId, op, `npc-magic:${jobId}:${actorId}`);
      const accepted = settled?.accepted === true;
      finish(accepted, accepted ? null : settled?.reason || 'operation_unsupported', accepted ? settled.entries || [] : []);
      continue;
    }
    const target = op.targetHandle ? actorTarget(state, actorId, op.targetHandle) : undefined;
    const social = runtimeRevisionForState(state).policy.conversationVersion === 1;
    const communication = social ? proposal.communication : undefined;
    const addresseeIds = Array.isArray(communication?.addresseeHandles)
      ? communication.addresseeHandles.map(handle => actorTarget(state, actorId, handle)) : undefined;
    const request = communication?.replyTo && pendingSocialRequests(state, actorId)
      .find(row => row.sourceObservationId === communication.replyTo);
    const staleCommunication = (dialogue.dialogueContextVersion === 1 && social && proposal.utterance && !communication)
      || communication && (!['speak', 'write'].includes(op.type) || !proposal.utterance
      || !['statement', 'ask', 'invite', 'reply', 'accept', 'decline', 'close'].includes(communication.kind)
      || !Array.isArray(addresseeIds) || addresseeIds.length > 4 || addresseeIds.some(id => !id)
      || new Set(addresseeIds).size !== addresseeIds.length
      || ['reply', 'accept', 'decline', 'close'].includes(communication.kind) && !communication.replyTo
      || communication.replyTo !== undefined && (!request || !addresseeIds.includes(request.senderId)));
    if ((op.targetHandle && !target) || staleCommunication) {
      ledger.considered[actorId] = state.worldTime;
      ledger.decisions.push({ actorId, accepted: false, at: state.worldTime, ...(sceneBeat ? { sceneBeat } : {}),
        ...audit(false, op.targetHandle && !target ? 'target_unavailable' : 'communication_unavailable') }); continue;
    }
    // Revalidate current world preconditions after earlier proposals. A denied
    // operation cannot acquire information or publish its success as prose.
    const view = actorPerception(state, actorId);
    const stageBeforeOperation = activeProcedure(state)?.stage;
    if (hasCaseRuntime(state)) state.caseRuntime.pendingActorIds = state.caseRuntime.pendingActorIds.filter(id => id !== actorId);
    const swapStep = op.type === 'case_step' && runtimeSwapOptions(state, actorId).find(row => row.id === op.subjectId);
    let accepted = true; let effects = []; let elapsed = 0; let deferredInspection = null;
    let deferredObjectInspection = null;
    if (op.type === 'move') {
      accepted = view.permittedDestinations.includes(op.destination);
      if (hasCaseRuntime(state)) elapsed = 20;
    } else if (op.type === 'read') {
      accepted = view.readable.some(row => row.id === op.subjectId)
        && (!hasCaseRuntime(state) || !['assembly', 'discussion', 'ballot', 'execution_ready', 'ending'].includes(view.case?.stage));
      if (hasCaseRuntime(state)) elapsed = 5;
    }
    else if (swapStep) { elapsed = 15; }
    else if (hasCaseRuntime(state) && ['case_step', 'report'].includes(op.type)) {
      const option = runtimeOptions(state, actorId).find(row => row.id === op.subjectId);
      const report = option?.kind === 'report' ? option : null;
      const objectInspection = objectInspectionTimingVersion === 1
        && option?.kind === 'inspect-object-evidence';
      if (objectInspection) {
        const intent = { type: 'case', operation: 'inspect', subjectId: option.objectId,
          inspectionEvidenceVersion: 1, summary: '检查本人眼前实际存在的材料' };
        try {
          validateProcedureIntent(procedureActorScene(state, actorId), intent);
          elapsed = caseActionSeconds('inspect');
          deferredObjectInspection = { intent, startedAt: state.worldTime, completesAt: state.worldTime + elapsed,
            key: `npc:${jobId}:${actorId}` };
        } catch { accepted = false; }
      } else {
        const result = report ? { accepted: true, events: [] }
          : runtimeOperation(state, actorId, op.subjectId, proposal.decision, `npc:${jobId}:${actorId}`);
        accepted = result.accepted && !(hasIntentRuntime(state.agentRuntimeRevision) && result.reason === 'awaiting_recipient'); effects = result.events;
        if (!report) elapsed = 15;
        // A report option is a capability, not an automatic discovery broadcast.
        if (report) {
          const submitted = settleProcedureIntent(state, actorId, { type: 'case', operation: 'report', subjectId: report.incidentId, summary: '通报本人发现的现场' }, `report:${jobId}:${actorId}`);
          accepted = submitted.accepted; elapsed = submitted.elapsed; effects.push(...submitted.events);
        }
      }
    } else if (hasCaseRuntime(state) && op.type === 'inspect') {
      try {
        validateProcedureIntent(procedureActorScene(state, actorId), {
          type: 'case', operation: 'inspect', subjectId: op.subjectId, summary: '检查本人眼前实际存在的材料' });
        elapsed = 120; deferredInspection = state.worldTime + elapsed;
      } catch { accepted = false; }
    } else if (op.type === 'inspect' || op.type === 'present') {
      const result = hasCaseRuntime(state) ? settleProcedureIntent(state, actorId,
        { type: 'case', operation: op.type, subjectId: op.subjectId, summary: '处理本人合法取得或眼前可检查的材料' }, `npc:${jobId}:${actorId}`)
        : caseNpcOperation(state, actorId, op);
      accepted = result.accepted; elapsed = hasCaseRuntime(state) ? result.elapsed : 0; effects = result.events;
    } else if (!['speak', 'write', 'wait'].includes(op.type)) accepted = false;
    const unavailableReasons = { move: 'destination_unavailable', read: 'reading_unavailable',
      case_step: 'case_step_unavailable', report: 'report_unavailable', inspect: 'inspection_unavailable',
      present: 'presentation_unavailable' };
    let rejectionReason = accepted ? null : Object.hasOwn(unavailableReasons, op.type)
      ? unavailableReasons[op.type] : 'operation_unsupported';
    if ((op.type === 'write' && actorForState(state, actorId).communication !== 'writing')
      || (op.type === 'speak' && actorForState(state, actorId).communication === 'writing')) {
      accepted = false; rejectionReason = 'communication_mode_unavailable';
    }
    ledger.considered[actorId] = state.worldTime;
    if (sceneBeat) (ledger.reviewAtByActor ||= {})[actorId] = state.worldTime + 30;
    ledger.decisions.push({ actorId, accepted, at: state.worldTime, operation: structuredClone(op), ...(sceneBeat ? { sceneBeat } : {}),
      ...audit(accepted, rejectionReason) });
    if (accepted && dialogue.dialogueContextVersion === 1 && proposal.decision?.strategy === 'refuse') {
      const notice = state.agentWorld?.broadcasts.at(-1);
      if (notice?.audienceIds.includes(actorId) && proposal.decision.sourceObservationIds
        ?.includes(actorObservationId(state, notice.id, actorId))) {
        (ledger.assemblyLifecycle ||= {})[actorId] = { noticeId: notice.id, status: 'declined', occurredAt: state.worldTime };
      }
    }
    if (!accepted) {
      // A checked physical failure is still an enacted, owner-addressed
      // observation. Do not lose it, or publish the proposal's success prose.
      events.push(...effects);
      if (effects.length && elapsed > 0) {
        const advanced = onElapsed(elapsed, actorId);
        if (advanced?.events) events.push(...advanced.events);
        if (advanced?.interrupted) break;
      }
      continue;
    }
    // Delivered NPC communication consumes the same story clock as player
    // speech. A zero-time wait must not authorize unlimited testimony before a
    // cutoff, nor let speech attached to a move finish before its travel time.
    if (semanticTiming) {
      if (['speak', 'write', 'wait', 'move', 'read'].includes(op.type)) elapsed = caseActionSeconds(op.type);
      else if (['inspect', 'present'].includes(op.type)) elapsed = caseActionSeconds(op.type);
      else if (op.type === 'case_step' && deferredObjectInspection === null) elapsed = caseActionSeconds('case_step');
      if (Number.isFinite(view.case?.remainingSeconds)) elapsed = Math.min(elapsed, view.case.remainingSeconds);
    } else if (hasCaseRuntime(state) && proposal.utterance) elapsed += Math.ceil(proposal.utterance.length / 6) + (elapsed === 0 ? 15 : 0);
    if (state.agentWorld) state.agentWorld.routes = state.agentWorld.routes.filter(route => route.actorId !== actorId);
    if (proposal.action) events.push(event(state, proposal.action, actorId));
    if (proposal.utterance) {
      const utterance = event(state, proposal.utterance, actorId, {
        delivery: actorForState(state, actorId).communication === 'writing' ? 'writing' : 'speech',
        targetId: target || addresseeIds?.[0] || (!social && actorRoom(state, actorId) === actorRoom(state, player) ? player : undefined),
        ...(communication ? { addresseeIds, communication: { kind: communication.kind,
          ...(communication.replyTo ? { replyToObservationId: communication.replyTo } : {}) } } : {}),
        observationKey: `npc:${jobId}:${actorId}`,
      });
      events.push(utterance);
      if (hasCaseRuntime(state) && activeProcedure(state)?.stage === 'discussion') activeProcedure(state).statements.push({
        id: `statement-${activeProcedure(state).statements.length + 1}`, speakerId: actorId, text: proposal.utterance,
        audienceIds: [...utterance.audienceIds],
      });
      if (hasCaseOne(state) && state.caseOne.stage === 'discussion') state.caseOne.statements.push({
        id: `statement-${state.caseOne.statements.length + 1}`, speakerId: actorId, text: proposal.utterance,
        audienceIds: [...utterance.audienceIds],
      });
    }
    const settleReading = () => {
      if (op.type !== 'read') return;
      const reads = ledger.readByActor ||= {}; const ids = reads[actorId] ||= [];
      if (!ids.includes(op.subjectId)) ids.push(op.subjectId);
      events.push(event(state, `阅读记录【${readingMaterial(state, op.subjectId, actorId).name}】：${readingMaterial(state, op.subjectId, actorId).text}`, actorId,
        { delivery: 'reading', audienceIds: [actorId], observationKey: `read:${jobId}:${actorId}` }));
    };
    // Keep frozen causal, decision@1 and fixed-case reading exactly where it
    // was. New causal timing waits for the full read plus delivered speech.
    const timedAcquisition = hasCaseRuntime(state) && causalTimingVersion === 1;
    const readCompletesAt = timedAcquisition && op.type === 'read' ? state.worldTime + elapsed : null;
    if (!timedAcquisition) settleReading();
    const settleMovement = () => {
      if (op.type !== 'move') return;
      // Causal travel completes on the shared clock, just like the player's
      // travel. A threat/cutoff during transit cannot grant an early arrival.
      if (hasCaseRuntime(state) && !actorPerception(state, actorId).permittedDestinations.includes(op.destination)) {
        events.push(event(state, '通行条件已经改变，脚步停在当前通路前。', actorId));
        return;
      }
      const fromRoom = actorRoom(state, actorId);
      const watchers = acquisitionAudience(state, actorId, { delivery: 'action' });
      if (hasCaseOne(state)) accepted = caseNpcMove(state, actorId, op.destination);
      else if (hasCaseRuntime(state)) runtimeSetRoom(state, actorId, op.destination);
      else state.agentPositions = { ...(state.agentPositions || {}), [actorId]: ROOM_CODES[op.destination] };
      if (accepted) {
        if (dialogue.dialogueContextVersion === 1 && fromRoom !== op.destination) {
          const notice = state.agentWorld?.broadcasts.at(-1);
          if (notice?.audienceIds.includes(actorId) && state.worldTime >= notice.occurredAt) {
            (ledger.assemblyLifecycle ||= {})[actorId] = { noticeId: notice.id, status: 'departed', occurredAt: state.worldTime };
          }
        }
        const arrival = acquisitionAudience(state, actorId, { delivery: 'action' });
        const audienceIds = [...new Set([...watchers, ...arrival])];
        const movementText = owner => `${isKnowledgeGated(state) && recognizedActors(state, owner).has(actorId) ? actorForState(state, actorId).name : actorForState(state, actorId).appearance}由${CREATED_ROOMS[fromRoom] || fromRoom}走向${CREATED_ROOMS[op.destination] || op.destination}。`;
        const movement = event(state, movementText(player), actorId, { audienceIds });
        if (isKnowledgeGated(state)) movement.textByActor = Object.fromEntries(audienceIds.map(owner => [owner, movementText(owner)]));
        effects.push(movement);
        if (followTargetId === actorId && watchers.includes(player) && actorRoom(state, player) === fromRoom
          && actorPerception(state, player).permittedDestinations.includes(op.destination)) {
          state.location = hasCaseOne(state) ? actorPerception(state, actorId).location : CREATED_ROOMS[op.destination];
          if (hasCaseOne(state)) state.agentPositions[player] = op.destination;
          else if (hasCaseRuntime(state)) runtimeSetRoom(state, player, op.destination);
          else state.phase = `agent_${op.destination}`;
          effects.push(event(state, `你依照原先明确的跟随打算，走到${state.location}。`, player));
        }
      }
    };
    if (!hasCaseRuntime(state)) settleMovement();
    events.push(...effects);
    if (elapsed > 0) {
      const advanced = onElapsed(elapsed, actorId);
      if (advanced?.events) events.push(...advanced.events);
      if (readCompletesAt !== null && state.worldTime >= readCompletesAt && !state.completed && runtimeActive(state, actorId)
        && ((!advanced?.interrupted && activeProcedure(state)?.stage === stageBeforeOperation)
          || (state.worldTime === readCompletesAt && stageBeforeOperation === 'investigation'
            && activeProcedure(state)?.stage === 'assembly' && activeProcedure(state).investigationDeadline === readCompletesAt))) settleReading();
      if (deferredInspection !== null && state.worldTime >= deferredInspection
        && (!advanced?.interrupted || (state.worldTime === deferredInspection && activeProcedure(state)?.stage === 'assembly'))) {
        const acquired = runtimeAcquire(state, actorId, op.subjectId, `npc:${jobId}:${actorId}`);
        if (acquired.accepted) events.push(...acquired.events.map(row => ({ ...row, audienceIds: [actorId] })));
      }
      if (deferredObjectInspection !== null && state.worldTime >= deferredObjectInspection.completesAt
        && !state.completed && runtimeActive(state, actorId)
        && (!advanced?.interrupted || (state.worldTime === deferredObjectInspection.completesAt
          && activeProcedure(state)?.stage === 'assembly'))) {
        const acquired = inspectionAcquisition(state, actorId, deferredObjectInspection.intent,
          deferredObjectInspection.key, { startedAt: deferredObjectInspection.startedAt,
            completesAt: deferredObjectInspection.completesAt, objectId: deferredObjectInspection.intent.subjectId });
        if (acquired.accepted) events.push(...acquired.events.map(row => ({ ...row, audienceIds: [actorId] })));
      }
      if (advanced?.interrupted) break;
    }
    if (swapStep && runtimeActive(state, actorId) && activeProcedure(state)?.stage === stageBeforeOperation) {
      const settled = runtimeSettleSwapStep(state, actorId, op.subjectId, proposal.decision, `${jobId}:${actorId}`);
      events.push(...settled.events);
    }
    if (hasCaseRuntime(state)) {
      const priorEffects = effects.length;
      settleMovement(); events.push(...effects.slice(priorEffects));
    }
    if (hasCaseRuntime(state) && (activeProcedure(state)?.stage !== stageBeforeOperation
      || effects.some(row => row.audienceIds?.includes(player) && /攻击|攻擊|刺向|扑向|撲向|迫近|举起.{0,8}(?:剑|劍|箭|武器)/u.test(row.text)))) break;
  }
  if (schedulerRoster?.length) {
    // The addressed actor is prepended, so batch size is not a roster offset.
    // Resume after the last actually considered actor in selection order, not
    // execution's resource order. Skipped/ineligible slots cannot pin the
    // cursor, and interrupted siblings keep their queued wakeups.
    const last = decisions.findLast(row => consideredActors.has(row.actorId));
    const index = schedulerRoster.findIndex(row => row.id === last?.actorId);
    if (index >= 0) ledger.cursor += (index - ledger.cursor % schedulerRoster.length
      + schedulerRoster.length) % schedulerRoster.length + 1;
  } else ledger.cursor += decisions.length;
  // New knowledge is acquired in persistEnactments' exact event order, so an
  // action preceding this person's first introduction stays unidentified.
  if (!isKnowledgeGated(state)) for (const row of events) learnIntroductions(state, row, introductionVersion);
  return events;
}
/** Addressing is a scheduling capability, not permission to read another owner. */
export function pendingSocialRequests(state, actorId) {
  if (runtimeRevisionForState(state).policy.conversationVersion !== 1) return [];
  return (state.agentAutonomy?.conversation?.requests || []).filter(request => request.recipientId === actorId
    && ['pending', 'deferred', 'accepted'].includes(request.status) && request.expiresAt > state.worldTime);
}
export function projectSocialRequests(state, actorId) {
  const requests = pendingSocialRequests(state, actorId);
  if (requests.length > 4) fail(); // The authoritative cap must not become silent projection truncation.
  return requests.map(request => ({
    id: request.id, kind: request.kind, sourceObservationId: request.sourceObservationId,
    senderHandle: actorHandle(actorId, request.senderId), status: request.status,
    reviewAt: request.reviewAt, expiresAt: request.expiresAt,
  }));
}
export function persistEnactments(state, events, { introductionVersion, conversationEventClockVersion } = {}) {
  if (introductionVersion !== undefined && (![1, 2, 3, 4, 5].includes(introductionVersion)
    || introductionVersion === 4 && !isKnowledgeGated(state))) fail();
  if (conversationEventClockVersion !== undefined && conversationEventClockVersion !== 1) fail();
  const ledger = enableAutonomy(state); const player = createdPlayerId(state);
  if (runtimeRevisionForState(state).policy.sceneBeatVersion === 1) for (const activity of state.agentWorld?.activityLog || []) {
    activity.learnedAt ??= state.worldTime;
  }
  const visible = [];
  for (const row of events) {
    learnIntroductions(state, row, introductionVersion);
    const actor = row.speakerId && actorForState(state, row.speakerId);
    const visibleActor = actor && (state.caseRuntime?.occupiedBody ? runtimePhysicalActor(state, actor.id) : actor);
    const label = visibleActor ? state.known.includes(visibleActor.id) ? visibleActor.name : visibleActor.appearance : '眼前的动静';
    // A new self-report may arrive with a pre-recognition appearance label
    // from event normalization. Upgrade only this freshly delivered row, not
    // earlier transcript rows or an unheard private introduction.
    const speaker = isKnowledgeGated(state) && actor ? label
      : [1, 2, 3, 4, 5].includes(introductionVersion) && actor && ['speech', 'writing'].includes(row.delivery)
        && row.audienceIds.includes(player) && state.known.includes(actor.id) ? actor.name : row.speaker || label;
    const clean = { ...row, speaker,
      ...(runtimeRevisionForState(state).policy.sceneBeatVersion === 1 ? { learnedAt: row.learnedAt ?? state.worldTime } : {}) };
    if (runtimeRevisionForState(state).policy.conversationVersion === 1 && row.observationKey && row.speakerId
      && ['speech', 'writing'].includes(row.delivery)) {
      const communication = row.communication || { kind: 'statement' };
      const delivered = { id: row.observationKey, speakerId: row.speakerId,
        addresseeIds: (row.addresseeIds || []).filter(id => row.audienceIds.includes(id)), audienceIds: [...row.audienceIds],
        observationIdsByActor: Object.fromEntries(row.audienceIds.map(id => [id, actorObservationId(state, row.observationKey, id)])),
        occurredAt: row.occurredAt, kind: communication.kind,
        ...(communication.replyToObservationId ? { replyToObservationId: communication.replyToObservationId } : {}) };
      ledger.conversation = applyConversationEvent(ledger.conversation, delivered,
        { worldTime: conversationEventClockVersion === 1 ? row.occurredAt : state.worldTime }).state;
    }
    if (row.audienceIds.includes(player)) visible.push(clean);
    else ledger.events.push({ ...clean, id: `private-event-${ledger.events.length + 1}` });
  }
  if (runtimeRevisionForState(state).policy.conversationVersion === 1) {
    // Silence still advances the request lifecycle. Read-only projections must
    // not silently substitute expiry for an unchanged authoritative ledger.
    ledger.conversation = advanceConversationState(ledger.conversation, { worldTime: state.worldTime }).state;
  }
  return visible;
}

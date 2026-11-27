import { isDeepStrictEqual } from 'node:util';
import { runtimeCapabilityId } from '../content/runtime-capabilities.mjs';
import { GUARD_RULES, GUARD_FINGERPRINT } from './guard-rules.mjs';
export { GUARD_RULES, GUARD_FINGERPRINT } from './guard-rules.mjs';
import { confinementApplies, lawfulConfinementPlace, unlawfulResidenceBoundary, CURFEW_POLICY } from './curfew-policy.mjs';
import { actorForState, createdPlayerId, ROOM_CODES } from '../creation/player-setup.mjs';
import { runtimeRoom, runtimeSetRoom, runtimeActive, runtimeObserve } from '../case-runtime.mjs';
import { prisonPassage } from './prison-activity.mjs';
import { validateDiceOpportunity, diceCharacter, checkSpecification, evaluateD20, diceData } from './dice-core.mjs';
import { startEscapeProtection, advanceEscapeProtection, REACTION_RULES } from './dice-reaction.mjs';
import { advanceCausalTime } from '../scenes/causal-scene.mjs';
import { scheduledCaseOneBoundary } from '../cases/case-one.mjs';
import { GUARD_CAPTURE_PROSE } from '../presentation/guard-capture-prose.mjs';
import { ABILITY_REFERENCE, isAbilityReference } from './magic/ability-definitions.mjs';
import { activateAbilityRuntime, spatialGuardOptions, validateSpatialChoice, resolveSpatialGuard, refreshAbilityVisits } from './magic/ability-runtime.mjs';

export const GUARD_DETENTION_ROOM = 'guard_detention';
export const GUARD_DETENTION_LABEL = '惩罚室';
const route = Object.freeze(['corridor', 'reception', 'infirmary', 'reception']);
const normalRoom = room => Object.hasOwn(ROOM_CODES, room) || room === 'infirmary';
const integer = value => Number.isSafeInteger(value) && value >= 0;
const identifier = value => typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,127}$/u.test(value);
const exact = (value, keys) => value && !Array.isArray(value) && typeof value === 'object'
  && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
const fail = (code = 'INVALID_AGENT_STATE', message = '看守规则、待决遭遇或宿主结算与封存记录不一致。') => {
  throw Object.assign(new Error(message), { code });
};
const stage = state => state.caseOne && state.storyArc?.status !== 'aftermath' ? state.caseOne.stage : state.caseRuntime?.procedure?.stage;
const daily = state => !state.completed && (!state.caseOne || state.storyArc?.status === 'aftermath')
  && [undefined, null, 'daily', 'aftermath'].includes(stage(state)) && state.creation?.scenarioId !== 'case-1';
const guardRevisions = new Set(['agent-prison-runtime@5', 'agent-prison-runtime@6', 'agent-prison-runtime@7', 'agent-prison-runtime@8']);
const supported = state => state?.exampleId === 'agent' && state.agentFormatVersion === 3 && guardRevisions.has(runtimeCapabilityId(state.agentRuntimeRevision)) && daily(state);
const authoredBoundary = (state, toTime) => scheduledCaseOneBoundary(state, toTime, state.creation?.storyArcId ? 1 : undefined);
export function guardEnabled(state) {
  const g = state?.guardReaction;
  if (g === undefined) return false;
  if (!exact(g, ['version', 'rulesRef', 'fingerprint', 'activatedAt', 'serial', 'warningDeadline', 'patrol', 'pending', 'resolution', 'protection', 'detention'])
    || g.version !== GUARD_RULES.version || g.rulesRef !== GUARD_RULES.ref || g.fingerprint !== GUARD_FINGERPRINT
    || !guardRevisions.has(runtimeCapabilityId(state.agentRuntimeRevision)) || !integer(g.activatedAt) || !integer(g.serial)
    || !exact(g.patrol, ['room', 'cursor', 'nextAt']) || !integer(g.patrol.cursor) || g.patrol.cursor >= route.length
    || g.patrol.room !== route[g.patrol.cursor] || !integer(g.patrol.nextAt)
    || !integer(g.warningDeadline) && g.warningDeadline !== null) fail();
  return true;
}
export const guardDetained = state => guardEnabled(state) && state.guardReaction.detention?.status === 'detained';
export const guardProtected = state => guardEnabled(state) && state.guardReaction.protection?.remainingActions > 0;
export function guardView(state) {
  const enabled = guardEnabled(state); const g = enabled ? state.guardReaction : null;
  return { version: 1, enabled,
    pending: g?.pending ? { id: g.pending.id, opportunityId: g.pending.opportunity.id, label: g.pending.opportunity.label, entryIndex: g.pending.entryIndex } : null,
    resolution: g?.resolution ? { encounterId: g.resolution.encounterId, result: structuredClone(g.resolution.result), entryIndex: g.resolution.entryIndex } : null,
    protection: g?.protection?.remainingActions > 0 ? { remainingActions: g.protection.remainingActions,
      maxActionSeconds: REACTION_RULES.maxActionSeconds, label: '暂时甩开看守；接下来两次短行动不被重新抓捕。' } : null,
    detention: g?.detention ? { encounterId: g.detention.encounterId, roomId: GUARD_DETENTION_ROOM, label: GUARD_DETENTION_LABEL,
      status: g.detention.status, startedAt: g.detention.startedAt, releaseAt: g.detention.releaseAt,
      remainingSeconds: g.detention.status === 'suspended' ? g.detention.remainingSeconds : Math.max(0, g.detention.releaseAt - state.worldTime),
      ...(g.detention.caseBoundaryAt === null ? {} : { caseBoundaryAt: g.detention.caseBoundaryAt }) } : null };
}
export function guardOpportunity(state) {
  if (!guardEnabled(state) || !state.guardReaction.pending) return null;
  const pending = state.guardReaction.pending;
  if (Object.hasOwn(pending, 'magicRules')) {
    if (!isAbilityReference(pending.magicRules)) fail();
    const sealed = spatialGuardOptions(state);
    const options = pending.opportunity.options.filter(row => row.id.startsWith('spatial-'));
    if (!isDeepStrictEqual(options, sealed.map(row => row.option))) fail();
    for (const { option, choice } of sealed) if (!isDeepStrictEqual(pending.choices[option.id], choice)) fail();
  } else if (pending.opportunity.options.some(row => row.id.startsWith('spatial-'))) fail();
  return structuredClone(validateDiceOpportunity(pending.opportunity));
}
export function validateGuardScenePin(state, action) {
  const expected = guardEnabled(state) ? { ref: GUARD_RULES.ref, fingerprint: GUARD_FINGERPRINT } : undefined;
  if (expected ? !isDeepStrictEqual(action.guardRules, expected) : Object.hasOwn(action, 'guardRules')) fail();
}
export function assertGuardOrdinaryAction(state) {
  if (!guardEnabled(state)) return;
  if (state.guardReaction.pending) fail('GUARD_REACTION_PENDING', '看守正伸手拦截；请先处理当前弹出的反应检定。');
  if (guardDetained(state)) fail('GUARD_DETAINED', '你正被关在惩罚室；只能提交禁闭等待或到期释放的宿主行动。');
  if (state.guardReaction.detention?.status === 'suspended' && daily(state) && authoredBoundary(state, state.worldTime) === null) {
    fail('GUARD_DETENTION_RESUME_REQUIRED', '案件边界已经处理，请先恢复剩余禁闭；不能用普通日常行动免除刑期。');
  }
}
function event(state, text, key, audienceIds = [createdPlayerId(state)]) {
  return { text, speaker: '眼前的动静', speakerId: null, delivery: 'action', audienceIds,
    occurredAt: state.worldTime, observationKey: key };
}
function visibleRoom(guardRoom, playerRoom) {
  return guardRoom === playerRoom || guardRoom === 'corridor' && Object.keys(ROOM_CODES).includes(playerRoom)
    && !['corridor', 'reception'].includes(playerRoom);
}
const cadence = state => confinementApplies(state) ? 18 : 60;
const playerCode = room => ROOM_CODES[room] || (room === 'infirmary' ? 'INFIRMARY' : undefined);
function escapeDestinations(state, room) {
  const exits = room === 'corridor' ? Object.keys(ROOM_CODES).filter(id => id !== 'corridor')
    : room === 'reception' ? ['corridor', 'infirmary'] : room === 'infirmary' ? ['reception'] : ['corridor'];
  return exits.filter(to => prisonPassage(state, { actorId: createdPlayerId(state), from: playerCode(room), to: playerCode(to) }));
}
/** Mutating clock boundary helper. It is never called from a view or timer. */
export function settleGuardBoundary(state, key) {
  if (!guardEnabled(state) || !daily(state)) return { events: [], interrupted: false };
  const g = state.guardReaction; const player = createdPlayerId(state); const room = runtimeRoom(state, player);
  if (g.pending) return { events: [], interrupted: true };
  const events = [];
  if (g.patrol.nextAt <= state.worldTime) {
    g.patrol.cursor = (g.patrol.cursor + 1) % route.length;
    g.patrol.room = route[g.patrol.cursor]; g.patrol.nextAt = state.worldTime + cadence(state);
    // Routine patrol is private simulation, not a transcript event every minute.
    // Long lawful waits must not expose the route or overflow scene budgets.
  }
  const deadline = normalRoom(room) ? unlawfulResidenceBoundary(state, player, room, state.worldTime + CURFEW_POLICY.warningSeconds) : null;
  if (deadline !== null && deadline > state.worldTime && deadline - CURFEW_POLICY.warningSeconds <= state.worldTime && g.warningDeadline !== deadline) {
    g.warningDeadline = deadline;
    events.push(event(state, '非放风时段即将开始，须回所属牢房；医务室留宿须有实际许可。在外滞留若被看守发现，将面临抓捕与两天禁闭。', `${key}:guard:warning:${deadline}`));
  }
  if (!normalRoom(room) || !runtimeActive(state, player) || guardProtected(state) || g.detention?.status === 'suspended'
    || !confinementApplies(state) || lawfulConfinementPlace(state, player, room) || !visibleRoom(g.patrol.room, room)) return { events, interrupted: false };
  const id = `guard-encounter-${++g.serial}`; const opportunityId = `${id}:reaction`;
  const destinations = escapeDestinations(state, room);
  const destination = destinations.find(to => to !== g.patrol.room) || destinations[0] || null;
  const spatial = spatialGuardOptions(state);
  const choices = { evade: { destination: null }, ...(destination ? { retreat: { destination } } : {}),
    ...Object.fromEntries(spatial.map(({ option, choice }) => [option.id, choice])) };
  const opportunity = validateDiceOpportunity({ id: opportunityId, label: '看守发现违规滞留，正伸手拦截',
    sourceKey: `guard:${GUARD_RULES.ref}:${id}`, actorId: player, options: [
      { id: 'evade', label: '侧身躲开抓握，在当前地点拉开距离', ability: 'dexterity', dc: 13,
        environmentModifier: 0, environmentReason: '当前地点内有短暂闪避空间；不跨越任何门锁' },
      ...(destination ? [{ id: 'retreat', label: '沿当前合法相邻通路退开', ability: 'wisdom', dc: 13,
        environmentModifier: 0, environmentReason: '仅沿宿主核验的现有通路退一步，不穿锁门' }] : []),
      ...spatial.map(row => row.option),
    ] });
  g.pending = { id, room, occurredAt: state.worldTime, opportunity, choices, entryIndex: null,
    ...(spatial.length ? { magicRules: structuredClone(ABILITY_REFERENCE) } : {}) };
  events.push(event(state, '看守在眼前发现你仍滞留在不获准的地点，沉重的脚步突然转向你，伸手封住近处的退路。抓握尚未落定，你还有一次立即反应的机会。', `guard:${id}:danger`));
  return { events, interrupted: true };
}
export function guardNextBoundary(state, toTime) {
  if (!guardEnabled(state) || !daily(state) || state.guardReaction.pending) return null;
  const g = state.guardReaction; const player = createdPlayerId(state); const room = runtimeRoom(state, player);
  const candidates = [g.patrol.nextAt];
  const deadline = unlawfulResidenceBoundary(state, player, room, toTime);
  if (deadline !== null) {
    candidates.push(deadline);
    if (g.warningDeadline !== deadline) candidates.push(deadline - CURFEW_POLICY.warningSeconds);
  }
  const future = candidates.filter(at => at > state.worldTime && at <= toTime);
  return future.length ? Math.min(...future) : null;
}
export function guardActionSeconds(state, seconds) {
  return guardProtected(state) ? Math.min(seconds, REACTION_RULES.maxActionSeconds) : seconds;
}
export function finishGuardAction(state, actionId, elapsedSeconds, kind = 'wait') {
  if (!guardProtected(state)) return;
  state.guardReaction.protection = advanceEscapeProtection(state.guardReaction.protection, {
    id: actionId, elapsedSeconds, kind: kind === 'move' ? 'move' : 'wait', committed: true, voluntaryRecontact: false,
  }).protection;
}
/** Rebind only newly created markers after the final composed transcript has
 * replaced canonical entries. Historical indices are never recomputed. */
export function finalizeGuardEntries(state, startIndex) {
  if (state.abilityRuntime && state.agentActions.some(row => row.type === 'guard_magic_rules_activate')) refreshAbilityVisits(state);
  if (!guardEnabled(state) || state.entries.length <= startIndex) return;
  const g = state.guardReaction;
  if (g.pending && (g.pending.entryIndex === null || g.pending.entryIndex >= startIndex)) g.pending.entryIndex = state.entries.length - 1;
  if (g.resolution && (g.resolution.entryIndex === null || g.resolution.entryIndex >= startIndex)) g.resolution.entryIndex = state.entries.length - 1;
}
function publish(state, events) {
  runtimeObserve(state, events);
  for (const row of events.filter(row => row.audienceIds.includes(createdPlayerId(state)))) {
    state.entries.push({ ...row, id: `entry-${state.entries.length + 1}` });
  }
}
// Unmarked journal actions replay their original entries. Reading prose is appended
// only to the player's transcript, never published as a witnessed event.
function exactStoryAction(action, keys) {
  return exact(action, keys) || (action.narrationVersion === 1 && exact(action, [...keys, 'narrationVersion']));
}
function ownerNarration(state, text) {
  state.entries.push({ id: `entry-${state.entries.length + 1}`, speaker: '旁白', text, speakerId: null,
    delivery: 'narration', audienceIds: [createdPlayerId(state)], occurredAt: state.worldTime });
}
function narrate(state, action, text) {
  if (action.narrationVersion === 1) ownerNarration(state, text);
}
function escort(state, room) {
  if (!runtimeSetRoom(state, createdPlayerId(state), room)) fail();
  if (state.agentWorld) state.agentWorld.routes = state.agentWorld.routes.filter(row => row.actorId !== createdPlayerId(state));
}
export function guardDiceNarrationVersion(state, result, optionId) {
  const choice = state.guardReaction?.pending?.choices?.[optionId];
  return runtimeCapabilityId(state.agentRuntimeRevision) === 'agent-prison-runtime@8'
    && result?.success === false && choice && choice.kind !== 'spatial-shift' ? 2 : 1;
}
function resolve(state, action) {
  const keys = ['type', 'encounterId', 'opportunityId', 'optionId', 'result'];
  const captureProse = action.narrationVersion === 2;
  if (!(captureProse ? exact(action, [...keys, 'narrationVersion']) : exactStoryAction(action, keys))) fail();
  const g = state.guardReaction; const pending = g.pending;
  if (!pending || action.encounterId !== pending.id || action.opportunityId !== pending.opportunity.id
    || !Object.hasOwn(pending.choices, action.optionId) || runtimeRoom(state, createdPlayerId(state)) !== pending.room) fail();
  const spec = checkSpecification(diceCharacter(state), { mode: 'opportunity', opportunity: guardOpportunity(state), optionId: action.optionId });
  const expected = { id: action.result?.id, ...evaluateD20(spec, action.result?.die) };
  if (!identifier(expected.id) || !isDeepStrictEqual(expected, action.result)) fail('INVALID_GUARD_DICE_RESULT', '骰果不符合当前封存的看守反应选项，未改变世界。');
  const result = structuredClone(action.result); const choice = pending.choices[action.optionId];
  const spatial = choice.kind === 'spatial-shift';
  if (captureProse && guardDiceNarrationVersion(state, result, action.optionId) !== 2) fail();
  if (spatial) validateSpatialChoice(state, choice);
  const abilityEvents = spatial ? resolveSpatialGuard(state, choice, result, pending) : [];
  if (result.success) {
    if (choice.destination && !spatial) {
      if (!escapeDestinations(state, pending.room).includes(choice.destination)) fail();
      escort(state, choice.destination);
    }
    g.protection = startEscapeProtection({ result, opportunityId: pending.opportunity.id, encounterId: pending.id,
      actionId: `guard-resolution:${pending.id}`, escapedTo: runtimeRoom(state, createdPlayerId(state)), at: state.worldTime });
    publish(state, spatial ? abilityEvents : [event(state, choice.destination ? '你及时避开抓握，沿眼前已获准通行的相邻通路退开一步，暂时甩开看守。'
      : '你侧身躲过看守伸来的手，在当前地点内拉开距离，暂时甩开追捕。', `guard:${pending.id}:escaped`)]);
    narrate(state, action, spatial ? '眼前一晃，我已经站在记得的地方。看守伸来的手没能碰到我。'
      : choice.destination ? '我顺着来得及退开的那条路迈出一步。再回头时，那只手已经够不着我了。'
        : '那只手擦着我身侧落了空。我还站在原处，和看守之间却多出了一点空隙。');
  } else {
    g.protection = null;
    g.detention = { encounterId: pending.id, status: 'detained', startedAt: state.worldTime,
      releaseAt: state.worldTime + GUARD_RULES.detentionSeconds, remainingSeconds: GUARD_RULES.detentionSeconds, caseBoundaryAt: null };
    escort(state, GUARD_DETENTION_ROOM);
    publish(state, [event(state, spatial ? '你还未来得及集中精神完成穿梭，看守的抓握便已落下，将你实际控制并沿管理通路押入惩罚室。门在身后锁上，两天禁闭从现在开始；尚未凝成的空间印象散在脑海里。'
      : '你没能及时避开抓握，被看守实际控制并沿管理通路押入惩罚室。门在身后锁上，两天禁闭从现在开始；没有跳过这段故事时间。', `guard:${pending.id}:captured`)]);
    if (captureProse) for (const text of GUARD_CAPTURE_PROSE) ownerNarration(state, text);
    else narrate(state, action, spatial ? '脑海里的落脚处还没成形，我就被攥住了。惩罚室的门在身后落了锁。'
      : '那只手扣住了我。直到身后的门落了锁，我才把那口一直憋着的气吐出来。');
  }
  g.pending = null; g.resolution = { encounterId: pending.id, result, entryIndex: null };
}
const LOCAL_DETENTION_SECONDS = 30;
const detentionLead = /^我(?:慢慢|轻轻)?(?:(?<approach>(?:退|走|挪)到(?:惩罚室的)?门边)|(?:还|仍)?站在门边|(?:望向|看向)(?:眼前的)?门(?:的方向)?)(?<lock>[，,](?:听着锁响|想着刚才的锁响))?(?<cloth>[，,](?:手指发抖地)?攥住衣角)?[。！]$/u;
const detentionWait = /^我(?:(?:又|仍)?(?:望向|看向)(?:眼前的)?门(?:的方向)?[，,]|(?:侧耳听了听|听了听门那边的动静)[，,])?(?:再|继续|静静地)?(?:等(?:(?:着|待)(?:门外的)?回应|(?:了)?(?:一会儿|一小会儿|片刻|一下))|稍等片刻)[。！]$/u;
const detentionLook = /^(?:我)?(?<motion>转身|回身|抬眼|抬头)?(?:打量|看看|看了看|环顾)(?:这间|一下|一眼)?(?:惩罚室|四周|屋里|室内|里面)(?:[，,](?:看看|想看看)(?:屋里|里面|四周)有什么)?[。！]$/u;
const letGoOfHem = /^(?:我)?(?<pace>慢慢|轻轻)?松开(?:了)?(?:攥着衣角的手|攥住衣角的手|手里攥着的衣角|衣角)$/u;
function localDetentionLookParts(text) {
  const clauses = text.split(/[，,]/u).map(clause => clause.trim());
  const wait = clauses.length > 1 && /^我(?:(?:又|再|静静地)?等了?(?:一小?会儿|片刻|一下)|稍等片刻)$/u.test(clauses[0])
    ? clauses.shift() : null;
  const hands = letGoOfHem.exec(clauses[0]);
  if (hands) clauses.shift();
  const look = detentionLook.exec(clauses.join('，'));
  return look ? { look: true, motion: look.groups.motion ?? '', ...(wait && { wait }),
    ...(hands && { hands: hands.groups.pace ?? '' }) } : null;
}
function localDetentionParts(rawInput, { localLook = false } = {}) {
  if (typeof rawInput !== 'string' || rawInput.length > 700 || /[<>\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(rawInput)) return null;
  const paragraphs = rawInput.trim().split(/\r?\n[ \t]*\r?\n(?:[ \t]*\r?\n)*/u).map(text => text.trim());
  if (paragraphs.length === 1) return detentionWait.test(paragraphs[0]) ? { wait: paragraphs[0] }
    : localLook ? localDetentionLookParts(paragraphs[0]) : null;
  if (paragraphs.length !== 3 || !detentionWait.test(paragraphs[2])) return null;
  const start = detentionLead.exec(paragraphs[0]);
  const speech = /^「([^「」『』“”"\r\n]{1,360})」$/u.exec(paragraphs[1])?.[1];
  return start && speech?.trim() ? { start: paragraphs[0], ...start.groups, speech, wait: paragraphs[2] } : null;
}
function localDetentionSource(state, rawInput, localLook = false) {
  const parts = localDetentionParts(rawInput, { localLook });
  if (!parts || !supported(state) || !guardDetained(state) || state.caseRuntime?.occupiedBody) return null;
  const player = createdPlayerId(state);
  const { detention, pending, resolution } = state.guardReaction;
  if (pending || runtimeRoom(state, player) !== GUARD_DETENTION_ROOM || !runtimeActive(state, player)
    || parts.speech && actorForState(state, player)?.communication !== 'speech'
    || resolution?.encounterId !== detention.encounterId || resolution.result?.success !== false
    || state.worldTime >= detention.releaseAt || detention.caseBoundaryAt !== null) return null;
  const capturedNow = state.worldTime === detention.startedAt && state.entries.some(row =>
    row.observationKey === `guard:${detention.encounterId}:captured` && row.occurredAt === detention.startedAt
    && row.audienceIds?.includes(player));
  if (parts.lock && !capturedNow) return null;
  const isLookOnly = parts.look && !parts.wait;
  const end = isLookOnly ? state.worldTime : Math.min(state.worldTime + LOCAL_DETENTION_SECONDS, detention.releaseAt);
  const boundary = authoredBoundary(state, end);
  return boundary === null || boundary > state.worldTime ? { parts, player, capturedNow, end, boundary } : null;
}
export function localDetentionAction(state, rawInput) {
  const source = localDetentionSource(state, rawInput, true);
  return source
    ? { type: 'guard_detention_local', version: source.parts.look ? 3 : 2,
      encounterId: state.guardReaction.detention.encounterId, rawInput } : null;
}

// Kept only to preserve byte-identical version 1 transcript replay.
const legacyFirstLockedDoorProse = Object.freeze([
  '刚才那一下落锁声已经过去了，耳朵却仍在等它的下半截，仿佛还能从那短短的一响里分辨出什么。被带进来和被关在这里，本来是前后挨着的两件事；等我听清门锁落下，才知道后面那一件还没有完。我望着门，又把这一声在心里过了一遍。记得它怎么响，和知道为什么响，是两回事。',
  '手指还在抖。我攥住衣角，注意力一时全被收进掌心，连想好的第一句话都变短了。我原本是想把问题从头问起的，话到嘴边，却先挤出一个等字。后面那句话不必像我在心里排过的那样整齐。只要还说得下去，我就先问下去。不然光是等自己镇定，恐怕就会把最想问的那一句留在喉咙里。',
  '两个问题说出口，才听出它们原来问的不是同一件事。前一个问我为什么到了这扇门里，后一个才问我做错了什么。刚才被扣住时，我只来得及明白自己没避开；现在我有时间分开想这两件事，却仍旧没有那个把它们接起来的答案。发问并没让事情清楚下来，至少我听见自己到底是在问什么了。',
  '我望向门的方向，没有再把那句话接着说第二次。门就在眼前；门外有没有人听见，和门是不是关着，并不是凭同一双眼睛就能知道的事。我把自己能确定的留在这边：我到了门边，我问出了那两句话，此刻还在等。至于另一边会不会有一句话接过来，我没有替它想好。我想知道的，正是我开口之前不知道的那一截。',
  '等待比刚才说话时慢一些。发问时，我的心思全在那些还没说出来的字上；说完了，才发现已经没法靠把同一句话再想一个开头来挨过这片刻。攥着的是自己的衣角，望着的仍是眼前这扇门。没有哪一样能替我解答。我也就不急着把刚才的问句改成别的话，仍朝着门，给那个尚未听见的回答留一点空处。',
]);
function shortDetentionLead(parts) {
  if (parts.approach && parts.cloth) return `我${parts.approach}，攥住衣角。${parts.cloth.includes('发抖') ? '手指还在抖。' : ''}`;
  // The lock was already narrated at capture. Write only this input's new action.
  return parts.lock ? parts.start.replace(parts.lock, '') : parts.start;
}
function localDetentionActionApply(state, action) {
  const source = localDetentionSource(state, action.rawInput, action.version === 3);
  const detention = state.guardReaction.detention;
  if (!exact(action, ['type', 'version', 'encounterId', 'rawInput']) || ![1, 2, 3].includes(action.version)
    || !source || (action.version === 3) !== Boolean(source.parts.look) || action.encounterId !== detention.encounterId) fail();
  const { parts, player, capturedNow, end, boundary } = source;
  const key = `guard:${detention.encounterId}:local:${state.revision}:${state.worldTime}`;
  const askedAboutCapture = /^等(?:[、，,]\s*等)?一下[….。\s]+为什么(?:要)?(?:把我关起来|关我|把我关在这里)[？?]\s*我(?:做错了什么|哪里做错了|哪儿做错了)[？?]$/u;
  const legacyExtended = action.version === 1 && capturedNow && parts.approach && parts.lock && parts.cloth?.includes('发抖')
    && askedAboutCapture.test(parts.speech ?? '') && /望向门的方向[，,]等着门外的回应/u.test(parts.wait);
  const narration = text => ownerNarration(state, text);
  if (legacyExtended) {
    narration(`我${parts.approach}。${legacyFirstLockedDoorProse[0]}`);
    narration(legacyFirstLockedDoorProse[1]);
  } else if (parts.start) narration(action.version === 2 ? shortDetentionLead(parts)
    : parts.lock ? parts.start.replace(/听着锁响/u, '想着刚才的锁响') : parts.start);
  if (parts.speech) publish(state, [{ text: parts.speech, speaker: actorForState(state, player).name,
    speakerId: player, delivery: 'speech', audienceIds: [player], addresseeIds: [], occurredAt: state.worldTime,
    observationKey: `${key}:speech` }]);
  const advanced = parts.wait ? advanceCausalTime(state, Math.min(end, boundary ?? end), key, {
    npcReactions: false, storyArcVersion: state.creation?.storyArcId ? 1 : undefined,
    guardDetentionWait: true, guardCaseBoundary: boundary,
  }) : { events: [], interrupted: false };
  publish(state, advanced.events.map(row => row.speaker ? row : { ...row, speaker: '眼前的动静' }));
  detention.remainingSeconds = Math.max(0, detention.releaseAt - state.worldTime);
  if (state.worldTime === boundary) detention.caseBoundaryAt = boundary;
  if (advanced.interrupted || state.worldTime >= detention.releaseAt) narration('我还在门的这一边。');
  else if (parts.look) {
    const wait = parts.wait ? `${parts.wait.replace(/^我/u, '')}。` : '';
    const hands = parts.hands === undefined ? '' : `${parts.hands}松开衣角，`;
    narration(`${wait}我${hands}${parts.motion}打量惩罚室。`);
  }
  else if (legacyExtended) legacyFirstLockedDoorProse.slice(2).forEach(narration);
  else if (action.version === 2 && parts.speech && /^我望向门的方向[，,]等着门外的回应[。！]$/u.test(parts.wait)) {
    const heardVoice = advanced.events.some(row => row.delivery === 'speech' && row.audienceIds.includes(player));
    narration(heardVoice ? '我望着门等了一会儿。' : '我望着门等了一会儿，没听到回答。');
  } else narration(parts.wait);
}

function detentionAction(state, action) {
  if (!exactStoryAction(action, ['type', 'encounterId']) || !state.guardReaction.detention
    || action.encounterId !== state.guardReaction.detention.encounterId) fail();
  const g = state.guardReaction; const d = g.detention;
  if (action.type === 'guard_release') {
    if (d.status !== 'detained') fail();
    const complete = state.worldTime >= d.releaseAt;
    const handoff = d.caseBoundaryAt === state.worldTime && authoredBoundary(state, state.worldTime) !== null;
    if (!complete && !handoff) fail('GUARD_DETENTION_NOT_DUE', '禁闭尚未到期，也没有待处理的制度案件边界。');
    if (complete) g.detention = null;
    else { d.status = 'suspended'; d.remainingSeconds = Math.max(0, d.releaseAt - state.worldTime); }
    escort(state, 'corridor');
    publish(state, [event(state, complete ? '两天禁闭已经实际结束，看守打开惩罚室并押送你回到走廊；其他门锁仍按当前作息执行。'
      : '制度事件需要处理，看守暂时中止禁闭并押送你回到走廊。剩余禁闭仍被记录，不因这次移送免除。', `guard:${d.encounterId}:release:${state.worldTime}`)]);
    narrate(state, action, complete ? '我跟着看守跨过门槛，脚下又是走廊。惩罚室里的这两天，总算过完了。'
      : '我被带回走廊，却还要回那扇门里去。没熬完的那段禁闭，还在等着我。');
    return;
  }
  if (action.type !== 'guard_detention_wait') fail();
  if (d.status === 'suspended') {
    if (!daily(state) || authoredBoundary(state, state.worldTime) !== null) fail();
    d.status = 'detained'; d.releaseAt = state.worldTime + d.remainingSeconds; d.caseBoundaryAt = null;
    escort(state, GUARD_DETENTION_ROOM);
    publish(state, [event(state, '日常秩序恢复，看守将你押回惩罚室，继续执行此前尚未度过的禁闭。', `guard:${d.encounterId}:resume:${state.worldTime}`)]);
  }
  if (d.status !== 'detained' || state.worldTime >= d.releaseAt) fail('GUARD_DETENTION_NOT_WAITING', '禁闭已经到期，请提交释放行动。');
  const interruptedProse = '我望着惩罚室的门。等待被打断了，我却还在门的这一边。';
  const dueProse = '这两天终于熬到了头。我看着眼前那扇还没打开的门，等看守来开锁。';
  const boundary = authoredBoundary(state, d.releaseAt);
  if (boundary !== null && boundary <= state.worldTime) {
    if (d.caseBoundaryAt === state.worldTime) fail('GUARD_CASE_BOUNDARY', '已到制度事件边界，请先提交释放移送，不能等待越过案件。');
    d.caseBoundaryAt = state.worldTime;
    publish(state, [event(state, '禁闭中的等待停在当前已经到来的制度事件边界；须由看守移送后处理，剩余禁闭没有被免除。', `guard:${d.encounterId}:case-boundary:${state.worldTime}`)]);
    narrate(state, action, interruptedProse);
    return;
  }
  const target = Math.min(d.releaseAt, boundary ?? d.releaseAt);
  const advanced = advanceCausalTime(state, target, `guard:${d.encounterId}:wait:${state.worldTime}`, {
    npcReactions: false, storyArcVersion: state.creation?.storyArcId ? 1 : undefined,
    guardDetentionWait: true, guardCaseBoundary: boundary,
  });
  publish(state, advanced.events);
  d.remainingSeconds = Math.max(0, d.releaseAt - state.worldTime);
  if (boundary !== null && state.worldTime === boundary) d.caseBoundaryAt = boundary;
  publish(state, [event(state, d.caseBoundaryAt === state.worldTime ? '禁闭中的等待停在制度事件到来的时刻，尚未越过这道边界；剩余禁闭仍待执行。'
    : state.worldTime >= d.releaseAt ? '惩罚室里的两天已经在共享时钟上度过，禁闭到期；门仍须由看守打开。'
      : '你仍在惩罚室内等待；外界的实际事件打断了这次等待，剩余禁闭没有被跳过。', `guard:${d.encounterId}:wait-ended:${state.worldTime}`)]);
  narrate(state, action, state.worldTime >= d.releaseAt ? dueProse : interruptedProse);
}
export function applyGuardHostAction(state, input) {
  const action = diceData(input);
  if (!action?.type?.startsWith('guard_')) return false;
  if (!integer(state?.revision) || !Array.isArray(state.agentActions) || !Array.isArray(state.entries) || state.completed) fail();
  const draft = structuredClone(state); const start = draft.entries.length;
  if (action.type === 'guard_rules_activate') {
    if (!exact(action, ['type', 'rulesRef', 'fingerprint']) || action.rulesRef !== GUARD_RULES.ref || action.fingerprint !== GUARD_FINGERPRINT) fail();
    if (!supported(draft)) fail('GUARD_RULES_UNSUPPORTED', '看守规则仅支持具有 @5/@6 宵禁契约的正常或案后日常，不能迁移旧执行版本或固定案件开局。');
    if (draft.guardReaction !== undefined) fail('GUARD_RULES_ALREADY_ACTIVE', '当前存档已封存看守规则，不能重复激活。');
    draft.guardReaction = { version: 1, rulesRef: GUARD_RULES.ref, fingerprint: GUARD_FINGERPRINT,
      activatedAt: draft.worldTime, serial: 0, warningDeadline: null,
      patrol: { room: 'corridor', cursor: 0, nextAt: draft.worldTime + cadence(draft) }, pending: null, resolution: null, protection: null, detention: null };
  } else {
    if (!guardEnabled(draft)) fail('GUARD_RULES_DISABLED', '当前存档尚未显式激活看守规则。');
    if (action.type === 'guard_magic_rules_activate') activateAbilityRuntime(draft, action);
    else if (action.type === 'guard_dice_resolution') resolve(draft, action);
    else if (action.type === 'guard_detention_local') localDetentionActionApply(draft, action);
    else detentionAction(draft, action);
  }
  finalizeGuardEntries(draft, start);
  draft.agentActions.push(structuredClone(action)); draft.revision++;
  if (draft.abilityRuntime) refreshAbilityVisits(draft);
  if (!integer(draft.revision) || !integer(draft.worldTime)) fail();
  Object.assign(state, draft); return true;
}

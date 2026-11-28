import { isDeepStrictEqual } from 'node:util';
import { EVENT_DIRECTOR_RUNTIME_REVISION } from '../director/director-event-runtime.mjs';
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
import { caseActionSeconds } from '../cases/case-action-timing.mjs';
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
// A fresh same-room escape observation is direction context, not a new
// sighting, an audible target, or permission to re-engage the patrol.
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
function holdInDetention(state, encounterId) {
  const g=state.guardReaction;
  g.protection = null;
  g.detention = { encounterId, status: 'detained', startedAt: state.worldTime,
    releaseAt: state.worldTime + GUARD_RULES.detentionSeconds, remainingSeconds: GUARD_RULES.detentionSeconds, caseBoundaryAt: null };
  escort(state, GUARD_DETENTION_ROOM);
}

// Bind only immediate surrender, not a promise for later, uncertainty, a
// reported quotation, any attempt to escape, or merely showing empty hands.
const givesUp = /^(?:我\s*)?(?:主动(?:向看守)?投降|投降|放弃(?:抵抗|反抗)|放棄(?:抵抗|反抗)|(?:主动|自愿|自願|现在|現在)?接受(?:看守的?)?(?:拘捕|抓捕|拘押)|(?:任由|让|讓)看守(?:控制我|抓住我|扣住我|抓捕我|把我带走|把我帶走))$/u;
const noResistance = /^(?:(?:我\s*)?(?:不(?:会|會|再)?(?:反抗|抵抗)|没有躲闪|沒有躲閃|不躲闪|不躲閃|不再躲避|不再闪避|不再閃避))$/u;
const stand = /^(?:我\s*)?(?:(?:就|仍|继续|繼續)?(?:站(?:在|住在)原地|留在原地|停在原地|停下脚步|停下腳步))$/u;
const visibleHands = /^(?:我\s*)?(?:(?:把|将|將)(?:自己(?:的)?|我的)?(?:空着的|空著的)?(?:双手|雙手|两手|兩手)(?:(?:保持|放)在(?:看守(?:能|可以)?看[见見]的)?(?:位置|地方)|(?:放|摆|擺)在身前|摊开|攤開)|保持(?:自己(?:的)?|我的)?(?:双手|雙手|两手|兩手)(?:可见|可見)|(?:让|讓)(?:双手|雙手|两手|兩手)(?:露出来|露出來|露在外面))$/u;
export function guardSurrenderSource(rawInput) {
  if (typeof rawInput!=='string' || !rawInput.trim() || rawInput.length>700 || /[<>\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\p{Cf}]/u.test(rawInput)) return null;
  const parts=rawInput.trim().split(/\r?\n[ \t]*\r?\n/u).map(s=>s.trim());
  if (parts.length>2 || !parts[0].startsWith('我')) return null;
  const head=parts[0].replace(/[。！!.]$/u,'').split(/[，,]/u).map(t=>t.trim());
  const voice=parts.length===2 && /^(?:“([^”]+)”|「([^」]+)」|『([^』]+)』|"([^"]+)")$/u.exec(parts[1]);
  if (parts.length===2 && !voice || head.length>3 || head.some(x=>!(givesUp.test(x)||noResistance.test(x)||stand.test(x)||visibleHands.test(x)))) return null;
  const speech=voice ? voice.slice(1).find(x=>x!==undefined) : undefined;
  const line=speech?.replace(/[。！!.]$/u,'');
  if (speech && /[\r\n“”「」『』"]/u.test(speech)) return null;
  if (speech && !(givesUp.test(line)||noResistance.test(line))) return null;
  const pause=head.some(x=>stand.test(x)),hands=head.some(x=>visibleHands.test(x));
  const explicit=head.some(x=>givesUp.test(x)) || Boolean(speech&&givesUp.test(line));
  if (!explicit && !(pause&&hands&&speech&&noResistance.test(line))) return null;
  return {pause,hands,...(speech===undefined?{}:{speech})};
}
export function guardSurrenderAvailable(state) {
  if (state.agentRuntimeRevision!==EVENT_DIRECTOR_RUNTIME_REVISION || !guardEnabled(state) || !daily(state)
    || state.caseRuntime?.occupiedBody) return false;
  const pending=state.guardReaction.pending, player=createdPlayerId(state);
  return Boolean(pending && runtimeActive(state,player) && runtimeRoom(state,player)===pending.room);
}
export function guardSurrenderAction(state,rawInput) {
  if (!guardSurrenderAvailable(state)) return null;
  const pending=state.guardReaction.pending, player=createdPlayerId(state);
  const source=guardSurrenderSource(rawInput);
  return source && (!source.speech || actorForState(state,player)?.communication==='speech')
    ? {type:'guard_surrender',version:1,encounterId:pending.id,opportunityId:pending.opportunity.id,rawInput} : null;
}
function surrender(state,action) {
  if (!exact(action,['type','version','encounterId','opportunityId','rawInput']) || action.version!==1
    || !isDeepStrictEqual(guardSurrenderAction(state,action.rawInput),action)) fail('INVALID_GUARD_SURRENDER','主动接受拘捕须对应当前待决遭遇与原始行动。');
  const g=state.guardReaction, player=createdPlayerId(state), source=guardSurrenderSource(action.rawInput), key='guard:'+action.encounterId;
  if (source.pause || source.hands) {
    const text=source.pause && source.hands ? '我留在原地，让双手露在外面。' : source.pause ? '我留在原地。' : '我让双手露在外面。';
    publish(state,[{...event(state,text,key+':surrender-posture'),speaker:actorForState(state,player).name,speakerId:player}]);
  }
  if (source.speech) publish(state,[{text:source.speech,speaker:actorForState(state,player).name,speakerId:player,delivery:'speech',
    audienceIds:[player],addresseeIds:[],occurredAt:state.worldTime,observationKey:key+':surrender-voice'}]);
  holdInDetention(state,action.encounterId);
  publish(state,[event(state,'你主动接受看守控制，被沿管理通路押入惩罚室。门在身后锁上，两天禁闭从现在开始；没有跳过这段故事时间。',key+':captured')]);
  g.pending=null;g.resolution=null;
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
    holdInDetention(state, pending.id);
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
// v4 is observation of the current cell from where the player already is.
// It never infers a new prop, a newly heard lock, or a person beyond the door.
const recalledLock = /^(?:我\s*)?(?:(?:刚才|剛才)?(?:听(?:见|到)|聽(?:見|到))\s*(?:(?:身后|身後)的?|(?:惩罚室|懲罰室)的?)?(?:门|門)(?:(?:在我?身后|在我?身後))?(?:被)?(?:锁上|鎖上|落锁|落鎖)(?:的声音|的聲音)?|想(?:起|着|著)(?:刚才|剛才)(?:的)?(?:门锁|門鎖|落锁|落鎖)(?:声|聲|响|響)?)$/u;
const steadyBreath = /^(?:我\s*)?(?:(?:慢慢|缓缓|緩緩|轻轻|輕輕|长长地|長長地)\s*)?(?:呼出|吐出)(?:了)?(?:一|一小)?口气$/u;
const lockedDoorLook = /^(?:我\s*)?(?:(?<turn>转身|轉身|回身|回头|回頭|扭头|扭頭)\s*)?(?:看了看|看向|望向|望了望|打量|看看)\s*(?:(?:身后|身後|面前|眼前|这间|這間|惩罚室|懲罰室)(?:的)?)?(?:那扇|这扇|這扇)?(?:门|門)(?:的方向|一眼)?$/u;
const boundedRoomLook = /^(?:我\s*)?(?:(?:又|再|随后|隨後|接着|接著|然后|然後|顺势|順勢)\s*)?(?:(?<turn>转身|轉身|回身|回头|回頭|抬眼|抬头|抬頭)\s*)?(?:打量(?:了)?|看看|看了看|环顾|環顧|环视|環視)(?:了)?(?:这间|這間|一下|一眼)?(?:惩罚室|懲罰室|四周|周围|周圍|屋里|屋裡|屋内|屋內|室内|室內|里面|裡面|这里|這裡)(?:(?:里|裡|内|內)?(?:的)?(?:环境|環境|样子|樣子|情形))?$/u;
const selfQuoteAttribution = /^\s*我\s*(?:(?:低声|低聲|轻声|輕聲|小声|小聲|压低声音|壓低聲音|喃喃)(?:地)?)?(?:说(?:道|了句|了声)?|說(?:道|了句|了聲)?|自言自语|自言自語)\s*[，,：:]\s*$/u;
const quietStation = /^(?:我\s*)?(?:还|還|仍|继续|繼續|就)?(?:站在原地|留在原地|停在原地|待在原地|站着(?:没|沒有|不)动|站著(?:没|沒有|不)動|没有走动|沒有走動)$/u;
const quietEyeAdjustment = /^(?:我\s*)?(?:(?:先|试着|試著|试图|試圖)\s*)?(?:让|讓)(?:我的|自己的)?(?:眼睛|双眼|雙眼)(?:先|慢慢|逐渐|逐漸)?(?:适应|適應)(?:一下)?(?:室内(?:的)?|室內(?:的)?|屋里(?:的)?|屋裡(?:的)?|屋内(?:的)?|屋內(?:的)?|眼前(?:的)?|周围(?:的)?|周圍(?:的)?|这里(?:的)?|這裡(?:的)?)?(?:光线|光線|光亮)$/u;
const quietRoomScan = /^(?:我\s*)?(?:再|然后|然後|接着|接著)?(?:抬眼|抬头|抬頭)?(?<careful>仔细|仔細|认真|認真|细细|細細|静静|靜靜)?(?:地)?(?:观察(?:了)?|觀察(?:了)?|察看|查看|细看|細看|看看|看了看|打量(?:了)?|扫视(?:了)?|掃視(?:了)?|环顾(?:了)?|環顧(?:了)?)(?:一下|一眼)?(?:四周|周围|周圍|周遭|屋里|屋裡|屋内|屋內|室内|室內|这里|這裡|这间屋子|這間屋子|惩罚室|懲罰室)(?:(?:里|裡|内|內)?(?:的)?(?:环境|環境|情形|情况|情況))?$/u;
function stationaryDetentionLook(clauses) {
  const prefix=clauses.slice(0,-1),last=clauses.at(-1), stationary=quietStation.test(prefix[0]);
  if (stationary) prefix.shift();
  const adjust=quietEyeAdjustment.test(prefix[0]);if(adjust)prefix.shift();
  const look=quietRoomScan.exec(last);
  // Leave all formerly supported bare v4 frame productions intact.
  if (!look || prefix.length || !(stationary||adjust||!boundedRoomLook.test(last))) return null;
  return {lock:false,breath:false,door:false,room:true,turn:false,quotes:[],quiet:{stationary,adjust,
    careful:/^(?:仔细|仔細|认真|認真|细细|細細)$/u.test(look.groups.careful??'')}};
}
const roomSideListening = /^(?:我\s*)?(?<sameSpot>在原地\s*)?(?:(?:先|再|便|就)?\s*(?:试着|試著|试图|試圖)?\s*)(?:(?:侧耳|側耳|凝神|仔细|仔細|静静|靜靜)(?:地)?\s*)?(?:听听|聽聽|听了听|聽了聽|听一听|聽一聽|倾听|傾聽|聆听|聆聽|侧耳听|側耳聽|听(?:了)?(?:一下|一会儿|一會兒)|聽(?:了)?(?:一下|一會兒))\s*(?<beyond>(?:门外|門外|外面|门那边|門那邊|门的另一边|門的另一邊)\s*(?:的|有没有|有沒有|是否有|有无|有無)?\s*(?:一点|一點|什么|甚么|什麼|任何)?\s*(?:动静|動靜|声响|聲響|声音|聲音|响动|響動))?$/u;
function detentionListening(clauses) {
  if (!clauses.length || clauses.length>2) return null;
  const frame=roomSideListening.exec(clauses.at(-1));
  if (!frame) return null;
  const head=clauses.length===2 ? clauses[0] : null;
  const approach=head ? detentionLead.exec(head+'。')?.groups : null;
  const door=Boolean(approach?.approach && !approach.lock && !approach.cloth);
  const stationClause=Boolean(head && quietStation.test(head));
  const stationary=Boolean(frame.groups.sameSpot || stationClause);
  if (head && !door && !stationClause || door && stationary) return null;
  return {lock:false,breath:false,door:false,room:false,turn:false,quotes:[],listen:{approach:door,stationary,beyond:door||Boolean(frame.groups.beyond)}};
}
// Compose a gaze at the same door with directed listening, not a look
// through it, within one observation window and without crossing the room.
const doorGazeHead = /^(?:我\s*)?(?<head>抬头|抬頭|抬眼|抬起头|抬起頭|扬起头|揚起頭)\s*/u;
const doorGazeEntrance = /(?:门|門)口(?=(?:的方向|一眼)?$)/u;
const directedSoundAttention = /^(?:我\s*)?(?:(?:同时|同時|也|顺便|順便|再|一边|一邊|仔细|仔細)\s*)?(?:留意|注意|分辨|试着分辨|試著分辨)\s*(?:门外|門外|外面|门的另一边|門的另一邊|门那边|門那邊)\s*(?:的|是否有|有没有|有沒有|有无|有無)?\s*(?:什么|什麼|任何|一点|一點)?\s*(?:动静|動靜|声响|聲響|声音|聲音|响动|響動)$/u;
function detentionDoorSense(clauses) {
  if (!clauses.length || clauses.length>2) return null;
  const gaze=clauses[0], head=doorGazeHead.exec(gaze);
  const entrance=doorGazeEntrance.test(gaze);
  if (clauses.length===1 && !head && !entrance) return null;
  const proof=lockedDoorLook.exec(gaze.replace(doorGazeHead,'').replace(doorGazeEntrance,'门'));
  if (!proof || head && proof.groups.turn) return null;
  const sound=clauses[1], heardIntent=sound&&detentionListening([sound]);
  if (sound && !(directedSoundAttention.test(sound) || heardIntent?.listen.beyond)) return null;
  return {lock:false,breath:false,door:true,room:false,turn:false,quotes:[],
    doorSense:{raise:head?.groups.head==='抬眼'?'eyes':head?'head':null,turn:proof.groups.turn??null},
    ...(sound?{listen:{approach:false,stationary:false,beyond:true}}:{})};
}
const briefDetentionPause = /^(?:我\s*)?(?:先|就|仍|再)?\s*(?:在(?:原地|这里|這裡|这儿|這兒|门边|門邊|门旁|門旁|门口|門口|惩罚室内|懲罰室內)\s*)?(?:原地\s*)?(?:(?:安静|安靜|静静|靜靜|默默|稍微)(?:地)?\s*)?/u;
const finitePause = /^(?:稍(?:停|等)(?:一下|片刻|一小会儿?|一小會兒?)?|(?:停(?:下|住)?|顿|頓|等(?:待)?|待|歇(?:息)?|站)(?:了)?(?:一会儿?|一會兒?|一小会儿?|一小會兒?|片刻|一下|一小阵|一小陣))$/u;
const quietFollowup = /^(?:(?:我\s*)?(?:想(?:要)?|准备|準備|打算)?\s*)(?:(?:稍微|慢慢|轻轻|輕輕)?(?:从门边|從門邊)?(?:往后|往後|向后|向後)?(?:退开|退開|退后|退後|往后退|往後退|挪开|挪開)(?:了)?(?:一(?:小)?步|两步|兩步|一点|一點)?|(?:找|挑|选|選)(?:个|個|一处|一處)?(?:地方|位置|角落)(?:再)?(?:坐(?:下|着|著)?|歇(?:一会儿?|一會兒?|会儿?|會兒?)|休息(?:一下|一会儿?|一會兒?)?)|(?:先|再|慢慢|轻轻|輕輕|就地|原地)?(?:坐下(?:来|來)?|闭上(?:眼睛|双眼|雙眼)|閉上(?:眼睛|双眼|雙眼)|闭眼|閉眼|闭目|閉目)(?:休息(?:一下|片刻|一会儿?|一會兒?)?)?|(?:(?:在)?心里|(?:在)?心裡|默默|安静地|安靜地)?(?:默数|默數|数|數|数着|數著)(?:自己的|我的)?(?:呼吸|气息|氣息)(?:的次数|的次數)?|(?:慢慢|缓缓|緩緩|轻轻|輕輕)(?:呼吸|呼出一口气|呼出一口氣))$/u;
const pauseTransition = /^(?:随后|隨後|然后|然後|接着|接著|之后|之後|接下来|接下來|再)\s*/u;
const stationaryContinuation = /^(?:(?:仍然|仍旧|仍舊|还是|還是|继续|繼續|依旧|依舊|仍|还|還|先|就|再)\s*)?/u;
const stationaryLocation = /^(?:(?:在(?:原地|原处|原處|这里|這裡|这儿|這兒|门边|門邊|门旁|門旁|门口|門口|惩罚室内|懲罰室內)|原地|原处|原處)\s*)?/u;
const stationaryManner = /^(?:(?:安静|安靜|静静|靜靜|默默|稍微)(?:地)?\s*)?/u;
const presentDetentionStay = /^(?:待(?:着|著)|坐(?:着|著)|站(?:着|著)|留在(?:原地|原处|原處)|待在(?:原地|原处|原處)|停在(?:原地|原处|原處))$/u;
function ownStationaryStay(clause) {
  return presentDetentionStay.test(clause.replace(/^我\s*/u,'').replace(stationaryContinuation,'').replace(stationaryLocation,'').replace(stationaryContinuation,'').replace(stationaryManner,''));
}
const privateDetentionRecall = /^(?:我\s*)?(?:试着|試著|试图|試圖|尝试|嘗試)?\s*(?:在(?:心里|心裡|脑海中|腦海中)|默默(?:地)?)\s*(?:回忆|回憶|回想|想起)(?:(?:以前|过去|過去)?(?:熟悉的|听过的|聽過的)?(?:一(?:小)?段|一首)?(?:熟悉的|听过的|聽過的)?(?:旋律|曲调|曲調|小曲|歌|音乐|音樂)|一(?:段|件|些)(?:过去|過去)?的?(?:往事|旧事|舊事|回忆|回憶))$/u;
function detentionPause(clauses) {
  if (!clauses.length || clauses.length>6) return null;
  const preface=clauses[0].replace(briefDetentionPause,'');
  if (!finitePause.test(preface) && !ownStationaryStay(clauses[0])) return null;
  const tail=clauses.slice(1);
  if (tail.length===1 && privateDetentionRecall.test(tail[0].replace(pauseTransition,'')))
    return {lock:false,breath:false,door:false,room:false,turn:false,quotes:[],pause:{deferred:false,recall:true}};
  if (tail.length) {
    if (!pauseTransition.test(tail[0])) return null;
    tail[0]=tail[0].replace(pauseTransition,'');
    if (tail.some(text=>!quietFollowup.test(text.replace(pauseTransition,'')))) return null;
  }
  return {lock:false,breath:false,door:false,room:false,turn:false,quotes:[],pause:{deferred:tail.length>0}};
}
// The current waiting choice needs no evidence that the preceding informal
// stop was ever enacted. It contributes no motion, stopping event, or voice.
const continuingDetentionWait = /^(?:我\s*)?(?:(?:就在|仍在|在)(?:原地|这里|這裡|这儿|這兒)\s*)?(?:(?:还是|還是|仍然|仍旧|仍舊|继续|繼續|接着|接著)\s*)?(?:(?:安静|安靜|静静|靜靜|默默)(?:地)?\s*)?(?:等(?:候|待|着|著)?|稍等)(?:了)?(?:一会儿?|一會兒?|一小会儿?|一小會兒?|片刻|一下)?$/u;
const unconfirmedSelfStop = /^(?:我\s*)?(?:(?:先|便|就|轻轻|輕輕)\s*)?(?:停(?:下|止)(?:了)?|不再(?:继续|繼續)?|没(?:有)?继续|沒(?:有)?繼續)\s*(?:低声哼唱|低聲哼唱|哼唱|哼歌|哼曲|轻哼|輕哼|(?:默)?数(?:自己的)?呼吸|(?:默)?數(?:自己的)?呼吸|数息|數息|侧耳听|側耳聽|回忆旋律|回憶旋律|回想曲调|回想曲調)$/u;
function independentDetentionWait(clauses) {
  if (!clauses.length || clauses.length>2 || !continuingDetentionWait.test(clauses.at(-1))
    || clauses.length===2 && !unconfirmedSelfStop.test(clauses[0])) return null;
  return {lock:false,breath:false,door:false,room:false,turn:false,quotes:[],pause:{deferred:false}};
}
// Orthogonal self/body and waiting clauses. A hand-to-own-body position
// cannot supply evidence of sitting, furniture, or a persistent pose.
const ownHandRest = /^(?:我\s*)?(?:把|将|將)?\s*(?:自己(?:的)?|我的)?(?:双手|雙手|两手|兩手|双臂|雙臂|手)\s*(?:(?:慢慢|轻轻|輕輕|自然地)\s*)?(?:(?:相互|相)?(?:交叠|交疊|叠放|疊放|交叉(?:放)?|合拢|合攏)(?:着|著)?(?:放|搁|擱)?|(?:放|搁|擱|搭|垂))\s*在?\s*(?:自己(?:的)?|我的)?(?:膝(?:盖|蓋)?上|腿上|大腿上|身前|身侧|身側|胸前)$/u;
const ownClosingEyes = /^(?:我\s*)?(?:慢慢|轻轻|輕輕|缓缓|緩緩)?(?:闭上|閉上|合上|闭了闭|閉了閉)(?:自己(?:的)?|我的)?(?:眼睛|双眼|雙眼|眼)$/u;
const ownOpeningEyes = /^(?:我\s*)?(?:慢慢|轻轻|輕輕|缓缓|緩緩|微微)?(?:睁开|睜開|睁了睁|睜了睜|睁一睁|睜一睜)(?:自己(?:的)?|我的)?(?:眼睛|双眼|雙眼|眼)$/u;
const ownSoftenBreathing = /^(?:我\s*)?(?:试着|試著|试图|試圖)?(?:(?:缓缓|緩緩|慢慢)(?:地)?呼吸|放慢(?:了)?(?:自己的|我的)?呼吸)(?:了一会儿?|了一會兒?|片刻)?$/u;
// Relative, in-place body adjustment names no prop, contact, actor, or
// destination. Its narration does not establish a stored starting pose.
const bodyMotionManner = /^(?:我\s*)?(?:(?:稍微|只|轻轻|輕輕|慢慢|缓缓|緩緩|原地|在原地|试着|試著|试图|試圖|再|便|就)\s*(?:地)?\s*){0,3}/u;
const ownPoseAdjustment = /^(?:换(?:了)?(?:一)?(?:个|個)|換(?:了)?(?:一)?(?:个|個)|换(?:了)?换|換(?:了)?換|(?:调|調)整(?:了)?(?:一下|一点|一點)?|(?:变|變)换(?:了)?(?:一下)?|(?:变|變)換(?:了)?(?:一下)?|移(?:了)?(?:一下|一点|一點)|挪(?:了)?(?:一下|一点|一點))\s*(?:自己(?:的)?|我的|身体的|身體的)?(?:姿势|姿勢|姿态|姿態|坐姿|站姿|重心|身体重心|身體重心)$/u;
const ownLimbAdjustment = /^(?:活动(?:了)?|活動(?:了)?|动了动|動了動|动(?:了)?|動(?:了)?|伸展(?:了)?|舒展(?:了)?|弯(?:了)?弯|彎(?:了)?彎|屈伸(?:了)?|转了转|轉了轉|伸(?:了)?伸)\s*(?:一下|一会儿?|一會兒?)?\s*(?:自己(?:的)?|我的)?(?:身子|身体|身體|腰|肩(?:膀)?|双肩|雙肩|手腕|双手|雙手|手指|胳膊|手臂|双臂|雙臂|腿|双腿|雙腿|脚踝|腳踝)$/u;
function quietBodyPart(clause) {
  const text=clause.replace(/^我\s*/u,'');
  return ownHandRest.test(text) ? 'hands' : ownClosingEyes.test(text) ? 'eyes'
    : ownOpeningEyes.test(text) ? 'open-eyes' : steadyBreath.test(text) ? 'exhale' : ownSoftenBreathing.test(text) ? 'breathe'
      : ownPoseAdjustment.test(text.replace(bodyMotionManner,''))||ownLimbAdjustment.test(text.replace(bodyMotionManner,'')) ? 'adjust' : undefined;
}
const quietInnerFrame = /^(?:我\s*)?(?:(?:仍|还是|還是|继续|繼續|接着|接著|再|便|就|试着|試著|试图|試圖|尝试|嘗試)\s*){0,2}/u;
// A private attention clause supplies no proven perception, memory, or event.
// Optional sensory imagery is an unnamed frame, not evidence of a stimulus.
const thoughtWandering = /^(?:任(?:由)?|让|讓)(?:(?:自己(?:的)?|我的)\s*)?(?:思绪|思緒|思路|念头|念頭|心思|注意力)\s*(?:(?:随(?:着|著)?|隨(?:着|著)?|跟着|跟著)\s*(?:(?:那|这|這|熟悉的)(?:一)?(?:小)?(?:段|支|阵|陣)?\s*)?(?:旋律|曲调|曲調|节拍|節拍|节奏|節奏|呼吸)\s*)?(?:(?:慢慢|渐渐|漸漸|轻轻|輕輕|随意|隨意|自然地)\s*)?(?:飘(?:远|开|走)|飄(?:遠|開|走)|游走|遊走|漫游|漫遊|散开|散開|放空|走神|游移|遊移|沉静下来|沉靜下來|静一静|靜一靜|停留片刻|放松一下|放鬆一下)$/u;
const privateDetentionRhythm = /^(?:在(?:心里|心裡|脑海中|腦海中)\s*|默默(?:地)?\s*|默)(?:打(?:着|著)?(?:一(?:小)?段|几下|幾下)?拍子|(?:数|數|数着|數著)(?:一(?:小)?段)?(?:拍子|节拍|節拍|节奏|節奏)|(?:回想|想起|回忆|回憶|跟着|跟著|默记|默記)(?:(?:一(?:小)?段|刚才的|剛才的|熟悉的|那段|那个|那個)\s*)?(?:节拍|節拍|节奏|節奏|拍子))$/u;
function quietInwardClause(clause) {
  const text=clause.replace(quietInnerFrame,'');
  return privateDetentionRhythm.test(text) || privateDetentionRecall.test(text) || thoughtWandering.test(text);
}
function detentionBodyStay(clauses) {
  if (!clauses.length || clauses.length>4) return null;
  const movementConstraints=clauses.filter(clause=>detentionNoAction.test(clause));
  // Constraint-only input never supplies an act; do not remove literal speech.
  const core=clauses.filter(clause=>!detentionNoAction.test(clause));
  if (!core.length || movementConstraints.length>2) return null;
  const matches=core.map(clause=>{
    const text=clause.replace(briefDetentionPause,'');
    return finitePause.test(text)||ownStationaryStay(clause)||continuingDetentionWait.test(clause) ? 'wait'
      : quietBodyPart(clause) ?? (quietInwardClause(clause) ? 'inward' : undefined);
  });
  if (matches.some(x=>!x) || new Set(matches.filter(x=>x!=='adjust')).size!==matches.filter(x=>x!=='adjust').length) return null;
  const base={lock:false,breath:false,door:false,room:false,turn:false,quotes:[]};
  if (matches.includes('wait')) return matches.length>1 || movementConstraints.length ? {...base,pause:{deferred:false}} : null;
  // Direct bounded bodily verbs (unlike placement/pose) do not need objects.
  const body=[...new Set(matches.filter(kind=>kind!=='inward'))];
  return body.includes('hands') || !body.length || body.length>2 || body.includes('eyes')&&body.includes('open-eyes')
    ? null : {...base,body};
}
// A constraint must be a whole, unquoted self clause. It does not prove a
// previous action, and cannot negate, rewrite, or silently drop a new command.
const detentionNoAction = /^(?:我\s*)?(?:没(?:有)?|沒(?:有)?|不)(?:再|继续|繼續)?\s*(?:(?:出|作|做)(?:一|半)?(?:声|聲)|(?:开|開)口(?:说话|說話)?|说(?:话|一句话)|說(?:話|一句話)|发出(?:声音|聲音)|發出(?:聲音|声音)|走(?:动|動)|挪(?:动|動)?(?:脚步|腳步)?|迈步|邁步|移动(?:脚步)?|移動(?:腳步)?|离开原地|離開原地|抬脚|抬腳|靠近(?:那扇|这扇|這扇)?(?:门|門)|(?:碰|触碰|觸碰|摸|接触|接觸)(?:那扇|这扇|這扇)?(?:门|門)(?:锁|鎖|把手)?|(?:拉|推|敲)(?:那扇|这扇|這扇)?(?:门|門)(?:把手)?|动(?:那扇|这扇|這扇)?门把手|動(?:那扇|這扇)?門把手)$/u;
function constrainedDetentionLook(clauses) {
  if (clauses.length<2 || clauses.length>4) return null;
  const grounded=[];
  let constraint=false,stay=false;
  for(const clause of clauses){
    if(detentionNoAction.test(clause)){constraint=true;continue;}
    if(quietStation.test(clause)||ownStationaryStay(clause)){
      if(stay)return null;
      constraint=stay=true;continue;
    }
    grounded.push(clause);
  }
  if (!constraint || !grounded.length || grounded.length>2) return null;
  const door=lockedDoorLook.exec(grounded[0]);if(door)grounded.shift();
  const room=boundedRoomLook.exec(grounded[0]);if(room)grounded.shift();
  if (grounded.length || !(door||room)) return null;
  return {lock:false,breath:false,door:Boolean(door),room:Boolean(room),
    turn:/^(?:转身|轉身|回身)$/u.test(door?.groups.turn||room?.groups.turn||''),quotes:[]};
}
const shortOwnHum = /^(?:我\s*)?(?<stationary>在原地\s*)?(?:(?:先|再|便|就)\s*)?(?:(?:试着|試著|试图|試圖|尝试|嘗試)\s*)?(?<soft>(?:轻轻|輕輕|轻声|輕聲|低声|低聲|小声|小聲)(?:地)?\s*)?(?:用鼻音\s*(?<softAfter>(?:轻轻|輕輕|轻声|輕聲|低声|低聲|小声|小聲)(?:地)?\s*)?)?(?:哼(?:起来|起來|起|唱|着|著|了)?|哼哼|哼了哼)(?:了)?\s*(?:(?:一(?:小)?段|几句|幾句|几声|幾聲|一两声|一兩聲|一下|一小会儿?|一小會兒?|一会儿?|一會兒?)|(?:(?:那|这|這|一)(?:一)?(?:小)?(?:段|支|首)\s*)?(?:(?:刚才|剛才)?(?:想到|想起|熟悉|听过|聽過)的\s*)?(?:旋律|曲调|曲調|小曲|歌))?$/u;
const humVolumeIntent = /^(?:把)?(?:声音|聲音|音量)(?:(?:压|壓|放|收)得(?:很|更|低些|低一點)|低得|很低|轻得|輕得|压低|壓低)(?:低|轻|輕)?\s*(?:(?:像是|仿佛|彷彿)?(?:只有|就|只让|只讓|只给|只給)?(?:我)?自己(?:才|能|可以)听(?:到|见|見))?$/u;
function detentionHumming(clauses) {
  if (!clauses.length || clauses.length>2 || clauses.length===2 && !humVolumeIntent.test(clauses[1])) return null;
  const voice=shortOwnHum.exec(clauses[0]);
  return voice ? {lock:false,breath:false,door:false,room:false,turn:false,quotes:[],
    hum:{stationary:Boolean(voice.groups.stationary),soft:Boolean(voice.groups.soft||voice.groups.softAfter||clauses.length===2)}} : null;
}
// Only a final actual utterance, explicitly addressed by the player to
// themselves. The one quoted span is opaque data, never parsed as an action.
const detentionExactQuote = /“([^“”「」『』"\r\n]{1,240})”|「([^“”「」『』"\r\n]{1,240})」|『([^“”「」『』"\r\n]{1,240})』|"([^“”「」『』"\r\n]{1,240})"/gu;
const ownDetentionVoice = /^(?:我\s*)?(?:(?:便|就|又|轻声|輕聲|低声|低聲|小声|小聲|轻轻|輕輕)\s*(?:地)?\s*){0,2}(?:(?:对|對|向)(?:我)?自己\s*(?:(?:轻声|輕聲|低声|低聲|小声|小聲)(?:地)?\s*)?(?:说(?:道|了句|了声)?|說(?:道|了句|了聲)?)|自言自语(?:地说|道)?|自言自語(?:地說|道)?)\s*[：:]\s*$/u;
function detentionOwnVoice(raw) {
  const spans=[...raw.matchAll(detentionExactQuote)];
  if (spans.length!==1) return null;
  const [span]=spans,quote=span.slice(1).find(text=>text!==undefined);
  if (!quote.trim() || !/^[。！.!\s]*$/u.test(raw.slice(span.index+span[0].length))) return null;
  const parts=raw.slice(0,span.index).trim().split(/(?:[，,。；;]|\n)+/u).map(clause=>clause.trim());
  if (!parts.length || parts.length>3 || !ownDetentionVoice.test(parts.pop())) return null;
  if(parts.some(clause=>detentionNoAction.test(clause)))return null;
  const body=parts.length ? detentionBodyStay(parts)?.body : [];
  if (!body) return null;
  return {lock:false,breath:false,door:false,room:false,turn:false,quotes:[quote],body};
}
// Explicit private invention, not perception, recollection of world facts,
// speech, or a second action. A colon payload is writer-owned opaque data.
const creativeDetentionLead = /^我\s*(?:(?:先|又|再|便|就|试着|試著|试图|試圖|开始|開始)\s*)?(?:在(?:心里|心裡|脑海里|腦海裡|脑海中|腦海中)|默默(?:地)?)\s*(?:(?:试着|試著|开始|開始)\s*)?(?:(?:构思|構思|编|編|编写|編寫|编造|編造|虚构|虛構)(?:起|了)?\s*(?:了)?\s*(?:一(?:个|個|段|幕|篇|幅))?\s*(?:(?:小|虚构的|虛構的|想象中的|想像中的)\s*)?(?:故事|情节|情節|场景|場景|画面|畫面)|(?:想象|想像)(?:起|了)?\s*(?:一(?:个|個|段|幕|篇|幅))?\s*(?:虚构的|虛構的|不存在的|假想的|故事里的|故事裡的)\s*(?:故事|情节|情節|场景|場景|画面|畫面))$/u;
const directCreativeThought = /^(?:我\s*)?(?:(?:先|再|又|还|還|仍旧|仍舊|仍然|仍|继续|繼續|接着|接著|试着|試著)\s*){0,2}(?:想着|想著|想(?:了)?想|想|构思(?:起|着|著)?|構思(?:起|着|著)?|琢磨(?:着|著)?|推敲(?:着|著)?)\s*(?:(?:自己(?:在想|构思|構思)?的|我(?:在想|构思|構思)?的)\s*)?(?:(?:刚才的|剛才的|那(?:个|個|段|篇)?|这(?:个|個|段|篇)?|這(?:个|個|段|篇)?|一(?:个|個|段|幕|篇|幅))\s*)?(?:小?故事(?:的情节|的情節)?|(?:虚构的|虛構的|故事里的|故事裡的)(?:情节|情節|场景|場景|画面|畫面)|情节|情節)$/u;
function constrainedCreativeThought(raw) {
  // This branch has no colon payload or quoted data. No-action constraints
  // compose only when exactly one complete private topic remains.
  if (/[：:“”「」『』"\r\n]/u.test(raw)) return false;
  const clauses=raw.replace(/[。！!.]$/u,'').split(/[，,；;]/u).map(text=>text.trim());
  if (!clauses.length || clauses.length>3) return false;
  const core=clauses.filter(text=>!detentionNoAction.test(text));
  return core.length===1 && (directCreativeThought.test(core[0])
    || creativeDetentionLead.test(core[0].startsWith('我')?core[0]:'我'+core[0]));
}
function detentionCreativeAttempt(raw) {
  const colon=raw.search(/[：:]/u), head=(colon<0 ? raw.replace(/[。！!.]$/u,'') : raw.slice(0,colon)).trim();
  if (colon<0 ? !constrainedCreativeThought(raw) : !creativeDetentionLead.test(head)) return null;
  if (colon>=0) {
    const payload=raw.slice(colon+1).trim();
    const spans=[...payload.matchAll(detentionExactQuote)];
    if (!payload || payload.length>480 || /[\r\n]/u.test(payload)) return null;
    if (spans.length) {
      // Properly framed fiction can contain first-person actions, but
      // anything outside the single final quoted span is not fiction.
      if (spans.length!==1 || spans[0].index!==0 || !/^[。！.!\s]*$/u.test(payload.slice(spans[0][0].length))) return null;
    } else {
      // The unquoted form is a single sketch/caption. Extra sentences and a
      // new first-person instruction are not swallowed as story material.
      const sketch=payload.replace(/[。！!？?。.]$/u,'');
      if (!sketch.trim() || /[。.!！?？；;：:“”「」『』"]/u.test(sketch)
        || sketch.split(/[，,]/u).some(clause=>/^\s*(?:(?:然后|然後|随后|隨後|接着|接著|接下来|接下來)\s*)?(?:我(?![们們])|(?:然后|然後|随后|隨後|接着|接著|接下来|接下來)?(?:请|請)(?:把|将|將|你|让|讓|按|直接))/u.test(clause))) return null;
    }
  }
  return {lock:false,breath:false,door:false,room:false,turn:false,quotes:[],creative:true};
}
export function detentionObservationParts(rawInput) {
  if (typeof rawInput!=='string' || rawInput.length>1100 || /[<>\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\p{Cf}]/u.test(rawInput)) return null;
  const paras=rawInput.trim().split(/\r?\n[ \t]*\r?\n(?:[ \t]*\r?\n)*/u).map(s=>s.trim());
  if (paras.length>2 || !paras[0]?.startsWith('我')) return null;
  const creative=paras.length===1 && detentionCreativeAttempt(rawInput.trim());
  if (creative) return creative;
  const spoken=detentionOwnVoice(rawInput.trim());
  if (spoken) return spoken;
  const clauses=paras[0].replace(/[。！!.]$/u,'').split(/[，,；;]/u).map(s=>s.trim());
  const pause=paras.length===1 && (detentionPause(clauses) || independentDetentionWait(clauses));
  if (pause) return pause;
  if (clauses.length>4) return null;
  const sense=paras.length===1 && detentionDoorSense(clauses);
  if (sense) return sense;
  const boundLook=paras.length===1 && constrainedDetentionLook(clauses);
  if (boundLook) return boundLook;
  const self=paras.length===1 && detentionBodyStay(clauses);
  if (self) return self;
  const humming=paras.length===1 && detentionHumming(clauses);
  if (humming) return humming;
  const listening=paras.length===1 && detentionListening(clauses);
  if (listening) return listening;
  const quiet=paras.length===1 && stationaryDetentionLook(clauses);
  if (quiet) return quiet;
  const lock=Boolean(recalledLock.test(clauses[0]));if(lock)clauses.shift();
  const breath=Boolean(steadyBreath.test(clauses[0]));if(breath)clauses.shift();
  const door=lockedDoorLook.exec(clauses[0]);if(door)clauses.shift();
  const room=boundedRoomLook.exec(clauses[0]);if(room)clauses.shift();
  if (clauses.length || !(door || room)) return null;
  const quotes=[];
  if (paras.length===2) {
    const spans=[...paras[1].matchAll(detentionExactQuote)];
    if (spans.length!==2 || spans[0].index!==0 || !/^[。！.!\s]*$/u.test(paras[1].slice(spans[1].index+spans[1][0].length))
      || !selfQuoteAttribution.test(paras[1].slice(spans[0][0].length,spans[1].index))) return null;
    for(const span of spans){const voice=span.slice(1).find(s=>s!==undefined);if(!voice.trim())return null;quotes.push(voice);}
  }
  return {lock,breath,door:Boolean(door),room:Boolean(room),turn:/^(?:转身|轉身|回身)$/u.test(door?.groups.turn||room?.groups.turn||''),quotes};
}
function detentionObservationSource(state, rawInput) {
  if (state.agentRuntimeRevision!==EVENT_DIRECTOR_RUNTIME_REVISION || !supported(state) || !guardDetained(state)
    || state.caseRuntime?.occupiedBody || state.guardReaction.pending) return null;
  const parts=detentionObservationParts(rawInput), player=createdPlayerId(state), {detention,resolution}=state.guardReaction;
  if (!parts || !runtimeActive(state,player) || runtimeRoom(state,player)!==GUARD_DETENTION_ROOM
    || state.worldTime>=detention.releaseAt || detention.caseBoundaryAt!==null
    || (parts.quotes.length || parts.hum) && actorForState(state,player)?.communication!=='speech') return null;
  const previous=state.agentActions.findLast(row=>row.type==='guard_surrender'||row.type==='guard_dice_resolution');
  if (previous?.encounterId!==detention.encounterId || (previous.type==='guard_surrender' ? previous.version!==1 || resolution!==null
    : resolution?.encounterId!==detention.encounterId || resolution.result?.success!==false || previous.result?.id!==resolution.result.id)) return null;
  const capturedKey='guard:'+detention.encounterId+':captured';
  const capture=state.entries.findLast(row=>row.observationKey===capturedKey);
  if (!capture?.audienceIds?.includes(player) || capture.occurredAt>state.worldTime || capture.occurredAt>detention.startedAt
    || !state.caseRuntime?.observations?.some(row=>row.id===capturedKey&&row.delivery==='action'&&row.audienceIds?.includes(player)
      &&row.occurredAt===capture.occurredAt&&row.text===capture.text)
    || parts.doorSense&&!/(?:锁上|鎖上|落锁|落鎖)/u.test(capture.text)
    || parts.lock&&(state.agentActions.at(-1)!==previous || state.worldTime!==detention.startedAt || capture.occurredAt!==state.worldTime
      || !/(?:锁上|鎖上|落锁|落鎖)/u.test(capture.text))) return null;
  const end=Math.min(state.worldTime+(parts.pause ? LOCAL_DETENTION_SECONDS : caseActionSeconds('look')),detention.releaseAt),boundary=authoredBoundary(state,end);
  return boundary===null||boundary>state.worldTime ? {parts,player,detention,end,boundary} : null;
}
export function localDetentionAction(state, rawInput) {
  const source = localDetentionSource(state, rawInput, true);
  return source
    ? { type: 'guard_detention_local', version: source.parts.look ? 3 : 2,
      encounterId: state.guardReaction.detention.encounterId, rawInput }
    : detentionObservationSource(state,rawInput)
      ? {type:'guard_detention_local',version:4,encounterId:state.guardReaction.detention.encounterId,rawInput} : null;
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
function applyDetentionObservation(state,action) {
  const source=detentionObservationSource(state,action.rawInput);
  if (!exact(action,['type','version','encounterId','rawInput']) || !source || action.encounterId!==source.detention.encounterId) fail();
  const {parts,player,detention,end,boundary}=source;
  const key='guard:'+action.encounterId+':observe:'+state.revision;
  if (parts.breath) ownerNarration(state,'我慢慢呼出一口气。');
  const direction=parts.turn ? '转过身，' : '';
  if (parts.creative) ownerNarration(state,'我试着在心里构思。');
  else if (parts.body) {
    const own={eyes:'我合上眼睛。','open-eyes':'我睁了睁眼。',exhale:'我呼出一口气。',breathe:'我试着放慢呼吸。',adjust:'我在原处试着活动了一下身体。'};
    for(const kind of parts.body) ownerNarration(state,own[kind]);
  } else if (parts.hum) {
    const {stationary,soft}=parts.hum;
    // An attempted sound is self-owned narration, not a delivered utterance,
    // acoustic isolation, or newly acquired music or memory.
    ownerNarration(state,'我'+(stationary?'留在原地，':'')+'试着'+(soft?'轻轻':'')+'哼了哼。');
  } else if (parts.doorSense) {
    const {raise,turn}=parts.doorSense;
    const prelude=raise==='head'?'抬头':raise==='eyes'?'抬眼':turn?'转头':'';
    ownerNarration(state,'我'+prelude+'看向惩罚室的门'+(parts.listen?'，留意门外的声响。':'。'));
  } else if (parts.listen) {
    const {approach,stationary}=parts.listen;
    ownerNarration(state,approach ? '我走到惩罚室的门边，停在门内侧听。'
      : stationary ? '我留在原地，侧耳听。' : '我侧耳听。');
  } else if (parts.quiet) {
    const {stationary,adjust,careful}=parts.quiet;
    const prelude=(stationary?'留在原地，':'')+(adjust?'试着适应眼前的光线，':'');
    ownerNarration(state,'我'+prelude+(careful?'仔细':'')+'看了看四周。');
  } else if (parts.door&&parts.room) ownerNarration(state,'我'+direction+'看了看门，又打量了一下惩罚室。');
  else if (parts.door) ownerNarration(state,'我'+direction+'看了看门。');
  else if (!parts.pause) ownerNarration(state,'我'+direction+'打量了一下惩罚室。');
  for(const [index,quote] of parts.quotes.entries())publish(state,[{text:quote,speaker:actorForState(state,player).name,
    speakerId:player,delivery:'speech',audienceIds:[player],addresseeIds:[],occurredAt:state.worldTime,
    observationKey:key+':speech:'+index}]);
  const advanced=advanceCausalTime(state,Math.min(end,boundary??end),key,{
    npcReactions:false,storyArcVersion:state.creation?.storyArcId?1:undefined,guardDetentionWait:true,guardCaseBoundary:boundary,
  });
  publish(state,advanced.events.map(row=>row.speaker?row:{...row,speaker:'眼前的动静'}));
  if (parts.pause) {
    const stopped=advanced.interrupted||state.worldTime<end||state.worldTime===boundary;
    ownerNarration(state,(stopped?'我只等到这里':'我稍等片刻')+(parts.pause.deferred?'，后面的动作还没进行。'
      : parts.pause.recall&&!stopped?'，试着在心里回想。':'。'));
  }
  if (parts.listen && !advanced.interrupted && (boundary===null || state.worldTime<boundary)
    && !advanced.events.some(row=>row.delivery==='speech'&&row.speakerId!==player&&row.audienceIds?.includes(player)))
    ownerNarration(state,parts.listen.beyond ? '我没能辨清门外的情况。' : '我没能辨清有什么动静。');
  detention.remainingSeconds=Math.max(0,detention.releaseAt-state.worldTime);
  if(state.worldTime===boundary)detention.caseBoundaryAt=boundary;
  if(advanced.interrupted||state.worldTime>=detention.releaseAt)ownerNarration(state,'我还在门的这一边。');
}
function localDetentionActionApply(state, action) {
  if (action.version===4) { applyDetentionObservation(state,action); return; }
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
    else if (action.type === 'guard_surrender') surrender(draft, action);
    else if (action.type === 'guard_detention_local') localDetentionActionApply(draft, action);
    else detentionAction(draft, action);
  }
  finalizeGuardEntries(draft, start);
  draft.agentActions.push(structuredClone(action)); draft.revision++;
  if (draft.abilityRuntime) refreshAbilityVisits(draft);
  if (!integer(draft.revision) || !integer(draft.worldTime)) fail();
  Object.assign(state, draft); return true;
}

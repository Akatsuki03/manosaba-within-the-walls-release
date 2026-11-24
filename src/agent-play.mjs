import { INTENT_RUNTIME_REVISION, CASE_BOUNDARY_RUNTIME_REVISION, hasIntentRuntime, hasSoftRuntime, hasIntentAdmissionRuntime } from './content/relationship-context-policy.mjs';
import { isDeepStrictEqual } from 'node:util';
import { runtimeCapabilityId } from './content/runtime-capabilities.mjs';
import { isRelationshipRuntime } from './content/relationship-context-policy.mjs';
import { projectRelationshipSource } from './creation/relationship-setup.mjs';
import { assertFoundationCreation } from './content/initial-run-policy.mjs';
import { guardEnabled, applyGuardHostAction, assertGuardOrdinaryAction, finalizeGuardEntries } from './world/guard-reaction.mjs';
import { guardRuleReference, isGuardRuleReference } from './world/guard-rules.mjs';
import { isKnowledgeGated } from './characters/actor-knowledge.mjs';
import { usesIdentityAssertionV2 } from './characters/identity-assertion-policy.mjs';
import { usesCurfewPolicy, assertLawfulLongWait, curfewScenePolicy } from './world/curfew-policy.mjs';
import { runtimeRevisionForState, runtimeRevisionById } from './content/content-revisions.mjs';
import { AGENT_SCENARIO_HASH } from './content/agent-scenario.mjs';
import { authoredMagicText, normalizeCreation, normalizeNewGameCreation } from '../public/player-creation-rules.mjs';
import { CREATED_ROOMS, ROOM_CODES, roomKey, createdPlayerId, actorForState, actorsForState, startingRoom, relationshipSetupForState, relationshipInitialKnownIds, usesRelationshipSetup } from './creation/player-setup.mjs';
import { preservesExplicitSpeech } from './agents/narrative-boundaries.mjs';
import { enableAutonomy, applyNpcDecisions, persistEnactments, isNicknameSelfIntroduction, enactedSelfIntroduction } from './agents/agent-autonomy.mjs';
import { parseReadingIntent, readingMaterial, acquisitionAudience } from './characters/actor-perception.mjs';
import { validateSceneDocument, mergeHostSceneEvents } from './scenes/scene-document.mjs';
import { sceneExtensionPin, validateSceneExtensions, sceneEventTimeline, sceneNarrationTimes } from './scenes/scene-event-policy.mjs';
import { selectedCardOpening, CARD_ASSEMBLY_TEXT, prisonRulebook, worldSurfaceFacts } from './content/card-world.mjs';
import { hasPrisonWorld, enablePrisonWorld, announcePrisonAssembly, advancePrisonActivities, deferAssemblyActor, prisonClock, prisonPassage, prisonPublicRules } from './world/prison-activity.mjs';
import { hasCaseOne, initializeCaseOne, caseRoomId, caseLocalActors, parseCaseIntent, caseScene,
  caseResolution, caseEnactmentDraft, caseActorSituation, applyCaseExecution, casePlayView } from './cases/case-one.mjs';
import { enableCaseRuntime, runtimeApplyItemPolicy, hasCaseRuntime, runtimeRoom, runtimeLocalIds, runtimeActive, activateCaseItemPolicy } from './case-runtime.mjs';
import { caseItemPolicyV2Reference } from './cases/case-item-policy.mjs';
import { applyProcedureExecution, activeProcedure } from './cases/case-procedure.mjs';
import { causalPlayerScene, parseCausalIntent, causalSceneDraft, causalPlayView, nextFreePeriodBoundary, parseScheduleWaitIntent } from './scenes/causal-scene.mjs';
import { sceneBeatsDraft } from './scenes/scene-beats.mjs';
import { initialBunkSupplement, hasBunkSupplement, bunkSceneDescription, usesBunkSettingV2, v2CharacterCellOpening, visibleOwnBunk } from './world/prison-bunks.mjs';

export const AGENT_PLAY_VERSION = 3;
const SUPPORTED_PLAY_VERSIONS = new Set([1, 2, AGENT_PLAY_VERSION]);
// Preserve exact v1 action replay; room IDs and PLAYER_CELL never change.
const LEGACY_CREATED_ROOMS = Object.freeze({ ...CREATED_ROOMS, playercell: '新增牢房' });
export const agentLocationLabel = value => value === LEGACY_CREATED_ROOMS.playercell ? CREATED_ROOMS.playercell : value;
export const AGENT_BROADCAST_TEXT = '「我是典狱长。请到会客厅集合，之后会向各位说明情况。牢房的门将打开，请跟随看守，不要轻率反抗。」';
const ROOMS = { cell: '牢房', corridor: '走廊', reception: '会客厅', cell01: '一号牢房', cell02: '二号牢房',
  cell04: '四号牢房', cell05: '五号牢房', cell06: '六号牢房', cell07: '七号牢房' };
const LOCATION_CODES = { cell: 'CELL', corridor: 'CORRIDOR', reception: 'RECEPTION', cell01: 'CELL_01', cell02: 'CELL_02',
  cell04: 'CELL_04', cell05: 'CELL_05', cell06: 'CELL_06', cell07: 'CELL_07' };
const ALIASES = { ...Object.fromEntries(Object.entries(ROOMS).map(([id, name]) => [name, id])), 会客室: 'reception', 接客室: 'reception', 三号牢房: 'cell' };
const roomsFor = state => (state.creation?.playerMode === 'custom' || state.creation?.opening?.locationId === 'PLAYER_CELL')
  ? (state.agentFormatVersion === 1 ? LEGACY_CREATED_ROOMS : CREATED_ROOMS) : ROOMS;
const adjacent = (current, state) => current === 'corridor' ? Object.keys(roomsFor(state)).filter(id => id !== 'corridor') : ['corridor'];
const fail = () => { throw Object.assign(new Error('场景记录与存档版本不一致，当前进度已保留。'), { code: 'INVALID_AGENT_STATE' }); };
const plain = value => value && Object.getPrototypeOf(value) === Object.prototype;
export function agentLocationId(state) { if (hasCaseRuntime(state)) return runtimeRoom(state, createdPlayerId(state)); if (hasCaseOne(state)) return caseRoomId(state); const rooms = roomsFor(state); return Object.keys(rooms).find(id => rooms[id] === state.location); }
export function agentLocalActors(state) {
  if (hasCaseRuntime(state)) {
    const local = runtimeLocalIds(state, runtimeRoom(state, createdPlayerId(state)));
    return actorsForState(state).filter(actor => actor.id !== createdPlayerId(state) && actor.id !== 'warden'
      && local.includes(actor.id) && runtimeActive(state, actor.id));
  }
  if (hasCaseOne(state)) return caseLocalActors(state, actorsForState(state));
  const room = agentLocationId(state);
  return actorsForState(state).filter(actor => actor.id !== createdPlayerId(state) && actor.id !== 'warden'
    && (state.agentPositions?.[actor.id] || actor.locationId) === (state.creation ? ROOM_CODES : LOCATION_CODES)[room]);
}
export function agentLabel(state, actor) {
  return state.known.includes(actor.id) ? actor.name : actor.appearance;
}
function emit(state, text, speakerId = null, { audienceIds = [createdPlayerId(state)], observationKey, occurredAt = state.worldTime, delivery } = {}) {
  const actor = speakerId && actorForState(state, speakerId);
  if (speakerId && !actor) fail();
  const channel = delivery || (!actor ? 'narration' : actor.communication === 'writing' ? 'writing' : 'speech');
  state.entries.push({ id: `entry-${state.entries.length + 1}`, speaker: actor
    ? `${agentLabel(state, actor)}${channel === 'writing' ? '（书写）' : ''}` : '旁白', text,
  speakerId, audienceIds, delivery: channel, occurredAt, ...(observationKey ? { observationKey } : {}) });
}
export const supportsAuthoredMagicRoot = (creation, revision) => creation?.version === 2
  && !creation.scenarioId && !creation.storyArcId && hasIntentAdmissionRuntime(revision) && Boolean(authoredMagicText(creation));

export function initialAgentState(creationInput, { formatVersion = AGENT_PLAY_VERSION, runtimeRevisionId, customAbilitySetup,
  rootCaseOptionsVersion, storyLifeVersion, authoredMagicVersion } = {}) {
  if (!SUPPORTED_PLAY_VERSIONS.has(formatVersion)) fail();
  if (rootCaseOptionsVersion !== undefined && rootCaseOptionsVersion !== 1) fail();
  const runtime = runtimeRevisionId === undefined ? undefined : runtimeRevisionById(runtimeRevisionId);
  // Only an explicitly pinned new source13 root starts the existing life lane.
  // Rebuilding an unpinned historical root must not silently upgrade it.
  if (storyLifeVersion !== undefined && (storyLifeVersion !== 1 || !hasSoftRuntime(runtime))) fail();
  const state = { generation: 1, revision: 0, phase: 'agent_cell', worldTime: 0, location: ROOMS.cell,
    known: ['emma', 'hiro'], introduced: 0, entries: [], completed: false, hiroStatus: 'alive',
    fixtureBranch: false, turnIds: [], exampleId: 'agent', agentFormatVersion: formatVersion,
    agentScenarioHash: runtime?.scenarioHash ?? AGENT_SCENARIO_HASH, agentDoorOpen: false, agentActions: [],
    ...(runtime ? { agentRuntimeRevision: runtime.id } : {}),
    ...(storyLifeVersion === 1 ? { storyLifeVersion: 1 } : {}),
    ...(authoredMagicVersion === 1 ? { authoredMagicVersion: 1 } : {}) };
  if (authoredMagicVersion !== undefined && (authoredMagicVersion !== 1 || formatVersion !== AGENT_PLAY_VERSION
    || customAbilitySetup !== undefined || creationInput === undefined)) fail();
  if (creationInput !== undefined) {
    const creation = assertFoundationCreation((isRelationshipRuntime(runtime) ? normalizeNewGameCreation : normalizeCreation)(creationInput), runtime);
    if (authoredMagicVersion === 1 && !supportsAuthoredMagicRoot(creation, runtime)) fail();
    state.creation = creation;
    if (rootCaseOptionsVersion === 1 && runtimeCapabilityId(runtime?.id) === 'agent-prison-runtime@8'
      && !creation.scenarioId && !creation.storyArcId) state.rootCaseOptionsVersion = 1;
    if (customAbilitySetup !== undefined) {
      const setupKeys = customAbilitySetup && typeof customAbilitySetup === 'object'
        ? Object.keys(customAbilitySetup).sort().join(',') : '';
      const guardedSetup = setupKeys === 'profile,selections,version' && customAbilitySetup.version === 2
        && customAbilitySetup.profile === 'ordinary-guarded@1';
      const legacySetup = setupKeys === 'selections,version' && customAbilitySetup.version === 1;
      if (creation.playerMode !== 'custom' || runtimeCapabilityId(runtime?.id) !== 'agent-prison-runtime@8' || creation.scenarioId || creation.storyArcId
        || !customAbilitySetup || (!guardedSetup && !legacySetup)
        || !Array.isArray(customAbilitySetup.selections) || !customAbilitySetup.selections.length || customAbilitySetup.selections.length > 4) fail();
      for (const s of customAbilitySetup.selections) if (!s || Object.keys(s).sort().join(',') !== 'attachmentDigest,definitionId,initialState,revision,semanticDigest'
        || typeof s.definitionId !== 'string' || !Number.isSafeInteger(s.revision) || s.revision < 1
        || !/^[a-f0-9]{64}$/u.test(s.semanticDigest) || !/^[a-f0-9]{64}$/u.test(s.attachmentDigest)
        || !s.initialState || Object.keys(s.initialState).sort().join(',') !== 'recognition,stage'
        || !['basic', 'awakened'].includes(s.initialState.stage) || !['known', 'unknown', 'partial'].includes(s.initialState.recognition)) fail();
      if (new Set(customAbilitySetup.selections.map(s => s.definitionId)).size !== customAbilitySetup.selections.length) fail();
      state.customAbilitySetup = structuredClone(customAbilitySetup);
    }
    const supplement = initialBunkSupplement(creation);
    if (supplement) { if (formatVersion !== 3 || !['agent-prison-runtime@3', 'agent-prison-runtime@4', 'agent-prison-runtime@5', 'agent-prison-runtime@6', 'agent-prison-runtime@7', 'agent-prison-runtime@8'].includes(runtimeCapabilityId(runtime?.id))) fail(); state.settingSupplement = supplement; }
    if (creation.storyArcId) {
      if (formatVersion !== 3 || !['agent-prison-runtime@3', 'agent-prison-runtime@4', 'agent-prison-runtime@5', 'agent-prison-runtime@6', 'agent-prison-runtime@7', 'agent-prison-runtime@8'].includes(runtimeCapabilityId(runtime?.id))) fail();
      state.storyArc = { version: 1, id: creation.storyArcId, status: 'scheduled', completedBeats: [] };
      enablePrisonWorld(state);
    }
    if (hasCaseOne(state)) { if (formatVersion < 2) fail(); initializeCaseOne(state); return state; }
    const current = startingRoom(creation);
    state.location = roomsFor(state)[current]; state.phase = `agent_${current}`;
    const playerId = createdPlayerId(state);
    if (formatVersion >= 2 && (creation.openingId || creation.cellSetup)) enablePrisonWorld(state);
    const sourceOpening = selectedCardOpening(creation);
    if (sourceOpening) { applyCardPrologue(state, sourceOpening); return state; }
    state.known = [playerId, ...relationshipInitialKnownIds(state, playerId, ['emma', 'hiro'].includes(playerId) ? [playerId === 'emma' ? 'hiro' : 'emma'] : [])];
    // Choosing an unlocked public starting place is an explicit setup choice,
    // not a narration string silently changing lock state or teleporting NPCs.
    state.agentDoorOpen = ['corridor', 'reception'].includes(current);
    if (hasPrisonWorld(state)) state.agentWorld.lockReleased = state.agentDoorOpen;
    if (creation.playerMode === 'custom') {
      emit(state, usesBunkSettingV2(state) ? `${creation.character.name}在${state.location}醒来。` : `${creation.character.name}作为新增囚犯名额在${state.location}醒来。原作十三位少女仍保留各自的位置；没有因为你的到来自动认识彼此。`);
      emit(state, creation.opening.text || (state.agentDoorOpen
        ? '陌生的黑白囚服让你逐渐清醒。这里是可通行的公共地点，其他人没有自动集合；接下来如何行动由你决定。'
        : '冰凉的石墙和陌生的黑白囚服让你逐渐清醒。墙上屏幕尚未亮起。你还没有得到这里的说明，接下来如何行动由你决定。'));
    } else if (creation.actorId === 'emma' && !creation.opening) {
      const opening = runtimeRevisionForState(state).content.host.scenario.opening;
      const effective = usesRelationshipSetup(state) ? projectRelationshipSource(relationshipSetupForState(state),
        { kind: 'canonical-opening', ownerId: playerId, value: opening }).value : opening;
      for (const paragraph of effective) emit(state, paragraph.text);
    } else {
      const player = actorForState(state, playerId);
      const local = agentLocalActors(state);
      const originalOpening = v2CharacterCellOpening(state, player, local);
      const authoredOpening = originalOpening && usesRelationshipSetup(state)
        ? projectRelationshipSource(relationshipSetupForState(state), { kind: 'cell-opening', ownerId: playerId, value: originalOpening }).value
        : originalOpening;
      if (creation.opening?.text) {
        emit(state, creation.opening.text);
        emit(state, `眼前所见：${local.map(actor => agentLabel(state, actor)).join('；') || '没有其他人'}。${usesBunkSettingV2(state) ? '' : '你的行动与对白由你决定，其他少女不会替你作出选择。'}`);
      } else if (authoredOpening) {
        for (const paragraph of authoredOpening) emit(state, paragraph);
      } else {
        emit(state, bunkSceneDescription(state, current, player, `你以${player.name}的身份在${state.location}醒来。${state.agentDoorOpen
          ? '这里是可通行的公共地点，其他人没有因你的到来自动集合。'
          : '陌生的石墙、双层床与墙上的显示屏映入眼帘，铁栅栏门尚未打开。'}`));
        emit(state, `眼前所见：${local.map(actor => agentLabel(state, actor)).join('；') || '没有其他人'}。${usesBunkSettingV2(state) ? '' : '你的行动与对白由你决定，其他少女不会替你作出选择。'}`);
      }
    }
    if (state.customAbilitySetup) { enableAutonomy(state); enablePrisonWorld(state); runtimeApplyItemPolicy(state, 1); enableCaseRuntime(state); }
    if (creation.loop === 2) emit(state, usesBunkSettingV2(state) ? '牢房里渐渐透进清晨的微光。' : '这是独立的第二周目开局。不会从其他存档继承进度；跨轮记忆只属于情境明确指定的本人，未来仍由本次行动改变。');
    return state;
  }
  if (rootCaseOptionsVersion === 1 && runtimeCapabilityId(runtime?.id) === 'agent-prison-runtime@8') state.rootCaseOptionsVersion = 1;
  for (const opening of runtimeRevisionForState(state).content.host.scenario.opening) emit(state, opening.text);
  return state;
}
const normalize = text => text.trim().replaceAll('會客廳', '会客厅').replaceAll('走廊', '走廊')
  .replaceAll('觀察', '观察').replaceAll('對', '对').replaceAll('說', '说').replaceAll('詢問', '询问')
  .replaceAll('希羅', '希罗').replaceAll('櫻羽艾瑪', '樱羽艾玛').replaceAll('書寫', '书写');
function resolveTarget(state, name) {
  return agentLocalActors(state).find(actor => name === actor.id || name === agentLabel(state, actor)
    || (state.known.includes(actor.id) && (name === actor.name || actor.name.endsWith(name))));
}
function stripQuotes(text) {
  const value = text.trim();
  return (value.startsWith('「') && value.endsWith('」')) || (value.startsWith('“') && value.endsWith('”'))
    || (value.startsWith('"') && value.endsWith('"')) ? value.slice(1, -1).trim() : value;
}
/** Only exact host verbs or explicit speech: quoted hypotheticals never become moves. */
export function parseLegacyAgentIntent(state, text) {
  const no = message => ({ accepted: false, message });
  if (typeof text !== 'string' || !text.trim() || text.length > 2000) return no('请输入不超过两千字的一句发言或一个行动。');
  const command = normalize(text).replace(/[。！!？?]$/u, '');
  if (/^(?:观察(?:牢房|会客厅|四周)?|看看四周|环顾四周|查看周围)$/u.test(command)) return { accepted: true, intent: { type: 'look' } };
  if (/^(?:查看|观察|打开)(?:墙上的)?(?:屏幕|电视)$/u.test(command)) {
    return (state.creation ? !['corridor', 'reception'].includes(agentLocationId(state)) : agentLocationId(state) === 'cell') ? { accepted: true, intent: { type: 'broadcast' } } : no('显示屏装在牢房的墙上，回到牢房便能查看。');
  }
  const move = /^(?:去|前往|走到|走进|回到|返回)(牢房|新增牢房|玩家牢房|八號牢房|[一二三四五六七八]号牢房|走廊|会客厅|会客室|接客室)$/u.exec(command);
  if (move) {
    const playerCell = ['八号牢房', '八號牢房', '新增牢房', '玩家牢房'].includes(move[1]);
    const target = state.creation && playerCell ? 'playercell'
      : (state.creation && Object.keys(CREATED_ROOMS).find(key => CREATED_ROOMS[key] === move[1])) || ALIASES[move[1]];
    const current = agentLocationId(state);
    if (!state.agentDoorOpen) return no('牢门仍然锁着。可以观察牢房、与希罗交谈，或查看屏幕。');
    if (!adjacent(current, state).includes(target)) return no('请一次走到一个相邻地点；牢房和会客厅之间需要经过走廊。');
    return { accepted: true, intent: { type: 'move', target } };
  }
  // Parse only the addressing prefix; preserve the player's utterance verbatim.
  const addressed = /^(?:对|向)?(.{1,100}?)(?:说|问|询问|书写)[：:]([\s\S]+)$/u.exec(text.trim())
    || /^(?:问|询问)(.{1,40}?)[：:]([\s\S]+)$/u.exec(text.trim());
  let target; let utterance;
  if (addressed) {
    target = resolveTarget(state, normalize(addressed[1]));
    utterance = stripQuotes(addressed[2]);
    if (!target) return no('对方不在眼前或称呼尚未对应。请使用当前可交流人物显示的称呼。');
  } else if (/^[「“"][\s\S]+[」”"]$/u.test(text.trim()) && agentLocalActors(state).length === 1) {
    target = agentLocalActors(state)[0]; utterance = stripQuotes(text);
  } else return no('请说说眼下想做的一件事，或想对谁说什么。例如：对希罗说：「你知道这里是什么地方吗？」。');
  if (!utterance || utterance.length > 1000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(utterance)) return no('本轮请使用一条不超过一千字的完整发言。');
  return { accepted: true, intent: { type: 'conversation', targetId: target.id, playerText: utterance } };
}
// Natural language is a request for interpretation, never authority to mutate.
// Keep the legacy grammar separately for byte-identical historical replay.
export function parseAgentIntent(state, text, { scheduleWaitVersion } = {}) {
  if (typeof text !== 'string' || !text.trim() || text.length > 2000
    || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f<>]/u.test(text)) return { accepted: false, message: '请输入不超过两千字的行动或发言。' };
  try { assertGuardOrdinaryAction(state); } catch (error) { return { accepted: false, code: error.code, message: error.message }; }
  if (hasIntentRuntime(state.agentRuntimeRevision)) return { accepted: true, intent: { type: 'interpret', rawInput: text } };
  const scheduleWait = parseScheduleWaitIntent(state, text, scheduleWaitVersion);
  if (scheduleWait) return scheduleWait;
  if (hasCaseRuntime(state)) {
    const parsed = parseCausalIntent(state, text);
    if (parsed) return parsed;
  }
  const reading = parseReadingIntent(state, text, createdPlayerId(state));
  if (reading) return { accepted: true, intent: reading };
  if (isKnowledgeGated(state) && /^(?:阅读|閱讀|查阅|查閱)/u.test(text.trim())) {
    return { accepted: false, message: '当前没有已取得或可合法阅读的该项资料；未创建文件或补入未知信息。' };
  }
  if (hasCaseOne(state)) return parseCaseIntent(state, text);
  const command = normalize(text).replace(/[。！!？?]$/u, '');
  if (!hasCaseOne(state) && (!hasCaseRuntime(state) || !activeProcedure(state) || activeProcedure(state).stage === 'aftermath')) {
    if (/(?:睡(?:觉|覺)?(?:到|至)?(?:明天|第二天|次日)?(?:早上|清晨|天亮|早晨)|睡到(?:明天|第二天|次日)|等待?(?:到|至)(?:明天|第二天|次日)?(?:早上|清晨|天亮|早晨)|休息(?:到|至)(?:明天|第二天|次日)?(?:早上|清晨|天亮|早晨))/u.test(command)) {
      try { assertLawfulLongWait(state, createdPlayerId(state), agentLocationId(state), nextFreePeriodBoundary(state, { morningOnly: true })); }
      catch (error) { return { accepted: false, message: error.message }; }
      return { accepted: true, intent: { type: 'wait', operation: 'until_morning', summary: '在当前地点休息等待至清晨放风时刻' } };
    }
    if (/(?:等待?(?:到|至)(?:自由时间|自由時間|放风|放風|开门|開門|解锁|解鎖)|(?:构思|構思|思考|推演|盘算|盤算|规划|規劃).*(?:直到|直至|到|至)(?:自由时间|自由時間|放风|放風|早上|清晨|天亮|开门|開門)|在?(?:门禁|門禁|滞留|滯留|就寝|就寢)(?:时间|時間|时段|時段)?.*(?:直到|直至|到|至)(?:自由时间|自由時間|放风|放風|早上|清晨|天亮|开门|開門))/u.test(command)) {
      try { assertLawfulLongWait(state, createdPlayerId(state), agentLocationId(state), nextFreePeriodBoundary(state)); }
      catch (error) { return { accepted: false, message: error.message }; }
      return { accepted: true, intent: { type: 'wait', operation: 'until_free_time', summary: '在当前地点思考并等待至下一段自由放风时间' } };
    }
  }
  if (/^(?:等待|稍等|等一会|等一下|原地等待)(?:片刻)?$/u.test(command)) return { accepted: true, intent: { type: 'wait' } };
  const vagueMove = /^(?:去那边|到那边|走过去|过去那边|前往那边)$/u.test(command);
  if (vagueMove) {
    const options = adjacent(agentLocationId(state), state).map(id => agentLocationLabel(roomsFor(state)[id])).filter(Boolean);
    if (options.length === 1 && state.agentDoorOpen) {
      const exactMove = parseLegacyAgentIntent(state, `前往${options[0]}`);
      if (exactMove.accepted) return exactMove;
    }
    return { accepted: false, message: options.length
      ? `要去的地点不明确。当前可以走到：${options.join('、')}。没有移动。`
      : '眼下没有可以走过去的相邻地点。没有移动。' };
  }
  if (/^(?:跟她说|对她说|问她|跟他说|对他说|问他)$/u.test(command)) {
    const people = agentLocalActors(state).map(actor => agentLabel(state, actor));
    return { accepted: false, message: people.length
      ? `要交谈的人不明确。眼前可以称呼：${people.join('、')}。没有发言。`
      : '眼前没有可以交谈的人。没有发言。' };
  }
  const exact = parseLegacyAgentIntent(state, text);
  if (exact.accepted) return exact;
  return { accepted: true, intent: { type: 'interpret', rawInput: text } };
}
export function agentScene(state) {
  if (hasCaseRuntime(state)) return causalPlayerScene(state);
  if (hasCaseOne(state)) return caseScene(state, actorsForState(state));
  const current = agentLocationId(state);
  return { location: agentLocationLabel(state.location), roomId: current, doorOpen: state.agentDoorOpen,
    ...(usesCurfewPolicy(state) ? { confinement: curfewScenePolicy(state, createdPlayerId(state), current) } : {}),
    ...(state.agentFormatVersion >= 3 ? { clock: prisonClock(state) } : {}),
    description: bunkSceneDescription(state, current, actorForState(state, createdPlayerId(state)), current === 'reception' ? '有桌椅与壁炉的会客厅。'
      : current === 'corridor' ? '石砌走廊连接牢房与会客厅。' : '石墙旁有双层床、铁栅栏门和嵌在墙上的显示屏。'),
    nearby: agentLocalActors(state).map(actor => ({ id: actor.id, label: agentLabel(state, actor), appearance: actor.appearance })),
    adjacent: adjacent(current, state).map(id => ({ id, label: agentLocationLabel(roomsFor(state)[id]) })),
    screenAvailable: state.creation ? !['corridor', 'reception'].includes(current) : current === 'cell',
    ...(hasPrisonWorld(state) ? { clock: prisonClock(state), ruleFacts: worldSurfaceFacts(current, state),
      movementPolicy: '依当前门锁与相邻通路逐段移动；拘禁时段须留在所属牢房，在外者可沿原路返回。',
      permittedDestinations: adjacent(current, state).filter(key => prisonPassage(state, { actorId: createdPlayerId(state), from: currentCode(state),
        to: (state.creation ? ROOM_CODES : LOCATION_CODES)[key], home: actorForState(state, createdPlayerId(state)).locationId })),
      rulebookAccess: '配发手机中收录了魔女图鉴与规定页；本人知识以实际阅读和见闻为准。',
      assemblyNotice: state.agentWorld.broadcasts.length ? '典狱长已通知接客室集合，收到通知的人各自准备动身。' : '尚未收到集合广播。' } : {}) };
}
const keys = (value, allowed) => plain(value) && Object.keys(value).every(key => allowed.includes(key));
const currentCode = state => (state.creation ? ROOM_CODES : LOCATION_CODES)[agentLocationId(state)];
const placeCodeLabel = code => agentLocationLabel(CREATED_ROOMS[roomKey(code)] || '当前位置');
function announceAssembly(state, text = CARD_ASSEMBLY_TEXT, key) {
  const notice = announcePrisonAssembly(state, { actors: actorsForState(state), playerId: createdPlayerId(state),
    locationOf: actor => state.agentPositions?.[actor.id] || actor.locationId, text, key });
  if (notice && !state.known.includes('warden')) state.known.push('warden');
  return notice;
}
function tickPrison(state, fromTime, playerFrom, { engagedId, manualDestination, playerArrival } = {}) {
  if (!hasPrisonWorld(state)) return;
  if (engagedId) deferAssemblyActor(state, engagedId, state.worldTime, manualDestination);
  advancePrisonActivities(state, { actors: actorsForState(state), playerId: createdPlayerId(state), fromTime, toTime: state.worldTime,
    playerFrom, playerTo: currentCode(state), playerArrival: playerArrival ?? state.worldTime,
    label: actor => agentLabel(state, actor), roomLabel: placeCodeLabel,
    emitVisible: (text, occurredAt) => emit(state, text, null, { delivery: 'action', occurredAt }) });
}
function applyCardPrologue(state, opening) {
  const playerId = createdPlayerId(state);
  state.known = opening.id === 'card-second' ? actorsForState(state).filter(actor => actor.id !== 'warden').map(actor => actor.id)
    : [playerId, ...(['emma', 'hiro'].includes(playerId) ? [playerId === 'emma' ? 'hiro' : 'emma'] : [])];
  state.agentOpening = { id: opening.id, source: structuredClone(opening.source), handoff: 'player-choice' };
  // Another cell cannot observe Emma's dream, Hiro's private recollections or
  // an unseen room's dialogue. Keep the lossless source archived, project only
  // this actor's legal present perception; never put the omniscient card in RAG.
  if (opening.id === 'card-other-cell' && playerId !== 'emma') {
    const player = actorForState(state, playerId);
    const local = agentLocalActors(state);
    const authoredOpening = v2CharacterCellOpening(state, player, local);
    if (authoredOpening) {
      for (const paragraph of authoredOpening) emit(state, paragraph);
      return;
    }
    emit(state, bunkSceneDescription(state, agentLocationId(state), player,
      `${player.name}在${state.location}醒来。石墙旁是双层床，墙上嵌着显示屏，铁栅栏门尚未打开。`));
    emit(state, `眼前所见：${local.map(actor => agentLabel(state, actor)).join('；') || '没有其他人'}。`);
    return;
  }
  const playerFrom = currentCode(state);
  let corridor = false;
  for (const block of opening.blocks) {
    if (block.kind === 'image' || !block.text) continue;
    if (block.stage === 'corridor' && !corridor) {
      corridor = true; state.worldTime = 35; state.location = roomsFor(state).corridor; state.phase = 'agent_corridor';
      tickPrison(state, 0, playerFrom, { playerArrival: 20 });
    }
    if (block.speakerId === 'warden') {
      const notice = announceAssembly(state, block.text, `opening:${opening.id}:broadcast`);
      emit(state, block.text, 'warden', { audienceIds: notice.audienceIds, delivery: 'speech', occurredAt: 0, observationKey: notice.id });
      continue;
    }
    if (block.kind === 'dialogue' && !block.memory) {
      // Cell shouts are audible but their owners remain unrecognised; no name
      // discovery occurs solely because the host knows who produced a voice.
      const audience = block.stage === 'corridor' ? [playerId, ...agentLocalActors(state).map(actor => actor.id)]
        : block.speakerId === 'coco' || block.speakerId === 'hanna' || block.speakerId === 'alisa'
          ? [playerId, ...actorsForState(state).filter(actor => actor.id !== 'warden' && actor.id !== playerId).map(actor => actor.id)]
          : [...new Set([playerId, block.speakerId, ...agentLocalActors(state).map(actor => actor.id)])];
      emit(state, block.text, block.speakerId, { audienceIds: audience, delivery: actorForState(state, block.speakerId).communication });
      // A voice beyond the bars reveals no unseen hair, clothing or identity.
      // Preserve its audited owner internally, but do not label it with the
      // appearance we would use only after actually seeing that stranger.
      if (block.stage === 'cell' && !state.known.includes(block.speakerId)
        && !agentLocalActors(state).some(actor => actor.id === block.speakerId)) state.entries.at(-1).speaker = '远处的少女声音';
    } else emit(state, block.text);
  }
  state.worldTime = 45; tickPrison(state, 35, currentCode(state));
  // Already-delivered source narration may contain the viewpoint owner's
  // private thoughts. It is reading history, not an atmospheric RAG palette.
  for (const entry of state.entries) entry.openingSource = opening.id;
}
/** An ordinary @8 root that predates the verbal case-option menu may capture
 * that menu at the next real act. The action carries the pin, so loading an old
 * save never rewrites it and replayed history before that act stays unpinned. */
export function canCaptureRootCaseOptions(state) {
  return state?.exampleId === 'agent' && runtimeCapabilityId(state.agentRuntimeRevision) === 'agent-prison-runtime@8'
    && !state.rootCaseOptionsVersion && !state.completed && !state.fixtureBranch
    && !hasCaseOne(state) && !state.creation?.scenarioId && !state.creation?.storyArcId;
}
function rootCaseOptionsAtRoot(state) {
  return state.rootCaseOptionsVersion === 1
    && !state.agentActions.some(action => action?.rootCaseOptionsVersion === 1);
}
function assertRootCaseOptionsAction(action, state) {
  if (!Object.hasOwn(action, 'rootCaseOptionsVersion')) return;
  if (action.rootCaseOptionsVersion !== 1 || action.type !== 'scene' || action.causalVersion !== 1
    || action.sceneBeatVersion !== 1
    || runtimeCapabilityId(state.agentRuntimeRevision) !== 'agent-prison-runtime@8') fail();
  if (state.rootCaseOptionsVersion !== 1 && !canCaptureRootCaseOptions(state)) fail();
}
/** The same validator used by applyAgentAction; exposed for a source-only test
 * that must not fabricate a full scene. It only changes the caller's clone. */
export function applyRootCaseOptionsCapture(state, action) {
  if (!Object.hasOwn(action, 'rootCaseOptionsVersion')) return false;
  assertRootCaseOptionsAction(action, state);
  if (state.rootCaseOptionsVersion !== 1) state.rootCaseOptionsVersion = 1;
  return true;
}
export function applyAgentAction(state, action) {
  if (action?.type === 'case_item_policy_activate') {
    activateCaseItemPolicy(state, action);
    state.agentActions.push(structuredClone(action)); state.revision += 1; return;
  }
  // Guard activation and dice/detention settlements are host actions, not
  // narratives. Dispatch before legacy/case reducers or action field gates.
  if (action?.type?.startsWith('guard_')) { applyGuardHostAction(state, action); return; }
  assertGuardOrdinaryAction(state);
  if (guardEnabled(state) && !hasCaseOne(state) && action?.type !== 'case_execution'
    && (action?.type !== 'scene' || action?.causalVersion !== 1 || action?.sceneBeatVersion !== 1)) fail();
  const limit = hasCaseRuntime(state) || action?.causalVersion === 1 ? Number.MAX_SAFE_INTEGER : 256;
  if (!plain(action) || state.exampleId !== 'agent' || state.completed || state.agentActions.length >= limit) fail();
  if (Object.hasOwn(action, 'itemPolicyVersion') && (![1, 2].includes(action.itemPolicyVersion)
    || action.type !== 'scene' || action.causalVersion !== 1)) fail();
  assertRootCaseOptionsAction(action, state);
  if (Object.hasOwn(action, 'rootCaseOptionsVersion') && state.rootCaseOptionsVersion !== 1)
    state.rootCaseOptionsVersion = 1;
  if (Object.hasOwn(action, 'introductionVersion') && (![1, 2, 3, 4, 5].includes(action.introductionVersion)
    || action.introductionVersion === 4 && !isKnowledgeGated(state)
    || action.type !== 'scene' || action.sceneBeatVersion !== 1)) fail();
  if (Object.hasOwn(action, 'scheduleWaitVersion') && (action.scheduleWaitVersion !== 1
    || action.type !== 'scene' || action.sceneBeatVersion !== 1 || !['agent-prison-runtime@3', 'agent-prison-runtime@4', 'agent-prison-runtime@5', 'agent-prison-runtime@6', 'agent-prison-runtime@7', 'agent-prison-runtime@8'].includes(runtimeCapabilityId(state.agentRuntimeRevision)))) fail();
  if (action.type === 'case_execution' && action.sceneVersion === 2) enableAutonomy(state);
  if (hasCaseOne(state)) {
    if (action.type === 'case_execution') applyCaseExecution(state, action);
    else if (action.type === 'scene') applySceneAction(state, action);
    else fail();
    return;
  }
  if (hasCaseRuntime(state) && action.type === 'case_execution') { applyProcedureExecution(state, action); return; }
  // Once activated, later actions must retain the causal contract. Historical
  // reducers remain available only before activation, not as a route around
  // sealed procedures, physical prerequisites, or the shared clock.
  if (hasCaseRuntime(state) && (action.type !== 'scene' || action.causalVersion !== 1)) fail();
  const current = agentLocationId(state); const local = agentLocalActors(state).map(actor => actor.id);
  const playerId = createdPlayerId(state); const fromTime = state.worldTime; const playerFrom = currentCode(state);
  if (action.type === 'narrative') { applyNarrativeAction(state, action); return; }
  if (action.type === 'scene') { applySceneAction(state, action); return; }
  if (action.type === 'look') {
    if (!keys(action, ['type'])) fail();
    const extraCell = state.agentFormatVersion === 1
      ? (state.creation?.playerMode === 'custom' ? '与独立新增的牢房' : '')
      : (roomsFor(state).playercell ? '与八号牢房' : '');
    emit(state, state.creation ? (current === 'corridor'
      ? `你站在石砌走廊里。一侧是原有七间牢房${extraCell}，另一端通向会客厅。此处没有可当面交流的人。`
      : current === 'reception' ? '会客厅里有桌椅与壁炉。没有自动集合、自我介绍或后续事件。'
        : `这里是${state.location}。石墙旁摆着双层床，墙上嵌着屏幕。铁门${state.agentDoorOpen ? '已解锁' : '还锁着'}。眼前的人：${agentLocalActors(state).map(actor => agentLabel(state, actor)).join('、') || '暂无其他人'}。`)
      : current === 'cell' ? `粗糙的双层床贴着石墙，墙上嵌着一块显示屏。希罗仍在牢房里。铁栅栏门${state.agentDoorOpen ? '已经解锁，外面通向走廊' : '还锁着'}。`
      : current === 'corridor' ? '石砌走廊一侧有七间牢房，另一端通向会客厅。这里没有可当面交流的人。'
        : current === 'reception' ? '会客厅里有桌椅和壁炉。你独自走到这里，其他少女没有自动跟随或开始自我介绍。'
          : `你望见石墙、双层床和墙上的屏幕。这里的人：${agentLocalActors(state).map(actor => agentLabel(state, actor)).join('、')}。`);
    state.worldTime += 5;
  } else if (action.type === 'broadcast') {
    if (!keys(action, ['type']) || (state.creation ? ['corridor', 'reception'].includes(current) : current !== 'cell')) fail();
    if (!state.agentDoorOpen) {
      emit(state, '显示屏亮起，一个自称典狱长的身影出现在画面里。');
      if (!state.known.includes('warden')) state.known.push('warden');
      emit(state, AGENT_BROADCAST_TEXT, 'warden',
        { audienceIds: [playerId, ...local], delivery: 'speech' });
      state.agentDoorOpen = true;
      emit(state, '广播结束，门锁响了一声。门外传来沉重的脚步声。是否立刻出去，由你决定。');
    } else emit(state, '屏幕已经暗下，牢门保持解锁。没有新的广播。');
    state.worldTime += 12;
  } else if (action.type === 'move') {
    if (!keys(action, ['type', 'target']) || !state.agentDoorOpen
      || !adjacent(current, state).includes(action.target)) fail();
    state.location = roomsFor(state)[action.target]; state.phase = `agent_${action.target}`;
    emit(state, state.creation ? `你走到${state.location}。${agentLocalActors(state).map(actor => agentLabel(state, actor)).join('、') || '没有其他人'}在眼前；没有人自动跟随。`
      : action.target === 'cell' ? '你回到牢房。希罗还在这里。'
      : action.target === 'corridor' ? '你来到走廊。可以返回自己的牢房、拜访其他已开锁的牢房，或前往会客厅。'
        : action.target === 'reception' ? '你走进会客厅。没有其他人自动跟来；集合、介绍和后续事件都尚未发生。'
          : `你走到${state.location}。${agentLocalActors(state).map(actor => agentLabel(state, actor)).join('、')}就在眼前，尚未互报姓名。`);
    state.worldTime += action.target === 'reception' ? 25 : 15;
  } else if (action.type === 'conversation') {
    if (!keys(action, ['type', 'targetId', 'playerText', 'reply', 'jobId', 'questionKey', 'answerKey'])
      || !local.includes(action.targetId) || typeof action.playerText !== 'string' || !action.playerText.trim() || action.playerText.length > 1000
      || typeof action.reply !== 'string' || !action.reply.trim() || action.reply.length > 2000
      || ![action.jobId, action.questionKey, action.answerKey].every(id => typeof id === 'string' && /^[a-zA-Z0-9:-]{1,100}$/u.test(id))) fail();
    emit(state, action.playerText, playerId, { audienceIds: actorForState(state, playerId).communication === 'writing' ? [playerId, action.targetId] : [playerId, ...local], observationKey: action.questionKey });
    state.worldTime += 3 + Math.ceil(action.playerText.length / 6);
    const actor = actorForState(state, action.targetId);
    // A self-introduction can reveal this name; a label never reveals private biography.
    if (!state.known.includes(actor.id) && action.reply.includes(actor.name)) state.known.push(actor.id);
    emit(state, action.reply, actor.id, { audienceIds: actor.communication === 'writing' ? [playerId, actor.id] : [playerId, ...local], observationKey: action.answerKey });
    state.worldTime += 3 + Math.ceil(action.reply.length / 6);
  } else fail();
  tickPrison(state, fromTime, playerFrom, { engagedId: action.type === 'conversation' ? action.targetId : undefined });
  state.agentActions.push(structuredClone(action)); state.revision += 1;
  if (!Number.isSafeInteger(state.worldTime) || !Number.isSafeInteger(state.revision)) fail();
}
const safeProse = (value, maximum) => typeof value === 'string' && value.trim() && value.length <= maximum
  && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f<>]/u.test(value);
export function narrativeResolution(state, intent, response, { worldVersion, additionalElapsed = 0, ballots } = {}) {
  if (hasCaseOne(state)) return caseResolution(state, intent, response, { ballots });
  if (!keys(intent, ['type', 'summary', 'targetId', 'destination', 'playerText', ...(intent?.type === 'wait' ? ['operation'] : [])])
    || !['look', 'move', 'broadcast', 'conversation', 'wait', 'follow', 'act'].includes(intent.type)
    || (intent.operation !== undefined && !['until_free_time', 'until_morning'].includes(intent.operation))
    || !safeProse(intent.summary, 800)) fail();
  const before = agentScene(state); const current = agentLocationId(state);
  if (intent.targetId && !before.nearby.some(actor => actor.id === intent.targetId)) fail();
  if (['conversation', 'follow'].includes(intent.type) && !intent.targetId) fail();
  const draft = structuredClone(state);
  if (worldVersion === 1) enablePrisonWorld(draft);
  const modern = hasPrisonWorld(draft); const facts = []; const resolution = { elapsed: 5, facts };
  const canPass = (actorId, from, to) => prisonPassage(draft, { actorId, from, to, home: actorForState(state, actorId).locationId });
  const codes = state.creation ? ROOM_CODES : LOCATION_CODES;
  const roomNames = roomsFor(state);
  const screen = intent.type === 'broadcast' || (['wait', 'follow'].includes(intent.type) && !state.agentDoorOpen && before.screenAvailable && !intent.operation);
  // A supported old save may already contain a locally delivered broadcast.
  // Re-deliver it NOW through the phones on the first versioned continuation;
  // never backfill historical audiences, movements or sealed cognition rows.
  const legacyNotice = modern && !draft.agentWorld.broadcasts.length && state.agentDoorOpen
    && state.entries.some(entry => entry.speakerId === 'warden' && [AGENT_BROADCAST_TEXT, CARD_ASSEMBLY_TEXT].includes(entry.text));
  if (legacyNotice) {
    announceAssembly(draft); resolution.broadcast = true;
    facts.push('配发手机再次送达此前的集合通知；已经解锁的门保持可通行，其他人从当前时刻开始陆续响应。');
  } else if (screen && before.screenAvailable
    && (!state.agentDoorOpen || (state.agentFormatVersion >= 3 && intent.type === 'broadcast'))
    && (!modern || !draft.agentWorld.broadcasts.length)) {
    if (modern) announceAssembly(draft);
    else draft.agentDoorOpen = true;
    resolution.broadcast = true; resolution.elapsed += 12;
    facts.push('墙上的屏幕亮起。典狱长通知前往会客厅集合，牢门解锁，门外传来沉重的脚步声。');
  } else if (intent.type === 'broadcast') facts.push(before.screenAvailable ? '显示屏是暗的，未出现新的广播。' : '眼前没有显示屏。');
  if (intent.type === 'move') {
    if (!before.adjacent.some(room => room.id === intent.destination)) fail();
    if (modern ? !canPass(createdPlayerId(state), codes[current], codes[intent.destination]) : !draft.agentDoorOpen) facts.push(modern ? '铁栅栏门或当前滞留规定挡住去路，脚步停在门前。' : '铁栅栏门仍上锁，脚步停在门前。');
    else { draft.location = roomNames[intent.destination]; draft.phase = `agent_${intent.destination}`;
      resolution.playerDestination = intent.destination; resolution.elapsed += intent.destination === 'reception' ? 25 : 15;
      facts.push(`你由${agentLocationLabel(state.location)}来到${agentLocationLabel(draft.location)}。`); }
  }
  if (response?.movement) {
    if (!intent.targetId || !['follow', 'wait', 'act'].includes(intent.type) || !draft.agentDoorOpen
      || !before.adjacent.some(room => room.id === response.movement.destination)
      || (modern && !canPass(intent.targetId, codes[current], codes[response.movement.destination]))) fail();
    const destination = response.movement.destination;
    draft.agentPositions = { ...(draft.agentPositions || {}), [intent.targetId]: codes[destination] };
    resolution.npcDestination = destination;
    facts.push(`${before.nearby.find(actor => actor.id === intent.targetId).label}自行决定走到${agentLocationLabel(roomNames[destination])}。`);
    if (intent.type === 'follow') { draft.location = roomNames[destination]; draft.phase = `agent_${destination}`;
      resolution.playerDestination = destination; resolution.elapsed += destination === 'reception' ? 25 : 15;
      facts.push('你等对方迈步后，依照原先的打算跟上；对方没有因此承诺同行或表示信任。'); }
  } else if (intent.type === 'follow') facts.push('对方暂未离开，你在当前地点等候了片刻。');
  if (['wait', 'act'].includes(intent.type)) resolution.elapsed += 10;
  if (modern) {
    resolution.elapsed += additionalElapsed;
    if (intent.type === 'wait' && intent.operation) {
      const target = nextFreePeriodBoundary(draft, { morningOnly: intent.operation === 'until_morning' });
      if (target !== null) {
        assertLawfulLongWait(draft, createdPlayerId(draft), current, target);
        resolution.elapsed = Math.max(resolution.elapsed, target - draft.worldTime);
      }
    }
    draft.worldTime += resolution.elapsed;
    const start = draft.entries.length;
    tickPrison(draft, state.worldTime, codes[current], { engagedId: intent.targetId,
      manualDestination: resolution.npcDestination ? codes[resolution.npcDestination] : undefined });
    facts.push(...draft.entries.slice(start).map(entry => entry.text));
  }
  resolution.afterScene = agentScene(draft);
  return resolution;
}
function applyNarrativeAction(state, action, { numberedRoomLabels = false } = {}) {
  if (!keys(action, ['type', 'jobId', 'rawInput', 'intent', 'performance', 'response', 'narration', 'questionKey', 'answerKey'])) fail();
  if (!safeProse(action.rawInput, 2000) || ![action.jobId, action.questionKey, action.answerKey].every(id => typeof id === 'string' && /^[a-zA-Z0-9:-]{1,100}$/u.test(id))
    || !keys(action.performance, ['action', 'utterance']) || !safeProse(action.performance.action, 1200)
    || (action.performance.utterance !== undefined && action.performance.utterance !== '' && !safeProse(action.performance.utterance, 1400))
    || !safeProse(action.narration, 2400)) fail();
  if (!preservesExplicitSpeech(action.rawInput, action.performance.utterance)) fail();
  const { intent, performance, response } = action; const playerId = createdPlayerId(state);
  const local = agentLocalActors(state).map(actor => actor.id);
  if (response && (!intent.targetId || !keys(response, ['utterance', 'intent', 'action', 'movement'])
    || (response.utterance !== undefined && !safeProse(response.utterance, 2000))
    || (response.action !== undefined && !safeProse(response.action, 1200)))) fail();
  const fromTime = state.worldTime; const playerFrom = currentCode(state);
  const extraTime = Math.ceil(((performance.utterance || '').length + (response?.utterance || '').length) / 6);
  const resolution = narrativeResolution(state, intent, response, { additionalElapsed: extraTime });
  // Performance, response and scene share one commit. Only these explicit
  // structured operations can change positions/locks; prose never executes.
  const communication = actorForState(state, playerId).communication;
  const audienceIds = communication === 'writing' && intent.targetId ? [playerId, intent.targetId] : [playerId, ...local];
  emit(state, performance.action, playerId, { audienceIds: [playerId, ...local], delivery: 'action',
    observationKey: performance.utterance ? `gesture:${action.jobId}` : action.questionKey });
  if (performance.utterance) emit(state, performance.utterance, playerId, { audienceIds, observationKey: action.questionKey });
  if (resolution.broadcast) {
    if (!state.known.includes('warden')) state.known.push('warden');
    const notice = hasPrisonWorld(state) ? announceAssembly(state, CARD_ASSEMBLY_TEXT, `broadcast:${action.jobId}`) : null;
    emit(state, notice?.text || AGENT_BROADCAST_TEXT, 'warden', { audienceIds: notice?.audienceIds || [playerId, ...local], delivery: 'speech', observationKey: `broadcast:${action.jobId}` });
    if (!hasPrisonWorld(state)) state.agentDoorOpen = true;
  }
  if (response) {
    const actor = actorForState(state, intent.targetId);
    if (response.action) emit(state, response.action, actor.id, { audienceIds: [playerId, ...local], delivery: 'action' });
    if (response.utterance) {
      if (!state.known.includes(actor.id) && response.utterance.includes(actor.name)) state.known.push(actor.id);
      emit(state, response.utterance, actor.id, { audienceIds: actor.communication === 'writing' ? [playerId, actor.id] : [playerId, ...local], observationKey: action.answerKey });
    }
    if (resolution.npcDestination) {
      const destination = roomsFor(state)[resolution.npcDestination];
      emit(state, `${agentLabel(state, actor)}走向${numberedRoomLabels ? agentLocationLabel(destination) : destination}。`, actor.id,
        { audienceIds: [playerId, ...local], delivery: 'action' });
      state.agentPositions = { ...(state.agentPositions || {}), [actor.id]: (state.creation ? ROOM_CODES : LOCATION_CODES)[resolution.npcDestination] };
    }
  }
  if (resolution.playerDestination) {
    state.location = roomsFor(state)[resolution.playerDestination]; state.phase = `agent_${resolution.playerDestination}`;
    emit(state, `你来到${numberedRoomLabels ? agentLocationLabel(state.location) : state.location}。`, playerId, { audienceIds: [playerId, ...new Set([...local, ...agentLocalActors(state).map(actor => actor.id)])], delivery: 'action' });
  }
  state.worldTime += resolution.elapsed + (hasPrisonWorld(state) ? 0 : extraTime);
  tickPrison(state, fromTime, playerFrom, { engagedId: intent.targetId,
    manualDestination: resolution.npcDestination ? (state.creation ? ROOM_CODES : LOCATION_CODES)[resolution.npcDestination] : undefined });
  emit(state, action.narration);
  state.agentActions.push(structuredClone(action)); state.revision += 1;
  if (!Number.isSafeInteger(state.worldTime) || !Number.isSafeInteger(state.revision)) fail();
}
/** Reuse the historical, deterministic action resolver on a detached draft.
 * Strip its placeholder narration; only canonical enactments are available to
 * the composer. Historical narrative@2 replay is left completely unchanged. */
export function sceneActionDraft(state, action) {
  validateSceneExtensions(action);
  if (Object.hasOwn(action, 'caseActionTimingVersion') && (action.caseActionTimingVersion !== 2
    || runtimeCapabilityId(state.agentRuntimeRevision) !== 'agent-prison-runtime@8')) fail();
  // The object-inspection timing pin is semantic, never presentation-only. It
  // must stay on the action through replay; otherwise the old 15s reducer would
  // be selected and the pinned meaning silently lost.
  if (Object.hasOwn(action, 'objectInspectionTimingVersion') && (action.objectInspectionTimingVersion !== 1
    || action.sceneBeatVersion !== 1 || action.causalVersion !== 1
    || action.itemPolicyVersion !== 2 || runtimeCapabilityId(state.agentRuntimeRevision) !== 'agent-prison-runtime@8')) fail();
  // Presentation-only fields wrap the existing resolver; historical actions
  // without pins follow precisely their original reducer and validation.
  const presentation = sceneExtensionPin(action);
  if (Object.keys(presentation).length && action.sceneBeatVersion !== 1) {
    const legacy = { ...action };
    for (const key of Object.keys(presentation)) delete legacy[key];
    const result = sceneActionDraft(state, legacy);
    result.draft.agentActions[result.draft.agentActions.length - 1] = structuredClone(action);
    return result;
  }
  assertGuardOrdinaryAction(state);
  if (guardEnabled(state) && !hasCaseOne(state) && (action?.causalVersion !== 1 || action?.sceneBeatVersion !== 1)) fail();
  if (Object.hasOwn(action, 'itemPolicyVersion') && (![1, 2].includes(action.itemPolicyVersion)
    || action.type !== 'scene' || action.causalVersion !== 1)) fail();
  assertRootCaseOptionsAction(action, state);
  if (Object.hasOwn(action, 'introductionVersion') && (![1, 2, 3, 4, 5].includes(action.introductionVersion)
    || action.introductionVersion === 4 && !isKnowledgeGated(state)
    || action.type !== 'scene' || action.sceneBeatVersion !== 1)) fail();
  if (Object.hasOwn(action, 'scheduleWaitVersion') && (action.scheduleWaitVersion !== 1
    || action.type !== 'scene' || action.sceneBeatVersion !== 1 || !['agent-prison-runtime@3', 'agent-prison-runtime@4', 'agent-prison-runtime@5', 'agent-prison-runtime@6', 'agent-prison-runtime@7', 'agent-prison-runtime@8'].includes(runtimeCapabilityId(state.agentRuntimeRevision)))) fail();
  if (action.sceneBeatVersion === 1) {
    if (runtimeRevisionForState(state).policy.sceneBeatVersion !== 1) fail();
    return sceneBeatsDraft(state, action, { customAct: takeCustomActPreparation(state),
      swapAct: takeSwapActPreparation(state) });
  }
  if (action.causalVersion === 1) return causalSceneDraft(state, action);
  if (hasCaseRuntime(state)) fail();
  if (action.decisionVersion === 1) return decisionSceneDraft(state, action);
  if (hasCaseOne(state)) {
    if (!preservesExplicitSpeech(action.rawInput, action.performance?.utterance)) fail();
    return caseEnactmentDraft(state, action);
  }
  if (!keys(action, ['type', 'jobId', 'rawInput', 'intent', 'performance', 'response', 'document', 'questionKey', 'answerKey', 'roomLabelVersion', 'worldVersion'])
    || action.type !== 'scene' || (action.roomLabelVersion !== undefined && action.roomLabelVersion !== 2)
    || (action.worldVersion !== undefined && action.worldVersion !== 1)) fail();
  const draft = structuredClone(state); const start = state.entries.length;
  if (action.worldVersion === 1) enablePrisonWorld(draft);
  // Newly prepared jobs record the naming policy. Historical scenes (including
  // a pre-update job still in flight) reproduce their original event text.
  const { document, roomLabelVersion, worldVersion: _worldVersion, ...enactment } = action;
  applyNarrativeAction(draft, { ...enactment, type: 'narrative', narration: '眼前的景象停在这一刻。' }, { numberedRoomLabels: roomLabelVersion === 2 });
  const events = draft.entries.slice(start, -1).map((entry, index) => ({ id: `event-${index + 1}`, entry }));
  return { draft, events, publicEvents: events.map(({ id, entry }) => ({ id, speaker: entry.speaker, delivery: entry.delivery, text: entry.text })) };
}
/** New action version wraps, never reinterprets, historical enactments. The
 * private event ledger is replay-bound but absent from player presentation. */
function decisionSceneDraft(state, action) {
  const guardPin = guardRuleReference(state);
  if (guardPin ? !isGuardRuleReference(action?.guardRules) : Object.hasOwn(action || {}, 'guardRules')) fail();
  if (!keys(action, ['type', 'jobId', 'rawInput', 'intent', 'performance', 'response', 'document', 'questionKey', 'answerKey',
    'roomLabelVersion', 'worldVersion', 'ballots', 'decisionVersion', 'decisions', 'performanceVersion', 'caseActionTimingVersion', ...(state.creation?.storyArcId ? ['storyArcVersion'] : []), ...(guardPin ? ['guardRules'] : [])]) || action.type !== 'scene'
    || !Array.isArray(action.decisions) || action.decisions.length > 3) fail();
  const base = structuredClone(state); enableAutonomy(base);
  if (action.response !== undefined) fail();
  const { decisionVersion, decisions, document, response, ...legacy } = action;
  const isRead = action.intent.type === 'read';
  if (isRead) readingMaterial(state, action.intent.subjectId, createdPlayerId(state));
  if (isRead && hasCaseOne(state) && ['ballot', 'execution_ready', 'ending', 'assembly'].includes(state.caseOne.stage)) fail();
  const originalIntent = action.intent;
  const baseIntent = isRead ? { type: 'look', summary: '查看手机中已配发的资料。' } : originalIntent;
  const { draft } = hasCaseOne(base)
    ? caseEnactmentDraft(base, { ...legacy, intent: baseIntent, decisionVersion, decisions: [] })
    : sceneActionDraft(base, { ...legacy, intent: baseIntent });
  const start = state.entries.length;
  const events = draft.entries.slice(start).filter(row => row.delivery !== 'narration');
  // New case writing has the same explicit-reader policy as ordinary play.
  for (const row of events) {
    if (row.speakerId === createdPlayerId(state) && row.delivery === 'action' && row.text === action.performance.action) row.observationKey = `gesture:${action.jobId}`;
    if (row.speakerId === createdPlayerId(state) && ['speech', 'writing'].includes(row.delivery) && row.text === action.performance.utterance) row.observationKey = action.questionKey;
    if (row.delivery === 'writing' && !(base.caseOne?.scheduledArcVersion === 1 && base.caseOne.stage === 'discussion'
      && row.speakerId === createdPlayerId(base) && /^(?:对|向|對)(?:全体|全體|大家)(?:书写|書寫)[：:]/u.test(action.rawInput.trim()))) row.audienceIds = acquisitionAudience(base, row.speakerId,
      { delivery: 'writing', targetId: row.speakerId === createdPlayerId(state) ? originalIntent.targetId : createdPlayerId(state) });
  }
  if (isRead) {
    const item = readingMaterial(state, originalIntent.subjectId, createdPlayerId(state)); const owner = createdPlayerId(state);
    const reads = draft.agentAutonomy.readByActor ||= {};
    const already = (reads[owner] || []).includes(item.id);
    if (!already) (reads[owner] ||= []).push(item.id);
    events.push({ speaker: actorForState(state, owner).name, speakerId: owner, delivery: 'reading', audienceIds: [owner],
      text: `阅读记录【${item.name}】：${item.text}`, occurredAt: draft.worldTime,
      ...(!already ? { observationKey: `read:${action.jobId}:${owner}` } : {}) });
  }
  for (const [index, row] of events.entries()) row.observationKey ||= `enactment:${action.jobId}:${index + 1}`;
  // Replayed routine activities have stable pre-decision source IDs too. The
  // legacy activity ID policy is unchanged outside this decision contract.
  for (const activity of (draft.agentWorld?.activityLog || []).slice(state.agentWorld?.activityLog?.length || 0)) {
    activity.observationKey = `routine:${action.jobId}:${activity.id}`;
  }
  // NPC decisions were generated from the same pre-proposal snapshot. Stable
  // task order is replay-bound; prior effects are rechecked, never regenerated.
  const timing = action.caseActionTimingVersion === 2 ? { caseActionTimingVersion: 2,
    onElapsed: seconds => {
      const c = draft.caseOne;
      const deadline = c.stage === 'investigation' ? c.investigationDeadline : c.stage === 'discussion' ? c.trialDeadline : null;
      const elapsed = deadline === null ? seconds : Math.min(seconds, Math.max(0, deadline - draft.worldTime));
      draft.worldTime += elapsed;
      if (c.stage === 'investigation' && draft.worldTime >= c.investigationDeadline) { c.stage = 'assembly'; draft.phase = 'agent_case_assembly'; }
      if (c.stage === 'discussion' && draft.worldTime >= c.trialDeadline) {
        c.stage = 'ballot'; draft.phase = 'agent_case_ballot';
        c.voterIds = actorsForState(draft).map(row => row.id).filter(id => !['warden', 'hiro', 'noah', ...c.executedIds].includes(id));
        c.candidateIds = [...c.voterIds]; c.ballots = {};
      }
      return { events: [], interrupted: elapsed < seconds || ['assembly', 'ballot'].includes(c.stage) };
    } } : {};
  let visible;
  if (usesIdentityAssertionV2(draft)) {
    // Commit the delivered player prefix to this detached draft before using
    // the NPC snapshot's capabilities. Retain each row's original label/time;
    // do not repersist it after an NPC introduction or disclose sibling replies.
    visible = persistEnactments(draft, events);
    const npcEvents = applyNpcDecisions(draft, decisions, action.jobId,
      { ...timing, followTargetId: originalIntent.type === 'follow' ? originalIntent.targetId : undefined });
    visible.push(...persistEnactments(draft, npcEvents));
  } else {
    events.push(...applyNpcDecisions(draft, decisions, action.jobId,
      { ...timing, followTargetId: originalIntent.type === 'follow' ? originalIntent.targetId : undefined }));
    visible = persistEnactments(draft, events);
  }
  const canonical = visible.map((entry, index) => ({ id: `event-${index + 1}`, entry }));
  draft.entries = [...state.entries, ...visible].map((entry, index) => ({ ...entry, id: `entry-${index + 1}` }));
  draft.agentActions[draft.agentActions.length - 1] = structuredClone(action);
  return { draft, events: canonical, publicEvents: canonical.filter(({ entry }) => entry.delivery !== 'reflection').map(({ id, entry }) => ({ id, speaker: entry.speaker, delivery: entry.delivery, text: entry.text })) };
}
const npcMagicPublications = new WeakMap();
const customActPreparations = new WeakMap();
const swapActPreparations = new WeakMap();
/** Host-only transport for the already-rebuilt custom act preparation. It is
 * never part of a model packet, an action or the persisted state. */
export function setCustomActPreparation(state, value) {
  if (value) customActPreparations.set(state, value); else customActPreparations.delete(state);
}
export function takeCustomActPreparation(state) {
  const value = customActPreparations.get(state) || null;
  customActPreparations.delete(state);
  return value;
}
/** Same host-only transport for the independently settled swap act. */
export function setSwapActPreparation(state, value) {
  if (value) swapActPreparations.set(state, value); else swapActPreparations.delete(state);
}
export function takeSwapActPreparation(state) {
  const value = swapActPreparations.get(state) || null;
  swapActPreparations.delete(state);
  return value;
}
export function takeNpcMagicPublication(state) {
  const publication = npcMagicPublications.get(state) || null;
  npcMagicPublications.delete(state);
  return publication;
}
function applySceneAction(state, action) {
  const { draft, events, publicEvents } = sceneActionDraft(state, action);
  // A custom prepared use is a Host-settled prefix, not model prose. Keep its
  // real entries deterministic even when the composer document omits them;
  // the composer may reference them, but cannot add, drop, duplicate or re-key
  // the actual entries. The Host always prepends the prepared prefix.
  const customEntries = draft.entries.slice(state.entries.length)
    .filter(entry => entry?.customAbilityEvent);
  const customEffectIds = new Set(customEntries.map(entry => entry.customAbilityEvent.effectId)
    .filter(effectId => typeof effectId === 'string'));
  const isCustomEntry = entry => Boolean(entry?.customAbilityEvent?.effectId
    && customEffectIds.has(entry.customAbilityEvent.effectId));
  const hostCustomEventIds = events.filter(({ entry }) => isCustomEntry(entry)).map(({ id }) => id);
  // A real NPC medical contact and its host-observable effect are Host-settled
  // entries too. Keep the composer from authoring or omitting them; merge each
  // at its canonical event position so the strict document still reproduces
  // every Host event exactly. Only the pinned NPC medical lane may reorder a
  // document this way. Legacy non-medical documents keep their original block
  // positions, including narration around Native contact/effect blocks.
  const medicalContact = action.npcMedicalContactVersion === 1;
  const hostMagicEventIds = medicalContact
    ? events.filter(({ entry }) => entry?.hostMagicEvent || entry?.magicObservation).map(({ id }) => id)
    : [];
  const hostEventIds = [...hostCustomEventIds, ...hostMagicEventIds];
  const document = validateSceneDocument(medicalContact
    ? mergeHostSceneEvents(action.document, hostEventIds, publicEvents.map(event => event.id))
    : mergeHostSceneEvents(action.document, hostCustomEventIds), publicEvents);
  const byId = new Map(events.map(event => [event.id, event.entry]));
  const narrationTimes = action.sceneEventTimeVersion === 1
    ? sceneNarrationTimes(document, sceneEventTimeline(state, draft, events, publicEvents), publicEvents) : null;
  const composed = [];
  document.blocks.forEach((block, index) => {
    if (block.type === 'event') {
      const entry = byId.get(block.eventId);
      // The prepared custom prefix is already emitted above. A document block
      // for the same effect/event is presentation only and must not duplicate
      // it; identity may differ after deterministic replay clones, so match the
      // Host effect id rather than a transient object reference.
      if (isCustomEntry(entry)) return;
      composed.push(structuredClone(entry));
      return;
    }
    composed.push({ speaker: '旁白', text: block.text, speakerId: null, audienceIds: [createdPlayerId(state)],
      delivery: 'narration', occurredAt: narrationTimes ? narrationTimes[index] : state.worldTime });
  });
  // Presentation ordering never grants observation authority to narration.
  // Event audiences, channels, exact speech, keys and timestamps come from the
  // resolver, not from any candidate document.
  const privateReflections = events.filter(({ entry }) => entry.delivery === 'reflection').map(({ entry }) => entry);
  draft.entries = [...state.entries, ...customEntries, ...privateReflections, ...composed]
    .map((entry, index) => ({ ...entry, id: `entry-${index + 1}` }));
  draft.agentActions[draft.agentActions.length - 1] = structuredClone(action);
  finalizeGuardEntries(draft, state.entries.length + customEntries.length);
  const publication = draft.npcMagicPublication || null;
  delete draft.npcMagicPublication;
  delete draft.magic;
  Object.assign(state, draft);
  delete state.magic;
  delete state.npcMagicPublication;
  if (publication) npcMagicPublications.set(state, publication);
}
function gameplay(state) {
  const { generation, revision, turnIds, stateFormatVersion, restoredFrom, playerAvatarId, ...body } = state;
  return body;
}
// Structural checks only: gameplay still needs a canonical root and verified
// transitions, or the full replay performed by validateAgentState below.
export function validateAgentStateEnvelope(state) {
  if (!plain(state)) fail();
  if (state.settingSupplement || (state.creation?.settingSupplementId && state.creation.settingSupplementId !== 'none')) {
    if (!hasBunkSupplement(state)) fail();
  }
  let runtime;
  try { runtime = runtimeRevisionForState(state); } catch { fail(); }
  if (Object.hasOwn(state, 'authoredMagicVersion') && (state.authoredMagicVersion !== 1
    || state.agentFormatVersion !== AGENT_PLAY_VERSION || state.customAbilitySetup || !supportsAuthoredMagicRoot(state.creation, runtime))) fail();
  if (!SUPPORTED_PLAY_VERSIONS.has(state.agentFormatVersion) || state.agentScenarioHash !== runtime.scenarioHash
    || !Array.isArray(state.agentActions) || (!hasCaseRuntime(state) && state.agentActions.length > 256) || !Array.isArray(state.turnIds)
    || state.agentActions.length !== state.turnIds.length) fail();
}
export function validateAgentState(state) {
  validateAgentStateEnvelope(state);
  const expected = initialAgentState(state.creation, { formatVersion: state.agentFormatVersion, runtimeRevisionId: state.agentRuntimeRevision,
    ...(hasSoftRuntime(state) && state.storyLifeVersion === 1 ? { storyLifeVersion: 1 } : {}),
    ...(state.authoredMagicVersion === 1 ? { authoredMagicVersion: 1 } : {}),
    ...(rootCaseOptionsAtRoot(state) ? { rootCaseOptionsVersion: 1 } : {}),
    ...(state.customAbilitySetup ? { customAbilitySetup: state.customAbilitySetup } : {}) });
  // A fresh original-Milia root may seed strict policy-2 objects before the
  // visible case-item activation commits. Rebuild only that host-marked root;
  // unmarked historical roots keep their original legacy seed.
  if (state.caseRootStrictItemsVersion === 1) {
    const projected = structuredClone(expected);
    delete projected.caseRuntime;
    projected.caseItemPolicy = caseItemPolicyV2Reference();
    projected.itemPolicyVersion = 2;
    enableCaseRuntime(projected);
    expected.caseRuntime = projected.caseRuntime;
    expected.caseRootStrictItemsVersion = 1;
  }
  // The swap lifecycle is a root record of the new original-Milia lane; it is
  // not part of the legacy initialAgentState constructor and must not be
  // inferred for old roots that never carried it.
  if (state.caseRuntime?.swapLifecycle) {
    if (!expected.caseRuntime) enableCaseRuntime(expected);
    if (expected.caseRuntime && !expected.caseRuntime.swapLifecycle)
      // The root record is always the empty new-Milia lifecycle. Copying the
      // final saved lifecycle would make the replayed first offer already
      // holding/consumed and cannot serve as the before-state proof.
      expected.caseRuntime.swapLifecycle = { version: 1, offers: [], journal: [] };
    // The same new original-Milia root also seeds the physical body positions
    // used by the occupied world. The constructor has no such root field, so
    // rebuild only that root value from the same room codes before replay;
    // old roots without the field stay on the legacy shape.
    if (state.agentPositions && !expected.agentPositions)
      expected.agentPositions = Object.fromEntries(actorsForState(expected)
        .filter(actor => actor.id !== 'warden')
        .map(actor => [actor.id, ROOM_CODES[runtimeRoom(expected, actor.id)] || 'unavailable']));
  }
  for (const action of state.agentActions) applyAgentAction(expected, action);
  if (!isDeepStrictEqual(gameplay(state), gameplay(expected))) fail();
}
export function agentActorInput(state, actorId) {
  const actor = agentLocalActors(state).find(actor => actor.id === actorId);
  if (!actor) throw Object.assign(new Error('当前角色不在合法的当面交流范围内。'), { code: 'INVALID_AGENT_ACTOR' });
  const playerId = createdPlayerId(state); const player = actorForState(state, playerId);
  if (hasCaseOne(state)) return { persona: actor.persona, situation: caseActorSituation(state, actorId),
    allowedActions: [actor.communication === 'writing' ? 'write' : 'speak'] };
  // A visible stranger has an appearance, not an automatic self-introduction.
  const alreadyAcquainted = (playerId === 'emma' && actor.id === 'hiro') || (playerId === 'hiro' && actor.id === 'emma');
  const label = alreadyAcquainted ? player.name : player.appearance;
  return { persona: actor.persona, situation: { locationLabel: agentLocationLabel(state.location), bodyCondition: `眼前的来访者是${label}。以眼前见闻回应这次交流，门锁、屏幕与周围人的当前状态以最新观测为准；记忆中的旧景留在过去。`, perceivedParticipants: [playerId] },
    allowedActions: [actor.communication === 'writing' ? 'write' : 'speak'] };
}
function nearbyProse(state, local = agentLocalActors(state)) {
  const names = local.filter(actor => state.known.includes(actor.id)).map(actor => actor.name);
  const strangers = local.length - names.length;
  const known = names.length ? `${names.join('、')}也在这里。` : '';
  const unknown = strangers === 1 ? `${known ? '还有' : '这里还有'}一位我不认识的少女。`
    : strangers ? `${known ? '还有' : '这里还有'}几位我不认识的少女。` : '';
  return known + unknown;
}

function currentRoomDescription(state, { includePeople = true } = {}) {
  const room = agentLocationId(state);
  const presence = includePeople ? nearbyProse(state) : '';
  if (room === 'corridor') return `石砌走廊沿着牢门延伸，另一端通向会客厅。${presence}`;
  if (room === 'reception') return `会客厅里摆着桌椅与壁炉。${presence}`;
  const bunk = visibleOwnBunk(state, actorForState(state, createdPlayerId(state)), room);
  const bed = bunk ? `双层床靠墙摆着，我的床位在${bunk}。` : '墙边是一张双层床。';
  const door = state.agentDoorOpen ? '通往走廊的铁栅栏门已经解锁。' : '通往走廊的铁栅栏门还锁着。';
  return `${bed}墙上嵌着一块显示屏。${door}${presence}`;
}

/** Pure, one-for-one publication overlay for authored historical narration.
 * Save-bound initial/action text is replayed verbatim by the resolver above.
 * Only known generated slots are rewritten; player openings, dialogue, model
 * prose, event metadata and entry counts remain untouched.
 *
 * The durable event ledger may retain an appearance label so the host and
 * actor-local cognition can distinguish an unrecognised person. That label is
 * not a name the player has learned. The player-facing transcript therefore
 * projects every still-unidentified actor as `？？？`, while keeping the
 * speakerId and the lossless internal row untouched. Delivered full-name /
 * nickname confirmations are revealed from that row onward, including older
 * histories whose resolver had not yet recognized this self-report grammar. */
const UNKNOWN_PLAYER_SPEAKER = '？？？';
const knownSpeakerAliases = new Map([
  ['艾玛', '樱羽艾玛'], ['希罗', '二阶堂希罗'], ['安安', '夏目安安'],
  ['诺亚', '城崎诺亚'], ['蕾雅', '莲见蕾雅'], ['蕾娅', '莲见蕾雅'],
  ['米莉亚', '佐伯米莉亚'], ['玛格', '宝生玛格'], ['奈叶香', '黑部奈叶香'],
  ['亚里沙', '紫藤亚里沙'], ['雪莉', '橘雪莉'], ['汉娜', '远野汉娜'],
  ['可可', '泽渡可可'], ['梅露露', '冰上梅露露'], ['典狱长', '典狱长'],
]);
function projectPlayerSpeaker(state, entry, introducedSpeakers, actorById) {
  if (!entry?.speakerId) return entry;
  const actor = actorById(entry.speakerId);
  if (!actor) return entry;
  if (['speech', 'writing'].includes(entry.delivery) && entry.audienceIds?.includes(createdPlayerId(state))
    && (isNicknameSelfIntroduction(actor, entry.text)
      || !isKnowledgeGated(state) && enactedSelfIntroduction(actor, entry))) introducedSpeakers.add(actor.id);
  if (introducedSpeakers.has(actor.id)) return { ...entry, speaker: actor.name };
  const raw = typeof entry.speaker === 'string' ? entry.speaker.trim() : '';
  const base = raw.replace(/（[^）]*）/gu, '').trim();
  const canonical = knownSpeakerAliases.get(base) || base;
  // A name is public only when the current player has acquired that identity
  // and the row itself carries the acquired/canonical name. Earlier rows keep
  // their unknown status instead of being rewritten retroactively.
  if (state.known.includes(actor.id) && canonical === actor.name) return entry;
  return { ...entry, speaker: UNKNOWN_PLAYER_SPEAKER };
}
export function agentStoryEntries(state, { projectUnknownSpeakers = false } = {}) {
  const introducedSpeakers = new Set();
  let roster;
  const actorById = id => (roster ??= actorsForState(state)).find(actor => actor.id === id);
  const entries = state.entries.map(entry => projectUnknownSpeakers ? projectPlayerSpeaker(state, { ...entry }, introducedSpeakers, actorById) : { ...entry });
  const replay = initialAgentState(state.creation, { formatVersion: state.agentFormatVersion, runtimeRevisionId: state.agentRuntimeRevision,
    ...(rootCaseOptionsAtRoot(state) ? { rootCaseOptionsVersion: 1 } : {}) });
  const replace = (index, text) => {
    const original = replay.entries[index];
    if (original?.delivery === 'narration' && entries[index]?.id === original.id && entries[index]?.text === original.text) {
      entries[index] = { ...entries[index], text };
    }
  };
  if (state.creation && !replay.agentOpening && !hasCaseOne(replay)) {
    const creation = state.creation;
    if (creation.playerMode === 'custom') {
      replace(0, `我在${agentLocationLabel(replay.location)}醒来。`);
      if (!creation.opening.text) replace(1, currentRoomDescription(replay));
    } else if (creation.actorId !== 'emma' || creation.opening) {
      const local = agentLocalActors(replay);
      if (!v2CharacterCellOpening(replay, actorForState(replay, createdPlayerId(replay)), local)) {
        if (!creation.opening?.text) replace(0, currentRoomDescription(replay, { includePeople: false }));
        replace(1, nearbyProse(replay, local) || '眼下没看见别的人。');
      }
    }
    if (creation.loop === 2) replace(replay.entries.length - 1, '眼前的清晨正徐徐展开。');
  }
  // Only legacy reducers own replacement slots. Modern-only histories need no
  // action replay. Mixed pre-causal saves may still return to a legacy action,
  // so replay through the LAST overlay, not merely the first scene/narrative.
  const lastOverlay = state.agentActions.findLastIndex(action => ['look', 'move', 'broadcast'].includes(action.type));
  for (let index = 0; index <= lastOverlay; index++) {
    const action = state.agentActions[index];
    const start = replay.entries.length;
    const wasOpen = replay.agentDoorOpen;
    applyAgentAction(replay, action);
    if (action.type === 'look') replace(start, currentRoomDescription(replay));
    if (action.type === 'move') replace(start, `我来到${agentLocationLabel(replay.location)}。${currentRoomDescription(replay)}`);
    if (action.type === 'broadcast' && !wasOpen) replace(start + 2, '广播结束，门锁响了一声。门外传来沉重的脚步声。');
  }
  for (let index = 0; index < entries.length; index++) {
    const entry = entries[index];
    if (entry.delivery === 'action' && entry.speakerId === createdPlayerId(state)
      && /^你沿通路来到.+。$/u.test(entry.text)) {
      entries[index] = { ...entry, text: `我${entry.text.slice(1)}` };
    }
  }
  return entries;
}
export function agentPlayView(state) {
  if (hasCaseRuntime(state)) return causalPlayView(state);
  if (hasCaseOne(state)) return casePlayView(state, actorsForState(state));
  if (hasPrisonWorld(state)) {
    const current = agentLocationId(state); const nearbyCharacters = agentLocalActors(state).map(actor => ({ id: actor.id, name: agentLabel(state, actor) }));
    const target = nearbyCharacters[0]?.name;
    return { mode: 'daily', nearbyCharacters, clock: prisonClock(state),
      suggestions: ['观察四周', '等待片刻', ...(target ? [`对${target}说：「你知道这里是什么地方吗？」`] : []),
        ...(!['corridor', 'reception'].includes(current) ? ['查看屏幕'] : []),
        ...adjacent(current, state).filter(key => prisonPassage(state, { actorId: createdPlayerId(state),
          from: currentCode(state), to: (state.creation ? ROOM_CODES : LOCATION_CODES)[key], home: actorForState(state, createdPlayerId(state)).locationId }))
          .map(key => `前往${CREATED_ROOMS[key]}`)],
      rules: [...prisonRulebook(state), ...prisonPublicRules(state)], evidence: [],
      records: state.agentWorld.broadcasts.length ? [{ id: 'assembly-notice', name: '集合通知',
        text: `典狱长通知所有人前往接客室集合。\n${state.agentWorld.broadcasts[0].text}` }] : [] };
  }
  const nearbyCharacters = agentLocalActors(state).map(actor => ({ id: actor.id, name: agentLabel(state, actor) }));
  const target = nearbyCharacters[0]?.name;
  const openingClock = state.agentFormatVersion >= 3 ? { clock: prisonClock(state) } : {};
  if (state.creation) {
    const current = agentLocationId(state);
    return { mode: 'daily', ...openingClock, nearbyCharacters,
      suggestions: ['观察四周', ...(target ? [`对${target}说：「你知道这里是什么地方吗？」`] : []),
        ...(!['corridor', 'reception'].includes(current) ? ['查看屏幕'] : []),
        ...(state.agentDoorOpen ? adjacent(current, state).map(key => `前往${CREATED_ROOMS[key]}`) : [])],
      rules: prisonRulebook(state), evidence: [] };
  }
  return { mode: 'daily', ...openingClock, nearbyCharacters,
    suggestions: ['观察四周', ...(target ? [`对${target}说：「你知道这里是什么地方吗？」`] : []),
      ...(agentLocationId(state) === 'cell' ? ['查看屏幕', ...(state.agentDoorOpen ? ['前往走廊'] : [])]
        : agentLocationId(state) === 'corridor' ? ['返回牢房', '前往四号牢房', '前往一号牢房', '前往二号牢房', '前往五号牢房', '前往六号牢房', '前往七号牢房', '前往会客厅'] : ['前往走廊'])],
    rules: prisonRulebook(state),
    evidence: [] };
}

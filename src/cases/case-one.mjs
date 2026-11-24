import { createHash } from 'node:crypto';
import { isProxy } from 'node:util/types';
import { runtimeCapabilityId } from '../content/runtime-capabilities.mjs';
import { runtimeRevisionForState } from '../content/content-revisions.mjs';
import { guardRuleReference, isGuardRuleReference } from '../world/guard-rules.mjs';
import { CASE_ONE_V2_HASH, CASE_ONE_KNOWLEDGE_VERSION, CASE_ONE_KNOWLEDGE_POLICY,
  CASE_ONE_FIXED_SOURCE_SNAPSHOTS, caseOneV2EvidenceForState } from './case-knowledge-policy.mjs';
import { prisonRulebook } from '../content/card-world.mjs';
import { bunkSceneDescription } from '../world/prison-bunks.mjs';
import { acquireOfficialNotice, recognizesPerson } from '../characters/actor-knowledge.mjs';
import { usesCurfewPolicy, grantPaintMedicalStay, curfewClockLimit, confinementApplies,
  lawfulConfinementPlace, confinementRoom, confinementCode } from '../world/curfew-policy.mjs';
import { projectTrialTestimony, parseTestimonyCommand, resolveTrialTestimonySelection,
  recordTrialTestimonyAttempt, testimonyFeedback } from './trial-testimony.mjs';
import { bindStatementEntries, statementReactionPerformance } from './statement-reactions.mjs';
import { assertObservablePlayerAction } from '../agents/narrative-guards.mjs';
import { caseTimingVersion, caseActionSeconds } from './case-action-timing.mjs';
import { confirmedExecutionEvents, deferCasePlayerOutcome } from './case-execution-events.mjs';

// Same deterministic owner-local handle as the perception facade, kept pure
// here to avoid importing the physical runtime back through player setup.
const anonymousSpeakerHandle = (ownerId, targetId) => `person-${createHash('sha256').update(JSON.stringify(['actor-view@1', ownerId, targetId])).digest('hex').slice(0, 16)}`;

// Canonical past, not a plan that forces a future murder. This checkpoint is
// after the first night's crime and before its discovery. No dialogue is stored.
export const CASE_ONE_REF = 'loop-one-case-one@1';
export const CASE_ONE_NOTICE = '清晨的监牢一如往常。少女们在各处开始了新一天的生活。';
export const CASE_ONE_SOURCE = Object.freeze({
  file: 'docs/魔审（游戏文本+全CG）/全剧情/Act01_Chapter01_全剧情.txt',
  sections: ['Adv22–Adv34', 'Trial01–Trial15'],
  adaptations: ['起点为案发后、发现前的清晨。', '为遵守庭中禁止补查，苹果与直播留存可在庭前检查。',
    '搜查窗口为45个故事分钟，地图通路和回合耗时为本测试布置，不冒充原作精确时间与地图。',
    '弩箭失踪时间的目击记录以测试用登记条目保存；不预写雪莉或奈叶香的庭上证词。',
    '沿用本作已公开的角色图鉴与魔法说明，而非复刻原作审判前的资料解锁顺序。',
    '处刑采用抽象系统结算，不模拟魔女化、战斗、反制或死亡回溯。'],
});
const rooms = {
  reception: { name: '会客厅', description: '石砌壁炉旁摆着桌椅，通往地下过道、餐厅和屋外的门已经打开。', exits: ['corridor', 'cafeteria', 'hall', 'courtyard', 'infirmary'] },
  corridor: { name: '走廊', description: '七间牢房沿地下过道排列，墙上嵌着显示屏。', exits: ['reception', 'cell', 'cell01', 'cell02', 'cell04', 'cell05', 'cell06', 'cell07', 'playercell'] },
  cell: { name: '牢房', description: '三号牢房内有双层床与墙面屏幕。', exits: ['corridor'] },
  cell01: { name: '一号牢房', description: '栅栏门后的石砌双人牢房。', exits: ['corridor'] },
  cell02: { name: '二号牢房', description: '栅栏门后的石砌双人牢房。', exits: ['corridor'] },
  cell04: { name: '四号牢房', description: '牢房里残留浓烈的颜料气味，涂绘覆盖了墙壁与地面。', exits: ['corridor'] },
  cell05: { name: '五号牢房', description: '双层床旁留有收纳随身用品的地方。', exits: ['corridor'] },
  cell06: { name: '六号牢房', description: '床铺附近摆着日用品，房内可见手机用过的支架。', exits: ['corridor'] },
  cell07: { name: '七号牢房', description: '过道尽头的一间安静牢房。', exits: ['corridor'] },
  playercell: { name: '八号牢房', description: '为新增囚犯登记的独立牢房。', exits: ['corridor'] },
  hall: { name: '玄关大厅', description: '通往屋内的大厅，清扫工具柜与物品登记架放在墙边。', exits: ['reception'] },
  cafeteria: { name: '食堂', description: '长桌与取餐台之间留着通道，后方通往厨房。', exits: ['reception', 'kitchen'] },
  kitchen: { name: '厨房', description: '整理过的操作台旁有存放水果与剩余食物的篮子。', exits: ['cafeteria'] },
  courtyard: { name: '庭院', description: '洋馆外的石径延伸至树林与湖边。', exits: ['reception', 'lake'] },
  lake: { name: '湖边', description: '湖水贴着岸边的草叶，近岸可见湿润的泥地。', exits: ['courtyard'] },
  infirmary: { name: '医务室', description: '有病床和笔记用品的房间，安安已因喷漆搬离原来的牢房。', exits: ['reception'] },
  court: { name: '审判庭', description: '证人席围成一圈，中央留有出示材料的位置。', exits: [] },
};
export const CASE_ONE_EVIDENCE = Object.freeze([
  { id: 'body', name: '诺亚的遗体记录', room: 'cell04', description: '诺亚倒在四号牢房的涂绘中央，胸前有深而直接的刺入伤，身旁留着带血的箭。遗体周围没有明显挣扎痕迹。' },
  { id: 'paint', name: '无足迹的颜料地面', room: 'cell04', description: '诺亚与门口之间隔着约四米涂有颜料的地面。地面未见进出者的鞋印，颜料边缘与划痕可供比较。' },
  { id: 'arrow', name: '带血的弩箭', room: 'cell04', description: '遗体近旁的箭来自弩枪，而不是可直接手持使用的长枪。箭杆留有绑缚痕迹；现场没有弩枪。' },
  { id: 'scrape', name: '地板上的刮痕', room: 'cell04', description: '颜料表层有细而连续的刮痕，局部白色颜料被硬物刮去。它与普通行走留下的鞋印形状不同。' },
  { id: 'broom', name: '拆卸过的扫帚', room: 'hall', description: '清扫工具柜中的长柄扫帚被拆掉扫头，接头可重新组合；柄上没有足以单独指认使用者的痕迹。' },
  { id: 'inventory', name: '弩箭失窃登记', room: 'hall', description: '物品登记记载，现场同型的弩箭在命案发生前两天已失踪，不能将箭的准备时间限定为案发当晚。' },
  { id: 'ribbon', name: '湖边的发带', room: 'lake', description: '近岸草叶间的发带附着血迹和与现场相似的白色颜料，带有被拉紧的褶痕。奈叶香此前一直在寻找这条发带；所有者不等于使用者。' },
  { id: 'apple', name: '沾有白色颜料的苹果', room: 'kitchen', description: '收起的苹果留有刺剑穿刺的小孔，孔边沾着白色颜料。它与昨夜直播中的表演用苹果形状相符；颜料不是普通的腐坏斑。' },
  { id: 'stream', name: '昨夜的直播留存', room: 'reception', description: '监牢内网留存中，可可直播时蕾雅表演以刺剑接苹果，剑尖可见浅色附着物；米莉亚在场，表演后收起苹果。记录仅证明直播期间的在场，不能覆盖开播前。' },
  { id: 'magic-profile', name: '视线诱导的公开资料', room: 'reception', description: '已配发的图鉴介绍蕾雅的视线诱导：可以把对象的视线固定在指定位置。固定视线不等于支配思想，也不自动证明她在案发时使用过魔法。' },
]);
const evidence = new Map(CASE_ONE_EVIDENCE.map(item => [item.id, item]));
// Truth is never spread into a scene, a ballot, or a shared actor context.
const past = { victim: 'noah', culprit: 'leia', method: '视线固定、扫帚柄与刺剑及弩箭组成长枪、发带绑缚、收回时刮落颜料，剑尖颜料在直播时转移到苹果。' };
export const CASE_ONE_HASH = createHash('sha256').update(JSON.stringify({ ref: CASE_ONE_REF, rooms, evidence: CASE_ONE_EVIDENCE, past, source: CASE_ONE_SOURCE })).digest('hex');
const sourceGated = state => runtimeRevisionForState(state).policy.knowledgeVersion === CASE_ONE_KNOWLEDGE_VERSION;
/** Resolve the execution pin first. An incompatible source never falls back to
 * the legacy catalogue, including during clock/scene/action preflight. */
export function caseCatalogueForState(state) {
  const revision = runtimeRevisionForState(state); const current = revision.policy.knowledgeVersion === CASE_ONE_KNOWLEDGE_VERSION;
  const sourceHash = current ? CASE_ONE_V2_HASH : CASE_ONE_HASH;
  if (revision.caseOneHash !== sourceHash || (state.caseOne && (state.caseOne.sourceHash !== sourceHash
    || (current && (state.caseOne.version !== 2 || state.caseOne.knowledgeVersion !== CASE_ONE_KNOWLEDGE_VERSION))))) fail();
  return { version: current ? 2 : 1, sourceHash,
    evidence: current ? caseOneV2EvidenceForState(state) : CASE_ONE_EVIDENCE };
}
const caseEvidence = state => {
  const catalogue = caseCatalogueForState(state);
  return catalogue.version === 2 ? new Map(catalogue.evidence.map(item => [item.id, item])) : evidence;
};
const acquiredEvidence = (state, actorId) => {
  const evidence = caseEvidence(state);
  return (state.caseOne.evidenceByActor[actorId] || []).filter(id => evidence.has(id));
};
const roomDescription = (state, id) => sourceGated(state)
  ? CASE_ONE_KNOWLEDGE_POLICY.roomDescriptions[id] || rooms[id].description : rooms[id].description;
export const hasScheduledCaseOne = state => state?.creation?.storyArcId === 'case-one-day3@1';
export const hasCaseOne = state => ['case-1', 'case-1-execution-test'].includes(state.creation?.scenarioId)
  || (hasScheduledCaseOne(state) && ['case', 'ending'].includes(state.storyArc?.status) && Boolean(state.caseOne));
const playerId = state => state.creation?.actorId || 'emma';
const actor = (state, id) => id === 'player' ? { id, name: state.creation.character.name, communication: 'speech' } : runtimeRevisionForState(state).actors.find(item => item.id === id);
const roster = state => [...runtimeRevisionForState(state).actors.map(item => item.id), ...(state.creation?.playerMode === 'custom' ? ['player'] : [])];
const living = state => roster(state).filter(id => !['warden', 'hiro', 'noah', ...state.caseOne.executedIds].includes(id));
const plain = value => value && Object.getPrototypeOf(value) === Object.prototype;
const fail = () => { throw Object.assign(new Error('第一案的阶段、来源或行动权限不一致，未修改进度。'), { code: 'INVALID_AGENT_STATE' }); };
const safe = (value, maximum) => typeof value === 'string' && Boolean(value.trim()) && value.length <= maximum && !/[<>\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value);
const exact = (value, allowed, required = []) => plain(value) && Object.keys(value).every(key => allowed.includes(key)) && required.every(key => Object.hasOwn(value, key));
export const caseRoomId = state => Object.keys(rooms).find(id => rooms[id].name === state.location);
export function caseLocalActors(state, actors = runtimeRevisionForState(state).actors) {
  const here = caseRoomId(state);
  return actors.filter(item => item.id !== playerId(state) && !['hiro', 'noah', ...state.caseOne.executedIds].includes(item.id)
    && state.agentPositions[item.id] === here);
}
const audience = state => [playerId(state), ...caseLocalActors(state, [...runtimeRevisionForState(state).actors, ...(playerId(state) === 'player' ? [actor(state, 'player')] : [])]).map(item => item.id)];
function emit(state, text, { speakerId = null, delivery = 'action', audienceIds = audience(state), observationKey } = {}) {
  state.entries.push({ id: `entry-${state.entries.length + 1}`, speaker: speakerId ? `${actor(state, speakerId).name}${delivery === 'writing' ? '（书写）' : ''}` : '旁白',
    text, speakerId, delivery, audienceIds: [...new Set(audienceIds)], occurredAt: state.worldTime, ...(observationKey ? { observationKey } : {}) });
}
function stage(state, value) { state.caseOne.stage = value; state.phase = `agent_case_${value}`; }
function emptyCaseOne(state) {
  const catalogue = caseCatalogueForState(state);
  return { version: catalogue.version, sourceHash: catalogue.sourceHash, stage: 'daily', discovered: false, reportedAt: null, investigationDeadline: null,
    trialStartedAt: null, trialDeadline: null, sealedEvidence: null, evidenceByActor: Object.fromEntries(roster(state).map(id => [id, []])),
    disclosedEvidence: [], statements: [], arguments: [], voterIds: [], candidateIds: [], ballots: null, verdict: null, executedIds: [],
    ...(catalogue.version === 2 ? { knowledgeVersion: CASE_ONE_KNOWLEDGE_VERSION,
      observedConditionsByActor: structuredClone(hasScheduledCaseOne(state) ? state.caseRuntime?.observedConditionsByActor || {} : {}),
      sourceSnapshots: structuredClone(hasScheduledCaseOne(state) ? state.storyArc.sourceSnapshots || [] : CASE_ONE_FIXED_SOURCE_SNAPSHOTS) } : {}) };
}
function observeCondition(state, subjectId, audienceIds, { sourceKey, kind = 'sight', status = 'dead' }) {
  if (!sourceGated(state)) return;
  const ledger = state.caseOne ? state.caseOne.observedConditionsByActor : state.caseRuntime?.observedConditionsByActor;
  if (!ledger) return;
  for (const id of audienceIds) {
    ledger[id] ||= {};
    ledger[id][subjectId] = { status, kind, sourceKey, at: state.worldTime };
  }
}
// An authored, opt-in arc, never an inference from model prose or a migration
// of the historical checkpoint. All instants use the original prison epoch.
const SCHEDULED_BEATS = Object.freeze([
  { id: 'assembly', day: 1, hour: 8 }, { id: 'arrow', day: 1, hour: 23 },
  { id: 'ribbon', day: 2, hour: 17 }, { id: 'paint', day: 3, hour: 21, minute: 45 },
  { id: 'crime', day: 3, hour: 23 }, { id: 'stream', day: 3, hour: 23, minute: 15 },
  { id: 'morning', day: 4, hour: 6 },
]);
const scheduledAt = (state, beat) => (beat.day - 1) * 86400 + beat.hour * 3600 + (beat.minute || 0) * 60 - state.agentWorld.startSecond;
export function scheduledCaseOneBoundary(state, toTime, version) {
  if (version !== 1 || !hasScheduledCaseOne(state) || state.storyArc?.status !== 'scheduled') return null;
  caseCatalogueForState(state);
  const next = SCHEDULED_BEATS.find(beat => !state.storyArc.completedBeats.includes(beat.id));
  return next && scheduledAt(state, next) <= toTime ? scheduledAt(state, next) : null;
}
export function advanceScheduledCaseOne(state, version) {
  const events = []; let interrupted = false;
  if (version !== 1 || !hasScheduledCaseOne(state) || state.storyArc?.status !== 'scheduled') return { events, interrupted };
  const arc = state.storyArc; const current = caseCatalogueForState(state).version === 2;
  const put = (id, text, audienceIds, delivery = 'reading') => events.push({ text, speakerId: null, delivery,
    audienceIds: [...new Set(audienceIds)], occurredAt: state.worldTime, observationKey: `story-arc:${arc.id}:${id}` });
  const snapshot = (event, details = {}) => {
    if (!current) return;
    arc.sourceSnapshots ||= [];
    arc.sourceSnapshots.push({ producer: CASE_ONE_KNOWLEDGE_POLICY.scheduledProducer, kind: 'authorized-scheduled-event',
      event, sourceKey: `story-arc:${arc.id}:${event}`, at: state.worldTime, ...details });
  };
  const local = room => roster(state).filter(id => state.agentPositions?.[id] === room
    || (id === playerId(state) && state.location === ({ CELL_04: '四号牢房', RECEPTION: '会客厅' })[room]));
  for (const beat of SCHEDULED_BEATS) {
    if (arc.completedBeats.includes(beat.id) || scheduledAt(state, beat) > state.worldTime) continue;
    arc.completedBeats.push(beat.id);
    if (beat.id === 'assembly') {
      state.hiroStatus = 'observed_fatal_injury'; state.agentPositions ||= {}; state.agentPositions.hiro = 'unavailable';
      if (state.caseRuntime) state.caseRuntime.conditionsByActor.hiro = { status: 'dead', source: arc.id, occurredAt: state.worldTime };
      const witnesses = local('RECEPTION');
      put('assembly-witness', '集合中的冲突已经发生：希罗反抗看守，遭到致命攻击，倒下后没有再起身。', witnesses, 'action');
      observeCondition(state, 'hiro', witnesses, { sourceKey: `story-arc:${arc.id}:assembly-witness`, status: 'fatal_injury' });
      put('assembly-notice', current
        ? '典狱长的配发手机正式通知：二阶堂希罗在与看守的冲突中遭致命攻击而死亡，不再参加活动。'
        : '典狱长的配发手机通知：希罗已在与看守的冲突中死亡，不再参加活动。', roster(state).filter(id => id !== 'hiro'));
      if (current) acquireOfficialNotice(state, { subjectId: 'hiro', fullName: '二阶堂希罗', status: 'dead',
        cause: '在与看守的冲突中遭致命攻击而死亡', audienceIds: events.at(-1).audienceIds,
        sourceKey: events.at(-1).observationKey, at: state.worldTime });
    } else if (beat.id === 'arrow') {
      put('arrow-owner', '我拿走了会客厅的弩箭，将它保存在自己手边；这只是我已经做出的准备，其他人没有因此知道取走者。', ['leia']);
      put('arrow-witness', '我检查过会客厅的弩枪，原本配在一起的箭已经不见，没有看到取走者。', ['nanoka']);
    } else if (beat.id === 'ribbon') {
      const ribbon = state.caseRuntime?.objects.ribbon;
      if (ribbon) { ribbon.holderId = 'leia'; ribbon.room = null; ribbon.custodyVersion += 1; }
      put('ribbon-owner', '我发现姐姐的发带丢失了，正在寻找；我没有把它交给别人，也不知道是谁拿走的。', ['nanoka']);
      put('ribbon-taker', '我取到了奈叶香丢失的发带，留在自己手边，没有向别人说明。', ['leia']);
    } else if (beat.id === 'paint') {
      arc.displacedAt = state.worldTime;
      const medical = usesCurfewPolicy(state);
      if (medical) grantPaintMedicalStay(state);
      state.agentPositions ||= {}; state.agentPositions.noah = 'CELL_04'; state.agentPositions.anan = medical ? 'INFIRMARY' : 'RECEPTION';
      if (playerId(state) === 'anan') { state.location = medical ? '医务室' : '会客厅'; interrupted = true; }
      if (state.agentWorld) state.agentWorld.routes = state.agentWorld.routes.filter(row => !['anan', 'noah'].includes(row.actorId));
      put('paint-owner', medical
        ? '诺亚在四号牢房喷涂颜料，气味使我搬离原牢房。典狱长已许可我在医务室暂住休息，拘禁时段也可留在医务室；这不改变所属四号牢房，也不允许在会客厅过夜。'
        : '诺亚在四号牢房喷涂颜料，气味使我搬离了原牢房；临时在会客厅休息，待房间清理后再返回。', ['anan']);
      put('paint-noah', '我在四号牢房里喷涂了颜料，地面仍未干透；安安因气味暂时搬走。', ['noah']);
    } else if (beat.id === 'crime') {
      arc.crimeAt = state.worldTime;
      const ribbon = state.caseRuntime?.objects.ribbon;
      if (ribbon) { ribbon.holderId = null; ribbon.room = 'lake'; ribbon.custodyVersion += 1; }
      state.agentPositions ||= {}; state.agentPositions.noah = 'CELL_04'; state.agentPositions.leia = 'CELL_04';
      if (playerId(state) === 'leia') state.location = '四号牢房';
      const witnesses = local('CELL_04').filter(id => !['leia', 'noah'].includes(id));
      if (witnesses.length) put('crime-witness', '你在四号牢房目击蕾雅以组合的长柄凶器从颜料外刺向诺亚胸前，诺亚倒下后没有再起身。你看到了这次袭击，并未因此知道此前的准备过程。', witnesses, 'action');
      observeCondition(state, 'noah', witnesses, { sourceKey: `story-arc:${arc.id}:crime-witness` });
      observeCondition(state, 'noah', ['leia'], { sourceKey: `story-arc:${arc.id}:crime-owner` });
      if (witnesses.includes(playerId(state))) interrupted = true;
      if (state.caseRuntime) state.caseRuntime.conditionsByActor.noah = { status: 'dead', source: arc.id, occurredAt: state.worldTime };
      // The scripted event is explicitly authorized by setup. Its solution is
      // an owner-only recollection, never a narrator fact or shared scene seed.
      put('crime-owner', '我今晚杀死了诺亚：固定她望向天花板的视线，用扫帚柄、刺剑、弩箭和奈叶香的发带组成长枪，从颜料外刺入胸前。取回时组合散开，剑尖刮到白色颜料；我收回发带后把它丢在湖边。隐瞒、辩解或坦白仍由我自己决定。', ['leia']);
      put('crossbow-owner', '我为了解弩枪构造拿走并拆解了弩枪，没能装回；取走时箭已不见，我不知道是谁拿走了箭。', ['sherry']);
    } else if (beat.id === 'stream') {
      arc.streamAt = state.worldTime;
      for (const id of ['leia', 'milia', 'coco']) state.agentPositions[id] = 'CELL_06';
      if (['leia', 'milia', 'coco'].includes(playerId(state))) state.location = '六号牢房';
      put('stream-leia', '我参加可可的内网直播，用刺剑接苹果；米莉亚收起苹果。我擦过剑尖，但不知道苹果上是否留下颜料。', ['leia']);
      put('stream-milia', '我与蕾雅参加可可的内网直播，看她用刺剑接苹果，之后把苹果收在厨房。经过四号牢房时没有看清房内；我没有确认诺亚的状况。', ['milia']);
      put('stream-coco', '我的内网直播中蕾雅表演以刺剑接苹果，米莉亚在场。先前经过四号牢房时没有看清房内，不知道开播前发生了什么。', ['coco']);
      if (current) {
        snapshot('stream');
        put('apple-stored', '我把直播表演后的苹果收在厨房。', ['milia'], 'action');
        snapshot('apple-stored', { objectId: 'apple', room: 'kitchen' });
      }
    } else if (beat.id === 'morning') {
      arc.status = 'case'; arc.deliveredAt = state.worldTime;
      state.caseOne = { ...emptyCaseOne(state), scheduledArcVersion: 1 };
      const codes = { CELL: 'cell', CELL_01: 'cell01', CELL_02: 'cell02', CELL_04: 'cell04', CELL_05: 'cell05',
        CELL_06: 'cell06', CELL_07: 'cell07', PLAYER_CELL: 'playercell', CORRIDOR: 'corridor', RECEPTION: 'reception',
        ...(usesCurfewPolicy(state) ? { INFIRMARY: 'infirmary' } : {}) };
      for (const source of runtimeRevisionForState(state).actors) state.agentPositions[source.id] = codes[state.agentPositions[source.id] || source.locationId]
        || state.agentPositions[source.id] || (source.id === 'warden' ? 'courtyard' : 'unavailable');
      state.agentPositions[playerId(state)] = Object.keys(rooms).find(id => rooms[id].name === state.location);
      state.agentDoorOpen = true; stage(state, 'daily');
      put('morning', '清晨的门锁已经打开。新一天开始了；你可以沿眼前通路行动。', [playerId(state)], 'action');
      interrupted = true;
    }
  }
  return { events: events.filter(row => row.audienceIds.length), interrupted };
}
export function initializeCaseOne(state) {
  if (!hasCaseOne(state) || state.creation.loop !== 1 || ['hiro', 'noah'].includes(playerId(state))) fail();
  state.location = rooms.reception.name; state.agentDoorOpen = true; state.hiroStatus = 'observed_fatal_injury';
  state.known = roster(state); state.entries = [];
  state.agentPositions = { emma: 'reception', hiro: 'unavailable', noah: 'cell04', anan: 'infirmary', leia: 'cell05', milia: 'cafeteria',
    margo: 'reception', nanoka: 'hall', alisa: 'lake', sherry: 'reception', hanna: 'reception', coco: 'cell06', meruru: 'infirmary', warden: 'courtyard' };
  state.agentPositions[playerId(state)] = 'reception';
  state.caseOne = emptyCaseOne(state);
  if (usesCurfewPolicy(state)) grantPaintMedicalStay(state);
  if (sourceGated(state)) acquireOfficialNotice(state, { subjectId: 'hiro', fullName: '二阶堂希罗', status: 'dead',
    cause: '在与看守的冲突中遭致命攻击而死亡', audienceIds: roster(state).filter(id => id !== 'hiro'),
    sourceKey: 'case-one:checkpoint@2:assembly-notice', at: state.worldTime });
  stage(state, 'daily');
  if (state.creation.scenarioId === 'case-1-execution-test') {
    // Isolated fixture: use the real tally and execution paths, never live NPC votes.
    const c = state.caseOne;
    c.discovered = true; c.reportedAt = 0; c.investigationDeadline = 45 * 60;
    state.worldTime = c.investigationDeadline;
    startTrial(state, []);
    state.worldTime = c.trialDeadline;
    stage(state, 'ballot'); c.voterIds = living(state); c.candidateIds = [...c.voterIds];
    const ballots = Object.fromEntries(c.voterIds.filter(id => id !== playerId(state)).map(id => [id, 'leia']));
    const { facts } = settle(state, { type: 'case', operation: 'vote', subjectId: 'leia', summary: '处刑按钮测试固定选票' }, null, ballots);
    emit(state, '【第一案·处刑按钮测试】已跳过发现、搜查、讨论与投票操作。本场景使用固定测试选票，全员投给蕾雅；这不是角色自主判断，也不代表案情推理结果。请打开手机测试处刑按钮：取消应保持暂停，确认才执行判决。选择蕾雅视角可测试自身被执行后的结束状态。', { delivery: 'narration', audienceIds: [playerId(state)] });
    for (const text of facts) emit(state, text, { audienceIds: [...c.voterIds, 'warden'] });
    return;
  }
  emit(state, '第一周目的清晨，你在会客厅。此前的集合与相互介绍已经结束，希罗已在与看守的冲突中受到致命伤，不再参加日常活动。放风已经开始，餐厅与地下过道可以通行。', { delivery: 'narration', audienceIds: [playerId(state)] });
}
export function caseStartingKnowledge(state, source) {
  // Drop only obsolete opening perceptions, not the owner's private biography.
  const last = source.id === 'emma' ? 2 : 1;
  const rows = (source.id === 'player' ? source.initialKnowledge : source.initialKnowledge.slice(0, -last))
    .filter(text => !text.includes('眼下没有发生或启动任何案件') && !text.includes('当前尚未进行本次公开说明'))
    .map(text => source.id === 'nanoka' ? text.replace('我保存着姐姐的头绳', '我珍惜姐姐的头绳，目前已丢失')
      : source.id === 'emma' ? text.replace('我记得昨夜是春假的最后一天', '我记得入监前一夜是春假的最后一天').replace('现在醒来的地方不是家', '入监那天醒来的地方不是家') : text);
  rows.push(sourceGated(state)
    ? '这是第一周目中入监数日后的清晨，已和其他少女互通姓名，听过典狱长的规定。典狱长此前正式通知：二阶堂希罗在与看守的冲突中遭致命攻击而死亡，不再参加活动。知道这份通知不等于亲眼目击；互通姓名不等于知道他人的魔法、秘密或经历。不要把刚入监时的牢门和初识状态当成现在。'
    : '这是第一周目中入监数日后的清晨，已和其他少女互通姓名，听过典狱长的规定。希罗此前在集合时受到看守的致命攻击，现已不参加活动。不要把刚入监时的牢门和初识状态当成现在。');
  const own = {
    leia: ['我昨夜杀死了诺亚：先把她望向天花板的视线固定，再把扫帚柄、刺剑、弩箭以奈叶香丢失的发带绑成长枪，从颜料外刺入她的胸前。取回时组合散开，我用剑尖刮到地面和白色颜料，回收发带后把它丢在湖边。',
      '我随后参加可可的直播，表演用刺剑接苹果，米莉亚收起了苹果。我擦过剑尖，却不知道苹果上是否留下了颜料。此前经过诺亚房前时，我固定过可可与米莉亚的视线，使她们未看向房内。我的隐瞒、辩解或坦白由我此刻自己决定。'],
    milia: ['昨夜我与蕾雅一起参加了可可的直播，蕾雅用刺剑接过苹果，之后我把苹果收在厨房。经过四号牢房时没有向里面看；我没有亲眼确认当时诺亚的状况。'],
    coco: ['我昨夜在监牢内网直播，蕾雅和米莉亚来过，蕾雅表演以刺剑接苹果。经过四号牢房时没有看清房内，不知道开播前那里发生了什么。'],
    nanoka: ['我从昨天起就在寻找自己丢失的发带，没有把它交给别人使用；不知道它现在在哪里。',
      '我留意过会客厅的弩枪，两天前箭已不见，此前确认过箭和弩枪放在一起。昨夜又发现弩枪本体不见；我不知道是谁拿走了它们。'],
    alisa: ['我在湖边看到草叶间有条发带，还没有拿走；不知道它为什么在那里。'],
    anan: ['诺亚在原来的四号牢房喷漆，我因气味搬到了医务室。我没有在昨夜亲眼目击她的死。'],
    sherry: ['我为了解弩枪构造而拿走并拆解了会客厅的弩枪，没能重新装好。我拿走时箭已不见，不能发射；我没有因此知道箭被谁拿走或发生了什么。'],
    emma: ['昨夜我看过可可的直播，看到蕾雅表演用刺剑接苹果，米莉亚与她同场。记得表演不代表已知道诺亚遭遇了什么。'],
    warden: ['收到正式通报后才启动搜查；搜查限45分钟，随后集合开庭，讨论限一小时。所有合资格少女各投一张有效票，允许自投；票齐才计票，唯一最高票者被认定，最高并列则全部参与者成为执行对象。判决不等于案件真相。'],
  };
  return [...rows, ...(own[source.id] || [])];
}
export function caseClock(state) {
  caseCatalogueForState(state);
  const total = (hasScheduledCaseOne(state) ? state.agentWorld.startSecond : 8 * 3600) + state.worldTime;
  const day = Math.floor(total / 86400) + (hasScheduledCaseOne(state) ? 1 : 4); const second = total % 86400;
  return { day, hour: Math.floor(second / 3600), minute: Math.floor(second / 60) % 60, second: second % 60,
    label: `${String(Math.floor(second / 3600)).padStart(2, '0')}:${String(Math.floor(second / 60) % 60).padStart(2, '0')}`,
    period: ['discussion', 'ballot', 'execution_ready'].includes(state.caseOne.stage) ? '魔女审判' : state.caseOne.stage === 'investigation' ? '特别搜查' : '放风' };
}
const phaseLabels = { daily: '日常', discovery: '发现现场', investigation: '搜查', assembly: '开庭集合', discussion: '审判讨论', ballot: '投票', execution_ready: '等待处刑确认', aftermath: '回归日常', ending: '本视角结束', outcome_pending: '等待身体与能力结算' };
const investigationClosedNotice = '搜查时限已到，新的现场检查停止。集合通知已送达，现在可以沿看守指定的通路前往审判庭。';
const knownEvidence = state => acquiredEvidence(state, playerId(state));
function inspectables(state) {
  if (!['investigation', 'discovery'].includes(state.caseOne.stage)) return [];
  return caseCatalogueForState(state).evidence.filter(item => item.room === caseRoomId(state) && (state.caseOne.stage === 'investigation' || item.id === 'body'));
}
const caseRules = '发现与通报分开；开庭后不得外出或新增现场搜查。出示材料只限本人已取得的资料，发言不是事实认证。讨论一小时故事时间，全员必投、允许自投。';
const caseMovingStages = ['daily', 'discovery', 'investigation', 'aftermath'];
const activeCaseActor = (state, actorId) => typeof actorId === 'string' && Boolean(state && hasCaseOne(state))
  && state.caseOne?.sourceHash === caseCatalogueForState(state).sourceHash && Array.isArray(state.caseOne.executedIds)
  && living(state).includes(actorId) && Boolean(rooms[state.agentPositions?.[actorId]]);
function actorExits(state, actorId) {
  const here = state.agentPositions[actorId];
  if (!state.agentDoorOpen || !activeCaseActor(state, actorId)) return [];
  if (state.caseOne.stage === 'assembly') return actorId === playerId(state) ? ['court'] : [];
  if (!caseMovingStages.includes(state.caseOne.stage)) return [];
  return caseExits(state, actorId, rooms[here].exits.filter(id => id !== 'playercell' || playerId(state) === 'player'));
}
function caseExits(state, actorId, exits) {
  if (!confinementApplies(state)) return exits;
  const here = state.agentPositions[actorId]; const home = confinementRoom(state, actorId);
  const returnTo = home === 'INFIRMARY' ? here === 'corridor' ? 'reception' : here === 'reception' ? 'infirmary' : undefined
    : here === 'corridor' ? Object.keys(rooms).find(id => confinementCode(id) === home)
      : here === 'infirmary' ? 'reception' : here === 'reception' ? 'corridor'
        : ['hall', 'cafeteria', 'courtyard'].includes(here) ? 'reception' : undefined;
  return exits.filter(id => id === returnTo);
}
function writingReaders(state, speakerId, targetId) {
  return [...new Set([speakerId, ...(targetId && state.agentPositions[speakerId] === state.agentPositions[targetId]
    && (targetId === 'warden' || activeCaseActor(state, targetId)) ? [targetId] : [])])];
}
function testimonyInput(state, actorId) {
  const c = state.caseOne; const evidence = caseEvidence(state); const sealed = new Set(c.sealedEvidence?.[actorId] || []);
  return { caseId: 'case-1', actorId, progress: c.testimonyProgress,
    statementReactionVersion: actorId === playerId(state) ? (runtimeCapabilityId(state.agentRuntimeRevision) === 'agent-prison-runtime@8' ? 3 : 2) : undefined,
    allowPerjury: actorId === playerId(state) && (state.creation?.playerMode === 'custom' || actorId === 'hiro'),
    sources: (c.evidenceByActor[actorId] || []).filter(id => evidence.has(id) && (sealed.has(id) || c.disclosedEvidence.includes(id)))
      .map(id => ({ id, name: evidence.get(id).name, text: evidence.get(id).description,
        kind: 'material', status: c.disclosedEvidence.includes(id) ? 'public' : 'sealed' })),
    statements: bindStatementEntries(c.statements.filter(row => !row.audienceIds || row.audienceIds.includes(actorId)).slice(-12),
      state.entries || [], actorId).map(row => {
        const unidentified = sourceGated(state) && !recognizesPerson(state, actorId, row.speakerId);
        return { id: row.id, speakerId: unidentified ? anonymousSpeakerHandle(actorId, row.speakerId) : row.speakerId,
          speakerName: unidentified ? '？？？' : actor(state, row.speakerId)?.name, text: row.text,
          ...(row.entryId ? { entryId: row.entryId } : {}) };
      }),
    fallback: { id: 'public-case-one-rules', name: '开庭时公布的制度记录', text: caseRules, kind: 'institutional', status: 'public' } };
}

export function caseStatementReaction(state, token, ownerId = playerId(state)) {
  const c = state.caseOne;
  if (!hasCaseOne(state) || c?.stage !== 'discussion' || !(c.trialDeadline > state.worldTime) || state.completed || !activeCaseActor(state, ownerId)) return null;
  const selection = resolveTrialTestimonySelection(testimonyInput(state, ownerId), token);
  if (selection?.kind !== 'statement_reaction') return null;
  const original = c.statements.find(row => row.id === selection.statementId
    && (!row.audienceIds || row.audienceIds.includes(ownerId)));
  const targetId = original?.speakerId;
  if (!targetId || targetId === ownerId || !activeCaseActor(state, targetId)
    || state.agentPositions[targetId] !== state.agentPositions[ownerId]) return null;
  return { ...selection, targetId };
}

/** Additive pure projection for old saves; material scope is the owner's
 * sealed inventory plus subsequent legitimate public disclosures. */
export function caseTestimony(state, actorId = playerId(state)) {
  const c = state.caseOne;
  if (!hasCaseOne(state) || !c || c.stage !== 'discussion' || !(c.trialDeadline > state.worldTime)
    || state.completed || !activeCaseActor(state, actorId)) return null;
  return projectTrialTestimony(testimonyInput(state, actorId));
}
function testimonyRespondent(state, ownerId) {
  return living(state).filter(id => id !== ownerId && id !== playerId(state) && activeCaseActor(state, id))
    .sort((a, b) => Number(actor(state, a)?.communication === 'writing') - Number(actor(state, b)?.communication === 'writing'))[0] || 'warden';
}

/** An actor's room and acquired materials, never the player's offscreen view,
 * another owner's sealed records, or the host-only solution. */
export function caseActorScene(state, actorId) {
  const here = state.agentPositions?.[actorId];
  if (!hasCaseOne(state) || state.caseOne?.sourceHash !== caseCatalogueForState(state).sourceHash || !rooms[here] || !roster(state).includes(actorId)) fail();
  const c = state.caseOne; const evidence = caseEvidence(state); const exits = actorExits(state, actorId);
  const visible = ['investigation', 'discovery'].includes(c.stage)
    ? caseCatalogueForState(state).evidence.filter(item => item.room === here && (c.stage === 'investigation' || item.id === 'body')) : [];
  const candidates = ['ballot', 'execution_ready'].includes(c.stage) ? c.candidateIds.filter(id => living(state).includes(id)) : [];
  return { location: rooms[here].name, roomId: here, doorOpen: Boolean(state.agentDoorOpen), description: bunkSceneDescription(state, here, actor(state, actorId), roomDescription(state, here)),
    adjacent: exits.map(id => ({ id, label: rooms[id].name })), permittedDestinations: [...exits], screenAvailable: false, clock: caseClock(state),
    case: { id: 'case-1', stage: c.stage, phaseLabel: phaseLabels[c.stage], inspectables: visible.map(({ id, name }) => ({ id, name })),
      knownEvidence: (c.evidenceByActor[actorId] || []).filter(id => evidence.has(id))
        .map(id => ({ id, name: evidence.get(id).name, description: evidence.get(id).description })),
      disclosedEvidence: c.disclosedEvidence.filter(id => evidence.has(id)), candidateIds: [...candidates],
      remainingSeconds: c.stage === 'investigation' ? Math.max(0, c.investigationDeadline - state.worldTime)
        : c.stage === 'discussion' ? Math.max(0, c.trialDeadline - state.worldTime) : null,
      rules: caseRules, ...(c.stage === 'discussion' ? { testimony: caseTestimony(state, actorId) } : {}) } };
}
function typedCaseOperation(operation) {
  if (!operation || typeof operation !== 'object' || isProxy(operation) || Object.getPrototypeOf(operation) !== Object.prototype
    || Reflect.ownKeys(operation).length !== 2 || Reflect.ownKeys(operation).some(key => !['type', 'subjectId'].includes(key))) return false;
  for (const key of ['type', 'subjectId']) {
    const descriptor = Object.getOwnPropertyDescriptor(operation, key);
    if (!descriptor?.enumerable || !Object.hasOwn(descriptor, 'value')) return false;
  }
  return ['inspect', 'present'].includes(operation.type) && typeof operation.subjectId === 'string';
}
/** Mutate only the caller-owned draft. The shared turn clock and event ledger
 * belong to the parent; a rejected typed operation produces neither effects
 * nor evidence, regardless of any accompanying prose. */
export function caseNpcOperation(state, actorId, operation) {
  const rejected = { accepted: false, events: [] };
  if (!typedCaseOperation(operation) || !state?.caseOne || !activeCaseActor(state, actorId) || state.completed || state.caseOutcome?.status === 'pending') return rejected;
  const c = state.caseOne; const acquired = c.evidenceByActor?.[actorId]; const item = caseEvidence(state).get(operation.subjectId);
  if (!item || !Array.isArray(acquired)) return rejected;
  const sharedTiming = caseTimingVersion(state) === 2;
  if (sharedTiming && operation.type === 'inspect' && c.stage === 'investigation'
    && c.investigationDeadline - state.worldTime < caseActionSeconds('inspect')) return rejected;
  if (operation.type === 'inspect') {
    if (item.room !== state.agentPositions[actorId] || !['investigation', 'discovery'].includes(c.stage)
      || (c.stage === 'discovery' && item.id !== 'body')
      || (c.stage === 'investigation' && !(c.investigationDeadline > state.worldTime))) return rejected;
    if (!acquired.includes(item.id)) acquired.push(item.id);
    if (item.id === 'body') observeCondition(state, 'noah', [actorId], { sourceKey: `case-one:inspect:${actorId}:body:${state.worldTime}` });
    return { accepted: true, ...(sharedTiming ? { elapsed: caseActionSeconds('inspect') } : {}), events: [{ text: `检查记录【${item.name}】：${item.description}`, speakerId: actorId,
      delivery: 'reading', audienceIds: [actorId], occurredAt: state.worldTime }] };
  }
  const recipients = [...living(state), 'warden'];
  if (c.stage !== 'discussion' || !(c.trialDeadline > state.worldTime) || !acquired.includes(item.id)
    || !Array.isArray(c.disclosedEvidence) || recipients.some(id => !Array.isArray(c.evidenceByActor[id]))) return rejected;
  const facts = []; disclose(state, [item.id], facts);
  return { accepted: true, ...(sharedTiming ? { elapsed: caseActionSeconds('present', { remaining: c.trialDeadline - state.worldTime }) } : {}), events: facts.map(text => ({ text, speakerId: actorId, delivery: 'action',
    audienceIds: [...recipients], occurredAt: state.worldTime })) };
}
export function caseNpcMove(state, actorId, destination) {
  if (!activeCaseActor(state, actorId) || state.completed || typeof destination !== 'string'
    || !caseMovingStages.includes(state.caseOne.stage) || !actorExits(state, actorId).includes(destination)) return false;
  state.agentPositions[actorId] = destination;
  return true;
}
export function caseScene(state, actors = runtimeRevisionForState(state).actors) {
  const here = caseRoomId(state); if (!rooms[here] || state.caseOne.sourceHash !== caseCatalogueForState(state).sourceHash) fail();
  const evidence = caseEvidence(state); const current = state.caseOne.stage;
  const exits = ['discussion', 'ballot', 'execution_ready', 'ending'].includes(current) ? []
    : current === 'assembly' ? ['court'] : caseExits(state, playerId(state), rooms[here].exits.filter(id => id !== 'playercell' || playerId(state) === 'player'));
  return { location: state.location, roomId: here, doorOpen: true, description: bunkSceneDescription(state, here, actor(state, playerId(state)), roomDescription(state, here)),
    nearby: caseLocalActors(state, actors).map(item => ({ id: item.id,
      label: hasScheduledCaseOne(state) && !state.known.includes(item.id) ? item.appearance : item.name, appearance: item.appearance || item.name })),
    adjacent: exits.map(id => ({ id, label: rooms[id].name })), permittedDestinations: exits, screenAvailable: false, clock: caseClock(state),
    case: { id: 'case-1', stage: current, phaseLabel: phaseLabels[current],
      inspectables: inspectables(state).map(({ id, name }) => ({ id, name })),
      knownEvidence: knownEvidence(state).map(id => ({ id, name: evidence.get(id).name, description: evidence.get(id).description })),
      disclosedEvidence: state.caseOne.disclosedEvidence.filter(id => evidence.has(id)), statements: state.caseOne.statements
        .filter(row => !row.audienceIds || row.audienceIds.includes(playerId(state))).slice(-12),
      candidateIds: [...state.caseOne.candidateIds], remainingSeconds: current === 'investigation' ? state.caseOne.investigationDeadline - state.worldTime
        : current === 'discussion' ? state.caseOne.trialDeadline - state.worldTime : null,
      rules: '发现与通报分开；开庭后不得外出或新增现场搜查。出示材料只限本人已取得的资料，发言不是事实认证。讨论一小时故事时间，全员必投、允许自投。',
      ...(current === 'discussion' ? { testimony: caseTestimony(state) } : {}) } };
}
const normalize = text => text.replaceAll('諾亞', '诺亚').replaceAll('蕾婭', '蕾雅').replaceAll('蕾娅', '蕾雅')
  .replaceAll('發帶', '发带').replaceAll('蘋果', '苹果').replaceAll('審判庭', '审判庭').replaceAll('會客廳', '会客厅').replaceAll('廚房', '厨房').replaceAll('醫務室', '医务室');
function namedActor(state, name, ids) {
  const normalized = normalize(name.trim());
  const matches = ids.filter(id => normalized === id || normalized === actor(state, id).name || actor(state, id).name.endsWith(normalized));
  return matches.length === 1 ? matches[0] : undefined;
}
export function parseCaseIntent(state, raw) {
  const scene = caseScene(state, [...runtimeRevisionForState(state).actors, ...(playerId(state) === 'player' ? [actor(state, 'player')] : [])]);
  const text = normalize(raw.trim()).replace(/[。！!？?]+$/u, '');
  const no = message => ({ accepted: false, message });
  const yes = intent => { try { validateCaseIntent(scene, intent); return { accepted: true, intent }; } catch { return no('当前阶段不能执行此操作，或对象不在已取得的资料与合法候选之中。'); } };
  if (state.caseOutcome?.status === 'pending') return no('当前身体与能力结果尚待宿主结算，不能继续普通行动。');
  if (state.completed) return no('当前视角已经结束，可以读取执行前自动存档或开始另一段故事。');
  if (state.caseOne.stage === 'execution_ready') return no('判决已成立。请在手机上确认处刑推进，未确认时故事不会继续。');
  const testimony = parseTestimonyCommand(raw);
  if (testimony) {
    const reaction = caseStatementReaction(state, testimony);
    if (reaction) return yes({ type: 'conversation', targetId: reaction.targetId, playerText: reaction.communicationText,
      summary: `对选定陈述${reaction.stance === 'question' ? '质疑并请求解释' : reaction.stance === 'agree' ? '表达暂时赞同' : '表达反驳并请求依据'}` });
    return yes({ type: 'case', operation: 'testimony', subjectId: testimony, summary: '核对本轮标记的记录引用' });
  }
  if (/^(?:核对证词|核對證詞)/u.test(raw.trim())) return no('请使用当前证词轮次中完整的核对指令；引述、附加主张与过期选项不会建立证据连接。');
  if (/^(?:观察四周|觀察四周|观察|環顧四周|环顾四周)$/u.test(text)) return yes({ type: 'look', summary: '观察眼前环境' });
  if (confinementApplies(state) && !lawfulConfinementPlace(state, playerId(state), caseRoomId(state))
    && !/^(?:去|前往|返回|回到)/u.test(text)) return no('当前不是放风时间，请返回所属牢房；只有实际获准者能留医务室。');
  if (/^(?:等待|等待片刻|稍等|继续|繼續)$/u.test(text)) return yes({ type: 'wait', summary: '等待片刻' });
  if (/^(?:通报命案|通報命案|报告尸体|報告屍體|报案|報案)$/u.test(text)) return yes({ type: 'case', operation: 'report', summary: '通过配发手机通报发现的现场' });
  if (/^(?:等待至开庭|等待至開庭|等待至搜查结束|等待至搜查結束|等待至讨论结束|等待至討論結束)$/u.test(text)) return yes({ type: 'case', operation: 'wait_boundary', summary: '等待当前程序的截止时刻' });
  const move = /^(?:前往|去|返回|回到)([^，,、；;：:。！!？?\s]{1,24})$/u.exec(text);
  if (move) {
    const room = scene.adjacent.find(item => item.label === move[1] || item.id === move[1]);
    return room ? yes({ type: 'move', destination: room.id, summary: `前往${room.label}` }) : no('请沿眼前的相邻通路移动；审判开始后不能离庭补查。');
  }
  const inspect = /^(?:检查|檢查|调查|調查|搜查|查看)(.+)$/u.exec(text);
  if (inspect) {
    const item = scene.case.inspectables.find(item => item.name === inspect[1] || item.id === inspect[1]);
    if (item) {
      if (scene.case.stage === 'investigation' && scene.case.remainingSeconds < 120) return no('本次检查需要两个故事分钟，剩余搜查时间不足；可以等待集合通知，但不会提前取得尚未完成的检查结果。');
      return yes({ type: 'case', operation: 'inspect', subjectId: item.id, summary: `检查${item.name}` });
    }
    if (caseCatalogueForState(state).evidence.some(item => item.id === inspect[1] || item.name === inspect[1])
      || CASE_ONE_EVIDENCE.some(item => item.id === inspect[1] || item.name === inspect[1])
      || ['discussion', 'ballot', 'execution_ready'].includes(state.caseOne.stage)) return no('眼前没有可检查的该项材料，或搜查已结束。开庭后不能补查。');
  }
  const present = /^(?:出示|提交证据|提交證據)(.+)$/u.exec(text);
  if (present) {
    const item = scene.case.knownEvidence.find(item => item.name === present[1] || item.id === present[1]);
    return item ? yes({ type: 'case', operation: 'present', subjectId: item.id, summary: `出示${item.name}` }) : no('只能出示本人实际取得的资料；发言不会创造证物。');
  }
  // Formal votes are intentionally narrower than suspicions, quotations and
  // hypotheticals. Natural-language interpretation has the same explicit gate.
  const vote = /^(?:我(?:把票)?投(?:给|給|向)?|投票给|投票給)([^「」“”"？?]+)$/u.exec(normalize(raw.trim()).replace(/[。！!]+$/u, ''));
  if (vote) {
    const candidateId = /^(?:自己|我自己|我)$/u.test(vote[1]) ? playerId(state) : namedActor(state, vote[1], state.caseOne.candidateIds);
    return candidateId ? yes({ type: 'case', operation: 'vote', subjectId: candidateId, summary: '明确提交本人唯一的一票' }) : no('请明确选择一位合法候选者，也可以投给自己；不能弃权。');
  }
  if (state.caseOne.stage === 'ballot') return no('讨论已经结束，请明确输入“我投给某人”或“我投给自己”；怀疑、引用与假设不会成为选票。');
  const publicNote = /^(?:对|向|對)(?:全体|全體|大家)(?:书写|書寫)[：:]([\s\S]+)$/u.exec(raw.trim());
  if (publicNote && hasScheduledCaseOne(state) && state.caseOne.stage === 'discussion' && actor(state, playerId(state))?.communication === 'writing') {
    const playerText = publicNote[1].trim().replace(/^「([\s\S]*)」$/u, '$1');
    return safe(playerText, 1000) ? yes({ type: 'act', summary: '向全体展示庭审笔谈', playerText }) : no('请使用不超过一千字的庭审笔谈。');
  }
  const addressed = /^(?:对|向|對)?(.{1,100}?)(?:说|說|问|問|询问|詢問|书写|書寫)[：:]([\s\S]+)$/u.exec(raw.trim());
  if (addressed) {
    const targetId = namedActor(state, addressed[1], scene.nearby.map(item => item.id));
    if (!targetId) return no('对方不在眼前，无法进行当面交流。');
    const playerText = addressed[2].trim().replace(/^「([\s\S]*)」$/u, '$1');
    return safe(playerText, 1000) ? yes({ type: 'conversation', summary: '向眼前的人交流', targetId, playerText }) : no('请使用不超过一千字的完整发言。');
  }
  return { accepted: true, intent: { type: 'interpret', rawInput: raw } };
}
export function validateCaseIntent(scene, intent) {
  if (isProxy(intent)) fail();
  const operation = intent && typeof intent === 'object' ? Object.getOwnPropertyDescriptor(intent, 'operation') : null;
  if (operation && !Object.hasOwn(operation, 'value')) fail();
  if (operation?.value === 'testimony' && (!plain(intent)
    || Reflect.ownKeys(intent).length !== 4 || ['type', 'operation', 'subjectId', 'summary'].some(key => {
      const descriptor = Object.getOwnPropertyDescriptor(intent, key);
      return !descriptor?.enumerable || !Object.hasOwn(descriptor, 'value');
    }))) fail();
  if (!scene.case || !exact(intent, ['type', 'summary', 'targetId', 'destination', 'playerText', 'operation', 'subjectId', 'evidenceIds', 'statementId', 'claim', 'stance'], ['type', 'summary']) || !safe(intent.summary, 800)) fail();
  if (!['look', 'move', 'conversation', 'wait', 'follow', 'act', 'case'].includes(intent.type)) fail();
  if (intent.targetId !== undefined && !scene.nearby.some(item => item.id === intent.targetId)) fail();
  if (['conversation', 'follow'].includes(intent.type) && !intent.targetId) fail();
  if (intent.destination !== undefined && !scene.adjacent.some(item => item.id === intent.destination)) fail();
  if (intent.type === 'move' && !intent.destination) fail();
  if (intent.type !== 'case') {
    if (['operation', 'subjectId', 'evidenceIds', 'statementId', 'claim', 'stance'].some(key => Object.hasOwn(intent, key)) || ['ballot', 'execution_ready', 'ending'].includes(scene.case.stage)) fail();
    return intent;
  }
  if (['targetId', 'destination', 'playerText'].some(key => Object.hasOwn(intent, key))) fail();
  const phase = scene.case.stage;
  if (intent.operation === 'inspect') {
    if (!scene.case.inspectables.some(item => item.id === intent.subjectId)
      || (phase === 'investigation' && scene.case.remainingSeconds < 120)) fail();
  } else if (intent.operation === 'report') {
    if (phase !== 'discovery') fail();
  } else if (intent.operation === 'wait_boundary') {
    if (!['investigation', 'discussion'].includes(phase)) fail();
  } else if (intent.operation === 'present') {
    if (phase !== 'discussion' || !scene.case.knownEvidence.some(item => item.id === intent.subjectId)) fail();
  } else if (intent.operation === 'testimony') {
    if (phase !== 'discussion' || !(scene.case.remainingSeconds > 0)
      || !scene.case.testimony?.selections.some(row => row.token === intent.subjectId && row.kind !== 'statement_reaction')) fail();
  } else if (intent.operation === 'argue') {
    if (phase !== 'discussion' || !['rebut', 'agree', 'question', 'claim'].includes(intent.stance) || !safe(intent.claim, 1200)
      || !Array.isArray(intent.evidenceIds) || intent.evidenceIds.length > 10 || new Set(intent.evidenceIds).size !== intent.evidenceIds.length
      || intent.evidenceIds.some(id => !scene.case.knownEvidence.some(item => item.id === id))
      || (intent.statementId !== undefined && !scene.case.statements.some(item => item.id === intent.statementId))) fail();
  } else if (intent.operation === 'vote') {
    if (phase !== 'ballot' || !scene.case.candidateIds.includes(intent.subjectId)) fail();
  } else fail();
  const allowed = ['type', 'summary', 'operation', ...(['inspect', 'present', 'vote', 'testimony'].includes(intent.operation) ? ['subjectId'] : []),
    ...(intent.operation === 'argue' ? ['stance', 'claim', 'evidenceIds', 'statementId'] : [])];
  if (!Object.keys(intent).every(key => allowed.includes(key))) fail();
  return intent;
}
function startTrial(state, facts) {
  for (const id of [...living(state), 'warden']) state.agentPositions[id] = 'court';
  state.location = rooms.court.name;
  state.caseOne.sealedEvidence = sourceGated(state)
    ? Object.fromEntries(Object.keys(state.caseOne.evidenceByActor).map(id => [id, acquiredEvidence(state, id)]))
    : structuredClone(state.caseOne.evidenceByActor);
  state.caseOne.trialStartedAt = state.worldTime; state.caseOne.trialDeadline = state.worldTime + 3600;
  stage(state, 'discussion'); facts.push('搜查材料已经封卷，所有有资格的参加者进入审判庭。讨论开始，上限为一小时故事时间；庭中不得返回现场或使用远程能力补查。');
}
function disclose(state, ids, facts) {
  const evidence = caseEvidence(state);
  if (ids.some(id => !evidence.has(id))) fail();
  for (const id of ids) {
    if (!state.caseOne.disclosedEvidence.includes(id)) state.caseOne.disclosedEvidence.push(id);
    for (const owner of [...living(state), 'warden']) if (!state.caseOne.evidenceByActor[owner].includes(id)) state.caseOne.evidenceByActor[owner].push(id);
    facts.push(`公开出示【${evidence.get(id).name}】：${evidence.get(id).description}`);
  }
}
function settle(state, intent, response, ballots) {
  validateCaseIntent(caseScene(state, [...runtimeRevisionForState(state).actors, ...(playerId(state) === 'player' ? [actor(state, 'player')] : [])]), intent);
  if (state.caseOutcome?.status === 'pending') fail();
  const c = state.caseOne; const evidence = caseEvidence(state); const phase = c.stage; const facts = []; const testimonyEvents = [];
  const sharedTiming = caseTimingVersion(state) === 2;
  let elapsed = sharedTiming ? caseActionSeconds(intent.type === 'case' ? intent.operation === 'wait_boundary' ? 'wait' : intent.operation : intent.type)
    : { look: 15, move: 30, conversation: 60, wait: 60, follow: 30, act: 30, case: 30 }[intent.type];
  const curfew = curfewClockLimit(state, playerId(state), caseRoomId(state), state.worldTime + elapsed);
  const returning = intent.type === 'move' && confinementApplies(state)
    && caseScene(state).permittedDestinations.includes(intent.destination);
  if (curfew?.blocked && !returning) throw Object.assign(new Error('当前不是放风时间，请返回所属牢房；医务室仅限实际获准者。'), { code: 'CURFEW_STAY_FORBIDDEN' });
  if (curfew && !returning) {
    elapsed = Math.max(0, curfew.at - state.worldTime);
    facts.push('非放风时段即将开始，须回所属牢房；只有实际获准者能留在医务室，不能在会客厅过夜。违规被看守发现将送惩罚室禁闭两天。');
  }
  if (intent.type === 'move') {
    if (phase === 'assembly') { elapsed = 120; state.worldTime += elapsed; startTrial(state, facts); return { elapsed, facts }; }
    state.location = rooms[intent.destination].name; state.agentPositions[playerId(state)] = intent.destination;
    facts.push(`你沿通路来到${state.location}。`);
  }
  if (response?.movement) {
    if (!['follow', 'act', 'wait'].includes(intent.type) || !intent.targetId || !caseScene(state).permittedDestinations.includes(response.movement.destination)) fail();
    state.agentPositions[intent.targetId] = response.movement.destination;
    facts.push(`${actor(state, intent.targetId).name}自行走向${rooms[response.movement.destination].name}。`);
    if (intent.type === 'follow') { state.location = rooms[response.movement.destination].name; state.agentPositions[playerId(state)] = response.movement.destination; }
  }
  if (intent.type === 'case') {
    if (intent.operation === 'inspect') {
      elapsed = 120;
      const id = intent.subjectId;
      if (!c.evidenceByActor[playerId(state)].includes(id)) c.evidenceByActor[playerId(state)].push(id);
      if (id === 'body') observeCondition(state, 'noah', [playerId(state)], { sourceKey: `case-one:inspect:${playerId(state)}:body:${state.worldTime}` });
      facts.push(`检查记录【${evidence.get(id).name}】：${evidence.get(id).description}`);
    } else if (intent.operation === 'report') {
      c.reportedAt = state.worldTime + elapsed; c.investigationDeadline = c.reportedAt + 45 * 60;
      stage(state, 'investigation');
      facts.push('配发手机已登记诺亚的死亡通报，特别搜查启动。通知送达全体参加者：45个故事分钟后搜查结束，再前往审判庭集合。');
    } else if (intent.operation === 'wait_boundary') elapsed = (phase === 'investigation' ? c.investigationDeadline : c.trialDeadline) - state.worldTime;
    else if (intent.operation === 'present') { elapsed = 60; disclose(state, [intent.subjectId], facts); }
    else if (intent.operation === 'testimony') {
      elapsed = 90;
      const selection = resolveTrialTestimonySelection(testimonyInput(state, playerId(state)), intent.subjectId);
      if (!selection || selection.kind === 'statement_reaction') fail();
      if (selection.stance === 'perjury') {
        // Record only the chosen utterance. Do not disclose a sealed material,
        // create evidence or tell the listeners that this is a false claim.
        const speakerId = playerId(state); const text = testimonyFeedback(selection);
        const delivery = actor(state, speakerId)?.communication === 'writing' ? 'writing' : 'speech';
        const recipients = [...living(state), 'warden'];
        testimonyEvents.push({ text, speakerId, delivery, audienceIds: [...recipients], occurredAt: state.worldTime });
        c.statements.push({ id: `statement-${c.statements.length + 1}`, speakerId, text, audienceIds: [...recipients] });
      } else {
        const sourceFacts = [];
        // Reuse the existing lawful disclosure path before an NPC can refer to
        // a formerly private sealed record. The fixed fixture's material text
        // is immutable and is exactly what its inspection delivered.
        if (selection.source.kind === 'material') disclose(state, [selection.source.id], sourceFacts);
        else sourceFacts.push(`核对已公布的制度记录【${selection.source.name}】：${selection.source.text}`);
        const recipients = [...living(state), 'warden'];
        for (const text of sourceFacts) testimonyEvents.push({ text, speakerId: null, delivery: 'action',
          audienceIds: [...recipients], occurredAt: state.worldTime });
        const progress = recordTrialTestimonyAttempt(c.testimonyProgress, playerId(state), selection);
        if (progress !== undefined) c.testimonyProgress = progress;
        const text = testimonyFeedback(selection);
        if (selection.stance === 'question' || selection.matched) testimonyEvents.push({ text, speakerId: null, delivery: 'action', audienceIds: [...recipients], occurredAt: state.worldTime });
        else {
          const speakerId = testimonyRespondent(state, playerId(state));
          const delivery = actor(state, speakerId)?.communication === 'writing' ? 'writing' : 'speech';
          testimonyEvents.push({ text, speakerId, delivery, audienceIds: [...recipients], occurredAt: state.worldTime });
          c.statements.push({ id: `statement-${c.statements.length + 1}`, speakerId, text, audienceIds: [...recipients] });
        }
      }
    }
    else if (intent.operation === 'argue') {
      elapsed = 90; disclose(state, intent.evidenceIds, facts);
      const assessment = intent.evidenceIds.length ? 'supported_materials' : 'unresolved';
      c.arguments.push({ id: `argument-${c.arguments.length + 1}`, stance: intent.stance, claim: intent.claim,
        evidenceIds: [...intent.evidenceIds], ...(intent.statementId ? { statementId: intent.statementId } : {}), assessment });
      facts.push(`已记录论证与材料引用：${intent.claim}。${assessment === 'unresolved' ? '尚无引用材料，保留为待核对的主张。' : '引用材料可供核对；它们不自动证明主张成立，更不等于认定凶手。'}`);
    } else if (intent.operation === 'vote') {
      elapsed = 0;
      if (!ballots) return { elapsed, facts: ['你准备提交明确选择，须收齐所有参加者的有效票后才公布结果。'] };
      const npcIds = c.voterIds.filter(id => id !== playerId(state));
      if (!exact(ballots, npcIds, npcIds) || Object.values(ballots).some(id => !c.candidateIds.includes(id))) fail();
      c.ballots = { [playerId(state)]: intent.subjectId, ...ballots };
      const counts = Object.fromEntries(c.candidateIds.map(id => [id, Object.values(c.ballots).filter(value => value === id).length]));
      const maximum = Math.max(...Object.values(counts)); const top = c.candidateIds.filter(id => counts[id] === maximum);
      const selectedIds = top.length === 1 ? top : [...c.candidateIds];
      c.verdict = { id: `verdict-${createHash('sha256').update(JSON.stringify(c.ballots)).digest('hex').slice(0, 24)}`,
        kind: top.length === 1 ? 'unique_highest' : 'unresolved_tie', counts, selectedIds };
      stage(state, 'execution_ready');
      facts.push(`全员有效选票已收齐。计票：${Object.entries(counts).map(([id, count]) => `${actor(state, id).name}${count}票`).join('、')}。${top.length === 1 ? `唯一最高票者为${actor(state, top[0]).name}` : '最高票并列，按本次公布的制度，全部参加者成为执行对象'}。判决已经成立，执行须等待现实玩家在手机上确认；结果不认证案情真相。`);
    }
  }
  const deadline = phase === 'investigation' ? c.investigationDeadline : phase === 'discussion' ? c.trialDeadline : null;
  if (deadline !== null) elapsed = Math.min(elapsed, Math.max(0, deadline - state.worldTime));
  if (curfew && !returning) elapsed = Math.min(elapsed, Math.max(0, curfew.at - state.worldTime));
  state.worldTime += elapsed;
  if (sourceGated(state) && intent.operation === 'report') acquireOfficialNotice(state, {
    subjectId: 'noah', fullName: '城崎诺亚', status: 'dead', audienceIds: [...living(state), 'warden'],
    sourceKey: `case-one:report:${c.reportedAt}`, at: state.worldTime });
  if (!c.discovered && caseRoomId(state) === 'cell04') {
    c.discovered = true; stage(state, 'discovery');
    observeCondition(state, 'noah', audience(state), { sourceKey: `case-one:discovery:${state.worldTime}` });
    facts.push('你从门口看见诺亚倒在涂绘中央，胸前有致命伤，身旁留着一支箭。发现已经记下，但尚未向典狱长通报，可以通过手机通报命案。');
  }
  if (c.stage === 'investigation' && state.worldTime >= c.investigationDeadline) {
    stage(state, 'assembly'); facts.push(investigationClosedNotice);
  }
  if (c.stage === 'discussion' && state.worldTime >= c.trialDeadline) {
    stage(state, 'ballot'); c.voterIds = living(state); c.candidateIds = [...c.voterIds];
    facts.push('一小时讨论已经结束，发言与现场调查停止。投票资格和候选名单已冻结；每人必须投一张有效票，允许自投，不允许弃权。');
  }
  return { elapsed, facts, ...(testimonyEvents.length ? { testimonyEvents } : {}) };
}
export function caseResolution(state, intent, response, { ballots } = {}) {
  const draft = structuredClone(state); const resolution = settle(draft, intent, response, ballots);
  return { ...resolution, afterScene: caseScene(draft, [...runtimeRevisionForState(state).actors, ...(playerId(state) === 'player' ? [actor(state, 'player')] : [])]) };
}
export function caseEnactmentDraft(state, action) {
  const decisionContract = action?.decisionVersion === 1;
  const guardPin = guardRuleReference(state);
  if (guardPin ? !isGuardRuleReference(action?.guardRules) : Object.hasOwn(action || {}, 'guardRules')) fail();
  if (!exact(action, ['type', 'jobId', 'rawInput', 'intent', 'performance', 'response', 'document', 'questionKey', 'answerKey', 'roomLabelVersion', 'worldVersion', 'ballots', 'performanceVersion', 'caseActionTimingVersion', ...(hasScheduledCaseOne(state) ? ['storyArcVersion'] : []),
    ...(decisionContract ? ['decisionVersion', 'decisions'] : []), ...(guardPin ? ['guardRules'] : [])],
    ['type', 'jobId', 'rawInput', 'intent', 'performance', 'questionKey', 'answerKey']) || action.type !== 'scene'
    || !safe(action.rawInput, 2000) || ![action.jobId, action.questionKey, action.answerKey].every(id => typeof id === 'string' && /^[a-zA-Z0-9:-]{1,100}$/u.test(id))
    || !exact(action.performance, ['action', 'utterance', ...(action.performanceVersion === 2 ? ['reflection'] : [])], ['action']) || !safe(action.performance.action, 1200)
    || (Object.hasOwn(action.performance, 'reflection') && (typeof action.performance.reflection !== 'string'
      || action.performance.reflection !== '' && !safe(action.performance.reflection, 1200)))
    || (Object.hasOwn(action, 'performanceVersion') && (action.performanceVersion !== 2 || runtimeRevisionForState(state).policy.playerPerformanceVersion !== 2))
    || (action.performance.utterance !== undefined && action.performance.utterance !== '' && !safe(action.performance.utterance, 1400))) fail();
  if (action.response && (!action.intent.targetId || !exact(action.response, ['utterance', 'intent', 'action', 'movement'])
    || (action.response.utterance !== undefined && !safe(action.response.utterance, 2000)) || (action.response.action !== undefined && !safe(action.response.action, 1200)))) fail();
  if (action.ballots !== undefined && !(action.intent.type === 'case' && action.intent.operation === 'vote')) fail();
  if (action.storyArcVersion !== undefined && (action.storyArcVersion !== 1 || !hasScheduledCaseOne(state))) fail();
  if (action.performanceVersion === 2) assertObservablePlayerAction(action.performance.action);
  const timingVersion = caseTimingVersion(state, action);
  const draft = structuredClone(state);
  if (timingVersion === 2) draft.caseActionTimingVersion = 2;
  const start = draft.entries.length; const player = playerId(state); const { intent, response } = action;
  const selectedReaction = caseStatementReaction(state, parseTestimonyCommand(action.rawInput));
  const performance = statementReactionPerformance(action, selectedReaction);
  const publicNote = state.caseOne.scheduledArcVersion === 1 && state.caseOne.stage === 'discussion'
    && actor(state, player)?.communication === 'writing' && /^(?:对|向|對)(?:全体|全體|大家)(?:书写|書寫)[：:]/u.test(action.rawInput.trim());
  if (intent.operation === 'vote' && !/^(?:我(?:把票)?投(?:给|給|向)?|投票给|投票給)[^「」“”"？?]+[。！!]?$/u.test(action.rawInput.trim())) fail();
  if (intent.operation === 'testimony' && parseTestimonyCommand(action.rawInput) !== intent.subjectId) fail();
  // Vote deliberations remain private; the public event is the final tally.
  if (intent.operation !== 'vote') {
    if (action.performanceVersion === 2 && performance.reflection) emit(draft, performance.reflection,
      { speakerId: player, delivery: 'reflection', audienceIds: [player], observationKey: `reflection:${action.jobId}` });
    emit(draft, performance.action, { speakerId: player, observationKey: performance.utterance ? `gesture:${action.jobId}` : action.questionKey });
    if (performance.utterance) emit(draft, performance.utterance, { speakerId: player, delivery: actor(state, player).communication === 'writing' ? 'writing' : 'speech', observationKey: action.questionKey,
      ...(decisionContract && actor(state, player).communication === 'writing' ? { audienceIds: publicNote ? [...living(state), 'warden'] : writingReaders(state, player, intent.targetId) } : {}) });
    if (response?.action) emit(draft, response.action, { speakerId: intent.targetId });
    if (response?.utterance) emit(draft, response.utterance, { speakerId: intent.targetId,
      delivery: actor(state, intent.targetId).communication === 'writing' ? 'writing' : 'speech', observationKey: action.answerKey,
      ...(decisionContract && actor(state, intent.targetId).communication === 'writing' ? { audienceIds: writingReaders(state, intent.targetId, player) } : {}) });
  }
  if (state.caseOne.stage === 'discussion') {
    for (const [speakerId, text] of [[player, performance.utterance], [intent.targetId, response?.utterance]]) if (text) {
      draft.caseOne.statements.push({ id: `statement-${draft.caseOne.statements.length + 1}`, speakerId, text,
        ...(decisionContract && actor(state, speakerId).communication === 'writing'
          ? { audienceIds: publicNote && speakerId === player ? [...living(state), 'warden'] : writingReaders(state, speakerId, speakerId === player ? intent.targetId : player) } : {}),
      });
    }
  }
  const { facts, testimonyEvents = [] } = settle(draft, intent, response, action.ballots);
  for (const row of testimonyEvents) {
    emit(draft, row.text, { speakerId: row.speakerId, delivery: row.delivery, audienceIds: row.audienceIds,
      observationKey: `${action.jobId}:testimony:${draft.entries.length - start + 1}` });
    draft.entries.at(-1).occurredAt = row.occurredAt;
  }
  for (const text of facts) {
    const globalNotice = intent.operation === 'report' || text === investigationClosedNotice;
    emit(draft, text, { audienceIds: (hasScheduledCaseOne(draft) || sourceGated(draft)) && intent.operation === 'inspect' ? [player]
      : globalNotice || ['discussion', 'ballot', 'execution_ready'].includes(draft.caseOne.stage)
        ? [...new Set([player, ...living(draft), 'warden'])] : audience(draft) });
  }
  draft.agentActions.push(structuredClone(action)); draft.revision += 1;
  const events = draft.entries.slice(start).map((entry, index) => ({ id: `event-${index + 1}`, entry }));
  return { draft, events, publicEvents: events.filter(({ entry }) => entry.delivery !== 'reflection').map(({ id, entry }) => ({ id, speaker: entry.speaker, delivery: entry.delivery, text: entry.text })) };
}
export function caseActorSituation(state, actorId) {
  caseCatalogueForState(state);
  return { locationLabel: state.location,
    bodyCondition: `当前处于${phaseLabels[state.caseOne.stage]}。只根据本人记忆与实际听见或看见的材料回应，不能把原作攻略当成本人的见闻。证词可以有保留、误解或隐瞒，不强制坦白或配合。庭中禁止离庭、远程补查或创造过去不存在的证据。`,
    perceivedParticipants: [playerId(state), ...caseLocalActors(state).map(item => item.id)].filter(id => id !== actorId) };
}
export function caseBallotInput(state, actorId) {
  caseCatalogueForState(state);
  if (state.caseOne.stage !== 'ballot' || !state.caseOne.voterIds.includes(actorId) || actorId === playerId(state)) fail();
  const source = runtimeRevisionForState(state).actors.find(item => item.id === actorId); if (!source) fail();
  const persona = structuredClone(source.persona);
  persona.boundaries = persona.boundaries.filter(text => !text.includes('玩家控制'));
  return { persona,
    situation: { locationLabel: rooms.court.name, bodyCondition: `讨论已结束。依本人的知识、怀疑、动机与判断，独立提交唯一的一张有效票，允许投给自己。不能弃权，不保证指认正确。不知道别人尚未公布的选择。只输出 ballot，不公开发言。\n合法候选标识与姓名：${state.caseOne.candidateIds.map(id => `${id}＝${actor(state, id).name}`).join('、')}。`,
      perceivedParticipants: [...state.caseOne.candidateIds], candidateIds: [...state.caseOne.candidateIds] }, allowedActions: ['vote'] };
}
export function applyCaseExecution(state, action) {
  const c = state.caseOne; caseCatalogueForState(state);
  const sceneDescriptor = action && !isProxy(action) ? Object.getOwnPropertyDescriptor(action, 'sceneVersion') : null;
  if (sceneDescriptor && (!sceneDescriptor.enumerable || !Object.hasOwn(sceneDescriptor, 'value'))) fail();
  if (!exact(action, ['type', 'verdictId', 'sceneVersion'], ['type', 'verdictId'])
    || (Object.hasOwn(action, 'sceneVersion') && action.sceneVersion !== 2) || action.type !== 'case_execution' || c.stage !== 'execution_ready' || c.verdict.id !== action.verdictId) fail();
  const executionAudience = [playerId(state), ...living(state), 'warden']
    .filter(id => action.sceneVersion !== 2 || state.agentPositions[id] === 'court');
  const executionEvents = action.sceneVersion === 2 ? confirmedExecutionEvents({ verdictId: c.verdict.id,
    selectedIds: c.verdict.selectedIds, audienceIds: executionAudience, at: state.worldTime,
    playerId: playerId(state), deferPlayerOutcome: state.caseOutcomeVersion === 1,
    firstCaseLeia: c.verdict.selectedIds.length === 1 && c.verdict.selectedIds[0] === 'leia',
    labelFor: (owner, id) => !sourceGated(state) || recognizesPerson(state, owner, id) ? actor(state, id).name : actor(state, id).appearance || '眼前的人' }) : [];
  c.executedIds = [...c.verdict.selectedIds]; state.worldTime += 120;
  for (const id of c.executedIds) observeCondition(state, id, [playerId(state), ...living(state), 'warden'],
    { sourceKey: `case-one:execution:${c.verdict.id}`, kind: 'public_execution', status: 'executed' });
  for (const id of c.executedIds) state.agentPositions[id] = 'unavailable';
  const ended = c.executedIds.includes(playerId(state));
  const deferred = ended && state.caseOutcomeVersion === 1;
  if (ended) { state.completed = !deferred; stage(state, deferred ? 'outcome_pending' : 'ending'); }
  if (deferred) deferCasePlayerOutcome(state, { subjectId: playerId(state), at: state.worldTime,
    cause: 'case-execution', sourceKey: c.verdict.id });
  if (!ended) { stage(state, 'aftermath'); state.location = rooms.reception.name; for (const id of [...living(state), 'warden']) state.agentPositions[id] = id === 'warden' ? 'courtyard' : 'reception'; }
  if (action.sceneVersion === 2) {
    for (const event of executionEvents) state.entries.push({ id: `entry-${state.entries.length + 1}`, ...event });
    if (!ended) emit(state, '幸存者沿通路回到会客厅，被带往中央的执行对象没有回来。',
      { audienceIds: [playerId(state), ...living(state), 'warden'], observationKey: `execution-v2:return:${c.verdict.id}` });
  } else emit(state, `玩家已确认阶段推进，判决的执行程序结束。执行对象：${c.executedIds.map(id => actor(state, id).name).join('、')}。${deferred ? '当前身体遭受致命伤害，后续能力与生命结果尚待宿主结算。' : ended ? '你的角色已被执行，当前视角停止；没有自动复活或把技术读档当作魔法。' : '幸存者返回会客厅，日常活动重新开放。此前的案件记录、证词、判决与每个人的见闻继续保留，执行对象不再参加日常活动。'}`, { audienceIds: [playerId(state), ...living(state), 'warden'] });
  if (hasScheduledCaseOne(state)) {
    state.storyArc.status = ended ? 'ending' : 'aftermath';
    state.storyArc.resolvedAt = state.worldTime;
    const codes = { cell: 'CELL', cell01: 'CELL_01', cell02: 'CELL_02', cell04: 'CELL_04', cell05: 'CELL_05',
      cell06: 'CELL_06', cell07: 'CELL_07', playercell: 'PLAYER_CELL', corridor: 'CORRIDOR', reception: 'RECEPTION' };
    for (const [id, room] of Object.entries(state.agentPositions)) state.agentPositions[id] = codes[room] || room;
    const runtime = state.caseRuntime;
    if (runtime) {
      runtime.executedIds = [...new Set([...runtime.executedIds, ...c.executedIds])];
      for (const id of c.executedIds) runtime.conditionsByActor[id] = { status: 'executed', source: state.storyArc.id, occurredAt: state.worldTime };
      runtime.conditionsByActor.noah = { status: 'dead', source: state.storyArc.id, occurredAt: state.storyArc.crimeAt };
      if (sourceGated(state)) runtime.observedConditionsByActor = structuredClone(c.observedConditionsByActor);
      else for (const id of [...living(state), 'warden']) {
        runtime.observedConditionsByActor[id] ||= {};
        runtime.observedConditionsByActor[id].noah = { status: 'dead', at: state.worldTime };
      }
      runtime.pendingActorIds = runtime.pendingActorIds.filter(id => !['hiro', 'noah', ...c.executedIds].includes(id));
    }
    if (state.agentWorld) {
      state.agentWorld.routes = state.agentWorld.routes.filter(row => !['hiro', 'noah', ...c.executedIds].includes(row.actorId));
      state.agentDoorOpen = ((state.agentWorld.startSecond + state.worldTime) % 86400) < 22 * 3600;
    }
    if (!ended) state.phase = 'agent_reception';
  }
  state.agentActions.push(structuredClone(action)); state.revision += 1;
}
export function scheduledCaseArchive(state) {
  if (!hasScheduledCaseOne(state) || !['aftermath', 'ending'].includes(state.storyArc?.status) || !state.caseOne) return {};
  const c = state.caseOne; const evidence = caseEvidence(state);
  return { trial: { stage: c.stage, verdict: structuredClone(c.verdict), remainingSeconds: null },
    evidence: knownEvidence(state).map(id => ({ id, name: evidence.get(id).name, description: evidence.get(id).description,
      status: c.disclosedEvidence.includes(id) ? '已在庭上公开' : '本人检查记录' })),
    records: [{ id: 'case-one-archive', name: '第一案判决记录', text: `判决执行已经结束。执行对象：${c.executedIds.map(id => actor(state, id).name).join('、')}。判决不认证案件真相，幸存者保留此前见闻。` },
      ...c.statements.filter(row => !row.audienceIds || row.audienceIds.includes(playerId(state)))
        .map(row => ({ id: row.id, name: `${sourceGated(state) && !recognizesPerson(state, playerId(state), row.speakerId) ? '？？？' : actor(state, row.speakerId).name}的庭上陈述`, text: row.text }))] };
}
export function casePlayView(state, actors = runtimeRevisionForState(state).actors) {
  const scene = caseScene(state, actors); const c = state.caseOne; const evidence = caseEvidence(state);
  const mode = ['daily', 'discovery', 'aftermath', 'ending'].includes(c.stage) ? 'daily' : ['investigation', 'assembly'].includes(c.stage) ? 'investigation' : 'trial';
  return { mode, scenarioId: state.creation.scenarioId, ...(hasScheduledCaseOne(state) ? { storyArcId: state.creation.storyArcId, procedureKind: 'case-one' } : {}), scenarioTitle: state.creation.scenarioId === 'case-1-execution-test' ? '第一案·处刑按钮测试' : '第一周目·第一案', clock: caseClock(state), phaseLabel: phaseLabels[c.stage],
    nearbyCharacters: scene.nearby.map(({ id, label }) => ({ id, name: label })),
    suggestions: state.completed || c.stage === 'execution_ready' ? [] : c.stage === 'ballot' ? ['我投给自己', ...c.candidateIds.filter(id => id !== playerId(state)).map(id => `我投给${actor(state, id).name}`)]
      : ['观察四周', ...scene.adjacent.map(item => `前往${item.label}`), ...scene.case.inspectables.map(item => `检查${item.name}`),
        ...(c.stage === 'discovery' ? ['通报命案'] : []), ...(c.stage === 'investigation' ? ['等待至搜查结束'] : []),
        ...(c.stage === 'discussion' ? [...scene.case.knownEvidence.map(item => `出示${item.name}`), '等待至讨论结束'] : [])],
    rules: [...prisonRulebook(state), { id: 'case-one-procedure', name: '第一案程序与测试范围', text: `${CASE_ONE_NOTICE}\n搜查45个故事分钟，讨论60个故事分钟；阅读图鉴与现实等待不耗时。庭中禁止补查。所有参加者必投一票，允许自投；唯一最高票即认定，最高并列则全部参加者成为执行对象。${state.creation.scenarioId === 'case-1-execution-test' ? '本处刑测试使用全员投给蕾雅的固定测试票，跳过前置流程，不调用模型判断票向。' : '无预设对话、认罪或票向。'}本场景不执行新的魔法、身体互换或死亡回溯。` }],
    evidence: knownEvidence(state).map(id => ({ id, name: evidence.get(id).name, description: evidence.get(id).description, status: c.disclosedEvidence.includes(id) ? '已在庭上公开' : '本人检查记录' })),
    records: [{ id: 'case-one-progress', name: '当前案件程序', text: `${phaseLabels[c.stage]}。${c.discovered ? '已发现诺亚的遗体。' : '尚未发现或通报命案。'}${c.reportedAt !== null ? '通报已登记。' : ''}${scene.case.remainingSeconds !== null ? `本阶段剩余${scene.case.remainingSeconds}秒故事时间。` : ''}` },
      ...c.statements.filter(item => !item.audienceIds || item.audienceIds.includes(playerId(state)))
        .map(item => ({ id: item.id, name: `${sourceGated(state) && !recognizesPerson(state, playerId(state), item.speakerId) ? '？？？' : actor(state, item.speakerId).name}的庭上陈述`, text: item.text })),
      ...c.arguments.map(item => ({ id: item.id, name: '论证记录', text: `${item.claim}\n引用：${item.evidenceIds.filter(id => evidence.has(id)).map(id => evidence.get(id).name).join('、') || '未引用'}。材料引用不等于证明主张。` }))],
    trial: { stage: c.stage, remainingSeconds: scene.case.remainingSeconds,
      ...(scene.case.testimony ? { testimony: scene.case.testimony } : {}), ...(c.verdict ? { verdict: structuredClone(c.verdict) } : {}) },
    phoneState: c.stage === 'execution_ready' ? 'execution_ready' : c.stage === 'ballot' ? 'ballot' : 'normal',
    ...(c.stage === 'execution_ready' ? { execution: { verdictId: c.verdict.id, targets: c.verdict.selectedIds.map(id => ({ id, name: actor(state, id).name })) } } : {}) };
}
export function caseObservedCondition(state, id, observerId = playerId(state)) {
  if (sourceGated(state)) {
    caseCatalogueForState(state);
    const condition = state.actorKnowledge?.byActor?.[observerId]?.[id]?.conditionSources?.at(-1);
    if (condition?.status === 'dead') return condition.kind === 'official_notice' ? '已通报死亡' : '已确认死亡';
    const observed = state.caseOne.observedConditionsByActor?.[observerId]?.[id];
    if (!observed?.sourceKey) return undefined;
    if (observed.status === 'executed') return '判决执行已结束，已不参加活动';
    if (observed.status === 'dead') return '已发现死亡';
    if (observed.status === 'fatal_injury') return '本人目击致命伤害，已不参加活动';
    return undefined;
  }
  if (id === 'hiro') return '此前目击致命伤害，已不参加活动';
  if (id === 'noah' && state.caseOne.discovered) return '已发现死亡';
  if (state.caseOne.executedIds.includes(id)) return '判决执行已结束，已不参加活动';
  return undefined;
}

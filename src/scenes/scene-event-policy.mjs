import { isProxy } from 'node:util/types';
import { prisonClock } from '../world/prison-activity.mjs';

// Independent new-job extensions, not a redefinition of any execution revision.
export const NEW_SCENE_JOB_EXTENSIONS = Object.freeze({ sceneEventTimeVersion: 1, outputContractVersion: 1, ambientContinuityVersion: 1, materialProseVersion: 1, playerTextMagicVersion: 1, selfFloatEndObservationVersion: 2, magicCaseWitnessVersion: 1, customMagicCaseWitnessVersion: 1, npcCurrentSituationVersion: 1 });
export const SCENE_EXTENSION_FIELDS = Object.freeze([...Object.keys(NEW_SCENE_JOB_EXTENSIONS), 'physicalFactsVersion', 'postureActionVersion', 'occupiedBodyVersion', 'swapLifecycleVersion', 'objectInspectionTimingVersion', 'intentContractVersion', 'softResultVersion', 'ordinaryParticipationVersion', 'hostCaseChoiceVersion']);
// Generic capability references belong to the immutable OUTER job envelope.
// They are deliberately not causal action fields: the old causal reducer keeps
// its closed schema and cannot execute a custom power from model output.
export function customAbilityTaskPin(value) {
  if (!value || value.customAbilityVersion === undefined) {
    if(value && Object.hasOwn(value,'customAbilityRefs'))fail(); return {};
  }
  if(value.customAbilityVersion!==1||!Array.isArray(value.customAbilityRefs)||!value.customAbilityRefs.length||value.customAbilityRefs.length>4)fail();
  for(const ref of value.customAbilityRefs) if(!ref||typeof ref.definitionId!=='string'||!Number.isSafeInteger(ref.revision)||ref.revision<1
    ||!/^[a-f0-9]{64}$/u.test(ref.semanticDigest)||!/^[a-f0-9]{64}$/u.test(ref.attachmentDigest))fail();
  return {customAbilityVersion:1,customAbilityRefs:structuredClone(value.customAbilityRefs)};
}
// Independent OUTER semantic pin, never part of sceneExtensionPin/action.
export function ballotInstrumentTaskPin(value) {
  if (!value || !Object.hasOwn(value, 'ballotInstrumentVersion')) return {};
  const d = Object.getOwnPropertyDescriptor(value, 'ballotInstrumentVersion');
  if (isProxy(value) || !d?.enumerable || !Object.hasOwn(d, 'value') || d.value !== 1) fail();
  return { ballotInstrumentVersion: 1 };
}
export const BALLOT_INSTRUMENT_INSTRUCTIONS = '投票器具契约1：本轮投票候选仍是intent.subjectId；独立ballotInstrumentSource仅说明已实际阅读的手机投票规则。游戏使用配发手机，不存在纸质选票；不得编造票纸、接票或交纸票动作。独立已授权笔记本不是选票。源缺失保持未知，不增加物品、持有或行动权限。输出只含原有字段，不提交来源、器具、版本或授权字段。人物引用、反思与不确定陈述不变成当前物理事实。';
export function newSceneJobExtensions(materialProseVersion = 1, physicalFactsVersion = 1) {
  return { ...NEW_SCENE_JOB_EXTENSIONS, materialProseVersion,
    ...(physicalFactsVersion === 2 || materialProseVersion === 2 ? { physicalFactsVersion } : {}) };
}
const fail = () => { throw Object.assign(new Error('场景展示策略版本或宿主事件时间无效。'), { code: 'INVALID_NARRATIVE_OUTPUT' }); };
const time = value => { if (!Number.isSafeInteger(value) || value < 0) fail(); return value; };
export function validateSceneExtensions(value) {
  if (!value || typeof value !== 'object' || isProxy(value)) fail();
  for (const key of SCENE_EXTENSION_FIELDS) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor && (!descriptor.enumerable || !Object.hasOwn(descriptor, 'value')
      || !(key === 'selfFloatEndObservationVersion' ? [1, 2]
        : ['materialProseVersion', 'physicalFactsVersion', 'intentContractVersion'].includes(key) ? [1, 2] : [1]).includes(descriptor.value))) fail();
    if (!descriptor && key in value) fail();
  }
  return value;
}
export function sceneExtensionPin(value) {
  validateSceneExtensions(value);
  return Object.fromEntries(SCENE_EXTENSION_FIELDS.filter(key => Object.hasOwn(value, key)).map(key => [key, value[key]]));
}

/** Public event IDs and host clocks only. Never serialize the private ledger,
 * audience, observation keys, reflection, case state or unobserved transitions. */
export function sceneEventTimeline(before, after, ledger, events) {
  const start = time(before.worldTime); const end = time(after.worldTime);
  if (end < start || !Array.isArray(ledger) || !Array.isArray(events)) fail();
  let cursor = start;
  const rows = events.map(event => {
    const source = ledger.find(row => row.id === event.id)?.entry;
    if (!source || source.delivery === 'reflection' || source.text !== event.text || source.speaker !== event.speaker || source.delivery !== event.delivery) fail();
    const occurredAt = time(source.occurredAt);
    if (occurredAt < cursor || occurredAt > end) fail();
    cursor = occurredAt;
    const clock = prisonClock(before, occurredAt);
    return { eventId: event.id, occurredAt, day: clock.day, label: clock.label };
  });
  const initial = prisonClock(before, start); const final = prisonClock(after, end);
  return { version: 1, start, end, startClock: { day: initial.day, label: initial.label },
    endClock: { day: final.day, label: final.label }, events: rows };
}
export function validateSceneEventTimeline(timeline, events) {
  if (!timeline || timeline.version !== 1 || !Array.isArray(timeline.events) || timeline.events.length !== events.length) fail();
  let cursor = time(timeline.start); const end = time(timeline.end);
  if (end < cursor) fail();
  const clock = value => {
    if (!value || !Number.isSafeInteger(value.day) || value.day < 1 || !/^(?:[01]\d|2[0-3]):[0-5]\d$/u.test(value.label)) fail();
  };
  clock(timeline.startClock); clock(timeline.endClock);
  for (const [index, row] of timeline.events.entries()) {
    if (row.eventId !== events[index].id || time(row.occurredAt) < cursor || row.occurredAt > end) fail();
    clock(row); cursor = row.occurredAt;
  }
  return timeline;
}

/** No candidate clock is accepted. Narration opens at the start, follows the
 * nearest preceding canonical event, and closes at the final host boundary. */
export function sceneNarrationTimes(document, timeline, events) {
  validateSceneEventTimeline(timeline, events);
  let index = 0; let cursor = timeline.start;
  return document.blocks.map(block => {
    if (block.type === 'event') {
      const event = timeline.events[index++];
      if (!event || event.eventId !== block.eventId) fail();
      cursor = event.occurredAt; return cursor;
    }
    if (block.type !== 'narration') fail();
    return index === events.length ? timeline.end : cursor;
  });
}

export const NATURAL_SCENE_CONTRACT_INSTRUCTIONS = [
  '输出契约版本1：没有最少汉字数，不要求凑够1000字，也不要求4至10段。每段都必须有当前已授权材料；保留最大篇幅和固定事件上限，稀疏事件可以只用一段简短旁白。',
  '需要玩家回答或选择时用 await_player；再写只能重复或虚构时用 material_limit；已完成当前动作可用 action_complete。短本身不是错误，也不需要修订。不得为篇幅添加行动、物件、回忆、关系变化或等待时间。',
  'eventTimeline 只是宿主提供的可见事件时标；跨日只说明日期经过，不证明睡过一夜、气温、晨光、灯光或场外变化。输出仍然只有 blocks 与 stopReason，禁止提交时间字段或修改事件。',
].join('\n');
// New novel tasks opt into this at plan creation. Keep the original policy
// bytes available for pending tasks sealed before the pacing change.
export const NOVEL_SCENE_PACING_INSTRUCTIONS = [
  '小说旁白篇幅：材料足够时，日常推进、对话、探索或有前后变化的施法，旁白本身通常写 300–600 个汉字，分成 3–5 个有不同内容的自然段。多人交锋、深入调查或重要转折若有更多可写事实，通常写 600–1000 个汉字。只计 narration 文本，不把台词、动作事件或反思算进去。这是写作目标，不是强制最低字数。',
  '先梳理当前可见材料，再落笔：开头用一个已知的空间或感官细节定位；中段围绕实际交付的动作或话语写停顿、距离或注意力的变化；结尾写当前已经确认的可见后果和留给玩家的当下情境。发生位置变化时，可以分别展开出发处与抵达处已知的细节；抵达后的细节放在相应事件之后。不要把已给出的台词或动作换词重演。',
  '需要玩家接手只决定情节停在哪里，不等于省略已经发生的这一幕。若本轮确实只有一个简单动作或一个可写细节，就自然写短；不添新行动、对白、场景事实、回忆或时间，不堆形容词凑字。保留原有篇幅上限、事件顺序和交付边界；长度本身不触发重试。',
  'eventTimeline 只是宿主提供的可见事件时标；跨日不证明睡眠、气温、晨光、灯光或场外变化。输出仍然只有 blocks 与 stopReason，禁止提交时间字段或修改事件。',
].join('\n');
export const MATERIAL_PROSE_INSTRUCTIONS = [
  '物质叙述版本1：只根据本人当前可见 scene/sceneBefore/sceneAfter 的稀疏描述、objects、readable 与明确交付 materialFacts 编排；缺省不补纸张、手机、柜内物、精确距离或物体状态。materialProseFacts.before/after 如有交付，仅在对应宿主边界生效。',
  'knownMaterials 只包含宿主已授权交付的本人材料；文档中的尺寸、痕迹和台词不是当前地点的物理几何。reading 事件表示阅读送达，speech/writing 表示陈述送达，均不证明内容成真。只有已引用的固定 action 事件可贡献相应已裁决行动事实。不要提交 materialContext、权限、来源或规则版本字段。',
  '没有脚印不等于没有划痕；普通观察不等于触碰；纸质资料不改成手机；未知纸边新旧、表面比较、精确距离、柜内内容与光学条件保持未知。铁栏不默认遮断视线，门锁解开不默认取得制度许可，他人手势不撤销既有访问权。',
  '候选旁白和 action 不能否定已交付痕迹，不能在本人尚未听到固定 speech 事件前补出话音余韵。明确的猜测、角色的错误陈述和玩家原样选定台词仍是陈述，不替角色强制纠错，也不升格为旁白事实。普通有依据的气氛与材料引用可以保留；材料不足自然收束。',
].join('\n');

export const MATERIAL_PROSE_V2_INSTRUCTIONS = [
  '物质叙述版本2：只使用当前接收者已授权的 scene/sceneBefore/sceneAfter 及 materialProseBoundaries 对应的精确宿主边界。性能演绎前后是同一当前边界；场景前后是实际结算端点，revision 均为任务起点。',
  'physicalFacts.version=2 的 scope 必须精确匹配对应边界。通行、物理屏障、光学可见性彼此独立，锁门不说明遮光或制度许可。姿势与支撑物仅在宿主显式结算时有效；缺对象不等于空，未知柜内内容不能肯定叙述。',
  '固定事件只决定叙述顺序，不将 action、speech、writing、reading 的文字变成物理真相。证据文档、回忆、原输入、反思、修订原文与人物陈述均不是当前几何依据。选定 readable 的载体严格绑定 subjectId；别的纸张或手机不能替换它。',
  'eventTimeline 给出实际时钟。每个事件前缀只能使用其精确 materialProseEventSnapshots；没有中间快照时当前物理状态未知，不能借用起点、终点或旧房间事实。话音余韵只在相同时钟已交付 speech 后成立。',
  '候选只提交原有 action/utterance/reflection 或 blocks/stopReason，不提交版本、边界、物理字段、权限或 materialContext。猜测、否定和人物原样陈述保持其非事实性质；材料不足自然收束。',
].join('\n');

export const AMBIENT_CONTINUITY_INSTRUCTIONS = [
  '环境连续性版本1：sceneBefore/sceneAfter 是稀疏的宿主授权快照，不是补齐房间设定的邀请。未知灯光、温度、燃烧状态、姿势、身体疲劳及持物状态保持未知；描述中出现某物不等于角色持有它或刚刚使用过它。',
  '静态壁炉不等于生火，屏幕存在不等于亮屏，时间跨日不等于玩家睡眠，床位不等于当前躺卧。只能在对应固定事件之后描述已裁决变化，不从 recentScene、repairSource、角色台词或气氛推导世界事实。',
  '保留当前动作、物品归属、衣饰、距离和视角；不重演固定事件、不把别人动作转给玩家，不把私有思考写成可见事实。材料不足时自然收束，不能补造感官来源。',
].join('\n');

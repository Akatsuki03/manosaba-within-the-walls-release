import { isProxy } from 'node:util/types';
import { prisonClock } from '../world/prison-activity.mjs';
import { defaultAgentPrompt } from '../agents/agent-prompts.mjs';
import { publicAgentProfile } from '../content/agent-scenario.mjs';

// The focus version is issued only for the actual round-pacing presentation.
export const novelFirstPresentation = (presentation, focus) => focus && presentation.narrationPacingVersion === 3
  ? { ...presentation, novelNarrationFocusVersion: 1, novelRoundProseRepairVersion: 1, novelRoundFirstDraftVersion: 3 } : presentation;

// First composer only: the second marker permits the optional same-slot
// editorial pass, not ordinary movement recovery or a scene-repair slot.
export const novelNarrationFocusTaskPin = (plan, task) => plan?.novelNarrationFocusVersion === 1
  && task.id === 'scene' && task.role === 'scene_composer' ? { novelNarrationFocusVersion: 1,
    ...(plan.novelRoundProseRepairVersion === 1 ? { novelRoundProseRepairVersion: 1 } : {}),
     ...([1, 2, 3].includes(plan.novelRoundFirstDraftVersion) ? { novelRoundFirstDraftVersion: plan.novelRoundFirstDraftVersion } : {}) } : {};

export const focusedRoundProsePacket = packet => packet?.role === 'scene_composer'
  && packet.data?.novelRoundProseRepairVersion === 1 && packet.data.novelNarrationFocusVersion === 1
  && packet.data.narrationPacingVersion === 3 && packet.data.outputContractVersion === 1
  && packet.data.sceneEventTimeVersion === 1 && !Object.hasOwn(packet.data, 'repairSource')
  && !Object.hasOwn(packet.data, 'compositionFeedback');

export const focusedFirstDraftPacket = packet => focusedRoundProsePacket(packet)
  && [1, 2, 3].includes(packet.data.novelRoundFirstDraftVersion);
export const fullRoundDraftPacket = packet => focusedFirstDraftPacket(packet)
  && packet.data.novelRoundFirstDraftVersion === 2;
export const ordinaryRoundDraftPacket = packet => focusedFirstDraftPacket(packet)
  && packet.data.novelRoundFirstDraftVersion === 3;

export function validRoundProseOwnerProof(packet) {
  if (Object.hasOwn(packet ?? {}, 'narrationOwnerEventIds')) return false;
  const data = packet?.data;
  if (!Object.hasOwn(data ?? {}, 'narrationOwnerEventIds')) return true;
  if (!ordinaryRoundDraftPacket(packet) || !Array.isArray(data.narrationOwnerEventIds) || !Array.isArray(data.events)) return false;
  let prior = -1;
  return data.narrationOwnerEventIds.every(id => {
    const index = data.events.findIndex(event => event.id === id);
    if (index <= prior) return false;
    prior = index;
    return true;
  });
}

// Compare only delivered visible material. Clock rows, capability menus,
// private sources, and duplicate canonical text do not create narrative beats.
const visibleRows = (rows, keys) => (rows || []).map(row => JSON.stringify(keys.map(key => row[key]))).sort();
function visibleSceneKey(scene) {
  const { physicalFacts } = scene;
  return JSON.stringify([scene.roomId, scene.description, scene.doorOpen, scene.screenAvailable, scene.case?.stage,
    visibleRows(scene.nearby, ['id', 'label', 'appearance']), visibleRows(scene.objects, ['id', 'name', 'placement']),
    visibleRows(scene.readable, ['id', 'name', 'carrier']), physicalFacts?.door, physicalFacts?.pose,
    visibleRows(physicalFacts?.objects, ['id', 'name', 'placement', 'carrierId', 'closed', 'transparent', 'carrier']),
    visibleRows(physicalFacts?.carriers, ['id', 'label']), visibleRows(physicalFacts?.surfaces, ['id', 'name', 'occupancy'])]);
}
const clockOnlyEvent = /^(?:片刻过去了|时间又过去了一会儿|过了一小会儿|又过了一会儿|时间继续流逝|已经到了下一段作息时间)[。！]?$/u;
const simpleOwnedAction = /^(?:我|你)?(?:仍|还|又|轻轻|静静地|稍稍|只|短暂地)*(?:点(?:了点)?头|摇(?:了摇)?头|站在原地|留在原处|留在原地|停在原处|原地(?:短)?等(?:了片刻|了一会儿|待片刻)?|稍等片刻|等(?:了)?(?:片刻|一会儿|一小会儿|一下)|(?:看|望|扫)(?:向|了看|了望|了一眼)(?:[^，,；;。！？!?\r\n]{0,20})|侧耳听了听)[。！]?$/u;
export function ordinaryRoundProseMode(packet) {
  if (!ordinaryRoundDraftPacket(packet)) return undefined;
  const { sceneBefore, sceneAfter, intent, events, materialProseEventSnapshots, narrationOwnerEventIds } = packet.data;
  if (!sceneBefore?.roomId || !sceneAfter?.roomId || !['conversation', 'look', 'wait', 'act'].includes(intent?.type)
    || intent.operation !== undefined || packet.data.customEventIds?.length) return 'full';
  const before = visibleSceneKey(sceneBefore);
  if ([sceneAfter, ...(materialProseEventSnapshots || []).map(row => row.scene)].some(scene => visibleSceneKey(scene) !== before)) return 'full';
  const own = Array.isArray(narrationOwnerEventIds) ? new Set(narrationOwnerEventIds) : null;
  const ownerName = publicAgentProfile(packet.scope?.actorId)?.name;
  const distinct = new Map();
  for (const event of events) {
    const owned = own ? own.has(event.id) : event.speaker === ownerName || event.speaker === '本人';
    const text = event.text.trim();
    if (!owned && event.delivery === 'action' && clockOnlyEvent.test(text)) continue;
    if (!owned) return 'full';
    distinct.set(JSON.stringify([event.delivery, text]), { delivery: event.delivery, text });
  }
  const rows = [...distinct.values()];
  if (rows.some(row => !['speech', 'writing', 'action'].includes(row.delivery))) return 'full';
  const actions = rows.filter(row => row.delivery === 'action');
  const said = rows.length - actions.length;
  // An authored short look/wait can use one native host action; a line and its
  // customary simple gesture still do not amount to two independent beats.
  return said <= 1 && actions.length <= 1
    && (!actions.length || (['wait', 'look'].includes(intent.type) && !said) || simpleOwnedAction.test(actions[0].text)) ? 'sparse' : 'full';
}

export function focusedNarratorPreference(preference) {
  if (preference !== defaultAgentPrompt('narrator')) return preference;
  return preference.replace('材料充足时，日常回合的旁白本身通常写 300–600 汉字、分成几个自然段；多人交锋、现场调查或庭审转折可以展开到 600–1000 汉字。', '');
}

// Independent new-job extensions, not a redefinition of any execution revision.
export const NEW_SCENE_JOB_EXTENSIONS = Object.freeze({ sceneEventTimeVersion: 1, outputContractVersion: 1, ambientContinuityVersion: 1, materialProseVersion: 1, playerTextMagicVersion: 1, selfFloatEndObservationVersion: 2, magicCaseWitnessVersion: 1, customMagicCaseWitnessVersion: 1, npcCurrentSituationVersion: 1 });
export const SCENE_EXTENSION_FIELDS = Object.freeze([...Object.keys(NEW_SCENE_JOB_EXTENSIONS), 'physicalFactsVersion', 'postureActionVersion', 'occupiedBodyVersion', 'swapLifecycleVersion', 'objectInspectionTimingVersion', 'intentContractVersion', 'softResultVersion', 'ordinaryParticipationVersion', 'hostCaseChoiceVersion']);

// Scene-only policy; not a world-action or actor prompt revision.
export const narrationParagraphActionPin = plan => [2, 3].includes(plan?.narrationPacingVersion)
  ? { narrationPacingVersion: plan.narrationPacingVersion } : {};
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
export const NOVEL_SCENE_PACING_V2_INSTRUCTIONS = [
  '小说旁白篇幅版本2：每个实际发布的 narration 自然段至少 500 个汉字。标点、数字、拉丁字母、表情、固定事件、对白、动作、反思和标题不计入；同一个 narration 块里用空行另起自然段的，每段也要分别达标。每块仍限 1200 字符，优先用 1 个约 530–700 汉字的扎实段落；有独立且充分的材料才多写一段，不要求固定段数。',
  '只铺开当时已交付的可见、可听材料与本人视角：从一个真实细节起笔，按相关事件的实际时间写注意力、空间关系或对已知事实的不同观察角度。保留原有因果、权限、时点和事件顺序。台词和动作留给固定事件，不在旁白里复演、换词复述或计入篇幅。',
  '不靠重复、讲解篇幅要求、推断未知环境、编造事件或人物心事来凑字；不要填充固定交接语。材料确实不足时依实写，不冒充达标；宿主只会发布达标自然段，并在省略不合格旁白时另行标明，已发生事件仍保持原样。',
  '收到短段轻修提示时，只在已有依据充足的地方补足或合并；修订仍不得改写固定事件，新增世界事实、时间或行动。输出只有 blocks 与 stopReason。',
].join('\n');
export const NOVEL_PROSE_ONLY_REPAIR = '任务：只写日系悬疑小说的一段第一人称中文正文。交付一整个自然段，至少五百汉字，目标约六百五十汉字，不用标题，不要换行。你不是在推进游戏，只写最后一个已发生事件之后我此刻在场的持续观察。根据材料选择六到九个不同切面，围绕已知空间、在场者的真实外观、眼前物件、已确认和仍不确定之处分层写约二十句，保持自然地连在同一段里。玩家就是第一人称叙述者，在正文只称“我”；不要另写一个与“我”同时在场的玩家角色。材料中的在场者是我能看到的其他人。不要讲刚才做过或听过什么；动作与对白由固定事件展示，正文不复演或解释它们，也不补写任何人的点头、转身、起身、坐下、移动或表情变化。静态外观不是身体姿势或正在行动的证据。不添加未见事物、人物私想、往事、门扇角度、温度或具体声音。事件中的对白是人物的说法，不是现场状态的证据；例如只有锁解除或通路可走时，就按锁和通路写，门扇开合仍未确定。有依据才写，写完自检长度。返回 JSON 对象，仅有 text 一项。';
// This guide is appended only for newly sealed novel tasks. Keep the original
// V2 base text above byte-for-byte for pending tasks issued before this guide.
export const NOVEL_SCENE_LONG_FORM_FINAL = [
  '最后核对旁白交稿（覆盖前文的短稿、分段数量和总字数建议，不放宽事实边界）：只要旁白能成立，先交付一个完整自然段，目标 600–680 个汉字。不要先写几个短段再留给宿主拼接。一个合格段胜过几个短段。',
  '先按当前场景可见材料选一个叙述落点。把这一段安放在相关固定事件全部发生之后；若需要写事件前的视角，就放在这些事件之前，绝不预写结果。用同一段的几组连续句子由已经可见的位置、细节、看见或听见所能确定与尚不能确定的区别，逐渐展开到眼前局面。不需要分题、空行、复述台词或动作，也不要为了写长让时间额外流动。',
  '以语句连贯和信息不同为准，不以重复为代价。生成完在输出前检查每段中文文字：每个 narration 自然段至少 500 个汉字（不计标点、空格、数字、外文），优先 600–680，不能把多个短段加总。未以已知材料达到要求前不要提交短结语；仅在事实确实不足时可用 material_limit 说明真实边界，不编造也不声称达标。',
  '只输出既有 JSON：blocks 内按宿主顺序逐个引用全部固定 eventId，旁白使用一段连续的 narration 文本，stopReason 按真实停点，不提交字数、标题、写作说明或其他字段。',
].join('\n');
export const NOVEL_SCENE_ROUND_FINAL = [
  '最终小说正文契约（取代前文所有字数和段落数量建议）：只算本轮所有 narration 自然段合计，至少 500 汉字，不给单段设字数下限。对白、固定事件、动作、反思和标题都不计。遇到剧情焦点或观察对象有实质变化就另起自然段，每段单独一个 narration 块。不要为了数字把短段拼成长墙，也不要给同一段机械断行。',
  '写玩家为什么会留意眼前这一刻，而不是列房间清单。选择本轮真正有用的变化：人物回应之后多出的选择、已经发生的动作让什么变得可见、一个已知细节怎样影响眼下判断。按时间摆在对应 event 之后；视角切换写在第一个相关 event 之后，绝不预写。用已交付的事实，但不要换词重播事件、介绍整套衣饰、反复否定猜测或解释写作与证据规则。',
  '一句话能带出变化就别再说一遍。只从玩家的第一人称当下观察展开，不替玩家决定下一步，不替别人想，不添加感觉、对白、动作、时间、回忆或世界事实。已有材料确实有限就保持短而具体，已有结算事件及真实 stopReason 仍完整交付，别用自我评价填补篇幅。只返回既有 blocks/stopReason JSON。',
].join('\n');
export const NOVEL_NARRATION_FOCUS_V1 = [
  '本轮旁白篇幅：材料允许时，所有新增 narration 自然段合计至少 500 汉字。各段不设最低字数，不预定段数；固定事件、动作、对白、反思和标题不计。材料确实有限就保留真实短稿，不靠重复或虚构补字，也不自称达标。',
  '围绕玩家当下会留意的焦点组织正文，不盘点房间或衣饰。开场用 sceneBefore 当时已经交付的一处着眼点；若有改变看法或选择的公开转折，在对应固定 event 之后写它让什么变得可见或值得留意；落点以最后事件之后的 sceneAfter 和已确认事实写眼前仍待观察或决定之处。只选内容确实不同、各有证据的落点，不强凑三段。',
  '前后时点各用各的证据，不把终点的地点、物件、身份或状态倒填进中间。陈述只证明已经送达，不证明内容成真。用玩家第一人称，经已交付的可见、可听材料写这一刻；不复演、引用或改述事件，不推测他人心事，不补动作、对白、感觉、回忆、世界事实或经过时间。固定 eventId 保持全量、一次、原序；按真实停点填写 stopReason，只返回 blocks 与 stopReason。',
].join('\n');
export const NOVEL_ROUND_PROSE_REPAIR = [
  '任务：续写这一轮结算后的第一人称场景正文。只输出一个裸 JSON 对象，形如 {"paragraphs":["第一自然段","下一自然段"]}；直接从 { 开始，到 } 结束，无 Markdown 代码围栏、注释、前言或尾逗号。没有可写新内容可返回空数组。每项是一个干净的自然段，不带标题和段内换行。不是逐段凑字；材料撑得住时，本轮正文合计至少 500 汉字。',
  '先找本轮两三处确实改变了视点或选择的地方。若确有这些材料，分别写场景变化怎样改变我此刻能看到的范围、一个具体的新线索为什么值得留意、眼前的人或通路让哪些下一步仍然可选。把这几个方面写成各有重点的自然段，写到一个真实可选的停点；不要只抄一遍地点、人物和物件名称。能从已知事实合理推出的眼下可能性可以用条件句写；不要声称它已经发生。',
  '事件是已经交付的时间线，不复演、复制、改编其中动作或对白。人物说过的话只是他/她的说法，不证明传闻或物质状态。最后的位置、可见人物和物件来自 here/present/objects；没有交付的东西不要自行补齐。',
  '玩家就是叙述中的“我”，不再作为另一个人出现。留给玩家选择，不添加动作、心理、关系、回忆、门扇开合、环境或时间事实；不列陈设和衣饰清单，不用同义句反复盘点，不解释“我知道哪些事实”。材料不足就自然收短，别填空话。',
].join('\n');
// Shared by the fresh full prompt and the optional, read-only tail writer.
export const NOVEL_ROUND_PROSE_EDITOR = '旁白用第一人称留住这一刻最具体的一处变化或眼前细节。固定对白已让读者亲耳听见，不再引述、换词转述或分析成纪要；只写与当下焦点有关的少数人，不点名排队。停在真实的问题、动作或物件上，不替玩家列下一步选项。没有独立可写的已知内容就自然收短。';
export const NOVEL_NARRATION_FOCUS_EDITOR = NOVEL_NARRATION_FOCUS_V1.replace(
  '落点以最后事件之后的 sceneAfter 和已确认事实写眼前仍待观察或决定之处。',
  '收笔只用最后事件之后的 sceneAfter 和已确认事实。') + '\n' + NOVEL_ROUND_PROSE_EDITOR;
// Fresh full composition only. The optional tail has its own sparse source
// and retains its original instructions and selection rules.
export const NOVEL_ROUND_FIRST_DRAFT_EDITOR = [
  '首稿定焦（优先于通用开场与口吻建议）：从本轮真正发生的可见变化起笔。先按 eventTimeline 看清哪一件已结算的动作、抵达或可闻回应，使此刻的视野、疑问或选择和刚才不同。选最贴这一轮的一处；确有另一个有依据的转折才另起段。没有独立可写的事前观察，可以直接从固定事件起笔，不必补房间开头。',
  '把旁白放在支撑它的固定事件之后。新地点只在抵达后可写；重新看见熟人不是对方刚到，听到对方答应只意味着现场答应过，不是已经同行，也不证实她提到的第三人或传闻。可以写这种变化对眼前观察的意义，不复演动作，不引用、改述或拉长已交付的对白，不代玩家作决定。',
  '老陈设、衣饰和已经在场的人，只有这一轮的动作实际用到它、它让眼下发生的事看起来不同时，才选相关的一笔。若一句话挪到前一轮也原样成立，这里就省掉。不列房间或人物清单，不预演下一步，不加未送达的感官、动作、想法、回忆、事实或时间。收笔停在当前已经成立的情境。',
  '本轮材料允许时，新增 narration 自然段合计至少 500 汉字，不设单段配额。只计旁白，不计固定事件、对白、动作、反思或标题。材料稀少时，一段短文、有固定事件时不另加旁白都可以；不补字、不声称达标。各时点使用各自已交付的证据：sceneBefore 用于起点，sceneAfter 用于最后事件之后，中间只用相应时点的材料。完整按原顺序引用固定 eventId；只返回既有 blocks 与真实 stopReason。',
].join('\n');
// V2 replaces the short-first preference without asking for extra events.
const FULL_ROUND_LENGTH = '材料足够时，本轮可见小说旁白合计至少 500 个汉字，交稿目标 560–720 个汉字，为标点和数字留余量。只算 narration 正文，不算固定动作、对白、反思、标题或提示，不设单段字数。只在已经交付的材料不足以支持不同内容时自然收短；是否等待玩家是情节停点，不是缩短已有场面的理由。';
export const NOVEL_FULL_ROUND_FIRST_DRAFT = [
  '本轮正文（以下篇幅目标优先于通用写法和个人风格偏好）：先读完整 events 与 eventTimeline，从起点、公开转折和当前落点中选确实不同的观察焦点。材料充足时，把已经发生的场面写完整，不只写一句反应或事后提要。传达不同的信息；同一细节换说法不算新内容。',
  FULL_ROUND_LENGTH,
  '按场面自然分段：前景给一处与本轮有关的真实空间；转折从新的可见处境写远近、视野、不同事物怎样进入同一观察；收笔在真实已成立的处境及仍悬而未决的一处。没有独立开场就从事件起笔；有独立落点时不要只写一处。可以深入一处已经交付的静态细节及它在这一刻的关联，不列人物衣饰、家具或下一步菜单。用完整句和段，不写要点、摘要或创作说明。',
  '只用第一人称、当前可见可闻及相应事件前缀：在抵达前不用终点，缺中间快照不借别的时点的物态。陈述只证明话已送达，不证明内容成真。不复演或改述事件，不补动作、对白、环境、人物心事、回忆、关系或经过时间。输出前核对旁白的合计汉字与已授权材料；保留每个固定 eventId 一次、原序，只有 blocks 和真实 stopReason。',
].join('\n');
export const NOVEL_FULL_ROUND_PROSE_REPAIR = [
  '任务：只补写本轮最后一个已发生事件之后、玩家亲历的第一人称中文小说正文。返回一个裸 JSON 对象 {"paragraphs":["正文自然段"]}；不带标题、换行、空项或额外键。',
  FULL_ROUND_LENGTH,
  '已知上下文是 witnessed 里的原样可见事件；按这里实际发生的焦点选择当前值得留意的几处。它只供理解焦点，不复演、改写或摘抄任何事件。说话或笔谈只表示当时收到这些话，不证实说法。结束时的空间、人和物只按 here、focusPeople、focusObjects 及已有 passage 来写；不把前一地点的物件写到眼前，不补新动作、光线、声音、心理、回忆、位置或时间。不列房间、衣饰或下一步选择。材料少可以给短稿或空数组。',
].join('\n');
const PRESENT_SCENE_PROSE = '把这一刻写给正在经历它的我。选当下最能落笔的动作结果、声音、位置或物件，让具体细节自己说明变化。不预演接下来，不复盘已演动作，不把刚展示的发言改写成摘要或逐句分析；不反复讲所见与所知的界限。真的有一个未解处，只留对当前有用的一笔。使用各时点已交付的内容，不添动作、对白、关系、物态、他人心事或经过的时间。';
const ROUND_PROSE_CONTINUITY = 'recentScene 只用来避开上一幕已经写过的落锁、关门或站位等动作；不复演，不把里面的内容当本轮的新见闻。';
const FIXED_ROUND_EVENTS = '原样、原序各引用一次固定 eventId。旁白只写第一人称；返回 blocks 和真实 stopReason，不输出创作说明或交接套话。';
export const NOVEL_ORDINARY_FULL_DRAFT = [
  '本轮正文：按实际发生的不同焦点展开一幕，不只写结果提要。起笔不必有铺垫；真实的交付或视野变了再换段，收在当下已经发生的处境。',
  FULL_ROUND_LENGTH, PRESENT_SCENE_PROSE, ROUND_PROSE_CONTINUITY, FIXED_ROUND_EVENTS,
].join('\n');
export const NOVEL_ORDINARY_SPARSE_DRAFT = [
  '本轮正文：这是一拍短动作或一句话。把它留在这一刻；若还有一笔值得写，就写一两句简短的现场旁白。已经由固定事件完整表现的话，不必另添旁白。无最少字数。',
  PRESENT_SCENE_PROSE, ROUND_PROSE_CONTINUITY, FIXED_ROUND_EVENTS,
].join('\n');
export const NOVEL_ORDINARY_FULL_REPAIR = [
  '只补写最后固定事件之后的第一人称中文正文。返回一个裸 JSON 对象 {"paragraphs":["正文自然段"]}；不带标题、换行、空项或额外键。',
  FULL_ROUND_LENGTH, PRESENT_SCENE_PROSE,
  'witnessed 只帮助认出本轮实际焦点，不是复述材料。此刻的人、物和通路只取 here、focusPeople、focusObjects 和确有交付的 passage；不借用早先地点。',
].join('\n');
export const NOVEL_ORDINARY_SPARSE_RECOVERY = [
  '只写最后固定事件之后这一刻的简短第一人称落点；固定事件已说清时可留空。无最少字数。返回裸 JSON 对象 {"paragraphs":["正文自然段"]}；没有旁白用空数组。不加标题、换行或额外键。',
  PRESENT_SCENE_PROSE,
].join('\n');
export const NOVEL_ORDINARY_EDITORIAL_REPAIR = '这是同一场景的一次轻修。editorialDraft 是已经验证的上一稿，不是新证据；只整理其中空转的解释或挨着对白的逐句复述，留下实在的观察，和这一刻确有必要的不确定性。保留其他段落的时点、固定事件原序和原 stopReason。短场去掉重复后可以更短。输出原有 blocks/stopReason，不增加事实、动作或台词。';

export const NOVEL_FOCUSED_ROUND_PROSE_REPAIR = [
  '任务：只补写本轮最后一个已发生事件之后、玩家亲历的第一人称中文小说正文。返回一个裸 JSON 对象 {"paragraphs":["正文自然段"]}；每项是自然段，无标题、换行、空项或额外键。材料允许时正文合计至少 500 汉字，不设单段配额；信息有限可交短稿或空数组。',
  NOVEL_ROUND_PROSE_EDITOR,
  '只用 here 中当前场景、focusPeople 和 focusObjects 中少量公开可见材质，以及确有交付的 passage。eventId 仅标识已发生的焦点，台词和动作由宿主保留；不要猜它们说过什么、证明了什么。物件的已知位置不是触碰、持有变化或新行动。没有交付的开合、光线、声音、心理、回忆、位置或时间都不补。玩家始终是“我”，不另写同场的一个人。',
].join('\n');

// The full frozen packet remains the only source for validation. The optional
// tail writer receives only a subset of the already-delivered end snapshot.
export function focusedRoundProseSource(data) {
  const scene = data.sceneAfter, before = data.sceneBefore;
  const labels = new Set((scene.nearby ?? []).map(row => row.label));
  const focusPeople = [];
  for (const event of [...data.events].reverse()) {
    if (!['action', 'speech', 'writing'].includes(event.delivery) || !labels.has(event.speaker)
      || focusPeople.some(row => row.label === event.speaker)) continue;
    focusPeople.push({ label: event.speaker, eventId: event.id });
    if (focusPeople.length === 2) break;
  }
  const objectProjection = view => (view.objects ?? []).map(({ id, name, placement }) => ({ id, name,
    placement: view.physicalFacts?.objects?.find(object => object.id === id && object.name === name)?.placement ?? placement }));
  const earlier = new Map(objectProjection(before).map(({ id, name, placement }) => [id ?? name, placement]));
  const focusObjects = objectProjection(scene).map(({ id, name, placement }) => ({ name, placement,
    changed: !earlier.has(id ?? name) || earlier.get(id ?? name) !== placement }))
    .sort((a, b) => Number(b.changed) - Number(a.changed)).slice(0, 2).map(({ name, placement }) => ({ name, placement }));
  const door = scene.physicalFacts?.door;
  return { here: scene.description, focusPeople, focusObjects,
    ...(door?.passage === 'passable' && door.view === 'visible' ? { passage: '眼前的通路可走。' } : {}) };
}

const menuAction = '(?:(?:先|再|接着|接著|继续|繼續)\\s*)?(?:回应|回應|回答|询问|詢問|追问|追問|开口|開口|请|請|跟上|跟过去|跟過去|去找|去查看)';
const explicitNextActionMenu = new RegExp(`(?:^|[。！？!?；;])\\s*(?:现在|現在|此刻|眼下|接下来|接下來)\\s*(?:我\\s*)?可以\\s*${menuAction}[^。！？!?；;]{0,160}[，,、]\\s*(?:我\\s*)?也可以\\s*${menuAction}`, 'u');

// Conservative chooser, never a fact guard or a reason to retry. A name or
// the word 可以 alone is not a style issue, and fresh arrivals are not a roster.
export function roundProseEditorialIssue(candidate, data) {
  const labelsBefore = new Set((data.sceneBefore?.nearby ?? []).map(row => row.label));
  const staticLabels = [...new Set((data.sceneAfter?.nearby ?? []).map(row => row.label))]
    .filter(label => typeof label === 'string' && label.length >= 2 && labelsBefore.has(label));
  const threshold = Math.max(8, Math.ceil(staticLabels.length * 0.8));
  for (const block of candidate.blocks) {
    if (block.type !== 'narration') continue;
    const { text } = block;
    if (staticLabels.length >= threshold) {
      const hits = staticLabels.map(label => ({ start: text.indexOf(label), length: label.length }))
        .filter(hit => hit.start >= 0).sort((a, b) => a.start - b.start);
      let run = 0, end = -1;
      for (const hit of hits) {
        run = end >= 0 && hit.start > end && /^[\s、，,和及与與]+$/u.test(text.slice(end, hit.start)) ? run + 1 : 1;
        if (run >= threshold) return 'static-roster';
        end = hit.start + hit.length;
      }
    }
    if (explicitNextActionMenu.test(text)) return 'next-action-menu';
  }
  return null;
}

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

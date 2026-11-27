import { isProxy } from 'node:util/types';
import { containsMetaLanguage } from '../agents/story-language.mjs';
import { sceneStyleIssues } from '../agents/narrative-style.mjs';

export const SCENE_BUDGET = Object.freeze({ minHan: 1000, targetHan: 1600, maxHan: 2500, maxBlocks: 32, maxNarrationChars: 6000, maxBlockChars: 1200 });
export const SCENE_STOP_REASONS = Object.freeze(['action_complete', 'await_player', 'material_limit']);
const fail = () => { throw Object.assign(new Error('场景正文或事件引用不符合执行契约。'), { code: 'INVALID_NARRATIVE_OUTPUT' }); };
const plain = value => value !== null && typeof value === 'object' && !isProxy(value)
  && [Object.prototype, null].includes(Object.getPrototypeOf(value));
function exact(value, fields) {
  if (!plain(value) || Reflect.ownKeys(value).length !== fields.length || fields.some(key => !Object.hasOwn(value, key))
    || Reflect.ownKeys(value).some(key => !fields.includes(key)
      || !Object.getOwnPropertyDescriptor(value, key).enumerable
      || !Object.hasOwn(Object.getOwnPropertyDescriptor(value, key), 'value'))) fail();
}
function prose(value, max) {
  if (typeof value !== 'string' || !value.trim() || value.length > max
    || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f<>]/u.test(value)) fail();
}
function array(value, max) {
  if (!Array.isArray(value) || isProxy(value) || Object.getPrototypeOf(value) !== Array.prototype || value.length > max
    || Reflect.ownKeys(value).length !== value.length + 1) fail();
  for (let index = 0; index < value.length; index++) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (!descriptor?.enumerable || !Object.hasOwn(descriptor, 'value')) fail();
  }
}
export const countHan = text => typeof text === 'string' ? (text.match(/\p{Script=Han}/gu) || []).length : 0;

/** Host-delivered, player-visible canonical events only. No private decisions,
 * actor memory, database handles or observation authority enter the writer. */
export function validateSceneEvents(events) {
  array(events, 32);
  if (!events.length) fail();
  const ids = new Set();
  for (const event of events) {
    exact(event, ['id', 'speaker', 'delivery', 'text']);
    if (typeof event.id !== 'string' || !/^event-[1-9]\d?$/u.test(event.id) || ids.has(event.id)) fail();
    ids.add(event.id); prose(event.speaker, 256); prose(event.text, 4000);
    if (!['action', 'speech', 'writing', 'reading'].includes(event.delivery)) fail();
  }
  return events;
}

/** Host-settled custom prelude events are not model-selectable. Add their
 * event blocks deterministically before strict document validation, so a
 * composer omission cannot fail the act; the strict contract remains intact
 * for every non-custom block and event order. */
export function mergeHostSceneEvents(output, hostEventIds, eventOrder) {
  if (!hostEventIds?.length || !output || typeof output !== 'object' || !Array.isArray(output.blocks)
    || typeof output.stopReason !== 'string') return output;
  const ids = new Set(hostEventIds);
  const blocks = output.blocks.filter(block => !(block?.type === 'event' && ids.has(block.eventId)));
  if (!eventOrder?.length) {
    return { ...output, blocks: [...hostEventIds.map(eventId => ({ type: 'event', eventId })), ...blocks] };
  }
  // Host-settled events can occur after composer-visible events (for example a
  // real physical action at its true beat position). Insert each host block
  // after the last existing event that precedes it in the canonical event
  // order, while preserving every existing narration and event block.
  const rank = new Map(eventOrder.map((id, index) => [id, index]));
  const ordered = [...new Set(hostEventIds)].filter(id => rank.has(id))
    .sort((left, right) => rank.get(left) - rank.get(right));
  const inserts = new Map();
  for (const id of ordered) {
    const targetRank = rank.get(id); let after = -1;
    for (let index = 0; index < blocks.length; index++) {
      const eventId = blocks[index]?.type === 'event' ? blocks[index].eventId : undefined;
      const blockRank = eventId === undefined ? undefined : rank.get(eventId);
      if (blockRank !== undefined && blockRank < targetRank) after = index;
    }
    if (!inserts.has(after)) inserts.set(after, []);
    inserts.get(after).push({ type: 'event', eventId: id });
  }
  const merged = [...(inserts.get(-1) || [])];
  for (let index = 0; index < blocks.length; index++) {
    merged.push(blocks[index]);
    if (inserts.has(index)) merged.push(...inserts.get(index));
  }
  return { ...output, blocks: merged };
}

/** A document can place atmosphere around events, but cannot create, omit,
 * reorder or rewrite any event. Semantic truth of atmospheric prose still
 * requires qualitative evaluation; these checks do not pretend to prove it. */
export const NOVEL_MIN_PARAGRAPH_HAN = 500;
export const NOVEL_MIN_ROUND_HAN = 500;
// Keep this paragraph boundary in sync with the novel reader in public/app.js.
const narrationBreak = /(?:\r?\n)[\t ]*(?:\r?\n)(?:[\t ]*\r?\n)*/u;
export const sceneNarrationParagraphs = text => text.split(narrationBreak).filter(part => part.trim());

export function validateSceneDocument(output, events, { narrationPacingVersion, hostOmittedNarration = false } = {}) {
  if (![undefined, 1, 2, 3].includes(narrationPacingVersion) || hostOmittedNarration && narrationPacingVersion !== 2) fail();
  const allowMissingNarration = hostOmittedNarration || narrationPacingVersion === 3;
  validateSceneEvents(events);
  exact(output, ['blocks', 'stopReason']);
  if (!SCENE_STOP_REASONS.includes(output.stopReason)) fail();
  array(output.blocks, SCENE_BUDGET.maxBlocks);
  if (!output.blocks.length) fail();
  let eventIndex = 0; let narrationChars = 0; let narrationCount = 0;
  const blocksSeen = new Set();
  const blocks = output.blocks.map(block => {
    if (!plain(block)) fail();
    if (Object.getOwnPropertyDescriptor(block, 'type')?.value === 'event') {
      exact(block, ['type', 'eventId']);
      if (block.eventId !== events[eventIndex]?.id) fail();
      eventIndex++;
      return Object.freeze({ type: 'event', eventId: block.eventId });
    }
    exact(block, ['type', 'text']);
    if (block.type !== 'narration') fail();
    prose(block.text, SCENE_BUDGET.maxBlockChars);
    if (containsMetaLanguage(block.text) || /[「」“”"]/u.test(block.text)) fail();
    if (narrationPacingVersion === 2 && sceneNarrationParagraphs(block.text).some(text => countHan(text) < NOVEL_MIN_PARAGRAPH_HAN)) fail();
    // Exact repeated paragraphs are mechanical filler, not new scene content.
    const paragraphs = block.text.split(/\n\s*\n/u).map(text => text.trim()).filter(Boolean);
    for (const text of paragraphs) if (text.length > 24) {
      if (blocksSeen.has(text)) fail();
      blocksSeen.add(text);
    }
    if (events.some(event => event.text.length > 16 && block.text.includes(event.text))) fail();
    narrationChars += block.text.length; narrationCount++;
    if (narrationChars > SCENE_BUDGET.maxNarrationChars) fail();
    return Object.freeze({ type: 'narration', text: block.text });
  });
  if (eventIndex !== events.length || !narrationCount && !allowMissingNarration) fail();
  return Object.freeze({ blocks: Object.freeze(blocks), stopReason: output.stopReason });
}

export function sceneParagraphFeedback(candidate, events) {
  const document = validateSceneDocument(candidate, events);
  const paragraphs = document.blocks.flatMap((block, blockIndex) => block.type !== 'narration' ? []
    : sceneNarrationParagraphs(block.text).map((text, index) => ({ block: blockIndex + 1, paragraph: index + 1, han: countHan(text) }))
      .filter(row => row.han < NOVEL_MIN_PARAGRAPH_HAN));
  return paragraphs.length ? { minimumHan: NOVEL_MIN_PARAGRAPH_HAN, paragraphs } : null;
}

export function sceneRoundFeedback(candidate, events) {
  const document = validateSceneDocument(candidate, events, { narrationPacingVersion: 3 });
  const actualHan = document.blocks.reduce((sum, block) => sum + (block.type === 'narration' ? countHan(block.text) : 0), 0);
  return actualHan < NOVEL_MIN_ROUND_HAN ? { minimumHan: NOVEL_MIN_ROUND_HAN, actualHan } : null;
}

// Only after the bounded repair opportunity: keep genuinely qualified prose,
// omit the rest and leave every canonical event unchanged and in sequence.
export function projectQualifiedSceneDocument(candidate, events) {
  const source = validateSceneDocument(candidate, events);
  let omittedParagraphs = 0;
  const blocks = source.blocks.flatMap(block => {
    if (block.type !== 'narration') return [block];
    const paragraphs = sceneNarrationParagraphs(block.text);
    const keep = paragraphs.filter(text => countHan(text) >= NOVEL_MIN_PARAGRAPH_HAN);
    omittedParagraphs += paragraphs.length - keep.length;
    if (keep.length === paragraphs.length) return [block];
    return keep.length ? [{ type: 'narration', text: keep.join('\n\n') }] : [];
  });
  const document = validateSceneDocument({ ...source, blocks }, events, { narrationPacingVersion: 2, hostOmittedNarration: omittedParagraphs > 0 });
  return { document, omittedParagraphs };
}

export function sceneDocumentText(document, events, paragraphPolicy) {
  const validated = validateSceneDocument(document, events, paragraphPolicy);
  const byId = new Map(events.map(event => [event.id, event.text]));
  return validated.blocks.map(block => block.type === 'event' ? byId.get(block.eventId) : block.text).join('\n\n');
}
export function sceneStyleFeedback(document, { antiClicheVersion } = {}) {
  const issues = sceneStyleIssues(document, { antiClicheVersion });
  if (!issues.length) return null;
  const rules = [...new Set(issues.map(issue => issue.ruleId))];
  return Object.freeze({
    ruleIds: Object.freeze(rules),
    instruction: '仅改写叙述层的模板化表达，保留相同事件、事实、视角和篇幅；不要改写事件块，不要新增对白或结果。',
  });
}

export function sceneSummary(entries, stopReason, { outputContractVersion } = {}) {
  if (!SCENE_STOP_REASONS.includes(stopReason) || outputContractVersion !== undefined && outputContractVersion !== 1) fail();
  const hanCount = entries.reduce((sum, entry) => sum + countHan(entry.text), 0);
  const displayChars = entries.reduce((sum, entry) => sum + Array.from(entry.text).length, 0);
  const lengthStatus = hanCount < (outputContractVersion === 1 ? 0 : SCENE_BUDGET.minHan) ? 'short' : hanCount > SCENE_BUDGET.maxHan ? 'long' : 'in_range';
  return { version: 1, ...(outputContractVersion === 1 ? { outputContractVersion: 1 } : {}), hanCount, displayChars, blockCount: entries.length, lengthStatus, stopReason,
    ...(lengthStatus === 'in_range' ? {} : { lengthException: lengthStatus === 'long' ? 'composition_budget'
      : stopReason === 'await_player' ? 'needs_player' : stopReason === 'material_limit' ? 'material_limit' : 'composition_budget' }) };
}
export function sceneNeedsRepair(document, events, { style = false, outputContractVersion, antiClicheVersion, narrationPacingVersion } = {}) {
  if (outputContractVersion !== undefined && outputContractVersion !== 1) fail();
  const summary = sceneSummary([{ text: sceneDocumentText(document, events,
    narrationPacingVersion === 3 ? { narrationPacingVersion: 3 } : undefined) }], document.stopReason);
  // Style requests are explicitly version-gated by the caller. The old contract
  // remains length-only so pending and historical jobs keep their semantics.
  const styleHits = style ? sceneStyleIssues(document, { antiClicheVersion }) : [];
  const styleRisk = styleHits.some(hit => hit.confidence === 'high' || hit.confidence === 'revise')
    || styleHits.filter(hit => ['not-is-comparison', 'reverse-not-is'].includes(hit.ruleId)).length >= 2;
  // At most one explicitly-budgeted composition repair, never resimulate an NPC
  // or retry a failed provider call. Agency/material stops are valid short scenes.
  return (styleRisk || summary.lengthStatus === 'long' || (outputContractVersion !== 1 && summary.lengthStatus === 'short' && document.stopReason === 'action_complete'))
    && events.reduce((sum, event) => sum + countHan(event.text), 0) <= SCENE_BUDGET.maxHan;
}

const roomFocus = Object.freeze({
  court: ['环形席位与中央展示位置之间的空间', '当前在场者的可见手势、站位、沉默与声音的距离'],
  hall: ['清扫工具柜、登记架与通路之间的相对位置', '只描写当前确实可见的表面，不从气氛推导物证'],
  cafeteria: ['长桌、取餐台与厨房方向的通路', '当前在场者之间的距离和已发生动作的回声'],
  kitchen: ['操作台与水果篮之间的空间', '当前已经看见的物品表面，不擅自发现尚未检查的细节'],
  courtyard: ['石径从洋馆延伸向树林与湖边的距离', '沿已开放通路可见的景物，不增加岔路或场外人物'],
  lake: ['湖水、岸边草叶与湿润泥地的相对位置', '水面和岸边的光影，不以环境描写创造新线索'],
  infirmary: ['病床与笔记用品之间的距离', '当前在场者的可见动作，不推断身体状态或治疗效果'],
  cell04: ['已经映入眼帘的涂绘表面、牢门与房内空间', '只围绕实际交付的现场记录，不自行鉴定或补出痕迹'],
});
/** Stable authored palette: suggestions about already-known surfaces, not new
 * clues, entities or fixtures. In particular a fireplace is not presumed lit. */
export function sceneAuthorizedPalette(scene) {
  // New composers see exact already-authorized surfaces, not a room-name
  // palette that guesses furniture, illumination, possession or active state.
  return { focus: [scene?.description, ...(scene?.objects || []).map(row => `${row.placement || ''}：${row.name || ''}`),
    ...(scene?.nearby || []).map(row => row.appearance)].filter(value => typeof value === 'string' && value.trim()),
  limits: ['只使用这份稀疏可见快照，不补齐未交付物品、光照、温度或身体状态',
    '静态存在不代表正在使用、燃烧、亮屏或由本人持有；台词、旧旁白和私有判断不补事实'] };
}

export function scenePalette(roomId) {
  if (Object.hasOwn(roomFocus, roomId)) return { focus: [...roomFocus[roomId]],
    limits: ['不新增物件、线索、场外见闻、对白或未经裁决的行动', '不把其他人的私有记忆、动机或判断写成可观察事实'] };
  if (roomId === 'corridor') return {
    focus: ['石砌通道的纵深、脚步与回声的距离', '牢门与相邻通路形成的空间边界', '同行者之间可观察的步伐与间距'],
    limits: ['不新增窗户、看守、岔路或可拾取物', '不把邻近房间内部与场外对白写成已看见或听清'],
  };
  if (roomId === 'reception') return {
    focus: ['已有桌椅与壁炉构成的空间层次', '从入口看向室内时的远近与遮挡', '只描写确实在场者的可见动作与相互距离'],
    limits: ['壁炉的存在不证明正在燃烧', '不新增装饰、工具、线索或自动到场的人物'],
  };
  return {
    focus: ['石墙的材质与双层床、铁栏之间的相对空间', '铁栅栏把室内与通道分隔开的距离感', '已有显示屏的明暗只能依据当前裁决', '人物囚服、手势、站位与沉默形成的可见张力'],
    limits: ['不新增窗户、纸笔、钥匙、血迹、刻痕或隐藏出口', '不反复观察就产生新线索', '不擅写其他角色内心、过往秘密或关系改善'],
  };
}

/** New-task-only identity overlay. Labels and appearance remain separate host
 * fields; it never renames canonical events or rewrites legacy first-person
 * actions. The host must project knowledge at the event's actual point in time. */
export function sceneIdentityGuidance(version) {
  if (version !== 1) fail();
  return [
    '人物身份编排版本1：sceneBefore/sceneAfter.nearby 中的 label 是该时点玩家已知的称呼，appearance 仅是独立外观参考，不是姓名。优先用当前已知姓名或简短称呼组织行文，适量选取与本刻有关的外观细节，不每次重播整段造型。',
    '相识时序：介绍前不提前使用尚未交付的真名；介绍当句仍引用固定事件，从介绍实际发生之后再依据该时点已交付的称呼描写。不得从外观、角色ID或场外信息推导姓名。',
    '视角归属：叙述中的“我”只属于当前玩家，NPC动作用“她／他／已交付姓名”。NPC在对白中说“我”仍是她本人的原话。每条event始终原样引用，禁止把任何旧事件中的“我”全局替换成姓名。',
    '衣着、帽饰、随身物与站位逐人归属，仅使用已交付外观和既定事件，不挪用另一人的刺剑、铁球、帽子或素描本。观察别人持物不等于本人拿着；不为修正行文而新增物品转移、动作、关系或其他结果。',
    '事件动作只由对应事件呈现一次，不在叙述块中重演同一手势或把动作补给另一个人；只补充该时点允许的感官衔接。',
  ].join('\n');
}

export const SCENE_COMPOSER_POLICY_CORRECTION = [
  'Additional host policy for this existing sealed composer task:',
  'The player character is always 我: a player event speaker label, even their own displayed name, is attribution only and never a separate bystander or NPC. Never name, describe or refer to the player character in the third person.',
  'Do not repeat, quote, or paraphrase an event\'s action or speech in narration, including short fragments; refer to delivered speech only as an audible response without reproducing its words.',
  'Never use any quotation marks in narration, including 「」, “”, or ", even around a single emphasized word; all spoken/written words must use canonical event blocks.',
].join('\n');

export function sceneComposerInstructions(outputContractVersion, legacyPolicy = false) {
  if (outputContractVersion === undefined) return SCENE_COMPOSER_INSTRUCTIONS;
  if (outputContractVersion !== 1) fail();
  // Select the fixed new-task variant; do not ship contradictory old minimum
  // requirements and rely on the model to resolve them. Legacy bytes stay exact.
  const instructions = SCENE_COMPOSER_INSTRUCTIONS.split('\n')
    .filter(line => !line.startsWith('The TOTAL delivered body'))
    .map(line => line.replace('Use 4-10 purposeful narration blocks', 'Use only as many purposeful narration blocks as the supplied material supports')
      .replace('to the minimum would require', 'would require')
      .replace('The host records length exceptions separately.', 'There is no minimum length.'));
  // A pending task may carry a seal over the pre-117 variant. Rebuild that
  // exact base for seal verification, then append the fixed correction; never
  // rewrite the stored seal or silently apply the new base under it.
  if (legacyPolicy) return instructions.join('\n');
  return instructions.map(line => line.startsWith('Write one coherent Chinese scene')
    ? line.replace('Your output is a reading document', 'The player character is always 我: a player event speaker label, even their own displayed name, is attribution only and never a separate bystander or NPC. Never name, describe or refer to the player character in the third person. Your output is a reading document')
    : line.startsWith('Narration may describe')
      ? line.replace('Do not repeat an event\'s action or speech as a second narration of the same act. Never add quoted speech: ALL spoken/written words must use canonical event blocks.',
        'Do not repeat, quote, or paraphrase an event\'s action or speech in narration, including short fragments; refer to delivered speech only as an audible response without reproducing its words. Never use any quotation marks in narration, including 「」, “”, or ", even around a single emphasized word, and never add quoted speech: ALL spoken/written words must use canonical event blocks.')
      : line)
    .join('\n');
}

export const SCENE_COMPOSER_INSTRUCTIONS = [
  'Write one coherent Chinese scene from HOST-RESOLVED, PLAYER-VISIBLE events, anchored in the player character\'s subjective first-person perspective (use 我 or close subjective sensory framing; NEVER use second-person 你 to address the player character). Your output is a reading document, NEVER a new simulation, decision, dialogue or world mutation.',
  'Return exactly {"blocks":[{"type":"narration","text":"..."},{"type":"event","eventId":"event-1"}],"stopReason":"action_complete|await_player|material_limit"}. No other fields. Use 4-10 purposeful narration blocks woven around ALL events, EACH EXACTLY ONCE and IN THE GIVEN ORDER. Each narration block is at most 1200 characters and total narration at most 6000 characters. Event blocks contain only type and eventId, never rewritten text.',
  'The TOTAL delivered body (narration PLUS the canonical event texts, counted once) should be about 1000-2500 Chinese Han characters, target 1600. Planning, JSON, punctuation and UI input echo do not count. This is NOT a target for any one character. You have an independent output budget; do not reuse the legacy short-narrator style.',
  'Arrange a scene opening, the chosen action, the direct response, visible spatial/behavioral consequences, a deepening of the SAME moment, and a natural handoff. These are prose beats, not permission to invent subsequent exchanges. Curt characters remain curt; their words already exist in events.',
  'Narration may describe sensory framing, observable detail, and the player character\'s immediate perceptual/situational impressions consistent with sceneBefore, sceneAfter, palette and resolution. Before an event, do not describe its result as already completed. Do not repeat an event\'s action or speech as a second narration of the same act. Never add quoted speech: ALL spoken/written words must use canonical event blocks.',
  'Evidence timing is strict: sceneBefore applies initially; an action or speech delivery can be framed only after its event block. Speech delivery proves that the speaker voiced words (a screen-delivered warden speech is an audible broadcast), NEVER that the claims in those words came true. sceneAfter and resolution.facts (such as room arrival or lock release) apply ONLY in narration blocks placed AFTER the final event block—never anticipate arrival, crossing the doorway, or broadcast connection before the corresponding event block. doorOpen means the current local lock is released/passable, not that an actor pushed a door or opened another room. Prefer a short material_limit scene over padding sparse events to the target.',
  'Only authorized player actions may occur. No extra questions, agreements, unchosen decisions, following beyond the approved adjacent step, romance, trust or reconciliation. Do not speak for NPCs or assert other actors\' private thoughts. Use delivered appearance labels, not unknown real names.',
  'No new objects, clues, injuries, magic, locks, visitors, broadcasts, off-screen scenes or unapproved world facts. No causal function can be attached to atmospheric detail. Word count never advances the world clock. Preserve every canonical event and its point in time.',
  'Write concrete, affirmative Chinese prose centered on the present scene. Describe what is there, what happens, and what can be sensed; express limits through a visible obstacle or pause rather than repeated lists of what does not happen. Keep source attribution, research notes and implementation commentary in development records. Use purposeful, distinct paragraphs rather than padding or recapping the prior scene. End at the present opportunity for player action.',
  'Choose await_player when further progress requires a fresh player answer/choice; material_limit when extending this moment to the minimum would require repetition or invented events. Such shorter scenes are allowed; never fill them by taking control of the player. Otherwise choose action_complete. The host records length exceptions separately.',
  'If compositionFeedback is present, this is the ONE budgeted repair. Recompose only the reading document around the SAME fixed events. Do not reroll decisions, invent more facts, or truncate canonical speech to meet length. repairSource is a previous draft, not new event evidence.',
  'No Markdown fences, analysis, system disclaimers, Agent/LLM/model/prompt/test terminology, HTML or commentary outside JSON.',
].join('\n');

/** The reading layer when the Host, not the composer model, owns presentation.
 * It is not a model result: every canonical public event is preserved verbatim
 * in order, and the only narration is a fixed, fact-free handoff. */
export const HOST_SCENE_HANDOFF = '接下来，该由我决定怎么做了。';
export function hostSceneDocument(events) {
  return validateSceneDocument({
    blocks: [...events.map(event => ({ type: 'event', eventId: event.id })),
      { type: 'narration', text: HOST_SCENE_HANDOFF }],
    stopReason: 'await_player',
  }, events);
}

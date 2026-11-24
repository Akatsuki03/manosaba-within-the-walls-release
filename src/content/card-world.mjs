import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { AGENT_CONTENT_PACKAGE } from './agent-scenario.mjs';
import { runtimeRevisionForState } from './content-revisions.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
const freeze = value => {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
};
// A separate, pinned content revision. Never change the historical scenario
// manifest/hash: old scenes, tasks, receipts and domain anchors still bind it.
export const CARD_SOURCE_SHA256 = 'c0362726876ab500b6bb474b356003081a0406d82fd3b26fc1cacbc23de0d4c6';
const bytes = readFileSync(new URL('../../data/card-source.json', import.meta.url));
if (hash(bytes) !== CARD_SOURCE_SHA256) throw new TypeError('原卡版本改变，请先审核开场与世界资料。');
const card = JSON.parse(bytes.toString('utf8')).data;
export const cardEntryReference = index => {
  const entry = card.character_book.entries[index];
  return freeze({ pointer: `/data/character_book/entries/${index}/content`, entryId: entry.id,
    label: entry.comment, enabled: entry.enabled, constant: entry.constant, selective: entry.selective,
    sha256: hash(entry.content) });
};

// Full substantive setting/rule entries, including superseded and disabled
// versions, were reviewed. Enabled is provenance, NOT an instruction to execute
// the card's macros, coercive plot directives, HTML, COT or numeric extensions.
const WORLD_ENTRY_INDICES = [0, 1, 2, 12, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 28, 29, 30, 31, 32, 33, 34, 35, 37, 38, 40, 45, 50, 51, 52, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79];
export const CARD_WORLD_REVIEW = freeze(WORLD_ENTRY_INDICES.map(cardEntryReference));
export const CARD_FRONTEND_EXCLUSION = freeze({ pointer: '/data/first_mes', sha256: hash(card.first_mes),
  reason: '这是防剧透黑条的 HTML/CSS 安装说明，不是剧情开场；不执行、不渲染，也不发给模型。' });

const FIRST_SPEAKERS = ['emma', 'emma', 'emma', 'emma', 'hanna', 'coco', 'alisa', 'hiro', 'hiro', 'hiro', 'emma', 'hiro', 'emma', 'warden', 'emma', 'emma', 'emma', 'coco', 'hiro', 'hiro', 'emma', 'emma', 'emma', 'emma', 'hiro', 'emma'];
const SECOND_SPEAKERS = ['hiro', 'hiro', null, 'hiro', 'emma', 'emma', 'hiro', 'hiro', 'hiro', 'warden', 'emma', 'emma', 'coco', 'emma', 'emma', 'hiro', 'emma', 'hiro', 'hiro', 'emma', 'emma'];
const firstCorridor = '艾玛马上跟在希罗身后，来到过道上。';
const secondCorridor = '“呀啊啊啊！怪物别碰我！好恶心！好了，好了啦，我走就是！！”我看到泽渡可可';

/** Lossless source spans, not a model conversion. Every quote has an audited
 * owner; quoted terminology (自杀) remains narration. Images are inert source
 * spans and never fetched. Rejoining sourceText reproduces every original byte
 * of decoded text, including CRLF, punctuation and repeated lines. */
function compileGreeting(index, owners) {
  const source = card.alternate_greetings[index];
  const blocks = []; let cursor = 0; let quoteIndex = 0;
  const corridorAt = source.indexOf(index === 2 ? secondCorridor : firstCorridor);
  const awakeAt = source.indexOf(index === 2 ? '——我眨眨眼' : '“不对！”');
  const add = (start, end, kind, speakerId = null) => {
    if (end <= start) return;
    const sourceText = source.slice(start, end);
    const memory = end <= awakeAt;
    const text = kind === 'image' ? '' : (kind === 'dialogue' ? sourceText.slice(1, -1) : sourceText).replace(/\*/gu, '').trim();
    blocks.push({ start, end, sourceText, kind, speakerId, text, memory,
      stage: start >= corridorAt ? 'corridor' : 'cell' });
  };
  for (const match of source.matchAll(/<img\b[^>]*>|“[^”]*”/gu)) {
    add(cursor, match.index, 'narration');
    if (match[0].startsWith('<img')) add(match.index, match.index + match[0].length, 'image');
    else {
      if (quoteIndex >= owners.length) throw new TypeError('原卡对白数量改变。');
      const owner = owners[quoteIndex++];
      add(match.index, match.index + match[0].length, owner ? 'dialogue' : 'narration', owner);
    }
    cursor = match.index + match[0].length;
  }
  add(cursor, source.length, 'narration');
  if (quoteIndex !== owners.length || corridorAt < 0 || awakeAt < 0 || blocks.map(block => block.sourceText).join('') !== source) throw new TypeError('原卡开场分段不完整。');
  return freeze({ id: ['card-first', 'card-other-cell', 'card-second'][index], index,
    source: { pointer: `/data/alternate_greetings/${index}`, sha256: hash(source) }, blocks });
}
export const CARD_OPENINGS = freeze([compileGreeting(0, FIRST_SPEAKERS), compileGreeting(1, FIRST_SPEAKERS), compileGreeting(2, SECOND_SPEAKERS)]);
export const cardOpening = id => CARD_OPENINGS.find(opening => opening.id === id);
export const CARD_ASSEMBLY_TEXT = CARD_OPENINGS[0].blocks.find(block => block.speakerId === 'warden').text;
export const CARD_SECOND_ASSEMBLY_TEXT = CARD_OPENINGS[2].blocks.find(block => block.speakerId === 'warden').text;

export const OPENING_CHOICES = freeze([
  { id: 'auto', name: '依周目与身份选择', loops: [1, 2], playerModes: ['original', 'custom'], description: '艾玛与希罗在牢房中迎来清晨；其他少女从自己的牢房醒来。第二周目以希罗的回忆开启。自填开场优先。' },
  { id: 'card-first', name: '一周目 · 艾玛与希罗', loops: [1], actorIds: ['emma'], playerModes: ['original'], description: '艾玛从梦中惊醒，与上铺的希罗交谈，随后收到典狱长的集合通知。' },
  { id: 'card-other-cell', name: '同一清晨 · 另一间牢房', loops: [1, 2], playerModes: ['original', 'custom'], description: '陌生的石墙、囚服与铁门。你在自己的牢房里迎来监牢的第一个清晨。' },
  { id: 'card-second', name: '二周目 · 希罗的回溯清晨', loops: [2], actorIds: ['hiro'], playerModes: ['original'], description: '希罗带着上一轮的记忆，再次睁开眼睛。上铺依旧冰冷，艾玛就在眼前。' },
]);
export function selectedCardOpening(creation) {
  if (!creation || creation.cellSetup || !creation.openingId || creation.opening?.text) return null;
  const id = creation.openingId === 'auto'
    ? creation.playerMode === 'original' && creation.loop === 1 && creation.actorId === 'emma' ? 'card-first'
      : creation.playerMode === 'original' && creation.loop === 2 && creation.actorId === 'hiro' ? 'card-second' : 'card-other-cell'
    : creation.openingId;
  const choice = OPENING_CHOICES.find(choice => choice.id === id);
  if (!choice || !choice.loops.includes(creation.loop) || !choice.playerModes.includes(creation.playerMode)
    || (choice.actorIds && !choice.actorIds.includes(creation.actorId))) throw Object.assign(new Error('所选开场不适用于当前身份或周目。'), { code: 'INVALID_CREATION' });
  return cardOpening(id);
}

export const PRISON_WORLD_HASH = AGENT_CONTENT_PACKAGE.manifest.sources.find(source => source.file === 'data/prison-world.json').sha256;
export const PRISON_WORLD_DATA = AGENT_CONTENT_PACKAGE.host.world;
export const PRISON_WORLD_REF = 'card-prison-world@1';
// Keep the historical simulation hash and private provenance above immutable.
// The phone publishes only in-world copy, separately from implementation notes.
const publicRules = AGENT_CONTENT_PACKAGE.host.publicRules;
export function prisonRulebook(state) {
  const rules = state === undefined ? publicRules : runtimeRevisionForState(state).content.host.publicRules;
  return rules.map(rule => ({ id: rule.id, name: rule.name,
    paragraphs: [...rule.paragraphs], text: rule.paragraphs.join('\n\n') }));
}
// The archive above is hashed into existing saves. These authored presentation
// notes carry the same observable setting and owner-local knowledge, while
// provenance, implementation diagnostics and conflicts remain in the archive.
const SURFACE_NOTES = freeze({
  'cell-surface': [
    '地下牢房沿过道排列，石墙旁摆着双层床，铁栅栏门上装有电子锁，墙上嵌着显示屏。',
    '双层床贴着石墙，显示屏装在墙面，铁门外便是地下过道。',
  ],
  'corridor-surface': [
    '地下石砌过道连接各牢房，通往一楼的楼梯位于过道一端。',
    '石墙与牢门沿着过道延伸，狭长的空间容易传来回声。',
  ],
  'reception-surface': [
    '接客室设有桌椅与壁炉，供典狱长召集囚犯、说明事项。',
    '入口通向地下过道一侧的楼梯，桌椅之间留着供人走动的空隙。',
  ],
});
const OWNER_NOTES = freeze({
  'meruru-knowledge': [
    '我在这座岛上生活了很久，知道医务室与管理设施；我隐藏身份寻找我信奉的大魔女，典狱长听从我的管理指示。这些是我自己的秘密，只留在心中。',
    '我相信自己曾被大魔女收留，并拥有救治与魔女杀手之力。这是我珍视的信仰；眼前的人与处境仍凭亲身见闻认识，救治的结果以实际变化为准。',
  ],
  'warden-knowledge': [
    '我负责公告、门锁、看守和制度管理，听从梅露露的指示；监牢里存在多个猫头鹰个体。这些管理内情留作私密知识，眼前事务以实际收到的报告和指示为准。',
  ],
});
export function worldSurfaceFacts(roomId, state) {
  const world = state === undefined ? PRISON_WORLD_DATA : runtimeRevisionForState(state).content.host.world;
  return world.facts.filter(fact => fact.access === 'surface' && fact.rooms.includes(roomId))
    .flatMap(fact => SURFACE_NOTES[fact.id] || []);
}
export function ownerWorldFacts(actorId, state) {
  const world = state === undefined ? PRISON_WORLD_DATA : runtimeRevisionForState(state).content.host.world;
  return world.facts.filter(fact => fact.access === 'owner' && fact.owners.includes(actorId))
    .flatMap(fact => OWNER_NOTES[fact.id] || []);
}

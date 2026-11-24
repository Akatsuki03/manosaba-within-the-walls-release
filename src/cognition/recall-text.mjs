// Disposable, deterministic search text only. No authority, I/O, locale-sensitive
// segmentation, model, or corpus outside the caller's authorized candidates.
const MAX_TERMS = 48;
const TRADITIONAL = new Map(Object.entries({
  書: '书', 籤: '签', 簽: '签', 還: '还', 給: '给', 撿: '捡', 會: '会', 廳: '厅', 觀: '观', 問: '问',
  詢: '询', 與: '与', 羅: '罗', 暫: '暂', 時: '时', 這: '这', 個: '个', 著: '着', 對: '对', 開: '开',
  說: '说', 誰: '谁', 檢: '检', 視: '视', 歸: '归', 來: '来', 邊: '边', 裡: '里', 處: '处', 請: '请',
  談: '谈', 藍: '蓝', 遺: '遗', 環: '环', 顧: '顾', 階: '阶', 櫻: '樱', 瑪: '玛', 鑰: '钥', 鎖: '锁',
  證: '证', 據: '据', 線: '线', 憶: '忆', 關: '关', 係: '系', 認: '认', 為: '为', 懷: '怀', 聽: '听',
  見: '见', 過: '过', 親: '亲', 牆: '墙', 門: '门', 間: '间', 筆: '笔', 紙: '纸', 寫: '写', 聲: '声',
  無: '无', 語: '语', 諾: '诺', 亞: '亚', 蓮: '莲', 寶: '宝', 葉: '叶', 遠: '远', 漢: '汉', 澤: '泽',
  療: '疗', 獄: '狱', 長: '长', 讓: '让', 別: '别', 從: '从', 後: '后', 於: '于', 願: '愿', 應: '应',
  該: '该', 幫: '帮', 獲: '获', 發: '发', 現: '现', 尋: '寻', 識: '识', 確: '确', 實: '实', 傳: '传',
  聞: '闻', 隱: '隐', 兇: '凶', 傷: '伤', 體: '体', 記: '记', 錄: '录', 託: '托', 護: '护', 丟: '丢',
}));
// Explicit domain equivalences, not open-ended thesaurus/semantic inference.
const CONCEPTS = [
  ['书写', '写字', '笔谈', '纸笔交流', '用纸笔交流', '用笔写', '纸上写字'],
  ['交谈', '聊天', '聊聊', '聊一聊', '谈话'], ['归还', '还给', '交还', '还回'],
  ['寻找', '找寻', '寻觅'], ['丢失', '遗失', '不见了'], ['信任', '信赖'],
  ['怀疑', '猜疑'], ['帮助', '帮忙', '协助'], ['线索', '蛛丝马迹'],
  ['会客厅', '会客室'], ['食堂', '餐厅'],
];
const WORDS = [
  ...CONCEPTS.flat(), '交流', '纸笔', '纸条', '纸张', '声音', '开口', '说话', '不能', '没有', '不愿', '拒绝',
  '书签', '钥匙', '门锁', '证据', '证言', '证物', '秘密', '蓝色', '红色', '背面', '正面', '名字', '主人', '物主',
  '走廊', '牢房', '房间', '厨房', '中庭', '医务室', '桌上', '桌旁', '桌边', '地面', '墙边',
  '记忆', '关系', '承诺', '约定', '合作', '保护', '确认', '目击', '听说', '亲眼', '魔法', '治疗', '伤口',
];
const STOP_WORDS = [
  '之前', '刚才', '关于', '请问', '什么', '怎么', '怎样', '为何', '为什么', '一下', '是否', '如何',
  '那个', '这个', '一些', '事情', '东西', '以及', '曾经', '已经', '我们', '你们', '他们', '她们', '自己',
  '我', '你', '他', '她', '它', '的', '了', '吗', '呢', '吧', '啊', '在', '是', '有', '和', '与', '把',
  '将', '被', '对', '向', '跟', '从', '到', '过', '说', '问', '很', '也', '还', '正', '着', '就', '这', '那', '个',
];
const CANON_ACTORS = [
  ['emma', '樱羽艾玛', '艾玛'], ['hiro', '二阶堂希罗', '希罗'], ['anan', '夏目安安', '安安'],
  ['noah', '城崎诺亚', '诺亚'], ['leia', '莲见蕾雅', '蕾雅'], ['milia', '佐伯米莉亚', '米莉亚'],
  ['margo', '宝生玛格', '玛格'], ['nanoka', '黑部奈叶香', '奈叶香'], ['alisa', '紫藤亚里沙', '亚里沙'],
  ['sherry', '橘雪莉', '雪莉'], ['hanna', '远野汉娜', '汉娜'], ['coco', '泽渡可可', '可可'],
  ['meruru', '冰上梅露露', '梅露露'], ['warden', '典狱长'],
];
const binary = (a, b) => Buffer.compare(Buffer.from(a), Buffer.from(b));
const escape = value => value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
const quote = value => `"${value.replaceAll('"', '""')}"`;
const sorted = values => [...new Set(values)].sort((a, b) => b.length - a.length || binary(a, b));
const conceptMap = new Map(CONCEPTS.flatMap(([canonical, ...aliases]) => [canonical, ...aliases].map(alias => [alias, canonical])));
const concepts = new RegExp(sorted(conceptMap.keys()).map(escape).join('|'), 'gu');
const words = sorted(WORDS.map(value => conceptMap.get(value) ?? value));
const stops = sorted(STOP_WORDS);

/** Bounded domain character folding, deliberately not a general Chinese converter. */
export function normalizeRecallText(value) {
  return [...value.normalize('NFKC').toLowerCase()].map(char => TRADITIONAL.get(char) ?? char).join('');
}

/** Public label metadata only. Colliding aliases are blocked, never first-wins.
 * Explicit extra aliases merge by actorId, never by a shared name or surname.
 * The store validates/detaches these bounded host-owned entries before calling.
 */
export function buildRecallAliases(extra = []) {
  const owners = new Map();
  const add = (actorId, alias) => {
    const key = normalizeRecallText(alias);
    if (!owners.has(key)) owners.set(key, new Set());
    owners.get(key).add(actorId);
  };
  for (const [actorId, ...aliases] of CANON_ACTORS) for (const alias of [actorId, ...aliases]) add(actorId, alias);
  for (const { actorId, aliases } of extra) for (const alias of [actorId, ...aliases]) add(actorId, alias);
  const actorIds = [...new Set([...owners.values()].flatMap(ids => [...ids]))].sort(binary);
  const tokens = new Map(actorIds.map((id, index) => [id, `\ue000${index.toString(36)}\ue001`]));
  const keys = sorted(owners.keys());
  const pattern = new RegExp(keys.map(escape).join('|'), 'gu');
  return Object.freeze({
    replace(value) {
      const actors = new Set();
      // Reserved projection delimiters cannot be forged by source/query text.
      const text = value.replace(/[\ue000\ue001]/gu, ' ').replace(pattern, (alias, offset, input) => {
        // Latin identifiers are whole ASCII words; adjacent Chinese prose is
        // allowed, but banana/hiroko must never denote anan/hiro.
        if (/^[\x00-\x7f]+$/u.test(alias)
          && (/[a-z0-9_]/u.test(input[offset - 1] ?? '') || /[a-z0-9_]/u.test(input[offset + alias.length] ?? ''))) return alias;
        const ids = owners.get(alias);
        if (ids.size !== 1) return alias; // Literal occurrence is still searchable.
        const [actorId] = ids; actors.add(actorId);
        return ` ${tokens.get(actorId)} `;
      });
      return { text: text.replace(/\s+/gu, ' ').trim(), actors };
    },
  });
}
const DEFAULT_ALIASES = buildRecallAliases();

export function projectRecallText(value, aliases = DEFAULT_ALIASES) {
  const normalized = normalizeRecallText(value);
  const { text: base, actors } = aliases.replace(normalized);
  const text = base.replace(concepts, match => conceptMap.get(match));
  const plain = text.replace(/\ue000[0-9a-z]+\ue001/gu, ' ');
  return { raw: value.toLowerCase(), normalized, base, text, plain, actors };
}

function queryGroups(plain) {
  const groups = [];
  for (const match of plain.matchAll(/[\p{Script=Han}]+|[\p{L}\p{N}_]+/gu)) {
    const run = match[0];
    if (!/^[\p{Script=Han}]+$/u.test(run)) {
      groups.push({ terms: [run], word: true });
      continue;
    }
    let unknown = '';
    const flush = () => {
      if (unknown) {
        const chars = [...unknown];
        groups.push({ terms: chars.length < 2 ? chars : [...new Set(chars.slice(1).map((char, index) => chars[index] + char))], word: false });
        unknown = '';
      }
    };
    for (let offset = 0; offset < run.length;) {
      const word = words.find(entry => run.startsWith(entry, offset));
      const stop = word ? undefined : stops.find(entry => run.startsWith(entry, offset));
      if (word || stop) {
        flush();
        if (word) groups.push({ terms: [word], word: true });
        offset += (word ?? stop).length;
      } else {
        const char = String.fromCodePoint(run.codePointAt(offset));
        unknown += char; offset += char.length;
      }
    }
    flush();
  }
  const seen = new Set();
  return groups.filter(group => { const key = group.terms.join('\0'); if (seen.has(key)) return false; seen.add(key); return true; });
}
function grams(value) {
  const result = new Set();
  for (const match of value.matchAll(/[\p{L}\p{N}]+/gu)) {
    const chars = [...match[0]];
    for (let index = 1; index < chars.length; index++) result.add(chars[index - 1] + chars[index]);
  }
  return [...result];
}

export function prepareRecallQuery(value, aliases = DEFAULT_ALIASES) {
  const projection = projectRecallText(value, aliases);
  const groups = queryGroups(projection.plain).map(group => ({ ...group,
    matchers: group.terms.map(term => /^[\x00-\x7f]+$/u.test(term)
      ? new RegExp(`(?<![\\p{L}\\p{N}_])${escape(term)}(?![\\p{L}\\p{N}_])`, 'u') : undefined),
  }));
  const terms = [...new Set(groups.flatMap(group => group.terms))];
  const short = [...value].length < 3;
  // Operator-looking input retains the old whole-literal contract. Oversized
  // expansions also degrade to literal matching, never a truncated topic.
  const expanded = !short && terms.length <= MAX_TERMS
    && !/["'`*:{}()[\];]|\b(?:AND|OR|NOT|NEAR)\b/u.test(value);
  const ftsTerms = sorted([projection.text, ...(expanded ? terms : [])].filter(term => [...term].length >= 3));
  return { ...projection, short, expanded, groups, terms, grams: grams(projection.plain),
    ftsQuery: ftsTerms.length ? ftsTerms.map(quote).join(' OR ') : undefined };
}

/** Independent lexical gate: character overlap/FTS can NEVER admit a row.
 * Every actor, explicit word, and unknown phrase must have lexical support.
 * Unknown phrases require >=2 distinct bigrams at >=2/3 coverage; one shared
 * character/common particle cannot turn an unrelated row into a candidate.
 */
export function scoreRecallText(query, document) {
  if (!query.normalized.trim()) return { eligible: false, lexical: 0, character: 0, literal: false };
  const actorsSupported = [...query.actors].every(actor => document.actors.has(actor));
  // Synthetic actor token interiors are never searchable ordinary characters.
  const base = query.actors.size ? document.base : document.base.replace(/\ue000[0-9a-z]+\ue001/gu, ' ');
  const canonical = query.actors.size ? document.text : document.plain;
  const rawLiteral = document.raw.includes(query.raw);
  const literal = actorsSupported && (rawLiteral || document.normalized.includes(query.normalized)
    || (query.base.length > 0 && base.includes(query.base)));
  if (query.short) return { eligible: literal, lexical: literal ? 1 : 0, character: 0, literal };
  const semanticLiteral = actorsSupported && query.text.length > 0 && canonical.includes(query.text);
  let supported = query.expanded && (query.groups.length > 0 || query.actors.size > 0)
    && query.groups.every(group => group.terms.every(term => [...term].length >= 2))
    && [...query.actors].every(actor => document.actors.has(actor));
  let matched = 0;
  for (const group of query.groups) {
    const hits = group.terms.filter((term, index) => group.matchers[index]
      ? group.matchers[index].test(document.plain) : document.plain.includes(term)).length;
    matched += hits;
    if (group.word ? hits !== group.terms.length
      : hits < Math.min(2, group.terms.length) || hits / group.terms.length < 2 / 3) supported = false;
  }
  const eligible = literal || (query.expanded && semanticLiteral) || supported;
  if (!eligible) return { eligible: false, lexical: 0, character: 0, literal: false };
  const coverage = query.terms.length ? matched / query.terms.length : 1;
  const lexical = (literal || semanticLiteral ? 2 : 0) + coverage;
  const character = query.grams.length
    ? query.grams.filter(gram => document.plain.includes(gram)).length / query.grams.length
      / (1 + Math.log1p(Math.max(0, document.plain.length - query.plain.length)) / 20) : 0;
  return { eligible, lexical, character, literal: literal || semanticLiteral };
}

/** Tied channel scores receive the same rank; IDs never perturb relevance.
 * Negative reciprocal-rank fusion preserves the existing lower-is-better API.
 */
export function fuseRecallRanks(rows, ftsScores = new Map()) {
  const ranks = (values, ascending = false) => new Map([...new Set(values)].sort((a, b) => ascending ? a - b : b - a).map((value, index) => [value, index + 1]));
  const lexical = ranks(rows.map(row => row.lexical));
  const character = ranks(rows.map(row => row.character));
  const fts = ranks([...ftsScores.values()], true);
  return rows.map(row => ({ ...row, score: -(0.6 / (60 + lexical.get(row.lexical))
    + 0.3 / (60 + character.get(row.character))
    + (ftsScores.has(row.search_rowid) ? 0.1 / (60 + fts.get(ftsScores.get(row.search_rowid))) : 0)) }));
}

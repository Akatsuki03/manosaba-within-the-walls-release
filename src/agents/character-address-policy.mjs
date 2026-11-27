// Dialogue address convention @1, approved in the character address review.
// Source of truth for *newly generated speech*, not display labels, discovery,
// or rewritten original/player-authored dialogue. Keep v1 values immutable.
const PEOPLE = Object.freeze({
  emma: ['樱羽艾玛', '艾玛', '樱羽'], hiro: ['二阶堂希罗', '希罗', '二阶堂'], anan: ['夏目安安', '安安', '夏目'],
  noah: ['城崎诺亚', '诺亚', '城崎'], leia: ['莲见蕾雅', '蕾雅', '莲见'], milia: ['佐伯米莉亚', '米莉亚', '佐伯'],
  margo: ['宝生玛格', '玛格', '宝生'], nanoka: ['黑部奈叶香', '奈叶香', '黑部'], alisa: ['紫藤亚里沙', '亚里沙', '紫藤'],
  sherry: ['橘雪莉', '雪莉', '橘'], hanna: ['远野汉娜', '汉娜', '远野'], coco: ['泽渡可可', '可可', '泽渡'],
  meruru: ['冰上梅露露', '梅露露', '冰上'], yuki: ['月代雪', '雪', '月代'], warden: ['典狱长', '典狱长'], jailer: ['看守', '看守'],
});
const prisoners = Object.keys(PEOPLE).slice(0, 13);
const classmates = [...prisoners, 'yuki'];
const members = value => value.split(' ');
const CHAN = {
  emma: classmates, margo: classmates, milia: prisoners,
  noah: members('emma hiro anan leia nanoka alisa sherry coco meruru yuki'), coco: ['meruru'],
};
const SAN = {
  hanna: members('emma hiro anan noah leia milia margo nanoka sherry coco meruru'),
  sherry: [...classmates, 'warden', 'jailer'], meruru: [...prisoners, 'warden', 'jailer'],
  warden: members('emma hiro leia margo nanoka sherry milia noah'),
};
const FORMAL_KUN = new Set(['hiro', 'hanna', 'coco', 'meruru']);
const FORMAL_SAN_SHERRY = new Set(['emma', 'hiro', 'noah', 'milia', 'margo', 'hanna']);
const FORMAL_SAN_WARDEN = new Set(['leia', 'margo', 'nanoka', 'sherry']);
const SPECIAL_CHAN_SHERRY = new Set(['alisa', 'hanna', 'margo', 'meruru', 'nanoka']);
const SPECIAL_FULL = { hiro: new Set(['emma', 'noah', 'alisa']), anan: new Set(['emma', 'margo']) };
// v2 exception to the ちゃん mapping: retain Milia's authored Chinese
// nicknames only for the people she actually calls that in the source.
const MILIA_NICKNAMES = Object.freeze({ emma: '小艾', hiro: '小希', leia: '小蕾', coco: '小可',
  noah: '小诺', margo: '小玛', nanoka: '小奈', alisa: '小沙', sherry: '小莉', meruru: '小梅' });
export const hasCharacterAddressPolicy = id => Object.hasOwn(PEOPLE, id);
export const approvedAddressActorIds = () => Object.keys(PEOPLE);
export const approvedSpeakerLabel = id => PEOPLE[id]?.[0];
const resolveLabel = new Map(Object.entries(PEOPLE).map(([id, [label]]) => [label, id]));
const unique = values => [...new Set(values.filter(Boolean))];

function formsFor(actorId, targetId, close, version) {
  if (actorId === 'jailer' || actorId === targetId || !hasCharacterAddressPolicy(actorId) || !hasCharacterAddressPolicy(targetId)) return [];
  const [label, name, surname] = PEOPLE[targetId];
  if (version === 2 && actorId === 'milia' && Object.hasOwn(MILIA_NICKNAMES, targetId)) return [MILIA_NICKNAMES[targetId], name];
  if (actorId === 'leia' && prisoners.includes(targetId)) return [`${name}君`, ...(FORMAL_KUN.has(targetId) ? [`${label}君`] : [])];
  if (CHAN[actorId]?.includes(targetId)) return [`${name}酱`, ...(actorId === 'coco' && close ? ['梅露亲'] : [])];
  if (SAN[actorId]?.includes(targetId)) {
    if (actorId === 'warden') return unique([FORMAL_SAN_WARDEN.has(targetId) ? `${label}桑` : `${name}桑`,
      ...(['emma', 'hiro', 'margo', 'nanoka'].includes(targetId) ? [`${label}桑`, `${name}桑`] : [])]);
    return unique([`${name}桑`, ...(actorId === 'sherry' && FORMAL_SAN_SHERRY.has(targetId) ? [`${label}桑`] : []),
      ...(actorId === 'sherry' && SPECIAL_CHAN_SHERRY.has(targetId) ? [`${name}酱`] : [])]);
  }
  if (actorId === 'coco' && close && ['emma', 'hiro', 'noah'].includes(targetId)) return [`${name}亲`, name];
  if (actorId === 'nanoka' && classmates.includes(targetId)) return [label];
  if (actorId === 'alisa' && classmates.includes(targetId)) return targetId === 'milia' ? ['大叔', '佐伯'] : [surname];
  if (actorId === 'hiro' && targetId === 'yuki') return ['小雪', label];
  if (SPECIAL_FULL[actorId]?.has(targetId)) return targetId === 'margo' ? [label] : [name, label];
  return [name];
}

/** Existing, one-way, attributed perception only. A bare name or recent polite
 * encounter is not closeness; a hostile/negated report is not admiration. */
export function cocoHasAffection(relationship) {
  if (relationship?.confidence !== 'likely' || !relationship.sourceObservationIds?.length) return false;
  return relationship.distance >= 2 || (relationship.subjectiveSummary || '').split(/[。！？；\n]/u).some(clause =>
    /(?:我|自己|确实|真心|由衷)(?:(?![。！？；]).){0,10}(?:敬佩|钦佩|佩服|崇拜|仰慕)/u.test(clause)
    && !/[不没未非别无]|怀疑|或许|大概|好像|是否|如果|假装|[她他]说/u.test(clause));
}

// Ordinary authored input may address only a person this speaker already
// recognizes in the offered scene. An opaque handle or appearance cannot
// acquire a private name from the table. No relationship is inferred here.
export function ordinaryAddressForms(speakerId, participant) {
  const targetId = participant?.id;
  if (!hasCharacterAddressPolicy(targetId) || participant.label !== approvedSpeakerLabel(targetId)) return [];
  return formsFor(speakerId, targetId, false, 2);
}

export function projectAddressVoice(actorId, known, version = 1) {
  return { version, rows: known.flatMap(({ id, close }) => {
    const forms = formsFor(actorId, id, close, version);
    return forms.length ? [{ label: approvedSpeakerLabel(id), forms }] : [];
  }) };
}

export function validateAddressVoice(value, actorId) {
  const invalid = () => { throw Object.assign(new Error('对白称呼规则不是已封存的角色词表。'), { code: 'ERR_CHARACTER_ADDRESS' }); };
  if (!value || Object.keys(value).length !== 2 || ![1, 2].includes(value.version) || !Array.isArray(value.rows)
    || value.rows.length >= Object.keys(PEOPLE).length || !hasCharacterAddressPolicy(actorId)) invalid();
  const names = new Set();
  for (const row of value.rows) {
    if (!row || Object.keys(row).length !== 2 || typeof row.label !== 'string' || names.has(row.label)
      || !Array.isArray(row.forms)) invalid();
    names.add(row.label);
    const id = resolveLabel.get(row.label);
    if (!id || id === actorId || ![false, true].some(close => {
      const allowed = formsFor(actorId, id, close, value.version);
      return allowed.length === row.forms.length && allowed.every((term, i) => term === row.forms[i]);
    })) invalid();
  }
  return value;
}

const SELF = {
  emma: '平时自称“我”。', hiro: '平时自称“我”。',
  anan: '日常笔谈以“吾辈”自称，省略主语亦可；情绪明显、顾不上平时口吻等特殊场合可用“我”，确指多人则可用“我们”。自愿报姓名可写“吾辈是夏目安安”。只通过实际书写送达，不变成有声发言。',
  noah: '日常以“诺亚”自称或自然省略；情绪明显、顾不上平时口吻等特殊场合可以用“我”，确指多人可用“我们”。如自行介绍，可用“诺亚叫城崎诺亚”。慢悠悠、直率好奇，常从一个在意的颜色、画面或细节说起；不逐项汇报现场，不替别人宣布计划。',
  milia: '通常自称“大叔”，也可用“大叔我”或“我”。',
  sherry: '通常自称“我”；谈自己的侦探身份可以说“名侦探”或“名侦探雪莉”，不每句堆称号。',
  hanna: '常用“本小姐”，也可用“我”或“本小姐我”。',
  coco: '线下自称“我”，实际直播时才可用“可可碳”，个别直播自指可用“可可酱”。只对本人已经亲近或确实敬佩、且词表允许的对象可用“亲”；普通熟人用名字。',
  warden: '自称“我”，代表管理方时可用“我们”；对多人可用“各位”。',
};
export function addressVoiceGuidance(actorId, voice, { player = false } = {}) {
  return [
    '以下只约束本人新生成的台词或笔谈，不套进动作、叙述、私下思绪、别人真实引语或姓名牌。未相识不用本名；未出现的称呼不猜，没有必要叫名字时可自然省略。称呼不会增加听众、相识、行动或发言权限。',
    SELF[actorId] ?? (actorId === 'jailer' ? '不强行给看守加固定自称。' : '平时自称“我”。'),
    voice.rows.length ? `当前本人已认出的人与对应写法（通常用每项第一种）：${voice.rows.map(({ label, forms }) => `${label}→${forms.join('/')}`).join('；')}。` : '当前称呼表没有已识别对象，用自然代词或眼前已知描述。',
    ...(actorId === 'milia' && voice.version === 2 ? ['对已经认出且词表列有“小×”的对象，保留米莉亚习惯的小昵称，不改成“名字＋酱”。也可自然直呼名字；未列昵称的对象不自造“小×”。'] : []),
    ...(actorId === 'sherry' ? ['分析或讨论时仍通常用“桑”；仅在特殊的第三人称自述方式下可使用列出的“酱”变体，特殊自述里也可自称“雪莉酱”。'] : []),
    ...(actorId === 'coco' ? ['“亲”在允许的关系中也是可选的，不要每句话加；无法确定时用首个不带“亲”的叫法。梅露露的“酱”是单独的原作用法。'] : []),
    ...(player ? ['玩家明确给出的原话优先，名称、后缀和自称照录；只有自行组织的台词或明确授权的轻微口吻润色采用这些建议。'] : []),
  ].join('\n');
}

const reEscape = v => v.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
const stems = unique(Object.values(PEOPLE).flatMap(([label,name]) => name === '雪' ? [label, '小雪'] : [label,name])
  .concat('雪', '梅露')).sort((a,b)=>b.length-a.length);
const honorific = '(?:[酱醬桑]|君(?![子主王])|亲(?![手自眼口身近爱昵切戚人友吻密和属缘朋生情])|小姐)';
const namedSuffix = new RegExp(`(?:${stems.map(reEscape).join('|')})${honorific}`, 'gu');
const oldNicknames = /(?:小(?:艾|希|蕾|诺|玛|奈|沙|可|莉|梅))(?=$|[，,：:。！？!?…～\s])/gu;

/** Alias comparison for a single direct address at the start of a player
 * line. Elsewhere (including questions about names) retain exact terms. */
export function playerAddressKey(value, voice) {
  if (!voice) return value;
  for (const { label, forms } of voice.rows) {
    const terms = unique([label, PEOPLE[resolveLabel.get(label)][1], ...forms]).sort((a, b) => b.length - a.length);
    const prefix = new RegExp(`^(?:(?:嗯|唔|呃|喂)[，,、]\\s*)?(?:${terms.map(reEscape).join('|')})(?=[，,、])`, 'u');
    if (prefix.test(value)) return value.replace(prefix, label);
  }
  return value;
}

/** Check clear generated title forms only. Plain mentions and ordinary words
 * are not inferred to be a vocative. Seat/body identity is bound upstream. */
export function hasInvalidAddress(actorId, voice, prose) {
  if (!prose || !voice) return false;
  const allowed = new Set(voice.rows.flatMap(row => row.forms));
  if (actorId === 'sherry' || actorId === 'coco') allowed.add(`${PEOPLE[actorId][1]}酱`);
  for (const match of prose.matchAll(namedSuffix)) {
    // 雪桑/雪酱 without a known Yuki must be a clear name, not a named plant/food.
    if (match[0].startsWith('雪') && /^雪[桑酱醬]/u.test(match[0]) && !/^[，,：:。！？!?…～\s]*$/u.test(prose.slice(match.index + match[0].length))
      && !/^[，,：:。！？!?…～\s]/u.test(prose.slice(match.index + match[0].length))) continue;
    if (!allowed.has(match[0])) return true;
  }
  if (['milia', 'coco'].includes(actorId) && [...prose.matchAll(oldNicknames)].some(m => !allowed.has(m[0]))) return true;
  if (actorId === 'milia' && voice.version === 2
    && /(?:^|[。！？!?\n])\s*(?:小安(?:安)?|小汉(?:娜)?|小娜)[，,：:！!]/u.test(prose)) return true;
  // Check clear direct calls, not arbitrary name mentions, appositives or
  // introducing a third party. Uncertain ordinary language stays playable.
  for (const { label, forms } of voice.rows) {
    const [, name] = PEOPLE[resolveLabel.get(label)];
    // Formal full names remain usable for bare-name speakers; only disallow a
    // missing suffix or the wrong short/full form for the speakers who fix it.
    if (!/[酱桑君]$/u.test(forms[0]) && !['alisa', 'nanoka'].includes(actorId)) continue;
    const alternatives = unique([label, name]).filter(term => !forms.includes(term));
    if (!alternatives.length) continue;
    const plain = alternatives.map(reEscape).join('|');
    if (new RegExp(`(?:你好|早上好|晚上好|谢谢|抱歉|再见|等等)[，,、]\\s*(?:${plain})(?=$|[。！？!?…～])`, 'u').test(prose)) return true;
    if (new RegExp(`(?:^|[。！？!?\n])\\s*(?:喂[，,、！!]?\\s*)?(?:${plain})[，,：:！!]\\s*(?:你|您|请|等等|别|早上好|好久不见)`, 'u').test(prose)) return true;
  }
  return false;
}

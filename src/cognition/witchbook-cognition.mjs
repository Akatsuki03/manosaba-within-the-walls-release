// Display-only knowledge projection. Inputs are actual owner-received sources,
// not character cards, grants, author drafts or a model-generated biography.
// The small affirmative grammar is shared by every speaker, including custom
// characters. It captures the stated value verbatim; it never looks up a power.
const escape = value => value.replace(/[.*+?^$\{\}()|[\]\\]/gu, '\\$&');
const sentence = value => value.trim().replace(/[。；;]+$/u, '') + '。';
const text = value => typeof value === 'string' && value.trim() && value.length <= 2400;
const source = row => typeof row?.key === 'string' && Number.isSafeInteger(row.at) && row.at >= 0;
const claim = (field, content, origin, extra = {}) => ({ field, text: sentence(content),
  sourceKey: origin.key, acquiredAt: origin.at, ...extra });
function skillClaim(value, origin) {
  const items = value.split(/[、]|以及|和|与|及/u).map(item => item.trim()).filter(Boolean);
  // Do not split a word such as 亲和力 into invented one-character skills.
  const skills = items.length > 1 && items.every(item => [...item].length >= 2) ? items : [value];
  return claim('background', '擅长' + value, origin, { skills: [...new Set(skills)] });
}
const listText = items => items.length < 2 ? items[0] : items.slice(0, -1).join('、') + '和' + items.at(-1);

export function statementProfileFacts(row, aliases = []) {
  if (!source(row) || !text(row.text)) return [];
  let body = row.text.trim();
  const pairs = new Map([['「', '」'], ['『', '』'], ['“', '”'], ['"', '"']]);
  if (pairs.get(body[0]) === body.at(-1) && body.indexOf(body.at(-1), 1) === body.length - 1) body = body.slice(1, -1);
  // An attributed quotation is never an assertion by this speaker.
  body = body.replace(/「[^」]*」|『[^』]*』|“[^”]*”|"[^"]*"/gu, ' ')
    .replace(/…+|\.{2,}/gu, '').trim();
  const own = [...new Set(['我', '本人', '本小姐', '吾辈', '吾輩', '咱', '在下', '大叔', ...aliases])]
    .filter(value => typeof value === 'string' && value).sort((a, b) => b.length - a.length).map(escape).join('|');
  const self = '(?:' + own + ')';
  const match = (clause, pattern) => new RegExp(pattern, 'u').exec(clause);
  const facts = [];
  for (let clause of body.match(/[^。！？!?；;\n]+[。！？!?；;]?/gu) || []) {
    if (/[？?]/u.test(clause)) continue;
    clause = clause.replace(/[。！!；;]+$/u, '').trim();
    if (!clause || /[？?]|(?:假如|如果|假设|假設|或许|或許|也许|也許|可能是|听说|听說|据说|據說|她说|他说|她說|他說|台词|臺詞|转述|轉述|引用|不是|并非|並非|不叫|不擅长|不擅長)/u.test(clause)) continue;
    let found;
    if ((found = match(clause, '^' + self + '(?:的年龄是|的年齡是|今年|现在|現在)?([0-9]{1,3})岁$')) && +found[1] <= 120) {
      facts.push(claim('age', found[1] + '岁', row, { value: +found[1] })); continue;
    }
    if ((found = match(clause, '^' + self + '的(?:囚犯)?编号(?:是|为|為|：|:)([0-9]{1,6})$'))) {
      facts.push(claim('prisonerNumber', '囚犯编号' + found[1], row, { value: +found[1] })); continue;
    }
    if ((found = match(clause, '^' + self + '的(身份|另一个身份|另一個身份|艺名|藝名|笔名|筆名|网名|網名)(?:是|叫|为|為)([^，,]{1,120})$'))) {
      facts.push(claim('identity', found[1] + '为' + found[2], row)); continue;
    }
    if ((found = match(clause, '^' + self + '(的职业是|的職業是|曾经是|曾經是)([^，,]{1,160})$'))) {
      facts.push(claim('background', (found[1].startsWith('曾') ? '曾是' : '职业为') + found[2], row)); continue;
    }
    // A partial account stays partial: "related to drawing" does not authorize
    // an official name, uncontrollability, liquid manipulation or a mechanism.
    if ((found = match(clause, '^' + self + '的(能力|魔法)(?:是)?(?:和|与|與)(.{1,200})有关$'))) {
      facts.push(claim('ability', found[1] + '与' + found[2] + '有关', row,
        { ability: { description: sentence(found[1] + '与' + found[2] + '有关') } })); continue;
    }
    if ((found = match(clause, '^' + self + '的(?:魔法|能力)(?:叫作|名为|名為|叫|是)【([^【】]{1,80})】$')
      || match(clause, '^' + self + '的(?:魔法|能力)(?:叫作|名叫|名为|名為|叫)([^，,。！？!?；;【】「」『』“”]{1,80})$'))
      && !/[吗嗎呢]$/u.test(found[1])) {
      facts.push(claim('ability', '拥有【' + found[1] + '】魔法', row, { ability: { name: found[1] } })); continue;
    }
    if ((found = match(clause, '^' + self + '的(魔法|能力)(可以|能够|能夠|只能|不能|无法|無法)(.{1,300})$'))) {
      const description = sentence(found[1] + found[2] + found[3]);
      facts.push(claim('ability', description, row, { ability: { description } })); continue;
    }
    if ((found = match(clause, '^' + self + '(?:平常|平时|平時)?(?:喜欢|喜歡)(.{1,220})$'))) {
      if (!/[我你]|同学|同學/u.test(found[1])) facts.push(claim('background', '喜欢' + found[1], row)); continue;
    }
    if ((found = match(clause, '^' + self + '(?:比较|比較|很)?擅长(.{1,160})$'))) {
      facts.push(skillClaim(found[1], row)); continue;
    }
    // Subjectless answers such as "sewing and recitation are my strong suit"
    // are own skill accounts, not revelations of a hidden magical mechanism.
    found = /^([^，,。！？!?—]{1,100}?)(?:还算|還算|算)?拿得出手(?:——.*)?$/u.exec(clause)
      || /^([^，,。！？!?—]{1,100}?)(?:嘛)?(?:两头|兩頭)?都不算差$/u.exec(clause);
    if (found && !/[他她你]|说|說|听|聽|魔法|能力/u.test(found[1])) {
      facts.push(skillClaim(found[1], row));
    }
  }
  return facts;
}

/** Already-authorized private recollection of this subject, never another card. */
export function ownRecollectionProfileFacts(row, aliases = []) {
  const facts = statementProfileFacts(row, aliases);
  if (!source(row) || !text(row.text)) return facts;
  for (const clause of row.text.split(/[。；;\n]/u)) {
    const account = /^(?:我知道|我从.{1,60}知道)(?:自己)?(的)?(.+?)(?:，|,|$)/u.exec(clause.trim());
    if (account && !/本轮|本輪|试运行|試運行|没有.{0,12}(?:执行|實現|实现)/u.test(account[2])
      && /能力|魔法|^能|^在|^有强化|^有強化|^有声表达|^有聲表達|^幻视|^幻視/u.test(account[2])) {
      const description = sentence(account[2].replace(/^自己/u, ''));
      facts.push(claim('ability', description, row, { ability: { description } }));
    }
    if (/^我不认为自己拥有魔法(?:，|$)/u.test(clause.trim())) {
      facts.push(claim('ability', '不认为自己拥有魔法', row, { ability: { description: '不认为自己拥有魔法。' } }));
    }
  }
  const concept = /^我关于自己的回忆与想法：(.+)$/su.exec(row.text);
  if (concept && !/魔法|能力|技能|机制|施法/u.test(concept[1])) facts.push(claim('background', concept[1], row));
  return facts;
}

/** Shared display port for an actually known original/custom ability. A caller
 * must supply a source-backed recognition, not an activation or author approval.
 * No whitelist of thirteen actors, no executable command or mechanism payload. */
export function knownAbilityProfileFact({ recognition, key, at, id, name, description, stage }) {
  if (recognition !== 'known' || !source({ key, at }) || !text(name || description || '')) return null;
  const ability = { ...(typeof id === 'string' ? { id } : {}), ...(text(name) ? { name: name.trim() } : {}),
    ...(text(description) ? { description: description.trim() } : {}), ...(text(stage) ? { stage: stage.trim() } : {}) };
  // Stage remains available to future typed consumers, not in-world prose.
  const paragraphs = [ability.name ? '拥有【' + ability.name + '】能力。' : '', ability.description].filter(Boolean);
  return { field: 'ability', text: paragraphs.join('\n'), ability, sourceKey: key, acquiredAt: at };
}

// A source-preserving change of voice, not a new ability interpretation.
function abilityProse(value) {
  let result = value.trim().replace(/^(?:我|本人)(?:可以|能够|能夠|能)/u, '可以')
    .replace(/^把/u, '可以将').replace(/我(?=的|曾|真正|真实|亲耳|听)/gu, '自己')
    .replace(/真正(?=亲耳)/gu, '')
    .replace(/(?:自己|本人)(?:现在|当前|此刻)?的身体/gu, '自身');
  const embodied = /^(?:可以|能够)(?:主动)?(?:把|将)(.+?)[，,]\s*由自身(.+)$/u.exec(result);
  if (embodied) result = '可以由自身将' + embodied[1].replace(/^自己(?=亲耳)/u, '') + embodied[2];
  return sentence(result);
}

/** Rejoin complete CURRENT capability sentences from the compiler's existing
 * source spans. An effect fragment alone can omit its object and qualifiers.
 * Never bridge a growth/hidden/unresolved gap or publish the raw whole draft. */
function customAbilityDescription(declaration, trace) {
  const usable = clause => ['domain', 'effect', 'target', 'trigger', 'condition'].includes(clause?.kind)
    && text(clause.text) && !/(?:未来|将来|以后|觉醒后|成长后)/u.test(clause.text);
  const sourceText = declaration.authoredText;
  if (typeof sourceText !== 'string' || !Array.isArray(trace) || !trace.length) {
    return (declaration.clauses || []).filter(row => usable(row) && ['domain', 'effect'].includes(row.kind))
      .map(row => abilityProse(row.text)).join('\n');
  }
  const clauses = new Map((declaration.clauses || []).map(row => [row.id, row]));
  const allowed = new Uint8Array(sourceText.length), excluded = new Uint8Array(sourceText.length), effect = new Uint8Array(sourceText.length);
  for (const row of trace) {
    const clause = clauses.get(row.clauseId);
    for (const span of row.spans || []) {
      if (!Number.isSafeInteger(span.start) || !Number.isSafeInteger(span.end)
        || span.start < 0 || span.end > sourceText.length || span.end <= span.start) continue;
      (usable(clause) ? allowed : excluded).fill(1, span.start, span.end);
      if (usable(clause) && ['domain', 'effect'].includes(clause.kind)) effect.fill(1, span.start, span.end);
    }
  }
  const descriptions = [];
  for (const match of sourceText.matchAll(/[^。！？!?；;\n]+[。！？!?；;]?/gu)) {
    const start = match.index, end = start + match[0].length;
    if (/[？?]/u.test(match[0]) || !effect.slice(start, end).some(Boolean)) continue;
    let complete = true;
    for (let i = start; i < end; i++) if (/\S/u.test(sourceText[i]) && (!allowed[i] || excluded[i])) { complete = false; break; }
    if (complete) descriptions.push(abilityProse(match[0]));
  }
  return [...new Set(descriptions)].join('\n');
}

/** Existing known binding -> display only. Cosmetics are the CHARACTER name;
 * compiler state, future growth and execution machinery are not book prose. */
export function customAbilityProfileFact({ selection, declaration, trace, key, at }) {
  if (selection?.initialState?.recognition !== 'known' || !declaration) return null;
  const description = customAbilityDescription(declaration, trace);
  if (!description) return null;
  return knownAbilityProfileFact({ recognition: 'known', key, at, id: selection.definitionId,
    description, stage: selection.initialState.stage });
}

export function projectProfileKnowledge(facts) {
  const accepted = (facts || []).filter(row => row && text(row.text) && source({ key: row.sourceKey, at: row.acquiredAt }));
  const unique = [...new Map(accepted.map(row => [row.field + ':' + row.text, row])).values()];
  const last = field => unique.findLast(row => row.field === field);
  const age = last('age'), number = last('prisonerNumber');
  const skills = [...new Set(unique.filter(row => row.field === 'background' && Array.isArray(row.skills)).flatMap(row => row.skills))];
  let skillsWritten = false;
  const background = unique.filter(row => ['identity', 'background'].includes(row.field)).flatMap(row => {
    if (!Array.isArray(row.skills)) return [row.text];
    if (skillsWritten) return [];
    skillsWritten = true;
    return skills.length ? [sentence('擅长' + listText(skills))] : [];
  });
  return { ...(Number.isSafeInteger(age?.value) ? { age: age.value } : {}),
    ...(Number.isSafeInteger(number?.value) ? { prisonerNumber: number.value } : {}),
    profileParagraphs: [age?.text,
      ...background,
      ...unique.filter(row => ['ability', 'observed_magic'].includes(row.field)).map(row => row.text)].filter(Boolean),
    knownAbilities: unique.filter(row => row.field === 'ability' && row.ability).map(row => ({ ...row.ability })) };
}

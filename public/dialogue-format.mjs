// Plain-text presentation only: never infer that a spell happened from its wording.
export const DIALOGUE_RULES = Object.freeze({
  speech: '人物发言使用「」；发言内的专有名词、引用及特殊表达使用『』。',
  writing: '夏目安安的书写使用『』，不当作有声对白。',
  magic: '仅明确成立的安安魔法话语使用【】并以安安印象色显示；不得仅凭文字推断施法。',
});
// Structural separation only, not a claim that a described action occurred.
// Never classify ordinary first-person speech (e.g. 我画画的时候) by its verbs.
const QUOTE_PAIRS = new Map([['「', '」'], ['『', '』'], ['“', '”'], ['"', '"']]);
const PROSE_CUE = /(?:^|[，,。；;：:\s])(?:我|她|他|对方|對方)(?:把|将|將|朝|向|的|一边|一邊|抬|低|歪|转|轉|伸|收|抱|看向|望向|垂|点头|點頭|摇头|搖頭|笑|说|說|问|問|写|寫|停|坐|站|挪|扶|捏|握|眨|蹭)|(?:抬起|低下|歪头|歪頭|点头|點頭|摇头|搖頭|微笑|轻笑|輕笑|叹气|嘆氣|停顿|停頓|沉默|神态|神態|语气|語氣|心想|心里|心裡)/u;
const separator = value => /^[\s，,。；;：:、…—–！？!?]*$/u.test(value);
export function splitUtterance(value) {
  const text = String(value ?? ''); const quoted = []; const stack = []; let start = -1;
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (stack.length && char === stack.at(-1)) {
      stack.pop();
      if (!stack.length) quoted.push({ start, end: index + 1 });
    } else if (QUOTE_PAIRS.has(char)) {
      if (!stack.length) start = index;
      stack.push(QUOTE_PAIRS.get(char));
    }
  }
  if (stack.length || !quoted.length) return [{ kind: 'utterance', text }];
  const parts = []; let cursor = 0;
  for (const quote of quoted) {
    if (quote.start > cursor) parts.push({ kind: 'outside', text: text.slice(cursor, quote.start) });
    parts.push({ kind: 'utterance', text: text.slice(quote.start, quote.end) }); cursor = quote.end;
  }
  if (cursor < text.length) parts.push({ kind: 'outside', text: text.slice(cursor) });
  const outside = parts.filter(part => part.kind === 'outside' && !separator(part.text));
  // Multiple complete dialogue spans with prose between them are unambiguous.
  // A single quoted term in a spoken sentence is NOT automatically narration.
  const startsWithDialogue = text.slice(0, quoted[0].start).trim() === '';
  const speechIntroducer = /(?:说道|說道|说|說|问道|問道|问|問|写道|寫道)[：:]\s*$/u.test(text.slice(0, quoted[0].start));
  const completeDialogue = quoted.some(quote => /[。！？!?…][」』”"]$/u.test(text.slice(quote.start, quote.end)));
  if (!outside.length || !((startsWithDialogue || speechIntroducer) && outside.some(part => PROSE_CUE.test(part.text))
    || quoted.length > 1 && startsWithDialogue && completeDialogue)) return [{ kind: 'utterance', text }];
  return parts.map(part => ({ kind: part.kind === 'outside' ? 'narration' : 'utterance', text: part.text }));
}
export const hasMixedUtterance = value => typeof value === 'string' && (splitUtterance(value)
  .some(part => part.kind === 'narration' && !separator(part.text))
  || /[（(【*](?:轻轻|輕輕|微微|缓缓|緩緩|慢慢)?(?:歪头|歪頭|点头|點頭|摇头|搖頭|抬头|抬頭|低头|低頭|微笑|轻笑|輕笑|叹气|嘆氣|看向|望向|伸手|抱住|心想)[^（）()【】*\n]{0,60}[）)】*]/u.test(value));
export function dialogueFragments(entry) {
  if (!['speech', 'writing'].includes(entry.delivery)) return [entry];
  const parts = splitUtterance(entry.text);
  if (!parts.some(part => part.kind === 'narration' && !separator(part.text))) return [entry];
  return parts.filter(part => part.text.trim()).map(part => ({ ...entry, text: part.text,
    ...(part.kind === 'narration' ? { speaker: '旁白', delivery: 'narration' } : {}) }));
}
// Only the Host's committed, audience-filtered entry may label an occurrence.
// Plain dialogue, pending work and future or unfamiliar markers do not qualify.
export function publicEventCaption(entry, fragmentIndex) {
  return fragmentIndex === 0 && entry?.delivery === 'speech' && entry.publicEvent === 'warden_assembly_notice'
    ? '监牢广播 · 已播出' : '';
}
// Strip only one complete outer wrapper from a private thought. Adjacent quoted
// spans and quotations inside the thought remain verbatim; this never rewrites
// a stored entry or changes its delivery/audience.
function reflectionBody(text) {
  const open = text[0];
  const close = new Map([...QUOTE_PAIRS, ['（', '）'], ['(', ')'], ['【', '】']]).get(open);
  if (!close || text.at(-1) !== close) return text;
  if (open === close) return text.indexOf(close, 1) === text.length - 1 ? text.slice(1, -1) : text;
  let depth = 0;
  for (let index = 0; index < text.length; index++) {
    if (text[index] === open) depth++;
    else if (text[index] === close && --depth === 0) return index === text.length - 1 ? text.slice(1, -1) : text;
  }
  return text;
}
export function formatDialogue(entry) {
  if (entry.delivery === 'reflection') return { text: `（${reflectionBody(String(entry.text ?? ''))}）`, magic: false };
  const speaker = String(entry.speaker || '');
  const anan = /夏目安安|^安安/u.test(speaker);
  const magic = anan && (entry.delivery === 'magic' || /（魔法）/u.test(speaker));
  const writing = entry.delivery === 'writing' || (anan && /（书写）/u.test(speaker));
  const speech = entry.delivery !== 'action' && !/^(旁白|所见所闻|验证说明)$/u.test(speaker) && Boolean(speaker);
  let text = String(entry.text ?? '').replace(/“([^”]*)”/gu, '『$1』');
  const pair = magic ? ['【', '】'] : writing ? ['『', '』'] : speech ? ['「', '」'] : null;
  if (pair && !(text.startsWith(pair[0]) && text.endsWith(pair[1]))) {
    // Normalize a previous outer dialogue wrapper without doubling quotation marks.
    if (/^[「『【]/u.test(text) && /[」』】]$/u.test(text)) text = text.slice(1, -1);
    text = `${pair[0]}${text}${pair[1]}`;
  }
  return { text, magic };
}

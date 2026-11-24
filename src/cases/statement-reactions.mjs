import { createHash } from 'node:crypto';

// These marks authorize a response to words ACTUALLY delivered, not a truth
// assessment. Material-source audits keep their original independent tokens.
export const STATEMENT_REACTION_POLICY = Object.freeze({ version: 1, ref: 'delivered-statement-reaction@1',
  maxStatements: 8, maxPassages: 2, maxChars: 28, attitudes: Object.freeze(['question', 'agree', 'rebut']),
  effect: 'chosen-communication-only; no-evidence-truth-score-confession-or-verdict',
  audience: 'only-the-original-recipient-can-select; writing-requires-actual-reader',
  response: 'original-speaker-may-answer-decline-or-remain-silent-from-own-sources' });
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 32);
const safe = value => typeof value === 'string' && value.trim().length > 0 && value.length <= 6000
  && !/[<>\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value);
const splitSurrogate = (text, offset) => /[\uD800-\uDBFF]/u.test(text[offset - 1] || '') && /[\uDC00-\uDFFF]/u.test(text[offset] || '');
const quotePairs = new Map([['「', '」'], ['『', '』'], ['“', '”'], ['"', '"']]);
const quoteClosers = new Set(quotePairs.values());
function balancedExcerpt(value) {
  const stack = [];
  for (const char of value) {
    if (stack.length && char === stack.at(-1)) stack.pop();
    else if (quotePairs.has(char)) stack.push(quotePairs.get(char));
    else if (quoteClosers.has(char)) return false;
  }
  return stack.length === 0;
}
function trimClause(value) {
  let result = value.trim();
  // Only remove enclosing/unpaired dialogue wrappers. A paired inner quote
  // at the end belongs to the selected words and must not be cut in half.
  while (quotePairs.has(result[0]) || quoteClosers.has(result[0])) result = result.slice(1).trimStart();
  while (quoteClosers.has(result.at(-1)) && !balancedExcerpt(result)) result = result.slice(0, -1).trimEnd();
  return result.replace(/^[…—–]+|[…—–]+$/gu, '').trim();
}
const preamble = /^(?:(?:那个|那個|对不起|對不起|不好意思|各位|谢谢|謝謝|早上好)[…—–\s]*)+$|^(?:我[、…\s]*)?(?:先说一句就好|先說一句就好|想先问清楚一件事|想先問清楚一件事)$|^(?:它|这|這)(?:只|仅|僅)?(?:说明|說明)(?:一|这|這)件事$/u;
function passages(text) {
  const result = [];
  for (const match of text.matchAll(/[^，,。；;！？!?：:\n\r]+/gu)) {
    const value = trimClause(match[0]);
    if (value.length < 4 || preamble.test(value)) continue;
    const start = match.index + match[0].indexOf(value);
    const max = value.length > STATEMENT_REACTION_POLICY.maxChars ? 24 : value.length;
    let end = start + (splitSurrogate(text, start + max) ? max - 1 : max);
    // Never put an unmatched quotation into the player's exact host speech.
    // A long nested quote may be omitted; another literal clause remains.
    while (end - start >= 4 && !balancedExcerpt(text.slice(start, end))) end--;
    if (end - start >= 4) {
      const prior = result.at(-1);
      // A short temporal lead-in is not the assertion on its own. Retain its
      // adjacent literal clause when the combined passage still fits the cap.
      if (prior && /(?:之后|之後|以前|之前|以后|以後|当时|當時|时候|時候)$/u.test(prior.text)
        && /^[，,]\s*$/u.test(text.slice(prior.end, start)) && end - prior.start <= STATEMENT_REACTION_POLICY.maxChars) {
        prior.end = end; prior.text = text.slice(prior.start, end);
      } else result.push({ start, end, text: text.slice(start, end) });
    }
  }
  return result;
}
// v3 is a lexical reading aid, not an entailment/truth model. Only delivered
// text and occupied citation ranges enter selection; never evidence or identity.
// Whole sentence units retain negation, conditions and nested quotations. A
// sentence that cannot fit intact is omitted, never shortened into a new claim.
export const STATEMENT_SPAN_POLICY = Object.freeze({ version: 3, ref: 'meaningful-statement-spans@3',
  rangeContract: 'utf16-complete-sentence-qualified-quote-balanced@1',
  maxPassages: 3, maxChars: 180, maxTotalChars: 300 });
const assertion = /(?:认为|認為|觉得|覺得|说明|說明|表示|意味着|意味著|证明|證明|确定|確定|确认|確認|推测|推測|猜测|猜測|可能|也许|也許|应该|應該|一定|肯定|只能|不能|并非|並非|不等于|不等於|没有|沒有|拿不出|并未|並未|不是|不曾|未必|不会|不會|无法|無法|看见|看見|看到|听见|聽見|听到|聽到|记得|記得|发现|發現|留下|留着|留著|拿走|使用|经过|經過|待在|在场|在場|离开|離開|进入|進入|出入|发生|發生|属于|屬於|是|有|在)/u;
const qualification = /(?:如果|假如|除非|只有|只要|即使|即便|倘若|否则|否則|但是|但|不过|不過|然而|所以|因此|并不|並不|不能|只能|不等于|不等於|未必|推测|推測|可能)/u;
const filler = /^(?:(?:那个|那個|嗯|呃|唔|啊|对不起|對不起|不好意思|各位|大家|谢谢|謝謝|请听我说|請聽我說|先听我说|先聽我說|我先说一句就好|我先說一句就好|我想先问清楚一件事|我想先問清楚一件事|我想说的是|我想說的是|让我想想|讓我想想|先别着急|先別著急)[，,、…—–\s]*)+$/u;
function completeRange(text, from, to) {
  while (from < to && /\s/u.test(text[from])) from++;
  while (to > from && /\s/u.test(text[to - 1])) to--;
  // Dialogue wrappers spanning multiple sentences are not part of each unit.
  // Balanced inner quotations, including their punctuation, remain literal.
  if (quotePairs.has(text[from]) && !balancedExcerpt(text.slice(from, to))) from++;
  while (to > from && quoteClosers.has(text[to - 1]) && !balancedExcerpt(text.slice(from, to))) to--;
  while (from < to && /[\s…—–]/u.test(text[from])) from++;
  while (to > from && /[\s…—–]/u.test(text[to - 1])) to--;
  const value = text.slice(from, to);
  if (value.length < 5 || value.length > STATEMENT_SPAN_POLICY.maxChars || !balancedExcerpt(value)) return null;
  return { start: from, end: to, text: value };
}
function meaningfulPassages(text, occupied) {
  const candidates = []; const stack = []; let start = 0;
  const add = end => {
    let from = start;
    // Remove only standalone social fillers before the proposition. Do not
    // detach a temporal premise, condition, negation or qualification.
    for (const match of text.slice(from, end).matchAll(/[^，,]+[，,]/gu)) {
      if (!filler.test(trimClause(match[0].slice(0, -1)))) break;
      from = start + match.index + match[0].length;
    }
    const range = completeRange(text, from, end);
    if (!range || preamble.test(range.text) || filler.test(range.text) || !assertion.test(range.text)
      || occupied.some(mark => range.start < mark.end && range.end > mark.start)) return;
    const score = 2 + (qualification.test(range.text) ? 2 : 0)
      + (/(?:认为|認為|说明|說明|意味着|意味著|证明|證明|确定|確定|一定|肯定)/u.test(range.text) ? 2 : 0)
      + (/(?:亲眼|親眼|亲耳|親耳|看见|看見|听到|聽到|记得|記得)/u.test(range.text) ? 1 : 0);
    if (!candidates.some(row => row.text === range.text)) candidates.push({ ...range, score });
  };
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (stack.length && char === stack.at(-1).close) stack.pop();
    else if (quotePairs.has(char)) stack.push({ close: quotePairs.get(char), at: index, open: char });
    const dialogue = stack.length === 1 && stack[0].open === '「'
      && !text.slice(start, stack[0].at).trim();
    if (/[。！？!?\n\r]/u.test(char) && (!stack.length || dialogue)) {
      add(index); start = index + 1;
    } else if (!stack.length && quoteClosers.has(char) && !text.slice(start, index).trim()) start = index + 1;
  }
  add(text.length);
  let used = 0;
  return candidates.sort((a, b) => b.score - a.score || a.start - b.start).filter(range => {
    if (used + range.text.length > STATEMENT_SPAN_POLICY.maxTotalChars) return false;
    used += range.text.length; return true;
  }).slice(0, STATEMENT_SPAN_POLICY.maxPassages).sort((a, b) => a.start - b.start);
}
const metadata = { question: { type: 'Question', label: '质疑' }, agree: { type: 'Approval', label: '赞同' }, rebut: { type: 'Objection', label: '反驳' } };
function communication(stance, quote, actorId, version = 1) {
  const self = actorId === 'noah' ? '诺亚' : actorId === 'anan' ? '吾辈' : '我';
  if ([2, 3].includes(version)) {
    if (stance === 'question') return `『${quote}』的依据是什么？`;
    if (stance === 'agree') return `${self}赞同『${quote}』这个说法。`;
    return `${self}不认同『${quote}』这个说法。`;
  }
  // Inner corner quotes preserve the original owner's self references; they
  // must never be mistaken for the reaction speaker's self-introduction.
  if (stance === 'question') return `关于刚才『${quote}』这一处，请说明它的依据与能确认的范围；哪些是亲见，哪些是推测？`;
  if (stance === 'agree') return `关于刚才『${quote}』这一处，${self}暂时赞同这个说法，但不因此确认整段证词或任何人的责任。`;
  return `关于刚才『${quote}』这一处，${self}暂不同意这个推断，请说明依据；这不表示${self}已经证明相反结论。`;
}
export function compactStatementReaction(stance, quote, actorId) {
  return communication(stance, quote, actorId, 2);
}
export function projectStatementReactions(input, legacyRound, { version = input?.statementReactionVersion } = {}) {
  if (!legacyRound || !safe(input?.caseId) || !safe(input?.actorId)) return legacyRound;
  const view = structuredClone(legacyRound);
  const statements = view.statements.filter(row => row.kind === 'utterance' && safe(row.speakerId)
    && row.speakerId !== input.actorId && safe(row.text)).slice(-STATEMENT_REACTION_POLICY.maxStatements);
  const records = new Map((input.statements || []).map(row => [row.id, row]));
  for (const row of statements) {
    const original = records.get(row.id);
    if (safe(original?.entryId)) row.entryId = original.entryId;
    const existing = row.highlights || [];
    // The exact-source citation keeps its original route. Only separate,
    // non-overlapping clauses can receive an ordinary opinion reaction.
    const options = version === 3 ? meaningfulPassages(row.text, existing)
      : passages(row.text).filter(range => !existing.some(mark => range.start < mark.end && range.end > mark.start))
        .filter((range, index, all) => all.findIndex(other => other.text === range.text) === index)
        .slice(0, STATEMENT_REACTION_POLICY.maxPassages);
    for (const range of options) {
      const actions = STATEMENT_REACTION_POLICY.attitudes.map(stance => {
        const identity = [version === 3 ? 'statement-reaction@3' : version === 2 ? 'statement-reaction@2' : 'statement-reaction@1',
          input.caseId, input.actorId, view.id, row.id, row.speakerId, row.text, range.start, range.end, stance];
        if (version === 3) identity.push(STATEMENT_SPAN_POLICY.ref, STATEMENT_SPAN_POLICY.rangeContract);
        const token = `testimony-${hash(identity)}`;
        return { token, command: `核对证词：${token}`, kind: 'statement_reaction', stance, ...metadata[stance],
          statementId: row.id, start: range.start, end: range.end,
          text: `${metadata[stance].label}：${communication(stance, range.text, input.actorId, version)}`,
          displayText: communication(stance, range.text, input.actorId, 2) };
      });
      row.highlights ||= [];
      row.highlights.push({ start: range.start, end: range.end, kind: 'statement', selectionTokens: actions.map(action => action.token) });
      view.selections.push(...actions);
    }
    row.highlights.sort((a, b) => a.start - b.start);
  }
  view.selections.sort((a, b) => Number(a.kind === 'statement_reaction') - Number(b.kind === 'statement_reaction')
    || (a.token < b.token ? -1 : a.token > b.token ? 1 : 0));
  if (view.selections.some(row => row.kind === 'statement_reaction')) view.title = `第${view.index + 1}轮 · 陈述反应与来源核对`;
  view.statementReactions = { version: version === 3 ? 3 : 1,
    ...(version === 3 ? { rangeContract: STATEMENT_SPAN_POLICY.rangeContract,
      selector: 'delivered-text-lexical-heuristic; not-truth-or-relevance-certification' } : {}),
    instruction: '角色陈述的高亮仅表示可以回应，不表示矛盾、谎言或正确答案。质疑会请求原发言者解释依据；赞同与反驳只表达玩家立场。' };
  view.prompt += ' 也可选择角色陈述的高亮短句回应；普通证词反应不判真伪、不推进来源核对得分。';
  return view;
}
export function resolveStatementReaction(input, legacyRound, token) {
  let version = input?.statementReactionVersion;
  let view = projectStatementReactions(input, legacyRound);
  let selected = view?.selections.find(row => row.token === token && row.kind === 'statement_reaction');
  // Historical commands/actions retain the exact long utterance they selected.
  // They are not re-issued by the new UI, but immutable replay must still work.
  for (const historicalVersion of version === 3 ? [2, 1] : version === 2 ? [1] : []) {
    if (selected) break;
    version = historicalVersion; view = projectStatementReactions(input, legacyRound, { version });
    selected = view?.selections.find(row => row.token === token && row.kind === 'statement_reaction');
  }
  if (!selected) return null;
  const statement = view.statements.find(row => row.id === selected.statementId && row.kind === 'utterance');
  if (!statement || statement.speakerId === input.actorId) return null;
  const excerpt = statement.text.slice(selected.start, selected.end);
  return { kind: 'statement_reaction', roundId: view.id, index: view.index, stance: selected.stance, matched: null,
    statementId: statement.id, speakerId: statement.speakerId, speakerName: statement.speakerName || '原发言者',
    statementText: statement.text, excerpt, start: selected.start, end: selected.end,
    communicationText: communication(selected.stance, excerpt, input.actorId, version) };
}
/** Projection-only exact transcript binding. Repeated identical speech is
 * matched by occurrence in reverse chronological order, never by a name guess. */
export function bindStatementEntries(statements, entries, ownerId) {
  const claimed = new Set(); const delivered = [...entries].reverse();
  return [...statements].reverse().map(row => {
    const entry = delivered.find(item => !claimed.has(item.id) && item.speakerId === row.speakerId
      && item.text === row.text && ['speech', 'writing'].includes(item.delivery) && item.audienceIds?.includes(ownerId));
    if (!entry) return { ...row };
    claimed.add(entry.id); return { ...row, entryId: entry.id };
  }).reverse();
}
export function statementReactionPerformance(action, reaction) {
  if (!reaction) {
    if (action.intent?.type === 'conversation' && /^(?:核对证词|核對證詞)[：:]/u.test(action.rawInput?.trim() || '')) {
      throw Object.assign(new Error('当前证词片段已过期，原发言者不可回应。'), { code: 'INVALID_AGENT_STATE' });
    }
    return action.performance;
  }
  if (action.intent?.type !== 'conversation' || action.intent.targetId !== reaction.targetId
    || action.intent.playerText !== reaction.communicationText || action.performance?.utterance) {
    throw Object.assign(new Error('证词反应只能交付当前选定片段的宿主原句，不能增加模型台词。'), { code: 'INVALID_AGENT_STATE' });
  }
  return { ...action.performance, utterance: reaction.communicationText };
}
export const STATEMENT_REACTION_INSTRUCTIONS = '这是玩家已明确选择的证词片段反应。宿主会在动作后向原发言者交付选定的完整发言或笔谈；本任务只生成第一人称可见动作，必须省略utterance，不得另加台词、结论、证物、认罪或对方回应。动作只表现此次交流的准备，如扶稳纸页、落笔前的停顿、准备转向原发言者；不要提前宣告对方已经读懂或接受。玩家已经选择交付，不能改成拒绝回应、藏起所选文字、只留给自己看、本子没有转出去或无人收到；笔谈可以不出声、不向旁人公开，但不是不给原发言者看。不得在action中抄写或改述所选原句，实际文字仍由宿主原样交付。质疑和反驳不等于已经证明矛盾。';

const deliverySurface = '(?:笔记本|筆記本|素描本|本子|纸页|紙頁|纸张|紙張|纸条|紙條|纸面|紙面|页面|頁面|这一页|這一頁|这页|這頁|这一行|這一行|这行字|這行字|这些字|這些字|那行字|字迹|字跡|文字|笔谈|筆談|这一笔|這一筆)';
const deliveryNegative = '(?:没有|沒有|并未|並未|尚未|还没|還沒|还未|還未|不曾|未曾|不肯|拒绝|拒絕|不再|未|没|沒|不)';
const deliveryAdverb = '(?:再|曾|先|立刻|立即|马上|馬上|真正|实际|實際|成功|被|向外|往外|就|便|也|还|還|仍)*';
const withheldWriting = new RegExp(`${deliveryNegative}${deliveryAdverb}(?:(?:把|将|將)(?:这|這|那)?${deliverySurface})?${deliveryAdverb}(?:转出去|轉出去|递出去|遞出去|展示|出示|递给|遞給|交给|交給|送给|送給|(?:给|給)(?:原发言者|原發言者|对方|對方|她|他|任何人|别人|別人)看)`, 'gu');
const bystanderOnly = /^(?:(?:给|給|向|让|讓)|出去)*(?:旁人|其他人|其余人|其餘人|围观者|圍觀者|众人|眾人|大家|全场|全場|所有人)/u;
const selfOnlyWriting = /(?:只|仅|僅)(?:留给|留給|给|給|供|让|讓)(?:我(?:自己)?|吾辈|吾輩|自己)(?:看|读|讀|阅读|閱讀)|(?:只|仅|僅)(?:留|放|藏|收|保留)(?:在|于|於)(?:我(?:自己)?|吾辈|吾輩|自己)(?:的)?(?:眼前|面前|手里|手裡|手中)|(?:只|仅|僅)(?:留|放|藏|收|保留)(?:在|于|於)(?:(?:我|自己)(?:的)?)?(?:心里|心裡|心中|内心|內心)|(?:不让|不讓|不给|不給)(?:原发言者|原發言者|对方|對方|她|他|任何人|别人|別人)(?:看|读|讀|收到)/u;
const nobodyReadsWriting = /(?:没有|沒有)(?:任何)?人(?:曾|能|会|會|已经|已經|实际|實際)*(?:看见|看見|看到|看过|看過|读到|讀到|读过|讀過|收到)|(?:无人|無人|没人|沒人)(?:曾|能|会|會|已经|已經)*(?:看见|看見|看到|读到|讀到|收到)|(?:谁|誰)(?:也|都)(?:没有|沒有|没|沒)(?:看见|看見|看到|读到|讀到|收到)/gu;
const writingSurface = new RegExp(deliverySurface, 'u');
const writingObject = new RegExp(`^(?:了|过|過)?(?:(?:这|這|那|所选|所選|刚才|剛才)(?:一|些|段|行|页|頁|份))?(?:${deliverySurface}|字|内容|內容|它)`, 'u');
const refusalToReact = /(?:^|[，,：:])(?:我|吾辈|吾輩|本小姐)(?:最终|最終|还是|還是|便|就|决定|決定)*(?:拒绝|拒絕|不肯|不再|决定不|決定不)(?:再)?(?:回应|回應|回答|发言|發言|表态|表態|表达|表達|写下|寫下|交付)/u;
function contradictsSelectedDelivery(value, writing) {
  for (const sentence of value.split(/[。；;！!？?\n]/u)) {
    if (refusalToReact.test(sentence)) return true;
    if (!writing || !writingSurface.test(sentence)) continue;
    if (selfOnlyWriting.test(sentence)) return true;
    for (const match of sentence.matchAll(nobodyReadsWriting)) {
      const object = sentence.slice(match.index + match[0].length);
      // Unnoticed hands/trembling are not an unread selected page. Bind the
      // reading/receiving denial to writing, not any object in this sentence.
      if (writingObject.test(object) || !object.trim()) return true;
    }
    for (const match of sentence.matchAll(withheldWriting)) {
      // Hiding a private note from bystanders is not withholding it from the
      // selected original speaker. Do not turn privacy into public speech.
      if (!bystanderOnly.test(sentence.slice(match.index + match[0].length))) return true;
    }
  }
  return false;
}
/** New immutable task packets opt in explicitly. This is a narrow negative /
 * agency screen, not a semantic proof: it never rewrites a model candidate,
 * adds dialogue, changes recipients, or validates old stored actions anew. */
export function assertStatementReactionDelivery(data, output, { scene = false } = {}) {
  const reaction = data.statementReaction;
  if (reaction?.deliveryVersion === undefined) return output;
  const reject = () => { throw Object.assign(new Error('已选证词反应的动作或编排不能否定宿主交付。'), { code: 'INVALID_NARRATIVE_OUTPUT' }); };
  if (reaction.deliveryVersion !== 1 || reaction.version !== 1) reject();
  if (!scene) {
    if (!['speech', 'writing'].includes(data.communication)) reject();
    if (contradictsSelectedDelivery(output.action, data.communication === 'writing')) reject();
    return output;
  }
  const event = data.events?.find(row => row.id === reaction.eventId);
  if (!event || !['speech', 'writing'].includes(event.delivery)) reject();
  let delivered = false;
  for (const block of output.blocks) {
    if (block.type === 'event' && block.eventId === event.id) delivered = true;
    // Before the canonical delivery, preparing/holding the page remains true.
    // After it, narration cannot undo the actual delivered communication.
    if (delivered && block.type === 'narration' && contradictsSelectedDelivery(block.text, event.delivery === 'writing')) reject();
  }
  return output;
}

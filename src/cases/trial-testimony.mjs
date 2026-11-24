import { createHash } from 'node:crypto';
import { projectStatementReactions, resolveStatementReaction } from './statement-reactions.mjs';

// This module receives only an owner's already acquired records and delivered
// statements. It has no world, actor, evidence catalogue, solution or model
// dependency. A highlighted quotation is a textual source connection, never a
// truth assessment of the surrounding testimony or an accusation.
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 32);
const tokenPattern = /^testimony-[a-f0-9]{32}$/u;
const text = value => typeof value === 'string' && Boolean(value.trim())
  && !/[<>\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value);
const count = value => Number.isSafeInteger(value) && value >= 0 && value < Number.MAX_SAFE_INTEGER ? value : 0;
const progressFor = (progress, actorId) => progress?.version === 1 ? progress.byActor?.[actorId] : null;

export function testimonyCommand(token) {
  return typeof token === 'string' && tokenPattern.test(token) ? `核对证词：${token}` : null;
}

/** No punctuation stripping or prose interpretation: a quoted, hypothetical,
 * concatenated or obsolete command does not authorize a source connection. */
export function parseTestimonyCommand(raw) {
  if (typeof raw !== 'string') return null;
  const match = /^(?:核对证词|核對證詞)[：:]\s*(testimony-[a-f0-9]{32})$/u.exec(raw.trim());
  return match?.[1] || null;
}

function phrases(value) {
  const result = [];
  for (const match of value.matchAll(/[^，。；！？：\n\r]+/gu)) {
    const trimmed = match[0].trim();
    if (trimmed.length < 4) continue;
    // Prefer complete short clauses. Long clauses retain a short, literal
    // excerpt rather than coloring the whole sentence or generating a summary.
    // Ranges are JavaScript/DOM UTF-16 offsets; never split a surrogate pair.
    const limit = /[\uD800-\uDBFF]/u.test(trimmed[23] || '') ? 23 : 24;
    const excerpt = trimmed.length > 28 ? trimmed.slice(0, limit) : trimmed;
    const start = match.index + match[0].indexOf(trimmed);
    if (!result.some(row => row.text === excerpt)) result.push({ start, end: start + excerpt.length, text: excerpt });
  }
  return result;
}
function sourceRows(sources) {
  const seen = new Set();
  return (Array.isArray(sources) ? sources : []).filter(row => row && text(row.id) && text(row.name) && text(row.text)
    && ['material', 'institutional'].includes(row.kind) && ['sealed', 'public'].includes(row.status))
    .map(row => ({ id: row.id, name: row.name, text: row.text, kind: row.kind, status: row.status }))
    .filter(row => {
      if (seen.has(row.id) || !phrases(row.text).length) return false;
      seen.add(row.id); return true;
    }).sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}
function attributedQuotation(value, name) {
  const label = `【${name}】`; const at = value.indexOf(label);
  if (at < 0) return null;
  const rest = value.slice(at + label.length);
  // This recognizes only an explicit claim of a source's literal wording.
  // Ordinary testimony, word overlap and a negated/qualified attribution are
  // not facts for a host to judge. Even this audit judges provenance only.
  const attribution = /^(?:中)?(?:记载(?:着)?|写着|原文[是为])[：:]?\s*/u.exec(rest);
  if (!attribution) return null;
  const quote = /^(?:「([^「」\r\n]{4,80})」|『([^『』\r\n]{4,80})』|“([^“”\r\n]{4,80})”)/u.exec(rest.slice(attribution[0].length));
  if (!quote) return null;
  const text = quote[1] || quote[2] || quote[3];
  const start = at + label.length + attribution[0].length + 1;
  const limit = /[\uD800-\uDBFF]/u.test(text[23] || '') ? 23 : 24;
  return { text, start, end: start + (text.length > 28 ? limit : text.length) };
}
const actionTypes = Object.freeze({ agree: ['Approval', '赞同'], rebut: ['Objection', '反驳'],
  question: ['Question', '疑问'], perjury: ['Perjury', '伪证'] });
const actionTag = stance => ({ type: actionTypes[stance][0], label: actionTypes[stance][1] });

function buildRound({ caseId, actorId, progress, sources = [], fallback, statements = [], allowPerjury = false } = {}) {
  if (!text(caseId) || !text(actorId)) return null;
  const materials = sourceRows(sources);
  const available = materials.length ? materials : sourceRows(fallback ? [fallback] : []);
  if (!available.length) return null;
  const index = count(progressFor(progress, actorId)?.completedRounds);
  const source = available[index % available.length];
  const excerpts = phrases(source.text);
  const excerpt = excerpts[Math.floor(index / available.length) % excerpts.length];
  // Only public/owner-visible content participates in capability identity. In
  // particular neither the answer, another owner's records, NPC generation,
  // disclosure status nor any host-only cause enters the hash.
  const id = `round-${hash(['trial-testimony@1', caseId, actorId, index, source.id, source.name, source.text])}`;
  const referenceId = `reference-${hash([id, source.id])}`;
  const stances = ['agree', 'rebut', 'question', ...(allowPerjury === true && source.kind === 'material' ? ['perjury'] : [])];
  const selections = stances.map(stance => {
    // Preserve the original agreement/rebuttal hashes and progress semantics.
    const token = `testimony-${hash(['trial-testimony-choice@1', id, stance])}`;
    return { token, command: testimonyCommand(token), stance, ...actionTag(stance),
      statementId: referenceId, start: excerpt.start, end: excerpt.end,
      text: stance === 'agree'
        ? `赞同：只确认【${source.name}】确实记载了「${excerpt.text}」，不据此认定责任。`
        : stance === 'rebut' ? `反驳：认为【${source.name}】并未记载「${excerpt.text}」。`
          : stance === 'question' ? `疑问：请对照【${source.name}】解释「${excerpt.text}」的上下文和能说明的范围，暂不表态。`
            : `伪证：声称【${source.name}】没有记载「${excerpt.text}」，不把原材料出示给其他人；这只是我的陈述，不会生成新证物。` };
  }).sort((a, b) => a.token < b.token ? -1 : a.token > b.token ? 1 : 0);
  const selectionTokens = selections.map(row => row.token);
  const highlight = (start, end, kind) => ({ start, end, kind, selectionTokens: [...selectionTokens] });
  const visibleStatements = (Array.isArray(statements) ? statements : []).filter(row => row && text(row.id) && text(row.text)).slice(-12);
  const rows = visibleStatements.map(row => {
    const highlights = [];
    // An explicit labelled exact quotation may be linked, but keyword
    // overlap, paraphrases, negation and ordinary assertions are not proofs.
    // Even this link assesses only the quoted characters, not the speaker's
    // surrounding claim. Ungrounded autonomous utterances have no highlight.
    if (row.text.includes(`【${source.name}】`)) {
      for (const quote of [`「${excerpt.text}」`, `『${excerpt.text}』`, `“${excerpt.text}”`]) {
        const at = row.text.indexOf(quote);
        if (at >= 0) { highlights.push(highlight(at + 1, at + 1 + excerpt.text.length, 'citation')); break; }
      }
    }
    return { id: row.id, kind: 'utterance', ...(text(row.speakerId) ? { speakerId: row.speakerId } : {}),
      ...(text(row.speakerName) ? { speakerName: row.speakerName } : {}), text: row.text, highlights };
  });
  const prefix = `【${source.name}｜${source.kind === 'institutional' ? '公开制度记录，非新证物' : source.status === 'public' ? '已公开材料摘录' : '本人封卷材料摘录'}】\n`;
  rows.push({ id: referenceId, kind: 'reference', sourceId: source.id, sourceName: source.name,
    text: prefix + source.text, highlights: [highlight(prefix.length + excerpt.start, prefix.length + excerpt.end, 'clue')] });
  // Selection ranges use the same rendered reference text as highlights.
  for (const selection of selections) { selection.start += prefix.length; selection.end += prefix.length; }
  const audits = [];
  for (const row of visibleStatements) {
    const quotation = attributedQuotation(row.text, source.name);
    if (!quotation || source.text.includes(quotation.text)) continue;
    // Anonymous/owner utterances cannot manufacture a new answer route;
    // delivered NPC quotations may be audited narrowly against the record.
    if (!row.speakerId || row.speakerId === actorId) continue;
    const projected = rows.find(item => item.id === row.id);
    if (projected.highlights.some(mark => mark.start < quotation.end && mark.end > quotation.start)) continue;
    const auditId = hash([row.id, quotation.start, quotation.text]);
    const actions = stances.map(stance => {
      const token = `testimony-${hash(['trial-testimony-audit@1', id, auditId, stance])}`;
      return { token, command: testimonyCommand(token), stance, ...actionTag(stance),
        statementId: row.id, start: quotation.start, end: quotation.end,
        text: stance === 'rebut'
          ? `反驳：所引【${source.name}】没有这处逐字引文「${quotation.text}」，应退回原文核对；不判断说话者是否撒谎。`
          : stance === 'agree' ? `赞同：接受「${quotation.text}」是【${source.name}】的逐字原文。`
            : stance === 'question' ? `疑问：请说明「${quotation.text}」引自【${source.name}】的哪一处，先对照原文再判断。`
              : `伪证：声称【${source.name}】记载了「${quotation.text}」，不把原材料出示给其他人；这只是我的陈述，不会生成新证物。` };
    });
    projected.highlights.push({ start: quotation.start, end: quotation.end, kind: 'citation', selectionTokens: actions.map(row => row.token) });
    projected.highlights.sort((a, b) => a.start - b.start);
    for (const action of actions) audits.push({ ...action, matched: action.stance === 'rebut', quotedText: quotation.text });
    selections.push(...actions);
    // Keep an autonomous testimony audit optional and compact. The labelled
    // source route above remains available even when a statement ages out.
    break;
  }
  selections.sort((a, b) => a.token < b.token ? -1 : a.token > b.token ? 1 : 0);
  const view = { id, index, title: `第${index + 1}轮 · 核对来源`, topic: source.name,
    prompt: `先选择标记片段，再决定赞同、反驳或提出疑问；疑问可先澄清出处与范围${stances.includes('perjury') ? '，伪证须自行承担发言后果' : ''}。只有与记录一致的来源核对才推进本轮；任何操作都不自动认证整段证词、案情或凶手。`,
    reference: { id: source.id, name: source.name, kind: source.kind, status: source.status, text: source.text },
    statements: rows, selections };
  return { view, source, excerpt: excerpt.text, audits };
}

/** Disposable public projection. No migration, mutation or answer flags. */
export function projectTrialTestimony(input) {
  const round = buildRound(input)?.view || null;
  const view = [1, 2, 3].includes(input?.statementReactionVersion) ? projectStatementReactions(input, round) : round;
  if ([2, 3].includes(input?.statementReactionVersion) && view) {
    // UI copy is distinct from the immutable legacy source/audit operation.
    for (const selection of view.selections) if (!selection.displayText) {
      const statement = view.statements.find(row => row.id === selection.statementId);
      const quote = statement?.text.slice(selection.start, selection.end) || '';
      const name = view.reference.name;
      const utterance = statement?.kind === 'utterance';
      selection.displayText = selection.stance === 'question' ? `请说明『${quote}』在【${name}】中的出处。`
        : selection.stance === 'agree' ? utterance ? `『${quote}』确实出自【${name}】。` : `【${name}】确实记载了『${quote}』。`
          : `【${name}】没有记载『${quote}』。`;
      if (selection.stance === 'perjury') selection.displayText = selection.text.includes('没有记载')
        || selection.text.includes('并未记载') ? `【${name}】没有记载『${quote}』。` : `【${name}】记载了『${quote}』。`;
    }
  }
  return view;
}

/** Friendly presentation of a capability; command identity stays off the
 * composer surface. Receipts/actions keep their immutable raw input. */
export function trialTestimonyDisplayText(round, token) {
  const action = round?.selections?.find(row => row.token === token);
  if (action?.displayText) return action.displayText;
  if (action) {
    const statement = round.statements.find(row => row.id === action.statementId);
    const quote = statement?.text.slice(action.start, action.end) || '';
    return action.stance === 'question' ? `『${quote}』的依据是什么？`
      : action.stance === 'agree' ? `我赞同『${quote}』这个说法。` : `我不认同『${quote}』这个说法。`;
  }
  return null;
}

/** Host-only re-derivation from the current owner's view, never a retained
 * global answer map or an arbitrary claim supplied by a player/model. */
export function resolveTrialTestimonySelection(input, token) {
  if (!testimonyCommand(token)) return null;
  const round = buildRound(input);
  const selection = round?.view.selections.find(row => row.token === token);
  if (!selection) return [1, 2, 3].includes(input?.statementReactionVersion) ? resolveStatementReaction(input, round?.view || null, token) : null;
  const audit = round.audits.find(row => row.token === token);
  return { roundId: round.view.id, index: round.view.index, source: { ...round.source }, excerpt: round.excerpt,
    stance: selection.stance, matched: ['agree', 'rebut'].includes(selection.stance)
      ? (audit ? audit.matched : selection.stance === 'agree') : null,
    ...(audit ? { citationAudit: true, quotedText: audit.quotedText } : {}) };
}

/** Called only by the new explicit operation. Historical actions never acquire
 * this optional ledger, and failed/stale capability validation changes nothing. */
export function recordTrialTestimonyAttempt(progress, actorId, selection) {
  // Asking and making an unverified claim are not failed proof attempts.
  // In particular they cannot advance a round or rewrite old ledgers.
  if (selection.kind === 'statement_reaction' || !['agree', 'rebut'].includes(selection.stance)) return progress;
  const prior = progressFor(progress, actorId);
  return { version: 1, byActor: { ...(progress?.version === 1 ? progress.byActor : {}),
    [actorId]: { completedRounds: count(prior?.completedRounds) + (selection.matched ? 1 : 0),
      attempts: count(prior?.attempts) + 1 } } };
}

export function testimonyFeedback(selection) {
  if (selection.kind === 'statement_reaction') return selection.communicationText;
  if (selection.stance === 'question') return `已展开【${selection.source.name}】的上下文：${selection.source.text}\n本次疑问只补充可查阅的出处与范围，尚未提交赞同或反驳，也不认定说话者的意图或任何人的责任。`;
  if (selection.stance === 'perjury') return selection.citationAudit
    ? `【${selection.source.name}】记载了「${selection.quotedText}」。`
    : `【${selection.source.name}】并未记载「${selection.excerpt}」。`;
  if (selection.citationAudit) {
    if (selection.matched) return `已核对【${selection.source.name}】：这份记录没有被声称的那处逐字引文，来源质疑成立。应回到记录中的「${selection.excerpt}」核对；不据此认定说话者撒谎、案情或责任；继续下一轮。`;
    const introduction = /(?:我叫|我是|吾辈是|本小姐是|名字是)/u;
    const name = introduction.test(selection.source.name) ? '刚才出示的标记记录' : selection.source.name;
    const citation = introduction.test(selection.excerpt) ? '标记的实际原文' : `『${selection.excerpt}』`;
    return `「先核对刚才公开的【${name}】。那处被声称为逐字原文的引句并不在这份记录里，不能据此认同其来源。可以先对照${citation}；这不判断说话者的内心，也不认定凶手；请再核对这一轮。」`;
  }
  if (selection.matched) return `已核对【${selection.source.name}】：标记的「${selection.excerpt}」与所引记录原文一致。只确认这一处来源连接，不认证整段证词、案情真相或任何人的责任；继续核对下一轮。`;
  // The existing introduction recognizer scans delivered speech. Never make
  // an NPC quoting a first-person source accidentally introduce herself (or
  // identify its author). The preceding action has the exact public source;
  // this alternative explicitly points back to that same marked record.
  const introduction = /(?:我叫|我是|吾辈是|本小姐是|名字是)/u;
  const name = introduction.test(selection.source.name) ? '刚才出示的标记记录' : selection.source.name;
  const citation = introduction.test(selection.excerpt) ? '标记的那处原文确实列在其中' : `其中确实写着『${selection.excerpt}』`;
  return `「先核对刚才公开的【${name}】。${citation}，所以不能说这处记载不存在。这里只确认引用与记录是否一致，不因此认定谁是凶手；请再核对这一轮。」`;
}

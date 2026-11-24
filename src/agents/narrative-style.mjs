import { ANTI_CLICHE_VERSION, IMPORTED_PROSE_RULES } from './anti-cliche-policy.mjs';

const QUOTE_PAIRS = Object.freeze([
  ['「', '」'], ['『', '』'], ['“', '”'], ['‘', '’'], ['【', '】'],
]);

const BINARY = /(?:不是|并非)([^。！？!?\n]{1,80}?)(?:而是|，\s*是|,\s*是)([^。！？!?\n]{1,80})/gu;
const REVERSE_BINARY = /是([^。！？!?\n]{1,80}?)[，,]\s*不是([^。！？!?\n]{1,80})/gu;
const REPEATED_NONE = /(?:(?:没|没有)[^。！？!?\n，,；;]{1,16}[，,]){2}(?![^。！？!?\n，,；;]{0,8}(?:只(?:是|会|有)|然而|但是|但|却))/gu;
const ONLY_TURN = /(?:没(?:有)?|没有)[^。！？!?\n，,；;]{1,16}[，,]\s*(?:没(?:有)?|没有)[^。！？!?\n，,；;]{1,20}[，,。][^。！？!?\n，,；;]{0,10}(?:只(?:是|会|有))/gu;
const CADENCE_WORDS = Object.freeze(['我意识到', '她意识到', '他意识到', '于是', '最终', '最后']);

const issue = (ruleId, start, end, match, confidence, suggestion) => Object.freeze({
  ruleId, start, end, match, confidence, suggestion,
});

function quoteMask(text, pairs = QUOTE_PAIRS) {
  const mask = Array.from(text, () => false);
  const stack = [];
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (stack.length && character === stack.at(-1)) {
      mask[index] = true;
      stack.pop();
      continue;
    }
    const pair = pairs.find(([open]) => open === character);
    if (pair) {
      mask[index] = true;
      stack.push(pair[1]);
      continue;
    }
    if (stack.length) mask[index] = true;
  }
  return mask;
}

function narrativeView(text, includeQuoted) {
  if (includeQuoted) return text;
  const mask = quoteMask(text);
  return Array.from(text, (character, index) => mask[index] ? ' ' : character).join('');
}

function validBinaryMatch(match, start, text) {
  const before = text.slice(Math.max(0, start - 8), start);
  const after = text.slice(start, start + match.length + 8);
  if (before.endsWith('是') || before.endsWith('还')) return false;
  if (/不是[^。！？!?\n]{0,40}(?:就是|也是)/u.test(match)) return false;
  if (/[?？]\s*$/u.test(match) || /(?:是吗|是吧|是嘛)/u.test(after)) return false;
  return true;
}

function collectRegexIssues(text, regex, ruleId, confidence, suggestion, filter = () => true) {
  const found = [];
  for (const match of text.matchAll(regex)) {
    const start = match.index ?? 0;
    const value = match[0];
    if (filter(value, start, text)) found.push(issue(ruleId, start, start + value.length, value, confidence, suggestion));
  }
  return found;
}

function paragraphCadence(text) {
  const paragraphs = text.split(/\n\s*\n/u).map(value => value.trim()).filter(Boolean);
  if (paragraphs.length < 3) return [];
  const found = [];
  for (const phrase of CADENCE_WORDS) {
    const matches = paragraphs.filter(paragraph => paragraph.includes(phrase));
    if (matches.length < 3) continue;
    let cursor = 0;
    for (const paragraph of paragraphs) {
      const local = paragraph.indexOf(phrase);
      if (local >= 0) {
        const start = text.indexOf(phrase, cursor);
        if (start >= 0) found.push(issue('repetitive-cadence', start, start + phrase.length, phrase, 'high', '让每段从不同的具体动作、声音或物件进入，避免统一的解释节奏。'));
        cursor = Math.max(cursor, start + phrase.length);
      }
    }
  }
  return found;
}

/**
 * Analyze prose patterns that often make generated Chinese sound templated.
 * This is intentionally advisory by default: a single contrast or a legal
 * negation is not enough to reject a candidate. Callers may treat only
 * repeated/high-confidence findings as a bounded repair request.
 */
export function analyzeNarrativeStyle(value, { scope = 'narrative', includeQuoted = false, antiClicheVersion } = {}) {
  if (typeof value !== 'string' || !value.trim()) return Object.freeze({ issues: [], blocking: false });
  const source = narrativeView(value, includeQuoted || scope === 'quoted');
  const issues = [
    ...collectRegexIssues(source, BINARY, 'not-is-comparison', 'advisory', '如果不是在纠正现场确有的误解，直接写出后半句的动作或判断。', validBinaryMatch),
    ...collectRegexIssues(source, REVERSE_BINARY, 'reverse-not-is', 'advisory', '把判断落在具体动作、感知或事实变化上，避免先立一个再推翻一个。', validBinaryMatch),
    ...collectRegexIssues(source, REPEATED_NONE, 'negation-parade', 'high', '删去否定清单，直接写现场实际存在的动作、物件或状态。'),
    ...collectRegexIssues(source, ONLY_TURN, 'negation-only-turn', 'high', '压缩否定铺垫，直接写“只是/只有”之后的真实动作或状态。'),
    ...paragraphCadence(source),
  ];
  if (antiClicheVersion === ANTI_CLICHE_VERSION && ['narrative', 'action', 'reflection'].includes(scope)) {
    // Scan UTF-16 units to preserve offsets across emoji/supplementary actors.
    // Existing v1 detectors keep their previous interpretation and thresholds.
    const mask = quoteMask(value, [...QUOTE_PAIRS, ['"', '"']]);
    const prose = value.split('').map((char, i) => mask[i] ? ' ' : char).join('');
    const imported = IMPORTED_PROSE_RULES.flatMap(({ id, re, suggestion }) => collectRegexIssues(prose, re, id, 'advisory', suggestion,
      (match, start) => !mask.slice(start, start + match.length).includes(true)));
    const stacked = imported.filter(hit => hit.ruleId === 'ornamental-intensity').length >= 2;
    issues.push(...imported.map(hit => stacked && hit.ruleId === 'ornamental-intensity' || hit.ruleId === 'stock-simile'
      || (hit.ruleId === 'formulaic-expression' && /弧度|四肢百骸|生理性地/u.test(hit.match))
      ? Object.freeze({ ...hit, confidence: 'revise' }) : hit));
  }
  issues.sort((left, right) => left.start - right.start || left.end - right.end);
  const repeatedBinary = issues.filter(item => ['not-is-comparison', 'reverse-not-is'].includes(item.ruleId)).length >= 2;
  const blocking = issues.some(item => item.confidence === 'high') || repeatedBinary;
  return Object.freeze({
    issues: Object.freeze(issues),
    blocking,
    scope,
    sourceLength: value.length,
  });
}

export function styleIssues(value, options) {
  return analyzeNarrativeStyle(value, options).issues;
}

export function hasBlockingStyleIssue(value, options) {
  return analyzeNarrativeStyle(value, options).blocking;
}

export function sceneStyleIssues(document, options) {
  if (!document || !Array.isArray(document.blocks)) return [];
  const blocks = document.blocks.flatMap((block, blockIndex) => block?.type === 'narration' && typeof block.text === 'string'
    ? [{ blockIndex, text: block.text }] : []);
  const offsets = [];
  let source = '';
  for (const block of blocks) {
    if (source) source += '\n\n';
    offsets.push({ blockIndex: block.blockIndex, start: source.length, end: source.length + block.text.length });
    source += block.text;
  }
  return analyzeNarrativeStyle(source, options).issues.flatMap(item => {
    const block = offsets.find(entry => item.start >= entry.start && item.start < entry.end);
    // A match must remain inside a single narration block. Only the repeated
    // paragraph cadence detector may legitimately aggregate separate blocks.
    if (!block || (item.end > block.end && item.ruleId !== 'repetitive-cadence')) return [];
    return [Object.freeze({ ...item, blockIndex: block.blockIndex,
      start: item.start - block.start, end: item.end - block.start })];
  });
}


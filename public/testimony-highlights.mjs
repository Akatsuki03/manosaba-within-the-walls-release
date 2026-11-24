// Plain-text, presentation-only ranges. Never interpret model markup or let a
// highlight carry a verdict, an arbitrary CSS color, or a game command.
export function normalizeTestimonyHighlights(text, ranges) {
  if (typeof text !== 'string' || !Array.isArray(ranges)) return [];
  const splitsSurrogate = index => index > 0 && index < text.length
    && /[\uD800-\uDBFF]/u.test(text[index - 1]) && /[\uDC00-\uDFFF]/u.test(text[index]);
  const valid = ranges.slice(0, 8).filter(range => Number.isSafeInteger(range?.start)
    && Number.isSafeInteger(range?.end) && range.start >= 0 && range.end > range.start
    && range.end <= text.length && !splitsSurrogate(range.start) && !splitsSurrogate(range.end))
    .map(({ start, end }) => ({ start, end })).sort((a, b) => a.start - b.start || a.end - b.end);
  const result = [];
  for (const range of valid) {
    if (result.length && range.start < result.at(-1).end) continue;
    result.push(range);
  }
  return result;
}

export function readTestimonyHighlights(node, text = node?.textContent) {
  try { return normalizeTestimonyHighlights(text, JSON.parse(node?.dataset?.testimonyHighlights || 'null')); }
  catch { return []; }
}

// A host-bound callback stays off the DOM and survives typewriter rewrapping.
// Plain span callers retain the original presentation-only behavior.
const interactions = new WeakMap();
export function bindTestimonyInteraction(node, interaction) {
  if (interaction) interactions.set(node, interaction); else interactions.delete(node);
}
export const readTestimonyInteraction = node => interactions.get(node);

export function paintTestimonyText(document, node, text, ranges, { offset = 0, interaction = readTestimonyInteraction(node) } = {}) {
  const clipped = (Array.isArray(ranges) ? ranges : []).map(range => ({
    start: Math.max(0, range.start - offset), end: Math.min(text.length, range.end - offset),
  }));
  const highlights = normalizeTestimonyHighlights(text, clipped);
  if (!highlights.length) { node.textContent = text; return; }
  const parts = []; let position = 0;
  const focused = document.activeElement;
  const restoreFocus = focused && node.contains?.(focused) ? focused.dataset?.testimonyPassage : undefined;
  const part = (value, range) => {
    if (!value) return;
    // Clipped prefixes/suffixes remain plain spans. Only a fully revealed,
    // host-bound range may become an interactive control.
    const complete = range && ranges.find(mark => mark.start === range.start + offset && mark.end === range.end + offset);
    const passage = complete && interaction?.passage(complete);
    const span = document.createElement(passage ? 'button' : 'span'); span.textContent = value;
    if (range) span.className = 'testimony-highlight';
    if (passage) {
      span.className += ' testimony-target testimony-transcript-target'; span.type = 'button';
      span.disabled = !interaction.isEnabled();
      span.dataset.testimonyPassage = JSON.stringify([complete.start, complete.end]);
      span.dataset.testimonyStart = String(complete.start); span.dataset.testimonyEnd = String(complete.end);
      span.setAttribute('aria-controls', 'trial-testimony');
      span.setAttribute('aria-label', `选择片段并查看回应：${value}`);
    }
    parts.push(span);
  };
  for (const range of highlights) {
    part(text.slice(position, range.start)); part(text.slice(range.start, range.end), range);
    position = range.end;
  }
  part(text.slice(position)); node.replaceChildren(...parts);
  if (restoreFocus !== undefined) parts.find(part => part.dataset?.testimonyPassage === restoreFocus)?.focus?.({ preventScroll: true });
}

// Keep formatted offsets separate from the host statement's UTF-16 offsets.
// Split dialogue fragments bind only to their unique, unchanged source slice.
export function formattedTestimonyPassages(raw, formatted, ranges, { fragment = raw } = {}) {
  if (typeof raw !== 'string' || typeof fragment !== 'string' || !fragment) return [];
  const base = raw === fragment ? 0 : raw.indexOf(fragment);
  if (base < 0 || (raw !== fragment && raw.indexOf(fragment, base + 1) >= 0)) return [];
  return normalizeTestimonyHighlights(raw, ranges).flatMap(range => {
    if (range.start < base || range.end > base + fragment.length) return [];
    return formattedTestimonyHighlights(fragment, formatted, [{ start: range.start - base, end: range.end - base }])
      .map(mark => ({ ...mark, statementStart: range.start, statementEnd: range.end }));
  });
}

// Dialogue formatting may add outer brackets or normalize quotes. Bind by an
// exact unchanged substring; if formatting changed the passage, do not guess.
export function formattedTestimonyHighlights(raw, formatted, ranges) {
  if (typeof raw !== 'string' || typeof formatted !== 'string') return [];
  return normalizeTestimonyHighlights(raw, ranges).flatMap(range => {
    const phrase = raw.slice(range.start, range.end);
    const expected = formatted.indexOf(raw) >= 0 ? formatted.indexOf(raw) + range.start : -1;
    if (expected >= 0 && formatted.slice(expected, expected + phrase.length) === phrase) {
      return [{ start: expected, end: expected + phrase.length }];
    }
    const start = formatted.indexOf(phrase);
    return start >= 0 && formatted.indexOf(phrase, start + 1) < 0 ? [{ start, end: start + phrase.length }] : [];
  });
}

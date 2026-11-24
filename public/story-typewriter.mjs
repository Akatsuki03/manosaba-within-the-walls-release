import { paintTestimonyText, readTestimonyHighlights, readTestimonyInteraction } from './testimony-highlights.mjs';

const CHARACTER_DELAY = 20;
const PARAGRAPH_DELAY = 120;
const segmenter = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter('zh-CN', { granularity: 'grapheme' }) : null;
const characters = text => segmenter ? Array.from(segmenter.segment(text), item => item.segment) : Array.from(text);
const delayAfter = char => /[。！？!?…]/u.test(char) ? 110 : /[，、；：,;:]/u.test(char) ? 55 : CHARACTER_DELAY;
const fingerprint = entry => JSON.stringify([entry?.speaker, entry?.delivery, entry?.text]);

// Presentation only: canonical entries and all game controls remain untouched.
// Full accessible text is kept separate from the progressively revealed spans.
export function mountStoryTypewriter(document, {
  isVisible = () => true,
  onProgress = () => {},
  requestFrame = globalThis.requestAnimationFrame?.bind(globalThis),
  cancelFrame = globalThis.cancelAnimationFrame?.bind(globalThis),
  reducedMotion = document.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)'),
} = {}) {
  const log = document.getElementById('log');
  let known; let records = []; let index = 0; let frame; let epoch = 0; let closed = false;
  let lastTime; let budget = 0; let wait = CHARACTER_DELAY; let following = true; let needsStartScroll = false;
  let scrollPosition = log?.scrollTop;
  let externallyPaused = false; let updating = false; let progressSignature;
  const revealedThrough = () => !known ? -1 : records[index] ? records[index].entryIndex - 1 : known.entries.length - 1;
  function notifyProgress() {
    if (updating || closed) return;
    const value = revealedThrough();
    const signature = `${known?.scope}:${value}:${active()}`;
    if (signature === progressSignature) return;
    progressSignature = signature;
    onProgress({ revealedThrough: value, active: active() });
  }
  const listeners = [];
  const listen = (node, type, callback, options) => {
    node?.addEventListener?.(type, callback, options);
    listeners.push(() => node?.removeEventListener?.(type, callback, options));
  };
  const active = () => !closed && index < records.length;
  const visible = () => !externallyPaused && isVisible() && !document.hidden;
  const articles = () => Array.from(log?.querySelectorAll('[data-entry-index]') || []);

  function pause() {
    epoch++;
    if (frame !== undefined) cancelFrame?.(frame);
    frame = undefined; lastTime = undefined;
  }
  function setScroll(top) {
    if (!log) return;
    log.scrollTop = top; scrollPosition = log.scrollTop;
  }
  function follow(record) {
    if (!following || !visible() || !record?.node) return;
    // Follow the last revealed line, not the invisible text reserving its layout.
    const rects = Array.from(record.revealed?.getClientRects?.() || []);
    const bounds = rects.at(-1) || record.node.getBoundingClientRect();
    const viewport = log.getBoundingClientRect();
    const bottom = rects.length ? bounds.bottom : bounds.top + 32;
    if (bottom > viewport.bottom - 12) setScroll(log.scrollTop + bottom - viewport.bottom + 12);
    else if (bottom < viewport.top + 12) setScroll(log.scrollTop + bottom - viewport.top - 12);
  }
  function paintRecord(record) {
    if (!record.node) return;
    if (record.count >= record.units.length) {
      paintTestimonyText(document, record.node, record.text, record.highlights);
      record.revealed = record.remaining = record.accessible = undefined;
    } else if (record.revealed) {
      const revealed = record.units.slice(0, record.count).join('');
      const interaction = readTestimonyInteraction(record.node);
      const remaining = record.units.slice(record.count).join('');
      paintTestimonyText(document, record.revealed, revealed, record.highlights, { interaction });
      // Hidden layout text never contains a focusable target, even if its
      // range is complete or it belongs to a later pending paragraph.
      paintTestimonyText(document, record.remaining, remaining, record.highlights, { offset: revealed.length, interaction: null });
      if (record.accessible && interaction) record.accessible.textContent = remaining;
    }
  }
  function paintArticles() {
    const current = records[index];
    for (const article of articles()) {
      const entryIndex = Number(article.dataset.entryIndex); const fragment = article.dataset.entryFragment || '0';
      const first = records.findIndex(record => record.entryIndex === entryIndex && record.fragment === fragment);
      const pending = current !== undefined && first > index;
      if (pending) article.dataset.storyPending = 'true'; else delete article.dataset.storyPending;
      article.classList.toggle('is-typing', active() && entryIndex === current?.entryIndex && fragment === current?.fragment);
    }
    for (const [recordIndex, record] of records.entries()) {
      if (!record.revealed) continue;
      if (recordIndex === index) record.revealed.dataset.storyCaret = 'true'; else delete record.revealed.dataset.storyCaret;
    }
    if (log) {
      if (active()) log.dataset.storyTyping = 'true'; else delete log.dataset.storyTyping;
      log.setAttribute('aria-busy', String(active()));
    }
  }
  function finish({ follow: shouldFollow = following } = {}) {
    pause(); following = shouldFollow;
    for (const record of records) { record.count = record.units.length; paintRecord(record); }
    index = records.length; needsStartScroll = false; paintArticles();
    if (log && following && visible()) setScroll(log.scrollHeight);
    notifyProgress();
  }
  function bind() {
    for (const record of records) {
      const article = articles().find(node => Number(node.dataset.entryIndex) === record.entryIndex
        && (node.dataset.entryFragment || '0') === record.fragment);
      record.node = article?.querySelector('.dialogue-message')?.querySelectorAll('p')[record.paragraphIndex];
      record.revealed = record.remaining = record.accessible = undefined;
      if (!record.node) continue;
      // Ranges and callbacks belong to the replacement DOM/current host
      // projection, not to the previous same-text typewriter record.
      record.highlights = readTestimonyHighlights(record.node, record.text);
      if (record.count >= record.units.length) { paintRecord(record); continue; }
      const accessible = document.createElement('span'); accessible.className = 'sr-only'; accessible.textContent = record.text;
      record.accessible = accessible;
      record.revealed = document.createElement('span'); record.revealed.className = 'story-revealed';
      record.remaining = document.createElement('span'); record.remaining.className = 'story-unrevealed';
      record.remaining.setAttribute('aria-hidden', 'true');
      if (readTestimonyInteraction(record.node)) {
        // Interactive revealed text must not live under aria-hidden. Keep its
        // plain accessible remainder in order without duplicating the phrase.
        record.node.replaceChildren(record.revealed, accessible, record.remaining);
      } else {
        record.revealed.setAttribute('aria-hidden', 'true');
        record.node.replaceChildren(accessible, record.revealed, record.remaining);
      }
      paintRecord(record);
    }
    paintArticles();
  }
  function schedule() {
    if (frame !== undefined || !active() || !visible()) return;
    if (reducedMotion?.matches || !requestFrame) { finish(); return; }
    const ownEpoch = epoch;
    frame = requestFrame(time => {
      if (closed || ownEpoch !== epoch) return;
      frame = undefined;
      if (!active() || !visible()) { lastTime = undefined; return; }
      budget += lastTime === undefined ? CHARACTER_DELAY : Math.min(64, Math.max(0, time - lastTime));
      lastTime = time;
      const changed = new Set(); const before = index;
      while (index < records.length && budget >= wait) {
        budget -= wait;
        const record = records[index];
        const char = record.units[record.count++]; changed.add(record);
        wait = delayAfter(char);
        if (record.count >= record.units.length) { index++; wait += PARAGRAPH_DELAY; }
      }
      for (const record of changed) paintRecord(record);
      if (index !== before) { paintArticles(); notifyProgress(); }
      follow(records[Math.min(index, records.length - 1)]);
      if (active()) schedule();
      else if (following) setScroll(log.scrollHeight);
    });
  }
  function sync() {
    if (closed) return;
    if (!visible()) { pause(); return; }
    if (reducedMotion?.matches || !requestFrame) { if (active()) finish(); return; }
    if (needsStartScroll && active()) {
      const first = log.querySelector(`[data-entry-index="${records[index].entryIndex}"]`);
      if (first) setScroll(log.scrollTop + first.getBoundingClientRect().top - log.getBoundingClientRect().top);
      needsStartScroll = false;
    }
    schedule();
  }
  function update(view) {
    if (closed || !log || !Array.isArray(view?.entries)) return;
    if (known && (view.generation < known.generation
      || (view.generation === known.generation && view.revision < known.revision))) return;
    const scope = JSON.stringify([view.exampleId, view.scenarioId, view.generation]);
    const entries = view.entries.map(fingerprint);
    const sameScope = known?.scope === scope;
    const sameText = sameScope && entries.length === known.entries.length && entries.every((entry, i) => entry === known.entries[i]);
    updating = true; pause();
    if (!sameText) {
      finish({ follow: false });
      const appended = sameScope && entries.length > known.entries.length && known.entries.every((entry, i) => entry === entries[i]);
      const latest = (view.turns || []).findLast(turn => Number.isSafeInteger(turn?.entryStart) && turn.entryStart >= 0
        && Number.isSafeInteger(turn.entryEnd) && turn.entryEnd > turn.entryStart && turn.entryEnd <= entries.length);
      const start = appended ? known.entries.length : latest?.entryStart ?? 0;
      records = [];
      for (const article of articles()) {
        const entryIndex = Number(article.dataset.entryIndex);
        if (entryIndex < start) continue;
        const paragraphs = article.querySelector('.dialogue-message')?.querySelectorAll('p') || [];
        for (const [paragraphIndex, node] of Array.from(paragraphs).entries()) {
          const text = node.textContent;
          if (text) records.push({ entryIndex, fragment: article.dataset.entryFragment || '0', paragraphIndex,
            text, highlights: readTestimonyHighlights(node, text), units: characters(text), count: 0 });
        }
      }
      index = 0; budget = 0; wait = CHARACTER_DELAY; following = true; needsStartScroll = true;
    }
    known = { scope, entries, generation: view.generation, revision: view.revision };
    bind(); scrollPosition = log.scrollTop;
    updating = false; notifyProgress(); sync();
  }

  listen(log, 'scroll', () => {
    if (active() && Math.abs(log.scrollTop - scrollPosition) > 2) following = false;
    scrollPosition = log.scrollTop;
  }, { passive: true });
  listen(log, 'click', event => {
    if (!active() || !visible() || event.button > 0 || event.target?.closest?.('button, a, input, textarea, select, [contenteditable="true"]')) return;
    if (document.defaultView?.getSelection?.()?.isCollapsed === false) return;
    finish();
  });
  listen(log, 'keydown', event => {
    if (!active() || !visible() || event.key !== ' ' || event.isComposing || event.repeat
      || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey
      || event.target?.closest?.('button, a, input, textarea, select, [contenteditable="true"]')) return;
    if (document.defaultView?.getSelection?.()?.isCollapsed === false) return;
    event.preventDefault(); finish();
  });
  listen(document, 'visibilitychange', sync);
  listen(document.defaultView, 'pagehide', pause);
  listen(document.defaultView, 'pageshow', sync);
  listen(reducedMotion, 'change', sync);

  return {
    update, sync, finish,
    get active() { return active(); },
    get revealedThrough() { return revealedThrough(); },
    hasReached(entryIndex) {
      return Number.isSafeInteger(entryIndex) && entryIndex >= 0 && entryIndex < (known?.entries.length || 0)
        && entryIndex <= revealedThrough();
    },
    setPaused(value) { externallyPaused = value === true; if (externallyPaused) pause(); else sync(); },
    pause() { externallyPaused = true; pause(); },
    resume() { externallyPaused = false; sync(); },
    close() {
      if (closed) return;
      finish({ follow: false }); closed = true;
      for (const remove of listeners) remove();
    },
  };
}

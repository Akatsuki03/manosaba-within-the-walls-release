import { normalizePresentation } from './scene-playback.mjs';

// Artwork/composition reference: https://www.bilibili.com/video/BV1y8WhziEFL/ .
// Gameplay pacing is deliberately shorter: a continuous outward unfold and
// staggered title settle within 800 ms, then one full second to read the title
// before a 200 ms dissolve. Do not uniformly speed up the title's reading hold.
export const TRIAL_OPENING_TIMELINE = Object.freeze({
  emblem: 0, unfold: 80, title: 360, hold: 800, exit: 1800, end: 2000,
});
export const TRIAL_OPENING_DURATION = TRIAL_OPENING_TIMELINE.end;
const phaseAt = elapsed => elapsed < TRIAL_OPENING_TIMELINE.unfold ? 'emblem'
  : elapsed < TRIAL_OPENING_TIMELINE.title ? 'unfold'
    : elapsed < TRIAL_OPENING_TIMELINE.hold ? 'title'
      : elapsed < TRIAL_OPENING_TIMELINE.exit ? 'hold' : 'exit';
const scopeFor = view => JSON.stringify([view?.exampleId, view?.scenarioId, view?.generation]);

// An ephemeral media cue, not a game action or saved playback position. Only
// newly committed host frames can start it; initial loads and generation
// changes establish a baseline, so reading/reloading old trials never replays it.
export function mountTrialOpening(document, {
  isVisible = () => true,
  isSuspended = () => false,
  requestFrame = globalThis.requestAnimationFrame?.bind(globalThis),
  cancelFrame = globalThis.cancelAnimationFrame?.bind(globalThis),
  reducedMotion = document.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)'),
  onActiveChange = () => {},
} = {}) {
  const root = document.getElementById('trial-opening');
  const skip = document.getElementById('trial-opening-skip');
  let known; let current; let frame; let epoch = 0; let lastTime; let elapsed = 0; let closed = false;
  let previousFocus;
  const listeners = [];
  const listen = (node, type, callback) => {
    node?.addEventListener?.(type, callback);
    listeners.push(() => node?.removeEventListener?.(type, callback));
  };
  const visible = () => isVisible() && !isSuspended() && !document.hidden;
  const make = (tag, className) => {
    const node = document.createElement(tag); node.className = className; return node;
  };
  function artwork(name, className) {
    const pair = make('span', `opening-art ${className}`);
    // These exported textures include substantial transparent packing margins.
    // Crop through a shared viewport, retaining the original PNG bytes/pairs.
    const sprite = make('span', 'opening-sprite');
    for (const variant of ['Normal', 'White']) {
      const image = make('img', variant === 'White' ? 'opening-white' : 'opening-normal');
      image.src = `/assets/trial/${name.replace('{variant}', variant)}.png`;
      image.alt = ''; image.setAttribute('aria-hidden', 'true'); image.decoding = 'async';
      image.addEventListener('error', () => { image.hidden = true; }, { once: true });
      sprite.append(image);
    }
    pair.append(sprite); return pair;
  }
  function build() {
    if (!root || root.querySelector('[data-opening-stage]')) return;
    const stage = make('div', 'opening-stage'); stage.dataset.openingStage = '';
    stage.setAttribute('aria-hidden', 'true');
    const composition = make('div', 'opening-composition');
    for (const side of ['left', 'right']) {
      const emblem = make('div', `opening-emblem opening-emblem-${side}`);
      emblem.append(artwork('Debate_Deco_Flame_{variant}', 'opening-flame'),
        artwork('Debate_Deco_Libra_{variant}', 'opening-libra'),
        artwork('Debate_Deco_Line_{variant}', 'opening-line'));
      composition.append(emblem);
    }
    const title = make('div', 'opening-title');
    for (let index = 1; index <= 4; index++) {
      title.append(artwork(`Debate_Text_Begin_${index}_{variant}@ZhHans`, `opening-letter opening-letter-${index}`));
    }
    composition.append(title, artwork('Debate_Deco_Book_{variant}', 'opening-book'));
    stage.append(composition); root.append(stage);
  }
  function paint() {
    root.dataset.phase = phaseAt(elapsed);
    // All CSS keyframes are paused and scrubbed by this same foreground clock.
    // Visibility changes therefore pause the actual artwork, not only its timer.
    root.style.setProperty('--opening-elapsed', `${-elapsed}ms`);
  }
  function pause() {
    epoch++;
    if (frame !== undefined) cancelFrame?.(frame);
    frame = undefined; lastTime = undefined;
    if (root && current) root.dataset.paused = 'true';
  }
  function finish() {
    pause();
    if (!current) return;
    current = undefined;
    if (root) {
      root.hidden = true;
      for (const key of ['phase', 'playing', 'cue', 'paused']) delete root.dataset[key];
    }
    const restoreFocus = root?.contains?.(document.activeElement) && previousFocus?.isConnected !== false ? previousFocus : null;
    previousFocus = undefined; onActiveChange(false);
    restoreFocus?.focus?.({ preventScroll: true });
  }
  function schedule() {
    if (closed || !current || frame !== undefined || !visible()) return;
    const ownEpoch = epoch;
    frame = requestFrame(time => {
      if (closed || ownEpoch !== epoch || !current) return;
      frame = undefined;
      if (!visible()) { pause(); return; }
      if (lastTime !== undefined) elapsed += Math.min(100, Math.max(0, time - lastTime));
      lastTime = time;
      if (elapsed >= TRIAL_OPENING_DURATION) { finish(); return; }
      paint(); schedule();
    });
  }
  function sync() {
    if (!current || closed) return;
    if (!isVisible()) { finish(); return; }
    if (document.hidden || isSuspended()) { pause(); return; }
    if (reducedMotion?.matches || !requestFrame) { finish(); return; }
    root.dataset.paused = 'false'; schedule();
  }
  function start(cue) {
    if (!root || !visible() || reducedMotion?.matches || !requestFrame) return;
    finish(); build(); current = cue; elapsed = 0; lastTime = undefined;
    previousFocus = document.activeElement;
    root.hidden = false; root.dataset.cue = cue.id; root.dataset.playing = 'true';
    root.style.setProperty('--opening-duration', `${TRIAL_OPENING_DURATION}ms`); paint();
    onActiveChange(true); skip?.focus?.({ preventScroll: true }); sync();
  }
  function update(view) {
    if (closed || !root || !Number.isSafeInteger(view?.generation) || !Number.isSafeInteger(view?.revision)) return;
    if (known && (view.generation < known.generation
      || (view.generation === known.generation && view.revision < known.revision))) return;
    const presentation = normalizePresentation(view);
    const next = { scope: scopeFor(view), generation: view.generation, revision: view.revision,
      count: Array.isArray(view.entries) ? view.entries.length : 0,
      lineage: (view.turns || []).map(turn => [turn.id, turn.entryStart, turn.entryEnd]) };
    const appended = known && next.scope === known.scope && next.revision > known.revision && next.count > known.count
      && known.lineage.every((turn, index) => JSON.stringify(turn) === JSON.stringify(next.lineage[index]));
    const cue = appended && known.stage === 'assembly' && view.trial?.stage === 'discussion'
      ? presentation?.scenes.flatMap(scene => scene.frames).findLast(row => row.entryIndex >= known.count && row.trialOpening)?.trialOpening : null;
    if (known && (next.scope !== known.scope || view.trial?.stage !== 'discussion')) finish();
    known = { ...next, stage: view.trial?.stage };
    if (view.trial?.stage === 'assembly') build();
    if (cue) start(cue);
  }
  listen(skip, 'click', finish);
  listen(document, 'keydown', event => {
    if (!current || !visible() || event.key !== 'Escape' || event.isComposing || event.repeat
      || document.querySelector?.('dialog[open]')) return;
    event.preventDefault(); event.stopPropagation?.(); finish();
  });
  listen(document, 'visibilitychange', sync);
  listen(document.defaultView, 'pagehide', finish);
  listen(reducedMotion, 'change', sync);
  return { update, sync, finish, get active() { return Boolean(current); },
    close() { if (closed) return; finish(); closed = true; for (const remove of listeners) remove(); } };
}

// A presentation-only handoff. No requests, persisted state or gameplay clocks.
export const SCREEN_TRANSITION_TIMELINE = Object.freeze({ covered: 200, reveal: 550, end: 800 });
const phaseAt = elapsed => elapsed < SCREEN_TRANSITION_TIMELINE.covered ? 'covering'
  : elapsed < SCREEN_TRANSITION_TIMELINE.reveal ? 'covered' : 'revealing';

export function mountScreenTransition(document, {
  requestFrame = globalThis.requestAnimationFrame?.bind(globalThis),
  cancelFrame = globalThis.cancelAnimationFrame?.bind(globalThis),
  scheduleTimeout = globalThis.setTimeout?.bind(globalThis),
  cancelTimeout = globalThis.clearTimeout?.bind(globalThis),
  now = () => globalThis.performance.now(),
  reducedMotion = document.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)'),
  onActiveChange = () => {},
} = {}) {
  const root = document.getElementById('screen-transition');
  const images = [...(root?.querySelectorAll('img') || [])];
  const screens = [document.getElementById('title-screen'), document.getElementById('game-screen'),
    document.querySelector?.('body > footer')].filter(Boolean);
  const listeners = [];
  let current; let frame; let deadline; let epoch = 0; let closed = false; let artworkReady = false;
  const loaded = () => images.length === 2 && images.every(image => image.complete && image.naturalWidth > 0);
  // Decode eagerly, but never wait for artwork in a navigation handler.
  if (loaded() && images.every(image => typeof image.decode !== 'function')) artworkReady = true;
  else Promise.all(images.map(image => image.decode?.())).then(() => { artworkReady = loaded(); }).catch(() => {});
  const listen = (node, type, callback, options) => {
    node?.addEventListener?.(type, callback, options);
    listeners.push(() => node?.removeEventListener?.(type, callback, options));
  };
  function commit(pending) {
    if (pending.committed) return;
    pending.committed = true;
    try { pending.commit(); } catch (error) { pending.error = error; }
  }
  function paint(elapsed) {
    root.dataset.phase = phaseAt(elapsed);
    root.style.setProperty('--screen-transition-elapsed', `${-elapsed}ms`);
  }
  function finish() {
    const pending = current;
    if (!pending) return;
    epoch++;
    if (frame !== undefined) cancelFrame?.(frame);
    if (deadline !== undefined) cancelTimeout?.(deadline);
    frame = deadline = undefined;
    // Escape, backgrounding and watchdog completion still deliver the intended
    // destination once. They never cancel a successful load or replay a command.
    commit(pending);
    current = undefined;
    if (root) {
      root.hidden = true;
      delete root.dataset.playing; delete root.dataset.phase; delete root.dataset.target;
    }
    for (const [screen, inert] of pending.inert) screen.inert = inert;
    try { onActiveChange(false); } catch (error) { pending.error ??= error; }
    try { if (!pending.error && !document.hidden) pending.onComplete?.(); }
    catch (error) { pending.error ??= error; }
    if (pending.error) pending.reject(pending.error); else pending.resolve();
  }
  function schedule() {
    const pending = current; const ownEpoch = epoch;
    frame = requestFrame(time => {
      if (closed || current !== pending || epoch !== ownEpoch) return;
      frame = undefined;
      if (document.hidden || reducedMotion?.matches) { finish(); return; }
      const elapsed = Math.max(0, time - pending.startedAt);
      if (elapsed >= SCREEN_TRANSITION_TIMELINE.end) { finish(); return; }
      if (!pending.committed && elapsed >= SCREEN_TRANSITION_TIMELINE.covered) {
        // Even a dropped frame that jumps into the reveal must swap at an
        // opaque sample; the normal elapsed sample resumes on the next frame.
        paint(SCREEN_TRANSITION_TIMELINE.covered); commit(pending);
      } else paint(elapsed);
      if (pending.error) { finish(); return; }
      if (current === pending) schedule();
    });
  }
  function run({ target, commit: changeScreen, onComplete }) {
    // Repeated or opposing requests during the handoff never create a queue.
    if (current) return current.promise;
    if (closed || !root || !requestFrame || !scheduleTimeout || document.hidden || reducedMotion?.matches
      || !artworkReady || !loaded() || document.querySelector?.('dialog[open]')) {
      changeScreen();
      if (!document.hidden) onComplete?.();
      return Promise.resolve();
    }
    const pending = { target, commit: changeScreen, onComplete, committed: false, startedAt: now(),
      inert: screens.map(screen => [screen, Boolean(screen.inert)]) };
    pending.promise = new Promise((resolve, reject) => { pending.resolve = resolve; pending.reject = reject; });
    current = pending; epoch++;
    root.hidden = false; root.dataset.playing = 'true'; root.dataset.target = target;
    paint(0);
    root.focus?.({ preventScroll: true });
    for (const [screen] of pending.inert) screen.inert = true;
    const ownEpoch = epoch;
    deadline = scheduleTimeout(() => { if (current === pending && epoch === ownEpoch) finish(); }, 1000);
    try { onActiveChange(true); if (current === pending) schedule(); }
    catch (error) { pending.error = error; finish(); }
    return pending.promise;
  }
  const block = event => {
    if (!current) return;
    event.preventDefault(); event.stopImmediatePropagation?.();
    if (event.type === 'keydown' && event.key === 'Escape' && !event.repeat && !event.isComposing) finish();
  };
  for (const type of ['click', 'pointerdown', 'keydown', 'keyup', 'submit']) listen(document, type, block, true);
  listen(document, 'visibilitychange', () => { if (document.hidden) finish(); });
  listen(document.defaultView, 'pagehide', finish);
  listen(reducedMotion, 'change', () => { if (reducedMotion.matches) finish(); });
  listen(root, 'animationcancel', () => {
    // Removing the previous paused keyframes can deliver a late cancel event.
    // A live cover belongs to the next handoff and must not be cancelled by it.
    if (root.getAnimations?.().some(animation => animation.animationName === 'screen-transition-cover')) return;
    finish();
  });
  for (const image of images) listen(image, 'error', () => { artworkReady = false; finish(); });
  return { run, finish, get active() { return Boolean(current); },
    close() { if (closed) return; closed = true; finish(); for (const remove of listeners) remove(); } };
}

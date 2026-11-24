// Interaction/art and SFX reference: https://github.com/PolarisSdesu/shosu
// and https://shosu.polarissdesu.cn/ (5.5 s, bottom-up #953949 fill).
// Unlike the standalone toy, filling never submits a game command: the user
// must release the same pointer/key after charging, with the verdict still valid.
export const EXECUTION_HOLD_MS = 5500;
export const EXECUTION_MEDIA = Object.freeze({
  hold: '/assets/execution/hold.mp3', finished: '/assets/execution/finished.mp3',
});

export function mountExecutionSeal(document, {
  canInteract = () => true,
  onConfirm = () => {},
  getAudioPreferences = () => ({ volume: 0.45, muted: false }),
  createAudio = () => new Audio(),
  requestFrame = globalThis.requestAnimationFrame?.bind(globalThis),
  cancelFrame = globalThis.cancelAnimationFrame?.bind(globalThis),
} = {}) {
  const root = document.getElementById('case-execution-dialog');
  const button = document.getElementById('case-execution-confirm');
  const status = document.getElementById('case-execution-hold-status');
  const sound = document.getElementById('case-execution-sound');
  let input; let frame; let epoch = 0; let elapsed = 0; let lastTime;
  let charged = false; let closed = false; let muted = false;
  let holdAudio; let finishAudio; let audioEpoch = 0;
  const listeners = [];
  const listen = (node, type, callback) => {
    node?.addEventListener?.(type, callback);
    listeners.push(() => node?.removeEventListener?.(type, callback));
  };
  const available = () => !closed && root?.open && !document.hidden && !button?.disabled && canInteract();
  function pause(audio, rewind = true) {
    try { audio?.pause(); if (audio && rewind) audio.currentTime = 0; } catch { /* Media failure is local. */ }
  }
  function volume() {
    const prefs = getAudioPreferences() || {};
    const value = Number.isFinite(prefs.volume) ? Math.min(1, Math.max(0, prefs.volume)) : 0.45;
    for (const audio of [holdAudio, finishAudio]) if (audio) {
      audio.volume = value; audio.muted = muted || prefs.muted === true;
    }
  }
  function audioFailure() {
    if (status && input) status.textContent = '音效暂不可用；可继续长按，填满后松开确认。';
  }
  function play(audio) {
    try { Promise.resolve(audio?.play()).catch(audioFailure); } catch { audioFailure(); }
  }
  function startAudio() {
    try {
      if (!holdAudio) {
        holdAudio = createAudio(); holdAudio.src = EXECUTION_MEDIA.hold; holdAudio.loop = true; holdAudio.preload = 'auto';
        finishAudio = createAudio(); finishAudio.src = EXECUTION_MEDIA.finished; finishAudio.preload = 'auto';
      }
      const ownEpoch = ++audioEpoch;
      pause(holdAudio); pause(finishAudio); volume();
      // Unlock the second clip during this real gesture, as the reference does.
      finishAudio.muted = true;
      Promise.resolve(finishAudio.play()).then(() => {
        if (ownEpoch !== audioEpoch) return;
        pause(finishAudio); volume();
      }, () => {});
      play(holdAudio);
    } catch { audioFailure(); }
  }
  function paint() {
    button.style.setProperty('--execution-fill', `${Math.min(100, elapsed / EXECUTION_HOLD_MS * 100)}%`);
    button.dataset.sealPhase = charged ? 'charged' : input ? 'holding' : 'idle';
  }
  function cancel() {
    const previous = input;
    input = undefined; charged = false; elapsed = 0; lastTime = undefined; epoch++;
    if (frame !== undefined) cancelFrame?.(frame);
    frame = undefined;
    pause(holdAudio);
    if (previous) { audioEpoch++; pause(finishAudio); }
    if (previous?.kind === 'pointer') {
      try { button.releasePointerCapture?.(previous.id); } catch { /* Capture may already be lost. */ }
    }
    if (button) paint();
    if (status) status.textContent = '按住 5.5 秒，填满后松开确认；提前松开或移开即取消。';
  }
  function schedule() {
    if (!input || charged || frame !== undefined || !requestFrame) return;
    const ownEpoch = epoch;
    frame = requestFrame(time => {
      if (closed || ownEpoch !== epoch || !input) return;
      frame = undefined;
      if (!available()) { cancel(); return; }
      if (lastTime !== undefined) elapsed += Math.min(100, Math.max(0, time - lastTime));
      lastTime = time;
      if (elapsed >= EXECUTION_HOLD_MS) {
        charged = true; audioEpoch++; pause(holdAudio); volume(); play(finishAudio);
        if (status) status.textContent = '已填满。松开确认提交；移开或按 Escape 仍可取消。';
      }
      paint(); schedule();
    });
  }
  function start(next) {
    if (input || !available() || !requestFrame) return;
    cancel(); input = next; startAudio(); paint(); schedule();
    if (status) status.textContent = '正在确认……请持续按住，填满后松开。';
  }
  function release() {
    if (!input) return;
    const shouldConfirm = charged && available();
    // Clear the owning gesture before releasing capture/closing the dialog.
    const previous = input; input = undefined;
    if (previous.kind === 'pointer') {
      try { button.releasePointerCapture?.(previous.id); } catch { /* Already released. */ }
    }
    cancel();
    if (shouldConfirm) onConfirm();
    else { audioEpoch++; pause(finishAudio); }
  }
  listen(button, 'pointerdown', event => {
    if ((event.button !== undefined && event.button !== 0) || event.isPrimary === false || !available()) return;
    event.preventDefault(); button.focus?.({ preventScroll: true });
    start({ kind: 'pointer', id: event.pointerId });
    if (input) try { button.setPointerCapture?.(event.pointerId); } catch { /* Document release fallback remains. */ }
  });
  const outside = event => {
    const box = button.getBoundingClientRect?.();
    return box && Number.isFinite(event.clientX) && Number.isFinite(event.clientY)
      && (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom);
  };
  const pointerUp = event => {
    if (input?.kind !== 'pointer' || input.id !== event.pointerId) return;
    if (outside(event)) cancel(); else release();
  };
  listen(button, 'pointerup', pointerUp);
  listen(document, 'pointerup', pointerUp);
  for (const type of ['pointercancel', 'lostpointercapture', 'pointerleave']) {
    listen(button, type, event => { if (input?.kind === 'pointer' && (event.pointerId === undefined || input.id === event.pointerId)) cancel(); });
  }
  listen(button, 'pointermove', event => {
    if (input?.kind !== 'pointer' || input.id !== event.pointerId) return;
    if (outside(event)) cancel();
  });
  listen(button, 'keydown', event => {
    if (![' ', 'Enter'].includes(event.key) || event.isComposing) return;
    event.preventDefault(); if (!event.repeat) start({ kind: 'key', key: event.key });
  });
  listen(button, 'keyup', event => {
    if (input?.kind !== 'key' || input.key !== event.key) return;
    event.preventDefault(); release();
  });
  // A synthetic/native click is never a shortcut around the held gesture.
  listen(button, 'click', event => { event.preventDefault(); });
  listen(button, 'contextmenu', event => event.preventDefault());
  listen(button, 'blur', cancel);
  listen(root, 'close', cancel);
  listen(root, 'cancel', cancel);
  listen(document, 'keydown', event => { if (event.key === 'Escape' && input) cancel(); });
  const suspend = () => { cancel(); audioEpoch++; pause(finishAudio); };
  listen(document, 'visibilitychange', () => { if (document.hidden) suspend(); });
  listen(document.defaultView, 'blur', suspend);
  listen(document.defaultView, 'pagehide', suspend);
  listen(sound, 'click', () => {
    muted = !muted; volume(); sound.setAttribute('aria-pressed', String(!muted));
    sound.textContent = muted ? '处刑音效：关' : '处刑音效：开';
  });
  cancel();
  return { cancel, sync() { if (input && !available()) cancel(); },
    get active() { return Boolean(input); },
    close() { if (closed) return; suspend(); closed = true; for (const remove of listeners) remove(); },
  };
}

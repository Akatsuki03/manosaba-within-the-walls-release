const STORAGE_KEY = 'manosaba.bgm.v1';
const DEFAULT_VOLUME = 0.45;

function browserStorage() {
  try { return globalThis.localStorage; } catch { return undefined; }
}
function preferences(storage) {
  try {
    const saved = JSON.parse(storage?.getItem(STORAGE_KEY) || 'null');
    return {
      enabled: saved?.enabled !== false,
      volume: typeof saved?.volume === 'number' && Number.isFinite(saved.volume) ? Math.min(1, Math.max(0, saved.volume)) : DEFAULT_VOLUME,
      muted: saved?.muted === true,
      loop: saved?.loop !== false,
    };
  } catch { return { enabled: true, volume: DEFAULT_VOLUME, muted: false, loop: true }; }
}
function normalizeTrack(track) {
  if (!track || !/^d[123]-\d{2}$/u.test(track.id) || typeof track.loop !== 'boolean') return null;
  return { id: track.id, loop: track.loop, durationSec: Number.isFinite(track.durationSec) && track.durationSec > 0 ? track.durationSec : 0 };
}
export function formatMusicTime(seconds) {
  const value = Number.isFinite(seconds) && seconds >= 0 ? Math.floor(seconds) : 0;
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`;
}

// Presentation only: this controller never submits game commands or owns story time.
// Audio is created only after a real page gesture; source/play failures stay local.
export class BgmPlayer {
  #createAudio; #storage; #onChange; #prefs;
  #audio; #track = null; #unlocked = false; #status = 'idle';
  #version = 0; #attempt = 0; #pending = false; #switching = false;
  #position = 0; #duration = 0; #canSeek = false;

  constructor({ createAudio = () => new Audio(), storage = browserStorage(), onChange = () => {} } = {}) {
    this.#createAudio = createAudio;
    this.#storage = storage;
    this.#onChange = onChange;
    this.#prefs = preferences(storage);
  }
  get snapshot() {
    return {
      id: this.#track?.id || null, status: this.#status,
      enabled: this.#prefs.enabled, volume: this.#prefs.volume, muted: this.#prefs.muted,
      loop: this.#prefs.loop,
      currentTime: this.#position, duration: this.#duration, canSeek: this.#canSeek,
    };
  }
  #emit() { this.#onChange(this.snapshot); }
  #save() {
    try { this.#storage?.setItem(STORAGE_KEY, JSON.stringify(this.#prefs)); } catch { /* Private mode/quota must not affect playback or gameplay. */ }
  }
  #ensureAudio() {
    if (this.#audio) return this.#audio;
    const audio = this.#createAudio();
    this.#audio = audio;
    audio.preload = 'metadata';
    audio.setAttribute('playsinline', '');
    audio.volume = this.#prefs.volume;
    audio.muted = this.#prefs.muted;
    audio.loop = this.snapshot.loop;
    audio.addEventListener('loadedmetadata', () => this.#readProgress(true));
    audio.addEventListener('durationchange', () => this.#readProgress(true));
    audio.addEventListener('timeupdate', () => this.#readProgress());
    audio.addEventListener('seeked', () => this.#readProgress());
    audio.addEventListener('playing', () => {
      if (!this.#track || !this.#prefs.enabled) { audio.pause(); return; }
      // Source changes reset these flags before queued events from the old
      // resource arrive. Only the current media state can confirm playback.
      if (this.#switching || audio.paused || audio.ended || audio.error || audio.readyState < 3) return;
      this.#status = 'playing'; this.#emit();
    });
    audio.addEventListener('pause', () => {
      if (this.#switching || !this.#track || !audio.paused || ['error', 'blocked', 'ended'].includes(this.#status) || this.#pending) return;
      this.#status = audio.ended ? 'ended' : 'paused'; this.#emit();
    });
    for (const event of ['waiting', 'stalled']) audio.addEventListener(event, () => {
      if (this.#track && this.#prefs.enabled && !audio.paused && this.#status !== 'error') {
        this.#status = 'loading'; this.#emit();
      }
    });
    audio.addEventListener('ended', () => {
      if (!this.#track || this.#switching || !audio.ended) return;
      ++this.#attempt; this.#pending = false; this.#status = 'ended'; this.#readProgress();
    });
    audio.addEventListener('error', () => {
      if (!this.#track || this.#switching || !audio.error) return;
      ++this.#attempt; this.#pending = false; this.#canSeek = false;
      this.#status = 'error'; this.#emit();
    });
    return audio;
  }
  #readProgress(metadata = false) {
    if (!this.#track || this.#switching) return;
    if (metadata && Number.isFinite(this.#audio.duration) && this.#audio.duration > 0) {
      this.#duration = this.#audio.duration; this.#canSeek = true;
    }
    if (Number.isFinite(this.#audio.currentTime)) this.#position = Math.max(0, this.#audio.currentTime);
    this.#emit();
  }
  unlock() {
    const firstGesture = !this.#unlocked;
    this.#unlocked = true;
    // A new scene may arrive after transient user activation expires. Retry
    // only a browser-blocked play, never an explicit pause or a finished track.
    if (this.#track && this.#prefs.enabled && (firstGesture || this.#status === 'blocked')) this.#start();
  }
  setTrack(value) {
    const track = normalizeTrack(value);
    if (track?.id === this.#track?.id) {
      if (track) {
        this.#track = track;
        if (this.#audio) this.#audio.loop = this.snapshot.loop;
      }
      return;
    }
    ++this.#version; ++this.#attempt; this.#pending = false;
    this.#switching = true;
    if (this.#audio) {
      this.#audio.pause();
      this.#audio.removeAttribute('src');
      this.#audio.load();
    }
    this.#track = track; this.#position = 0; this.#duration = track?.durationSec || 0; this.#canSeek = false;
    this.#status = track ? (this.#prefs.enabled ? 'ready' : 'paused') : 'idle';
    this.#switching = false;
    this.#emit();
    if (track && this.#unlocked && this.#prefs.enabled) this.#start();
  }
  #start() {
    if (!this.#track || this.#pending) return;
    const version = this.#version; const attempt = ++this.#attempt;
    try {
      const audio = this.#ensureAudio();
      if (audio.canPlayType?.('audio/ogg; codecs="opus"') === '') {
        this.#status = 'error'; this.#emit(); return;
      }
      const url = `/assets/ost/${this.#track.id}.opus`;
      if (audio.getAttribute('src') !== url || this.#status === 'error') {
        audio.src = url; audio.loop = this.snapshot.loop; audio.load();
      }
      if (audio.ended) audio.currentTime = 0;
      this.#status = 'loading'; this.#pending = true; this.#emit();
      Promise.resolve(audio.play()).then(() => {
        if (version !== this.#version || attempt !== this.#attempt) return;
        this.#pending = false;
        this.#status = audio.paused ? 'paused' : 'playing'; this.#emit();
      }, error => this.#playFailed(error, version, attempt));
    } catch (error) { this.#playFailed(error, version, attempt); }
  }
  #playFailed(error, version, attempt) {
    if (version !== this.#version || attempt !== this.#attempt) return;
    this.#pending = false;
    this.#status = error?.name === 'NotAllowedError' ? 'blocked' : 'error';
    this.#emit();
  }
  play() {
    this.#unlocked = true; this.#prefs.enabled = true; this.#save(); this.#start();
  }
  pause() {
    ++this.#attempt; this.#pending = false;
    this.#prefs.enabled = false; this.#save();
    this.#audio?.pause();
    this.#status = this.#track ? 'paused' : 'idle'; this.#emit();
  }
  restart() {
    if (!this.#track) return;
    if (this.#canSeek) this.seek(0);
    this.play();
  }
  seek(seconds) {
    if (!this.#audio || !this.#canSeek || !Number.isFinite(seconds)) return;
    try {
      this.#audio.currentTime = Math.min(this.#duration, Math.max(0, seconds));
      this.#position = this.#audio.currentTime; this.#emit();
    } catch { /* Metadata or decoder not ready: leave the story and player intact. */ }
  }
  setVolume(value) {
    if (!Number.isFinite(value)) return;
    this.#prefs.volume = Math.min(1, Math.max(0, value));
    if (this.#audio) this.#audio.volume = this.#prefs.volume;
    this.#save(); this.#emit();
  }
  setMuted(value) {
    this.#prefs.muted = value === true;
    if (this.#audio) this.#audio.muted = this.#prefs.muted;
    this.#save(); this.#emit();
  }
  setLoop(value) {
    this.#prefs.loop = value === true;
    if (this.#audio) this.#audio.loop = this.#prefs.loop;
    this.#save(); this.#emit();
  }
}

export function mountBgmPlayer(document) {
  const $ = id => document.getElementById(id);
  const panel = $('phone-music');
  let dragging = false;
  const descriptions = {
    idle: '进入游戏后载入场景配乐。', ready: '点击播放，启用背景音乐。',
    loading: '正在载入本地音频…', playing: '正在播放 · 跟随当前场景',
    paused: '已暂停 · 切换场景不会自动恢复', blocked: '浏览器需要授权，请点击播放。',
    ended: '播放完毕 · 点击播放可重听', error: '音频不可用，请点击播放重试；可继续游戏。',
  };
  const setText = (node, text) => { if (node.textContent !== text) node.textContent = text; };
  function render(view) {
    panel.dataset.status = view.status;
    const active = ['playing', 'loading'].includes(view.status);
    setText($('bgm-track'), view.id ? `BGM · ${view.id.toUpperCase()}` : '等待场景');
    setText($('bgm-status'), descriptions[view.status]);
    if (!dragging) setText($('bgm-current'), formatMusicTime(view.currentTime));
    setText($('bgm-duration'), formatMusicTime(view.duration));
    $('bgm-toggle').disabled = !view.id;
    $('bgm-toggle').setAttribute('aria-label', active ? '暂停背景音乐' : '播放背景音乐');
    $('bgm-toggle').dataset.active = String(active);
    setText($('bgm-toggle-label'), active ? '暂停' : '播放');
    $('bgm-restart').disabled = !view.id;
    $('bgm-loop').setAttribute('aria-pressed', String(view.loop));
    $('bgm-mute').setAttribute('aria-pressed', String(view.muted));
    $('bgm-mute').setAttribute('aria-label', view.muted ? '取消背景音乐静音' : '背景音乐静音');
    $('bgm-volume').value = String(Math.round(view.volume * 100));
    $('bgm-volume').setAttribute('aria-valuetext', `${Math.round(view.volume * 100)}%${view.muted ? '，已静音' : ''}`);
    setText($('bgm-volume-value'), view.muted ? '静音' : `${Math.round(view.volume * 100)}%`);
    $('bgm-seek').disabled = !view.canSeek;
    $('bgm-seek').max = String(view.duration || 1);
    if (!dragging) $('bgm-seek').value = String(view.currentTime);
    $('bgm-seek').setAttribute('aria-valuetext', `${formatMusicTime(view.currentTime)} / ${formatMusicTime(view.duration)}`);
  }
  const player = new BgmPlayer({ onChange: render });
  $('bgm-toggle').addEventListener('click', () => {
    if (['playing', 'loading'].includes(player.snapshot.status)) player.pause();
    else player.play();
  });
  $('bgm-restart').addEventListener('click', () => player.restart());
  $('bgm-loop').addEventListener('click', () => player.setLoop(!player.snapshot.loop));
  $('bgm-mute').addEventListener('click', () => player.setMuted(!player.snapshot.muted));
  $('bgm-volume').addEventListener('input', event => player.setVolume(Number(event.target.value) / 100));
  $('bgm-seek').addEventListener('input', event => {
    dragging = true;
    setText($('bgm-current'), formatMusicTime(Number(event.target.value)));
  });
  $('bgm-seek').addEventListener('change', event => {
    dragging = false; player.seek(Number(event.target.value));
  });
  $('bgm-seek').addEventListener('blur', () => { dragging = false; render(player.snapshot); });
  // Capture gestures before async new-game/load requests settle, and retain
  // them for browser-blocked retries. A deliberate pause is never undone.
  const isPlayControl = target => target?.closest?.('#bgm-toggle, #bgm-restart');
  const pointerUnlock = event => {
    if (!isPlayControl(event.target)) player.unlock();
  };
  document.addEventListener('pointerdown', pointerUnlock, { capture: true });
  // Touch activation is granted at release/click rather than pointerdown.
  document.addEventListener('click', pointerUnlock, { capture: true });
  const keyboardUnlock = event => {
    if (!['Enter', ' '].includes(event.key) || event.isComposing || event.repeat) return;
    if (!isPlayControl(event.target)) player.unlock();
  };
  document.addEventListener('keydown', keyboardUnlock, { capture: true });
  render(player.snapshot);
  return player;
}

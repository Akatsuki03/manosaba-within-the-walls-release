import { resolveSceneBackground } from './scene-backgrounds.mjs';
import { CHARACTER_IDS, characterAppearance } from './character-appearance.mjs';

export const SCENE_CURSOR_VERSION = 1;
export const OPENING_TURN_ID = 'opening';
export const MAX_SPEAKING_PORTRAITS = 1;
const NARRATORS = new Set(['', '旁白', '所见所闻', '验证说明', '系统']);
const EMPTY = Object.freeze([]);
const UNKNOWN_BACKGROUND = Object.freeze({ id: 'unknown', url: '' });
const CHARACTER_ASSETS = new Set([
  ...CHARACTER_IDS.map(id => `/assets/characters/${id}-portrait.webp`),
  '/assets/characters/warden-profile.png', '/assets/characters/custom-default.png',
]);
const validVersion = value => Number.isSafeInteger(value) && value >= 0;
const cleanText = (value, limit) => typeof value === 'string' && value.trim().length <= limit ? value.trim() : '';
const SPEAKER_ALIASES = new Map([['艾玛', '樱羽艾玛'], ['希罗', '二阶堂希罗'], ['莲见蕾娅', '莲见蕾雅']]);
const speakerName = value => {
  const name = cleanText(value, 100).replace(/（[^）]*）/gu, '').trim();
  return SPEAKER_ALIASES.get(name) || name;
};
const safeAvatar = value => typeof value === 'string' && (CHARACTER_ASSETS.has(value)
  || /^\/assets\/avatars\/[a-f0-9]{64}\.png$/u.test(value)) ? value : undefined;

function normalizeBgm(track) {
  // These are the actual published asset ranges, not merely a URL-shaped ID.
  const match = typeof track?.id === 'string' && /^d([123])-(\d{2})$/u.exec(track.id);
  if (!match || Number(match[2]) < 1 || Number(match[2]) > [0, 22, 20, 18][Number(match[1])]
    || typeof track.loop !== 'boolean') return null;
  return Object.freeze({ id: track.id, loop: track.loop,
    durationSec: Number.isFinite(track.durationSec) && track.durationSec > 0 ? track.durationSec : 0 });
}
function normalizePortrait(person, view) {
  const id = cleanText(person?.id, 160); const name = cleanText(person?.name, 100);
  if (!id || !name) return null;
  const avatarUrl = safeAvatar(person.avatarUrl);
  const appearance = characterAppearance({ id, name }, view);
  const url = avatarUrl || safeAvatar(appearance.portrait);
  return url ? Object.freeze({ id, name, avatarUrl: url }) : null;
}
function normalizeFrame(frame, view, turnId) {
  const location = cleanText(frame?.location, 256);
  const background = resolveSceneBackground(location, view);
  const opening = turnId && turnId !== OPENING_TURN_ID && background.id === 'court'
    && frame.trialOpening?.version === 1 && frame.trialOpening.id === `trial-opening:${turnId}`
    ? Object.freeze({ version: 1, id: frame.trialOpening.id }) : null;
  const seen = new Set();
  // The public snapshots may list several present people. Projection below
  // chooses only the paragraph's speaker, never a cast wall or a head portrait.
  const portraits = (Array.isArray(frame?.portraits) ? frame.portraits : []).slice(0, 32)
    .map(person => normalizePortrait(person, view)).filter(person => {
      if (!person || seen.has(person.id)) return false;
      seen.add(person.id); return true;
    });
  return Object.freeze({ entryIndex: frame.entryIndex, location,
    background: Object.freeze({ id: background.id, url: background.url }),
    bgm: normalizeBgm(frame.bgm), portraits: Object.freeze(portraits), ...(opening ? { trialOpening: opening } : {}) });
}
function validTurns(view, count) {
  return (Array.isArray(view.turns) ? view.turns : []).filter(turn => typeof turn?.id === 'string' && turn.id
    && validVersion(turn.entryStart) && Number.isSafeInteger(turn.entryEnd)
    && turn.entryEnd > turn.entryStart && turn.entryEnd <= count)
    .map(turn => Object.freeze({ turnId: turn.id, entryStart: turn.entryStart, entryEnd: turn.entryEnd }));
}
function disjointScenes(scenes) {
  const sorted = [...scenes].sort((a, b) => a.entryStart - b.entryStart || a.entryEnd - b.entryEnd);
  const result = []; let group = []; let end = -1;
  for (const scene of sorted) {
    if (scene.entryStart >= end) {
      if (group.length === 1) result.push(group[0]);
      group = []; end = scene.entryEnd;
    } else end = Math.max(end, scene.entryEnd);
    group.push(scene);
  }
  if (group.length === 1) result.push(group[0]);
  return result;
}

// Only host snapshots are consumed. Prose, arbitrary effects, URLs and timing
// instructions in entries are not interpreted as presentation commands.
export function normalizePresentation(view) {
  if (view?.presentation?.version !== 1 || !Array.isArray(view.presentation.scenes)
    || !Array.isArray(view.entries) || !validVersion(view.generation) || !validVersion(view.revision)) return null;
  const count = view.entries.length; const turns = validTurns(view, count);
  const byTurn = new Map(turns.map(turn => [turn.turnId, turn]));
  const openingEnd = turns.reduce((end, turn) => Math.min(end, turn.entryStart), count);
  const candidates = view.presentation.scenes.filter(scene => {
    if (!scene || !validVersion(scene.entryStart) || !Number.isSafeInteger(scene.entryEnd)
      || scene.entryEnd <= scene.entryStart || scene.entryEnd > count || !Array.isArray(scene.frames)) return false;
    if (scene.turnId === OPENING_TURN_ID || scene.turnId === null) return scene.entryStart === 0 && scene.entryEnd <= openingEnd;
    const turn = byTurn.get(scene.turnId);
    return turn && turn.entryStart === scene.entryStart && turn.entryEnd === scene.entryEnd;
  });
  // Ambiguous overlapping scenes/duplicate frame indices fail closed instead
  // of depending on arrival order or replaying a previous paragraph's effects.
  const scenes = disjointScenes(candidates).map(scene => {
    const frames = new Map();
    for (const frame of scene.frames) {
      if (!frame || !Number.isSafeInteger(frame.entryIndex)
        || frame.entryIndex < scene.entryStart || frame.entryIndex >= scene.entryEnd) continue;
      frames.set(frame.entryIndex, frames.has(frame.entryIndex) ? null : frame);
    }
    const unique = [...frames.values()].filter(Boolean);
    return Object.freeze({ turnId: scene.turnId ?? OPENING_TURN_ID, entryStart: scene.entryStart, entryEnd: scene.entryEnd,
      frames: Object.freeze(unique.map(frame => normalizeFrame(frame, view, scene.turnId)).sort((a, b) => a.entryIndex - b.entryIndex)) });
  });
  if (openingEnd > 0 && !scenes.some(scene => scene.entryStart === 0)) {
    // No committed turn means this is genuinely the initial host snapshot.
    // With later turns, missing opening history is unknown, NOT today's head.
    const initial = !turns.length;
    scenes.unshift(Object.freeze({ turnId: OPENING_TURN_ID, entryStart: 0, entryEnd: openingEnd,
      frames: Object.freeze(Array.from({ length: openingEnd }, (_, entryIndex) => normalizeFrame({ entryIndex,
        location: initial ? view.location : '', bgm: initial ? view.bgm : null, portraits: [] }, view))) }));
  }
  const entries = Object.freeze(view.entries.map(entry => Object.freeze({ speaker: speakerName(entry?.speaker) })));
  const lineage = JSON.stringify([turns, view.entries.map(entry => [entry?.speaker, entry?.delivery, entry?.text]),
    scenes.map(scene => [scene.turnId, scene.entryStart, scene.entryEnd])]);
  return Object.freeze({ scenes: Object.freeze(scenes), turns: Object.freeze(turns), entries, lineage });
}

function selectionAt(state, entryIndex) {
  const scene = state.scenes.find(scene => entryIndex >= scene.entryStart && entryIndex < scene.entryEnd);
  const turn = scene || state.turns.find(turn => entryIndex >= turn.entryStart && entryIndex < turn.entryEnd);
  return Object.freeze({ entryIndex, turnId: turn?.turnId ?? OPENING_TURN_ID });
}
function projectionAt(state, selection) {
  const scene = state.scenes.find(scene => scene.turnId === selection?.turnId
    && selection.entryIndex >= scene.entryStart && selection.entryIndex < scene.entryEnd);
  // Frames are complete per-entry snapshots, not sparse effects to accumulate.
  const frame = scene?.frames.find(frame => frame.entryIndex === selection.entryIndex);
  const speaker = state.entries[selection?.entryIndex]?.speaker;
  const portraits = NARRATORS.has(speaker) ? EMPTY : Object.freeze((frame?.portraits || EMPTY)
    .filter(person => speakerName(person.name) === speaker || person.id === speaker).slice(0, MAX_SPEAKING_PORTRAITS));
  return Object.freeze({ generation: state.generation, revision: state.revision,
    turnId: selection?.turnId ?? null, entryIndex: selection?.entryIndex ?? null,
    // Metadata for media consumers only; game panels always render the live
    // view and must never be gated by a transcript selection.
    atHead: !!selection && selection.entryIndex === state.entries.length - 1,
    location: frame?.location || '', background: frame?.background || UNKNOWN_BACKGROUND,
    bgm: frame?.bgm || null, portraits });
}
function withSelection(state, selection) {
  return Object.freeze({ ...state, selection, projection: projectionAt(state, selection) });
}

export function createSceneCursor(view) { return reconcileSceneCursor(null, view); }

export function reconcileSceneCursor(previous, view) {
  if (previous && validVersion(view?.generation) && validVersion(view?.revision)
    && (view.generation < previous.generation || (view.generation === previous.generation && view.revision < previous.revision))) return previous;
  const presentation = normalizePresentation(view);
  const scope = JSON.stringify(['manosaba.scene-cursor', SCENE_CURSOR_VERSION, view?.exampleId || '',
    view?.scenarioId || '', view?.generation]);
  const base = { version: SCENE_CURSOR_VERSION, scope, generation: view?.generation, revision: view?.revision,
    mode: presentation ? 'presentation' : 'legacy', cancelled: false,
    key: JSON.stringify([scope, view?.revision, presentation?.turns.at(-1)?.turnId ?? OPENING_TURN_ID]),
    scenes: presentation?.scenes || EMPTY, turns: presentation?.turns || EMPTY,
    entries: presentation?.entries || EMPTY, lineage: presentation?.lineage || '', selection: null, projection: null };
  if (!presentation) return Object.freeze(base);
  // The live page always follows the committed head. Scrolling through the
  // transcript is not a historical game state and must never gate other UI.
  const selection = base.entries.length ? selectionAt(base, base.entries.length - 1) : null;
  return withSelection(base, selection);
}

function currentSelection(state, entryIndex, scope = {}) {
  if (!state || state.mode !== 'presentation' || state.cancelled || !Number.isSafeInteger(entryIndex)
    || entryIndex < 0 || entryIndex >= state.entries.length || !scope || typeof scope !== 'object') return false;
  if (scope.key !== undefined && scope.key !== state.key) return false;
  if (scope.generation !== undefined && scope.generation !== state.generation) return false;
  if (scope.revision !== undefined && scope.revision !== state.revision) return false;
  return scope.turnId === undefined || scope.turnId === selectionAt(state, entryIndex).turnId;
}
export function selectSceneEntry(state, entryIndex, scope = {}) {
  if (!currentSelection(state, entryIndex, scope) || state.selection?.entryIndex === entryIndex) return state;
  return withSelection(state, selectionAt(state, entryIndex));
}
export function stepSceneCursor(state, offset, scope = {}) {
  if (!Number.isSafeInteger(offset) || !state?.selection) return state;
  return selectSceneEntry(state, Math.min(state.entries.length - 1, Math.max(0, state.selection.entryIndex + offset)), scope);
}
export function cancelSceneCursor(state) {
  return state ? Object.freeze({ ...state, cancelled: true, selection: null, projection: null }) : state;
}
export function projectSceneCursor(state) { return state?.projection || null; }

// Media always reflects the committed head. Transcript jumps only scroll:
// no storage, timers, game callbacks, historical panel gates or keyboard traps.
export function mountScenePlayback(document, { onProjection = () => {}, isVisible = () => true } = {}) {
  const log = document.getElementById('log');
  const portraits = document.getElementById('scene-speaking-portraits');
  let cursor; let closed = false; let effectSignature; let portraitSignature;
  const articles = () => Array.from(log?.querySelectorAll('[data-entry-index]') || []);
  const active = () => !closed && cursor?.mode === 'presentation' && !cursor.cancelled;

  function paint(force = false) {
    if (!active()) return;
    for (const article of articles()) {
      if (Number(article.dataset.entryIndex) === cursor.selection?.entryIndex) article.setAttribute('aria-current', 'true');
      else article.removeAttribute('aria-current');
    }
    for (const button of log?.querySelectorAll('[data-scene-navigation]') || []) button.dataset.sceneReadingKey = cursor.key;
    const projection = projectSceneCursor(cursor);
    const nextPortraits = JSON.stringify(projection.portraits);
    if (portraits && nextPortraits !== portraitSignature) {
      portraitSignature = nextPortraits;
      portraits.replaceChildren(...projection.portraits.map(person => {
        const figure = document.createElement('figure'); figure.className = 'scene-speaking-portrait';
        const image = document.createElement('img'); image.src = person.avatarUrl; image.alt = '';
        image.decoding = 'async'; image.addEventListener('error', () => { image.hidden = true; }, { once: true });
        const caption = document.createElement('figcaption'); caption.textContent = person.name;
        figure.append(image, caption); return figure;
      }));
      portraits.hidden = !projection.portraits.length;
    }
    const signature = JSON.stringify([cursor.key, projection.entryIndex,
      projection.location, projection.background, projection.bgm, projection.portraits]);
    if (force || signature !== effectSignature) {
      effectSignature = signature; onProjection(projection);
    }
  }
  function scrollToEntry(entryIndex, { edge = 'end', focus = false, ...scope } = {}) {
    if (!active() || !isVisible() || !currentSelection(cursor, entryIndex, scope)) return false;
    const fragments = articles().filter(article => Number(article.dataset.entryIndex) === entryIndex);
    const article = edge === 'start' ? fragments[0] : fragments.at(-1);
    if (!article) return false;
    if (focus) { article.tabIndex = -1; article.focus({ preventScroll: true }); }
    const bounds = article.getBoundingClientRect(); const viewport = log.getBoundingClientRect();
    log.scrollTop += edge === 'start' ? bounds.top - viewport.top : bounds.bottom - viewport.bottom;
    return true;
  }

  return {
    get snapshot() { return cursor; },
    get active() { return active(); },
    update(view, { scrollTop } = {}) {
      if (closed) return cursor;
      const before = cursor; const updated = reconcileSceneCursor(cursor, view);
      if (updated === before) return cursor;
      cursor = updated;
      if (active()) {
        paint();
        const preserved = before && !before.cancelled && before.scope === cursor.scope && before.lineage === cursor.lineage;
        if (preserved && Number.isFinite(scrollTop) && scrollTop >= 0) log.scrollTop = scrollTop;
        else if (cursor.selection) scrollToEntry(cursor.selection.entryIndex);
      } else {
        effectSignature = portraitSignature = undefined;
        if (portraits) { portraits.replaceChildren(); portraits.hidden = true; }
        for (const article of articles()) article.removeAttribute('aria-current');
      }
      return cursor;
    },
    scrollToEntry,
    refresh({ scroll = false } = {}) {
      if (!active()) return false;
      paint(true);
      if (scroll && cursor.selection) scrollToEntry(cursor.selection.entryIndex);
      return true;
    },
    close() {
      if (closed) return;
      cursor = cancelSceneCursor(cursor); closed = true;
      if (portraits) { portraits.replaceChildren(); portraits.hidden = true; }
      for (const article of articles()) article.removeAttribute('aria-current');
    },
  };
}

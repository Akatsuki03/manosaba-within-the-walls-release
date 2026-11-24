const DAY = 24 * 3600;
const integer = value => Number.isSafeInteger(value) && value >= 0;
const elapsed = state => integer(state?.worldTime) ? state.worldTime : 0;
const label = absolute => {
  const second = absolute % DAY;
  return `${String(Math.floor(second / 3600)).padStart(2, '0')}:${String(Math.floor(second / 60) % 60).padStart(2, '0')}`;
};
function epoch(state) {
  // This fixed checkpoint uses caseClock's day-four 08:00 epoch, not the
  // ordinary prison opening. Never manufacture the unplayed first three days.
  if (state.exampleId === 'agent' && ['case-1', 'case-1-execution-test'].includes(state.creation?.scenarioId)) return 3 * DAY + 8 * 3600;
  if (state.exampleId === 'agent') {
    // The same epoch as prisonClock, without importing content/model runtime
    // dependencies into a pure projection. An explicit saved zero is valid.
    return state.agentWorld?.startSecond ?? (state.agentFormatVersion >= 3 ? 5 * 3600 + 59 * 60 : 6 * 3600 + 30 * 60);
  }
  return (state.exampleId === 'prototype' ? 14 : 6) * 3600;
}
const compact = value => typeof value === 'string' ? value.replace(/\s+/gu, ' ').trim() : '';
function shorten(text, maximum) {
  const characters = Array.from(text);
  if (characters.length <= maximum) return text;
  const prefix = characters.slice(0, maximum - 1).join('');
  // Prefer a complete sentence without dropping most of the excerpt.
  const stop = Math.max(prefix.lastIndexOf('。'), prefix.lastIndexOf('！'), prefix.lastIndexOf('？'));
  return stop >= maximum * 0.6 ? prefix.slice(0, stop + 1) : `${prefix.trimEnd()}…`;
}
function excerptScore(candidate) {
  const length = Array.from(candidate.text).length;
  const narrative = /^(?:旁白|眼前的动静)$/u.test(candidate.speaker);
  const delivery = candidate.delivery;
  return (['speech', 'writing'].includes(delivery) || (!delivery && !narrative) ? 48
    : delivery === 'reading' ? 32 : narrative ? 44 : 22)
    + Math.min(16, Math.floor(length / 6)) - (length < 10 ? 25 : 0);
}
function excerpts(candidates, limit, maximum) {
  const unique = new Map();
  for (const candidate of candidates) {
    if (!candidate.text) continue;
    const key = `${candidate.speaker}\u0000${candidate.text}`;
    if (!unique.has(key)) unique.set(key, candidate);
  }
  const remaining = [...unique.values()]; const selected = [];
  while (selected.length < limit && remaining.length) {
    let best = 0; let bestScore = -Infinity;
    for (const [index, candidate] of remaining.entries()) {
      // Prefer meaningful dialogue/narration, distinct moments and attribution
      // over four repetitions of the same gesture or atmospheric paragraph.
      const score = excerptScore(candidate)
        - 18 * selected.filter(row => row.momentId === candidate.momentId).length
        - 8 * selected.filter(row => row.speaker === candidate.speaker).length;
      if (score > bestScore) { best = index; bestScore = score; }
    }
    selected.push(remaining.splice(best, 1)[0]);
  }
  return selected.sort((a, b) => a.entryIndex - b.entryIndex)
    .map(({ speaker, text, entryIndex }) => ({ speaker, text: shorten(text, maximum), entryIndex }));
}

/** Disposable, read-only player history. Inputs are the current branch's turn
 * anchors and already delivered DISPLAY entries/media frames. No event ledger,
 * model proposal, private action/decision or save catalog is consulted. Ranges
 * are zero-based, end-exclusive display coordinates, not persisted raw spans.
 */
export function projectDailyHistory({ head, turns, entries, readBefore, presentation, locationLabel = value => value }) {
  const befores = turns.map(turn => readBefore(turn.id));
  const initial = befores[0] || head;
  const firstDay = Math.floor(epoch(initial) / DAY) + 1;
  const currentAbsolute = epoch(head) + elapsed(head);
  const currentDay = Math.floor(currentAbsolute / DAY) + 1;
  const days = new Map();
  const frames = new Map((presentation?.scenes || []).flatMap(scene => scene.frames || [])
    .map(frame => [frame.entryIndex, frame.location]));
  const dayAt = absolute => Math.floor(absolute / DAY) + 1;
  const getDay = day => {
    if (!days.has(day)) days.set(day, { day, label: `入狱第 ${day} 天`, current: day === currentDay,
      start: Infinity, end: -Infinity, turnIds: new Set(), candidates: [], locations: new Set(), moments: [] });
    return days.get(day);
  };
  const remember = (day, location) => {
    const name = compact(locationLabel(location));
    if (name) day.locations.add(name);
  };
  const segment = (turn, before, after, entryStart, entryEnd) => {
    const base = epoch(before); const fallback = turn ? elapsed(before) : 0;
    const anchor = base + fallback; const anchorDay = dayAt(anchor);
    const groups = new Map();
    const groupFor = day => {
      if (!groups.has(day)) groups.set(day, { candidates: [], start: Infinity, end: -Infinity });
      return groups.get(day);
    };
    // A submitted action is a real record even when every delivered entry falls
    // after midnight. The new current day can conversely have no records at all.
    if (turn) { const group = groupFor(anchorDay); group.start = anchor; group.end = anchor; }
    for (let entryIndex = entryStart; entryIndex < entryEnd; entryIndex++) {
      const entry = entries[entryIndex];
      if (!entry) continue;
      const stamp = entry.occurredAt;
      let absolute = base + (integer(stamp) && stamp <= elapsed(after) ? stamp : fallback);
      // Old composers place start-time narration AFTER later enactments. Do
      // not require monotonic timestamps or clamp them to the preceding entry.
      if (!Number.isSafeInteger(absolute) || dayAt(absolute) < firstDay || dayAt(absolute) > currentDay) absolute = anchor;
      const day = dayAt(absolute); const group = groupFor(day);
      group.start = Math.min(group.start, absolute); group.end = Math.max(group.end, absolute);
      group.candidates.push({ entryIndex, speaker: compact(entry.speaker) || '旁白', text: compact(entry.text),
        delivery: entry.delivery, momentId: `${turn?.id || 'opening'}:${day}` });
    }
    for (const [number, group] of [...groups].sort(([a], [b]) => a - b)) {
      const day = getDay(number); const candidates = group.candidates;
      day.start = Math.min(day.start, group.start); day.end = Math.max(day.end, group.end);
      day.candidates.push(...candidates);
      if (turn) day.turnIds.add(turn.id);
      if (number === anchorDay) remember(day, before.location);
      for (const candidate of candidates) remember(day, frames.get(candidate.entryIndex));
      if (number === dayAt(epoch(after) + elapsed(after))) remember(day, after.location);
      if (!day.locations.size && candidates.length) remember(day, before.location);
      day.moments.push({ id: `${turn?.id || 'opening'}:${number}`, kind: turn ? 'turn' : 'opening',
        time: label(group.start), ...(turn ? { turnId: turn.id, floor: turn.floor, action: turn.text } : {}),
        // A non-monotonic scene can interleave days: these are bounding spans,
        // while counts and excerpts include ONLY entries assigned to this day.
        entryStart: candidates.length ? candidates[0].entryIndex : entryStart,
        entryEnd: candidates.length ? candidates.at(-1).entryIndex + 1 : entryStart,
        excerpts: excerpts(candidates, 2, 140) });
    }
  };
  segment(null, initial, initial, 0, turns[0]?.entryStart ?? entries.length);
  for (const [index, turn] of turns.entries()) {
    segment(turn, befores[index], befores[index + 1] || head, turn.entryStart, turn.entryEnd);
  }
  // Only recorded days plus the actual current day; gaps do not imply unseen
  // events, and a checkpoint starting on day four does not get days one-three.
  getDay(currentDay);
  return { version: 1, currentDay, days: [...days.values()].sort((a, b) => a.day - b.day).map(day => ({
    day: day.day, label: day.label, current: day.current,
    startTime: label(Number.isFinite(day.start) ? day.start : currentAbsolute),
    endTime: label(Number.isFinite(day.end) ? day.end : currentAbsolute),
    turnCount: day.turnIds.size, entryCount: day.candidates.length, locations: [...day.locations],
    summary: excerpts(day.candidates, 4, 170), moments: day.moments,
  })) };
}

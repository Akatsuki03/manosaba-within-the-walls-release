import { PRISON_WORLD_REF, CARD_ASSEMBLY_TEXT } from '../content/card-world.mjs';
import { isKnowledgeGated, recognizesPerson } from '../characters/actor-knowledge.mjs';
import { usesCurfewPolicy, confinementRoom, lawfulConfinementPlace } from './curfew-policy.mjs';
import { runtimeRevisionForState } from '../content/content-revisions.mjs';

export const PRISON_ACTIVITY_VERSION = 1;
// The archived world copy and v1/v2 saves retain their original 06:30 clock.
// New runs wake before free time; changing a saved epoch would break replay.
const LEGACY_START_SECOND = 6 * 3600 + 30 * 60;
const START_SECOND = 5 * 3600 + 59 * 60;
const MORNING_SECOND = 6 * 3600;
const DAY = 24 * 3600;
const startSecond = state => state.agentFormatVersion >= 3 ? START_SECOND : LEGACY_START_SECOND;
// Authored observable pacing, NOT a canonical timetable or psychic simulation.
// Curiosity, caution, reluctance and concern yield different departure beats.
const PACING = Object.freeze({ sherry: [4, 72], hiro: [7, 64], nanoka: [10, 48], alisa: [13, 58],
  leia: [16, 60], margo: [20, 54], coco: [23, 60], noah: [26, 66], milia: [30, 60],
  hanna: [34, 64], emma: [38, 62], anan: [42, 70], meruru: [48, 64] });
export const hasPrisonWorld = state => state.agentWorld?.version === PRISON_ACTIVITY_VERSION;
export function enablePrisonWorld(state) {
  const worldHash = runtimeRevisionForState(state).worldHash;
  if (state.agentWorld) {
    if (!hasPrisonWorld(state) || state.agentWorld.sourceHash !== worldHash) throw Object.assign(new Error('监牢规则版本不一致。'), { code: 'INVALID_AGENT_STATE' });
    return state.agentWorld;
  }
  state.agentWorld = { version: PRISON_ACTIVITY_VERSION, ref: PRISON_WORLD_REF, sourceHash: worldHash,
    startSecond: startSecond(state), lockReleased: Boolean(state.agentDoorOpen), broadcasts: [], routes: [], activityLog: [] };
  return state.agentWorld;
}
export function prisonClock(state, elapsed = state.worldTime) {
  const absolute = (state.agentWorld?.startSecond ?? startSecond(state)) + elapsed;
  const second = absolute % DAY; const hour = Math.floor(second / 3600);
  const free = (hour >= 6 && hour < 10) || (hour >= 12 && hour < 15) || (hour >= 17 && hour < 22);
  return { day: Math.floor(absolute / DAY) + 1, hour, minute: Math.floor(second / 60) % 60, second: second % 60,
    label: `${String(hour).padStart(2, '0')}:${String(Math.floor(second / 60) % 60).padStart(2, '0')}`, free,
    period: free ? '放风' : hour >= 22 || hour < 6 ? '就寝' : '牢房滞留' };
}
const morningReached = (state, elapsed) => state.agentFormatVersion >= 3
  && (state.agentWorld?.startSecond ?? startSecond(state)) + elapsed >= MORNING_SECOND;
// The opening's explicit release/escort (or an unlocked public-place setup)
// can precede 06:00. It is not a change to the regular free-time timetable.
const passageTimeOpen = (state, elapsed = state.worldTime) => prisonClock(state, elapsed).free
  || (state.agentFormatVersion >= 3 && state.agentWorld?.lockReleased
    && state.agentWorld.startSecond + elapsed < MORNING_SECOND);
export function prisonPassage(state, { from, to, actorId, home }) {
  if (!hasPrisonWorld(state)) return Boolean(state.agentDoorOpen);
  const world = state.agentWorld;
  if (!world.lockReleased && !morningReached(state, state.worldTime)) return false;
  // Returning to one's assigned cell is always permitted; no permission to
  // enter someone else's locked room, leave confinement or invent a shortcut.
  if (!passageTimeOpen(state)) {
    if (usesCurfewPolicy(state)) {
      const destination = confinementRoom(state, actorId);
      return destination === 'INFIRMARY' ? (from === 'RECEPTION' && to === 'INFIRMARY')
        || (from === 'CORRIDOR' && to === 'RECEPTION')
        : (from === 'CORRIDOR' && to === destination) || (from === 'RECEPTION' && to === 'CORRIDOR')
          || (from === 'INFIRMARY' && to === 'RECEPTION');
    }
    return (from === 'CORRIDOR' && to === home) || (from === 'RECEPTION' && to === 'CORRIDOR');
  }
  return from !== to && Boolean(actorId);
}
function addRoute(world, actor, position, at) {
  const [delay, travel] = PACING[actor.id] || [40, 65];
  const steps = position === 'RECEPTION' ? [] : position === 'CORRIDOR'
    ? [{ at: at + travel, to: 'RECEPTION' }]
    : [{ at: at + delay, to: 'CORRIDOR' }, { at: at + delay + travel, to: 'RECEPTION' }];
  if (steps.length) world.routes.push({ actorId: actor.id, steps });
}
export function announcePrisonAssembly(state, { actors, playerId, locationOf, text = CARD_ASSEMBLY_TEXT, key = 'assembly' }) {
  const world = enablePrisonWorld(state);
  if (world.broadcasts.length) return null;
  const audienceIds = actors.filter(actor => actor.id !== 'warden').map(actor => actor.id);
  const notice = { id: key, text, occurredAt: state.worldTime, audienceIds, destination: 'RECEPTION' };
  world.broadcasts.push(notice); world.lockReleased = true; state.agentDoorOpen = passageTimeOpen(state);
  // Historical routes remain byte-identical. In the decision contract a notice
  // is an observation/trigger, not consent to obey; accepted routes alone run.
  if (!state.agentAutonomy) for (const actor of actors) if (actor.id !== playerId && actor.id !== 'warden' && audienceIds.includes(actor.id)) addRoute(world, actor, locationOf(actor), state.worldTime);
  return notice;
}
export function deferAssemblyActor(state, actorId, until, manualDestination) {
  if (!hasPrisonWorld(state)) return;
  const routes = state.agentWorld.routes;
  const route = routes.find(route => route.actorId === actorId);
  if (!route?.steps.length) return;
  if (manualDestination) {
    // A committed local decision supersedes that actor's pending route, never
    // anyone else's. Replan from the actual destination after the exchange.
    const actor = { id: actorId };
    routes.splice(routes.indexOf(route), 1);
    addRoute(state.agentWorld, actor, manualDestination, until);
  } else if (route.steps[0].at <= until) {
    const shift = until + 2 - route.steps[0].at;
    for (const step of route.steps) step.at += shift;
  }
}
/** Advance committed offscreen work on the SAME clock as the player's turn.
 * Each log carries exact witnesses; no private intention or global roster is
 * ever included in a player/model projection. The player remains at the old
 * place until the resolved arrival time, even though state.location is final. */
export function advancePrisonActivities(state, { actors, playerId, fromTime, toTime, playerFrom, playerTo = playerFrom,
  playerArrival = toTime, label, roomLabel, emitVisible = () => {} }) {
  if (!hasPrisonWorld(state)) return;
  const world = state.agentWorld; const logStart = world.activityLog.length;
  const start = world.startSecond;
  if (morningReached(state, fromTime)) world.lockReleased = true;
  const locationOf = (actor, at) => actor.id === playerId ? (at >= playerArrival ? playerTo : playerFrom)
    : state.agentPositions?.[actor.id] || actor.locationId;
  // Return before each confinement boundary. This is a compliance route, not
  // an omniscient patrol/meal simulator. Other floors/procedures stay unbuilt.
  const returns = [];
  for (let day = Math.floor((start + fromTime) / DAY); day <= Math.floor((start + toTime + 90) / DAY); day++) {
    for (const hour of [10, 15, 22]) {
      const at = day * DAY + hour * 3600 - start - 75;
      if (at > fromTime && at <= toTime) returns.push(at);
    }
  }
  for (;;) {
    const candidates = world.routes.filter(route => route.steps.length && route.steps[0].at <= toTime)
      .sort((a, b) => a.steps[0].at - b.steps[0].at || a.actorId.localeCompare(b.actorId));
    const route = candidates[0];
    // Confinement preparation is a clock event, interleaved with movements.
    // Scheduling all returns up front would inspect stale pre-departure
    // positions and make one long tick differ from the same shorter ticks.
    if (returns.length && (!route || returns[0] <= route.steps[0].at)) {
      const returnAt = returns.shift();
      for (const actor of actors) {
        if (['warden', playerId].includes(actor.id)) continue;
        const location = locationOf(actor, returnAt);
        const home = usesCurfewPolicy(state) ? confinementRoom(state, actor.id, returnAt + 75) : actor.locationId;
        if (usesCurfewPolicy(state) ? lawfulConfinementPlace(state, actor.id, location, returnAt + 75) : location === home) continue;
        world.routes = world.routes.filter(pending => pending.actorId !== actor.id);
        const steps = usesCurfewPolicy(state) && home === 'INFIRMARY'
          ? location === 'RECEPTION' ? [{ at: returnAt + 50, to: 'INFIRMARY' }]
            : [{ at: returnAt, to: 'CORRIDOR' }, { at: returnAt + 25, to: 'RECEPTION' }, { at: returnAt + 50, to: 'INFIRMARY' }]
          : location === 'CORRIDOR' ? [{ at: returnAt + 50, to: home }]
            : [{ at: returnAt, to: usesCurfewPolicy(state) && location === 'INFIRMARY' ? 'RECEPTION' : 'CORRIDOR' },
              ...(usesCurfewPolicy(state) && location === 'INFIRMARY' ? [{ at: returnAt + 25, to: 'CORRIDOR' }] : []), { at: returnAt + 50, to: home }];
        world.routes.push({ actorId: actor.id, steps });
      }
      continue;
    }
    if (!route) break;
    const actor = actors.find(actor => actor.id === route.actorId); const step = route.steps.shift();
    if (!actor || actor.id === playerId || actor.id === 'warden') continue;
    const from = locationOf(actor, step.at);
    if (morningReached(state, step.at)) world.lockReleased = true;
    const home = usesCurfewPolicy(state) ? confinementRoom(state, actor.id, step.at) : actor.locationId;
    if (!world.lockReleased || (!passageTimeOpen(state, step.at) && step.to !== home)) { route.steps = []; continue; }
    if (from === step.to) continue;
    // Every authored route is one topological edge. No room-to-room teleport.
    if (from !== 'CORRIDOR' && step.to !== 'CORRIDOR'
      && !(usesCurfewPolicy(state) && [from, step.to].includes('INFIRMARY') && [from, step.to].includes('RECEPTION'))) throw Object.assign(new Error('集合路线不是相邻移动。'), { code: 'INVALID_AGENT_STATE' });
    const witnesses = actors.filter(observer => observer.id !== 'warden' && (observer.id === actor.id
      || [from, step.to].includes(locationOf(observer, step.at)))).map(observer => observer.id);
    state.agentPositions = { ...(state.agentPositions || {}), [actor.id]: step.to };
    world.activityLog.push({ id: `activity-${world.activityLog.length + 1}`, actorId: actor.id, from, to: step.to,
      occurredAt: step.at, witnessIds: witnesses,
      text: `${actor.appearance}由${roomLabel(from)}走向${roomLabel(step.to)}。`,
      ...(isKnowledgeGated(state) ? { textByActor: Object.fromEntries(witnesses.map(ownerId => [ownerId,
        `${recognizesPerson(state, ownerId, actor.id) ? actor.name : actor.appearance}由${roomLabel(from)}走向${roomLabel(step.to)}。`])) } : {}) });
  }
  world.routes = world.routes.filter(route => route.steps.length);
  if (morningReached(state, toTime)) world.lockReleased = true;
  state.agentDoorOpen = world.lockReleased && passageTimeOpen(state, toTime);
  const visible = world.activityLog.slice(logStart).filter(event => event.witnessIds.includes(playerId));
  // Bounded canonical event count even for a long conversation spanning many
  // departures. All individual moves remain in the host log/cognition ledger.
  if (visible.length) {
    const groups = [visible.filter(event => event.to === 'CORRIDOR'), visible.filter(event => event.from === 'CORRIDOR')].filter(group => group.length);
    for (const group of groups) emitVisible(group.map(event => `${label(actors.find(actor => actor.id === event.actorId))}由${roomLabel(event.from)}走向${roomLabel(event.to)}。`).join('\n'), group.at(-1).occurredAt);
  }
}
/** Earliest existing route or public rule boundary for the causal scheduler.
 * Historical ticks retain their original behavior; this query never schedules
 * a route or advances the world merely because a view is requested. */
export function nextPrisonActivityBoundary(state, toTime) {
  if (!hasPrisonWorld(state) || !Number.isSafeInteger(toTime) || toTime <= state.worldTime) return null;
  const from = state.worldTime; const start = state.agentWorld.startSecond;
  let next = toTime;
  for (const route of state.agentWorld.routes) {
    const at = route.steps[0]?.at;
    if (at > from && at < next) next = at;
  }
  const firstDay = Math.floor((start + from) / DAY);
  const lastDay = Math.floor((start + toTime) / DAY);
  for (let day = firstDay; day <= lastDay && day <= firstDay + 1; day++) {
    for (const hour of [6, 10, 12, 15, 17, 22]) {
      const at = day * DAY + hour * 3600 - start;
      if (at > from && at < next) next = at;
      if ([10, 15, 22].includes(hour) && at - 75 > from && at - 75 < next) next = at - 75;
    }
  }
  return next;
}
export function prisonPublicRules(state) {
  if (!hasPrisonWorld(state)) return [];
  return [{ id: 'clock', name: '当前公共时钟', text: `${prisonClock(state).label} · ${prisonClock(state).period}。铁门${state.agentDoorOpen ? '已解锁' : '保持上锁'}。` }];
}

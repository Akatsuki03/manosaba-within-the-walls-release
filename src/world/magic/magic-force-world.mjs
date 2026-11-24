import { projectMagicPhysicalModifiers } from './magic-effects.mjs';
import { GUESTHOUSE_FIRE_STRUCTURE, outskirtsActive } from '../outskirts-world.mjs';

/** Reviewed, scene-authored shared structures. They are not a mass/force cap
 * and not a generic physics body: this slice can change only these authored
 * placements in the shared case world. The guesthouse is a parent building:
 * its contained interior room keeps its own room id, occupant and local
 * objects; the courtyard is the outside sight scope. */
const STRUCTURES = Object.freeze([
  Object.freeze({
    id: 'reception:long-table', name: '会客厅长桌', room: 'reception',
    placement: '大厅中央', shiftedPlacement: '靠壁炉一侧的空地',
  }),
  GUESTHOUSE_FIRE_STRUCTURE,
]);
const structure = id => STRUCTURES.find(row => row.id === id);
const seenIn = (row, room) => Boolean(room
  && ((row.rooms ? row.rooms.includes(room) : row.room === room) || row.sightRooms?.includes(room)));
const reject = reason => ({ accepted: false, reason });

function strengthenedBody(state, actorId) {
  const magic = state?.magic;
  if (!magic?.identity?.bodies || !magic.identity?.minds || !magic.identity?.occupants) return null;
  const body = Object.values(magic.identity.bodies).find(row => row.actorId === actorId);
  if (!body || body.alive === false) return null;
  const modifier = projectMagicPhysicalModifiers(magic, body.id)
    .find(row => row.quality === 'body-strengthened');
  if (!modifier) return null;
  const effect = magic.effects.find(row => row.id === modifier.effectId && row.status === 'active');
  const event = effect?.event;
  if (!event || event.operation !== 'strength' || event.sourceBodyId !== body.id || event.targetId !== body.id
    || magic.identity.occupants[body.id] !== event.sourceMindId
    || magic.identity.minds[event.sourceMindId]?.actorId !== actorId) return null;
  return { body, effect };
}

/** Read-only shared view, independent of who still has a strength effect. Used
 * by ordinary physical/scene projections after a structure was moved. */
export function displacedForceStructures(state, room) {
  if (!room) return [];
  return Object.values(state.caseRuntime?.structures || {})
    .filter(row => {
      const authored = structure(row.id);
      const belongs = authored ? seenIn(authored, room)
        : row.rooms?.includes(room) || row.sightRooms?.includes(room) || row.room === room;
      return belongs && row.displacedAt !== undefined;
    })
    .map(row => ({ id: row.id, name: row.name, placement: row.placement }));
}

/** Read-only current view. It exposes only authored structure identity and
 * placement for the current room, never an effect, source-body or mind
 * identity. The guesthouse is visible from its courtyard sight scope and from
 * its contained interior room; no other room is made omniscient. */
export function magicForceWorldView(state, actorId, room) {
  if (!strengthenedBody(state, actorId)) return [];
  return STRUCTURES.filter(row => seenIn(row, room)).map(row => {
    const saved = state.caseRuntime?.structures?.[row.id];
    return { id: row.id, name: row.name, placement: saved?.placement ?? row.placement,
      ...(saved?.displacedAt === undefined ? {} : { displacedAt: saved.displacedAt }) };
  });
}

/** Read-only ordinary inspection view for the already-activated parent
 * building. It needs no strength effect and exposes only the current authored
 * identity and placement; never sourceEffectId, effect, pusher, old placement
 * or a crime/clue inference. Outside courtyard and contained interior see the
 * same parent shared placement; no other room is made omniscient. */
export function inspectableForceStructures(state, room) {
  if (!room || !outskirtsActive(state)) return [];
  return STRUCTURES.filter(row => row.kind === 'building' && seenIn(row, room)).map(row => {
    const saved = state.caseRuntime?.structures?.[row.id];
    return { id: row.id, name: row.name, placement: saved?.placement ?? row.placement };
  });
}

/** Consume an already active body-strengthened effect exactly once. The body
 * must still be the acting mind's living body and the structure must be
 * present in the actor's current room or, for the guesthouse, its authored
 * outside sight scope. `actorRoom` is the caller's actual runtimeRoom (the
 * runtime facade supplies it); a merely supplied target room is not authority.
 * No body, mind, pose, support, room, health or magic lifetime is touched; an
 * ended/suppressed effect cannot produce a new push, while the already-
 * established placement change stays in the shared world. */
export function applySharedForceDisplacement(state, actorId, structureId, { room, actorRoom = room, at } = {}) {
  const target = structure(structureId);
  if (!target || !seenIn(target, room)) return reject('structure-out-of-room');
  if (actorRoom !== room || !seenIn(target, actorRoom)) return reject('actor-room-mismatch');
  const source = strengthenedBody(state, actorId);
  if (!source) return reject('not-body-strengthened');
  if (!state.caseRuntime || state.caseRuntime.version !== 1) return reject('case-runtime-unavailable');
  const saved = state.caseRuntime.structures?.[target.id];
  if (saved?.displacedAt !== undefined) return reject('already-displaced');
  const previousPlacement = saved?.placement ?? target.placement;
  const displacedAt = Number.isSafeInteger(at) ? at : state.worldTime;
  if (!Number.isSafeInteger(displacedAt) || displacedAt < 0) return reject('invalid-time');
  state.caseRuntime.structures ||= {};
  state.caseRuntime.structures[target.id] = {
    id: target.id, name: target.name,
    ...(target.kind === 'building'
      ? { kind: 'building', rooms: [...target.rooms], sightRooms: [...target.sightRooms] }
      : { room: target.room }),
    placement: target.shiftedPlacement,
    displacedAt, sourceEffectId: source.effect.id,
  };
  return { accepted: true, previousPlacement,
    structure: structuredClone(state.caseRuntime.structures[target.id]) };
}

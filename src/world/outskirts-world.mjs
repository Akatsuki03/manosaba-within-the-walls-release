/** Minimal authored courtyard/guesthouse layout. The card names the courtyard
 * outside the prison mansion and the three wooden guesthouses (`火精之室`,
 * `地精之室`, `水精之室`), including the fact that the guesthouse buildings
 * were temporary and could be moved. This slice activates only the first
 * ordinary `前往庭院` path: the existing prison rooms, the courtyard, and the
 * one `火精之室` building with its interior room. It adds no distance, lock,
 * water-guesthouse basement, case seed or map beyond those explicit rooms. */
export const COURTYARD_ROOM = 'courtyard';
export const GUESTHOUSE_FIRE_ROOM = 'guesthouse_fire';
export const GUESTHOUSE_FIRE_BUILDING = 'courtyard:guesthouse-fire';
export const OUTSKIRTS_ACTIVATION_VERSION = 1;

export const OUTSKIRTS_ROOMS = Object.freeze({
  [COURTYARD_ROOM]: '庭院',
  [GUESTHOUSE_FIRE_ROOM]: '火精之室',
});
export const OUTSKIRTS_CODES = Object.freeze({
  [COURTYARD_ROOM]: 'COURTYARD',
  [GUESTHOUSE_FIRE_ROOM]: 'GUESTHOUSE_FIRE',
});
export const OUTSKIRTS_DESCRIPTIONS = Object.freeze({
  [COURTYARD_ROOM]: '洋馆外的石径延伸向树林与湖边；庭院里立着几座木屋招待所。',
  [GUESTHOUSE_FIRE_ROOM]: '木屋招待所内，门牌写着火精之室；木板墙与地面保留着木屋的接缝。',
});

/** Authored parent structure. The courtyard is the outside sight scope; the
 * interior room is the contained child. No room id or occupant is moved when
 * the parent placement changes. */
export const GUESTHOUSE_FIRE_STRUCTURE = Object.freeze({
  id: GUESTHOUSE_FIRE_BUILDING,
  name: '火精之室',
  kind: 'building',
  rooms: Object.freeze([GUESTHOUSE_FIRE_ROOM]),
  sightRooms: Object.freeze([COURTYARD_ROOM]),
  placement: '庭院内的原位置',
  shiftedPlacement: '在庭院内挪动后的位置',
});

export const isCourtyardEntry = value => {
  if (typeof value !== 'string') return false;
  const command = value.trim().replace(/[。！!]+$/u, '').replace(/(?:看看|看一看|瞧瞧|看一下)$/u, '');
  return /^(?:我)?(?:前往|去|走向|走到|进入)庭院$/u.test(command);
};

export const outskirtsActive = state => {
  const row = state?.caseRuntime?.structures?.[GUESTHOUSE_FIRE_BUILDING];
  return Boolean(row && row.kind === 'building' && Array.isArray(row.rooms)
    && row.rooms.includes(GUESTHOUSE_FIRE_ROOM));
};

/** Internal lazy activation used only by the ordinary `前往庭院` parse/draft
 * path. It writes the authored parent into the existing shared structure
 * register; it does not add a player-facing enable endpoint or a new state
 * field. Calling it twice is idempotent. */
export function activateOutskirts(state) {
  if (!state?.caseRuntime || state.caseRuntime.version !== 1) return false;
  if (outskirtsActive(state)) return true;
  state.caseRuntime.structures ||= {};
  state.caseRuntime.structures[GUESTHOUSE_FIRE_BUILDING] = {
    id: GUESTHOUSE_FIRE_BUILDING,
    name: GUESTHOUSE_FIRE_STRUCTURE.name,
    kind: 'building',
    rooms: [...GUESTHOUSE_FIRE_STRUCTURE.rooms],
    sightRooms: [...GUESTHOUSE_FIRE_STRUCTURE.sightRooms],
    placement: GUESTHOUSE_FIRE_STRUCTURE.placement,
    activatedAt: Number.isFinite(state.worldTime) ? state.worldTime : 0,
  };
  return true;
}

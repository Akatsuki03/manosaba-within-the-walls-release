import { resolveLocation, AGENT_CELLS } from './locations.mjs';

// Native sizes of the local Layout_* images, not the upstream demo's fixed canvas.
// The map image and its overlays share an SVG viewBox, including any letterboxing.
export const MAP_LAYOUTS = Object.freeze({
  F1: Object.freeze({ width: 1631, height: 932 }),
  F2: Object.freeze({ width: 1631, height: 831 }),
  B1: Object.freeze({ width: 1381, height: 734 }),
});

// The unlabelled B1 artwork repeats cells every 130 px. Reuse its leftmost
// 175 px as a new empty cell and corridor end, then join the original at x=45.
// Cropping away the original left wall also keeps the extended corridor open.
const CUSTOM_B1_LAYOUT = Object.freeze({
  width: MAP_LAYOUTS.B1.width + 130, height: MAP_LAYOUTS.B1.height,
  imageOffsetX: 130, extensionWidth: 175,
});
const hasPlayerCell = view => {
  if (view?.exampleId !== 'agent') return false;
  // Current setup owns physical layout, not visited locations, names or the
  // simulator's global room table. The host also covers explicit PLAYER_CELL
  // openings for canon players without marking their identity as custom.
  if (typeof view.mapLayout?.hasPlayerCell === 'boolean') return view.mapLayout.hasPlayerCell;
  if (view.playerMode === 'original' || view.playerMode === 'custom') return view.playerMode === 'custom';
  return view.player?.custom === true; // Older sparse custom views.
};
export function resolveMapLayout(floor, view = {}) {
  return floor === 'B1' && (view?.exampleId === 'custom' || hasPlayerCell(view)) ? CUSTOM_B1_LAYOUT : MAP_LAYOUTS[floor];
}

// Room identities checked against https://wiki.biligame.com/manosaba/地图
// Rectangles are local annotations measured on the unlabelled Layout_* images;
// they are not claimed to be original-game selectable areas.
const area = (id, floor, rect) => Object.freeze({
  ...resolveLocation(id), floor, rect: Object.freeze(rect),
});
export const MAP_AREAS = Object.freeze([
  area('cell', 'B1', [44, 52, 907, 112]),
  area('cell-corridor', 'B1', [44, 176, 907, 59]),
  area('reception', 'F1', [483, 584, 188, 167]),
  area('hall', 'F1', [680, 173, 281, 306]),
  area('kitchen', 'F1', [1103, 194, 164, 66]),
  area('court', 'F1', [1277, 200, 294, 551]),
]);
const CUSTOM_MAP_AREAS = Object.freeze(MAP_AREAS.map(room => {
  if (room.id === 'cell') return area('cell', 'B1', [44, 52, 125, 112]);
  if (room.id === 'cell-corridor') return area('cell-corridor', 'B1', [44, 176, 1037, 59]);
  return room;
}));
const AGENT_MAP_AREAS = Object.freeze([
  ...MAP_AREAS.filter(room => room.id !== 'cell'),
  // Staircase is on the right of this B1 image: authored cell 1 is nearest it.
  ...AGENT_CELLS.map((room, index) => Object.freeze({ ...room, floor: 'B1', rect: Object.freeze([824 - index * 130, 52, 125, 112]) })),
]);
const CREATED_MAP_AREAS = Object.freeze([
  // Cells move with the original artwork; the corridor also includes the
  // cloned left-hand segment, using the existing extended-layout rectangle.
  ...AGENT_MAP_AREAS.map(room => room.id === 'cell-corridor' ? CUSTOM_MAP_AREAS.find(area => area.id === room.id)
    : room.floor === 'B1' ? Object.freeze({ ...room, rect: Object.freeze([room.rect[0] + 130, ...room.rect.slice(1)]) }) : room),
  area('player-cell', 'B1', [44, 52, 125, 112]),
]);
const mapAreas = view => view?.exampleId === 'agent' ? (hasPlayerCell(view) ? CREATED_MAP_AREAS : AGENT_MAP_AREAS) : view?.exampleId === 'custom' ? CUSTOM_MAP_AREAS : MAP_AREAS;
// 医务室 has a canonical identity and backdrop, but no locally verified map
// rectangle. Do not guess a region on the unlabelled layout image.
export function resolveMapArea(location, view = {}) {
  const room = resolveLocation(location, view);
  return room && mapAreas(view).find(area => area.id === room.id);
}
export function visibleMapAreas(view, floor) {
  const visited = new Set((view.unlockedLocations || []).map(location => resolveLocation(location, view)?.id).filter(Boolean));
  const current = resolveLocation(view.location, view)?.id;
  // The authoritative current location is visited, even in older/sparse views.
  if (current) visited.add(current);
  return mapAreas(view).filter(area => area.floor === floor && visited.has(area.id))
    .map(area => ({ ...area, current: area.id === current }));
}
// Run only on view updates, not on tab/floor renders: manual browsing persists
// until the location, example context or generation changes.
export function updatedMapFloor(floor, previousView, view) {
  if (previousView.location !== view.location || previousView.generation !== view.generation || previousView.exampleId !== view.exampleId) {
    return resolveMapArea(view.location, view)?.floor || floor;
  }
  return floor;
}

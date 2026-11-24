// Canonical room identities are shared by the map and scene backgrounds.
// A known room need not have a verified map rectangle or a default background.
const location = (id, name, aliases = []) => Object.freeze({
  id, name, aliases: Object.freeze([id, name, ...aliases]),
});

export const LOCATIONS = Object.freeze([
  location('cell', '牢房', ['地下牢房', '监房']),
  location('player-cell', '八号牢房', ['八號牢房', '新增牢房', '玩家牢房']),
  location('cell-corridor', '牢房过道', ['走廊', '牢房走廊', '地下走廊', 'corridor']),
  location('reception', '接客室', ['会客室', 'lounge']),
  location('hall', '会客厅', ['1F大厅', '玄关大厅']),
  location('cafeteria', '食堂', ['餐厅']),
  location('kitchen', '厨房'),
  location('court', '审判庭', ['审判所', '法庭']),
  location('infirmary', '医务室'),
  location('courtyard', '庭院'),
  location('lake', '湖边'),
]);

const locationsByAlias = new Map(LOCATIONS.flatMap(room => room.aliases.map(alias => [alias, room])));
// Distinct authored cells in the live scenario; this does not unlock or expose
// their occupants. Only locations actually returned in the view get map labels.
export const AGENT_CELLS = Object.freeze(['一','二','三','四','五','六','七'].map((number, index) =>
  location(`agent-cell-${index + 1}`, `${number}号牢房`, index === 2 ? ['牢房'] : [])));
const agentCellsByAlias = new Map(AGENT_CELLS.flatMap(room => room.aliases.map(alias => [alias, room])));

export function resolveLocation(value, view = {}) {
  if (typeof value !== 'string') return undefined;
  const alias = value.trim();
  if (view?.exampleId === 'agent' && agentCellsByAlias.has(alias)) return agentCellsByAlias.get(alias);
  // Only these authored scenarios call the fireplace reception room 会客厅. The Wiki's
  // separate hall keeps its own identity everywhere else, including bare IDs.
  if (alias === '会客厅' && ['emma', 'custom', 'prototype', 'agent'].includes(view?.exampleId)) {
    return locationsByAlias.get('reception');
  }
  return locationsByAlias.get(alias);
}

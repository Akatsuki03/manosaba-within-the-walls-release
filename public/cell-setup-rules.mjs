export const CELL_SETUP_VERSION = 1;
export const CUSTOM_DEFAULT_CELL = 'PLAYER_CELL';
const freeze = value => {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
};
// Host-owned canonical room/bunk map. This is physical layout, not a claim that
// any two occupants know, like or remember one another.
export const CANONICAL_CELLS = freeze({
  emma: { cell: 'CELL', bunk: '下铺' },
  hiro: { cell: 'CELL', bunk: '上铺' },
  anan: { cell: 'CELL_04', bunk: '上铺' },
  noah: { cell: 'CELL_04', bunk: '下铺' },
  leia: { cell: 'CELL_05', bunk: '上铺' },
  milia: { cell: 'CELL_05', bunk: '下铺' },
  margo: { cell: 'CELL_02', bunk: '上铺' },
  nanoka: { cell: 'CELL_02', bunk: '下铺' },
  alisa: { cell: 'CELL_01', bunk: '下铺' },
  sherry: { cell: 'CELL_01', bunk: '上铺' },
  hanna: { cell: 'CELL_06', bunk: '下铺' },
  coco: { cell: 'CELL_06', bunk: '上铺' },
  meruru: { cell: 'CELL_07', bunk: null },
});
// A custom player may replace one bed in a double cell. Meruru's single cell is
// intentionally absent: she remains the sole occupant of cell 07.
export const CELL_REPLACEMENTS = freeze(Object.entries(CANONICAL_CELLS)
  .filter(([, value]) => value.bunk !== null)
  .map(([actorId, value]) => ({ actorId, cell: value.cell, bunk: value.bunk })));
const replacementById = new Map(CELL_REPLACEMENTS.map(choice => [choice.actorId, choice]));
const invalid = message => { throw Object.assign(new Error(message), { code: 'INVALID_CREATION' }); };
export function canonicalCell(actorId) {
  const value = CANONICAL_CELLS[actorId];
  return value ? { ...value } : null;
}
export function cellReplacement(actorId) {
  const value = replacementById.get(actorId);
  return value ? { ...value } : null;
}
export function cellSetupFields({ fixed = false, playerMode, replaceActorId = '' } = {}) {
  if (fixed) return {};
  const replacement = playerMode === 'custom' && replaceActorId ? replaceActorId : '';
  if (replacement && !replacementById.has(replacement)) invalid('不能替换这个角色的床位。');
  return { cellSetup: { version: CELL_SETUP_VERSION, ...(replacement ? { replaceActorId: replacement } : {}) } };
}
export function normalizeCellSetup(value, { playerMode, actorId } = {}) {
  if (value === null || typeof value !== 'object') invalid('牢房床位设定格式无效。');
  if (!Object.hasOwn(value, 'version') || value.version !== CELL_SETUP_VERSION) invalid('牢房床位设定版本不一致。');
  for (const key of Object.keys(value)) if (!['version', 'replaceActorId'].includes(key)) invalid('牢房床位设定包含不支持的字段。');
  if (!Object.hasOwn(value, 'replaceActorId')) return { version: CELL_SETUP_VERSION };
  if (typeof value.replaceActorId !== 'string' || !replacementById.has(value.replaceActorId)) invalid('只能替换双人牢房中的床位。');
  if (playerMode !== 'custom') invalid('原作角色只能使用自己的牢房。');
  if (value.replaceActorId === actorId) invalid('不能替换自己的床位。');
  return { version: CELL_SETUP_VERSION, replaceActorId: value.replaceActorId };
}
export function cellSetupLocation(cellSetup, { playerMode, actorId } = {}) {
  if (!cellSetup) return null;
  if (playerMode === 'custom') {
    return cellSetup.replaceActorId ? replacementById.get(cellSetup.replaceActorId).cell : CUSTOM_DEFAULT_CELL;
  }
  return CANONICAL_CELLS[actorId]?.cell ?? null;
}
/** Physical initial layout. The custom player takes the replaced actor's bunk;
 * that actor moves alone to cell 08. Names, bodies and recollections never move. */
export function cellSetupLayout(cellSetup, { playerMode, actorId } = {}) {
  const layout = {};
  for (const [id, value] of Object.entries(CANONICAL_CELLS)) layout[id] = { ...value };
  if (playerMode === 'custom') {
    const replaced = cellSetup?.replaceActorId ? replacementById.get(cellSetup.replaceActorId) : null;
    layout.player = replaced ? { cell: replaced.cell, bunk: replaced.bunk } : { cell: CUSTOM_DEFAULT_CELL, bunk: null };
    if (replaced) layout[replaced.actorId] = { cell: CUSTOM_DEFAULT_CELL, bunk: null };
  } else {
    const own = CANONICAL_CELLS[actorId];
    layout.player = own ? { ...own } : null;
  }
  return layout;
}

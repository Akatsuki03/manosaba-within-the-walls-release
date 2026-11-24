import { createHash } from 'node:crypto';
import { CURRENT_BUNK_SUPPLEMENT_ID, BUNK_SETTING_V2, BUNK_SETTING_V2_REFERENCE, usesBunkSettingV2,
  v2BunkKnowledge, v2BunkScene, v2OwnerBunk, v2OpeningKnowledge, V2_CHARACTER_CELL_OPENINGS, v2CharacterCellOpening } from './prison-bunks-v2.mjs';
import { cellSetupLayout } from '../../public/cell-setup-rules.mjs';
export { CURRENT_BUNK_SUPPLEMENT_ID, usesBunkSettingV2, V2_CHARACTER_CELL_OPENINGS, v2CharacterCellOpening } from './prison-bunks-v2.mjs';

// Separate, opt-in setup supplement: the audited original content package and
// its historical execution revisions remain byte-for-byte unchanged. Never add
// this reference while reading/restoring a state or resuming an existing job.
export const BUNK_SUPPLEMENT_ID = 'prison-bunks@1';
const definition = {
  id: BUNK_SUPPLEMENT_ID, version: 1,
  rooms: {
    cell: { kind: 'single_bunk_bed', upper: 'hiro', lower: 'emma', source: 'original-text' },
    cell04: { kind: 'single_bunk_bed', upper: 'anan', lower: 'noah', source: 'user-authorized-fan-setting' },
  },
  sources: [
    { id: 'original-text', classification: 'original-text',
      file: 'Act01_Chapter01_全剧情.txt', sections: ['0101Adv02_Narrative004', '0101Adv02_Narrative021'],
      corroboration: 'Act02_Chapter01_全剧情.txt:0201Adv03_Narrative004/006' },
    { id: 'user-authorized-fan-setting', classification: 'fan-fiction-reference', official: false,
      authority: 'User authorized this project to adopt Anan upper / Noah lower as its own fan setting.',
      title: '【同人小說】初識（夏目安安 & 城崎諾亞）- 魔法少女的魔女審判', author: '幻空',
      url: 'https://home.gamer.com.tw/artwork.php?sn=6233465',
      referenceScope: 'Search-index excerpt attributes the upper bunk to the Anan viewpoint and the lower bunk to her roommate; not a claim of a full-page reading.',
      adaptation: 'Only the authorized physical bunk arrangement is adopted, in new wording. No dialogue, acquaintance, promises or future events are imported.' },
  ],
  unknownPolicy: 'All other occupants’ upper/lower assignments remain unknown; never infer them from room sharing or an appearance.',
};
const freeze = value => { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };
export const BUNK_SUPPLEMENT = freeze(definition);
export const BUNK_SUPPLEMENT_REFERENCE = freeze({ id: BUNK_SUPPLEMENT_ID, version: 1,
  fingerprint: createHash('sha256').update(JSON.stringify(definition)).digest('hex') });
const codes = { cell: 'CELL', cell04: 'CELL_04' };
const ordinaryBunkRooms = new Set(['cell01', 'cell02', 'cell05', 'cell06']);
const fail = () => { throw Object.assign(new Error('床位补充设定的版本或来源不一致，原进度保持不变。'), { code: 'SOURCE_VERSION_MISMATCH' }); };
export function initialBunkSupplement(creation) {
  if (!creation?.settingSupplementId || creation.settingSupplementId === 'none') return undefined;
  if (creation.settingSupplementId === CURRENT_BUNK_SUPPLEMENT_ID) return structuredClone(BUNK_SETTING_V2_REFERENCE);
  if (creation.settingSupplementId !== BUNK_SUPPLEMENT_ID) fail();
  return structuredClone(BUNK_SUPPLEMENT_REFERENCE);
}
export function hasBunkSupplement(state) {
  if (!state?.settingSupplement) return false;
  const reference = state.settingSupplement;
  if (reference.id === CURRENT_BUNK_SUPPLEMENT_ID) {
    if (state.creation?.settingSupplementId !== CURRENT_BUNK_SUPPLEMENT_ID || Object.keys(reference).length !== 3
      || !Object.keys(BUNK_SETTING_V2_REFERENCE).every(key => reference[key] === BUNK_SETTING_V2_REFERENCE[key])) fail();
    return true;
  }
  if (state.creation?.settingSupplementId !== BUNK_SUPPLEMENT_ID || Object.keys(reference).length !== 3
    || !Object.keys(BUNK_SUPPLEMENT_REFERENCE).every(key => reference[key] === BUNK_SUPPLEMENT_REFERENCE[key])) fail();
  return true;
}
function ownerBunk(state, actor, room) {
  if (!hasBunkSupplement(state) || !actor || !codes[room]) return null;
  if (state.creation?.cellSetup) {
    const row = cellSetupLayout(state.creation.cellSetup, {
      playerMode: state.creation.playerMode, actorId: state.creation.actorId })[actor.id];
    return row?.cell === codes[room] ? row.bunk : null;
  }
  if (actor.locationId !== codes[room]) return null;
  if (state.creation?.actorId === actor.id && state.creation.opening
    && state.creation.opening.locationId !== codes[room]) return null;
  const layout = definition.rooms[room];
  return layout?.upper === actor.id ? '上铺' : layout?.lower === actor.id ? '下铺' : null;
}
export function bunkKnowledgeClassification(state, actorId) {
  if (!hasBunkSupplement(state)) return null;
  if (usesBunkSettingV2(state)) return Object.values(BUNK_SETTING_V2.rooms)
    .find(room => [room.upper, room.lower].includes(actorId))?.source || 'project-setting';
  return ['anan', 'noah'].includes(actorId) ? 'user-authorized-fan-setting' : 'original-text';
}
export function bunkActorKnowledge(state, actor) {
  if (!hasBunkSupplement(state) || !usesBunkSettingV2(state)) return actor.initialKnowledge;
  return v2OpeningKnowledge(actor);
}
export function bunkPsychologyBlueprint(state, blueprint) {
  if (!hasBunkSupplement(state) || !usesBunkSettingV2(state)) return blueprint;
  return { ...blueprint, observations: blueprint.observations.map(row => {
    const text = v2OpeningKnowledge({ initialKnowledge: [row.text] })[0];
    return text === row.text ? row : { ...row, text, source: { file: 'src/prison-bunks-v2.mjs',
      pointer: row.source.pointer, sha256: createHash('sha256').update(text).digest('hex'),
      knowledgeState: 'owner-known', adaptedFrom: row.source, settingSupplement: structuredClone(state.settingSupplement) } };
  }) };
}
export function bunkStartingKnowledge(state, actor) {
  if (!hasBunkSupplement(state)) return [];
  if (usesBunkSettingV2(state)) return v2BunkKnowledge(state, actor);
  for (const room of Object.keys(definition.rooms)) {
    const own = ownerBunk(state, actor, room);
    if (own) return [`我在自己所属牢房的床位是${own}，上下两铺共用同一张双层床的床架，不是两张相对的单人床。床位安排不代表我认识另一床位的人，也不代表我知道其他牢房的床位。`];
  }
  return [];
}
export function visibleOwnBunk(state, actor, room) {
  if (actor?.id === 'anan' && state.storyArc?.displacedAt !== undefined && !['aftermath', 'ending'].includes(state.storyArc.status)) return null;
  const supplement = hasBunkSupplement(state);
  // The confirmed-ability root can carry a physical cellSetup without a prose
  // supplement. The assigned bunk still comes from that same layout.
  if (state.creation?.cellSetup || (supplement && usesBunkSettingV2(state))) return v2OwnerBunk(state, actor, room);
  return supplement ? ownerBunk(state, actor, room) : null;
}

/** Current-room physical perception only. Assigned bunk is not body position;
 * the absent roommate's name, location and condition are never inferred. */
export function bunkSceneDescription(state, room, actor, original) {
  if (!hasBunkSupplement(state)) return original;
  if (usesBunkSettingV2(state)) return v2BunkScene(state, room, actor, original);
  const layout = definition.rooms[room];
  if (!layout && !ordinaryBunkRooms.has(room)) return original;
  const displaced = actor?.id === 'anan' && state.storyArc?.displacedAt !== undefined
    && !['aftermath', 'ending'].includes(state.storyArc.status);
  const own = displaced ? null : ownerBunk(state, actor, room);
  return `${original}房内的睡床是一张上下叠置、共用床架的双层床，不是两张相对的单人床。${own
    ? `你在这里的床位是${own}；床位登记不表示你此刻已经躺在床上，另一床位的人是否在场只依眼前实际感知。`
    : '上下铺由谁使用不能凭床架或未确认的外貌推定，未获知的床位归属保持未知。'}`;
}

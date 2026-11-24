import { LOCATIONS, resolveLocation } from './locations.mjs';

// 文件名格式：位置_状态_原编号.png。位置和状态用英文，多词用连字符。
// 只把核对过画面的常态房间放进位置映射。血迹、损坏、夜间和后续事件不作为默认背景。

export const BACKGROUND_FILES = Object.freeze([
  'cell_empty_174.png',
  'cell_guard_175.png',
  'cell-corridor_intact_176.png',
  'dungeon-hall_dim_177.png',
  'dungeon-hall_lit_178.png',
  'entrance-hall_cracked_179.png',
  'reception_intact_180.png',
  'reception_lit_181.png',
  'cafeteria_intact_182.png',
  'infirmary_night_183.png',
  'infirmary_day_184.png',
  'court-hall_day_185.png',
  'court-hall_night-blood_186.png',
  'staircase_day_187.png',
  'recreation-room_lit_188.png',
  'library_day_189.png',
  'courtroom_day_190.png',
  'courtroom_door_191.png',
  'flower-field_day_192.png',
  'lake_day_193.png',
  'lake_night_194.png',
  'perimeter-wall_day_195.png',
  'prison-gate_day_196.png',
  'prison-gate_night_197.png',
  'waterway_dark_198.png',
  'punishment-room_dark_199.png',
  'guesthouse_day_200.png',
  'guesthouse_night_201.png',
  'guesthouse_burning_202.png',
  'guesthouse_blood_203.png',
  'guesthouse-room_toppled-doll_204.png',
  'guesthouse-room_day_205.png',
  'guesthouse-room_dim_206.png',
  'guesthouse-room_elevator_207.png',
  'guesthouse-room_shaken_208.png',
  'guesthouse-room_fog_209.png',
  'guesthouse-room_night_210.png',
  'guesthouse-room_elevator-night_211.png',
  'storeroom_intact_212.png',
  'storeroom_spider_213.png',
  'control-room_intact_214.png',
  'control-room_vent_215.png',
  'freezer_dark_216.png',
  'incinerator_dark_217.png',
  'courtyard_day_218.png',
  'courtyard_night_219.png',
  'atelier_day_220.png',
  'atelier_night_221.png',
  'shower_intact_222.png',
  'shower_graffiti_223.png',
  'lattice-gate_closed_224.png',
  'lattice-gate_gears_225.png',
  'lattice-gate_vent_226.png',
  'lattice-gate_covered_227.png',
  'lattice-gate_gears-covered_228.png',
]);

const cell = Object.freeze({ id: 'cell', url: '/assets/backgrounds/cell_empty_174.png' });
const corridor = Object.freeze({ id: 'corridor', url: '/assets/backgrounds/cell-corridor_intact_176.png' });
const lounge = Object.freeze({ id: 'lounge', url: '/assets/backgrounds/reception_intact_180.png' });
const infirmary = Object.freeze({ id: 'infirmary', url: '/assets/backgrounds/infirmary_day_184.png' });
const UNKNOWN_SCENE = Object.freeze({ id: 'unknown', url: '' });

// 174 空牢房（下铺、上铺、门上小窗）。175 是门外有看守的事件画面。
// 176 两侧铁栏的牢房过道。序章里的「走廊」就是离开牢房后的这段过道。
// 180 沙发、壁炉与屏幕的接客室，对应集合、自我介绍和典狱长说明。181 是同一间、壁炉和吊灯更亮。182 是食堂。
// 医务室是同一间两张病床的房间：184 白天，183 夜间。位置名使用白天常态。
const backgroundsByLocation = Object.freeze({
  cell,
  'player-cell': cell,
  'cell-corridor': corridor,
  reception: lounge,
  cafeteria: Object.freeze({ id: 'cafeteria', url: '/assets/backgrounds/cafeteria_intact_182.png' }),
  infirmary,
  court: Object.freeze({ id: 'court', url: '/assets/backgrounds/courtroom_day_190.png' }),
  courtyard: Object.freeze({ id: 'courtyard', url: '/assets/backgrounds/courtyard_day_218.png' }),
  lake: Object.freeze({ id: 'lake', url: '/assets/backgrounds/lake_day_193.png' }),
});
// Preserve one-argument callers' prologue background and public scene IDs
// (corridor/lounge). Passing a view, even {}, uses the canonical scoped identity:
// generic 会客厅 is hall, whose background has not been verified, not reception.
const LEGACY_BACKGROUND_VIEW = Object.freeze({ exampleId: 'emma' });

export function resolveSceneBackground(location, view = LEGACY_BACKGROUND_VIEW) {
  const room = resolveLocation(location, view);
  return room?.id?.startsWith('agent-cell-') ? cell : backgroundsByLocation[room?.id] || UNKNOWN_SCENE;
}

// Backwards-compatible alias lookup, derived from the same resolver rather than
// maintaining another room-name table. Use resolveSceneBackground with a view
// when the caller has example context.
export const SCENE_BACKGROUNDS = Object.freeze(Object.fromEntries(
  LOCATIONS.flatMap(room => room.aliases.map(alias => [alias, resolveSceneBackground(alias)]))
    .filter(([, scene]) => scene !== UNKNOWN_SCENE),
));

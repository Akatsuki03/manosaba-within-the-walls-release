import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import { isProxy } from 'node:util/types';
import { canonicalJson } from '../random-draws.mjs';
import { runtimeCapabilityId } from '../../content/runtime-capabilities.mjs';

const freeze = value => {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
};
export const abilityDigest = value => createHash('sha256').update(canonicalJson(value)).digest('hex');
export const ABILITY_RULES = freeze({ version: 1, ref: 'host-narrative-abilities@1',
  activation: 'explicit-confirmed-approved-preset-host-action; runtime-v8-only; no-name-or-card-text-grants',
  destinations: 'current-visible-room-or-personally-visited-host-arrival; known-existing-map-only',
  boundary: 'fixed-at-initialization; cross-island-only; ordinary-island-teleport-permitted',
  reaction: 'one-existing-wisdom-d20-for-concentration-timing; no-second-ability-die',
  resources: 'narrative-mental-burden-only; no-mp-cooldown-or-use-cap',
  effects: 'host-room-setter-and-existing-two-action-escape-protection; no-adjacency-check',
  maxGuardOptions: 4, retainedHistory: 64 });
export const ABILITY_FINGERPRINT = abilityDigest(ABILITY_RULES);
export const ABILITY_REFERENCE = freeze({ ref: ABILITY_RULES.ref, fingerprint: ABILITY_FINGERPRINT });
export const SPATIAL_SHIFT = freeze({ version: 1, ref: 'yakumo-spatial-shift@1', label: '意念穿梭',
  targeting: 'visible-or-personally-visited-and-clearly-locatable; may-cross-locked-doors-and-walls',
  range: 'no-numeric-distance-cap; distant-destination-has-qualitative-mental-burden',
  transport: 'self-only-in-this-host-extension',
  unavailable: ['invented-maps', 'unvisited-offscreen-destinations', 'cross-island', 'space-cutting', 'time-manipulation', 'damage', 'other-actor-transport'],
  reaction: { ability: 'wisdom', dc: 13, environmentModifier: 0, purpose: 'concentration-before-capture-not-ability-success' } });
export const SPATIAL_SHIFT_REFERENCE = freeze({ ref: SPATIAL_SHIFT.ref, fingerprint: abilityDigest(SPATIAL_SHIFT) });
// Authored approval of the normalized character object, not its mutable name,
// free-text magic field, preset display label, file path or an uploaded card.
export const APPROVED_SPATIAL_PRESET = freeze({ ref: 'yakumo-akatsuki-character@1',
  characterHash: '1b3c47ac022266ae2f76501b88d28481528c93149a39561a5a24aac5c8a3c849',
  source: 'data/player-presets/yakumo-akatsuki.json#character',
  approval: 'user-confirmed-spatial-shift-definition@1' });
export const ISLAND_BOUNDARY = freeze({ ref: 'prison-island-boundary@1', islandId: 'prison-island',
  mode: 'block-cross-island-only', initializedBy: 'approved-host-ability-activation' });
export const isAbilityReference = value => isDeepStrictEqual(value, ABILITY_REFERENCE);
export const isSpatialShiftReference = value => isDeepStrictEqual(value, SPATIAL_SHIFT_REFERENCE);
export const abilityFailure = (code = 'INVALID_ABILITY_STATE', message = '魔法权限、地点见闻或封存效果与宿主记录不一致，未改变世界。') => {
  throw Object.assign(new Error(message), { code });
};
export function approvedSpatialCreation(creation) {
  if (creation === undefined) return false;
  try {
    const data = JSON.parse(canonicalJson(creation));
    return data?.playerMode === 'custom' && data.actorId === 'player'
      && abilityDigest(data.character) === APPROVED_SPATIAL_PRESET.characterHash;
  } catch { return false; }
}
export function validateAbilityActivation(action, creation) {
  try { canonicalJson(action); } catch { abilityFailure('INVALID_ABILITY_GRANT'); }
  const expected = { type: 'guard_magic_rules_activate', magicRules: ABILITY_REFERENCE,
    definition: SPATIAL_SHIFT_REFERENCE, boundary: ISLAND_BOUNDARY,
    grant: { id: 'approved-spatial-shift:player', actorId: 'player', authority: 'HOST_GRANT',
      provenance: { presetRef: APPROVED_SPATIAL_PRESET.ref, characterHash: APPROVED_SPATIAL_PRESET.characterHash,
        approvalRef: APPROVED_SPATIAL_PRESET.approval, confirmed: true } } };
  if (!approvedSpatialCreation(creation) || !isDeepStrictEqual(action, expected)) abilityFailure('INVALID_ABILITY_GRANT');
  return freeze(expected);
}
/** Pure identity check usable by persistence without importing the reducer.
 * No legacy state, scene, pending roll or runtime policy gains a default pin. */
export function abilityRuleReference(state) {
  // Reject proxies/accessors without invoking them. Only the extension's
  // provenance envelope is copied; unrelated large world payloads stay out.
  if (!state || typeof state !== 'object' || isProxy(state) || Object.getPrototypeOf(state) !== Object.prototype) abilityFailure('SOURCE_VERSION_MISMATCH');
  const envelope = {};
  try {
    for (const key of ['agentActions', 'agentRuntimeRevision', 'creation', 'abilityRuntime']) {
      const descriptor = Object.getOwnPropertyDescriptor(state, key);
      if (!descriptor) continue;
      if (!descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) abilityFailure('SOURCE_VERSION_MISMATCH');
      envelope[key] = descriptor.value;
    }
    state = JSON.parse(canonicalJson(envelope));
  } catch { abilityFailure('SOURCE_VERSION_MISMATCH'); }
  if (state.agentActions !== undefined && !Array.isArray(state.agentActions)) abilityFailure('SOURCE_VERSION_MISMATCH');
  let activation;
  for (const action of state?.agentActions || []) {
    if (action?.type === 'guard_magic_rules_activate') {
      if (activation || runtimeCapabilityId(state.agentRuntimeRevision) !== 'agent-prison-runtime@8') abilityFailure('SOURCE_VERSION_MISMATCH');
      try { validateAbilityActivation(action, state.creation); } catch { abilityFailure('SOURCE_VERSION_MISMATCH'); }
      activation = action;
    } else if (Object.hasOwn(action || {}, 'magicRules')) abilityFailure('SOURCE_VERSION_MISMATCH');
  }
  if (!activation) {
    if (Object.hasOwn(state || {}, 'abilityRuntime')) abilityFailure('SOURCE_VERSION_MISMATCH');
    return undefined;
  }
  const runtime = state.abilityRuntime;
  if (runtime?.version !== 1 || !isAbilityReference(runtime.rules) || !isDeepStrictEqual(runtime.boundary, ISLAND_BOUNDARY)
    || !isDeepStrictEqual(runtime.grants, [activation.grant])) abilityFailure('SOURCE_VERSION_MISMATCH');
  return ABILITY_REFERENCE;
}

// M5 is an opt-in, separate protocol. Nothing above (including @1 fingerprints,
// historical grants or a sealed guard pending choice) is migrated or rehashed.
export const MAGIC_PROTOCOL = freeze({ ref: 'host-roster-magic@2', version: 2,
  costs: [], growth: 'qualitative-actual-events-not-cast-count',
  targeting: 'owner-scoped-host-handles-at-current-story-boundary',
  chronology: 'validated-branch-request-not-save-load', maxReactionPhases: 8 });
export const MAGIC_REFERENCE = freeze({ ref: MAGIC_PROTOCOL.ref, fingerprint: abilityDigest(MAGIC_PROTOCOL) });
export const magicFail = (code, message = '魔法操作未获授权或当前条件不成立，世界未改变。') => {
  throw Object.assign(new Error(message), { code, ownerMessage: message });
};
export function magicJson(value) {
  try { return JSON.parse(canonicalJson(value)); } catch { magicFail('MAGIC_INVALID_INPUT'); }
}
export const magicExact = (value, keys) => value && typeof value === 'object' && !Array.isArray(value)
  && Reflect.ownKeys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
export const magicId = value => typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9:._@/-]{0,191}$/u.test(value);
// Valid identifiers can be "constructor" or "toString". Dictionaries are
// ordinary JSON across clone/persistence boundaries: never inherit entries.
export const magicOwn = (dictionary, key) => dictionary && Object.hasOwn(dictionary, key) ? dictionary[key] : undefined;

/** Selection is array order, NOT numeric ID. Card macros and instructions are
 * inert. Only the reviewed ability section below is compiled into reducers. */
export function selectMagicSources(card) {
  const entries = card?.data?.character_book?.entries;
  if (!Array.isArray(entries)) magicFail('MAGIC_SOURCE_SHAPE');
  const selected = new Map();
  entries.forEach((entry, index) => {
    if (entry?.enabled !== true) return;
    if (typeof entry.comment !== 'string' || typeof entry.content !== 'string') magicFail('MAGIC_SOURCE_SHAPE');
    selected.set(entry.comment, { file: 'data/card-source.json',
      pointer: `/data/character_book/entries/${index}/content`, entryId: entry.id,
      label: entry.comment, sha256: createHash('sha256').update(entry.content).digest('hex') });
  });
  return Object.fromEntries(selected);
}
const magicCardBytes = readFileSync(new URL('../../../data/card-source.json', import.meta.url));
export const MAGIC_CARD_HASH = 'c0362726876ab500b6bb474b356003081a0406d82fd3b26fc1cacbc23de0d4c6';
if (createHash('sha256').update(magicCardBytes).digest('hex') !== MAGIC_CARD_HASH) magicFail('MAGIC_SOURCE_VERSION');
const magicSources = selectMagicSources(JSON.parse(magicCardBytes));
export const MAGIC_SOURCE_CHECKS = freeze([
  { id: 'noah-butterfly-mode', status: 'requires-source-gate',
    sources: [magicSources['城崎诺亚'], magicSources['诺亚的魔法/健全模式']],
    rule: 'painting-only-basic; butterfly-specific-variant-not-implicitly-enabled' },
  { id: 'coco-cross-dimension', status: 'requires-source-gate', sources: [magicSources['泽渡可可']],
    rule: 'requires-existing-authorized-channel; no-unknown-world-discovery' },
  { id: 'hiro-awakened-repeat', status: 'requires-source-gate', sources: [magicSources['二阶堂希罗']],
    rule: 'source-says-cannot-repeat-after-witchification; host-must-certify-trigger-reachability' },
  { id: 'grant-binding-after-swap', status: 'requires-source-gate', sources: [magicSources['佐伯米莉亚']],
    rule: 'setup-must-explicitly-choose-mind-body-or-medium-binding-no-default-inheritance' },
  { id: 'milia-return-policy', status: 'requires-source-gate', sources: [magicSources['佐伯米莉亚']],
    rule: 'host-must-explicitly-approve-persist-or-restore-on-end-no-invented-return-default' },
]);
const roster = [
  ['emma', '樱羽艾玛', '魔女杀手', 'drain', 'witch-kill'],
  ['hiro', '二阶堂希罗', '死亡回溯', 'death-rewind', 'death-rewind'],
  ['anan', '夏目安安', '洗脑', 'speech-control', 'speech-control'],
  ['noah', '城崎诺亚', '操纵液体', 'liquid-paint', 'visual-illusion'],
  ['leia', '莲见蕾雅', '诱导视线', 'gaze', 'interest'],
  ['milia', '佐伯米莉亚', '互换', 'body-swap', 'memory-share'],
  ['margo', '宝生玛格', '模仿', 'sound-replay', 'surface-sound'],
  ['nanoka', '黑部奈叶香', '幻视', 'touch-vision', 'past-reading'],
  ['alisa', '紫藤亚里沙', '点火', 'ignite', 'blast'],
  ['sherry', '橘雪莉', '怪力', 'strength', 'shockwave'],
  ['hanna', '远野汉娜', '飘浮', 'self-float', 'mass-float'],
  ['coco', '泽渡可可', '千里眼', 'remote-view', 'dimension-view'],
  ['meruru', '冰上梅露露', '治愈·再生', 'regenerate', 'mental-heal'],
];
const familyFor = operation => operation === 'body-swap' ? 'identity'
  : operation === 'death-rewind' ? 'chronology'
    : ['speech-control', 'gaze', 'interest', 'memory-share', 'mental-heal'].includes(operation) ? 'cognition'
      : ['sound-replay', 'surface-sound', 'touch-vision', 'past-reading', 'remote-view', 'dimension-view', 'visual-illusion'].includes(operation) ? 'sensory' : 'physical';
const targetFor = operation => ['self-float', 'strength', 'death-rewind'].includes(operation) ? ['body']
  : ['liquid-paint', 'mass-float'].includes(operation) ? ['item']
    : ['ignite', 'blast', 'shockwave', 'mass-float', 'touch-vision', 'past-reading'].includes(operation) ? ['body', 'item', 'location']
      : ['sound-replay'].includes(operation) ? ['observation'] : ['body'];
const makeDefinition = (actorId, label, name, operation, stage) => {
  const id = `${actorId}:${stage}`;
  const checks = operation === 'dimension-view' ? ['coco-cross-dimension']
    : operation === 'death-rewind' && stage === 'awakened' ? ['hiro-awakened-repeat']
      : operation === 'body-swap' ? ['milia-return-policy'] : [];
  // Only mass-float changes its sealed parameter/target contract here.
  // Keep its original reviewed definition available below for old receipts.
  const version = operation === 'mass-float' ? 2 : 1;
  const definition = { id, ref: `${id}@${version}`, version, actorId, label: name, stage, operation,
    family: familyFor(operation), targetKinds: targetFor(operation), costs: [],
    activation: actorId === 'hiro' || actorId === 'emma' && stage === 'basic' || operation === 'touch-vision'
      ? 'host-event-reaction' : 'explicit-intent',
    sources: [magicSources[label], ...actorId === 'anan' ? [magicSources['魔法']] : []],
    sourceChecks: checks, grantBinding: 'explicit-at-setup',
    lifecycle: { stack: 'independent', sourceDeath: ['speech-control', 'gaze', 'interest', 'strength', 'self-float', 'mass-float', 'remote-view', 'dimension-view'].includes(operation) ? 'end' : 'persist',
      suppression: 'suspend-not-delete', clock: 'story-time-continues', expiry: 'explicit-host-end-boundary' },
    growth: { appliesTo: 'future-uses-only', source: 'actual-event-authorized-qualitative-variant' },
    mode: { trial: 'no-new-information-no-logic-dice;other-demonstrations-require-host-permit' } };
  return freeze({ ...definition, fingerprint: abilityDigest(definition) });
};
export const ROSTER_MAGIC_DEFINITIONS = freeze(roster.flatMap(([actorId, label, name, basic, awakened]) => [
  makeDefinition(actorId, label, name, basic, 'basic'), makeDefinition(actorId, label, name, awakened, 'awakened'),
]));
// General active cast is not the legacy guard-only spatial definition/grant.
const generalSpatial = { id: 'yakumo:general', ref: 'yakumo-spatial-shift@2', version: 2,
  actorId: 'player', label: '意念穿梭', stage: 'basic', operation: 'spatial-shift', family: 'physical',
  targetKinds: ['location'], costs: [], activation: 'explicit-intent',
  sources: [{ ref: APPROVED_SPATIAL_PRESET.approval, presetRef: APPROVED_SPATIAL_PRESET.ref }], sourceChecks: [],
  grantBinding: 'explicit-at-setup', lifecycle: { stack: 'independent', sourceDeath: 'persist', suppression: 'suspend-not-delete', clock: 'story-time-continues', expiry: 'instant' },
  scope: 'self-only-visible-or-personally-familiar-existing-location-same-island-even-locked',
  condition: 'concentration-and-qualitative-mental-condition-no-RPG-resource',
  mode: { trial: 'requires-host-permit-no-new-information' } };
export const GENERAL_SPATIAL_SHIFT = freeze({ ...generalSpatial, fingerprint: abilityDigest(generalSpatial) });
export const MAGIC_DEFINITIONS = freeze([...ROSTER_MAGIC_DEFINITIONS, GENERAL_SPATIAL_SHIFT]);
const massFloatV2 = ROSTER_MAGIC_DEFINITIONS.find(row => row.operation === 'mass-float');
const massData = Object.fromEntries(Object.entries(massFloatV2).filter(([key]) => key !== 'fingerprint'));
const legacyMassData = { ...massData, ref: 'hanna:awakened@1', version: 1, targetKinds: ['body', 'item', 'location'] };
export const LEGACY_MASS_FLOAT = freeze({ ...legacyMassData, fingerprint: abilityDigest(legacyMassData) });
export const magicDefinition = ref => MAGIC_DEFINITIONS.find(row => row.ref === ref)
  || (ref === LEGACY_MASS_FLOAT.ref ? LEGACY_MASS_FLOAT : undefined);
export const MAGIC_ROSTER = freeze(roster.map(([actorId, label]) => ({ actorId, label,
  source: magicSources[label], refs: ROSTER_MAGIC_DEFINITIONS.filter(row => row.actorId === actorId).map(row => row.ref) })));


import { initialMechanismDecision } from './content/initial-run-policy.mjs';
import { INTENT_RUNTIME_REVISION, CASE_BOUNDARY_RUNTIME_REVISION, hasIntentRuntime } from './content/relationship-context-policy.mjs';
import { createHash } from 'node:crypto';
import { isProxy } from 'node:util/types';
import { usesCurfewPolicy } from './world/curfew-policy.mjs';
import { guardDetained, GUARD_DETENTION_ROOM } from './world/guard-reaction.mjs';
import { actorsForState, createdPlayerId, CREATED_ROOMS, ROOM_CODES, relationshipInitialKnownIds } from './creation/player-setup.mjs';
import { prisonPassage } from './world/prison-activity.mjs';
import { runtimeRevisionForState } from './content/content-revisions.mjs';
import { actorObservationId } from './characters/observation-identity.mjs';
import { ITEM_POLICY_VERSION_2, caseItemPolicyV2Reference, isCaseItemPolicyV2Reference, supplyDeclarationsV2 } from './cases/case-item-policy.mjs';
import { physicalFactSnapshot, physicalObjectInspection } from './cases/case-physical-facts.mjs';
import { projectMagicPhysicalModifiers } from './world/magic/magic-effects.mjs';
import { applySharedForceDisplacement, displacedForceStructures, inspectableForceStructures, magicForceWorldView } from './world/magic/magic-force-world.mjs';
export { ITEM_POLICY_VERSION_2, caseItemPolicyV2Reference } from './cases/case-item-policy.mjs';
import { deferCasePlayerOutcome } from './cases/case-execution-events.mjs';
import { hasBunkSupplement, usesBunkSettingV2 } from './world/prison-bunks.mjs';
import { v2OwnerBunk } from './world/prison-bunks-v2.mjs';
import { OUTSKIRTS_CODES, OUTSKIRTS_ROOMS } from './world/outskirts-world.mjs';

// This is a small, opt-in physical simulator, not an alternate scenario loader.
// In particular no observation, missing item, motive or past crime is seeded.
export const CASE_RUNTIME_VERSION = 1;
export const CASE_RUNTIME_RULES_REF = 'causal-cases@1';
export const CASE_REACTION_SECONDS = 30;
const LIMITS = Object.freeze({ operations: 512, observations: 512, traces: 256, plans: 8, revisions: 48,
  incidents: 4, records: 8, signals: 256, receipts: 768, sources: 8 });
const ROOMS = Object.freeze({ ...CREATED_ROOMS, court: '审判庭', infirmary: '医务室', ...OUTSKIRTS_ROOMS });
const CODES = Object.freeze({ ...ROOM_CODES, court: 'COURT', infirmary: 'INFIRMARY', ...OUTSKIRTS_CODES });
const CANON_KIT = Object.freeze(['sword', 'broom', 'arrow', 'ribbon']);
const CLOSED = new Set(['abandoned', 'completed']);
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 20);
const clone = value => structuredClone(value);
const unique = values => [...new Set(values)];
const text = (value, maximum = 400) => typeof value === 'string' && Boolean(value.trim()) && value.length <= maximum
  && !/[<>\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value);
const plain = value => value !== null && typeof value === 'object' && !isProxy(value)
  && [Object.prototype, null].includes(Object.getPrototypeOf(value));
function data(value, key) {
  if (!plain(value)) return undefined;
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  return descriptor && Object.hasOwn(descriptor, 'value') ? descriptor.value : undefined;
}
function strings(value, maximum = LIMITS.sources) {
  if (isProxy(value) || !Array.isArray(value) || value.length > maximum) return null;
  const result = [];
  for (let index = 0; index < value.length; index++) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (!descriptor || !Object.hasOwn(descriptor, 'value') || !text(descriptor.value, 512)) return null;
    result.push(descriptor.value);
  }
  return unique(result);
}
const fail = () => { throw Object.assign(new Error('条件式案件运行规则版本不一致。'), { code: 'INVALID_AGENT_STATE' }); };
const time = state => Number.isFinite(state?.worldTime) ? state.worldTime : 0;
// Setup actors contain cloned personas/memories. Cache only the immutable
// physical identity slice, not any private knowledge or mutable positions.
const actorCache = new WeakMap();
function runtimeActors(state) {
  if (!state || typeof state !== 'object') return [];
  const signature = JSON.stringify(state.creation || null);
  const previous = actorCache.get(state);
  if (previous?.signature === signature) return previous.actors;
  const actors = actorsForState(state).map(({ id, name, appearance, locationId, communication }) => ({ id, name, appearance, locationId, communication }));
  actorCache.set(state, { signature, actors }); return actors;
}
const actor = (state, id) => runtimeActors(state).find(row => row.id === id);
const roster = state => runtimeActors(state).map(row => row.id);
const actorLabel = (state, id) => runtimePhysicalActor(state, id)?.appearance || id;
const actorName = (state, id) => actor(state, id)?.name || id;
// Keep identity projection independent of the perception/procedure import graph.
// Both scene handles and runtime capabilities use the same owner-local token.
export const runtimeActorHandle = (ownerId, targetId) => `person-${createHash('sha256').update(JSON.stringify(['actor-view@1', ownerId, targetId])).digest('hex').slice(0, 16)}`;
export function runtimeRecognizedActors(state, actorId) {
  const seeded = state.creation?.scenarioId === 'case-1' ? roster(state)
    : [actorId, ...relationshipInitialKnownIds(state, actorId, ['emma', 'hiro'].includes(actorId) ? [actorId === 'emma' ? 'hiro' : 'emma'] : [])];
  return new Set([...seeded, ...(actorId === createdPlayerId(state) ? state.known || [] : []),
    ...(state.agentAutonomy?.recognizedByActor?.[actorId] || [])]);
}
const perceivedActorLabel = (state, ownerId, targetId) => runtimeRecognizedActors(state, ownerId).has(runtimeBodyActorId(state, targetId))
  ? runtimePhysicalActor(state, targetId)?.name : actorLabel(state, targetId);
// Custody holder IDs already name native bodies; never resolve them as minds.
const physicalHolderLabel = (state, ownerId, bodyActorId) => {
  if (state.caseRuntime?.occupiedBody !== undefined) runtimeMindActorId(state, bodyActorId);
  return runtimeRecognizedActors(state, ownerId).has(bodyActorId)
    ? actor(state, bodyActorId)?.name : actor(state, bodyActorId)?.appearance;
};
const speakerLabels = (state, speakerId, audienceIds) => speakerId
  ? Object.fromEntries(audienceIds.map(ownerId => [ownerId, perceivedActorLabel(state, ownerId, speakerId)])) : {};
const roomId = value => typeof value === 'string' ? (Object.hasOwn(ROOMS, value) ? value
  : Object.keys(CODES).find(id => CODES[id] === value) || Object.keys(ROOMS).find(id => ROOMS[id] === value)
    || (value === '新增牢房' ? 'playercell' : undefined)) : undefined;
const availableStage = state => !state.completed && state.caseOutcome?.status !== 'pending' && !['assembly', 'discussion', 'ballot', 'execution_ready', 'ending']
  .includes(state.caseRuntime?.procedure?.stage);

export const hasCaseRuntime = state => Boolean(state?.caseRuntime?.version === CASE_RUNTIME_VERSION
  && state.caseRuntime.rulesRef === CASE_RUNTIME_RULES_REF
  && !(state.creation?.storyArcId === 'case-one-day3@1' && state.storyArc?.status === 'case'));

// Audited declarations, not extraction from prose or historical case recipes.
// Owner knowledge establishes possession, not public visibility or meaning.
const ITEM_DECLARATIONS = Object.freeze([
  Object.freeze({ id: 'sword', name: '刺剑', ownerId: 'leia', field: 'appearance',
    excerpt: '腰侧有带鞘刺剑', visibility: 'public' }),
  Object.freeze({ id: 'ribbon', name: '发带', ownerId: 'nanoka', field: 'initialKnowledge', index: 3,
    excerpt: '我保存着姐姐的头绳', visibility: 'private' }),
]);
export const ITEM_POLICY_VERSION = 1;
const strictItems = state => [ITEM_POLICY_VERSION, ITEM_POLICY_VERSION_2].includes(state.itemPolicyVersion);
const suppliesV2 = state => state.itemPolicyVersion === ITEM_POLICY_VERSION_2
  && isCaseItemPolicyV2Reference(state.caseItemPolicy);
/** Pure parse/observation helper: return a detached clone carrying the actual
 * host Magic projection beside an ordinary case state. The live envelope stays
 * authoritative and unchanged; callers use this only for read-only projection. */
export function withMagicProjection(state, magic) {
  if (!magic) return state;
  const projected = structuredClone(state);
  projected.magic = structuredClone(magic);
  return projected;
}
/** Explicit host activation only. Dispatch before ordinary scene gates. The
 * surrounding host transaction owns backup, history and pending-job exclusion. */
export function activateCaseItemPolicy(state, action, { pending = false } = {}) {
  if (!plain(action) || Reflect.ownKeys(action).length !== 3 || data(action, 'type') !== 'case_item_policy_activate'
    || data(action, 'confirmed') !== true || !isCaseItemPolicyV2Reference(data(action, 'policy')) || pending
    || state.completed || state.caseItemPolicy || state.creation?.scenarioId || state.creation?.storyArcId
    || state.caseRuntime?.operations.some(row => row.status === 'pending')) fail();
  const draft = clone(state);
  const retainedIds = draft.caseRuntime ? establishedObjectIds(draft.caseRuntime) : [];
  draft.caseItemPolicy = caseItemPolicyV2Reference();
  // Activation is a new audited execution, not replay of an old policy-1 job.
  delete draft.itemPolicyVersion;
  runtimeApplyItemPolicy(draft, 2);
  for (const definition of supplyDeclarationsV2()) {
    const prior = draft.caseRuntime.objects[definition.id];
    if (prior && retainedIds.includes(definition.id)) continue;
    draft.caseRuntime.objects[definition.id] = supplyObject(definition, time(draft));
    draft.caseRuntime.legacyObjectIds = (draft.caseRuntime.legacyObjectIds || []).filter(id => id !== definition.id);
  }
  Object.assign(state, draft);
  return state.caseRuntime;
}
function supplyObject(definition, at) {
  return { id: definition.id, name: definition.name, holderId: null, originalHolderId: null,
    room: definition.room, homeRoom: definition.room, placement: definition.placement,
    custodyVersion: 0, seededAt: at, source: clone(definition.source), visibility: definition.visibility };
}
function declaredItems(state) {
  const revision = runtimeRevisionForState(state);
  return ITEM_DECLARATIONS.filter(definition => {
    const owner = revision.actors.find(row => row.id === definition.ownerId);
    const value = definition.field === 'initialKnowledge' ? owner?.initialKnowledge[definition.index] : owner?.appearance;
    return actor(state, definition.ownerId) && typeof value === 'string' && value.includes(definition.excerpt);
  }).map(definition => ({ ...definition, source: { kind: 'content', fingerprint: revision.content.fingerprint,
    actorId: definition.ownerId, field: definition.field, ...(definition.index === undefined ? {} : { index: definition.index }) } }));
}
function establishedObjectIds(runtime) {
  const ids = new Set();
  for (const operation of runtime.operations) {
    if (!['completed', 'pending'].includes(operation.status)) continue;
    if (['take', 'drop', 'give', 'return', 'transfer-record', 'record', 'record-preparation'].includes(operation.kind)) {
      const id = operation.optionId?.split(':')[1]; if (runtime.objects[id]) ids.add(id);
    }
    for (const id of operation.resourceIds || []) ids.add(id);
  }
  for (const trace of runtime.traces) {
    if (trace.objectId) ids.add(trace.objectId);
    for (const id of trace.resourceIds || []) ids.add(id);
  }
  for (const record of runtime.records) if (record.objectId) ids.add(record.objectId);
  for (const plan of runtime.plans) for (const id of Object.keys(plan.preparation?.kit || {})) ids.add(id);
  return [...ids].filter(id => Object.hasOwn(runtime.objects, id)).sort();
}
/** Apply only to an execution/planning draft. Historical reducers omit version;
 * immutable history remains byte-for-byte replayable. Never call on a read head. */
export function runtimeApplyItemPolicy(state, version) {
  if (version === undefined) return state.caseRuntime;
  if (![ITEM_POLICY_VERSION, ITEM_POLICY_VERSION_2].includes(version)
    || (state.itemPolicyVersion !== undefined && state.itemPolicyVersion !== version)) fail();
  // Policy 2 requires an explicit pinned host extension, not a numeric flag
  // alone. Old plans that pass 1 still reject the new execution and vice versa.
  if (version === 2 && !isCaseItemPolicyV2Reference(state.caseItemPolicy)) fail();
  if (strictItems(state)) return state.caseRuntime || enableCaseRuntime(state);
  const previous = state.caseRuntime;
  state.itemPolicyVersion = version;
  if (!previous) return enableCaseRuntime(state);
  if (!hasCaseRuntime(state)) fail();
  previous.legacyObjectIds = establishedObjectIds(previous);
  previous.legacyPlanIds = previous.plans.map(plan => plan.id);
  // Annotate only audited objects; unsupported old seeds remain archival data,
  // never eligible capabilities merely because they survived in an old save.
  for (const definition of declaredItems(state)) {
    const object = previous.objects[definition.id];
    if (object && object.originalHolderId === definition.ownerId && object.name === definition.name) {
      object.source = definition.source; object.visibility = definition.visibility;
    }
  }
  return previous;
}
// Pure projection for current interaction only; historical reducers never use it.
export function runtimeItemProjection(state) {
  if (state.exampleId !== 'agent' || (state.caseOne && state.storyArc?.status !== 'aftermath') || state.creation?.scenarioId === 'case-1') return state;
  if (state.itemPolicyVersion === 2) { if (!suppliesV2(state)) fail(); return state; }
  if (state.itemPolicyVersion !== ITEM_POLICY_VERSION && runtimeRevisionForState(state).policy.sceneBeatVersion !== 1) return state;
  const projected = clone(state); runtimeApplyItemPolicy(projected, ITEM_POLICY_VERSION); return projected;
}
function eligibleObject(state, object) {
  if (suppliesV2(state) && object.destroyedAt !== undefined) return false;
  if (!strictItems(state)) return true;
  if (state.caseRuntime.legacyObjectIds?.includes(object.id)) return true;
  if (suppliesV2(state) && supplyDeclarationsV2().some(definition => definition.id === object.id
    && object.originalHolderId === null && JSON.stringify(object.source) === JSON.stringify(definition.source))) return true;
  return declaredItems(state).some(definition => definition.id === object.id && definition.name === object.name
    && definition.ownerId === object.originalHolderId && JSON.stringify(object.source) === JSON.stringify(definition.source));
}

export function enableCaseRuntime(state) {
  if (!plain(state) || state.itemPolicyVersion === 2 && !suppliesV2(state)) fail();
  // The historical checkpoint has its own rules and must never be migrated.
  if ((state.caseOne && state.storyArc?.status !== 'aftermath') || state.creation?.scenarioId === 'case-1') return null;
  if (state.caseRuntime) { if (!hasCaseRuntime(state)) fail(); return state.caseRuntime; }
  const at = time(state);
  const object = (id, name, holderId = null, room = null) => ({ id, name, holderId, room, originalHolderId: holderId,
    homeRoom: room, custodyVersion: 0, seededAt: at });
  state.caseRuntime = { version: 1, rulesRef: CASE_RUNTIME_RULES_REF,
    objects: { sword: object('sword', '刺剑', 'leia'), ribbon: object('ribbon', '发带', 'nanoka'),
      arrow: object('arrow', '弩箭', null, 'reception'), broom: object('broom', '扫帚柄', null, 'reception'),
      paints: object('paints', '颜料', 'noah'), paper: object('paper', '空白记录纸', null, 'reception') },
    plans: [], operations: [], traces: [], incidents: [], discoveries: [], knowledgeByActor: {}, signals: [],
    pendingActorIds: [], cursor: 0, procedure: null, activatedAt: at, serial: 0, observations: [],
    conditionsByActor: {}, executedIds: [], conflicts: [], records: [], pressureLinks: [], receipts: [],
    observedConditionsByActor: {}, objectMemoryByActor: {}, evidenceByActor: {} };
  if (strictItems(state)) {
    state.caseRuntime.objects = Object.fromEntries(declaredItems(state).map(definition => [definition.id,
      { ...object(definition.id, definition.name, definition.ownerId), source: definition.source, visibility: definition.visibility }]));
    state.caseRuntime.legacyObjectIds = [];
    if (suppliesV2(state)) for (const definition of supplyDeclarationsV2()) {
      state.caseRuntime.objects[definition.id] = supplyObject(definition, at);
    }
  }
  // Existing fatalities stay fatalities, but enabling this module is not itself
  // a new public observation of them.
  if (state.hiroStatus && state.hiroStatus !== 'alive') state.caseRuntime.conditionsByActor.hiro = { status: 'dead', inherited: true };
  return state.caseRuntime;
}

// Versioned HOST world mirror. This is data, not a bearer certificate: Domain
// authenticates it against the same-run MagicRepository ancestor before reads
// and publication. Raw physical registers below remain BODY-native actor keys.
export function occupiedBodyWorld(identity) {
  return { version: 1, occupants: Object.fromEntries(Object.entries(identity.occupants).map(([body, mind]) =>
    [identity.minds[mind].actorId, identity.bodies[body].actorId])) };
}
/** A committed identity mirror is an audited return to every own body, not an
 * active swap. Ordinary case/pose/routine capabilities resume; a real crossed
 * mirror still keeps the occupied-body restrictions. */
export function runtimeBodyIsIdentity(state) {
  if (state?.caseRuntime?.occupiedBody === undefined) return true;
  const occupants = occupiedMapping(state);
  return Object.entries(occupants).every(([mind, body]) => mind === body);
}
function occupiedMapping(state) {
  const mirror = state?.caseRuntime?.occupiedBody;
  const ids = roster(state).filter(id => id !== 'warden');
  const occupants = data(mirror, 'occupants');
  if (!plain(mirror) || Reflect.ownKeys(mirror).length !== 2 || data(mirror, 'version') !== 1
    || !plain(occupants) || Reflect.ownKeys(occupants).length !== ids.length
    || ids.some(id => !ids.includes(data(occupants, id)))
    || new Set(ids.map(id => data(occupants, id))).size !== ids.length) fail();
  return occupants;
}
const nonbodyWarden = (state, id) => id === 'warden' && actor(state, id)?.id === 'warden';
export function runtimeBodyActorId(state, mindActorId) {
  if (state?.caseRuntime?.occupiedBody === undefined) return mindActorId;
  const occupants = occupiedMapping(state); // Validate ordinary bodies BEFORE the sole nonbody exception.
  if (nonbodyWarden(state, mindActorId)) return undefined;
  if (!Object.hasOwn(occupants, mindActorId)) fail();
  return data(occupants, mindActorId);
}
export function runtimeMindActorId(state, bodyActorId) {
  if (state?.caseRuntime?.occupiedBody === undefined) return bodyActorId;
  const occupants = occupiedMapping(state);
  if (nonbodyWarden(state, bodyActorId)) return undefined;
  const mind = Object.keys(occupants).find(id => data(occupants, id) === bodyActorId);
  if (mind === undefined) fail();
  return mind;
}
export function runtimePhysicalActor(state, mindActorId) {
  const bodyId = runtimeBodyActorId(state, mindActorId);
  // A lawful narrative speaker label, never a witch body or physical participant.
  return bodyId === undefined && nonbodyWarden(state, mindActorId) ? actor(state, 'warden') : actor(state, bodyId);
}
export function runtimePhysicalRoom(state, bodyActorId) {
  if (state?.caseRuntime?.occupiedBody !== undefined) {
    const occupants = occupiedMapping(state);
    if (nonbodyWarden(state, bodyActorId)) return undefined;
    if (!Object.hasOwn(occupants, bodyActorId)) fail();
    const position = state.agentPositions?.[bodyActorId];
    return position === 'unavailable' ? undefined : roomId(position);
  }
  return runtimeRoom(state, bodyActorId);
}
export function runtimeRoom(state, actorId) {
  if (!state || typeof actorId !== 'string' || !actor(state, actorId)) return undefined;
  // The warden is a screen-only public function, never a body with a physical room.
  if (actorId === 'warden') return undefined;
  if (state.caseRuntime?.occupiedBody !== undefined) {
    const bodyId = runtimeBodyActorId(state, actorId);
    return bodyId === undefined ? undefined : runtimePhysicalRoom(state, bodyId);
  }
  if (actorId === createdPlayerId(state)) {
    if (state.location === '惩罚室' && guardDetained(state)) return GUARD_DETENTION_ROOM;
    if (state.location === 'unavailable') return undefined;
    const current = roomId(state.location);
    if (current && (current !== 'infirmary' || usesCurfewPolicy(state))) return current;
  }
  const position = state.agentPositions?.[actorId];
  if (position === 'unavailable') return undefined;
  const current = roomId(position || actor(state, actorId)?.locationId);
  return current === 'infirmary' && !usesCurfewPolicy(state) ? undefined : current;
}

/** Position setter only: the movement facade validates edges/door permissions.
 * Accepts ordinary uppercase codes and court; never invents another map. */
export function runtimeSetRoom(state, actorId, room) {
  if (!state || typeof actorId !== 'string' || !actor(state, actorId)) return false;
  if (state.caseRuntime?.occupiedBody !== undefined) {
    const bodyId = runtimeBodyActorId(state, actorId);
    if (bodyId === undefined) return false;
    const destination = roomId(room);
    if ((!destination && room !== 'unavailable') || destination === 'infirmary' && !usesCurfewPolicy(state)) return false;
    if (runtimePhysicalRoom(state, bodyId) !== destination) for (const offer of state.caseRuntime.swapLifecycle?.offers || [])
      if (['offered', 'holding'].includes(offer.status) && [offer.sourceBodyId, offer.targetBodyId].includes(bodyId)) offer.status = 'released';
    state.agentPositions = { ...state.agentPositions, [bodyId]: destination ? CODES[destination] : 'unavailable' };
    if (state.caseRuntime.posesByActor) delete state.caseRuntime.posesByActor[bodyId];
    if (state.caseRuntime.poseSourcesByActor) delete state.caseRuntime.poseSourcesByActor[bodyId];
    if (actorId === createdPlayerId(state)) { state.location = destination ? ROOMS[destination] : 'unavailable'; if (destination) state.phase = `agent_${destination}`; }
    return true;
  }
  if (room === GUARD_DETENTION_ROOM) {
    if (actorId !== createdPlayerId(state) || !guardDetained(state)) return false;
    if (state.caseRuntime?.poseSourcesByActor?.[actorId]) {
      delete state.caseRuntime.poseSourcesByActor[actorId]; delete state.caseRuntime.posesByActor[actorId];
    }
    state.agentPositions = { ...(state.agentPositions || {}), [actorId]: GUARD_DETENTION_ROOM };
    state.location = '惩罚室'; state.phase = 'agent_guard_detention';
    return true;
  }
  const destination = roomId(room);
  if ((!destination && room !== 'unavailable') || destination === 'infirmary' && !usesCurfewPolicy(state)) return false;
  const before = runtimeRoom(state, actorId);
  state.agentPositions = { ...(state.agentPositions || {}), [actorId]: destination ? CODES[destination] : 'unavailable' };
  if (actorId === createdPlayerId(state)) {
    state.location = destination ? ROOMS[destination] : 'unavailable';
    if (!state.caseRuntime?.procedure || ['daily', 'aftermath'].includes(state.caseRuntime.procedure.stage)) {
      if (destination) state.phase = `agent_${destination}`;
    }
  }
  if (hasCaseRuntime(state) && before !== destination) {
    if (state.caseRuntime.posesByActor) delete state.caseRuntime.posesByActor[actorId];
    if (state.caseRuntime.poseSourcesByActor) delete state.caseRuntime.poseSourcesByActor[actorId];
    for (const plan of state.caseRuntime.plans) if (plan.preparation?.gaze
      && [plan.ownerId, plan.targetId].includes(actorId)) {
      const knowsMovement = actorId === plan.ownerId || before === runtimeRoom(state, plan.ownerId);
      // Keep a remembered cue if movement was unobserved, while recording the
      // physical break separately for completion validation.
      plan.preparation.gaze.broken = true;
      if (knowsMovement) plan.preparation.gaze = null;
    }
  }
  return true;
}

export function runtimeActive(state, actorId) {
  if (!state || typeof actorId !== 'string' || !actor(state, actorId)) return false;
  const runtime = state.caseRuntime;
  const physicalId = runtimeBodyActorId(state, actorId);
  if (physicalId === undefined) return false;
  const condition = runtime?.conditionsByActor?.[physicalId];
  const status = typeof condition === 'string' ? condition : condition?.status;
  if (state.caseRuntime?.occupiedBody && condition && (status !== 'alive'
    || typeof condition === 'object' && Object.keys(condition).some(key => key !== 'status'))) return false;
  return !['dead', 'executed', 'incapacitated', 'unavailable'].includes(status)
    && !runtime?.executedIds?.includes(physicalId)
    && !runtime?.incidents?.some(row => row.victimId === physicalId)
    && !(physicalId === 'hiro' && state.hiroStatus && state.hiroStatus !== 'alive')
    && Boolean(runtimeRoom(state, actorId));
}
/** HOST_ONLY snapshot resolver, not a SQL authority certificate or a memory
 * grant. This version covers only the pinned, unpartitioned authored cells,
 * underground corridor and reception. It never follows an exit, parses prose,
 * reads knowledge, or maps a hidden mind occupant onto an actor label. */
export function runtimeContinuousScene(state, ownerId, { occupiedBodyVersion } = {}) {
  const occupied = occupiedBodyVersion === 1;
  const base = { visibility: 'HOST_ONLY', version: occupied ? 2 : 1,
    ref: occupied ? 'runtime-continuous-scene@2' : 'runtime-continuous-scene@1' };
  const unresolved = reason => Object.freeze({ ...base, status: 'unresolved', reason });
  // Only inspect the own-data physical slice used below. This is deliberately
  // not a hostile-world sandbox for the rest of the historical runtime APIs.
  const invalid = () => { throw new Error('INVALID_SCENE_INPUT'); };
  const read = (object, key) => {
    if (!plain(object)) invalid();
    const descriptor = Object.getOwnPropertyDescriptor(object, key);
    if (descriptor && !Object.hasOwn(descriptor, 'value')) invalid();
    return descriptor?.value;
  };
  const keys = (object, maximum, overflow = 'INVALID_SCENE_INPUT') => {
    if (!plain(object)) invalid();
    const result = Reflect.ownKeys(object);
    if (result.length > maximum) throw new Error(overflow);
    if (result.some(key => typeof key !== 'string')) invalid();
    return result;
  };
  const rows = (array, maximum) => {
    if (isProxy(array) || !Array.isArray(array) || array.length > maximum) invalid();
    return Array.from({ length: array.length }, (_, index) => {
      const descriptor = Object.getOwnPropertyDescriptor(array, String(index));
      if (!descriptor || !Object.hasOwn(descriptor, 'value')) invalid();
      return descriptor.value;
    });
  };
  try {
    if (!plain(state) || !text(ownerId, 128)) invalid();
    const pin = { exampleId: read(state, 'exampleId'), agentScenarioHash: read(state, 'agentScenarioHash'),
      agentRuntimeRevision: read(state, 'agentRuntimeRevision') };
    const world = read(state, 'agentWorld');
    if (isProxy(world)) invalid();
    if (!plain(world)) return unresolved('SOURCE_UNRESOLVED');
    pin.agentWorld = { version: read(world, 'version'), ref: read(world, 'ref'), sourceHash: read(world, 'sourceHash') };
    let revision;
    try { revision = runtimeRevisionForState(pin); } catch { return unresolved('SOURCE_UNRESOLVED'); }
    if (pin.agentWorld.version !== 1 || pin.agentWorld.ref !== 'card-prison-world@1'
      || pin.agentWorld.sourceHash !== revision.worldHash) return unresolved('SOURCE_UNRESOLVED');
    const snapshot = Object.fromEntries(['generation', 'revision', 'worldTime'].map(key => [key, read(state, key)]));
    if (Object.values(snapshot).some(value => !Number.isSafeInteger(value) || value < 0)) invalid();
    const creation = read(state, 'creation');
    const playerId = creation === undefined ? 'emma' : read(creation, 'actorId');
    const mode = creation === undefined ? undefined : read(creation, 'playerMode');
    if (creation !== undefined && (read(creation, 'scenarioId') || read(creation, 'storyArcId'))
      || read(state, 'caseOne')) return unresolved('PROCEDURE_BOUNDARY');
    // Magic's body/mind world bridge is still gated elsewhere. Do not pretend
    // actor positions constitute a complete occupied-body resolver.
    if (read(state, 'magic') !== undefined) return unresolved('IDENTITY_WORLD_UNSUPPORTED');
    const guard = read(state, 'guardReaction');
    if (guard !== undefined && (read(guard, 'detention') || read(guard, 'pending'))) return unresolved('GUARD_BOUNDARY');
    const runtime = read(state, 'caseRuntime');
    if (!plain(runtime) || read(runtime, 'version') !== 1 || read(runtime, 'rulesRef') !== CASE_RUNTIME_RULES_REF) return unresolved('SOURCE_UNRESOLVED');
    const procedure = read(runtime, 'procedure');
    if (procedure && !['daily', 'aftermath'].includes(read(procedure, 'stage'))) return unresolved('PROCEDURE_BOUNDARY');
    const roster = revision.actors.filter(row => row.id !== 'warden').map(row => ({ id: row.id, locationId: row.locationId }));
    if (mode === 'custom' && playerId === 'player') roster.push({ id: 'player' });
    if (roster.length > 16) return unresolved('SCENE_ROSTER_OVERFLOW');
    const ids = new Set(roster.map(row => row.id));
    if (ids.size !== roster.length || !ids.has(playerId) || !ids.has(ownerId)) return unresolved('OWNER_INACTIVE');
    const positions = read(state, 'agentPositions') ?? {};
    const positionKeys = keys(positions, 16, 'SCENE_ROSTER_OVERFLOW');
    if (positionKeys.some(id => !ids.has(id))) return unresolved('UNPROVEN_PLACEMENT');
    const conditions = read(runtime, 'conditionsByActor');
    if (keys(conditions, 16, 'SCENE_ROSTER_OVERFLOW').some(id => !ids.has(id))) return unresolved('UNPROVEN_PLACEMENT');
    const executed = strings(read(runtime, 'executedIds'), 16); if (!executed) invalid();
    const incidents = rows(read(runtime, 'incidents'), LIMITS.incidents).map(row => read(row, 'victimId'));
    const conditionOf = id => {
      const condition = read(conditions, id); const status = typeof condition === 'string' ? condition
        : condition === undefined ? undefined : read(condition, 'status');
      if (![undefined, 'alive', 'incapacitated', 'dead', 'executed', 'unavailable'].includes(status)) invalid();
      return status;
    };
    const hiroStatus = read(state, 'hiroStatus');
    const alive = id => !['dead', 'executed', 'unavailable'].includes(conditionOf(id))
      && !executed.includes(id) && !incidents.includes(id) && !(id === 'hiro' && hiroStatus && hiroStatus !== 'alive');
    const location = read(state, 'location');
    if (location === 'unavailable' && ownerId === playerId || read(state, 'completed') === true) return unresolved('OWNER_INACTIVE');
    if (location === '惩罚室' || location === GUARD_DETENTION_ROOM) return unresolved('GUARD_BOUNDARY');
    const playerRoom = Object.keys(CREATED_ROOMS).find(id => CREATED_ROOMS[id] === location);
    if (location !== 'unavailable' && !playerRoom) return unresolved('UNPROVEN_CONTINUITY');
    if (occupied && !read(runtime, 'occupiedBody')) return unresolved('IDENTITY_WORLD_UNSUPPORTED');
    if (!occupied && read(runtime, 'occupiedBody')) return unresolved('IDENTITY_WORLD_UNSUPPORTED');
    const bodyOf = id => occupied ? runtimeBodyActorId(state, id) : id;
    const placement = new Map();
    for (const row of roster) {
      // Engine player location is authoritative; NPC absence from the position
      // map means its pinned initial placement, not a guessed display alias.
      const physicalId = bodyOf(row.id);
      const explicit = read(positions, physicalId);
      if (occupied && explicit === undefined) return unresolved('UNPROVEN_PLACEMENT');
      if (explicit !== undefined && explicit !== 'unavailable' && !Object.values(ROOM_CODES).includes(explicit)) return unresolved('UNPROVEN_PLACEMENT');
      const room = !occupied && row.id === playerId ? playerRoom
        : Object.keys(ROOM_CODES).find(id => ROOM_CODES[id] === (explicit ?? row.locationId));
      placement.set(row.id, explicit === 'unavailable' ? undefined : room);
    }
    const room = placement.get(ownerId);
    if (!alive(bodyOf(ownerId)) || conditionOf(bodyOf(ownerId)) === 'incapacitated') return unresolved('OWNER_INACTIVE');
    if (!room) return unresolved('UNPROVEN_CONTINUITY');
    // Closed audited set anchored in the pinned world facts and scenario room
    // declarations. Bunks share a cell; they are not a partition schema. The
    // abstract corridor exit is never treated as an expanded physical wing.
    const factId = room.startsWith('cell') || room === 'playercell' ? 'cell-surface'
      : room === 'corridor' ? 'corridor-surface' : room === 'reception' ? 'reception-surface' : undefined;
    const fact = revision.content.host.world.facts.find(row => row.id === factId && row.rooms?.includes(room));
    const code = ROOM_CODES[room];
    const declared = revision.content.host.scenario.locations.some(row => row.id === code);
    // PLAYER_CELL is the explicit authored custom-room extension in life-details.
    const customRoom = room === 'playercell' && mode === 'custom'
      && revision.content.host.world.facts.some(row => row.id === 'life-details');
    if (!fact || !declared && !customRoom) return unresolved('UNPROVEN_CONTINUITY');
    const participantActorIds = roster.filter(row => alive(bodyOf(row.id)) && placement.get(row.id) === room).map(row => row.id);
    return Object.freeze({ ...base, status: 'resolved', ownerId, roomId: room,
      identityScope: occupied ? 'explicit-occupied-body-facade' : 'unswapped-actor-bodies-only', participantActorIds: Object.freeze(participantActorIds),
      source: Object.freeze({ runtimeRevisionId: revision.id, contentFingerprint: revision.content.fingerprint,
        worldHash: revision.worldHash, scenarioHash: revision.scenarioHash, factId, locationCode: code }),
      snapshot: Object.freeze(snapshot) });
  } catch (error) {
    return unresolved(error?.message === 'SCENE_ROSTER_OVERFLOW' ? 'SCENE_ROSTER_OVERFLOW' : 'INVALID_SCENE_INPUT');
  }
}

export function runtimeLocalIds(state, room) {
  const id = roomId(room);
  return id ? roster(state).filter(actorId => actorId !== 'warden' && runtimeActive(state, actorId) && runtimeRoom(state, actorId) === id) : [];
}
const local = (state, left, right) => Boolean(runtimeRoom(state, left)) && runtimeRoom(state, left) === runtimeRoom(state, right);
function enqueue(state, ids) {
  const runtime = state.caseRuntime;
  for (const id of ids) if (id !== createdPlayerId(state) && id !== 'warden' && runtimeActive(state, id)
    && !runtime.pendingActorIds.includes(id)) runtime.pendingActorIds.push(id);
}
const nextId = (runtime, prefix) => `${prefix}-${++runtime.serial}`;
const sourceId = (state, observation, ownerId) => actorObservationId(state, observation.id, ownerId);
function retainObservations(state) {
  const runtime = state.caseRuntime;
  if (runtime.observations.length <= LIMITS.observations) return;
  const references = [...runtime.conflicts, ...runtime.plans, ...runtime.records].flatMap(row => row.sourceObservationIds || []);
  const direct = new Set(runtime.pressureLinks.map(row => row.observationId));
  const recent = new Set(runtime.observations.slice(-LIMITS.observations).map(row => row.id));
  runtime.observations = runtime.observations.filter(row => recent.has(row.id) || direct.has(row.id)
    || references.some(id => id === row.id || row.audienceIds.some(ownerId => id === sourceId(state, row, ownerId))));
}
function ownedObservation(state, ownerId, id) {
  return state.caseRuntime.observations.find(row => row.occurredAt <= time(state) && row.audienceIds.includes(ownerId)
    && (row.id === id || sourceId(state, row, ownerId) === id));
}
const ownCommunication = (state, actorId) => state.caseRuntime.observations.filter(row => row.occurredAt <= time(state) && row.audienceIds.includes(actorId)
  && ['speech', 'writing'].includes(row.delivery) && row.speakerId && row.speakerId !== actorId && row.text.trim().length >= 8
  && (runtimeRevisionForState(state).policy.conversationVersion !== 1 || row.addresseeIds?.includes(actorId)));

/** Consume only enacted, addressed observations. Narration/intentions do not
 * become secret knowledge; repeated keys cannot broaden an earlier audience. */
export function runtimeObserve(state, events, { wakeRecipients = true } = {}) {
  if (!hasCaseRuntime(state) || !Array.isArray(events) || isProxy(events)) return [];
  const runtime = state.caseRuntime; const accepted = []; const ids = new Set(roster(state));
  for (const value of events.slice(0, LIMITS.observations)) {
    const content = data(value, 'text'); const delivery = data(value, 'delivery');
    const audience = strings(data(value, 'audienceIds'), 32);
    const speakerId = data(value, 'speakerId') ?? null; const at = data(value, 'occurredAt') ?? time(state);
    if (!text(content, 4000) || !['speech', 'writing', 'reading', 'action'].includes(delivery) || !audience?.length
      || (speakerId !== null && !ids.has(speakerId)) || !Number.isFinite(at) || at < runtime.activatedAt || at > time(state)) continue;
    const key = data(value, 'observationKey');
    const id = text(key, 512) ? key : `case-observation-${digest([content, speakerId, delivery, at, audience])}`;
    if (runtime.observations.some(row => row.id === id)) continue;
    const audienceIds = audience.filter(owner => ids.has(owner));
    if (!audienceIds.length) continue;
    const row = { id, text: content, speakerId, delivery, audienceIds, occurredAt: at,
      ...(runtimeRevisionForState(state).policy.conversationVersion === 1 ? { addresseeIds: (strings(data(value, 'addresseeIds') ?? [], 4) || []).filter(owner => audienceIds.includes(owner)) } : {}),
      speakerLabels: speakerLabels(state, speakerId, audienceIds) };
    runtime.observations.push(row); accepted.push(clone(row));
    if (wakeRecipients && !row.id.startsWith('item:')) enqueue(state, audienceIds);
  }
  retainObservations(state);
  return accepted;
}
function emit(state, events, operation, content, { audienceIds, delivery = 'action', at = time(state), speakerId = operation.actorId,
  threat = false, observationScope = operation.observationScope } = {}) {
  // One operation can emit its threat now and its outcome in a later turn.
  // Persist its delivery cursor instead of restarting at each caller's local
  // events array; retries return their receipt before allocating another key.
  operation.eventSerial = (operation.eventSerial || 0) + 1;
  // Local serials can recur after restoring an earlier world. Bind delivery
  // to its recorded host action as well; no random draw or execution fence
  // participates, so detached previews and replay keep the same identity.
  const event = { text: content, speakerId, delivery,
    audienceIds: unique(audienceIds || runtimeLocalIds(state, runtimeRoom(state, operation.actorId))),
    occurredAt: at, observationKey: `case:${operation.id}:${operation.eventSerial}${observationScope ? `:${observationScope}` : ''}` };
  if (!event.audienceIds.includes(operation.actorId) && runtimeActive(state, operation.actorId)) event.audienceIds.push(operation.actorId);
  events.push(event);
  // Future boundary events are consumed by the caller once its clock reaches
  // their timestamp. Their already-addressed audiences are also retained here.
  if (at <= time(state)) runtimeObserve(state, [event]);
  else {
    state.caseRuntime.observations.push({ id: event.observationKey, text: event.text, speakerId, delivery,
      audienceIds: [...event.audienceIds], occurredAt: at, speakerLabels: speakerLabels(state, speakerId, event.audienceIds) });
    retainObservations(state);
  }
  enqueue(state, event.audienceIds);
  if (threat && state.caseRuntime.signals.length < LIMITS.signals) state.caseRuntime.signals.push({
    id: `signal:${operation.id}`, kind: 'threat', operationId: operation.id, occurredAt: at,
    audienceIds: [...event.audienceIds], interrupted: false });
  return event;
}
function addTrace(state, operation, name, description, options = {}) {
  const runtime = state.caseRuntime;
  if (runtime.traces.length >= LIMITS.traces) return null;
  const trace = { id: nextId(runtime, 'trace'), name, description, room: options.room ?? runtimeRoom(state, operation.actorId),
    occurredAt: options.at ?? operation.occurredAt, causeOperationId: operation.id, kind: options.kind || 'physical',
    ...options };
  runtime.traces.push(trace); return trace;
}
function physical(state, operation, name, description, options = {}) {
  return addTrace(state, operation, name, description, { kind: 'physical', ...options });
}
function witnessedAction(state, operation, event, observedActorIds, resourceIds) {
  if (!event || event.audienceIds.length < 2) return null;
  return addTrace(state, operation, '实际器具接触的在场见闻', `本人亲眼看到：${event.text}这份见闻不覆盖本人未在场时段，也不证明未获知的姓名或内心。`,
    { kind: 'witness', witnessIds: [...event.audienceIds], observedActorIds: unique(observedActorIds),
      resourceIds: [...resourceIds], sourceObservationId: event.observationKey, room: operation.room });
}
// Preparation explicitly brings clothing/hair into contact with the tool.
// These are inspectable comparison marks, not an invisible audit identifying
// who acted while the inspector was elsewhere.
function preparationContact(state, actorId) {
  const appearance = actorLabel(state, actorId).split(/[，。；]/u)[0].slice(0, 48);
  return `与${appearance}相符的发丝纤维及衣袖边缘的重复接触压纹`;
}
function provenanceTrail(state, plan) {
  const runtime = state.caseRuntime;
  const otherWitness = id => ![plan.ownerId, plan.targetId].includes(id) && runtimeActive(state, id);
  if (runtime.traces.some(trace => trace.kind === 'witness' && trace.observedActorIds?.includes(plan.ownerId)
    && trace.resourceIds?.some(id => desiredKit(plan).includes(id)) && trace.witnessIds?.some(otherWitness))) return true;
  if (runtime.traces.some(trace => trace.kind === 'preparation-record' && trace.authorId === plan.ownerId
    && trace.planId === plan.id && ((!runtime.objects[trace.objectId]?.holderId && runtime.objects[trace.objectId]?.room)
      || (runtime.objects[trace.objectId]?.holderId !== plan.ownerId && runtimeActive(state, runtime.objects[trace.objectId]?.holderId))))) return true;
  return plan.blueprint === 'record-pressure' && runtime.pressureLinks.some(link => link.recipientId === plan.ownerId
    && runtime.traces.some(trace => trace.id === link.traceId && trace.kind === 'record'));
}
function visibleObject(state, actorId, object) {
  if (!eligibleObject(state, object)) return false;
  if (object.holderId === runtimeBodyActorId(state, actorId)) return true;
  if (strictItems(state) && object.visibility === 'private' && object.custodyVersion === 0) return false;
  if (object.holderId) return runtimeActive(state, runtimeMindActorId(state, object.holderId)) && local(state, actorId, runtimeMindActorId(state, object.holderId));
  return Boolean(object.room) && object.room === runtimeRoom(state, actorId);
}
function deliveredObject(state, actorId, object) {
  if (!strictItems(state)) return true;
  const memory = state.caseRuntime.objectMemoryByActor[actorId]?.[object.id];
  return Boolean(memory?.delivered) && memory.custodyVersion === object.custodyVersion
    && memory.holderId === object.holderId && memory.room === object.room;
}
/** Only already delivered, currently visible facts. No host provenance/remote
 * custody or private record contents are projected into scene/model packets. */
export function runtimeObjectView(state, actorId) {
  if (!hasCaseRuntime(state) || !strictItems(state) || !runtimeActive(state, actorId)) return [];
  return Object.values(state.caseRuntime.objects).filter(object => visibleObject(state, actorId, object)
    && deliveredObject(state, actorId, object)).map(object => ({ id: object.id, name: object.name,
    placement: object.holderId === runtimeBodyActorId(state, actorId) ? '本人持有' : object.holderId ? '眼前的人携带' : '眼前可见' }));
}
/** Pure current-state snapshot for scene/model consumers; never delivers
 * discovery or turns a look into inspection, possession or historical knowledge. */
export function runtimePhysicalFacts(state, actorId) {
  if (!suppliesV2(state) || !hasCaseRuntime(state) || !runtimeActive(state, actorId)) return null;
  const room = runtimeRoom(state, actorId);
  const visible = Object.values(state.caseRuntime.objects).filter(object => visibleObject(state, actorId, object)
    && deliveredObject(state, actorId, object));
  const carrierIds = unique(visible.filter(object => object.holderId && object.holderId !== runtimeBodyActorId(state, actorId)).map(object => object.holderId));
  const locked = ['discussion', 'ballot', 'execution_ready', 'ending', 'outcome_pending'].includes(state.caseRuntime.procedure?.stage);
  const bodyId = runtimeBodyActorId(state, actorId);
  const pose = state.caseRuntime.posesByActor?.[bodyId];
  // Active magic effects are the only elevation source. This is a read-only
  // qualitative overlay; it never writes a second caseRuntime height and it
  // disappears automatically after the effect ends/suppresses or its body dies.
  const magicBodyId = state.magic && Object.values(state.magic.identity.bodies)
    .find(row => row.actorId === bodyId)?.id;
  const elevation = magicBodyId && state.magic.identity.bodies[magicBodyId]?.alive !== false
    ? projectMagicPhysicalModifiers(state.magic, magicBodyId).find(row => row.domain === 'elevation'
      && row.definitionRef === 'hanna:basic@1')?.quality : undefined;
  const facts = physicalFactSnapshot({ room, doorOpen: !locked && state.agentDoorOpen,
    pose,
    objects: [...visible.map(object => ({ id: object.id, name: object.name,
      placement: object.holderId === runtimeBodyActorId(state, actorId) ? '本人持有' : object.holderId ? '眼前的人携带' : object.placement || '眼前可见',
      ...(object.holderId && object.holderId !== runtimeBodyActorId(state, actorId) ? { carrierId: runtimeActorHandle(actorId, object.holderId) } : {}) })),
    ...displacedForceStructures(state, room)],
    carriers: carrierIds.map(id => ({ id: runtimeActorHandle(actorId, id), label: physicalHolderLabel(state, actorId, id) })) });
  return elevation ? { ...facts, pose: { ...facts.pose, elevation } } : facts;
}
/** Closed player posture actions. Only pinned authored local supports qualify.
 * Upper-bunk access is explicitly gated until a real elevation/climbing producer
 * exists. A room description is not a declaration of a usable chair or bed. */
export function runtimePoseActions(state, actorId = createdPlayerId(state)) {
  if (!suppliesV2(state) || !hasCaseRuntime(state) || !runtimeActive(state, actorId)
    || !availableStage(state) || guardDetained(state)) return [];
  if (!runtimeBodyIsIdentity(state)) return []; // Active crossed bodies need their own bunk decision; an audited identity return does not.
  const owner = actor(state, actorId); const room = runtimeRoom(state, actorId);
  const condition = state.caseRuntime.conditionsByActor?.[actorId];
  if (condition && (typeof condition !== 'object' || Object.keys(condition).some(key => key !== 'status')
    || condition.status !== 'alive')) return [];
  // Existing authored ankle restraint has no supported mobility adjudicator.
  if (actorId === 'alisa') return [];
  const revision = runtimeRevisionForState(state);
  const ground = revision.content.host.world.facts.find(row => row.access === 'surface'
    && ['cell-surface', 'corridor-surface', 'reception-surface'].includes(row.id) && row.rooms.includes(room));
  if (!ground) return [];
  const action = (posture, support, supportId, label, choices, source) => ({
    id: `pose:${digest([1, room, actorId, posture, supportId, source])}`, posture, support, supportId, label, choices,
  });
  const actions = [action('standing', 'floor', `ground:${room}`, '在当前房间的地面站立',
    ['站起来', '我站起来', '我在地面站起来', '我想站起来'], { fingerprint: revision.content.fingerprint, factId: ground.id })];
  const displaced = actorId === 'anan' && state.storyArc?.displacedAt !== undefined
    && !['aftermath', 'ending'].includes(state.storyArc.status);
  const bunk = !displaced && hasBunkSupplement(state) && usesBunkSettingV2(state) ? v2OwnerBunk(state, owner, room) : null;
  if (bunk === '下铺') {
    const supportId = `bunk:${room}:lower`;
    actions.push(action('sitting', 'bed', supportId, '在自己的下铺坐下',
      ['在自己的下铺坐下', '我在自己的下铺坐下', '我想在自己的下铺坐下休息', '坐在自己的下铺'], state.settingSupplement));
    actions.push(action('lying', 'bed', supportId, '在自己的下铺躺下',
      ['在自己的下铺躺下', '我在自己的下铺躺下', '我想在自己的下铺躺下休息', '躺在自己的下铺'], state.settingSupplement));
  }
  return actions;
}
// Exact closed literal player choice, not a free-prose posture extractor. The
// LLM must still select a typed offered action through the normal gateway.
export function validatePoseIntent(actions, intent, rawInput) {
  if (!plain(intent) || Reflect.ownKeys(intent).length !== 5
    || Reflect.ownKeys(intent).some(key => !['type', 'operation', 'subjectId', 'playerChoice', 'summary'].includes(key)
      || !Object.getOwnPropertyDescriptor(intent, key)?.enumerable
      || !Object.hasOwn(Object.getOwnPropertyDescriptor(intent, key), 'value'))
    || intent.type !== 'act' || intent.operation !== 'pose' || intent.playerChoice !== rawInput
    || !text(intent.summary, 800) || !text(rawInput, 2000)) fail();
  const choice = rawInput.trim().replace(/[。！!]$/u, '');
  const selected = actions.find(row => row.id === intent.subjectId && row.choices.includes(choice));
  if (!selected) fail();
  return selected;
}
export function runtimeSettlePose(state, actorId, intent, rawInput, key) {
  if (actorId !== createdPlayerId(state)) fail(); // NPC typed execution is named-gated, not gesture mining.
  const selected = validatePoseIntent(runtimePoseActions(state, actorId), intent, rawInput);
  if (!runtimeSetPose(state, actorId, { posture: selected.posture, support: selected.support })) fail();
  (state.caseRuntime.poseSourcesByActor ||= {})[actorId] = { version: 1, bodyId: `body:${actorId}`,
    roomId: runtimeRoom(state, actorId), supportId: selected.supportId, actionId: selected.id,
    source: selected.support === 'bed' ? clone(state.settingSupplement) : {
      contentFingerprint: runtimeRevisionForState(state).content.fingerprint, kind: 'authored-local-ground' },
    observationKey: key, occurredAt: time(state) };
  return { text: selected.posture === 'standing' ? '我在当前房间的地面站稳。'
    : selected.posture === 'sitting' ? '我在自己的下铺坐下。' : '我在自己的下铺躺下。',
    speakerId: actorId, delivery: 'action', audienceIds: runtimeLocalIds(state, runtimeRoom(state, actorId)),
    occurredAt: time(state), observationKey: key };
}

/** Settled typed posture hook, not inference from player/model prose. */
export function runtimeSetPose(state, actorId, pose) {
  if (!suppliesV2(state) || !runtimeActive(state, actorId) || !plain(pose)
    || Object.keys(pose).length !== 2 || !['standing', 'sitting', 'lying'].includes(pose.posture)
    || !['floor', 'chair', 'bed'].includes(pose.support)
    || pose.posture === 'standing' && pose.support !== 'floor'
    || pose.support === 'bed' && !['cell', 'cell01', 'cell02', 'cell04', 'cell05', 'cell06', 'cell07', 'playercell', 'infirmary'].includes(runtimeRoom(state, actorId))
    || pose.support === 'chair' && !['reception', 'court', 'infirmary'].includes(runtimeRoom(state, actorId))) return false;
  (state.caseRuntime.posesByActor ||= {})[actorId] = clone(pose); return true;
}

/** Host-only discovery at a settled scene boundary. Its event, memory and
 * cognition are published in the same transaction, never by view/polling. */
export function runtimeDiscoverObjects(state, key, { actorIds = roster(state) } = {}) {
  if (!hasCaseRuntime(state) || !strictItems(state) || !text(key, 512)) return [];
  const events = [];
  for (const actorId of unique(actorIds)) {
    if (actorId === 'warden' || !runtimeActive(state, actorId)) continue;
    for (const object of Object.values(state.caseRuntime.objects)) {
      if (!visibleObject(state, actorId, object) || deliveredObject(state, actorId, object)) continue;
      const observationKey = `item:${digest([key, actorId, object.id, object.custodyVersion, runtimeRoom(state, actorId)])}`;
      const content = object.holderId === runtimeBodyActorId(state, actorId) ? `我确认自己随身持有${object.name}。`
        : object.holderId ? `我看见${physicalHolderLabel(state, actorId, object.holderId)}携带着${object.name}。`
          : `我看见眼前放着${object.name}。`;
      rememberObject(state, actorId, object);
      events.push({ text: content, speakerId: null, speaker: '旁白', delivery: 'action', audienceIds: [actorId],
        occurredAt: time(state), observationKey });
    }
  }
  runtimeObserve(state, events, { wakeRecipients: false });
  return events;
}
function moveObject(state, object, holderId, room = null) {
  object.holderId = holderId; object.room = holderId ? null : room; object.custodyVersion++;
  if (Object.hasOwn(object, 'placement')) object.placement = holderId ? null : '眼前可见';
  // The owner only learns of failed preparation when actually checking it.
  // No remote plan status or option is changed by this host bookkeeping.
}
function rememberObject(state, actorId, object) {
  const memory = state.caseRuntime.objectMemoryByActor[actorId] ||= {};
  memory[object.id] = { holderId: object.holderId, room: object.room, at: time(state),
    ...(strictItems(state) ? { custodyVersion: object.custodyVersion, delivered: true } : {}) };
}
function receipt(state, scope, key) {
  if (!text(key, 512)) return null;
  return state.caseRuntime.receipts.find(row => row.scope === scope && row.key === key);
}
function rememberReceipt(state, scope, key, result) {
  // Empty clock/discovery scans are pure checks, not lifetime action receipts.
  // A peaceful day must not exhaust the ability to handle a later real event.
  const unchanged = scope === 'advance' ? !result.events.length && !result.interrupted
    : scope === 'discovery' && !result.length;
  if (!unchanged && text(key, 512) && state.caseRuntime.receipts.length < LIMITS.receipts) {
    state.caseRuntime.receipts.push({ scope, key, result: clone(result) });
  }
  return result;
}
function provenanceFor(state, ownerId, value, required = false) {
  if (!plain(value) || ['goalId', 'assessment', 'sourceObservationIds'].some(key => {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    return descriptor && !Object.hasOwn(descriptor, 'value');
  })) return null;
  const goalId = data(value, 'goalId'); const assessment = data(value, 'assessment');
  const sources = strings(data(value, 'sourceObservationIds') ?? []);
  // Ordinary material choices may cite authentic cognition observations that
  // predate activation (for example the actor's own recollection). The caller
  // validates those packet sources. Only conflict identification/adoption and
  // resumption require a source in this runtime's actual received-event ledger;
  // physical permissions never come from an arbitrary provenance string.
  if (!sources || (required && sources.some(id => !ownedObservation(state, ownerId, id))) || (goalId !== undefined && !text(goalId, 128))
    || (assessment !== undefined && !text(assessment, 400)) || (required && (!text(goalId, 128) || !text(assessment, 400) || !sources.length))) return null;
  return { goalId: goalId || null, sourceObservationIds: sources, assessment: assessment || '' };
}
function revise(plan, status, at, note) {
  plan.status = status; plan.revision++; plan.updatedAt = at;
  plan.revisions.push({ version: plan.revision, status, at, assessment: note.slice(0, 240) });
  if (plan.revisions.length > LIMITS.revisions) plan.revisions.shift();
  return true;
}
const ownerPlan = (state, actorId) => state.caseRuntime.plans.findLast(row => row.ownerId === actorId);
const pendingAttack = (state, planId) => state.caseRuntime.operations.find(row => row.planId === planId && row.kind === 'attack' && row.status === 'pending');
function addOption(options, id, label, kind, extra = {}) { options.push({ id, label, kind, ...extra }); }
function perceivedOptionId(state, ownerId, option, known = runtimeRecognizedActors(state, ownerId)) {
  const ids = new Set(roster(state));
  return option.id.split(':').map(part => ids.has(part) && !known.has(part) ? runtimeActorHandle(ownerId, part) : part).join(':');
}
function matchesOptionId(state, ownerId, option, optionId) {
  const actual = optionId.split(':'); const expected = option.id.split(':'); const ids = new Set(roster(state));
  // An introduction between delivery and execution does not revoke an opaque
  // capability. Resolve against current physical options, never a client map.
  return actual.length === expected.length && expected.every((part, index) => actual[index] === part
    || (part !== ownerId && ids.has(part) && actual[index] === runtimeActorHandle(ownerId, part)));
}
function canonicalAllowed(state) {
  // Taking over the planner removes her autonomous choices. Taking over the
  // target does not grant immunity: the same sourced plan and physical checks
  // apply, with the reaction left to an explicit player command.
  return createdPlayerId(state) !== 'leia' && runtimeActive(state, 'leia') && runtimeActive(state, 'noah');
}
function canonicalRemembered(state) {
  return createdPlayerId(state) !== 'leia' && runtimeActive(state, 'leia')
    && !state.caseRuntime.observedConditionsByActor.leia?.noah;
}
const canAdopt = state => state.caseRuntime.plans.filter(row => !CLOSED.has(row.status)).length === 0
  && !state.caseRuntime.operations.some(row => row.kind === 'attack' && row.status === 'pending')
  && state.caseRuntime.incidents.length < LIMITS.incidents && state.caseRuntime.plans.length < LIMITS.plans;
const desiredKit = plan => plan.blueprint === 'canonical' ? CANON_KIT : ['arrow'];
const knowsKit = (state, actorId, blueprint) => !strictItems(state)
  || desiredKit({ blueprint }).every(id => state.caseRuntime.objectMemoryByActor[actorId]?.[id]?.delivered);
const canContinuePlan = (state, actorId, plan) => !strictItems(state)
  || state.caseRuntime.legacyPlanIds?.includes(plan.id) || knowsKit(state, actorId, plan.blueprint);
function sameSources(state, actorId, left, right) {
  return left.some(a => right.some(b => ownedObservation(state, actorId, a)?.id === ownedObservation(state, actorId, b)?.id));
}

/** Pure, actor-local capabilities. Remembered plan steps stay present when an
 * unseen actor removes a tool; execution, not a menu refresh, discovers failure.
 * Host callers retain legacy IDs; model/scene callers request opaque peer IDs. */
// Explicit swap lifecycle producer. Offered capabilities select settled acts,
// never extract contact or consent from model narration or generic dialogue.
export function runtimeSwapReady(state, actorId) {
  if (!state.caseRuntime?.swapLifecycle || !runtimeActive(state, actorId)
    || !['cell', 'cell01', 'cell02', 'cell04', 'cell05', 'cell06', 'cell07', 'playercell', 'corridor', 'reception'].includes(runtimeRoom(state, actorId))
    || state.guardReaction?.pending || state.guardReaction?.detention
    || state.caseRuntime.procedure && !['daily', 'aftermath'].includes(state.caseRuntime.procedure.stage)) return false;
  const condition = state.caseRuntime.conditionsByActor?.[runtimeBodyActorId(state, actorId)];
  if (runtimeBodyActorId(state, actorId) === 'alisa') return false; // Existing authored ankle restraint has no hand/mobility adjudicator.
  return condition === undefined || plain(condition) && Object.keys(condition).length === 1 && condition.status === 'alive';
}
// A consumed offer only proves that this caster's own handshake already
// completed; it must not globally close the ordinary entry point. Keep the
// legacy no-consumed path, and release the historical block only when a host
// mirror exists and the caster is genuinely back in her own body. A current
// offered/holding relation is still excluded below.
export function runtimeSwapOptions(state, actorId) {
  const swap = state.caseRuntime?.swapLifecycle;
  if (!swap || swap.version !== 1 || !runtimeSwapReady(state, actorId)) return [];
  const current = swap.offers.findLast(row => ['offered', 'holding'].includes(row.status));
  const consumed = swap.offers.some(row => row.status === 'consumed');
  const ownBody = state.caseRuntime.occupiedBody !== undefined && actorId === 'milia'
    && runtimeBodyActorId(state, actorId) === 'milia';
  const rows = [];
  const add = (kind, offer, targetId, label) => rows.push({ id: `swap-${digest([1, kind, actorId, targetId, offer?.id || null, runtimeRoom(state, actorId)])}`,
    kind, label, ...(offer ? { offerId: offer.id } : {}), ...(targetId ? { targetId } : {}) });
  if ((!consumed || ownBody) && !current && actorId === 'milia' && createdPlayerId(state) === 'milia' && runtimeBodyActorId(state, actorId) === 'milia') {
    for (const targetId of runtimeLocalIds(state, runtimeRoom(state, actorId)).filter(id => id !== actorId && runtimeSwapReady(state, id)))
      add('swap-offer-hand', null, targetId, `向${perceivedActorLabel(state, actorId, targetId)}提出互换身体并伸手；须对方本人同意并握住才可建立互换`);
  }
  if (current && [current.sourceId, current.targetId].includes(actorId)) {
    add('swap-release-hand', current, null, '撤回本次互换并松开手');
    if (current.targetId === actorId && current.status === 'offered'
      && current.sourceBodyId === runtimeBodyActorId(state, current.sourceId)
      && current.targetBodyId === runtimeBodyActorId(state, actorId)
      && local(state, current.sourceId, actorId) && runtimeSwapReady(state, current.sourceId)
      && state.caseRuntime.observations.some(row => row.id === current.observationKey && row.audienceIds.includes(actorId))) {
      add('swap-accept-hand', current, null, '本人同意这次互换，并实际握住对方伸出的手');
      add('swap-decline', current, null, '本人拒绝这次互换，不握住对方的手');
    }
  }
  return rows;
}
export function runtimeSettleSwapStep(state, actorId, optionId, provenance, key) {
  const option = runtimeSwapOptions(state, actorId).find(row => row.id === optionId);
  if (!option || !text(key, 512)) return { accepted: false, events: [] };
  const swap = state.caseRuntime.swapLifecycle;
  if (swap.journal.some(row => row.id === key)) return { accepted: true, events: [] };
  let offer = option.offerId && swap.offers.find(row => row.id === option.offerId);
  if (option.kind === 'swap-accept-hand' && !provenance?.sourceObservationIds?.includes(actorObservationId(state, offer.observationKey, actorId)))
    return { accepted: false, events: [] };
  if (swap.journal.length >= 64 || option.kind === 'swap-offer-hand' && swap.offers.length >= 16) fail();
  if (option.kind === 'swap-offer-hand') {
    offer = { id: `offer-${digest(key)}`, sourceId: actorId, targetId: option.targetId,
      sourceBodyId: runtimeBodyActorId(state, actorId), targetBodyId: runtimeBodyActorId(state, option.targetId),
      room: runtimeRoom(state, actorId), status: 'offered', observationKey: `swap-step:${key}` };
    swap.offers.push(offer);
  } else offer.status = option.kind === 'swap-accept-hand' ? 'holding' : 'released';
  const content = option.kind === 'swap-offer-hand'
    ? '本人明确提出这次互换身体：双方心智进入对方身体，身体原有物品与能力留在身体上；互换持续到本人主动归还原关系。本人伸出手，等待对方本人决定；尚未牵手或互换。'
    : option.kind === 'swap-accept-hand' ? '本人同意刚才明确提出的这次互换，并实际握住对方伸出的手；此刻双方牵手，尚未建立互换。'
      : option.kind === 'swap-decline' ? '本人拒绝这次互换，没有握住对方的手。' : '本人撤回本次互换并松开手。';
  const observationKey = `swap-step:${key}`;
  swap.journal.push({ id: key, kind: option.kind, actorId, offerId: offer.id,
    sourceId: offer.sourceId, targetId: offer.targetId, sourceBodyId: offer.sourceBodyId, targetBodyId: offer.targetBodyId,
    room: runtimeRoom(state, actorId), at: time(state), observationKey,
    sourceObservationIds: [...(provenance?.sourceObservationIds || [])] });
  return { accepted: true, events: [{ text: content, speakerId: actorId, delivery: 'action',
    audienceIds: [offer.sourceId, offer.targetId], occurredAt: time(state), observationKey }] };
}
// A concrete item offer is an existing bounded operation, not social consent.
function liveItemOffer(state, offer) {
  return offer?.itemOfferVersion === 1 && offer.status === 'pending'
    && offer.generation === state.generation && offer.revision === state.revision
    && offer.expiresAt >= time(state) && runtimeActive(state, offer.actorId) && runtimeActive(state, offer.targetId)
    && local(state, offer.actorId, offer.targetId)
    && state.caseRuntime.objects[offer.objectId]?.holderId === offer.holderBodyId
    && state.caseRuntime.objects[offer.objectId]?.custodyVersion === offer.custodyVersion
    && runtimeBodyActorId(state, offer.actorId) === offer.holderBodyId
    && runtimeBodyActorId(state, offer.targetId) === offer.targetBodyId
    && runtimeRoom(state, offer.actorId) === offer.room;
}
export function runtimePendingItemRecipients(state) {
  if (!hasIntentRuntime(state.agentRuntimeRevision)) return [];
  return [...new Set((state.caseRuntime?.operations || []).filter(offer => liveItemOffer(state, offer)).slice(-16).map(offer => offer.targetId))];
}
export function runtimeItemOfferResult(state, offerId) {
  const offer = state.caseRuntime?.operations.find(row => row.id === offerId && row.itemOfferVersion === 1);
  if (!offer) return 'operation_unavailable';
  if (offer.status === 'completed' && offer.acceptOperationId) return 'completed';
  if (offer.reason === 'recipient_declined') return 'recipient_declined';
  return liveItemOffer(state, offer) ? 'awaiting_recipient' : 'item_unavailable';
}

export function runtimeOptions(state, actorId, options = {}) {
  return runtimeAvailableOptions(state, actorId, options).filter(option => !initialMechanismDecision(state, option.kind));
}
function runtimeAvailableOptions(state, actorId, { perceived = false } = {}) {
  if (!hasCaseRuntime(state) || actorId === 'warden' || !runtimeActive(state, actorId) || !availableStage(state)
    || actorId === createdPlayerId(state) && guardDetained(state)) return [];
  const runtime = state.caseRuntime; const options = []; const room = runtimeRoom(state, actorId);
  const peers = runtimeLocalIds(state, room).filter(id => id !== actorId);
  // Ordinary self-service actions are player-only and only while the player
  // controls their own physical body. They never write a borrowed body.
  const physicalId = runtimeBodyActorId(state, actorId);
  const identity = runtimeBodyIsIdentity(state);
  const ownCondition = physicalId && runtime.conditionsByActor?.[physicalId];
  const ownInjuries = ownCondition && Array.isArray(ownCondition.injuries) ? ownCondition.injuries : [];
  const selfService = actorId === createdPlayerId(state) && identity;
  // A self-heal affordance is only real when the approved runtime already has
  // Meruru's enabled grant. This module never initializes magic or grants one.
  const meruruHealReady = Boolean(state.magic?.grants?.some(row => row.id === 'grant:meruru:basic'
    && row.enabled === true && row.definitionRef === 'meruru:basic@1'));
  const plan = ownerPlan(state, actorId);
  // Global plan/incident capacity is checked only when an option is attempted:
  // a menu must never reveal another owner's unobserved adopted intention.
  // A report capability is personal discovery, not a global incident alert.
  const archived = new Set((runtime.procedureHistory || []).flatMap(row => row.incidentIds || [row.incidentId]));
  const procedure = runtime.procedure;
  const reporting = ['daily', 'discovery', 'investigation', 'aftermath'];
  if (procedure?.stage === 'aftermath') archived.add(procedure.incidentId);
  for (const found of runtime.discoveries.filter(row => row.actorId === actorId)) {
    if (archived.has(found.incidentId)) continue;
    if (procedure && !['aftermath', 'ending'].includes(procedure.stage)
      && (!reporting.includes(procedure.stage) || procedure.incidentId !== found.incidentId)) continue;
    addOption(options, `report:${found.incidentId}`, '通报本人发现的现场', 'report', { incidentId: found.incidentId });
  }
  // All reasonable responses remain available. None claims anyone agreed.
  if (plan && !CLOSED.has(plan.status)) {
    addOption(options, `plan:${plan.id}:help`, '就本人面临的冲突向眼前的人求助', 'help', { planId: plan.id });
    addOption(options, `plan:${plan.id}:negotiate`, '尝试协商，不执行伤害步骤', 'negotiate', { planId: plan.id });
    addOption(options, `plan:${plan.id}:avoid`, '回避冲突并尝试退出当前房间', 'avoid', { planId: plan.id });
    addOption(options, `plan:${plan.id}:abandon`, '明确放弃本人这项计划', 'abandon', { planId: plan.id });
    if (['blocked', 'suspended'].includes(plan.status)) addOption(options, `plan:${plan.id}:resume`,
      '明确重审并恢复同一目标的计划', 'resume', { planId: plan.id });
    if (['adopted', 'preparing'].includes(plan.status) && !pendingAttack(state, plan.id) && canContinuePlan(state, actorId, plan)) {
      addOption(options, `plan:${plan.id}:prepare`, plan.blueprint === 'canonical'
        ? '核对手中刺剑、扫帚柄、弩箭与发带并准备组合器具' : '核对手中弩箭并完成本人的器具准备', 'prepare', { planId: plan.id });
      if (plan.preparation?.kit) {
        if (plan.blueprint === 'canonical') addOption(options, `plan:${plan.id}:fix-gaze`,
          '当面对既定对象施加短时视线固定', 'fix-gaze', { planId: plan.id });
        if (plan.blueprint !== 'canonical' || plan.preparation.gaze) addOption(options, `plan:${plan.id}:attack`,
          '明确举起已准备器具，开始对既定对象的攻击（有反应窗口）', 'attack', { planId: plan.id });
      }
    }
  }
  if (actorId !== createdPlayerId(state) && !plan) {
    if (actorId === 'leia' && canonicalRemembered(state)) {
      const conflict = runtime.conflicts.findLast(row => row.ownerId === actorId && row.blueprint === 'canonical');
      if (!conflict) {
        const received = ownCommunication(state, actorId).filter(row => row.speakerId === 'noah').at(-1);
        if (received) addOption(options, `identify:canonical:${received.id}`, `将亲自收到的这次沟通明确识别为与${perceivedActorLabel(state, actorId, 'noah')}的冲突`,
          'identify', { blueprint: 'canonical', targetId: 'noah', sourceObservationIds: [sourceId(state, received, actorId)] });
      } else if (!conflict.closed && knowsKit(state, actorId, 'canonical')) addOption(options, `adopt:${conflict.id}`, '自主采用针对既定冲突的器具计划；仍可求助、协商或放弃',
        'adopt', { conflictId: conflict.id, blueprint: 'canonical', targetId: 'noah', sourceObservationIds: [...conflict.sourceObservationIds] });
    }
    for (const pressure of runtime.pressureLinks.filter(row => row.recipientId === actorId)) {
      const observed = ownedObservation(state, actorId, pressure.observationId);
      if (!observed) continue;
      const conflict = runtime.conflicts.find(row => row.pressureId === pressure.id && row.ownerId === actorId);
      if (!conflict) addOption(options, `identify:record:${pressure.id}`, '将本人实际收到的记录公开威胁识别为当前冲突',
        'identify', { blueprint: 'record-pressure', targetId: pressure.speakerId, pressureId: pressure.id,
          sourceObservationIds: [sourceId(state, observed, actorId)] });
      else if (!conflict.closed && knowsKit(state, actorId, 'record-pressure')) addOption(options, `adopt:${conflict.id}`, '自主采用针对这位施压者的有限器具计划；不替换对象',
        'adopt', { conflictId: conflict.id, blueprint: 'record-pressure', targetId: pressure.speakerId,
          sourceObservationIds: [...conflict.sourceObservationIds] });
    }
    if (state.rootCaseOptionsVersion === 1) {
      const latest = new Map();
      for (const received of ownCommunication(state, actorId)) {
        if (!local(state, actorId, received.speakerId) || !runtimeActive(state, received.speakerId)) continue;
        latest.set(received.speakerId, received);
      }
      for (const [speakerId, received] of latest) {
        const conflict = runtime.conflicts.findLast(row => row.ownerId === actorId
          && row.blueprint === 'verbal-conflict@1' && row.targetId === speakerId);
        const source = sourceId(state, received, actorId);
        if (!conflict) addOption(options, `identify:verbal@1:${source}`,
          `把亲自收到的这次沟通视为与${perceivedActorLabel(state, actorId, speakerId)}的冲突（本人判断，不宣称对方威胁）`,
          'identify', { blueprint: 'verbal-conflict@1', sourceVersion: 1, targetId: speakerId, sourceObservationIds: [source] });
        else if (!conflict.closed && knowsKit(state, actorId, conflict.blueprint)) addOption(options, `adopt:${conflict.id}`,
          '自主采用针对这位说话者的有限器具计划；不替换对象，仍可求助、协商或放弃',
          'adopt', { conflictId: conflict.id, blueprint: conflict.blueprint, sourceVersion: conflict.sourceVersion,
            targetId: speakerId, sourceObservationIds: [...conflict.sourceObservationIds] });
      }
    }
  }
  const conflicts = runtime.conflicts.filter(row => row.ownerId === actorId && !row.closed && !plan);
  if (conflicts.length) for (const kind of ['help', 'negotiate', 'avoid', 'abandon']) addOption(options,
    `conflict:${conflicts.at(-1).id}:${kind}`, { help: '向眼前的人求助', negotiate: '尝试和平协商', avoid: '尝试离开眼前冲突', abandon: '放弃将冲突付诸器具计划' }[kind], kind,
    { conflictId: conflicts.at(-1).id });
  // These are explicit protective acts, never an automatic shield or dodge.
  for (const attack of runtime.operations.filter(row => row.kind === 'attack' && row.status === 'pending')) {
    if (attack.actorId === actorId || !local(state, actorId, attack.actorId) || !local(state, actorId, attack.targetId)) continue;
    addOption(options, `protect:${attack.id}`, '主动制止眼前已经举起的攻击器具', 'protect', { attackId: attack.id });
    addOption(options, `dodge:${attack.id}`, '主动避开眼前攻击并尝试退出房间', 'dodge', { attackId: attack.id });
  }
  const observations = ownCommunication(state, actorId);
  const writable = Object.values(runtime.objects).find(row => row.id === 'paper' && row.holderId === actorId && !row.recordId
    && eligibleObject(state, row) && deliveredObject(state, actorId, row));
  if (writable && plan?.preparation?.kit && !CLOSED.has(plan.status)) addOption(options, `record-preparation:${plan.id}`,
    '自愿署名记录本人已经完成的器具准备（纸张仍须明确放置或转交）', 'record-preparation', { objectId: writable.id, planId: plan.id });
  if (writable && observations.length && runtime.records.length < LIMITS.records) addOption(options, `record:${writable.id}`,
    '自愿把本人实际收到的一次沟通写为敏感记录', 'record', { objectId: writable.id,
      sourceObservationIds: [sourceId(state, observations.at(-1), actorId)] });
  // Contextual actions precede bulk inventory transfers: the parent projects
  // at most 32 capabilities into an individual decision packet.
  if (hasIntentRuntime(state.agentRuntimeRevision)) for (const offer of runtime.operations.filter(row => liveItemOffer(state, row) && row.targetId === actorId).slice(-16)) {
    const observation = ownedObservation(state, actorId, offer.offerObservationKey);
    if (!observation) continue;
    const extra = { offerId: offer.id, objectId: offer.objectId, targetId: offer.actorId,
      sourceObservationIds: [sourceId(state, observation, actorId)] };
    addOption(options, `accept-item:${offer.id}:${offer.custodyVersion}`, `接过对方本次递出的${runtime.objects[offer.objectId].name}`, 'accept-item', extra);
    addOption(options, `decline-item:${offer.id}:${offer.custodyVersion}`, `拒收对方本次递出的${runtime.objects[offer.objectId].name}`, 'decline-item', extra);
  }
  for (const object of Object.values(runtime.objects)) {
    if (object.holderId !== runtimeBodyActorId(state, actorId) || !object.recordId || !eligibleObject(state, object) || !deliveredObject(state, actorId, object)) continue;
    const record = runtime.records.find(row => row.id === object.recordId);
    if (record.authorId !== actorId && peers.includes(record.authorId) && runtimeKnownEvidence(state, actorId).some(row => row.id === record.traceId)
      && !runtime.pressureLinks.some(row => row.recordId === record.id && row.speakerId === actorId)) {
      addOption(options, `pressure:${record.id}:${record.authorId}`, '明确以手中真实记录威胁向作者施压（不会自动答应）',
        'pressure', { recordId: record.id, targetId: record.authorId });
    }
  }
  for (const object of Object.values(runtime.objects)) {
    if (!visibleObject(state, actorId, object) || !deliveredObject(state, actorId, object)) continue;
    if (suppliesV2(state)) addOption(options, `inspect-object:${object.id}`, `检查眼前${object.name}的当前外观`, 'inspect-object', { objectId: object.id });
    if (suppliesV2(state)) addOption(options, `inspect-object-evidence:${object.id}`,
      `检查眼前${object.name}的当前外观并留存本人现场记录`, 'inspect-object-evidence', { objectId: object.id });
    if (object.holderId === runtimeBodyActorId(state, actorId)) {
      const recordAuthor = object.recordId && runtime.records.find(row => row.id === object.recordId)?.authorId;
      const returnId = recordAuthor || object.originalHolderId;
      addOption(options, `drop:${object.id}`, `将手中${object.name}放在眼前`, 'drop', { objectId: object.id });
      if (selfService && object.id === 'arrow' && ownInjuries.length === 0) addOption(options,
        `self-prick:${object.id}`, `用手中${object.name}的尖端轻刺自己的指尖（会造成一处真实小伤）`, 'self-prick', { objectId: object.id });
      if (suppliesV2(state) && object.id === 'paper') addOption(options, `destroy:${object.id}`,
        '将手中纸张撕碎并揉烂，使内容无法再阅读', 'destroy', { objectId: object.id });
      if (returnId && returnId !== actorId && peers.includes(returnId)) addOption(options,
        `return:${object.id}`, `把手中${object.name}归还眼前的原持有人`, 'return', { objectId: object.id, targetId: returnId });
      for (const targetId of peers.slice(0, 14)) addOption(options, `give:${object.id}:${targetId}`,
        `将手中${object.name}${object.recordId ? '作为记录转交' : '交给'}眼前的${actorLabel(state, targetId)}`, object.recordId ? 'transfer-record' : 'give',
        { objectId: object.id, targetId });
    } else if (!object.holderId) addOption(options, `take:${object.id}`, `拿取眼前的${object.name}`, 'take', { objectId: object.id });
    else if (object.id === 'ribbon' && actorId === 'leia') addOption(options, `request:${object.id}:${object.holderId}`,
      '向眼前的发带持有人提出借用请求（不代表获准）', 'request', { objectId: object.id, targetId: object.holderId });
    else if (runtime.operations.some(row => row.kind === 'attack' && row.status === 'pending' && row.actorId === object.holderId
      && row.resourceIds.includes(object.id))) addOption(options, `take:${object.id}`, `主动夺下眼前攻击者已举起的${object.name}`, 'take', { objectId: object.id });
  }
  if (selfService && actorId === 'meruru' && meruruHealReady) for (const injury of ownInjuries.slice(0, 4)) {
    if (injury?.kind !== 'puncture' || typeof injury.id !== 'string') continue;
    addOption(options, `self-heal:${injury.id}`, '用另一只手实际覆住这处小伤，施放治愈·再生', 'self-heal',
      { injuryId: injury.id });
  }
  // A body-strengthened actor may push one authored structure present in this
  // room or, for the guesthouse, its authored outside sight scope. This is a
  // real shared-world parent placement mutation, not a claim that the strength
  // effect controls any other mind, pose, support or room.
  for (const target of magicForceWorldView(state, actorId, room)) {
    if (target.displacedAt !== undefined) continue;
    addOption(options, `force-structure:${target.id}`, `用强化后的身体推动眼前的${target.name}`,
      'force-structure', { structureId: target.id });
  }
  // Ordinary physical inspection of the already-activated parent building is
  // independent of any strength effect. The option carries only the host's
  // current authored identity/placement; the operation below records a current
  // observation, never a pusher, old position or crime clue.
  for (const target of inspectableForceStructures(state, room)) {
    addOption(options, `inspect-structure:${target.id}`, `检查眼前${target.name}的当前外观与位置`,
      'inspect-structure', { structureId: target.id });
  }
  const delivered = [...runtimeSwapOptions(state, actorId), ...(runtimeBodyIsIdentity(state) ? options : options.filter(row =>
    ['inspect-object', 'inspect-structure', 'take', 'drop', 'give'].includes(row.kind) && !runtime.objects[row.objectId]?.recordId))].slice(0, 128);
  if (!perceived) return clone(delivered);
  const known = runtimeRecognizedActors(state, actorId);
  return clone(delivered.map(option => ({ ...option, id: perceivedOptionId(state, actorId, option, known),
    ...(option.targetId && !known.has(option.targetId) ? { targetId: runtimeActorHandle(actorId, option.targetId) } : {}) })));
}

function cancelled(state, plan, operation, events, reason, at = time(state), observationScope) {
  operation.status = 'blocked'; operation.completedAt = at; operation.reason = reason;
  if (plan) revise(plan, 'blocked', at, reason);
  emit(state, events, operation, `本人核对这一步时发现条件不再成立：${reason}这一步未造成伤害。`,
    { audienceIds: [operation.actorId], delivery: 'reading', at, observationScope });
}
function kitValid(state, plan, requirePrepared = true) {
  const runtime = state.caseRuntime;
  const required = desiredKit(plan);
  if (!required.every(id => runtime.objects[id]?.holderId === plan.ownerId && eligibleObject(state, runtime.objects[id]))) return false;
  if (!requirePrepared) return true;
  return Boolean(plan.preparation?.kit) && required.every(id => plan.preparation.kit[id] === runtime.objects[id].custodyVersion)
    && plan.preparation.room === runtimeRoom(state, plan.ownerId);
}
function attackValid(state, plan, operation) {
  return runtimeActive(state, plan.ownerId) && runtimeActive(state, plan.targetId) && availableStage(state)
    && ['adopted', 'preparing'].includes(plan.status) && local(state, plan.ownerId, plan.targetId)
    && runtimeRoom(state, plan.ownerId) === operation.room && kitValid(state, plan)
    && (suppliesV2(state) ? Boolean(plan.fairCandidate?.preparedAt <= operation.occurredAt)
      : operation.status === 'pending' ? operation.trailVerified : provenanceTrail(state, plan))
    && (plan.blueprint !== 'canonical' || (canonicalAllowed(state) && plan.ownerId === 'leia' && plan.targetId === 'noah'
      && plan.preparation.gaze?.targetId === plan.targetId && !plan.preparation.gaze.broken
      && plan.preparation.gaze.room === operation.room && plan.preparation.gaze.until >= operation.dueAt));
}
function cancelPlanWork(state, plan, at, reason) {
  for (const pending of state.caseRuntime.operations.filter(row => row.planId === plan.id && row.status === 'pending')) {
    pending.status = 'cancelled'; pending.completedAt = at; pending.reason = reason;
  }
}
function markCondition(state, actorId, observerIds, status, at) {
  for (const observerId of observerIds) {
    const seen = state.caseRuntime.observedConditionsByActor[observerId] ||= {};
    seen[actorId] = { status, at };
  }
}
function peaceful(state, actorId, option, operation, events) {
  const runtime = state.caseRuntime; const plan = option.planId && runtime.plans.find(row => row.id === option.planId && row.ownerId === actorId);
  const conflict = option.conflictId && runtime.conflicts.find(row => row.id === option.conflictId && row.ownerId === actorId);
  const targetId = plan?.targetId || conflict?.targetId;
  const kind = option.kind;
  if (plan) {
    cancelPlanWork(state, plan, operation.occurredAt, kind);
    revise(plan, kind === 'abandon' ? 'abandoned' : 'suspended', operation.occurredAt, `本人明确选择${kind}，不继续伤害准备。`);
  }
  if (conflict && kind === 'abandon') conflict.closed = true;
  if (kind === 'avoid') {
    const from = runtimeRoom(state, actorId); const to = from === 'corridor' ? 'reception' : 'corridor';
    if (from !== 'court' && prisonPassage(state, { actorId, from: CODES[from], to: CODES[to], home: actor(state, actorId).locationId })) {
      const audienceIds = unique([...runtimeLocalIds(state, from), ...runtimeLocalIds(state, to), actorId]);
      runtimeSetRoom(state, actorId, to);
      emit(state, events, operation, `${actorLabel(state, actorId)}主动退出冲突，沿通路走向${ROOMS[to]}。`, { audienceIds });
    } else emit(state, events, operation, '本人尝试退出眼前冲突；通路尚未开放，脚步停在门前。', { audienceIds: [actorId], delivery: 'reading' });
  } else if (kind === 'help') {
    const peers = runtimeLocalIds(state, runtimeRoom(state, actorId)).filter(id => id !== actorId);
    emit(state, events, operation, peers.length ? `${actorLabel(state, actorId)}向眼前的人明确求助，希望有人帮助处理这次冲突。没有人因此自动承诺。`
      : '本人尝试求助，但此刻身旁没有可以收到请求的人。', { audienceIds: [actorId, ...peers], delivery: peers.length ? 'speech' : 'reading' });
  } else if (kind === 'negotiate') emit(state, events, operation, targetId && local(state, actorId, targetId)
    ? `${actorLabel(state, actorId)}当面提出停止冲突、继续协商；这不代表对方已经接受。`
    : '本人决定先协商，但既定对象此刻不在眼前，尚未送达请求。', {
    audienceIds: targetId && local(state, actorId, targetId) ? runtimeLocalIds(state, runtimeRoom(state, actorId)) : [actorId],
    delivery: targetId && local(state, actorId, targetId) ? 'speech' : 'reading' });
  else emit(state, events, operation, '本人明确放弃这项器具计划；没有替换对象，也没有继续准备伤害。', { audienceIds: [actorId], delivery: 'reading' });
}

/** Enact exactly one delivered capability. The caller owns revision/history and
 * the shared clock; this function never advances it or calls a model. */
export function runtimeOperation(state, actorId, optionId, provenance = {}, key, options = {}) {
  const reject = reason => ({ accepted: false, reason, events: [] });
  if (!hasCaseRuntime(state) || typeof actorId !== 'string' || typeof optionId !== 'string') return reject('invalid');
  const scope = `operation:${actorId}`; const previous = receipt(state, scope, key);
  if (previous) return clone(previous.result);
  // A pinned object-inspection completion may land exactly on the investigation
  // deadline, after the shared clock already ticked assembly. Only that exact
  // host-captured boundary is allowed past the ordinary stage menu; the normal
  // menu/runtime path still rejects assembly.
  const completion = data(options, 'objectInspectionCompletion');
  const startedAt = data(completion, 'startedAt'); const completesAt = data(completion, 'completesAt');
  const completionObjectId = data(completion, 'objectId');
  const cutoffCompletion = plain(completion) && Number.isSafeInteger(startedAt) && Number.isSafeInteger(completesAt)
    && startedAt + 120 === completesAt && completesAt === state.worldTime
    && !state.completed && state.caseOutcome?.status !== 'pending' && state.itemPolicyVersion === 2
    && actorId !== 'warden' && !(actorId === createdPlayerId(state) && guardDetained(state))
    && state.caseRuntime.procedure?.stage === 'assembly'
    && state.caseRuntime.procedure.investigationDeadline === state.worldTime
    && typeof completionObjectId === 'string' && optionId === `inspect-object-evidence:${completionObjectId}`;
  if (!runtimeActive(state, actorId) || (!availableStage(state) && !cutoffCompletion)) return reject('inactive');
  const runtime = state.caseRuntime;
  // Resolve only against this owner's current host capabilities. Do not retain
  // a mutable map in projections or accept another owner's opaque token.
  const option = cutoffCompletion ? { id: optionId, kind: 'inspect-object-evidence', objectId: completionObjectId }
    : runtimeAvailableOptions(state, actorId).find(row => row.id === optionId || matchesOptionId(state, actorId, row, optionId));
  if (option) { const policyReason = initialMechanismDecision(state, option.kind); if (policyReason) return reject(policyReason); }
  if (!option || option.kind === 'report') return reject('unavailable');
  const safeExit = ['help', 'negotiate', 'avoid', 'abandon', 'protect', 'dodge'].includes(option.kind);
  if ((runtime.operations.length >= LIMITS.operations - 16 || runtime.receipts.length >= LIMITS.receipts - 16
    || runtime.traces.length > LIMITS.traces - 6) && !safeExit) return reject('bounded');
  if (runtime.operations.length >= LIMITS.operations || runtime.receipts.length >= LIMITS.receipts) return reject('bounded');
  const provenanceValue = provenanceFor(state, actorId, provenance, ['identify', 'adopt', 'resume'].includes(option.kind));
  if (!provenanceValue) return reject('provenance');
  if (option.sourceObservationIds?.length && ['identify', 'adopt', 'record'].includes(option.kind)
    && provenanceValue.sourceObservationIds.length && !sameSources(state, actorId, option.sourceObservationIds, provenanceValue.sourceObservationIds)) return reject('provenance');
  if (option.kind === 'resume') {
    const other = runtime.plans.find(row => row.id !== option.planId && !CLOSED.has(row.status));
    if (other) return reject('unavailable');
  }
  const operation = { id: nextId(runtime, 'case-operation'), actorId, optionId: option.id, kind: option.kind, occurredAt: time(state),
    ...(text(key, 512) ? { observationScope: digest(key) } : {}),
    room: runtimeRoom(state, actorId), status: 'completed', provenance: provenanceValue,
    ...(option.planId ? { planId: option.planId } : {}) };
  runtime.operations.push(operation);
  const events = []; let accepted = true; let reason = null;
  const plan = option.planId && runtime.plans.find(row => row.id === option.planId && row.ownerId === actorId);
  const block = message => { accepted = false; reason = 'blocked'; cancelled(state, plan, operation, events, message); };
  if (['help', 'negotiate', 'avoid', 'abandon'].includes(option.kind)) peaceful(state, actorId, option, operation, events);
  else if (option.kind === 'inspect-object') {
    const object = runtime.objects[option.objectId];
    if (!object || !visibleObject(state, actorId, object) || !deliveredObject(state, actorId, object)) block('眼前无法检查这项物品。');
    else emit(state, events, operation, physicalObjectInspection(object, object.holderId === runtimeBodyActorId(state, actorId) ? '本人持有'
      : object.holderId ? '由眼前的人携带' : object.placement || '放在眼前'), { audienceIds: [actorId], delivery: 'reading' });
  } else if (option.kind === 'inspect-object-evidence') {
    const object = runtime.objects[option.objectId];
    if (!object || !visibleObject(state, actorId, object) || !deliveredObject(state, actorId, object)) block('眼前无法检查这项物品。');
    else {
      const trace = physical(state, operation, `${object.name}的当前外观与位置`,
        `眼前的${object.name}，${object.holderId === runtimeBodyActorId(state, actorId) ? '本人持有'
          : object.holderId ? '由眼前的人携带' : object.placement || '放在眼前'}。本人只核对当前外观与位置；这次检查不说明此前是谁使用、携带或放下，也没有自动拿取。`,
        { objectId: object.id });
      if (!trace) block('现场记录已满，这次检查没有完成。');
      else { operation.objectId = object.id; acquireTrace(state, actorId, trace, operation, events); }
    }
  } else if (option.kind === 'identify') {
    const sources = option.sourceObservationIds;
    const conflict = { id: nextId(runtime, 'conflict'), ownerId: actorId, targetId: option.targetId,
      blueprint: option.blueprint, ...(option.sourceVersion === 1 ? { sourceVersion: 1 } : {}),
      sourceObservationIds: [...sources], goalId: provenanceValue.goalId,
      assessment: provenanceValue.assessment, identifiedAt: time(state), closed: false,
      ...(option.pressureId ? { pressureId: option.pressureId } : {}) };
    runtime.conflicts.push(conflict);
    emit(state, events, operation, `本人把亲自收到的这次沟通识别为需要处理的冲突。这是本人当前判断，不证明对方内心或未见往事。`,
      { audienceIds: [actorId], delivery: 'reading' });
  } else if (option.kind === 'adopt') {
    const conflict = runtime.conflicts.find(row => row.id === option.conflictId && row.ownerId === actorId && !row.closed);
    if (actorId === createdPlayerId(state) || !conflict || !canAdopt(state) || !runtimeActive(state, conflict.targetId)
      || !sameSources(state, actorId, conflict.sourceObservationIds, provenanceValue.sourceObservationIds)
      || (conflict.blueprint === 'canonical' && (!canonicalAllowed(state) || actorId !== 'leia' || conflict.targetId !== 'noah'))) block('这一步目前不能完成；没有取得新的物品或造成伤害。');
    else {
      const adopted = { id: nextId(runtime, 'case-plan'), ownerId: actorId, actorId, targetId: conflict.targetId,
        blueprint: conflict.blueprint, ...(conflict.sourceVersion === 1 ? { sourceVersion: 1 } : {}),
        conflictId: conflict.id, status: 'adopted', revision: 1,
        goalId: provenanceValue.goalId, sourceObservationIds: [...provenanceValue.sourceObservationIds],
        assessment: provenanceValue.assessment, adoptedAt: time(state), updatedAt: time(state),
        preparation: { kit: null, room: null, gaze: null }, revisions: [{ version: 1, status: 'adopted', at: time(state), assessment: provenanceValue.assessment }] };
      runtime.plans.push(adopted); operation.planId = adopted.id;
      emit(state, events, operation, '本人自主采用这项有限器具计划。尚未取得他人物品、完成准备或造成伤害；仍可求助、协商、回避与放弃。',
        { audienceIds: [actorId], delivery: 'reading' });
    }
  } else if (option.kind === 'resume') {
    if (!sameSources(state, actorId, plan.sourceObservationIds, provenanceValue.sourceObservationIds)) block('本人重审所需的原有来源不成立。');
    else {
      revise(plan, 'adopted', time(state), provenanceValue.assessment); plan.preparation = { kit: null, room: null, gaze: null };
      emit(state, events, operation, '本人明确恢复同一对象的计划；旧准备须重新核验，没有另定对象。', { audienceIds: [actorId], delivery: 'reading' });
    }
  } else if (option.kind === 'destroy') {
    const object = runtime.objects[option.objectId];
    if (!suppliesV2(state) || object?.id !== 'paper' || object.holderId !== runtimeBodyActorId(state, actorId) || !eligibleObject(state, object)) block('本人手中没有可撕毁的纸张。');
    else {
      moveObject(state, object, null, operation.room); object.destroyedAt = time(state);
      object.destroyedByOperationId = operation.id;
      const record = runtime.records.find(row => row.objectId === object.id);
      if (record) {
        const trace = runtime.traces.find(row => row.id === record.traceId);
        if (trace) trace.destroyedAt = time(state);
      }
      physical(state, operation, '无法阅读的碎纸', '眼前的纸张已被撕碎揉烂，内容无法辨认；这不撤销此前本人实际读到的文字。', { objectId: object.id });
      emit(state, events, operation, `${actorLabel(state, actorId)}把手中纸张撕碎揉烂，纸面文字已无法再阅读。`);
    }
  } else if (option.kind === 'self-prick') {
    const object = runtime.objects[option.objectId];
    const physicalId = runtimeBodyActorId(state, actorId);
    const condition = runtime.conditionsByActor?.[physicalId];
    const injuries = condition && Array.isArray(condition.injuries) ? condition.injuries : [];
    if (actorId !== createdPlayerId(state) || !runtimeBodyIsIdentity(state) || object?.id !== 'arrow'
      || object.holderId !== physicalId || !visibleObject(state, actorId, object) || !deliveredObject(state, actorId, object)
      || injuries.length) block('本人手中没有这枚实际弩箭，或这具身体已经有伤。');
    else {
      const trace = addTrace(state, operation, '弩箭尖端造成的指尖轻刺伤',
        '本人手中的弩箭尖端实际刺破了自己的指尖皮肤，留下一处少量出血的小刺伤；这不是他人攻击，也没有数值化伤害。',
        { kind: 'injury', victimId: physicalId, objectId: object.id, sourceObjectId: object.id,
          resourceIds: [object.id], room: operation.room, at: time(state) });
      if (!trace) block('现场记录已满，轻刺没有完成。');
      else {
        const injury = { id: `injury:${operation.id}:puncture`, kind: 'puncture', sourceObjectId: object.id,
          sourceTraceId: trace.id, sourceOperationId: operation.id };
        runtime.conditionsByActor[physicalId] = { ...(condition && typeof condition === 'object' ? condition : {}),
          status: condition?.status || 'alive', injuries: [...injuries, injury], injuredAt: time(state) };
        const witnesses = options.npcMedicalContactVersion === 1
          ? actorsForState(state).map(actor => actor.id).filter(id => id !== actorId && id !== 'warden'
            && runtimeActive(state, id) && runtimeRoom(state, id) === operation.room) : [];
        emit(state, events, operation,
          `${actorLabel(state, actorId)}用手中${object.name}的尖端实际刺破自己的指尖，指尖留下一处会少量出血的小刺伤。`,
          { audienceIds: [actorId, ...witnesses], delivery: 'action' });
      }
    }
  } else if (option.kind === 'self-heal') block('自体触伤施法必须由普通场景动作完成；这里没有执行第二次魔法。');
  else if (option.kind === 'inspect-structure') {
    const target = inspectableForceStructures(state, operation.room)
      .find(row => row.id === option.structureId);
    if (!target) block('眼前没有本人此刻能核对当前外观与位置的已激活建筑。');
    else {
      const trace = physical(state, operation, `${target.name}的当前外观与位置`,
        `眼前的${target.name}，当前的位置：${target.placement}。本人只核对当前外观与位置；这次检查不说明此前如何移动或由谁移动，也没有取得物品、伤痕或其他犯罪线索。`,
        { structureId: target.id });
      if (!trace) block('现场记录已满，这次检查没有完成。');
      else { operation.structureId = target.id; acquireTrace(state, actorId, trace, operation, events); }
    }
  } else if (option.kind === 'force-structure') {
    const pushed = applySharedForceDisplacement(state, actorId, option.structureId,
      { room: operation.room, actorRoom: runtimeRoom(state, actorId), at: time(state) });
    if (!pushed.accepted) block('这项结构此刻不在本人可触及的范围，或强化后的身体条件已经改变。');
    else {
      operation.structureId = pushed.structure.id;
      emit(state, events, operation,
        `${actorLabel(state, actorId)}用强化后的身体把${pushed.structure.name}从${pushed.previousPlacement}推到${pushed.structure.placement}。`);
    }
  } else if (hasIntentRuntime(state.agentRuntimeRevision) && ['accept-item', 'decline-item'].includes(option.kind)) {
    const offer = runtime.operations.find(row => row.id === option.offerId);
    const object = offer && runtime.objects[offer.objectId];
    if (!liveItemOffer(state, offer) || offer.targetId !== actorId
      || actorId !== createdPlayerId(state) && !sameSources(state, actorId, option.sourceObservationIds, provenanceValue.sourceObservationIds)) block('本次递物来源或当前持有条件不成立。');
    else if (option.kind === 'decline-item') {
      offer.status = 'cancelled'; offer.reason = 'recipient_declined'; offer.completedAt = time(state);
      emit(state, events, operation, `${actorLabel(state, actorId)}没有接过本次递出的${object.name}；物件仍由原持有人拿着。`, { audienceIds: [offer.actorId, actorId] });
    } else {
      moveObject(state, object, runtimeBodyActorId(state, actorId), operation.room);
      rememberObject(state, offer.actorId, object); rememberObject(state, actorId, object);
      physical(state, operation, `${object.name}的转交痕迹`, `这里留下${object.name}刚被实际交接的接触与位置变化，痕迹本身不能断定交接者姓名。`, { objectId: object.id });
      const enacted = emit(state, events, operation, `${actorLabel(state, actorId)}本人接过对方本次递出的${object.name}。`);
      witnessedAction(state, operation, enacted, [offer.actorId, actorId], [object.id]);
      if (object.recordId) runtime.records.find(row => row.id === object.recordId).transfers.push({ operationId: operation.id,
        fromId: offer.actorId, toId: actorId, room: operation.room, at: time(state) });
      offer.status = 'completed'; offer.completedAt = time(state); offer.acceptOperationId = operation.id;
    }
  } else if (['take', 'drop', 'give', 'return', 'transfer-record'].includes(option.kind)) {
    const object = runtime.objects[option.objectId];
    const targetId = option.targetId;
    if (!object || !visibleObject(state, actorId, object)) block('眼前无法接触这项物品。');
    else if (option.kind === 'take') {
      const attack = object.holderId && runtime.operations.find(row => row.kind === 'attack' && row.status === 'pending'
        && row.actorId === object.holderId && row.resourceIds.includes(object.id));
      if (object.holderId && !attack) block('这项物品并未交到本人手中。');
      else {
        const priorHolder = object.holderId;
        moveObject(state, object, runtimeBodyActorId(state, actorId)); rememberObject(state, actorId, object);
        if (attack) { attack.status = 'cancelled'; attack.completedAt = time(state); attack.reason = 'disarmed';
          const attackerPlan = runtime.plans.find(row => row.id === attack.planId); if (attackerPlan) revise(attackerPlan, 'blocked', time(state), '攻击器具被眼前实际干预夺下。'); }
        physical(state, operation, `${object.name}的接触痕迹`, `这里留下${object.name}刚被拿起的接触与位置变化，形状可与该物比较；痕迹本身不证明拿取者姓名。`, { objectId: object.id });
        const enactment = emit(state, events, operation, `${actorLabel(state, actorId)}${priorHolder ? '制止攻击并夺下' : '拿起眼前的'}${object.name}。`);
        witnessedAction(state, operation, enactment, [actorId], [object.id]);
      }
    } else if (object.holderId !== runtimeBodyActorId(state, actorId)) block('本人手中缺少这项物品。');
    else if (option.kind !== 'drop' && (!runtimeActive(state, targetId) || !local(state, actorId, targetId))) block('受交者不在本人眼前，转交没有完成。');
    else if (hasIntentRuntime(state.agentRuntimeRevision) && option.kind !== 'drop') {
      if (runtime.operations.filter(row => liveItemOffer(state, row)).length >= 16) block('当前递物提议已达上限。');
      else {
        Object.assign(operation, { itemOfferVersion: 1, objectId: object.id, targetId, targetBodyId: runtimeBodyActorId(state, targetId), holderBodyId: object.holderId,
          custodyVersion: object.custodyVersion, generation: state.generation, revision: state.revision,
          expiresAt: time(state) + 300, status: 'pending' });
        const offer = emit(state, events, operation, `${actorLabel(state, actorId)}向眼前的${actorLabel(state, targetId)}递出手中${object.name}，仍握着物件等对方选择。`, { audienceIds: [actorId, targetId] });
        operation.offerObservationKey = offer.observationKey; reason = 'awaiting_recipient';
      }
    } else {
      moveObject(state, object, option.kind === 'drop' ? null : runtimeBodyActorId(state, targetId), operation.room);
      rememberObject(state, actorId, object); if (targetId) rememberObject(state, targetId, object);
      physical(state, operation, `${object.name}的转交痕迹`, `这里留下${object.name}${option.kind === 'drop' ? '刚被放下' : '刚被交接'}的接触与位置变化，可与该物表面比较；不能仅凭这些痕迹断定交接者姓名。`, { objectId: object.id });
      const enactment = emit(state, events, operation, `${actorLabel(state, actorId)}${option.kind === 'drop' ? '把' + object.name + '放在眼前' : '当面交出' + object.name + '，由' + actorLabel(state, targetId) + '实际接过'}。`);
      witnessedAction(state, operation, enactment, [actorId, ...(targetId ? [targetId] : [])], [object.id]);
      if (object.recordId) {
        const record = runtime.records.find(row => row.id === object.recordId);
        record.transfers.push({ operationId: operation.id, fromId: actorId, toId: targetId || null, room: operation.room, at: time(state) });
      }
    }
  } else if (option.kind === 'request') {
    emit(state, events, operation, `${actorLabel(state, actorId)}向眼前的持有人提出借用${runtime.objects[option.objectId].name}的请求；物品仍在原持有人手中。`, { delivery: 'speech' });
  } else if (option.kind === 'prepare') {
    if (!plan || !kitValid(state, plan, false)) block('本人手中缺少约定材料，准备尚未完成。');
    else {
      plan.preparation = { room: operation.room, kit: Object.fromEntries(desiredKit(plan).map(id => [id, runtime.objects[id].custodyVersion])), gaze: null };
      revise(plan, 'preparing', time(state), '本人实际核对所持材料并完成这一步准备。');
      const contact = preparationContact(state, actorId);
      physical(state, operation, '器具准备留下的对应压痕', `这里留下与${desiredKit(plan).map(id => runtime.objects[id].name).join('、')}相对应的接触压痕；边缘附着${contact}，可以与眼前服饰和器具比较，但不单独证明准备者姓名，也不是对后来行动的证明。`,
        { resourceIds: [...desiredKit(plan)] });
      const enactment = emit(state, events, operation, `${actorLabel(state, actorId)}在眼前核对并准备手中器具，衣袖与发丝实际擦过器具支点，留下${contact}。`);
      witnessedAction(state, operation, enactment, [actorId], desiredKit(plan));
      if (suppliesV2(state)) plan.fairCandidate = { version: 1, preparedAt: time(state),
        policy: caseItemPolicyV2Reference(),
        // Real precrime material/witness paths; no future clue or confession.
        traceIds: runtime.traces.filter(trace => trace.occurredAt <= time(state)
          && trace.kind !== 'private-record' && (trace.causeOperationId === operation.id
            || trace.resourceIds?.some(id => desiredKit(plan).includes(id)))).map(trace => trace.id),
        guarantee: 'none-player-may-destroy-or-withhold-last-path' };
    }
  } else if (option.kind === 'fix-gaze') {
    if (!plan || actorId !== 'leia' || plan.targetId !== 'noah' || !canonicalAllowed(state) || !kitValid(state, plan)
      || !local(state, actorId, plan.targetId)) block('既定对象或本人准备不在这一步可触及的范围内。');
    else {
      plan.preparation.gaze = { targetId: plan.targetId, room: operation.room, at: time(state), until: time(state) + 90 };
      revise(plan, 'preparing', time(state), '本人当面实施了短时视线固定，移动或干预会破坏条件。');
      emit(state, events, operation, `${actorLabel(state, actorId)}当面对${actorLabel(state, plan.targetId)}施加短时视线固定；不是远程控制，也不保证下一步成功。`);
    }
  } else if (option.kind === 'attack') {
    operation.targetId = plan.targetId; operation.resourceIds = [...desiredKit(plan)]; operation.dueAt = time(state) + CASE_REACTION_SECONDS;
    if (!attackValid(state, plan, operation)) block('既定对象、所持器具或实际准备不再符合条件。');
    else {
      operation.status = 'pending'; operation.trailVerified = true;
      const witnesses = runtimeLocalIds(state, operation.room); operation.witnessIds = [...witnesses];
      const threat = emit(state, events, operation, `${actorLabel(state, actorId)}明确举起准备好的武器，朝${actorLabel(state, plan.targetId)}发起攻击；动作尚未完成，眼前的人有三十秒作出反应。`, { audienceIds: witnesses, threat: true });
      operation.threatObservationId = threat.observationKey;
      physical(state, operation, '举起器具留下的定位擦痕', '刚刚举起的器具与支点接触，留下可以与器具形状比较的新擦痕。', { resourceIds: [...operation.resourceIds] });
      // Witness statements are optional readings from actual perceivers, never
      // projected as everyone's knowledge or a compulsory confession.
      if (witnesses.some(id => ![actorId, plan.targetId].includes(id))) addTrace(state, operation, '当场攻击动作的目击记录',
        `本人在场实际看见${actorLabel(state, actorId)}举起器具朝${actorLabel(state, plan.targetId)}发动尚未完成的攻击。见闻不覆盖本人未在场时段，也不证明未获知的姓名。`,
        { kind: 'witness', witnessIds: witnesses.filter(id => ![actorId, plan.targetId].includes(id)), room: operation.room });
    }
  } else if (['protect', 'dodge'].includes(option.kind)) {
    const attack = runtime.operations.find(row => row.id === option.attackId && row.status === 'pending');
    if (!attack || !local(state, actorId, attack.actorId) || !local(state, actorId, attack.targetId)) block('眼前已经没有可接触的这次攻击。');
    else if (option.kind === 'dodge') {
      const destination = operation.room === 'corridor' ? 'reception' : 'corridor';
      if (!prisonPassage(state, { actorId, from: CODES[operation.room], to: CODES[destination], home: actor(state, actorId).locationId })) block('退出通路不通，闪避没有完成。');
      else {
        const audienceIds = runtimeLocalIds(state, operation.room); runtimeSetRoom(state, actorId, destination);
        emit(state, events, operation, `${actorLabel(state, actorId)}明确主动避开攻击并沿通路退出房间。`, { audienceIds });
      }
    } else {
      const victimPlan = runtime.plans.find(row => row.id === attack.planId);
      attack.status = 'cancelled'; attack.completedAt = time(state); attack.reason = 'intervened';
      if (victimPlan) { victimPlan.preparation.gaze = null; revise(victimPlan, 'blocked', time(state), '眼前的人实施了明确制止，准备与攻击被打断。'); }
      const tool = runtime.objects[attack.resourceIds[0]];
      if (tool?.holderId === attack.actorId) moveObject(state, tool, actorId);
      physical(state, operation, '制止攻击留下的接触痕迹', '举起的器具被实际拦下，现场留下新的碰撞与接触变化；痕迹本身不说明谁选择制止。');
      emit(state, events, operation, `${actorLabel(state, actorId)}主动制止眼前攻击，器具被实际拦下；这次攻击未完成。`);
    }
  } else if (option.kind === 'record-preparation') {
    const object = runtime.objects[option.objectId];
    if (!plan || !kitValid(state, plan) || object?.holderId !== actorId || object.recordId) block('本人没有可核对的准备或空白纸。');
    else {
      const content = `${actorName(state, actorId)}本人署名记录：我刚在${ROOMS[operation.room]}实际准备了手中${desiredKit(plan).map(id => runtime.objects[id].name).join('、')}。这只描述已完成的器具准备，不宣称任何尚未发生的伤害。`;
      const trace = addTrace(state, operation, '本人自愿署名的实际准备记录', content,
        { kind: 'preparation-record', authorId: actorId, objectId: object.id, planId: plan.id });
      const record = { id: nextId(runtime, 'record'), objectId: object.id, authorId: actorId, traceId: trace.id,
        sourceObservationIds: [...plan.sourceObservationIds], authoredAt: time(state), transfers: [], kind: 'preparation' };
      runtime.records.push(record); object.recordId = record.id; object.name = '署名器具准备记录';
      emit(state, events, operation, `${actorLabel(state, actorId)}自愿署名写下已经完成的器具准备，纸张仍在本人手中。`);
      acquireTrace(state, actorId, trace, operation, events);
    }
  } else if (option.kind === 'record') {
    const object = runtime.objects[option.objectId]; const source = ownedObservation(state, actorId, option.sourceObservationIds[0]);
    if (object?.holderId !== actorId || object.recordId || !source || !ownCommunication(state, actorId).includes(source)) block('本人没有可书写的空白纸或实际收到的沟通来源。');
    else {
      // Preserve the author's knowledge when the source was received, not a
      // later introduction. Older observations without a snapshot stay unnamed.
      const sourceLabel = source.speakerLabels?.[actorId] || actorLabel(state, source.speakerId);
      const content = `${actorName(state, actorId)}选择记录：于${source.occurredAt}收到${sourceLabel}的原话「${source.text.slice(0, 180)}」。作者将这次沟通视为需谨慎保管的内容；不推断未见往事。`;
      const trace = addTrace(state, operation, '本人选择写下的敏感沟通记录', content, { kind: 'private-record', objectId: object.id, authorId: actorId });
      const record = { id: nextId(runtime, 'record'), objectId: object.id, authorId: actorId, traceId: trace.id,
        sourceObservationIds: [sourceId(state, source, actorId)], authoredAt: time(state), transfers: [] };
      runtime.records.push(record); object.recordId = record.id; object.name = '写有当次沟通的折叠记录';
      emit(state, events, operation, `${actorLabel(state, actorId)}主动把亲自收到的一次沟通写在空白纸上并折起；旁人没有自动读到内容。`);
      acquireTrace(state, actorId, trace, operation, events);
    }
  } else if (option.kind === 'pressure') {
    const record = runtime.records.find(row => row.id === option.recordId);
    const object = runtime.objects[record?.objectId];
    if (!record || object?.holderId !== actorId || !local(state, actorId, record.authorId)
      || !record.transfers.some(row => row.toId === actorId) || !runtimeKnownEvidence(state, actorId).some(row => row.id === record.traceId)) block('本人未实际接过并读到这份记录，或作者不在眼前。');
    else {
      const content = `${actorName(state, actorId)}当面向${perceivedActorLabel(state, actorId, record.authorId)}递交署名施压纸条：「这份你刚写下并交出的沟通记录现在在我手中。若你不接受我的要求，我会公开这份记录。」作者在受交者眼前留下纸条。这不是对方已经答应的事实。`;
      const threat = emit(state, events, operation, content, { delivery: 'writing', audienceIds: [actorId, record.authorId] });
      const pressure = { id: nextId(runtime, 'pressure'), recordId: record.id, speakerId: actorId, recipientId: record.authorId,
        observationId: threat.observationKey, occurredAt: time(state), causeOperationId: operation.id };
      runtime.pressureLinks.push(pressure);
      const pressureTrace = addTrace(state, operation, '实际交付的署名施压纸条', content,
        { kind: 'record', authorId: actorId, recipientId: record.authorId, room: operation.room });
      pressure.traceId = pressureTrace.id;
      physical(state, operation, '记录转交处的纸张接触痕迹', '记录与施压纸条在此实际交接，纸张留下可以互相比较的折痕与接触压痕。', { objectId: object.id });
    }
  } else block('这一步没有可执行的规则。');
  const result = { accepted, reason, events, ...(operation.itemOfferVersion === 1 ? { offerId: operation.id } : {}) };
  return rememberReceipt(state, scope, key, result);
}

export function runtimeNextBoundary(state, toTime) {
  if (!hasCaseRuntime(state) || !Number.isFinite(toTime) || toTime < time(state)) return null;
  const pending = state.caseRuntime.operations.filter(row => row.status === 'pending' && Number.isFinite(row.dueAt)
    && row.dueAt > time(state) && row.dueAt <= toTime).map(row => row.dueAt);
  return pending.length ? Math.min(...pending) : null;
}

/** Resolve committed work only, at its exact due time. No autonomous plan
 * adoption/preparation/attack is performed by passing time. */
export function advanceCaseRuntime(state, toTime, key) {
  if (!hasCaseRuntime(state) || !Number.isFinite(toTime) || toTime < time(state)) return { events: [], interrupted: false, at: time(state) };
  if (state.caseRuntime.operations.some(row => row.status === 'pending' && row.kind === 'attack' && row.dueAt <= toTime)) {
    const reason = initialMechanismDecision(state, 'attack');
    if (reason) throw Object.assign(new Error('本局初始边界不允许结算这项攻击；未改写为无伤结果。'), { code: 'INITIAL_POLICY_CONFLICT' });
  }
  const previous = receipt(state, 'advance', key);
  if (previous) return clone(previous.result);
  const runtime = state.caseRuntime; const events = []; let at = toTime; let interrupted = false;
  const threat = runtime.signals.find(row => row.kind === 'threat' && !row.interrupted
    && row.audienceIds.includes(createdPlayerId(state)) && row.occurredAt <= toTime
    && runtime.operations.some(operation => operation.id === row.operationId && operation.status === 'pending'));
  if (threat) {
    threat.interrupted = true;
    // A long action is stopped *before* the reaction window is spent. The next
    // explicit wait can still kill the player; there is no automatic evasion.
    return rememberReceipt(state, 'advance', key, { events, interrupted: true, at: Math.max(time(state), threat.occurredAt) });
  }
  const due = runtime.operations.filter(row => row.status === 'pending' && row.dueAt <= toTime)
    .sort((left, right) => left.dueAt - right.dueAt || left.id.localeCompare(right.id));
  for (const operation of due) {
    const plan = runtime.plans.find(row => row.id === operation.planId);
    const when = operation.dueAt;
    if (!plan || !attackValid(state, plan, operation) || runtime.incidents.length >= LIMITS.incidents
      || runtime.traces.length > LIMITS.traces - 3) {
      cancelled(state, plan, operation, events, '目标、器具、现场准备或反应窗口内的条件发生了变化。', when,
        text(key, 512) ? digest(key) : undefined);
      continue;
    }
    const witnesses = runtimeLocalIds(state, operation.room);
    operation.status = 'completed'; operation.completedAt = when;
    runtime.conditionsByActor[operation.targetId] = { status: 'dead', occurredAt: when, causeOperationId: operation.id };
    const playerDied = operation.targetId === createdPlayerId(state);
    const outcomeDeferred = playerDied && deferCasePlayerOutcome(state, { subjectId: operation.targetId,
      at: when, cause: 'case-attack', sourceKey: operation.id });
    if (playerDied && !outcomeDeferred) { state.completed = true; state.phase = 'agent_case_ending'; }
    revise(plan, 'completed', when, '既定攻击在反应窗口之后实际完成，后果已发生。');
    const marks = physical(state, operation, '实际伤害留下的器具对应痕迹',
      `现场的致命伤害与${operation.resourceIds.map(id => runtime.objects[id].name).join('、')}的实际接触形态对应；可与准备处和器具上的新压痕比较，不凭空证明持有人身份。`,
      { room: operation.room, at: when, resourceIds: [...operation.resourceIds] });
    const body = addTrace(state, operation, `${actorName(state, operation.targetId)}的现场状况`,
      '本人在现场可以确认其已无生命迹象，并有刚刚造成的致命器具伤害；发现不等于已经通报。',
      { kind: 'body', victimId: operation.targetId, room: operation.room, at: when });
    const traceIds = unique([...runtime.traces.filter(row => row.causeOperationId === operation.id).map(row => row.id), marks.id, body.id]);
    // Earlier actual preparation, transfer and pressure sources are legal
    // physical/documentary trails, not private plan records masquerading as evidence.
    for (const trace of runtime.traces) if (trace.kind !== 'private-record' && (trace.resourceIds?.some(id => operation.resourceIds.includes(id))
      || (plan.blueprint === 'record-pressure' && runtime.pressureLinks.some(link => link.traceId === trace.id && link.recipientId === plan.ownerId)))) {
      if (!traceIds.includes(trace.id)) traceIds.push(trace.id);
    }
    const incident = { id: nextId(runtime, 'incident'), victimId: operation.targetId, actorId: operation.actorId,
      room: operation.room, occurredAt: when, causeOperationId: operation.id, traceIds };
    runtime.incidents.push(incident);
    markCondition(state, operation.targetId, witnesses, 'dead', when);
    emit(state, events, operation, `${actorLabel(state, operation.actorId)}的攻击在反应窗口结束后实际命中；${actorLabel(state, operation.targetId)}倒下，现场留下致命伤害与器具接触痕迹。`
      + (outcomeDeferred ? '当前身体遭受致命伤害，后续能力与生命结果尚待宿主结算。'
        : playerDied ? '你的角色已死亡，当前视角结束；可以读取先前存档或回溯，世界不会自动复活或重置。' : ''),
      { audienceIds: witnesses, at: when, observationScope: text(key, 512) ? digest(key) : undefined });
    if (witnesses.includes(createdPlayerId(state))) { interrupted = true; at = when; break; }
  }
  const result = { events, interrupted, at };
  return events.length || interrupted ? rememberReceipt(state, 'advance', key, result) : result;
}

/** Personal discovery is a real co-location check, not an automatic report.
 * It runs for every living NPC as well as the player. */
export function discoverRuntimeIncidents(state, key) {
  if (!hasCaseRuntime(state)) return [];
  if (initialMechanismDecision(state, 'discovery')) {
    if (state.caseRuntime.incidents.length) throw Object.assign(new Error('本局初始边界与案件现场冲突；未隐藏已发生的后果。'), { code: 'INITIAL_POLICY_CONFLICT' });
    return [];
  }
  const previous = receipt(state, 'discovery', key);
  if (previous) return clone(previous.result);
  const runtime = state.caseRuntime; const events = [];
  for (const incident of runtime.incidents) {
    if (incident.occurredAt > time(state)) continue;
    for (const actorId of runtimeLocalIds(state, incident.room)) {
      if (runtime.discoveries.some(row => row.incidentId === incident.id && row.actorId === actorId)) continue;
      const discovery = { incidentId: incident.id, actorId, at: time(state), room: incident.room };
      runtime.discoveries.push(discovery);
      markCondition(state, incident.victimId, [actorId], 'dead', time(state));
      const operation = { id: `discovery:${incident.id}:${actorId}`, actorId,
        ...(text(key, 512) ? { observationScope: digest(key) } : {}) };
      emit(state, events, operation, `本人在${ROOMS[incident.room]}实际发现${actorLabel(state, incident.victimId)}倒下，现场可确认已经死亡；尚未向监牢通报。`,
        { audienceIds: [actorId], delivery: 'reading' });
      enqueue(state, [actorId]);
    }
  }
  return events.length ? rememberReceipt(state, 'discovery', key, events) : events;
}

function traceAvailable(state, actorId, trace) {
  if (!runtimeActive(state, actorId) || !runtimeRoom(state, actorId) || trace.occurredAt > time(state)
    || suppliesV2(state) && trace.destroyedAt !== undefined) return false;
  if (trace.kind === 'private-record' || trace.kind === 'preparation-record') {
    const object = state.caseRuntime.objects[trace.objectId];
    return object?.holderId === actorId || (trace.kind === 'preparation-record' && !object?.holderId
      && object?.room === runtimeRoom(state, actorId));
  }
  if (trace.kind === 'witness' && trace.magicWitnessVersion !== undefined)
    return trace.magicWitnessVersion === 1 && trace.ownerActorId === actorId
      && trace.witnessIds?.includes(actorId);
  if (trace.kind === 'witness') return trace.witnessIds?.includes(actorId)
    || trace.witnessIds?.some(id => runtimeActive(state, id) && local(state, actorId, id));
  return trace.room === runtimeRoom(state, actorId);
}
export function runtimeInspectable(state, actorId) {
  if (!hasCaseRuntime(state) || actorId === 'warden' || !runtimeActive(state, actorId)) return [];
  return state.caseRuntime.traces.filter(trace => traceAvailable(state, actorId, trace))
    .map(trace => ({ id: trace.id, name: trace.name,
      room: ['private-record', 'preparation-record', 'witness'].includes(trace.kind) ? runtimeRoom(state, actorId) : trace.room }));
}
function evidenceView(trace) { return { id: trace.id, name: trace.name, description: trace.description, room: trace.room }; }
function acquireTrace(state, actorId, trace, operation, events) {
  const knowledge = state.caseRuntime.knowledgeByActor[actorId] ||= [];
  if (!knowledge.some(row => (typeof row === 'string' ? row : row?.id || row?.traceId) === trace.id)) knowledge.push(trace.id);
  const snapshots = state.caseRuntime.evidenceByActor ||= {};
  const own = snapshots[actorId] ||= {};
  own[trace.id] = { ...evidenceView(trace), room: ['private-record', 'preparation-record', 'witness'].includes(trace.kind)
    ? runtimeRoom(state, actorId) : trace.room };
  emit(state, events, operation, `本人取得【${trace.name}】：${trace.description}`, { audienceIds: [actorId], delivery: 'reading' });
}
export function runtimeAcquire(state, actorId, traceId, key) {
  const reject = () => ({ accepted: false, reason: 'unavailable', events: [] });
  if (!hasCaseRuntime(state) || typeof actorId !== 'string' || typeof traceId !== 'string' || actorId === 'warden') return reject();
  const scope = `acquire:${actorId}`; const previous = receipt(state, scope, key);
  if (previous) return clone(previous.result);
  const trace = state.caseRuntime.traces.find(row => row.id === traceId);
  if (!trace || !traceAvailable(state, actorId, trace) || state.caseRuntime.receipts.length >= LIMITS.receipts - 16) return reject();
  const events = []; const operation = { id: nextId(state.caseRuntime, 'acquisition'), actorId,
    ...(text(key, 512) ? { observationScope: digest(key) } : {}) };
  acquireTrace(state, actorId, trace, operation, events);
  if (trace.kind === 'body' && trace.victimId) markCondition(state, trace.victimId, [actorId], 'dead', time(state));
  return rememberReceipt(state, scope, key, { accepted: true, reason: null, events,
    trace: clone(state.caseRuntime.evidenceByActor[actorId][trace.id]) });
}
export function runtimeKnownEvidence(state, actorId) {
  if (!hasCaseRuntime(state) || typeof actorId !== 'string' || !actor(state, actorId)) return [];
  const ids = (state.caseRuntime.knowledgeByActor[actorId] || []).map(row => typeof row === 'string' ? row : row?.id || row?.traceId);
  return state.caseRuntime.traces.filter(row => ids.includes(row.id)).map(row => clone(state.caseRuntime.evidenceByActor?.[actorId]?.[row.id] || evidenceView(row)));
}
export function runtimeObservedCondition(state, actorId, observerId = createdPlayerId(state)) {
  if (!hasCaseRuntime(state)) return undefined;
  const observed = state.caseRuntime.observedConditionsByActor[observerId]?.[actorId];
  if (observed?.status === 'dead' && observed.at <= time(state)) return '本人已目击或亲自检查确认死亡';
  const condition = state.caseRuntime.conditionsByActor[actorId];
  if ((typeof condition === 'string' ? condition : condition?.status) === 'executed'
    && state.caseRuntime.executedIds.includes(actorId)) return '判决执行已公开结束，已不参加活动';
  return undefined;
}
export function runtimePlanView(state, actorId, { perceived = false } = {}) {
  if (!hasCaseRuntime(state) || typeof actorId !== 'string') return [];
  const known = perceived ? runtimeRecognizedActors(state, actorId) : null;
  return state.caseRuntime.plans.filter(row => row.ownerId === actorId).map(row => ({ id: row.id, ownerId: row.ownerId,
    targetId: perceived && !known.has(row.targetId) ? runtimeActorHandle(actorId, row.targetId) : row.targetId,
    ...(perceived ? { targetLabel: perceivedActorLabel(state, actorId, row.targetId) } : {}),
    status: row.status, revision: row.revision, goalId: row.goalId,
    sourceObservationIds: [...row.sourceObservationIds], assessment: row.assessment,
    prepared: Boolean(row.preparation.kit), gazeFixed: Boolean(row.preparation.gaze),
    revisions: clone(row.revisions) }));
}

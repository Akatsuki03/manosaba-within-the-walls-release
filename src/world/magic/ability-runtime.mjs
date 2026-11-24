import { isDeepStrictEqual } from 'node:util';
import { DatabaseSync } from 'node:sqlite';
import { runtimeCapabilityId } from '../../content/runtime-capabilities.mjs';
import { MAGIC_REFERENCE, MAGIC_ROSTER, MAGIC_SOURCE_CHECKS, magicDefinition,
  magicJson, magicExact, magicId, magicFail, magicOwn } from './ability-definitions.mjs';
import { createMagicIdentity, validateMagicIdentity, bodyForMind, grantMatchesIdentity } from './magic-identity.mjs';
import { assertBodyFactorGrantApproval } from './magic-binding-policy.mjs';
import { reduceMagicEffect, settleMagicLifecycle, activeMagicEffects, effectiveMemoryAccess } from './magic-effects.mjs';
import { requestMagicRewind } from './magic-timeline.mjs';
import { isProxy } from 'node:util/types';
import { createdPlayerId, startingRoom, CREATED_ROOMS } from '../../creation/player-setup.mjs';
import { runtimeRoom, runtimeSetRoom, runtimeLocalIds } from '../../case-runtime.mjs';
import { ABILITY_RULES, ABILITY_REFERENCE, SPATIAL_SHIFT, SPATIAL_SHIFT_REFERENCE,
  APPROVED_SPATIAL_PRESET, ISLAND_BOUNDARY, approvedSpatialCreation, validateAbilityActivation,
  abilityRuleReference, abilityDigest, abilityFailure } from './ability-definitions.mjs';

const rooms = { ...CREATED_ROOMS, infirmary: '医务室' };
const validRoom = room => Object.hasOwn(rooms, room);
const exact = (value, keys) => value && typeof value === 'object' && !isProxy(value)
  && Object.getPrototypeOf(value) === Object.prototype && Reflect.ownKeys(value).length === keys.length
  && keys.every(key => { const descriptor = Object.getOwnPropertyDescriptor(value, key);
    return descriptor?.enumerable && Object.hasOwn(descriptor, 'value'); });
/** Explicit HOST_ONLY helper. An exact approved preset is necessary but never
 * sufficient: callers must request confirmation; names/text cannot grant. */
export function approvedSpatialActivation(state, options = {}) {
  if (!exact(options, ['confirmed']) || options.confirmed !== true || !approvedSpatialCreation(state?.creation)) abilityFailure('INVALID_ABILITY_GRANT');
  return { type: 'guard_magic_rules_activate', magicRules: structuredClone(ABILITY_REFERENCE),
    definition: structuredClone(SPATIAL_SHIFT_REFERENCE), boundary: structuredClone(ISLAND_BOUNDARY),
    grant: { id: 'approved-spatial-shift:player', actorId: 'player', authority: 'HOST_GRANT',
      provenance: { presetRef: APPROVED_SPATIAL_PRESET.ref, characterHash: APPROVED_SPATIAL_PRESET.characterHash,
        approvalRef: APPROVED_SPATIAL_PRESET.approval, confirmed: true } } };
}
export function activateAbilityRuntime(state, action) {
  if (runtimeCapabilityId(state.agentRuntimeRevision) !== 'agent-prison-runtime@8' || state.creation?.scenarioId
    || state.abilityRuntime !== undefined || state.guardReaction?.pending || state.guardReaction?.detention) abilityFailure('ABILITY_ACTIVATION_UNSUPPORTED');
  validateAbilityActivation(action, state.creation);
  state.abilityRuntime = { version: 1, rules: structuredClone(ABILITY_REFERENCE), boundary: structuredClone(ISLAND_BOUNDARY),
    activatedAt: state.worldTime, grants: [structuredClone(action.grant)], visits: [], uses: [], effects: [] };
}
function runtime(state) {
  if (!Object.hasOwn(state, 'abilityRuntime')) return null;
  if (!abilityRuleReference(state)) abilityFailure();
  const r = state.abilityRuntime;
  if (!exact(r, ['version', 'rules', 'boundary', 'activatedAt', 'grants', 'visits', 'uses', 'effects'])
    || !Number.isSafeInteger(r.activatedAt) || r.activatedAt < 0
    || ![r.visits, r.uses, r.effects].every(Array.isArray)
    || r.visits.length > Object.keys(rooms).length || r.uses.length > ABILITY_RULES.retainedHistory
    || r.effects.length > ABILITY_RULES.retainedHistory) abilityFailure();
  return r;
}
/** Only the immutable accepted action plus its canonical host arrival event
 * establishes a remote visit. Neighbours, map labels, narration, intents and
 * other actors' observations do not. This is a pure projection, never a view
 * mutation. Initial room is always a personally visited source. */
export function verifiedAbilityVisits(state) {
  const actorId = createdPlayerId(state);
  const initial = state.creation ? startingRoom(state.creation) : 'cell';
  const found = new Map();
  if (validRoom(initial)) found.set(initial, { room: initial, islandId: ISLAND_BOUNDARY.islandId,
    actorId, source: { type: 'initial-room', ref: `creation:${abilityDigest(state.creation || {})}`, occurredAt: 0 } });
  for (const action of state.agentActions || []) {
    if (action?.type !== 'scene' || action.sceneBeatVersion !== 1 || action.intent?.type !== 'move'
      || !validRoom(action.intent.destination)) continue;
    const room = action.intent.destination;
    const event = state.entries.find(row => row.observationKey === `${action.jobId}:arrival`
      && row.speakerId === actorId && row.delivery === 'action' && row.audienceIds?.includes(actorId)
      && row.text === `你沿通路来到${rooms[room]}。` && Number.isSafeInteger(row.occurredAt) && row.occurredAt <= state.worldTime);
    if (event && !found.has(room)) found.set(room, { room, islandId: ISLAND_BOUNDARY.islandId, actorId,
      source: { type: 'accepted-host-arrival', ref: event.observationKey, actionHash: abilityDigest(action), occurredAt: event.occurredAt } });
  }
  // Successful spatial arrivals are witnessed by the caster and retained as
  // effects. They cannot create a destination that was not already verified.
  return [...found.values()];
}
export function refreshAbilityVisits(state) {
  if (!state.abilityRuntime) return;
  runtime(state); state.abilityRuntime.visits = verifiedAbilityVisits(state);
}
function grantFor(state) {
  const r = runtime(state);
  return r?.grants.find(row => row.actorId === createdPlayerId(state) && row.authority === 'HOST_GRANT') || null;
}
function witnessFor(state, room) {
  if (!validRoom(room)) return null;
  const current = runtimeRoom(state, createdPlayerId(state));
  if (room === current) return { room, islandId: ISLAND_BOUNDARY.islandId, actorId: createdPlayerId(state),
    source: { type: 'current-visible-room', ref: `visible:${room}:${state.worldTime}`, occurredAt: state.worldTime } };
  return verifiedAbilityVisits(state).find(row => row.room === room) || null;
}
export function sealSpatialDestination(state, destination) {
  const grant = grantFor(state); const r = state.abilityRuntime;
  if (!grant || !exact(destination, ['room', 'islandId']) || destination.islandId !== r.boundary.islandId) abilityFailure('INVALID_SPATIAL_DESTINATION');
  const witness = witnessFor(state, destination.room);
  if (!witness) abilityFailure('UNWITNESSED_SPATIAL_DESTINATION');
  return { kind: 'spatial-shift', definition: structuredClone(SPATIAL_SHIFT_REFERENCE), rules: structuredClone(ABILITY_REFERENCE),
    grantId: grant.id, destination: structuredClone(destination), witness,
    conditions: { from: runtimeRoom(state, createdPlayerId(state)), at: state.worldTime, boundary: structuredClone(r.boundary),
      timing: 'one-existing-wisdom-d20', burden: '集中精神；距离遥远时精神负担更重，不计魔力、冷却或次数' } };
}
export function spatialGuardOptions(state, maxOptions = ABILITY_RULES.maxGuardOptions) {
  if (!grantFor(state)) return [];
  const current = runtimeRoom(state, createdPlayerId(state));
  const candidates = [...verifiedAbilityVisits(state).filter(row => row.room !== current),
    ...(validRoom(current) ? [{ room: current }] : [])];
  return candidates.slice(0, maxOptions).map(({ room }) => ({
    option: { id: `spatial-${room}`, label: room === current ? '集中精神，在眼前空间穿梭避开抓握' : `集中精神，穿梭至亲自到过的${rooms[room]}`,
      ability: SPATIAL_SHIFT.reaction.ability, dc: SPATIAL_SHIFT.reaction.dc,
      environmentModifier: 0, environmentReason: '只检定能否在被抓住前集中精神；穿梭本身不另掷骰，门锁和普通墙壁不构成限制' },
    choice: sealSpatialDestination(state, { room, islandId: ISLAND_BOUNDARY.islandId }),
  }));
}
export function validateSpatialChoice(state, choice) {
  const expected = sealSpatialDestination(state, choice?.destination);
  if (!isDeepStrictEqual(choice, expected)) abilityFailure('INVALID_SPATIAL_CHOICE');
  return expected;
}
/** Called only after the existing guard d20 has been verified, on the guard
 * reducer's detached draft. No RNG, resource counter or second success roll. */
export function resolveSpatialGuard(state, choice, result, pending) {
  validateSpatialChoice(state, choice);
  const r = state.abilityRuntime; const actorId = createdPlayerId(state);
  const id = `spatial:${pending.id}`;
  if (r.uses.some(row => row.id === id)) abilityFailure('ABILITY_ALREADY_RESOLVED');
  const before = runtimeRoom(state, actorId); const witnesses = runtimeLocalIds(state, before);
  const outcome = result.success ? 'shifted-before-capture' : 'captured-before-concentration';
  r.uses.push({ id, definition: structuredClone(SPATIAL_SHIFT_REFERENCE), grantId: choice.grantId,
    encounterId: pending.id, resultId: result.id, occurredAt: state.worldTime, outcome,
    destination: structuredClone(choice.destination), conditions: structuredClone(choice.conditions) });
  if (r.uses.length > ABILITY_RULES.retainedHistory) r.uses.splice(0, r.uses.length - ABILITY_RULES.retainedHistory);
  const retained = new Set(r.uses.map(row => row.id));
  r.effects = r.effects.filter(row => retained.has(row.sourceUseId));
  if (!result.success) return [];
  if (!runtimeSetRoom(state, actorId, choice.destination.room)) abilityFailure();
  if (state.agentWorld) state.agentWorld.routes = state.agentWorld.routes.filter(row => row.actorId !== actorId);
  r.effects.push({ id, type: 'spatial-room-shift', actorId, from: before, to: choice.destination.room,
    definition: structuredClone(SPATIAL_SHIFT_REFERENCE), sourceUseId: id, occurredAt: state.worldTime });
  if (r.effects.length > ABILITY_RULES.retainedHistory) r.effects.splice(0, r.effects.length - ABILITY_RULES.retainedHistory);
  return [{ text: `你在抓握落下前集中精神，凭亲眼所见或亲历的位置完成意念穿梭，落在${rooms[choice.destination.room]}，暂时甩开看守。门锁与普通墙壁没有阻断这次穿梭。`,
    speaker: '眼前的动静', speakerId: actorId, delivery: 'action', audienceIds: [actorId],
    occurredAt: state.worldTime, observationKey: `ability:${id}:arrival` },
  ...(before !== choice.destination.room && witnesses.some(owner => owner !== actorId) ? [{
    text: '眼前的人影忽然从原处消失。', speaker: '眼前的动静',
    speakerId: actorId, delivery: 'action', audienceIds: witnesses.filter(owner => owner !== actorId),
    occurredAt: state.worldTime, observationKey: `ability:${id}:departure`,
  }] : []),
  ...(before !== choice.destination.room && runtimeLocalIds(state, choice.destination.room).some(owner => owner !== actorId) ? [{
    text: '近处忽然出现一个身影。',
    speaker: '眼前的动静', speakerId: actorId, delivery: 'action',
    audienceIds: runtimeLocalIds(state, choice.destination.room).filter(owner => owner !== actorId),
    occurredAt: state.worldTime, observationKey: `ability:${id}:appearance`,
  }] : [])];
}

/** M5 HOST_ONLY facade. The caller must build the projection and certificates
 * from its current domain/perception/cognition snapshot. None of these host
 * objects is an actor/model tool argument. No defaults upgrade an old state. */
export function createRosterMagicState({ actors, playerActorId, entities = [], grants = [],
  memories = [], observations = [], recipes = [], grantApprovals = {}, time = 0, branchId, headCommitRef, generation = 0 }) {
  const identity = createMagicIdentity(actors, playerActorId);
  if (!Number.isSafeInteger(time) || time < 0 || !magicId(branchId) || !magicId(headCommitRef)
    || !Number.isSafeInteger(generation) || generation < 0) magicFail('MAGIC_SETUP_BOUNDARY');
  const keyed = rows => {
    if (!Array.isArray(rows) || rows.length > 8192 || rows.some(row => !magicId(row.id))
      || new Set(rows.map(row => row.id)).size !== rows.length) magicFail('MAGIC_SETUP_ENTITY');
    return Object.fromEntries(rows.map(row => [row.id, structuredClone(row)]));
  };
  const state = { version: 2, rules: structuredClone(MAGIC_REFERENCE), time, branchId, headCommitRef, generation,
    identity, entities: keyed(magicJson(entities)), observations: keyed(magicJson(observations)), recipes: keyed(magicJson(recipes)),
    memories: magicJson(memories), grants: magicJson(grants), grantApprovals: magicJson(grantApprovals), knowledge: [], uses: [], effects: [], signals: [],
    constraints: [], representations: [], memoryAccess: [], branchRequests: [], deathReactions: [], lifecycleEvents: [],
    growthEvents: [], witchification: {}, sourceChecks: structuredClone(MAGIC_SOURCE_CHECKS) };
  validateRosterMagicState(state); return state;
}
export function validateRosterMagicState(state) {
  if (state?.version !== 2 || !isDeepStrictEqual(state.rules, MAGIC_REFERENCE)) magicFail('MAGIC_RULE_VERSION');
  validateMagicIdentity(state.identity);
  for (const key of ['grants', 'knowledge', 'uses', 'effects', 'signals', 'constraints', 'representations', 'memoryAccess',
    'branchRequests', 'deathReactions', 'lifecycleEvents', 'growthEvents', 'memories']) if (!Array.isArray(state[key])) magicFail('MAGIC_STATE_SHAPE');
  if (!Number.isSafeInteger(state.time) || state.time < 0 || !magicId(state.branchId) || !magicId(state.headCommitRef)
    || !Number.isSafeInteger(state.generation) || state.generation < 0) magicFail('MAGIC_STATE_BOUNDARY');
  if (new Set(state.grants.map(row => row.id)).size !== state.grants.length) magicFail('MAGIC_GRANT_CONFLICT');
  for (const grant of state.grants) validateActorMagicGrant(grant, state);
  return true;
}
/** Issue only from a private, initial HOST setup snapshot and explicit grant-ID
 * approval map. An approvedBy string alone is never sufficient. The map is
 * not actor input and must be derived by the magic-host facade. */
export function createActorMagicGrant({ id, actorId, definitionRef, binding, source, stage, approvedBy }, issuance) {
  const definition = magicDefinition(definitionRef);
  if (!definition || !magicId(id) || !magicId(actorId) || !magicId(approvedBy)
    || definition.actorId !== actorId || !magicExact(binding, ['kind', 'id'])
    || !['mind', 'body', 'medium'].includes(binding.kind) || !magicId(binding.id)
    || stage !== definition.stage || !source || abilityDigest(source) !== abilityDigest(definition.sources)) magicFail('MAGIC_INVALID_GRANT');
  if (!issuance || !magicId(issuance.setupRef) || !issuance.identity || !issuance.approvals) magicFail('MAGIC_GRANT_ISSUANCE_REQUIRED');
  validateMagicIdentity(issuance.identity);
  const mind = Object.values(issuance.identity.minds).find(row => row.actorId === actorId);
  const initialBodyId = mind && bodyForMind(issuance.identity, mind.id);
  const initialBody = magicOwn(issuance.identity.bodies, initialBodyId);
  const approval = magicOwn(issuance.approvals, id);
  if (!mind || !initialBody || initialBody.actorId !== actorId
    || !approval || approval.actorId !== actorId || approval.definitionRef !== definition.ref
    || approval.approvedBy !== approvedBy || !magicId(approval.sourceEventId)
    || !magicExact(approval.binding, ['kind', 'id']) || abilityDigest(approval.binding) !== abilityDigest(binding)
    || approval.sourceFingerprint !== abilityDigest(definition.sources)) magicFail('MAGIC_GRANT_APPROVAL_REQUIRED');
  if (Object.hasOwn(approval, 'bindingPolicy')) assertBodyFactorGrantApproval(approval);
  if (binding.kind === 'mind' && binding.id !== mind.id
    || binding.kind === 'body' && binding.id !== initialBodyId
    || binding.kind === 'medium' && (!magicOwn(issuance.entities, binding.id)
      || !initialBody.inventory.includes(binding.id))) magicFail('MAGIC_GRANT_INITIAL_BINDING');
  if (definition.actorId === 'player' && (approval.customApprovalRef !== APPROVED_SPATIAL_PRESET.approval
    || approval.characterHash !== APPROVED_SPATIAL_PRESET.characterHash)) magicFail('MAGIC_CUSTOM_APPROVAL_REQUIRED');
  return magicJson({ id, actorId, definitionRef, definitionFingerprint: definition.fingerprint, source,
    stage, binding, approvedBy, authority: 'HOST_GRANT', enabled: stage === 'basic',
    issuance: { setupRef: issuance.setupRef, initialMindId: mind.id, initialBodyId,
      sourceEventId: approval.sourceEventId, sourceFingerprint: approval.sourceFingerprint,
      approval: structuredClone(approval) } });
}
function validateActorMagicGrant(grant, state) {
  const definition = magicDefinition(grant.definitionRef); const issued = grant.issuance;
  if (!definition || definition.actorId !== grant.actorId || !magicId(grant.id) || !magicId(grant.actorId) || !magicId(grant.approvedBy)
    || grant.authority !== 'HOST_GRANT' || grant.definitionFingerprint !== definition.fingerprint
    || abilityDigest(grant.source) !== abilityDigest(definition.sources) || grant.stage !== definition.stage
    || !magicExact(grant.binding, ['kind', 'id']) || !['mind', 'body', 'medium'].includes(grant.binding.kind)
    || typeof grant.enabled !== 'boolean' || !issued || !magicId(issued.setupRef) || !magicId(issued.sourceEventId)
    || !magicId(issued.initialMindId) || !magicId(issued.initialBodyId)
    || issued.sourceFingerprint !== abilityDigest(definition.sources)
    || magicOwn(state.identity.minds, issued.initialMindId)?.actorId !== grant.actorId
    || magicOwn(state.identity.bodies, issued.initialBodyId)?.actorId !== grant.actorId) magicFail('MAGIC_INVALID_GRANT');
  const approval = magicOwn(state.grantApprovals, grant.id);
  if (!approval || !issued.approval || !magicExact(approval.binding, ['kind', 'id'])
    || abilityDigest(approval) !== abilityDigest(issued.approval)
    || approval.actorId !== grant.actorId || approval.definitionRef !== definition.ref
    || approval.sourceEventId !== issued.sourceEventId || approval.sourceFingerprint !== issued.sourceFingerprint
    || approval.approvedBy !== grant.approvedBy || abilityDigest(approval.binding) !== abilityDigest(grant.binding)) magicFail('MAGIC_GRANT_APPROVAL_REQUIRED');
  if (Object.hasOwn(approval, 'bindingPolicy')) assertBodyFactorGrantApproval(approval);
  if (grant.binding.kind === 'mind' && grant.binding.id !== issued.initialMindId
    || grant.binding.kind === 'body' && grant.binding.id !== issued.initialBodyId
    || grant.binding.kind === 'medium' && !magicOwn(state.entities, grant.binding.id)) magicFail('MAGIC_INVALID_GRANT');
  if (definition.actorId === 'player' && (approval.customApprovalRef !== APPROVED_SPATIAL_PRESET.approval
    || approval.characterHash !== APPROVED_SPATIAL_PRESET.characterHash)) magicFail('MAGIC_CUSTOM_APPROVAL_REQUIRED');
  // Current occupants are intentionally NOT compared with the issuer: approved
  // body-bound abilities can lawfully be used by another mind after a swap.
}
export function setupRosterMagicGrants(actors, { bindings, approvedBy, issuance }) {
  return actors.flatMap(({ actorId }) => {
    const roster = MAGIC_ROSTER.find(row => row.actorId === actorId);
    if (!roster || !magicOwn(bindings, actorId)) magicFail('MAGIC_BINDING_DECISION_REQUIRED');
    return roster.refs.map(definitionRef => {
      const definition = magicDefinition(definitionRef);
      return createActorMagicGrant({ id: `grant:${actorId}:${definition.stage}`, actorId,
        definitionRef, binding: magicOwn(bindings, actorId), source: definition.sources, stage: definition.stage, approvedBy }, issuance);
    });
  });
}
export function recordMagicKnowledge(state, { id, ownerMindId, definitionRef, sourceEventId, at, belief }) {
  const draft = structuredClone(state);
  if (!magicId(id) || !magicOwn(draft.identity.minds, ownerMindId) || !magicId(sourceEventId) || at !== state.time
    || !['known', 'belief-only'].includes(belief) || !magicId(definitionRef)) magicFail('MAGIC_KNOWLEDGE_SOURCE');
  const row = { id, ownerMindId, definitionRef, sourceEventId, at, belief };
  const existing = draft.knowledge.find(item => item.id === id);
  if (existing && !isDeepStrictEqual(existing, row)) magicFail('MAGIC_KNOWLEDGE_CONFLICT');
  if (!existing) draft.knowledge.push(row);
  return draft;
}
export function knownMagicActions(state, actorId) {
  const mindId = Object.values(state.identity.minds).find(row => row.actorId === actorId)?.id;
  return state.grants.filter(grant => grant.enabled && grantMatchesIdentity(grant, state.identity, actorId)
    && magicDefinition(grant.definitionRef).activation === 'explicit-intent'
    && state.knowledge.some(row => row.ownerMindId === mindId && row.definitionRef === grant.definitionRef && row.belief === 'known'))
    .map(grant => ({ grantId: grant.id, definitionRef: grant.definitionRef, label: magicDefinition(grant.definitionRef).label }));
}
/** Qualitative event authorizations are created by the parent host rule layer,
 * not counted casts or numeric factor thresholds. Existing effects keep pins. */
// Pure mechanical adapter only. Its input is NOT authority. Domain privately
// verifies SQL sources, historical occupancy and exact slots before publication.
// Preserve both preissued grants/approvals and every existing effect verbatim.
export function applyProtocolGrowthObligations(state, plan, slots) {
  validateRosterMagicState(state);
  if (plan?.type !== 'host-emotional-growth-obligations@1' || plan.status !== 'planned'
    || plan.productionRegistrationEnabled !== false || plan.knowledgeEffects.length !== 0
    || plan.obligations.length !== 2 || !Array.isArray(slots)) magicFail('GROWTH_OBLIGATIONS_INVALID');
  const [transition, enhancement] = plan.obligations;
  if (transition.type !== 'body-factor-witchification-transition@1' || enhancement.type !== 'body-grant-enhancement-obligation@1'
    || enhancement.afterObligationId !== transition.id || enhancement.atomic !== true
    || enhancement.bodyId !== transition.bodyId || enhancement.factorId !== transition.factorId
    || slots.length !== enhancement.grants.length) magicFail('GROWTH_OBLIGATIONS_INVALID');
  const draft = structuredClone(state);
  for (const spec of enhancement.grants) {
    const slot = slots.find(row => row.basicGrantId === spec.grantId);
    const basic = draft.grants.find(row => row.id === slot?.basicGrantId);
    const enhanced = draft.grants.find(row => row.id === slot?.enhancedGrantId);
    if (!basic || !enhanced || basic.stage !== 'basic' || enhanced.stage !== 'awakened'
      || basic.binding.kind !== 'body' || enhanced.binding.kind !== 'body'
      || basic.binding.id !== transition.bodyId || enhanced.binding.id !== transition.bodyId
      || basic.definitionRef !== spec.fromDefinition.ref || basic.definitionFingerprint !== spec.fromDefinition.fingerprint
      || enhanced.definitionRef !== spec.toDefinition.ref || enhanced.definitionFingerprint !== spec.toDefinition.fingerprint)
      magicFail('GROWTH_BODY_GRANT');
    enhanced.enabled = true;
  }
  validateRosterMagicState(draft);
  return draft;
}
export function activateMagicGrowth(state, rawEvent) {
  const event = magicJson(rawEvent); const draft = structuredClone(state);
  if (!magicExact(event, ['id', 'actorId', 'sourceEventId', 'at', 'quality', 'grantIds', 'hostApproved'])
    || !magicId(event.id) || !magicId(event.sourceEventId) || event.at !== state.time || event.hostApproved !== true
    || !['factor-agitation', 'concept-expanded', 'witch-awakened'].includes(event.quality)
    || !Array.isArray(event.grantIds) || event.grantIds.length > 8) magicFail('MAGIC_GROWTH_EVENT');
  const previous = draft.growthEvents.find(row => row.id === event.id);
  if (previous) { if (!isDeepStrictEqual(previous, event)) magicFail('MAGIC_GROWTH_CONFLICT'); return draft; }
  if (draft.growthEvents.some(row => row.sourceEventId === event.sourceEventId && row.actorId === event.actorId)) magicFail('MAGIC_GROWTH_ALREADY_APPLIED');
  for (const id of event.grantIds) {
    const grant = draft.grants.find(row => row.id === id && row.actorId === event.actorId);
    if (!grant || grant.stage !== 'awakened') magicFail('MAGIC_GROWTH_GRANT');
    grant.enabled = true;
  }
  draft.growthEvents.push(event);
  draft.witchification[event.actorId] = { quality: event.quality, sourceEventId: event.sourceEventId, at: event.at };
  return draft;
}

/** An opaque local handle is scoped to this owner and exact story boundary.
 * Mint only from a HOST-provided visible/known source, never guessed IDs. */
export function authorizeMagicHandle(state, { handle, ownerMindId, kind, entityId, sourceEventId, verifiedAt, mode }) {
  if (!magicId(handle) || !magicOwn(state.identity.minds, ownerMindId) || !magicId(sourceEventId) || verifiedAt !== state.time
    || !['visible', 'personally-familiar', 'authorized-channel', 'heard-source', 'touch-source'].includes(mode)) magicFail('MAGIC_HANDLE_SOURCE');
  const row = kind === 'body' ? magicOwn(state.identity.bodies, entityId) : kind === 'observation' ? magicOwn(state.observations, entityId) : magicOwn(state.entities, entityId);
  if (!row || (kind !== 'body' && kind !== 'observation' && row.kind !== kind)) magicFail('MAGIC_TARGET_NOT_AVAILABLE');
  return { handle, ownerMindId, kind, entityId, sourceEventId, verifiedAt, mode,
    branchId: state.branchId, headCommitRef: state.headCommitRef, generation: state.generation };
}
const contextBoundary = (state, context, actorId) => {
  if (!magicExact(context, ['authority', 'actorId', 'branchId', 'headCommitRef', 'generation', 'at', 'mode', 'handles', 'facts'])
    || context.authority !== 'HOST_ONLY' || context.actorId !== actorId || context.branchId !== state.branchId
    || context.headCommitRef !== state.headCommitRef || context.generation !== state.generation || context.at !== state.time
    || !['daily', 'investigation', 'trial'].includes(context.mode) || !Array.isArray(context.handles)
    || context.handles.length > 512 || new Set(context.handles.map(row => row.handle)).size !== context.handles.length
    || !context.facts || typeof context.facts !== 'object' || Array.isArray(context.facts)) magicFail('MAGIC_STALE_AUTHORIZATION');
};
const payloadKeys = {
  'sound-replay': ['sourceHandle'], 'surface-sound': ['sourceHandle'],
  'liquid-paint': ['recipeId', 'representationRef', 'previousWorkIds'],
  'visual-illusion': ['representationRef'], 'regenerate': ['injuryIds'],
  'gaze': ['focusHandle'], 'interest': ['focusHandle'], 'speech-control': ['focusHandle', 'actionRef'],
  'memory-share': ['recordIds'], 'mental-heal': ['recordIds'],
  'touch-vision': ['sourceHandle'], 'past-reading': ['sourceHandle'], 'remote-view': ['sourceHandle'], 'dimension-view': ['sourceHandle'],
  'death-rewind': ['anchorId', 'memoryWhitelist'], 'mass-float': ['targetHandles'],
};
const newInformation = new Set(['sound-replay', 'surface-sound', 'touch-vision', 'past-reading', 'remote-view', 'dimension-view', 'memory-share', 'mental-heal']);
function validatePayload(definition, payload) {
  const keys = definition.operation === 'mass-float' && definition.version === 1 ? [] : magicOwn(payloadKeys, definition.operation) || [];
  if (!magicExact(payload, keys)) magicFail('MAGIC_PARAMETER_SCHEMA');
  for (const [key, value] of Object.entries(payload)) {
    if (['previousWorkIds', 'injuryIds', 'recordIds', 'memoryWhitelist', 'targetHandles'].includes(key)) {
      if (!Array.isArray(value) || value.length > 512 || new Set(value).size !== value.length || value.some(id => !magicId(id))) magicFail('MAGIC_PARAMETER_SCHEMA');
    } else if (!magicId(value)) magicFail('MAGIC_PARAMETER_SCHEMA');
  }
}
function resolveMagicHandle(state, context, token, kinds, mindId) {
  const handle = context.handles.find(row => row.handle === token);
  if (!handle || handle.ownerMindId !== mindId || !kinds.includes(handle.kind)
    || handle.verifiedAt !== state.time || handle.branchId !== state.branchId
    || handle.headCommitRef !== state.headCommitRef || handle.generation !== state.generation) magicFail('MAGIC_HANDLE_PERMISSION');
  const verified = authorizeMagicHandle(state, handle);
  if (!isDeepStrictEqual(handle, verified)) magicFail('MAGIC_HANDLE_PERMISSION');
  return handle;
}
function castConditions(state, definition, command, context, sourceMindId, sourceBodyId, target) {
  const facts = context.facts; const operation = definition.operation;
  if (!facts || typeof facts !== 'object' || !magicId(facts.authorizationId) || facts.castAllowed !== true) magicFail('MAGIC_CONDITIONS_NOT_AUTHORIZED');
  if (context.mode === 'trial' && (newInformation.has(operation)
    || definition.activation === 'explicit-intent' && facts.trialDemonstrationApproved !== true)) magicFail('MAGIC_TRIAL_NEW_INFORMATION_FORBIDDEN');
  if (facts.targetReachable !== true) magicFail('MAGIC_TARGET_NOT_AVAILABLE');
  if (definition.sourceChecks.some(id => magicOwn(facts.sourceApprovals, id)?.approved !== true)) magicFail('MAGIC_SOURCE_CHECK_REQUIRED');
  if (facts.suppressed === true) magicFail('MAGIC_SUPPRESSED');
  // The phase budget is a host queue safety fence, never a per-spell use cap.
  if (definition.activation === 'host-event-reaction' || facts.reactionPhase !== undefined) {
    const queue = facts.reactionQueue;
    if (!queue || !magicId(queue.rootEventId) || !Number.isSafeInteger(queue.phaseLimit) || queue.phaseLimit < 1 || queue.phaseLimit > 64
      || !Array.isArray(queue.completedPhaseIds) || queue.completedPhaseIds.length !== new Set(queue.completedPhaseIds).size
      || queue.completedPhaseIds.some(id => !magicId(id)) || !Number.isSafeInteger(facts.reactionPhase)
      || facts.reactionPhase !== queue.completedPhaseIds.length || facts.reactionPhase >= queue.phaseLimit) magicFail('MAGIC_REACTION_LIMIT');
  }
  if (definition.activation === 'host-event-reaction' && (!magicId(facts.triggerEventId) || command.activation !== 'reaction')) magicFail('MAGIC_REACTION_REQUIRED');
  if (definition.activation === 'host-event-reaction' && state.uses.some(use => use.triggerEventId === facts.triggerEventId
    && use.definitionRef === definition.ref && use.sourceMindId === sourceMindId)) magicFail('MAGIC_REACTION_ALREADY_RESOLVED');
  if (definition.activation === 'explicit-intent' && command.activation !== 'intent') magicFail('MAGIC_INTENT_REQUIRED');
  const source = magicOwn(state.identity.bodies, sourceBodyId); const targetBody = magicOwn(state.identity.bodies, target.entityId);
  if (!source.alive && operation !== 'death-rewind') magicFail('MAGIC_SOURCE_UNAVAILABLE');
  if (operation === 'death-rewind' && (source.alive || target.entityId !== sourceBodyId)) magicFail('MAGIC_DEATH_TRIGGER');
  if (operation !== 'death-rewind' && targetBody?.alive === false && operation !== 'past-reading') magicFail(operation === 'regenerate' ? 'MAGIC_REGEN_NOT_REVIVAL' : 'MAGIC_TARGET_NOT_AVAILABLE');
  if (['body-swap', 'regenerate'].includes(operation) || operation === 'touch-vision') {
    if (facts.contact !== true || facts.contactBodyId !== target.entityId) magicFail('MAGIC_CONTACT_REQUIRED');
  }
  if (operation === 'body-swap' && (!facts.consents?.some(row => row.mindId === magicOwn(state.identity.occupants, target.entityId)
    && row.actionId === command.useId && row.agreed === true && row.at === state.time))) magicFail('MAGIC_ACTUAL_CONSENT_REQUIRED');
  if (operation === 'body-swap' && !['persist', 'restore-on-end'].includes(facts.identityReturnPolicy)) magicFail('MAGIC_SOURCE_CHECK_REQUIRED');
  if (operation === 'speech-control') {
    if (facts.spoken?.sourceBodyId !== sourceBodyId || facts.spoken.actionRef !== command.parameters.actionRef
      || facts.spoken.at !== state.time || facts.spoken.channel !== 'live-speech'
      || !facts.spoken.heardByMindIds?.includes(magicOwn(state.identity.occupants, target.entityId))) magicFail('MAGIC_SPOKEN_WORDS_REQUIRED');
    if (definition.stage === 'basic' && !facts.consents?.some(row => row.mindId === magicOwn(state.identity.occupants, target.entityId)
      && row.actionId === command.parameters.actionRef && row.agreed === true && row.at === state.time)) magicFail('MAGIC_ACTUAL_CONSENT_REQUIRED');
  }
  if (['gaze', 'interest', 'visual-illusion'].includes(operation) && facts.perceptualLink !== true) magicFail('MAGIC_PERCEPTUAL_LINK');
  if (['remote-view', 'dimension-view'].includes(operation) && (facts.watcher?.bodyId !== target.entityId
    || facts.watcher.lookingAtActorId !== command.actorId || facts.watcher.at !== state.time
    || !['person', 'portrait', 'photo'].includes(facts.watcher.medium))) magicFail('MAGIC_WATCHER_REQUIRED');
  if (operation === 'dimension-view' && facts.authorizedDimensionChannel !== true) magicFail('MAGIC_SOURCE_CHECK_REQUIRED');
  if (operation === 'touch-vision' && (facts.randomTrigger?.occurred !== true
    || !magicId(facts.randomTrigger.drawRef))) magicFail('MAGIC_RANDOM_TRIGGER_NOT_OCCURRED');
  if (['sound-replay', 'surface-sound'].includes(operation) && facts.audibleAudienceVerified !== true) magicFail('MAGIC_AUDIENCE_PERMISSION');
  if (operation === 'surface-sound' && facts.surfaceThoughtAuthorized !== true) magicFail('MAGIC_SURFACE_THOUGHT_PERMISSION');
  if (['memory-share', 'mental-heal'].includes(operation) && !Array.isArray(facts.memoryRecordIdsAuthorized)) magicFail('MAGIC_MEMORY_PERMISSION');
  if (['memory-share', 'mental-heal'].includes(operation)
    && command.parameters.recordIds.some(id => !facts.memoryRecordIdsAuthorized.includes(id))) magicFail('MAGIC_MEMORY_PERMISSION');
  if (operation === 'memory-share' && command.parameters.recordIds.some(id => {
    const row = state.memories.find(record => record.id === id);
    return !row || !effectiveMemoryAccess(state, row.ownerMindId, id);
  })) magicFail('MAGIC_MEMORY_PERMISSION');
  if (operation === 'memory-share' && (!Array.isArray(facts.localMindIds) || !facts.localMindIds.includes(magicOwn(state.identity.occupants, target.entityId)))) magicFail('MAGIC_MEMORY_PERMISSION');
  if (operation === 'self-float' && target.entityId !== sourceBodyId || operation === 'strength' && target.entityId !== sourceBodyId) magicFail('MAGIC_SELF_TARGET_ONLY');
  if (operation === 'liquid-paint' && (facts.paintingPurpose !== true || !Array.isArray(facts.previousWorkIdsAuthorized)
    || command.parameters.previousWorkIds.some(id => !facts.previousWorkIdsAuthorized.includes(id)))) magicFail('MAGIC_PAINT_ONLY');
  if (operation === 'spatial-shift') {
    if (!['visible', 'personally-familiar'].includes(target.mode) || facts.concentrationPossible !== true
      || facts.mentalCondition !== 'able-to-concentrate') magicFail('MAGIC_SPATIAL_CONCENTRATION');
    if (magicOwn(state.entities, target.entityId)?.islandId !== source.islandId) magicFail('MAGIC_SPATIAL_BOUNDARY');
  }
  if (['blast', 'shockwave'].includes(operation) && facts.impactAuthorized !== true) magicFail('MAGIC_PHYSICAL_CONDITIONS');
  // Reviewed host-end boundaries: self-float and the body-strengthened state
  // persist until the owner/lifecycle ends them; no invented duration.
  // Every other operation keeps its existing integer expiry contract.
  if (!(['self-float', 'strength'].includes(operation) && facts.endsAt === null)
    && (!Number.isSafeInteger(facts.endsAt) || facts.endsAt < state.time)) magicFail('MAGIC_LIFECYCLE_BOUNDARY');
}

/** The command is the ONLY actor-facing input. It cannot supply world patches,
 * SQL, target IDs, consent, future anchors, source observations or grant text.
 * Returns a detached full projection plus typed events for the parent commit. */
export function executeMagicCommand(state, rawCommand, rawContext) {
  const command = magicJson(rawCommand); const context = magicJson(rawContext);
  validateRosterMagicState(state);
  if (!magicExact(command, ['type', 'useId', 'actorId', 'grantId', 'definitionRef', 'activation', 'targetHandle', 'parameters'])
    || command.type !== 'magic_cast' || ![command.useId, command.actorId, command.grantId, command.definitionRef, command.targetHandle].every(magicId)) magicFail('MAGIC_COMMAND_SCHEMA');
  const commandHash = abilityDigest(command);
  const old = state.uses.find(row => row.id === command.useId);
  if (old) {
    if (old.commandHash !== commandHash) magicFail('MAGIC_IDEMPOTENCY_CONFLICT');
    return { state: structuredClone(state), receipt: structuredClone(old.receipt), events: [], replayed: true };
  }
  contextBoundary(state, context, command.actorId);
  const grant = state.grants.find(row => row.id === command.grantId && row.enabled);
  const definition = magicDefinition(command.definitionRef);
  if (!grant || !definition || grant.definitionRef !== definition.ref) magicFail('MAGIC_GRANT_PERMISSION');
  const sourceMindId = Object.values(state.identity.minds).find(row => row.actorId === command.actorId)?.id;
  const sourceBodyId = bodyForMind(state.identity, sourceMindId);
  if (!sourceBodyId || !grantMatchesIdentity(grant, state.identity, command.actorId, context.facts.mediumIds || [])) magicFail('MAGIC_GRANT_BINDING_PERMISSION');
  if (command.activation === 'intent' && !state.knowledge.some(row => row.ownerMindId === sourceMindId
    && row.definitionRef === definition.ref && row.belief === 'known')) magicFail('MAGIC_ABILITY_NOT_KNOWN');
  validatePayload(definition, command.parameters);
  const target = resolveMagicHandle(state, context, command.targetHandle, definition.targetKinds, sourceMindId);
  castConditions(state, definition, command, context, sourceMindId, sourceBodyId, target);
  if (definition.operation === 'body-swap' && state.effects.some(effect => effect.status !== 'ended'
    && effect.event.operation === 'body-swap'
    && [effect.event.sourceBodyId, effect.event.targetId].some(id => [sourceBodyId, target.entityId].includes(id)))) magicFail('MAGIC_IDENTITY_CONFLICT_REQUIRES_RULE');
  const payload = structuredClone(command.parameters);
  if (payload.sourceHandle) {
    const source = resolveMagicHandle(state, context, payload.sourceHandle, ['observation'], sourceMindId);
    const observation = magicOwn(state.observations, source.entityId);
    if (observation.ownerMindId !== sourceMindId || observation.at > state.time) magicFail('MAGIC_OBSERVATION_SOURCE');
    payload.sourceRef = source.entityId; delete payload.sourceHandle;
  }
  if (payload.focusHandle) {
    payload.focusRef = resolveMagicHandle(state, context, payload.focusHandle, ['body', 'item', 'location'], sourceMindId).entityId;
    delete payload.focusHandle;
  }
  if (['sound-replay', 'surface-sound'].includes(definition.operation)) {
    payload.audienceMindIds = context.facts.audienceMindIds;
    if (!Array.isArray(payload.audienceMindIds) || payload.audienceMindIds.length > 128
      || payload.audienceMindIds.some(id => !magicOwn(state.identity.minds, id))) magicFail('MAGIC_AUDIENCE_PERMISSION');
  }
  if (definition.operation === 'memory-share') payload.localMindIds = context.facts.localMindIds;
  if (definition.operation === 'body-swap') {
    payload.returnPolicy = context.facts.identityReturnPolicy;
    payload.originalTargetMindId = magicOwn(state.identity.occupants, target.entityId);
    if (context.facts.identityDeathReturnPolicy !== undefined) {
      if (!['restore-occupancy', 'retain-occupancy'].includes(context.facts.identityDeathReturnPolicy)) magicFail('MAGIC_IDENTITY_DEATH_POLICY_REQUIRED');
      payload.deathReturnPolicy = context.facts.identityDeathReturnPolicy;
    }
  }
  if (['blast', 'shockwave'].includes(definition.operation)) payload.impactAuthorized = context.facts.impactAuthorized;
  if (definition.operation === 'death-rewind') {
    const anchor = context.facts.anchors?.find(row => row.id === payload.anchorId);
    payload.branchRequest = requestMagicRewind({ useId: command.useId, definition, actorId: command.actorId,
      mindId: sourceMindId, death: context.facts.death, anchor,
      memoryRecords: state.memories.filter(row => effectiveMemoryAccess(state, row.ownerMindId, row.id)), memoryAccessState: state,
      memoryWhitelist: payload.memoryWhitelist, branch: { id: state.branchId, headCommitRef: state.headCommitRef, generation: state.generation, time: state.time },
      playerMindId: state.identity.playerMindId, sourceApproval: context.facts.sourceApprovals?.['hiro-awakened-repeat'] });
  }
  let targets = [target];
  if (definition.operation === 'mass-float' && definition.version >= 2) {
    if (!Array.isArray(payload.targetHandles) || payload.targetHandles.length === 0 || payload.targetHandles.length > 128
      || !payload.targetHandles.includes(command.targetHandle) || !Array.isArray(context.facts.floatItemIdsAuthorized)) magicFail('MAGIC_FLOAT_BATCH_PERMISSION');
    targets = payload.targetHandles.map(token => resolveMagicHandle(state, context, token, ['item'], sourceMindId));
    if (new Set(targets.map(row => row.entityId)).size !== targets.length
      || targets.some(row => !context.facts.floatItemIdsAuthorized.includes(row.entityId))) magicFail('MAGIC_FLOAT_BATCH_PERMISSION');
    delete payload.targetHandles;
  }
  const events = targets.map((resolved, index) => ({
    id: targets.length === 1 ? `effect:${command.useId}` : `effect:${command.useId}:${index}`,
    type: 'MagicEffectEstablished', family: definition.family,
    operation: definition.operation, definitionRef: definition.ref, definitionFingerprint: definition.fingerprint,
    grantId: grant.id, sourceMindId, sourceBodyId, targetId: resolved.entityId, at: state.time,
    expiresAt: context.facts.endsAt, sourceDeath: definition.lifecycle.sourceDeath, payload: structuredClone(payload),
    authorizationRef: context.facts.authorizationId }));
  let draft = state;
  for (const event of events) draft = reduceMagicEffect(draft, event);
  const receipt = { useId: command.useId, actorId: command.actorId, status: definition.family === 'chronology' ? 'await-domain-fork' : 'established',
    effectIds: events.map(event => event.id), occurredAt: state.time, feedback: definition.family === 'chronology' ? '死亡反应已进入时间线裁定，尚未提交分支。' : '魔法已按当前授权条件结算。' };
  draft.uses.push({ id: command.useId, commandHash, definitionRef: definition.ref, grantId: grant.id,
    stage: grant.stage, binding: structuredClone(grant.binding), source: structuredClone(grant.source),
    branchId: state.branchId, headCommitRef: state.headCommitRef, at: state.time,
    sourceMindId, triggerEventId: definition.activation === 'host-event-reaction' ? context.facts.triggerEventId : null, receipt });
  // Public/owner feedback contains no target truth, hidden source or memory text.
  return { state: draft, receipt, events, replayed: false };
}
export function settleRosterMagicBoundary(state, input) {
  validateRosterMagicState(state); return settleMagicLifecycle(state, magicJson(input));
}
/** Owner-ended basic self-float. Reuses the existing lifecycle dismissal,
 * never creates a timer or a second world-state mirror. Only the owning
 * mind's current body and the reviewed basic definition are eligible. */
export function settleOwnedSelfFloat(state, { actorId, at = state.time } = {}) {
  validateRosterMagicState(state);
  const mind = Object.values(state.identity.minds).find(row => row.actorId === actorId);
  if (!mind) magicFail('MAGIC_HOST_ACTOR');
  const sourceBodyId = bodyForMind(state.identity, mind.id);
  if (!sourceBodyId) magicFail('MAGIC_HOST_ACTOR');
  const effects = state.effects.filter(effect => effect.status === 'active'
    && effect.event.operation === 'self-float' && effect.event.definitionRef === 'hanna:basic@1'
    && effect.event.sourceMindId === mind.id
    && effect.sourceBodyId === sourceBodyId && effect.event.targetId === sourceBodyId);
  if (!effects.length) magicFail('MAGIC_LIFECYCLE_TARGET');
  const next = settleMagicLifecycle(state, { at, dismiss: effects.map(effect => effect.id) });
  return { state: next, effectIds: effects.map(effect => effect.id) };
}
/** Owner-ended basic body-strengthened state. Same lifecycle dismissal as
 * self-float; no duration, force rating or object movement is invented. */
export function settleOwnedStrength(state, { actorId, at = state.time } = {}) {
  validateRosterMagicState(state);
  const mind = Object.values(state.identity.minds).find(row => row.actorId === actorId);
  if (!mind) magicFail('MAGIC_HOST_ACTOR');
  const sourceBodyId = bodyForMind(state.identity, mind.id);
  if (!sourceBodyId) magicFail('MAGIC_HOST_ACTOR');
  const effects = state.effects.filter(effect => effect.status === 'active'
    && effect.event.operation === 'strength' && effect.event.definitionRef === 'sherry:basic@1'
    && effect.event.sourceMindId === mind.id
    && effect.sourceBodyId === sourceBodyId && effect.event.targetId === sourceBodyId);
  if (!effects.length) magicFail('MAGIC_LIFECYCLE_TARGET');
  const next = settleMagicLifecycle(state, { at, dismiss: effects.map(effect => effect.id) });
  return { state: next, effectIds: effects.map(effect => effect.id) };
}
export function magicOwnerSignals(state, mindId) {
  const active = new Set(activeMagicEffects(state).map(row => row.id));
  return {
    sounds: state.signals.filter(row => row.at <= state.time && row.audienceMindIds.includes(mindId)),
    representations: state.representations.filter(row => row.ownerMindId === mindId && active.has(row.sourceEffectId)),
    constraints: state.constraints.filter(row => row.ownerMindId === mindId && active.has(row.sourceEffectId))
      .map(row => ({ kind: row.kind, focusRef: row.focusRef, actionRef: row.actionRef, playerFeedbackRequired: row.playerFeedbackRequired })),
  };
}

/** Optional shared-SQLite append repository. No own connection/transaction,
 * no mutation of DomainStore tables and no fake branch history. Parent must
 * append these rows inside its authoritative commit transaction. */
export class MagicRepository {
  #db;
  constructor(db) { if (!(db instanceof DatabaseSync)) magicFail('MAGIC_DATABASE_REQUIRED'); this.#db = db; }
  #transaction() { if (this.#db.isTransaction !== true) magicFail('MAGIC_TRANSACTION_REQUIRED'); }
  initialize() {
    this.#transaction();
    this.#db.exec(`CREATE TABLE IF NOT EXISTS host_magic_commits_v2 (
      branch_id TEXT NOT NULL, commit_ref TEXT NOT NULL, request_id TEXT NOT NULL,
      expected_head TEXT NOT NULL, command_hash TEXT NOT NULL, receipt_json TEXT NOT NULL,
      events_json TEXT NOT NULL, projection_json TEXT NOT NULL,
      PRIMARY KEY(branch_id, request_id), UNIQUE(branch_id, commit_ref));
      CREATE TRIGGER IF NOT EXISTS host_magic_v2_no_update BEFORE UPDATE ON host_magic_commits_v2 BEGIN SELECT RAISE(ABORT,'MAGIC_IMMUTABLE'); END;
      CREATE TRIGGER IF NOT EXISTS host_magic_v2_no_delete BEFORE DELETE ON host_magic_commits_v2 BEGIN SELECT RAISE(ABORT,'MAGIC_IMMUTABLE'); END;
      CREATE TRIGGER IF NOT EXISTS host_magic_v2_no_replace BEFORE INSERT ON host_magic_commits_v2
      WHEN EXISTS (SELECT 1 FROM host_magic_commits_v2 WHERE branch_id=NEW.branch_id AND (request_id=NEW.request_id OR commit_ref=NEW.commit_ref))
      BEGIN SELECT RAISE(ABORT,'MAGIC_IMMUTABLE'); END;`);
  }
  /** Exact causal ancestor only: never the newest row on a reused v1 branch.
   * Join run and branch identity through immutable Domain commits so a load,
   * root restart or abandoned future cannot lend another projection. */
  readAt({ commitRef, runId }) {
    if (![commitRef, runId].every(magicId)) magicFail('MAGIC_REPOSITORY_ID');
    const row = this.#db.prepare(`WITH RECURSIVE history AS (
      SELECT commit_ref,parent_commit_ref,run_id,branch_id,0 AS depth FROM domain_commits WHERE commit_ref=? AND run_id=?
      UNION ALL SELECT c.commit_ref,c.parent_commit_ref,c.run_id,c.branch_id,h.depth+1 FROM domain_commits c
        JOIN history h ON c.commit_ref=h.parent_commit_ref WHERE c.run_id=? AND h.depth<4096
    ) SELECT m.* FROM history h JOIN host_magic_commits_v2 m ON m.commit_ref=h.commit_ref AND m.branch_id=h.branch_id
      ORDER BY h.depth LIMIT 1`).get(commitRef, runId, runId);
    if (!row) return null;
    const state = JSON.parse(row.projection_json);
    validateRosterMagicState(state);
    if (state.branchId !== row.branch_id || state.headCommitRef !== row.expected_head) magicFail('MAGIC_REPOSITORY_BOUNDARY');
    return { commitRef: row.commit_ref, expectedHead: row.expected_head, commandHash: row.command_hash,
      receipt: JSON.parse(row.receipt_json), events: JSON.parse(row.events_json), state };
  }
  read(branchId, requestId) {
    if (![branchId, requestId].every(magicId)) magicFail('MAGIC_REPOSITORY_ID');
    const row = this.#db.prepare('SELECT command_hash,receipt_json,events_json,projection_json FROM host_magic_commits_v2 WHERE branch_id=? AND request_id=?').get(branchId, requestId);
    return row ? { commandHash: row.command_hash, receipt: JSON.parse(row.receipt_json), events: JSON.parse(row.events_json), state: JSON.parse(row.projection_json) } : null;
  }
  append({ branchId, commitRef, expectedHead, command, result }) {
    this.#transaction();
    command = magicJson(command); result = magicJson(result);
    if (![branchId, commitRef, expectedHead, command.useId].every(magicId) || result.state?.branchId !== branchId
      || result.state?.headCommitRef !== expectedHead || result.receipt?.useId !== command.useId) magicFail('MAGIC_REPOSITORY_BOUNDARY');
    const commandHash = abilityDigest(command); const old = this.read(branchId, command.useId);
    if (old) { if (old.commandHash !== commandHash) magicFail('MAGIC_IDEMPOTENCY_CONFLICT'); return old; }
    // If used with the real Domain authority, the just-published commit must
    // be the exact child of this projection's execution source. Standalone
    // protocol fixtures intentionally do not create the Domain schema.
    if (this.#db.prepare("SELECT 1 FROM sqlite_schema WHERE type='table' AND name='domain_commits'").get()) {
      const commit = this.#db.prepare('SELECT branch_id,previous_execution_ref FROM domain_commits WHERE commit_ref=?').get(commitRef);
      if (!commit || commit.branch_id !== branchId || commit.previous_execution_ref !== expectedHead) magicFail('MAGIC_REPOSITORY_BOUNDARY');
    }
    this.#db.prepare('INSERT INTO host_magic_commits_v2 VALUES (?,?,?,?,?,?,?,?)').run(branchId, commitRef, command.useId,
      expectedHead, commandHash, canonicalMagicJson(result.receipt), canonicalMagicJson(result.events), canonicalMagicJson(result.state));
    return { commandHash, receipt: result.receipt, events: result.events, state: result.state };
  }
}
const canonicalMagicJson = value => JSON.stringify(magicJson(value));


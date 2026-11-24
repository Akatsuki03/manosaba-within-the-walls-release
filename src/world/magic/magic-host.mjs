import { isDeepStrictEqual } from 'node:util';
import { runtimeCapabilityId } from '../../content/runtime-capabilities.mjs';
import { actorForState, actorsForState, createdPlayerId, CREATED_ROOMS } from '../../creation/player-setup.mjs';
import { runtimeRoom, runtimeSetRoom, runtimeRecognizedActors, runtimePhysicalRoom, runtimeBodyActorId, runtimeActive, occupiedBodyWorld, runtimeSwapOptions } from '../../case-runtime.mjs';
import { actorObservationId } from '../../characters/observation-identity.mjs';
import { runtimeRevisionForState } from '../../content/content-revisions.mjs';
import { usesBunkSettingV2, v2OpeningKnowledge } from '../prison-bunks-v2.mjs';
import { prisonClock } from '../prison-activity.mjs';
import { createRosterMagicState, createActorMagicGrant, recordMagicKnowledge, knownMagicActions,
  authorizeMagicHandle, executeMagicCommand, validateRosterMagicState, verifiedAbilityVisits } from './ability-runtime.mjs';
import { createMagicIdentity, bodyForMind, validateMagicIdentity, grantMatchesIdentity } from './magic-identity.mjs';
import { assertApprovedBodyFactorPolicy, BODY_FACTOR_POLICY_REFERENCE } from './magic-binding-policy.mjs';
import { projectMagicConstraints, reduceMagicEffect } from './magic-effects.mjs';
import { DomainStore, DURABLE_EXECUTION_REF } from '../domain-store.mjs';
import { requestMagicRewind } from './magic-timeline.mjs';
import { cardOpening } from '../../content/card-world.mjs';
import { abilityDigest, magicJson, magicId, magicDefinition, MAGIC_ROSTER, GENERAL_SPATIAL_SHIFT,
  APPROVED_SPATIAL_PRESET, approvedSpatialCreation, ISLAND_BOUNDARY } from './ability-definitions.mjs';

// HOST_ONLY adapter: never register these functions as HTTP/model tools. World,
// ownerSources and certificates are three different trust domains. Actor input
// is only the strict core command; certificates contain IDs, never facts=true.
export const HOST_MAGIC_REF = 'shared-world-magic-host@1';
const rooms = { ...CREATED_ROOMS, court: '审判庭', infirmary: '医务室' };
/** Shared native consumers for a Domain-rederived generic plan. This function
 * does not authenticate the plan or issue a grant; Domain compares full delta. */
function consumeNativeSound(text, audienceIds, emit) {
  if(typeof text!=='string'||!audienceIds.length||new Set(audienceIds).size!==audienceIds.length)fail('MAGIC_HOST_OWNER_SOURCE');
  for(const actorId of audienceIds)emit(actorId,text);
}
function consumeNativeRelocation(state, actorId, destination) {
  const inventory=Object.values(state.caseRuntime.objects).filter(o=>o.holderId===runtimeBodyActorId(state,actorId)&&o.destroyedAt===undefined).map(o=>[o.id,o.holderId]);
  if(!runtimeSetRoom(state,actorId,destination))gated('runtime-room-setter');
  if(state.agentWorld)state.agentWorld.routes=state.agentWorld.routes.filter(row=>row.actorId!==actorId);
  if(inventory.some(([id,holder])=>state.caseRuntime.objects[id]?.holderId!==holder))fail('MAGIC_HOST_WORLD_DIVERGENCE');
}
export function applyCustomAbilityWorld(state, plan, sourceBodies = {}) {
  if (!state.customAbilitySetup || !state.caseRuntime || plan.status !== 'planned') fail('CUSTOM_ABILITY_NOT_READY');
  const next = structuredClone(state), actor = createdPlayerId(state);
  for (const effect of plan.obligations) {
    if (effect.sourceMindId !== `mind:${actor}` || effect.sourceBodyId !== `body:${runtimeBodyActorId(state, actor)}`) fail('CUSTOM_ABILITY_NOT_READY');
    const local = location => actorsForState(next).filter(a => a.id !== 'warden' && runtimeActive(next, a.id) && runtimeRoom(next, a.id) === location).map(a => a.id);
    if (effect.operation === 'sound-replay') {
      const source = sourceBodies[effect.targetId]; if (!source || source.channel !== 'hearing' || source.owner_id !== actor) fail('CUSTOM_ABILITY_SOURCE');
      const audienceIds = local(runtimeRoom(next, actor));
      if (!isDeepStrictEqual([...effect.payload.audienceMindIds].sort(), audienceIds.map(id => `mind:${id}`).sort())) fail('CUSTOM_ABILITY_SOURCE');
      consumeNativeSound(source.text,audienceIds,(owner,text)=>next.entries.push({ id: `entry-${next.entries.length + 1}`, observationKey: `generic:${effect.id}:${owner}`, speaker: runtimeRecognizedActors(next,owner).has(actor)?actorForState(next, actor).name:actorForState(next,actor).appearance,
        speakerId: actor, text, delivery: 'speech', audienceIds:[owner], occurredAt: next.worldTime,
        customAbilityEvent: { version: 1, effectId: effect.id, sourceObservationId: source.id } }));
      next.caseRuntime.signals.push({ id: `generic:${effect.id}`, kind: 'sound-replay', room: runtimeRoom(next, actor), occurredAt: next.worldTime, sourceEffectId: effect.id });
    } else if (effect.operation === 'spatial-shift') {
      const before = runtimeRoom(next, actor), departure = local(before);
      consumeNativeRelocation(next,actor,effect.targetId);
      const emit=(owner,text,suffix)=>next.entries.push({id:`entry-${next.entries.length+1}`,observationKey:`generic:${effect.id}:${owner}:${suffix}`,
        speaker:runtimeRecognizedActors(next,owner).has(actor)?actorForState(next,actor).name:actorForState(next,actor).appearance,
        speakerId:actor,text,delivery:'action',audienceIds:[owner],occurredAt:next.worldTime,customAbilityEvent:{version:1,effectId:effect.id}});
      emit(actor,`你实际来到${rooms[effect.targetId]}。`,'arrival');
      for(const owner of departure.filter(id=>id!==actor))emit(owner,'眼前的人影从原处消失。','departure');
      for(const owner of local(effect.targetId).filter(id=>id!==actor))emit(owner,'近处实际出现一个身影。','appearance');
    } else fail('CUSTOM_ABILITY_NOT_READY');
  }
  next.revision++; return next;
}
const own = (value, key) => Object.hasOwn(value || {}, key) ? value[key] : undefined;
const mindOf = (magic, actorId) => Object.values(magic.identity.minds).find(row => row.actorId === actorId)?.id;
const fail = (code, requiredHook) => {
  throw Object.assign(new Error('魔法宿主依据不足或尚缺共享世界规则接口；当前世界保持不变。'),
    { code, ...(requiredHook ? { requiredHook } : {}), disposition: 'pause-without-world-commit' });
};
const gated = hook => fail('MAGIC_HOST_RULE_GATED', hook);
const entries = state => [...(state.entries || []), ...(state.agentAutonomy?.events || [])];
// `magic` is the parent's private execution projection, not an extra authority
// inside a Domain world snapshot. Persist it with MagicRepository in the SAME
// transaction and attach it transiently when using this adapter.
const domainWorld = state => { const { magic, ...world } = state; return world; };
const fatal = condition => ['dead', 'executed'].includes(typeof condition === 'string' ? condition : condition?.status);
const boundary = magic => ({ branchId: magic.branchId, headCommitRef: magic.headCommitRef, generation: magic.generation });
const worldFingerprint = state => abilityDigest(domainWorld(state));
const occupiedProjections = new WeakSet();
function stateBoundary(state, magic) {
  validateRosterMagicState(magic);
  if (state.exampleId !== 'agent' || state.generation !== magic.generation || state.worldTime !== magic.time
    || magic.host?.ref !== HOST_MAGIC_REF || magic.host.revision !== state.revision
    || magic.host.worldFingerprint !== worldFingerprint(state)) fail('MAGIC_HOST_STALE_WORLD');
  if (!state.caseRuntime || state.creation?.scenarioId || state.caseOne && state.storyArc?.status !== 'aftermath') gated('shared-case-world-adapter');
  if (state.caseRuntime?.occupiedBody) {
    if (!occupiedProjections.has(magic) || !isDeepStrictEqual(state.caseRuntime.occupiedBody, occupiedBodyWorld(magic.identity))) gated('authenticated-occupied-body-world');
  } else if (Object.entries(magic.identity.occupants).some(([bodyId, mindId]) => magic.identity.bodies[bodyId].actorId !== magic.identity.minds[mindId].actorId)) gated('mind-body-world-control-perception-inventory');
}
function currentBodyRows(state) {
  const objects = state.caseRuntime?.objects || {};
  return actorsForState(state).filter(actor => actor.id !== 'warden').map(actor => {
    const condition = own(state.caseRuntime?.conditionsByActor, actor.id);
    const incident = state.caseRuntime?.incidents?.find(row => row.victimId === actor.id);
    const room = runtimePhysicalRoom(state, actor.id) || incident?.room;
    const alive = !fatal(condition) && !state.caseRuntime?.executedIds?.includes(actor.id)
      && !state.caseOne?.executedIds?.includes(actor.id) && !incident
      && !(actor.id === 'hiro' && state.hiroStatus && state.hiroStatus !== 'alive');
    // Unavailable bodies may be retained for audit, never offered as targets.
    const locationId = room || 'unavailable';
    if (alive && locationId === 'unavailable') gated('actual-unavailable-body-location');
    return { actorId: actor.id, locationId, islandId: ISLAND_BOUNDARY.islandId, alive,
      injuries: magicJson(typeof condition === 'object' && condition?.injuries || []),
      inventory: Object.values(objects).filter(row => row.holderId === actor.id && row.destroyedAt === undefined).map(row => row.id) };
  });
}
function currentEntities(state) {
  const result = Object.keys(rooms).map(id => ({ id, kind: 'location', islandId: ISLAND_BOUNDARY.islandId }));
  for (const item of Object.values(state.caseRuntime.objects)) {
    if (item.destroyedAt !== undefined) continue;
    const locationId = item.holderId ? runtimePhysicalRoom(state, item.holderId) : item.room;
    if (!locationId) continue;
    const physical = item.physical || {};
    result.push({ id: item.id, kind: 'item', locationId,
      ...(item.holderId ? { heldByBodyId: `body:${item.holderId}` } : {}),
      ...Object.fromEntries(['material', 'phase', 'combustible', 'containedInBody', 'burning', 'damage', 'representationRef', 'creatorMindId']
        .filter(key => Object.hasOwn(physical, key)).map(key => [key, physical[key]])) });
  }
  return result;
}

// Reviewed owner-local setup positions in the pinned scenario, NOT regex
// extraction from a card, public introduction, biography or actor command.
const initialKnowledgeIndex = Object.freeze({ hiro: 3, anan: 2, noah: 2, leia: 2, milia: 2,
  margo: 2, nanoka: 2, alisa: 2, sherry: 3, hanna: 2, coco: 2, meruru: 3 });
/** New root or explicitly confirmed private HOST activation only. Bindings
 * are reviewed per actor; no name-based or implicit mind/body default. An
 * activationRef must be verified against the parent's current transaction,
 * and never certifies an earlier waking event or retrofits an old save. */
export function initializeHostMagic(state, { scope, bindings, approvedBy, setupRef, domainStore, activationRef,
  initializationProof, bindingPolicy, initialKnowledgeSources, nativeOnly = false } = {}) {
  state = magicJson(state);
  // Later new-game roots use the global monotonically increasing revision.
  // Only the real Domain commit may prove such a root, never a caller boolean.
  const root = domainStore?.assertHead?.(state);
  const rootProven = root && ['initial', 'new_game'].includes(root.kind) && root.commit_ref === scope?.commitRef;
  const activationProven = root && magicId(activationRef) && root.commit_ref === scope?.commitRef
    && (domainStore?.assertMagicActivation?.(activationRef, state) === true);
  // A current committed head may be legally initialized for ordinary text
  // without persisting an activation boundary. This is a Host-only proof over
  // the exact head/scope; it is never accepted from text or the model.
  const initializationProven = root && root.commit_ref === scope?.commitRef
    && initializationProof && domainStore?.assertMagicInitialization?.(initializationProof, state) === true;
  if (state.exampleId !== 'agent' || state.magic
    || (state.revision !== 0 && !rootProven && !activationProven && !initializationProven)
    || (state.turnIds?.length && !activationProven && !initializationProven)
    || !state.caseRuntime || !magicId(approvedBy) || !magicId(setupRef)
    || !magicId(scope?.branchId) || !magicId(scope?.commitRef) || scope.generation !== state.generation
    || scope.revision !== state.revision) fail('MAGIC_HOST_INITIALIZATION_REQUIRED');
  const compiled = bindingPolicy === undefined ? null : assertApprovedBodyFactorPolicy(bindingPolicy);
  if (compiled && (approvedBy !== compiled.approvedBy || setupRef !== compiled.ref || typeof initialKnowledgeSources !== 'function'))
    fail('MAGIC_GRANT_APPROVAL_REQUIRED');
  const actors = currentBodyRows(state); const entities = currentEntities(state);
  let magic = createRosterMagicState({ actors, playerActorId: createdPlayerId(state), entities,
    time: state.worldTime, branchId: scope.branchId, headCommitRef: scope.commitRef, generation: scope.generation });
  const approvals = Object.create(null); const grants = [];
  for (const actor of actors) {
    const roster = MAGIC_ROSTER.find(row => row.actorId === actor.actorId);
    const custom = actor.actorId === 'player' && !state.customAbilitySetup && approvedSpatialCreation(state.creation);
    if (nativeOnly && actor.actorId === 'player' && approvedSpatialCreation(state.creation)) continue;
    if (!roster && !custom) continue;
    const legacyBinding = own(bindings, actor.actorId);
    if (!compiled && !legacyBinding) fail('MAGIC_BINDING_DECISION_REQUIRED');
    for (const definitionRef of roster?.refs || [GENERAL_SPATIAL_SHIFT.ref]) {
      const definition = magicDefinition(definitionRef); const id = `grant:${actor.actorId}:${definition.stage}`;
      const reviewed = compiled && own(compiled.definitionBindings, definitionRef);
      if (compiled && (!reviewed || reviewed.actorId !== actor.actorId || reviewed.definitionFingerprint !== definition.fingerprint
        || reviewed.sourceFingerprint !== abilityDigest(definition.sources))) fail('MAGIC_GRANT_APPROVAL_REQUIRED');
      const binding = reviewed?.binding || legacyBinding;
      approvals[id] = { actorId: actor.actorId, definitionRef, binding: magicJson(binding), approvedBy,
        ...(compiled ? { bindingPolicy: magicJson(BODY_FACTOR_POLICY_REFERENCE) } : {}),
        sourceEventId: `setup-grant:${abilityDigest([setupRef, id]).slice(0, 40)}`,
        sourceFingerprint: abilityDigest(definition.sources),
        ...(custom ? { customApprovalRef: APPROVED_SPATIAL_PRESET.approval, characterHash: APPROVED_SPATIAL_PRESET.characterHash } : {}) };
    }
  }
  const issuance = { setupRef, identity: magic.identity, entities: magic.entities, approvals };
  for (const [id, approval] of Object.entries(approvals)) {
    const definition = magicDefinition(approval.definitionRef);
    grants.push(createActorMagicGrant({ id, actorId: approval.actorId, definitionRef: definition.ref,
      binding: approval.binding, source: definition.sources, stage: definition.stage, approvedBy }, issuance));
  }
  magic.grants = grants; magic.grantApprovals = magicJson(approvals);
  const runtime = runtimeRevisionForState(state);
  for (const actor of actorsForState(state)) {
    const index = own(initialKnowledgeIndex, actor.id);
    const sourceActor = runtime.actors.find(row => row.id === actor.id);
    const text = index === undefined ? undefined : (usesBunkSettingV2(state) ? v2OpeningKnowledge(sourceActor) : sourceActor?.initialKnowledge)?.[index];
    const definitionRef = actor.id === 'player' && approvedSpatialCreation(state.creation) ? GENERAL_SPATIAL_SHIFT.ref : `${actor.id}:basic@1`;
    if (!(text && actor.initialKnowledge.includes(text)) && definitionRef !== GENERAL_SPATIAL_SHIFT.ref) continue;
    if (!magic.grants.some(row => row.actorId === actor.id && row.definitionRef === definitionRef)) continue;
    // The new policy consumes an actual owner-authorized SQL recollection,
    // not just a matching string in a card. Historic v1 receipts stay exact.
    const source = compiled && definitionRef !== GENERAL_SPATIAL_SHIFT.ref
      ? initialKnowledgeSources(actor.id).filter(row => row.actorId === actor.id && row.text === text
        && row.channel === 'private_recollection' && row.occurredAt === 0 && row.learnedAt === 0
        && row.branchId === scope.branchId && row.generation === scope.generation && row.revision === scope.revision) : [];
    if (compiled && definitionRef !== GENERAL_SPATIAL_SHIFT.ref && source.length !== 1) fail('MAGIC_KNOWLEDGE_SOURCE');
    magic = recordMagicKnowledge(magic, { id: `known:${actor.id}:initial`, ownerMindId: mindOf(magic, actor.id), definitionRef,
      sourceEventId: source[0]?.id || `setup-knowledge:${abilityDigest([setupRef, actor.id, text || APPROVED_SPATIAL_PRESET.characterHash]).slice(0, 40)}`,
      at: state.worldTime, belief: 'known' });
  }
  magic.host = { ref: HOST_MAGIC_REF, setupRef, caseWitnessVersion: 1, revision: state.revision,
    worldFingerprint: worldFingerprint(state), ownerSourceRefs: {}, appliedUseIds: [],
    // A morning anchor exists only at a real committed new-game/initial root.
    // A later ordinary act must never be relabeled as a first waking; actual
    // wake events are still observed from entries by the lifecycle below.
    initialWaking: rootProven ? { generation: state.generation, revision: state.revision, at: state.worldTime } : null };
  validateRosterMagicState(magic); return magic;
}

/** Rebind a committed projection to the new Domain head after the parent's
 * shared-clock/world commit. Never use stale physical sidecars as authority. */
export function refreshHostMagic(state, magic, scope, { domainStore, sourceState = state } = {}) {
  magic = magicJson(magic); validateRosterMagicState(magic);
  if (!magicId(scope?.branchId) || !magicId(scope?.commitRef) || scope.generation !== state.generation || scope.revision !== state.revision
    || !state.caseRuntime) fail('MAGIC_HOST_STALE_WORLD');
  if (state.caseRuntime?.occupiedBody) {
    DomainStore.prototype.assertOccupiedBodyProjection.call(domainStore, state, magic, sourceState);
    occupiedProjections.add(magic);
  } else if (Object.entries(magic.identity.occupants).some(([bodyId, mindId]) => magic.identity.bodies[bodyId].actorId !== magic.identity.minds[mindId].actorId)) gated('mind-body-world-control-perception-inventory');
  for (const row of currentBodyRows(state)) {
    const body = magic.identity.bodies[`body:${row.actorId}`]; if (!body) fail('MAGIC_HOST_ROSTER_CHANGED');
    Object.assign(body, row);
  }
  // Physical location, injuries and custody are re-derived from the shared world.
  magic.entities = Object.fromEntries(currentEntities(state).map(row => [row.id, row]));
  magic.time = state.worldTime; magic.branchId = scope.branchId; magic.headCommitRef = scope.commitRef; magic.generation = scope.generation;
  magic.host = { ...magic.host, revision: state.revision, worldFingerprint: worldFingerprint(state), ownerSourceRefs: {} };
  validateRosterMagicState(magic); return magic;
}

/** Bind the committed projection onto a scene draft. Authentication uses the
 * committed state; the draft itself is not the domain head. */
export function attachNpcMagicProjection(state, plan, domainStore, magicRepository) {
  if (plan?.npcMagicCastVersion !== 1 || state?.magic || !domainStore || !magicRepository || state.exampleId !== 'agent') return null;
  const commit = domainStore.assertSnapshot(state);
  const saved = magicRepository.readAt({ commitRef: commit.commit_ref, runId: commit.run_id });
  if (!saved) return null;
  state.magic = refreshHostMagic(state, saved.state, { branchId: commit.branch_id, commitRef: commit.commit_ref,
    generation: state.generation, revision: state.revision }, { domainStore });
  return state.magic;
}

function ownerObservations(state, magic, actorId, ownerSources) {
  const supplied = [...(ownerSources?.observations || []), ...(ownerSources?.sourceObservations || []),
    ...(ownerSources?.recentObservations || []), ...(ownerSources?.requiredObservations || [])];
  if (supplied.length > 512) fail('MAGIC_HOST_SOURCE_BUDGET');
  const unique = new Map();
  for (const row of supplied) {
    if (!magicId(row.id) || row.actorId !== actorId || row.branchId !== magic.branchId
      || row.generation !== state.generation || row.revision !== state.revision
      || !Number.isSafeInteger(row.learnedAt) || row.learnedAt > state.worldTime || row.learnedAt < 0
      || !Number.isSafeInteger(row.occurredAt) || row.occurredAt < 0 || row.occurredAt > row.learnedAt) fail('MAGIC_HOST_OWNER_SOURCE');
    const prior = unique.get(row.id); if (prior && !isDeepStrictEqual(prior, row)) fail('MAGIC_HOST_OWNER_SOURCE');
    unique.set(row.id, row);
  }
  return [...unique.values()];
}
function ownedHearingEntries(state, actorId, wanted) {
  const byId = new Map();
  if (!wanted.size) return byId;
  for (const entry of entries(state)) {
    if (!entry.observationKey || !entry.audienceIds?.includes(actorId) || !(entry.occurredAt <= state.worldTime)) continue;
    const id = actorObservationId(state, entry.observationKey, actorId);
    if (!wanted.has(id)) continue;
    const matches = byId.get(id) ?? [];
    matches.push(entry); byId.set(id, matches);
  }
  return byId;
}
function hydrateSources(state, magic, actorId, ownerSources) {
  const authenticated = occupiedProjections.has(magic);
  magic = magicJson(magic);
  if (authenticated) occupiedProjections.add(magic);
  const ownerMindId = mindOf(magic, actorId); if (!ownerMindId) fail('MAGIC_HOST_ACTOR');
  // Every call re-authorizes this owner's current source lane. A previously
  // heard sound revoked by Domain cannot survive as a cached handle.
  for (const [ref, source] of Object.entries(magic.host.ownerSourceRefs)) if (source.actorId === actorId) delete magic.host.ownerSourceRefs[ref];
  const heard = ownerObservations(state, magic, actorId, ownerSources).filter(row => row.channel === 'hearing');
  // Rebuild from the current owner view on each call. Keep the original first
  // exact matching entry (even a non-speech entry), and verify body/time below.
  const delivered = ownedHearingEntries(state, actorId, new Set(heard.map(row => row.id)));
  for (const row of heard) {
    const event = delivered.get(row.id)?.find(entry => (entry.textByActor?.[actorId] || entry.text) === row.text
      && entry.occurredAt === row.occurredAt);
    if (!event || event.delivery !== 'speech') continue;
    const id = `heard:${abilityDigest([ownerMindId, row.id]).slice(0, 40)}`;
    const representationRef = `heard-representation:${abilityDigest([row.id, event.observationKey, row.text]).slice(0, 40)}`;
    const old = own(magic.observations, id);
    if (old && (old.ownerMindId !== ownerMindId || old.representationRef !== representationRef)) fail('MAGIC_HOST_OWNER_SOURCE');
    magic.observations[id] = { id, ownerMindId, channel: 'sound', at: row.learnedAt,
      targetId: event.speakerId && magic.identity.bodies[`body:${event.speakerId}`] ? `body:${event.speakerId}` : bodyForMind(magic.identity, ownerMindId),
      representationRef };
    magic.host.ownerSourceRefs[representationRef] = { observationId: row.id, actorId, eventKey: event.observationKey, learnedAt: row.learnedAt };
  }
  return magic;
}
// The rejected raw-retrieval proof implementation is deliberately removed.
// In particular, appending shape-correct hostMagicEvent entries cannot amend
// a committed snapshot or establish consent. No caller object is an authority.
/** Withdrawn raw-retrieval API: intentionally fails closed. Real acquisition
 * now enters DomainStore.runMemoryChannel and the actual engine cast consumer.
 * A raw retrieval/JSON receipt is never effect authority or in-world consent. */
export function authorizeHostMemorySources(state, { domainStore, db, actorId, ownerSources, ownerRetrievals = [], knownRecordRefs = [] } = {}) {
  // DomainStore currently exposes neither its private connection identity nor
  // a transaction-scoped memory authority. A typed instance and matching SQL
  // head cannot prove either invariant. Do not mint even a fixture happy-path
  // proof until the Domain owner implements the actual private authority.
  gated('domain-private-memory-transaction-authority');
}
const channelSources = new WeakMap();
function memorySources(state, magic, actorId, ownerSources, required = false) {
  const channel = channelSources.get(ownerSources);
  if (channel && channel.actorId === actorId) return channel.records;
  if (required) gated('domain-owner-memory-source-authorization');
  return null;
}
const token = (magic, ownerMindId, kind, entityId) => `magic-${abilityDigest([boundary(magic), magic.time, ownerMindId, kind, entityId]).slice(0, 40)}`;
const recordToken = (magic, actorId, record) => token(magic, mindOf(magic, actorId), 'memory-record', `${record.ownerId}/${record.id}`);
function memoryLabels(state, magic, actorId, records) {
  const targets = handlesFor(state, magic, actorId).handles;
  return records.filter(record => targets.some(target => target.entityId === `body:${record.ownerId}`)).map(record => ({
    handle: recordToken(magic, actorId, record), kind: 'memory-record', label: record.accessible ? '已交付的本人来源记忆' : '已知但暂不可访问的记忆引用',
    ownerTargetHandle: targets.find(target => target.entityId === `body:${record.ownerId}`).handle,
    access: record.accessible ? 'delivered' : 'temporarily-blocked' }));
}
function handlesFor(state, magic, actorId) {
  const ownerMindId = mindOf(magic, actorId); const bodyId = bodyForMind(magic.identity, ownerMindId);
  const body = magic.identity.bodies[bodyId]; if (!body) fail('MAGIC_HOST_ACTOR');
  const handles = []; const labels = [];
  const add = (kind, entityId, sourceEventId, mode, label) => {
    const handle = token(magic, ownerMindId, kind, entityId);
    handles.push(authorizeMagicHandle(magic, { handle, ownerMindId, kind, entityId, sourceEventId, verifiedAt: magic.time, mode }));
    labels.push({ handle, kind, label });
  };
  const recognized = runtimeRecognizedActors(state, actorId); const roster = actorsForState(state);
  for (const target of Object.values(magic.identity.bodies)) if (target.id === bodyId
    || target.alive && target.locationId === body.locationId && target.actorId !== 'warden' && target.locationId !== 'unavailable') {
    const actor = roster.find(row => row.id === target.actorId);
    add('body', target.id, `current-view:${abilityDigest([boundary(magic), actorId, target.id]).slice(0, 32)}`, 'visible',
      target.id === bodyId ? '本人身体' : recognized.has(target.actorId) ? actor.name : actor.appearance);
  }
  for (const target of Object.values(magic.entities)) {
    if (target.kind === 'location' && target.id === body.locationId) add('location', target.id,
      `current-room:${abilityDigest([actorId, target.id, boundary(magic)]).slice(0, 32)}`, 'visible', rooms[target.id]);
    if (target.kind === 'item' && target.locationId === body.locationId) {
      const item = state.caseRuntime.objects[target.id];
      if (item.magicHidden === true) continue;
      if (item.visibility === 'private' && item.holderId !== runtimeBodyActorId(state, actorId)) continue;
      if (item.visibility !== 'public' && item.holderId !== runtimeBodyActorId(state, actorId)) continue;
      add('item', target.id, `current-item:${abilityDigest([actorId, target.id, item.custodyVersion ?? 0, boundary(magic)]).slice(0, 32)}`, 'visible', item.name);
    }
  }
  if (actorId === createdPlayerId(state) && approvedSpatialCreation(state.creation)) {
    for (const visit of verifiedAbilityVisits(state)) if (visit.room !== body.locationId && magic.entities[visit.room]?.kind === 'location') {
      add('location', visit.room, `visited:${abilityDigest(visit.source).slice(0, 40)}`, 'personally-familiar', rooms[visit.room]);
    }
  }
  for (const observation of Object.values(magic.observations)) if (observation.ownerMindId === ownerMindId
    && observation.channel === 'sound' && magic.host.ownerSourceRefs[observation.representationRef]) {
    add('observation', observation.id, observation.id, 'heard-source', '本人已听到的声音');
    labels.at(-1).sourceObservationId = magic.host.ownerSourceRefs[observation.representationRef].observationId;
  }
  return { handles, labels };
}

function selectedMemoryRecords(magic, actorId, command, records) {
  if (!command.parameters || Object.keys(command.parameters).length !== 1 || !Object.hasOwn(command.parameters, 'recordIds')
    || !Array.isArray(command.parameters.recordIds) || !command.parameters.recordIds.length || command.parameters.recordIds.length > 128
    || new Set(command.parameters.recordIds).size !== command.parameters.recordIds.length) fail('MAGIC_PARAMETER_SCHEMA');
  const selected = command.parameters.recordIds.map(handle => records.find(record => recordToken(magic, actorId, record) === handle));
  if (selected.some(row => !row)) fail('MAGIC_MEMORY_PERMISSION');
  // Core/publication IDs remain genuine SQL IDs, never actor-supplied strings.
  if (new Set(selected.map(row => row.id)).size !== selected.length) fail('MAGIC_MEMORY_PERMISSION');
  return selected;
}
function memoryConditions(state, magic, actorId, command, ownerSources, refs, target, facts) {
  const channel = channelSources.get(ownerSources);
  if (!channel || channel.actorId !== actorId) gated('engine-settled-memory-consent-receipt');
  // Milia awakened is unconditional. This proof is technical source/effect
  // authority, NOT an invented source offer, willingness or caster knowledge.
  facts.memoryRecordIdsAuthorized = channel.records.map(row => row.id);
  facts.localMindIds = [...new Set([...channel.law.sourceActorIds, ...channel.law.recipientActorIds].map(id => mindOf(magic, id)))];
  facts.endsAt = channel.law.endsAt;
  facts.authorizationId = `memory-channel:${abilityDigest([channel.policyRef, channel.law.acquisitionRef, command.useId]).slice(0, 40)}`;
}

/** Parent delivers only these opaque tokens/actions to the actor. No body IDs,
 * grant approvals, source text, remote roster or full context is exposed. */
// Growth state/source/profile evidence is deliberately not part of this actor
// projection. A body enhancement alone cannot satisfy knownMagicActions: only
// independently acquired stable-mind knowledge can offer conscious intent.
export function hostMagicCapabilities(state, magic, actorId, ownerSources) {
  stateBoundary(state, magic); const hydrated = hydrateSources(state, magic, actorId, ownerSources);
  const records = memorySources(state, hydrated, actorId, ownerSources);
  const actions = knownMagicActions(hydrated, actorId).map(action => {
    const operation = magicDefinition(action.definitionRef).operation;
    const executable = executableOperations.has(operation) || memoryOperations.has(operation) && records !== null;
    // Basic swap uses the independently versioned settled-contact engine
    // lifecycle, never the legacy numeric-expiry cast facade.
    return { ...action, executable, ...(!executable ? { gate: 'technical-rule-gated',
      ...(operation === 'body-swap' && state.caseRuntime.swapLifecycle ? { requiredHook: 'settled-swap-lifecycle-engine-entry' }
        : memoryOperations.has(operation) ? { requiredHook: 'domain-owner-memory-source-authorization' } : {}) } : {}) };
  });
  return { actions, targets: [...handlesFor(state, hydrated, actorId).labels,
    ...(records ? memoryLabels(state, hydrated, actorId, records) : [])] };
}
/** HOST-ONLY handle ownership. The public capability projection carries only
 * opaque handles and labels; downstream host code must use this map to bind a
 * chosen handle to its exact entity before selecting a body/patient. Never
 * serialize this map into a model packet, transcript or public result. */
export function hostMagicTargetEntities(state, magic, actorId, ownerSources) {
  stateBoundary(state, magic);
  const hydrated = hydrateSources(state, magic, actorId, ownerSources);
  return new Map(handlesFor(state, hydrated, actorId).handles.map(row => [row.handle, row.entityId]));
}
/** View-only affordance. The current mind must own an active self-float on
 * its current body; no effect id or raw magic crosses the player view. */
export function ownedSelfFloatEnd(magic, actorId) {
  if (!magic?.identity || !Array.isArray(magic.effects)) return null;
  const mind = Object.values(magic.identity.minds).find(row => row.actorId === actorId);
  const bodyId = mind && bodyForMind(magic.identity, mind.id);
  const effect = bodyId && magic.effects.find(row => row.status === 'active'
    && row.event.operation === 'self-float' && row.event.definitionRef === 'hanna:basic@1'
    && row.event.sourceMindId === mind.id && row.sourceBodyId === bodyId && row.event.targetId === bodyId);
  return effect ? { label: '停止飘浮' } : null;
}
/** View-only affordance for the owner's active basic strength state. */
export function ownedStrengthEnd(magic, actorId) {
  if (!magic?.identity || !Array.isArray(magic.effects)) return null;
  const mind = Object.values(magic.identity.minds).find(row => row.actorId === actorId);
  const bodyId = mind && bodyForMind(magic.identity, mind.id);
  const effect = bodyId && magic.effects.find(row => row.status === 'active'
    && row.event.operation === 'strength' && row.event.definitionRef === 'sherry:basic@1'
    && row.event.sourceMindId === mind.id && row.sourceBodyId === bodyId && row.event.targetId === bodyId);
  return effect ? { label: '停止怪力' } : null;
}
/** New-job-pin-only actual landing observations. This runs while state.magic is
 * still the before frame and only after the host lifecycle actually ended the
 * owner's current self-float. It reports observed postures, never the ability's
 * name, numeric height or a model-authored fact. */
export function hostSelfFloatEndEntries(state, actorId, ended, useId, observationVersion = 1) {
  const magic = state?.magic;
  if (!magic?.identity || !Array.isArray(magic.effects) || !Array.isArray(ended?.effectIds)) return [];
  const mind = Object.values(magic.identity.minds).find(row => row.actorId === actorId);
  const bodyId = mind && bodyForMind(magic.identity, mind.id);
  const sourceBody = bodyId && magic.identity.bodies[bodyId];
  if (!mind || !bodyId || !sourceBody?.alive) return [];
  const effect = magic.effects.find(row => ended.effectIds.includes(row.id) && row.status === 'active'
    && row.event.operation === 'self-float' && row.event.definitionRef === 'hanna:basic@1'
    && row.event.sourceMindId === mind.id && row.sourceBodyId === bodyId && row.event.targetId === bodyId);
  if (!effect) return [];
  // Reuse of this pure helper may only report a landing when that same effect
  // is actually ended in the returned magic state and the source identity has
  // not moved. A fake effectIds list cannot manufacture an actual observation.
  if (!isDeepStrictEqual(ended.state?.identity, magic.identity)
    || !ended.state.effects?.some(row => row.id === effect.id && row.status === 'ended')) return [];
  const room = runtimeRoom(state, actorId);
  if (!room) return [];
  const roster = actorsForState(state);
  const source = roster.find(row => row.id === actorId);
  if (!source) return [];
  const label = owner => runtimeRecognizedActors(state, owner).has(actorId) ? source.name : source.appearance;
  const ownerIds = [actorId];
  for (const actor of roster) {
    if (actor.id === actorId || actor.id === 'warden') continue;
    const rowMind = Object.values(magic.identity.minds).find(row => row.actorId === actor.id);
    const rowBodyId = rowMind && bodyForMind(magic.identity, rowMind.id);
    if (!rowBodyId || !magic.identity.bodies[rowBodyId]?.alive || runtimeRoom(state, actor.id) !== room) continue;
    ownerIds.push(actor.id);
  }
  return ownerIds.map(owner => ({
    id: `magic-entry:${abilityDigest([useId, owner, 'landing']).slice(0, 32)}`,
    observationKey: `self-float-end:${useId}:${owner}:landing`,
    speaker: label(owner), speakerId: actorId,
    text: owner === actorId ? '你的身体重新落回原来的支撑面。' : '眼前的人身体重新落回原来的支撑面。',
    delivery: 'action', audienceIds: [owner], occurredAt: state.worldTime,
    ...(observationVersion === 2 ? { learnedAt: state.worldTime } : {}),
    magicObservation: { version: 1, kind: 'self-float-landing', effectId: effect.id,
      sourceMindId: mind.id, sourceBodyId: bodyId, channel: 'sight', lifecycle: 'ended' },
  }));
}
/** Actual end observations for the owner's basic strength state. No ability name,
 * force rating, duration or object movement is disclosed by ending it. */
export function hostStrengthEndEntries(state, actorId, ended, useId, observationVersion = 1) {
  const magic = state?.magic;
  if (!magic?.identity || !Array.isArray(magic.effects) || !Array.isArray(ended?.effectIds)) return [];
  const mind = Object.values(magic.identity.minds).find(row => row.actorId === actorId);
  const bodyId = mind && bodyForMind(magic.identity, mind.id);
  const sourceBody = bodyId && magic.identity.bodies[bodyId];
  if (!mind || !bodyId || !sourceBody?.alive) return [];
  const effect = magic.effects.find(row => ended.effectIds.includes(row.id) && row.status === 'active'
    && row.event.operation === 'strength' && row.event.definitionRef === 'sherry:basic@1'
    && row.event.sourceMindId === mind.id && row.sourceBodyId === bodyId && row.event.targetId === bodyId);
  if (!effect) return [];
  if (!isDeepStrictEqual(ended.state?.identity, magic.identity)
    || !ended.state.effects?.some(row => row.id === effect.id && row.status === 'ended')) return [];
  const room = runtimeRoom(state, actorId);
  if (!room) return [];
  const roster = actorsForState(state);
  const source = roster.find(row => row.id === actorId);
  if (!source) return [];
  const label = owner => runtimeRecognizedActors(state, owner).has(actorId) ? source.name : source.appearance;
  const ownerIds = [actorId];
  for (const actor of roster) {
    if (actor.id === actorId || actor.id === 'warden') continue;
    const rowMind = Object.values(magic.identity.minds).find(row => row.actorId === actor.id);
    const rowBodyId = rowMind && bodyForMind(magic.identity, rowMind.id);
    if (!rowBodyId || !magic.identity.bodies[rowBodyId]?.alive || runtimeRoom(state, actor.id) !== room) continue;
    ownerIds.push(actor.id);
  }
  return ownerIds.map(owner => ({
    id: `magic-entry:${abilityDigest([useId, owner, 'strength-end']).slice(0, 32)}`,
    observationKey: `strength-end:${useId}:${owner}:end`,
    speaker: label(owner), speakerId: actorId,
    text: owner === actorId ? '你的身体恢复正常发力与支撑的感觉。' : '眼前的人身体不再保持强化时的绷紧感。',
    delivery: 'action', audienceIds: [owner], occurredAt: state.worldTime,
    ...(observationVersion === 2 ? { learnedAt: state.worldTime } : {}),
    magicObservation: { version: 1, kind: 'strength-end', effectId: effect.id,
      sourceMindId: mind.id, sourceBodyId: bodyId, channel: 'sight', lifecycle: 'ended' },
  }));
}
const PLAYER_TEXT_OPERATIONS = new Set(['self-float', 'strength', 'ignite', 'spatial-shift', 'sound-replay']);
/** The ordinary text intent lane sees only host-issued handles, labels and
 * closed target kinds. No identity, effect, source text or raw magic crosses.
 * End is offered only while this mind/body really owns an active float. */
export function playerTextMagicOffer(state, magic, actorId, ownerSources, customCapabilities = null, swapCapabilities = null) {
  if (!state?.caseRuntime) return null;
  const actions = []; const targets = [];
  if (magic) {
    const capabilities = hostMagicCapabilities(state, magic, actorId, ownerSources);
    actions.push(...capabilities.actions.filter(action => action.executable === true
      && PLAYER_TEXT_OPERATIONS.has(magicDefinition(action.definitionRef)?.operation))
      .map(action => {
        const definition = magicDefinition(action.definitionRef);
        return { grantId: action.grantId, label: action.label, operation: definition.operation,
          targetKinds: [...definition.targetKinds] };
      }));
    // The swap action is executable only through the independent, already
    // settled swap lifecycle. A holding offer is the actual two-owner hand
    // contact; the generic magic executor is never used for it.
    const holding = swapCapabilities?.offers?.[0] || (!swapCapabilities ? (() => {
      const row = state.caseRuntime?.swapLifecycle?.offers?.find(offer => offer.status === 'holding'
        && offer.sourceId === actorId);
      const targetId = row?.targetId || runtimeSwapOptions(state, actorId).find(option => option.kind === 'swap-offer-hand')?.targetId;
      if (!targetId) return null;
      const target = actorForState(state, targetId);
      const handle = target && capabilities.targets.find(item => item.kind === 'body'
        && (item.label === target.name || item.label === target.appearance))?.handle;
      return handle ? { targetHandle: handle } : null;
    })() : null);
    const swapAction = holding && capabilities.actions.find(action =>
      magicDefinition(action.definitionRef)?.operation === 'body-swap');
    if (swapAction) {
      const definition = magicDefinition(swapAction.definitionRef);
      actions.push({ grantId: swapAction.grantId, label: swapAction.label, operation: 'body-swap',
        targetKinds: [...definition.targetKinds] });
      const target = capabilities.targets.find(row => row.handle === holding.targetHandle);
      targets.push(target ? { handle: target.handle, kind: target.kind, label: target.label }
        : { handle: holding.targetHandle, kind: 'body', label: '互换对象' });
    }
    targets.push(...capabilities.targets.filter(target => actions.some(action => action.operation !== 'body-swap' && action.targetKinds.includes(target.kind))
      && actions.some(action => !['self-float', 'strength'].includes(action.operation)
        || target.kind === 'body' && target.label === '本人身体'))
      .map(target => ({ handle: target.handle, kind: target.kind, label: target.label })));
  }
  const custom = customTextOffer(customCapabilities);
  if (custom) { actions.push(...custom.actions); targets.push(...custom.targets); }
  const swap = swapCapabilities?.relations?.length ? { actions: swapCapabilities.relations.map(row => ({
    swapAction: 'restore', relationHandle: row.handle, label: row.label })) } : null;
  const end = magic ? ownedSelfFloatEnd(magic, actorId) || ownedStrengthEnd(magic, actorId) : null;
  if (!actions.length && !swap) return end ? { version: 1, actions: [], targets: [], end: { label: end.label } } : null;
  if (actions.length && !targets.length && !swap) return null;
  return { version: 1, actions, targets, ...(custom ? { custom } : {}), ...(swap ? { swap } : {}),
    ...(end ? { end: { label: end.label } } : {}) };
}
const CUSTOM_TEXT_MECHANISMS = {
  'sound-reproduction': { operation: 'sound-replay', label: '重放本人实际听到的声音', targetKind: 'source' },
  'body-relocation': { operation: 'spatial-shift', label: '前往本人已到访的地点', targetKind: 'location' },
};
function customTextOffer(capabilities) {
  if (!capabilities || !Array.isArray(capabilities.actions) || !Array.isArray(capabilities.sources)
    || !Array.isArray(capabilities.destinations)) return null;
  const actions = capabilities.actions.flatMap(row => {
    const descriptor = CUSTOM_TEXT_MECHANISMS[row?.mechanism]; if (!descriptor) return [];
    return [{ customBinding: row.bindingHandle, label: descriptor.label, operation: descriptor.operation,
      targetKinds: [descriptor.targetKind] }];
  });
  const targets = [
    ...capabilities.sources.map(row => ({ handle: row.handle, kind: 'source', label: row.label })),
    ...capabilities.destinations.map(row => ({ handle: row.handle, kind: 'location', label: row.label })),
  ];
  return actions.length && targets.length ? { actions, targets } : null;
}
/** Validate a model-selected typed choice against the exact delivered menu.
 * Actual authorization, target reachability and effects are rechecked by the
 * existing HOST executor on the real act state. */
export function playerTextMagicChoice(offer, choice) {
  if (!offer || !choice || typeof choice !== 'object' || Array.isArray(choice)) return false;
  const keys = Reflect.ownKeys(choice);
  if (keys.length === 1 && keys[0] === 'end') return choice.end === true && Boolean(offer.end);
  if (keys.length === 2 && keys.includes('customBinding') && keys.includes('targetHandle')) {
    if (typeof choice.customBinding !== 'string' || typeof choice.targetHandle !== 'string') return false;
    const action = offer.custom?.actions?.find(row => row.customBinding === choice.customBinding);
    const target = offer.custom?.targets?.find(row => row.handle === choice.targetHandle);
    return Boolean(action && target && action.targetKinds.includes(target.kind));
  }
  if (keys.length === 2 && keys.includes('swapAction') && keys.includes('relationHandle')) {
    if (choice.swapAction !== 'restore' || typeof choice.relationHandle !== 'string') return false;
    return Boolean(offer.swap?.actions?.some(row => row.swapAction === 'restore'
      && row.relationHandle === choice.relationHandle));
  }
  if (keys.length !== 2 || !keys.includes('grantId') || !keys.includes('targetHandle')
    || typeof choice.grantId !== 'string' || typeof choice.targetHandle !== 'string') return false;
  const action = offer.actions?.find(row => row.grantId === choice.grantId);
  const target = offer.targets?.find(row => row.handle === choice.targetHandle);
  return Boolean(action && target && action.targetKinds.includes(target.kind)
    && (!['self-float', 'strength'].includes(action.operation) || target.label === '本人身体'));
}
const TEXT_CAST_OPERATIONS = new Set(['ignite', 'sound-replay', 'spatial-shift']);
/** Whole-sentence player entry only. A partial mention stays an ordinary act. */
export function matchPlayerMagicSentence(text, capabilities, actorId) {
  if (typeof text !== 'string' || !capabilities || typeof capabilities !== 'object' || Array.isArray(capabilities)) return null;
  const command = text.trim().replace(/[。！!？?]+$/u, '');
  if (!command) return null;
  if (command === '启用魔法') {
    if (capabilities.enabled === true) return { kind: 'clarify', message: '通用魔法已经启用。请用能力全名接一个当前可见目标，整句不要加别的话。没有再次施法。' };
    if (capabilities.available === true) return { kind: 'activate' };
    return { kind: 'clarify', message: '当前不能启用魔法。请先处理未决事务，并确认这是支持显式魔法的日常开局。世界没有改动。' };
  }
  if (capabilities.enabled !== true) {
    const own = MAGIC_ROSTER.find(row => row.actorId === actorId);
    const labels = own?.refs.map(ref => magicDefinition(ref)?.label).filter(label => typeof label === 'string' && label) || [];
    if (labels.some(label => command === label || command.startsWith(label))) {
      return { kind: 'clarify', message: '魔法尚未启用。请先启用魔法。没有施法。' };
    }
    return null;
  }
  if (command === '停止飘浮' || command === '停止漂浮' || command === '停止怪力') return { kind: 'end' };
  if (!Array.isArray(capabilities.actions)) return null;
  const actions = capabilities.actions.filter(action => action && typeof action.label === 'string' && action.label
    && typeof action.grantId === 'string' && typeof action.definitionRef === 'string');
  const candidates = actions.filter(action => command === action.label || command.startsWith(action.label));
  if (!candidates.length) return null;
  const longest = Math.max(...candidates.map(action => action.label.length));
  const matches = [];
  let ambiguous = false;
  let unmatched = false;
  for (const action of candidates.filter(row => row.label.length === longest)) {
    const rest = command.slice(action.label.length).replace(/^[\s\u3000]+/u, '');
    const definition = magicDefinition(action.definitionRef);
    if (!definition) continue;
    const targets = Array.isArray(capabilities.targets) ? capabilities.targets.filter(row => row
      && definition.targetKinds?.includes(row.kind) && typeof row.label === 'string' && row.label && typeof row.handle === 'string') : [];
    const named = targets.filter(row => row.label === rest);
    if (action.executable !== true || !TEXT_CAST_OPERATIONS.has(definition.operation)) {
      if (rest === '' || named.length) return { kind: 'clarify', message: `「${action.label}」现在不能只靠这一句话施放，世界没有改动。` };
      continue;
    }
    if (rest === '' && targets.length === 1) matches.push({ action, target: targets[0] });
    else if (rest === '' ) ambiguous = true;
    else if (named.length === 1) matches.push({ action, target: named[0] });
    else if (named.length > 1) ambiguous = true;
    else unmatched = true;
  }
  if (matches.length === 1 && !ambiguous) return { kind: 'cast', grantId: matches[0].action.grantId, definitionRef: matches[0].action.definitionRef, targetHandle: matches[0].target.handle };
  if (ambiguous || matches.length > 1) return { kind: 'clarify', message: '需要用能力全名配上一个当前可见目标，整句不能再加别的话。没有施法。' };
  if (unmatched) return { kind: 'clarify', message: '这句话里的目标不在当前可见范围内。没有施法。' };
  return null;
}
function certifiedEvents(state, magic, refs) {
  if (!Array.isArray(refs) || refs.length > 32 || new Set(refs).size !== refs.length || refs.some(id => !magicId(id))) fail('MAGIC_HOST_CERTIFICATE');
  return refs.map(id => {
    const entry = entries(state).find(row => row.hostMagicEvent?.id === id);
    const certificate = entry?.hostMagicEvent;
    if (entries(state).filter(row => row.hostMagicEvent?.id === id).length !== 1
      || !entry || !certificate || entry.occurredAt !== state.worldTime || certificate.at !== state.worldTime
      || certificate.branchId !== magic.branchId || certificate.headCommitRef !== magic.headCommitRef
      || certificate.generation !== state.generation || certificate.revision !== state.revision
      || !entry.observationKey || !['speech', 'action'].includes(entry.delivery)) fail('MAGIC_HOST_CERTIFICATE');
    return { ...magicJson(certificate), entry };
  });
}
/** Build private context from current world and ID references to typed HOST
 * events already in that world. No HTTP/actor supplied consent/contact flags,
 * arbitrary expiry, observed text, remote truth or RNG outcomes are accepted. */
export function buildHostMagicContext(state, magic, actorId, rawCommand, ownerSources, certificates = {}) {
  stateBoundary(state, magic);
  const command = magicJson(rawCommand);
  const commandKeys = ['type', 'useId', 'actorId', 'grantId', 'definitionRef', 'activation', 'targetHandle', 'parameters'];
  if (!command || Object.keys(command).length !== commandKeys.length || commandKeys.some(key => !Object.hasOwn(command, key))
    || command.type !== 'magic_cast' || !['intent', 'reaction'].includes(command.activation)
    || ![command.useId, command.actorId, command.grantId, command.definitionRef, command.targetHandle].every(magicId)
    || !command.parameters || Array.isArray(command.parameters)) fail('MAGIC_COMMAND_SCHEMA');
  if (command.actorId !== actorId || Object.keys(certificates).some(key => !['refs', 'domainStore', 'memoryChannel', 'magicCaseWitnessVersion'].includes(key))) fail('MAGIC_HOST_CERTIFICATE');
  const definition = magicDefinition(command.definitionRef); if (!definition) fail('MAGIC_HOST_DEFINITION');
  const hydrated = hydrateSources(state, magic, actorId, ownerSources);
  const { handles } = handlesFor(state, hydrated, actorId);
  const target = handles.find(row => row.handle === command.targetHandle); if (!target) fail('MAGIC_HANDLE_PERMISSION');
  const sourceMindId = mindOf(magic, actorId); const sourceBodyId = bodyForMind(magic.identity, sourceMindId);
  const sourceBody = magic.identity.bodies[sourceBodyId];
  if (!sourceBody) fail('MAGIC_HOST_ACTOR');
  const targetBody = own(magic.identity.bodies, target.entityId);
  const targetRoom = targetBody?.locationId || own(magic.entities, target.entityId)?.locationId;
  const refs = certifiedEvents(state, magic, certificates.refs || []);
  if (refs.some(row => ['physical-contact', 'voluntary-agreement'].includes(row.type))
    && targetRoom !== sourceBody.locationId) fail('MAGIC_HOST_CERTIFICATE');
  const localMindIds = Object.entries(magic.identity.occupants).filter(([id]) => magic.identity.bodies[id].alive
    && magic.identity.bodies[id].locationId === sourceBody.locationId).map(([, mind]) => mind);
  const stage = state.caseRuntime.procedure?.stage;
  const mode = ['discussion', 'ballot', 'execution_ready'].includes(stage) ? 'trial' : stage === 'investigation' ? 'investigation' : 'daily';
  const facts = { authorizationId: `host-authorization:${abilityDigest([worldFingerprint(state), command, certificates.refs || []]).slice(0, 40)}`,
    castAllowed: state.completed !== true && !state.guardReaction?.pending && !state.guardReaction?.detention,
    targetReachable: true, endsAt: ['self-float', 'strength'].includes(definition.operation) ? null : state.worldTime, localMindIds };
  const condition = state.caseRuntime.conditionsByActor[sourceBody.actorId];
  if (['incapacitated', 'unavailable'].includes(condition?.status || condition)
    || sourceBody.locationId === 'unavailable' && definition.operation !== 'death-rewind') facts.castAllowed = false;
  if (magic.effects.some(effect => effect.status === 'suppressed' && effect.event.sourceMindId === sourceMindId
    && effect.event.definitionRef === definition.ref)) facts.suppressed = true;
  const contact = refs.find(row => row.type === 'physical-contact' && row.sourceBodyId === sourceBodyId && row.targetId === target.entityId
    && row.entry.delivery === 'action' && row.entry.speakerId === actorId && row.entry.audienceIds?.includes(actorId));
  if (contact) { facts.contact = true; facts.contactBodyId = target.entityId; }
  facts.consents = refs.filter(row => row.type === 'voluntary-agreement' && row.agreed === true && row.voluntary === true
    && row.targetMindId === own(magic.identity.occupants, target.entityId) && row.entry.speakerId === own(magic.identity.minds, row.targetMindId)?.actorId
    && row.entry.audienceIds?.includes(actorId) && row.actionRef === command.useId
    && !projectMagicConstraints(magic, row.targetMindId).some(constraint => constraint.kind === 'speech-control'))
    .map(row => ({ mindId: row.targetMindId, actionId: row.actionRef, agreed: true, at: row.at }));
  if (definition.operation === 'speech-control') {
    facts.consents = [];
    const speech = entries(state).find(row => row.observationKey === command.parameters.actionRef && row.delivery === 'speech'
      && row.speakerId === actorId && row.occurredAt === state.worldTime);
    if (speech) {
      facts.consents = refs.filter(row => row.type === 'voluntary-agreement' && row.sourceSpeechKey === speech.observationKey
        && row.agreed === true && row.voluntary === true && row.targetMindId === magic.identity.occupants[target.entityId]
        && row.entry.speakerId === magic.identity.minds[row.targetMindId]?.actorId && row.entry.audienceIds?.includes(actorId)
        && row.actionRef === speech.observationKey && row.entry.delivery === 'speech'
        && !projectMagicConstraints(magic, row.targetMindId).some(constraint => constraint.kind === 'speech-control'))
        .map(row => ({ mindId: row.targetMindId, actionId: row.actionRef, agreed: true, at: row.at }));
      facts.spoken = { sourceBodyId, actionRef: speech.observationKey, at: speech.occurredAt, channel: 'live-speech',
        heardByMindIds: (speech.audienceIds || []).map(id => mindOf(magic, id)).filter(Boolean) };
    }
  }
  if (memoryOperations.has(definition.operation)) memoryConditions(state, hydrated, actorId, command, ownerSources, refs, target, facts);
  if (definition.operation === 'sound-replay') {
    facts.audibleAudienceVerified = true; facts.audienceMindIds = localMindIds;
  }
  if (['gaze', 'interest', 'visual-illusion'].includes(definition.operation)) {
    facts.perceptualLink = refs.some(row => row.type === 'perceptual-link' && row.sourceBodyId === sourceBodyId
      && row.targetId === target.entityId && row.entry.delivery === 'action');
  }
  if (definition.operation === 'spatial-shift') {
    const concentration = refs.find(row => row.type === 'concentration-established' && row.sourceBodyId === sourceBodyId
      && row.entry.speakerId === actorId && row.entry.delivery === 'action');
    facts.concentrationPossible = Boolean(concentration) && sourceBody.alive;
    facts.mentalCondition = concentration ? 'able-to-concentrate' : 'unverified';
  }
  if (definition.operation === 'death-rewind') {
    if (!certificates.domainStore || typeof certificates.domainStore.storyForkContext !== 'function') gated('domain-story-fork-context');
    const context = certificates.domainStore.storyForkContext(domainWorld(state), actorId);
    if (context.branch.id !== magic.branchId || context.branch.headCommitRef !== magic.headCommitRef
      || context.mindId !== sourceMindId || context.branch.time !== magic.time) fail('MAGIC_HOST_STALE_WORLD');
    facts.anchors = context.anchors; facts.death = context.death; facts.triggerEventId = context.death.id;
    const queue = refs.find(row => row.type === 'death-reaction-phase' && row.rootEventId === context.death.id
      && row.actorId === actorId && row.definitionRef === definition.ref);
    if (!queue || !Array.isArray(queue.completedPhaseIds) || !Number.isSafeInteger(queue.phaseLimit)) gated('actual-death-reaction-phase-queue');
    facts.reactionPhase = queue.completedPhaseIds.length;
    facts.reactionQueue = { rootEventId: queue.rootEventId, phaseLimit: queue.phaseLimit, completedPhaseIds: queue.completedPhaseIds };
  }
  const trigger = refs.find(row => row.type === 'actual-ability-trigger' && row.actorId === actorId && row.definitionRef === definition.ref);
  if (trigger && definition.operation !== 'death-rewind') facts.triggerEventId = trigger.id;
  return { authority: 'HOST_ONLY', actorId, ...boundary(magic), at: magic.time, mode, handles, facts };
}

// Memory operations are conditional, not blanket additions to the five
// physically/timeline-supported operations: real SQL owner proof is mandatory.
const memoryOperations = new Set(['memory-share', 'mental-heal']);
const executableOperations = new Set(['ignite', 'sound-replay', 'spatial-shift', 'regenerate', 'death-rewind', 'self-float', 'strength']);
const hooks = Object.freeze({ 'body-swap': 'mind-body-world-control-perception-inventory',
  'speech-control': 'owner-constraint-action-enforcement', gaze: 'owner-perception-attention-enforcement',
  interest: 'owner-perception-attention-enforcement', 'visual-illusion': 'owner-subjective-rendering',
  'memory-share': 'domain-owner-memory-share-overlay', 'mental-heal': 'domain-owner-memory-access-overlay',
  'touch-vision': 'actual-contact-rng-authorized-vision', 'past-reading': 'authorized-object-past-channel',
  'remote-view': 'actual-watcher-authorized-channel', 'dimension-view': 'reviewed-dimensional-channel',
  'surface-sound': 'authorized-current-target-surface-thought', 'liquid-paint': 'world-material-painting-recipe',
  strength: 'shared-force-modifier-consumer', 'self-float': 'shared-elevation-modifier-consumer',
  'mass-float': 'shared-object-elevation-consumer', blast: 'shared-impact-adjudicator', shockwave: 'shared-impact-adjudicator',
  drain: 'actual-contact-witch-reaction', 'witch-kill': 'actual-contact-witch-reaction' });
const issuedResults = new WeakMap();
/** Separate one-time durable execution: no timed effect or generic ACL grant.
 * Domain is the sole complete-source authority; source bodies never enter this
 * result or the public transcript. Existing core definitions stay byte-pinned. */
export function executeHostDurableMemoryAcquisition(state, actorId, command, { domainStore, capability }) {
  stateBoundary(state, state.magic);
  if (actorId !== command.actorId) fail('MAGIC_HOST_ACTOR');
  const plan = DomainStore.prototype.consumeDurableMemoryAcquisition.call(domainStore, capability,
    domainWorld(state), state.magic, command);
  const magic = structuredClone(state.magic), grant = magic.grants.find(row => row.id === command.grantId);
  const sourceMindId = plan.request.casterMindId;
  const acquisitionId = `acquisition:${abilityDigest([plan.planDigest, command.useId]).slice(0, 48)}`;
  const receipt = { useId: command.useId, actorId, status: 'acquired', occurredAt: magic.time,
    executionRef: DURABLE_EXECUTION_REF, acquisitionIds: [acquisitionId], effectIds: [],
    planDigest: plan.planDigest, obligationDigest: plan.obligationDigest };
  const event = { id: acquisitionId, type: 'DurableMemoryAcquisitionEstablished', operation: 'durable-memory-acquisition',
    executionRef: DURABLE_EXECUTION_REF, useId: command.useId, definitionRef: command.definitionRef,
    definitionFingerprint: plan.request.scope.definition.fingerprint, grantId: grant.id, sourceMindId,
    sourceBodyId: bodyForMind(magic.identity, sourceMindId), at: magic.time,
    planDigest: plan.planDigest, obligationDigest: plan.obligationDigest };
  magic.uses.push({ id: command.useId, commandHash: abilityDigest(command), definitionRef: command.definitionRef,
    grantId: grant.id, stage: grant.stage, binding: structuredClone(grant.binding), source: structuredClone(grant.source),
    branchId: magic.branchId, headCommitRef: magic.headCommitRef, at: magic.time, sourceMindId, triggerEventId: null, receipt });
  magic.host.appliedUseIds.push(command.useId);
  const world = structuredClone(domainWorld(state));
  magic.host.worldFingerprint = abilityDigest({ ...world, revision: world.revision + 1 });
  return { state: { ...world, magic }, receipt, events: [event], plan };
}

/** Common supported operations execute core AND shared-world mapper together.
 * The WeakMap receipt prevents accidentally adopting an arbitrary hand-built
 * core projection as a host-authorized result. Nothing mutable is committed. */
export function executeHostMagic(state, actorId, command, ownerSources, certificates = {}) {
  const magic = state.magic; if (!magic) fail('MAGIC_HOST_INITIALIZATION_REQUIRED');
  stateBoundary(state, magic);
  const definition = magicDefinition(command?.definitionRef); if (!definition) fail('MAGIC_HOST_DEFINITION');
  if (!executableOperations.has(definition.operation) && !memoryOperations.has(definition.operation)) gated(hooks[definition.operation] || 'reviewed-shared-world-effect');
  let prepared = hydrateSources(state, magic, actorId, ownerSources);
  let memoryRecords = null; let coreCommand = command; let channel = null;
  if (memoryOperations.has(definition.operation)) {
    if (certificates.memoryChannel) {
      if (!certificates.domainStore) gated('domain-private-memory-transaction-authority');
      // Invoke the real branded class method, never an overridable borrowed
      // callback on a DomainStore-like object. Private fields bind actual DB.
      channel = DomainStore.prototype.consumeMemoryChannel.call(certificates.domainStore,
        certificates.memoryChannel, domainWorld(state), magic, command);
      ownerSources = { ...ownerSources };
      channelSources.set(ownerSources, { ...channel, actorId });
      const { handles } = handlesFor(state, prepared, actorId);
      const target = handles.find(row => row.handle === command.targetHandle);
      if (!target || !channel.law.recipientActorIds.includes(prepared.identity.minds[prepared.identity.occupants[target.entityId]]?.actorId))
        fail('MAGIC_MEMORY_PERMISSION');
      command = { ...magicJson(command), parameters: { recordIds: channel.records.map(row => recordToken(prepared, actorId, row)) } };
    }
    memoryRecords = memorySources(state, prepared, actorId, ownerSources, true);
    const selected = selectedMemoryRecords(prepared, actorId, command, memoryRecords);
    coreCommand = { ...magicJson(command), parameters: { recordIds: selected.map(row => row.id) } };
    for (const row of selected) {
      const old = prepared.memories.find(record => record.id === row.id);
      if (old && old.ownerMindId !== mindOf(prepared, row.ownerId)) fail('MAGIC_HOST_OWNER_SOURCE');
      // SQL effective access gates THIS cast. The base metadata denotes
      // genuinely acquired (not permanently revoked) knowledge; copying a
      // temporary block into base `accessible:false` would outlive its expiry.
      const metadata = { id: row.id, ownerMindId: mindOf(prepared, row.ownerId), learnedAt: row.learnedAt, accessible: true };
      if (old) Object.assign(old, metadata); else prepared.memories.push(metadata);
    }
  }
  if (definition.operation === 'death-rewind') {
    if (!certificates.domainStore?.storyForkContext) gated('domain-story-fork-context');
    prepared.memories = certificates.domainStore.storyForkContext(domainWorld(state), actorId).memoryRecords;
  }
  const context = buildHostMagicContext(state, prepared, actorId, command, ownerSources, certificates);
  const result = executeMagicCommand(prepared, coreCommand, context);
  if (channel && !result.replayed) {
    // One authentic primary. Remaining law-derived recipients are reducer
    // primitives, independently rechecked by the unchanged SQL publisher.
    const primary = result.events[0];
    for (const recipient of channel.law.recipientActorIds) {
      const targetId = bodyForMind(result.state.identity, mindOf(result.state, recipient));
      if (targetId === primary.targetId) continue;
      const event = { ...magicJson(primary), id: `channel:${command.useId}:${recipient}`, targetId };
      result.state = reduceMagicEffect(result.state, event); result.events.push(event);
    }
  }
  issuedResults.set(result, { beforeFingerprint: worldFingerprint(state), beforeMagicHash: abilityDigest(magic),
    resultHash: abilityDigest(result), prepared, memoryRecords,
    magicCaseWitnessVersion: certificates.magicCaseWitnessVersion === 1 ? 1 : 0 });
  const applied = applyHostMagicResult(state, result);
  if (channel) {
    applied.commandBinding = { version: 'domain-magic-command-binding@1', publicCommand: command, coreCommand };
    applied.events = result.events;
  }
  return applied;
}
function effectEntries(state, beforeMagic, result, event) {
  const sourceActor = beforeMagic.identity.minds[event.sourceMindId].actorId;
  const sourceBody = beforeMagic.identity.bodies[event.sourceBodyId];
  const afterBody = result.state.identity.bodies[event.sourceBodyId];
  const entriesOut = []; const roster = actorsForState(state);
  const emit = (actorId, text, delivery = 'action', suffix = 'effect') => {
    const performer = roster.find(row => row.id === sourceActor);
    const label = runtimeRecognizedActors(state, actorId).has(sourceActor) ? performer.name : performer.appearance;
    entriesOut.push({ id: `magic-entry:${abilityDigest([event.id, actorId, suffix]).slice(0, 32)}`,
      observationKey: `magic:${event.id}:${actorId}:${suffix}`, speaker: label, speakerId: sourceActor, text, delivery,
      audienceIds: [actorId], occurredAt: event.at, learnedAt: event.at,
      magicObservation: { version: 1, effectId: event.id, channel: delivery === 'speech' ? 'hearing' : 'sight' } });
  };
  const audience = Object.entries(beforeMagic.identity.occupants).filter(([id]) => beforeMagic.identity.bodies[id].alive
    && beforeMagic.identity.bodies[id].actorId !== 'warden' && beforeMagic.identity.bodies[id].locationId === sourceBody.locationId)
    .map(([, mindId]) => beforeMagic.identity.minds[mindId].actorId);
  if (event.operation === 'sound-replay') {
    const observation = result.state.observations[event.payload.sourceRef];
    const source = result.state.host.ownerSourceRefs[observation?.representationRef];
    const actual = source && entries(state).find(row => row.observationKey === source.eventKey && row.delivery === 'speech'
      && row.audienceIds?.includes(sourceActor) && row.occurredAt <= source.learnedAt);
    if (!actual) fail('MAGIC_HOST_OWNER_SOURCE');
    const text = actual.textByActor?.[sourceActor] || actual.text;
    if (observation.representationRef !== `heard-representation:${abilityDigest([source.observationId, actual.observationKey, text]).slice(0, 40)}`) fail('MAGIC_HOST_OWNER_SOURCE');
    consumeNativeSound(text,event.payload.audienceMindIds.map(id=>beforeMagic.identity.minds[id]?.actorId).filter(id=>id&&audience.includes(id)),
      (actorId,sound)=>emit(actorId,sound,'speech','heard-replay'));
  } else if (event.operation === 'ignite') {
    for (const actorId of audience) emit(actorId, '近处实际燃起一簇很小的火焰。');
  } else if (event.operation === 'regenerate') {
    // Only source and touched body receive a precise bodily observation. Other
    // nearby people do not automatically see under clothing or learn injuries.
    const targetMind = beforeMagic.identity.occupants[event.targetId];
    for (const actorId of new Set([sourceActor, beforeMagic.identity.minds[targetMind]?.actorId].filter(Boolean))) {
      emit(actorId, '实际接触后，接触位置已有伤口的疼痛与伤势消退。');
    }
  } else if (event.operation === 'spatial-shift') {
    emit(sourceActor, `你完成意念穿梭，实际来到${rooms[afterBody.locationId]}。`, 'action', 'arrival');
    for (const actorId of audience.filter(id => id !== sourceActor)) emit(actorId, '眼前的人影从原处消失。', 'action', 'departure');
    for (const [bodyId, mindId] of Object.entries(beforeMagic.identity.occupants)) {
      const body = beforeMagic.identity.bodies[bodyId]; const actorId = beforeMagic.identity.minds[mindId].actorId;
      if (body.alive && actorId !== sourceActor && actorId !== 'warden' && body.locationId === afterBody.locationId) emit(actorId, '近处实际出现一个身影。', 'action', 'appearance');
    }
  } else if (event.operation === 'self-float') {
    // The owner and nearby actual witnesses see the same qualitative posture.
    // No magic name, hidden mechanism, numeric height or movement is disclosed.
    emit(sourceActor, '你的身体实际稍稍离开支撑表面，仍留在原处。', 'action', 'elevation');
    for (const actorId of audience.filter(id => id !== sourceActor)) {
      emit(actorId, '眼前的人身体稍稍离开支撑表面，仍留在原处。', 'action', 'elevation');
    }
  } else if (event.operation === 'strength') {
    // The strengthened body is a real current condition. This does not move any
    // object by itself, disclose a force rating, or promise a duration.
    emit(sourceActor, '你的身体实际被强化，发力和支撑的感觉发生变化；眼前的东西尚未被移动。', 'action', 'strength');
    for (const actorId of audience.filter(id => id !== sourceActor)) {
      emit(actorId, '眼前的人身体实际绷紧，发力和支撑的观感发生变化；没有物件因此自动移动。', 'action', 'strength');
    }
  }
  return entriesOut;
}
// Audited floor mirrors the private case-runtime LIMITS.traces=256; it is not
// exported, so this witness consumer keeps the same bounded contract.
const CASE_WITNESS_TRACE_LIMIT = 256;
function addCaseWitnessTraces(state, magic, event, rows) {
  if (magic.host?.caseWitnessVersion !== 1 || !state.caseRuntime
    || !['ignite', 'sound-replay'].includes(event.operation)) return;
  const known = new Set(state.caseRuntime.traces.map(row => row.id));
  const pending = rows.flatMap(entry => entry.magicObservation && entry.observationKey
    ? (entry.audienceIds || []).map(owner => `case-witness:${entry.observationKey}:${owner}`) : [])
    .filter(id => !known.has(id) && known.add(id));
  if (state.caseRuntime.traces.length + pending.length > CASE_WITNESS_TRACE_LIMIT) gated('case-witness-capacity');
  for (const entry of rows) for (const owner of entry.audienceIds || []) {
    if (!entry.magicObservation || !entry.observationKey) continue;
    const id = `case-witness:${entry.observationKey}:${owner}`;
    if (state.caseRuntime.traces.some(row => row.id === id)) continue;
    state.caseRuntime.traces.push({ id, kind: 'witness', magicWitnessVersion: 1, ownerActorId: owner,
      name: entry.magicObservation.channel === 'hearing' ? '实际听到的现场见闻' : '实际目击的现场见闻',
      description: entry.text, room: runtimeRoom(state, owner), occurredAt: entry.occurredAt ?? event.at,
      witnessIds: [owner], observedActorIds: [], resourceIds: [], sourceObservationId: entry.observationKey,
      causeEffectId: event.id });
  }
}
/** New-job only: turn actual Host-issued typed magic rows into owner-local case
 * witness traces. Rows must come from this Host's just-completed effect/landing
 * entries; the owner is the row's real audience, never a global broadcast. */
const CASE_WITNESS_MAGIC_OPERATIONS = new Set(['self-float', 'spatial-shift', 'regenerate']);
function caseWitnessTraceName(state, entry, effect) {
  const operation = effect.event.operation;
  let base;
  if (operation === 'self-float') base = entry.magicObservation?.kind === 'self-float-landing'
    ? '身体落回支撑面的现场见闻' : '身体稍稍离开支撑面的现场见闻';
  else if (operation === 'regenerate') base = '接触后伤处恢复的现场见闻';
  else if (entry.text.includes('从原处消失')) base = '眼前人影从原处消失的现场见闻';
  else if (entry.text.includes('出现一个身影')) base = '近处出现身影的现场见闻';
  else if (entry.text.includes('意念穿梭')) base = '本人完成意念穿梭的现场见闻';
  else base = '位置变化后的现场见闻';
  const clock = prisonClock(state, entry.occurredAt ?? effect.event.at);
  return `${base}（第${clock.day}天 ${clock.label}）`;
}
export function recordHostMagicWitnessTraces(state, rows, { before = state, magic = state?.magic, event } = {}) {
  if (!state?.caseRuntime || !magic?.identity || !Array.isArray(rows)) return [];
  const known = new Set(state.caseRuntime.traces.map(row => row.id));
  const sourceState = before?.caseRuntime ? before : state;
  const added = [];
  for (const entry of rows) {
    const marker = entry?.magicObservation;
    if (!marker || marker.version !== 1 || !marker.effectId || !entry.observationKey
      || typeof entry.id !== 'string' || !entry.id.startsWith('magic-entry:')) continue;
    const effect = magic.effects?.find(row => row.id === marker.effectId);
    const operation = effect?.event?.operation;
    if (!effect || !CASE_WITNESS_MAGIC_OPERATIONS.has(operation)) continue;
    const sourceActor = magic.identity.minds?.[effect.event.sourceMindId]?.actorId;
    for (const owner of entry.audienceIds || []) {
      if (owner === 'warden' || !runtimeActive(sourceState, owner)) continue;
      const id = `case-witness:${entry.observationKey}:${owner}`;
      if (known.has(id)) continue;
      // The optional index is capacity-bounded but never gates the cast/stop or
      // discards the actual observation row. Existing old ignite/sound capacity
      // behavior is kept by addCaseWitnessTraces and is not changed here.
      if (state.caseRuntime.traces.length >= CASE_WITNESS_TRACE_LIMIT) continue;
      // A spatial source sees the arrival after relocation; every other row is
      // observed where that owner actually stood in the before frame. A
      // departure witness must not be moved to the source's destination.
      const room = operation === 'spatial-shift' && owner === sourceActor
        ? runtimeRoom(state, owner) : runtimeRoom(sourceState, owner);
      if (!room) continue;
      state.caseRuntime.traces.push({ id, kind: 'witness', magicWitnessVersion: 1, ownerActorId: owner,
        name: caseWitnessTraceName(state, entry, effect),
        description: entry.text, room, occurredAt: entry.occurredAt ?? effect.event.at,
        witnessIds: [owner], observedActorIds: [], resourceIds: [],
        sourceObservationId: entry.observationKey, causeEffectId: marker.effectId });
      known.add(id); added.push(id);
    }
  }
  if (added.length) magic.host.worldFingerprint = worldFingerprint(state);
  return added;
}
export function recordCustomMagicWitnessTraces(state, prepared, source = state) {
  if (!state?.caseRuntime || !prepared?.next || !Array.isArray(prepared.next.entries)
    || !Array.isArray(prepared.result?.obligations) || !source?.caseRuntime) return [];
  const actor = createdPlayerId(source);
  const sourceBodyId = `body:${runtimeBodyActorId(source, actor)}`;
  const sourceMindId = `mind:${actor}`;
  const before = source;
  const known = new Set(state.caseRuntime.traces.map(row => row.id));
  const added = [];
  if (!isDeepStrictEqual(source.entries, prepared.next.entries.slice(0, source.entries.length))) return [];
  let derived;
  try { derived = applyCustomAbilityWorld(source, prepared.result, prepared.sourceBodies); }
  catch { return []; }
  const rows = derived.entries.slice(source.entries.length).filter(row => row.customAbilityEvent?.version === 1);
  const preparedRows = prepared.next.entries.slice(source.entries.length).filter(row => row.customAbilityEvent?.version === 1);
  if (!isDeepStrictEqual(rows, preparedRows)
    || !isDeepStrictEqual(derived.caseRuntime.signals.slice(source.caseRuntime.signals.length),
      prepared.next.caseRuntime.signals.slice(source.caseRuntime.signals.length))) return [];
  for (const entry of rows) {
    const event = entry.customAbilityEvent;
    const obligation = prepared.result.obligations.find(row => row.id === event.effectId);
    if (!obligation || obligation.sourceMindId !== sourceMindId || obligation.sourceBodyId !== sourceBodyId
      || !['sound-replay', 'spatial-shift'].includes(obligation.operation)) continue;
    if (obligation.operation === 'sound-replay') {
      const source = prepared.sourceBodies?.[obligation.targetId];
      if (!source || source.channel !== 'hearing' || source.owner_id !== actor
        || event.sourceObservationId !== source.id) continue;
    }
    const suffix = entry.observationKey?.split(':').at(-1);
    for (const owner of entry.audienceIds || []) {
      if (owner === 'warden' || !runtimeActive(before, owner)) continue;
      const id = `case-witness:${entry.observationKey}:${owner}`;
      if (known.has(id)) continue;
      if (state.caseRuntime.traces.length >= CASE_WITNESS_TRACE_LIMIT) continue;
      const afterRoom = obligation.operation === 'spatial-shift'
        && (owner === actor ? suffix === 'arrival' : suffix === 'appearance');
      const room = afterRoom ? runtimeRoom(derived, owner) : runtimeRoom(before, owner);
      if (!room) continue;
      const clock = prisonClock(state, entry.occurredAt);
      const base = obligation.operation === 'sound-replay' ? '实际听到的声音见闻'
        : suffix === 'arrival' ? '本人到达新位置的现场见闻'
          : suffix === 'departure' ? '眼前人影从原处消失的现场见闻' : '近处出现身影的现场见闻';
      state.caseRuntime.traces.push({ id, kind: 'witness', magicWitnessVersion: 1, ownerActorId: owner,
        name: `${base}（第${clock.day}天 ${clock.label}）`, description: entry.text, room,
        occurredAt: entry.occurredAt, witnessIds: [owner], observedActorIds: [], resourceIds: [],
        sourceObservationId: entry.observationKey, causeEffectId: event.effectId });
      known.add(id); added.push(id);
    }
  }
  if (added.length && state.magic?.host) state.magic.host.worldFingerprint = worldFingerprint(state);
  return added;
}
/** Atomic detached clone. Only results issued by executeHostMagic may enter;
 * memory deltas require the same SQL proof used by the core cast. Swaps and
 * other unsupported consumers retain their explicit missing-hook gates. */
export function applyHostMagicResult(before, result) {
  const issued = issuedResults.get(result);
  if (!issued || issued.beforeFingerprint !== worldFingerprint(before) || issued.beforeMagicHash !== abilityDigest(before.magic)
    || issued.resultHash !== abilityDigest(result)) fail('MAGIC_HOST_RESULT_NOT_AUTHORIZED');
  const state = structuredClone(before); const magic = magicJson(result.state);
  if (!isDeepStrictEqual(magic.identity.occupants, before.magic.identity.occupants)) gated('mind-body-world-control-perception-inventory');
  const newEntries = []; const domainDeltas = { observations: [], memoryAccess: [], sharedMemories: [] };
  const witnessBatches = [];
  const applied = new Set(before.magic.host.appliedUseIds || []);
  if (result.replayed || applied.has(result.receipt.useId)) return { state, receipt: result.receipt, entries: [], domainDeltas, replayed: true, requiredHooks: [] };
  for (const event of result.events) {
    if (!executableOperations.has(event.operation) && !(memoryOperations.has(event.operation) && issued.memoryRecords)) gated(hooks[event.operation] || 'reviewed-shared-world-effect');
    const bodyBefore = before.magic.identity.bodies[event.sourceBodyId];
    if (event.operation === 'spatial-shift') {
      const bodyAfter = magic.identity.bodies[event.sourceBodyId];
      const occupant = magic.identity.occupants[event.sourceBodyId]; const actorId = magic.identity.minds[occupant].actorId;
      consumeNativeRelocation(state,actorId,bodyAfter.locationId);
      for (const id of bodyAfter.inventory) if (state.caseRuntime.objects[id]?.holderId !== bodyBefore.actorId) fail('MAGIC_HOST_WORLD_DIVERGENCE');
    }
    if (event.operation === 'regenerate') {
      const body = magic.identity.bodies[event.targetId]; const condition = state.caseRuntime.conditionsByActor[body.actorId];
      if (fatal(condition) || !body.alive) fail('MAGIC_REGEN_NOT_REVIVAL');
      if (!condition || !Array.isArray(condition.injuries)) gated('shared-body-injury-register');
      condition.injuries = magicJson(body.injuries);
    }
    if (event.operation === 'ignite') {
      const item = state.caseRuntime.objects[event.targetId];
      if (item && magic.entities[event.targetId].burning === true) {
        // Burn state is retained on the physical object, not a detached magic
        // entity. Any later damage/spread still needs the world's fire reducer.
        item.physical = { ...(item.physical || {}), burning: true, sourceEffectId: event.id };
      }
      state.caseRuntime.signals.push({ id: `magic-signal:${event.id}`, kind: 'small-flame', room: bodyBefore.locationId,
        occurredAt: event.at, sourceEffectId: event.id, sourceBodyId: event.sourceBodyId });
    }
    if (memoryOperations.has(event.operation)) {
      const targetMindId = magic.identity.occupants[event.targetId];
      const ownerId = magic.identity.minds[targetMindId].actorId;
      const selected = event.payload.recordIds.map(id => issued.memoryRecords.find(row => row.id === id));
      if (selected.some(row => !row)) fail('MAGIC_MEMORY_PERMISSION');
      const sourceActor = magic.identity.minds[event.sourceMindId].actorId;
      const sourceEntryRef = `magic-memory:${abilityDigest([event.id, ownerId]).slice(0, 40)}`;
      newEntries.push({ id: sourceEntryRef, observationKey: sourceEntryRef, speaker: '眼前的人', speakerId: sourceActor,
        text: event.operation === 'memory-share' ? '记忆共享实际发生。' : '已知记忆的访问恢复实际发生。',
        delivery: 'action', audienceIds: [ownerId], occurredAt: event.at, learnedAt: event.at,
        magicObservation: { version: 1, effectId: event.id, channel: 'sight' } });
      if (event.operation === 'mental-heal') {
        if (selected.some(row => row.ownerId !== ownerId)) fail('MAGIC_MEMORY_PERMISSION');
        domainDeltas.memoryAccess.push({ ownerId, mindId: targetMindId, changes: [{ effectId: event.id,
          observationIds: [...new Set(selected.flatMap(row => row.sourceObservationIds))], mode: 'restored', status: 'active' }] });
      } else {
        for (const sourceOwnerId of new Set(selected.map(row => row.ownerId))) domainDeltas.sharedMemories.push({
          effectId: event.id, ownerId, mindId: targetMindId, sourceOwnerId, sourceMindId: mindOf(magic, sourceOwnerId),
          sourceObservationIds: [...new Set(selected.filter(row => row.ownerId === sourceOwnerId).flatMap(row => row.sourceObservationIds))], sourceEntryRef });
      }
    }
    const effectRows = effectEntries(before, before.magic, result, event);
    newEntries.push(...effectRows); addCaseWitnessTraces(state, magic, event, effectRows);
    if (issued.magicCaseWitnessVersion === 1) witnessBatches.push({ rows: effectRows, event });
  }
  // Entry audience is already owner-local; the ordinary DomainStore observation
  // path will append these. No private raw source or mechanism is broadcast.
  state.entries.push(...newEntries);
  if (issued.magicCaseWitnessVersion === 1) {
    state.magic = magic;
    for (const batch of witnessBatches) recordHostMagicWitnessTraces(state, batch.rows,
      { before, magic, event: batch.event });
  }
  magic.host.appliedUseIds = [...applied, result.receipt.useId];
  magic.host.worldFingerprint = worldFingerprint(state); state.magic = magic;
  return { state, receipt: result.receipt, entries: newEntries, domainDeltas, replayed: false,
    requiredHooks: result.state.branchRequests.length > before.magic.branchRequests.length ? ['domain-story-fork-transaction'] : [] };
}

/** A normal new-root wake fact, not growth and not a late backfill. The
 * caller may use this only for the root new_game commit. It is bound to the
 * actual reviewed root branch (blank builtin or card-other-cell), the current
 * player body/mind and the real 05:59 prison clock. */
export function hostRootStoryFacts(state) {
  const creation = state?.creation;
  if (state?.exampleId !== 'agent' || state.rootCaseOptionsVersion !== 1
    || runtimeCapabilityId(state.agentRuntimeRevision) !== 'agent-prison-runtime@8'
    || !creation || creation.scenarioId || creation.storyArcId
    || state.worldTime !== 0 || creation.opening?.text) return undefined;
  const card = state.agentOpening;
  const cellOther = card?.id === 'card-other-cell' && card.handoff === 'player-choice'
    && isDeepStrictEqual(card.source, cardOpening('card-other-cell').source);
  const builtinBlank = !card;
  if (!cellOther && !builtinBlank) return undefined;
  const actorId = createdPlayerId(state); const identity = createMagicIdentity(currentBodyRows(state), actorId);
  const mindId = identity.playerMindId; const body = identity.bodies[bodyForMind(identity, mindId)];
  const clock = prisonClock(state);
  if (!mindId || !body?.alive || clock.hour < 5 || clock.hour >= 10) return undefined;
  return { identity, deaths: [], waking: [{ actorId,
    id: `host-root-waking:${abilityDigest([state.agentRuntimeRevision, actorId, state.generation, state.revision, state.worldTime]).slice(0, 40)}` }] };
}
/** Typed facts for DomainStore.record(storyFacts). No death by narration,
 * no caller-authored ancestor booleans and no automatic NPC child simulation. */
export function hostStoryFacts(state) {
  const magic = state.magic; if (!magic) fail('MAGIC_HOST_INITIALIZATION_REQUIRED');
  validateMagicIdentity(magic.identity);
  const identity = magicJson(magic.identity); const waking = []; const deaths = [];
  if (!magic.host?.setupRef || !Number.isSafeInteger(state.worldTime)) fail('MAGIC_HOST_STALE_WORLD');
  for (const [bodyId, mindId] of Object.entries(identity.occupants)) {
    const body = identity.bodies[bodyId]; const actorId = identity.minds[mindId].actorId;
    const condition = state.caseRuntime?.conditionsByActor?.[body.actorId];
    if (fatal(condition)) body.alive = false;
    const deathAt = condition?.executedAt ?? condition?.occurredAt;
    if (fatal(condition) && deathAt === state.worldTime) deaths.push({
      id: `host-death:${abilityDigest([magic.branchId, state.generation, state.revision, bodyId, deathAt]).slice(0, 40)}`, actorId, bodyId });
    for (const entry of entries(state)) {
      const event = entry.storyTimelineEvent;
      if (event?.kind === 'morning-waking' && event.actorId === actorId && event.mindId === mindId && event.at === state.worldTime
        && entry.occurredAt === state.worldTime && entry.delivery === 'action' && entry.speakerId === actorId
        && entry.audienceIds?.includes(actorId) && body.alive) waking.push({
        id: `host-waking:${abilityDigest([magic.branchId, entry.observationKey, mindId]).slice(0, 40)}`, actorId, evidenceKey: entry.observationKey });
    }
    if (magic.host.initialWaking?.generation === state.generation && magic.host.initialWaking?.revision === state.revision
      && magic.host.initialWaking?.at === state.worldTime && !state.turnIds.length && body.alive && prisonClock(state).hour >= 5 && prisonClock(state).hour < 10
      && !waking.some(row => row.actorId === actorId) && actorId !== 'warden') waking.push({
      id: `host-waking:${abilityDigest([magic.host.setupRef, mindId]).slice(0, 40)}`, actorId });
  }
  return { identity, waking, deaths };
}
/** Domain-owned context is queried here, not accepted in a certificate JSON.
 * Parent calls applyStoryFork with these arguments in its world transaction. */
export function buildHostStoryRequest(state, domainStore, { actorId, useId, anchorId, memoryWhitelist }) {
  if (!domainStore || typeof domainStore.storyForkContext !== 'function') gated('domain-story-fork-context');
  const magic = state.magic; stateBoundary(state, magic);
  const context = domainStore.storyForkContext(domainWorld(state), actorId);
  const grant = magic.grants.find(row => row.actorId === actorId && row.enabled && magicDefinition(row.definitionRef)?.operation === 'death-rewind');
  if (!grant || !grantMatchesIdentity(grant, magic.identity, actorId, magic.identity.bodies[bodyForMind(magic.identity, context.mindId)]?.inventory || [])) fail('MAGIC_GRANT_PERMISSION');
  const anchor = context.anchors.find(row => row.id === anchorId); if (!anchor) fail('MAGIC_REWIND_ANCHOR');
  if (context.branch.id !== magic.branchId || context.branch.headCommitRef !== magic.headCommitRef
    || context.branch.generation !== state.generation || context.mindId !== mindOf(magic, actorId)) fail('MAGIC_HOST_STALE_WORLD');
  const validatedInput = { useId, definition: magicDefinition(grant.definitionRef), actorId, mindId: context.mindId,
    death: context.death, anchor, memoryRecords: context.memoryRecords, memoryWhitelist, branch: context.branch,
    playerMindId: context.playerMindId,
    memoryAccessState: { ...magicJson(magic), memories: context.memoryRecords } };
  const request = requestMagicRewind(validatedInput);
  return { request, validatedInput, expectedRequestFingerprint: request.fingerprint };
}

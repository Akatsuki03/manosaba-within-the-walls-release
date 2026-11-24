import { abilityDigest, magicFail, magicJson, magicId, magicOwn, magicExact, magicDefinition } from './ability-definitions.mjs';
import { swapMagicOccupants, restoreMagicOccupants, magicWitchEligible, validateMagicIdentity,
  bodyForMind, ORIGINAL_SWAP_RETURN_POLICY } from './magic-identity.mjs';
import { assertBodyFactorGrantApproval } from './magic-binding-policy.mjs';

const append = (rows, row) => {
  const old = rows.find(item => item.id === row.id);
  if (old && abilityDigest(old) !== abilityDigest(row)) magicFail('MAGIC_EFFECT_CONFLICT');
  if (!old) rows.push(row);
};
const body = (draft, id) => {
  const row = magicOwn(draft.identity.bodies, id); if (!row) magicFail('MAGIC_TARGET_NOT_AVAILABLE'); return row;
};
const entity = (draft, id) => magicOwn(draft.identity.bodies, id) || magicOwn(draft.entities, id) || magicFail('MAGIC_TARGET_NOT_AVAILABLE');
const physical = (draft, event) => {
  const { operation, targetId, payload, id } = event;
  if (operation === 'create') {
    // No roster ability implicitly grants creation. A future reviewed source
    // must select an existing HOST recipe, not supply arbitrary entity fields.
    const recipe = magicOwn(draft.recipes, payload.recipeId);
    if (!recipe || recipe.approvedDefinitionRef !== event.definitionRef || !magicOwn(draft.entities, targetId)
      || magicOwn(draft.entities, targetId).kind !== 'location') magicFail('MAGIC_CREATE_RECIPE');
    const createdId = `created:${id}`;
    if (magicOwn(draft.entities, createdId)) magicFail('MAGIC_EFFECT_CONFLICT');
    draft.entities[createdId] = { id: createdId, kind: 'item', itemType: recipe.itemType,
      material: recipe.material, locationId: targetId, sourceEffectId: id };
  } else if (operation === 'transform' || operation === 'liquid-paint') {
    const row = magicOwn(draft.entities, targetId);
    const recipe = magicOwn(draft.recipes, payload.recipeId);
    if (!row || row.kind !== 'item' || !recipe || recipe.approvedDefinitionRef !== event.definitionRef
      || !recipe.inputMaterials.includes(row.material)) magicFail('MAGIC_TRANSFORM_RECIPE');
    if (operation === 'liquid-paint' && (row.phase !== 'liquid' || row.containedInBody === true
      || recipe.purpose !== 'painting')) magicFail('MAGIC_PAINT_ONLY');
    row.material = recipe.outputMaterial; row.representationRef = payload.representationRef;
    if (operation === 'liquid-paint') {
      // Previous works are changed by a HOST-verified list, never discovered by
      // model text; physical originals/audit remain attributable to this use.
      for (const previousId of payload.previousWorkIds || []) {
        const previous = magicOwn(draft.entities, previousId);
        if (!previous || previous.creatorMindId !== event.sourceMindId || previous.kind !== 'item') magicFail('MAGIC_PAINT_SOURCE');
        previous.representationRef = 'painted-over-black';
      }
    }
  } else if (operation === 'ignite' || operation === 'blast') {
    const row = entity(draft, targetId);
    const createdId = `fire:${id}`;
    draft.entities[createdId] = { id: createdId, kind: 'physical-signal', signal: operation === 'ignite' ? 'match-flame' : 'hand-blast-van-scale-upper-bound',
      locationId: row.kind === 'location' ? row.id : row.locationId, sourceEffectId: id, selfHarmImmuneBodyId: event.sourceBodyId };
    if (operation === 'ignite' && row.combustible === true) row.burning = true;
    if (operation === 'blast' && payload.impactAuthorized === true && targetId !== event.sourceBodyId) {
      if (magicOwn(draft.identity.bodies, targetId)) body(draft, targetId).injuries.push({ id: `injury:${id}`, kind: 'blast', sourceEffectId: id });
      else if (row.kind === 'item') row.damage = 'blast-damaged';
    }
  } else if (operation === 'shockwave') {
    const row = entity(draft, targetId);
    if (payload.impactAuthorized !== true) magicFail('MAGIC_PHYSICAL_CONDITIONS');
    if (magicOwn(draft.identity.bodies, targetId)) row.injuries.push({ id: `injury:${id}`, kind: 'shockwave', sourceEffectId: id });
    else row.damage = 'shockwave-damaged';
  } else if (['strength', 'self-float', 'mass-float'].includes(operation)) {
    const target = entity(draft, targetId);
    if (operation === 'mass-float' && event.definitionRef === 'hanna:awakened@2' && target.kind !== 'item') magicFail('MAGIC_FLOAT_BATCH_PERMISSION');
    // Persistent physical modifier is projected by activeMagicEffects.
  } else if (operation === 'regenerate') {
    const row = body(draft, targetId);
    if (!row.alive) magicFail('MAGIC_REGEN_NOT_REVIVAL');
    if (!Array.isArray(payload.injuryIds) || payload.injuryIds.some(injuryId => !row.injuries.some(injury => injury.id === injuryId))) magicFail('MAGIC_HEAL_TARGET');
    row.injuries = row.injuries.filter(injury => !payload.injuryIds.includes(injury.id));
  } else if (operation === 'drain' || operation === 'witch-kill') {
    const row = body(draft, targetId);
    // Hidden target eligibility is not a free oracle. A real authorized
    // attempt has the same owner receipt without revealing witch status.
    if (!magicWitchEligible(row)) return;
    if (operation === 'drain') row.vitalityState = 'slightly-fatigued';
    else { row.alive = false; draft.deathReactions.push({ id: `death:${id}`, bodyId: targetId, at: event.at, status: 'reaction-window-open' }); }
  } else if (operation === 'spatial-shift') {
    const destination = magicOwn(draft.entities, targetId);
    if (destination?.kind !== 'location') magicFail('MAGIC_SPATIAL_TARGET');
    const row = body(draft, event.sourceBodyId);
    if (destination.islandId !== row.islandId) magicFail('MAGIC_SPATIAL_BOUNDARY');
    row.locationId = destination.id; // Locks do not become physics barriers.
  } else magicFail('MAGIC_UNSUPPORTED_EFFECT');
};
const sensory = (draft, event) => {
  const { operation, payload, id } = event;
  if (operation === 'sound-replay' || operation === 'surface-sound') {
    const source = magicOwn(draft.observations, payload.sourceRef);
    if (!source || source.channel !== (operation === 'sound-replay' ? 'sound' : 'surface-thought')
      || source.ownerMindId !== event.sourceMindId || source.at > event.at || typeof source.representationRef !== 'string'
      || operation === 'surface-sound' && (source.targetId !== event.targetId || source.at !== event.at)) magicFail('MAGIC_SOUND_SOURCE');
    append(draft.signals, { id: `signal:${id}`, type: 'audible-replay', representationRef: source.representationRef,
      sourceBodyId: event.sourceBodyId, audienceMindIds: payload.audienceMindIds, at: event.at });
  } else if (operation === 'visual-illusion') {
    append(draft.representations, { id: `representation:${id}`, kind: 'subjective-visual',
      ownerMindId: magicOwn(draft.identity.occupants, event.targetId), representationRef: payload.representationRef,
      sourceEffectId: id, at: event.at, affectsCameras: false });
  } else if (['remote-view', 'dimension-view', 'touch-vision', 'past-reading'].includes(operation)) {
    const source = magicOwn(draft.observations, payload.sourceRef);
    if (!source || source.ownerMindId !== event.sourceMindId || source.at > event.at
      || source.targetId !== event.targetId || !['remote', 'past', 'authorized-future-vision'].includes(source.channel)
      || operation === 'past-reading' && source.channel !== 'past'
      || ['remote-view', 'dimension-view'].includes(operation) && source.at !== event.at) magicFail('MAGIC_OBSERVATION_SOURCE');
    append(draft.representations, { id: `representation:${id}`, kind: 'ability-observation', ownerMindId: event.sourceMindId,
      representationRef: source.representationRef, sourceRef: source.id, sourceEffectId: id, at: event.at });
  } else magicFail('MAGIC_UNSUPPORTED_EFFECT');
};
const cognition = (draft, event) => {
  const { operation, payload, id } = event;
  const targetMindId = magicOwn(draft.identity.occupants, event.targetId);
  if (!targetMindId) magicFail('MAGIC_TARGET_NOT_AVAILABLE');
  if (['gaze', 'interest', 'speech-control'].includes(operation)) {
    if (!magicId(payload.focusRef) || !magicOwn(draft.entities, payload.focusRef) && !magicOwn(draft.identity.bodies, payload.focusRef)) magicFail('MAGIC_CONTROL_SCOPE');
    append(draft.constraints, { id: `constraint:${id}`, ownerMindId: targetMindId, kind: operation,
      focusRef: payload.focusRef, actionRef: payload.actionRef || null, sourceEffectId: id,
      at: event.at, playerFeedbackRequired: targetMindId === draft.identity.playerMindId });
  } else if (operation === 'mental-heal') {
    // Representation/access records are append-only. Nothing erases raw
    // observations, historical memory records, secrets or external evidence.
    for (const recordId of payload.recordIds) {
      const record = draft.memories.find(row => row.id === recordId && row.ownerMindId === targetMindId);
      if (!record) magicFail('MAGIC_MEMORY_SOURCE');
      append(draft.memoryAccess, { id: `access:${id}:${recordId}`, recordId, ownerMindId: targetMindId,
        mode: 'restored-access', sourceEffectId: id, at: event.at });
    }
  } else if (operation === 'memory-share') {
    for (const recordId of payload.recordIds) {
      const record = draft.memories.find(row => row.id === recordId);
      if (!record || !payload.localMindIds.includes(record.ownerMindId) || record.learnedAt > event.at
        || !effectiveMemoryAccess(draft, record.ownerMindId, record.id)) magicFail('MAGIC_MEMORY_SOURCE');
      append(draft.representations, { id: `shared:${id}:${recordId}`, kind: 'shared-memory', ownerMindId: targetMindId,
        recordId, originalOwnerMindId: record.ownerMindId, sourceEffectId: id, at: event.at });
    }
  } else if (operation === 'memory-revoke') {
    for (const recordId of payload.recordIds) {
      if (!draft.memories.some(row => row.id === recordId && row.ownerMindId === targetMindId)) magicFail('MAGIC_MEMORY_SOURCE');
      append(draft.memoryAccess, { id: `access:${id}:${recordId}`, recordId, ownerMindId: targetMindId,
        mode: 'revoked-access', sourceEffectId: id, at: event.at });
    }
  } else magicFail('MAGIC_UNSUPPORTED_EFFECT');
};

/** Only a HOST-validated event plan may call this reducer. Atomic even when a
 * later operation fails. It never invokes models, SQL, random draws or clocks. */
export function reduceMagicEffect(state, rawEvent) {
  const event = magicJson(rawEvent); const draft = structuredClone(state);
  if (!magicId(event.id) || !magicId(event.definitionRef) || !Number.isSafeInteger(event.at) || event.at !== state.time
    || event.expiresAt !== null && (!Number.isSafeInteger(event.expiresAt) || event.expiresAt < event.at)
    || !['end', 'persist'].includes(event.sourceDeath)
    || !['physical', 'sensory', 'cognition', 'identity', 'chronology'].includes(event.family)) magicFail('MAGIC_EFFECT_SHAPE');
  const previous = draft.effects.find(row => row.id === event.id);
  if (previous) {
    if (abilityDigest(previous.event) !== abilityDigest(event)) magicFail('MAGIC_EFFECT_CONFLICT');
    return draft;
  }
  if (event.family === 'physical') physical(draft, event);
  else if (event.family === 'sensory') sensory(draft, event);
  else if (event.family === 'cognition') cognition(draft, event);
  else if (event.family === 'identity') {
    if (event.operation !== 'body-swap') magicFail('MAGIC_UNSUPPORTED_EFFECT');
    if (draft.effects.some(effect => effect.status !== 'ended' && effect.event.operation === 'body-swap'
      && [effect.event.sourceBodyId, effect.event.targetId].some(id => [event.sourceBodyId, event.targetId].includes(id)))) magicFail('MAGIC_IDENTITY_CONFLICT_REQUIRES_RULE');
    if (event.payload.originalTargetMindId !== magicOwn(draft.identity.occupants, event.targetId)) magicFail('MAGIC_IDENTITY_RETURN_CONFLICT');
    if (!['persist', 'restore-on-end'].includes(event.payload.returnPolicy)) magicFail('MAGIC_SOURCE_CHECK_REQUIRED');
    draft.identity = swapMagicOccupants(draft.identity, event.sourceBodyId, event.targetId);
  } else {
    if (event.operation !== 'death-rewind' || event.payload.branchRequest?.type !== 'MagicStoryForkRequested') magicFail('MAGIC_BRANCH_REQUEST_MISMATCH');
    append(draft.branchRequests, event.payload.branchRequest);
  }
  append(draft.effects, { id: event.id, event, startedAt: event.at, expiresAt: event.expiresAt,
    sourceDeath: event.sourceDeath, sourceBodyId: event.sourceBodyId, status: 'active' });
  return draft;
}
export const activeMagicEffects = (state, at = state.time) => state.effects.filter(effect => effect.status === 'active'
  && effect.startedAt <= at && (effect.expiresAt === null || effect.expiresAt > at));
export function settleMagicLifecycle(state, { at, sourceDeaths = [], suppress = [], resume = [], dismiss = [], contextLost = [] }) {
  const draft = structuredClone(state);
  if (!Number.isSafeInteger(at) || at < state.time || [sourceDeaths, suppress, resume, dismiss, contextLost].some(rows => !Array.isArray(rows))) magicFail('MAGIC_LIFECYCLE_INPUT');
  if (suppress.some(id => resume.includes(id)) || resume.some(id => dismiss.includes(id) || contextLost.includes(id))) magicFail('MAGIC_LIFECYCLE_CONFLICT');
  const all = [...suppress, ...resume, ...dismiss, ...contextLost];
  if (all.some(id => !draft.effects.some(effect => effect.id === id)) || sourceDeaths.some(id => !magicOwn(draft.identity.bodies, id))) magicFail('MAGIC_LIFECYCLE_TARGET');
  draft.time = at;
  for (const id of sourceDeaths) magicOwn(draft.identity.bodies, id).alive = false;
  for (const effect of draft.effects) {
    if (effect.status === 'ended') continue;
    const old = effect.status;
    if (effect.expiresAt !== null && effect.expiresAt <= at || dismiss.includes(effect.id)
      || contextLost.includes(effect.id) || effect.sourceDeath === 'end' && sourceDeaths.includes(effect.sourceBodyId)) effect.status = 'ended';
    else if (suppress.includes(effect.id)) effect.status = 'suppressed';
    else if (resume.includes(effect.id)) effect.status = 'active';
    if (effect.status === 'ended' && effect.event.operation === 'body-swap' && effect.event.payload.returnPolicy === 'restore-on-end') {
      const source = effect.event.sourceBodyId; const target = effect.event.targetId;
      if (magicOwn(draft.identity.occupants, target) !== effect.event.sourceMindId
        || draft.effects.some(other => other.id !== effect.id && other.status !== 'ended' && other.event.operation === 'body-swap'
          && [other.event.sourceBodyId, other.event.targetId].some(id => [source, target].includes(id)))) magicFail('MAGIC_IDENTITY_RETURN_CONFLICT');
      draft.identity = restoreMagicOccupants(draft.identity, { sourceBodyId: source, targetBodyId: target,
        sourceMindId: effect.event.sourceMindId, targetMindId: effect.event.payload.originalTargetMindId,
        deathPolicy: effect.event.payload.deathReturnPolicy });
    }
    if (effect.status !== old) append(draft.lifecycleEvents, { id: `lifecycle:${effect.id}:${draft.lifecycleEvents.length}`,
      effectId: effect.id, from: old, to: effect.status, at });
  }
  return draft;
}
/** Validate the committed projection, not a caller-authored relation. As with
 * reduceMagicEffect, state.effects must come from the private HOST authority.
 * Public JSON/digests cannot prove SQL provenance or authenticate an import. */
function originalReturnEffect(state, effectId) {
  validateMagicIdentity(state.identity);
  const rows = state.effects?.filter(row => row.id === effectId);
  const effect = rows?.length === 1 && rows[0]; const event = effect?.event;
  const definition = magicDefinition('milia:basic@1');
  const eventKeys = ['id', 'type', 'family', 'operation', 'definitionRef', 'definitionFingerprint',
    'grantId', 'sourceMindId', 'sourceBodyId', 'targetId', 'at', 'expiresAt', 'sourceDeath', 'payload', 'authorizationRef'];
  if (!effect || !magicExact(effect, ['id', 'event', 'startedAt', 'expiresAt', 'sourceDeath', 'sourceBodyId', 'status'])
    || !magicExact(event, eventKeys) || event.id !== effect.id || !magicId(event.id)
    || event.type !== 'MagicEffectEstablished' || event.family !== 'identity' || event.operation !== 'body-swap'
    || event.definitionRef !== definition.ref || event.definitionFingerprint !== definition.fingerprint
    || event.sourceMindId !== 'mind:milia' || event.sourceBodyId !== 'body:milia'
    || !magicId(event.targetId) || event.targetId === event.sourceBodyId || !magicId(event.authorizationRef)
    || !Number.isSafeInteger(event.at) || event.at < 0 || event.at > state.time
    || effect.startedAt !== event.at || effect.expiresAt !== event.expiresAt
    || effect.sourceDeath !== event.sourceDeath || effect.sourceBodyId !== event.sourceBodyId
    || !['active', 'suppressed', 'ended'].includes(effect.status)
    || !magicExact(event.payload, ['returnPolicy', 'originalTargetMindId'])
    || !magicOwn(state.identity.minds, event.payload.originalTargetMindId)
    || event.payload.originalTargetMindId === event.sourceMindId
    || !magicOwn(state.identity.bodies, event.targetId)) magicFail('MAGIC_ORIGINAL_RETURN_EFFECT');
  const grant = state.grants?.find(row => row.id === event.grantId);
  if (!grant || grant.actorId !== 'milia' || grant.definitionRef !== definition.ref
    || grant.definitionFingerprint !== definition.fingerprint || grant.authority !== 'HOST_GRANT'
    || grant.binding?.kind !== 'body' || grant.binding.id !== event.sourceBodyId
    || grant.issuance?.initialMindId !== event.sourceMindId || grant.issuance.initialBodyId !== event.sourceBodyId
    || abilityDigest(grant.source) !== abilityDigest(definition.sources)
    || abilityDigest(grant.issuance.approval) !== abilityDigest(magicOwn(state.grantApprovals, grant.id)))
    magicFail('MAGIC_ORIGINAL_RETURN_EFFECT');
  assertBodyFactorGrantApproval(grant.issuance.approval);
  // A timed/automatic-return legacy event is not silently upgraded. New HOST
  // establishments use reduceMagicEffect with a null expiry and persist payload;
  // the unchanged command facade still requires its old numeric end boundary.
  if (event.expiresAt !== null || event.sourceDeath !== 'persist' || event.payload.returnPolicy !== 'persist')
    magicFail('MAGIC_ORIGINAL_RETURN_POLICY_UNSUPPORTED');
  return effect;
}
const originalRelation = (state, effect) => ({
  version: 1, type: 'OriginalSwapReturnAuthority', policy: ORIGINAL_SWAP_RETURN_POLICY,
  effectId: effect.id, eventDigest: abilityDigest(effect.event), branchId: state.branchId, generation: state.generation,
  sourceMindId: effect.event.sourceMindId, targetMindId: effect.event.payload.originalTargetMindId,
  sourceBodyId: effect.event.sourceBodyId, targetBodyId: effect.event.targetId,
});
const originalOccupancy = (identity, event, restored) =>
  identity.occupants[event.sourceBodyId] === (restored ? event.sourceMindId : event.payload.originalTargetMindId)
  && identity.occupants[event.targetId] === (restored ? event.payload.originalTargetMindId : event.sourceMindId);

/** HOST_ONLY derivation, not a bearer token or a new ability issuance. A copied
 * receipt has no authority over another mind, event, branch or generation. */
export function establishOriginalSwapReturnAuthority(state, effectId) {
  const effect = originalReturnEffect(state, effectId);
  if (effect.status === 'ended') magicFail('MAGIC_ORIGINAL_RETURN_ENDED');
  if (!originalOccupancy(state.identity, effect.event, false)) magicFail('MAGIC_IDENTITY_RETURN_CONFLICT');
  return structuredClone(originalRelation(state, effect));
}

/** Qualified HOST protocol core. The REQUIRED private hook must derive current
 * acting identity, capability and suppression from canonical rules/events, NOT
 * actor request fields. No such world-condition producer is implemented here.
 * No SQL/public wiring, cast use, renewed consent/contact, TTL or new grant. */
export function restoreOriginalSwapRelation(state, rawRequest, host) {
  const request = magicJson(rawRequest);
  if (!magicExact(request, ['requestId', 'relation']) || !magicId(request.requestId)) magicFail('MAGIC_ORIGINAL_RETURN_REQUEST');
  const effect = originalReturnEffect(state, request.relation?.effectId); const event = effect.event;
  const relation = originalRelation(state, effect);
  if (abilityDigest(request.relation) !== abilityDigest(relation)) magicFail('MAGIC_ORIGINAL_RETURN_EFFECT');
  const prefix = `original-return:${abilityDigest(request.requestId)}:`;
  const id = `${prefix}${abilityDigest(relation)}`;
  const matches = state.lifecycleEvents.filter(row => row.id.startsWith(prefix));
  const old = matches[0];
  const receipt = at => ({ version: 1, type: 'OriginalSwapRelationRestored', policy: ORIGINAL_SWAP_RETURN_POLICY,
    requestId: request.requestId, relation: structuredClone(relation), lifecycleEventId: id, at });
  if (matches.length) {
    if (matches.length !== 1 || !magicExact(old, ['id', 'effectId', 'from', 'to', 'at'])
      || old.id !== id || old.effectId !== effect.id || old.from !== 'active' || old.to !== 'ended'
      || !Number.isSafeInteger(old.at) || old.at < event.at || old.at > state.time
      || effect.status !== 'ended' || !originalOccupancy(state.identity, event, true))
      magicFail('MAGIC_ORIGINAL_RETURN_IDEMPOTENCY_CONFLICT');
    return { state: structuredClone(state), receipt: receipt(old.at), replayed: true };
  }
  if (effect.status === 'ended') magicFail('MAGIC_ORIGINAL_RETURN_ENDED');
  if (effect.status === 'suppressed') magicFail('MAGIC_ORIGINAL_RETURN_SUPPRESSED');
  if (!state.identity.bodies[event.sourceBodyId].alive || !state.identity.bodies[event.targetId].alive)
    magicFail('MAGIC_ORIGINAL_RETURN_DEAD_BODY');
  if (state.effects.some(other => other.id !== effect.id && other.status !== 'ended' && other.event.operation === 'body-swap'
    && [other.event.sourceBodyId, other.event.targetId].some(bodyId => [event.sourceBodyId, event.targetId].includes(bodyId))))
    magicFail('MAGIC_ORIGINAL_RETURN_OVERLAP_UNSUPPORTED');
  if (!originalOccupancy(state.identity, event, false)) magicFail('MAGIC_IDENTITY_RETURN_CONFLICT');
  if (typeof host?.resolveCurrentReturnReadiness !== 'function') magicFail('MAGIC_ORIGINAL_RETURN_CONDITION_HOOK_REQUIRED');
  // Detached inputs prevent a producer from partially mutating the caller's
  // projection. Producer authenticity is a private HOST integration obligation.
  const ready = magicJson(host.resolveCurrentReturnReadiness(structuredClone({
    identity: state.identity, relation, at: state.time, branchId: state.branchId, generation: state.generation,
  })));
  if (!magicExact(ready, ['version', 'type', 'sourceEventId', 'actingMindId', 'occupiedBodyId', 'canAct', 'restorationSuppressed'])
    || ready.version !== 1 || ready.type !== 'HostOriginalSwapReturnReadiness' || !magicId(ready.sourceEventId)
    || typeof ready.canAct !== 'boolean' || typeof ready.restorationSuppressed !== 'boolean')
    magicFail('MAGIC_ORIGINAL_RETURN_CONDITION_SOURCE');
  if (ready.actingMindId !== event.sourceMindId || ready.occupiedBodyId !== bodyForMind(state.identity, event.sourceMindId))
    magicFail('MAGIC_ORIGINAL_RETURN_AUTHORITY');
  if (!ready.canAct) magicFail('MAGIC_ORIGINAL_RETURN_INCAPABLE');
  if (ready.restorationSuppressed) magicFail('MAGIC_ORIGINAL_RETURN_SUPPRESSED');
  const draft = structuredClone(state);
  draft.identity = restoreMagicOccupants(draft.identity, { sourceBodyId: event.sourceBodyId, targetBodyId: event.targetId,
    sourceMindId: event.sourceMindId, targetMindId: event.payload.originalTargetMindId, deathPolicy: 'retain-occupancy' });
  draft.effects.find(row => row.id === effect.id).status = 'ended';
  append(draft.lifecycleEvents, { id, effectId: effect.id, from: 'active', to: 'ended', at: state.time });
  return { state: draft, receipt: receipt(state.time), replayed: false };
}

export function effectiveMemoryAccess(state, mindId, recordId) {
  const raw = state.memories.find(row => row.id === recordId && row.ownerMindId === mindId);
  if (!raw || !Number.isSafeInteger(raw.learnedAt) || raw.learnedAt > state.time) return false;
  const access = state.memoryAccess.filter(row => row.ownerMindId === mindId && row.recordId === recordId
    && activeMagicEffects(state).some(effect => effect.id === row.sourceEffectId)).at(-1);
  return access ? access.mode === 'restored-access' : raw.accessible !== false && raw.revoked !== true;
}
/** Physical movement/impact rules consume these typed, source-bound modifiers.
 * No arbitrary field patch and no invented numeric RPG bonus. Actual force,
 * collisions and institutional reaction remain the parent's physical rules. */
export function projectMagicPhysicalModifiers(state, entityId) {
  return activeMagicEffects(state).filter(effect => effect.event.targetId === entityId
    && ['strength', 'self-float', 'mass-float'].includes(effect.event.operation)).map(effect => ({
    effectId: effect.id, definitionRef: effect.event.definitionRef,
    domain: effect.event.operation === 'strength' ? 'force' : 'elevation',
    quality: effect.event.operation === 'strength' ? 'body-strengthened'
      : effect.event.operation === 'self-float' ? 'slightly-above-support' : 'object-levitated',
    sourceBodyId: effect.sourceBodyId,
  }));
}
export function projectMagicConstraints(state, mindId) {
  const active = new Set(activeMagicEffects(state).map(effect => effect.id));
  return state.constraints.filter(row => row.ownerMindId === mindId && active.has(row.sourceEffectId));
}

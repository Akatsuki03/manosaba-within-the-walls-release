import { magicFail, magicJson, magicId, magicExact, magicOwn } from './ability-definitions.mjs';

/** Target classification is independent of ability growth. Only a privately
 * derived HOST classification with an actual source may establish eligibility. */
export function validateMagicClassification(value) {
  if (!magicExact(value, ['kind', 'sourceEventId', 'approvedBy'])
    || !['witch', 'non-witch', 'unknown'].includes(value.kind)
    || !magicId(value.sourceEventId) || !magicId(value.approvedBy)) magicFail('MAGIC_CLASSIFICATION_SOURCE');
  return value;
}
export const magicWitchEligible = body => body?.magicClassification
  ? validateMagicClassification(body.magicClassification).kind === 'witch' : false;

/** HOST_ONLY identity projection. Actor/persona objects are never exchanged.
 * Position, injury and inventory belong exclusively to physical bodies;
 * records and player control belong exclusively to stable minds. */
export function createMagicIdentity(actors, playerActorId) {
  actors = magicJson(actors);
  if (!Array.isArray(actors) || actors.length > 128 || new Set(actors.map(row => row.actorId)).size !== actors.length) magicFail('MAGIC_IDENTITY_SHAPE');
  const minds = {}; const bodies = {}; const occupants = {};
  for (const row of actors) {
    if (![row.actorId, row.locationId, row.islandId].every(magicId)) magicFail('MAGIC_IDENTITY_SHAPE');
    // A bare witch flag has no source and cannot silently become eligibility.
    if (Object.hasOwn(row, 'witch') || row.alive !== undefined && typeof row.alive !== 'boolean') magicFail('MAGIC_CLASSIFICATION_SOURCE');
    const mindId = `mind:${row.actorId}`; const bodyId = `body:${row.actorId}`;
    minds[mindId] = { id: mindId, actorId: row.actorId, memoryOwnerId: mindId };
    bodies[bodyId] = { id: bodyId, actorId: row.actorId, locationId: row.locationId,
      islandId: row.islandId, alive: row.alive !== false, injuries: row.injuries || [], inventory: row.inventory || [],
      ...(row.magicClassification === undefined ? {} : { magicClassification: validateMagicClassification(row.magicClassification) }) };
    occupants[bodyId] = mindId;
  }
  const identity = { version: 1, minds, bodies, occupants,
    playerMindId: playerActorId === null ? null : `mind:${playerActorId}` };
  validateMagicIdentity(identity); return identity;
}
export function validateMagicIdentity(identity) {
  if (identity?.version !== 1 || !identity.minds || !identity.bodies || !identity.occupants) magicFail('MAGIC_IDENTITY_SHAPE');
  const minds = Object.keys(identity.minds); const bodies = Object.keys(identity.bodies);
  if (minds.length !== bodies.length || Object.keys(identity.occupants).length !== bodies.length
    || new Set(Object.values(identity.occupants)).size !== minds.length
    || bodies.some(id => !minds.includes(magicOwn(identity.occupants, id)))) magicFail('MAGIC_IDENTITY_BIJECTION');
  if (identity.playerMindId !== null && !minds.includes(identity.playerMindId)) magicFail('MAGIC_IDENTITY_PLAYER');
  for (const id of minds) if (!magicId(id) || magicOwn(identity.minds, id).id !== id || magicOwn(identity.minds, id).memoryOwnerId !== id) magicFail('MAGIC_IDENTITY_SHAPE');
  for (const id of bodies) {
    const body = magicOwn(identity.bodies, id);
    if (!magicId(id) || body.id !== id || !magicId(body.actorId) || !magicId(body.locationId) || !magicId(body.islandId)
      || typeof body.alive !== 'boolean' || !Array.isArray(body.injuries) || !Array.isArray(body.inventory)) magicFail('MAGIC_IDENTITY_SHAPE');
    if (Object.hasOwn(body, 'witch')) magicFail('MAGIC_CLASSIFICATION_SOURCE');
    if (body.magicClassification !== undefined) validateMagicClassification(body.magicClassification);
  }
  return true;
}
export const bodyForMind = (identity, mindId) => Object.keys(identity.occupants).find(bodyId => magicOwn(identity.occupants, bodyId) === mindId);
export const mindInBody = (identity, bodyId) => magicOwn(identity.occupants, bodyId);
export const playerBodyId = identity => bodyForMind(identity, identity.playerMindId);
export function swapMagicOccupants(identity, firstBodyId, secondBodyId) {
  validateMagicIdentity(identity);
  if (firstBodyId === secondBodyId || !magicOwn(identity.bodies, firstBodyId)?.alive || !magicOwn(identity.bodies, secondBodyId)?.alive) magicFail('MAGIC_SWAP_TARGET');
  return exchangeOccupancy(identity, firstBodyId, secondBodyId);
}
function exchangeOccupancy(identity, firstBodyId, secondBodyId) {
  const copy = structuredClone(identity);
  [copy.occupants[firstBodyId], copy.occupants[secondBodyId]] = [magicOwn(copy.occupants, secondBodyId), magicOwn(copy.occupants, firstBodyId)];
  validateMagicIdentity(copy); return copy;
}
/** Return is NOT a new live-target establishment and never resurrects a body.
 * Lore does not settle dead-body return, so callers must name an approved
 * policy; retain-occupancy explicitly ends the effect without moving minds. */
export function restoreMagicOccupants(identity, { sourceBodyId, targetBodyId, sourceMindId, targetMindId, deathPolicy }) {
  validateMagicIdentity(identity);
  const source = magicOwn(identity.bodies, sourceBodyId); const target = magicOwn(identity.bodies, targetBodyId);
  if (!source || !target || sourceBodyId === targetBodyId
    || mindInBody(identity, targetBodyId) !== sourceMindId || mindInBody(identity, sourceBodyId) !== targetMindId) magicFail('MAGIC_IDENTITY_RETURN_CONFLICT');
  if (!source.alive || !target.alive) {
    if (!['restore-occupancy', 'retain-occupancy'].includes(deathPolicy)) magicFail('MAGIC_IDENTITY_DEATH_POLICY_REQUIRED',
      '换身归还涉及已死亡身体，需宿主按来源批准 restore-occupancy 或 retain-occupancy；不恢复生命。');
    if (deathPolicy === 'retain-occupancy') return structuredClone(identity);
  }
  return exchangeOccupancy(identity, sourceBodyId, targetBodyId);
}
/** No implicit grant inheritance: each grant declares an actual identity. */
export function grantMatchesIdentity(grant, identity, actorId, mediumIds = []) {
  const mindId = Object.values(identity.minds).find(row => row.actorId === actorId)?.id;
  if (!mindId) return false;
  if (grant.binding.kind === 'mind') return grant.binding.id === mindId;
  if (grant.binding.kind === 'body') return grant.binding.id === bodyForMind(identity, mindId);
  if (grant.binding.kind === 'medium') return mediumIds.includes(grant.binding.id)
    && magicOwn(identity.bodies, bodyForMind(identity, mindId))?.inventory.includes(grant.binding.id);
  return false;
}

/** Separate opt-in HOST relation policy, NOT a changed milia:basic@1 grant or
 * lifecycle contract. This receipt never grants new swaps or portable powers.
 * Current mental ability/suppression requires the named private HOST producer;
 * identity v1 has no consciousness fact and injuries are not medical rules. */
export const ORIGINAL_SWAP_RETURN_POLICY = Object.freeze({
  version: 1, ref: 'original-milia-relation-return@1',
  approvalRef: 'user-gameplay-policy@20261024-v1',
  sourceMindId: 'mind:milia', scope: 'original-established-relation-only',
  death: 'reject-retain-occupancy-no-revival', overlap: 'unsupported-in-this-version',
  requiredHook: 'resolveCurrentReturnReadiness',
});

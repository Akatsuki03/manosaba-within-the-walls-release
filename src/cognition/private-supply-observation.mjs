import { createHash } from 'node:crypto';

// This is an owner-acquired cognitive source, never a scene fact or a
// public disclosure. Ordinary observation ownership and ancestry still apply.
export const PRIVATE_SUPPLY_CHANNEL = 'institutional_custody_private';
export const PRIVATE_SUPPLY_OBSERVATION_EVENT = 'institutional_custody_owner_source';
export const privateSupplyObservationId = (commitRef, ownerId) => `custody-observation:${createHash('sha256')
  .update(JSON.stringify([PRIVATE_SUPPLY_OBSERVATION_EVENT, commitRef, ownerId])).digest('hex').slice(0, 48)}`;
export const isPrivateSupplyObservationId = value => typeof value === 'string' && /^custody-observation:[a-f0-9]{48}$/u.test(value);
export const isPrivateSupplyObservation = observation => observation?.channel === PRIVATE_SUPPLY_CHANNEL
  || isPrivateSupplyObservationId(observation?.id);
export const hasPrivateSupplyObservation = packet => [packet?.observations, packet?.recallSources,
  packet?.data?.recall?.observations, packet?.data?.recall?.recallSources]
  .some(rows => Array.isArray(rows) && rows.some(isPrivateSupplyObservation));

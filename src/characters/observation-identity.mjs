import { createHash } from 'node:crypto';
import { runtimeRevisionForState } from '../content/content-revisions.mjs';
import { actorHandle } from './actor-perception.mjs';

/** Performer is distinct from the observation owner. No historical inference. */
export function observationPerformer(state, ownerId, performerId) {
  if (state.exampleId !== 'agent' || runtimeRevisionForState(state).policy.observationPerformerVersion !== 1 || !performerId) return {};
  return { sourceActorHandle: actorHandle(ownerId, performerId), sourceRelation: ownerId === performerId ? 'self' : 'other' };
}

/** Owner-local provenance tokens. Never rename a historical observation. */
export function actorObservationId(state, eventKey, ownerId) {
  if (state.exampleId !== 'agent' || runtimeRevisionForState(state).policy.sourceIds !== 'opaque-owner-event@1') return `${eventKey}:${ownerId}`;
  return `obs-${createHash('sha256').update(JSON.stringify(['owner-event@1', eventKey, ownerId])).digest('hex').slice(0, 48)}`;
}

import { ADMISSION_RUNTIME_REVISION } from '../agents/ordinary-admission32.mjs';
import { EVENT_DIRECTOR_RUNTIME_REVISION } from '../director/director-event-runtime.mjs';
// Only authenticated Host state/root revision may select the publication clock.
export const PUBLICATION_RUNTIME_REVISION = 'agent-prison-runtime@31';

// The earlier contribution anchor remains in the sealed manifest/certificates.
// The formal result is appended after the settled final wave, at its clock.
export const ordinaryResultOccurredAt = (revisionId, manifest) =>
  [PUBLICATION_RUNTIME_REVISION, ADMISSION_RUNTIME_REVISION, EVENT_DIRECTOR_RUNTIME_REVISION].includes(revisionId) ? manifest.learnedAt : manifest.occurredAt;

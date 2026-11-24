import { ADMISSION_RUNTIME_REVISION } from '../agents/ordinary-admission32.mjs';
import { EVENT_DIRECTOR_RUNTIME_REVISION } from '../director/director-event-runtime.mjs';
import { PUBLICATION_RUNTIME_REVISION } from '../scenes/ordinary-publication31.mjs';
// Pure Host-owned capacity dispatch; no content/communication/actor dependencies.
export const CAPACITY_RUNTIME_REVISION = 'agent-prison-runtime@30';
// Complete certificate envelope, NOT a packet/token/job/model budget increase.
// Existing IDs <=128 ASCII bytes; hashes64; safe-integer times16 digits.
// 13 authored actors + at most1 custom =>14. Source refs r and distinct source
// speakers d are independent: 1<=d<=r<=3; multiple refs may name the SAME r1.
// Eligible owners n<=14-d. Each script: n committed certs +one delivery;
// invitation:two certs; typed choice:one; each contribution:one expression +n
// prefix certs, each retaining ALL14 physical audience IDs. Certificate count
// is r*(n+1)+3+2*(n+1), maximum73 at r=3,d=1,n=13 (not63 at three speakers).
// With three refs totaling512CU, invitation/two contributions each512CU and
// worst6B/CU JSON escaping: manifest122338B/suffix122793B. The existing broader
// pure3072CU text envelope (three512CU scripts) reaches128482B/128937B.
// 8*16KiB=131072 is the first16KiB boundary covering the full legal envelope;
// event omits source prose and is smaller. No ref/owner/certificate is dropped.
// Only callers' authenticated state/root revision selects this branch, never
// a candidate/manifest/suffix self-reported version or budget.
export const ORDINARY_CAPACITY30_BYTES = 131072;
const legacy = Object.freeze({ manifestBytes: 32768, suffixBytes: 8192, eventBytes: 8192 });
const capacity30 = Object.freeze({ manifestBytes: ORDINARY_CAPACITY30_BYTES,
  suffixBytes: ORDINARY_CAPACITY30_BYTES, eventBytes: ORDINARY_CAPACITY30_BYTES });
export const ordinaryCapacityForRevision = revisionId => [CAPACITY_RUNTIME_REVISION, PUBLICATION_RUNTIME_REVISION, ADMISSION_RUNTIME_REVISION, EVENT_DIRECTOR_RUNTIME_REVISION].includes(revisionId) ? capacity30 : legacy;

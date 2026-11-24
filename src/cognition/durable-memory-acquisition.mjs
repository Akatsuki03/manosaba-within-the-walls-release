import { createHash } from 'node:crypto';
import { isProxy } from 'node:util/types';

/** HOST-only metadata protocol. Not a grant, capability, SQL reader or publisher.
 * Every reference, ancestry, occupancy, scene and completeness assertion must be
 * independently checked inside the future Domain-private same-DB transaction,
 * BEFORE reading any source body. Structural validity does not prove truth.
 * No import of legacy TTL effects: durable ownership never revives expired ACLs.
 */
const fail = (code = 'DURABLE_ACQUISITION_INVALID') => {
  throw Object.assign(new Error('Invalid durable acquisition metadata; publish nothing.'), { code });
};
const freeze = value => {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
};
const canonical = value => {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort()
    .map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
};
const digest = value => createHash('sha256').update(canonical(value)).digest('hex');
const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const equal = (a, b) => canonical(a) === canonical(b);
const id = value => typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9:._@/-]{0,191}$/u.test(value);
const hash = value => typeof value === 'string' && /^[a-f0-9]{64}$/u.test(value);
const integer = value => Number.isSafeInteger(value) && value >= 0 && !Object.is(value, -0);
const exact = (value, keys) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).length !== keys.length || keys.some(key => !Object.hasOwn(value, key))) fail();
};
const array = (value, maximum) => {
  if (!Array.isArray(value)) fail();
  if (value.length > maximum) fail('DURABLE_ACQUISITION_BUDGET');
};
const unique = values => {
  if (new Set(values).size !== values.length) fail('DURABLE_ACQUISITION_DUPLICATE');
};
const ids = (values, maximum) => {
  array(values, maximum);
  if (!values.every(id)) fail();
  unique(values);
};

// Snapshot without executing caller code. Reject proxies before reflection,
// accessors before value access, symbols, sparse/augmented arrays, prototypes,
// cycles AND shared aliases. Bounded even before protocol-specific inspection.
function snapshot(input) {
  const seen = new WeakSet();
  let nodes = 0;
  function copy(value, depth) {
    if (++nodes > 100000 || depth > 16) fail('DURABLE_ACQUISITION_BUDGET');
    if (typeof value === 'string') {
      if (value.length > 256 || !value.isWellFormed()) fail();
      return value;
    }
    if (typeof value === 'number') { if (!integer(value)) fail(); return value; }
    if (!value || typeof value !== 'object' || isProxy(value) || seen.has(value)) fail();
    const isArray = Array.isArray(value);
    if (Object.getPrototypeOf(value) !== (isArray ? Array.prototype : Object.prototype)) fail();
    seen.add(value);
    const keys = Reflect.ownKeys(value);
    if (keys.some(key => typeof key !== 'string')) fail();
    if (isArray) {
      const length = Object.getOwnPropertyDescriptor(value, 'length').value;
      if (length > 2048) fail('DURABLE_ACQUISITION_BUDGET');
      if (keys.length !== length + 1) fail();
      const result = [];
      for (let i = 0; i < length; i += 1) {
        const descriptor = Object.getOwnPropertyDescriptor(value, String(i));
        if (!descriptor?.enumerable || !Object.hasOwn(descriptor, 'value')) fail();
        result.push(copy(descriptor.value, depth + 1));
      }
      return result;
    }
    if (keys.length > 32) fail('DURABLE_ACQUISITION_BUDGET');
    const result = {};
    for (const key of keys) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) fail();
      Object.defineProperty(result, key, { value: copy(descriptor.value, depth + 1), enumerable: true,
        writable: true, configurable: true });
    }
    return result;
  }
  return copy(input, 0);
}

export const DURABLE_MEMORY_ACQUISITION_VERSION = 1;
export const DURABLE_MEMORY_ACQUISITION_PROTOCOL = freeze({
  ref: 'host-durable-memory-acquisition@1', version: DURABLE_MEMORY_ACQUISITION_VERSION,
  policyRef: 'user-gameplay-policy@20261024-v1',
  purpose: 'host-only-metadata-obligations-not-committed-authority',
  coverage: 'complete-cast-scene-all-to-all-with-self-covered-originals',
  lifecycle: 'one-time-acquisition',
  maxParticipants: 16, maxSources: 128, maxObligations: 1920, maxPriorUses: 256,
});
export const DURABLE_MEMORY_ACQUISITION_REFERENCE = freeze({
  ref: DURABLE_MEMORY_ACQUISITION_PROTOCOL.ref, fingerprint: digest(DURABLE_MEMORY_ACQUISITION_PROTOCOL),
});
const P = DURABLE_MEMORY_ACQUISITION_PROTOCOL;
const scopeKeys = ['version', 'runId', 'branchId', 'headCommitRef', 'generation', 'revision',
  'worldTime', 'useId', 'definition', 'sourcePolicy'];
function reference(value) {
  exact(value, ['ref', 'fingerprint']);
  if (!id(value.ref) || !hash(value.fingerprint)) fail();
}
function scope(value) {
  exact(value, scopeKeys);
  if (value.version !== 1 || !['runId', 'branchId', 'headCommitRef', 'useId'].every(key => id(value[key]))
    || !['generation', 'revision', 'worldTime'].every(key => integer(value[key]))) fail();
  reference(value.definition);
  reference(value.sourcePolicy);
  if (value.sourcePolicy.ref !== P.policyRef) fail('DURABLE_ACQUISITION_POLICY');
}

function normalize(input) {
  exact(input, ['scope', 'casterMindId', 'scene', 'participants', 'participantManifest',
    'sources', 'sourceManifest', 'priorUses']);
  scope(input.scope);
  exact(input.scene, ['sceneId', 'continuityRef']);
  if (!id(input.casterMindId) || !id(input.scene.sceneId) || !id(input.scene.continuityRef)) fail();
  array(input.participants, P.maxParticipants);
  if (!input.participants.length) fail();
  for (const participant of input.participants) {
    exact(participant, ['mindId', 'actorId', 'bodyId']);
    if (!Object.values(participant).every(id)) fail();
  }
  for (const key of ['mindId', 'actorId', 'bodyId']) unique(input.participants.map(row => row[key]));
  input.participants.sort((a, b) => compare(a.mindId, b.mindId));
  const minds = input.participants.map(row => row.mindId);
  const byMind = new Map(input.participants.map(row => [row.mindId, row]));
  if (!byMind.has(input.casterMindId)) fail('DURABLE_ACQUISITION_OWNER');
  exact(input.participantManifest, ['kind', 'closureRef', 'mindIds']);
  const pm = input.participantManifest;
  ids(pm.mindIds, P.maxParticipants);
  pm.mindIds.sort(compare);
  if (pm.kind !== 'complete-cast-scene-participants' || !id(pm.closureRef) || !equal(pm.mindIds, minds))
    fail('DURABLE_ACQUISITION_CLOSURE');

  array(input.sources, P.maxSources);
  for (const source of input.sources) {
    exact(source, ['observationId', 'sourceOwnerMindId', 'ownerActorId', 'sourceCommitRef',
      'sourceRunId', 'sourceOriginBranchId', 'learnedAt', 'citation', 'authorizationRef', 'authorizationScope']);
    if (!['observationId', 'sourceOwnerMindId', 'ownerActorId', 'sourceCommitRef', 'sourceRunId',
      'sourceOriginBranchId', 'authorizationRef'].every(key => id(source[key]))) fail();
    reference(source.citation);
    scope(source.authorizationScope);
    if (!equal(source.authorizationScope, input.scope) || source.sourceRunId !== input.scope.runId)
      fail('DURABLE_ACQUISITION_SCOPE');
    // An authorized ancestor may originate on a different branch. Only the
    // private adapter can prove ancestry; never compare origin branch to head.
    if (!integer(source.learnedAt) || source.learnedAt > input.scope.worldTime)
      fail('DURABLE_ACQUISITION_FUTURE');
    if (byMind.get(source.sourceOwnerMindId)?.actorId !== source.ownerActorId)
      fail('DURABLE_ACQUISITION_OWNER');
  }
  unique(input.sources.map(row => row.observationId));
  input.sources.sort((a, b) => compare(a.observationId, b.observationId));
  exact(input.sourceManifest, ['kind', 'closureRef', 'owners']);
  const sm = input.sourceManifest;
  array(sm.owners, P.maxParticipants);
  if (sm.kind !== 'complete-cast-owned-memory-metadata' || !id(sm.closureRef))
    fail('DURABLE_ACQUISITION_CLOSURE');
  for (const owner of sm.owners) {
    exact(owner, ['sourceOwnerMindId', 'closureRef', 'observationIds']);
    if (!id(owner.sourceOwnerMindId) || !id(owner.closureRef)) fail();
    ids(owner.observationIds, P.maxSources);
    owner.observationIds.sort(compare);
    const actual = input.sources.filter(row => row.sourceOwnerMindId === owner.sourceOwnerMindId)
      .map(row => row.observationId);
    if (!equal(actual, owner.observationIds)) fail('DURABLE_ACQUISITION_CLOSURE');
  }
  unique(sm.owners.map(row => row.sourceOwnerMindId));
  sm.owners.sort((a, b) => compare(a.sourceOwnerMindId, b.sourceOwnerMindId));
  if (!equal(sm.owners.map(row => row.sourceOwnerMindId), minds)) fail('DURABLE_ACQUISITION_CLOSURE');
  array(input.priorUses, P.maxPriorUses);
  for (const prior of input.priorUses) {
    exact(prior, ['runId', 'useId', 'planDigest']);
    if (!id(prior.runId) || !id(prior.useId) || !hash(prior.planDigest)) fail();
  }
  unique(input.priorUses.map(row => canonical([row.runId, row.useId])));
  return input;
}

/** Pure, atomic planner; throws rather than returning partial acquisition.
 * Metadata manifests are REQUIRED claims, not authenticated completeness proof.
 * The adapter must prove complete legal current modelled ownership (including
 * authenticated empty owners), actual scene/occupancy, source policy and exact
 * scope under SQL authority. No RAG/top-K, consent, offer, preknowledge, active-
 * channel or existing-recipient-record inference is performed here.
 *
 * worldTime/learnedAt are nonnegative safe-integer story-clock units. Bodies and
 * actor handles are explicit cast-boundary mappings, NOT stable mind identity.
 * priorUses is an untrusted representation of a future authoritative use ledger.
 * An unkeyed digest binds integrity only; it is never an authorization token.
 */
export function buildDurableMemoryAcquisitionPlan(value) {
  const input = normalize(snapshot(value));
  const { priorUses, ...request } = input;
  const obligationCount = request.sources.length * (request.participants.length - 1);
  if (obligationCount > P.maxObligations) fail('DURABLE_ACQUISITION_BUDGET');
  if (!obligationCount) fail('DURABLE_ACQUISITION_NOOP_EMPTY');
  const sourceClosure = request.participants.map(({ mindId }) => ({ sourceOwnerMindId: mindId,
    observationIds: request.sources.filter(row => row.sourceOwnerMindId === mindId).map(row => row.observationId) }));
  const recipientClosure = [];
  const obligations = [];
  for (const { mindId } of request.participants) {
    const own = [], acquire = [];
    for (const source of request.sources) {
      if (source.sourceOwnerMindId === mindId) own.push(source.observationId);
      else {
        acquire.push(source.observationId);
        obligations.push({ kind: 'durable-owned-memory-copy', recipientMindId: mindId,
          sourceOwnerMindId: source.sourceOwnerMindId, observationId: source.observationId,
          ownerActorId: source.ownerActorId, sourceCommitRef: source.sourceCommitRef });
      }
    }
    recipientClosure.push({ recipientMindId: mindId, selfCoveredObservationIds: own, acquireObservationIds: acquire });
  }
  const base = { schemaVersion: 1, protocol: { ...DURABLE_MEMORY_ACQUISITION_REFERENCE },
    purpose: P.purpose, request, lifecycle: { kind: 'one-time-acquisition' },
    sourceClosure, recipientClosure, obligations,
    obligationDigest: digest({ sourceClosure, recipientClosure, obligations }) };
  const planDigest = digest(base);
  const previous = priorUses.find(row => row.runId === request.scope.runId && row.useId === request.scope.useId);
  if (previous && previous.planDigest !== planDigest) fail('DURABLE_ACQUISITION_USE_CONFLICT');
  return freeze({ ...base, planDigest, disposition: previous ? 'retry-noop' : 'publish-required' });
}

/** Validate closed canonical REPRESENTATION only, never SQL truth/authorization.
 * Rebuild exact obligations so a caller cannot drop a recipient/source/self row,
 * insert lifetime/body/permission fields, or substitute a rehashed partial list.
 * Caller still needs an independent private authority + transaction before read
 * and durable SQL publication/history/next-task delivery; production is CLOSED.
 * Owned copies persist after departure/death; no future learned-memory stream.
 */
export function assertDurableMemoryAcquisitionPlan(value) {
  const plan = snapshot(value);
  exact(plan, ['schemaVersion', 'protocol', 'purpose', 'request', 'lifecycle', 'sourceClosure',
    'recipientClosure', 'obligations', 'obligationDigest', 'planDigest', 'disposition']);
  if (!['publish-required', 'retry-noop'].includes(plan.disposition)) fail();
  exact(plan.request, ['scope', 'casterMindId', 'scene', 'participants', 'participantManifest', 'sources', 'sourceManifest']);
  const rebuilt = buildDurableMemoryAcquisitionPlan({ ...plan.request, priorUses: [] });
  if (!equal({ ...plan, disposition: 'publish-required' }, rebuilt)) fail('DURABLE_ACQUISITION_PLAN_MISMATCH');
  return freeze(plan);
}

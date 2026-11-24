import { createHash } from 'node:crypto';
import { isProxy } from 'node:util/types';

// HOST-only pure protocol, NOT an authorization issuer, actor packet, or runtime
// action. The caller must privately prove event truth/closure, ancestry, occupancy,
// source approval and prior SQL history. Hashes only bind metadata integrity.
// No production profile registry or emotional episode producer exists here.
const POLICY = 'user-gameplay-policy@20261024-v1';
const QUALIFICATION = 'explicit-protocol-profile-not-production';
const compiledProfiles = new WeakMap();
const fail = code => { throw Object.assign(new Error(code), { code }); };
const requireThat = (condition, code = 'GROWTH_SCHEMA') => { if (!condition) fail(code); };
const freeze = value => {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
};
export const MAGIC_GROWTH_SCHEMA = freeze({
  ref: 'host-emotional-growth-obligations@1', version: 1, policySourceRef: POLICY,
  qualification: QUALIFICATION, productionRegistrationEnabled: false,
  qualities: ['factor-agitation', 'concept-expanded', 'witch-awakened'],
  limits: { nodes: 16000, depth: 24, array: 512, string: 512, stringUnits: 131072,
    commits: 128, events: 4, grants: 8, priorApplied: 256 },
});

// Inspect descriptors only after excluding proxies; do not execute toJSON,
// getters, callbacks, iterators, proxy traps, or caller-controlled prototypes.
function snapshot(input) {
  let nodes = 0; let units = 0;
  const active = new Set();
  function visit(value, depth) {
    requireThat(++nodes <= 16000 && depth <= 24, 'GROWTH_TECHNICAL_BUDGET');
    if (value === null || typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      units += value.length;
      requireThat(value.length <= 512 && units <= 131072, 'GROWTH_TECHNICAL_BUDGET');
      return value;
    }
    if (typeof value === 'number') { requireThat(Number.isSafeInteger(value) && value >= 0); return value; }
    requireThat(typeof value === 'object' && !isProxy(value), 'GROWTH_NON_JSON');
    requireThat(!active.has(value), 'GROWTH_NON_JSON');
    active.add(value);
    const array = Array.isArray(value);
    requireThat(Object.getPrototypeOf(value) === (array ? Array.prototype : Object.prototype), 'GROWTH_NON_JSON');
    const keys = Reflect.ownKeys(value);
    let out;
    if (array) {
      const length = Object.getOwnPropertyDescriptor(value, 'length').value;
      requireThat(length <= 512, 'GROWTH_TECHNICAL_BUDGET');
      requireThat(keys.length === length + 1 && keys.includes('length'), 'GROWTH_NON_JSON');
      out = [];
      for (let i = 0; i < length; i++) {
        const descriptor = Object.getOwnPropertyDescriptor(value, String(i));
        requireThat(descriptor?.enumerable && Object.hasOwn(descriptor, 'value'), 'GROWTH_NON_JSON');
        out.push(visit(descriptor.value, depth + 1));
      }
    } else {
      out = {};
      for (const key of keys) {
        requireThat(typeof key === 'string' && !['__proto__', 'constructor', 'prototype'].includes(key), 'GROWTH_NON_JSON');
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        requireThat(descriptor?.enumerable && Object.hasOwn(descriptor, 'value'), 'GROWTH_NON_JSON');
        out[key] = visit(descriptor.value, depth + 1);
      }
    }
    active.delete(value);
    return out;
  }
  return visit(input, 0);
}
const exact = (row, keys) => {
  requireThat(row && typeof row === 'object' && !Array.isArray(row)
    && Object.keys(row).length === keys.length && keys.every(key => Object.hasOwn(row, key)));
};
const id = value => requireThat(typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9:._@/-]{0,191}$/u.test(value));
const hash = value => requireThat(typeof value === 'string' && /^[a-f0-9]{64}$/u.test(value));
const integer = value => requireThat(Number.isSafeInteger(value) && value >= 0);
const list = (value, max, min = 0) => requireThat(Array.isArray(value) && value.length >= min && value.length <= max,
  'GROWTH_TECHNICAL_BUDGET');
const unique = values => requireThat(new Set(values).size === values.length, 'GROWTH_DUPLICATE');
const canonical = value => value === null || typeof value !== 'object' ? JSON.stringify(value)
  : Array.isArray(value) ? `[${value.map(canonical).join(',')}]`
    : `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
const digest = value => createHash('sha256').update(canonical(value)).digest('hex');
const same = (left, right) => canonical(left) === canonical(right);
const without = (value, key) => Object.fromEntries(Object.entries(value).filter(([name]) => name !== key));
export const growthMetadataDigest = value => digest(snapshot(value));
const reference = row => { exact(row, ['ref', 'fingerprint']); id(row.ref); hash(row.fingerprint); };

/** Trust is the private HOST caller's responsibility, not conferred by supplying
 * a matching pin. The WeakMap prevents treating ordinary JSON as a compiled
 * instance; it is not a security capability against code running in this process.
 * Profiles are predeclared metadata, never executable matching callbacks. */
export function compileTrustedGrowthProfile(rawProfile, rawTrustedPin) {
  const profile = snapshot(rawProfile); const pin = snapshot(rawTrustedPin);
  exact(profile, ['version', 'ref', 'qualification', 'policySourceRef', 'source', 'declaredAtCommitRef',
    'bodyDefinition', 'factorOrigin', 'sequence', 'rule']);
  requireThat(profile.version === 1 && profile.qualification === QUALIFICATION && profile.policySourceRef === POLICY);
  id(profile.ref); reference(profile.source); id(profile.declaredAtCommitRef);
  reference(profile.bodyDefinition); reference(profile.factorOrigin);
  exact(profile.sequence, ['versionRef', 'step', 'predecessorProfileFingerprint']);
  id(profile.sequence.versionRef); integer(profile.sequence.step);
  if (profile.sequence.step === 0) requireThat(profile.sequence.predecessorProfileFingerprint === null);
  else hash(profile.sequence.predecessorProfileFingerprint);
  const rule = profile.rule;
  exact(rule, ['ref', 'emotionPatternRef', 'deepeningPatternRef', 'mechanismRef', 'fromConditionRef',
    'toConditionRef', 'quality', 'grants', 'recognition']);
  for (const key of ['ref', 'emotionPatternRef', 'deepeningPatternRef', 'mechanismRef', 'fromConditionRef', 'toConditionRef']) id(rule[key]);
  requireThat(rule.emotionPatternRef !== rule.deepeningPatternRef && rule.fromConditionRef !== rule.toConditionRef);
  requireThat(MAGIC_GROWTH_SCHEMA.qualities.includes(rule.quality));
  list(rule.grants, 8, 1);
  rule.grants.forEach(grant => {
    exact(grant, ['grantId', 'fromDefinition', 'toDefinition']); id(grant.grantId);
    reference(grant.fromDefinition); reference(grant.toDefinition);
    requireThat(!same(grant.fromDefinition, grant.toDefinition));
  });
  unique(rule.grants.map(grant => grant.grantId));
  if (rule.recognition !== null) {
    exact(rule.recognition, ['patternRef', 'definitionRefs']); id(rule.recognition.patternRef);
    list(rule.recognition.definitionRefs, 8, 1); rule.recognition.definitionRefs.forEach(reference);
    unique(rule.recognition.definitionRefs.map(row => row.ref));
    requireThat(rule.recognition.definitionRefs.every(ref => rule.grants.some(grant => same(grant.toDefinition, ref))));
  }
  exact(pin, ['version', 'profileRef', 'fingerprint', 'policySourceRef', 'source', 'declarationCommitRef', 'qualification']);
  requireThat(pin.version === 1 && pin.profileRef === profile.ref && pin.fingerprint === digest(profile)
    && pin.policySourceRef === POLICY && same(pin.source, profile.source)
    && pin.declarationCommitRef === profile.declaredAtCommitRef && pin.qualification === QUALIFICATION,
  'GROWTH_TRUSTED_PIN_MISMATCH');
  const compiled = freeze({ type: 'host-growth-profile@1', version: 1, profile, fingerprint: pin.fingerprint,
    productionRegistrationEnabled: false });
  compiledProfiles.set(compiled, compiled);
  return compiled;
}

const EVENT_KEYS = ['id', 'fingerprint', 'kind', 'patternRef', 'sourceRef', 'evidenceRef', 'commitRef', 'branchId',
  'runId', 'generation', 'revision', 'storyTime', 'sequence', 'settlement', 'mindId', 'bodyId', 'factorId',
  'causeEventIds', 'definitionRefs'];
const RECEIPT_KEYS = ['id', 'version', 'useId', 'requestFingerprint', 'profileRef', 'profileFingerprint',
  'bodyId', 'factorId', 'emotionEventId', 'emotionFingerprint', 'deepeningEventId', 'deepeningFingerprint',
  'sequenceVersionRef', 'sequenceStep', 'predecessorProfileFingerprint'];
function validateReceipt(receipt) {
  exact(receipt, RECEIPT_KEYS); requireThat(receipt.version === 1);
  for (const key of ['useId', 'profileRef', 'bodyId', 'factorId', 'emotionEventId', 'deepeningEventId', 'sequenceVersionRef']) id(receipt[key]);
  for (const key of ['requestFingerprint', 'profileFingerprint', 'emotionFingerprint', 'deepeningFingerprint']) hash(receipt[key]);
  integer(receipt.sequenceStep);
  if (receipt.sequenceStep === 0) requireThat(receipt.predecessorProfileFingerprint === null);
  else hash(receipt.predecessorProfileFingerprint);
  requireThat(receipt.id === `growth-receipt:${digest(without(receipt, 'id'))}`, 'GROWTH_HISTORY_INTEGRITY');
}

/** Complete metadata closure is an assertion from an independently verified HOST
 * producer, NOT established by this pure reducer or by an unkeyed digest. Output
 * needs Domain-private validation + atomic SQL application + genuine next-task
 * delivery. Never pass it as legacy activateMagicGrowth({hostApproved:true}). */
export function planMagicGrowthEvents(compiledProfile, rawInput) {
  const input = snapshot(rawInput);
  exact(input, ['version', 'useId', 'scope', 'authorization', 'commits', 'events', 'chain', 'bodyFactor', 'priorApplied']);
  requireThat(input.version === 1); id(input.useId);
  const { scope, authorization: authorization, commits, events, chain, bodyFactor: body, priorApplied } = input;
  exact(scope, ['runId', 'branchId', 'headCommitRef', 'generation', 'revision', 'storyTime']);
  ['runId', 'branchId', 'headCommitRef'].forEach(key => id(scope[key]));
  ['generation', 'revision', 'storyTime'].forEach(key => integer(scope[key]));
  exact(authorization, ['ref', 'headCommitRef', 'scopeFingerprint', 'ancestryFingerprint', 'eventFingerprints']);
  id(authorization.ref); hash(authorization.scopeFingerprint); hash(authorization.ancestryFingerprint);
  requireThat(authorization.headCommitRef === scope.headCommitRef && authorization.scopeFingerprint === digest(scope),
    'GROWTH_AUTHORIZATION_SCOPE');
  list(commits, 128, 1);
  commits.forEach((commit, index) => {
    exact(commit, ['commitRef', 'parentCommitRef', 'branchId', 'storyTime']); id(commit.commitRef); id(commit.branchId); integer(commit.storyTime);
    requireThat(commit.parentCommitRef === (index ? commits[index - 1].commitRef : null), 'GROWTH_ANCESTRY');
    requireThat(commit.storyTime <= scope.storyTime && (!index || commit.storyTime >= commits[index - 1].storyTime), 'GROWTH_ANCESTRY');
  });
  unique(commits.map(row => row.commitRef));
  requireThat(commits.at(-1).commitRef === scope.headCommitRef && commits.at(-1).branchId === scope.branchId
    && authorization.ancestryFingerprint === digest(commits), 'GROWTH_ANCESTRY');
  list(events, 4, 3); unique(events.map(event => event.id));
  events.forEach((event, index) => {
    exact(event, EVENT_KEYS);
    for (const key of ['id', 'kind', 'patternRef', 'sourceRef', 'evidenceRef', 'commitRef', 'branchId', 'runId', 'mindId', 'bodyId', 'factorId']) id(event[key]);
    for (const key of ['generation', 'revision', 'storyTime', 'sequence']) integer(event[key]);
    hash(event.fingerprint); requireThat(event.fingerprint === digest(without(event, 'fingerprint')), 'GROWTH_EVENT_INTEGRITY');
    requireThat(event.settlement === 'settled', 'GROWTH_UNSETTLED_EVENT');
    requireThat(['occupied-body', 'settled-emotion', 'witchification-deepening', 'mind-acquired-recognition'].includes(event.kind));
    const commitIndex = commits.findIndex(row => row.commitRef === event.commitRef);
    const commit = commits[commitIndex];
    requireThat(commit && commit.branchId === event.branchId && event.runId === scope.runId
      && event.generation <= scope.generation && event.revision <= scope.revision
      && event.storyTime <= scope.storyTime && event.storyTime <= commit.storyTime, 'GROWTH_EVENT_SCOPE');
    if (index) {
      const previous = events[index - 1];
      requireThat(event.sequence > previous.sequence && event.storyTime >= previous.storyTime
        && commitIndex >= commits.findIndex(row => row.commitRef === previous.commitRef), 'GROWTH_CAUSAL_ORDER');
    }
    list(event.causeEventIds, 2); event.causeEventIds.forEach(id); unique(event.causeEventIds);
    requireThat(event.causeEventIds.every(cause => events.slice(0, index).some(row => row.id === cause)), 'GROWTH_CAUSAL_CLOSURE');
    list(event.definitionRefs, 8); event.definitionRefs.forEach(reference);
    requireThat(event.kind === 'mind-acquired-recognition' ? event.definitionRefs.length > 0 : event.definitionRefs.length === 0);
  });
  list(authorization.eventFingerprints, 4, 3);
  authorization.eventFingerprints.forEach(row => { exact(row, ['id', 'fingerprint']); id(row.id); hash(row.fingerprint); });
  requireThat(same(authorization.eventFingerprints, events.map(({ id: eventId, fingerprint }) => ({ id: eventId, fingerprint }))), 'GROWTH_EVIDENCE_CLOSURE');
  exact(chain, ['occupancyEventId', 'emotionEventId', 'deepeningEventId', 'recognitionEventId']);
  const chainIds = [chain.occupancyEventId, chain.emotionEventId, chain.deepeningEventId];
  chainIds.forEach(id);
  if (chain.recognitionEventId !== null) { id(chain.recognitionEventId); chainIds.push(chain.recognitionEventId); }
  requireThat(same(chainIds, events.map(row => row.id)), 'GROWTH_EVIDENCE_CLOSURE');
  requireThat(same(events.map(row => row.kind), ['occupied-body', 'settled-emotion', 'witchification-deepening',
    ...(chain.recognitionEventId === null ? [] : ['mind-acquired-recognition'])]), 'GROWTH_CAUSAL_CLOSURE');
  const [occupancy, emotion, deepening, recognition] = events;
  requireThat(same(occupancy.causeEventIds, []) && same(emotion.causeEventIds, [occupancy.id])
    && same(deepening.causeEventIds, [emotion.id])
    && (!recognition || same(recognition.causeEventIds, [deepening.id])), 'GROWTH_CAUSAL_CLOSURE');
  exact(body, ['bodyId', 'factorId', 'bodyDefinition', 'origin', 'conditionRef', 'bindingPolicySourceRef', 'grantApprovalRef', 'grants']);
  ['bodyId', 'factorId', 'conditionRef', 'grantApprovalRef'].forEach(key => id(body[key])); reference(body.bodyDefinition); reference(body.origin);
  requireThat(body.bindingPolicySourceRef === POLICY, 'GROWTH_BODY_POLICY');
  requireThat(events.every(event => event.bodyId === body.bodyId && event.factorId === body.factorId && event.mindId === emotion.mindId), 'GROWTH_EVENT_OCCUPANCY');
  list(body.grants, 8);
  body.grants.forEach(grant => {
    exact(grant, ['id', 'bodyId', 'factorId', 'definition', 'enabled']); id(grant.id); reference(grant.definition);
    requireThat(grant.bodyId === body.bodyId && grant.factorId === body.factorId && typeof grant.enabled === 'boolean', 'GROWTH_BODY_GRANT');
  });
  unique(body.grants.map(grant => grant.id));
  list(priorApplied, 256); priorApplied.forEach(validateReceipt); unique(priorApplied.map(row => row.id)); unique(priorApplied.map(row => row.useId));
  const base = { type: MAGIC_GROWTH_SCHEMA.ref, version: 1, scope, useId: input.useId,
    audience: 'HOST_ONLY', productionRegistrationEnabled: false, integrityKind: 'unkeyed-sha256-not-authority' };
  const finish = result => freeze({ ...result, integrity: digest(result) });
  const gated = reason => finish({ ...base, status: 'gated', reason, obligations: [], knowledgeEffects: [], receipt: null });
  if (compiledProfile === null) return gated('GROWTH_PROFILE_MISSING');
  requireThat(compiledProfile && !isProxy(compiledProfile) && compiledProfiles.has(compiledProfile), 'GROWTH_PROFILE_NOT_COMPILED');
  const { profile, fingerprint: profileFingerprint } = compiledProfiles.get(compiledProfile);
  const declarationIndex = commits.findIndex(row => row.commitRef === profile.declaredAtCommitRef);
  requireThat(declarationIndex >= 0 && declarationIndex < commits.findIndex(row => row.commitRef === occupancy.commitRef), 'GROWTH_PROFILE_NOT_PREDECLARED');
  requireThat(same(body.bodyDefinition, profile.bodyDefinition) && same(body.origin, profile.factorOrigin), 'GROWTH_PROFILE_BODY_ORIGIN');
  const rule = profile.rule;
  const requestFingerprint = digest({ input: without(input, 'priorApplied'), profileFingerprint });
  const receiptData = { version: 1, useId: input.useId, requestFingerprint, profileRef: profile.ref, profileFingerprint,
    bodyId: body.bodyId, factorId: body.factorId, emotionEventId: emotion.id, emotionFingerprint: emotion.fingerprint,
    deepeningEventId: deepening.id, deepeningFingerprint: deepening.fingerprint,
    sequenceVersionRef: profile.sequence.versionRef, sequenceStep: profile.sequence.step,
    predecessorProfileFingerprint: profile.sequence.predecessorProfileFingerprint };
  const receipt = { id: `growth-receipt:${digest(receiptData)}`, ...receiptData };
  const previousUse = priorApplied.find(row => row.useId === input.useId);
  // Operation identity must be checked before an ordinary pattern gate can
  // disguise a changed request using an already committed useId.
  if (previousUse) requireThat(same(previousUse, receipt), 'GROWTH_REPLAY_CONFLICT');
  // priorApplied is the complete applicable authoritative history for scope.runId,
  // supplied by HOST. v1 receipts have no run field: mixing runs is unsupported.
  // Canonical IDs are run-wide, NOT body-, profile-, or branch-local. Check all
  // source ownership/fingerprints before narrowing history for body progression.
  for (const row of priorApplied) {
    for (const [source, event] of [['emotion', emotion], ['deepening', deepening]]) {
      for (const priorSource of ['emotion', 'deepening']) {
        if (row[`${priorSource}EventId`] !== event.id) continue;
        requireThat(source === priorSource && row.bodyId === body.bodyId && row.factorId === body.factorId
          && row[`${priorSource}Fingerprint`] === event.fingerprint, 'GROWTH_SOURCE_CONFLICT');
      }
    }
  }
  if (previousUse) return finish({ ...base, status: 'replay', reason: 'EXACT_REQUEST_ALREADY_APPLIED', obligations: [], knowledgeEffects: [], receipt });
  requireThat(!priorApplied.some(row => row.deepeningEventId === deepening.id), 'GROWTH_SOURCE_ALREADY_APPLIED');
  if (emotion.patternRef !== rule.emotionPatternRef || deepening.patternRef !== rule.deepeningPatternRef) return gated('GROWTH_CAUSAL_PATTERN_NOT_MATCHED');
  requireThat(!recognition || (rule.recognition && recognition.patternRef === rule.recognition.patternRef
    && same(recognition.definitionRefs, rule.recognition.definitionRefs)), 'GROWTH_RECOGNITION_EVIDENCE');
  const sameBodyHistory = priorApplied.filter(row => row.bodyId === body.bodyId && row.factorId === body.factorId);
  const emotionHistory = sameBodyHistory.filter(row => row.emotionEventId === emotion.id);
  requireThat(emotionHistory.every(row => row.emotionFingerprint === emotion.fingerprint), 'GROWTH_SOURCE_CONFLICT');
  if (profile.sequence.step === 0) requireThat(emotionHistory.length === 0, 'GROWTH_SOURCE_ALREADY_APPLIED');
  else {
    const predecessor = emotionHistory.find(row => row.profileFingerprint === profile.sequence.predecessorProfileFingerprint
      && row.sequenceVersionRef === profile.sequence.versionRef && row.sequenceStep === profile.sequence.step - 1);
    requireThat(predecessor && emotionHistory.every(row => row.sequenceVersionRef === profile.sequence.versionRef
      && row.sequenceStep < profile.sequence.step), 'GROWTH_SEQUENCE_NOT_AUTHORIZED');
  }
  requireThat(body.conditionRef === rule.fromConditionRef, 'GROWTH_CONDITION_MISMATCH');
  requireThat(rule.grants.every(spec => body.grants.some(grant => grant.id === spec.grantId
    && same(grant.definition, spec.fromDefinition))), 'GROWTH_BODY_GRANT');
  const transitionId = `growth-transition:${digest(receiptData)}`;
  const obligations = [{ type: 'body-factor-witchification-transition@1', id: transitionId,
    bodyId: body.bodyId, factorId: body.factorId, experiencerMindId: emotion.mindId,
    fromConditionRef: rule.fromConditionRef, toConditionRef: rule.toConditionRef, quality: rule.quality,
    mechanismRef: rule.mechanismRef, causalRuleRef: rule.ref, profileRef: profile.ref, profileFingerprint,
    sourceEventIds: [occupancy.id, emotion.id, deepening.id] },
  { type: 'body-grant-enhancement-obligation@1', id: `growth-grants:${digest(receiptData)}`,
    afterObligationId: transitionId, bodyId: body.bodyId, factorId: body.factorId,
    atomic: true, grants: rule.grants }];
  const knowledgeEffects = recognition ? [{ type: 'mind-recognition-obligation@1',
    id: `growth-recognition:${digest({ receiptData, eventFingerprint: recognition.fingerprint })}`,
    ownerMindId: recognition.mindId, sourceEventId: recognition.id, causedByEventId: deepening.id,
    acquisitionSourceRef: recognition.sourceRef, evidenceRef: recognition.evidenceRef,
    definitionRefs: recognition.definitionRefs }] : [];
  return finish({ ...base, status: 'planned', reason: 'PREDECLARED_CAUSAL_CHAIN_MATCHED', obligations, knowledgeEffects, receipt });
}

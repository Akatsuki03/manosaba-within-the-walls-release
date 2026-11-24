import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { isProxy } from 'node:util/types';
import { normalizeCreationPreferences } from '../../public/player-creation-rules.mjs';
import { assertInitialRunPolicy } from './initial-run-policy.mjs';
import { EVENT_DIRECTOR_RUNTIME_REVISION } from '../director/director-event-runtime.mjs';

// Contract only. The Host authenticates the head, root and ancestry.
export const RUN_POLICY_CONTRACT_VERSION = 1;
export const RUN_POLICY_BODY_BYTES = 40_960; // permits escaped JSON at the existing text limits
const policyFields = ['cases', 'boundaries'];
const requestFields = ['requestId', 'expectedGeneration', 'expectedRevision', 'directorPreferences', 'playPolicy'];
const has = (object, key) => Object.hasOwn(object, key);
const requestIdPattern = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/u;
const errors = Object.freeze({
  INVALID_RUN_POLICY: '本局设置包含不支持或无效的字段。',
  RUN_POLICY_UNSUPPORTED: '当前存档不支持游玩中调整本局设置。',
  RUN_POLICY_STALE: '当前版本已经改变，请重新读取本局设置后再采用。',
  RUN_POLICY_PENDING: '请先完成或按原规则放弃未结行动。',
  RUN_POLICY_ACTIVE_CASE: '已有案件活动，不能用排除案件撤销。',
  RUN_POLICY_REQUEST_CONFLICT: '该请求标识已用于不同的本局设置。',
});
export const RUN_POLICY_ERROR_STATUS = Object.freeze({
  INVALID_RUN_POLICY: 400, RUN_POLICY_UNSUPPORTED: 409, RUN_POLICY_STALE: 409,
  RUN_POLICY_PENDING: 409, RUN_POLICY_ACTIVE_CASE: 409, RUN_POLICY_REQUEST_CONFLICT: 409,
});
const fail = (code = 'INVALID_RUN_POLICY') => { throw Object.assign(new Error(errors[code]), { code }); };
function ownData(value, allowed) {
  if (!value || typeof value !== 'object' || isProxy(value) || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) fail();
  const result = Object.create(null);
  for (const key of Reflect.ownKeys(value)) {
    const property = Object.getOwnPropertyDescriptor(value, key);
    if (!allowed.includes(key) || !property.enumerable || !has(property, 'value')) fail();
    result[key] = property.value;
  }
  return result;
}
function preferenceValues(input) {
  try { return normalizeCreationPreferences(input); } catch { return fail(); }
}

export function normalizeRunPolicyRequest(input) {
  const value = ownData(input, requestFields);
  if (typeof value.requestId !== 'string' || !requestIdPattern.test(value.requestId)
    || !Number.isSafeInteger(value.expectedGeneration) || value.expectedGeneration < 1
    || !Number.isSafeInteger(value.expectedRevision) || value.expectedRevision < 0
    || (!has(value, 'directorPreferences') && !has(value, 'playPolicy'))) fail();
  const fields = {};
  if (has(value, 'directorPreferences')) fields.directorPreferences = value.directorPreferences;
  let edits;
  if (has(value, 'playPolicy')) {
    edits = ownData(value.playPolicy, policyFields);
    if (!Object.keys(edits).length || (has(edits, 'boundaries') && isProxy(edits.boundaries))) fail();
    fields.playPolicy = edits;
  }
  const canonical = preferenceValues(fields);
  return {
    requestId: value.requestId, expectedGeneration: value.expectedGeneration, expectedRevision: value.expectedRevision,
    ...(has(fields, 'directorPreferences') ? { directorPreferences: canonical.directorPreferences } : {}),
    ...(edits ? { playPolicy: Object.fromEntries(policyFields.filter(key => has(edits, key)).map(key => [key, canonical.playPolicy[key]])) } : {}),
  };
}
export const runPolicyRequestFingerprint = input => createHash('sha256')
  .update(JSON.stringify([RUN_POLICY_CONTRACT_VERSION, normalizeRunPolicyRequest(input)]), 'utf8').digest('hex');

export function runPolicyRootValues(initial, verifiedInitial) {
  // This check does not grant eligibility to a body-supplied runtime ID.
  const source = assertInitialRunPolicy(initial, verifiedInitial);
  if (source?.source.executionRevision.revisionId !== EVENT_DIRECTOR_RUNTIME_REVISION) fail('RUN_POLICY_UNSUPPORTED');
  return preferenceValues({ directorPreferences: source.directorPreferences, playPolicy: source.playPolicy });
}

// Host supplies current values from the authenticated ancestry and checks
// allowed replay before stale/pending. No-op is no world commit.
export function decideRunPolicyChange(current, input, { generation, revision, pending, activeCase }) {
  const request = normalizeRunPolicyRequest(input);
  if (request.expectedGeneration !== generation || request.expectedRevision !== revision) fail('RUN_POLICY_STALE');
  if (pending) fail('RUN_POLICY_PENDING');
  const next = preferenceValues({ directorPreferences: has(request, 'directorPreferences') ? request.directorPreferences : current.directorPreferences,
    playPolicy: { ...current.playPolicy, ...request.playPolicy } });
  if (activeCase && next.playPolicy.cases === 'excluded' && current.playPolicy.cases !== 'excluded') fail('RUN_POLICY_ACTIVE_CASE');
  return { request, changed: !isDeepStrictEqual(next, current), next };
}

export function runPolicyPublicView({ generation, revision, initial, effective }) {
  const project = input => preferenceValues({ directorPreferences: input.directorPreferences,
    playPolicy: { cases: input.playPolicy.cases, boundaries: input.playPolicy.boundaries } });
  return { version: RUN_POLICY_CONTRACT_VERSION, generation, revision, initial: project(initial), effective: project(effective) };
}

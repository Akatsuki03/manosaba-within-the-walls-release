import { AsyncLocalStorage } from 'node:async_hooks';
import { isDeepStrictEqual } from 'node:util';
import { EVENT_DIRECTOR_RUNTIME_REVISION } from '../director/director-event-runtime.mjs';
import { normalizeCreationPreferences } from '../../public/player-creation-rules.mjs';

export function effectiveAdjudicationData(plan) {
  const pin = plan?.runPolicyConsumersVersion === 1 ? plan.effectiveRunPolicy : undefined;
  return pin?.source?.adoptedCommitRef ? { runBoundary: { version: 1, fingerprint: pin.fingerprint, playPolicy: structuredClone(pin.playPolicy) } } : {};
}
// In-process policy *view* for the unchanged rule evaluator, never accepted as
// an initial identity, source pin, model authorization or saved DTO.
export function adjudicationPolicy(data) {
  const initial = data?.initialRunPolicy;
  const playPolicy = data?.runBoundary?.playPolicy ?? (data?.runPolicyConsumersVersion === 1 && data.effectiveRunPolicy?.source?.adoptedCommitRef ? data.effectiveRunPolicy.playPolicy : undefined);
  return playPolicy ? { source: initial.source, playPolicy } : initial;
}
export function validateRunBoundary(data, revisionId) {
  if (!Object.hasOwn(data, 'runBoundary')) return;
  const row = data.runBoundary;
  const fail = () => { throw Object.assign(new Error('有效边界封包无效。'), { code: 'INVALID_AGENT_JOB' }); };
  if (revisionId !== EVENT_DIRECTOR_RUNTIME_REVISION || !row || typeof row.fingerprint !== 'string' || !/^[a-f0-9]{64}$/u.test(row.fingerprint) || row.version !== 1) fail();
  let normalized;
  try { normalized = normalizeCreationPreferences({ playPolicy: row.playPolicy }).playPolicy; } catch { fail(); }
  if (!isDeepStrictEqual(row, { version: 1, fingerprint: row.fingerprint, playPolicy: normalized })) fail();
}

const scope = new AsyncLocalStorage();
const caseKinds = new Set(['identify', 'adopt', 'resume', 'prepare', 'record-preparation', 'fix-gaze', 'attack', 'report', 'case', 'execution', 'discovery']);
const literalTopic = boundary => /^不要出现字面文本「([^「」\r\n]{1,32})」$/u.exec(boundary.trim().replace(/[。！!]$/u, ''))?.[1];
const publicConflict = (policy, entries) => policy.boundaries.some(boundary => {
  const literal = literalTopic(boundary);
  return literal && entries.some(row => row.delivery !== 'reflection' && row.text?.includes(literal));
});

// Scope a detached synchronous reducer, not a saved state or an async model
// call. A job without an adopted policy keeps the entire old reducer path.
export function withRunBoundary(state, pin, work) {
  if (!pin?.source.adoptedCommitRef || state.agentRuntimeRevision !== EVENT_DIRECTOR_RUNTIME_REVISION) return work();
  return scope.run({ generation: state.generation, revision: state.revision, policy: pin.playPolicy }, work);
}
export function activeEffectiveBoundary(state) {
  const active = scope.getStore();
  return active && state?.agentRuntimeRevision === EVENT_DIRECTOR_RUNTIME_REVISION
    && state.generation === active.generation && state.revision === active.revision ? active.policy : null;
}
export const effectiveBoundaryDecision = (policy, kind, { semantic = false } = {}) => {
  if (caseKinds.has(kind) && policy.cases === 'excluded') return 'initial_cases_excluded';
  if (!semantic && ['magic', 'execution'].includes(kind) && policy.boundaries.some(boundary => !literalTopic(boundary))) return 'initial_policy_clarification';
  return null;
};

// This fixed assembly is never a case-producing action. No extra reviewer or
// definition is invented for it; a conflicting literal or an unevaluated
// semantic boundary is insufficient authority to apply a due optional event.
export function effectiveAssemblyAllowed(pin, text) {
  if (!pin?.source.adoptedCommitRef) return true;
  return pin.playPolicy.boundaries.every(boundary => {
    const literal = literalTopic(boundary);
    return literal !== undefined && !text.includes(literal);
  });
}

export function assertEffectiveBoundaryTransition(before, after, pin, { magic = false } = {}) {
  const policy = pin.playPolicy;
  const player = before.creation.playerMode === 'custom' ? 'player' : before.creation.actorId;
  const entries = after.entries.slice(before.entries.length).filter(row => !row.audienceIds || row.audienceIds.includes(player));
  const old = before.caseRuntime, next = after.caseRuntime;
  const newCase = Boolean(after.caseOne && !before.caseOne || after.storyArc && !before.storyArc || next && (
    (next.plans?.length || 0) > (old?.plans?.length || 0) || (next.incidents?.length || 0) > (old?.incidents?.length || 0)
    || !isDeepStrictEqual(next.procedure ?? null, old?.procedure ?? null)))
    || Object.entries(next?.conditionsByActor || {}).some(([id, row]) => ['dead', 'executed'].includes(row?.status || row)
      && !['dead', 'executed'].includes(old?.conditionsByActor?.[id]?.status || old?.conditionsByActor?.[id]));
  if (!isDeepStrictEqual(before.creation, after.creation) || publicConflict(policy, entries) || newCase && policy.cases === 'excluded')
    throw Object.assign(new Error('该操作与当前本局边界冲突；未提交世界变化。'), { code: 'INITIAL_POLICY_CONFLICT' });
  if (magic && effectiveBoundaryDecision(policy, 'magic'))
    throw Object.assign(new Error('当前本局边界需先澄清；未提交世界变化。'), { code: 'INITIAL_POLICY_CLARIFICATION' });
}

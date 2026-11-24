export const CASE_ACTION_TIMING_VERSION = 2;
export const CASE_ACTION_TIMING_REF = 'shared-case-action-time@2';
const fail = () => { throw Object.assign(new Error('案件行动计时版本不一致。'), { code: 'INVALID_AGENT_STATE' }); };
/** Fixed semantic durations, shared by player and NPC. Neither model tokens,
 * prose length nor provider wall time is a story clock. Unpinned jobs do not
 * enter this branch. Callers advance their existing causal clock once. */
export function caseActionSeconds(operation, { remaining = null } = {}) {
  const seconds = ({ look: 15, wait: 60, move: 30, follow: 30, act: 30,
    conversation: 60, speak: 60, write: 60, read: 120, inspect: 120,
    present: 60, testimony: 90, argue: 90, report: 30, vote: 0, broadcast: 17, runtime: 15, case_step: 15 })[operation];
  if (seconds === undefined) fail();
  return Number.isFinite(remaining) ? Math.min(seconds, Math.max(0, remaining)) : seconds;
}
export function caseTimingVersion(state, action = {}) {
  const descriptor = Object.getOwnPropertyDescriptor(action, 'caseActionTimingVersion');
  if (descriptor && (!descriptor.enumerable || !Object.hasOwn(descriptor, 'value'))) fail();
  const version = descriptor?.value ?? state.caseActionTimingVersion;
  if (version !== undefined && version !== CASE_ACTION_TIMING_VERSION) fail();
  if (state.caseActionTimingVersion !== undefined && action.caseActionTimingVersion !== undefined
    && state.caseActionTimingVersion !== action.caseActionTimingVersion) fail();
  return version;
}

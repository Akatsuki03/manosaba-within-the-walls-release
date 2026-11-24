import { isProxy } from 'node:util/types';
const fail = () => { throw Object.assign(new Error('行动结果必须来自受限宿主结算事实。'), { code: 'INVALID_ACTION_OUTCOME' }); };
const kinds = new Set(['blocked', 'clarification', 'boundary_conflict', 'unsupported', 'execution_failed']);
const codes = new Set(['completed', 'condition_false', 'destination_unavailable', 'item_unavailable', 'recipient_declined', 'awaiting_recipient', 'operation_unavailable', 'bounded', 'world_interrupt', 'not_executed', 'ambiguous_reference', 'unsupported_effect', 'boundary_conflict', 'operational_failure']);
function record(value, allowed, required = allowed) {
  if (!value || isProxy(value) || Object.getPrototypeOf(value) !== Object.prototype
    || Reflect.ownKeys(value).some(key => !allowed.includes(key) || !Object.getOwnPropertyDescriptor(value, key)?.enumerable
      || !Object.hasOwn(Object.getOwnPropertyDescriptor(value, key), 'value'))
    || required.some(key => !Object.hasOwn(value, key))) fail();
}
// phase is supplied only after the caller proves its actual transaction state.
// Slot completion and sealed drafts are deliberately not accepted as a phase.
export function projectActionOutcome(facts) {
  record(facts, ['version', 'phase', 'steps', 'stop', 'failure'], ['version', 'phase', 'steps']);
  if (facts.version !== 1 || !['committed', 'stopped', 'failed'].includes(facts.phase)
    || !Array.isArray(facts.steps) || isProxy(facts.steps) || facts.steps.length > 3) fail();
  const steps = facts.steps.map((step, index) => {
    record(step, ['index', 'status', 'code', 'eventIds']);
    if (step.index !== index || !['completed', 'blocked', 'not_executed'].includes(step.status) || !codes.has(step.code)
      || !Array.isArray(step.eventIds) || step.eventIds.length > 128
      || step.eventIds.some(id => typeof id !== 'string' || !/^event-[1-9][0-9]*$/u.test(id))) fail();
    return { index, status: step.status, code: step.code, eventIds: [...new Set(step.eventIds)] };
  });
  let stop;
  if (facts.stop !== undefined) {
    record(facts.stop, ['index', 'kind', 'code']);
    if (!Number.isSafeInteger(facts.stop.index) || facts.stop.index < 0 || facts.stop.index > 2
      || !kinds.has(facts.stop.kind) || !codes.has(facts.stop.code)) fail();
    stop = { ...facts.stop };
  }
  if (facts.failure !== undefined) {
    record(facts.failure, ['code']);
    if (typeof facts.failure.code !== 'string' || !/^[A-Z][A-Z0-9_]{0,79}$/u.test(facts.failure.code)) fail();
  }
  if (facts.phase === 'failed') return { version: 1, kind: 'execution_failed', steps: steps.map(step => ({ index: step.index,
    status: 'not_executed', code: 'operational_failure', eventIds: [] })), stop: { index: 0, kind: 'execution_failed', code: 'operational_failure' } };
  if (facts.phase === 'stopped') {
    if (steps.length || !stop || stop.kind === 'execution_failed') fail();
    return { version: 1, kind: stop.kind, steps: [], stop };
  }
  const completed = steps.filter(step => step.status === 'completed').length;
  if (!steps.length || facts.failure !== undefined) fail();
  return { version: 1, kind: completed ? 'completed' : stop?.kind || 'blocked',
    ...(completed ? { completion: completed === steps.length ? 'full' : 'partial' } : {}), steps,
    ...(stop ? { stop } : {}) };
}

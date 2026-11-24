import { diceData, diceFailure } from './dice-core.mjs';

// Host integration helpers, not player privileges. A practice roll can never
// create protection. The future patrol reducer authenticates the encounter,
// applies its real escape movement, then persists this token in its snapshot.
export const REACTION_RULES = Object.freeze({ version: 1, ref: 'escape-two-tactical-actions@1',
  protectedActions: 2, maxActionSeconds: 6, grantsFrom: 'successful-host-escape-opportunity-only',
  expiry: 'after-second-effective-action-completes-not-before',
  voluntaryRecontact: 'explicit-offered-warning-and-confirmed-player-choice',
  readOnlyAndRetries: 'never-consume', unrelatedHarm: 'not-protected' });
const integer = (value, min = 0) => Number.isSafeInteger(value) && value >= min;
const id = value => typeof value === 'string' && value.length > 0 && value.length <= 256;
const exact = (value, keys) => value && typeof value === 'object' && !Array.isArray(value)
  && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
export function startEscapeProtection(value) {
  const input = diceData(value);
  if (!exact(input, ['result', 'opportunityId', 'encounterId', 'actionId', 'escapedTo', 'at'])) diceFailure('INVALID_DICE_REACTION');
  const { result, opportunityId, encounterId, actionId, escapedTo, at } = input;
  if (result?.mode !== 'opportunity' || result.success !== true || !id(result.id)
    || ![opportunityId, encounterId, actionId, escapedTo].every(id) || !integer(at)) diceFailure('INVALID_DICE_REACTION');
  return { version: 1, encounterId, opportunityId, resultId: result.id, escapedTo,
    startedAt: at, remainingActions: 2, processedActionIds: [actionId], endedBy: null };
}
export function advanceEscapeProtection(value, action) {
  const protection = diceData(value); const step = diceData(action);
  if (!exact(protection, ['version', 'encounterId', 'opportunityId', 'resultId', 'escapedTo', 'startedAt', 'remainingActions', 'processedActionIds', 'endedBy'])
    || protection.version !== 1 || !integer(protection.remainingActions) || protection.remainingActions > 2
    || !integer(protection.startedAt) || ![protection.encounterId, protection.opportunityId, protection.resultId, protection.escapedTo].every(id)
    || !Array.isArray(protection.processedActionIds) || protection.processedActionIds.length > 4
    || !protection.processedActionIds.every(id) || ![null, 'voluntary_recontact', 'two_actions_completed'].includes(protection.endedBy)
    || !exact(step, ['id', 'elapsedSeconds', 'kind', 'committed', 'voluntaryRecontact']) || !id(step.id)
    || !integer(step.elapsedSeconds) || !['move', 'evade', 'wait', 'read_only', 'invalid'].includes(step.kind)
    || typeof step.committed !== 'boolean' || typeof step.voluntaryRecontact !== 'boolean') diceFailure('INVALID_DICE_REACTION');
  if (protection.remainingActions === 0 || protection.processedActionIds.includes(step.id)
    || !step.committed || ['read_only', 'invalid'].includes(step.kind)) return { protection,
      captureProtectedDuringAction: protection.remainingActions > 0, consumed: false };
  if (step.voluntaryRecontact) {
    protection.remainingActions = 0; protection.endedBy = 'voluntary_recontact'; protection.processedActionIds.push(step.id);
    return { protection, captureProtectedDuringAction: false, consumed: false };
  }
  if (step.elapsedSeconds === 0) return { protection, captureProtectedDuringAction: true, consumed: false };
  if (step.elapsedSeconds > REACTION_RULES.maxActionSeconds) diceFailure('INVALID_DICE_REACTION', '脱离保护期间的长行动必须分成最多六秒的战术步进。');
  protection.remainingActions--; protection.processedActionIds.push(step.id);
  if (protection.remainingActions === 0) protection.endedBy = 'two_actions_completed';
  return { protection, captureProtectedDuringAction: true, consumed: true };
}

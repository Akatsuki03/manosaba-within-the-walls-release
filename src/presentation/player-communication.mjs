import { runtimeSwapOptions } from '../case-runtime.mjs';

export const PLAYER_RUNTIME_COMMUNICATION_VERSION = 1;

/** A normal runtime offer may address only the exact closed-cap mind the host
 * already selected, and only when an enacted utterance actually reached that
 * mind in its existing audience. Action, reflection and narration are not
 * speech and never choose an addressee. */
export function runtimeSwapAddressee(state, player, intent, utterance, audienceIds) {
  if (typeof utterance !== 'string' || !utterance.trim() || !Array.isArray(audienceIds)
    || intent?.type !== 'runtime' || typeof intent.subjectId !== 'string') return [];
  const option = runtimeSwapOptions(state, player).find(row => row.id === intent.subjectId);
  if (!option || option.kind !== 'swap-offer-hand' || typeof option.targetId !== 'string'
    || !audienceIds.includes(option.targetId)) return [];
  return [option.targetId];
}

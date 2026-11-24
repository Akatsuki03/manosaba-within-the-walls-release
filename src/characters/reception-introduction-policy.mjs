import { createHash } from 'node:crypto';
import { RECEPTION_INTRODUCTION_SOURCE, RECEPTION_INTRODUCTIONS } from './reception-introduction-lines.mjs';

const freeze = value => {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
};
// An authored opening event, not a global name unlock or an NPC inference.
// Existing execution revisions never acquire this event on load or replay.
export const RECEPTION_INTRODUCTION_POLICY = freeze({
  version: 1, ref: 'reception-mutual-introductions@1', locationId: 'RECEPTION',
  eligible: 'new-execution-revision; ordinary-opening; first-day; no-active-case; enough-free-time-for-bounded-event',
  trigger: 'player-arrived-in-reception; escort-only-living-available-original-participants',
  paths: 'committed-adjacent-escort-steps; no-remote-introduction-or-unavailable-resurrection',
  identity: 'actual-group-delivery; names-only; no-abilities-private-biography-or-source-catalogue',
  player: 'warden-reads-configured-name-registration-first; no-invented-player-speech-or-consent',
  writing: 'original-Anan-line-displayed-to-actual-assembled-readers; outer-source-writing-quotes-are-presentation-only',
  repetitions: 'one-immutable-completion-per-run; read-only-view-never-triggers; action-bound-source-keys-across-restored-branches',
  compatibility: 'v1-v6-retain-their-historical-opening-behavior',
  source: RECEPTION_INTRODUCTION_SOURCE,
  linesFingerprint: createHash('sha256').update(JSON.stringify(RECEPTION_INTRODUCTIONS)).digest('hex'),
});
export const RECEPTION_INTRODUCTION_FINGERPRINT = createHash('sha256')
  .update(JSON.stringify(RECEPTION_INTRODUCTION_POLICY)).digest('hex');

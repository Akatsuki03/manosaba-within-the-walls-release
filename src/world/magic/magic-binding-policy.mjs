import { isDeepStrictEqual } from 'node:util';
import { MAGIC_ROSTER, GENERAL_SPATIAL_SHIFT, APPROVED_SPATIAL_PRESET,
  abilityDigest, magicDefinition, magicJson, magicFail } from './ability-definitions.mjs';

const freeze = value => {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
};
// HOST source-code authority, not a loader for the external approval record or
// actor/card/HTTP supplied bindings. The user approved witch-factor ownership,
// NOT growth thresholds, automatic recognition, durable sharing implementation
// or portable Milia powers. Original-relation restoration remains separately gated.
const rule = freeze({ version: 1, ref: 'body-witch-factor-ownership@1',
  approvalRef: 'user-gameplay-policy@20261024-v1',
  ownership: 'physical-body-witch-factor', cognition: 'stable-mind-no-occupancy-knowledge',
  growth: 'emotion-induced-witchification-deepening-enhances-ability;producer-gated',
  awakened: 'setup-disabled-no-automatic-recognition',
  restoration: 'original-milia-mind-original-relation-only;separate-consumer-gated',
  custom: { definitionRef: GENERAL_SPATIAL_SHIFT.ref, approvalRef: APPROVED_SPATIAL_PRESET.approval,
    characterHash: APPROVED_SPATIAL_PRESET.characterHash } });
const reviewedRefs = ['emma:basic@1', 'emma:awakened@1', 'hiro:basic@1', 'hiro:awakened@1',
  'anan:basic@1', 'anan:awakened@1', 'noah:basic@1', 'noah:awakened@1', 'leia:basic@1', 'leia:awakened@1',
  'milia:basic@1', 'milia:awakened@1', 'margo:basic@1', 'margo:awakened@1', 'nanoka:basic@1', 'nanoka:awakened@1',
  'alisa:basic@1', 'alisa:awakened@1', 'sherry:basic@1', 'sherry:awakened@1', 'hanna:basic@1', 'hanna:awakened@2',
  'coco:basic@1', 'coco:awakened@1', 'meruru:basic@1', 'meruru:awakened@1', 'yakumo-spatial-shift@2'];
if (!isDeepStrictEqual([...MAGIC_ROSTER.flatMap(row => row.refs), GENERAL_SPATIAL_SHIFT.ref].sort(), [...reviewedRefs].sort()))
  magicFail('INVALID_ABILITY_GRANT');
const definitionBindings = Object.fromEntries(reviewedRefs.map(ref => {
  const definition = magicDefinition(ref);
  return [ref, { actorId: definition.actorId, definitionRef: ref, definitionFingerprint: definition.fingerprint,
    sourceFingerprint: abilityDigest(definition.sources), binding: { kind: 'body', id: `body:${definition.actorId}` } }];
}));
const policy = { version: 2, ref: 'host-body-factor-binding@2', approvedBy: rule.approvalRef,
  ruleFingerprint: abilityDigest(rule), definitionBindings };
// Fail closed if this reviewed rule/matrix or its source definitions change.
// A later policy needs a new reviewed version, never automatic same-ref drift.
const reviewedFingerprint = 'cde5c25dbbfda6561b8dd90245adbfdac373dd499c51b5ba29041da04bdee025';
if (abilityDigest(policy) !== reviewedFingerprint) magicFail('INVALID_ABILITY_GRANT');
export const APPROVED_BODY_FACTOR_POLICY = freeze({ ...policy, fingerprint: reviewedFingerprint });
export const BODY_FACTOR_POLICY_REFERENCE = freeze({ version: 2, ref: policy.ref,
  fingerprint: APPROVED_BODY_FACTOR_POLICY.fingerprint, ruleFingerprint: policy.ruleFingerprint, approvedBy: policy.approvedBy });

/** Versioned closed compiler. Reproduces ONLY the in-repo approved matrix;
 * callers cannot author a new matrix by recomputing an unkeyed hash. The
 * engine constructor remains a private HOST interface, not a certificate API. */
export function compileApprovedBodyFactorPolicy() { return APPROVED_BODY_FACTOR_POLICY; }
export function assertApprovedBodyFactorPolicy(value) {
  if (!isDeepStrictEqual(magicJson(value), APPROVED_BODY_FACTOR_POLICY)) magicFail('INVALID_ABILITY_GRANT');
  return APPROVED_BODY_FACTOR_POLICY;
}
export function assertBodyFactorGrantApproval(approval) {
  const row = APPROVED_BODY_FACTOR_POLICY.definitionBindings[approval?.definitionRef];
  if (!row || !isDeepStrictEqual(approval.bindingPolicy, BODY_FACTOR_POLICY_REFERENCE)
    || approval.approvedBy !== policy.approvedBy || approval.actorId !== row.actorId
    || approval.sourceFingerprint !== row.sourceFingerprint || !isDeepStrictEqual(approval.binding, row.binding))
    magicFail('MAGIC_GRANT_APPROVAL_REQUIRED');
  return row;
}

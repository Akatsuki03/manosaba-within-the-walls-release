import { createHash } from 'node:crypto';
import { isProxy } from 'node:util/types';
import { CARD_SOURCE_SHA256, cardEntryReference } from '../content/card-world.mjs';

const freeze = value => {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
};
// HOST_ONLY provenance. The card's setting declares a crossbow in reception;
// it does NOT establish a loose arrow, a broom location, or public blank paper.
// Blank paper is not an authored supply either. The case recipe is comparison
// material, never permission to enact a crime.
export const ITEM_POLICY_VERSION_2 = 2;
export const CASE_ITEM_POLICY_V2 = freeze({
  ref: 'audited-prison-supplies@2', version: 2,
  authority: 'user-approved-explicit-fan-adaptation',
  sourceHierarchy: ['current-world-descriptors', 'audited-static-card-setting', 'explicit-authored-adaptation'],
  source: { file: 'data/card-source.json', sha256: CARD_SOURCE_SHA256, setting: cardEntryReference(2),
    canonicalComparisonOnly: cardEntryReference(38),
    comparison: '原卡案件总览列出刺剑、扫把杆、头绳、会客厅弩枪箭矢；仅用于器具一致性核对，不执行该条的顺序、凶手、动机或死亡。',
    unpackedOriginalText: '本工作区没有 CASE_ONE_SOURCE 所指的解包剧情文本；不声称已经逐句复核原作。' },
  adaptations: [
    { id: 'arrow', name: '弩箭', room: 'reception', placement: '会客厅角落的弩旁的箭架',
      basis: '原卡明确会客厅角落有弩；箭架中另放一支可取用的箭是本版本新增布置，不从案件配方推导当前存量。' },
    { id: 'broom', name: '扫帚柄', room: 'corridor', placement: '走廊楼梯旁的清扫架',
      basis: '普通地图尚无可用玄关大厅；走廊清扫架与可拆卸长柄是本版本明确的同人布置，不宣称原作位置。' },
  ],
  knowledge: 'only-settled-local-discovery; no-global-owner-knowledge',
  custody: 'one-object-one-holder; explicit-take-and-transfer',
  fairness: 'actual-precrime-trails-not-guaranteed-solution; player-may-remove-last-path',
});
export const CASE_ITEM_POLICY_V2_HASH = createHash('sha256').update(JSON.stringify(CASE_ITEM_POLICY_V2)).digest('hex');
export const caseItemPolicyV2Reference = () => ({ ref: CASE_ITEM_POLICY_V2.ref, version: 2, sha256: CASE_ITEM_POLICY_V2_HASH });
export const isCaseItemPolicyV2Reference = value => value && !isProxy(value) && Object.getPrototypeOf(value) === Object.prototype
  && Reflect.ownKeys(value).length === 3 && ['ref', 'version', 'sha256'].every(key => {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    return descriptor?.enumerable && Object.hasOwn(descriptor, 'value');
  }) && value.ref === CASE_ITEM_POLICY_V2.ref && value.version === 2 && value.sha256 === CASE_ITEM_POLICY_V2_HASH;
export function caseItemPolicyPin(state) {
  if (state.caseItemPolicy === undefined) {
    if (state.itemPolicyVersion === 2) throw Object.assign(new Error('日用品规则来源缺失。'), { code: 'INVALID_AGENT_STATE' });
    return undefined;
  }
  if (state.itemPolicyVersion !== 2 || !isCaseItemPolicyV2Reference(state.caseItemPolicy))
    throw Object.assign(new Error('日用品规则来源不一致。'), { code: 'INVALID_AGENT_STATE' });
  return caseItemPolicyV2Reference();
}
export function supplyDeclarationsV2() {
  return CASE_ITEM_POLICY_V2.adaptations.map(({ id, name, room, placement }) => ({ id, name, room, placement,
    visibility: 'public', source: { kind: 'authored-adaptation', policy: caseItemPolicyV2Reference(), declarationId: id } }));
}

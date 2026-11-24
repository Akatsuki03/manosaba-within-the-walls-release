import { createHash } from 'node:crypto';
import { canonicalJson } from './random-draws.mjs';
import { ATTRIBUTES, attributeModifier } from '../../public/player-creation-rules.mjs';

const freeze = value => {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
};
export const DICE_RULES = freeze({ version: 1, ref: 'host-d20-check@1', faces: 20,
  originalModifier: 0, customModifier: 'floor((score-10)/2)', success: 'total>=dc',
  naturalOverrides: false, practiceEffects: 'none',
  reload: 'pre-roll-save-new-dice-epoch; post-roll-save-restores-existing-result',
  retry: 'same-request-same-result; no-model-or-browser-randomness',
  difficulties: [{ id: 'easy', label: '容易', dc: 10 }, { id: 'standard', label: '普通', dc: 13 }, { id: 'hard', label: '困难', dc: 16 }],
  maxHistory: 20, maxOptions: 6, maxOpportunities: 8,
  origin: 'host-owned-policy-and-offered-definitions-only; practice-never-world-authority' });
export const DICE_FINGERPRINT = createHash('sha256').update(canonicalJson(DICE_RULES)).digest('hex');
const ids = new Set(ATTRIBUTES.map(row => row.id));
export const diceFailure = (code = 'INVALID_DICE_REQUEST', message = '骰子请求或宿主检定规则无效，未掷骰。') => {
  throw Object.assign(new Error(message), { code });
};
export function diceData(value) {
  try { return JSON.parse(canonicalJson(value)); } catch { diceFailure(); }
}
function exact(value, allowed, required = allowed) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).some(key => !allowed.includes(key)) || required.some(key => !Object.hasOwn(value, key))) diceFailure();
}
const safe = (value, max) => typeof value === 'string' && value.trim().length > 0 && value.length <= max
  && !/[<>\u0000-\u001f\u007f]/u.test(value);
const identifier = value => safe(value, 128) && /^[a-zA-Z0-9][a-zA-Z0-9_.:-]*$/u.test(value);
const integer = (value, min, max) => Number.isSafeInteger(value) && value >= min && value <= max;
export function validateDiceRollInput(value) {
  const input = diceData(value);
  exact(input, ['requestId', 'expectedGeneration', 'expectedRevision', 'mode', 'ability', 'difficulty', 'opportunityId', 'optionId'],
    ['requestId', 'expectedGeneration', 'expectedRevision', 'mode']);
  if (!identifier(input.requestId) || !integer(input.expectedGeneration, 1, Number.MAX_SAFE_INTEGER)
    || !integer(input.expectedRevision, 0, Number.MAX_SAFE_INTEGER)) diceFailure();
  if (input.mode === 'practice') {
    exact(input, ['requestId', 'expectedGeneration', 'expectedRevision', 'mode', 'ability', 'difficulty']);
    if (!ids.has(input.ability) || !DICE_RULES.difficulties.some(row => row.id === input.difficulty)) diceFailure();
  } else if (input.mode === 'opportunity') {
    exact(input, ['requestId', 'expectedGeneration', 'expectedRevision', 'mode', 'opportunityId', 'optionId']);
    if (!identifier(input.opportunityId) || !identifier(input.optionId)) diceFailure();
  } else diceFailure();
  return freeze(input);
}
/** Host-only input: the browser/model can select an offered ID, never choose
 * a difficulty, environmental bonus, source, dice value or world effect. */
export function validateDiceOpportunity(value) {
  const row = diceData(value);
  exact(row, ['id', 'label', 'sourceKey', 'actorId', 'options']);
  if (![row.id, row.actorId].every(identifier) || !safe(row.label, 160) || !safe(row.sourceKey, 256)
    || !Array.isArray(row.options) || row.options.length < 1 || row.options.length > DICE_RULES.maxOptions) diceFailure();
  const seen = new Set();
  for (const option of row.options) {
    exact(option, ['id', 'label', 'ability', 'dc', 'environmentModifier', 'environmentReason']);
    if (!identifier(option.id) || seen.has(option.id) || !safe(option.label, 160) || !ids.has(option.ability)
      || !integer(option.dc, 1, 40) || !integer(option.environmentModifier, -10, 10)
      || !safe(option.environmentReason, 240)) diceFailure();
    seen.add(option.id);
  }
  return freeze(row);
}
export function diceCharacter(state) {
  if (state?.exampleId !== 'agent') return null;
  const custom = state.creation?.playerMode === 'custom';
  const modifiers = Object.fromEntries(ATTRIBUTES.map(({ id }) => {
    const score = state.creation?.character?.attributes?.scores?.[id];
    if (custom && !integer(score, 1, 20)) diceFailure('INVALID_DICE_STATE', '自定义角色属性缺失或损坏，未掷骰。');
    return [id, custom ? attributeModifier(score) : 0];
  }));
  return { name: custom ? state.creation.character.name : null,
    attributeSource: custom ? 'saved-custom' : 'neutral-original', modifiers };
}
export function checkSpecification(character, { mode, ability, difficulty, opportunity, optionId }) {
  let option; let label;
  if (mode === 'practice') {
    const selected = DICE_RULES.difficulties.find(row => row.id === difficulty);
    if (!selected || !ids.has(ability)) diceFailure();
    option = { ability, dc: selected.dc, environmentModifier: 0, environmentReason: '试掷不附加场景修正' };
    label = '自由试掷（不改变剧情）';
  } else {
    option = opportunity?.options.find(row => row.id === optionId);
    if (!option) diceFailure('INVALID_DICE_OPTION', '该反应选项已经失效或不属于当前机会，未掷骰。');
    label = option.label;
  }
  const modifier = character?.modifiers?.[option.ability];
  if (!integer(modifier, -5, 5)) diceFailure('INVALID_DICE_STATE');
  return freeze({ label, mode, ability: option.ability, abilityLabel: ATTRIBUTES.find(row => row.id === option.ability).label,
    modifier, environmentModifier: option.environmentModifier, environmentReason: option.environmentReason, dc: option.dc });
}
export function evaluateD20(specification, die) {
  const spec = diceData(specification);
  exact(spec, ['label', 'mode', 'ability', 'abilityLabel', 'modifier', 'environmentModifier', 'environmentReason', 'dc']);
  if (!integer(die, 1, 20) || !ids.has(spec.ability) || !integer(spec.modifier, -5, 5)
    || !integer(spec.environmentModifier, -10, 10) || !integer(spec.dc, 1, 40)) diceFailure();
  const total = die + spec.modifier + spec.environmentModifier;
  const signed = value => value < 0 ? `－${Math.abs(value)}` : `＋${value}`;
  return freeze({ ...spec, die, total, success: total >= spec.dc,
    formula: `${die}${signed(spec.modifier)}${signed(spec.environmentModifier)}＝${total}；难度 ${spec.dc}` });
}
export const diceAbilities = () => ATTRIBUTES.map(({ id, label }) => ({ id, label }));

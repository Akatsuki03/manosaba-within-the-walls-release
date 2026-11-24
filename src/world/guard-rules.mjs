import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { canonicalJson } from './random-draws.mjs';
import { abilityRuleReference } from './magic/ability-definitions.mjs';
import { runtimeCapabilityId } from '../content/runtime-capabilities.mjs';

// Independent extension identity. This must not become part of an already
// frozen base-runtime policy or depend on the reaction reducer/runtime registry.
export const GUARD_RULES = Object.freeze({ version: 1, ref: 'open-map-guard-reaction@1',
  activation: 'explicit-host-action; curfew-runtime-v5-v6-daily-or-aftermath-only',
  patrol: 'host-private-adjacent-open-map-route; shared-simulation-clock-only',
  discovery: 'actual-colocation-or-cell-bars-at-unlawful-residence-boundary',
  pending: 'persist-before-capture; block-ordinary-actions-and-npc-beats',
  escape: 'sealed-d20-options; stay-in-current-room-or-one-legal-adjacent-edge; no-lock-override',
  protection: 'escape-two-tactical-actions@1', detentionSeconds: 2 * 86400,
  detention: 'exclusive-host-escort-room; explicit-wait; stop-before-authored-case-boundary; suspend-remaining-sentence-on-case-handoff' });
export const GUARD_FINGERPRINT = createHash('sha256').update(canonicalJson(GUARD_RULES)).digest('hex');
const reference = Object.freeze({ ref: GUARD_RULES.ref, fingerprint: GUARD_FINGERPRINT });
const supported = new Set(['agent-prison-runtime@5', 'agent-prison-runtime@6', 'agent-prison-runtime@7', 'agent-prison-runtime@8']);
const plain = value => value !== null && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype;
const fail = () => { throw Object.assign(new Error('看守规则扩展的来源或版本绑定不一致；原始进度保持不变。'), { code: 'SOURCE_VERSION_MISMATCH' }); };

export const isGuardRuleReference = value => isDeepStrictEqual(value, reference);

/** Resolve only explicit, replay-bound activation evidence. The reaction
 * reducer owns the detailed guardReaction schema; this dependency-free layer
 * binds its presence and every subsequent scene to one exact activation pin.
 * Reading a legacy state never activates the extension or attaches a new pin.
 */
export function guardRuleReference(state) {
  if (!plain(state) || state.agentActions !== undefined && !Array.isArray(state.agentActions)) fail();
  abilityRuleReference(state);
  let activated = false;
  for (const action of state.agentActions || []) {
    if (action?.type === 'guard_rules_activate') {
      if (activated || !plain(action) || Object.keys(action).length !== 3
        || !['type', 'rulesRef', 'fingerprint'].every(key => Object.hasOwn(action, key))
        || action.rulesRef !== GUARD_RULES.ref || action.fingerprint !== GUARD_FINGERPRINT) fail();
      activated = true;
    } else if (action?.type === 'scene') {
      if (activated ? !Object.hasOwn(action, 'guardRules') || !isGuardRuleReference(action.guardRules)
        : Object.hasOwn(action, 'guardRules')) fail();
    } else if (action && Object.hasOwn(action, 'guardRules')) fail();
  }
  if (!activated) {
    if (Object.hasOwn(state, 'guardReaction')) fail();
    return undefined;
  }
  if (state.exampleId !== 'agent' || !supported.has(runtimeCapabilityId(state.agentRuntimeRevision))
    || !plain(state.guardReaction) || state.guardReaction.version !== GUARD_RULES.version
    || state.guardReaction.rulesRef !== GUARD_RULES.ref || state.guardReaction.fingerprint !== GUARD_FINGERPRINT) fail();
  return reference;
}

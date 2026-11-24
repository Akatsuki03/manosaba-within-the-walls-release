// Immutable28. Host sentence-form selection, not an activity/story classifier.
// Only a positive present-address production, grounded in the actual scene,
// grants exact raw words. A model conversation/playerText is not evidence.
import { isDeepStrictEqual } from 'node:util';
import { SOURCE_ACQUISITION27_INSTRUCTIONS, SOURCE_ACQUISITION27_FINAL_INSTRUCTIONS } from './source-acquisition27.mjs';
import { TRUSTED_COMMUNICATION_RUNTIME_REVISION } from '../content/relationship-context-policy.mjs';
export { TRUSTED_COMMUNICATION_RUNTIME_REVISION } from '../content/relationship-context-policy.mjs';
export const isCommunication28 = value => (typeof value === 'string' ? value : value?.source?.executionRevision?.revisionId
  ?? value?.agentRuntimeRevision ?? value?.executionRevision?.revisionId) === TRUSTED_COMMUNICATION_RUNTIME_REVISION;
export const COMMUNICATION28_RULES = `TRUSTED PRESENT COMMUNICATION runtime28: Preserve the ENTIRE exact rawInput in one always conversation step for a current direct request. Optional recipient willingness is not an unmet player-action condition. Ground the recipient uniquely in the actual delivered scene, never choose an arbitrary nearby person. The Host, not your conversation/playerText claim, verifies a finite present-address sentence form and exact source range. This is NOT an activity classifier: all existing source/invitation/criterion/fiction/voluntary rules still apply. Unsupported/ambiguous sentence forms, private thoughts, negated voice, past quotations, hypotheticals or unmet player-action conditions clarify, not fabricate speech. No quotes or extra mode are required for a direct present request or a grounded top-level 说/问：content delivery. Keep the full raw step; omit playerText unless it equals the exact spoken payload, excluding a delivery wrapper. A request authorizes only that request, not consent, source, cooperation or success.`;
export const COMMUNICATION28_INSTRUCTIONS = SOURCE_ACQUISITION27_INSTRUCTIONS + '\n\n' + COMMUNICATION28_RULES;
export const COMMUNICATION28_FINAL_INSTRUCTIONS = SOURCE_ACQUISITION27_FINAL_INSTRUCTIONS + '\n\nFINAL ' + COMMUNICATION28_RULES;
export const COMMUNICATION28_PERFORMANCE = `Host communicationSelection is source-bound task data, not your proposal. If present, optional utterance must equal its text exactly (only optional outer 「」); no paraphrase, additions or new question. If absent, omit utterance. Conversation/playerText/summary alone cannot grant voice. Keep gestures observable. Refusal and silence remain legal NPC responses.`;
const escape = value => value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
const courtesyStart = /^(?:(?:如果|若|假如)(?:你|您)(?:愿意|願意|方便)[，,]\s*)/u;
const courtesyEnd = /[；;，,]\s*(?:你|您)?不(?:愿意|願意|方便)(?:也)?(?:没关系|沒關係|无妨|無妨)[。.!！]?\s*$/u;
// Positive grammatical frames: request, addressed polar question, inclusive
// proposal. Requested content is opaque; no story/activity verb/NPC-name table.
const requestFrame = /^(?:请(?:你|您)?|請(?:你|您)?|麻烦(?:你|您)?|麻煩(?:你|您)?|劳驾|勞駕|拜托(?:你|您)?|拜託(?:你|您)?|烦请|煩請)\S[\s\S]*$/u;
const polarFrame = /^(?:(?:你|您)(?:能否|可否|是否(?:可以|愿意|願意)|能不能|可不可以|愿不愿意|願不願意|可以|能)|(?:能否|可否|能不能|可不可以|能|可以))\S[\s\S]*[吗嗎么麼？?][。.!！]?$/u;
const inclusiveFrame = /^(?:我们|我們)(?:来|來|一起|一同|共同|各|合作)\S[\s\S]*$/u;
const condition = /(?:如果|若是|要是|假如|假设|假設|倘若|等到|待到|除非|只有|仅当|僅當|provided\s+that|\bif\b|\bwhen\b)/iu;
const privateClause = /(?:^|[，,；;。])\s*(?:我(?:现在|現在|只是|只|仍|还|還)?(?:在)?(?:心里|心裡|心想|暗想|保持沉默|不(?:想|愿意|願意|打算)?(?:说|說|开口|開口))|(?:这|這)(?:只是|仅是|僅是)(?:设想|設想|假设|假設|回忆|回憶))/u;
function addressed(raw, scene, targetId) {
  const nearby = scene?.nearby;
  if (!Array.isArray(nearby) || !targetId || nearby.filter(row => row.id === targetId).length !== 1) return null;
  const named = nearby.flatMap(row => {
    const aliases = [...new Set([row.label, row.appearance, row.appearance ? '那位' + row.appearance : null])]
      .filter(label => typeof label === 'string' && label && label.length <= 128);
    const matches = aliases.flatMap(label => {
      const re = new RegExp('^(?:(?:我)?(?:对|對|向|跟|和)\\s*)?' + escape(label) + '(?=[，,：:\\s]|说|說|问|問)', 'u');
      const match = re.exec(raw);
      return match ? [match[0].length] : [];
    });
    return matches.length ? [{ id: row.id, end: Math.max(...matches) }] : [];
  });
  if (named.length === 1) return named[0].id === targetId ? named[0] : null;
  return named.length === 0 && nearby.length === 1 ? { id: targetId, end: 0 } : null;
}
export function presentCommunication28(raw, scene, targetId) {
  if (typeof raw !== 'string' || !raw.trim() || raw.length > 2000 || /[<>\u0000-\u001f\u007f]/u.test(raw)) return null;
  const target = addressed(raw.trim(), scene, targetId);
  if (!target) return null;
  const rest = raw.trim().slice(target.end);
  let body = rest.replace(/^[，,：:\s]+/u, '');
  const bodyStart = raw.search(/\S/u) + target.end + rest.length - body.length;
  // Only an anchored CURRENT delivery frame, not a historical quotation/title.
  const quote = /^(?:说|說|问|問|告诉你|告訴你)[：:]\s*「([^」]+)」[。.!！]?$/u.exec(body);
  if (quote) {
    const start = bodyStart + body.indexOf('「') + 1;
    return { targetId, start, end: start + quote[1].length, text: quote[1], form: 'current-quoted-address' };
  }
  const delivery = /^(?:说|說|问|問|告诉你|告訴你)[：:]\s*(\S[\s\S]*)$/u.exec(body);
  if (delivery && !/^[「『“"]/u.test(delivery[1])) {
    const text = delivery[1], start = bodyStart + body.length - text.length;
    return { targetId, start, end: start + text.length, text, form: 'current-delivery-address' };
  }
  const recipientAddress = target.end > 0 || courtesyStart.test(body)
    || /^(?:(?:请|請|麻烦|麻煩|拜托|拜託)(?:你|您)|(?:你|您)|(?:我们|我們)(?:一起|一同|共同|各|合作))/u.test(body);
  if (!recipientAddress) return null;
  body = body.replace(courtesyStart, '').replace(courtesyEnd, '').trim();
  if (condition.test(body) || /(?:之后|以後|以后|后|後)(?:再|才)|等.{0,80}(?:后|後|再|才)|在.{0,80}(?:时|時)(?:再|才)/u.test(body) || privateClause.test(body) || /[「」『』“”"]/u.test(body) || /[；;]/u.test(body)) return null;
  const form = requestFrame.test(body) ? 'direct-request' : polarFrame.test(body) ? 'direct-question'
    : inclusiveFrame.test(body) ? 'inclusive-proposal' : null;
  return form ? { targetId, start: 0, end: raw.length, text: raw, form } : null;
}
export function communicationSelection28({ rawInput, scene, intent, initialRunPolicy, scope }) {
  if (!isCommunication28(initialRunPolicy) || intent?.type !== 'conversation') return null;
  const selected = presentCommunication28(rawInput, scene, intent.targetId);
  return selected ? { version: 1, ...selected, rawInput, scope: structuredClone(scope),
    source: structuredClone(initialRunPolicy.source) } : null;
}
export function assertCommunicationSelection28(data, scope) {
  if (!isCommunication28(data.initialRunPolicy)) return;
  if (!isDeepStrictEqual(data.communicationSelection, communicationSelection28({ ...data, scope })))
    throw Object.assign(new Error('当前沟通选择与原文、接收者或任务来源不一致。'), { code: 'INVALID_NARRATIVE_OUTPUT' });
}
export function chosenCommunicationText28(data) {
  if (!isCommunication28(data.initialRunPolicy)) return null;
  const s = data.communicationSelection;
  return s && isDeepStrictEqual(s, communicationSelection28({ ...data, scope: s.scope })) ? s.text : null;
}
export function validateCommunicationPlan28(candidate, data) {
  if (!isCommunication28(data.initialRunPolicy) || candidate.route !== 'steps') return candidate;
  const conversations = candidate.steps.filter(step => step.intent.type === 'conversation');
  if (!conversations.length) return candidate;
  const one = candidate.steps.length === 1 && conversations[0].condition === 'always'
    && conversations[0].text === data.rawInput;
  const selected = one && presentCommunication28(data.rawInput, data.scene, conversations[0].intent.targetId);
  if (selected && (conversations[0].intent.playerText === undefined || conversations[0].intent.playerText === selected.text)) return candidate;
  return { type: 'plan', route: 'clarification', summary: '请明确本次现在要向哪位在场者提出的完整请求；私下想法、过去转述与尚未成立的行动条件不执行为发声。',
    steps: [], activitySelection: { kind: 'clarification', reason: 'ambiguous_request' } };
}

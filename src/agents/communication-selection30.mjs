import { ADMISSION_RUNTIME_REVISION } from './ordinary-admission32.mjs';
import { EVENT_DIRECTOR_RUNTIME_REVISION } from '../director/director-event-runtime.mjs';
import { PUBLICATION_RUNTIME_REVISION } from '../scenes/ordinary-publication31.mjs';
// Keep the same communication selection for capacity30 and publication31.
import { isDeepStrictEqual } from 'node:util';
import { CAPACITY_RUNTIME_REVISION } from '../content/ordinary-capacity30.mjs';
import { presentCommunication28 } from './communication-selection28.mjs';
import * as prior from './known-target29.mjs';
const revision = value => typeof value === 'string' ? value : value?.source?.executionRevision?.revisionId
  ?? value?.agentRuntimeRevision ?? value?.executionRevision?.revisionId;
export const isCapacity30 = value => revision(value) === CAPACITY_RUNTIME_REVISION;
const usesCurrentSelection = value => isCapacity30(value) || [PUBLICATION_RUNTIME_REVISION, ADMISSION_RUNTIME_REVISION, EVENT_DIRECTOR_RUNTIME_REVISION].includes(revision(value));
export const isCommunicationRuntime = value => usesCurrentSelection(value) || prior.isCommunicationRuntime(value);

function visibleAddressFeature(feature, appearance) {
  if (typeof appearance !== 'string') return false;
  const normalize = value => value.replace(/饰件|饰物/gu, '装饰').replace(/([黑白红蓝黄绿粉紫灰])色/gu, '$1').replace(/的/gu, '');
  const featureText = normalize(feature);
  const surfaces = appearance.split(/[，、,；;。！？\n]/u).map(normalize);
  if (surfaces.some(surface => surface.includes(featureText))) return true;
  // A visible hat may be described without a ribbon or other intervening
  // detail. Keep every stated qualifier and the same item in one clause.
  const hat = /^(.{1,16}?)(贝雷帽|礼帽|草帽|兜帽)$/u.exec(featureText);
  if (!hat) return false;
  return surfaces.some(surface => {
    const at = surface.indexOf(hat[1]);
    if (at < 0) return false;
    const after = at + hat[1].length;
    const item = surface.indexOf(hat[2], after);
    return item >= after && item - after <= 6;
  });
}

function currentVisualQuotedAddress(raw, scene, targetId) {
  if (typeof raw !== 'string' || raw.length > 2000 || /[<>\u0000-\u001f\u007f]/u.test(raw) || !Array.isArray(scene?.nearby)) return null;
  const address = /^(?:我\s*)?(?:对|對|向)\s*([^「」\n，；：:,;]{1,110}?)(?:直接|当面|當面)?(?:说|說|问|問|打招呼)[：:]\s*「([^「」]+)」[。.!！]?$/u.exec(raw.trim());
  if (!address) return null;
  const reference = address[1].trim();
  const nearby = scene.nearby;
  let matches;
  if (/^(?:她|他|对方|對方)$/u.test(reference)) matches = nearby;
  else {
    const described = /^(?:在场|在場)?(?:眼前|面前|身边|身邊)?(?:的)?(?:那位|这位|這位)?(.+?)(?:的)?(?:女孩|少女|女生|同伴|人)$/u.exec(reference);
    const features = described?.[1].split('、').map(part => /^(?:戴着|戴著|戴|穿着|穿著|穿|披着|披著|留着|留著|有着|有著)([\p{Script=Han}]{2,40}?)(?:的)?$/u.exec(part.trim())?.[1]);
    matches = nearby.filter(row => row.label === reference || Boolean(features?.length && features.length <= 3
      && features.every(feature => feature && visibleAddressFeature(feature, row.appearance))));
  }
  if (matches.length !== 1 || matches[0].id !== targetId) return null;
  const start = raw.indexOf('「') + 1;
  return { targetId, start, end: start + address[2].length, text: address[2], form: 'current-quoted-address' };
}

function selectPresentAddress(data, targetId) {
  return presentCommunication28(data.rawInput, data.scene, targetId)
    ?? (revision(data.initialRunPolicy) === EVENT_DIRECTOR_RUNTIME_REVISION
      ? currentVisualQuotedAddress(data.rawInput, data.scene, targetId) : null);
}

export function communicationSelection(data) {
  if (!usesCurrentSelection(data.initialRunPolicy)) return prior.communicationSelection(data);
  if (data.intent?.type !== 'conversation') return null;
  const selected = selectPresentAddress(data, data.intent.targetId);
  return selected ? { version: 1, ...selected, rawInput: data.rawInput,
    scope: structuredClone(data.scope), source: structuredClone(data.initialRunPolicy.source) } : null;
}
export function assertCommunicationSelection(data, scope) {
  if (!usesCurrentSelection(data.initialRunPolicy)) return prior.assertCommunicationSelection(data, scope);
  if (!isDeepStrictEqual(data.communicationSelection, communicationSelection({ ...data, scope })))
    throw Object.assign(new Error('当前沟通选择与原文、接收者或任务来源不一致。'), { code: 'INVALID_NARRATIVE_OUTPUT' });
}
export function chosenCommunicationText(data) {
  if (!usesCurrentSelection(data.initialRunPolicy)) return prior.chosenCommunicationText(data);
  const selected = data.communicationSelection;
  return selected && isDeepStrictEqual(selected, communicationSelection({ ...data, scope: selected.scope })) ? selected.text : null;
}
export function validateCommunicationPlan(candidate, data) {
  if (!usesCurrentSelection(data.initialRunPolicy)) return prior.validateCommunicationPlan(candidate, data);
  if (candidate.route !== 'steps') return candidate;
  const conversations = candidate.steps.filter(step => step.intent.type === 'conversation');
  if (!conversations.length) return candidate;
  const one = candidate.steps.length === 1 && conversations[0].condition === 'always'
    && conversations[0].text === data.rawInput;
  const selected = one && selectPresentAddress(data, conversations[0].intent.targetId);
  if (selected && (conversations[0].intent.playerText === undefined || conversations[0].intent.playerText === selected.text)) return candidate;
  return { type: 'plan', route: 'clarification', summary: '请明确本次现在要向哪位在场者提出的完整请求；私下想法、过去转述与尚未成立的行动条件不执行为发声。',
    steps: [], activitySelection: { kind: 'clarification', reason: 'ambiguous_request' } };
}

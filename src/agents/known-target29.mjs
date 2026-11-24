// Revision29 inherits the exact v28 communication grammar/prompt. Only Host
// known-ID typed recipient resolution changes; old roots delegate unchanged.
import { isDeepStrictEqual } from 'node:util';
import { KNOWN_TARGET_RUNTIME_REVISION } from '../content/relationship-context-policy.mjs';
import * as prior from './communication-selection28.mjs';
const revision = value => typeof value === 'string' ? value : value?.source?.executionRevision?.revisionId
  ?? value?.agentRuntimeRevision ?? value?.executionRevision?.revisionId;
export const isKnownTarget29 = value => revision(value) === KNOWN_TARGET_RUNTIME_REVISION;
export const isCommunicationRuntime = value => isKnownTarget29(value) || prior.isCommunication28(value);
export function communicationSelection(data) {
  if (!isKnownTarget29(data.initialRunPolicy)) return prior.communicationSelection28(data);
  if (data.intent?.type !== 'conversation') return null;
  const selected = prior.presentCommunication28(data.rawInput, data.scene, data.intent.targetId);
  return selected ? { version: 1, ...selected, rawInput: data.rawInput,
    scope: structuredClone(data.scope), source: structuredClone(data.initialRunPolicy.source) } : null;
}
export function assertCommunicationSelection(data, scope) {
  if (!isKnownTarget29(data.initialRunPolicy)) return prior.assertCommunicationSelection28(data, scope);
  if (!isDeepStrictEqual(data.communicationSelection, communicationSelection({ ...data, scope })))
    throw Object.assign(new Error('当前沟通选择与原文、接收者或任务来源不一致。'), { code: 'INVALID_NARRATIVE_OUTPUT' });
}
export function chosenCommunicationText(data) {
  if (!isKnownTarget29(data.initialRunPolicy)) return prior.chosenCommunicationText28(data);
  const selected = data.communicationSelection;
  return selected && isDeepStrictEqual(selected, communicationSelection({ ...data, scope: selected.scope })) ? selected.text : null;
}
export function validateCommunicationPlan(candidate, data) {
  if (!isKnownTarget29(data.initialRunPolicy)) return prior.validateCommunicationPlan28(candidate, data);
  if (candidate.route !== 'steps') return candidate;
  const conversations = candidate.steps.filter(step => step.intent.type === 'conversation');
  if (!conversations.length) return candidate;
  const one = candidate.steps.length === 1 && conversations[0].condition === 'always'
    && conversations[0].text === data.rawInput;
  const selected = one && prior.presentCommunication28(data.rawInput, data.scene, conversations[0].intent.targetId);
  if (selected && (conversations[0].intent.playerText === undefined || conversations[0].intent.playerText === selected.text)) return candidate;
  return { type: 'plan', route: 'clarification', summary: '请明确本次现在要向哪位在场者提出的完整请求；私下想法、过去转述与尚未成立的行动条件不执行为发声。',
    steps: [], activitySelection: { kind: 'clarification', reason: 'ambiguous_request' } };
}

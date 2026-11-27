import { ATOMIC_PLAN_RUNTIME_REVISION } from '../content/relationship-context-policy.mjs';
import { EVENT_DIRECTOR_RUNTIME_REVISION } from '../director/director-event-runtime.mjs';
import { projectActionOutcome } from '../world/action-outcome.mjs';

// This is a whole-utterance admission for an explicit first-person thought,
// not a recovery default for an unknown action. Leave uncertain splits, quotes,
// conditions, recollections and independent actions to ordinary interpretation.
export function currentPrivateReflection(rawInput) {
  if (typeof rawInput !== 'string' || rawInput.length > 1200 || /\p{Cc}/u.test(rawInput)) return undefined;
  const match = /^我(?:\s*心想|\s*(?:在)?(?:心里|心裡|心中|内心|內心)\s*(?:想(?:着|著)?|琢磨(?:着|著)?|盘算(?:着)?|盤算(?:著)?|寻思(?:着)?|尋思(?:著)?))\s*[：:]?\s*([^\s，,；;。！？!?：:「」『』“”"<>\p{Cc}][^，,；;。！？!?：:「」『』“”"<>\p{Cc}]*?)[。！？!?]?$/u.exec(rawInput.trim());
  if (!match || /^(?:起|过|過|象|像|了|好|清楚|明白|出[来來]|[着著]$)/u.test(match[1])
    || /(?:然后|然後|随后|隨後|接着|接著|接下来|接下來|于是|於是|順手|顺手|并|並|同时|同時|一边|一邊|转身|轉身|而[且後后]|但|可是|却|卻|就(?:朝|向|伸|说|說|挥|揮|走)|我(?:对|對|向|朝|说|說|写|寫|走|抬|挥|揮|拿|推|伸|转|轉))/u.test(match[1])) return undefined;
  return match[1].trim();
}

export function hostPrivateReflectionAction(row, plan) {
  return { type: 'scene', privateReflectionVersion: 1, jobId: row.job_id, rawInput: row.text,
    intent: { type: 'reflect' }, performanceVersion: 2, causalVersion: 1, sceneBeatVersion: 1,
    ...(plan.guardRules ? { guardRules: structuredClone(plan.guardRules) } : {}),
    actionOutcome: projectActionOutcome({ version: 1, phase: 'committed', steps: [{
      index: 0, status: 'completed', code: 'completed', eventIds: ['event-1'],
    }] }) };
}

export const supportsOpenPlayerAction = revision => [ATOMIC_PLAN_RUNTIME_REVISION, EVENT_DIRECTOR_RUNTIME_REVISION].includes(revision);

export const OPEN_ACTION_INTENT = '\n\n最终普通行动规则：玩家描述此刻要做什么，就是选择了动作，不需要写成直接引语。普通动作、手势和未指定原话的交流用 {type:"act",summary,targetId?}；targetId 只用 scene.nearby 中能按当场可知姓名（含唯一简称）或外观确定的对象。例：试着向希罗打招呼、朝她挥手、打听门几点开、向她道谢，都可以走 ordinary / steps；保留完整原文作 step.text，不编 playerText。没有目标也可选无目标动作；只有遗漏会实质改变动作的对象、条件或选择时才澄清。只尝试、不先写成功；有专门机制时仍使用原有机制。明确原话保留并走原有发言规则；心里想、过去转述、否定和未成立的条件不是已经做出的动作或发声。';
export const OPEN_ACTION_PERFORMANCE = '\n\n演绎这一步实际选择的行动。玩家写打招呼、挥手、表示谢意、打听开门时间等，action 应交付对应的当下可觉察举动，例如「我朝她打了个招呼。」或「我向她打听开门的时间。」，不要只写抬眼或站在原地而漏掉所选举动。没有玩家给定的原话就不补 utterance，也不把虚构的台词塞进 action。私下思绪仅放 reflection。若实际结果未结算，写尝试，不替对方回应，不补接触、接受、伤害或其他世界结果。';

// Bounded recovery for the common bare greeting, not a classifier for arbitrary
// actions. Other descriptions go through the regular semantic `act` path.
export function namedGreetingTarget(rawInput, scene) {
  const match = /^(?:我\s*)?(?:(?:试着|試著|试试|試試|尝试|嘗試)\s*)?(?:对|對|向|跟|和|朝)\s*([\p{Script=Han}]{2,30}?)\s*打(?:个|個|一声|一聲)?招呼[。.!！]?$/u.exec(rawInput.trim());
  if (!match) return undefined;
  const name = match[1];
  const matches = scene.nearby.filter(row => row.label === name || name.length <= 4
    && typeof row.label === 'string' && /^\p{Script=Han}+$/u.test(row.label) && row.label.endsWith(name));
  return matches.length === 1 ? matches[0].id : undefined;
}

export function recoverNamedGreeting(candidate, data, reviewed) {
  if (data.openActionVersion !== 1 || reviewed) return candidate;
  const step = candidate.steps[0], choice = candidate.activitySelection;
  const recoverClarification = candidate.route === 'clarification' && choice.kind === 'clarification'
    && ['ambiguous_request', 'missing_target'].includes(choice.reason);
  const recoverConversation = candidate.route === 'steps' && choice.kind === 'ordinary' && candidate.steps.length === 1
    && step.text === data.rawInput && step.condition === 'always' && step.intent.type === 'conversation';
  if (!recoverClarification && !recoverConversation) return candidate;
  const targetId = namedGreetingTarget(data.rawInput, data.scene);
  if (!targetId || recoverConversation && step.intent.targetId !== targetId) return candidate;
  const intent = { type: 'act', summary: '向在场的对方打招呼。', targetId };
  return { type: 'plan', route: 'steps', summary: intent.summary,
    steps: [{ text: data.rawInput, condition: 'always', intent }], activitySelection: { kind: 'ordinary' } };
}

// Avoid turning obvious narration of non-actions into a witness event on a
// bad intent proposal. This is a leading-clause check, not a ban on mentioning
// a future event or negation in an ordinary present gesture or in given speech.
export function nonPresentOpenAction(text) {
  const action = text.trim().replace(/^我\s*/u, '');
  if (/^(?:如果|若是|假如|假设|假設|要是|倘若|除非|等到|待到)/u.test(action)) return true;
  // Do not reject an entire turn just because a private/past/negative
  // introductory clause precedes a distinct observable action.
  return !/[，,；;。！？!?]./u.test(action) && /^(?:回想|想起|记得|記得|(?:在)?(?:心里|心裡|心中|内心|內心)|昨[天晚]|刚才|剛才|先前|之前|过去|過去|没有|沒有|不曾|并未|並未|不(?:想|打算|会|會|要|愿意|願意|去|再))/u.test(action);
}

import { createHash } from 'node:crypto';
import { isProxy } from 'node:util/types';

// Host-owned presentation metadata only. Nothing here authorizes speech,
// recognition, inventory, movement or a change to the world. New jobs opt in;
// historical packets without a policy retain their original contract.
export const ACTOR_PERFORMANCE_POLICY = Object.freeze({
  version: 1,
  npcActionPerson: 'third',
  playerActionPerson: 'first',
  identityBoundary: 'an-owner-name-in-action-is-not-public-until-known-to-the-player',
  actors: Object.freeze({
    noah: Object.freeze({ selfReference: '诺亚' }),
    anan: Object.freeze({ introduction: '吾辈乃夏目安安' }),
  }),
});
export const ACTOR_PERFORMANCE_POLICY_HASH = createHash('sha256')
  .update(JSON.stringify(ACTOR_PERFORMANCE_POLICY), 'utf8').digest('hex');

/** Pure host helper. Custom actors should pass their actual custom ID, not a
 * borrowed canonical ID. An unknown actor receives only the viewpoint rule. */
export function policyForActor(actorId, { player = false, unidentified = false } = {}) {
  return Object.freeze({ version: 1, actionPerson: player ? 'first' : 'third',
    ...(!player && unidentified ? { actionLabel: '她' } : {}),
    ...(typeof actorId === 'string' && Object.hasOwn(ACTOR_PERFORMANCE_POLICY.actors, actorId)
      ? ACTOR_PERFORMANCE_POLICY.actors[actorId] : {}) });
}
const invalid = () => { throw Object.assign(new Error('角色表现策略不符合宿主契约。'), { code: 'ERR_ACTOR_PERFORMANCE_POLICY' }); };

/** Exact, detached JSON schema. Optional properties, if present, must contain
 * their literal supported value; undefined/accessors/proxies are not omission. */
export function validatePerformancePolicy(value, { player = false } = {}) {
  if (value === null || typeof value !== 'object' || isProxy(value)
    || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) invalid();
  const fields = ['version', 'actionPerson', 'selfReference', 'introduction', 'actionLabel'];
  const result = {};
  for (const key of Reflect.ownKeys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (typeof key !== 'string' || !fields.includes(key) || !descriptor.enumerable
      || !Object.hasOwn(descriptor, 'value')) invalid();
    result[key] = descriptor.value;
  }
  if (result.version !== 1 || result.actionPerson !== (player ? 'first' : 'third')
    || Object.hasOwn(result, 'selfReference') && result.selfReference !== '诺亚'
    || Object.hasOwn(result, 'introduction') && result.introduction !== '吾辈乃夏目安安'
    || Object.hasOwn(result, 'actionLabel') && (player || result.actionLabel !== '她')) invalid();
  return Object.freeze(result);
}

// Additional spoken-voice rules for new NPC tasks, including older worlds
// without a v4 performancePolicy packet. Stable traits outrank editable style.
export function npcSpokenVoiceGuidance(actorId) {
  const policy = policyForActor(actorId);
  return [
    '发言按此刻角色自己的说话习惯、与对方的熟悉程度、已经听见或看见的事来写。只回应眼前真正想说的事；不把见闻或对方打扮逐项复述，不替别人宣布未表达的计划。提到尚未相识的人，用当时实际知道的称呼。若自行报姓名，自报放在确实会送达的 utterance，不放进动作和旁白；不要求主动、重复介绍。',
    ...(policy.selfReference ? [
      '诺亚的台词专规：以“诺亚”自称，或在话已清楚时省略主语；不用“我／我们”自称。真实引述中的“我”原样保留，使用『』。诺亚慢悠悠、直率好奇，常从一个让自己在意的颜色、画面或细节说起；可以迟疑或拖一下尾音，不把每句写成撒娇腔，不一口气复述全场或逐人点评。自愿介绍时可写“嗯～？名字？诺亚就是诺亚哦。”或“诺亚叫城崎诺亚。”；这只是口吻，不规定本轮必须介绍、赞美或邀约。',
    ] : []),
    ...(policy.introduction ? ['安安的介绍只有实际选择笔谈时才写，惯用“吾辈乃夏目安安”；笔谈仍不变成有声发言。'] : []),
  ].join('\n');
}

/** Additive instructions, also appended AFTER editable behavior preferences.
 * Literal player speech outranks character voice; silence is never a defect. */
export function performancePolicyGuidance(value, { player = false, addressVersioned = false } = {}) {
  const policy = validatePerformancePolicy(value, { player });
  return [
    player
      ? '玩家表现策略：action 采用第一人称“我”，台词中的惯用自称不改变玩家动作视角；其他人物仍用第三人称。'
      : 'NPC表现策略：action 只用第三人称“她／他／本人已交付的姓名”或自然省略主语，不能用“我／我们／吾辈／本小姐”叙述NPC自己的动作。utterance 中真正说出或写下的第一人称仍是台词，不是动作。',
    '姓名与外观分开：只使用当下已交付的本人及在场者信息，不挪用他人的衣着、帽饰、随身物与站位；观察对方的物品不等于本人持有。',
    ...(policy.actionLabel ? ['当前玩家尚未认出本人的姓名：action 用“她”或省略主语，不在动作栏写出自己的姓名。utterance 中仍可自行选择自我介绍；介绍只能经实际发言或书写取得。'] : []),
    ...(!addressVersioned && policy.selfReference ? [
      '诺亚台词习惯：生成的本人发言或书写以“诺亚”自称，不以“我／我们”自称；自然的短答可以完全没有自称，不逐句硬加名字。转述他人原话中的“我”保留，内层引述用『』，不作全文替换。',
    ] : []),
    ...(!addressVersioned && policy.introduction ? [
      '安安笔谈习惯：只有当下确实选择自我介绍时，默认写“吾辈乃夏目安安”；保持吾辈的文豪腔。仍通过笔与素描本书写，不强迫主动介绍、重复报姓名或制造未选择的发言。',
    ] : []),
    ...(player ? ['rawInput 中明确用「」引用的玩家原话逐字保留，优先于自称与介绍习惯；只对没有明确引用时新生成的 utterance 使用人物口吻。策略不增加任何发言、书写、提问或选择权限。'] : []),
  ].join('\n');
}

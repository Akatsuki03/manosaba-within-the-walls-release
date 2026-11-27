import { chosenCommunicationText, isCommunicationRuntime } from './communication-selection30.mjs';
import { readFileSync } from 'node:fs';
import { validatePerformancePolicy } from './actor-performance-policy.mjs';
import { hasInvalidAddress, playerAddressKey } from './character-address-policy.mjs';
import { isProxy } from 'node:util/types';
import { buildMaterialProseContext, assertMaterialProse, buildMaterialProseContextV2, assertMaterialProseV2, materialProseDiagnostic } from './material-prose-policy.mjs';
import { selectMagicSources } from '../world/magic/ability-definitions.mjs';
import { EVENT_DIRECTOR_RUNTIME_REVISION } from '../director/director-event-runtime.mjs';

import { buildBallotInstrumentContext, assertBallotInstrumentAssertions, ballotInstrumentAssertionDiagnostic } from '../cases/ballot-instrument-assertions.mjs';
const DIAGNOSTICS = new WeakMap();
const NPC_HOST_DIAGNOSTICS = new WeakMap();
const NPC_HOST_RULE_MAP = new Map([["structure", "npc-host-structure"], ["performance-policy", "npc-host-performance-policy"], ["npc-action-person", "npc-host-npc-action-person"], ["unknown-action-name", "npc-host-unknown-action-name"], ["self-reference", "npc-host-self-reference"], ["foreign-appearance", "npc-host-foreign-appearance"], ["private-reasoning", "npc-host-private-reasoning"], ["private-mind", "npc-host-private-mind"], ["unlock", "npc-host-unlock"], ["lock", "npc-host-lock"], ["movement", "npc-host-movement"], ["harm", "npc-host-harm"], ["lethal-action", "npc-host-lethal-action"], ["death", "npc-host-death"], ["wound", "npc-host-wound"], ["healing", "npc-host-healing"], ["magic", "npc-host-magic"], ["compulsion", "npc-host-compulsion"], ["transfer", "npc-host-transfer"], ["discovery", "npc-host-discovery"], ["creation", "npc-host-creation"], ["arrival", "npc-host-arrival"], ["other-action", "npc-host-other-action"]]);
export const NPC_HOST_FAILURE_RULES = Object.freeze([...NPC_HOST_RULE_MAP.values()]);
export const npcHostPerformanceDiagnostic = error => NPC_HOST_DIAGNOSTICS.get(error) ?? null;
export const MATERIAL_PROSE_FAILURE_RULES = Object.freeze([
  'material-context', 'material-kind', 'material-event-index', 'material-text',
  'material-trace', 'material-surface', 'material-distance', 'material-carrier', 'material-contact',
  'material-optics', 'material-closed-container', 'material-speech-residue', 'material-lawful-access', 'material-unlocked-permission', 'material-door-leaf',
  'material-absence', 'material-posture', 'ballot-instrument-conflict',
]);
const materialDiagnostic = error => {
  const diagnostic = materialProseDiagnostic(error);
  return diagnostic && MATERIAL_PROSE_FAILURE_RULES.includes(diagnostic.rule)
    ? { rule: diagnostic.rule, issue: diagnostic.rule,
      ...(Number.isSafeInteger(diagnostic.eventIndex) && diagnostic.eventIndex >= 0 && diagnostic.eventIndex <= 32 ? { eventIndex: diagnostic.eventIndex } : {}) }
    : undefined;
};
export const narrativeGuardDiagnostic = error => DIAGNOSTICS.get(error) ?? materialDiagnostic(error);
const fail = (rule = 'structure') => {
  const error = Object.assign(new Error('叙事文字越过了本轮可见事实或角色行动的边界。'), { code: 'INVALID_AGENT_OUTPUT' });
  DIAGNOSTICS.set(error, Object.freeze({ rule }));
  throw error;
};
const text = value => typeof value === 'string' ? value : '';
const clauses = value => text(value).split(/[，,。；;！!？?\n]+/u).map(row => row.trim()).filter(Boolean);
const normalized = value => text(value).replace(/[\s「」『』“”"、：:，,。；;！!？?]/gu, '');
const escape = value => value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');

// These checks deliberately target clear assertions, not every sensory adjective
// or mention of a wound. They supplement the structural contracts; they are not
// a general semantic truth checker. Dialogue remains a claim, never evidence of
// a physical result, and an attempted action is not its accomplished effect.
const privateReasoning = /(?:心想|暗想|心中暗道|心里(?:却|已经|已|还|仍然|仍|正在|正|在|其实)*(?:想|盘算|打算|决定|明白|知道|认定|相信|怀疑)|心中(?:盘算|打算|决定|明白|认定|相信|怀疑)|内心(?:想|决定|认定|相信|独白)|暗自(?:盘算|决定|认定|相信)|在心底|脑海(?:里|中).{0,4}(?:浮现|闪过|回响)|真正的(?:动机|目的)|她的计划是|他的计划是)/u;
const otherPrivateReasoning = /(?:(?:她|他|对方|其他人|众人).{0,10}(?:心想|暗想|心中暗道|心里(?:却|已经|已|还|仍然|仍|正在|正|在|其实)*(?:想|盘算|打算|决定|明白|知道|认定|相信|怀疑)|心中(?:盘算|打算|决定|明白|认定|相信|怀疑)|内心(?:想|决定|认定|相信|独白)|暗自(?:盘算|决定|认定|相信)|在心底|脑海(?:里|中).{0,4}(?:浮现|闪过|回响))|(?:她|他|对方)真正的(?:动机|目的)|她的计划是|他的计划是)/u;
const commitment = /(?:保证|承诺|发誓|答应|同意(?:合作|同行|跟随)|(?:永远|一直)(?:陪|保护|相信|跟随)|一定会|(?:我|吾辈|本小姐)(?:会|愿意)(?:一直|永远|始终)?(?:保护|陪着|陪伴|帮助|守护|听你的|带你|跟你|和你一起)|认罪|坦白自己)/u;
const relationship = /(?:终于|已经|彻底|从此|开始|不再).{0,5}(?:信任|原谅|服从|怀疑|戒备)|(?:放下|消除)(?:了)?(?:戒心|戒备|敌意)|(?:达成|建立)(?:了)?(?:共识|信任|同盟)|(?:两人|彼此|双方).{0,5}(?:和解|相爱|互信)/u;
const activeVerb = '(?:点头|摇头|答应|同意|拒绝|转身|抬起|低下|伸手|伸出|微笑|笑了|笑起来|露出.{0,4}笑容|接过|接住|递给|拿起|放下|握住|抱住|坐下|站起|起身|跟上|跟随|走向|走进|走到|离开|开口|说道|回答|问道|写下|扑向|跪下|服从)';
const room = '(?:走廊|会客厅|牢房|牢门|铁门|栅栏|审判庭|医务室|食堂|厨房|中庭|湖边|房间|门外|大门|出口)';
const mentalVerb = '(?:知道|意识到|明白|认定|相信|怀疑|盘算|打算|决定|想到|想起|回想起)';
const uncertain = /[「」“”"]|(?:声称|自称|谎称|据说|传闻|可能|也许|似乎|仿佛|好像|猜测|怀疑|担心|说过|写着|写道|字样|文字)/u;
const item = '(?:钥匙|证物|证据|物证|凶器|手机|纸条|纸页|纸张|笔记本|素描本|刀|匕首|箭|苹果|物品|道具)';
const rule = (id, pattern, predicate, anchors = []) => ({ id, pattern, predicate, anchors });
const effects = [
  rule('unlock', /(?:门锁|锁|铁门|牢门|大门|栅栏门).{0,8}(?:解锁|打开|开启|敞开|撬开)|(?:打开|开启|解开|撬开|推开|撞开|踢开)(?:了)?[^，。；\n]{0,6}(?:门锁|锁|铁门|牢门|大门|栅栏门)/u, /解锁|打开|开启|敞开|撬开|解开|推开|撞开|踢开/u),
  rule('lock', /(?:门锁|铁门|牢门|大门|栅栏门).{0,6}(?:重新|再次)(?:上锁|锁上)|(?:锁上|反锁)(?:了)?[^，。；\n]{0,5}(?:铁门|牢门|大门)/u, /上锁|锁上|反锁/u),
  rule('movement', new RegExp(`(?:走进|走到|进入|来到|抵达|离开|跨过|穿过|迈出|冲进|跑进|跟到)(?:了)?[^，。；\\n]{0,8}${room}`, 'u'), /走进|走到|进入|来到|抵达|离开|跨过|穿过|迈出|冲进|跑进|跟到/u, [new RegExp(room, 'u')]),
  rule('harm', /(?:打伤|砍伤|割伤|烧伤|击倒|打倒|掐住|扼住)(?:了)?|刺伤(?!的|地方|处|部位)|(?:折断|打断)(?:了)?.{0,6}(?:手臂|手腕|手指|脖子|骨头|腿)|(?:受伤(?!的)|骨折|昏迷|晕倒|失去意识|失去知觉|倒地不起)(?:了)?/u, /打伤|刺伤|砍伤|割伤|烧伤|击倒|打倒|掐住|扼住|折断|打断|受伤|骨折|昏迷|晕倒|失去意识|失去知觉|倒地不起/u, [/手臂|手腕|手指|脖子|喉咙|腿|头部/u]),
  rule('lethal-action', /(?:杀死|杀了|杀掉|刺死|掐死|勒死|砍死|烧死|夺走.{0,4}生命)/u, /杀死|杀了|杀掉|刺死|掐死|勒死|砍死|烧死|夺走/u),
  rule('death', /(?:死了|死亡|断了气|停止呼吸|失去生命|尸体)/u, /死了|死亡|断了气|停止呼吸|失去生命|尸体/u),
  rule('wound', /(?:出现|浮现|多出|添了|添上|留下|渗出|流出|涌出).{0,8}(?:伤口|伤痕|血迹|鲜血|血来)|(?:伤口|伤痕|血迹|鲜血).{0,12}(?:出现|裂开|流淌|蔓延|渗出|流出|涌出)|(?:开始|正在|不断|已经)(?:流血|出血)/u, /出现|浮现|多出|添了|添上|留下|渗出|流出|涌出|裂开|流淌|蔓延|开始|正在|不断|已经/u, [/伤口|伤痕|血迹|鲜血/u]),
  rule('healing', /(?:伤口|伤势|伤痛|骨折).{0,8}(?:愈合|痊愈|消失|治好|恢复)|(?:治愈|治好|痊愈|恢复健康)/u, /愈合|痊愈|消失|治好|恢复|治愈/u),
  rule('magic', /(?:发动|施展|使出|启动|使用).{0,8}(?:魔法|洗脑|催眠|超能力)|(?:瞬移|人格互换|交换人格)|(?:火焰|火苗).{0,6}(?:燃起|腾起|窜出)|(?:燃起|腾起|生出).{0,6}(?:火焰|火苗)/u, /发动|施展|使出|启动|使用|瞬移|人格互换|交换人格|燃起|腾起|窜出|生出/u),
  rule('compulsion', /(?:被迫|不由自主地|身不由己地|无法抗拒地|乖乖地).{0,8}(?:服从|照做|跪下|跟随|跟上|行动)|(?:所有人|众人|大家|对方|她|他).{0,5}(?:服从了|听从了|接受了命令)/u, /被迫|不由自主地|身不由己地|无法抗拒地|乖乖地|服从了|听从了|接受了命令/u),
  rule('transfer', new RegExp(`(?:把|将).{0,12}${item}.{0,8}(?:交给|递给|送给|塞给|塞进|放进|交到)|(?:拿到|得到|获得|捡起|取走|拿走|夺走|交给|递给|送给)(?:了)?[^，。；\\n]{0,8}${item}`, 'u'), /交给|递给|送给|塞给|塞进|放进|交到|拿到|得到|获得|捡起|取走|拿走|夺走/u, [new RegExp(item, 'u')]),
  rule('discovery', /(?:发现|找到|找出|看见|看清).{0,10}(?:新线索|隐藏出口|暗门|钥匙|凶器|血迹|尸体|秘密通道)/u, /发现|找到|找出|看见|看清/u, [/新线索|隐藏出口|暗门|钥匙|凶器|血迹|尸体|秘密通道/u]),
  rule('creation', new RegExp(`(?:多出|出现|浮现|凭空生出).{0,8}(?:${item}|暗门|隐藏出口|秘密通道)|(?:${item}|暗门|隐藏出口|秘密通道).{0,8}(?:凭空出现|突然出现)`, 'u'), /多出|出现|浮现|凭空生出/u),
  rule('arrival', /(?:看守|陌生人|新来的人|典狱长).{0,6}(?:走进|推门|进入|来到|出现)|(?:新的广播|广播).{0,5}(?:响起|开始|传来)/u, /走进|推门|进入|来到|出现|响起|开始|传来/u),
];

function nonactual(clause, index) {
  const before = clause.slice(0, index);
  return /(?:没有|并未|尚未|还没|还未|不曾|未曾|无法|不能|不会|不肯|不要|禁止|不得|不许|别|未|没|不|可以|能够|将会|将要|即将)(?:被|能|再|曾|已经|立刻|马上|真正|实际|成功|完全)*$/u.test(before)
    || /(?:尝试|试图|试着|想要|打算|准备|希望|请求|要求|命令).{0,8}$/u.test(before)
    || /^(?:如果|假如|倘若|要是|若是|等到|为了|以免|免得|防止|担心|害怕)/u.test(clause);
}
function hits(clause, entry) {
  const found = [];
  for (const match of clause.matchAll(new RegExp(entry.pattern.source, 'gu'))) {
    const predicateIndex = match[0].search(entry.predicate);
    if (!nonactual(clause, match.index + Math.max(0, predicateIndex))) found.push(match);
  }
  return found;
}
function names(label) {
  if (!label) return [];
  // Appearance labels are not names; never derive arbitrary two-character
  // identities from a long description. Short names may use their given name.
  return [...new Set([label, ...(/^[\p{Script=Han}]{3,6}$/u.test(label) && !/少女|来访者|看守/u.test(label)
    ? [label.slice(-2), ...(label.length === 5 ? [label.slice(-3)] : [])] : [])])];
}
function actorsFor(persona, participants = [], events = []) {
  const actors = [];
  const add = labels => {
    const aliases = [...new Set(labels.flatMap(names))];
    if (!aliases.length) return;
    const known = actors.find(actor => actor.aliases.some(alias => aliases.includes(alias)));
    if (known) known.aliases = [...new Set([...known.aliases, ...aliases])];
    else actors.push({ label: labels[0], aliases });
  };
  add([persona?.name]);
  participants.forEach(row => add([row.label, row.appearance]));
  events.forEach(row => add([row.speaker]));
  return actors;
}
function references(clause, actors) {
  return actors.filter(actor => actor.aliases.some(alias => clause.includes(alias))).map(actor => actor.label);
}
/** Host projections only: speech delivery proves a voice, never its claims. */
export function sceneDeliveryFacts(event, scene) {
  if (event.delivery !== 'speech') return [];
  return [`${event.speaker}开口说道。`,
    ...(event.speaker === '典狱长' && scene?.screenAvailable ? ['广播响起。'] : [])];
}
export function resolvedSceneFacts(before, after, events = []) {
  const facts = events.flatMap(event => sceneDeliveryFacts(event, before));
  // doorOpen is the host's unlocked/passable state, not a claim that someone
  // physically pushed a door, and never licenses another room's lock.
  if (before?.roomId === after?.roomId && before?.doorOpen !== after?.doorOpen) {
    if (after?.doorOpen === true) facts.push('牢门已经解锁。');
  }
  return [...new Set(facts)];
}
function sceneFacts(scene) {
  if (!scene) return [];
  return [scene.description, ...(scene.nearby || []).map(row => row.appearance),
    ...(scene.objects || []).map(row => `${row.placement}：${row.name}。`)].filter(value => typeof value === 'string');
}
const visibleFacts = observations => (observations || []).filter(row => row.channel === 'sight').map(row => row.text);
function evidenceRows(values) {
  return values.flatMap(value => clauses(value));
}
function supported(clause, entry, evidence, actors) {
  const candidate = normalized(clause);
  return evidence.some(fact => {
    if (uncertain.test(fact) || !hits(fact, entry).length) return false;
    // Whole fact/claim containment preserves its qualifiers and polarity. A
    // bare word such as "伤口" or "解锁" is never enough to license an effect.
    if (normalized(fact).includes(candidate)) return true;
    const targets = references(clause, actors);
    const sourceTargets = references(fact, actors);
    if (targets.length && (!sourceTargets.length || targets.some(target => !sourceTargets.includes(target)))) return false;
    if (sourceTargets.length && !targets.length) return false;
    if (entry.anchors.some(pattern => {
      const anchor = clause.match(pattern)?.[0];
      return anchor && !fact.includes(anchor);
    })) return false;
    // Small framing changes around the SAME assertion are permitted. Merely
    // sharing an effect category with a different fact does not ground prose.
    const kernel = candidate.replace(/^(?:我|你|她|他)(?:看见|看到|望见|看着|注视着?)/u, '')
      .replace(/仍然|依然|仍旧|已经|已然|终于|此刻|眼前|轻轻地|缓缓地/gu, '');
    const source = normalized(fact).replace(/仍然|依然|仍旧|已经|已然|终于|此刻|眼前|轻轻地|缓缓地/gu, '');
    return kernel.length >= 4 && source.includes(kernel);
  });
}
// Opt-in for newly owned actions/tasks only: old accepted prose must retain its
// historical validator. An open door and a move intention never settle a step.
const doorwayStep = rule('movement', /(?:把|将)?(?:一只|另一只|左|右|双)?脚(?:掌)?(?:(?:轻轻|缓缓|慢慢|小心)地?|才|已经|终于)*(?:踏|迈|跨)出去|(?:跨过|迈过|踏过|跨出|迈出|踏出|走出)(?:了)?[^，。；\n]{0,6}(?:门槛|牢门|铁门|栅栏门|房门)/u,
  /把|将|脚|跨过|迈过|踏过|跨出|迈出|踏出|走出/u);
const sensoryMover = /(?:目光|视线|光线|灯光|光影|月光|阳光|光|回声|声音|声波|余音|话音|脚步声|风声|风|气流|气息)(?:已经|正在|缓缓|慢慢|轻轻|随即|径直|已|正|才|又|还|地|也|便|就)*$/u;
function sensoryMovement(clause, match, actors) {
  const owner = new RegExp(`(?:${['我', '你', '她', '他', '对方', ...actors.flatMap(actor => actor.aliases)].map(escape).join('|')})的`, 'gu');
  const subject = clause.slice(0, match.index).replace(/^.*(?:看见|看到|看着|望见|望着|听见|听到)/u, '').replace(owner, '');
  return sensoryMover.test(subject) && !references(subject, actors).length
    && !/(?:我|你|她|他|对方|有人|众人|看守|典狱长|少女)/u.test(subject);
}
function doorwayOrigins(scene) {
  const places = [scene?.location];
  if (/牢房/u.test(text(scene?.location)) || /^(?:cell\d*|playercell)$/u.test(text(scene?.roomId))) places.push('牢房');
  return [...new Set(places.filter(place => typeof place === 'string' && place))];
}
function checkDoorwayMovement(value, evidence, actors, { scene, departed = [], arrived = [] } = {}) {
  const origins = doorwayOrigins(scene);
  const backdrop = origins.length ? rule('movement', new RegExp(`身后(?:的)?(?:${origins.map(escape).sort((a, b) => b.length - a.length).join('|')})[^，。；\\n]{0,8}退(?:成|入)(?:了)?(?:一片|一团)?(?:暗|阴影|黑暗)`, 'u'), /退成|退入/u) : null;
  for (const clause of clauses(value)) for (const entry of [doorwayStep, ...(backdrop ? [backdrop] : [])]) {
    for (const match of hits(clause, entry)) {
      // Scope sensory exceptions to this predicate's subject, never the whole
      // paragraph: light crossing a threshold cannot excuse a later human step.
      if (entry === doorwayStep && sensoryMovement(clause, match, actors)) continue;
      const places = [...clause.matchAll(/走廊|会客厅|牢房|审判庭|医务室|食堂|厨房|中庭|湖边|房间/gu)].map(row => row[0]);
      if (departed.length && arrived.length && !references(clause, actors).length
        && !/(?:她|他|对方|有人|众人|其他人|看守|典狱长|少女)/u.test(clause)
        && places.every(place => [...origins, ...arrived].some(known => known.includes(place)))) continue;
      if (!supported(clause, entry, evidence, actors)) fail('movement');
    }
  }
}
// The adjectival result belongs to the observed door, not the player's verb.
// Require both the selected first-person gaze and current, delivered lock facts.
// Procedure can replace doorOpen with its own access projection; those phases
// are not evidence about this lock, and permission alone never proves it.
const observedUnlockedCellDoor = /^我(?:看了看|看向|望向|望了望|扫了一眼|瞥了一眼|注视着)(?:眼前(?:的)?)?(?:已经|已然|已)解(?:开|锁)的(?:牢门|铁栅栏门|栅栏门)$/u;
const localDoorResult = rule('unlock', /(?:把|将)(?:眼前(?:的)?)?(?:牢门|铁栅栏门|栅栏门|门锁|铁门|它)(?:已|已经|用力|轻轻|一下子|亲手|给|顺手|随手)*(?:推开|打开|撞开|踢开|撬开|解开|解锁)|(?:牢门|铁栅栏门|栅栏门|铁门|门锁)被[^，。；]{0,10}(?:推开|打开|撞开|踢开|撬开|解开|解锁)|(?:看了看|看向|望向|望了望|扫了一眼|瞥了一眼|注视着)(?:眼前(?:的)?)?(?:已经|已然|已)(?:推开|打开|敞开|开启)的(?:牢门|铁栅栏门|栅栏门)/u, /推开|打开|撞开|踢开|撬开|解开|解锁|敞开|开启/u);
const contradictedGaze = /(?:看了看|看向|望向|望了望|扫了一眼|瞥了一眼|注视着)(?:眼前(?:的)?)?(?:尚未|还没|并未|未|没有|没)(?:解锁|解开)的(?:牢门|铁栅栏门|栅栏门)/u;
const assertedDoorPermission = rule('unlock', /(?:获准|被允许|得到许可|有权|准许)(?:了)?(?:从这(?:扇门|里)|经(?:过)?(?:牢门|门口|这里))?(?:通行|出门|出去|去走廊|前往走廊)/u, /获准|被允许|得到许可|有权|准许/u);
function checkEffects(value, evidence, actors, { doorOpen, departed = [], arrived = [], scene, movementGuardVersion, selectedDoorGaze = false } = {}) {
  if (movementGuardVersion !== undefined && movementGuardVersion !== 1) fail();
  if (movementGuardVersion === 1) checkDoorwayMovement(value, evidence, actors, { scene, departed, arrived });
  for (const clause of clauses(value)) for (const entry of effects) {
    if (entry.id === 'unlock' && selectedDoorGaze) {
      if (doorOpen === true && scene.adjacent?.some(edge => edge.id === 'corridor')
        && /^(?:cell\d*|playercell)$/u.test(scene.roomId) && [undefined, 'daily', 'discovery', 'aftermath'].includes(scene.case?.stage)) {
        if (observedUnlockedCellDoor.test(clause)) continue;
        if (contradictedGaze.test(clause)) fail('unlock');
      }
      if (hits(clause, localDoorResult).length
        || !scene?.permittedDestinations?.includes('corridor') && hits(clause, assertedDoorPermission).length) fail('unlock');
    }
    const matches = hits(clause, entry);
    if (!matches.length) continue;
    if (entry.id === 'movement') {
      if (movementGuardVersion === 1 && matches.every(match => sensoryMovement(clause, match, actors))) continue;
      if (/(?:目光|视线|光线|光影|回声|声音|声波|余音|话音|脚步声|风声|气息|时间|时刻|指针|分针).{0,12}(?:穿过|进入|来到|跨过|走过)/u.test(clause)
        || /(?:穿过|进入|来到|跨过)[^，。；\n]{0,8}(?:间隙|缝隙|空隙|时段|时间|时刻)/u.test(clause)
        || /(?:走向|通向|通往|连向|连接).{0,6}(?:走廊|会客厅|牢房|审判庭|医务室|食堂|厨房|中庭|湖边|门外|出口)[^，。；\n]{0,6}(?:方向|通路|过道|通道|阶梯|楼梯)/u.test(clause)
        || /(?:走出|离开|迈出|跨出)(?:了|过的|的)?[^，。；\n]{0,8}(?:牢房|房间|会客厅|走廊).{0,8}(?:就在|位于|退到|留在)(?:身侧|身后|一旁|背后)/u.test(clause)) continue;
      if (!references(clause, actors).length && !/(?:她|他|对方|有人|众人|其他人|看守|典狱长|少女)/u.test(clause)) {
        if (arrived.some(place => place && clause.includes(place) && /(?:来到|走入|走进|踏入|进入|抵达|置身|走到)/u.test(clause))) continue;
        if (departed.some(place => place && clause.includes(place) && /(?:走出|离开|迈出|跨出|跨过|穿过)/u.test(clause))) continue;
      }
    }
    if (entry.id === 'arrival' && evidence.some(fact => /广播响起/u.test(fact))
      && !/(?:看守|陌生人|新来的人)/u.test(clause) && /广播/u.test(clause)) continue;
    // A host boolean establishes the current lock state, not a character's
    // successful unlocking action, nor any other door/object's changed state.
    if (entry.id === 'unlock' && doorOpen === true
      && !references(clause, actors).length
      && !/(?:我|你|她|他|对方|有人|众人|看守|典狱长)/u.test(clause)
      && !/(?:撬开|撞开|踢开|推开)/u.test(clause)
      && /(?:电子锁|门锁|锁|铁门|牢门|铁栅栏门|栅栏门)/u.test(clause)) continue;
    if (!supported(clause, entry, evidence, actors)) fail(entry.id);
  }
}
function checkGuardCapture(value, version) {
  if (version === undefined) return;
  if (version !== 1) fail('guard-capture');
  // In this extension, capture/escape consequences are separate host dice
  // actions. Ordinary model prose may build the threat, never settle it early.
  const entry = rule('guard-capture', /(?:看守|守卫).{0,12}(?:抓住|抓到|逮住|捕获|押入|押进|带走|制服)|(?:我|你).{0,6}(?:被抓|被捕|遭到逮捕)|(?:押入|押进|带进|关进).{0,6}惩罚室/u,
    /抓住|抓到|逮住|捕获|押入|押进|带走|制服|被抓|被捕|遭到逮捕|带进|关进/u);
  for (const clause of clauses(value)) {
    if (/(?:担心|害怕|以免|防止|唯恐).{0,8}(?:被抓|被捕|抓住|带走|押入|押进)/u.test(clause)) continue;
    if (hits(clause, entry).length) fail(entry.id);
  }
}
function checkPrivate(value, participants = [], { allowPlayerSelf = false } = {}) {
  const prose = text(value);
  if (!allowPlayerSelf) {
    if (privateReasoning.test(prose)) fail('private-reasoning');
    return;
  }
  if (otherPrivateReasoning.test(prose)) fail('private-reasoning');
  const otherNames = [...new Set(participants.flatMap(row => [...names(row.label), ...names(row.appearance)]))];
  for (const clause of clauses(prose)) {
    if (!privateReasoning.test(clause)) continue;
    if (otherNames.some(alias => clause.includes(alias)) || /(?:她|他|对方|其他人|众人)/u.test(clause)) fail('private-reasoning');
  }
}
function checkMinds(value, participants, { scene = false } = {}) {
  const subjects = [...new Set([...participants.flatMap(row => names(row.label)), '对方', '其他人', '众人',
    ...(scene ? ['她', '他', '两人', '彼此'] : [])])];
  const pattern = new RegExp(`(?:^|却|而|于是)(${subjects.map(escape).sort((a, b) => b.length - a.length).join('|')})(?:都|已|已经|终于|也|便|就|仍|仍然|其实|很|十分|非常)*(?:${mentalVerb}|感到(?:恐惧|害怕|安心|悲伤)|充满(?:恐惧|敌意))`, 'u');
  for (const clause of clauses(value)) if (pattern.test(clause)) fail('private-mind');
}
function checkCommitments(value, rawInput) {
  for (const clause of clauses(value)) {
    const match = commitment.exec(clause);
    if (!match || nonactual(clause, match.index)) continue;
    const claim = normalized(clause).replace(/^(?:我|吾辈|本小姐)/u, '');
    // Literal speech is handled separately; unquoted expansion may express a
    // chosen promise but cannot add a new promise just because one was named.
    if (!clauses(rawInput).some(raw => !nonactual(raw, raw.search(commitment))
      && normalized(raw).includes(claim))) fail();
  }
}
function checkOtherActions(value, participants, evidence, actors, ownName, { player = false, scene = false } = {}) {
  const others = participants.flatMap(row => [...names(row.label), ...names(row.appearance)])
    .filter(label => label && !names(ownName).includes(label));
  const subjects = [...new Set([...others, '对方', '其他人', '所有人', '众人', '大家', '她们',
    ...(scene ? ['我', '你', '她', '他'] : player ? (/我/u.test(text(value)) ? ['她', '他'] : []) : ['你', '来访者', '眼前的人'])])];
  const pattern = new RegExp(`(?:^|随后|于是|而|让|使|逼得|迫使|带着)(${subjects.map(escape).sort((a, b) => b.length - a.length).join('|')})(?:也|便|就|随即|立刻|马上|已经|终于|向我|对我|被迫|跟着我|和我一起|都|们|轻轻|缓缓|慢慢|了|地|一同)*${activeVerb}`, 'u');
  for (const clause of clauses(value)) {
    const match = pattern.exec(clause);
    if (!match) continue;
    const entry = rule('other-action', pattern, new RegExp(activeVerb, 'u'));
    if (!nonactual(clause, match.index + match[0].search(new RegExp(activeVerb, 'u')))
      && !supported(clause, entry, evidence, actors)) fail('other-action');
  }
  if (!player && !scene) {
    const forced = rule('forced-action', /(?:她|他)(?:被迫|不由自主地|乖乖地)(?:点头|转身|跟上|跟随|服从|跪下)/u, /被迫|不由自主地|乖乖地/u);
    for (const clause of clauses(value)) if (hits(clause, forced).length && !supported(clause, forced, evidence, actors)) fail();
  }
}

const choiceFail = () => {
  const error = Object.assign(new Error('叙事任务数据或结果不符合受限执行契约。'), { code: 'INVALID_NARRATIVE_OUTPUT' });
  DIAGNOSTICS.set(error, Object.freeze({ rule: 'player-choice' }));
  throw error;
};
const speechChoice = /(?:说|說|问|問|询问|詢問|告诉|告訴|回答|回应|回應|开口|開口|表示|解释|解釋|提出|提议|提議|保证|保證|承诺|承諾|道歉|拒绝|拒絕|(?:打个?|打個?)?招呼|问好|問好|笔谈|筆談|书写|書寫|写下|寫下)/u;
const questionChoice = /(?:问|問|询问|詢問|提问|提問|追问|追問|请教|請教|打听|打聽|哪里|哪裡|哪儿|哪兒|什么|什麼|为何|為何|为什么|為什麼|怎么|怎麼|如何|是否|[吗嗎么麼？?])/u;
const questionText = /(?:哪里|哪裡|哪儿|哪兒|什么|什麼|为何|為何|为什么|為什麼|怎么|怎麼|如何|是否|[吗嗎么麼？?])/u;
const socialChoice = /(?:原谅|原諒|信任|和解|认罪|認罪|效忠|背叛)/gu;
const negativeChoice = /(?:不|别|別|不要|没有|沒有|并未|並未|尚未|不能|无法|無法|拒绝|拒絕)(?:再|会|會|能|想|打算|愿意|願意|肯|完全|真的|真正|轻易|輕易)*$/u;
const performanceClauses = value => value.split(/[，,。；;！!？?\n]+/u).map(row => row.trim()).filter(Boolean);
const speechBody = value => value.trim().replace(/^「([\s\S]*)」$/u, '$1').trim();
const silentChoice = /(?:心里|心裡|心中|内心|內心|心想|暗想|默默|保持沉默|不(?:想|打算|愿意|願意)?(?:说话|說話|开口|開口))/u;
const ordinarySpeechIntents = new Set(['act', 'broadcast', 'conversation', 'follow', 'look', 'move', 'read', 'wait']);
export const supportsPlayerSpeech = intent => ordinarySpeechIntents.has(intent?.type) && intent.operation === undefined;
const spokenFrame = /^(?:(?:我|并|並|然后|然後|接着|接著|随后|隨後|同时|同時|转头|轉頭|低声|低聲|小声|小聲|轻声|輕聲|笑着|笑著)\s*)*(?:(?:对|對|向|跟)\s*(.{1,128}?)\s*)?(?:说(?:道|了句)?|說(?:道|了句)?|问(?:道)?|問(?:道)?|询问|詢問|回答|回应|回應)$/u;
const questionFrame = /^(?:(?:我|并|並|然后|然後|接着|接著)\s*)*(?:问|問|询问|詢問)\s*(.{1,128})$/u;
const followFrame = /^(?:我\s*)?(?:跟上|跟着|跟著|跟随|跟隨)\s*(.{1,128}?)\s*(?:一起走|一同走|同行)?[，,]\s*$/u;
const nonCurrentSpeech = /(?:^|[，,；;。！？!?\n])\s*(?:我\s*)?(?:如果|若(?:是)?|假如|假设|假設|要是|等到|待到|等[^，,；;。！？!?\n]{1,40}(?:之后|之後|以后|以後|来了|來了|离开|離開|点头|點頭)(?=[，,；;。！？!?\n]|$)|除非|只有|回想|想起|记得|記得|之前曾|以前曾)/u;
function speechRecipient(nearby, targetId, reference) {
  const name = reference?.trim();
  const matches = !name || /^(?:她|他|对方|對方|你)$/u.test(name)
    ? (targetId === undefined ? nearby : nearby.filter(row => row.id === targetId))
    : nearby.filter(({ label }) => label === name || typeof label === 'string'
      && /^[\p{Script=Han}]{2,4}$/u.test(name) && /^[\p{Script=Han}]+$/u.test(label) && label.endsWith(name));
  return matches.length === 1 && (targetId === undefined || matches[0].id === targetId) ? matches[0].id : undefined;
}
// Player words are an input slice, never generated by the performance model.
// The same host selection serves normal output, fallback and final validation.
export function chosenPlayerSpeech(data) {
  const { contractVersion, rawInput, intent, scene, statementReaction, communication } = data;
  if (contractVersion !== 4 || !supportsPlayerSpeech(intent) || statementReaction
    || typeof rawInput !== 'string' || !Array.isArray(scene?.nearby)) return undefined;
  const bound = chosenCommunicationText(data);
  if (typeof bound === 'string' && bound.trim() && bound.length <= 1400) return { text: bound,
    actionSource: data.communicationSelection?.form === 'current-turn-quote@1'
      ? rawInput.slice(0, data.communicationSelection.start - 1).trimEnd() : '' };
  const raw = rawInput.trim();
  const spans = quoteSpans(raw);
  const last = spans.at(-1);
  const terminal = spans.length === 1 && /^[\s。.!！]*$/u.test(raw.slice(last.end));
  const delivery = terminal ? { prefix: raw.slice(0, last.start), text: raw.slice(last.start + 1, last.end - 1) }
    : !spans.length && /^([^：:]+)[：:][ \t]*(\S[\s\S]*)$/u.exec(raw);
  if (!delivery) return undefined;
  const prefix = delivery.prefix ?? delivery[1];
  const literal = delivery.text ?? delivery[2];
  if (!literal.trim() || literal.length > 1400 || /[<>\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(literal)
    || !terminal && /[「」『』“”"]/u.test(literal)) return undefined;
  const outside = withoutQuotes(prefix).trim();
  const clause = outside.replace(/[：:]\s*$/u, '').split(/[，,；;。！？!?\n]/u).at(-1).trim();
  // Spoken grammar is positive and current. A title, recollection, private
  // thought, negated/conditional delivery, or a different action target cannot grant speech.
  if (nonCurrentSpeech.test(outside) || silentChoice.test(clause)) return undefined;
  const frame = spokenFrame.exec(clause) ?? questionFrame.exec(clause);
  const shorthand = terminal && intent.type === 'follow' ? followFrame.exec(outside) : null;
  if (!frame && !shorthand && !(terminal && !outside && intent.type === 'conversation')) return undefined;
  const targetId = speechRecipient(scene.nearby, intent.targetId, frame?.[1] ?? shorthand?.[1]);
  if (targetId === undefined || communication === 'writing' && intent.targetId === undefined) return undefined;
  return { text: literal, actionSource: prefix };
}
const performanceActionSource = (raw, selection) => selection?.actionSource ?? raw.replace(/「[^」]*」/gu, '');
function speechSurface(value) {
  if (typeof value !== 'string') return '';
  const body = value.trim(); const spans = quoteSpans(body);
  return spans.length === 1 && spans[0].start === 0 && spans[0].end === body.length ? body.slice(1, -1) : body;
}
const speechQuestion = body => /[？?]\s*$/u.test(body) || /[吗嗎么麼呢][。.!！\s]*$/u.test(body);
function speechStyleKey(body) {
  // Only cadence, courtesy and near-equivalent address phrasing. Preserve
  // internal clause order and punctuation, names, polarity and commitments.
  return body.replace(/^(?:嗯|唔|呃)[，,、][ \t]*/u, '').replace(/[。.!！?？]+$/u, '')
    .replaceAll('，', ',')
    .replace(/(?:这样|這樣|这么|這麼)(?:叫|称呼|稱呼)(?:你|您)(?=,?(?:可以[吗嗎]|行[吗嗎]|好[吗嗎]))/gu, '这么称呼你')
    .replaceAll('您', '你');
}
export function playerSpeechFits(source, rendered, addressVoice) {
  if (typeof source !== 'string' || typeof rendered !== 'string') return false;
  if (source === rendered) return true;
  const body = speechSurface(rendered);
  if (!body || /[「」『』“”"<>\n\r]/u.test(source + body) || speechQuestion(source) !== speechQuestion(body)) return false;
  return speechStyleKey(playerAddressKey(source, addressVoice)) === speechStyleKey(playerAddressKey(body, addressVoice));
}
export function renderPlayerSpeech(selection, candidate, addressVoice) {
  if (!playerSpeechFits(selection.text, candidate, addressVoice)) return selection.text;
  return candidate === selection.text ? candidate : speechSurface(candidate);
}
function chosenCommunication(raw, { allowIntroduction = false } = {}) {
  return performanceClauses(raw).flatMap(clause => {
    if (silentChoice.test(clause)) return [];
    const speech = [...clause.matchAll(new RegExp(speechChoice.source, 'gu'))]
      .some(match => !negativeChoice.test(clause.slice(0, match.index)));
    if (speech) return [clause];
    if (allowIntroduction) {
      const intro = /(?:自我介绍|自我介紹|介绍(?:一下)?自己|介紹(?:一下)?自己)/u.exec(clause);
      if (intro && !negativeChoice.test(clause.slice(0, intro.index))) return [clause];
    }
    // A direct question is speech; a private interrogative grants no voice.
    const indirect = /^(?:我(?:正|在|先|只是|只|想)*|先)?(?:观察|觀察|看|望|等|走|前往|移动|移動|思考|思索|想想|想知道|调查|調查|检查|檢查)/u.test(clause);
    return !indirect && !speechChoice.test(clause) && questionText.test(clause) ? [clause] : [];
  });
}
function readingTitleQuoteCheck(data, action) {
  if (data.intent?.type !== 'read' || !Array.isArray(data.scene?.readable)) return action;
  const selected = data.scene.readable.filter(row => row.id === data.intent.subjectId);
  if (selected.length !== 1 || typeof selected[0].name !== 'string' || !selected[0].name
    || /[「」『』“”"]/u.test(selected[0].name)) return action;
  const material = selected[0];
  // The title exception grants no voice, including a read-aloud clause after
  // the label. Preserve negated and merely contemplated vocalization.
  for (const clause of clauses(action)) for (const match of clause.matchAll(/朗读|朗讀|诵读|誦讀|读出|讀出|念出|念给|念給|读给|讀給/gu)) {
    if (!nonactual(clause, match.index)) return action;
  }
  const reading = /^(?:阅读|閱讀|查阅|查閱)\s*(.+?)[。！!]?$/u.exec(text(data.rawInput).trim());
  if (!reading || ![material.name, material.id, material.name.replace(/的图鉴资料$/u, '')].includes(reading[1])) return action;
  const pair = new RegExp(`(?:「${escape(material.name)}」|『${escape(material.name)}』|“${escape(material.name)}”|"${escape(material.name)}")`, 'gu');
  // This scratch string is used ONLY for the quote prohibition. Never rewrite
  // the candidate or remove title text from agency/world-effect validation.
  return action.replace(pair, (quoted, offset) => {
    const prefix = action.slice(0, offset).split(/[，,。；;！!？?\n]/u).at(-1);
    const suffix = action.slice(offset + quoted.length);
    const sentencePrefix = action.slice(0, offset).split(/[。；;！!？?\n]/u).at(-1);
    if (/(?:说|說|问|問|念|唤|喚|喊|叫|告诉|告訴|回答|回应|回應|解释|解釋|保证|保證|承诺|承諾|写下|寫下|读出|讀出|朗读|朗讀|诵读|誦讀)/u.test(sentencePrefix)) return quoted;
    const label = /^(?:的)?(?:(?:这|這|那)(?:一)?|一)?(?:栏|欄|条目|條目|页面|頁面|页|頁|标题|標題|资料|資料|按钮|按鈕|选项|選項|字样|字樣)/u.test(suffix);
    const navigation = /(?:点开|點開|打开|打開|选中|選中|选择|選擇|找到|翻到|调出|調出|查看|看向|看着|看著|目光落在|视线落在|視線落在|阅读|閱讀|查阅|查閱|手机里的|手機裡的|手机中的|手機中的)\s*$/u.test(prefix)
      || (/(?:把|将|將)\s*$/u.test(prefix) && label && /^(?:的)?(?:(?:这|這|那)(?:一)?|一)?(?:栏|欄|条目|條目|页面|頁面|页|頁)[^，,。；;！!？?\n]{0,4}(?:调出|調出|打开|打開|翻开|翻開)/u.test(suffix));
    const explicitScreenAction = /(?:手机|手機|屏幕|螢幕)[^，,。；;！!？?\n]{0,16}(?:点开|點開|打开|打開|选中|選中|找到|翻到|调出|調出)\s*$/u.test(prefix);
    return navigation && (label || explicitScreenAction) ? material.name : quoted;
  });
}
/** Choice, not truth: an explicit utterance remains a claim, including a lie.
 * This screen runs after the schema validator; intent summaries/persona never
 * grant an extra question, social decision, or voice during a silent action. */
export function assertObservablePlayerAction(action) {
  if (privateReasoning.test(action)
    || /(?:我|吾辈|吾輩|本小姐)(?:仍|还|還|却|卻|只|也|已经|已經|早就|终于|終於)?(?:知道|意识到|意識到|明白|认定|認定|相信|怀疑|懷疑|盘算|盤算|打算|想到|想起|记得|記得|觉得|覺得|认为|認為|思索|思考|琢磨)|(?:心里|心裡|心中|内心|內心|脑海|腦海)|暗自|默念/u.test(action)) fail('private-action');
  return action;
}

export function assertChosenPerformance(data, output) {
  const raw = data.rawInput || ''; const quoted = /「[^」]*」/u.test(raw);
  const current = isCommunicationRuntime(data.initialRunPolicy), selectedText = current ? chosenCommunicationText(data) : null;
  const selection = chosenPlayerSpeech(data);
  const selectedPlayerSpeech = selection !== undefined && (output.utterance === selection.text
    || data.playerSpeechVoiceVersion === 1 && playerSpeechFits(selection.text, output.utterance, quoted ? undefined : data.addressVoice));
  if (current && output.utterance && !selectedPlayerSpeech && (!selectedText || speechBody(output.utterance) !== selectedText)) choiceFail();
  const utterance = output.utterance || ''; const chosen = chosenCommunication(raw,
    { allowIntroduction: data.performancePolicy?.version === 1 });
  if (utterance && !quoted && !current && !selectedPlayerSpeech) {
    if (!chosen.length) choiceFail();
    if (typeof data.intent?.playerText === 'string') {
      if (speechBody(utterance) !== speechBody(data.intent.playerText)) choiceFail();
    } else {
      const questions = performanceClauses(utterance).filter(row => questionText.test(row)).length;
      const chosenQuestions = chosen.filter(row => questionChoice.test(row)).length;
      if (questions > chosenQuestions) choiceFail();
    }
  }
  if (data.performanceVersion === 2) assertObservablePlayerAction(output.action);
  // Inlined dialogue would otherwise be stored as a witnessed gesture.
  if (/[「」『』“”"]/u.test(readingTitleQuoteCheck(data, output.action))) choiceFail();
  const actionSpeech = /(?:我|你|吾辈|吾輩|本小姐)(?:又|还|還|接着|接著|随后|隨後|低声|低聲|轻声|輕聲|向.{1,16}?|对.{1,16}?|對.{1,16}?)*(?:说[道出]?|說[道出]?|问(?:道|起)?|問(?:道|起)?|询问|詢問|追问|追問|回答|回应|回應|告诉|告訴|写下|寫下|补充|補充)[：:，,]?([^，,。；;！!？?\n]*)/gu;
  for (const match of output.action.matchAll(actionSpeech)) {
    if (current ? !selectedText : !quoted && !chosen.length) choiceFail();
    const content = match[1].trim().replace(/^(?:了|着|著)/u, '');
    if (content && !/^(?:一行字|几个字|幾個字|文字|这句话|這句話|这一句|這一句|话|話)$/u.test(content)) choiceFail();
  }
  for (const [value, authorized] of [[output.action, performanceActionSource(raw, selection)], ...(!quoted && !selectedPlayerSpeech ? [[utterance, raw]] : [])]) {
    for (const match of value.matchAll(socialChoice)) {
      const negative = negativeChoice.test(value.slice(0, match.index));
      const choices = [...authorized.matchAll(new RegExp(match[0], 'gu'))];
      if (!choices.some(choice => negativeChoice.test(authorized.slice(0, choice.index)) === negative)) choiceFail();
    }
  }
  if (/(?:我|吾辈|吾輩|本小姐)(?:终于|終於|已经|已經|忽然|突然|现在|現在|这才|這才)(?:知道|明白|认出|認出|想起|记起|記起)/u.test(output.action)) choiceFail();
  return output;
}

const quotePairs = new Map([['「', '」'], ['『', '』'], ['“', '”'], ['"', '"']]);
function quoteSpans(value) {
  const stack = []; const spans = []; let start = -1;
  for (let index = 0; index < value.length; index++) {
    const char = value[index];
    if (stack.length && char === stack.at(-1)) {
      stack.pop();
      if (!stack.length) spans.push({ start, end: index + 1 });
    } else if (quotePairs.has(char)) {
      if (!stack.length) start = index;
      stack.push(quotePairs.get(char));
    }
  }
  // Unbalanced quotes cannot turn the rest of a generated line into exempt text.
  return spans;
}
function withoutQuotes(value) {
  const spans = quoteSpans(value); let result = ''; let cursor = 0;
  for (const span of spans) { result += value.slice(cursor, span.start) + ' '; cursor = span.end; }
  return result + value.slice(cursor);
}
function ownUtterance(value) {
  const prose = text(value); const spans = quoteSpans(prose);
  const outside = withoutQuotes(prose);
  // A whole utterance's dialogue marks delimit the actor's OWN speech/writing.
  // Only inner quotation is exempt. A quoted term inside a sentence stays a
  // quotation, never an instruction to rewrite the other speaker's pronouns.
  if (spans.length && /^[\s，,。；;：:、…—！？!?]*$/u.test(outside)) {
    return spans.map(span => withoutQuotes(prose.slice(span.start + 1, span.end - 1))).join('\n');
  }
  return outside;
}
export const invalidUtteranceAddress = (actorId, voice, utterance) => hasInvalidAddress(actorId, voice, ownUtterance(utterance));
export const hasNoncanonicalSelfReference = value => /(?:^|[^自忘无無])我/u.test(ownUtterance(value));
const firstPersonAction = /(?:^|[，,。；;：:！!？?\s])(?:(?:随后|接着|然后|于是|随即|此时|这时|最后|同时|而|但|才|便|又|只|也|仍|还|先)\s*)*(?:我(?:们)?|吾辈|吾輩|本小姐|咱们|咱)(?=的|把|将|將|朝|向|在|从|從|对|對|用|以|伸|收|抬|低|垂|歪|偏|转|轉|停|坐|站|起|退|挪|走|看|望|抱|扶|捏|握|点|點|摇|搖|笑|眨|蹭|换|換|摸|拢|攏|拉|压|壓|松|鬆|合|翻|写|寫|落|举|舉|抿|闭|閉|睁|睜|皱|皺|忍|吸|呼|掏|拨|撥|掀|支|倚|靠|端|拎|托|绕|繞|眯|轻|輕|缓|緩|慢|微|不|没|沒|并|並|正|已|仍|还|還|先|才|便|就|又|也|只|\s)/u;
const appearanceItems = /(?:贝雷帽|侦探帽|飞行员帽|王冠|口罩|斗篷|披风|臂章|耳机|护目镜|羽扇|铁球|镣铐|刺剑|素描本|画笔|钢笔)/gu;
function checkForeignAppearance(value, persona, participants, { player = false } = {}) {
  // Reject only explicit ownership of a distinctive delivered OTHER-person item
  // absent from the owner's delivered persona. Mere observation/quotation and
  // generic fabric, sleeves, hands or a shared garment do not establish theft.
  if (!text(persona?.appearance).trim()) return;
  const ownFacts = [persona?.name, persona?.appearance, persona?.voice,
    ...(Array.isArray(persona?.values) ? persona.values : [persona?.values]),
    ...(Array.isArray(persona?.boundaries) ? persona.boundaries : [persona?.boundaries])].map(text).join('\n');
  const ownAliases = names(persona?.name);
  const others = participants.filter(row => !ownAliases.includes(row.label));
  const foreign = [...new Set(others.flatMap(row => [...text(row.appearance).matchAll(appearanceItems)].map(match => match[0])))];
  const owner = [player ? '我' : '她', ...(player ? [] : ['他']), ...ownAliases].map(escape).join('|');
  for (const token of foreign) {
    if (ownFacts.includes(token)) continue;
    const ownership = new RegExp(`^(?:${owner})(?:自己)?(?:的|身上(?:的)?|头上(?:的)?|手中(?:的)?|怀里(?:的)?|腰间(?:的)?)${escape(token)}|^(?:${owner})(?:把|将)${escape(token)}(?:换回|戴回|收回|收进|插回)|^(?:${owner})(?:戴着|戴上|身穿|穿着|披着|握着|抱着|手持|握紧)${escape(token)}`, 'u');
    for (const clause of clauses(withoutQuotes(text(value)))) {
      // Looking at another person/item is not an ownership assertion. With
      // multiple named subjects/pronouns the attribution is too ambiguous.
      if (/(?:看向|望向|看着|看见|看到|注视|打量|观察)/u.test(clause)
        || others.some(row => names(row.label).some(alias => clause.includes(alias)))) continue;
      const match = ownership.exec(clause);
      if (match && !nonactual(clause, match.index)) fail('foreign-appearance');
    }
  }
}

const authoredFemaleReferents = (() => {
  const names = new Set();
  try {
    const card = JSON.parse(readFileSync(new URL('../../data/card-source.json', import.meta.url), 'utf8'));
    for (const [name, ref] of Object.entries(selectMagicSources(card))) {
      const match = /^\/data\/character_book\/entries\/(\d+)\/content$/u.exec(ref?.pointer || '');
      const content = match ? card.data?.character_book?.entries?.[Number(match[1])]?.content : '';
      if (typeof content === 'string' && /她/u.test(content) && !/他/u.test(content)) names.add(name);
    }
  } catch { /* A missing card leaves referent gender unsupported. */ }
  return names;
})();

/** Additive presentation-only screen shared by host and gateway. This is not
 * universal NLP: only clear NPC self-action and explicit foreign ownership are
 * rejected. No transformation, inferred speech choice or world mutation. */
export function assertPerformancePolicy({ performancePolicy, output, player = false, rawInput = '', persona, participants = [], addressVoice } = {}) {
  if (performancePolicy === undefined) return output;
  let policy;
  try { policy = validatePerformancePolicy(performancePolicy, { player }); } catch { fail('performance-policy'); }
  if (!output || typeof output !== 'object') fail('performance-policy');
  if (!player && firstPersonAction.test(ownUtterance(output.action))) fail('npc-action-person');
  if (!player && policy.actionLabel && names(persona?.name).some(alias => alias && ownUtterance(output.action).includes(alias))) fail('unknown-action-name');
  if (!addressVoice && policy.selfReference && !(player && /「[^」]*」/u.test(rawInput))
    && hasNoncanonicalSelfReference(output.utterance)) fail('self-reference');
  checkForeignAppearance(output.action, persona, participants, { player });
  if (player && participants.length && participants.every(row => authoredFemaleReferents.has(row.label))
    && /(?:^|[，,。；;！!？?\s])他(?:的|把|将|在|从|朝|向)/u.test(withoutQuotes(text(output.action)))) fail('referent-gender');
  return output;
}

// Deliberately narrow opt-in checks for clear invented ambient state. This is
// not a semantic completeness claim: unknown metaphors and new object classes
// still require qualitative review. Speech/reflection/previous prose are never
// evidence, and a static fixture does not establish its active state.
const ambientClaims = [
  /(?:壁炉|炉膛|炉火)[^，。；\n]{0,12}(?:燃烧|燃着|烧着|火焰|火光|火苗|暖意|热气|噼啪)/u,
  /(?:屏幕|显示屏)[^，。；\n]{0,8}(?:亮着|亮起|亮了|发亮|发光|黑着|漆黑|熄灭|暗了|关闭)/u,
  /(?:我|自己)[^，。；\n]{0,8}(?:睡了|睡过|躺了|熬了)(?:整整)?(?:一夜|整夜|一个晚上)/u,
  /(?:肩背|腰背|双腿|身体)[^，。；\n]{0,6}(?:发僵|僵硬|酸痛|疲惫不堪)/u,
  /(?:我|自己)[^，。；\n]{0,8}(?:拿起|取出|掏出|摸出|点燃)(?:了)?(?:一支|一张|一把|一盏)?(?:纸笔|铅笔|蜡烛|手电筒|钥匙)/u,
];
function checkAmbientContinuity(value, evidence, version) {
  if (version === undefined) return;
  if (version !== 1) fail();
  for (const clause of clauses(value)) for (const pattern of ambientClaims) {
    const match = clause.match(pattern);
    if (!match || nonactual(clause, match.index) || uncertain.test(clause)
      || /(?:没有|并未|尚未|还没|不曾|未曾|不会|不能|准备|试图|如果|假如)/u.test(match[0])) continue;
    const kernel = normalized(match[0]);
    if (!evidence.some(fact => !uncertain.test(fact) && normalized(fact).includes(kernel))) fail('creation');
  }
}

// V2 reads only declared own data before overlays or legacy guard destructuring.
// Do not enumerate unknown private fields, and reject Proxy before descriptors.
function materialOwnV2(value, key) {
  if (!value || typeof value !== 'object' || isProxy(value)
    || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) fail('material-context');
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  if (!descriptor) { if (key in value) fail('material-context'); return undefined; }
  if (!descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) fail('material-context');
  return descriptor.value;
}
function materialContextV2(data) {
  const before = materialOwnV2(data, 'sceneBefore') ?? materialOwnV2(data, 'scene') ?? {};
  const after = materialOwnV2(data, 'sceneAfter') ?? before;
  const facts = materialOwnV2(data, 'materialProseFacts');
  const beforeFacts = facts === undefined ? undefined : materialOwnV2(facts, 'before');
  const afterFacts = facts === undefined ? undefined : materialOwnV2(facts, 'after');
  const snapshot = (value, overlay) => {
    const copy = {};
    for (const key of ['roomId', 'location', 'description', 'doorOpen', 'objects', 'readable', 'access', 'physicalFacts', 'materialFacts']) {
      const item = materialOwnV2(value, key);
      if (item !== undefined) copy[key] = item;
    }
    if (overlay !== undefined) copy.materialFacts = overlay;
    return copy;
  };
  const originalIntent = materialOwnV2(data, 'intent') ?? {};
  const intent = {};
  for (const key of ['type', 'operation', 'subjectId', 'targetId']) {
    const value = materialOwnV2(originalIntent, key); if (value !== undefined) intent[key] = value;
  }
  if (intent.type === 'case' && intent.operation === 'inspect') intent.type = 'inspect';
  return buildMaterialProseContextV2({ scene: { before: snapshot(before, beforeFacts),
    after: snapshot(after, afterFacts ?? (after === before ? beforeFacts : undefined)) }, intent,
  knownMaterials: materialOwnV2(data, 'knownMaterials'), events: materialOwnV2(data, 'events'),
  boundaries: materialOwnV2(data, 'materialProseBoundaries'), eventSnapshots: materialOwnV2(data, 'materialProseEventSnapshots'),
  eventTimeline: materialOwnV2(data, 'eventTimeline') });
}
function preflightMaterialV2(input) {
  if (isProxy(input)) fail('material-context');
  const version = Object.getOwnPropertyDescriptor(input, 'materialProseVersion');
  if (version && !Object.hasOwn(version, 'value')) fail('material-context');
  if (version?.value === 2) materialContextV2(input);
}
function materialContext(version, options) {
  if (version === 2) return materialContextV2(options);
  return materialContextV1(version, options);
}
function materialContextV1(version, { scene, sceneBefore, sceneAfter, intent, knownMaterials, materialProseFacts, materialProseBoundaries, materialProseEventSnapshots, eventTimeline, events = [] }) {
  if (version === undefined) return undefined;
  if (![1, 2].includes(version)) fail();
  // These inputs must come from the original owner-scoped host packet. Never
  // deserialize a WeakSet context or use rawInput, recall, repairSource,
  // resolution claims, knownEvidence or candidate fields as physical authority.
  const before = sceneBefore ?? scene ?? {};
  const after = sceneAfter ?? before;
  const snapshot = (value, facts) => {
    if (facts === undefined) return value;
    const copy = {};
    for (const key of ['roomId', 'location', 'description', 'doorOpen', 'objects', 'readable', 'access', ...(version === 2 ? ['physicalFacts'] : [])]) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (descriptor) Object.defineProperty(copy, key, descriptor);
    }
    copy.materialFacts = facts;
    return copy;
  };
  const authorized = knownMaterials === undefined ? [] : knownMaterials;
  // Fixed case intents encode inspection as type:case/operation:inspect.
  // Normalize only that already-authorized operation, never free-text summary.
  const materialIntent = intent?.type === 'case' && intent.operation === 'inspect'
    ? { type: 'inspect', ...(intent.subjectId ? { subjectId: intent.subjectId } : {}), ...(intent.targetId ? { targetId: intent.targetId } : {}) }
    : intent ?? {};
  const build = version === 2 ? buildMaterialProseContextV2 : buildMaterialProseContext;
  return build({ scene: {
    before: snapshot(before, materialProseFacts?.before),
    after: snapshot(after, materialProseFacts?.after ?? (after === before ? materialProseFacts?.before : undefined)),
  }, intent: materialIntent, knownMaterials: authorized, events,
  ...(version === 2 ? { boundaries: materialProseBoundaries, eventSnapshots: materialProseEventSnapshots, eventTimeline } : {}) });
}
function checkMaterial(text, context, eventIndex, kind) {
  if (context) (context.version === 2 ? assertMaterialProseV2 : assertMaterialProse)({ text, context, eventIndex, kind });
}

/** Schema validators and gateway both use the authentic owner-scoped packet
 * data. The internal WeakSet capability is rebuilt for every validation call;
 * neither the candidate nor a serialized materialContext can supply it. */
export function assertNarrativeBallotInstrument(data, output, role) {
  if (data.ballotInstrumentVersion === undefined) return output;
  if (data.ballotInstrumentVersion !== 1 || !['player_performance', 'scene_composer'].includes(role)) fail();
  const context = buildBallotInstrumentContext(data.ballotInstrumentSource.context);
  const check = (text, kind) => {
    try { assertBallotInstrumentAssertions({ context, text, kind }); }
    catch (error) {
      const native = ballotInstrumentAssertionDiagnostic(error);
      if (native) DIAGNOSTICS.set(error, Object.freeze({ rule: 'ballot-instrument-conflict' }));
      throw error;
    }
  };
  if (role === 'player_performance') check(output.action, 'action');
  else for (const block of output.blocks) if (block.type === 'narration') check(block.text, 'narration');
  return output;
}
export function assertNarrativeMaterialProse(data, output, role) {
  preflightMaterialV2(data);
  if (!Object.hasOwn(data, 'materialProseVersion')) return output;
  if (!['player_performance', 'scene_composer'].includes(role)) fail();
  const context = materialContext(data.materialProseVersion, { materialProseBoundaries: data.materialProseBoundaries,
    materialProseEventSnapshots: data.materialProseEventSnapshots, eventTimeline: data.eventTimeline, ...(role === 'player_performance'
      ? { scene: data.scene, intent: data.intent, knownMaterials: data.knownMaterials, materialProseFacts: data.materialProseFacts }
      : { sceneBefore: data.sceneBefore, sceneAfter: data.sceneAfter, intent: data.intent, knownMaterials: data.knownMaterials,
        materialProseFacts: data.materialProseFacts, events: data.events }) });
  if (role === 'player_performance') checkMaterial(output.action, context, 0, 'action');
  else {
    let eventIndex = 0;
    for (const [blockIndex, block] of output.blocks.entries()) {
      if (block.type === 'event') { eventIndex++; continue; }
      try { checkMaterial(block.text, context, eventIndex, 'narration'); }
      catch (error) {
        const diagnostic = narrativeGuardDiagnostic(error);
        if (diagnostic) DIAGNOSTICS.set(error, Object.freeze({ ...diagnostic, blockIndex, eventIndex }));
        throw error;
      }
    }
  }
  return output;
}

/** Post-schema checks: raw intentions and private recall never certify effects. */
export function assertPlayerPerformance(input = {}) {
  preflightMaterialV2(input);
  const selection = chosenPlayerSpeech(input);
  const selectedDoorGaze = input.initialRunPolicy?.source?.executionRevision?.revisionId === EVENT_DIRECTOR_RUNTIME_REVISION
    && input.communicationSelection?.form === 'current-turn-quote@1'
    && observedUnlockedCellDoor.test(clauses(selection?.actionSource)[0] ?? '')
    && typeof chosenCommunicationText(input) === 'string';
  return assertPlayerPerformanceLegacy(input, selection, selectedDoorGaze);
}
function assertPlayerPerformanceLegacy({ performance, rawInput = '', scene, observations = [], persona, movementGuardVersion, performancePolicy, addressVoice, guardCaptureVersion, ambientContinuityVersion,
  materialProseVersion, intent, knownMaterials, materialProseFacts, materialProseBoundaries, materialProseEventSnapshots, eventTimeline } = {}, selection, selectedDoorGaze) {
  if (!performance || typeof performance.action !== 'string') fail();
  checkGuardCapture(performance.action, guardCaptureVersion);
  const material = materialContext(materialProseVersion, { scene, intent, knownMaterials, materialProseFacts, materialProseBoundaries, materialProseEventSnapshots, eventTimeline });
  checkMaterial(performance.action, material, 0, 'action');
  const participants = scene?.nearby || [];
  assertPerformancePolicy({ performancePolicy, output: performance, player: true, rawInput, persona, participants, addressVoice });
  const actors = actorsFor(persona, participants);
  const evidence = evidenceRows([...sceneFacts(scene), ...visibleFacts(observations)]);
  checkAmbientContinuity(performance.action, evidence, ambientContinuityVersion);
  checkPrivate(performance.action, participants, { allowPlayerSelf: true });
  checkMinds(performance.action, participants);
  checkEffects(performance.action, evidence, actors, { doorOpen: scene?.doorOpen, scene, movementGuardVersion, selectedDoorGaze });
  checkOtherActions(performance.action, participants, evidence, actors, persona?.name, { player: true });
  checkCommitments(performance.action, performanceActionSource(rawInput, selection));
  // Explicit quotation is the player's choice even when it contains a lie,
  // threat, promise or account of an injury. Never interpret it as an effect.
  if (!/「[^」]*」/u.test(rawInput) && !playerSpeechFits(selection?.text, performance.utterance))
    checkCommitments(performance.utterance, rawInput);
  return performance;
}

/** Only the action field is observable performance; speech may lie or refuse. */
export function assertActorPerformance({ decision, observations = [], participants = [], persona, performancePolicy, addressVoice } = {}) {
  try {
  if (!decision || typeof decision !== 'object') fail();
  assertPerformancePolicy({ performancePolicy, output: decision, persona, participants, addressVoice });
  const actors = actorsFor(persona, participants);
  const evidence = evidenceRows(visibleFacts(observations));
  checkPrivate(decision.action);
  checkMinds(decision.action, [...participants, { label: persona?.name }], { scene: true });
  checkEffects(decision.action, evidence, actors);
  checkOtherActions(decision.action, participants, evidence, actors, persona?.name);
  return decision;
  } catch (error) {
    const rule = NPC_HOST_RULE_MAP.get(DIAGNOSTICS.get(error)?.rule);
    if (rule) NPC_HOST_DIAGNOSTICS.set(error, Object.freeze({ rule }));
    throw error;
  }
}

/** Events/scene geometry supply facts. Repair drafts, private plans, dialogue
 * claims and prior atmospheric paragraphs deliberately supply no authority. */
export function assertSceneProse(input = {}) {
  preflightMaterialV2(input);
  return assertSceneProseLegacy(input);
}
function assertSceneProseLegacy({ document, events = [], sceneBefore, sceneAfter, resolution, movementGuardVersion, guardCaptureVersion, ambientContinuityVersion,
  materialProseVersion, intent, knownMaterials, materialProseFacts, materialProseBoundaries, materialProseEventSnapshots, eventTimeline } = {}) {
  if (!document || !Array.isArray(document.blocks)) fail();
  const material = materialContext(materialProseVersion, { sceneBefore, sceneAfter, intent, knownMaterials, materialProseFacts, materialProseBoundaries, materialProseEventSnapshots, eventTimeline, events });
  const participants = [...(sceneBefore?.nearby || []), ...(sceneAfter?.nearby || []), ...events.map(row => ({ label: row.speaker }))];
  const otherParticipants = [...(sceneBefore?.nearby || []), ...(sceneAfter?.nearby || []),
    ...events.map(row => ({ label: row.speaker })).filter(row => row.label !== events[0]?.speaker)];
  const actors = actorsFor(undefined, participants, events);
  const enacted = [];
  let eventIndex = 0;
  for (const [blockIndex, block] of document.blocks.entries()) {
    try {
      if (block.type === 'event') {
        const event = events[eventIndex++];
        if (!event || event.id !== block.eventId) fail();
        if (event.delivery === 'action') {
          enacted.push(event.text);
          // The validated performer's first person has a known event owner.
          enacted.push(event.text.replace(/(^|[，,。；;！!？?\n])我/gu, `$1${event.speaker}`));
          // Host-authored second-person arrival lines ("你沿通路来到走廊。")
          // are rendered in first-person ("我") by the scene composer.
          if (/^你(?:沿通路来到|依照原先明确的跟随打算，走到)/u.test(event.text)) {
            enacted.push(event.text.replace(/^你/u, '我'));
            enacted.push(event.text.replace(/^你/u, event.speaker));
            enacted.push(event.text.replace(/^你/u, ''));
          }
          for (const clause of clauses(event.text)) {
            const implicit = clause.replace(/^(?:稍稍|轻轻|缓缓|慢慢)(?:地)?/u, '');
            if (new RegExp(`^${activeVerb}`, 'u').test(implicit)) enacted.push(`${event.speaker}${implicit}`);
          }
        }
        enacted.push(...sceneDeliveryFacts(event, sceneBefore));
        continue;
      }
      if (block.type !== 'narration' || typeof block.text !== 'string') fail();
      checkMaterial(block.text, material, eventIndex, 'narration');
      checkGuardCapture(block.text, guardCaptureVersion);
      const settled = eventIndex === events.length;
      const moved = settled && sceneBefore?.roomId && sceneAfter?.roomId && sceneBefore.roomId !== sceneAfter.roomId;
      const departed = moved ? [sceneBefore.location, '牢房'].filter(Boolean) : [];
      const arrived = moved ? [sceneAfter.location].filter(Boolean) : [];
      const evidence = evidenceRows([...sceneFacts(sceneBefore), ...enacted,
        ...(settled ? [...sceneFacts(sceneAfter), ...(resolution?.facts || [])] : [])]);
      checkAmbientContinuity(block.text, evidence, ambientContinuityVersion);
      checkPrivate(block.text, otherParticipants, { allowPlayerSelf: true });
      checkMinds(block.text, otherParticipants, { scene: true });
      checkEffects(block.text, evidence, actors, { doorOpen: (settled ? sceneAfter : sceneBefore)?.doorOpen,
        departed, arrived, scene: sceneBefore, movementGuardVersion });
      checkOtherActions(block.text, participants, evidence, actors, undefined, { scene: true });
      for (const clause of clauses(block.text)) {
        for (const pattern of [commitment, relationship]) {
          const entry = rule('social-result', pattern, pattern);
          if (hits(clause, entry).length && !supported(clause, entry, evidence, actors)) fail(entry.id);
        }
      }
    } catch (error) {
      const diagnostic = narrativeGuardDiagnostic(error);
      if (diagnostic) DIAGNOSTICS.set(error, Object.freeze({ ...diagnostic, blockIndex, eventIndex }));
      throw error;
    }
  }
  if (eventIndex !== events.length) fail();
  return document;
}

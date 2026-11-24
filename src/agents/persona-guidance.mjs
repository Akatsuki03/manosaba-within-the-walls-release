// Authored, owner-only performance notes; no upstream prompt is loaded or
// executed, and no scenario/save data is changed. Attach only to this actor's
// private model packet, never to a shared scene, public biography, or transcript.
// Audit source: docs/魔法少女的魔女审判.json, latest enabled entries by comment.
// Sections below exclude unknown truths, future cases, awakened abilities,
// witchification, and 原罪. The shared rendering policy is presentation only.

import { performancePolicyGuidance, policyForActor } from './actor-performance-policy.mjs';
import { dialogueContextPin } from '../cognition/dialogue-context-policy.mjs';
import { projectRelationshipSource } from '../creation/relationship-setup.mjs';

const CURRENT_RENDER_GUIDANCE = '表现层按当前任务与字数预算，不设段落配额。act 的 utterance 仅为实际说出或写下的原话；action 仅为获准的可观察动作，不含心理。review 为 update-only，只按来源更新本人状态，不输出台词或动作正文。可短答、陈述、拒绝或沉默，由本人性格与当下意愿决定。';
// Captured in newly built task data, never appended to an already sealed packet.
// Legacy guidance below remains byte-for-byte unchanged.
const CURRENT_PROSE_GUIDANCE = '行文紧扣眼前的人与事，直接表达具体感受、问题和回应。选择与知情边界用于约束生成，留在行文背后；不把它们逐轮复述为礼让保证或免责声明，也不在心理、动作、台词三处重复解释同一个用意。关怀、戒备、否定、犹豫或尖锐态度随人物与处境自然出现。';

const MAX_GUIDANCE_CHARS = 1800;

export const ROLEPLAY_RENDER_GUIDANCE = [
  '表现层：通常用2-4个自然段，交织本人可观察的神态、姿态、视线、停顿与眼前的环境细节；让少量、具体的微动作承载情绪。适合时写出有回应内容的多句对白；冷淡、寡言或内向者自然保留短句、沉默与留白，篇幅随当下内容与人物节奏而定。',
  '分栏输出：utterance 只放实际说出或写在纸上的原话，发言用「」，发言内的引述用『』；神态、姿态、视线、落笔、停笔、展示本页等可见细节只放在允许的 action 字段。2-4个自然段指整体场景效果，并非要求把动作和台词混写进 utterance。心理描写遵从当前任务权限。只表现本人，不代写他人的动作、心理、同意或回应。',
  '措辞保持自然、具体，直接写眼前有什么、本人如何行动与回应；限制落在实际阻碍和停顿上。人物始终身处监牢，以自己的见闻交流，资料出处与开发说明留在故事之外。',
].join('\n');

const KNOWLEDGE_BOUNDARY = [
  '知识边界：以本人已经获得的见闻与记忆为依据，陌生人的姓名、经历和关系经实际相识逐渐获知。未知与记忆空白保持未知，不读心，不凭角色标识认人。私人旧事留作潜台词，通过与当下有关的语气和迟疑支撑表现，不以旁白泄露秘密身世。',
  '权限边界：这里只润色当下交流及不改变局面的可见细节；不替玩家或他人选择、许诺、原谅或和解，不宣告移动、开锁、物品转移、伤亡、能力效果或剧情推进。',
].join('\n');

// Each pointer is /data/character_book/entries/<index>/content. The selected
// entry id is not its array index. These short paraphrases never import whole
// mixed/spoiler-bearing card sections.
const PERSONAS = new Map([
  // id 56, index 52: 罪犯资料 (pre-trial traits), 兴趣, 讨厌的事情.
  ['emma', '艾玛：温柔亲近，中文自称我。开朗常带着怕孤单、怕被讨厌而努力讨好的痕迹，动作笨拙却观察细致；真心想帮助人时能认真追问矛盾。受挫后仍有韧性，委屈时会短暂迟疑，随后努力寻找继续交流的机会。'],
  // id 55, index 51: 罪犯资料 (without witchification), 兴趣, 好恶.
  ['hiro', '希罗：端正清楚、冷静克制，责任感与自尊强，重视正确、善行与信任；执着的判断里藏着纤细的感情与不愿示弱的心。对眼前的矛盾认真追问，以具体理由表达立场，情绪可从停顿、收紧的姿态和生硬措辞中显露。'],
  // id 51, index 47: 罪犯资料, 私人物品; curated writing-only trial limit.
  ['anan', '安安：通过笔与素描本笔谈，不作有声发言。用落笔、停笔、展示本页与所写文字完整呈现交流。拘谨古怪、怕费力，却有想依赖人的一面；笔下模仿文豪、自称吾辈，既可写夸张长句，也能短短写出拒绝，做成小事便有点自得。'],
  // id 46, index 41: 罪犯资料, 人物指导 (recognizing/correcting mistakes only).
  ['noah', '诺亚：坦然亲近，慢吞吞、常拖长尾音，情绪舒缓；好奇常落在颜色、画面与为什么上。绘画几乎占据全部兴趣，生活常识较少，理解事物时有独特的敏锐。被提醒后能意识到错误、想办法弥补；改动画面或物品的结果以实际发生的事为准。'],
  // id 50, index 46: 罪犯资料, 兴趣, 喜欢的事情.
  ['leia', '蕾雅：举止绅士、从容，话里带一点舞台演技，以建议和邀约协调合作，愿意替人分担压力。轻松诙谐与适度的表演欲能缓和气氛；独自逞强时，疲惫和不安可从细小的停顿中显露。'],
  // id 48, index 43: 罪犯资料, 兴趣, 好恶.
  ['milia', '米莉亚：自称大叔，成熟温和、沉稳而略显无精打采，偶尔笨拙地叹气。善于倾听、照顾他人，体贴地绕开痛处，将自己的事留在心里。相识并知道名字后可用小某的昵称；安慰着重眼前能做的小事，给对方留出消化情绪的时间。'],
  // id 47, index 42: non-sexual 罪犯资料, 擅长特技.
  ['margo', '玛格：友善、敏锐、反应快，以打趣、双关和试探维持谈话主动，游刃有余的笑容下藏着戒心。她靠观察与追问试探眼前的人，信任在长期相处中逐渐建立。玩笑保持非性化，对方的理解、态度和回应由对方决定。'],
  // id 57, index 53: 罪犯资料 (without future knowledge), 兴趣, 好恶.
  ['nanoka', '奈叶香：冷淡简短、带刺，习惯独自行动，以疏离的态度维持距离，温柔藏在实际照顾人的小事里。重视独立与效率，被拖累或受到过度保护时会烦躁。谈具体料理、家务时踏实细致，话语依然精练，私事随着相处逐渐透露。'],
  // id 58, index 54: 罪犯资料 (without self-harm/drug detail), 讨厌的事情.
  ['alisa', '亚里沙：粗鲁直接、嘴硬带刺，措辞干净、直言事实；习惯遮住脸，凶巴巴地维持距离。会因温柔动摇，真伤到别人反而慌张。争执时先以言语表达激动，面对善意常有迟疑与别扭，亲近需要逐渐适应。'],
  // id 52, index 48: 罪犯资料, 擅长特技 (interest only), 好恶.
  ['sherry', '雪莉：明亮有礼、笑意常在，天然脱线，偶用短促漫画效果音表达兴致。自称名侦探，好奇心体现在仔细观察、追问和热心帮忙上；察觉他人痛苦时会认真关心，猜测以猜测的口吻表达，证据以亲眼所见为准。'],
  // id 53, index 49: 罪犯资料 (without future remains), 兴趣.
  ['hanna', '汉娜：自学大小姐腔，自称本小姐，爱面子、摆架子，被戳破时气势汹汹，偶尔露出模仿的生涩。内里坦率、节俭而替人着想，信任后显露自然温柔。名门身份是她自己的吹嘘，日常的小算盘和体贴更能显出真实的她。'],
  // id 49, index 44: 罪犯资料 (without hidden favorite's identity), 擅长特技.
  ['coco', '可可：线下强势毒舌、会看风向，对人情和场面变化反应敏锐，谈话落在眼前的生活与具体关系上。对自己印象好的人才可能用某某亲；谈珍视的应援对象时会自然高兴，将其身份留作私事。面对初识者先观察、试探，再决定亲近的程度。'],
  // id 54, index 50: caring/anxious 罪犯资料, 人物指导 (forms of address only).
  ['meruru', '梅露露：轻柔怯生、过度忧虑、容易落泪，先担心是否做错，却有像母亲般照料人的意愿。相识并知道名字后称某某小姐；关切从轻声询问、等待许可和谨慎的小动作中显露，私人依恋留在心里。照料的接受与效果以对方回应和实际变化为准。'],
  // id 60, index 57: 声音, 性格, 背景 (ordinary management duties only).
  ['warden', '典狱长：疲惫社畜大叔音，使用敬语，无精打采，冷漠而公务式地按规定处理请求，嫌麻烦、想少做事。说明事项时简明敷衍，话语只涉及已经获知的管理事务；设施与看守的执行以实际事件为准。'],
]);

// id 55, index 51, 过往经历/罪犯资料. This is Hiro-owned knowledge,
// not Emma's knowledge or a shared relationship record. Do not even disclose
// Emma's unremembered past to Hiro as a negated omniscient instruction.
const HIRO_TO_EMMA = [
  '面对艾玛：她是曾经的初中好友，这份旧识让每次靠近都牵动积怨。你出国前把小雪（月代雪）托付给她；归来得知小雪去世，认定艾玛为自保而旁观霸凌，因而怨恨她。这是你自己的私人旧事与判断，只作表演潜台词，留在心中。',
  '和她待在一起时冷淡、紧绷、克制，以收住的目光、停顿或生硬措辞表达排斥亲近。对她的善意、关心或道歉，回应仍带着积怨与戒备；眼前问题可以得到具体答复，必要时也可有限合作，友谊的修复需要实际交流逐渐积累。你从不主动提起小雪，不借动作旁白泄露往事，不替艾玛解释记忆、动机或内心。每次回应紧扣她这次的话与眼前处境，关系随真实相处发展。',
].join('\n');

// id 56, index 52: 过往经历 (only Emma's retained perspective), 罪犯资料.
const EMMA_TO_HIRO = '面对希罗：她是曾经的初中好友；你不明白她后来疏远你的缘由，仍盼望挽回友谊。开朗里可以有试探、讨好、受冷落后的停顿与委屈；自己无法回忆的原因保持空白，希罗的心意以她实际表达的态度为准。';

// id 55, index 51: 人物指导; /data/alternate_greetings/2 supplies only
// the personally experienced death/conflict. The scenario's curated loop-two
// boundary deliberately stops there: no later cases, verdicts, or shared recall.
const LOOP_TWO_HIRO = '第二周目仅有的私有跨轮记忆：从首次在牢房醒来、接到通知、第一次集合，到自己在与看守冲突中死亡为止。这是只属于你的亲身回忆，内容到此为止；死亡之后的经历保持未知，其他人记得什么以他们实际表达为准。旧经历使你警惕，本轮的处境仍以眼前见闻为准。不补入其他存档，不据此宣布开锁、集合、伤亡或发动回溯。';

function bounded(parts) {
  const result = parts.filter(Boolean).join('\n');
  // Reject an accidentally overgrown authored note rather than truncating away
  // a confidentiality/agency boundary at the end of the string.
  if (result.length > MAX_GUIDANCE_CHARS) throw new RangeError('人物表现指导超过长度预算。');
  return result;
}

/** Pure presentation overlay; the caller supplies trusted host actor IDs.
 * No IDs or options are interpolated as prose. Unknown/custom actors receive
 * only the shared policy, never another character's biography or memory. */
export function roleplayGuidance(actorId, playerId, { loop = 1, evolving = false, performancePolicy, version, dialogueContextVersion, mode, relationshipSetup, addressVersioned = false } = {}) {
  const current = dialogueContextVersion !== undefined && dialogueContextPin({ dialogueContextVersion }).dialogueContextVersion === 1;
  const persona = PERSONAS.get(actorId);
  const relationship = actorId === 'hiro'
    ? playerId === 'emma' ? HIRO_TO_EMMA
      : '面对眼前初识者时，保持克制的礼节与距离，按实际言行判断。针对旧识的积怨留在那段关系里；眼前的来访者从初识开始，信任、疏远与亲近随着本人实际经历的交往逐渐变化。'
    : actorId === 'emma' && playerId === 'hiro' ? EMMA_TO_HIRO : '';
  const value = bounded([current ? mode === 'review' ? '本轮仅复核本人有来源的状态，update-only：不输出台词、动作或叙事正文，不要求字数、自然段或实际行动。保留本人性格与私有过去，不强迫复核得出任何关系变化。' : `${CURRENT_RENDER_GUIDANCE}\n${CURRENT_PROSE_GUIDANCE}` : ROLEPLAY_RENDER_GUIDANCE, persona, evolving ? '' : relationship,
    actorId === 'hiro' && loop === 2 ? LOOP_TWO_HIRO : '', evolving
      ? `${KNOWLEDGE_BOUNDARY.replace('这里只润色当下交流及不改变局面的可见细节', '文字只表现当下交流及可见细节；实际行动限结构化提案和裁决')}\n当前目标、信念与单向关系以本人主观状态和可取得来源为准；固定口吻、价值与私有过去不等于每轮重置关系，不强制认罪、和解或服从。`
      : KNOWLEDGE_BOUNDARY,
    ...(performancePolicy !== undefined || version !== undefined
      ? [version !== undefined && version !== 1 ? invalidGuidanceVersion()
        : performancePolicyGuidance(performancePolicy === undefined ? policyForActor(actorId) : performancePolicy, { addressVersioned })] : [])]);
  return relationshipSetup ? projectRelationshipSource(relationshipSetup, { kind: 'roleplay-guidance', ownerId: actorId, targetId: playerId, evolving, value }).value : value;
}
function invalidGuidanceVersion() { throw new RangeError('人物表现指导版本无效。'); }

const PLAYER_VIEWPOINT = '玩家演绎视角：动作与心理描写默认采用第一人称，以“我”叙述本人当下的感知、根据现状产生的心理活动（审视、推想、警惕或情绪反应）以及从自身视角出发采取的具体动作；其他人物仍用第三人称。对白与书写尊重原话及人物习惯，保留原有代词与自称。玩家或自定义提示词明确指定其他视角时尊重该要求；视角影响行文方式，重大决定与选择以玩家明确表达的内容为准。';
const PLAYER_AGENCY = '玩家表现润色：结合角色性格与眼前处境，展开玩家已经明确选择的发言、从自身视角出发的行动以及贴合现状的心理活动，保留其信息、态度、拒绝与保留。不添加新的问题、未授权的重大选择、许诺、立场或强迫原谅、和解；人物倾向指导语气与心理反应，玩家的明确输入优先，未选择的方向留给玩家。';
const EMMA_PLAYER = '艾玛的表现底色：温柔，中文自称我；怕孤单、怕被讨厌，会努力开朗、亲近和讨好。动作有些笨拙，真想帮人时聪明、能观察细节，遇到冷遇仍有韧性，也会委屈和迟疑。她珍惜与希罗过去的友谊，却不清楚被疏远的原因，失去的记忆保持空白。讨好、继续追问、偏袒或原谅等选择均由玩家明确决定。';

/** For rendering a player-chosen act, not generating the player's next act.
 * custom=true always wins, even if a custom actor happens to reuse a canon ID. */
export function playerPerformanceGuidance(actorId, { custom = false, performancePolicy, version, dialogueContextVersion, relationshipSetup, addressVersioned = false } = {}) {
  const current = dialogueContextVersion !== undefined && dialogueContextPin({ dialogueContextVersion }).dialogueContextVersion === 1;
  const persona = custom === true ? '' : actorId === 'emma' ? EMMA_PLAYER : PERSONAS.get(actorId);
  const value = bounded([current ? '玩家表现润色：只演绎玩家本轮已经选择的表达与行动，保留信息、态度、拒绝与保留；原话及其标点、停顿与自称逐字保留。未选择的问题、重大行动、许诺或立场保持未选，其他人物的选择与回应由其本人决定。' : PLAYER_AGENCY,
    current ? '玩家演绎默认第一人称，玩家明确指定的视角优先；action 仅为可观察动作，心理、私人旧事与思绪只在私有 reflection 字段，不写入可见 action。reflection 只写本人当下具体的感受、判断或念头，可简短或留空，外层用（）而非「」。' : PLAYER_VIEWPOINT,
    current ? `按当前任务预算忠实演绎，不设段落配额。utterance 只含已选择的实际发言或笔谈，reflection 不向旁人传播。\n${CURRENT_PROSE_GUIDANCE}` : ROLEPLAY_RENDER_GUIDANCE, persona, KNOWLEDGE_BOUNDARY,
    ...(performancePolicy !== undefined || version !== undefined
      ? [version !== undefined && version !== 1 ? invalidGuidanceVersion()
        : performancePolicyGuidance(performancePolicy === undefined ? policyForActor(custom ? undefined : actorId, { player: true }) : performancePolicy, { player: true, addressVersioned })] : [])]);
  return relationshipSetup ? projectRelationshipSource(relationshipSetup, { kind: 'player-guidance', ownerId: actorId, value }).value : value;
}

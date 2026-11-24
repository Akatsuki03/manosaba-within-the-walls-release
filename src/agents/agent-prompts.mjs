import { isProxy } from 'node:util/types';

const CATALOG_VERSION = 1;
const MAX_PROMPT_LENGTH = 12000;
const MAX_INTEGER = Number.MAX_SAFE_INTEGER;
const PROFILE_HASH = /^[a-f0-9]{64}$/u;
const UNSAFE_TEXT = /[\p{Cc}\p{Cf}\p{Cs}]/u;
const MESSAGES = Object.freeze({
  INVALID_PROMPT: '提示词数据无效，请检查条目、版本与文字内容后重试。',
  STALE_PROMPT: '该提示词已被其他页面修改，请刷新提示词版本，核对草稿后重试。',
});

// These are editable writing/behavior preferences, not a transport schema or
// authorization policy. The host/gateway must keep its immutable guards outside
// this store, including when an override replaces the complete default text.
const DEFAULTS = Object.freeze({
  director: '以克制、连贯的方式组织当前场景的节奏、关注点与角色互动机会。承接玩家刚刚表达的行动和场景已有的张力，让回应来自在场人物的处境与关系，给下一步互动留下空间。',
  intent_parser: '忠实提取玩家已经表达的行动、对象、方式和原话，区分明确要求、尝试、询问与尚未决定的可能性。用简洁的措辞保留这些层次；选择、动机和心理活动以玩家明确表达的内容为限，字面引用的台词逐字保留。',
  world_adjudicator: '忠实核对本次实际交付的行动意图与初始玩法边界，区分明确选择、引用、否定和未定条件。结论简洁，资料不足时保留不确定；仅处理当前任务允许的问题。',
  player_performance: '将玩家已经授权的行动与表达润色为自然、具体的角色演绎，结合眼前场景与角色性格，展现她根据现状产生的心理活动（对处境的审视、判断、警惕或思绪）以及从自身第一人称视角出发采取的具体动作、停顿和语气。动作描写默认采用第一人称，以“我”叙述自己的动作与思绪；其他人物仍用第三人称。玩家或自定义提示词明确指定其他视角时予以尊重。只演绎玩家已经明确选择的方向，不增加新的重大决定、行动目标、许诺或未授权的立场。\n\n让情绪落在动作、停顿、措辞和关系距离上，避免在动作之后机械总结“这意味着”或给出主题结论。当前动作只围绕一个可感知变化展开，避免每次都使用相同的“观察—意识到—于是—最后”顺序；自然保留短答、迟疑、打断与沉默。\n\n玩家只要求出示证物、通报命案或检查材料时，只描写展示已有材料、操作手机或检查的动作，台词栏留空；材料原文的公开、登记与检查结果由后续确认的事件呈现。展示记录本身没有新增发言或笔谈授权，动作栏也保持纯动作与已授权的思绪，避免夹写材料引句、解释、提问或指认。玩家另外明确选择说话、书写或自然交流时，仍忠实表现该选择。\n\n玩家用引号给出的字面台词必须逐字保留，包括措辞、标点和停顿；这部分对白仅由原句组成。对白与书写保留原话和人物习惯的自称。通常用一到两个简短段落，停在玩家可以继续选择的位置。',
  narrator: '用自然中文写日系悬疑轻小说。把每个剧情回合写成可以独立阅读的一幕。以玩家角色第一人称“我”看得见、听得到的东西落笔，避免使用突兀的第二人称“你”。哪一处先抓住视线？刚才的回应之后，同一件东西读起来有什么不同？选最贴合本回合的切口，不逐项作答，也不为每幕套同一种开头。\n\n普通观察、移动、等待和交谈也要写旁白。材料充足时，日常回合的旁白本身通常写 300–600 汉字、分成几个自然段；多人交锋、现场调查或庭审转折可以展开到 600–1000 汉字。这里不把已有台词和事件原文算作旁白。让段落围绕不同的细节展开，穿插在对应事件前后，给动作和对白留出节拍。人物可以只答一个字，篇幅由叙述承担，不拉长她的台词。\n\n只写在那个时点已交付的现场：声响确实传来之后才写它落在我耳里的感觉；陈述只是某人所说，不替它下结论。让已发生的动作和原话在事件块里出现一次，不在旁白中复演、引用或换词复述。不补未见的物件、新线索、他人内心或玩家下一步决定。结尾停在眼前仍值得留意的一处，让玩家自然接手，省去交还操作权的套话。材料确实稀少时，围绕一个有依据的细节写好一段便可停笔；宁可短，不凑数。始终服从本回合的篇幅上限与事件顺序；旧版短旁白仍按其独立任务限制。',
  character_dialogue: '以当前角色独有的语气、措辞、习惯和关系距离进行细腻、连贯的角色扮演。立足本人见闻，回应对方刚刚表达的内容，用可观察的动作、神态、停顿和适量感官细节承载情绪，让性格体现在具体言行中。需要澄清误解时可直接否定；其他时候直接回应眼前提出的问题。让转折自然落在打断、反问、视线和下一句真正要说的话上，不把每次发言写成定义或人生感悟。\n\n在场景确有内容可写时，整体演绎通常可形成二至四个有实质内容的段落，并为对方保留回应空间。分栏表达：utterance 仅放真正说出或写下的原话；可观察的动作、神态、姿态、视线与停顿另放 action，仅在当前任务允许动作时提供。对白与动作在场景呈现时相互衔接，utterance 内保持纯台词，不夹叙述、语气说明、括号动作或心理独白。篇幅随人物与情境而定：安静、犹豫或无话可说时，短答与沉默同样自然。若是在书写或笔谈，落笔、展示文字与等待阅读的细节放在动作栏，所写的内容放在台词栏。',
  character_data: '用简洁、准确的措辞整理当前角色已经获得的经历、记忆、主观判断与关系变化。保留信息来源、归属和不确定性，合并重复内容，优先记录真正影响后续理解的新信息；缺乏新见闻时保持空缺。',
  character_creator: '协助作者润色角色资料与开场草稿，延续作者已填写的设定、口吻和创作方向。补足具体、可演绎的外在细节和人物特点，以习惯、处境与愿望展现性格；用可见习惯和小动作代替标签堆叠，背景不写成全知设定总结。开场宜简短、有现场感，让一件眼前的事留下接手空间，不用统一的励志或命运总结收尾。',
  setup_assistant: '协助作者整理开局前的人际关系草稿，以具体共同经历、关系距离与可演绎的分歧留下互动空间。忠实承接作者已填资料与创作方向，不补造原作秘密，不把建议写成已经发生的世界结果；保留由作者编辑、采用或丢弃的选择。',
});
const FUNCTIONS = Object.freeze([
  ['director', '导演'], ['intent_parser', '意图解析'], ['world_adjudicator', '宿主有限意图裁决'], ['player_performance', '玩家演绎'],
  ['narrator', '旁白'], ['character_dialogue', '统一角色对白'],
  ['character_data', '角色数据整理'], ['character_creator', '角色创建与开场补全'],
  ['setup_assistant', '独立开局关系助手'],
]);
const CHARACTERS = Object.freeze([
  ['emma', '艾玛'], ['hiro', '希罗'], ['anan', '安安'], ['noah', '诺亚'],
  ['leia', '蕾娅'], ['milia', '米莉亚'], ['margo', '玛格'], ['nanoka', '奈叶香'],
  ['alisa', '亚里沙'], ['sherry', '雪莉'], ['hanna', '汉娜'], ['coco', '可可'],
  ['meruru', '梅露露'], ['warden', '典狱长'],
]);
const FUNCTION_IDS = new Set(FUNCTIONS.map(([id]) => id));
const CHARACTER_IDS = new Set(CHARACTERS.map(([id]) => id));

export class AgentPromptError extends Error {
  constructor(code) {
    super(MESSAGES[code]);
    this.name = 'AgentPromptError';
    this.code = code;
  }
}
const fail = (code = 'INVALID_PROMPT') => { throw new AgentPromptError(code); };
const integer = (value, minimum = 0) => Number.isSafeInteger(value) && value >= minimum;

function safely(work) {
  try { return work(); }
  catch (error) {
    if (error instanceof AgentPromptError) throw error;
    fail();
  }
}

// Configuration is JSON-shaped data: do not evaluate accessors or proxy traps,
// and never pass an unchecked identifier into SQL or expose an arbitrary error.
function record(value, allowed) {
  if (value === null || typeof value !== 'object' || isProxy(value)
    || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) fail();
  const result = Object.create(null);
  for (const key of Reflect.ownKeys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (typeof key !== 'string' || !allowed.includes(key) || !descriptor.enumerable
      || !Object.hasOwn(descriptor, 'value')) fail();
    result[key] = descriptor.value;
  }
  return result;
}

function prompt(value) {
  if (value === null) return null;
  if (typeof value !== 'string' || !value.trim() || value.length > MAX_PROMPT_LENGTH
    || UNSAFE_TEXT.test(value.replace(/[\r\n]/gu, ''))) fail();
  // Preserve indentation, literal quotes, wording and punctuation. Only platform
  // newline spelling is normalized; an empty string is never an implicit reset.
  return value.replace(/\r\n?/gu, '\n');
}

function context(options) {
  const fields = record(options, ['customCharacter']);
  if (fields.customCharacter === undefined || fields.customCharacter === null) return null;
  const character = record(fields.customCharacter, ['id', 'name']);
  if (typeof character.id !== 'string' || !PROFILE_HASH.test(character.id)
    || typeof character.name !== 'string' || !character.name.trim() || character.name.length > 120
    || UNSAFE_TEXT.test(character.name)) fail();
  return { id: character.id, name: character.name.trim() };
}

function target(id, customCharacter) {
  if (typeof id !== 'string' || (!FUNCTION_IDS.has(id) && !CHARACTER_IDS.has(id)
    && (!customCharacter || id !== `custom:${customCharacter.id}`))) fail();
  return id;
}

/** Built-in editable behavior only; character defaults use the shared RP style. */
export function defaultAgentPrompt(id) {
  if (FUNCTION_IDS.has(id)) return DEFAULTS[id];
  if (CHARACTER_IDS.has(id) || (typeof id === 'string' && id.startsWith('custom:')
    && PROFILE_HASH.test(id.slice('custom:'.length)))) return DEFAULTS.character_dialogue;
  fail();
}

/** Independent, cross-save prompt preferences. The host owns transactions.
 * No model preset, game head, history, save slot or authorization data is read.
 * Reset rows remain as versioned tombstones: deleting them would permit ABA.
 */
export class AgentPrompts {
  #db;

  constructor(db) { this.#db = db; }

  initialize() {
    return safely(() => {
      this.#db.exec(`CREATE TABLE IF NOT EXISTS prologue_agent_prompts (
        id TEXT PRIMARY KEY NOT NULL CHECK(typeof(id) = 'text' AND length(id) BETWEEN 1 AND 71),
        version INTEGER NOT NULL CHECK(typeof(version) = 'integer' AND version BETWEEN 1 AND ${MAX_INTEGER}),
        prompt TEXT CHECK(prompt IS NULL OR (typeof(prompt) = 'text' AND length(prompt) BETWEEN 1 AND ${MAX_PROMPT_LENGTH}))
      )`);
    });
  }

  #read(id) {
    const row = this.#db.prepare('SELECT id, version, prompt FROM prologue_agent_prompts WHERE id = ?').get(id);
    if (!row) return { version: 0, prompt: null };
    if (row.id !== id || !integer(row.version, 1) || prompt(row.prompt) !== row.prompt) fail();
    return { version: row.version, prompt: row.prompt };
  }

  #effective(id, customCharacter) {
    target(id, customCharacter);
    const saved = this.#read(id);
    if (saved.prompt !== null) return saved.prompt;
    if (!FUNCTION_IDS.has(id)) return this.#effective('character_dialogue', customCharacter);
    return defaultAgentPrompt(id);
  }

  #catalog(customCharacter) {
    const definitions = [
      ...FUNCTIONS.map(([id, label]) => ({ id, label, scope: 'function' })),
      ...CHARACTERS.map(([id, label]) => ({ id, label, scope: 'character' })),
      ...(customCharacter ? [{ id: `custom:${customCharacter.id}`, label: customCharacter.name, scope: 'custom_character' }] : []),
    ];
    const shared = this.#effective('character_dialogue', customCharacter);
    const entries = definitions.map(({ id, label, scope }) => {
      const saved = this.#read(id);
      const inheritsFrom = FUNCTION_IDS.has(id) ? null : 'character_dialogue';
      return {
        id, label, scope, defaultPrompt: defaultAgentPrompt(id), overridePrompt: saved.prompt,
        effectivePrompt: saved.prompt ?? (inheritsFrom ? shared : defaultAgentPrompt(id)),
        version: saved.version, source: saved.prompt !== null ? 'override' : inheritsFrom ? 'inherited' : 'default',
        inheritsFrom,
      };
    });
    return { version: CATALOG_VERSION, maxPromptLength: MAX_PROMPT_LENGTH, customCharacter, entries };
  }

  catalog(options = {}) {
    return safely(() => this.#catalog(context(options)));
  }

  resolve(id, options = {}) {
    return safely(() => this.#effective(id, context(options)));
  }

  update(input, options = {}) {
    return safely(() => {
      const customCharacter = context(options);
      const fields = record(input, ['id', 'expectedVersion', 'prompt']);
      const id = target(fields.id, customCharacter);
      if (!integer(fields.expectedVersion)) fail();
      const nextPrompt = prompt(fields.prompt);
      const previous = this.#read(id);
      if (previous.version !== fields.expectedVersion) fail('STALE_PROMPT');
      const version = previous.version + 1;
      if (!integer(version, 1)) fail();
      const result = previous.version === 0
        ? this.#db.prepare('INSERT INTO prologue_agent_prompts (id, version, prompt) VALUES (?, ?, ?) ON CONFLICT(id) DO NOTHING')
          .run(id, version, nextPrompt)
        : this.#db.prepare('UPDATE prologue_agent_prompts SET version = ?, prompt = ? WHERE id = ? AND version = ?')
          .run(version, nextPrompt, id, fields.expectedVersion);
      if (result.changes !== 1) fail('STALE_PROMPT');
      return this.#catalog(customCharacter);
    });
  }
}

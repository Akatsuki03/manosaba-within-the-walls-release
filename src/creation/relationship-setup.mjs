import { createHash } from 'node:crypto';
import { RELATIONSHIP_RUNTIME_REVISION, relationshipCanonicalJson } from '../content/relationship-context-policy.mjs';
import { isDeepStrictEqual } from 'node:util';
import { normalizeCreation } from '../../public/player-creation-rules.mjs';
import { psychologySeedBlueprint } from '../cognition/psychology-profile.mjs';
import { v2OpeningKnowledge, V2_CHARACTER_CELL_OPENINGS } from '../world/prison-bunks-v2.mjs';

// HOST_ONLY, no IO/DB/registration. Callers supply registered runtime and actual
// physical actors. This is a projection, not proof of a DB-issued root/seal.
export const RELATIONSHIP_SOURCE_VERSION = 'relationship-source-adaptation@1';
const FILE = 'src/relationship-setup.mjs';
const SCENARIO_FILE = 'data/agent-scenario.json';
const SCENARIO_PIN = '33f2062f4ca0611e043be63a6996c47d522788dc2e1505fcea5e16571df93c24';
const PSYCHOLOGY_PIN = 'fc9140aced6f81c29fc2f867c65534c7137c3ec437222128b15878bb7671df83';
const CARD_PIN = 'c0362726876ab500b6bb474b356003081a0406d82fd3b26fc1cacbc23de0d4c6';
const GREETING_PINS = ['c74bd1a35fb8e1612bf57cf9b7a36716fafa6899dda8beb29b66568c906c57f9',
  'e9a19b9baa649e3fc8c155e55df26ccc62a4e9f86514bc11c5def75b226b60e0',
  '3fc47f0ff3701073db68e171282564eafc79f16691ea215d69e776774124a7b1'];
const PRIVATE_RULES = [{"ownerId":"emma","pointer":"/actors/0/initialKnowledge/1","index":1,"before":"我与二阶堂希罗曾是初中好友；她后来疏远了我，我不明白原因，仍希望能重新做朋友。","after":""},{"ownerId":"hiro","pointer":"/actors/1/initialKnowledge/0","index":0,"before":"艾玛是我初中的旧识，我现在不愿与她亲近；没有同意恢复朋友关系。","after":""},{"ownerId":"hiro","pointer":"/actors/1/initialKnowledge/1","index":1,"before":"我曾与艾玛、月代雪是朋友。出国留学前，我把受到霸凌的小雪托付给艾玛；回来后得知小雪去世，并认为艾玛为自保而旁观。这是我怨恨艾玛的原因，也是我不愿主动提起的私事。","after":"我曾与月代雪是朋友。我曾出国留学；回来后得知受到霸凌的小雪去世，这是我不愿主动提起的私事。"}];
const PROFILE_RULES = [{"ownerId":"emma","pointer":"/actors/0/conflicts/0","field":"conflicts","index":0,"before":"希望接近旧友，却害怕再次被讨厌","after":"希望与人建立联系，同时害怕被讨厌"},{"ownerId":"hiro","pointer":"/actors/1/conflicts/0","field":"conflicts","index":0,"before":"仍在意旧友，却对自己认定的背弃保留积怨","after":"在意重要的关系，也不愿轻率放下自己对责任的判断"},{"ownerId":"emma","pointer":"/actors/0/beliefs/1/summary","field":"beliefs","index":1,"before":"我仍把希罗当成珍视的旧友；她疏远我的原因对我仍不清楚，不能把想重新做朋友当成她已经同意。","after":null},{"ownerId":"hiro","pointer":"/actors/1/beliefs/0/summary","field":"beliefs","index":0,"before":"我仍把小雪离世与艾玛当年的旁观联系起来，认为她为自保背弃了托付；这是我的归责与积怨，不代表客观裁决。","after":"我仍记得小雪是我的旧友，留学归来后得知她已离世；这段私事不主动公开。"}];
const ROOM_ROWS = [{"ownerId":"emma","pointer":"/actors/0/initialKnowledge/4","index":4,"before":"我在石砌牢房的下铺，认得上铺坐起的人是希罗。铁栅栏门没有打开，墙上的屏幕没有亮；尚未听到任何说明。"},{"ownerId":"hiro","pointer":"/actors/1/initialKnowledge/5","index":5,"before":"我刚在陌生牢房的上铺坐起，认出了下铺的艾玛；门仍关闭，屏幕未亮。我还没有得到关于这里的说明，也不认识其他被关进来的少女。"},{"ownerId":"anan","pointer":"/actors/2/initialKnowledge/3","index":3,"before":"我刚在一间石砌牢房醒来，同室有位白色双马尾、带彩色挑染的少女；我们还没有交换姓名。我不知道其他人的身份，也没有得到这里的说明。"},{"ownerId":"noah","pointer":"/actors/3/initialKnowledge/4","index":4,"before":"我刚醒在石砌牢房里，同室有位银白长发、抱着笔记工具的少女；还不知道她的名字，也不知道为什么会在这里。"},{"ownerId":"leia","pointer":"/actors/4/initialKnowledge/4","index":4,"before":"我在封闭的石砌牢房里醒来，同室有位金色长卷发、穿黑白裙装的少女；尚未互报姓名，也没有收到关于监禁原因的说明。"},{"ownerId":"milia","pointer":"/actors/5/initialKnowledge/4","index":4,"before":"我在陌生牢房醒来，同室有位亚麻短发、打扮如骑士的少女。她还没有告诉我姓名，我也未听到这里的说明。"},{"ownerId":"margo","pointer":"/actors/6/initialKnowledge/4","index":4,"before":"我刚在石砌牢房里醒来，同室有个戴飞行员帽、左臂缠绷带的少女；尚不知她的姓名，也未收到任何说明。"},{"ownerId":"nanoka","pointer":"/actors/7/initialKnowledge/5","index":5,"before":"我在石砌牢房里，同室有位黑色短发、戴紫色面纱小帽的少女；我们还没有交换姓名。我不知道她的能力或来历。"},{"ownerId":"alisa","pointer":"/actors/8/initialKnowledge/4","index":4,"before":"我在陌生的石砌牢房中醒来，同室有个水蓝发、戴侦探帽的少女；我还不知道她的姓名，也未获知监禁原因。"},{"ownerId":"sherry","pointer":"/actors/9/initialKnowledge/4","index":4,"before":"我不喜欢扮家人游戏。现在刚在陌生牢房醒来，同室有位戴黑口罩、穿黑红斗篷的少女，还未互报姓名；眼前没有已知案件。"},{"ownerId":"hanna","pointer":"/actors/10/initialKnowledge/4","index":4,"before":"我刚在石砌牢房醒来，同室有位黑发带橙色挑染、戴猫耳耳机的少女；我还不知道她的姓名，也没有听过这里的正式说明。"},{"ownerId":"coco","pointer":"/actors/11/initialKnowledge/4","index":4,"before":"我刚在石砌牢房醒来，同室有个米金色双马尾、穿墨绿玫瑰裙的少女；我们还没有互报姓名，我也未得到这里的说明。"},{"ownerId":"meruru","pointer":"/actors/12/initialKnowledge/4","index":4,"before":"我在这排石砌牢房最里面的一间，当前独自待着；尚未与本批其他少女互报姓名，也未发生公开说明。"}];
const CARD_RULES = [{"greetings":[0,1],"blockIndex":20,"before":"艾玛总算看清了那人的面貌，随之而来的则是吃惊，甚至瞬间忘记了呼吸。因为，她认识这位说话的少女。真的假的......是二阶堂希罗......？二阶堂希罗——是在艾玛的初中时代，令她深陷黑暗的同窗，也是广受众人仰慕，常在人群中心可爱地微笑着的少女......和她对上眼的希罗，也大大地瞪圆了眼睛。艾玛还是第一次见有人把眼睛瞪得那么大。","after":"艾玛终于看清上铺少女的面貌，和她对上了目光。"},{"greetings":[0,1],"blockIndex":24,"before":"往日同窗竟出现在眼前，惊慌失措的艾玛哑口无言。","after":"眼前的处境让艾玛一时间哑口无言。"},{"greetings":[0,1],"blockIndex":28,"before":"艾玛鼓起勇气，尝试向往日旧识搭话。","after":"艾玛鼓起勇气，尝试向同室的少女搭话。"},{"greetings":[0,1],"blockIndex":40,"before":"——唰。她用力地甩开了艾玛的手。","after":"她留意到手臂被抓住，转头看向过道。"},{"greetings":[0,1],"blockIndex":41,"before":"不要随便碰我。你可别忘了，我讨厌你。","after":"先松开一下，我想看清外面的情况。"},{"greetings":[0,1],"blockIndex":42,"before":"忽视了还是一脸惊恐的艾玛，希罗的眼神中透着一股深深的厌弃。","after":"希罗看着过道，艾玛仍留意着眼前的动静。"},{"greetings":[0,1],"blockIndex":42,"before":"希罗也不再管艾玛，走了出去。","after":"希罗向过道走去。"},{"greetings":[0,1],"blockIndex":44,"before":"除了希罗，艾玛并未见过这些少女。","after":"艾玛看向过道上的少女们，尚不知道她们眼下的经历。"},{"greetings":[0,1],"blockIndex":46,"before":"希罗并没有停下脚步，目光也依旧放在一边。","after":"希罗继续向过道前方走去。"},{"greetings":[0,1],"blockIndex":47,"before":"听、听我说。虽然发生了这样那样的事，不过还能见到希罗你，真是太好了。我已经下定决心改变了，已经不是过去的我了。我想和你做朋友。","after":"听、听我说，我们先弄清楚这里的情况，好吗？"},{"greetings":[0,1],"blockIndex":48,"before":"希罗似乎决意要无视艾玛，没有放慢脚步。","after":"希罗继续留意前方，没有放慢脚步。"},{"greetings":[0,1],"blockIndex":49,"before":"我，我不会放弃的！","after":"等、等一下！"},{"greetings":[0,1],"blockIndex":50,"before":"艾玛鼓足气向希罗宣告，却听到了希罗发出咬牙切齿的声音，转过身来面向艾玛。然后，毫不犹豫的推了艾玛一下。艾玛当即摔倒在地，膝盖擦在坚硬的石地板上。而动手伤人的希罗正恶狠狠地俯视着艾玛。","after":"艾玛快步追向前方，留意着坚硬的石地板与看守的动静。"},{"greetings":[0,1],"blockIndex":51,"before":"你改变了，跟我有什么关系？我讨厌你的事实不会改变。永远不会。","after":"先跟上队伍，别落在后面。"},{"greetings":[0,1],"blockIndex":52,"before":"希罗凶巴巴地说道，然后转身离去。","after":"希罗说完，继续向前走去。"},{"greetings":[0,1],"blockIndex":54,"before":"艾玛也顾不得膝盖，再度朝着希罗追去......","after":"艾玛继续向前走去......"},{"greetings":[2],"blockIndex":11,"before":"在绞索圆环的彼端，我看见了造就这个错误世界的罪魁祸首——樱羽艾玛。","after":""},{"greetings":[2],"blockIndex":19,"before":"当艾玛抓住铁栅栏大喊时，四周几乎同时响起了少女们夹杂着尖叫的声音。吵死了喧闹声让我心烦意乱。为了让自己冷静下来，我深深地吸了一口气。我早已知道，和我同室的是艾玛；我早已知道，我会和最不想见到的人再会。已经是第二次了，我不会有丝毫动摇。没事，我能做出正确行动——即使看到她那张脸，我也能保持冷静\r\n\r\n我坐起身，轻盈地从床上一跃而下。","after":"当艾玛抓住铁栅栏大喊时，四周几乎同时响起了少女们夹杂着尖叫的声音。吵死了喧闹声让我心烦意乱。为了让自己冷静下来，我深深地吸了一口气。已经是第二次经历，我仍要以眼前实际见闻保持冷静。\r\n\r\n我坐起身，轻盈地从床上一跃而下。"},{"greetings":[2],"blockIndex":23,"before":"尽管这样说了，艾玛依旧发出欸欸的惊疑......本以为自己可以保持平静，但心里还是不由得泛起了波澜。为什么你又出现在我面前。心中涌起焦躁，难以忍受的窒息感使得我从艾玛身上移开视线。","after":"尽管这样说了，艾玛依旧发出欸欸的惊疑。"},{"greetings":[2],"blockIndex":27,"before":"还有，最重要的是——与艾玛的再会。","after":""},{"greetings":[2],"blockIndex":31,"before":"脸色苍白的艾玛紧紧抓住了我的手臂。涌上一股甩开她的冲动。但我还是忍下来了，决定暂时按兵不动。我眯起眼睛，仔细观察着看守。不出所料，那显然是某种非人的东西......现在只能接受现实。反抗那个怪物是错误的。等到看守从我们身边经过后，我才不动神色地挣脱了艾玛的手，然后独自一人走向过道。","after":"脸色苍白的艾玛紧紧抓住了我的手臂。我决定暂时按兵不动，仔细观察看守。不出所料，那显然是某种非人的东西......现在只能接受现实。反抗那个怪物是错误的。等到看守从我们身边经过后，我松开艾玛的手，向过道走去。"},{"greetings":[2],"blockIndex":36,"before":"居然在这种地方遇到你，我真的吓了一跳......","after":"这里到底是怎么回事......"},{"greetings":[2],"blockIndex":40,"before":"虽然发生了很多事，我们能不能还像以前那样做朋友......","after":"我们先弄清楚接下来该往哪里走......"},{"greetings":[2],"blockIndex":41,"before":"为什么还不闭嘴，我的表情有些失控","after":"我留意着看守与队伍的动静。"},{"greetings":[2],"blockIndex":42,"before":"抱歉，我并没有那个打算。我无法原谅你，这一点不会改变。","after":"眼下先跟着队伍走，别离看守太近。"},{"greetings":[2],"blockIndex":43,"before":"果然，这句话一说出口艾玛就变了表情，就好像我才是那个施暴者。她这副很受伤的表情，令我更加火大。","after":"艾玛的表情随着眼前的状况变化。我仍在留意看守。"},{"greetings":[2],"blockIndex":45,"before":"即使是第二次经历，还是想把她推开。我转身快步走向过道——这时。","after":"我转身快步走向过道——这时。"},{"greetings":[2],"blockIndex":46,"before":"我不会放弃的——啊、","after":"等一下——啊、"},{"greetings":[2],"blockIndex":49,"before":"这就是艾玛的本性。上次我推她的时候，她摔得很夸张，表现出的严重性比我的力道大多了。这次我甚至没有推她，她还是试图用摔倒来引起我的注意。我不会再上当了把颤抖的手紧握成拳，我无视艾玛继续往前走。随着憎恨涌上心头，我的胸口一阵阵发紧发痛。......再也不想见到她了。","after":"我记得上一轮自己曾推过她，让她摔倒。这一轮我没有推她；摔倒的原因和她的意图不能凭旧判断认定。我收紧手，继续留意前方。"}];
const fail = () => { throw Object.assign(new Error('关系初始来源或固定定位不匹配。'), { code: 'INVALID_RELATIONSHIP_SOURCE' }); };
const sha256 = text => createHash('sha256').update(text).digest('hex');
const clone = value => structuredClone(value);
const pairKey = (a, b) => JSON.stringify([a, b].sort());
const freeze = value => { if (value && typeof value === 'object' && !Object.isFrozen(value)) {
  Object.values(value).forEach(freeze); Object.freeze(value); } return value; };
const source = (file, pointer, text) => ({ file, pointer, sha256: sha256(text), knowledgeState: 'owner-known' });
// Exactly the existing psychology source/actor-view namespaces, not new global IDs.
const sourceId = (commitRef, ownerId, pointer) => `psy-${sha256(JSON.stringify(['psychology-source@1', commitRef, ownerId, pointer])).slice(0, 48)}`;
function replaceOne(text, before, after) {
  if (typeof text !== 'string' || !before || text.split(before).length !== 2) fail();
  return text.replace(before, after);
}
function derived(before, text, rule) {
  return { ...source(FILE, before.pointer, text), adaptedFrom: clone(before), ruleVersion: RELATIONSHIP_SOURCE_VERSION, rule };
}
function applicablePairs(setup, ownerId) { return setup.acquaintance.filter(row => row.actorIds.includes(ownerId)); }
const override = (setup, a, b) => setup.acquaintance.find(row => pairKey(...row.actorIds) === pairKey(a, b));
const coveredEH = setup => Boolean(override(setup, 'emma', 'hiro'));
function change(setup, ownerId, pointer, before, after, rule, from = source(SCENARIO_FILE, pointer, before)) {
  const provenance = derived(from, after, rule);
  setup.adaptations.push({ ownerId, pointer, before, after, pairs: applicablePairs(setup, ownerId).map(row => clone(row.actorIds)), source: provenance });
  return provenance;
}
function canonicalAt(setup, pointer) {
  let value = setup.runtime.content.host.scenario;
  for (const key of pointer.slice(1).split('/')) { if (!value || !Object.hasOwn(value, key)) fail(); value = value[key]; }
  if (typeof value !== 'string') fail(); return value;
}
function assertOriginal(setup, rule) { if (canonicalAt(setup, rule.pointer) !== rule.before) fail(); }

/** Fixed v1 private/default rows -> effective physical actor view. New relationship
 * bodies are deliberately NOT pushed into initialKnowledge or assessment rows. */
export function buildRelationshipSetup({ creation, runtime, actors, settingSupplement } = {}) {
  if (!isDeepStrictEqual(creation, normalizeCreation(creation)) || !runtime?.content?.ok
    || runtime.content.manifest.sources.find(row => row.file === SCENARIO_FILE)?.sha256 !== SCENARIO_PIN
    || runtime.psychology?.fingerprint !== PSYCHOLOGY_PIN || runtime.policy?.psychologicalInitialization !== 1
    || !Array.isArray(actors) || new Set(actors.map(row => row.id)).size !== actors.length) fail();
  const expectedIds = [...runtime.actors.map(row => row.id), ...(creation.playerMode === 'custom' ? ['player'] : [])];
  if (!isDeepStrictEqual([...actors.map(row => row.id)].sort(), expectedIds.sort())) fail();
  const setup = { visibility: 'HOST_ONLY', ruleVersion: RELATIONSHIP_SOURCE_VERSION, creation: clone(creation), runtime,
    settingSupplement: settingSupplement === undefined ? null : clone(settingSupplement), actors: clone(actors),
    acquaintance: [], knowledgeSources: {}, psychology: clone(runtime.psychology.actors), adaptations: [] };
  for (const [entryIndex, entry] of (creation.version === 2 ? creation.relationships : []).entries()) {
    if (entry.actorIds.some(id => !expectedIds.includes(id)) || entry.knownBy.some(id => !expectedIds.includes(id))) fail();
    for (let i = 0; i < entry.actorIds.length; i++) for (let j = i + 1; j < entry.actorIds.length; j++) {
      const actorIds = [entry.actorIds[i], entry.actorIds[j]].sort();
      const old = override(setup, ...actorIds);
      if (old && old.acquainted !== entry.acquainted) fail();
      if (old) old.entryIndexes.push(entryIndex);
      else setup.acquaintance.push({ actorIds, acquainted: entry.acquainted, entryIndexes: [entryIndex] });
    }
  }
  for (const actor of setup.actors) {
    const index = runtime.actors.findIndex(row => row.id === actor.id);
    setup.knowledgeSources[actor.id] = [];
    if (index < 0) continue;
    const canonical = runtime.content.host.scenario.actors[index];
    if (canonical.id !== actor.id || !Array.isArray(actor.initialKnowledge) || actor.initialKnowledge.length < canonical.initialKnowledge.length) fail();
    for (const [i, original] of canonical.initialKnowledge.entries()) {
      const text = actor.initialKnowledge[i]; if (typeof text !== 'string' || !text) fail();
      const pointer = `/actors/${index}/initialKnowledge/${i}`; const originalSource = source(SCENARIO_FILE, pointer, original);
      // Preserve Host physical/ability wording and its original pointer. No fake
      // run-setup pointer is invented for bunk/loop supplements or private prose.
      const bunkText = settingSupplement?.version === 2 ? v2OpeningKnowledge({ initialKnowledge: [original] })[0] : original;
      const physicalSource = text === original ? originalSource : text === bunkText
        ? { ...source('src/prison-bunks-v2.mjs', pointer, text), adaptedFrom: originalSource, settingSupplement: clone(settingSupplement) }
        : { ...derived(originalSource, text, 'existing-physical-view'), physicalProjection: true,
          ...(settingSupplement ? { settingSupplement: clone(settingSupplement) } : {}) };
      setup.knowledgeSources[actor.id].push({ text, source: physicalSource });
    }
  }
  if (coveredEH(setup)) {
    for (const rule of PRIVATE_RULES) {
      assertOriginal(setup, rule);
      const actor = setup.actors.find(row => row.id === rule.ownerId); const row = setup.knowledgeSources[rule.ownerId][rule.index];
      if (row.text !== rule.before) fail();
      row.source = change(setup, rule.ownerId, rule.pointer, row.text, rule.after, 'emma-hiro-private-pair', row.source);
      row.text = rule.after; actor.initialKnowledge[rule.index] = rule.after;
    }
    const hiro = setup.actors.find(row => row.id === 'hiro');
    const before = '对一般人保有礼节，对艾玛则明显冷淡、容易绷紧。';
    const after = '对一般人保有礼节，亲近与距离以本人实际经历形成。';
    if (!runtime.content.host.scenario.actors[1].persona.voice.includes(before)) fail();
    hiro.persona.voice = replaceOne(hiro.persona.voice, before, after);
    change(setup, 'hiro', '/actors/1/persona/voice', runtime.actors[1].persona.voice, hiro.persona.voice, 'emma-hiro-voice');
    const boundary = '不主动向陌生人讲述旧日朋友的私事，不把对艾玛的怨恨扩写成未经发生的行动。';
    const index = hiro.persona.boundaries.indexOf(boundary); if (index < 0) fail();
    hiro.persona.boundaries[index] = '不主动向陌生人讲述旧日朋友的私事，不把私人情绪扩写成未经发生的行动。';
    change(setup, 'hiro', '/actors/1/persona/boundaries/1', boundary, hiro.persona.boundaries[index], 'emma-hiro-private-boundary');
  }
  // Local acquaintance is about the ACTUAL current visible roommate, not the old
  // canonical pair or a roster. All appearance/physical/independent text stays.
  for (const rule of ROOM_ROWS) {
    assertOriginal(setup, rule);
    const actor = setup.actors.find(row => row.id === rule.ownerId); const row = setup.knowledgeSources[rule.ownerId][rule.index];
    let text = row.text;
    const roommate = setup.actors.find(other => other.id !== actor.id && other.id !== 'warden' && other.locationId === actor.locationId);
    const familiar = roommate && override(setup, actor.id, roommate.id)?.acquainted === true;
    if (coveredEH(setup) && actor.id === 'emma') {
      text = text.replace('认得上铺坐起的人是希罗', '上铺也有人坐起');
    }
    if (coveredEH(setup) && actor.id === 'hiro') {
      text = text.replace('认出了下铺的艾玛', '看见下铺也有人醒来');
      text = text.replace('也不认识其他被关进来的少女', '尚不了解其他少女的能力或经历');
    }
    if (familiar) {
      for (const [before, after] of [
        ['我们还没有交换姓名。',''], ['我们还没有交换姓名','我们按已有的相识记录识别对方'],
        ['还不知道她的名字，也不知道为什么会在这里','仍不知道为什么会在这里'],
        ['尚未互报姓名，也没有收到关于监禁原因的说明','仍没有收到关于监禁原因的说明'],
        ['她还没有告诉我姓名，我也未听到这里的说明','我仍未听到这里的说明'],
        ['尚不知她的姓名，也未收到任何说明','仍未收到任何说明'],
        ['我还不知道她的姓名，也未获知监禁原因','我仍未获知监禁原因'],
        ['还未互报姓名','还没有得到关于这里的说明'],
        ['我还不知道她的姓名，也没有听过这里的正式说明','我仍没有听过这里的正式说明'],
        ['我们还没有互报姓名，我也未得到这里的说明','我仍未得到这里的说明'],
        ['我尚不知道这位室友的姓名与经历','我尚不了解这位室友的经历'],
      ]) if (text.includes(before)) text = replaceOne(text, before, after);
    }
    if (applicablePairs(setup, actor.id).some(row => row.acquainted)) {
      text = text.replace('我不知道其他人的身份', '我仍不了解其他人的能力与经历')
        .replace('也不认识其他被关进来的少女', '尚不了解其他少女的能力或经历')
        .replace('尚未与本批其他少女互报姓名', '只按已有姓名与相识记录识别人');
    }
    if (text !== row.text) { row.source = change(setup, actor.id, rule.pointer, row.text, text, 'current-cell-acquaintance', row.source);
      row.text = text; actor.initialKnowledge[rule.index] = text; }
  }
  const emma = setup.actors.find(row => row.id === 'emma');
  if (applicablePairs(setup, 'emma').length) {
    const row = setup.knowledgeSources.emma[5];
    const expected = '除希罗之外，我还没有在这里认识其他人，不知道她们的姓名、能力或经历。';
    if (row.text !== expected) fail();
    const text = '我只按本人已经取得的姓名与相识记录识别人；仍不了解其他人的能力或经历。';
    row.source = change(setup, 'emma', '/actors/0/initialKnowledge/5', row.text, text, 'bounded-name-default', row.source);
    row.text = text; emma.initialKnowledge[5] = text;
  }
  const hiro = setup.actors.find(row => row.id === 'hiro');
  if (creation.loop === 2 && override(setup, 'emma', 'hiro')?.acquainted === false) {
    const original = '这份跨轮回忆只属于我。艾玛和其他少女各自积累眼前的见闻；此刻发生的变化仍以实际经历为准。';
    const index = hiro.initialKnowledge.indexOf(original); if (index < 0) fail();
    hiro.initialKnowledge[index] = '这份跨轮回忆只属于我。其他少女各自积累眼前的见闻；此刻发生的变化仍以实际经历为准。';
    change(setup, 'hiro', '/LOOP_TWO_HIRO/3', original, hiro.initialKnowledge[index], 'loop-two-private-name', source('src/player-setup.mjs', '/LOOP_TWO_HIRO/3', original));
  }
  if (coveredEH(setup)) for (const rule of PROFILE_RULES) {
    const profile = setup.psychology.find(row => row.actorId === rule.ownerId); const row = profile[rule.field][rule.index];
    const before = rule.field === 'beliefs' ? row?.summary : row; if (before !== rule.before) fail();
    if (rule.field === 'beliefs') {
      if (rule.after === null) profile.beliefs.splice(rule.index, 1); else row.summary = rule.after;
    } else profile[rule.field][rule.index] = rule.after;
    change(setup, rule.ownerId, rule.pointer, before, rule.after ?? '', 'pair-psychology-profile', source('data/psychology-profiles-v1.json', rule.pointer, before));
  }
  for (const profile of setup.psychology) {
    if (coveredEH(setup)) profile.relationships = profile.relationships.filter(row => !override(setup, profile.actorId, row.targetId));
    for (const row of [...profile.beliefs, ...profile.relationships]) row.sources = row.sources.map(item => {
      if (item.file !== SCENARIO_FILE || canonicalAt(setup, item.pointer) !== item.text || sha256(item.text) !== item.sha256) fail();
      const projected = setup.knowledgeSources[profile.actorId].find(entry => entry.source.pointer === item.pointer);
      if (!projected?.text) fail(); return { ...clone(projected.source), text: projected.text };
    });
  }
  for (const actor of setup.actors) {
    actor.initialKnowledge = actor.initialKnowledge.filter(Boolean);
    setup.knowledgeSources[actor.id] = setup.knowledgeSources[actor.id].filter(row => row.text);
  }
  const { runtime: registeredRuntime, ...owned } = setup;
  return Object.freeze({ ...freeze(owned), runtime: registeredRuntime });
}

/** Verify the actual immutable rows supplied by EACH owning store. This pure
 * verifier neither queries SQLite nor issues root/owner authority. In particular
 * a caller-provided source array cannot substitute for the sealed root/setup. */
export function verifyRelationshipRootRows({ run, root, setup } = {}) {
  const runFields = ['run_id', 'root_seed', 'rng_version', 'scenario_ref', 'rules_ref', 'initial_config_hash',
    'initial_setup_ref', 'random_lineage_ref', 'seed_origin', 'schema_version'];
  const commitFields = ['commit_ref', 'run_id', 'branch_id', 'parent_commit_ref', 'previous_execution_ref', 'sequence',
    'generation', 'revision', 'world_time', 'kind', 'causal_key', 'snapshot_json', 'snapshot_hash', 'story_fingerprint',
    'turn_depth', 'legacy_event_id', 'schema_version'];
  const integrity = (row, fields) => sha256(relationshipCanonicalJson(Object.fromEntries(fields.map(key => [key, row[key]]))));
  if (!run || !root || !setup || run.schema_version !== 1 || root.schema_version !== 1 || setup.schema_version !== 1
    || root.run_id !== run.run_id || setup.run_id !== run.run_id || setup.setup_ref !== run.initial_setup_ref
    || root.parent_commit_ref !== null || root.sequence !== 0 || !['initial', 'new_game'].includes(root.kind)
    || integrity(run, runFields) !== run.integrity_hash || integrity(root, commitFields) !== root.integrity_hash
    || sha256(root.snapshot_json) !== root.snapshot_hash) fail();
  const snapshot = JSON.parse(root.snapshot_json), manifest = JSON.parse(setup.manifest), configuration = JSON.parse(setup.configuration);
  const expectedConfiguration = { exampleId: snapshot.exampleId, ...(snapshot.creation ? { creation: clone(snapshot.creation) } : {}),
    ...(snapshot.customAbilitySetup ? { customAbilitySetup: clone(snapshot.customAbilitySetup) } : {}) };
  if (expectedConfiguration.creation?.character) delete expectedConfiguration.creation.character.impressionColor;
  if (snapshot.exampleId !== 'agent' || snapshot.agentRuntimeRevision !== RELATIONSHIP_RUNTIME_REVISION || snapshot.creation?.version !== 2
    || manifest.runId !== run.run_id || manifest.scenarioRef !== run.scenario_ref || manifest.rulesRef !== run.rules_ref
    || manifest.executionRevision?.revisionId !== RELATIONSHIP_RUNTIME_REVISION
    || sha256(relationshipCanonicalJson(manifest)) !== run.initial_setup_ref
    || sha256(relationshipCanonicalJson(configuration)) !== run.initial_config_hash
    || !isDeepStrictEqual(manifest.configuration, configuration) || !isDeepStrictEqual(configuration, expectedConfiguration)
    || !isDeepStrictEqual(manifest.settingSupplement, snapshot.settingSupplement)) fail();
  return { snapshot, manifest, context: { commitRef: root.commit_ref, runId: run.run_id, setupRef: run.initial_setup_ref } };
}

/** Apply only the root default delta. Later lawful learned identities must be
 * unioned by the caller AFTER this one-time root result, never filtered again. */
export function initialRelationshipKnownIds(setup, ownerId, initialIds) {
  if (!setup.actors.some(row => row.id === ownerId) || !Array.isArray(initialIds)) fail();
  const result = new Set(initialIds);
  for (const row of applicablePairs(setup, ownerId)) {
    const target = row.actorIds.find(id => id !== ownerId);
    if (row.acquainted) result.add(target); else result.delete(target);
  }
  result.delete(ownerId); return [...result];
}

/** Both Domain writer and independent Decision validator must reconstruct this
 * from their own SAME verified manifest/runtime/physical actors. rootContext is
 * Host-attested REAL opaque IDs, not minted or DB-validated by this pure leaf. */
export function relationshipOwnerBlueprint(setup, ownerId, { commitRef, runId, setupRef } = {}) {
  if (![commitRef, runId, setupRef].every(value => typeof value === 'string' && value.length > 0 && value.length <= 160)
    || !/^[a-f0-9]{64}$/u.test(setupRef)) fail();
  const actor = setup.actors.find(row => row.id === ownerId); if (!actor) fail();
  let initial;
  if (ownerId === 'player') {
    const value = setup.creation.character?.desire; if (typeof value !== 'string' || !isDeepStrictEqual(actor.persona.values, value ? [value] : [])) fail();
    const pointer = '/creation/character/desire'; const id = sourceId(commitRef, ownerId, pointer);
    initial = { goals: value ? [{ value, sourceObservationIds: [id] }] : [], beliefs: [], relationships: [],
      observations: value ? [{ id, ownerId, text: value, source: source('run-setup', pointer, value) }] : [] };
  } else {
    // Derivative seed inputs carry no copied execution/package/profile identity.
    initial = clone(psychologySeedBlueprint({ policy: { psychologicalInitialization: 1 },
      actors: setup.runtime.actors, psychology: { actors: setup.psychology } }, actor, commitRef));
    for (const observation of initial.observations) {
      const projected = setup.knowledgeSources[ownerId].find(row => row.source.pointer === observation.source.pointer);
      if (projected) observation.source = clone(projected.source);
    }
  }
  const relationshipObservationIds = [];
  for (const [entryIndex, entry] of (setup.creation.version === 2 ? setup.creation.relationships : []).entries()) {
    if (!entry.knownBy.includes(ownerId)) continue;
    const pointer = `/creation/relationships/${entryIndex}/text`; const id = sourceId(commitRef, ownerId, pointer);
    initial.observations.push({ id, ownerId, text: entry.text, source: { ...source('run-setup', pointer, entry.text),
      ruleVersion: RELATIONSHIP_SOURCE_VERSION, entryIndex } });
    relationshipObservationIds.push(id);
  }
  // Text does not manufacture an initial belief, affinity score or pair row.
  return freeze({ ...initial, relationshipObservationIds, root: { commitRef, runId, setupRef } });
}

const HIRO_TO_EMMA = '面对艾玛：她是曾经的初中好友，这份旧识让每次靠近都牵动积怨。你出国前把小雪（月代雪）托付给她；归来得知小雪去世，认定艾玛为自保而旁观霸凌，因而怨恨她。这是你自己的私人旧事与判断，只作表演潜台词，留在心中。\n和她待在一起时冷淡、紧绷、克制，以收住的目光、停顿或生硬措辞表达排斥亲近。对她的善意、关心或道歉，回应仍带着积怨与戒备；眼前问题可以得到具体答复，必要时也可有限合作，友谊的修复需要实际交流逐渐积累。你从不主动提起小雪，不借动作旁白泄露往事，不替艾玛解释记忆、动机或内心。每次回应紧扣她这次的话与眼前处境，关系随真实相处发展。';
const EMMA_TO_HIRO = '面对希罗：她是曾经的初中好友；你不明白她后来疏远你的缘由，仍盼望挽回友谊。开朗里可以有试探、讨好、受冷落后的停顿与委屈；自己无法回忆的原因保持空白，希罗的心意以她实际表达的态度为准。';
const EMMA_PLAYER_FRAGMENT = '她珍惜与希罗过去的友谊，却不清楚被疏远的原因，失去的记忆保持空白。';
const EMMA_PLAYER = '艾玛的表现底色：温柔，中文自称我；怕孤单、怕被讨厌，会努力开朗、亲近和讨好。动作有些笨拙，真想帮人时聪明、能观察细节，遇到冷遇仍有韧性，也会委屈和迟疑。她珍惜与希罗过去的友谊，却不清楚被疏远的原因，失去的记忆保持空白。讨好、继续追问、偏袒或原谅等选择均由玩家明确决定。';
const HIRO_OTHER = '面对眼前初识者时，保持克制的礼节与距离，按实际言行判断。针对旧识的积怨留在那段关系里；眼前的来访者从初识开始，信任、疏远与亲近随着本人实际经历的交往逐渐变化。';
function projectGuidance(setup, input, changes) {
  let text = input.value; if (typeof text !== 'string') fail();
  const apply = (before, after, pointer) => { const component = pointer === '/EMMA_PLAYER' ? EMMA_PLAYER : before;
    if (!text.includes(component)) fail(); const projected = replaceOne(component,before,after);
    changes.push({ ownerId: input.ownerId, pointer, before: component, after: projected,
      source: derived(source('src/persona-guidance.mjs', pointer, component), projected, 'fixed-guidance-pair') });
    text = replaceOne(text,component,projected); };
  if (input.kind === 'player-guidance' && input.ownerId === 'emma' && coveredEH(setup))
    apply(EMMA_PLAYER_FRAGMENT, '她对孤独与拒绝的敏感仍在，失去的记忆保持空白；与眼前人物的关系以本局来源和实际相处为准。', '/EMMA_PLAYER');
  if (input.kind === 'roleplay-guidance' && !input.evolving) {
    if (coveredEH(setup) && input.ownerId === 'hiro' && input.targetId === 'emma') apply(HIRO_TO_EMMA,
      '面对眼前的人：保留本人端正克制的性格；是否相识以本局初始来源和后来真实经历为准，不沿用旧关系的固定亲近、冷淡或归责。私人过去留在本人心中，不借动作旁白泄露，也不替对方解释记忆、动机或内心。每次回应紧扣这次的话与眼前处境，关系随实际相处发展。', '/HIRO_TO_EMMA');
    else if (coveredEH(setup) && input.ownerId === 'emma' && input.targetId === 'hiro') apply(EMMA_TO_HIRO,
      '面对眼前的人：保留本人怕孤单、怕被讨厌而努力开朗的底色；失去的记忆保持空白，不替对方决定亲密、接受或承诺，关系以本局来源和本人实际经历为准。', '/EMMA_TO_HIRO');
    else if (input.ownerId === 'hiro' && input.targetId !== 'emma' && (coveredEH(setup) || override(setup, 'hiro', input.targetId)))
      apply(HIRO_OTHER, `面对眼前的人时，保留本人克制的礼节，按实际言行判断；是否相识以本局来源和实际经历为准。${coveredEH(setup) ? '私人往事留在本人心中，不给眼前的人强加旧关系。' : '针对旧识的积怨留在那段关系里，不强加给眼前的人。'}信任、疏远与亲近随本人实际经历的交往逐渐变化。`, '/roleplayGuidance/relationship/hiro-other');
  } else if (input.evolving && [HIRO_TO_EMMA, EMMA_TO_HIRO, HIRO_OTHER].some(fragment => text.includes(fragment))) fail();
  return text;
}
const FIRST_SPEAKERS = ['emma','emma','emma','emma','hanna','coco','alisa','hiro','hiro','hiro','emma','hiro','emma','warden','emma','emma','emma','coco','hiro','hiro','emma','emma','emma','emma','hiro','emma'];
const SECOND_SPEAKERS = ['hiro','hiro',null,'hiro','emma','emma','hiro','hiro','hiro','warden','emma','emma','coco','emma','emma','hiro','emma','hiro','hiro','emma','emma'];
function projectCard(setup, input, changes) {
  const original = input.value; const index = original?.index;
  if (![0,1,2].includes(index) || input.ownerId !== (index === 2 ? 'hiro' : 'emma')
    || original.source?.pointer !== `/data/alternate_greetings/${index}` || original.source.sha256 !== GREETING_PINS[index]) fail();
  const declaration = setup.runtime.content.host.scenario.provenance.source;
  const cardFile = declaration.repositoryCopy;
  const pin = setup.runtime.content.manifest.sources.find(row => row.file === cardFile);
  if (declaration.sha256 !== CARD_PIN || pin?.sha256 !== CARD_PIN || !Array.isArray(original.blocks)) fail();
  const raw = original.blocks.map(row => row.sourceText).join(''); if (sha256(raw) !== GREETING_PINS[index]) fail();
  let cursor = 0; let quote = 0; const speakers = index === 2 ? SECOND_SPEAKERS : FIRST_SPEAKERS;
  const corridor = raw.indexOf(index === 2 ? '“呀啊啊啊！怪物别碰我！好恶心！好了，好了啦，我走就是！！”我看到泽渡可可' : '艾玛马上跟在希罗身后，来到过道上。');
  const awake = raw.indexOf(index === 2 ? '——我眨眨眼' : '“不对！”'); if (corridor < 0 || awake < 0) fail();
  for (const block of original.blocks) {
    const quoted = /^“[^”]*”$/u.test(block.sourceText); const speaker = quoted ? speakers[quote++] : null;
    const kind = block.sourceText.startsWith('<img') ? 'image' : quoted && speaker ? 'dialogue' : 'narration';
    const text = kind === 'image' ? '' : (kind === 'dialogue' ? block.sourceText.slice(1,-1) : block.sourceText).replace(/\*/gu,'').trim();
    if (block.start !== cursor || block.end !== cursor + block.sourceText.length || block.kind !== kind || block.speakerId !== speaker
      || block.text !== text || block.memory !== (block.end <= awake) || block.stage !== (block.start >= corridor ? 'corridor' : 'cell')) fail();
    cursor = block.end;
  }
  if (quote !== speakers.length) fail();
  const result = clone(original);
  const spanSource = (blockIndex, rendered) => ({ ...source(cardFile,original.source.pointer,raw),
    span: { start: original.blocks[blockIndex].start, end: original.blocks[blockIndex].end, blockIndex },
    renderedSha256: sha256(rendered) });
  if (coveredEH(setup)) for (const rule of CARD_RULES.filter(row => row.greetings.includes(index))) {
    const block = result.blocks[rule.blockIndex]; const before = block?.text; block.text = replaceOne(before, rule.before, rule.after);
    const pointer = `${original.source.pointer}/blocks/${rule.blockIndex}/text`;
    changes.push({ ownerId: input.ownerId, pointer, before, after: block.text,
      source: derived(spanSource(rule.blockIndex,before), block.text, 'pinned-card-pair') });
  }
  if (index !== 2 && !coveredEH(setup) && applicablePairs(setup, 'emma').some(row => row.acquainted)) {
    const block = result.blocks[44]; const before = block.text;
    block.text = replaceOne(before, '除了希罗，艾玛并未见过这些少女。', '艾玛看向过道上的少女们，尚不知道她们眼下的经历。');
    const pointer = `${original.source.pointer}/blocks/44/text`;
    changes.push({ ownerId:input.ownerId,pointer,before,after:block.text,source:derived(spanSource(44,before),block.text,'pinned-card-known-default') });
  }
  const falseTargets = applicablePairs(setup, input.ownerId).filter(row => !row.acquainted).map(row => row.actorIds.find(id => id !== input.ownerId));
  for (const [i, block] of result.blocks.entries()) {
    let text = block.text;
    for (const targetId of falseTargets) {
      const actor = setup.runtime.actors.find(row => row.id === targetId); if (!actor) continue;
      const alias = targetId === 'emma' ? '艾玛' : targetId === 'hiro' ? '希罗' : targetId === 'coco' ? '可可' : null;
      if (block.kind === 'dialogue') {
        if (index !== 2 && targetId === 'hiro' && [27,35,43,45].includes(i)) text = ({27:'我、我说......',35:'那、那个......',43:'等、等我一下！',45:'等一下！'})[i];
        if (index === 2 && targetId === 'emma' && i === 20) text = '啊，你也醒了。';
        if (index === 2 && targetId === 'emma' && i === 30) text = '那、那个......';
        if (index === 2 && targetId === 'emma' && i === 34) text = '等、等我一下！';
      } else {
        const label = targetId === 'hiro' ? '那位少女' : targetId === 'emma' ? '下铺的少女' : '过道上的少女';
        text = text.replaceAll(actor.name, label); if (alias) text = text.replaceAll(alias, label);
      }
    }
    if (index === 2 && falseTargets.length && i === 33) text = replaceOne(text, '所有人的名字，我都已经记在脑子里了。',
      '上一轮听到的名字仍在我的记忆里；这些记忆不等于本轮已经与眼前每个人相识。');
    if (text !== block.text) { const pointer = `${original.source.pointer}/blocks/${i}/text`;
      changes.push({ ownerId: input.ownerId, pointer, before: block.text, after: text,
        source: derived(spanSource(i,block.text), text, 'pinned-card-name-default') }); block.text = text; }
  }
  if (changes.length) result.source = derived(source(cardFile, original.source.pointer, raw), result.blocks.map(row => row.text).join('\n'), 'pinned-card-effective-render');
  return result;
}

/** Project only fixed authored source surfaces. Returned sourceText remains
 * HOST_ONLY raw provenance; render/pack ONLY the effective .text fields. */
export function projectRelationshipSource(setup, input) {
  if (!setup.actors.some(row => row.id === input?.ownerId)) fail(); const changes = []; let value;
  if (['roleplay-guidance','player-guidance'].includes(input.kind)) value = projectGuidance(setup, input, changes);
  else if (input.kind === 'card-opening') value = projectCard(setup, input, changes);
  else if (input.kind === 'canonical-opening') {
    if (input.ownerId !== 'emma' || !isDeepStrictEqual(input.value, setup.runtime.content.host.scenario.opening)) fail(); value = clone(input.value);
    if (coveredEH(setup)) { const before = value[1].text; value[1].text = replaceOne(before, '你认得她——曾经的同学二阶堂希罗。',
      override(setup,'emma','hiro').acquainted ? '你认得上铺的少女。' : '上铺也有人醒着。');
      changes.push({ ownerId:'emma', pointer:'/opening/1/text', before, after:value[1].text, source:derived(source(SCENARIO_FILE,'/opening/1/text',before),value[1].text,'canonical-opening-pair') }); }
  } else if (input.kind === 'cell-opening') {
    // An original character's prose is never a replacement occupant's persona.
    const slotId = input.slotId || input.ownerId;
    if (slotId !== input.ownerId || !Object.hasOwn(V2_CHARACTER_CELL_OPENINGS, slotId)
      || !isDeepStrictEqual(input.value, V2_CHARACTER_CELL_OPENINGS[slotId])) fail();
    value = clone(input.value);
    const apply = (index, before, after) => { const old = value[index]; value[index] = replaceOne(old,before,after);
      const pointer = `/V2_CHARACTER_CELL_OPENINGS/${slotId}/${index}`;
      changes.push({ ownerId:input.ownerId,pointer,before:old,after:value[index],
        source:derived(source('src/prison-bunks-v2.mjs',pointer,old),value[index],'fixed-cell-opening') }); };
    if (coveredEH(setup) && slotId === 'hiro') apply(3,
      '我的目光越过上铺床沿往下落去，呼吸却在看清下铺之人的那一刻骤然收紧。白发发尾泛着樱花粉，头戴黑缎带贝雷帽的少女正待在下铺——是樱羽艾玛。最不愿再见到的人，偏偏出现在同一间牢房里。我收回险些外露的情绪，只冷冷地垂眸看着下铺的方向。',
      '我的目光越过上铺床沿往下落去。白发发尾泛着樱花粉、头戴黑缎带贝雷帽的少女正待在下铺。我收回目光，留意着眼前的动静。');
    const actor = setup.actors.find(row => row.id === input.ownerId);
    const roommate = setup.actors.find(row => row.id !== actor.id && row.id !== 'warden' && row.locationId === actor.locationId);
    const familiar = roommate && override(setup,actor.id,roommate.id)?.acquainted === true;
    const unknown = {
      alisa: ['我不认识她，更没兴趣被人居高临下地盯着看','我更没兴趣被人居高临下地盯着看'],
      margo: ['我还不知道这位小室友叫什么名字，','我留意着这位小室友，'],
      nanoka: ['我不认识她，也不清楚她的底细。','我并不清楚她的底细。'],
      anan: ['我还不知道她的名字，只觉得','我只觉得'],
      noah: ['我还不知道她叫什么名字呢。','我留意着上铺的动静。'],
      leia: ['我们还素不相识，但既然被分在同一间牢房里','既然被分在同一间牢房里'],
      milia: ['我还不知道她的名字，也不清楚','我还不清楚'],
      coco: ['我不认识这位打扮得跟大小姐似的室友，也不知道她到底是什么来路','我还不知道这位打扮得跟大小姐似的室友眼下是什么来路'],
      hanna: ['我还不晓得她的名字，但既然同处一室，就更不能在陌生人面前丢了体面。','既然同处一室，就更不能轻易丢了体面。'],
    };
    if (familiar && unknown[slotId]) apply(3,...unknown[slotId]);
    if (slotId === 'meruru' && applicablePairs(setup,'meruru').some(row => row.acquainted)) apply(2,
      '像普通的同伴一样同她们「初次见面」、听大家逐一报出名字',
      '像普通的同伴一样与大家见面、听她们实际介绍自己');
  } else fail();
  return freeze({ value, adaptations: changes });
}

import { createHash } from 'node:crypto';
import { cellSetupLayout } from '../../public/cell-setup-rules.mjs';

// HOST_ONLY provenance. These references establish this project's authored
// layout, not roleplay memories, dialogue, prior acquaintance or future events.
const freeze = value => { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };
export const CURRENT_BUNK_SUPPLEMENT_ID = 'prison-bunks@2';
export const BUNK_SETTING_V2 = freeze({
  id: CURRENT_BUNK_SUPPLEMENT_ID, version: 2,
  rooms: {
    cell01: { code: 'CELL_01', upper: 'sherry', lower: 'alisa', source: 'project-setting' },
    cell02: { code: 'CELL_02', upper: 'margo', lower: 'nanoka', source: 'project-setting' },
    cell: { code: 'CELL', upper: 'hiro', lower: 'emma', source: 'original-text' },
    cell04: { code: 'CELL_04', upper: 'anan', lower: 'noah', source: 'project-setting' },
    cell05: { code: 'CELL_05', upper: 'leia', lower: 'milia', source: 'project-setting' },
    cell06: { code: 'CELL_06', upper: 'coco', lower: 'hanna', source: 'project-setting' },
  },
  singleRoom: { id: 'cell07', code: 'CELL_07', owner: 'meruru', bunk: null },
  sourceVisibility: 'HOST_ONLY',
  references: [
    { classification: 'original-text', room: 'cell', file: 'Act01_Chapter01_全剧情.txt',
      sections: ['0101Adv02_Narrative004', '0101Adv02_Narrative021'],
      corroboration: 'Act02_Chapter01_全剧情.txt:0201Adv03_Narrative004/006' },
    { classification: 'fan-reference', room: 'cell04', author: '幻空燕', title: '【同人小說】初識（夏目安安 & 城崎諾亞）- 魔法少女的魔女審判',
      date: '2025-10-29', url: 'https://home.gamer.com.tw/artwork.php?sn=6233465',
      verification: 'Parent agent reports reading the full page and confirming Anan upper / Noah lower.' },
    { classification: 'fan-reference', room: 'cell01', author: '路地裏', title: 'ヤマアラシのランデヴー',
      url: 'https://www.pixiv.net/novel/show.php?id=26438682', scope: 'Sherry owns the upper bunk; Alisa is her roommate.' },
    { classification: 'fan-reference', room: 'cell01', author: 'りょうちゃん',
      url: 'https://www.pixiv.net/novel/show.php?id=27065040', scope: 'Alisa lies in the lower bunk.' },
    { classification: 'fan-reference', room: 'cell02', author: '或秋光暗', title: '二段ベッドの軋む音がした。',
      url: 'https://www.pixiv.net/novel/show.php?id=27552292', scope: 'Margo upper / Nanoka lower.' },
    { classification: 'fan-reference', room: 'cell02', author: 'オギ', title: '決意',
      url: 'https://www.pixiv.net/novel/show.php?id=29207414', scope: 'Margo upper / Nanoka lower.' },
    { classification: 'user-resolution', room: 'cell02', scope: 'User explicitly chose Margo upper / Nanoka lower; an opposing X fan-roleplay account placing Margo lower was not adopted.' },
    { classification: 'fan-reference', rooms: ['cell05', 'cell04'], author: 'タングステンZ@なれはて',
      url: 'https://www.pixiv.net/novel/show.php?id=25875070', scope: 'Leia upper, Anan upper / Noah lower.' },
    { classification: 'fan-reference', room: 'cell05', author: 'Newbie', title: '第9話',
      url: 'https://www.pixiv.net/novel/show.php?id=28965512', scope: 'Leia upper / Milia lower.' },
    { classification: 'fan-reference', room: 'cell06', author: 'ゆっくりージュ',
      urls: ['https://www.pixiv.net/novel/show.php?id=29408399', 'https://www.pixiv.net/novel/show.php?id=29392539'], scope: 'Coco upper / Hanna lower.' },
  ],
  adaptation: 'User-selected project setting. Reference research was performed by the parent agent; only the physical layout is used, in new wording. No source dialogue, storyline, acquaintance or future knowledge is imported.',
  prose: { owner: '我睡这张双层床的{bunk}。', layout: '靠墙的一张双层床上下叠置，共用床架。', localOwner: '你用{bunk}。' },
  knowledgeStyle: 'in-world-opening-memory@1', openingStyle: 'in-world-room-opening@1',
});
export const BUNK_SETTING_V2_REFERENCE = freeze({ id: CURRENT_BUNK_SUPPLEMENT_ID, version: 2,
  fingerprint: createHash('sha256').update(JSON.stringify(BUNK_SETTING_V2)).digest('hex') });
export const usesBunkSettingV2 = state => state?.settingSupplement?.id === CURRENT_BUNK_SUPPLEMENT_ID;
function dynamicLayout(state) {
  return state?.creation?.cellSetup
    ? cellSetupLayout(state.creation.cellSetup, { playerMode: state.creation.playerMode, actorId: state.creation.actorId })
    : null;
}
function roomCode(room) {
  return BUNK_SETTING_V2.rooms[room]?.code
    ?? (room === BUNK_SETTING_V2.singleRoom.id ? BUNK_SETTING_V2.singleRoom.code : null);
}
export function v2OwnerBunk(state, actor, room) {
  const layout = BUNK_SETTING_V2.rooms[room];
  const code = roomCode(room);
  if (!code || !actor) return null;
  const dynamic = dynamicLayout(state);
  if (dynamic) {
    const row = dynamic[actor.id];
    return row?.cell === code ? row.bunk : null;
  }
  if (!layout || actor.locationId !== layout.code) return null;
  if (state.creation?.actorId === actor.id && state.creation.opening && state.creation.opening.locationId !== layout.code) return null;
  return layout.upper === actor.id ? '上铺' : layout.lower === actor.id ? '下铺' : null;
}
export function v2BunkKnowledge(state, actor) {
  const dynamic = dynamicLayout(state);
  if (dynamic) {
    const row = dynamic[actor?.id];
    return row?.bunk ? [BUNK_SETTING_V2.prose.owner.replace('{bunk}', row.bunk)] : [];
  }
  for (const room of Object.keys(BUNK_SETTING_V2.rooms)) {
    const bunk = v2OwnerBunk(state, actor, room);
    if (bunk) return [BUNK_SETTING_V2.prose.owner.replace('{bunk}', bunk)];
  }
  return [];
}
export function v2BunkScene(state, room, actor, original) {
  if (!BUNK_SETTING_V2.rooms[room]) return original;
  const displaced = actor?.id === 'anan' && state.storyArc?.displacedAt !== undefined && !['aftermath', 'ending'].includes(state.storyArc.status);
  const bunk = displaced ? null : v2OwnerBunk(state, actor, room);
  return `${original}${BUNK_SETTING_V2.prose.layout}${bunk ? BUNK_SETTING_V2.prose.localOwner.replace('{bunk}', bunk) : ''}`;
}
// Authored first-person cell openings for the twelve non-Emma canon viewpoints
// under prison-bunks@2, following docs/opening-writing-guide.md. Kept outside
// BUNK_SETTING_V2 so the supplement fingerprint and existing saves stay exact.
export const V2_CHARACTER_CELL_OPENINGS = freeze({
  sherry: [
    '睁开眼的时候，鼻尖先嗅到了一点旧石头的潮气。',
    '身下的床板硬邦邦的，稍微一翻身，木架就发出一声轻响。我撑着胳膊坐起来，视线正好掠过上铺的床沿——头顶离灰扑扑的石砌天花板很近，墙面嵌着一块黑漆漆的显示屏，再往前便是将房间同外面狭长过道隔开的铁栅栏门。',
    '……嗯哼！一觉醒来就身处陌生的封闭石室，身上的水手领衬衫和短斗篷倒还齐整，门却严严实实地锁着。没有邀请函，也没有说明信，简直像悬疑小说第一页才会出现的展开。',
    '下铺似乎也已经醒了。我还没瞧见她的正脸，先留意到床沿下露出的黑色兜帽斗篷一角，以及垂在边上的一截银灰短发，发梢染着一点显眼的红。再往下看，她的脚踝处竟连着一只沉甸甸的铁球镣铐。不知道这位同室的少女是不是也刚醒过来，又为什么只有她戴着那样的东西。',
  ],
  alisa: [
    '后背硌在硬邦邦的床板上，睁开眼时，最先映入眼帘的是头顶上方那层粗糙的木床板。',
    '不是我平时待的地方。我下意识抬手摸了摸脸，确认黑色的口罩还严严实实地遮着下半张脸，才撑着床沿慢慢坐起身。床架紧贴着冰凉的旧石墙，脚踝随着动作传来一阵沉甸甸的坠感——一只铁球镣铐正扣在那里。不远处的墙上嵌着块没亮起的屏幕，正前方的铁栅栏门死死关着，把这间逼仄的石室和外面的过道隔开。',
    '搞什么啊……把人莫名其妙弄到这种地方关起来，连句解释都没有。',
    '头顶的上铺传来了轻微的动静。同一张双层床的上方，有一截编成盘辫的水蓝色长发垂在床沿边，旁边还露出一角黑蓝格纹的侦探帽。上铺那家伙多半也醒着。我不认识她，更没兴趣被人居高临下地盯着看，只把手往黑色斗篷底下收了收，冷眼留意着上头的动静。',
  ],
  margo: [
    '醒来时，指尖先碰到了上铺粗糙的木护栏。',
    '稍微侧过头，灰暗的石顶便压在视线近处。我顺手理了理额前的黑色短发，确认戴在头上的紫面纱迷你帽没有歪斜，才慢条斯理地支起身子。这间石砌的小房间谈不上有什么待客之道——墙上嵌着一块还没通电似的黑色显示屏，远处的铁栅栏门紧闭着，门外只有一段昏暗的地下过道。',
    '把人请进这种地方，却连一位出面说明的主人都没有，未免有些失礼了。我摸了摸随身收着的塔罗牌，唇角习惯性地浮起一点轻浅的笑意，目光却先一步把房里的情形打量了一遍。',
    '视线往下落去，下铺已经有人在了。从上铺的床沿望下去，能看见一顶架着护目镜的飞行员帽，帽檐下是稍显凌乱的黑色双马尾，左臂上还缠着一圈醒目的白绷带。我还不知道这位小室友叫什么名字，她看起来倒不像会主动寒暄的类型。',
  ],
  nanoka: [
    '睁开眼的瞬间，视线正对着上方那层粗糙的木床板。',
    '我已经进来了。没有惊慌的必要，我撑起身子，先低头检查了一遍自己：左臂上的白绷带还牢牢缠着，黑色军装外套与腰侧的小包都在原位，收着姐姐头绳的地方也没有异样。只是手边空空如也，目前还没有任何可以防身的武器。',
    '床铺紧挨着潮冷的旧石墙。我借着昏暗的光线快速扫过室内——墙面嵌着一块尚未亮起的显示屏，正前方的铁栅栏门紧锁着，门外是通往地下的石砌过道。来之前查到过的大致情况是一回事，真正被锁进哪一间房、外面眼下是什么布置，还得靠亲眼确认。',
    '头顶的上铺传来了轻微的摩擦声。同一张双层床的上面还住着另一个人，床沿边露出一截黑色短发，以及一顶带着短紫面纱的迷你帽。我不认识她，也不清楚她的底细。在弄清眼前的状况之前，没必要先把自己的事交出去。',
  ],
  hiro: [
    '意识回笼的时候，身下是坚硬而陌生的木床板，上方不远处便是灰暗的石砌顶棚。',
    '我撑起身子坐直，手指下意识按了按外套口袋——那支红色的钢笔还在，分寸未动。确认过这件最重要的东西，我才抬眼打量四周。这是一间由老旧石墙围成的地下牢房，双层床贴墙摆放，墙面嵌着一块尚未亮起的显示屏，正前方的铁栅栏门紧闭着，门外只有一段昏暗的过道。',
    '没有任何关于这里的说明。无论把人关进这种地方的是谁，眼下最重要的是先弄清处境。',
    '我的目光越过上铺床沿往下落去，呼吸却在看清下铺之人的那一刻骤然收紧。白发发尾泛着樱花粉，头戴黑缎带贝雷帽的少女正待在下铺——是樱羽艾玛。最不愿再见到的人，偏偏出现在同一间牢房里。我收回险些外露的情绪，只冷冷地垂眸看着下铺的方向。',
  ],
  anan: [
    '睁开眼时，视线先撞上了近在咫尺的灰暗石顶。',
    '太近了。家里的天花板可不会贴在这个位置，身下的木床板更是硬得毫不客气。我迟疑着摸了摸身侧，还好，平时随身带着的素描本和笔就在手边。指腹触到熟悉的硬质封面，紧绷的神经才稍微松了一点——只要还有纸和笔，就算不用开口说话，也不至于彻底失去应对的办法。',
    '越过上铺的床沿往外看，冰冷的石墙上嵌着一块黑着的显示屏，再过去是锁着的铁栅栏门，门外连着昏暗的地下过道。我昨晚可没打算来这种阴森的地方寻找小说素材，光是坐起身把这间房打量一圈，就已经快要把今天份的力气用光了。',
    '视线往下移时，下铺的床沿边露出了一截白色双马尾，发丝间还夹着红、蓝、黄几缕鲜亮的挑染。下面那位少女似乎也醒着。我还不知道她的名字，只觉得那一小簇跳脱的颜色，比这整间灰扑扑的石室都要显眼。手里的素描本还合着，要不要先翻开写点什么给她看，我一时还没拿定主意。',
  ],
  noah: [
    '睁开眼睛的时候，最先看到的是头顶上方一块灰扑扑的木床板。',
    '这里的颜色好少啊。我眨了眨眼，慢吞吞地从下铺坐起身，低头摸了摸自己的衣袋——画笔还乖乖地待在口袋边，黑白衣服上的彩色波点和蝴蝶结也还在。只是周围的墙壁全都是冷冰冰的灰石头，连一点好看的线条都没有。墙上嵌着一块黑黑的方形屏幕，前面的铁栅栏门也关得严严实实的，跟平时待的地方完全不一样。',
    '……为什么诺亚会在这种灰邦邦的房间里醒过来呢？',
    '就在我歪着头打量铁栅栏的时候，头顶的上铺传来了一点轻轻的动静。同一张双层床的上面，有一缕泛着淡紫光泽的银白色长发垂在床沿边，仔细看的话，还能瞧见一点深蓝与黑白相间的宽袖衣角，和手边抱着的本子边缘。银白色配淡紫色，倒是很漂亮的颜色。住在上面的那个人好像也醒着，我还不知道她叫什么名字呢。',
  ],
  leia: [
    '在陌生的地方醒来时，最先让人感到局促的，是压在头顶近处的石砌天花板。',
    '我撑着上铺的床板坐起身，下意识放缓呼吸，将那一点身处狭窄封闭空间的不适压了下去。身上的军装骑士风黑色长外套和金色肩章依旧整齐，腰侧的带鞘刺剑也在原位，可四周的布景却怎么看都不像任何一个我熟悉的后台或摄影棚——粗糙的双层床贴着旧石墙，墙面嵌着一块尚未亮起的显示屏，正前方的铁栅栏门紧锁着，门外只有一段幽暗的过道。',
    '看来，这可不是一场提前对过台词的演出。越是这种来历不明的窘境，越不能先乱了阵脚。',
    '我稳住神色，目光从上铺床沿往下落去。下铺的少女似乎也已经醒了，从这里能望见她披散的金色长卷发，发侧点缀着带珍珠链的黑蝴蝶结，身上是一袭有着宽大灰袖与荷叶边的黑白哥特裙装。我们还素不相识，但既然被分在同一间牢房里，或许一会儿该由我先找个不那么唐突的开场白。',
  ],
  milia: [
    '睁开眼的时候，头顶上方是一块陌生的旧木床板，空气里透着股地下室似的凉意。',
    '……唉，这又是唱的哪一出啊。我慢吞吞地从下铺支起身子，抬手理了理垂在颊边的金色长卷发和宽大的灰袖。床铺紧挨着粗糙的石墙，墙面上嵌着一块黑漆漆的显示屏，正前方的铁栅栏门更是锁得严严实实。既没有熟悉的街景，也没有半点说明，倒像是老电影里才会出现的古典石牢——只不过轮到大叔我自己住进来，可就一点也让人提不起劲了。',
    '我没有急着去拽那扇铁栅栏门，只是坐在下铺边沿轻轻叹了口气，先把周围的情形看个大概。',
    '头顶的上铺传来了轻微的动静。同一张双层床的上方，似乎还住着另一位少女——床沿边露出一截亚麻色的外翻短发，还能瞥见饰有金色肩章的黑色长外套一角，以及垂在床侧的一截刺剑剑鞘。打扮得像位舞台上的骑士一样。我还不知道她的名字，也不清楚她现在是不是同样一头雾水。',
  ],
  coco: [
    '后背被硬邦邦的床板硌醒时，第一眼看到的就是压在头顶上方的灰石头顶棚。',
    '什么鬼地方啊……我皱起眉头从上铺坐起身，先伸手摸了摸头顶的猫耳耳机和腰侧挂着的缝线玩偶。东西倒还在，可四周连一台电脑或像样的设备都看不见——粗糙的双层床贴着冰凉的旧石墙，墙上虽然嵌着一块显示屏，这会儿却黑漆漆的一点反应都没有。再往外看，一扇铁栅栏门正把房间和昏暗的过道死死隔开。',
    '把人莫名其妙关进这种连网都未必通的破石室里，不管是谁干的，未免也太恶劣了。',
    '我臭着脸从上铺床沿往下扫了一眼。下铺居然还住着另一个人——米金色的长双马尾卷着发梢，头上戴着缀有黑黄玫瑰的大软帽，一身墨绿与黑色相间的宽摆褶边裙把下铺占了大半，手边还搁着把花朵羽扇。我不认识这位打扮得跟大小姐似的室友，也不知道她到底是什么来路，只能先压住心里的烦躁，看看那边打算有什么反应。',
  ],
  hanna: [
    '睁开眼睛时，映入眼帘的竟是一块毫无装饰的粗糙木床板。',
    '……这算什么招待方式？我连忙从下铺坐起身，顾不上先看四周，第一件事便是低头抚平墨绿与黑色相间的多层褶边裙摆，又伸手扶正了饰着黑黄玫瑰的大软帽。幸好裙装没有弄脏，手边的花朵羽扇也完好无损。可等我抬起头打量这间房，刚刚撑起来的气势还是差点僵在脸上——潮湿阴暗的旧石墙、黑漆漆的墙面显示屏，还有一扇锁得死死的铁栅栏门。',
    '竟敢把本小姐安排在这种简陋又失礼的地方，连一句像样的说明都没有，未免太不像话了！',
    '我捏紧了手边的羽扇，努力让背脊挺得笔直，不让自己露出一丝慌乱。就在这时，头顶的上铺传来了动静。同一张双层床的上面，露出一截夹着橙色挑染的黑色外翘短发，还能瞧见一对显眼的猫耳耳机和条纹臂套的一角。上面居然还住着另一个人。我还不晓得她的名字，但既然同处一室，就更不能在陌生人面前丢了体面。',
  ],
  meruru: [
    '在安静得有些过分的石室里醒来时，呼吸声都显得格外清晰。',
    '我轻轻撑起身子，先低头摸了摸贴身收好的那张合照，确认它还安然无恙，又抬手理了理饰着黑十字的白色头巾与修女裙宽袖。这间位于地下过道最深处的七号牢房里只有我一个人。四周是冰凉的旧石墙，墙面上嵌着一块还没有亮起的显示屏，正前方的铁栅栏门紧闭着，门外静悄悄的，还没有传来任何动静。',
    '从今天起，新一批被收容进来的女孩子们就要在这里生活了。不知道我为她们准备的那些衣服合不合身，也不知道她们在陌生的牢房里醒过来时，会不会因为害怕而在慌乱中磕碰受伤……想到一会儿还要像普通的同伴一样同她们「初次见面」、听大家逐一报出名字，我的指尖便忍不住攥紧了深灰色的腰带蝴蝶结，心里既有些提心吊胆，又一阵阵发酸。',
    '在典狱长的通知响起、牢门打开之前，我还得先在这间单人牢房里安静地等着。我坐在床边，望着那扇紧锁的铁栅栏门和暗着的屏幕，留心着过道那头会不会传来什么声音。',
  ],
});
export function v2CharacterCellOpening(state, actor, localActors = []) {
  if (!usesBunkSettingV2(state) || state.creation?.playerMode !== 'original' || !actor || actor.id === 'emma') return null;
  if (state.creation?.opening?.text) return null;
  if (actor.id === 'hiro' && state.creation?.loop === 2) return null;
  const home = BUNK_SETTING_V2.singleRoom.owner === actor.id ? BUNK_SETTING_V2.singleRoom.code
    : Object.values(BUNK_SETTING_V2.rooms).find(room => [room.upper, room.lower].includes(actor.id))?.code;
  if (!home || actor.locationId !== home) return null;
  if (state.creation?.opening && state.creation.opening.locationId !== home) return null;
  const expectedRoommates = BUNK_SETTING_V2.singleRoom.owner === actor.id ? []
    : Object.values(BUNK_SETTING_V2.rooms).filter(room => room.code === home)
      .flatMap(room => [room.upper, room.lower]).filter(id => id !== actor.id);
  if (localActors.length !== expectedRoommates.length
    || localActors.some(other => !expectedRoommates.includes(other.id))) return null;
  return V2_CHARACTER_CELL_OPENINGS[actor.id] || null;
}

// Only new @2 setup knowledge uses this wording. Operational restrictions stay
// in persona/tool permissions, not inside a character's readable recollection.
export function v2OpeningKnowledge(actor) {
  return actor.initialKnowledge.map(text => text
    .replace('即使很难感到害怕，我也能知道疼痛，也不代表不在意别人；我其实希望有能触动内心的事。', '即使很难感到害怕，我也知道疼痛，也会在意别人；我希望有能触动内心的事。')
    .replace('，但本轮试运行没有实现该能力，不能发动或证明任何回溯', '')
    .replace('。本轮没有魔法执行，不能借说话或写字控制别人。', '。')
    .replace('。本轮不能执行这项能力，也没有制造幻觉的权限。', '。')
    .replace('。本轮不能执行该能力，更不能改变他人的兴趣。', '。')
    .replace('。本轮没有执行互换或读取记忆的能力。', '。')
    .replace('；本轮不执行这种能力，也不能知道或模仿别人脑内尚未说出的声音', '')
    .replace('。本轮不执行幻视，也不能确认任何将来会发生的事件。', '。')
    .replace('；本轮不能执行点火或任何伤害，也不能把更强的能力当作自己已经拥有', '')
    .replace('；本轮不能执行怪力，更没有冲击波之类强化权限', '')
    .replace('；本轮不能执行漂浮，更不能让大量物体浮起', '')
    .replace('；本轮千里眼没有执行，不能获得其他房间或外界的画面', '')
    .replace('，但本轮没有治疗或再生执行；不能因我说想帮忙就认定他人伤势已经改变', '')
    .replace('。要获得谁现在的详细行动，仍须宿主实际交付见闻。', '。')
    .replace('不能靠我的话让这些程序自动开始。', '')
    .replace('；眼前没有已知案件', '')
  );
}

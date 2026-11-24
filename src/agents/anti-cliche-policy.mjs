// Izumi_1029 inspiration: regex 926ee4b1-f089-4053-b0b2-5498353aac26,
// experimental word list 6e2dd902-061b-4675-93cb-9dbb7bacf628, and the rhythm
// guide. These are game-specific detection rules, never replacement regexes.
// v1 is pinned by a new turn. Keep sealed historical prompt bytes stable.
export const ANTI_CLICHE_VERSION = 1;

const STYLE = [
  '反套话：按眼前已确认的动作、位置、声音和物件写。读者能从这些细节看出来的情绪，不再用一句抽象总结解释。没有可写的新细节就收束，不为凑字添加动作或世界事实。',
  '避免堆“极其／近乎／一丝／一抹／微不可察”，也少用“嘴角勾起弧度”“手指或指节泛白”“传遍四肢百骸”“生理性地颤抖”等万能反应。少用“并不存在的某物”当修辞；避免“如遭雷击”“面具出现裂痕”等情绪模板，不要把人物固定比作受惊小动物，也不要用手术刀比喻眼神、声音或言辞。',
  '保留必要的因果、否定、转折、数量和准确术语。尤其不能删改案件里的“共犯”、真正的“由于”、否认证据、医学描述或原始引文。适合人物和处境的比喻仍可用，不将每段写成同一种句式。',
];
const DIALOGUE = '新生成的角色台词按她自己的语气表达具体意思；别用“听懂了？”或“要是……就……”当惯用的施压句。实际解释条件、教学确认、角色有依据的直接警告照常保留。不更改玩家原话、已发生对白、角色称呼、引语或听众。';
export function antiClicheGuidance(role) {
  return [...STYLE, ...(['roleplay', 'player_performance'].includes(role) ? [DIALOGUE] : [])].join('\n');
}
export const ANTI_CLICHE_RETRY = '上一版场景表达用了重复修饰或模板反应，未发布。保留原选择、台词含义、动作、对象、视角和事实，只让描述更具体；已引用的话原样保留。';

export const IMPORTED_PROSE_RULES = Object.freeze([
  { id: 'ornamental-intensity', re: /极其|極其|近乎|微不可察|一[丝絲抹](?=.{0,3}(?:异样|異樣|情绪|情緒|笑意|冷意|不安|温柔|溫柔|犹豫|猶豫|慌乱|慌亂|讥讽|譏諷|弧度))/gu,
    suggestion: '去掉叠用的程度词，保留可感知的事实。' },
  { id: 'formulaic-expression', re: /(?:唇角|嘴角)[^。！？!?，,；;\n]{0,12}(?:弧度)|(?:手指|指节|指節|指尖)[^。！？!?，,；;\n]{0,8}(?:泛白|发白|發白)|(?:直窜|直竄|蔓延|传遍|傳遍|涌遍|湧遍|席卷)[^。！？!?，,；;\n]{0,7}四肢百骸|生理性地(?:发抖|發抖|颤抖|顫抖|颤栗|顫慄|一颤|一顫)/gu,
    suggestion: '不用泛用的生理模板代替动作；只保留现场看得到且有依据的反应。' },
  { id: 'ornamental-negation', re: /并不存在的|並不存在的|不容(?:置疑|分说|分說|反驳|反駁)/gu,
    suggestion: '用实际事实或观察代替空泛断言；保留证据中的否定与限定。' },
  { id: 'stock-simile', re: /(?:像|如同|仿佛|彷彿|好似)[^。！？!?，,；;\n]{0,6}(?:受惊|受驚|炸毛|被踩到尾巴)(?:的)?(?:小动物|小動物|幼兽|幼獸|小猫|小貓|兔子|小鹿)|如遭雷击|如遭雷擊|(?:冰冷的)?面具(?:上)?(?:出现|出現|露出)(?:了)?裂痕|(?:像|如同|仿佛|彷彿|好似)[^。！？!?，,；;\n]{0,6}手术刀(?:般|一样|一樣)/gu,
    suggestion: '换成现场已有的动作、位置或声音；不要新增事实。' },
]);
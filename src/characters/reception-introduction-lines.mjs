// Authored, public name utterances from the locally supplied original script.
// Only <br> is rendered as a newline. No healing, powers, accusations or private
// narration from the surrounding scene is imported into this opening event.
const freeze = value => {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
};
export const RECEPTION_INTRODUCTION_SOURCE = freeze({
  ref: 'original-reception-introductions@1',
  file: 'docs/魔审（游戏文本+全CG）/全剧情/Act01_Chapter01_全剧情.txt',
  archivedAt: 'archives/non-runtime-2026-10-20T06-26-00-817Z-8uHLd3/files',
  section: '0101Adv04', excerpt: 'name-utterances-only; original order; no surrounding supernatural event',
});
export const RECEPTION_INTRODUCTIONS = freeze([
  { speakerId: 'leia', sourceId: '0101Adv04_Leia001', delivery: 'speech',
    text: '我来带头吧。\n我的名字叫莲见蕾雅。', startLine: 923, endLine: 924 },
  { speakerId: 'hanna', sourceId: '0101Adv04_Hanna001', delivery: 'speech',
    text: '……呵，我是远野汉娜。\n往后请多多指照……往后请多多关教？', startLine: 929, endLine: 930 },
  { speakerId: 'sherry', sourceId: '0101Adv04_Sherry001', delivery: 'speech',
    text: '嗨嗨～！我叫橘雪莉。\n哪里有案件哪里就有我！\n一切就交给我这位名侦探吧！', startLine: 974, endLine: 976 },
  { speakerId: 'emma', sourceId: '0101Adv04_Ema005', delivery: 'speech',
    text: '我、我是，樱羽艾玛！', startLine: 1018, endLine: 1018 },
  { speakerId: 'meruru', sourceId: '0101Adv04_Meruru001', delivery: 'speech',
    text: '我我我、我的名字是、冰、冰、冰……\n冰上、梅露露……', startLine: 1028, endLine: 1029 },
  { speakerId: 'coco', sourceId: '0101Adv04_Coco001', delivery: 'speech',
    text: '啊，轮到我了？\n我的名字是泽渡可可。', startLine: 1126, endLine: 1127 },
  { speakerId: 'milia', sourceId: '0101Adv04_Miria001', delivery: 'speech',
    text: '呃……好尴尬……我是佐伯米莉亚哦？\n请多多关照～啊哈哈～……唉。', startLine: 1189, endLine: 1190 },
  { speakerId: 'margo', sourceId: '0101Adv04_Margo001', delivery: 'speech',
    text: '我是宝生玛格。\n这里好多可爱的小朋友，害我忍不住舔嘴巴了，呵呵。', startLine: 1195, endLine: 1196 },
  { speakerId: 'alisa', sourceId: '0101Adv04_Alisa001', delivery: 'speech',
    text: '啧……紫藤亚里沙。\n我可没兴趣跟你们搞好关系。', startLine: 1201, endLine: 1202 },
  { speakerId: 'anan', sourceId: '0101Adv04_AnAn001', delivery: 'writing',
    text: '『吾辈是夏目安安。\n　今后，请各位不要找吾辈说话』', startLine: 1275, endLine: 1276 },
  { speakerId: 'nanoka', sourceId: '0101Adv04_Nanoka001', delivery: 'speech',
    text: '……黑部奈叶香。', startLine: 1281, endLine: 1281 },
  { speakerId: 'hiro', sourceId: '0101Adv04_Hiro001', delivery: 'speech',
    text: '我的名字是二阶堂希罗。', startLine: 1286, endLine: 1286 },
  { speakerId: 'noah', sourceId: '0101Adv04_Noah001', delivery: 'speech',
    text: '嗯～？名字？诺亚就是诺亚哦？\n嗯，城崎诺亚。', startLine: 1312, endLine: 1313 },
]);

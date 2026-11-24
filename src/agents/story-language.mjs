// Shared publication policy for generated prose, never for player-authored quotes
// or model configuration. Ordinary in-world uses such as 麦克风测试 remain valid.
const META_LANGUAGE = /wiki|维基|萌娘百科|原卡|酒馆卡|原作(?:设定|剧情|十三位|角色)|二创验证|(?:本|此|本次)(?:测试|版本|项目|工程|实现|原型)|宿主|\b(?:Agent|LLM)\b|未实现|尚未支持|尚未开放.{0,12}(?:功能|执行|系统|程序)|(?:没有|不会)自动(?:集合|跟随|自我介绍)|(?:尚未|无需|未)调用模型|世界状态|系统(?:规则|权限)|提示词|执行器|玩家(?:输入|指令|角色)|来源[于於自].{0,12}(?:网站|网页|百科|资料库)|根据.{0,12}(?:网站|网页|百科)(?:资料|记载)/iu;

export const containsMetaLanguage = text => typeof text === 'string' && META_LANGUAGE.test(text);

// A custom profile excerpt uses complete, affirmative sentences from its concept.
// Private history, numerical attributes and ability drafts have separate owners.
export function conciseProfileConcept(value, maximum = 80) {
  if (typeof value !== 'string') return '';
  const sentences = value.replace(/\r\n?/gu, '\n').match(/[^。！？!?\n]+[。！？!?]?[」』”’"]*/gu) || [];
  const quotePairs = new Map([['「', '」'], ['『', '』'], ['“', '”'], ['‘', '’'], ['"', '"']]);
  const quotes = [];
  let result = ''; let count = 0;
  for (const raw of sentences) {
    if (count === 2) break;
    const sentence = raw.trim();
    let quoted = quotes.length > 0;
    for (const character of sentence) {
      if (quotes.at(-1) === character) { quotes.pop(); quoted = true; }
      else if (quotePairs.has(character)) { quotes.push(quotePairs.get(character)); quoted = true; }
    }
    if (!sentence || quoted || containsMetaLanguage(sentence) || /[」』”’]|说过|说道|写道/u.test(sentence)) continue;
    if (Array.from(result + sentence).length > maximum) {
      if (result) break;
      const phrase = sentence.split(/[，；,;：:]/u)[0];
      const complete = /[。！？!?]$/u.test(phrase) ? phrase : `${phrase}。`;
      if (phrase && Array.from(complete).length <= maximum) result = complete;
      break;
    }
    result += sentence; count += 1;
  }
  return result;
}

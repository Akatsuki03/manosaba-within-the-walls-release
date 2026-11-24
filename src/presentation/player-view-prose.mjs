// Display only. The committed row already binds its performer and the name (or
// mask) visible to this viewer at delivery time. Do not consult today's roster
// for a name or alter the source text, speech, or any actor's observations.
const quotes = /「[^」]*」|『[^』]*』|“[^”]*”|"[^"\n]*"|【[^】]*】/gu;
const subject = /(^|[，,。；;：:！!？?\n])(\s*(?:(?:随后|接着|然后|于是|随即|此时|这时|最后|同时|而|但)\s*)*)(?:我(?!们|們|方|国|國|军|軍|党|黨|校|辈|輩)|吾辈|吾輩|本小姐)(?=\p{Script=Han})/gu;
const body = /^(?:眉头|眉頭|眉心|眼神|目光|视线|視線|指尖|双手|雙手|手指|嘴角|肩头|肩頭)/u;

// Turn only a clearly described, visible detail into a clause. A profile's
// inventory, personality, and fragments that do not read as prose stay out.
function travelDetail(appearance) {
  const feature = appearance.split(/[，、。；\n]/u, 1)[0].trim();
  const dye = /^([\p{Script=Han}]{1,16}(?:马尾|长发|短发|卷发|辫))有([红橙黄绿青蓝紫粉白黑灰]{2,6})挑染$/u.exec(feature);
  if (dye) return `${dye[1]}间挑染着${[...dye[2]].join('、')}${'零一两三四五六'[dye[2].length]}色`;
  const sheen = /^([\p{Script=Han}]{1,16}(?:长发|短发|卷发|马尾|辫))带([\p{Script=Han}]{1,6})光泽$/u.exec(feature);
  if (sheen) return `${sheen[1]}泛着${sheen[2]}的光泽`;
  if (/^[\p{Script=Han}]{1,12}(?:长发|短发|卷发)$/u.test(feature)) return `来人留着一头${feature}`;
  return '';
}

const isConversation = row => row?.delivery === 'speech' || row?.delivery === 'writing';
const onlyPair = (row, a, b) => row?.audienceIds?.length === 2 && row.audienceIds.includes(a) && row.audienceIds.includes(b);
const to = (row, actorId) => row?.addresseeIds?.length === 1 && row.addresseeIds[0] === actorId;

// Identify an addressed gesture from its adjacent, delivered speech/writing in
// the same enactment. An audience alone, a group line, or matching time alone
// does not identify which person a pronoun refers to.
export function playerExchangeForAction(action, previous, next, playerId) {
  const actorId = action.speakerId;
  if (action.delivery !== 'action' || !actorId || actorId === playerId
    || !isConversation(next) || next.speakerId !== actorId || next.occurredAt !== action.occurredAt
    || !onlyPair(action, actorId, playerId) || !onlyPair(next, actorId, playerId) || !to(next, playerId)) return undefined;
  const origin = /^(.*):enactment:\d+$/u.exec(action.observationKey || '')?.[1];
  if (!origin || next.observationKey !== `npc:${origin}:${actorId}`) return undefined;
  const job = origin.replace(/:beat:\d+$/u, '');
  const playerSpoke = previous?.delivery === 'speech' && previous.speakerId === playerId
    && onlyPair(previous, actorId, playerId) && to(previous, actorId) && previous.occurredAt <= action.occurredAt
    && previous.observationKey === `question:${job}`;
  return { addressedToPlayer: true, playerSpoke };
}

export function playerViewEntryProse(entry, { speakerId, playerId, unknownAppearance, exchange } = {}) {
  if (entry.delivery !== 'action' || !speakerId || speakerId === playerId || typeof entry.text !== 'string') return entry;
  const masked = /^[?？]+$/u.test(entry.speaker);
  const name = masked ? '眼前的人' : entry.speaker;
  if (!name || ['旁白', '所见所闻', '验证说明', '眼前的动静', '系统'].includes(name)) return entry;

  if (masked && unknownAppearance && entry.text.startsWith(`${unknownAppearance}由`)) {
    const travel = /^由([^。\n]{1,40})走向([^。\n]{1,40})。$/u.exec(entry.text.slice(unknownAppearance.length));
    if (travel) {
      const detail = travelDetail(unknownAppearance);
      return { ...entry, text: `有人从${travel[1]}走进${travel[2]}${detail ? `，${detail}` : ''}。` };
    }
  }

  const clarify = (part, start) => {
    let prose = part.replace(subject, (match, boundary, cue, index) => {
      // Before an embedded quote, the remainder is not a clause boundary.
      if (!boundary && !start) return match;
      return `${boundary}${cue}${name}${body.test(part.slice(index + match.length)) ? '的' : ''}`;
    });
    // Third person describes the NPC, not the player receiving the gesture.
    if (start) prose = prose.replace(/^(\s*)(?:她|他)(?=\p{Script=Han})/u,
      (_, space) => `${space}${name}${body.test(prose.slice(space.length + 1)) ? '的' : ''}`);
    if (exchange?.addressedToPlayer) {
      prose = prose.replace(/(朝|向|对|對)[她他](?=(?:(?:微微|轻轻|輕輕|端正地|郑重地|鄭重地)\s*)?(?:[回行][了個个一半]{0,4}[礼禮]|颔首|頷首|点头|點頭|鞠躬|致意|招手|伸手|望去|看去|[说說]道|[问問]道))/gu, '$1我')
        .replace(/(示意|请|請)[她他](?=(?:一同|一起|跟上|同行|过来|過來|先走|坐下|进来|進來))/gu, '$1我');
    }
    if (exchange?.playerSpoke) prose = prose.replace(/(听到|听见|聽到|聽見)[她他](?=说|說|回答)/gu, '$1我');
    return prose;
  };
  let cursor = 0, text = '';
  for (const quote of entry.text.matchAll(quotes)) {
    text += clarify(entry.text.slice(cursor, quote.index), cursor === 0) + quote[0];
    cursor = quote.index + quote[0].length;
  }
  text += clarify(entry.text.slice(cursor), cursor === 0);
  return text === entry.text ? entry : { ...entry, text };
}

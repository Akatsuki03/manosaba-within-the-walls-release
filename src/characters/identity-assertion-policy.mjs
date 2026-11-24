import { createHash } from 'node:crypto';
import { runtimeCapabilityId } from '../content/runtime-capabilities.mjs';

// Pure host policy. Selecting an identity never authorizes another field, and
// installing this module never changes old acquired knowledge or frozen jobs.
export const IDENTITY_ASSERTION_RUNTIME = 'agent-prison-runtime@6';
export const IDENTITY_ASSERTION_POLICY = Object.freeze({ version: 2, ref: 'affirmative-delivered-identity@2',
  selfReport: 'exact-own-alias-in-affirmative-clause-including-after-punctuation',
  introduction: 'one-actually-present-subject-with-an-exact-name',
  vocative: 'one-present-addressee-with-unique-exact-leading-alias',
  uncertainty: 'reject-quoted-attributed-hypothetical-negated-or-guessed-name-assertions',
  eventOrder: 'player-prefix-acquisition-before-npc-snapshot-and-execution; no-sibling-knowledge-sharing',
  compatibility: 'v1-v5-keep-their-original-executor-and-hashes' });
export const IDENTITY_ASSERTION_FINGERPRINT = createHash('sha256').update(JSON.stringify(IDENTITY_ASSERTION_POLICY)).digest('hex');
export const usesIdentityAssertionV2 = state => [IDENTITY_ASSERTION_RUNTIME, 'agent-prison-runtime@7', 'agent-prison-runtime@8'].includes(runtimeCapabilityId(state?.agentRuntimeRevision));
const escape = value => value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
const pairs = new Map([['「', '」'], ['『', '』'], ['“', '”'], ['"', '"']]);
function quoteEnd(text, start) {
  const stack = [pairs.get(text[start])];
  for (let index = start + 1; index < text.length; index++) {
    const char = text[index];
    if (char === stack.at(-1)) { stack.pop(); if (!stack.length) return index; }
    else if (pairs.has(char)) stack.push(pairs.get(char));
  }
  return -1;
}
function ownText(raw) {
  let text = raw.trim();
  if (pairs.has(text[0]) && quoteEnd(text, 0) === text.length - 1) text = text.slice(1, -1);
  return text;
}
// The delivery field establishes speech/writing. A string made entirely of
// consecutive dialogue paragraphs has outer display quotes, not reported
// speech. Any unquoted attribution keeps inner quotations protected.
function deliveredOwnText(raw, delivery) {
  const text = raw.trim();
  const outer = delivery === 'writing' ? new Set(['『', '「', '“', '"']) : new Set(['「', '“', '"']);
  const paragraphs = [];
  for (let start = 0; start < text.length;) {
    if (!outer.has(text[start])) return text;
    const end = quoteEnd(text, start);
    if (end < 0) return text;
    paragraphs.push(text.slice(start + 1, end));
    start = end + 1;
    while (/\s/u.test(text[start] || '')) start++;
  }
  return paragraphs.join('\n');
}

function withoutQuotes(text) {
  let result = '';
  for (let index = 0; index < text.length; index++) {
    if (!pairs.has(text[index])) { result += text[index]; continue; }
    const end = quoteEnd(text, index);
    if (end < 0) { result += ' '.repeat(text.length - index); break; }
    result += ' '.repeat(end - index + 1); index = end;
  }
  return result;
}
const uncertain = /假[设設如]|如果|倘若|要是|或许|或許|也许|也許|可能|大概|似乎|疑似|猜(?:测|測|想|的)?|不[确確]定|[据據][说說]|[听聽][说說]|[她他][说說]|[转轉][述]|[复複][述]|引[用述]|台[词詞]|臺詞|扮演|[开開]玩笑|假名|才怪|不[对對]|[并並]非|不是|不叫|否[认認]|[别別]当真|是[她他]的名字|[她他]才(?:是|叫)/u;
function sentenceAt(text, index) {
  const before = text.slice(0, index); const start = Math.max(...[...before.matchAll(/[。！!；;\n]/gu)].map(match => match.index + 1), 0);
  const end = text.slice(index).search(/[。！!；;\n]/u);
  return text.slice(start, end < 0 ? text.length : index + end);
}
function affirmative(text, index, { question = false } = {}) {
  const sentence = sentenceAt(text, index);
  return !uncertain.test(sentence) && (question || !/[？?]/u.test(sentence));
}
const prefix = '(?:我叫|我是|我的名字是|(?:你(?:们|們)?(?:可以)?|大家(?:可以)?)?叫我?|名字是|吾[辈輩](?:乃|是|名[为為]?)|本小姐是|大叔是|(?:那)?我先报名字[：:]|我自己先说[，,：:])';
/** New explicit self-reports use the real delivered speaker and canonical name.
 * A name mention, assumed identity, or a claim about a third party is not one. */
export function deliveredSelfIntroduction({ delivery, text, customAbilityEvent } = {}, { name, selfReference } = {}) {
  if (customAbilityEvent || !['speech', 'writing'].includes(delivery) || typeof text !== 'string' || !name) return false;
  const exact = escape(name);
  const self = selfReference ? escape(selfReference) : '';
  const ownName = self ? `(?:${exact}|${self})` : exact;
  const direct = `(?:我叫|我是|我的名字是|(?:你(?:们|們)?(?:可以)?|大家(?:可以)?)?叫我|吾[辈輩](?:乃|是|叫|名[为為]?)|本小姐(?:是|叫)|大叔(?:是|叫)${self ? `|${self}(?:就)?是|${self}叫|${self}的名字是` : ''})`;
  const raw = deliveredOwnText(text, delivery).replace(new RegExp(`(${direct}\\s*)[「『“"](${ownName})[」』”"]`, 'gu'), '$1$2');
  const prose = withoutQuotes(raw);
  const assertion = new RegExp(`(?:^|[。！？!?；;，,…—–~～\\n])\\s*(?<value>${direct}\\s*${ownName})(?=$|[\\s，,。！!？?；;…—–~～]|哦|喔|啊|呀|啦|就好|就行|好了|吧)`, 'gu');
  for (const match of prose.matchAll(assertion)) {
    const index = match.index + match[0].indexOf(match.groups.value);
    // Stop at the enclosing sentence, not a blank line later in the actor's
    // speech. A leading question about the name is not itself an introduction.
    const clause = /[？?]/u.test(match[0][0]) ? sentenceAt(prose.slice(index), 0) : sentenceAt(prose, index);
    const earlier = prose.slice(0, index).split(/[。！？!?；;\n]/u).at(-1);
    if (/(?:[说說写寫读讀念]|转述|轉述|告诉|告訴)/u.test(earlier)) continue;
    if (!uncertain.test(clause) && !/[？?]|是[吗嗎]|[对對][吗嗎]/u.test(clause)) return true;
  }
  return false;
}

const noahContinuation = '(?:想|喜欢|喜歡|觉得|覺得|不喜欢|不喜歡|会|會|要|可以|能|也|还|還|的|是|先|才)';
function selfReport(actorId, aliases, raw) {
  if (!aliases.length) return false;
  const names = aliases.map(escape).sort((a, b) => b.length - a.length).join('|');
  let text = ownText(raw);
  // A quoted name in an actual "call me" construction is a name token, not
  // permission to turn an attributed quotation into the speaker's assertion.
  text = text.replace(new RegExp(`(${prefix}\\s*)[「『“"](${names})[」』”"]`, 'gu'), '$1$2');
  text = withoutQuotes(text);
  const pattern = new RegExp(`(?:^|[。！!；;，,…—–\\n])\\s*(?<assertion>(?<prefix>${prefix})\\s*(?<name>${names}))(?=$|[\\s，,。！!？?；;…—–]|就好|就行|好了|吧)`, 'gu');
  for (const match of text.matchAll(pattern)) {
    const index = match.index + match[0].indexOf(match.groups.assertion);
    if (affirmative(text, index)) return true;
  }
  const split = /(?:^|[。！!；;，,\n])\s*(?<assertion>吾[辈輩]姓(?<surname>\p{Script=Han}{1,4})[，,]\s*名(?<given>\p{Script=Han}{1,5}))(?=$|[，,。！!？?；;\s])/gu;
  for (const match of text.matchAll(split)) if (aliases.includes(match.groups.surname + match.groups.given)
    && affirmative(text, match.index + match[0].indexOf(match.groups.assertion))) return true;
  const bare = new RegExp(`^\\s*(?<name>${names})(?=$|[\\s，,。！!？?；;…—–]|就好|就行|好了|吧${actorId === 'noah' ? `|${noahContinuation}` : ''})`, 'u').exec(text);
  if (!bare || !affirmative(text, bare.index)) return false;
  const sentence = sentenceAt(text, bare.index).trim();
  return sentence === bare.groups.name || new RegExp(`^(?:${names})(?:[\\s，,…—–]*)(?:就好|就行|好了|吧)$`, 'u').test(sentence)
    || actorId === 'noah' && new RegExp(`^(?:${names})${noahContinuation}`, 'u').test(sentence);
}
/** All identities/aliases passed here are trusted host metadata, never inferred
 * from model labels. Audience means actually delivered, not merely nearby. */
export function affirmativeIdentitySubjects({ speakerId, text, audienceIds, addresseeIds = [] }, identities) {
  const aliases = new Map(identities.map(row => [row.id, row.aliases]));
  const subjects = new Set();
  if (selfReport(speakerId, aliases.get(speakerId) || [], text)) subjects.add(speakerId);
  const direct = withoutQuotes(ownText(text));
  const present = [...new Set(audienceIds)].filter(id => aliases.has(id));
  const introduced = present.filter(id => id !== speakerId && (aliases.get(id) || []).some(alias =>
    new RegExp(`^\\s*(?:这位|這位|她|他)(?:是|叫)\\s*${escape(alias)}(?=$|[，,。！!？?；;\\s])`, 'u').test(direct)));
  if (introduced.length === 1 && affirmative(direct, 0)) {
    const target = introduced[0];
    const ambiguous = present.some(id => id !== target && (aliases.get(id) || []).some(alias =>
      (aliases.get(target) || []).includes(alias)
      && new RegExp(`^\\s*(?:这位|這位|她|他)(?:是|叫)\\s*${escape(alias)}(?=$|[，,。！!？?；;\\s])`, 'u').test(direct)));
    if (!ambiguous) subjects.add(target);
  }
  const addressed = [...new Set(addresseeIds)].filter(id => id !== speakerId && present.includes(id));
  if (addressed.length === 1 && affirmative(direct, 0, { question: true })
    && !/^[^，,：:！!]+[，,：:！!]\s*(?:你(?:是|叫)|是你|是[吗嗎]|[对對][吗嗎]|不(?:是|叫))/u.test(direct)) {
    const target = addressed[0];
    for (const alias of aliases.get(target) || []) {
      if (!new RegExp(`^\\s*${escape(alias)}[，,！!：:]`, 'u').test(direct)) continue;
      // A custom duplicate name or multiple named recipients stays unresolved.
      if (present.filter(id => (aliases.get(id) || []).includes(alias)).length === 1) subjects.add(target);
    }
  }
  return [...subjects];
}

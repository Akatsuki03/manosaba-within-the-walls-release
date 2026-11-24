import { isProxy } from 'node:util/types';

// Additive pure HOST contract; NOT selected by existing tasks or old material
// validators. A sourceRef/brand proves neither SQL truth nor author permission.
export const BALLOT_INSTRUMENT_ASSERTIONS_VERSION = 1;
export const BALLOT_INSTRUMENT_ASSERTIONS_REF = 'ballot-instrument-assertions@1';
export const BALLOT_INSTRUMENT_ASSERTION_LIMITS = Object.freeze({ depth: 10, nodes: 2048,
  inputBytes: 32768, textCodeUnits: 6000, otherMaterials: 16, aliases: 8,
  predicates: 128, contradictions: 16 });
const contexts = new WeakSet(), diagnostics = new WeakMap();
const bad = () => { throw Object.assign(new Error('投票器具断言输入或版本无效。'), { code: 'ERR_BALLOT_INSTRUMENT_INPUT' }); };
const freeze = value => { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };
function snapshot(input) {
  let nodes = 0, units = 0; const active = new Set();
  function copy(value, depth) {
    if (++nodes > 2048 || depth > 10) bad();
    if (value === null) return null;
    if (typeof value === 'number') { if (!Number.isSafeInteger(value) || value < 0) bad(); return value; }
    if (typeof value === 'string') {
      units += value.length;
      if (units > 16000 || !value.isWellFormed() || /[\u0000-\u001f\u007f]/u.test(value)) bad();
      return value;
    }
    if (!value || typeof value !== 'object' || isProxy(value) || active.has(value)) bad();
    const array = Array.isArray(value);
    if (Object.getPrototypeOf(value) !== (array ? Array.prototype : Object.prototype)) bad();
    const keys = Reflect.ownKeys(value), out = array ? [] : {}; active.add(value);
    if (array) {
      const size = Object.getOwnPropertyDescriptor(value, 'length').value;
      if (size > 128 || keys.length !== size + 1) bad();
      for (let i = 0; i < size; i++) {
        const d = Object.getOwnPropertyDescriptor(value, String(i));
        if (!d?.enumerable || !Object.hasOwn(d, 'value')) bad();
        out.push(copy(d.value, depth + 1));
      }
    } else for (const key of keys) {
      const d = Object.getOwnPropertyDescriptor(value, key);
      if (typeof key !== 'string' || key.length > 64 || ['__proto__', 'constructor', 'prototype'].includes(key)
        || !d?.enumerable || !Object.hasOwn(d, 'value')) bad();
      out[key] = copy(d.value, depth + 1);
    }
    active.delete(value); return out;
  }
  const result = copy(input, 0);
  if (Buffer.byteLength(JSON.stringify(result)) > 32768) bad();
  return result;
}
const exact = (row, keys) => { if (!row || typeof row !== 'object' || Array.isArray(row)
  || Object.keys(row).length !== keys.length || keys.some(key => !Object.hasOwn(row, key))) bad(); };
const id = value => { if (typeof value !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9:@._/-]{0,127}$/u.test(value)) bad(); };
const array = (value, max) => { if (!Array.isArray(value) || value.length > max) bad(); };

/** Future HOST must authenticate exact owner/head/time, actual vote operation
 * and source instrument independently. subjectId remains the chosen candidate,
 * NEVER the rulebook or phone. Resolved phone means the source mandates this
 * operation's phone-only instrument, not that all other paper is nonexistent.
 * otherMaterials are only resolved referent metadata, NOT acquired-object or
 * action permission. Null/unknown instrument cannot create an absence fact. */
export function buildBallotInstrumentContext(raw) {
  const input = snapshot(raw); exact(input, ['version', 'scope', 'intent', 'ballot', 'focus', 'otherMaterials']);
  if (input.version !== 1) bad();
  exact(input.scope, ['ownerId', 'branchId', 'headRef', 'generation', 'revision', 'roomId', 'worldTime']);
  for (const key of ['ownerId', 'branchId', 'headRef', 'roomId']) id(input.scope[key]);
  for (const key of ['generation', 'revision', 'worldTime'])
    if (!Number.isSafeInteger(input.scope[key]) || input.scope[key] < 0) bad();
  exact(input.intent, ['type', 'operation', 'subjectId']);
  for (const key of ['type', 'operation']) id(input.intent[key]);
  if (input.intent.subjectId !== null) id(input.intent.subjectId);
  if (!['ballot-instrument', 'unresolved'].includes(input.focus)) bad();
  if (input.ballot !== null) {
    exact(input.ballot, ['operationRef', 'candidateId', 'state', 'carrier', 'sourceRef']);
    id(input.ballot.operationRef); id(input.ballot.candidateId);
    if (input.ballot.candidateId !== input.intent.subjectId) bad();
    if (!['resolved', 'unknown'].includes(input.ballot.state)) bad();
    if (input.ballot.state === 'resolved') {
      if (!['phone', 'paper'].includes(input.ballot.carrier)) bad(); id(input.ballot.sourceRef);
    } else if (input.ballot.carrier !== 'unknown' || input.ballot.sourceRef !== null) bad();
  }
  array(input.otherMaterials, 16); const aliases = [], ids = [];
  for (const material of input.otherMaterials) {
    exact(material, ['id', 'aliases', 'sourceRef']); id(material.id); id(material.sourceRef);
    array(material.aliases, 8); if (!material.aliases.length) bad(); ids.push(material.id);
    for (const alias of material.aliases) {
      if (typeof alias !== 'string' || alias.length < 2 || alias.length > 32
        || /[\s，,。；;！!？?「」『』“”"：:]/u.test(alias)
        || /票纸|选票|纸票|投票|手机/u.test(alias)) bad();
      aliases.push(alias);
    }
  }
  if (new Set(ids).size !== ids.length || new Set(aliases).size !== aliases.length) bad();
  const context = freeze({ ref: BALLOT_INSTRUMENT_ASSERTIONS_REF, ...input }); contexts.add(context); return context;
}

// A finite predicate and discourse-state grammar, not a Chinese NLP oracle.
// Resolving the ballot noun is separate from recognizing handover/writing.
// End a balanced literal at a scope delimiter so its reporting prefix cannot
// absorb an independent following narrator act. Unbalanced quotes do not mask.
const maskQuotes = text => text.replace(/「[^「」]*」|『[^『』]*』|“[^“”]*”|"[^"\n]*"/gu, match => ' '.repeat(match.length - 1) + '；');
const paperBallot = /票纸|纸质选票|纸选票|纸票|选票纸/gu;
const phone = /配发手机|手机屏幕|手机/gu;
const paperObject = /纸张|那张纸|这张纸|一张纸|纸面|纸角/gu;
const otherObject = /素描本|笔记本|本子|便笺|书页|纸巾|名单|报纸|贺卡|明信片/gu;
const ballotNoun = /选票|这一票|投票/u;
const manipulation = /接过|接住|接|领取|领到|拿起|拿过|拿到|递交|交出|递出|交给|递给|送出|提交|填写|填上|写下|写实|写在|写进|写上|落笔|勾选|抹平/u;
const writing = /笔尖.{0,12}(?:格子|纸面).{0,12}(?:悬|落|停)|(?:在|往).{0,12}(?:格子|纸面).{0,12}(?:写|填|勾)|一笔一笔写/u;
const qualifier = /可能|也许|似乎|仿佛|好像|或许|据说|听说|声称|自称|谎称|猜测|怀疑|认为|表示|坚称|断言|说道|说过|她说|他说|我说|写着|写道|字样|是否|难道|如果|假如|要是|倘若/u;
const nonactual = /没有|并未|尚未|还没|不曾|未曾|不是|并非|并不是|不能说|不意味着|不代表|并不|不会|不要|不再|准备|打算|试图|想要|想去|想接|不接/u;
function mentions(segment, context) {
  const rows = [];
  const add = (re, type) => { for (const match of segment.matchAll(re)) rows.push({ start: match.index, end: match.index + match[0].length, type }); };
  add(paperBallot, 'paper-ballot'); add(phone, 'phone'); add(paperObject, 'paper-ambiguous'); add(otherObject, 'other');
  for (const material of context.otherMaterials) for (const alias of material.aliases) {
    let at = segment.indexOf(alias);
    while (at >= 0) { rows.push({ start: at, end: at + alias.length, type: 'other' }); at = segment.indexOf(alias, at + 1); }
  }
  const maximal = rows.filter(row => !rows.some(other => other.start <= row.start && other.end >= row.end
    && other.end - other.start > row.end - row.start));
  const types = [...new Set(maximal.map(row => row.type))];
  return types.length === 1 ? types[0] : types.length ? 'ambiguous' : null;
}

/** no-contradiction means no recognized contradiction, NOT source approval or
 * a paper-object absence/permission claim. Unknown source and absent context
 * remain undetermined. Only affirmative finite action/narration is compared.
 * Later consumer must independently enforce its actual selected task pin. */
export function inspectBallotInstrumentAssertions(raw) {
  if (!raw || typeof raw !== 'object' || isProxy(raw) || Object.getPrototypeOf(raw) !== Object.prototype) bad();
  exactDescriptors(raw);
  const context = Object.getOwnPropertyDescriptor(raw, 'context').value;
  const text = Object.getOwnPropertyDescriptor(raw, 'text').value;
  const kind = Object.getOwnPropertyDescriptor(raw, 'kind').value;
  if (!contexts.has(context) || typeof text !== 'string' || text.length > 6000 || !text.isWellFormed()
    || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(text)
    || !['action', 'narration', 'speech', 'writing', 'reflection'].includes(kind)) bad();
  const result = (status, contradictions = []) => freeze({ ref: BALLOT_INSTRUMENT_ASSERTIONS_REF, version: 1, status, contradictions });
  if (!['action', 'narration'].includes(kind) || context.intent.type !== 'case' || context.intent.operation !== 'vote') return result('not-applicable');
  if (context.ballot?.state !== 'resolved') return result('undetermined');
  const contradictions = []; let predicateIndex = 0;
  let topic = context.focus === 'ballot-instrument' ? 'ballot' : 'unresolved';
  for (const paragraph of maskQuotes(text).split(/\n+/u)) {
    topic = context.focus === 'ballot-instrument' ? 'ballot' : 'unresolved';
    for (const sentence of paragraph.split(/[。；;！!？?]+/u)) {
      let hypothetical = false;
      for (const segment of sentence.split(/[，,]+|(?=但是|不过|然而|可是|但)/gu).map(value => value.trim()).filter(Boolean)) {
        if (predicateIndex >= 128) bad(); const index = predicateIndex++;
        if (/^(?:但是|不过|然而|可是|但)/u.test(segment)) hypothetical = false;
        if (/^(?:如果|假如|要是|倘若)/u.test(segment)) hypothetical = true;
        const mention = mentions(segment, context), verb = manipulation.exec(segment) ?? writing.exec(segment);
        // A resolved competing object breaks anaphora; explicit ballot paper
        // overrides previous notebook only when it is the sole object here.
        const resolved = mention === 'paper-ballot' ? 'paper-ballot'
          : mention === 'phone' ? 'phone'
            : mention === 'other' || mention === 'ambiguous' ? mention
              : mention === 'paper-ambiguous' ? (topic === 'ballot' || topic === 'paper-ballot' ? 'paper-ballot' : topic === 'other' ? 'other' : 'unresolved')
                : topic;
        const cutoff = verb?.index ?? segment.length;
        // Relative-object correction qualifies THIS verb's denied object:
        // 接过 + 的不是 + 票纸. Require immediate finite structure ending in
        // that object, not any later 不是/没有 (e.g. 接过票纸不是为了画画).
        // Denied nouns must also take the existing nonactual topic-reset path.
        const deniedObject = verb && /^的(?:并不是|不是|并非)(?:那张|这张|一张)?(?:纸质选票|纸选票|选票纸|票纸|纸票|纸张|纸面|纸角|纸)\s*$/u
          .test(segment.slice(verb.index + verb[0].length));
        const qualification = hypothetical || deniedObject || qualifier.test(segment.slice(0, cutoff)) || nonactual.test(segment.slice(0, cutoff))
          || /(?:不|没|未)\s*$/u.test(segment.slice(0, cutoff));
        const claim = verb && !qualification && (mention === 'paper-ballot' || mention === 'paper-ambiguous' && resolved === 'paper-ballot'
          || writing.test(segment) && ['ballot', 'paper-ballot'].includes(resolved));
        if (claim && context.ballot.carrier === 'phone') {
          if (contradictions.length >= 16) bad();
          contradictions.push({ rule: 'ballot-instrument-conflict', sourceRef: context.ballot.sourceRef,
            operationRef: context.ballot.operationRef, predicateIndex: index, requiredCarrier: 'phone', claimedCarrier: 'paper' });
        }
        // Claims, hypothetical objects and quotes are NOT established topics.
        // An actual finite explicit noun can bind later writing across sentence
        // boundaries in this one paragraph, but never across paragraph reset.
        if (!qualification && mention) topic = resolved;
        else if (qualification && (mention || verb)) topic = 'unresolved';
        else if (ballotNoun.test(segment) && !qualification && mention === null && topic !== 'other') topic = 'ballot';
      }
    }
  }
  return result(contradictions.length ? 'contradiction' : 'no-contradiction', contradictions);
}
function exactDescriptors(raw) {
  const keys = Reflect.ownKeys(raw);
  if (keys.length !== 3 || !['context', 'text', 'kind'].every(key => keys.includes(key))) bad();
  for (const key of keys) {
    const d = Object.getOwnPropertyDescriptor(raw, key);
    if (!d?.enumerable || !Object.hasOwn(d, 'value')) bad();
  }
}
export const ballotInstrumentAssertionDiagnostic = error => diagnostics.get(error) ?? null;
export function assertBallotInstrumentAssertions(input) {
  const result = inspectBallotInstrumentAssertions(input);
  if (result.status === 'contradiction') {
    const error = Object.assign(new Error('投票器具叙述与限定来源冲突。'), { code: 'INVALID_AGENT_OUTPUT' });
    diagnostics.set(error, freeze({ version: 1, ...result.contradictions[0] })); throw error;
  }
  return result;
}

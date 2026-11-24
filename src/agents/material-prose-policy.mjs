import { isProxy } from 'node:util/types';
import { physicalFactSnapshotV2 } from '../cases/case-physical-facts.mjs';

export const MATERIAL_PROSE_POLICY_VERSION = 1;
// Deliberately NOT the default/new-job pin. Engine/store/gateway owners must
// explicitly select and seal this variant before it is used by real jobs.
export const MATERIAL_PROSE_POLICY_VERSION_2 = 2;
const contexts = new WeakSet();
const diagnostics = new WeakMap();
export const materialProseDiagnostic = error => diagnostics.get(error);
const fail = (rule, eventIndex) => {
  const error = Object.assign(new Error('物质叙述缺少当前已公开的宿主依据。'), { code: 'INVALID_AGENT_OUTPUT' });
  diagnostics.set(error, Object.freeze({ rule, version: 1, ...(Number.isInteger(eventIndex) ? { eventIndex } : {}) }));
  throw error;
};
const plain = value => value !== null && typeof value === 'object' && !isProxy(value)
  && [Object.prototype, null].includes(Object.getPrototypeOf(value));
function field(value, key) {
  if (!plain(value)) fail('material-context');
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  if (!descriptor) {
    if (key in value) fail('material-context');
    return undefined;
  }
  if (!descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) fail('material-context');
  return descriptor.value;
}
function string(value, max = 1200) {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || value.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(value)) fail('material-context');
  return value;
}
function factText(value) {
  const result = string(value);
  if (typeof result !== 'string' || !result.trim()) fail('material-context');
  return result;
}
function list(value, max = 32) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || isProxy(value) || Object.getPrototypeOf(value) !== Array.prototype || value.length > max
    || Reflect.ownKeys(value).length !== value.length + 1) fail('material-context');
  return Array.from({ length: value.length }, (_, index) => {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (!descriptor?.enumerable || !Object.hasOwn(descriptor, 'value')) fail('material-context');
    return descriptor.value;
  });
}
function pick(row, keys) {
  const copy = {};
  for (const key of keys) {
    const value = string(field(row, key));
    if (value !== undefined) copy[key] = value;
  }
  return copy;
}
function boolean(row, key, copy) {
  const value = field(row, key);
  if (value !== undefined && typeof value !== 'boolean') fail('material-context');
  if (value !== undefined) copy[key] = value;
}
function snapshot(scene = {}) {
  const copy = pick(scene, ['roomId', 'location', 'description']);
  boolean(scene, 'doorOpen', copy);
  copy.facts = list(field(scene, 'materialFacts')).map(factText);
  copy.objects = list(field(scene, 'objects')).map(row => {
    const object = pick(row, ['id', 'name', 'placement', 'carrier']);
    boolean(row, 'closed', object); boolean(row, 'transparent', object);
    return object;
  });
  copy.readable = list(field(scene, 'readable')).map(row => pick(row, ['id', 'name', 'carrier']));
  copy.access = list(field(scene, 'access')).map(row => {
    const access = pick(row, ['id', 'name']); boolean(row, 'allowed', access); return access;
  });
  return copy;
}
function freeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
/** Host-only builder. Inputs MUST already be owner/branch/visibility scoped.
 * scene accepts a flat before snapshot, or { before, after }. Only explicitly
 * acquired material text/facts are copied; readable labels alone grant no text.
 * Unknown fields (including hidden truth and provenance) are never traversed.
 * No event text from speech/writing is promoted to a physical world fact. */
export function buildMaterialProseContext(input = {}) {
  const scene = field(input, 'scene') ?? {};
  const wrapped = field(scene, 'before') !== undefined || field(scene, 'after') !== undefined;
  const before = snapshot(wrapped ? field(scene, 'before') ?? {} : scene);
  const after = wrapped && field(scene, 'after') !== undefined ? snapshot(field(scene, 'after')) : before;
  const materials = list(field(input, 'knownMaterials'), 24).map(row => {
    const copy = pick(row, ['id', 'name', 'ownerId', 'carrier']);
    boolean(row, 'acquired', copy);
    if (copy.acquired === true) {
      const text = string(field(row, 'text'), 4000);
      if (text !== undefined) copy.text = text;
      copy.facts = list(field(row, 'facts'), 16).map(factText);
    }
    return copy;
  });
  const events = list(field(input, 'events')).map(row => {
    const event = pick(row, ['id', 'speaker', 'delivery']);
    if (!['action', 'speech', 'writing', 'reading'].includes(event.delivery)) fail('material-context');
    // A reading event records acquisition, not physical truth of the document.
    if (event.delivery === 'action') event.text = string(field(row, 'text'), 4000);
    return event;
  });
  const intent = pick(field(input, 'intent') ?? {}, ['type', 'subjectId', 'targetId']);
  const context = freeze({ version: 1, before, after, events, materials, intent });
  if (JSON.stringify(context).length > 48000) fail('material-context');
  contexts.add(context);
  return context;
}

const split = text => text.split(/[，,。；;！!？?\n]+/u).map(row => row.trim()).filter(Boolean);
const normalize = text => text.replace(/[\s「」『』“”"、：:]/gu, '').replace(/^(?:我|你)(?:看见|看到|注意到)/u, '')
  .replace(/^(?:眼前|此刻|现在)/u, '').replace(/已经|仍然|依然/gu, '');
const uncertain = /(?:可能|也许|似乎|仿佛|好像|据说|听说|声称|自称|谎称|认为|表示|坚称|断言|否认|猜测|怀疑|担心|说道|说过|(?:她|他)说|写着|写道|字样|文字|如果|假如|要是|是否|难道)/u;
// Mask only literal quote spans, not the surrounding narration. An unmatched
// quote does not turn the remainder of a paragraph into a dialogue exemption.
const unquoted = text => text.replace(/「[^「」]*」|『[^『』]*』|“[^“”]*”|"[^"\n]*"/gu, match => ' '.repeat(match.length));
const supported = (claim, facts) => facts.some(fact => !uncertain.test(fact) && normalize(fact) === normalize(claim));
const sceneFacts = scene => [scene.description ?? '', ...scene.facts,
  ...scene.objects.map(row => `${row.placement ?? ''}${row.name ?? ''}`)].flatMap(value => [
  ...split(value), ...value.split(/[。；;！!？?\n]+/u).map(row => row.trim()).filter(Boolean),
]);
const contact = /(?:手指|指尖|手掌).{0,8}(?:触到|摸到|碰到|划过|抚过|按在)|(?:摸了摸|触摸了|碰了碰|拿起了|翻动了)/u;
const nonactualContact = /(?:没有|并未|尚未|还没|不曾|未曾|不|没|试图|试着|准备|想要).{0,5}(?:触到|摸到|碰到|划过|抚过|按在|触摸|拿起|翻动)/u;
const traceClaim = /(?:没有|并无|毫无|不见|找不到|未见).{0,5}(?:划痕|刮痕|擦痕)|(?:划痕|刮痕|擦痕).{0,4}(?:不存在|全无)|(?:留下|出现|有着).{0,5}(?:划痕|刮痕|擦痕)/u;
const preciseSurface = /(?:纸边|纸张边缘|纸页边缘|纸角).{0,10}(?:崭新|全新|新鲜|刚.{0,3}(?:撕|裁)|整齐得|比.{0,6}(?:整齐|平滑|锋利))|(?:纸面|桌面|地面|表面).{0,10}比.{0,10}(?:光滑|平整|粗糙|干净|整齐)|(?:纸边|纸张边缘|纸页边缘).{0,5}(?:没有|毫无).{0,4}(?:磨损|折痕)/u;
const distance = /(?:相距|距离|隔着|离.{0,12})(?:约|大约|只有|足有|仅有)?[一二三四五六七八九十百\d.]+(?:米|公尺|厘米)|[一二三四五六七八九十百\d.]+(?:米|公尺|厘米)(?:远|之外|开外)/u;
const barsOpacity = /(?:铁栏|栏杆|栅栏).{0,12}(?:完全|彻底|严严实实).{0,5}(?:挡住|遮住|遮蔽|隔绝).{0,5}(?:视线|视野|光线)|(?:门外|栏外|栅栏外).{0,5}(?:一片漆黑|什么也看不见|完全看不见|没有任何光源)/u;
const negatedAssertion = /(?:并不|并非|不是|并未|没有|不能|无法).{0,4}(?:完全|彻底|严严实实|挡住|遮住|一片漆黑|四米远)|(?:话音|尾音|话声).{0,4}(?:没有|并未|不曾|未曾|不会).{0,5}(?:响起|落下|回荡|散去|停下|消失)/u;
const speechResidue = /(?:她|他|[\p{Script=Han}]{2,6})的(?:话音|尾音|话声).{0,8}(?:未落|落下|回荡|散去|停下|消失)|(?:她|他)的话音/u;
const closedContents = /(?:柜内|柜子里|柜里|柜中|柜门后).{0,12}(?:摆着|放着|躺着|堆着|有一|露出|清晰可见)|(?:看清|看到|看见).{0,8}(?:柜内|柜子里|柜里|柜中).{0,12}(?:物品|纸|瓶|书|钥匙)/u;

/** Targeted checks, NOT a universal semantic truth checker. eventIndex is the
 * COUNT of already published canonical event blocks (0 initially), never the
 * index of a future event. after applies only after all events are published.
 * Only host-built contexts are accepted; rebuild after persistence rather than
 * accepting a model-supplied or JSON-cloned materialContext as authority. */
export function assertMaterialProse(input = {}) {
  const context = field(input, 'context');
  if (!contexts.has(context) || context.version !== 1) fail('material-context');
  const kind = field(input, 'kind') ?? 'narrator';
  if (!['narrator', 'narration', 'action', 'speech', 'writing', 'utterance'].includes(kind)) fail('material-kind');
  const eventIndex = field(input, 'eventIndex') ?? 0;
  if (!Number.isSafeInteger(eventIndex) || eventIndex < 0 || eventIndex > context.events.length) fail('material-event-index');
  const text = string(field(input, 'text'), 6000);
  if (typeof text !== 'string') fail('material-text');
  if (['speech', 'writing', 'utterance'].includes(kind)) return true;
  const scene = eventIndex === context.events.length ? context.after : context.before;
  const published = context.events.slice(0, eventIndex);
  const facts = [...sceneFacts(scene), ...published.filter(row => row.delivery === 'action').flatMap(row => split(unquoted(row.text ?? '')))];
  const selected = context.intent.subjectId ? [...context.materials, ...scene.readable].filter(row => row.id === context.intent.subjectId) : [];
  const knownPhone = [...scene.objects, ...scene.readable, ...context.materials].some(row => row.carrier === 'phone'
    || /手机/u.test(row.name ?? ''));
  const paperSelection = selected.some(row => ['paper', 'paper-book', 'voting-paper'].includes(row.carrier));
  const phoneSelection = selected.some(row => row.carrier === 'phone');
  const authorizedPaper = [...scene.objects, ...scene.readable, ...context.materials]
    .some(row => ['paper', 'paper-book', 'voting-paper'].includes(row.carrier));
  const cabinets = scene.objects.filter(row => /柜/u.test(row.name ?? ''));
  const closedCabinet = cabinets.some(row => row.closed === true && row.transparent !== true)
    || /(?:柜门|柜子|木柜|铁柜).{0,6}(?:紧闭|关着|关闭)/u.test(scene.description ?? '');
  for (const sentence of unquoted(text).split(/[。；;！!？?\n]+/u)) {
    const parts = split(sentence);
    for (const claim of parts) {
      if (uncertain.test(claim) || supported(claim, facts)) continue;
      if (traceClaim.test(claim)) fail('material-trace', eventIndex);
      if (preciseSurface.test(claim)) fail('material-surface', eventIndex);
      // Documentary measurements do not establish current court geometry.
      if (distance.test(claim) && !/(?:并非|不是|不到|超过|不止).{0,4}[一二三四五六七八九十百\d.]+(?:米|公尺|厘米)/u.test(claim)
        && /(?:审判庭|法庭|证物台|证据台|席位|座位|桌子|门口|我|你|她|他)/u.test(claim)) fail('material-distance', eventIndex);
      if (phoneSelection && !authorizedPaper && /(?:纸质(?:时间表|选票|资料|薄册)|(?:翻开|翻看|抽出|摊开|展开).{0,8}(?:薄册|纸票|纸质时间表)|(?:纸票|纸质选票).{0,8}(?:填写|投进|投入|递给))/u.test(claim)
        && !/(?:没有|并未|不是|并非|不曾|未曾).{0,8}(?:纸质|纸票|薄册|翻开|翻看|抽出|摊开|展开)/u.test(claim)) fail('material-carrier', eventIndex);
      if (paperSelection && !knownPhone && /手机/u.test(claim)
        && !/(?:没有|并未|没|不曾|未曾|不是).{0,6}(?:手机|打开|翻看|显示|读)/u.test(claim)
        && /(?:显示|屏幕|翻看|打开|读|图鉴|投票|选票|书)/u.test(claim)) fail('material-carrier', eventIndex);
      if (['look', 'inspect', 'examine'].includes(context.intent.type) && contact.test(claim)
        && !nonactualContact.test(claim)) fail('material-contact', eventIndex);
      if (barsOpacity.test(claim) && !negatedAssertion.test(claim)
        && /铁栏|栏杆|栅栏/u.test(scene.description ?? '')) fail('material-optics', eventIndex);
      const referencedCabinets = cabinets.filter(row => row.name && claim.includes(row.name));
      const containerBlocked = referencedCabinets.length ? referencedCabinets.every(row => row.closed === true && row.transparent !== true) : closedCabinet;
      if (containerBlocked && closedContents.test(claim)
        && !/(?:没有|并未|没|不曾|未曾|无法|不能).{0,5}(?:摆着|放着|躺着|堆着|有一|露出|看清|看到|看见)/u.test(claim)) fail('material-closed-container', eventIndex);
      if (speechResidue.test(claim) && !negatedAssertion.test(claim)) {
        const name = claim.match(/^([\p{Script=Han}]{2,3})的(?:话音|尾音|话声)/u)?.[1];
        const speech = published.filter(row => row.delivery === 'speech');
        if (!speech.length || (name && !speech.some(row => row.speaker === name))) fail('material-speech-residue', eventIndex);
      }
      for (const access of scene.access.filter(row => row.allowed === true)) {
        if ((access.name && claim.includes(access.name) || access.id === context.intent.targetId || access.id === context.intent.subjectId)
          && /(?:手势|抬手|伸手|摆手|目光).{0,12}(?:让我|使我|令我).{0,5}(?:无法|不能|不得|不再获准)/u.test(claim)
          && !/(?:没有|并未|不会|不能).{0,5}(?:让我|使我|令我)/u.test(claim)) fail('material-lawful-access', eventIndex);
      }
    }
    if (!uncertain.test(sentence) && /(?:门锁|牢门|铁门|栅栏门).{0,8}(?:解锁|未锁|没锁|打开|开启)/u.test(sentence)
      && /(?:因此|所以|这意味着|便|就).{0,8}(?:获准|允许|有权|可以随意|可以自由)/u.test(sentence)
      && !/(?:不|未|没有|并非).{0,4}(?:获准|允许|有权|可以)/u.test(sentence)
      && !supported(sentence.trim(), facts)) fail('material-unlocked-permission', eventIndex);
  }
  return true;
}

const contextsV2 = new WeakSet();
// v2-only import kept below the frozen v1 prefix hash boundary.
import { physicalFactSnapshotV2WithElevation } from '../world/physical-fact-elevation.mjs';
const failV2 = (rule, eventIndex) => {
  try { fail(rule, eventIndex); } catch (error) {
    diagnostics.set(error, Object.freeze({ ...diagnostics.get(error), version: 2 })); throw error;
  }
};
function boundaryV2(value) {
  const copy = pick(value, ['ownerId', 'branchId', 'roomId']);
  if (['ownerId', 'branchId', 'roomId'].some(key => !copy[key] || copy[key].length > 128)) failV2('material-context');
  for (const key of ['generation', 'revision', 'worldTime']) {
    const number = field(value, key);
    if (!Number.isSafeInteger(number) || number < (key === 'generation' ? 1 : 0)) failV2('material-context');
    copy[key] = number;
  }
  return copy;
}
function v2Snapshot(value, expected) {
  const copy = snapshot(value);
  if (copy.roomId !== expected.roomId) failV2('material-context');
  const physical = field(value, 'physicalFacts');
  if (physical !== undefined) {
    if (field(physical, 'version') !== 2) failV2('material-context');
    try { copy.physical = physicalFactSnapshotV2WithElevation(physical, expected); }
    catch { failV2('material-context'); }
  }
  return copy;
}
/** Explicit v2 host adapter; no call site automatically opts in. Boundary n
 * means exactly n published canonical events, not an arbitrary old observation.
 * endpoints are mandatory. Intermediate current facts require an exact optional
 * eventSnapshots row; there is deliberately no cumulative action-text authority.
 * scope/boundaries stay host-only. They verify the receiving projection, not the
 * truth or provenance of raw model text. Materials remain documentary, never
 * current geometry. The caller filters owner/ancestry/acquisition before use. */
export function buildMaterialProseContextV2(input = {}) {
  try {
    const scene = field(input, 'scene');
    const beforeValue = field(scene, 'before'); const afterValue = field(scene, 'after');
    const bounds = field(input, 'boundaries');
    const beforeBoundary = boundaryV2(field(bounds, 'before')); const afterBoundary = boundaryV2(field(bounds, 'after'));
    if (['ownerId', 'branchId', 'generation', 'revision'].some(key => beforeBoundary[key] !== afterBoundary[key])
      || beforeBoundary.worldTime > afterBoundary.worldTime) failV2('material-context');
    const before = v2Snapshot(beforeValue, beforeBoundary); const after = v2Snapshot(afterValue, afterBoundary);
    const events = list(field(input, 'events')).map(row => {
      const event = pick(row, ['id', 'speaker', 'delivery']);
      if (!event.id || !['action', 'speech', 'writing', 'reading'].includes(event.delivery)) failV2('material-context');
      return event; // Canonical document disclosures can also be action: no text is physical authority.
    });
    if (new Set(events.map(row => row.id)).size !== events.length) failV2('material-context');
    const timeline = field(input, 'eventTimeline');
    if (timeline !== undefined) {
      if (field(timeline, 'start') !== beforeBoundary.worldTime || field(timeline, 'end') !== afterBoundary.worldTime) failV2('material-context');
      const times = list(field(timeline, 'events')); let cursor = beforeBoundary.worldTime;
      if (times.length !== events.length) failV2('material-context');
      for (const [index, row] of times.entries()) {
        const occurredAt = field(row, 'occurredAt');
        if (field(row, 'eventId') !== events[index].id || !Number.isSafeInteger(occurredAt)
          || occurredAt < cursor || occurredAt > afterBoundary.worldTime) failV2('material-context');
        events[index].occurredAt = occurredAt; cursor = occurredAt;
      }
    }
    const intermediate = list(field(input, 'eventSnapshots')).map(row => {
      const eventIndex = field(row, 'eventIndex'); const boundary = boundaryV2(field(row, 'boundary'));
      if (!Number.isSafeInteger(eventIndex) || eventIndex <= 0 || eventIndex >= events.length
        || ['ownerId', 'branchId', 'generation', 'revision'].some(key => boundary[key] !== beforeBoundary[key])
        || boundary.worldTime < beforeBoundary.worldTime || boundary.worldTime > afterBoundary.worldTime
        || events[eventIndex - 1].occurredAt !== undefined && boundary.worldTime !== events[eventIndex - 1].occurredAt) failV2('material-context');
      return { eventIndex, boundary, scene: v2Snapshot(field(row, 'scene'), boundary) };
    });
    if (new Set(intermediate.map(row => row.eventIndex)).size !== intermediate.length) failV2('material-context');
    intermediate.sort((a, b) => a.eventIndex - b.eventIndex);
    if (intermediate.some((row, index) => index && row.boundary.worldTime < intermediate[index - 1].boundary.worldTime)) failV2('material-context');
    const materials = list(field(input, 'knownMaterials'), 24).map(row => {
      const copy = pick(row, ['id', 'name', 'carrier']);
      // Validate, but never expose a hidden owner identity in the copied context.
      const owner = string(field(row, 'ownerId'), 128);
      if (owner !== undefined && owner !== beforeBoundary.ownerId) failV2('material-context');
      boolean(row, 'acquired', copy);
      if (copy.acquired === true) {
        const text = string(field(row, 'text'), 4000); if (text !== undefined) copy.text = text;
        copy.facts = list(field(row, 'facts'), 16).map(factText);
      }
      return copy;
    });
    const context = freeze({ version: 2, before, after, events, intermediate, materials,
      times: { before: beforeBoundary.worldTime, after: afterBoundary.worldTime },
      intent: pick(field(input, 'intent') ?? {}, ['type', 'subjectId', 'targetId']) });
    if (JSON.stringify(context).length > 48000) failV2('material-context');
    contextsV2.add(context); return context;
  } catch (error) {
    const diagnostic = diagnostics.get(error);
    if (diagnostic && diagnostic.version !== 2) diagnostics.set(error, Object.freeze({ ...diagnostic, version: 2 }));
    throw error;
  }
}

const escapePattern = value => value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
// One bounded grammar supplies BOTH ordinary checks and the lock implication.
// Units retain source offsets and their incoming connector: splitting an
// independent consequence must not erase the lock -> permission relationship.
// These are existing target families, not a general Chinese truth parser.
const attributed = /(?:声称|自称|谎称|认为|表示|坚称|断言|否认|猜测|怀疑|担心|说道|说过|(?:她|他)说|写着|写道)/u;
const resultLinkV2 = /^(?:所以|因此|因而|从而|于是|故而|这意味着|便|就)$/u;
function predicateUnitsV2(sentence) {
  const links = /[，,]+|所以|因此|因而|从而|于是|故而|这意味着|致使|使得|导致|让|使|令|但(?:是)?|然而|却|并且|而且|与此同时|同时|且|而|便|就/gu;
  const access = lawfulAccessPredicateV2.exec(sentence);
  const cuts = [...sentence.matchAll(links)].filter(match => {
    // The gesture/cause complement is itself ONE lawful-access predicate.
    if (access && access.index <= match.index && match.index < access.index + access[0].length) return false;
    // 便/就 only introduce a bounded permission consequence here, not arbitrary
    // words containing those characters. No new prose vocabulary is inferred.
    return !/^(?:便|就)$/u.test(match[0]) || permissionPredicateV2.test(sentence.slice(match.index + match[0].length));
  });
  const units = []; let start = 0; let link = ''; let reportBoundary = false;
  for (const cut of [...cuts, { index: sentence.length, 0: '' }]) {
    const raw = sentence.slice(start, cut.index); const text = raw.trim();
    if (text) {
      units.push({ text, start: start + raw.indexOf(text), end: start + raw.indexOf(text) + text.length, link, reportBoundary });
      // Incoming edges belong to this unit only, never a later unrelated one.
      link = ''; reportBoundary = false;
    }
    if (cut[0]) {
      const punctuation = /^[，,]+$/u.test(cut[0]);
      // Reduce only EMPTY separator runs: ，因此 and 因此， have the same
      // semantic edge. A later nonpunctuation connector still replaces it.
      // Bare commas retain the historical report reset; punctuation adjoining
      // a semantic complement is not a separate reported-claim boundary.
      if (!punctuation || !link) { link = cut[0]; reportBoundary = punctuation; }
    }
    start = cut.index + cut[0].length;
  }
  let reported = false;
  for (const unit of units) {
    if (unit.reportBoundary) reported = false;
    const predicate = materialPredicateV2(unit.text)
      ?? /(?:柜内|柜子里|柜里|柜中|柜门后|玻璃柜|木柜|门锁|牢门|铁门|栅栏门)/u.exec(unit.text);
    const attribution = attributed.exec(unit.text);
    // A preceding report scopes its actual claim and following complements.
    // Attribution after the material predicate cannot retroactively scope it.
    if (attribution && predicate && attribution.index < predicate.index) reported = true;
    unit.reported = reported;
  }
  return units;
}
// All modality/polarity checks consume the SAME unit and bounded match. Later
// emotional/result tokens cannot modify an antecedent; earlier independent
// emotion or speculative material units cannot modify an affirmative result.
function predicateScopeV2(unit, predicate = materialPredicateV2(unit.text), negative) {
  const prefix = predicate ? unit.text.slice(0, predicate.index + predicate[0].length) : unit.text;
  return { uncertain: unit.reported || uncertain.test(prefix), negated: negative ? negative.test(unit.text) : false };
}
const v2Normalize = text => text.replace(/[\s「」『』“”"、：:]/gu, '').replace(/^(?:我|你)(?:看见|看到|注意到)/u, '');
const v2Supported = (claim, facts) => facts.some(fact => !uncertain.test(fact) && v2Normalize(fact) === v2Normalize(claim));
const v2SceneFacts = scene => [scene.description ?? '', ...scene.facts,
  ...scene.objects.map(row => `${row.placement ?? ''}${row.name ?? ''}`)].flatMap(value =>
  value.split(/[。；;！!？?\n]+/u).filter(sentence => !uncertain.test(sentence)).flatMap(sentence => [sentence.trim(), ...split(sentence)]));
const negatedPredicate = /(?:没有|并未|尚未|还没|不曾|未曾|不是|并非|无法|不能|未能).{0,6}(?:摆着|放着|躺着|堆着|有一|露出|看清|看到|看见|显示|翻看|打开|展开|翻开|抽出|摊开|读)/u;
const paperUse = /(?:纸质(?:时间表|选票|资料|薄册|图鉴)|(?:翻开|翻看|抽出|摊开|展开).{0,8}(?:薄册|纸票|纸质时间表|纸质资料)|(?:纸票|纸质选票).{0,8}(?:填写|投进|投入|递给)|接.{0,6}票纸|笔尖.{0,8}格子)/u;
const phoneUse = /手机/u;
function carrierConflictV2(claim, context, scene, objects) {
  if (!context.intent.subjectId || negatedPredicate.test(claim)
    || /(?:没有|并未|不是|并非|不曾|未曾).{0,8}(?:纸质|纸票|薄册|手机)/u.test(claim)) return false;
  const available = [...scene.readable, ...objects, ...context.materials.filter(row => row.acquired === true)];
  let selected = available.filter(row => row.id === context.intent.subjectId);
  // A document's selected identity is not lost between events. This fallback
  // constrains its carrier only; it grants no possession, content or geometry.
  if (!selected.length) selected = context.before.readable.filter(row => row.id === context.intent.subjectId);
  const carriers = new Set(selected.map(row => row.carrier).filter(Boolean));
  if (carriers.size > 1) failV2('material-context');
  if (!carriers.size) return false;
  const carrier = [...carriers][0];
  const paper = ['paper', 'paper-book', 'voting-paper'];
  const alternate = carrier === 'phone' ? paperUse : paper.includes(carrier)
    && /(?:显示|屏幕|翻看|打开|读|图鉴|投票|选票|书)/u.test(claim) ? phoneUse : undefined;
  if (!alternate) return false;
  const assertions = [...claim.matchAll(new RegExp(alternate.source, 'gu'))];
  if (!assertions.length) return false;
  // Bind each contrary carrier phrase to a named actual alternate object. An
  // unrelated name elsewhere in the clause cannot authorize the selected copy.
  return assertions.some(match => !available.some(row => row.id !== context.intent.subjectId && row.name
    && (carrier === 'phone' ? paper.includes(row.carrier) : row.carrier === 'phone')
    && !selected.some(item => item.name && claim.includes(item.name))
    && [...claim.matchAll(new RegExp(escapePattern(row.name), 'gu'))].some(named =>
      named.index < match.index + match[0].length && match.index < named.index + named[0].length)));

}
// Bounded contents predicates require positive *current* support. An open or
// transparent container grants possible sight, never a particular item. No
// closure/emptiness/existence is inferred, and no world/source lookup is made.
const contentsV2 = /(?:柜内|柜子里|柜里|柜中|柜门后)(?:面|头)?(?:(?:现在|正|还|仍然|整齐地|静静地|静静|稳稳地|清晰地)){0,2}(?:摆着|放着|躺着|堆着|有一|露出|清晰可见|可见)/u;
// Bind postposed existential denial to the relative object of THIS predicate,
// not a later person's existence or another object's negative predicate.
const deniedRelativeObjectV2 = (claim, match) => /^(?:的)?(?:一张|一把|一支|一个|几张|几把)?(?:纸卡|卡片|纸张|纸条|记录纸|登记卡|钥匙|长柄扫帚)(?:并)?不存在(?:$|[，,。；;！!？?])/u
  .test(claim.slice(match.index + match[0].length));
function unsupportedContentsV2(claim, facts) {
  if (v2Supported(claim, facts)) return false;
  const match = contentsV2.exec(claim);
  if (!match) return false;
  const prefix = claim.slice(0, match.index);
  return !/(?:没有|并未|尚未|还没|不曾|未曾|无法|不能).{0,5}(?:看清|看到|看见)$/u.test(prefix)
    && !deniedRelativeObjectV2(claim, match);
}
function physicalContradictionV2(claim, physical) {
  if (!physical) return undefined;
  for (const surface of physical.surfaces) {
    const pattern = new RegExp(`${escapePattern(surface.name)}(?:上|里|中)?(?:面)?(?:现在|仍然|还|正)?(?:摆着|放着|躺着|堆着|有(?:一|几|些)|出现).{0,12}(?:纸卡|卡片|纸张|纸条|记录纸|登记卡)`, 'u');
    const match = pattern.exec(claim);
    if (match && !/^(?:并)?不存在(?:$|[，,。；;！!？?])/u.test(claim.slice(match.index + match[0].length))) return 'material-absence';
  }
  const pose = physical.pose;
  // Only explicit current self-state contradictions; no implied posture from
  // assigned bunks, 'unknown', somebody else's body, speculation or past events.
  const posture = /^(?:我(?:的身体)?|自己)(?:现在|此刻|仍然|还|正|已经)?(?:安静地|静静地)?(躺|坐|站)(?:着|在)/u.exec(claim)?.[1];
  if (posture && pose.posture !== 'unknown' && ({ 躺: 'lying', 坐: 'sitting', 站: 'standing' })[posture] !== pose.posture)
    return 'material-posture';
  const support = /^(?:我(?:的身体)?|自己)(?:现在|此刻|仍然|还|正|已经)?(?:安静地|静静地)?(?:躺|坐|站)(?:着)?在(床上|椅子上|椅上|地板上|地面上|地上)/u.exec(claim)?.[1];
  if (support && pose.support !== 'unknown' && (support === '床上' ? 'bed' : /椅/u.test(support) ? 'chair' : 'floor') !== pose.support)
    return 'material-posture';
  return undefined;
}
// The end of a matched bounded assertion is the maximum uncertainty scope.
// Tokens in a later emotional/result predicate cannot retroactively modify it.
// These are the existing checker's predicate families, not a Chinese parser.
const lockPredicateV2 = /(?:门锁|牢门|铁门|栅栏门).{0,8}(?:解锁|未锁|没锁|打开|开启)/u;
const permissionPredicateV2 = /(?:获准|允许|有权|可以随意|可以自由)/u;
const lawfulAccessPredicateV2 = /(?:手势|抬手|伸手|摆手|目光).{0,12}(?:让我|使我|令我).{0,5}(?:无法|不能|不得|不再获准)/u;
const placementPredicateV2 = /(?:上|里|中)(?:面)?(?:现在|仍然|还|正)?(?:摆着|放着|躺着|堆着|有(?:一|几|些)|出现).{0,12}(?:纸卡|卡片|纸张|纸条|记录纸|登记卡)/u;
const posturePredicateV2 = /^(?:我(?:的身体)?|自己)(?:现在|此刻|仍然|还|正|已经)?(?:安静地|静静地)?(?:躺|坐|站)(?:着|在)/u;
const traceClaimV2 = new RegExp(`${traceClaim.source}|(?:浅痕|拖痕).{0,4}也没有`, 'u');
const barsOpacityV2 = new RegExp(`${barsOpacity.source}|门贴合了门框.{0,24}光被挡|过道的光被挡在外面|只剩底下那一线`, 'u');
function materialPredicateV2(claim) {
  return [contentsV2, placementPredicateV2, posturePredicateV2, lockPredicateV2, permissionPredicateV2,
    traceClaimV2, preciseSurface, distance, contact, barsOpacityV2, speechResidue, paperUse, lawfulAccessPredicateV2,
    /手机.{0,12}(?:显示|屏幕|翻看|打开|读|图鉴|投票|选票|书)/u]
    .map(pattern => pattern.exec(claim)).filter(Boolean).sort((a, b) => a.index - b.index)[0];
}
/** v2 deliberately uses current boundary snapshots, not the union of past
 * action prose. Unknown intermediate states authorize no precise assertion.
 * This narrows a few sourced defect classes, not all factual Chinese prose. */
export function assertMaterialProseV2(input = {}) {
  try { return checkMaterialProseV2(input); }
  catch (error) {
    const diagnostic = diagnostics.get(error);
    if (diagnostic && diagnostic.version !== 2) diagnostics.set(error, Object.freeze({ ...diagnostic, version: 2 }));
    throw error;
  }
}
function checkMaterialProseV2(input) {
  const context = field(input, 'context');
  if (!contextsV2.has(context)) failV2('material-context');
  const kind = field(input, 'kind') ?? 'narrator';
  if (!['narrator', 'narration', 'action', 'speech', 'writing', 'utterance'].includes(kind)) failV2('material-kind');
  const eventIndex = field(input, 'eventIndex') ?? 0;
  if (!Number.isSafeInteger(eventIndex) || eventIndex < 0 || eventIndex > context.events.length) failV2('material-event-index');
  const text = string(field(input, 'text'), 6000);
  if (typeof text !== 'string') failV2('material-text');
  if (['speech', 'writing', 'utterance'].includes(kind)) return true;
  const scene = !context.events.length || eventIndex === 0 ? context.before : eventIndex === context.events.length ? context.after
    : context.intermediate.find(row => row.eventIndex === eventIndex)?.scene ?? { facts: [], objects: [], readable: [], access: [] };
  const facts = v2SceneFacts(scene); const objects = scene.physical?.objects ?? scene.objects;
  const at = eventIndex === 0 ? context.times.before : eventIndex === context.events.length ? context.times.after
    : context.intermediate.find(row => row.eventIndex === eventIndex)?.boundary.worldTime ?? context.events[eventIndex - 1].occurredAt;
  // No arbitrary 'speech heard once this turn' tail after hours of waiting.
  // Only a preceding speech event at this exact host boundary supports residue.
  // Without a clock projection retain the historical event-order evidence only.
  const speech = context.events.slice(0, eventIndex).filter(row => row.delivery === 'speech'
    && (row.occurredAt === undefined || row.occurredAt === at));
  for (const sentence of unquoted(text).split(/[。；;！!？?\n]+/u)) {
    // An explicit conditional scopes its consequent too. This is not an
    // exemption for an uncertainty token in an unrelated coordinated predicate.
    if (/^\s*(?:如果|假如|要是)/u.test(sentence)) continue;
    const parts = predicateUnitsV2(sentence);
    for (const unit of parts) {
      const claim = unit.text;
      if (predicateScopeV2(unit).uncertain) continue;
      const contradiction = physicalContradictionV2(claim, scene.physical);
      if (contradiction) failV2(contradiction, eventIndex);
      if (carrierConflictV2(claim, context, scene, objects)) failV2('material-carrier', eventIndex);
      if (unsupportedContentsV2(claim, facts)) failV2('material-closed-container', eventIndex);
      if (v2Supported(claim, facts)) continue;
      if (traceClaimV2.test(claim)) failV2('material-trace', eventIndex);
      if (preciseSurface.test(claim)) failV2('material-surface', eventIndex);
      if (distance.test(claim) && !/(?:并非|不是|不到|超过|不止).{0,4}[一二三四五六七八九十百\d.]+(?:米|公尺|厘米)/u.test(claim)
        && /(?:审判庭|法庭|证物台|证据台|席位|座位|桌子|门口|我|你|她|他)/u.test(claim)) failV2('material-distance', eventIndex);
      if (['look', 'inspect', 'examine'].includes(context.intent.type) && contact.test(claim) && !nonactualContact.test(claim))
        failV2('material-contact', eventIndex);
      if (barsOpacityV2.test(claim) && !negatedAssertion.test(claim)
        && (/铁栏|栏杆|栅栏/u.test(scene.description ?? '') || scene.physical?.door.barrier === 'bars')) failV2('material-optics', eventIndex);
      if (speechResidue.test(claim) && !negatedAssertion.test(claim)) {
        const name = claim.match(/^([\p{Script=Han}]{2,3})的(?:话音|尾音|话声)/u)?.[1];
        if (!speech.length || name && !speech.some(row => row.speaker === name)) failV2('material-speech-residue', eventIndex);
      }
      for (const access of scene.access.filter(row => row.allowed === true)) {
        if ((access.name && claim.includes(access.name) || access.id === context.intent.targetId || access.id === context.intent.subjectId)
          && /(?:手势|抬手|伸手|摆手|目光).{0,12}(?:让我|使我|令我).{0,5}(?:无法|不能|不得|不再获准)/u.test(claim)
          && !/(?:没有|并未|不会|不能).{0,5}(?:让我|使我|令我)/u.test(claim)) failV2('material-lawful-access', eventIndex);
      }
    }
    // Inspect retained edges, not an independently reparsed prefix. An
    // intervening emotional unit cannot license OR destroy this bounded link.
    for (const [index, unit] of parts.entries()) {
      const lock = lockPredicateV2.exec(unit.text);
      if (!lock) continue;
      const scope = predicateScopeV2(unit, lock, /(?:并未|没有|尚未|还没).{0,4}(?:解锁|打开|开启)/u);
      if (scope.uncertain || scope.negated) continue;
      for (const next of parts.slice(index + 1)) {
        if (lockPredicateV2.test(next.text)) break;
        const permission = permissionPredicateV2.exec(next.text);
        if (!permission || !resultLinkV2.test(next.link)) continue;
        const result = predicateScopeV2(next, permission, /(?:不|未|没有|并非).{0,4}(?:获准|允许|有权|可以)/u);
        // Exact support is the original causal assertion (or its established
        // comma-separated form), never the unrelated emotional prefix/suffix.
        const assertion = sentence.slice(unit.start, next.end);
        if (!result.uncertain && !result.negated && !v2Supported(assertion, facts)
          && !v2Supported(`${unit.text}，${next.link}${next.text}`, facts)) failV2('material-unlocked-permission', eventIndex);
      }
    }
  }
  return true;
}

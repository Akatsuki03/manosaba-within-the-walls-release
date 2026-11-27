import { ADMISSION_RUNTIME_REVISION } from './ordinary-admission32.mjs';
import { EVENT_DIRECTOR_RUNTIME_REVISION } from '../director/director-event-runtime.mjs';
import { adjudicationPolicy } from '../content/effective-run-boundary.mjs';
import { requiresInitialBoundaryReview } from '../content/initial-run-policy.mjs';
import { PUBLICATION_RUNTIME_REVISION } from '../scenes/ordinary-publication31.mjs';
// Keep the same communication selection for capacity30 and publication31.
import { isDeepStrictEqual, types as utilTypes } from 'node:util';
import { CAPACITY_RUNTIME_REVISION } from '../content/ordinary-capacity30.mjs';
import { presentCommunication28 } from './communication-selection28.mjs';
import { approvedSpeakerLabel, ordinaryAddressForms } from './character-address-policy.mjs';
import { dialogueSequenceFirstSelection, localRoomSpeechScene, ordinaryDialogueSequence, resolvePlayerAddress, roomGroupSpeechLiteral, roomGroupSpeechSource, explicitLocalVocative, ordinaryLocalApproachSource, localReadinessSpeech, ordinaryLocalAmbientSpeechSource, ordinaryLocalAmbientStepTypes, localAmbientPlanSpans, ordinaryLocalSearchSource, localSearchSpeechSelection } from './player-address-resolution.mjs';
import * as prior from './known-target29.mjs';
const revision = value => typeof value === 'string' ? value : value?.source?.executionRevision?.revisionId
  ?? value?.agentRuntimeRevision ?? value?.executionRevision?.revisionId;
export const isCapacity30 = value => revision(value) === CAPACITY_RUNTIME_REVISION;
const usesCurrentSelection = value => isCapacity30(value) || [PUBLICATION_RUNTIME_REVISION, ADMISSION_RUNTIME_REVISION, EVENT_DIRECTOR_RUNTIME_REVISION].includes(revision(value));
export const isCommunicationRuntime = value => usesCurrentSelection(value) || prior.isCommunicationRuntime(value);

function visibleAddressFeature(feature, appearance) {
  if (typeof appearance !== 'string') return false;
  const normalize = value => value.replace(/饰件|饰物/gu, '装饰').replace(/([黑白红蓝黄绿粉紫灰])色/gu, '$1').replace(/的/gu, '');
  const featureText = normalize(feature);
  const surfaces = appearance.split(/[，、,；;。！？\n]/u).map(normalize);
  if (surfaces.some(surface => surface.includes(featureText))) return true;
  // A visible hat may be described without a ribbon or other intervening
  // detail. Keep every stated qualifier and the same item in one clause.
  const hat = /^(.{1,16}?)(贝雷帽|礼帽|草帽|兜帽)$/u.exec(featureText);
  if (!hat) return false;
  return surfaces.some(surface => {
    const at = surface.indexOf(hat[1]);
    if (at < 0) return false;
    const after = at + hat[1].length;
    const item = surface.indexOf(hat[2], after);
    return item >= after && item - after <= 6;
  });
}

function currentVisualQuotedAddress(raw, scene, targetId, formsFor) {
  if (typeof raw !== 'string' || raw.length > 2000 || /[<>\u0000-\u001f\u007f]/u.test(raw) || !Array.isArray(scene?.nearby)) return null;
  const address = /^(?:我\s*)?(?:对|對|向)\s*([^「」\n，；：:,;]{1,110}?)(?:直接|当面|當面)?(?:说|說|问|問|打招呼)[：:]\s*「([^「」]+)」[。.!！]?$/u.exec(raw.trim());
  if (!address) return null;
  const reference = address[1].trim();
  const nearby = scene.nearby;
  let matches;
  if (/^(?:她|他|对方|對方)$/u.test(reference)) matches = nearby;
  else {
    const described = /^(?:在场|在場)?(?:眼前|面前|身边|身邊)?(?:的)?(?:那位|这位|這位)?(.+?)(?:的)?(?:女孩|少女|女生|同伴|人)$/u.exec(reference);
    const features = described?.[1].split('、').map(part => /^(?:戴着|戴著|戴|穿着|穿著|穿|披着|披著|留着|留著|有着|有著)([\p{Script=Han}]{2,40}?)(?:的)?$/u.exec(part.trim())?.[1]);
    matches = nearby.filter(row => row.label === reference || formsFor?.(row).includes(reference) || Boolean(features?.length && features.length <= 3
      && features.every(feature => feature && visibleAddressFeature(feature, row.appearance))));
  }
  if (matches.length !== 1 || matches[0].id !== targetId) return null;
  const start = raw.indexOf('「') + 1;
  return { targetId, start, end: start + address[2].length, text: address[2], form: 'current-quoted-address' };
}

const turnQuoteForm = 'current-turn-quote@1';
const paraBreak = /\n *\n+/u;
const bareTurnQuote = /^「([^\n「」『』“”"]{1,1400})」$/u;
const namedPeer = (scene, name) => scene.nearby.filter(row => row.label === name || name.length <= 4
  && typeof row.label === 'string' && /^\p{Script=Han}+$/u.test(row.label) && row.label.endsWith(name));
const gazeReference = lead => /(?:^我|[，,])(?:又|再|随即|隨即|随后|隨後|转而|轉而|抬眼|抬头|抬頭)*(?:望向|看向|转头看向|轉頭看向)(\p{Script=Han}{2,30})[。！]$/u.exec(lead)?.[1];
function replyVocative(text) {
  const prefix = /^(\p{Script=Han}{2,30})(?=[，,：:…])/u.exec(text)?.[1];
  // An ordinary brief acknowledgment is not a name. Otherwise an ambiguous
  // leading address does not borrow a recipient from a subsequent gesture.
  return prefix && !/^(?:这样[啊吗吧]?|這樣[啊嗎吧]?|是[啊吗吧的]|原来如此|原來如此|我明白了|明白了|知道了|好[吧的啊]|对不起|對不起|谢谢你?|謝謝你?|没关系|沒關係)$/u.test(prefix) ? prefix : undefined;
}
// The quote must be a separate paragraph after the player's own current
// action. A named vocative or a voiced preface with one possible listener
// grants only that quote, not the narrative surrounding it.
function currentTurnQuote(source, scene) {
  if (typeof source !== 'string' || source.length > 2000 || /[<>\u0000-\u0009\u000b-\u001f\u007f]/u.test(source)
    || !Array.isArray(scene?.nearby)) return null;
  const parts = source.split(paraBreak);
  if (parts.length !== 2) return null;
  const [lead, uttered] = parts;
  const quote = bareTurnQuote.exec(uttered);
  if (!quote?.[1].trim() || !/^我[^\n「」『』“”"]+[。！]$/u.test(lead)
    || /(?:如果|假如|假设|假設|要是|就会|就會|要等|等到|除非|只要|昨天|那时|那時|刚才|剛才|曾经|曾經|回忆|回憶|回想|记得|記得|想起|心想|暗想|心里|心裡|心中|内心|內心|默念|默读|默讀|默默|默不作声|默不作聲|缄默|緘默|沉默|想象|想像|不曾|没有|沒有|没说|沒說|未[开開说說发發作]|没[开開作发發]|沒[开開作发發]|不(?:是|再|想|敢|愿意|願意|[说說开開作发發])|无声|無聲|纸条|紙條|纸上|紙上|纸面|紙面|纸[片页]|紙[片頁]|书上|書上|信上|屏幕|引述|引用|转述|轉述|复述|複述|读[出到]|讀[出到]|(?:她|他|对方|對方|有人)[^，,。；;]{0,12}(?:说|說|问|問|声音|聲音))/u.test(lead)) return null;
  const body = quote[1];
  const vocative = /^(\p{Script=Han}{2,30})(?=[，,：:…])/u.exec(body)?.[1];
  const named = vocative ? namedPeer(scene, vocative) : [];
  const gaze = gazeReference(lead);
  const address = replyVocative(body);
  const lookedAt = gaze && scene.nearby.length === 1 && (!address || namedPeer(scene, address).length === 1)
    ? namedPeer(scene, gaze)[0] : null;
  const voiced = /(?:^我|[，,])(?:轻声|輕聲|低声|低聲|小声|小聲)?(?:问道|問道|说道|說道|开口问|開口問|开口说|開口說)[。！]$|(?:^我|[，,])(?:的)?(?:声音|聲音|嗓音|语气|語氣)(?:放轻|放輕|压低|壓低|轻|輕|低)(?:了)?(?:些|一点|一點)?[。！]$/u.test(lead);
  const peer = named.length === 1 ? named[0] : lookedAt ?? (!vocative && voiced && scene.nearby.length === 1 ? scene.nearby[0] : null);
  if (!peer) return null;
  const start = source.length - uttered.length + 1;
  return { targetId: peer.id, start, end: start + body.length, text: body, form: turnQuoteForm };
}

// No saved pre-LF candidate could cover this shape as a single conversation
// or as these complete paragraph pairs. Existing single-step grants always
// win. Canonical output itself keeps the source slices and exact speech.
function paragraphTurn(candidate, data) {
  if (revision(data.initialRunPolicy) !== EVENT_DIRECTOR_RUNTIME_REVISION || data.intentContractVersion !== 2
    || candidate.activitySelection.kind !== 'ordinary'
    || !candidate.steps.every(({ intent, condition }, index) => (condition === 'always' || (index > 0 && condition === 'previous_completed'))
      && ['act', 'conversation'].includes(intent.type) && !intent.operation)) return null;
  const source = data.rawInput;
  const spans = paragraphSpans(source);
  if (!spans) return null;
  const one = candidate.steps.length === 1 && candidate.steps[0].text === source;
  const paired = candidate.steps.length === spans.length && candidate.steps.every((step, i) => step.text === spans[i]);
  const selections = spans.map(span => currentTurnQuote(span, data.scene));
  if (!selections[0] || selections.some(selected => !selected || selected.targetId !== selections[0].targetId)) return null;
  if (candidate.steps.some(({ intent }) => intent.targetId !== undefined && intent.targetId !== selections[0].targetId)) return null;
  let owners;
  let serial = false;
  if (one || paired) {
    if (candidate.steps.some(({ intent }, i) => intent.playerText !== undefined && (one || intent.playerText !== selections[i].text))) return null;
    owners = spans.map((_, i) => candidate.steps[one ? 0 : i]);
  } else {
    // A legal plan may separate an observable motion from a quoted line.
    // Re-pair only complete source slices with a conversation proposal owning
    // each whole quote. Uniform previous_completed is a serial chain: keep
    // the between-pair gate and let the Host finish/interrupt the earlier
    // local delivery before executing the next. Mixed or material conditions
    // are not re-paired; they could express a different dependency.
    serial = candidate.steps[0].condition === 'always'
      && candidate.steps.slice(1).every(step => step.condition === 'previous_completed');
    if (!serial && !candidate.steps.every(step => step.condition === 'always')) return null;
    let cursor = 0;
    const ranges = [];
    for (const step of candidate.steps) {
      const start = source.indexOf(step.text, cursor);
      if (start < 0 || source.slice(cursor, start).trim()) return null;
      cursor = start + step.text.length;
      ranges.push({ start, end: cursor, step });
    }
    if (source.slice(cursor).trim()) return null;
    let at = 0;
    const quotes = selections.map((selected, i) => {
      const start = source.indexOf(spans[i], at);
      at = start + spans[i].length;
      return { start: start + selected.start - 1, end: start + selected.end + 1, text: selected.text };
    });
    const linked = quotes.map(quote => ranges.find(range => range.start <= quote.start && quote.end <= range.end));
    if (linked.some(range => range?.step.intent.type !== 'conversation')) return null;
    for (const range of ranges) {
      const literal = range.step.intent.playerText;
      const owned = quotes.filter((_, i) => linked[i] === range);
      if (range.step.intent.type === 'conversation' && !owned.length) return null;
      if (literal !== undefined && (owned.length !== 1 || owned[0].text !== literal)) return null;
    }
    owners = linked.map(range => range.step);
  }
  return { ...candidate, steps: spans.map((text, index) => ({ text,
    condition: paired ? owners[index].condition : serial && index > 0 ? 'previous_completed' : 'always', intent: {
    type: 'conversation', targetId: selections[index].targetId, playerText: selections[index].text,
    summary: owners[index].intent.summary,
  } })) };
}

function paragraphSpans(source) {
  const cuts = [...source.matchAll(new RegExp(paraBreak.source, 'gu'))];
  if (cuts.length !== 3 && cuts.length !== 5) return null;
  const spans = []; let from = 0;
  for (let i = 1; i < cuts.length; i += 2) {
    spans.push(source.slice(from, cuts[i].index));
    from = cuts[i].index + cuts[i][0].length;
  }
  return [...spans, source.slice(from)];
}

// A conversation already underway can start with an isolated voiced reply,
// turn toward its only named, present listener, continue speaking and then
// attempt an independent action. The two speakers' turn order is not the
// model's grouping: an enacted action always precedes its own quoted speech.
function replyTurnParts(source) {
  if (typeof source !== 'string' || source.length > 2000 || /[<>\u0000-\u0009\u000b-\u001f\u007f]/u.test(source)) return null;
  const parts = source.split(paraBreak);
  if (parts.length !== 4) return null;
  const [reply, gaze, line, attempt] = parts;
  const replyText = bareTurnQuote.exec(reply)?.[1]; const lineText = bareTurnQuote.exec(line)?.[1];
  const name = gazeReference(gaze);
  if (!replyText?.trim() || !lineText?.trim() || !name
    || !/^我[^\n「」『』“”"]+[。！]$/u.test(attempt)
    || /(?:如果|假如|假设|假設|要是|若|等到|等她|除非|只要|曾经|曾經|刚才|剛才|昨天|回想|心想|心里|心裡|心中|默念|没做|沒做|不(?:去|想|会|會|做|再))/u.test(attempt)) return null;
  const surface = [...source.matchAll(new RegExp(paraBreak.source,'gu'))];
  const pair = source.slice(surface[0].index + surface[0][0].length, surface[2].index);
  const quoteRanges = [[0, reply.length], [surface[1].index + surface[1][0].length, surface[2].index]];
  return { reply, replyText, pair, line, lineText, name, gaze, attempt, quoteRanges, prefix: source.slice(0, surface[1].index) };
}

function replyGazeOnly(gaze) {
  // A local glance can have one preceding act of looking. An actual travel,
  // object interaction or direction to somebody else needs its own step.
  const clauses = gaze.split(/[，,]/u);
  return clauses.length === 1 || clauses.length === 2
    && /^我(?:看了看|看向|望了望|扫了一眼|瞥了一眼|打量了?)[^。！？；;]{1,80}$/u.test(clauses[0])
    && !/(?:跨|迈|穿过|走(?:进|出|到)|进入|离开|推开|拉开|打开|伸手|碰到|拦住|叫她|让她|叫他|让他)/u.test(clauses[0]);
}

function replyThenAct(candidate, data) {
  if (revision(data.initialRunPolicy) !== EVENT_DIRECTOR_RUNTIME_REVISION || data.intentContractVersion !== 2
    || candidate.activitySelection.kind !== 'ordinary' || data.scene.nearby?.length !== 1) return null;
  const parts = replyTurnParts(data.rawInput);
  if (!parts) return null;
  const peer = namedPeer(data.scene, parts.name)[0];
  const delivered = currentTurnQuote(parts.pair, data.scene);
  const addressedInReply = replyVocative(parts.replyText);
  if (!peer || addressedInReply && namedPeer(data.scene, addressedInReply)[0]?.id !== peer.id
    || delivered?.targetId !== peer.id || delivered.text !== parts.lineText) return null;
  const steps = candidate.steps, tail = steps.at(-1), speech = steps.slice(0, -1);
  if (!speech.length || tail.text !== parts.attempt || tail.intent.type !== 'act' || tail.intent.operation
    || tail.intent.targetId !== undefined || tail.intent.playerText !== undefined) return null;
  const serial = steps[0].condition === 'always' && steps.slice(1).every(step => step.condition === 'previous_completed');
  if (!serial && !steps.every(step => step.condition === 'always')) return null;
  const [first, second] = speech;
  // This previously rejected packaging grants only the same canonical speech
  // spans. The job already carries the current local-recipient version; legacy
  // unmarked tasks and stored canonical results keep their old meaning.
  const mislabeledReply = [1, 2, 3].includes(data.ordinaryAddressVersion) && data.openActionVersion === 1 && serial && steps.length === 3
    && approvedSpeakerLabel(peer.id) === peer.label && replyGazeOnly(parts.gaze)
    && first.text === parts.prefix && first.intent.type === 'act'
    && (first.intent.targetId === undefined || first.intent.targetId === peer.id)
    && Object.keys(first.intent).every(key => ['type', 'summary', 'targetId'].includes(key))
    && second.text === parts.line && Object.keys(second.intent).every(key => ['type', 'summary', 'targetId', 'playerText'].includes(key))
    && Object.keys(tail.intent).every(key => ['type', 'summary'].includes(key));
  if (!speech.every((step, index) => (index === 0 && mislabeledReply)
    || step.intent.type === 'conversation' && step.intent.targetId === peer.id && !step.intent.operation)) return null;
  const covers = []; let cursor = 0;
  for (const { text, intent } of speech) {
    const start = data.rawInput.indexOf(text, cursor);
    if (start < 0 || data.rawInput.slice(cursor, start).trim()) return null;
    cursor = start + text.length;
    const quotes = parts.quoteRanges.flatMap(([left, right], i) => start <= left && right <= cursor ? [i] : []);
    const literals = [parts.replyText, parts.lineText];
    if (!quotes.length || intent.playerText !== undefined && (quotes.length !== 1 || intent.playerText !== literals[quotes[0]])) return null;
    for (const i of quotes) {
      if (covers[i]) return null;
      covers[i] = intent;
    }
  }
  if (!covers[0] || !covers[1] || data.rawInput.slice(cursor, -parts.attempt.length).trim()) return null;
  const step = (text, playerText, i) => ({ text, condition: i && serial ? 'previous_completed' : 'always',
    intent: { type:'conversation', targetId:peer.id, playerText, summary:covers[i].summary } });
  return { ...candidate, steps: [step(parts.reply, parts.replyText, 0), step(parts.pair, parts.lineText, 1), tail] };
}

export function paragraphTurnSourceBound(source, steps) {
  if (typeof source !== 'string' || source.length > 2000 || !Array.isArray(steps) || steps.length < 2) return false;
  const reply = replyTurnParts(source);
  if (reply && steps.length === 3) {
    const [first, second, tail] = steps;
    return first?.text === reply.reply && first.condition === 'always' && first.intent.type === 'conversation'
      && first.intent.playerText === reply.replyText && second?.text === reply.pair
      && second.intent.type === 'conversation' && second.intent.playerText === reply.lineText
      && typeof first.intent.targetId === 'string' && second.intent.targetId === first.intent.targetId
      && tail?.text === reply.attempt && tail.intent.type === 'act' && !tail.intent.operation && tail.intent.targetId === undefined
      && tail.intent.playerText === undefined && second.condition === tail.condition && ['always','previous_completed'].includes(second.condition);
  }
  const spans = paragraphSpans(source);
  return spans?.length === steps.length && steps.every(({ text, condition, intent }, i) =>
    text === spans[i] && (condition === 'always' || (i > 0 && condition === 'previous_completed'))
    && isParagraphTurnSpeech(text, intent) && intent.targetId === steps[0].intent.targetId
    && text.endsWith(`\n「${intent.playerText}」`));
}

// This is an enactment pin, not another way to admit speech or amend a task.
// The root and cold reader independently derive it from the full admitted plan.
export function bareReplyRootSource(source, steps, scene) {
  const reply = replyTurnParts(source);
  if (!reply || !Array.isArray(steps) || steps.length !== 3 || steps.some(step => !step?.intent)
    || !paragraphTurnSourceBound(source, steps)) return null;
  const targetId = steps[0].intent.targetId;
  if (scene !== undefined) {
    if (!Array.isArray(scene?.nearby) || scene.nearby.length !== 1 || namedPeer(scene, reply.name)[0]?.id !== targetId) return null;
    const vocative = replyVocative(reply.replyText);
    if (vocative && namedPeer(scene, vocative)[0]?.id !== targetId) return null;
  }
  return { text: reply.replyText, targetId };
}

export function bareReplyRootActionPin(plan, source, steps) {
  return plan.bareReplyRootVersion === 1 && bareReplyRootSource(source, steps) ? { bareReplyRootVersion: 1 } : {};
}

export function isParagraphTurnSpeech(source, intent) {
  return intent?.type === 'conversation' && typeof intent.playerText === 'string' && paraBreak.test(source);
}

export function paragraphTurnRecipientPresent(source, intent, scene) {
  const selected = currentTurnQuote(source, scene);
  return selected !== null && selected.targetId === intent.targetId && selected.text === intent.playerText;
}

// Scene playback uses the same selected listener and exact literal as the
// admission and performance tasks; it cannot replace a disappeared peer.
export function currentAddressedStepPresent(source, intent, scene) {
  if (intent?.type !== 'conversation') return false;
  if (isParagraphTurnSpeech(source, intent) && paragraphTurnRecipientPresent(source, intent, scene)) return true;
  return typeof intent.playerText === 'string' && resolvePlayerAddress(source, scene, intent.targetId)?.text === intent.playerText;
}

// Current V1 extends only the recipient's name forms. Reuse the issued
// text parser with unchanged raw bytes, after resolving the extended set;
// trying the old names first would miss a competing alias on another row.
function currentV1PresentAddress(raw, scene, targetId, formsFor) {
  if (typeof raw !== 'string' || !raw.trim() || raw.length > 2000 || /[<>\u0000-\u001f\u007f]/u.test(raw)) return null;
  const nearby = scene?.nearby;
  if (!Array.isArray(nearby) || !targetId || nearby.filter(row => row.id === targetId).length !== 1) return null;
  const source = raw.trim();
  let named;
  for (const [index, row] of nearby.entries()) {
    const aliases = [row.label, row.appearance, row.appearance ? '那位' + row.appearance : null, ...formsFor(row)];
    let best;
    for (const label of new Set(aliases)) {
      if (typeof label !== 'string' || !label || label.length > 128) continue;
      const escaped = label.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
      const match = new RegExp('^(?:(?:我)?(?:对|對|向|跟|和)\\s*)?' + escaped + '(?=[，,：:\\s]|说|說|问|問)', 'u').exec(source);
      if (match && (!best || match[0].length > best.end)) best = { index, label, end: match[0].length };
    }
    if (!best) continue;
    if (named || row.id !== targetId) return null;
    named = best;
  }
  if (!named || nearby[named.index].label === named.label) return presentCommunication28(raw, scene, targetId);
  const projected = nearby.map((row, index) => index === named.index ? { ...row, label: named.label } : row);
  return presentCommunication28(raw, { ...scene, nearby: projected }, targetId);
}

function selectPresentAddress(data, targetId, speakerId) {
  const current = revision(data.initialRunPolicy) === EVENT_DIRECTOR_RUNTIME_REVISION;
  if (current && data.ordinaryLocalSearchConversationVersion === 1) return localSearchSpeechSelection(data.rawInput,data.scene,targetId);
  if (current && data.ordinaryLocalApproachVersion===3) return localReadinessSpeech(data.rawInput,data.scene,targetId);
  if (current && [1,2].includes(data.ordinaryLocalApproachVersion)) return explicitLocalVocative(data.rawInput, data.scene, targetId);
  if (current && [2, 3].includes(data.ordinaryAddressVersion)) return resolvePlayerAddress(data.rawInput, data.scene, targetId, data.ordinaryDialogueSequenceVersion);
  const formsFor = current && data.ordinaryAddressVersion === 1 && typeof speakerId === 'string'
    ? row => ordinaryAddressForms(speakerId, row) : undefined;
  const selected = formsFor ? currentV1PresentAddress(data.rawInput, data.scene, targetId, formsFor)
    : presentCommunication28(data.rawInput, data.scene, targetId);
  return selected ?? (current ? currentVisualQuotedAddress(data.rawInput, data.scene, targetId, formsFor) : null);
}

export function communicationSelection(data) {
  if (!usesCurrentSelection(data.initialRunPolicy)) return prior.communicationSelection(data);
  if (data.intent?.type !== 'conversation') return null;
  if (data.intent.speechScope === 'room') {
    if (data.roomGroupSpeechVersion !== 1 || revision(data.initialRunPolicy) !== EVENT_DIRECTOR_RUNTIME_REVISION
      || !localRoomSpeechScene(data.scene) || data.intent.targetId !== undefined) return null;
    const literal = data.ordinaryDialogueSequenceVersion === 4
      ? dialogueSequenceFirstSelection(data) : roomGroupSpeechLiteral(data.rawInput);
    if (!literal || literal.text !== data.intent.playerText) return null;
    const { start, end, text, form } = literal;
    return { version: 1, start, end, text, form, rawInput: data.rawInput,
      scope: structuredClone(data.scope), source: structuredClone(data.initialRunPolicy.source) };
  }
  const quoted = revision(data.initialRunPolicy) === EVENT_DIRECTOR_RUNTIME_REVISION
    && isParagraphTurnSpeech(data.rawInput, data.intent) ? currentTurnQuote(data.rawInput, data.scene) : null;
  const stagedQuote = quoted && quoted.targetId === data.intent.targetId && quoted.text === data.intent.playerText ? quoted : null;
  // Existing source-bound staged speech remains first authority in V2; the
  // new recipient resolver must not reinterpret its visible action prefix.
  const selected = [2, 4, 5, 6, 7, 8].includes(data.ordinaryDialogueSequenceVersion) && data.dialogueSequence
    ? dialogueSequenceFirstSelection(data, data.intent.targetId)
    : [2, 3].includes(data.ordinaryAddressVersion) ? stagedQuote ?? selectPresentAddress(data, data.intent.targetId, data.scope?.actorId)
    : selectPresentAddress(data, data.intent.targetId, data.scope?.actorId) ?? stagedQuote;
  if ([2, 3].includes(data.ordinaryAddressVersion) && selected && data.intent.playerText !== undefined && data.intent.playerText !== selected.text) return null;
  return selected ? { version: 1, ...selected, rawInput: data.rawInput,
    scope: structuredClone(data.scope), source: structuredClone(data.initialRunPolicy.source) } : null;
}
// Legacy speech styling may substitute an equivalent vocative. When the new
// address was what authorized the delivery, preserve the player's own words.
export function ordinaryAddressRequiresVerbatim(data, scope) {
  if ([2, 3].includes(data.ordinaryAddressVersion)) return Boolean(data.communicationSelection);
  if (data.ordinaryAddressVersion !== 1 || !data.communicationSelection) return false;
  return communicationSelection({ ...data, scope, ordinaryAddressVersion: undefined }) === null;
}

export function assertCommunicationSelection(data, scope) {
  if (!usesCurrentSelection(data.initialRunPolicy)) return prior.assertCommunicationSelection(data, scope);
  if (!isDeepStrictEqual(data.communicationSelection, communicationSelection({ ...data, scope })))
    throw Object.assign(new Error('当前沟通选择与原文、接收者或任务来源不一致。'), { code: 'INVALID_NARRATIVE_OUTPUT' });
}
export function chosenCommunicationText(data) {
  if (!usesCurrentSelection(data.initialRunPolicy)) return prior.chosenCommunicationText(data);
  const selected = data.communicationSelection;
  return selected && isDeepStrictEqual(selected, communicationSelection({ ...data, scope: selected.scope })) ? selected.text : null;
}
function exactRoomShiftRecord(value, allowed, required = allowed) {
  if (!value || typeof value !== 'object' || utilTypes.isProxy(value)
    || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) return false;
  return Reflect.ownKeys(value).every(key => allowed.includes(key)
    && Object.getOwnPropertyDescriptor(value, key)?.enumerable && Object.hasOwn(Object.getOwnPropertyDescriptor(value, key), 'value'))
    && required.every(key => Object.hasOwn(value, key));
}
const roomShiftSummary = text => typeof text === 'string' && text.trim() && text.length <= 400 && !/[<>\p{Cc}]/u.test(text);

// Repair only a model's partitioning of independently authorized exact source.
// Do not erase extra actions/conditions, alternate peers or model-written text.
export function projectOrdinaryRoomShiftCandidate(candidate, data) {
  if (data.ordinaryDialogueSequenceVersion !== 3 || data.ordinaryAddressVersion !== 3
    || revision(data.initialRunPolicy) !== EVENT_DIRECTOR_RUNTIME_REVISION) return candidate;
  const proof = ordinaryDialogueSequence(data.rawInput, data.scene, undefined, 3);
  if (!proof || !exactRoomShiftRecord(candidate, ['type', 'route', 'summary', 'steps', 'activitySelection', 'boundaryReview'],
    ['type', 'route', 'summary', 'steps', 'activitySelection']) || candidate.type !== 'plan' || candidate.route !== 'steps'
    || !roomShiftSummary(candidate.summary) || !exactRoomShiftRecord(candidate.activitySelection, ['kind'])
    || candidate.activitySelection.kind !== 'ordinary' || !Array.isArray(candidate.steps) || utilTypes.isProxy(candidate.steps)
    || ![1, 3].includes(candidate.steps.length) || Reflect.ownKeys(candidate.steps).length !== candidate.steps.length + 1) return candidate;
  const entries = candidate.steps;
  for (const step of entries) {
    if (!exactRoomShiftRecord(step, ['text', 'condition', 'intent']) || !exactRoomShiftRecord(step.intent,
      ['type', 'summary', 'targetId', 'playerText', 'speechScope'], ['type', 'summary']) || !roomShiftSummary(step.intent.summary)) return candidate;
  }
  const [first, gaze, last] = proof.parts;
  const scope = intent => intent.speechScope === 'room' && !Object.hasOwn(intent, 'targetId');
  const bound = (intent, id) => !Object.hasOwn(intent, 'speechScope') && intent.targetId === id;
  const literal = (intent, ...allowed) => !Object.hasOwn(intent, 'playerText') || allowed.includes(intent.playerText);
  const tailCondition = ({ condition }) => ['always', 'previous_completed'].includes(condition);
  const head = entries[0];
  if (head.condition !== 'always' || head.intent.type !== 'conversation') return candidate;
  if (entries.length === 1) {
    const tailProposal = bound(head.intent, proof.roomMemberId) || scope(head.intent);
    if (head.text !== data.rawInput || !tailProposal && !bound(head.intent, proof.targetId)
      || !literal(head.intent, first.text, data.rawInput.slice(first.start, last.end), ...(tailProposal ? [last.text] : []))) return candidate;
  } else {
    const [, middle, final] = entries;
    if (head.text !== data.rawInput.slice(first.start - 1, first.end + 1) || !bound(head.intent, proof.targetId) || !literal(head.intent, first.text)
      || middle.text !== gaze.action || !tailCondition(middle) || !['look', 'act'].includes(middle.intent.type)
      || Object.hasOwn(middle.intent, 'speechScope') || Object.hasOwn(middle.intent, 'playerText')
      || Object.hasOwn(middle.intent, 'targetId') && middle.intent.targetId !== proof.roomMemberId
      || final.text !== data.rawInput.slice(last.start - 1, last.end + 1) || !tailCondition(final) || final.intent.type !== 'conversation'
      || !scope(final.intent) && !bound(final.intent, proof.roomMemberId) || !literal(final.intent, last.text)) return candidate;
  }
  return { ...candidate, steps: [{ text: data.rawInput, condition: 'always', intent: {
    type: 'conversation', summary: head.intent.summary, targetId: proof.targetId, playerText: first.text,
  } }] };
}

export function projectLocalSpeechCandidate(candidate, data) {
  if (data.ordinaryDialogueSequenceVersion !== 4 || data.ordinaryAddressVersion !== 3 || data.roomGroupSpeechVersion !== 1
    || revision(data.initialRunPolicy) !== EVENT_DIRECTOR_RUNTIME_REVISION) return candidate;
  const proof = ordinaryDialogueSequence(data.rawInput, data.scene, undefined, 4);
  if (!proof || !exactRoomShiftRecord(candidate, ['type', 'route', 'summary', 'steps', 'activitySelection', 'boundaryReview'],
    ['type', 'route', 'summary', 'steps', 'activitySelection']) || candidate.type !== 'plan' || !roomShiftSummary(candidate.summary)
    || !Array.isArray(candidate.steps) || utilTypes.isProxy(candidate.steps)
    || Reflect.ownKeys(candidate.steps).length !== candidate.steps.length + 1) return candidate;
  const first = proof.parts[0], last = proof.parts.at(-1), collapse = (summary) => ({ ...candidate, route:'steps', activitySelection:{kind:'ordinary'},
    steps: [{ text: data.rawInput, condition:'always', intent: { type:'conversation', summary,
      ...(first.speechScope === 'room' ? { speechScope:'room' } : { targetId:first.targetId }), playerText:first.text } }] });
  if (candidate.route === 'clarification' && candidate.steps.length === 0 && !Object.hasOwn(candidate, 'boundaryReview')
    && exactRoomShiftRecord(candidate.activitySelection, ['kind','reason']) && candidate.activitySelection.kind === 'clarification'
    && candidate.activitySelection.reason === 'missing_target' && !requiresInitialBoundaryReview(adjudicationPolicy(data))) {
    const summary = '按已确定的当场讲话范围交谈。';
    return { ...collapse(summary), summary };
  }
  if (candidate.route !== 'steps' || !exactRoomShiftRecord(candidate.activitySelection, ['kind']) || candidate.activitySelection.kind !== 'ordinary') return candidate;
  for (const step of candidate.steps) {
    if (!exactRoomShiftRecord(step, ['text','condition','intent']) || !exactRoomShiftRecord(step.intent,
      ['type','summary','targetId','speechScope','playerText'], ['type','summary']) || !roomShiftSummary(step.intent.summary)) return candidate;
  }
  const absent = (intent, key) => !Object.hasOwn(intent, key);
  const matchingScope = (intent, part) => intent.type === 'conversation' && (part.speechScope === 'room'
    ? intent.speechScope === 'room' && absent(intent, 'targetId') || absent(intent, 'speechScope') && !absent(intent, 'targetId')
      && (intent.targetId === data.scene.replyPeer || intent.targetId === part.memberId) && typeof intent.targetId === 'string'
    : absent(intent, 'speechScope') && intent.targetId === part.targetId);
  const literal = (intent, ...texts) => absent(intent, 'playerText') || texts.includes(intent.playerText);
  if (candidate.steps.length === 1) {
    const [head] = candidate.steps;
    if (head.condition !== 'always' || head.text !== data.rawInput || !matchingScope(head.intent, first)
      || !literal(head.intent, first.text, data.rawInput.slice(first.start, last.end))) return candidate;
    return collapse(head.intent.summary);
  }
  if (candidate.steps.length !== proof.parts.length || candidate.steps.length !== 3) return candidate;
  for (const [i, part] of proof.parts.entries()) {
    const step = candidate.steps[i];
    if (!(i === 0 ? step.condition === 'always' : ['always','previous_completed'].includes(step.condition))) return candidate;
    if (part.kind === 'speech') {
      if (step.text !== data.rawInput.slice(part.start - 1, part.end + 1) || !matchingScope(step.intent, part) || !literal(step.intent, part.text)) return candidate;
    } else if (step.text !== part.action || !['look','act'].includes(step.intent.type) || !absent(step.intent, 'playerText') || !absent(step.intent, 'speechScope')
      || !absent(step.intent, 'targetId') && !part.focus.some(row => row.kind === 'person' && row.id === step.intent.targetId)) return candidate;
  }
  return collapse(candidate.steps[0].intent.summary);
}

export function projectObservedOrientationCandidate(candidate, data) {
  const version = data.ordinaryDialogueSequenceVersion;
  if (![5, 6, 7, 8].includes(version) || data.ordinaryAddressVersion !== 3
    || revision(data.initialRunPolicy) !== EVENT_DIRECTOR_RUNTIME_REVISION) return candidate;
  const proof = ordinaryDialogueSequence(data.rawInput, data.scene, undefined, version);
  if (!proof || !exactRoomShiftRecord(candidate, ['type','route','summary','steps','activitySelection','boundaryReview'],
    ['type','route','summary','steps','activitySelection']) || candidate.type !== 'plan' || candidate.route !== 'steps'
    || !roomShiftSummary(candidate.summary) || !exactRoomShiftRecord(candidate.activitySelection, ['kind'])
    || candidate.activitySelection.kind !== 'ordinary' || !Array.isArray(candidate.steps) || utilTypes.isProxy(candidate.steps)
    || !(version >= 6 ? candidate.steps.length === 1 : [1, 3].includes(candidate.steps.length))
    || Reflect.ownKeys(candidate.steps).length !== candidate.steps.length + 1) return candidate;
  const entries = candidate.steps;
  for (const step of entries) {
    if (!exactRoomShiftRecord(step, ['text','condition','intent']) || !exactRoomShiftRecord(step.intent,
      ['type','summary','targetId','playerText'], ['type','summary']) || !roomShiftSummary(step.intent.summary)) return candidate;
  }
  const first = proof.parts[0], last = proof.parts.at(-1), validSpeech = intent => intent.type === 'conversation' && intent.targetId === proof.targetId;
  const head = entries[0], literal = (intent, ...texts) => !Object.hasOwn(intent, 'playerText') || texts.includes(intent.playerText);
  if (head.condition !== 'always' || !validSpeech(head.intent)) return candidate;
  if (entries.length === 1) {
    if (head.text !== data.rawInput || !(version >= 6 ? literal(head.intent, first.text)
      : literal(head.intent, first.text, data.rawInput.slice(first.start, last.end)))) return candidate;
  } else {
    if (proof.parts.length !== entries.length) return candidate;
    for (const [i, part] of proof.parts.entries()) {
      const step = entries[i];
      if (!(i === 0 ? step.condition === 'always' : ['always','previous_completed'].includes(step.condition))) return candidate;
      if (part.kind === 'speech') {
        if (step.text !== data.rawInput.slice(part.start - 1, part.end + 1) || !validSpeech(step.intent) || !literal(step.intent, part.text)) return candidate;
      } else if (step.text !== part.action || !['look','act'].includes(step.intent.type) || Object.hasOwn(step.intent, 'playerText')
        || Object.hasOwn(step.intent, 'targetId') && !part.focus.some(row => row.kind === 'person' && row.id === step.intent.targetId)) return candidate;
    }
  }
  return { ...candidate, steps: [{ text: data.rawInput, condition: 'always', intent: {
    type:'conversation', summary:head.intent.summary, targetId:proof.targetId, playerText:first.text,
  } }] };
}

const localReadinessAcknowledgment=/^(?:嗯|好的|好|行|可以)[，,]\s*(?:(?:那|那么|那麼)\s*)?(?:我们|我們|咱们|咱們)(?:就)?(?:一起|一同)(?:过去|過去)吧[。！!]/u;
const localReadinessReport=/^([\p{L}·・、]{2,80}?)(?:都在|在)([\p{L}]{2,24}?)(?:里|裡)[。]$/u;

// A general reply anchor proves a possible address, not the meaning of an
// arbitrary quote. This narrower host lane owns only a closed acknowledgment
// and at most one third-person location report. Validate references, never the
// truth of the report or any extra speech act inside it.
export function proveReadinessHostIntent(data) {
  const {scene,rawInput,viewpointActorId}=data;
  const proof=ordinaryLocalApproachSource(rawInput,scene,3);
  if (!proof || scene.replyPeer!==proof.person.targetId) return null;
  const phrase=proof.speech.text, ack=localReadinessAcknowledgment.exec(phrase);
  if (!ack) return null;
  if (ack[0].length===phrase.length) return proof;
  const report=localReadinessReport.exec(phrase.slice(ack[0].length));
  if (!report || !(report[2]===scene.location || scene.adjacent?.some(row=>row.label===report[2]))) return null;
  const people=new Map();
  for (const row of scene.readable ?? []) {
    const id=/^profile:([a-z0-9][a-z0-9-]{0,40})$/u.exec(row?.id ?? '')?.[1];
    const label=/^(.{2,40})的已知人物记录$/u.exec(row?.name ?? '')?.[1];
    if (id && label) people.set(id,{id,label});
  }
  for (const row of scene.nearby ?? []) if (typeof row.id==='string' && !row.id.startsWith('person-')
    && typeof row.label==='string' && row.label!==row.appearance) people.set(row.id,row);
  const ids=[], names=report[1].split(/[和与與、]/u);
  if (names.length>3 || names.some(name=>!name)) return null;
  for (const name of names) {
    const matches=[...people.values()].filter(row=>row.label===name || ordinaryAddressForms(viewpointActorId,row).includes(name));
    if (matches.length!==1 || matches[0].id===viewpointActorId || matches[0].id===proof.person.targetId || ids.includes(matches[0].id)) return null;
    ids.push(matches[0].id);
  }
  return proof;
}

export function readinessApproachPlan(proof) {
  return {type:'plan',route:'steps',summary:'说出原话，在本房走近几步并稍等；是否同行仍待确认。',activitySelection:{kind:'ordinary'},steps:[
    {text:proof.quote,condition:'always',intent:{type:'conversation',summary:'向当前同一人说出原话。',targetId:proof.speech.targetId,playerText:proof.speech.text}},
    {text:proof.approachText,condition:'previous_completed',intent:{type:'act',summary:'在本房朝眼前的人走几步。'}},
    {text:proof.waitText,condition:'previous_completed',intent:{type:'wait',summary:'先短等一次，保留条件同行而不直接移动。'}}
  ]};
}

function classifyReadinessApproach(candidate,data) {
  const proof=ordinaryLocalApproachSource(data.rawInput,data.scene,3);
  const anchored=proof && data.ordinaryAddressVersion===3 && data.openActionVersion===1 && data.intentContractVersion===2
    && revision(data.initialRunPolicy)===EVENT_DIRECTOR_RUNTIME_REVISION;
  if (candidate.route!=='steps') {
    if (!anchored || candidate.route!=='clarification' || candidate.steps.length || candidate.activitySelection?.kind!=='clarification'
      || candidate.activitySelection.reason!=='material_condition' || requiresInitialBoundaryReview(adjudicationPolicy(data))) return candidate;
    return readinessApproachPlan(proof);
  }
  const [head,near,tail]=candidate.steps;
  if (!anchored || candidate.activitySelection?.kind!=='ordinary' || candidate.steps.length!==3
    || head.text!==proof.quote || head.condition!=='always' || head.intent.type!=='conversation'
    || !exactRoomShiftRecord(head.intent,['type','summary','targetId','playerText'],['type','summary','targetId'])
    || head.intent.targetId!==proof.speech.targetId || Object.hasOwn(head.intent,'playerText') && head.intent.playerText!==proof.speech.text
    || near.text!==proof.approachText || near.condition!=='previous_completed' || near.intent.type!=='act' || !exactRoomShiftRecord(near.intent,['type','summary'])
    || tail.text!==proof.waitText || tail.condition!=='previous_completed' || tail.intent.type!=='wait' || !exactRoomShiftRecord(tail.intent,['type','summary'])) {
    // Do not manufacture a recoverable material_condition from conflicting steps.
    return communicationClarification(data.ordinaryAddressVersion);
  }
  return {...candidate,steps:[{...head,intent:{...head.intent,playerText:proof.speech.text}},near,tail]};
}
function classifyPersonApproach(candidate,data) {
  const proof=ordinaryLocalApproachSource(data.rawInput,data.scene,2);
  const anchored=proof && data.ordinaryAddressVersion===3 && data.openActionVersion===1 && data.intentContractVersion===2
    && revision(data.initialRunPolicy)===EVENT_DIRECTOR_RUNTIME_REVISION;
  if (candidate.route!=='steps') {
    if (!anchored || candidate.route!=='clarification' || candidate.steps.length || candidate.activitySelection?.kind!=='clarification'
      || candidate.activitySelection.reason!=='ambiguous_request' || requiresInitialBoundaryReview(adjudicationPolicy(data))) return candidate;
    return {type:'plan',route:'steps',summary:'在当前房间走近几步，再向同一人开口。',activitySelection:{kind:'ordinary'},steps:[
      {text:proof.approachText,condition:'always',intent:{type:'act',summary:'在本房朝眼前的人走几步。'}},
      {text:proof.quote,condition:'previous_completed',intent:{type:'conversation',summary:'向这位同房者说出原话。',targetId:proof.speech.targetId,playerText:proof.speech.text}}
    ]};
  }
  const [head,tail]=candidate.steps;
  if (!anchored || candidate.activitySelection?.kind!=='ordinary' || candidate.steps.length!==2
    || head.text!==proof.approachText || head.condition!=='always' || !exactRoomShiftRecord(head.intent,['type','summary']) || head.intent.type!=='act'
    || tail.text!==proof.quote || tail.condition!=='previous_completed' || tail.intent.type!=='conversation'
    || !exactRoomShiftRecord(tail.intent,['type','summary','targetId','playerText'],['type','summary','targetId'])
    || tail.intent.targetId!==proof.speech.targetId || Object.hasOwn(tail.intent,'playerText') && tail.intent.playerText!==proof.speech.text) {
    // Keep a contradicted steps candidate closed on its second validation too.
    // Only a genuine incoming ambiguous_request can recover from source.
    return {type:'plan',route:'clarification',summary:'接近和开口的计划没有保持原文顺序或同一在场人物。',steps:[],
      activitySelection:{kind:'clarification',reason:'material_condition'}};
  }
  return {...candidate,steps:[head,{...tail,intent:{...tail.intent,playerText:proof.speech.text}}]};
}
function classifyLocalApproach(candidate, data) {
  const proof = ordinaryLocalApproachSource(data.rawInput, data.scene);
  if (!proof || data.ordinaryAddressVersion !== 3 || data.openActionVersion !== 1
    || revision(data.initialRunPolicy) !== EVENT_DIRECTOR_RUNTIME_REVISION || candidate.activitySelection?.kind !== 'ordinary'
    || candidate.steps.length !== 2) return communicationClarification(3);
  const [head, tail] = candidate.steps;
  if (head.text !== proof.quote || head.condition !== 'always' || !exactRoomShiftRecord(head.intent,
    ['type','summary','targetId','playerText'], ['type','summary','targetId']) || head.intent.type !== 'conversation'
    || head.intent.targetId !== proof.speech.targetId || Object.hasOwn(head.intent, 'playerText') && head.intent.playerText !== proof.speech.text
    || tail.text !== proof.approachText || !['always','previous_completed'].includes(tail.condition)
    || !exactRoomShiftRecord(tail.intent, ['type','summary']) || tail.intent.type !== 'act') return communicationClarification(3);
  return { ...candidate, steps: [{ ...head, intent: { ...head.intent, playerText: proof.speech.text } }, tail] };
}

export function openOrientationHostPlan(proof) {
  return {type:'plan',route:'steps',summary:'公开应声，看看附近与楼梯，再向在场者说出原话。',activitySelection:{kind:'ordinary'},
    steps:proof.map(({text,type,kind},index)=>({text,condition:index?'previous_completed':'always',intent:{type,
      summary:{answer:'当场公开应声。',orientation:'看向附近的人与本房楼梯方向。',proposal:'公开说出条件性的提议。'}[kind]}}))};
}
function classifyLocalAmbientSpeech(candidate, data) {
  const version=data.ordinaryLocalAmbientSpeechVersion, proof = ordinaryLocalAmbientSpeechSource(data.rawInput, data.scene, version);
  if (!proof || data.ordinaryAddressVersion !== 3 || data.openActionVersion !== 1
    || revision(data.initialRunPolicy) !== EVENT_DIRECTOR_RUNTIME_REVISION || candidate.activitySelection?.kind !== 'ordinary'
    || !localAmbientPlanSpans(proof,candidate.steps,version)) return communicationClarification(3);
  const types = [3,4].includes(version) ? proof.map(row=>row.type) : ordinaryLocalAmbientStepTypes(version);
  for (const [index, step] of candidate.steps.entries()) {
    if (!(index === 0 ? step.condition === 'always' : ['always','previous_completed'].includes(step.condition))
      || !exactRoomShiftRecord(step.intent, ['type','summary']) || step.intent.type !== types[index]) return communicationClarification(3);
  }
  return candidate;
}

function classifyLocalSearchConversation(candidate,data) {
  const proof=ordinaryLocalSearchSource(data.rawInput,data.scene);
  if (!proof || data.ordinaryAddressVersion !== 3 || data.openActionVersion !== 1
    || revision(data.initialRunPolicy) !== EVENT_DIRECTOR_RUNTIME_REVISION || candidate.activitySelection?.kind !== 'ordinary'
    || candidate.steps.length!==3) return communicationClarification(3);
  const [head,look,tail]=candidate.steps;
  for (const [step,text,selection] of [[head,proof.first,proof.start],[tail,proof.last,proof.proposal]]) {
    if (step.text!==text || !(step===head ? step.condition==='always' : ['always','previous_completed'].includes(step.condition))
      || !exactRoomShiftRecord(step.intent,['type','summary','targetId','playerText'],['type','summary','targetId'])
      || step.intent.type!=='conversation' || step.intent.targetId!==selection.targetId
      || Object.hasOwn(step.intent,'playerText') && step.intent.playerText!==selection.text) return communicationClarification(3);
  }
  if (look.text!==proof.look || !['always','previous_completed'].includes(look.condition)
    || !exactRoomShiftRecord(look.intent,['type','summary','targetId'],['type','summary']) || look.intent.type!=='look'
    || Object.hasOwn(look.intent,'targetId') && look.intent.targetId!==proof.search.subjectId) return communicationClarification(3);
  // Looking for a known person is a bounded attempt, not a guarantee that a
  // hard target survives until execution. Raw bytes bind the subject instead.
  return {...candidate,steps:[{...head,intent:{...head.intent,playerText:proof.start.text}},
    {...look,intent:{type:'look',summary:look.intent.summary}},{...tail,intent:{...tail.intent,playerText:proof.proposal.text}}]};
}
export function validateCommunicationPlan(candidate, data) {
  if (!usesCurrentSelection(data.initialRunPolicy)) return prior.validateCommunicationPlan(candidate, data);
  if (data.ordinaryLocalApproachVersion===3) return classifyReadinessApproach(candidate,data);
  if (data.ordinaryLocalApproachVersion===2) return classifyPersonApproach(candidate,data);
  if (candidate.route!=='steps') {
    if (data.ordinaryLocalAmbientSpeechVersion===3 && data.ordinaryAddressVersion===3 && data.openActionVersion===1
      && data.intentContractVersion===2 && revision(data.initialRunPolicy)===EVENT_DIRECTOR_RUNTIME_REVISION
      && candidate.route==='clarification' && candidate.steps.length===0 && candidate.activitySelection?.kind==='clarification'
      && candidate.activitySelection.reason==='missing_target' && !requiresInitialBoundaryReview(adjudicationPolicy(data))) {
      const proof=ordinaryLocalAmbientSpeechSource(data.rawInput,data.scene,3);
      if (proof) return {type:'plan',route:'steps',summary:'依次执行已明确表达的在场动作与原话。',activitySelection:{kind:'ordinary'},
        steps:proof.map(({text,type},index)=>({text,condition:index?'previous_completed':'always',intent:{type,
          summary:{act:'发出在场者能听见的原话。',look:'看向当场视野所及。',wait:'在当前场所短等。'}[type]}}))};
    }
    return candidate;
  }
  if (data.ordinaryLocalSearchConversationVersion === 1) return classifyLocalSearchConversation(candidate,data);
  if ([1,2,3,4].includes(data.ordinaryLocalAmbientSpeechVersion)) return classifyLocalAmbientSpeech(candidate, data);
  if (data.ordinaryLocalApproachVersion === 1) return classifyLocalApproach(candidate, data);
  if ([5, 6, 7, 8].includes(data.ordinaryDialogueSequenceVersion)) {
    const projected = projectObservedOrientationCandidate(candidate, data);
    return projected === candidate ? communicationClarification(3) : projected;
  }
  if (data.ordinaryDialogueSequenceVersion === 4) {
    const projected = projectLocalSpeechCandidate(candidate, data);
    return projected === candidate ? communicationClarification(3) : projected;
  }
  if (data.ordinaryDialogueSequenceVersion === 3) {
    const projected = projectOrdinaryRoomShiftCandidate(candidate, data);
    return projected === candidate ? communicationClarification(3) : projected;
  }
  const group = candidate.steps.find(step => step.intent.speechScope === 'room');
  if (group) {
    // Intent admission has already verified ownership of every exact span.
    const source = data.roomGroupSpeechVersion === 1 && localRoomSpeechScene(data.scene) && roomGroupSpeechSource(data.rawInput, data.scene);
    if (!source || source.stepText !== group.text) return communicationClarification(data.ordinaryAddressVersion);
    return { ...candidate, steps: candidate.steps.map(step => step === group
      ? { ...step, intent: { ...step.intent, playerText: source.text } } : step) };
  }
  if ([1, 2].includes(data.ordinaryDialogueSequenceVersion) && candidate.steps.length === 1 && candidate.activitySelection?.kind === 'ordinary') {
    const step = candidate.steps[0], intent = step.intent;
    const sequence = step.text === data.rawInput && step.condition === 'always' && intent.type === 'conversation'
      && Object.keys(intent).every(key => ['type', 'targetId', 'summary', 'playerText'].includes(key))
      && ordinaryDialogueSequence(data.rawInput, data.scene, intent.targetId, data.ordinaryDialogueSequenceVersion);
    if (sequence) {
      const first = sequence.parts[0], last = sequence.parts.at(-1);
      // Accept only a literal first anchor, an omitted optional field, or the
      // exact former crossing of these independently authorized same-peer spans.
      if (intent.playerText !== undefined && intent.playerText !== first.text
        && intent.playerText !== data.rawInput.slice(first.start, last.end)) return communicationClarification(3);
      return { ...candidate, steps: [{ ...step, intent: { ...intent, playerText: first.text } }] };
    }
  }
  if (data.ordinaryDialogueSequenceVersion === 2) return communicationClarification(3);
  const paragraphs = paragraphTurn(candidate, data) ?? replyThenAct(candidate, data);
  if (paragraphs) return paragraphs;
  const conversations = candidate.steps.filter(step => step.intent.type === 'conversation');
  if (!conversations.length) return candidate;
  if (data.ordinaryAddressVersion === 3) {
    // Admission already proved exact, ordered source coverage. Bind each
    // ordinary speech clause without consuming another step's action.
    const steps = candidate.steps.map(step => {
      if (step.intent.type !== 'conversation') return step;
      const selected = selectPresentAddress({ ...data, rawInput: step.text }, step.intent.targetId, data.viewpointActorId);
      if (!selected || step.intent.playerText !== undefined && step.intent.playerText !== selected.text) return null;
      return { ...step, intent: { ...step.intent, playerText: selected.text } };
    });
    if (steps.every(Boolean)) return { ...candidate, steps };
    return communicationClarification(3);
  }
  const one = candidate.steps.length === 1 && conversations[0].condition === 'always'
    && conversations[0].text === data.rawInput;
  const selected = one && selectPresentAddress(data, conversations[0].intent.targetId, data.viewpointActorId);
  if (selected && (conversations[0].intent.playerText === undefined || conversations[0].intent.playerText === selected.text)) {
    return data.ordinaryAddressVersion === 2 ? { ...candidate, steps: [
      { ...conversations[0], intent: { ...conversations[0].intent, playerText: selected.text } },
    ] } : candidate;
  }
  return communicationClarification(data.ordinaryAddressVersion);
}
function communicationClarification(version) {
  return { type: 'plan', route: 'clarification', summary: [2, 3].includes(version)
    ? '这句话的当前收件人或说出口的内容还不明确，请确认你在对谁说、说了什么。'
    : '请明确本次现在要向哪位在场者提出的完整请求；私下想法、过去转述与尚未成立的行动条件不执行为发声。',
    steps: [], activitySelection: { kind: 'clarification', reason: 'ambiguous_request' } };
}

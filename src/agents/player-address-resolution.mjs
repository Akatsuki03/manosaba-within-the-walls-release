import { createHash } from 'node:crypto';
import { ordinaryAddressForms } from './character-address-policy.mjs';

export const ORDINARY_DIALOGUE_SEQUENCE_VERSIONS = Object.freeze([1, 2, 3, 4, 5, 6, 7, 8]);
export const LOCAL_POINT_REPLY_ANCHOR = 'same-peer-local-point-reply';

// Resolve authored speech from the current player-facing scene, not from the
// model's chosen ID, NPC voice conventions, private identities, or aliases.
const separators = /[，,：:！!？?。\n]/u;
const safeReference = /^[\p{L}\p{M}\p{N}·・'’ -]{1,64}$/u;
const secondPerson = /^(?:你|您|对方|對方|眼前(?:的)?这位|眼前(?:的)?這位)(?!们|們)/u;
const deictic = /^(?:她|他|你|您|对方|對方|眼前(?:的)?(?:这|這|那)位)$/u;
const greeting = /^(?:你好吗|你好|您好|嗨|喂|早(?:上好)?|晚上好|下午好|好久不见|好久不見|谢谢|謝謝|晚安|再见|再見)(?:[啊呀吗嗎！!。？?，,\s]|$)/u;
const listenerGrammar = /^(?:(?:请|請|麻烦|麻煩|拜托|拜託)\s*(?:你|您)(?!们|們)|劳驾|勞駕|我们(?:来|一起|一同|共同)|我們(?:來|一起|一同|共同))/u;
const acknowledgement = /^(?:嗯+|哦+|啊+|好(?:的|吧|啊)?|是啊|没错|沒錯|这样啊|這樣啊|原来如此|原來如此|听见了|聽見了|知道了|明白了)(?:[。！!？?…～\s]|$)/u;
const subjectAction = /^我(?:已经|已經|已|又|正|就|便|才|随即|轉身|转身|轻轻|輕輕|立刻|马上|馬上|从[^，,。]{0,12})?(?:走[到进進出向回来]|来到|來到|离开|離開|跨|迈|邁|穿过|穿過|开门|開門|打开|打開|推开|推開|拉开|拉開|伸手|点头|點頭|抓|递|遞|拿起|放下|站起|坐下|回头|回頭)/u;
const referenceContainsEnactment = /(?:[从從在向朝].{1,20}(?:走|来|來|回|跑)|(?:推|拉|打|走|跨|迈|邁|穿)(?:开|開|过|過|进|進|出|了)|起身|坐下|放下|伸手|不认识|不認識|不知道|没有|沒有|不是|并非|並非|的|[旁身]边|[旁身]邊)/u;
const notCurrent = /^(?:我(?:(?:刚才|剛才|昨天|曾经|曾經|过去|過去|之前)?(?:在心里|在心裡|在心中|心想|暗想|回(?:忆|憶)|想起|默念|想象|想像|假装|假裝|没有对|沒有對|不(?:想|会|會|打算)?(?:说|說|开口|開口)))|(?:刚才|剛才|昨天|曾经|曾經|之前|那时|那時)(?:我|对|對|向)|(?:如果|假如|要是|等到|等她|等他|只有|除非|假设|假設)(?=.{1,80}(?:才|就|再|我|说|說)))/u;
const reporting = /^(?:我(?:听见|聽見|听说|聽說|记得|記得)|(?:她|他|有人|大家|\p{Script=Han}{2,8})(?:昨天|刚才|剛才|曾经|曾經)?(?:说|說|告诉我|告訴我))\s*[：:]/u;
const compare = v => v.normalize('NFKC').toLocaleLowerCase().trim();
const visibleComparison = v => compare(v).replace(/饰件|饰物/gu, '装饰').replace(/([黑白红蓝黄绿粉紫灰])色/gu, '$1');
const nameVisible = row => typeof row.label === 'string' && typeof row.id === 'string'
  && !row.id.startsWith('person-') && row.label !== row.appearance && safeReference.test(row.label);
const noAmbiguousConjunction = /(?:和|跟|与|與|及|还有|還有|、|\band\b)/iu;
const addressedSpeech = /^(?:我\s*)?(?:对|對|向|跟|和|朝)\s*([^「」『』“”"\n，；：:,;]{1,100}?)(?:当面|當面|直接|轻声|輕聲|低声|低聲)?(?:告诉|告訴|说道|說道|说|說|问道|問道|问|問|回答|打招呼)[：:]\s*/u;
const addressedGaze = /^我(?:望向|看向|转头看向|轉頭看向|转向|轉向|面向|朝向)\s*([^。！？；;，,\n「」“”"]{1,100})(?:[，,](?:管|把)(?:她|他|对方|對方|那位)(?:叫作|叫做|叫|称作|稱作)[「“"]([^」”"\n]{1,48})[」”"])?[。！!：:]\s*(?:\n\s*\n|[ \u3000]*)([\s\S]+)$/u;

function visualMatch(ref, row) {
  if (typeof row.appearance !== 'string') return false;
  const feature = /^(?:(?:眼前|面前|身边|身邊)(?:的)?)?(?:(?:那|这|這)位)?(?:戴着|戴著|戴|穿着|穿著|穿|披着|披著|留着|留著|有着|有著|头戴|頭戴)(.+?)(?:的)?(?:那位|这位|這位|少女|少年|女孩|男孩|同伴|人)?$/u.exec(ref)?.[1];
  return Boolean(feature && feature.length >= 2 && visibleComparison(row.appearance).includes(visibleComparison(feature)));
}
const zhWords = new Intl.Segmenter('zh', { granularity: 'word' });
function nameMatch(ref, row) {
  if (!nameVisible(row) || !safeReference.test(ref)) return 0;
  const label = compare(row.label), wanted = compare(ref);
  if (!/\p{Script=Han}/u.test(wanted)) {
    const words = label.split(/\s+/u).filter(word => word.length >= 2);
    return Math.max(0, ...words.filter(word => wanted === word || wanted.startsWith(`${word} `) || wanted.endsWith(` ${word}`)).map(word => word.length));
  }
  const points = [...label];
  // Compare public name spans, not a table of accepted endings. A one-token
  // surname is a weak candidate only for a conventional two/three-Han name;
  // it cannot overpower a complete name or a longer explicit name span.
  for (let size = points.length; size >= 2; size--) {
    for (let start = 0; start <= points.length - size; start++) {
      if (wanted.includes(points.slice(start, start + size).join(''))) return size;
    }
  }
  return /^[\p{Script=Han}]{2,3}$/u.test(label) && zhWords.segment(wanted).containing(0)?.segment === points[0] ? 1 : 0;
}
function matching(ref, scene) {
  const people = scene.nearby;
  if (deictic.test(ref)) {
    return scene.replyPeer ? people.filter(row => row.id === scene.replyPeer) : people.length === 1 ? people : [];
  }
  const ranked = people.map(row => [row, typeof row.label !== 'string' ? 0 : compare(ref) === compare(row.label)
    || typeof row.appearance === 'string' && compare(ref) === compare(row.appearance) ? 1000
    : visualMatch(ref, row) ? 500 : !noAmbiguousConjunction.test(ref) && !referenceContainsEnactment.test(ref) ? nameMatch(ref, row) : 0]);
  const maximum = Math.max(0, ...ranked.map(([, weight]) => weight));
  if (maximum > 0) return ranked.filter(([, weight]) => weight === maximum).map(([row]) => row);
  return scene.replyAddress === ref ? people.filter(row => row.id === scene.replyPeer) : [];
}
const selected = (raw, targetId, start, end, form) => ({ targetId, start, end, text: raw.slice(start, end), form });

function quoteRange(source) {
  const pairs = [['「', '」'], ['『', '』'], ['“', '”'], ['"', '"']];
  const row = pairs.find(([left]) => source.startsWith(left));
  if (!row) return null;
  const end = source.lastIndexOf(row[1]);
  return end > 1 && /^[。！？.!?\s]*$/u.test(source.slice(end + 1)) ? { start: 1, end } : null;
}
// New ordinary lanes use the first matched close. Preserve legacy quoteRange
// for stored single-recipient plans, their pending tasks and replay.
const quotePairs = new Map([['「', '」'], ['『', '』'], ['“', '”'], ['"', '"']]);
const quoteClosers = new Set(quotePairs.values());
export function topLevelPlayerQuotes(source) {
  if (typeof source !== 'string' || source.length > 2000) return null;
  const stack = [], spans = [];
  let open;
  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    if (ch === stack.at(-1)) {
      stack.pop();
      if (!stack.length) spans.push({ open, start: open + 1, end: i, close: i + 1 });
    } else if (quotePairs.has(ch)) {
      if (!stack.length) open = i;
      stack.push(quotePairs.get(ch));
    } else if (quoteClosers.has(ch)) return null;
  }
  return stack.length ? null : spans;
}
function strictQuoteRange(source) {
  const spans = topLevelPlayerQuotes(source);
  if (spans?.length !== 1 || spans[0].open !== 0 || spans[0].end <= 1
    || !/^[。！？.!?\s]*$/u.test(source.slice(spans[0].close))) return null;
  const { start, end } = spans[0]; return { start, end };
}

const eyebrowTransition = /^我(?:微微|轻轻|輕輕)?(?:皱着眉|皺著眉|皱了皱眉|皺了皺眉|皱起眉(?:头)?|皺起眉(?:頭)?|皱眉|皺眉)$/u;
const glanceTransition = /^我(?:小心地|轻轻地|輕輕地)?(?:看着|看著|看向|望着|望著|望向)\s*([^，,。！？；;\n]{1,64})$/u;
const pauseTransition = /^我(?:顿了顿|頓了頓|停顿了一下|停頓了一下|停了一下|略作停顿|略作停頓)$/u;
const privateTransition = /^(?:(?:努力|试着|試著|试图|試圖)?(?:回忆|回憶|回想|想起)(?:昨晚|昨天|剛才|刚才|此前|之前|先前|早些时候|早些時候)(?:发生的|發生的|的)?(?:事|事情)|犹豫了一下|猶豫了一下)$/u;
const sameRoomSequence = scene => typeof scene?.roomId === 'string' && !['court', 'unavailable'].includes(scene.roomId)
  && [undefined, 'daily', 'aftermath'].includes(scene.case?.stage)
  && !scene.guard?.pending && scene.guard?.detention?.status !== 'detained' && !scene.confinement?.returnRequired;

const localSequenceAnchor = 'local-gaze-name';
const addressTitle = /^(?:同学|同學|小姐|先生|酱|醬|桑|君)/u;
const addressTail = /^[，,：:！!？?]|^(?:你|您)(?!们|們)/u;
const namedQuestionTail = /^(?:醒来|醒來|醒过来|醒過來|记得|記得|还记得|還記得|觉得|覺得|看见|看見|也有|是不是|也是|当时|當時|那边|那邊)/u;
const continuationVoice = /^(?:(?:又|再|接着|接著|随后|隨後|继续|繼續|顺口|順口)\s*)?(?:补充(?:说|說|道|一句)?|補充(?:说|說|道|一句)?|(?:开口|開口|继续|繼續|接着|接著)?(?:说|說)(?:道)?|加(?:了)?一句)\s*[：:]$/u;
const continuationThought = /^我(?:稍微|略微|略|稍|又)?(?:想了想|想了一下|稍作思考|思索了片刻|想了片刻|犹豫了一下|猶豫了一下)$/u;
function continuationGap(segment) {
  const clauses = segment.split(/[，,]/u).map(piece => piece.trim());
  if (clauses.length === 1 && continuationVoice.test(clauses[0].replace(/^我\s*/u, ''))) return {};
  if (clauses.length === 2 && continuationThought.test(clauses[0]) && continuationVoice.test(clauses[1].replace(/^我\s*/u, '')))
    return { reflection: `${clauses[0]}。` };
  return null;
}

function namedLocalGaze(segment, scene) {
  const glance = glanceTransition.exec(segment.replace(/[。！!]$/u, ''));
  if (!glance || !/^我(?:小心地|轻轻地|輕輕地)?(?:看向|望向)/u.test(segment)) return null;
  return namedLocalReference(glance[1].trim(), scene);
}

function namedLocalReference(ref, scene, allowAffinityTitle = false) {
  // Explicit public names only: 眼前那位, descriptions and a player's
  // unverified nickname are not independent evidence of the gaze target.
  if (!safeReference.test(ref) || deictic.test(ref) || referenceContainsEnactment.test(ref)
    || noAmbiguousConjunction.test(ref)) return null;
  const hits = matching(ref, scene);
  if (hits.length !== 1 || !nameVisible(hits[0])) return null;
  const label = compare(hits[0].label), given = compare(ref).replace(allowAffinityTitle
    ? /(?:同学|同學|小姐|先生|酱|醬|桑|君|亲|親)$/u : /(?:同学|同學|小姐|先生|酱|醬|桑|君)$/u, '');
  return given.length >= 2 && label.includes(given) ? hits[0].id : null;
}

// Parse only a leading vocative or an overt name/title + question. A mention
// inside the clause (including quoted recollection, or X 说过) is not a target.
// Do not run the fuzzy matcher on an entire unpunctuated sentence.
function localQuotedRecipients(text, scene) {
  const body = text.trim().replace(/^(?:(?:那个|那個|嗯|呃|啊)[，,、…\s]+)+/u, '');
  const hits = [];
  for (const row of scene.nearby.filter(nameVisible)) {
    const label = [...row.label];
    for (let i = 0; i < label.length - 1; i++) for (let k = i + 2; k <= label.length; k++) {
      const name = label.slice(i, k).join('');
      if (compare(body.slice(0, name.length)) !== compare(name)) continue;
      const rest = body.slice(name.length).trimStart(), title = addressTitle.exec(rest)?.[0];
      const tail = (title ? rest.slice(title.length) : rest).trimStart();
      if (!tail || addressTail.test(tail) || title && namedQuestionTail.test(tail) && /[？?]$/u.test(body))
        hits.push([name.length, row.id]);
    }
  }
  const largest = Math.max(0, ...hits.map(([size]) => size));
  const named = [...new Set(hits.filter(([size]) => size === largest).map(([, id]) => id))];
  // A clear title + vocative for a name absent from the delivered roster also
  // cannot inherit the local anchor. Plain name mentions remain unclassified.
  if (!named.length) {
    const lead = /^\p{Script=Han}{1,8}?(?:同学|同學|小姐|先生|酱|醬|桑|君)\s*/u.exec(body);
    if (lead && addressTail.test(body.slice(lead[0].length))) return [null];
  }
  return named;
}

export function ordinaryDialogueSequence(raw, scene, targetId, version = 1) {
  if (version === 3) return ordinaryRoomShiftSource(raw, scene, targetId);
  if ([4, 5, 6, 7, 8].includes(version)) {
    const proof = version === 4 ? ordinaryLocalSpeechSource(raw, scene) : ordinaryObservedOrientationSource(raw, scene, version);
    return proof && (targetId === undefined || targetId === proof.targetId) ? proof : null;
  }
  if (typeof raw !== 'string' || !raw.trim() || raw.length > 1400 || /[<>\u0000-\u0008\u000b-\u001f\u007f]/u.test(raw)
    || !sameRoomSequence(scene) || ![1, 2].includes(version)) return null;
  if (version === 1 && (typeof targetId !== 'string' || scene.replyPeer !== targetId
    || scene.nearby?.filter(row => row.id === targetId).length !== 1)) return null;
  if (version === 2 && !Array.isArray(scene.nearby)) return null;
  const quotes = topLevelPlayerQuotes(raw);
  if (!quotes || ![2, 3].includes(quotes.length)) return null;
  const ranges = [];
  let from = 0;
  for (const gap of raw.matchAll(/\n[ \t]*\n(?:[ \t]*\n)*/gu)) {
    ranges.push([from, gap.index]); from = gap.index + gap[0].length;
  }
  ranges.push([from, raw.length]);
  if (ranges.length !== 2 * quotes.length - 1) return null;
  if (version === 2) {
    const [fromGaze, endGaze] = ranges.at(-2), tail = quotes.at(-1);
    const gaze = namedLocalGaze(raw.slice(fromGaze, endGaze).trim(), scene);
    const named = localQuotedRecipients(raw.slice(tail.start, tail.end), scene);
    if (!gaze || named.length !== 1 || named[0] !== gaze || targetId !== undefined && targetId !== gaze
      || scene.replyPeer !== undefined && scene.replyPeer !== gaze) return null;
    targetId = gaze;
    // Keep the proof local to this source; never backfill scene.replyPeer.
  }
  const parts = [];
  for (const [index, [offset, limit]] of ranges.entries()) {
    const range = raw.slice(offset, limit), segment = range.trim(), start = offset + range.search(/\S/u);
    if (!segment || /\n/u.test(segment)) return null;
    if (index % 2 === 0) {
      const quote = quotes[index / 2], literal = raw.slice(quote.start, quote.end);
      if (quote.open !== start || quote.close !== start + segment.length
        || groupVocative.test(literal) || openGroupQuestion.test(literal)) return null;
      if (version === 2) {
        const recipients = localQuotedRecipients(literal, scene);
        if (!literal.trim() || recipients.some(id => id !== targetId)
          || /^(?:大家|各位|你们|你們|众人|眾人|诸位|諸位)/u.test(literal.trim())) return null;
        // The two independent ending anchors authorize plain quoted prose.
        // A known-name mention before its predicate does not switch speaker.
      } else {
        const selected = resolvePlayerAddress(segment, scene, targetId, 1);
        if (!selected || start + selected.start !== quote.start || start + selected.end !== quote.end) return null;
      }
      parts.push({ kind: 'speech', start: quote.start, end: quote.end, text: literal });
      continue;
    }
    const cue = version === 2 && continuationGap(segment);
    if (cue) {
      parts.push({ kind: 'transition', start, end: start + segment.length, ...cue });
      continue;
    }
    const pieces = segment.replace(/[。！!]$/u, '').split(/[，,]/u).map(piece => piece.trim());
    if (!pieces[0] || pieces.length > 2 || pieces[1] !== undefined && !privateTransition.test(pieces[1])) return null;
    const glance = glanceTransition.exec(pieces[0]);
    if (!eyebrowTransition.test(pieces[0]) && !pauseTransition.test(pieces[0])
      && !(glance && matching(glance[1], scene).length === 1 && matching(glance[1], scene)[0].id === targetId)) return null;
    parts.push({ kind: 'transition', start, end: start + segment.length, action: `${pieces[0]}。`,
      ...(pieces[1] ? { reflection: `我${pieces[1]}。` } : {}) });
  }
  return { version, roomId: scene.roomId, targetId, parts, ...(version === 2 ? { anchor: localSequenceAnchor } : {}) };
}

export function dialogueSequencePerformance(raw, scene, intent, version) {
  if (!ORDINARY_DIALOGUE_SEQUENCE_VERSIONS.includes(version) || intent?.type !== 'conversation' || version !== 4 && intent.speechScope !== undefined) return null;
  const sequence = ordinaryDialogueSequence(raw, scene, intent.targetId, version), first = sequence?.parts[0];
  if (!first || first.text !== intent.playerText || version === 4
    && (first.speechScope !== intent.speechScope || first.targetId !== intent.targetId)) return null;
  const { targetId, roomId, parts, anchor } = sequence;
  return { rawInput: raw.slice(first.start - 1, first.end + 1), ordinaryDialogueSequenceVersion: version,
    dialogueSequence: { ...(version === 4 && first.speechScope === 'room' ? { speechScope: 'room' } : { targetId }), roomId,
      spans: parts.map(({ kind, start, end }) => ({ kind, start, end })), ...(anchor ? { anchor } : {}) } };
}

// The performance packet deliberately lacks the suffix. Callers validate its
// proof shape; admission/recovery must rebuild the proof from the full source.
export function dialogueSequenceFirstSelection(data, targetId) {
  const proof = data.dialogueSequence;
  if ([4, 5, 6, 7, 8].includes(data.ordinaryDialogueSequenceVersion)) {
    const version = data.ordinaryDialogueSequenceVersion;
    const group = data.intent?.speechScope === 'room';
    if (proof?.anchor !== (version === 6 ? LOCAL_POINT_REPLY_ANCHOR : [5, 7, 8].includes(version) ? OBSERVED_ORIENTATION_ANCHOR : LOCAL_SPEECH_ANCHOR)
      || proof.roomId !== data.scene?.roomId || version >= 5 && (group || data.scene?.replyPeer !== targetId)
      || (group ? proof.speechScope !== 'room' || Object.hasOwn(proof, 'targetId') : proof.targetId !== targetId
        || data.scene?.nearby?.filter(row => row.id === targetId).length !== 1)) return null;
    const input = data.rawInput, quote = typeof input === 'string' && strictQuoteRange(input), first = proof.spans?.[0];
    if (!quote || quote.end !== input.length - 1 || first?.kind !== 'speech' || first.end - first.start !== quote.end - quote.start
      || input.slice(quote.start, quote.end) !== data.intent.playerText) return null;
    const output = selected(input, targetId, quote.start, quote.end, group ? 'current-room-group@1' : 'current-quoted-address');
    if (group) delete output.targetId;
    return output;
  }
  if (data.ordinaryDialogueSequenceVersion !== 2 || proof?.anchor !== localSequenceAnchor
    || proof.targetId !== targetId || proof.roomId !== data.scene?.roomId
    || data.scene?.replyPeer !== undefined && data.scene.replyPeer !== targetId
    || data.scene?.nearby?.filter(row => row.id === targetId && nameVisible(row)).length !== 1) return null;
  const input = data.rawInput, quote = typeof input === 'string' && strictQuoteRange(input);
  const span = proof.spans?.[0];
  return quote && quote.end === input.length - 1 && span?.kind === 'speech'
    && span.end - span.start === quote.end - quote.start
    && input.slice(quote.start, quote.end) === data.intent?.playerText
    ? selected(input, targetId, quote.start, quote.end, 'current-quoted-address') : null;
}

export const dialogueSequenceActionPin = (plan, performanceTask) => ORDINARY_DIALOGUE_SEQUENCE_VERSIONS.includes(plan.ordinaryDialogueSequenceVersion)
  && performanceTask?.context?.data?.ordinaryDialogueSequenceVersion === plan.ordinaryDialogueSequenceVersion
  ? { ordinaryDialogueSequenceVersion: plan.ordinaryDialogueSequenceVersion } : {};

// Only current, openly audible room speech. These are source frames, not a
// heuristic that chooses a person from the scene or creates a quote.
const localGroup = '(?:(?:眼前|面前|这里|這裡|在场|在場|同室)(?:的)?)?(?:大家|众人|眾人|各位|你们|你們|几位|幾位|所有人)';
const explicitRoomFrame = new RegExp(`^(?:我)?(?:向|对|對|朝)(?:着|著)?${localGroup}(?:说(?:道)?|說(?:道)?|问(?:道)?|問(?:道)?|询问|詢問|开口问|開口問)[：:]\\s*`, 'u');
const groupVocative = new RegExp(`^${localGroup}(?:[，,：:！!]|(?:有谁|有誰|知道|听见|聽見|觉得|覺得))`, 'u');
const openGroupQuestion = /^(?:(?:那个|那個)[…。.，,\s]*)?(?:(?:请问|請問)[，,：:\s]*)?(?:有谁|有誰|有人(?:知道|听见|聽見|看到|看过|看過|能|愿意|願意))/u;
const lookAtGroup = new RegExp(`^(?:我)?(?:小心地|轻轻地|輕輕地|先|又)?(?:望了望|看了看|环顾|環顧|打量|看向|望向|扫视|掃視)(?:(?:聚|围|圍|围坐|圍坐)在[^，,。；;！？\\n]{1,24}(?:旁|边|邊|前|周围|周圍)(?:的)?)?${localGroup}(?=[，,。！!]|$)`, 'u');
const physicalFrameOnly = /^(?:我)?(?:小心地|轻轻地|輕輕地|先|又)?(?:望了望|看了看|环顾|環顧|扫视|掃視|瞥见|瞥見|看向|望向|打量|等着|等著|等候|等待|停下来|停下來)/u;
const outsideGroupBoundary = /(?:假如|如果|要是|除非|等到|等.{1,30}(?:之后|之後|以后|以後)|回想|昨天|曾经|曾經|转述|轉述|心里|心裡|心中|默念|低声|低聲|悄悄|耳边|耳邊|纸条|紙條|笔谈|筆談|写下|寫下|隔[着著]|[喊叫]|(?:走进|走進|走到|走向|离开|離開|走出|进入|進入|跨过|跨過)|[「」『』“”"])/u;

export const ROOM_SHIFT_ANCHOR = 'reply-to-current-room';
const includedRoomVocative = new RegExp(`^([\\p{L}\\p{M}·・'’ -]{2,30}?)\\s*(?:[，,、]\\s*)?(?:还有|還有|以及|和|并及|並及)\\s*${localGroup}[，,、：:]\\s*`, 'u');
const groupwardGaze = /^(?:我\s*)?(?:又|再|接着|接著|随后|隨後|也|并|並)\s*(?:看向|望向|望了望|看了看|环顾|環顧|扫视|掃視)\s*(?:其他人|其它人|其余人|其餘人|在场的?(?:大家|众人|各位|人)|在場的?(?:大家|眾人|各位|人)|大家|众人|眾人|各位)$/u;

// Two genuinely closed literal speech spans around exactly one dual gaze.
// Participant identity and the heard audience are independent of this syntax.
export function ordinaryRoomShiftSource(raw, scene, targetId) {
  if (typeof raw !== 'string' || raw.length > 1400 || /[<>\u0000-\u0008\u000b-\u001f\u007f]/u.test(raw)
    || !sameRoomSequence(scene) || !Array.isArray(scene.nearby) || scene.nearby.length < 2) return null;
  const peer = scene.replyPeer;
  if (typeof peer !== 'string' || targetId !== undefined && targetId !== peer
    || scene.nearby.filter(row => row.id === peer).length !== 1) return null;
  const quotes = topLevelPlayerQuotes(raw);
  if (quotes?.length !== 2) return null;
  const [first, last] = quotes;
  if (raw.slice(0, first.open).trim() || raw.slice(last.close).trim()) return null;
  const gap = /^(?:[ \t]*\n[ \t]*\n)+[ \t]*([^\n]+?)[ \t]*(?:\n[ \t]*\n[ \t]*)+$/u.exec(raw.slice(first.close, last.open));
  if (!gap) return null;
  const action = gap[1], clauses = action.replace(/[。！!]$/u, '').split(/[，,]/u).map(text => text.trim());
  if (clauses.length !== 2 || !groupwardGaze.test(clauses[1])) return null;
  const namedByGaze = namedLocalGaze(clauses[0], scene);
  const literal = raw.slice(last.start, last.end), group = includedRoomVocative.exec(literal);
  if (!namedByGaze || !group || namedLocalReference(group[1].trim(), scene, true) !== namedByGaze) return null;
  const question = literal.slice(group[0].length);
  if (!/[？?]\s*$/u.test(question) || secondPerson.test(question) || localQuotedRecipients(question, scene).length
    || /^(?:除了|除开|除開|除去|仅问|僅問|只问|只問|只对|只對)/u.test(question)) return null;
  const response = raw.slice(first.start, first.end);
  const recipients = localQuotedRecipients(response, scene);
  const replyAlias = /^[^，,：:！!]{1,48}(?=[，,：:！!])/u.exec(response.trim())?.[0];
  const aliasTargets = replyAlias !== undefined && replyAlias === scene.replyAddress ? matching(replyAlias, scene) : [];
  const provenAlias = aliasTargets.length === 1 && aliasTargets[0].id === peer;
  if (!response.trim() || groupVocative.test(response) || openGroupQuestion.test(response) || includedRoomVocative.test(response)
    || recipients.some(id => id !== peer && !(id === null && provenAlias))
    || resolvePlayerAddress(raw.slice(first.open, first.close), scene, peer, 1)?.text !== response) return null;
  const middleStart = first.close + gap[0].indexOf(action);
  return { version: 3, anchor: ROOM_SHIFT_ANCHOR, roomId: scene.roomId, targetId: peer, roomMemberId: namedByGaze, parts: [
    { kind: 'speech', start: first.start, end: first.end, text: response },
    { kind: 'transition', start: middleStart, end: middleStart + action.length, action },
    { kind: 'speech', start: last.start, end: last.end, text: literal, speechScope: 'room' },
  ] };
}

export const LOCAL_SPEECH_ANCHOR = 'local-speech-spans';
const freeGroupGaze = new RegExp(groupwardGaze.source.replace('(?:又|再|接着|接著|随后|隨後|也|并|並)', '(?:又|再|接着|接著|随后|隨後|也|并|並)?'), 'u');
const broaderGlance = /^(?:我\s*)?(?:再|又|然后|然後|接着|接著|随后|隨後|顺势|順勢)?\s*(?:看看|看了看|瞧了瞧|打量了?一下|看着|看著|看向|望着|望著|望向|扫了一眼|掃了一眼)\s*([^，,。！？；;\n]{1,48})$/u;
const localOpenAddress = /^(?:请问[，,]?\s*|請問[，,]?\s*)?(?:这里|這裡|这儿|這兒|在场(?:的|各位中)?|在場(?:的|各位中)?|这间屋子里|這間屋子裡)\s*(?:有谁|有誰|有没有(?:人|谁)|有沒有(?:人|誰)|可有人|有人(?:知道|听见|聽見|看见|看見|收到|记得|記得|能))/u;
const collectiveOpening = new RegExp(`^${localGroup}(?:(?:都|也|还|還|能|可|有没有|有沒有|是否|先|请|請|刚才|剛才|方才|现在|現在)\\s*){0,3}(?:知道|听见|聽見|听到|聽到|听|聽|看见|看見|收到|告诉|告訴|说说|說說|想想|记得|記得|不清楚|明白)`, 'u');
const overtPluralAddress = /^(?:谢谢|謝謝|多谢|多謝|感谢|感謝|麻烦|麻煩|请|請|拜托|拜託)(?:你们|你們|大家|各位)(?:$|[。！？!?，,…\s]|告诉|告訴|回答|愿意|願意|说明|說明|帮|幫|听|聽|说|說)/u;
const localAddressExclusion = /^(?:(?:我(?:们|們)|咱们|咱們|你们|你們)(?:俩|倆|两人|兩人|两位|兩位|小组|小組|这队|這隊)|除了|只(?:问|問|对|對)|仅(?:问|問|对|對)|(?:门外|門外|隔壁|楼上|樓上|远处|遠處)(?:有没有|有沒有|有人|有谁|有誰|的(?:大家|各位|人))|(?:谢谢|謝謝|多谢|多謝|感谢|感謝|麻烦|麻煩|请|請|拜托|拜託)(?:你|您)(?!们|們))/u;

function roomFixtureReference(text, scene) {
  const location = scene.location;
  if (typeof location !== 'string' || !location || typeof scene.description !== 'string') return false;
  const describe = scene.description.trim().replace(/[。！!]$/u, '');
  // This is the current room's positive authored description, not known
  // history or a nearby property's caption. Reject negatives/occlusion.
  if (/(?:没有|沒有|不存在|不见|不見|不可见|不可見|看不|望不|遮|挡|擋|隔|过去|過去|原本|曾经|曾經)/u.test(describe)) return false;
  const qualified = ['里的', '裡的', '内的', '內的'].find(prep => text.startsWith(`${location}${prep}`));
  const ref = qualified ? text.slice(location.length + qualified.length) : text;
  let catalog;
  if (describe.startsWith('有') && describe.endsWith(`的${location}`)) catalog = describe.slice(1, -location.length - 1);
  for (const prep of ['里有', '裡有', '内有', '內有']) {
    if (describe.startsWith(`${location}${prep}`)) catalog = describe.slice(location.length + prep.length);
  }
  return !!catalog && catalog.split(/(?:、|和|与|與|及)/u).some(item => compare(item) === compare(ref));
}

// Bounded, composable optical observation. A carryable object must already
// be in the current visible object projection; a room fixture is not an item.
export function localSpeechObservation(action, scene) {
  if (typeof action !== 'string' || !sameRoomSequence(scene) || outsideGroupBoundary.test(action)) return null;
  const lines = action.replace(/[。！!]$/u, '').split(/[，,]/u).map(text => text.trim());
  if (lines.length > 2 || !lines[0]?.startsWith('我')) return null;
  const focus = [];
  for (const [index, phrase] of lines.entries()) {
    if (index && !/^(?:我\s*)?(?:又|再|接着|接著|然后|然後|随后|隨後|也|并|並)/u.test(phrase)) return null;
    if (freeGroupGaze.test(phrase.replace(/^(我\s*)?(?:然后|然後)/u, '$1再'))) { focus.push({ kind: 'crowd' }); continue; }
    const ref = broaderGlance.exec(phrase)?.[1]?.trim();
    if (!ref || !safeReference.test(ref)) return null;
    const actor = namedLocalReference(ref, scene, true);
    if (actor) { focus.push({ kind: 'person', id: actor }); continue; }
    const objects = (scene.objects ?? []).filter(row => typeof row.name === 'string' && compare(row.name) === compare(ref));
    if (objects.length === 1 && typeof objects[0].id === 'string'
      && !/(?:不可见|不可見|不可观察|不在场|遮挡|遮擋|远处|遠處|隔壁|封存|未知)/u.test(objects[0].placement ?? '')) {
      focus.push({ kind: 'item', id: objects[0].id }); continue;
    }
    if (roomFixtureReference(ref, scene)) { focus.push({ kind: 'fixture', label: ref }); continue; }
    return null;
  }
  return focus;
}

function localSpeechScope(text, scene, isFirst, previous, nextObservation) {
  const phrases = text.trim().split(/[。！？!?；;…]+/u).map(row => row.trim()).filter(Boolean);
  if (!phrases.length || phrases.some(row => localAddressExclusion.test(row) || notCurrent.test(row))) return null;
  const include = includedRoomVocative.exec(phrases[0]);
  const namedRoomMember = include && namedLocalReference(include[1].trim(), scene, true);
  if (include && !namedRoomMember) return null;
  const explicitRoom = namedRoomMember || phrases.some(row => groupVocative.test(row) || collectiveOpening.test(row) || overtPluralAddress.test(row));
  const nearbyGaze = Boolean(previous?.focus?.some(row => row.kind === 'crowd'));
  const openRoom = nearbyGaze && /[？?]\s*$/u.test(text) && phrases.some(row => localOpenAddress.test(row));
  const bodies = include ? [phrases[0].slice(include[0].length), ...phrases.slice(1)] : phrases;
  const names = bodies.flatMap(row => localQuotedRecipients(row, scene));
  if (explicitRoom || openRoom) {
    // Check for a new vocative at a clause boundary without treating a name
    // inside the following statement as an address (e.g. 各位，希罗说过…).
    const clauses = bodies.flatMap(row => [row, ...[...row.matchAll(/[，,：:]/gu)].map(match => row.slice(match.index + 1).trimStart())]);
    if (clauses.some(row => secondPerson.test(row) || localAddressExclusion.test(row)
      || /^(?:只有|唯独|唯獨|就|只)(?:你|您)(?!们|們)/u.test(row) || localQuotedRecipients(row, scene).length)) return null;
    return { speechScope: 'room', ...(namedRoomMember ? { memberId: namedRoomMember } : {}) };
  }
  // A bare "we" or a group reference without addressed scope is not a
  // license to choose a convenient single receiver from conversation history.
  if (phrases.some(row => /^(?:我们|我們|咱们|咱們|大家|在场|在場|众人|眾人|各位|你们|你們|这里有没有|這裡有沒有)/u.test(row))) return null;
  const targets = [...new Set(names)];
  if (targets.length > 1 || targets[0] === null) return null;
  const id = targets[0] ?? (isFirst ? scene.replyPeer : undefined);
  if (!id || scene.nearby.filter(row => row.id === id).length !== 1) return null;
  // A source-explicit current named address either has the vocative grammar
  // itself or an independently proved neighboring glance toward that person.
  if (targets.length && !/^[^，,：:！？!?]{2,30}[，,：:！!]/u.test(text) && ![previous?.focus, nextObservation?.focus]
    .some(rows => rows?.some(row => row.kind === 'person' && row.id === id))) return null;
  return { targetId: id };
}

export function ordinaryLocalSpeechSource(raw, scene) {
  if (typeof raw !== 'string' || raw.length > 1400 || /[<>\u0000-\u0009\u000b-\u001f\u007f]/u.test(raw)
    || !sameRoomSequence(scene) || !Array.isArray(scene.nearby) || scene.nearby.length < 2) return null;
  const quotes = topLevelPlayerQuotes(raw);
  if (![2, 3].includes(quotes?.length)) return null;
  const ranges = []; let at = 0;
  for (const gap of raw.matchAll(/\n[ \t]*\n(?:[ \t]*\n)*/gu)) { ranges.push([at, gap.index]); at = gap.index + gap[0].length; }
  ranges.push([at, raw.length]);
  if (ranges.length !== 2 * quotes.length - 1) return null;
  const parts = [];
  for (const [index, [from, limit]] of ranges.entries()) {
    const segment = raw.slice(from, limit).trim(), start = from + raw.slice(from, limit).search(/\S/u);
    if (!segment || /\n/u.test(segment)) return null;
    if (index % 2) {
      const focus = localSpeechObservation(segment, scene);
      if (!focus) return null;
      parts.push({ kind: 'transition', start, end: start + segment.length, action: segment, focus });
    } else {
      const { open, close, start: first, end } = quotes[index / 2];
      if (open !== start || close !== start + segment.length || !raw.slice(first, end).trim()) return null;
      parts.push({ kind:'speech', start:first, end, text:raw.slice(first, end) });
    }
  }
  for (const [index, part] of parts.entries()) if (part.kind === 'speech') {
    const binding = localSpeechScope(part.text, scene, index === 0, parts[index - 1], parts[index + 1]);
    if (!binding || binding.targetId && !localQuotedRecipients(part.text, scene).length
      && resolvePlayerAddress(raw.slice(part.start - 1, part.end + 1), scene, binding.targetId, 1)?.text !== part.text) return null;
    Object.assign(part, binding);
  }
  if (!parts.some(part => part.speechScope === 'room')) return null;
  const first = parts[0];
  return { version: 4, anchor: LOCAL_SPEECH_ANCHOR, roomId: scene.roomId, ...(first.targetId ? { targetId: first.targetId } : {}), parts };
}

export const OBSERVED_ORIENTATION_ANCHOR = 'same-peer-observed-orientation';
const orientationLead = /^(?:我\s*)?(?:(?:又|再|然后|然後|接着|接著|随后|隨後|顺势|順勢)\s*)?(?:望了望|望一望|转眼看向|轉眼看向|看过去|看過去|朝[^，,。]{1,40}(?:看|望)(?:了看|了望|去)?|看看|看了看|看一眼|瞧了瞧|打量了?一下|看着|看著|看向|望着|望著|望向|扫了一眼|掃了一眼|看见|看見|望见|望見)/u;
const orientationReference = /^(?:我\s*)?(?:(?:又|再|接着|接著|随后|隨後|顺势|順勢)\s*)?(?:(?:望了望|望一望|转眼看向|轉眼看向|看一眼)\s*([^，,。！？；;\n]{1,48})|朝\s*([^，,。！？；;\n]{1,48}?)\s*(?:看|望)(?:了看|了望|去)?)$/u;
const thresholdNoun = '(?:入口|出口|门口|門口|门边|門邊|门边上|門邊上|门扉|門扉)';
const ownThreshold = new RegExp(`^(?:(?:这个|這個|这处|這處|当前|當前|眼前|本房的|本间的|本間的)\\s*)?${thresholdNoun}(?:的?(?:方向|那边|那邊|一侧|一側))?$`, 'u');
const namedThreshold = new RegExp(`^(?:通往|朝向|朝)([^，,。！？；;\\n]{1,24}?)(?:的)?${thresholdNoun}(?:的?(?:方向|那边|那邊|一侧|一側))?$`, 'u');
const addressedCourtesy = /^(?:对不起|對不起|抱歉|不好意思|失礼了|失禮了|请原谅|請原諒|谢谢|謝謝|辛苦了|你好)[，,、：:]\s*/u;
const bareCollective = new RegExp(`^${localGroup}$`, 'u');

function localThresholdFocus(reference, scene) {
  if (typeof scene.doorOpen !== 'boolean' || !Array.isArray(scene.adjacent)) return null;
  const adjacent = scene.adjacent.filter(edge => typeof edge?.id === 'string' && typeof edge.label === 'string' && edge.id !== scene.roomId);
  if (!adjacent.length) return null;
  if (ownThreshold.test(reference)) return { kind: 'threshold', roomId: scene.roomId };
  const named = namedThreshold.exec(reference);
  if (!named) return null;
  const matches = adjacent.filter(edge => compare(edge.label) === compare(named[1]));
  return matches.length === 1 ? { kind: 'threshold', roomId: scene.roomId, edgeId: matches[0].id } : null;
}

// This is an optical orientation, never a look-through, search or permission
// to cross. The outside view and passage state keep their existing owners.
export function observedOrientationFocus(action, scene) {
  if (typeof action !== 'string' || !sameRoomSequence(scene) || outsideGroupBoundary.test(action)) return null;
  const current = localSpeechObservation(action, scene);
  if (current) return current;
  const body = action.replace(/[。！!]$/u, '');
  const orientation = orientationReference.exec(body);
  const reference = (orientation?.[1] ?? orientation?.[2] ?? broaderGlance.exec(body)?.[1])?.trim();
  if (!reference || !safeReference.test(reference)) return null;
  const threshold = localThresholdFocus(reference, scene);
  return threshold ? [threshold] : orientation ? localSpeechObservation(`我看向${reference}。`, scene) : null;
}

const localPointFrame = /^(?:我\s*)(?:(?:在原地|原地|抬手|伸手|用手|用手指)\s*)?(?:(?:指向|指了指)\s*([^，,。！？；;\n]{1,48})|(?:朝|向)\s*([^，,。！？；;\n]{1,48}?)\s*(?:一指|指了指))[。！!]$/u;
const localStairLocation = /(?:通往([^，、。；！？]{1,12}?)的)?(楼梯|樓梯|阶梯|階梯|台阶|臺階)(?:位于|位於|在)([^，、。；！？]{1,30})(?:[。；，、]|$)/u;
const localStairName = /^(?:楼梯|樓梯|阶梯|階梯|台阶|臺階)$/u;
const normalizeStair = text => compare(text).replace(/樓/gu, '楼').replace(/階/gu, '阶').replace(/臺/gu, '台');

// A gesture's referent may be present without an optical act by the player.
// Bind only positive current fixture/object/stair evidence, never an exit or a move.
export function localPointFocus(action, scene) {
  if (typeof action !== 'string' || !sameRoomSequence(scene) || outsideGroupBoundary.test(action)) return null;
  const frame = localPointFrame.exec(action);
  const reference = (frame?.[1] ?? frame?.[2])?.trim();
  if (!reference || !safeReference.test(reference)) return null;
  const objects = (scene.objects ?? []).filter(row => typeof row.name === 'string' && compare(row.name) === compare(reference));
  if (objects.length) return objects.length === 1 && typeof objects[0].id === 'string'
    && !/(?:不可见|不可見|不可观察|不在场|遮挡|遮擋|远处|遠處|隔壁|封存|未知)/u.test(objects[0].placement ?? '')
    ? [{ kind: 'item', id: objects[0].id }] : null;
  if (roomFixtureReference(reference, scene)) return [{ kind: 'fixture', label: reference }];
  const localStairs = (scene.ruleFacts ?? []).flatMap(fact => {
    if (typeof fact !== 'string' || /(?:门外|門外|隔壁|不可见|不可見|没有|沒有|曾经|曾經)/u.test(fact)) return [];
    const match = localStairLocation.exec(fact);
    if (!match) return [];
    const [, level, noun, place] = match;
    const wanted = normalizeStair(reference);
    return localStairName.test(reference) && normalizeStair(noun) === wanted
      || wanted === normalizeStair(`${place}的${noun}`)
      || level && wanted === normalizeStair(`通往${level}的${noun}`)
      ? [{ kind: 'stairs', roomId: scene.roomId, site: place, ...(level ? { level } : {}) }] : [];
  });
  return localStairs.length === 1 ? localStairs : null;
}

// The manner cue stays in the stored raw span, never a world fact.
const samePeerGazeFrame = /^我(?:有些|有点|有點)?(?:不好意思|腼腆|靦腆|羞涩|羞澀)地(?:看向|望向)([\p{Script=Han}]{2,16})[。！!]$/u;
function samePeerVisibleGaze(action,scene,peer) {
  const reference=samePeerGazeFrame.exec(action)?.[1];
  if (!reference) return null;
  const name=compare(reference);
  const people=scene.nearby.filter(row=>nameVisible(row) && (compare(row.label)===name || name.length===2 && compare(row.label).endsWith(name)));
  if (people.length!==1 || people[0].id!==peer) return null;
  const visible=`我看向${reference}。`, focus=observedOrientationFocus(visible,scene);
  return focus?.length===1 && focus[0].kind==='person' && focus[0].id===peer ? {visible,focus} : null;
}
const stairDirectionFrame = /^我(?:抬头|抬頭)?(?:望向|看向)通往([一二三四五六七八九十0-9]{1,3}[楼樓])的方向[。！!]$/u;
const stairReplyAck = /^(?:(?:嗯|好)[，,]\s*)?(?:没关系|沒關係|不要紧|不要緊|没事|沒事)[。！!]$/u;
const stairReplyInvite = /^(?:要不|不如)(?:我们|我們|咱们|咱們)(?:先)?(?:一起|一同)(?:走到|走近|到)(?:楼梯|樓梯|阶梯|階梯)(?:那边|那邊|旁边|旁邊|前)?[，,]\s*(?:再|然后|然後)(?:看看|看一看)(?:能不能|能否)(?:上去|往上走)[？?]$/u;

// Looking in the direction of the authored local flight is not looking
// through an aperture, reaching the next floor, or choosing an edge.
export function localStairOrientationFocus(action,scene) {
  const floor=stairDirectionFrame.exec(action)?.[1];
  if (!floor || !sameRoomSequence(scene)) return null;
  const candidates=(scene.ruleFacts ?? []).flatMap(fact=>{
    const match=typeof fact==='string' && localStairLocation.exec(fact);
    return match?.[1] && normalizeStair(match[1])===normalizeStair(floor) ? [match[2]] : [];
  });
  if (candidates.length!==1) return null;
  const focus=localPointFocus(`我指向通往${floor}的${candidates[0]}。`,scene);
  return focus?.[0]?.kind==='stairs' ? focus : null;
}
function observedOrientationParts(raw, pointReply = false, namedGaze = false, stairGaze = false) {
  if (typeof raw !== 'string' || raw.length > 1400 || /[<>\u0000-\u0009\u000b-\u001f\u007f]/u.test(raw)) return null;
  const quotes = topLevelPlayerQuotes(raw);
  if (pointReply || namedGaze || stairGaze ? quotes?.length !== 2 : ![2, 3].includes(quotes?.length)) return null;
  const spans = []; let at = 0;
  for (const gap of raw.matchAll(/\n[ \t]*\n(?:[ \t]*\n)*/gu)) { spans.push([at, gap.index]); at = gap.index + gap[0].length; }
  spans.push([at, raw.length]);
  if (spans.length !== 2 * quotes.length - 1) return null;
  const parts = [];
  for (const [i, [from, to]] of spans.entries()) {
    const local = raw.slice(from, to), piece = local.trim(), start = from + local.search(/\S/u);
    if (!piece || /\n/u.test(piece)) return null;
    if (i % 2) {
      if (pointReply ? !localPointFrame.test(piece) : namedGaze ? !samePeerGazeFrame.test(piece)
        : stairGaze ? !stairDirectionFrame.test(piece) : !/^我\s*/u.test(piece) || !orientationLead.test(piece) && !lookAtGroup.test(piece)) return null;
      parts.push({ kind: 'transition', start, end: start + piece.length, action: piece });
    } else {
      const quote = quotes[i / 2];
      if (quote.open !== start || quote.close !== start + piece.length) return null;
      const text = raw.slice(quote.start, quote.end);
      if (!text.trim()) return null;
      parts.push({ kind: 'speech', start: quote.start, end: quote.end, text });
    }
  }
  return parts;
}

// Lexical dispatch means this closed shape must be checked. It does not
// establish a peer or a focus and grants no action by itself.
export const observedOrientationSequenceDomain = raw => Boolean(observedOrientationParts(raw));

function samePeerSpeech(text, scene, peer) {
  const parts = text.trim().split(/[。！？!?；;…]+/u).map(piece => piece.trim()).filter(Boolean);
  for (const part of parts) {
    // A syntactic vocative may follow a politeness marker or a clause break.
    // A name within a report is not a vocative unless its own syntax says so.
    const prose = part.replace(addressedCourtesy, '');
    const clauses = [prose, ...[...prose.matchAll(/[，,、：:]/gu)].map(mark => prose.slice(mark.index + 1).trimStart())];
    for (const source of clauses) {
      if (groupVocative.test(source) || bareCollective.test(source) || includedRoomVocative.test(source)
        || collectiveOpening.test(source) || overtPluralAddress.test(source) || localOpenAddress.test(source)
        || /^(?:你们|你們|只问|只問|仅问|僅問|单独问|單獨問)/u.test(source)) return false;
      const explicit = localQuotedRecipients(source, scene);
      const exact = matching(source, scene);
      const allegedTitle = /^(?:[\p{L}·・]{1,12}?)(?:同学|同學|酱|醬|桑|先生|小姐|君)\s*$/u.test(source);
      if (explicit.some(id => id !== peer) || exact.length && (exact.length !== 1 || exact[0].id !== peer)
        || allegedTitle && !exact.length) return false;
    }
  }
  return true;
}

export const localPointReplySequenceDomain = raw => Boolean(observedOrientationParts(raw, true));
export const samePeerGazeSequenceDomain = raw => Boolean(observedOrientationParts(raw, false, true));
function localStairOrientationParts(raw) {
  const parts=observedOrientationParts(raw,false,false,true);
  return parts && stairReplyAck.test(parts[0].text) && stairReplyInvite.test(parts[2].text) ? parts : null;
}
export const localStairReplySequenceDomain = raw => Boolean(localStairOrientationParts(raw));

export function ordinaryObservedOrientationSource(raw, scene, version = 5) {
  if (!sameRoomSequence(scene) || !Array.isArray(scene.nearby)) return null;
  const peer = scene.replyPeer;
  if (typeof peer !== 'string' || scene.nearby.filter(row => row.id === peer).length !== 1) return null;
  const parts = version===8 ? localStairOrientationParts(raw) : observedOrientationParts(raw, version === 6, version === 7);
  if (!parts) return null;
  for (const part of parts) {
    if (part.kind === 'speech') {
      if (!samePeerSpeech(part.text, scene, peer) || resolvePlayerAddress(raw.slice(part.start - 1, part.end + 1), scene, peer, 1)?.text !== part.text) return null;
      part.targetId = peer;
    } else {
      const gaze=version===7 ? samePeerVisibleGaze(part.action,scene,peer) : null;
      const focus=version===8 ? localStairOrientationFocus(part.action,scene) : version===7 ? gaze?.focus : version===6 ? localPointFocus(part.action,scene) : observedOrientationFocus(part.action,scene);
      if (!focus || focus.some(row => row.kind === 'crowd')) return null;
      if (gaze) part.action=gaze.visible;
      part.focus=focus;
    }
  }
  return { version, anchor: version === 6 ? LOCAL_POINT_REPLY_ANCHOR : OBSERVED_ORIENTATION_ANCHOR, roomId: scene.roomId, targetId: peer, parts };
}

const vocativePart = /^[\p{L}·・'’ -]{1,30}$/u;
const attachedVocativeCue = /^(?:(?:嗯|啊|哦|喂|好|谢谢|謝謝|多谢|多謝|感谢|感謝|辛苦|幸好|对不起|對不起|抱歉|你好|了不起)(?:$|[了呀啊哦呢]|(?:你|您))|(?:你|您)(?!们|們))/u;
const unknownVocative = /^(?:[\p{L}·・]{1,12}?)(?:同学|同學|酱|醬|桑|先生|小姐|君)$/u;
export function explicitLocalVocative(raw, scene, targetId) {
  if (typeof raw !== 'string' || raw.length > 1400 || !sameRoomSequence(scene) || !Array.isArray(scene.nearby)) return null;
  const quote = strictQuoteRange(raw);
  if (!quote || quote.end !== raw.length - 1) return null;
  const text = raw.slice(quote.start, quote.end), recipients = new Set();
  for (const sentence of text.split(/[。！？!?；;…]+/u)) {
    const parts = sentence.trim().split(/[，,：:]/u).map(s => s.trim()).filter(Boolean);
    for (const [i, part] of parts.entries()) {
      if (bareCollective.test(part) || groupVocative.test(part) || includedRoomVocative.test(part)
        || /^(?:你们|你們|单独问|單獨問|只问|只問)/u.test(part)) return null;
      const hits = vocativePart.test(part) ? matching(part, scene) : [];
      // A name bracketed by speech punctuation is direct address. A name
      // inside the grammatical subject/object of a report is merely mentioned.
      if (hits.length) {
        if (hits.length !== 1 || parts.length < 2 && !/[！!？?]/u.test(text)) return null;
        if (i > 0 && !attachedVocativeCue.test(parts[i-1])) return null;
        recipients.add(hits[0].id);
      } else if (unknownVocative.test(part) && !/^(?:我|他|她|它|我们|我們|有人|听|聽|见|見|看到|说|說)/u.test(part)) return null;
      else if (i === 0) for (const id of localQuotedRecipients(part, scene)) {
        if (id === null) return null;
        recipients.add(id);
      }
    }
  }
  if (recipients.size !== 1) return null;
  const [id] = recipients;
  return targetId !== undefined && targetId !== id ? null : selected(raw, id, quote.start, quote.end, 'current-quoted-address');
}

const localApproachFrame = /^(?:我)(?:(?:接着|接著|然后|然後|便|就|再|又)\s*)?(?:(?:朝|向|往)\s*([^，,。！？；;\n]{1,40}?)\s*(?:走去|走了几步|走了幾步|走几步|走幾步|迈了几步|邁了幾步|迈步|邁步|走)|走向([^，,。！？；;\n]{1,40}))[，,]\s*((?:留意|看看|顺便看看|順便看看|看一眼|稍微看看|观察一下|觀察一下).+?)\s*[。！!]$/u;
const localNoticing = /^(?:留意|看看|顺便看看|順便看看|看一眼|稍微看看|观察一下|觀察一下)\s*(?:(楼梯|樓梯|门口|門口|入口|出口|眼前|本房间|本房間)(?:附近|旁边|旁邊|旁|周围|周圍|这边|這邊|里|裡)?)?\s*(?:还有没有|還有沒有|有没有|有沒有|是否有|能不能看到|能否看见|能否看見)\s*([\p{L}\p{M}]{1,18})$/u;

// A current fixed entry/observation is not a movement destination or evidence
// from beyond the threshold. Both are recomputed by the host at the tail.
export function localApproachObservation(raw, scene) {
  if (typeof raw !== 'string' || !sameRoomSequence(scene)) return null;
  const frame = localApproachFrame.exec(raw);
  const found = frame && localNoticing.exec(frame[3]);
  if (!found || /(?:穿门|穿門|过去|過去|离开|離開|跟着|跟著|继续|繼續)/u.test(found[2])) return null;
  const focus = localThresholdFocus((frame[1] ?? frame[2]).trim(), scene);
  if (!focus) return null;
  const site = /^(?:楼梯|樓梯)$/u.test(found[1] ?? '') ? 'stairs' : 'threshold';
  if (site === 'stairs' && !scene.ruleFacts?.some(fact => typeof fact === 'string'
    && /^(?:入口|出口|门口|門口)(?:通向|连着|連著|接着|接著)[^。；]*?(?:楼梯|樓梯)/u.test(fact))) return null;
  return { focus, site };
}

function localApproachParts(raw) {
  if (typeof raw !== 'string' || raw.length > 1600 || /[<>\u0000-\u0009\u000b-\u001f\u007f]/u.test(raw)) return null;
  const parts = raw.split(/\n[ \t]*\n+/u).map(part => part.trim());
  if (parts.length !== 2 || !parts[0] || !parts[1] || !strictQuoteRange(parts[0]) || !localApproachFrame.test(parts[1])) return null;
  return parts;
}
// V2 is a local step towards a known present person, not a room move,
// a distance measurement, or permission to stage a private conversation.
const personApproachFrame = /^我(?:(?:又|再|便|就|接着|接著|然后|然後)\s*)?(?:(?:走到|走近|来到|來到)([^，,。！？；;：:\n]{2,28}?)(?:身边|身邊|旁边|旁邊)|(?:朝|向|往)([^，,。！？；;：:\n]{2,28}?)(?:身边|身邊|那里|那裡|那边|那邊)?(?:走(?:了)?几步|走(?:了)?幾步|走去|迈了几步|邁了幾步)|走向([^，,。！？；;：:\n]{2,28}?))[，,]\s*(?:(?:然后|然後|接着|接著|便|就)\s*)?(?:轻声|輕聲|低声|低聲|轻轻|輕輕)(?:问道|問道|说道|說道|说|說|问|問)[：:]$/u;
export function localPersonApproach(raw,scene) {
  const f=typeof raw==='string' && sameRoomSequence(scene) && personApproachFrame.exec(raw);
  return boundedPersonAttempt(f && (f[1]??f[2]??f[3]),scene);
}
function boundedPersonAttempt(ref,scene) {
  const targetId=ref && namedLocalReference(ref.trim(),scene,true);
  const row=targetId && scene.nearby.find(row=>row.id===targetId && nameVisible(row));
  return row ? {targetId,action:'我朝'+row.label+'走了几步。'} : null;
}
function localPersonApproachParts(raw) {
  if (typeof raw!=='string' || raw.length>1600 || /[<>\u0000-\u0009\u000b-\u001f\u007f]/u.test(raw)) return null;
  const parts=raw.split(/\n[ \t]*\n+/u).map(part=>part.trim());
  return parts.length===2 && personApproachFrame.test(parts[0]) && strictQuoteRange(parts[1]) ? parts : null;
}
const readinessApproachFrame=/^我(?:(?:又|再|便|接着|接著)\s*)?(?:(?:走到|走近)([^，,。！？；;：:\n]{2,28}?)(?:身旁|身边|身邊|旁边|旁邊)|(?:朝|往|向)([^，,。！？；;：:\n]{2,28}?)(?:走(?:了)?几步|走(?:了)?幾步|走去))[，,]$/u;
const readinessWaitFrame=/^等([她他])(?:准备|準備)好(?:了)?[，,]\s*(?:再|然后|然後)(?:和|跟|与|與)\1(?:一起|一同)(?:往|向|朝)([^，,。！？；;：:\n]{2,36}?)(?:走去|走几步|走幾步|走)[。！!]$/u;
export function localReadinessApproach(raw,scene) {
  const frame=typeof raw==='string' && sameRoomSequence(scene) && readinessApproachFrame.exec(raw);
  return boundedPersonAttempt(frame && (frame[1]??frame[2]),scene);
}
export function localReadinessWait(raw,scene) {
  const frame=typeof raw==='string' && sameRoomSequence(scene) && readinessWaitFrame.exec(raw);
  const reference=frame && frame[2].trim(), focus=reference && visualThreshold(reference,scene);
  return focus ? {...focus,reference} : null;
}
export function localReadinessSpeech(raw,scene,targetId) {
  if (!sameRoomSequence(scene) || !strictQuoteRange(raw) || !scene.nearby?.some(row=>row.id===targetId && nameVisible(row))) return null;
  return resolvePlayerAddress(raw,scene,targetId,1);
}
function localReadinessParts(raw) {
  if (typeof raw!=='string' || raw.length>1600 || /[<>\u0000-\u0009\u000b-\u001f\u007f]/u.test(raw)) return null;
  const paragraphs=raw.split(/\n[ \t]*\n+/u).map(part=>part.trim());
  if (paragraphs.length!==2 || !strictQuoteRange(paragraphs[0])) return null;
  const [quote,action]=paragraphs, cutoff=action.search(/[，,]/u);
  if (cutoff<0) return null;
  const approachText=action.slice(0,cutoff+1), waitText=action.slice(cutoff+1).trimStart();
  return readinessApproachFrame.test(approachText) && readinessWaitFrame.test(waitText) ? {quote,approachText,waitText} : null;
}
export const localApproachDomain = (raw,version=1) => Boolean(version===1?localApproachParts(raw):version===2?localPersonApproachParts(raw):version===3?localReadinessParts(raw):null);
export function ordinaryLocalApproachSource(raw, scene, version=1) {
  if (version===3) {
    const parts=localReadinessParts(raw);
    if (!parts) return null;
    const person=localReadinessApproach(parts.approachText,scene), focus=localReadinessWait(parts.waitText,scene);
    const speech=person && localReadinessSpeech(parts.quote,scene,person.targetId);
    // This is local orientation only. No proof or request to cross an edge.
    return person && focus && speech ? {...parts,person,focus,speech} : null;
  }
  if (version===2) {
    const parts=localPersonApproachParts(raw);
    if (!parts) return null;
    const [approachText,quote]=parts, person=localPersonApproach(approachText,scene);
    const speech=person && explicitLocalVocative(quote,scene,person.targetId);
    return speech ? {approachText,quote,person,speech} : null;
  }
  if (version!==1) return null;
  const parts = localApproachParts(raw);
  if (!parts) return null;
  const speech = explicitLocalVocative(parts[0], scene), observation = localApproachObservation(parts[1], scene);
  return speech && observation ? { speech, quote:parts[0], approachText:parts[1], observation } : null;
}

const arrivalQuestion = /^([\p{L}·・]{2,16}?)(?:是(?:不)?是(?:也|已经|已經)?|(?:也|已经|已經))?(?:跟上来|跟上來|跟过来|跟過來|跟来|跟來|赶过来|趕過來|过来|過來|到这儿|到這兒|到了|到)(?:了)?(?:吗|嗎|没有|沒有)?[？?]$/u;
const ambientUncertain = /^(?:这里|這裡|这儿|這兒|眼前|刚才|剛才)?\s*(?:好像|似乎|仿佛|彷彿|还没|還沒|我没看清|我沒看清)[^「」『』“”"!?？！？。；;，,：:\n]{1,40}$/u;

// A delivered known-person name is evidence of what the player is asking
// about, never of where that person is or an authorization to select them.
export function localAmbientSpeech(raw, scene) {
  if (typeof raw !== 'string' || raw.length > 400 || !sameRoomSequence(scene) || !Array.isArray(scene.nearby)) return null;
  const quote = strictQuoteRange(raw);
  if (!quote || quote.end !== raw.length - 1) return null;
  const text = raw.slice(quote.start, quote.end), parts = text.trim().split(/(?:…+|[。；;])/u).map(x=>x.trim()).filter(Boolean);
  if (!parts.length || parts.length > 2 || parts.length === 2 && !ambientUncertain.test(parts[0])) return null;
  const ask = arrivalQuestion.exec(parts.at(-1));
  if (!ask || /(?:大家|各位|你们|你們|有人|然后|和|以及|如果|那个|那個)/u.test(ask[1])) return null;
  const known = (scene.readable ?? []).flatMap(row => {
    const id = /^profile:([a-z0-9][a-z0-9-]{0,40})$/u.exec(row?.id ?? '')?.[1];
    const label = /^(.{2,40})的已知人物记录$/u.exec(row?.name ?? '')?.[1];
    return id && label ? [{ id,label }] : [];
  });
  const mentionedId = namedLocalReference(ask[1], { nearby:known }, true);
  if (!mentionedId || scene.nearby.some(row => row.id === mentionedId || namedLocalReference(ask[1], {nearby:[row]}, true))) return null;
  return { text, start:quote.start, end:quote.end, mentionedId };
}

const stairLook = /^(?:看向|望向|看了看|看看|望了望)(?:通往([一二三四五六七八九十0-9]{1,3}楼)的)?(?:楼梯|樓梯)(?:的?方向)?$/u;
const sideLook = /^(?:又|再|接着|接著|然后|然後)(?:回头|回頭|转头|轉頭)?(?:看看|看向|望向|望了望|看了看)(.{2,40})$/u;
function ambientEdge(label, scene) {
  if (typeof scene.doorOpen !== 'boolean' || !Array.isArray(scene.adjacent)) return null;
  const edges = scene.adjacent.filter(edge => typeof edge?.id === 'string' && typeof edge.label === 'string' && compare(edge.label) === compare(label));
  return edges.length === 1 ? edges[0].id : null;
}
function knownLocalStair(scene,stairs) {
  return scene.ruleFacts?.some(fact => typeof fact === 'string'
    && /(?:楼梯|樓梯)(?:位于|位於|在|通往|连接|連接)/u.test(fact)
    && (!stairs[1] || fact.includes('通往'+stairs[1]+'的楼梯') || fact.includes('通往'+stairs[1]+'的樓梯')));
}
export function localAmbientLook(raw, scene) {
  if (typeof raw !== 'string' || !sameRoomSequence(scene) || outsideGroupBoundary.test(raw)) return null;
  const parts = /^我([^，,\n]{1,50})[，,]\s*([^，,\n]{1,50})[。！!]$/u.exec(raw);
  const stairs = parts && stairLook.exec(parts[1].trim());
  const door = parts && sideLook.exec(parts[2].trim())?.[1].match(/^(.{2,32}?)(?:的)?(?:出口|入口|门口|門口)(?:的?方向|那边|那邊)?$/u);
  if (!stairs || !door || !knownLocalStair(scene,stairs)) return null;
  const edgeId = ambientEdge(door[1],scene);
  return edgeId ? [{ kind:'stairs', ...(stairs[1] ? {level:stairs[1]} : {}) },{ kind:'threshold', roomId:scene.roomId, edgeId }] : null;
}
export function localAmbientWait(raw, scene) {
  if (typeof raw !== 'string' || !sameRoomSequence(scene)) return null;
  const tail = /^我(?:仍|还|還|继续|繼續)?(?:站在原地|留在原地|在原地|原地)(?:站着|站著)?(?:等一等|等一下|等片刻|稍等|等一会儿?|等一會兒?)[，,]\s*(?:留意|听听|聽聽|听一听|聽一聽)(.{2,32}?)(?:的)?(?:门口|門口|出口|入口|那边|那邊)(?:(?:的)?(?:动静|動靜)|(?:有没有|有沒有)(?:动静|動靜))[。！!]$/u.exec(raw);
  return tail ? ambientEdge(tail[1], scene) : null;
}
function localAmbientTurnParts(raw) {
  if (typeof raw !== 'string' || raw.length > 1600 || /[<>\u0000-\u0009\u000b-\u001f\u007f]/u.test(raw)) return null;
  const parts = raw.split(/\n[ \t]*\n+/u).map(part=>part.trim());
  if (parts.length !== 3 || !/^我(?:看向|望向|看了看|看看|望了望)/u.test(parts[0])
    || !strictQuoteRange(parts[1]) || !/^我(?:仍|还|還|继续|繼續)?(?:站在原地|留在原地|在原地|原地)/u.test(parts[2])) return null;
  return parts;
}
// V2 serves the complementary case: an actual shared proposal precedes a
// local agreement, then one gaze and one finite private decision to wait.
const agreementLine = /^(?:嗯|好(?:啊|呀|的)?|行(?:啊|呀)?|可以)[，,]\s*(?:那(?:就)?\s*)?(?:我们|我們|咱们|咱們)(?:就|先)?(?:在)?(?:这里|這裡|这儿|這兒|原地)(?:就|先)?(?:稍)?(?:等一等|等一下|等片刻|等一会儿?|等一會兒?|等等|等一小会儿?)(?:吧|好不好|好吗|好嗎)?[。！!？?]$/u;
const agreementLookFrame = /^我(?:(?:就|便|又|再|转头|轉頭|回头|回頭))?(?:(?:朝|向)([^，,。！？；;\n]{1,36}?)(?:看去|望去|看了看|望了望)|(?:看向|望向|看看|望了望)([^，,。！？；;\n]{1,36}))[，,。！!]?$/u;
const agreementWaitFrame = /^(?:我(?:就|仍|还|還|继续|繼續)?)?(?:站在附近|站在原地|留在原地|待在原地|留在这里|留在這裡|在这里|在這裡|就在这儿|就在這兒|在原地)(?:先|就|稍)?(?:等一等|等一下|等等|等)([\p{L}·・]{2,20}?)(?:一会儿?|一會兒?|一下|片刻)?[。！!]$/u;
const previousWaitProposal = /^(?:那(?:么|麼|就)?[，,]?\s*)?(?:我们|我們|咱们|咱們)(?:就|先)?(?:在)?(?:这里|這裡|这儿|這兒|原地)(?:就|先)?(?:稍)?等(?:等|一等|一下|片刻|一会儿?|一會兒?|(?:她|他)一会儿?|(?:她|他)一會兒?)?(?:[，,]\s*|\s*)(?:如何|怎么样|怎麼樣|好不好|好吗|好嗎|可以吗|可以嗎|吧)[。！!？?]$/u;

export const ordinaryLocalAmbientStepTypes = version => version===1 ? ['look','act','wait'] : version===2 ? ['act','look','wait'] : [];
function agreementQuote(raw) {
  const q=typeof raw==='string' && raw.length<=400 && strictQuoteRange(raw);
  const text=q && raw.slice(q.start,q.end);
  return q && q.end===raw.length-1 && agreementLine.test(text) ? {text,start:q.start,end:q.end} : null;
}
function localAgreementLook(raw,scene) {
  const f=typeof raw==='string' && sameRoomSequence(scene) && agreementLookFrame.exec(raw);
  return f ? visualThreshold((f[1]??f[2]).trim(),scene) : null;
}
function localAgreementWait(raw,scene) {
  const f=typeof raw==='string' && sameRoomSequence(scene) && agreementWaitFrame.exec(raw);
  return f ? searchIdentity(f[1],scene) : null;
}
function localAgreementParts(raw) {
  if (typeof raw!=='string' || raw.length>1600 || /[<>\u0000-\u0009\u000b-\u001f\u007f]/u.test(raw)) return null;
  const parts=raw.split(/\n[ \t]*\n+/u).map(part=>part.trim());
  if (parts.length!==2 || !agreementQuote(parts[0])) return null;
  const tail=/^([^，,\n]{1,52})([，,])[ \t]*([^，,\n]{1,52})$/u.exec(parts[1]);
  return tail && agreementLookFrame.test(tail[1]) && agreementWaitFrame.test(tail[3])
    ? {quote:parts[0],look:tail[1],lookWithSeparator:tail[1]+tail[2],wait:tail[3]} : null;
}
const composedSpeech = /^([\p{L}·・]{2,18}?)(?:还|還|似乎|好像|看样子|看樣子)?(?:没|沒)(?:出来|出來|过来|過來|跟上来|跟上來)(?:呢|啊|呀)?(?:……|…|[。；;，,])\s*我(?:还是|還是|要不要|可以)?(?:回去|过去|過去|去)(?:问问|問問|问一下|問一下)(?:她|他)(?:吧|好吗|好嗎|怎么样|怎麼樣)?[？?]$/u;
const composedWait = /^我(?:又|再|便|就|仍|继续|繼續)?(?:留在原地|在原地|原地)?(?:稍等|等一等|等一下|等(?:了)?一会儿?|等(?:了)?一會兒?|等片刻)(?:[，,]\s*(?:看看|看向|望向)([^，,。！？；;\n]{1,36}))?[。！!]$/u;
const composedPeople = /^我(?:又|再|便|就|转头|轉頭|回头|回頭)?(?:看向|望向|看了看|瞧了瞧)([^，,。！？；;\n]{2,42})[。！!]$/u;
export function localComposedAmbientStep(raw,scene) {
  if (typeof raw!=='string' || raw.length>400 || scene && !sameRoomSequence(scene)) return null;
  const q=strictQuoteRange(raw), phrase=q?.end===raw.length-1 && raw.slice(q.start,q.end), report=phrase && composedSpeech.exec(phrase);
  if (report) return !scene || !scene.replyPeer && localRoomSpeechScene(scene) && searchIdentity(report[1],scene)
    ? {type:'act',text:raw,performance:{action:'我开口说。',utterance:phrase}} : null;
  const wait=composedWait.exec(raw);
  if (wait) return !scene || !wait[1] || visualThreshold(wait[1].trim(),scene)
    ? {type:'wait',text:raw,performance:{action:wait[1]?'我在原地稍等，望向'+wait[1].trim()+'。':'我在原地稍等。'}} : null;
  if (agreementLookFrame.test(raw) && (!scene || localAgreementLook(raw,scene)))
    return {type:'look',text:raw,performance:{action:raw.replace(/[，,。！!]$/u,'')+'。'}};
  const focus=composedPeople.exec(raw), names=focus && visualNameList(focus[1]);
  const ids=scene && names?.map(name=>namedLocalReference(name,scene,true));
  return names && (!scene || ids.every(Boolean) && new Set(ids).size===ids.length)
    ? {type:'look',text:raw,performance:{action:raw}} : null;
}
function localComposedAmbientSource(raw,scene) {
  if (typeof raw!=='string' || raw.length>1600 || /[<>\u0000-\u0009\u000b-\u001f\u007f]/u.test(raw)) return null;
  const parts=raw.split(/\n[ \t]*\n+/u).map(part=>part.trim());
  if (parts.length<2 || parts.length>3) return null;
  const proof=parts.map(part=>localComposedAmbientStep(part,scene));
  return proof.every(Boolean) && proof.some(row=>row.type==='act') && new Set(proof.map(row=>row.type)).size===proof.length ? proof : null;
}

export function localAmbientPlanSpans(proof,steps,version) {
  if ([3,4].includes(version)) return proof?.length===steps.length && proof.every((row,i)=>row.text===steps[i].text);
  return proof && steps.length===3 && (version===2
    ? steps[0].text===proof.quote && [proof.look,proof.lookWithSeparator].includes(steps[1].text) && steps[2].text===proof.wait
    : steps[0].text===proof.look && steps[1].text===proof.quote && steps[2].text===proof.wait);
}
export function localAgreementPerformance(raw,scene,type) {
  if (type==='act' && !scene.replyPeer && localRoomSpeechScene(scene)) {
    const quote=agreementQuote(raw);
    return quote ? {action:'我开口应道。',utterance:quote.text} : null;
  }
  if (type==='look' && localAgreementLook(raw,scene)) return {action:raw.replace(/[，,。！!]$/u,'')+'。'};
  if (type==='wait' && localAgreementWait(raw,scene)) return {action:'我留在原地，稍等片刻。'};
  return null;
}
// Host-only qualification. It carries no original NPC line or history to
// the model. Last committed canonical beat and actual hearing are both needed:
// an older report, two names in the quote, or a merely nearby actor won't do.
export function recentLocalWaitProposal(state,player,audible) {
  if (!audible.includes(player) || audible.length<3 || !Number.isSafeInteger(state.worldTime)) return false;
  const previous=state.agentActions?.at(-1);
  if (!previous?.beats?.length || !Array.isArray(state.entries)) return false;
  for (const row of state.entries.slice(-24).reverse()) {
    if (row.delivery==='action' && row.speakerId===player && row.observationKey?.endsWith(':arrival')) return false;
    if (!['speech','writing'].includes(row.delivery) || !row.audienceIds?.includes(player)) continue;
    const age=state.worldTime-row.occurredAt;
    if (row.delivery!=='speech' || row.speakerId===player || !audible.includes(row.speakerId)
      || !row.audienceIds.includes(row.speakerId) || !row.addresseeIds?.includes(player)
      || !row.addresseeIds.some(id=>id!==player && id!==row.speakerId && audible.includes(id) && row.audienceIds.includes(id))
      || !Number.isSafeInteger(age) || age<0 || age>180 || typeof row.text!=='string'
      || !previousWaitProposal.test(row.text.trim().split(/[。！!]\s*(?=\S)/u).at(-1))) return false;
    return previous.beats.some(beat=>row.observationKey==='npc:'+previous.jobId+':beat:'+beat.beat+':'+row.speakerId
      && beat.decisions.some(({actorId,proposal})=>actorId===row.speakerId && proposal?.decision?.operation?.type==='speak'
        && proposal.utterance===row.text));
  }
  return false;
}
const groupWaitAnswer=/^(?:嗯|对|對|是啊|是的|对啊|對啊)[，,]\s*(?:我们|我們|咱们|咱們)(?:刚才|剛才|方才)?(?:在([^，,。！？\n]{2,24}?))?等(?:了)?(?:你(?:们|們)?)?(?:一会儿?|一會兒?|片刻|一下)?[。！!](?:(?:你)?没事就好[。！!]|(?:你)?沒事就好[。！!])?$/u;
const conditionalLocalProposal=/^(?:(?:要是|如果|若)(?:看守|守卫|守衛)(?:不在|没在|沒在)(?:这附近|這附近|这边|這邊|这里|這裡)|(?:看守|守卫|守衛)(?:不在|没在|沒在)(?:这附近|這附近|这边|這邊|这里|這裡)的话)[，,……]+\s*(?:我们|我們|咱们|咱們)(?:要不要|是不是可以|是否要)(?:(?:去|往|朝)(?:楼上|樓上)|(?:到|去)(?:楼梯|樓梯)(?:那边|那邊|附近))(?:看看|看一看|瞧瞧)[？?]$/u;
const groupWaitQuestion=/(?:^|[。！!]\s*)(?:你们|你們|大家)(?:刚才|剛才|方才)?(?:是不是|是否)?(?:一直|都|还|還)?(?:在)?等(?:着|著)?我(?:吗|嗎|呢)?[？?]\s*$/u;
const nearbySweep=/^我(?:看看|看了看|看向|扫视|掃視)(?:附近|周围|周圍|四周)(?:的)?(?:人|大家)$/u;
const stairShift=/^(?:又|再|接着|接著|然后|然後|随后|隨後)\s*/u;
// The three local components carry no private recipient or physical outcome.
// Source grammar alone does not prove that the initiating question was heard.
export function localOpenOrientationStep(raw,scene) {
  if (typeof raw!=='string' || raw.length>400 || scene && !sameRoomSequence(scene)) return null;
  const q=strictQuoteRange(raw), literal=q?.end===raw.length-1 && raw.slice(q.start,q.end);
  if (literal) {
    const answer=groupWaitAnswer.exec(literal), proposal=conditionalLocalProposal.test(literal);
    if (!answer && !proposal || scene && (!localRoomSpeechScene(scene)
      || answer && (scene.replyPeer || answer[1] && !['这里','這裡','这儿','這兒',scene.location].includes(answer[1])))) return null;
    if (proposal && scene && !knownLocalStair(scene,[])) return null;
    return {kind:answer?'answer':'proposal',type:'act',text:raw,performance:{action:'我开口说。',utterance:literal}};
  }
  const parts=/^([^，,\n]{1,44})[，,]\s*([^，,\n]{1,44})[。！!]$/u.exec(raw);
  const stairs=parts && stairShift.test(parts[2]) && stairLook.exec(parts[2].replace(stairShift,''));
  if (!stairs || !(nearbySweep.test(parts[1]) || freeGroupGaze.test(parts[1]))
    || scene && (!scene.nearby?.length || !knownLocalStair(scene,stairs))) return null;
  return {kind:'orientation',type:'look',text:raw,performance:{action:raw},focus:[{kind:'crowd'},{kind:'stairs',...(stairs[1]?{level:stairs[1]}:{})}]};
}
export function localOpenOrientationSource(raw,scene) {
  if (typeof raw!=='string' || raw.length>1600 || /[<>\u0000-\u0009\u000b-\u001f\u007f]/u.test(raw)) return null;
  const parts=raw.split(/\n[ \t]*\n+/u).map(part=>part.trim());
  if (parts.length!==3) return null;
  const proof=parts.map(part=>localOpenOrientationStep(part,scene));
  return proof[0]?.kind==='answer' && proof[1]?.kind==='orientation' && proof[2]?.kind==='proposal' ? proof : null;
}

// Borrow actual public hearing, not the previous question's target. The
// accepted local speak and the owner's acquired observation must agree.
export function recentOpenWaitQuestion(state,player,audible) {
  if (!audible.includes(player) || audible.length<3 || !Number.isSafeInteger(state.worldTime)) return false;
  const previous=state.agentActions?.at(-1), types=new Set(['act','look','wait','conversation']);
  if (!previous?.beats?.length || !types.has(previous.intent?.type)
    || previous.playerIntentPlan?.steps.some(step=>!types.has(step.intent.type))
    || previous.beats.some(beat=>beat.decisions.some(({actorId,proposal})=>audible.includes(actorId)
      && !['speak','wait'].includes(proposal?.decision?.operation?.type)))) return false;
  const rows=state.entries.slice(-40), now=state.worldTime;
  const audibleAsks=rows.filter(row=>row.delivery==='speech' && row.communication?.kind==='ask' && row.speakerId!==player
    && row.audienceIds?.includes(player) && Number.isSafeInteger(row.occurredAt) && row.occurredAt<=now && now-row.occurredAt<=180);
  if (audibleAsks.length!==1) return false;
  const row=audibleAsks[0];
  if (!audible.includes(row.speakerId) || !row.audienceIds.includes(row.speakerId) || row.audienceIds.length<3
    || !row.audienceIds.some(id=>id!==player && id!==row.speakerId && audible.includes(id)) || !Array.isArray(row.addresseeIds)
    || row.addresseeIds.includes(player) || !Number.isSafeInteger(row.learnedAt) || row.learnedAt<row.occurredAt || row.learnedAt>now
    || (row.textByActor?.[player] ?? row.text)!==row.text || !groupWaitQuestion.test(row.text)
    || rows.slice(rows.indexOf(row)+1).some(later=>later.speakerId===player && ['speech','writing'].includes(later.delivery))) return false;
  const observation=state.caseRuntime?.observations?.find(item=>item.id===row.observationKey);
  if (!observation || observation.delivery!=='speech' || observation.speakerId!==row.speakerId || observation.text!==row.text
    || observation.occurredAt!==row.occurredAt || !observation.audienceIds?.includes(player)) return false;
  return previous.beats.some(beat=>row.observationKey==='npc:'+previous.jobId+':beat:'+beat.beat+':'+row.speakerId
    && beat.decisions.some(({actorId,proposal})=>actorId===row.speakerId && proposal?.decision?.operation?.type==='speak'
      && proposal.communication?.kind==='ask' && proposal.utterance===row.text)
    && state.agentAutonomy?.decisions?.some(item=>item.actorId===row.speakerId && item.accepted===true && item.operation?.type==='speak'
      && item.sceneBeat===beat.beat && item.sceneRevision===state.revision && item.at===row.occurredAt));
}
export const localAmbientSpeechDomain = (raw,version=1) => Boolean(version===1?localAmbientTurnParts(raw):version===2?localAgreementParts(raw):version===3?localComposedAmbientSource(raw):version===4?localOpenOrientationSource(raw):null);
export function ordinaryLocalAmbientSpeechSource(raw, scene, version=1) {
  if (version===4) return localOpenOrientationSource(raw,scene);
  if (version===3) return localComposedAmbientSource(raw,scene);
  if (version===2) {
    const parts=localAgreementParts(raw);
    if (!parts || scene.replyPeer || !localRoomSpeechScene(scene)) return null;
    const focus=localAgreementLook(parts.look,scene), mentionedId=localAgreementWait(parts.wait,scene);
    return focus?.edgeId && mentionedId ? {...parts,...agreementQuote(parts.quote),focus:[focus],edgeId:focus.edgeId,mentionedId} : null;
  }
  if (version!==1) return null;
  const parts = localAmbientTurnParts(raw);
  if (!parts) return null;
  const [look,quote,wait] = parts;
  const focus = localAmbientLook(look,scene), speech = localAmbientSpeech(quote,scene), edgeId = localAmbientWait(wait,scene);
  return focus && speech && edgeId && focus.at(-1).edgeId === edgeId
    ? { look,quote,wait,focus,edgeId,...speech } : null;
}

const localSearchLookFrame = /^我(?:(松(?:了)?(?:一)?口气|鬆(?:了)?(?:一)?口氣)[，,]\s*)?(?:再|便|就)?(?:看看|看了看|扫视|掃視|环顾|環顧|望了望)(?:一下)?(?:周围|周圍|四周|眼前|身边|身邊)[，,]?\s*(?:有没有|有沒有|是否有|能不能看到|能否看见|能否看見)([\p{L}·・]{2,20}?)(?:的身影)?[。！!？?]$/u;
const searchThanksPhrase = /^(?:谢谢|謝謝|多谢|多謝|感谢|感謝)(?:(?:你|您)(?:[^，,。！!？?]{0,22}))?$/u;
const searchSuggestion = /^(?:(?:那|那么|那麼)\s*)?(?:(?:我们|我們|咱们|咱們)(?:要不要|不如|先|就)?|你觉得|你覺得)\s*(?:等一等|等一下|等等|等)([\p{L}·・]{2,20}?)(?:来|來)?(?:一起|一块|一塊)(?:[，,]\s*(?:再|然后|然後)(?:去|走向)([\p{L}]{1,18}?))?(?:吧|好吗|好嗎|怎么样|怎麼樣|如何)?[？?]$/u;

function searchQuote(raw) {
  const q = typeof raw === 'string' && raw.length <= 400 && strictQuoteRange(raw);
  if (!q || q.end !== raw.length - 1) return null;
  const text = raw.slice(q.start,q.end);
  return /[「」『』“”"\n]/u.test(text) ? null : { ...q,text };
}
function searchIdentity(reference,scene) {
  const people = new Map();
  for (const row of scene.readable ?? []) {
    const id = /^profile:([a-z0-9][a-z0-9-]{0,40})$/u.exec(row?.id ?? '')?.[1];
    const label = /^(.{2,40})的已知人物记录$/u.exec(row?.name ?? '')?.[1];
    if (id && label) people.set(id,{id,label});
  }
  for (const row of scene.nearby ?? []) if (nameVisible(row)) people.set(row.id,row);
  return namedLocalReference(reference,{nearby:[...people.values()]},true);
}
export function localSearchLook(raw, scene) {
  const frame = typeof raw === 'string' && sameRoomSequence(scene) && localSearchLookFrame.exec(raw);
  if (!frame) return null;
  const subjectId = searchIdentity(frame[2],scene);
  if (!subjectId) return null;
  const sight = scene.nearby?.find(row=>row.id===subjectId && nameVisible(row));
  return { subjectId, ...(sight ? { label:sight.label } : {}), ...(frame[1] ? { reflection:'我'+frame[1]+'。' } : {}) };
}
export function localSearchThanks(raw,scene,targetId) {
  const q=searchQuote(raw);
  if (!q || !sameRoomSequence(scene)) return null;
  const parts=q.text.replace(/[。！!]$/u,'').split(/[，,：:]/u).map(s=>s.trim());
  if (/^(?:嗯|啊|哦|好)$/u.test(parts[0])) parts.shift();
  let id;
  if (parts.length === 1 && searchThanksPhrase.test(parts[0])) id=scene.replyPeer;
  if (parts.length === 2) {
    const address = searchThanksPhrase.test(parts[0]) ? parts[1] : searchThanksPhrase.test(parts[1]) ? parts[0] : null;
    if (address) id=namedLocalReference(address,scene,true);
  }
  if (!id || targetId !== undefined && targetId !== id || !scene.nearby?.some(row=>row.id===id && nameVisible(row))) return null;
  return selected(raw,id,q.start,q.end,'current-quoted-address');
}
export function localSearchProposal(raw,scene,targetId) {
  const q=searchQuote(raw);
  if (!q || !sameRoomSequence(scene) || !scene.nearby?.some(row=>row.id===targetId && nameVisible(row))) return null;
  // Only an independently delimited leading name can introduce a different
  // addressee. The complete wait-for construction below binds its OBJECT as
  // the person mentioned; that reference never supplies the addressee.
  let phrasing = q.text;
  const vocative=/^([\p{L}·・]{2,20})[，,：:]\s*(?=(?:那|我们|我們|咱们|咱們|你觉得|你覺得))/u.exec(phrasing);
  if (vocative) {
    if (namedLocalReference(vocative[1],scene,true) !== targetId) return null;
    phrasing=phrasing.slice(vocative[0].length);
  }
  const about=searchSuggestion.exec(phrasing);
  const subjectId=about && searchIdentity(about[1],scene);
  if (!subjectId || subjectId===targetId) return null;
  return { ...selected(raw,targetId,q.start,q.end,'current-quoted-address'),subjectId };
}
export function localSearchSpeechSelection(raw,scene,targetId) {
  const thanks=localSearchThanks(raw,scene,targetId);
  if (thanks) return thanks;
  const proposal=localSearchProposal(raw,scene,targetId);
  if (!proposal) return null;
  const {subjectId,...speech}=proposal;
  return speech;
}
function localSearchParts(raw) {
  if (typeof raw !== 'string' || raw.length>1300 || /[<>\u0000-\u0009\u000b-\u001f\u007f]/u.test(raw)) return null;
  const parts=raw.split(/\n[ \t]*\n+/u).map(part=>part.trim());
  return parts.length===3 && searchQuote(parts[0]) && localSearchLookFrame.test(parts[1]) && searchQuote(parts[2]) ? parts : null;
}
export const localSearchConversationDomain=raw=>Boolean(localSearchParts(raw));
export function ordinaryLocalSearchSource(raw,scene) {
  const parts=localSearchParts(raw);
  if (!parts) return null;
  const [first,look,last]=parts, start=localSearchThanks(first,scene), search=localSearchLook(look,scene);
  const proposal=start && localSearchProposal(last,scene,start.targetId);
  return search && proposal?.subjectId===search.subjectId ? {first,look,last,start,search,proposal} : null;
}

// Task97: a local optical question supplies an aim, not an arrival or a
// physical link to the people named. These recognizers never select an intent.
const thresholdLookFrame = /^我(?:(?:又|再|便|就)?(?:回头|回頭|转头|轉頭))?(?:看向|看看|望向|望了望|看一眼|看了看)([^，,。！？；;\n]{1,36})[，,]\s*(?:留意|看看|看一看|瞧瞧|辨认|辨認)([^，,。！？；;\n]{1,47}?)(?:(?:有)?(?:没有|沒有)(?:跟上来|跟上來|跟来|跟來|过来|過來|来|來)|(?:是否|是不是)(?:跟上来|跟上來|跟来|跟來|过来|過來|在(?:那边|那邊|附近))|(?:还|還)?在不在(?:那边|那邊|附近)?)[。！？!?]$/u;
const moveVisualFrame = /^(我(?:看了看|看向|望了望|望向|瞧了瞧|扫了一眼|掃了一眼)([^，,。！？；;\n]{1,42}))[，,]\s*(?:然后|然後|随后|隨後|接着|接著|再)(?:(?:朝|向|往)((?:通往|朝向)[^，,。！？；;\n]{1,27}(?:出口|入口|门口|門口))(?:走去|走过去|走過去|走|迈步|邁步)|走向((?:通往|朝向)[^，,。！？；;\n]{1,27}(?:出口|入口|门口|門口)))[。！!]$/u;
const describedGuard = /^(?:(?:刚才|剛才|方才|之前)(?:给我|給我|替我|带我们|帶我們)?)?(?:(?:引路|领路|領路|带路|帶路)的)(?:那个|那個|那位)?(?:看守|守卫|守衛)$/u;
function visualNameList(raw) {
  const names=raw.trim().split(/[和与與、及]/u).map(x=>x.trim());
  return names.length<=3 && new Set(names).size===names.length && names.every(x=>/^[\p{L}·・]{2,18}$/u.test(x)
    && !/^(?:大家|有人|她们|她們|他人|我|你|看看|过去|過去|让|讓|叫|请|請|没人|沒人|没有|沒有|如果|若|隔着|隔著)/u.test(x)) ? names : null;
}
function visualThreshold(ref, scene) {
  const bySide=/^(.{2,24}?)的((?:出口|入口|门口|門口)(?:方向|那边|那邊)?)$/u.exec(ref);
  return localThresholdFocus(bySide && !/^(?:通往|朝向|朝)/u.test(ref)?'通往'+bySide[1]+'的'+bySide[2]:ref,scene);
}
export function localThresholdLook(raw,scene) {
  const f=typeof raw==='string' && sameRoomSequence(scene) && thresholdLookFrame.exec(raw);
  if (!f) return null;
  const focus=visualThreshold(f[1].trim(),scene), ref=f[2].trim(), names=visualNameList(ref);
  if (!focus) return null;
  if (describedGuard.test(ref)) return {focus,needles:[null]};
  if (!names || names.some(x=>/(?:看守|守卫|守衛|引路|过去|過去|替我|里面|裡面|门外|門外|邻房|鄰房)/u.test(x))) return null;
  const needles=names.map(name=>searchIdentity(name,scene));
  if (new Set(needles.filter(Boolean)).size!==needles.filter(Boolean).length) return null;
  return {focus,needles};
}
export function localThresholdLookText(proof,scene) {
  const seen=proof.needles.flatMap(id=>{
    const row=id && scene.nearby?.find(x=>x.id===id && nameVisible(x));
    return row?[row.label]:[];
  });
  if (!seen.length) return '在当前能看到的范围内，我仍未确认要找的人。';
  const seenText='我在眼前的人里认出了'+seen.join('和');
  return seenText+(seen.length===proof.needles.length?'。':proof.needles.length-seen.length===1?'；另一位仍未确认。':'；其余仍未确认。');
}
export function localMoveVisualPrelude(raw,scene,destination) {
  const f=typeof raw==='string' && sameRoomSequence(scene) && moveVisualFrame.exec(raw);
  if (!f || !destination || visualThreshold(f[3]??f[4],scene)?.edgeId!==destination) return null;
  const names=visualNameList(f[2]), ids=names?.map(name=>namedLocalReference(name,scene,true));
  return ids?.every(Boolean) && new Set(ids).size===ids.length ? f[1]+'。' : null;
}
function visualStepSource(raw, text) {
  if (typeof text!=='string' || typeof raw!=='string') return false;
  const quotes=topLevelPlayerQuotes(raw), at=raw.indexOf(text);
  return quotes!==null && at>=0 && raw.lastIndexOf(text)===at && !quotes.some(q=>at<q.close && at+text.length>q.open)
    && /^[ \t]*$/u.test(raw.slice(raw.lastIndexOf('\n',at-1)+1,at)) && /^[ \t]*(?:\n|$)/u.test(raw.slice(at+text.length));
}
export function ordinaryLocalVisualPlanPins(raw, inherited) {
  if (typeof raw!=='string' || raw.length>2000 || /[<>\u0000-\u0009\u000b-\u001f\u007f]/u.test(raw)) return {};
  const spans=raw.split(/\n+/u).map(s=>s.trim()).filter(text=>visualStepSource(raw,text));
  return {...((inherited===undefined || inherited?.ordinaryLocalLookOutcomeVersion===1) && spans.some(text=>thresholdLookFrame.test(text))?{ordinaryLocalLookOutcomeVersion:1}:{}),
    ...((inherited===undefined || inherited?.ordinaryMoveVisualPreludeVersion===1) && spans.some(text=>moveVisualFrame.test(text))?{ordinaryMoveVisualPreludeVersion:1}:{})};
}
export function ordinaryLocalVisualActionPins(plan,raw,steps) {
  if (!Array.isArray(steps)) return {};
  // Require the whole raw top-level span and the independently selected step.
  return {...(plan.ordinaryLocalLookOutcomeVersion===1 && steps.some(step=>step.intent?.type==='look'
    && step.intent.targetId===undefined && thresholdLookFrame.test(step.text) && visualStepSource(raw,step.text))?{ordinaryLocalLookOutcomeVersion:1}:{}),
    ...(plan.ordinaryMoveVisualPreludeVersion===1 && steps.some(step=>step.intent?.type==='move'
      && moveVisualFrame.test(step.text) && visualStepSource(raw,step.text))?{ordinaryMoveVisualPreludeVersion:1}:{})};
}

export function roomGroupSpeechLiteral(raw) {

  if (typeof raw !== 'string' || raw.length > 1600 || /[<>\p{Cc}]/u.test(raw)) return null;
  const source = raw.trim(), offset = raw.search(/\S/u);
  const frame = explicitRoomFrame.exec(source)?.[0] ?? '';
  const body = source.slice(frame.length);
  const quote = quoteRange(body);
  if (!quote) return null;
  const text = body.slice(quote.start, quote.end);
  if (!text.trim() || text.length > 1400 || /[「」『』“”"]/.test(text)) return null;
  return { start: offset + frame.length + quote.start, end: offset + frame.length + quote.end, text, form: 'current-room-group@1',
    explicit: Boolean(frame) || groupVocative.test(text) };
}

const waitTogether = /^(?:嗯|好|好的|好啊)[，,]\s*([\p{Script=Han}]{2,16}?)(?:也)?(?:一起|一同|一道)[。！!]$/u;
const waitAtStairs = /^我(?:先|就)?(?:等|等到)([\p{Script=Han}]{2,16}?)(?:把)?(?:收好(?:她的)?(?:素描本|速写本|速寫本)|(?:素描本|速写本|速寫本)收好)[，,]\s*(?:便|才|再|就)(?:走向|走近|走到)([^，,。；;！？\n]{1,28})[，,]\s*(?:扶着|扶著|扶住)墙(?:边|邊)?(?:小心地?|慢慢地?)(?:往上走|走上去|上楼|上樓)[。！!]$/u;
export const LOCAL_CONDITIONAL_WAIT_ACTION = '我留在原地稍等。';

export function localConditionalWaitStep(raw,scene) {
  const match=typeof raw==='string' && waitAtStairs.exec(raw);
  if (!match) return null;
  const actor=match[1], threshold=match[2].trim();
  if (!safeReference.test(threshold)) return null;
  if (scene!==undefined && (!localRoomSpeechScene(scene)
    || localPointFocus(`我指向${threshold}。`,scene)?.[0]?.kind!=='stairs')) return null;
  return {actor,threshold};
}
function recognizedLocalPeer(ref,scene,player) {
  const matches=scene.nearby?.filter(row=>nameVisible(row) && [row.label,...ordinaryAddressForms(player,row)
    .flatMap(form=>[form,form.replace(/(?:酱|醬|桑|君|亲|親)$/u,'')])].some(form=>compare(form)===compare(ref))) ?? [];
  return matches.length===1 ? matches[0].id : null;
}
export function localConditionalWaitSpeech(raw,scene,player,targetId) {
  const q=typeof raw==='string' && strictQuoteRange(raw), text=q && raw.slice(q.start,q.end);
  const ack=text && waitTogether.exec(text), target=ack && recognizedLocalPeer(ack[1],scene,player);
  return target && target===targetId && scene.replyPeer===target && resolvePlayerAddress(raw,scene,target,3)?.text===text ? text : null;
}
export function localConditionalWaitSource(raw,scene,player) {
  if (typeof raw!=='string' || raw.length>1000 || /[<>\u0000-\u0009\u000b-\u001f\u007f]/u.test(raw)) return null;
  const spans=raw.trim().split(/\n[ \t]*\n+/u);
  if (spans.length!==2) return null;
  const [quote,waitText]=spans, q=strictQuoteRange(quote), tail=localConditionalWaitStep(waitText,scene);
  const text=q && quote.slice(q.start,q.end);
  if (!text || !waitTogether.test(text) || !tail) return null;
  if (scene===undefined) return {quote,text,waitText,tail};
  const targetId=recognizedLocalPeer(tail.actor,scene,player);
  return targetId && localConditionalWaitSpeech(quote,scene,player,targetId)===text ? {quote,text,waitText,tail,targetId} : null;
}
export function localConditionalWaitPlan(proof) {
  return {type:'plan',route:'steps',summary:'向同一位在场者说原话，只短等一次；保留条件后的动作，本轮未执行。',activitySelection:{kind:'ordinary'},steps:[
    {text:proof.quote,condition:'always',intent:{type:'conversation',summary:'向同一位在场者逐字说原话。',targetId:proof.targetId,playerText:proof.text}},
    // Full original condition and consequent remain in this raw slice, not in a movement slot.
    {text:proof.waitText,condition:'previous_completed',intent:{type:'wait',summary:'只在原处短等；条件后的动作不在本轮执行。'}}]};
}

const travelInvitation = /^(?:(?:嗯|好|好啊|是啊)[，,]\s*)?(?:我们|我們|咱们|咱們)(?:就)?(?:一起|一同|一道)(?:慢慢|小心地?)?(?:(上去|往上走|往楼上走|往樓上走)|(过去|過去|走过去|走過去|穿过去|穿過去|走出去))吧[。！!]$/u;
const localTravelFrame = /^我(?:走向|走近|走到)([^，,。；;！？\n]{1,30})[，,]\s*(?:留意|注意)(?:着|著)?(?:脚下|腳下)(?:(?:和|与|與|以及)(?:周围|周圍|四周))?[，,]\s*(?:试着|試著|尝试|嘗試)(?:(?:上到|走上|走到|到达|到達)([一二三四五六七八九十0-9]{1,3}[楼樓])|穿过去|穿過去|走过去|走過去|走出去)[。！!]$/u;

// The physical reference is a local threshold, not a selected destination.
export function localTravelAttemptStep(raw, scene) {
  const match=typeof raw==='string' && localTravelFrame.exec(raw);
  if (!match) return null;
  const reference=match[1].trim(), level=match[2] && normalizeStair(match[2]);
  if (!safeReference.test(reference)) return null;
  const proof={reference,level,action:raw};
  if (scene===undefined) return proof;
  if (!localRoomSpeechScene(scene) || !sameRoomSequence(scene) || !Array.isArray(scene.permittedDestinations)) return null;
  if (level) {
    const point=localPointFocus(`我指向${reference}。`,scene);
    if (point?.[0]?.kind!=='stairs' || normalizeStair(point[0].level ?? '')!==level
      || scene.adjacent.some(edge=>[edge.label,edge.id].some(name=>normalizeStair(name ?? '')===level))) return null;
    return {...proof,focus:point[0]};
  }
  const focus=visualThreshold(reference,scene);
  const edge=focus?.edgeId ?? (focus && scene.adjacent.length===1 ? scene.adjacent[0].id : undefined);
  return edge && !scene.permittedDestinations.includes(edge) ? {...proof,focus:{...focus,edgeId:edge}} : null;
}
const directedTravelQuote = /^(?:(?:我(?:也)?不知道|我(?:也)?不清楚)(?:呢|啊)?[，,]\s*([\p{Script=Han}]{2,16})|([\p{Script=Han}]{2,16})[，,]\s*(?:我(?:也)?不知道|我(?:也)?不清楚)(?:呢|啊)?)[。！!]\s*(?:我们|我們|咱们|咱們)(?:一起|一同|一道)(?:去|过去|過去)(?:看看|看一看)吧[。！!]$/u;
const travelLookFrame = /^我(?:走到|走近|来到|來到)([^，,。；;！？\n]{1,28}?)(?:跟前|前面|前|旁|边|邊)[，,]\s*(?:先)?(?:看看|看一看|察看|查看)(?:楼梯|樓梯|台阶|臺階|阶梯|階梯)(?:的情况|的情況|的样子|的樣子)?[，,。；;]$/u;
const travelTryFrame = /^(?:然后|然後|随后|隨後|接着|接著|再)\s*(?:我)?(?:试着|試著|尝试|嘗試)?(?:小心地?|慢慢地?)?(?:往上走|朝上走|走上去|往楼上走|往樓上走)[。！!]$/u;

// A unique, currently offered stairway binds both local spans. Its floor
// label describes the fixture; it does not identify a movement destination.
function unresolvedLocalStair(scene,reference) {
  if (!localRoomSpeechScene(scene) || !sameRoomSequence(scene) || !Array.isArray(scene.adjacent)) return null;
  const nouns=(scene.ruleFacts ?? []).flatMap(fact=>typeof fact==='string' ? [localStairLocation.exec(fact)?.[2]].filter(Boolean) : []);
  if (nouns.length!==1) return null;
  const stairs=localPointFocus(`我指向${reference ?? nouns[0]}。`,scene)?.[0], level=stairs?.level && normalizeStair(stairs.level);
  return stairs?.kind==='stairs' && level && /^[一二三四五六七八九十0-9]{1,3}楼$/u.test(level)
    && !scene.adjacent.some(row=>[row.id,row.label].some(label=>normalizeStair(label ?? '')===level)) ? stairs : null;
}
export function localTravelDirectedSpeech(raw,scene,player) {
  const q=typeof raw==='string' && strictQuoteRange(raw), text=q && raw.slice(q.start,q.end);
  const captured=text && directedTravelQuote.exec(text);
  if (!captured) return null;
  if (scene===undefined) return {text};
  const targetId=recognizedLocalPeer(captured[1] ?? captured[2],scene,player);
  return targetId && targetId===scene.replyPeer && resolvePlayerAddress(raw,scene,targetId,3)?.text===text ? {text,targetId} : null;
}
export function localTravelDirectedStep(raw,scene,index) {
  if (typeof raw!=='string') return null;
  if (index===1) {
    const match=travelLookFrame.exec(raw);
    if (!match) return null;
    const reference=match[1].trim();
    if (!safeReference.test(reference)) return null;
    if (scene!==undefined && (!unresolvedLocalStair(scene,reference) || !unresolvedLocalStair(scene))) return null;
    return {action:raw.replace(/[，,；;]$/u,'。')};
  }
  return index===2 && travelTryFrame.test(raw) && (scene===undefined || unresolvedLocalStair(scene))
    ? {action:'我试着往上走。'} : null;
}
export function localTravelAttemptSource(raw, scene, version=1, player) {
  if (version===2) {
    if (typeof raw!=='string' || raw.length>1000 || /[<>\u0000-\u0009\u000b-\u001f\u007f]/u.test(raw)) return null;
    const spans=raw.trim().split(/\n[ \t]*\n+/u);
    if (spans.length!==2) return null;
    const [stepText,tail]=spans,speech=localTravelDirectedSpeech(stepText,scene,player);
    const cut=tail.search(/(?:然后|然後|随后|隨後|接着|接著|再)/u);
    const approach=cut>0 && tail.slice(0,cut),traverse=cut>0 && tail.slice(cut);
    return speech && localTravelDirectedStep(approach,scene,1) && localTravelDirectedStep(traverse,scene,2)
      ? {version:2,stepText,...speech,approach,traverse} : null;
  }
  if (version!==1) return null;
  if (typeof raw!=='string' || raw.length>1000 || /[<>\u0000-\u0009\u000b-\u001f\u007f]/u.test(raw)) return null;
  const spans=raw.trim().split(/\n[ \t]*\n+/u);
  if (spans.length!==2) return null;
  const [first,tail]=spans, spoken=roomGroupSpeechLiteral(first);
  const intent=spoken && travelInvitation.exec(spoken.text), step=intent && localTravelAttemptStep(tail,scene);
  if (!step || Boolean(intent[1])!==Boolean(step.level) || scene?.replyPeer) return null;
  return {...spoken,stepText:first,tail,step};
}
export function supportsLocalTravelProposal(text, proof) {
  if (typeof text!=='string' || /(?:如果|假如|要是|听说|聽說|转述|轉述|明天|待会|待會|以后|以後|不要|别走|別走|已经|已經)/u.test(text)) return false;
  return (text.includes(proof.step.reference) || proof.step.level && /(?:楼上|樓上|上面)/u.test(text))
    && /(?:留意|注意|小心)[^。！？]{0,24}[，,]\s*(?:再|然后|然後)(?:过去|過去|走过去|走過去|上去)(?:看看|看一看|试试|試試)吧[。！!]$/u.test(text);
}
export function localTravelAttemptPlan(proof) {
  if (proof.version===2) return {type:'plan',route:'steps',summary:'逐字回应，再靠近察看同一楼梯，尝试通行。',activitySelection:{kind:'ordinary'},steps:[
    {text:proof.stepText,condition:'always',intent:{type:'conversation',summary:'向同室的实际问话者逐字回应。',targetId:proof.targetId,playerText:proof.text}},
    {text:proof.approach,condition:'previous_completed',intent:{type:'act',summary:'接近本房的楼梯，在现有视野内察看台阶。'}},
    {text:proof.traverse,condition:'previous_completed',intent:{type:'act',summary:'向楼上作一次通行尝试；结果由当前通路裁决。'}}]};
  return {type:'plan',route:'steps',summary:'向同室说出原话，再由本人接近并试走。',activitySelection:{kind:'ordinary'},steps:[
    {text:proof.stepText,condition:'always',intent:{type:'conversation',summary:'向同室说出原话。',speechScope:'room',playerText:proof.text}},
    {text:proof.tail,condition:'previous_completed',intent:{type:'act',summary:'留意脚下，作一次本地通行尝试。'}}]};
}

export function roomGroupSpeechSource(raw, scene) {
  if (typeof raw !== 'string' || raw.length > 2000) return null;
  const spans = raw.trim().split(/\n[ \t]*\n+/u);
  if (spans.length > 3) return null;
  const matches = spans.map((span, index) => ({ span, index, line: roomGroupSpeechLiteral(span) })).filter(row => row.line);
  if (matches.length !== 1) return null;
  const { span, index, line } = matches[0];
  const vocative = /^[^，,：:！!？?。\s]{1,30}(?=[，,：:！!])/u.exec(line.text)?.[0];
  if (secondPerson.test(line.text) || (vocative && scene?.nearby && matching(vocative, scene).length)) return null;
  const outside = spans.filter((_, i) => i !== index);
  if (outside.some(part => !physicalFrameOnly.test(part) || outsideGroupBoundary.test(part))) return null;
  if (!line.explicit && (!openGroupQuestion.test(line.text) || !outside.some(part => lookAtGroup.test(part)))) return null;
  return { stepText: span, ...line };
}

export function localRoomSpeechScene(scene) {
  return typeof scene?.roomId === 'string' && !['court', 'unavailable'].includes(scene.roomId)
    && [undefined, 'daily', 'aftermath'].includes(scene.case?.stage)
    && !scene.guard?.pending && scene.guard?.detention?.status !== 'detained' && !scene.confinement?.returnRequired
    && Array.isArray(scene.nearby) && new Set(scene.nearby.map(row => row.id).filter(id => typeof id === 'string')).size >= 2;
}

function currentBody(body) {
  if (!body.trim() || notCurrent.test(body)) return false;
  // Do not treat a model's conversation label as permission to consume an
  // unquoted physical step as part of the utterance. Explicit quoted speech
  // may report any act; the content itself never executes that act.
  return !body.split(/[，,。！？!?；;\n]/u).some(clause => subjectAction.test(clause.trim()));
}
function agreesWithQuoteRecipient(text, scene, targetId, alias, anchored = false) {
  const comma = text.search(/[，,：:]/u);
  if (comma <= 0) {
    const head = text.search(/[。！!？?…\s]/u);
    const possible = head > 0 ? matching(text.slice(0, head), scene) : [];
    return !possible.length || possible.length === 1 && possible[0].id === targetId;
  }
  const lead = text.slice(0, comma).trim();
  if (deictic.test(lead) || acknowledgement.test(lead) || greeting.test(lead)) return true;
  if (!safeReference.test(lead)) return true;
  const heard = matching(lead, scene);
  // Only linguistic evidence for a different recipient defeats an explicit
  // delivery anchor. For an unanchored novel salutation, require its own proof.
  if (heard.length) return heard.length === 1 && heard[0].id === targetId;
  // A topic or a narrative lead is not a competing vocative. In contrast,
  // an unbound label before a greeting or singular second-person address is.
  return lead === alias || anchored || !greeting.test(text.slice(comma + 1).trim()) && !secondPerson.test(text.slice(comma + 1).trim());
}

export function resolvePlayerAddress(raw, scene, targetId, sequenceVersion) {
  if (typeof raw !== 'string' || !raw.trim() || raw.length > 2000 || /[<>\u0000-\u0009\u000b-\u001f\u007f]/u.test(raw)
    || !Array.isArray(scene?.nearby) || scene.nearby.filter(row => row.id === targetId).length !== 1) return null;
  const anchor = raw.search(/\S/u), source = raw.trim(), end = anchor + source.length;
  const strict = [1, 2, 3].includes(sequenceVersion);
  const spans = strict ? topLevelPlayerQuotes(source) : [];
  if (!spans) return null;
  if (spans.length > 1) {
    const gaze = addressedGaze.exec(source);
    if (spans.length !== 2 || !gaze?.[2] || !strictQuoteRange(gaze[3])) return null;
  }
  const readQuote = strict ? strictQuoteRange : quoteRange;
  if (notCurrent.test(source) || /^我(?:刚才|剛才|昨天|曾经|曾經|过去|過去|之前)(?:对|對|向|和|跟|朝|说|說|问|問|告[诉訴])/u.test(source)) return null;
  const recipient = reference => {
    const matches = matching(reference.trim(), scene);
    return matches.length === 1 && matches[0].id === targetId;
  };
  const spoken = addressedSpeech.exec(source);
  if (spoken) {
    if (!recipient(spoken[1])) return null;
    const rest = source.slice(spoken[0].length), quote = readQuote(rest);
    if (quote) {
      const literal = rest.slice(quote.start, quote.end);
      return agreesWithQuoteRecipient(literal, scene, targetId, undefined, true)
        ? selected(raw, targetId, anchor + spoken[0].length + quote.start, anchor + spoken[0].length + quote.end, 'current-quoted-address') : null;
    }
    const nestedReport = spans.length === 1 && spans[0].open > spoken[0].length
      && reporting.test(source.slice(spoken[0].length, spans[0].open).trim())
      && /[：:]\s*$/u.test(source.slice(spoken[0].length, spans[0].open))
      && /^[。！？.!?\s]*$/u.test(source.slice(spans[0].close));
    return rest && (!spans.length || nestedReport) ? selected(raw, targetId, anchor + spoken[0].length, end, 'current-delivery-address') : null;
  }
  const anchored = addressedGaze.exec(source);
  if (anchored) {
    if (!recipient(anchored[1])) return null;
    const body = anchored[3], at = end - body.length, quote = readQuote(body);
    if (quote) {
      const literal = body.slice(quote.start, quote.end);
      return agreesWithQuoteRecipient(literal, scene, targetId, anchored[2], true)
        ? selected(raw, targetId, at + quote.start, at + quote.end, 'current-turn-quote@1') : null;
    }
    return (!spans.length || spans.length === 1 && anchored[2] && spans[0].close <= at) && currentBody(body) && agreesWithQuoteRecipient(body, scene, targetId, anchored[2])
      ? selected(raw, targetId, at, end, 'current-addressed-gaze@2') : null;
  }
  const quote = readQuote(source);
  if (quote) {
    const body = source.slice(quote.start, quote.end);
    if (!agreesWithQuoteRecipient(body, scene, targetId)) return null;
    const mark = body.search(/[，,：:！!]/u);
    const direct = mark > 0 && recipient(body.slice(0, mark));
    const conversational = greeting.test(body) || acknowledgement.test(body) || secondPerson.test(body);
    return direct || scene.replyPeer === targetId || scene.nearby.length === 1 && conversational
      ? selected(raw, targetId, anchor + quote.start, anchor + quote.end, 'current-quoted-address') : null;
  }
  if (spans.length) return null;
  const delimiter = source.search(separators);
  if (delimiter > 0 && delimiter <= 64) {
    const ref = source.slice(0, delimiter).trim();
    const suffix = source.slice(delimiter + 1).trim();
    if (!greeting.test(ref) && !acknowledgement.test(ref) && !secondPerson.test(ref) && !reporting.test(source)) {
      if (recipient(ref) && (!suffix ? /[！!]/u.test(source[delimiter]) : currentBody(suffix))) return selected(raw, targetId, 0, raw.length, 'current-vocative@2');
      if (safeReference.test(ref) && suffix && !/^(?:我|那|这|這|门|門|刚|剛|昨|风|風|不|还|還|但|可|就|好)/u.test(ref)) return null;
    }
  }
  if (/^(?:你们|你們|各位|大家|诸位|諸位)(?:[，,！!]|.{0,12}[。！？!?])/u.test(source)) return null;
  const conversational = secondPerson.test(source) || listenerGrammar.test(source) || greeting.test(source) || acknowledgement.test(source);
  const contextPeer = scene.replyPeer ?? (scene.nearby.length === 1 && conversational ? scene.nearby[0].id : undefined);
  if (contextPeer !== targetId || !currentBody(source) || reporting.test(source)) return null;
  return selected(raw, targetId, 0, raw.length, 'current-context-address@2');
}

/** Side-effect free: recent dialogue comes from the same already delivered
 * canonical world rows. Only a bounded single peer in the same current room
 * may ground a response. Never infer an identity from a past transcript name. */
function legacyReplyContext(state, playerId, scene, targetIds) {
  if (!Array.isArray(state?.entries) || !Array.isArray(scene?.nearby) || !scene.roomId || !Number.isSafeInteger(state.worldTime)) return {};
  const toPerceived = actual => scene.nearby.find(row => (Object.hasOwn(targetIds, row.id) ? targetIds[row.id] : row.id) === actual)?.id;
  const recent = state.entries.slice(-12).reverse().filter(row => ['speech', 'writing'].includes(row.delivery)).slice(0, 2);
  const engaged = row => row && Array.isArray(row.audienceIds) && row.audienceIds.includes(playerId)
    // A bounded ordinary turn can spend five minutes through its NPC beats.
    && Number.isSafeInteger(row.occurredAt) && row.occurredAt <= state.worldTime && state.worldTime - row.occurredAt <= 360
    && row.conversationRoomId === scene.roomId && row.addresseeIds?.length === 1 && row.audienceIds.includes(row.addresseeIds[0]);
  const [last, before] = recent;
  if (!engaged(last)) return {};
  const actual = last.speakerId === playerId ? last.addresseeIds[0] : last.addresseeIds[0] === playerId ? last.speakerId : undefined;
  const replyPeer = actual && toPerceived(actual);
  if (!replyPeer) return {};
  const delivery = last.speakerId === playerId ? last : before;
  const context = { replyPeer };
  if (!engaged(delivery) || delivery.speakerId !== playerId || delivery.addresseeIds[0] !== actual) return context;
  // Only the immediately preceding real player delivery (optionally just
  // answered by its recipient) can lend one address. Match its canonical
  // question/event key; a plain topic, NPC utterance, or unchosen raw fragment
  // is not a previously demonstrated address. No alias table is persisted.
  const action = state.agentActions?.slice(-2).find(row => row.ordinaryAddressVersion === 2 && row.questionKey === delivery.observationKey
    && row.intent?.type === 'conversation' && row.intent.targetId === actual && row.performance?.utterance === delivery.text);
  const raw = action?.rawInput?.trim();
  if (!raw || !(addressedSpeech.test(raw) || addressedGaze.test(raw))) return context;
  const lead = /^([^，,：:]{1,48})[，,：:]\s*(.+)$/u.exec(delivery.text);
  if (!lead || !safeReference.test(lead[1]) || !secondPerson.test(lead[2]) && !greeting.test(lead[2])) return context;
  const collisions = matching(lead[1], { nearby: scene.nearby });
  return !collisions.length || collisions.length === 1 && collisions[0].id === replyPeer
    ? { ...context, replyAddress: lead[1] } : context;
}

function deliveredClause(action, event, person) {
  if (![2, 3].includes(action.ordinaryAddressVersion)) return null;
  const steps = action.playerIntentPlan?.steps;
  const index = event.observationKey === action.questionKey ? 0
    : action.ordinaryAddressVersion === 3 ? [1, 2].find(i => event.observationKey === `${action.questionKey}:step:${i}`) : undefined;
  if (index === undefined) return null;
  const intent = index === 0 ? action.intent : steps?.[index]?.intent;
  const performance = index === 0 ? action.performance : action.playerPerformances?.find(row => row.index === index)?.performance;
  if (intent?.type !== 'conversation' || intent.targetId !== person || performance?.utterance !== event.text) return null;
  const raw = (steps?.[index]?.text ?? (index === 0 ? action.rawInput : undefined))?.trim();
  return raw ? { raw, action } : null;
}

function recoveredRoomFromReply(state, reply, delivered, action, room, player) {
  // V2 already recorded the player's room. Recover only around the very same
  // latest committed action, using the real delivered NPC proposal and its
  // owner-local hearing source. An arbitrary old directed line proves no room.
  if (action !== state.agentActions?.at(-1) || action.ordinaryAddressVersion !== 2 || delivered.conversationRoomId !== room
    || reply.occurredAt < delivered.occurredAt || !reply.audienceIds.includes(reply.speakerId)
    || !delivered.audienceIds.includes(reply.speakerId)) return false;
  const heard = `obs-${createHash('sha256').update(JSON.stringify(['owner-event@1', delivered.observationKey, reply.speakerId])).digest('hex').slice(0, 48)}`;
  return action.beats?.some(beat => reply.observationKey === `npc:${action.jobId}:beat:${beat.beat}:${reply.speakerId}`
    && beat.decisions.some(({ actorId, proposal }) => actorId === reply.speakerId
      && proposal.utterance === reply.text && (reply.communication?.replyToObservationId === heard
        || proposal.decision?.sourceObservationIds?.includes(heard))
      && reply.addresseeIds[0] === player)) ?? false;
}

export function ordinaryReplyContext(state, playerId, scene, targetIds = {}, version = 2) {
  if (version !== 3) return legacyReplyContext(state, playerId, scene, targetIds);
  if (!Array.isArray(state?.entries) || !Array.isArray(scene?.nearby) || !scene.roomId || !Number.isSafeInteger(state.worldTime)) return {};
  const room = scene.roomId;
  const engaged = [];
  for (const row of state.entries.slice(-24).reverse()) {
    if (row.delivery === 'action' && row.speakerId === playerId && row.observationKey?.endsWith(':arrival')) break;
    if (!['speech', 'writing'].includes(row.delivery) || !row.audienceIds?.includes(playerId)) continue;
    // A speaker beside us or a conversation we merely overhear is not our
    // next dialogue turn, even if its audible event happens more recently.
    if (row.speakerId !== playerId && !row.addresseeIds?.includes(playerId)) continue;
    engaged.push(row);
  }
  const current = row => row && Number.isSafeInteger(row.occurredAt) && row.occurredAt <= state.worldTime
    && state.worldTime - row.occurredAt <= 360 && row.addresseeIds?.length === 1 && row.audienceIds.includes(row.addresseeIds[0]);
  const last = engaged[0];
  if (!current(last)) return {};
  const actual = last.speakerId === playerId ? last.addresseeIds[0] : last.speakerId;
  const replyPeer = scene.nearby.find(row => (Object.hasOwn(targetIds, row.id) ? targetIds[row.id] : row.id) === actual)?.id;
  if (!replyPeer) return {};
  let delivery = last;
  if (last.speakerId !== playerId) {
    // Look only through the same directed exchange, stopping at any different
    // participation by either side. The earliest ignored event cannot bind.
    delivery = engaged.find((row, i) => i > 0 && (row.speakerId !== actual || !current(row)));
  }
  const consistent = current(delivery) && delivery.speakerId === playerId && delivery.addresseeIds[0] === actual
    && delivery.conversationRoomId === room;
  const source = consistent ? state.agentActions?.slice(-2).map(action => deliveredClause(action, delivery, actual)).find(Boolean) : null;
  if (last.conversationRoomId !== room && !(last.conversationRoomId === undefined && last.speakerId !== playerId
      && source && recoveredRoomFromReply(state, last, delivery, source.action, room, playerId))) return {};
  const context = { replyPeer };
  if (!source || !(addressedSpeech.test(source.raw) || addressedGaze.test(source.raw))) return context;
  const lead = /^([^，,：:]{1,48})[，,：:]\s*(.+)$/u.exec(delivery.text);
  if (!lead || !safeReference.test(lead[1]) || !secondPerson.test(lead[2]) && !greeting.test(lead[2])) return context;
  const collisions = matching(lead[1], { nearby: scene.nearby });
  return !collisions.length || collisions.length === 1 && collisions[0].id === replyPeer
    ? { ...context, replyAddress: lead[1] } : context;
}

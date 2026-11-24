import { createHash } from 'node:crypto';
import { isProxy } from 'node:util/types';

export const CONVERSATION_STATE_VERSION = 1;
const LIMITS = Object.freeze({ actors: 16, sessionsPerActor: 2, requestsPerActor: 4,
  sessions: 64, requests: 128, journal: 512, ttl: 300, reviewDelay: 30, bytes: 1024 * 1024 });
const KINDS = ['statement', 'ask', 'invite', 'reply', 'accept', 'decline', 'close'];
const RESPONSES = ['reply', 'accept', 'decline', 'close'];
const LIVE = ['pending', 'deferred', 'accepted'];
const STATUSES = [...LIVE, 'answered', 'declined', 'closed', 'expired'];
const RESPONSE_STATUS = Object.freeze({ reply: 'answered', accept: 'accepted', decline: 'declined', close: 'closed' });
const DEFER_REASONS = ['request_capacity', 'actor_capacity', 'request_history_capacity', 'session_capacity'];
const fail = () => { throw Object.assign(new Error('沟通记录、来源或宿主时间不符合版本化契约。'), { code: 'INVALID_CONVERSATION_STATE' }); };
function safely(operation) {
  try { return operation(); } catch { fail(); }
}
function record(value, fields, required = fields) {
  if (!value || typeof value !== 'object' || isProxy(value)
    || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) fail();
  const keys = Reflect.ownKeys(value);
  if (keys.length > fields.length || keys.some(key => typeof key !== 'string' || !fields.includes(key))) fail();
  const result = {};
  for (const key of fields) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor) { if (required.includes(key)) fail(); continue; }
    if (!descriptor.enumerable || !Object.hasOwn(descriptor, 'value') || descriptor.value === undefined) fail();
    result[key] = descriptor.value;
  }
  return result;
}
function list(value, maximum) {
  if (isProxy(value) || !Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) fail();
  const length = Object.getOwnPropertyDescriptor(value, 'length').value;
  if (length > maximum || Reflect.ownKeys(value).length !== length + 1) fail();
  const result = [];
  for (let index = 0; index < length; index++) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (!descriptor?.enumerable || !Object.hasOwn(descriptor, 'value') || descriptor.value === undefined) fail();
    result.push(descriptor.value);
  }
  return result;
}
function identifier(value) {
  if (typeof value !== 'string' || !value.length || value.length > 128 || value.trim() !== value
    || !value.isWellFormed() || /[\u0000-\u001f\u007f]/u.test(value)
    || ['__proto__', 'constructor', 'prototype'].includes(value)) fail();
  return value;
}
function time(value) {
  if (!Number.isSafeInteger(value) || value < 0) fail();
  return value;
}
function clock(value) {
  time(value);
  if (value > Number.MAX_SAFE_INTEGER - LIMITS.ttl) fail();
  return value;
}
function choice(value, choices) { if (!choices.includes(value)) fail(); return value; }
function unique(rows, key = value => value) {
  if (new Set(rows.map(key)).size !== rows.length) fail();
  return rows;
}
const ids = (value, maximum = LIMITS.actors) => unique(list(value, maximum).map(identifier)).sort();
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const requestId = row => `request-${digest(['conversation-request@1', row.eventId, row.senderId, row.recipientId])}`;
const sessionId = row => `session-${digest(['conversation-session@1', row.eventId, row.participantIds])}`;
const live = row => LIVE.includes(row.status);
function freeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}

function deliveredEvent(value) {
  const row = record(value, ['id', 'speakerId', 'addresseeIds', 'audienceIds', 'observationIdsByActor', 'occurredAt', 'kind', 'replyToObservationId'],
    ['id', 'speakerId', 'addresseeIds', 'audienceIds', 'observationIdsByActor', 'occurredAt', 'kind']);
  const id = identifier(row.id); const speakerId = identifier(row.speakerId);
  const addresseeIds = ids(row.addresseeIds); const audienceIds = ids(row.audienceIds);
  if (new Set([speakerId, ...addresseeIds, ...audienceIds]).size > LIMITS.actors || addresseeIds.includes(speakerId)) fail();
  const observations = record(row.observationIdsByActor, audienceIds);
  const observationIdsByActor = Object.fromEntries(audienceIds.map(actorId => [actorId, identifier(observations[actorId])]));
  unique(Object.values(observationIdsByActor));
  const kind = choice(row.kind, KINDS);
  if (RESPONSES.includes(kind) && row.replyToObservationId === undefined) fail();
  return { id, speakerId, addresseeIds, audienceIds, observationIdsByActor, occurredAt: clock(row.occurredAt), kind,
    ...(row.replyToObservationId === undefined ? {} : { replyToObservationId: identifier(row.replyToObservationId) }) };
}
function sessionRecord(value) {
  const row = record(value, ['id', 'eventId', 'participantIds', 'status', 'createdAt', 'updatedAt', 'expiresAt']);
  const participantIds = ids(row.participantIds, 2);
  if (participantIds.length !== 2) fail();
  const result = { id: identifier(row.id), eventId: identifier(row.eventId), participantIds,
    status: choice(row.status, ['open', 'closed', 'expired']), createdAt: clock(row.createdAt),
    updatedAt: time(row.updatedAt), expiresAt: time(row.expiresAt) };
  if (result.id !== sessionId(result) || result.updatedAt < result.createdAt
    || result.expiresAt < result.createdAt + LIMITS.ttl || result.expiresAt > result.updatedAt + LIMITS.ttl
    || (result.status === 'expired' && result.expiresAt > result.updatedAt)) fail();
  return result;
}
function requestRecord(value) {
  const row = record(value, ['id', 'eventId', 'sessionId', 'senderId', 'recipientId', 'kind', 'sourceObservationId', 'status',
    'createdAt', 'updatedAt', 'reviewAt', 'expiresAt'],
  ['id', 'eventId', 'senderId', 'recipientId', 'kind', 'sourceObservationId', 'status', 'createdAt', 'updatedAt', 'reviewAt', 'expiresAt']);
  const result = { id: identifier(row.id), eventId: identifier(row.eventId),
    ...(row.sessionId === undefined ? {} : { sessionId: identifier(row.sessionId) }),
    senderId: identifier(row.senderId), recipientId: identifier(row.recipientId), kind: choice(row.kind, ['ask', 'invite']),
    sourceObservationId: identifier(row.sourceObservationId), status: choice(row.status, STATUSES),
    createdAt: clock(row.createdAt), updatedAt: time(row.updatedAt), reviewAt: time(row.reviewAt), expiresAt: time(row.expiresAt) };
  if (result.id !== requestId(result) || result.senderId === result.recipientId
    || result.expiresAt !== result.createdAt + LIMITS.ttl || result.updatedAt < result.createdAt
    || result.reviewAt < result.createdAt || result.reviewAt > result.expiresAt
    || (result.status === 'pending' && (result.sessionId === undefined || result.reviewAt !== result.updatedAt))
    || (result.status === 'deferred' && (result.sessionId !== undefined
      || result.reviewAt !== Math.min(result.updatedAt + LIMITS.reviewDelay, result.expiresAt)))
    || (result.status === 'accepted' && result.reviewAt !== Math.min(result.updatedAt + LIMITS.reviewDelay, result.expiresAt))
    || (result.status === 'expired' && result.expiresAt > result.updatedAt)
    || (result.status !== 'expired' && result.updatedAt >= result.expiresAt)) fail();
  return result;
}
function journalRecord(value) {
  const row = record(value, ['worldTime', 'entries']);
  const worldTime = clock(row.worldTime);
  const entries = unique(list(row.entries, LIMITS.journal).map(value => {
    const entry = record(value, ['id', 'digest', 'occurredAt', 'appliedAt', 'requestIds', 'observations', 'deferred'],
      ['id', 'digest', 'occurredAt', 'appliedAt', 'requestIds', 'observations']);
    if (typeof entry.digest !== 'string' || !/^[a-f0-9]{64}$/u.test(entry.digest)) fail();
    const observations = unique(list(entry.observations, LIMITS.actors).map(value => {
      const row = record(value, ['ownerId', 'observationId']);
      return { ownerId: identifier(row.ownerId), observationId: identifier(row.observationId) };
    }), row => row.ownerId);
    unique(observations, row => row.observationId);
    observations.sort((left, right) => left.ownerId < right.ownerId ? -1 : left.ownerId > right.ownerId ? 1 : 0);
    const deferred = entry.deferred === undefined ? undefined : unique(list(entry.deferred, LIMITS.actors).map(value => {
      const row = record(value, ['recipientId', 'reason']);
      return { recipientId: identifier(row.recipientId), reason: choice(row.reason, DEFER_REASONS) };
    }), row => row.recipientId);
    if (deferred) {
      if (!deferred.length || deferred.some(row => !observations.some(observation => observation.ownerId === row.recipientId))) fail();
      deferred.sort((left, right) => left.recipientId < right.recipientId ? -1 : left.recipientId > right.recipientId ? 1 : 0);
    }
    const result = { id: identifier(entry.id), digest: entry.digest, occurredAt: time(entry.occurredAt),
      appliedAt: time(entry.appliedAt), requestIds: ids(entry.requestIds), observations,
      ...(deferred === undefined ? {} : { deferred }) };
    if (result.occurredAt > result.appliedAt || result.appliedAt > worldTime) fail();
    return result;
  }), entry => entry.id);
  if (entries.some((entry, index) => index && entry.appliedAt < entries[index - 1].appliedAt)) fail();
  return { worldTime, entries };
}
function stateActors(state) {
  return new Set([...state.sessions.flatMap(row => row.participantIds), ...state.requests.flatMap(row => [row.senderId, row.recipientId])]);
}
function parseState(value) {
  const row = record(value, ['version', 'sessions', 'requests', 'journal'], ['version', 'sessions', 'requests']);
  if (row.version !== CONVERSATION_STATE_VERSION) fail();
  const state = { version: CONVERSATION_STATE_VERSION,
    sessions: unique(list(row.sessions, LIMITS.sessions).map(sessionRecord), entry => entry.id),
    requests: unique(list(row.requests, LIMITS.requests).map(requestRecord), entry => entry.id),
    ...(row.journal === undefined ? {} : { journal: journalRecord(row.journal) }) };
  unique(state.requests, entry => entry.sourceObservationId);
  if (stateActors(state).size > LIMITS.actors || (!state.journal && (state.sessions.length || state.requests.length))) fail();
  const receipts = new Map(state.journal?.entries.map(entry => [entry.id, entry]) || []);
  const observed = new Set();
  for (const entry of receipts.values()) {
    for (const observation of entry.observations) {
      if (observed.has(observation.observationId)) fail();
      observed.add(observation.observationId);
    }
    for (const requestId of entry.requestIds) if (!state.requests.some(request => request.id === requestId)) fail();
  }
  if (state.sessions.some(session => state.requests.some(request => request.id === session.id))) fail();
  const now = state.journal?.worldTime ?? 0; const pairs = new Set();
  for (const session of state.sessions) {
    if (session.updatedAt > now || (receipts.has(session.eventId) && receipts.get(session.eventId).occurredAt !== session.createdAt)) fail();
    const active = state.requests.filter(request => request.sessionId === session.id && live(request));
    if (session.status === 'open') {
      const pair = JSON.stringify(session.participantIds);
      if (!active.length || session.expiresAt <= now || !receipts.has(session.eventId) || pairs.has(pair)
        || active.some(request => request.expiresAt > session.expiresAt)) fail();
      pairs.add(pair);
    } else if (active.length) fail();
  }
  for (const request of state.requests) {
    if (receipts.has(request.eventId) && (!receipts.get(request.eventId).requestIds.includes(request.id)
      || !receipts.get(request.eventId).observations.some(row => row.ownerId === request.recipientId
        && row.observationId === request.sourceObservationId))) fail();
    if (request.updatedAt > now || (receipts.has(request.eventId) && receipts.get(request.eventId).occurredAt !== request.createdAt)
      || (live(request) && (request.expiresAt <= now || !receipts.has(request.eventId)))) fail();
    if (request.sessionId !== undefined) {
      const session = state.sessions.find(session => session.id === request.sessionId);
      if (!session || !session.participantIds.includes(request.senderId) || !session.participantIds.includes(request.recipientId)) fail();
    }
  }
  for (const actorId of stateActors(state)) {
    if (state.sessions.filter(session => session.status === 'open' && session.participantIds.includes(actorId)).length > LIMITS.sessionsPerActor
      || state.requests.filter(request => request.recipientId === actorId && live(request)).length > LIMITS.requestsPerActor) fail();
  }
  if (Buffer.byteLength(JSON.stringify(state), 'utf8') > LIMITS.bytes) fail();
  return state;
}

/** A host-only cache. No prose classification, world access or physical effect. */
export function initialConversationState() {
  return freeze({ version: CONVERSATION_STATE_VERSION, sessions: [], requests: [] });
}
export function validateConversationState(value) {
  return safely(() => freeze(parseState(value)));
}
function requestChange(changes, kind, request, reason) {
  changes.push({ kind, id: request.id, eventId: request.eventId, senderId: request.senderId, recipientId: request.recipientId,
    status: request.status, ...(reason ? { reason } : {}) });
}
function closeEmptySessions(state, now, changes) {
  for (const session of state.sessions) if (session.status === 'open'
    && !state.requests.some(request => request.sessionId === session.id && live(request))) {
    session.status = session.expiresAt <= now ? 'expired' : 'closed'; session.updatedAt = now;
    changes.push({ kind: 'session_closed', id: session.id, status: session.status });
  }
}
function expire(state, now, changes) {
  for (const request of state.requests) if (live(request) && request.expiresAt <= now) {
    request.status = 'expired'; request.updatedAt = now; requestChange(changes, 'request_expired', request, 'ttl');
  }
  closeEmptySessions(state, now, changes);
}
function evictRequest(state, index, changes) {
  const [request] = state.requests.splice(index, 1);
  for (const entry of state.journal?.entries ?? []) entry.requestIds = entry.requestIds.filter(id => id !== request.id);
  requestChange(changes, 'request_evicted', request, 'terminal_capacity');
}
function makeRequestRoom(state, changes) {
  if (state.requests.length < LIMITS.requests) return true;
  const index = state.requests.findIndex(request => !live(request));
  if (index < 0) return false;
  evictRequest(state, index, changes); return true;
}
function makeSessionRoom(state, changes) {
  if (state.sessions.length < LIMITS.sessions) return;
  const index = state.sessions.findIndex(session => session.status !== 'open');
  if (index < 0) fail();
  const [session] = state.sessions.splice(index, 1);
  for (let index = state.requests.length - 1; index >= 0; index--) if (state.requests[index].sessionId === session.id) {
    if (live(state.requests[index])) fail();
    evictRequest(state, index, changes);
  }
  changes.push({ kind: 'session_evicted', id: session.id, status: session.status, reason: 'terminal_capacity' });
}
function addRequest(state, event, recipientId, now, changes, deferred) {
  const request = { eventId: event.id, senderId: event.speakerId, recipientId, kind: event.kind,
    sourceObservationId: event.observationIdsByActor[recipientId], status: 'pending', createdAt: event.occurredAt,
    updatedAt: now, reviewAt: now, expiresAt: event.occurredAt + LIMITS.ttl };
  request.id = requestId(request);
  const defer = reason => {
    deferred.push({ recipientId, reason });
    requestChange(changes, 'request_deferred', { ...request, status: 'deferred' }, reason);
  };
  if (request.expiresAt <= now) { request.status = 'expired'; requestChange(changes, 'request_expired', request, 'ttl'); return; }
  if (state.requests.filter(row => row.recipientId === recipientId && live(row)).length >= LIMITS.requestsPerActor) {
    defer('request_capacity'); return;
  }
  if (new Set([...stateActors(state), event.speakerId, recipientId]).size > LIMITS.actors) { defer('actor_capacity'); return; }
  if (!makeRequestRoom(state, changes)) { defer('request_history_capacity'); return; }
  const participantIds = [event.speakerId, recipientId].sort();
  let session = state.sessions.find(row => row.status === 'open' && row.participantIds.every((id, index) => id === participantIds[index]));
  if (!session && participantIds.some(actorId => state.sessions.filter(row => row.status === 'open'
    && row.participantIds.includes(actorId)).length >= LIMITS.sessionsPerActor)) {
    request.status = 'deferred'; request.reviewAt = Math.min(now + LIMITS.reviewDelay, request.expiresAt);
    defer('session_capacity');
  } else {
    if (!session) {
      makeSessionRoom(state, changes);
      session = { eventId: event.id, participantIds, status: 'open', createdAt: event.occurredAt, updatedAt: now, expiresAt: request.expiresAt };
      session.id = sessionId(session); state.sessions.push(session);
      changes.push({ kind: 'session_opened', id: session.id, participantIds: [...participantIds] });
    }
    // Batch persistence can deliver an earlier utterance after a later one;
    // each request retains its own story-clock TTL and the first session ID.
    session.updatedAt = now; session.expiresAt = Math.max(session.expiresAt, request.expiresAt);
    request.sessionId = session.id;
  }
  state.requests.push(request);
  if (request.status === 'pending') requestChange(changes, 'request_opened', request);
}
function appendReceipt(state, event, hash, now, changes, requestIds, deferred) {
  state.journal ??= { worldTime: now, entries: [] };
  const liveIds = new Set(state.requests.filter(live).map(row => row.id));
  const pinned = new Set([...state.requests.filter(live).map(row => row.eventId),
    ...state.sessions.filter(row => row.status === 'open').map(row => row.eventId)]);
  if (state.journal.entries.length >= LIMITS.journal) {
    const index = state.journal.entries.findIndex(entry => !pinned.has(entry.id) && !entry.requestIds.some(id => liveIds.has(id)));
    if (index < 0) fail();
    const [entry] = state.journal.entries.splice(index, 1);
    changes.push({ kind: 'event_evicted', eventId: entry.id, reason: 'terminal_capacity' });
  }
  state.journal.worldTime = now;
  state.journal.entries.push({ id: event.id, digest: hash, occurredAt: event.occurredAt, appliedAt: now,
    requestIds: [...new Set(requestIds)].filter(id => state.requests.some(request => request.id === id)).sort(),
    observations: event.audienceIds.map(ownerId => ({ ownerId, observationId: event.observationIdsByActor[ownerId] })),
    ...(deferred.length ? { deferred } : {}) });
}

/** Advance only by the host story clock, including a silent enactment batch.
 * No synthetic event ID is consumed and no deferred obligation is fulfilled.
 */
export function advanceConversationState(current, options) {
  return safely(() => {
    const state = parseState(current); const now = clock(record(options, ['worldTime']).worldTime);
    if (now < (state.journal?.worldTime ?? 0)) fail();
    const changes = [];
    expire(state, now, changes);
    state.journal ??= { worldTime: now, entries: [] };
    state.journal.worldTime = now;
    return freeze({ state: parseState(state), changes });
  });
}

/** The bounded digest journal pins live effects. Replay/conflict detection is
 * exact within that retained horizon; evicted terminal IDs are not tombstones.
 * Capacity deferrals remain explicit in each retained receipt, even without a
 * stored row; no other's live request is deleted. Acceptance is only a social status.
 */
export function applyConversationEvent(current, input, options) {
  return safely(() => {
    const state = parseState(current); const event = deliveredEvent(input);
    const now = clock(record(options, ['worldTime']).worldTime);
    if (event.occurredAt > now || now < (state.journal?.worldTime ?? 0)) fail();
    const hash = digest(event); const receipt = state.journal?.entries.find(entry => entry.id === event.id);
    if (receipt && receipt.digest !== hash) fail();
    const changes = [];
    expire(state, now, changes);
    if (receipt) {
      state.journal.worldTime = now;
      return freeze({ state: parseState(state), changes });
    }
    if (state.requests.some(request => request.eventId === event.id) || state.sessions.some(session => session.eventId === event.id)) fail();
    const affectedRequestIds = []; const deferred = [];
    const observedIds = new Set((state.journal?.entries ?? []).flatMap(entry => entry.observations.map(row => row.observationId)));
    for (const observationId of Object.values(event.observationIdsByActor)) {
      if (observedIds.has(observationId) || state.requests.some(request => request.sourceObservationId === observationId)) fail();
    }
    if (event.replyToObservationId !== undefined) {
      const request = state.requests.find(row => row.recipientId === event.speakerId && row.sourceObservationId === event.replyToObservationId);
      if (!request || !live(request) || event.occurredAt < request.createdAt
        || !event.addresseeIds.includes(request.senderId) || !event.audienceIds.includes(request.senderId)) fail();
      if (RESPONSES.includes(event.kind)) {
        const status = RESPONSE_STATUS[event.kind];
        if (request.status !== status) {
          request.status = status; request.updatedAt = now;
          if (status === 'accepted') request.reviewAt = Math.min(now + LIMITS.reviewDelay, request.expiresAt);
          affectedRequestIds.push(request.id);
          requestChange(changes, 'request_updated', request);
        }
        closeEmptySessions(state, now, changes);
      }
    }
    if (['ask', 'invite'].includes(event.kind)) for (const recipientId of event.addresseeIds) {
      if (event.audienceIds.includes(recipientId)) addRequest(state, event, recipientId, now, changes, deferred);
    }
    affectedRequestIds.push(...state.requests.filter(request => request.eventId === event.id).map(request => request.id));
    appendReceipt(state, event, hash, now, changes, affectedRequestIds, deferred);
    return freeze({ state: parseState(state), changes });
  });
}

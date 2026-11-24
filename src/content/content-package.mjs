import { createHash } from 'node:crypto';
import { constants, closeSync, fstatSync, lstatSync, openSync, readSync, realpathSync } from 'node:fs';
import { isAbsolute, join, parse, posix, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TextDecoder } from 'node:util';

// This compiler reads only explicitly declared, local files. It neither imports
// JavaScript from content nor interprets card macros, scripts, HTML or URLs.
export const CONTENT_LIMITS = Object.freeze({
  importDepth: 12, jsonDepth: 64, files: 128, nodes: 100000,
  jsonFileBytes: 8 * 1024 * 1024, assetFileBytes: 16 * 1024 * 1024,
  totalBytes: 128 * 1024 * 1024, diagnostics: 128,
});
export const CONTENT_SCHEMA = Object.freeze({
  id: 'manosaba.content-package', version: 1,
  imports: 'sole-$import-with-optional-RFC6901-pointer; relative-to-author; no-merging',
  identity: 'sha256-of-schema-rules-and-sorted-exact-declared-source-byte-hashes',
  visibility: 'allowlisted-PUBLIC-projection; HOST_ONLY-archive; owner-seeds-not-public',
  historicalAssets: 'character-file-and-derivation-sourceFile-are-attribution-only',
});
export const CONTENT_VALIDATION_RULES = Object.freeze([
  'inert-json@1', 'bounded-local-imports@1', 'no-links-or-root-escape@1',
  'scenario-shapes@1', 'unique-identities-and-references@1', 'explicit-visibility@1',
  'local-runtime-asset-bytes@1', 'card-provenance-reference-only@1',
]);
const BUILTIN_RULE_IDS = Object.freeze(['agent-prison-rules@1', 'card-prison-world@1', 'public-witchbook-rules@1']);
const ROOT = fileURLToPath(new URL('../../', import.meta.url));
// Literal URLs also keep these declared data dependencies visible to the
// existing positive-list release collector; no directory is auto-collected.
const BUILTIN_DOCUMENTS = Object.freeze({
  scenario: new URL('../../data/agent-scenario.json', import.meta.url),
  world: new URL('../../data/prison-world.json', import.meta.url),
  publicRules: new URL('../../data/witchbook-rules.json', import.meta.url),
  avatars: new URL('../../public/assets/characters/manifest.json', import.meta.url),
});
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const escapePointer = value => String(value).replace(/~/gu, '~0').replace(/\//gu, '~1');
const childPointer = (pointer, key) => `${pointer}/${escapePointer(key)}`;
const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const unsafeKeys = new Set(['__proto__', 'prototype', 'constructor']);
const identifier = /^[A-Za-z0-9][A-Za-z0-9_.@:/-]{0,127}$/u;
const digest = /^[a-f0-9]{64}$/u;
const privateSegment = /^(?:\.git|\.cursor|\.manosaba|node_modules|archives|runtime|profiles?|saves?|logs|diagnostics|AppData|LocalAppData|UserData)$/iu;
const privateFile = /^(?:\.env(?:\..*)?|llm-settings\.json|runtime-options\.json|credentials[^/]*|secrets?\.(?:json|txt)|.*\.(?:sqlite(?:-wal|-shm)?|db|jsonl|log|bak))$/iu;
const compare = (left, right) => left < right ? -1 : left > right ? 1 : 0;
const inside = (root, target) => {
  const path = relative(root, target);
  return path === '' || (!isAbsolute(path) && path !== '..' && !path.startsWith(`..${sep}`));
};
function freeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}
function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (plain(value)) return `{${Object.keys(value).sort(compare).map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}
class StopCompilation extends Error {}

// JSON.parse is deliberately the syntax authority, but silently accepts repeated
// object keys. A second bounded token walk rejects those ambiguous declarations
// (including escaped spellings) at the original author's JSON pointer.
function inspectJsonKeys(text, file, stop) {
  let cursor = 0;
  const whitespace = () => { while (/\s/u.test(text[cursor] ?? '') && cursor < text.length) cursor++; };
  const string = () => {
    const start = cursor++;
    while (cursor < text.length) {
      if (text[cursor] === '\\') { cursor += 2; continue; }
      if (text[cursor++] === '"') break;
    }
    return JSON.parse(text.slice(start, cursor));
  };
  const value = (pointer, depth) => {
    if (depth > CONTENT_LIMITS.jsonDepth) stop('CONTENT_JSON_DEPTH', { file, pointer });
    whitespace();
    if (text[cursor] === '"') { string(); return; }
    if (text[cursor] === '{') {
      cursor++; whitespace(); const keys = new Set();
      if (text[cursor] === '}') { cursor++; return; }
      while (cursor < text.length) {
        whitespace(); const key = string(); const next = childPointer(pointer, key);
        if (keys.has(key)) stop('CONTENT_DUPLICATE_KEY', { file, pointer: next });
        keys.add(key); whitespace(); cursor++;
        value(next, depth + 1); whitespace();
        if (text[cursor++] === '}') return;
      }
    } else if (text[cursor] === '[') {
      cursor++; whitespace(); let index = 0;
      if (text[cursor] === ']') { cursor++; return; }
      while (cursor < text.length) {
        value(childPointer(pointer, index++), depth + 1); whitespace();
        if (text[cursor++] === ']') return;
      }
    } else while (cursor < text.length && !/[\s,}\]]/u.test(text[cursor])) cursor++;
  };
  value('', 0);
}

class Reader {
  constructor(root, diagnostics) {
    this.root = root;
    this.diagnostics = diagnostics;
    this.files = new Map();
    this.parsed = new Map();
    this.totalBytes = 0;
    this.nodes = 0;
    this.sourceMap = Object.create(null);
  }
  stop(code, source) {
    if (this.diagnostics.length < CONTENT_LIMITS.diagnostics) this.diagnostics.push({ code, source });
    throw new StopCompilation();
  }
  prepare() {
    // Refuse a linked root or linked ancestor too, rather than silently accepting
    // a realpath which might lead into a user's profile outside the chosen tree.
    let current = parse(this.root).root;
    try {
      for (const part of this.root.slice(current.length).split(sep).filter(Boolean)) {
        current = join(current, part);
        const stat = lstatSync(current);
        if (stat.isSymbolicLink()) this.stop('CONTENT_SYMLINK', { file: '', pointer: '' });
        if (!stat.isDirectory()) this.stop('CONTENT_ROOT_INVALID', { file: '', pointer: '' });
      }
      this.realRoot = realpathSync(this.root);
    } catch (error) {
      if (error instanceof StopCompilation) throw error;
      this.stop('CONTENT_ROOT_INVALID', { file: '', pointer: '' });
    }
  }
  path(reference, from, source, extension = '.json') {
    if (typeof reference !== 'string' || !reference || reference.length > 1024
      || /[\\:\u0000-\u001f\u007f?#%]/u.test(reference) || reference.startsWith('/')
      || reference.split('/').some(part => !part || (part !== '.' && part !== '..'
        && (/[. ]$/u.test(part) || /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/iu.test(part))))) {
      this.stop('CONTENT_PATH_INVALID', source);
    }
    const path = posix.normalize(posix.join(from ? posix.dirname(from) : '.', reference));
    if (path === '..' || path.startsWith('../') || path.startsWith('/') || path === '.') this.stop('CONTENT_ROOT_ESCAPE', source);
    if (path.split('/').some(part => privateSegment.test(part) || privateFile.test(part))) this.stop('CONTENT_PRIVATE_PATH', source);
    if (extension && !path.endsWith(extension)) this.stop('CONTENT_FILE_TYPE', source);
    return path;
  }
  bytes(path, source, role = 'json') {
    const cached = this.files.get(path);
    if (cached) {
      cached.roles.add(role);
      return cached.bytes;
    }
    if (this.files.size >= CONTENT_LIMITS.files) this.stop('CONTENT_FILE_LIMIT', source);
    // Historical manifests keep their original logical source path/hash. Only
    // this exact bundled card has a fixed physical relocation; arbitrary content
    // imports never receive a general path fallback or root escape exception.
    let physicalPath = path;
    if (path === 'docs/魔法少女的魔女审判.json') {
      try { lstatSync(join(this.root, ...path.split('/'))); }
      catch (error) { if (error.code === 'ENOENT') physicalPath = 'data/card-source.json'; }
    }
    const target = join(this.root, ...physicalPath.split('/'));
    let handle;
    try {
      let current = this.root;
      const parts = physicalPath.split('/');
      for (let index = 0; index < parts.length; index++) {
        current = join(current, parts[index]);
        const stat = lstatSync(current);
        if (stat.isSymbolicLink()) this.stop('CONTENT_SYMLINK', source);
        if ((index < parts.length - 1 && !stat.isDirectory()) || (index === parts.length - 1 && !stat.isFile())) this.stop('CONTENT_NOT_FILE', source);
      }
      if (!inside(this.realRoot, realpathSync(target))) this.stop('CONTENT_ROOT_ESCAPE', source);
      handle = openSync(target, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
      const before = fstatSync(handle);
      if (!before.isFile()) this.stop('CONTENT_NOT_FILE', source);
      const limit = role === 'asset' ? CONTENT_LIMITS.assetFileBytes : CONTENT_LIMITS.jsonFileBytes;
      if (before.size > limit || this.totalBytes + before.size > CONTENT_LIMITS.totalBytes) this.stop('CONTENT_BYTE_LIMIT', source);
      // Fixed allocation and one overflow byte keep a concurrently growing file
      // from turning a bounded read into readFile's unbounded allocation loop.
      const buffer = Buffer.alloc(before.size + 1);
      let length = 0;
      while (length < buffer.length) {
        const count = readSync(handle, buffer, length, buffer.length - length, null);
        if (!count) break;
        length += count;
      }
      const bytes = buffer.subarray(0, length);
      const after = fstatSync(handle);
      if (bytes.length !== before.size || before.size !== after.size || before.mtimeMs !== after.mtimeMs || before.ctimeMs !== after.ctimeMs) {
        this.stop('CONTENT_CHANGED_DURING_READ', source);
      }
      this.totalBytes += bytes.length;
      this.files.set(path, { bytes, sha256: sha256(bytes), roles: new Set([role]) });
      return bytes;
    } catch (error) {
      if (error instanceof StopCompilation) throw error;
      this.stop(error.code === 'ENOENT' ? 'CONTENT_FILE_MISSING' : 'CONTENT_FILE_UNREADABLE', source);
    } finally { if (handle !== undefined) closeSync(handle); }
  }
  json(path, source) {
    if (this.parsed.has(path)) return this.parsed.get(path);
    let value;
    try {
      const text = new TextDecoder('utf-8', { fatal: true }).decode(this.bytes(path, source)).replace(/^\uFEFF/u, '');
      value = JSON.parse(text);
      inspectJsonKeys(text, path, this.stop.bind(this));
    } catch (error) {
      if (error instanceof StopCompilation) throw error;
      // Native JSON errors can quote private lore; never forward their message.
      this.stop('CONTENT_JSON_INVALID', { file: path, pointer: '' });
    }
    let count = 0;
    const inspect = (node, pointer, depth) => {
      if (++count > CONTENT_LIMITS.nodes) this.stop('CONTENT_NODE_LIMIT', { file: path, pointer });
      if (depth > CONTENT_LIMITS.jsonDepth) this.stop('CONTENT_JSON_DEPTH', { file: path, pointer });
      if (typeof node === 'number' && !Number.isFinite(node)) this.stop('CONTENT_NUMBER_INVALID', { file: path, pointer });
      if (node && typeof node === 'object') for (const key of Object.keys(node)) {
        const next = childPointer(pointer, key);
        if (unsafeKeys.has(key)) this.stop('CONTENT_UNSAFE_KEY', { file: path, pointer: next });
        inspect(node[key], next, depth + 1);
      }
    };
    inspect(value, '', 0);
    this.parsed.set(path, value);
    return value;
  }
  select(value, pointer, source) {
    if (typeof pointer !== 'string' || (pointer !== '' && !pointer.startsWith('/')) || /~(?:[^01]|$)/u.test(pointer)) {
      this.stop('CONTENT_IMPORT_POINTER', source);
    }
    for (const encoded of pointer === '' ? [] : pointer.slice(1).split('/')) {
      const key = encoded.replace(/~1/gu, '/').replace(/~0/gu, '~');
      if (unsafeKeys.has(key) || !value || typeof value !== 'object' || !Object.hasOwn(value, key)
        || (Array.isArray(value) && !/^(?:0|[1-9]\d*)$/u.test(key))) this.stop('CONTENT_IMPORT_POINTER', source);
      value = value[key];
    }
    return value;
  }
  document(path, prefix = '', cause = { file: path, pointer: '' }) {
    return this.expand(this.json(path, cause), path, '', prefix, [], 0, 0);
  }
  expand(node, file, pointer, outputPointer, stack, importDepth, depth) {
    const source = { file, pointer };
    if (++this.nodes > CONTENT_LIMITS.nodes) this.stop('CONTENT_NODE_LIMIT', source);
    if (depth > CONTENT_LIMITS.jsonDepth) this.stop('CONTENT_JSON_DEPTH', source);
    if (plain(node) && Object.hasOwn(node, '$import')) {
      if (Object.keys(node).some(key => !['$import', 'pointer'].includes(key))) this.stop('CONTENT_IMPORT_SHAPE', source);
      const cause = { file, pointer: childPointer(pointer, '$import') };
      const target = this.path(node.$import, file, cause);
      if (importDepth >= CONTENT_LIMITS.importDepth) this.stop('CONTENT_IMPORT_DEPTH', cause);
      const selectedPointer = Object.hasOwn(node, 'pointer') ? node.pointer : '';
      const selected = this.select(this.json(target, cause), selectedPointer, { file, pointer: childPointer(pointer, 'pointer') });
      const key = `${target}#${selectedPointer}`;
      if (stack.includes(key) || (target === file && selectedPointer === pointer)) this.stop('CONTENT_IMPORT_CYCLE', cause);
      return this.expand(selected, target, selectedPointer, outputPointer, [...stack, `${file}#${pointer}`, key], importDepth + 1, depth);
    }
    this.sourceMap[outputPointer] = source;
    if (Array.isArray(node)) return node.map((value, index) => this.expand(value, file, childPointer(pointer, index), childPointer(outputPointer, index), stack, importDepth, depth + 1));
    if (plain(node)) return Object.fromEntries(Object.entries(node).map(([key, value]) => [key,
      this.expand(value, file, childPointer(pointer, key), childPointer(outputPointer, key), stack, importDepth, depth + 1)]));
    return node;
  }
  sources() {
    return [...this.files.entries()].sort(([left], [right]) => compare(left, right)).map(([file, record]) => ({
      file, bytes: record.bytes.length, sha256: record.sha256, roles: [...record.roles].sort(compare),
    }));
  }
}

class Validator {
  constructor(reader, diagnostics, review) {
    this.reader = reader; this.diagnostics = diagnostics; this.review = review;
  }
  source(pointer) {
    if (this.reader.sourceMap[pointer]) return this.reader.sourceMap[pointer];
    let parent = pointer;
    while (parent && !this.reader.sourceMap[parent]) parent = parent.slice(0, parent.lastIndexOf('/'));
    const source = this.reader.sourceMap[parent] ?? { file: '', pointer: '' };
    return { file: source.file, pointer: source.pointer + pointer.slice(parent.length) };
  }
  error(code, pointer, relatedPointer) {
    if (this.diagnostics.length >= CONTENT_LIMITS.diagnostics) throw new StopCompilation();
    this.diagnostics.push({ code, source: this.source(pointer), ...(relatedPointer ? { relatedSource: this.source(relatedPointer) } : {}) });
    return false;
  }
  reviewAt(status, code, pointer) { this.review.push({ status, code, source: this.source(pointer) }); }
  object(value, pointer, allowed, required = allowed) {
    if (!plain(value)) return this.error('CONTENT_OBJECT_REQUIRED', pointer);
    for (const key of required) if (!Object.hasOwn(value, key)) this.error('CONTENT_FIELD_REQUIRED', childPointer(pointer, key));
    for (const key of Object.keys(value)) if (!allowed.includes(key)) this.error(key === 'visibility' ? 'CONTENT_VISIBILITY_INVALID' : 'CONTENT_FIELD_UNKNOWN', childPointer(pointer, key));
    return true;
  }
  array(value, pointer, min = 0) {
    return Array.isArray(value) && value.length >= min && value.length <= 4096 || this.error('CONTENT_ARRAY_REQUIRED', pointer);
  }
  text(value, pointer) {
    return typeof value === 'string' && value.trim().length > 0 && value.length <= 32768 || this.error('CONTENT_TEXT_REQUIRED', pointer);
  }
  id(value, pointer) {
    return typeof value === 'string' && identifier.test(value) && !unsafeKeys.has(value) || this.error('CONTENT_ID_INVALID', pointer);
  }
  integer(value, pointer, minimum = 0) { return Number.isSafeInteger(value) && value >= minimum || this.error('CONTENT_INTEGER_REQUIRED', pointer); }
  boolean(value, pointer) { return typeof value === 'boolean' || this.error('CONTENT_BOOLEAN_REQUIRED', pointer); }
  hash(value, pointer) { return typeof value === 'string' && digest.test(value) || this.error('CONTENT_HASH_INVALID', pointer); }
  visibility(value, expected, pointer) { return value === expected || this.error('CONTENT_VISIBILITY_INVALID', pointer); }
  list(value, pointer, { min = 0, ids = false, unique = false, references, code = 'CONTENT_REFERENCE_UNKNOWN' } = {}) {
    if (!this.array(value, pointer, min)) return;
    const seen = new Map();
    value.forEach((entry, index) => {
      const item = childPointer(pointer, index);
      if (!(ids ? this.id(entry, item) : this.text(entry, item))) return;
      if (unique && seen.has(entry)) this.error('CONTENT_DUPLICATE_REFERENCE', item, seen.get(entry));
      seen.set(entry, item);
      if (references && !references.has(entry)) this.error(code, item);
    });
  }
  records(value, pointer, min = 0) {
    const ids = new Map();
    if (this.array(value, pointer, min)) value.forEach((entry, index) => {
      const at = `${pointer}/${index}/id`;
      if (plain(entry) && this.id(entry.id, at)) {
        if (ids.has(entry.id)) this.error('CONTENT_DUPLICATE_ID', at, ids.get(entry.id));
        else ids.set(entry.id, at);
      }
    });
    return ids;
  }
  reference(value, pointer, references, code) {
    if (this.id(value, pointer) && !references.has(value)) this.error(code, pointer);
  }
  optionalVisibility(value, expected, pointer) {
    if (Object.hasOwn(value, 'visibility')) this.visibility(value.visibility, expected, `${pointer}/visibility`);
  }
}

function validateScenario(v, scenario) {
  const p = '/scenario';
  if (!v.object(scenario, p, ['schemaVersion', 'scenarioRef', 'notice', 'provenance', 'opening', 'locations', 'actors', 'host'],
    ['schemaVersion', 'scenarioRef', 'opening', 'locations', 'actors', 'host'])) return { actors: new Map(), locations: new Map() };
  if (scenario.schemaVersion !== 1) v.error('CONTENT_SCHEMA_UNSUPPORTED', `${p}/schemaVersion`);
  v.id(scenario.scenarioRef, `${p}/scenarioRef`);
  if (scenario.notice !== undefined) v.text(scenario.notice, `${p}/notice`);
  const actors = v.records(scenario.actors, `${p}/actors`, 1);
  const locations = v.records(scenario.locations, `${p}/locations`, 1);
  if (Array.isArray(scenario.locations)) scenario.locations.forEach((location, index) => {
    const at = `${p}/locations/${index}`;
    if (!v.object(location, at, ['id', 'name', 'description', 'exitIds', 'sourceEntryIds', 'adaptation', 'visibility'], ['id', 'name', 'description', 'exitIds'])) return;
    v.text(location.name, `${at}/name`); v.text(location.description, `${at}/description`);
    v.optionalVisibility(location, 'PUBLIC', at);
    v.list(location.exitIds, `${at}/exitIds`, { ids: true, unique: true, references: locations, code: 'CONTENT_LOCATION_REFERENCE' });
    if (Array.isArray(location.exitIds)) location.exitIds.forEach((exit, exitIndex) => {
      const target = Array.isArray(scenario.locations) && scenario.locations.find(row => row?.id === exit);
      if (exit === location.id || (target && (!Array.isArray(target.exitIds) || !target.exitIds.includes(location.id)))) v.error('CONTENT_EXIT_INVALID', `${at}/exitIds/${exitIndex}`);
    });
    if (location.sourceEntryIds !== undefined && v.array(location.sourceEntryIds, `${at}/sourceEntryIds`)) location.sourceEntryIds.forEach((id, i) => v.integer(id, `${at}/sourceEntryIds/${i}`));
    if (location.adaptation !== undefined) v.text(location.adaptation, `${at}/adaptation`);
  });
  if (Array.isArray(scenario.actors)) scenario.actors.forEach((actor, index) => {
    const at = `${p}/actors/${index}`;
    if (!v.object(actor, at, ['id', 'name', 'persona', 'initialKnowledge', 'appearance', 'locationId', 'communication', 'visibility'],
      ['id', 'name', 'persona', 'initialKnowledge', 'appearance', 'locationId', 'communication'])) return;
    v.text(actor.name, `${at}/name`); v.text(actor.appearance, `${at}/appearance`);
    v.optionalVisibility(actor, 'OWNER', at);
    v.reference(actor.locationId, `${at}/locationId`, locations, 'CONTENT_LOCATION_REFERENCE');
    if (!['speech', 'writing'].includes(actor.communication)) v.error('CONTENT_COMMUNICATION_INVALID', `${at}/communication`);
    v.list(actor.initialKnowledge, `${at}/initialKnowledge`, { min: 1 });
    if (v.object(actor.persona, `${at}/persona`, ['name', 'voice', 'values', 'boundaries'])) {
      v.text(actor.persona.name, `${at}/persona/name`); v.text(actor.persona.voice, `${at}/persona/voice`);
      if (actor.persona.name !== actor.name) v.error('CONTENT_ACTOR_NAME_MISMATCH', `${at}/persona/name`);
      v.list(actor.persona.values, `${at}/persona/values`, { min: 1 });
      v.list(actor.persona.boundaries, `${at}/persona/boundaries`, { min: 1 });
    }
  });
  if (v.array(scenario.opening, `${p}/opening`, 1)) scenario.opening.forEach((entry, index) => {
    const at = `${p}/opening/${index}`;
    if (!v.object(entry, at, ['speakerId', 'text', 'delivery', 'visibility'], ['speakerId', 'text', 'delivery'])) return;
    v.text(entry.text, `${at}/text`); v.optionalVisibility(entry, 'PUBLIC', at);
    if (entry.speakerId !== null) v.reference(entry.speakerId, `${at}/speakerId`, actors, 'CONTENT_ACTOR_REFERENCE');
    if (!['narration', 'speech', 'writing'].includes(entry.delivery) || (entry.speakerId === null) !== (entry.delivery === 'narration')) v.error('CONTENT_DELIVERY_INVALID', `${at}/delivery`);
  });
  const host = scenario.host;
  if (v.object(host, `${p}/host`, ['visibility', 'sourceEntryIds', 'scope', 'worldPolicies', 'housing', 'initialState', 'quarantine'], ['visibility', 'scope', 'housing', 'initialState', 'quarantine'])) {
    v.visibility(host.visibility, 'HOST_ONLY', `${p}/host/visibility`);
    if (v.object(host.scope, `${p}/host/scope`, ['loop', 'controlledActorId', 'supportedActions', 'unimplemented', 'policy'])) {
      v.integer(host.scope.loop, `${p}/host/scope/loop`, 1);
      v.reference(host.scope.controlledActorId, `${p}/host/scope/controlledActorId`, actors, 'CONTENT_ACTOR_REFERENCE');
      v.list(host.scope.supportedActions, `${p}/host/scope/supportedActions`, { min: 1, ids: true, unique: true });
      v.list(host.scope.unimplemented, `${p}/host/scope/unimplemented`, { ids: true, unique: true });
      v.text(host.scope.policy, `${p}/host/scope/policy`);
    }
    const housed = new Map(); const rooms = new Map();
    if (v.array(host.housing, `${p}/host/housing`)) host.housing.forEach((room, index) => {
      const at = `${p}/host/housing/${index}`;
      if (!v.object(room, at, ['locationId', 'actorIds'])) return;
      v.reference(room.locationId, `${at}/locationId`, locations, 'CONTENT_LOCATION_REFERENCE');
      if (rooms.has(room.locationId)) v.error('CONTENT_DUPLICATE_REFERENCE', `${at}/locationId`, rooms.get(room.locationId));
      rooms.set(room.locationId, `${at}/locationId`);
      v.list(room.actorIds, `${at}/actorIds`, { min: 1, ids: true, unique: true, references: actors, code: 'CONTENT_ACTOR_REFERENCE' });
      if (Array.isArray(room.actorIds)) room.actorIds.forEach((id, i) => {
        const pointer = `${at}/actorIds/${i}`;
        if (housed.has(id)) v.error('CONTENT_DUPLICATE_REFERENCE', pointer, housed.get(id));
        housed.set(id, pointer);
        if (Array.isArray(scenario.actors) && scenario.actors.find(actor => actor?.id === id)?.locationId !== room.locationId) v.error('CONTENT_HOUSING_MISMATCH', pointer);
      });
    });
    if (v.object(host.initialState, `${p}/host/initialState`, ['phase', 'broadcastOccurred', 'introductionsOccurred', 'caseOccurred', 'allActorsAlive', 'closedLocationIds', 'positionAdaptations'],
      ['phase', 'broadcastOccurred', 'introductionsOccurred', 'caseOccurred', 'allActorsAlive', 'closedLocationIds'])) {
      v.id(host.initialState.phase, `${p}/host/initialState/phase`);
      for (const key of ['broadcastOccurred', 'introductionsOccurred', 'caseOccurred', 'allActorsAlive']) v.boolean(host.initialState[key], `${p}/host/initialState/${key}`);
      v.list(host.initialState.closedLocationIds, `${p}/host/initialState/closedLocationIds`, { ids: true, unique: true, references: locations, code: 'CONTENT_LOCATION_REFERENCE' });
      if (host.initialState.positionAdaptations !== undefined) v.list(host.initialState.positionAdaptations, `${p}/host/initialState/positionAdaptations`);
    }
    if (v.object(host.quarantine, `${p}/host/quarantine`, ['visibility', 'contentImported', 'execution', 'policy', 'entryGroups', 'mixedEntrySections', 'discardedSourcePointers', 'sanitization'], ['visibility', 'contentImported', 'execution'])) {
      v.visibility(host.quarantine.visibility, 'HOST_ONLY', `${p}/host/quarantine/visibility`);
      if (host.quarantine.contentImported !== false || host.quarantine.execution !== 'disabled') v.error('CONTENT_QUARANTINE_EXECUTION', `${p}/host/quarantine`);
      const quarantine = host.quarantine; const at = `${p}/host/quarantine`;
      for (const key of ['policy', 'sanitization']) if (quarantine[key] !== undefined) v.text(quarantine[key], `${at}/${key}`);
      if (quarantine.discardedSourcePointers !== undefined) v.list(quarantine.discardedSourcePointers, `${at}/discardedSourcePointers`, { unique: true });
      if (quarantine.entryGroups !== undefined && v.array(quarantine.entryGroups, `${at}/entryGroups`)) quarantine.entryGroups.forEach((group, index) => {
        const pointer = `${at}/entryGroups/${index}`;
        if (!v.object(group, pointer, ['reason', 'entryRefs'])) return;
        v.text(group.reason, `${pointer}/reason`);
        if (v.array(group.entryRefs, `${pointer}/entryRefs`)) group.entryRefs.forEach((reference, i) => {
          if (!v.object(reference, `${pointer}/entryRefs/${i}`, ['entryId', 'pointer'])) return;
          v.integer(reference.entryId, `${pointer}/entryRefs/${i}/entryId`);
          v.text(reference.pointer, `${pointer}/entryRefs/${i}/pointer`);
        });
      });
      if (quarantine.mixedEntrySections !== undefined && v.array(quarantine.mixedEntrySections, `${at}/mixedEntrySections`)) quarantine.mixedEntrySections.forEach((group, index) => {
        const pointer = `${at}/mixedEntrySections/${index}`;
        if (!v.object(group, pointer, ['entryId', 'entryIds', 'sections', 'reason'], ['sections', 'reason'])) return;
        if (Object.hasOwn(group, 'entryId') === Object.hasOwn(group, 'entryIds')) v.error('CONTENT_CARD_PROVENANCE', pointer);
        if (group.entryId !== undefined) v.integer(group.entryId, `${pointer}/entryId`);
        if (group.entryIds !== undefined && v.array(group.entryIds, `${pointer}/entryIds`)) group.entryIds.forEach((id, i) => v.integer(id, `${pointer}/entryIds/${i}`));
        v.list(group.sections, `${pointer}/sections`, { min: 1 }); v.text(group.reason, `${pointer}/reason`);
      });
    }
    if (host.sourceEntryIds !== undefined && v.array(host.sourceEntryIds, `${p}/host/sourceEntryIds`)) host.sourceEntryIds.forEach((id, i) => v.integer(id, `${p}/host/sourceEntryIds/${i}`));
    if (host.worldPolicies !== undefined) {
      v.records(host.worldPolicies, `${p}/host/worldPolicies`);
      if (Array.isArray(host.worldPolicies)) host.worldPolicies.forEach((policy, index) => {
        const at = `${p}/host/worldPolicies/${index}`;
        if (v.object(policy, at, ['id', 'sourceEntryIds', 'summary'])) {
          v.text(policy.summary, `${at}/summary`);
          if (v.array(policy.sourceEntryIds, `${at}/sourceEntryIds`)) policy.sourceEntryIds.forEach((id, i) => v.integer(id, `${at}/sourceEntryIds/${i}`));
        }
      });
    }
  }
  return { actors, locations };
}

function validateWorld(v, world, publicRules, identities) {
  const p = '/world';
  if (!v.object(world, p, ['version', 'reviewedOn', 'sourceCard', 'sources', 'rules', 'facts', 'conflicts', 'implemented', 'unimplemented'],
    ['version', 'sources', 'rules', 'facts', 'conflicts', 'implemented', 'unimplemented'])) return;
  if (world.version !== 1) v.error('CONTENT_SCHEMA_UNSUPPORTED', `${p}/version`);
  if (world.reviewedOn !== undefined) v.text(world.reviewedOn, `${p}/reviewedOn`);
  const sources = v.records(world.sources, `${p}/sources`);
  if (Array.isArray(world.sources)) world.sources.forEach((source, index) => {
    const at = `${p}/sources/${index}`;
    if (!v.object(source, at, ['id', 'kind', 'path', 'sha256', 'url', 'pageUpdatedOn', 'sections'], ['id', 'kind'])) return;
    v.id(source.kind, `${at}/kind`);
    if (source.url !== undefined) { v.text(source.url, `${at}/url`); v.reviewAt('ignored', 'REMOTE_REFERENCE_NOT_FETCHED', `${at}/url`); }
    if (source.path !== undefined) { v.text(source.path, `${at}/path`); v.hash(source.sha256, `${at}/sha256`); }
    if (source.kind === 'user-supplied-card' && source.path === undefined) v.error('CONTENT_FIELD_REQUIRED', `${at}/path`);
    if (source.sections !== undefined) v.list(source.sections, `${at}/sections`);
    if (source.pageUpdatedOn !== undefined) v.text(source.pageUpdatedOn, `${at}/pageUpdatedOn`);
  });
  const roomIds = new Map(identities.locations);
  for (const [id, pointer] of identities.locations) {
    const alias = id.toLowerCase().replace(/_/gu, '');
    if (roomIds.has(alias) && roomIds.get(alias) !== pointer) v.error('CONTENT_LOCATION_ALIAS_AMBIGUOUS', pointer, roomIds.get(alias));
    else roomIds.set(alias, pointer);
  }
  // PLAYER_CELL is a stable, host-created eighth-cell extension, not an exit
  // created by lore text. No other undeclared room alias is accepted.
  roomIds.set('playercell', ''); roomIds.set('PLAYER_CELL', '');
  const rules = v.records(world.rules, `${p}/rules`);
  v.records(world.facts, `${p}/facts`); v.records(world.conflicts, `${p}/conflicts`);
  for (const kind of ['rules', 'facts', 'conflicts']) if (Array.isArray(world[kind])) world[kind].forEach((entry, index) => {
    const at = `${p}/${kind}/${index}`;
    const keys = kind === 'rules' ? ['id', 'name', 'classification', 'sources', 'cardEntryIndices', 'implementation', 'paragraphs', 'visibility']
      : kind === 'facts' ? ['id', 'access', 'rooms', 'owners', 'classification', 'sources', 'cardEntryIndices', 'statements', 'visibility']
        : ['id', 'sources', 'resolution'];
    const required = kind === 'rules' ? ['id', 'name', 'classification', 'sources', 'cardEntryIndices', 'implementation', 'paragraphs']
      : kind === 'facts' ? ['id', 'access', 'classification', 'sources', 'cardEntryIndices', 'statements'] : keys;
    if (!v.object(entry, at, keys, required)) return;
    v.list(entry.sources, `${at}/sources`, { min: 1, ids: true, unique: true, references: sources, code: 'CONTENT_SOURCE_REFERENCE' });
    if (kind === 'conflicts') { v.text(entry.resolution, `${at}/resolution`); return; }
    v.id(entry.classification, `${at}/classification`);
    if (v.array(entry.cardEntryIndices, `${at}/cardEntryIndices`)) entry.cardEntryIndices.forEach((id, i) => v.integer(id, `${at}/cardEntryIndices/${i}`));
    if (kind === 'rules') {
      v.text(entry.name, `${at}/name`); v.text(entry.implementation, `${at}/implementation`);
      v.list(entry.paragraphs, `${at}/paragraphs`, { min: 1 }); v.optionalVisibility(entry, 'HOST_ONLY', at);
    } else {
      if (!['surface', 'owner', 'host'].includes(entry.access)) v.error('CONTENT_VISIBILITY_INVALID', `${at}/access`);
      v.optionalVisibility(entry, { surface: 'PUBLIC', owner: 'OWNER', host: 'HOST_ONLY' }[entry.access], at);
      v.list(entry.statements, `${at}/statements`, { min: 1 });
      if (entry.access === 'owner') v.list(entry.owners, `${at}/owners`, { min: 1, ids: true, unique: true, references: identities.actors, code: 'CONTENT_ACTOR_REFERENCE' });
      else if (entry.owners !== undefined) v.error('CONTENT_VISIBILITY_INVALID', `${at}/owners`);
      if (entry.access === 'surface') v.list(entry.rooms, `${at}/rooms`, { min: 1, ids: true, unique: true, references: roomIds, code: 'CONTENT_LOCATION_REFERENCE' });
      else if (entry.rooms !== undefined) v.error('CONTENT_VISIBILITY_INVALID', `${at}/rooms`);
    }
  });
  v.list(world.implemented, `${p}/implemented`); v.list(world.unimplemented, `${p}/unimplemented`);
  v.records(publicRules, '/publicRules', 1);
  if (Array.isArray(publicRules)) publicRules.forEach((rule, index) => {
    const at = `/publicRules/${index}`;
    if (!v.object(rule, at, ['id', 'name', 'paragraphs', 'visibility'], ['id', 'name', 'paragraphs'])) return;
    v.reference(rule.id, `${at}/id`, rules, 'CONTENT_RULE_REFERENCE');
    v.text(rule.name, `${at}/name`); v.list(rule.paragraphs, `${at}/paragraphs`, { min: 1 });
    v.optionalVisibility(rule, 'PUBLIC', at);
  });
}

function validateAvatars(v, avatars, actors) {
  const p = '/avatars';
  if (!v.object(avatars, p, ['description', 'copyright', 'downloadedAt', 'characters', 'profileArtwork', 'missingIds'], ['characters', 'profileArtwork', 'missingIds'])) return [];
  for (const key of ['description', 'copyright', 'downloadedAt']) if (avatars[key] !== undefined) v.text(avatars[key], `${p}/${key}`);
  const seen = new Map(); const assets = [];
  const local = (file, at, expected, hashAt) => {
    if (!v.text(file, at)) return;
    const source = v.source(at);
    // A declaration lives with its containing JSON record. Importing just the
    // filename string cannot rebase an asset onto the helper string's folder.
    const declaration = v.source(at.slice(0, at.lastIndexOf('/')));
    const path = v.reader.path(file, declaration.file, source, null);
    if (!/\.(?:png|webp)$/u.test(path)) return v.error('CONTENT_ASSET_TYPE', at);
    if (!v.object(expected, hashAt, ['bytes', 'sha256'], [])) return;
    const bytesValid = v.integer(expected.bytes, `${hashAt}/bytes`, 1);
    const hashValid = v.hash(expected.sha256, `${hashAt}/sha256`);
    const bytes = v.reader.bytes(path, source, 'asset');
    const image = path.endsWith('.png') ? bytes.length >= 24 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      : bytes.length >= 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
    if (!image) v.error('CONTENT_ASSET_INVALID', at);
    if (bytesValid && bytes.length !== expected.bytes) v.error('CONTENT_ASSET_SIZE_MISMATCH', `${hashAt}/bytes`);
    if (hashValid && sha256(bytes) !== expected.sha256) v.error('CONTENT_ASSET_HASH_MISMATCH', `${hashAt}/sha256`);
    return { file: path, bytes: bytes.length, sha256: sha256(bytes) };
  };
  for (const kind of ['characters', 'profileArtwork']) if (v.array(avatars[kind], `${p}/${kind}`)) avatars[kind].forEach((entry, index) => {
    const at = `${p}/${kind}/${index}`;
    const keys = ['id', 'name', 'file', 'sourcePage', 'sourceUrl', 'sourceImageTitle', 'variant', 'width', 'height', 'bytes', 'sha256', 'portraitFile', 'thumbnailFile', 'derivation', 'visibility'];
    const required = ['id', 'name', 'file', 'width', 'height', 'bytes', 'sha256', ...(kind === 'characters' ? ['portraitFile', 'thumbnailFile', 'derivation'] : [])];
    if (!v.object(entry, at, keys, required)) return;
    v.reference(entry.id, `${at}/id`, actors, 'CONTENT_ACTOR_REFERENCE');
    if (seen.has(entry.id)) v.error('CONTENT_DUPLICATE_ID', `${at}/id`, seen.get(entry.id));
    seen.set(entry.id, `${at}/id`);
    v.text(entry.name, `${at}/name`); v.optionalVisibility(entry, 'PUBLIC', at);
    for (const key of ['width', 'height', 'bytes']) v.integer(entry[key], `${at}/${key}`, 1);
    v.hash(entry.sha256, `${at}/sha256`);
    for (const key of ['sourcePage', 'sourceUrl']) if (entry[key] !== undefined) { v.text(entry[key], `${at}/${key}`); v.reviewAt('ignored', 'REMOTE_REFERENCE_NOT_FETCHED', `${at}/${key}`); }
    if (kind === 'profileArtwork') {
      const asset = local(entry.file, `${at}/file`, { bytes: entry.bytes, sha256: entry.sha256 }, at);
      if (asset) assets.push({ actorId: entry.id, variant: 'profile', ...asset });
      return;
    }
    // Original source PNGs were intentionally archived. These two fields are
    // historical attribution, NOT live dependencies or a reason to scan archives.
    if (v.text(entry.file, `${at}/file`)) v.reader.path(entry.file, v.source(`${at}/file`).file, v.source(`${at}/file`), '.png');
    v.reviewAt('ignored', 'HISTORICAL_ASSET_REFERENCE', `${at}/file`);
    if (!v.object(entry.derivation, `${at}/derivation`, ['sourceFile', 'description', 'portrait', 'thumbnail'])) return;
    if (entry.derivation.sourceFile !== entry.file) v.error('CONTENT_ASSET_SOURCE_MISMATCH', `${at}/derivation/sourceFile`);
    v.text(entry.derivation.description, `${at}/derivation/description`);
    for (const [variant, key] of [['portrait', 'portraitFile'], ['thumbnail', 'thumbnailFile']]) {
      const metadata = entry.derivation[variant]; const metadataAt = `${at}/derivation/${variant}`;
      if (!plain(metadata)) { v.error('CONTENT_OBJECT_REQUIRED', metadataAt); continue; }
      for (const dimension of ['width', 'height']) v.integer(metadata[dimension], `${metadataAt}/${dimension}`, 1);
      const asset = local(entry[key], `${at}/${key}`, { bytes: metadata.bytes, sha256: metadata.sha256 }, metadataAt);
      if (asset) assets.push({ actorId: entry.id, variant, ...asset });
    }
  });
  v.list(avatars.missingIds, `${p}/missingIds`, { ids: true, unique: true, references: actors, code: 'CONTENT_ACTOR_REFERENCE' });
  if (Array.isArray(avatars.missingIds)) avatars.missingIds.forEach((id, index) => {
    if (seen.has(id)) v.error('CONTENT_DUPLICATE_REFERENCE', `${p}/missingIds/${index}`, seen.get(id));
    v.reviewAt('manual-review', 'AVATAR_EXPLICITLY_MISSING', `${p}/missingIds/${index}`);
  });
  for (const id of actors.keys()) if (!seen.has(id) && !(Array.isArray(avatars.missingIds) && avatars.missingIds.includes(id))) v.error('CONTENT_AVATAR_UNDECLARED', p);
  return assets.sort((a, b) => compare(`${a.actorId}/${a.variant}`, `${b.actorId}/${b.variant}`));
}

function validateCardProvenance(v, scenario, world) {
  const provenance = scenario?.provenance;
  const declarations = []; const sourceDocuments = [];
  if (provenance !== undefined) {
    if (!v.object(provenance, '/scenario/provenance', ['source', 'selection', 'entries', 'actorSources', 'openingSource', 'disabledEntryIds', 'decisions'])) return;
    const source = provenance.source;
    if (v.object(source, '/scenario/provenance/source', ['fileName', 'sha256', 'spec', 'specVersion', 'entryCount', 'enabledEntryCount', 'repositoryCopy', 'repositoryCopyMatches', 'hashEncoding'])) {
      v.hash(source.sha256, '/scenario/provenance/source/sha256');
      for (const key of ['fileName', 'spec', 'specVersion', 'hashEncoding', 'repositoryCopy']) v.text(source[key], `/scenario/provenance/source/${key}`);
      for (const key of ['entryCount', 'enabledEntryCount']) v.integer(source[key], `/scenario/provenance/source/${key}`);
      v.boolean(source.repositoryCopyMatches, '/scenario/provenance/source/repositoryCopyMatches');
      declarations.push({ path: source.repositoryCopy, pointer: '/scenario/provenance/source/repositoryCopy', hash: source.sha256, hashPointer: '/scenario/provenance/source/sha256' });
    }
  }
  if (world?.sourceCard !== undefined) declarations.push({ path: world.sourceCard, pointer: '/world/sourceCard' });
  if (Array.isArray(world?.sources)) world.sources.forEach((source, index) => {
    if (plain(source) && source.path !== undefined) {
      const target = source.kind === 'user-supplied-card' ? declarations : sourceDocuments;
      target.push({ path: source.path, pointer: `/world/sources/${index}/path`, hash: source.sha256, hashPointer: `/world/sources/${index}/sha256` });
    }
  });
  if (v.diagnostics.length) return;
  for (const declaration of sourceDocuments) {
    const at = v.source(declaration.pointer);
    const path = v.reader.path(declaration.path, '', at);
    v.reader.json(path, at);
    if (v.reader.files.get(path).sha256 !== declaration.hash) v.error('CONTENT_SOURCE_HASH_MISMATCH', declaration.hashPointer);
    v.reviewAt('adopted', 'LOCAL_SOURCE_REFERENCE_ONLY', declaration.pointer);
  }
  if (!declarations.length) {
    if (Array.isArray(world?.rules) && [...world.rules, ...(Array.isArray(world.facts) ? world.facts : [])].some(entry => entry?.cardEntryIndices?.length)) v.error('CONTENT_CARD_UNDECLARED', '/world');
    return;
  }
  const cards = new Map();
  for (const declaration of declarations) {
    const at = v.source(declaration.pointer);
    // These historical declarations are project-relative (unlike $import).
    const path = v.reader.path(declaration.path, '', at);
    const card = v.reader.json(path, at);
    const actualHash = v.reader.files.get(path).sha256;
    if (declaration.hash && actualHash !== declaration.hash) v.error('CONTENT_SOURCE_HASH_MISMATCH', declaration.hashPointer);
    cards.set(path, card);
  }
  if (cards.size !== 1) { v.error('CONTENT_CARD_SOURCE_MISMATCH', '/world/sourceCard'); return; }
  const [file, card] = [...cards][0];
  const entries = card?.data?.character_book?.entries;
  const rawError = (code, pointer) => {
    if (v.diagnostics.length < CONTENT_LIMITS.diagnostics) v.diagnostics.push({ code, source: { file, pointer } });
  };
  if (!Array.isArray(entries) || entries.length > 4096) { rawError('CONTENT_CARD_SHAPE', '/data/character_book/entries'); return; }
  if (typeof card.spec !== 'string' || typeof card.spec_version !== 'string') { rawError('CONTENT_CARD_SHAPE', ''); return; }
  const byId = new Map(); const latest = new Map();
  entries.forEach((entry, index) => {
    const at = `/data/character_book/entries/${index}`;
    if (!plain(entry) || !Number.isSafeInteger(entry.id) || entry.id < 0 || typeof entry.comment !== 'string'
      || typeof entry.content !== 'string' || typeof entry.enabled !== 'boolean') { rawError('CONTENT_CARD_SHAPE', at); return; }
    for (const key of ['constant', 'selective']) if (Object.hasOwn(entry, key) && typeof entry[key] !== 'boolean') rawError('CONTENT_CARD_SHAPE', `${at}/${key}`);
    if (byId.has(entry.id)) rawError('CONTENT_DUPLICATE_ID', `${at}/id`);
    byId.set(entry.id, index);
    if (entry.enabled) latest.set(entry.comment, index);
  });
  if (v.diagnostics.length) return;
  const adopted = new Set(); const ignored = new Set();
  if (provenance) {
    if (provenance.selection !== 'last-enabled-by-comment-in-array-order') v.error('CONTENT_CARD_SELECTION', '/scenario/provenance/selection');
    for (const [key, expected] of [['entryCount', entries.length], ['enabledEntryCount', entries.filter(entry => entry.enabled).length], ['spec', card.spec], ['specVersion', card.spec_version], ['repositoryCopyMatches', true]]) {
      if (provenance.source[key] !== expected) v.error('CONTENT_CARD_PROVENANCE', `/scenario/provenance/source/${key}`);
    }
    const selectedIds = new Set(); const actorSourceIds = new Map();
    if (v.array(provenance.entries, '/scenario/provenance/entries')) provenance.entries.forEach((reference, index) => {
      const at = `/scenario/provenance/entries/${index}`;
      if (!v.object(reference, at, ['entryId', 'entryIndex', 'pointer', 'label', 'enabled', 'contentSha256'])) return;
      const original = entries[reference.entryIndex];
      if (!original || reference.entryId !== original.id || reference.label !== original.comment || reference.enabled !== original.enabled
        || !original.enabled || latest.get(original.comment) !== reference.entryIndex
        || reference.pointer !== `/data/character_book/entries/${reference.entryIndex}` || reference.contentSha256 !== sha256(original.content)) v.error('CONTENT_CARD_PROVENANCE', at);
      if (selectedIds.has(reference.entryId)) v.error('CONTENT_DUPLICATE_ID', `${at}/entryId`);
      selectedIds.add(reference.entryId); adopted.add(reference.entryIndex);
    });
    if (v.array(provenance.actorSources, '/scenario/provenance/actorSources')) provenance.actorSources.forEach((reference, index) => {
      const at = `/scenario/provenance/actorSources/${index}`;
      if (!v.object(reference, at, ['actorId', 'entryId', 'sections', 'privateKnowledgeSections', 'situationSources'])) return;
      const actor = scenario.actors?.find(actor => actor?.id === reference.actorId);
      if (!actor) v.error('CONTENT_ACTOR_REFERENCE', `${at}/actorId`);
      if (actorSourceIds.has(reference.actorId)) v.error('CONTENT_DUPLICATE_REFERENCE', `${at}/actorId`, actorSourceIds.get(reference.actorId));
      actorSourceIds.set(reference.actorId, `${at}/actorId`);
      if (!selectedIds.has(reference.entryId) || (actor && entries[byId.get(reference.entryId)]?.comment !== actor.name)) v.error('CONTENT_CARD_PROVENANCE', `${at}/entryId`);
      v.list(reference.sections, `${at}/sections`); v.list(reference.privateKnowledgeSections, `${at}/privateKnowledgeSections`);
      if (v.array(reference.situationSources, `${at}/situationSources`)) reference.situationSources.forEach((source, i) => {
        const greeting = typeof source === 'string' && /^\/data\/alternate_greetings\/(\d+)$/u.exec(source);
        if (typeof source === 'number' ? !byId.has(source) : !greeting || typeof card.data.alternate_greetings?.[Number(greeting[1])] !== 'string') v.error('CONTENT_CARD_PROVENANCE', `${at}/situationSources/${i}`);
      });
    });
    for (const actor of scenario.actors) if (!actorSourceIds.has(actor.id)) v.error('CONTENT_ACTOR_SOURCE_REQUIRED', '/scenario/provenance/actorSources');
    const expectedDisabled = entries.filter(entry => !entry.enabled).map(entry => entry.id);
    if (canonical(provenance.disabledEntryIds) !== canonical(expectedDisabled)) v.error('CONTENT_CARD_PROVENANCE', '/scenario/provenance/disabledEntryIds');
    v.list(provenance.decisions, '/scenario/provenance/decisions');
    const opening = provenance.openingSource;
    if (v.object(opening, '/scenario/provenance/openingSource', ['pointer', 'contentSha256', 'adaptation'])) {
      const match = typeof opening.pointer === 'string' && /^\/data\/alternate_greetings\/(\d+)$/u.exec(opening.pointer);
      const text = match && card.data.alternate_greetings?.[Number(match[1])];
      if (typeof text !== 'string' || opening.contentSha256 !== sha256(text)) v.error('CONTENT_CARD_PROVENANCE', '/scenario/provenance/openingSource');
      v.text(opening.adaptation, '/scenario/provenance/openingSource/adaptation');
    }
  }
  const checkEntryId = (id, at) => { if (v.integer(id, at) && !byId.has(id)) v.error('CONTENT_CARD_REFERENCE', at); };
  const checkEntryIds = (ids, at) => {
    if (v.array(ids, at)) {
      const seen = new Map();
      ids.forEach((id, i) => {
        checkEntryId(id, `${at}/${i}`);
        if (seen.has(id)) v.error('CONTENT_DUPLICATE_REFERENCE', `${at}/${i}`, seen.get(id));
        seen.set(id, `${at}/${i}`);
      });
    }
  };
  for (const [rows, prefix] of [[scenario.locations, '/scenario/locations'], [scenario.host?.worldPolicies, '/scenario/host/worldPolicies']]) {
    if (Array.isArray(rows)) rows.forEach((row, index) => { if (row.sourceEntryIds !== undefined) checkEntryIds(row.sourceEntryIds, `${prefix}/${index}/sourceEntryIds`); });
  }
  if (scenario.host?.sourceEntryIds !== undefined) checkEntryIds(scenario.host.sourceEntryIds, '/scenario/host/sourceEntryIds');
  const quarantine = scenario?.host?.quarantine;
  const groups = quarantine?.entryGroups;
  if (groups !== undefined && v.array(groups, '/scenario/host/quarantine/entryGroups')) groups.forEach((group, index) => {
    const at = `/scenario/host/quarantine/entryGroups/${index}`;
    if (!v.object(group, at, ['reason', 'entryRefs'])) return;
    v.text(group.reason, `${at}/reason`);
    if (v.array(group.entryRefs, `${at}/entryRefs`)) group.entryRefs.forEach((reference, i) => {
      const pointer = `${at}/entryRefs/${i}`;
      if (!v.object(reference, pointer, ['entryId', 'pointer'])) return;
      const entryIndex = byId.get(reference.entryId);
      if (entryIndex === undefined || reference.pointer !== `/data/character_book/entries/${entryIndex}` || !entries[entryIndex].enabled) v.error('CONTENT_CARD_PROVENANCE', pointer);
      else {
        if (ignored.has(entryIndex)) v.error('CONTENT_DUPLICATE_REFERENCE', pointer);
        ignored.add(entryIndex);
      }
    });
  });
  if (quarantine?.mixedEntrySections !== undefined && v.array(quarantine.mixedEntrySections, '/scenario/host/quarantine/mixedEntrySections')) {
    quarantine.mixedEntrySections.forEach((group, index) => {
      const at = `/scenario/host/quarantine/mixedEntrySections/${index}`;
      if (!v.object(group, at, ['entryId', 'entryIds', 'sections', 'reason'], ['sections', 'reason'])) return;
      if (Object.hasOwn(group, 'entryId') === Object.hasOwn(group, 'entryIds')) v.error('CONTENT_CARD_PROVENANCE', at);
      if (group.entryId !== undefined) checkEntryId(group.entryId, `${at}/entryId`);
      if (group.entryIds !== undefined) checkEntryIds(group.entryIds, `${at}/entryIds`);
      v.list(group.sections, `${at}/sections`, { min: 1 }); v.text(group.reason, `${at}/reason`);
    });
  }
  if (quarantine?.discardedSourcePointers !== undefined) {
    const at = '/scenario/host/quarantine/discardedSourcePointers';
    v.list(quarantine.discardedSourcePointers, at, { unique: true });
    if (Array.isArray(quarantine.discardedSourcePointers)) quarantine.discardedSourcePointers.forEach((pointer, index) => {
      v.reader.select(card, pointer, v.source(`${at}/${index}`));
    });
  }
  for (const key of ['policy', 'sanitization']) if (quarantine?.[key] !== undefined) v.text(quarantine[key], `/scenario/host/quarantine/${key}`);
  for (const kind of ['rules', 'facts']) if (Array.isArray(world?.[kind])) world[kind].forEach((entry, index) => {
    if (Array.isArray(entry?.cardEntryIndices)) entry.cardEntryIndices.forEach((entryIndex, i) => {
      if (!entries[entryIndex]) v.error('CONTENT_CARD_REFERENCE', `/world/${kind}/${index}/cardEntryIndices/${i}`);
      else adopted.add(entryIndex);
    });
  });
  const review = (status, code, pointer) => v.review.push({ status, code, source: { file, pointer } });
  entries.forEach((entry, index) => {
    const at = `/data/character_book/entries/${index}`;
    review(adopted.has(index) ? 'adopted' : !entry.enabled || ignored.has(index) ? 'ignored' : 'manual-review',
      adopted.has(index) ? 'CARD_CURATED_REFERENCE_ONLY' : !entry.enabled || ignored.has(index) ? 'CARD_ENTRY_NOT_IMPORTED' : 'CARD_UNADOPTED_ENABLED_ENTRY', at);
    for (const key of Object.keys(entry)) if (!['id', 'enabled', 'comment', 'content'].includes(key)) {
      review('ignored', 'CARD_EXECUTION_METADATA_IGNORED', childPointer(at, key));
    }
  });
  for (const key of Object.keys(card)) if (key !== 'data') review(['spec', 'spec_version'].includes(key) ? 'adopted' : 'ignored',
    ['spec', 'spec_version'].includes(key) ? 'CARD_FORMAT_METADATA_ONLY' : 'CARD_METADATA_NOT_IMPORTED', childPointer('', key));
  for (const key of Object.keys(card.data.character_book)) if (key !== 'entries') {
    review('ignored', 'CARD_METADATA_NOT_IMPORTED', childPointer('/data/character_book', key));
  }
  for (const key of Object.keys(card.data)) if (key !== 'character_book') {
    if (key === 'alternate_greetings' && Array.isArray(card.data[key])) card.data[key].forEach((text, index) => {
      if (typeof text !== 'string') rawError('CONTENT_CARD_SHAPE', `/data/alternate_greetings/${index}`);
      review(provenance?.openingSource?.pointer === `/data/alternate_greetings/${index}` ? 'adopted' : 'manual-review', 'CARD_GREETING_REFERENCE_ONLY', `/data/alternate_greetings/${index}`);
    });
    else review('ignored', 'CARD_METADATA_NOT_IMPORTED', childPointer('/data', key));
  }
}

function reviewSummary(items) {
  const sorted = items.sort((a, b) => compare(`${a.source.file}#${a.source.pointer}:${a.code}`, `${b.source.file}#${b.source.pointer}:${b.code}`));
  return { counts: Object.fromEntries(['adopted', 'ignored', 'manual-review'].map(status => [status, sorted.filter(item => item.status === status).length])), items: sorted };
}

/**
 * Compile synchronously, without side effects. With no entry, verify the exact
 * four built-in documents used at runtime. An explicit entry is a JSON object:
 * { schema: 'manosaba.content-package', schemaVersion: 1, ruleIds: [...],
 *   scenario: { $import: './scenario.json' }, world: { $import: './world.json' },
 *   publicRules: { $import: './rules.json' }, avatars: { $import: './avatars.json' } }
 * Any JSON subtree may be a sole $import (+ optional RFC 6901 pointer). Imports
 * replace that subtree; no implicit merge, code execution or remote fetching.
 * sourceMap keys address /scenario, /world, /publicRules and /avatars in host.
 * Diagnostics and sourceReview contain fixed codes and source pointers only.
 */
export function compileContentPackage({ root = ROOT, entry } = {}) {
  const diagnostics = []; const review = [];
  let reader; let pack; let assets = [];
  try {
    if (typeof root !== 'string' || !root) return freeze({ ok: false, diagnostics: [{ code: 'CONTENT_ROOT_INVALID', source: { file: '', pointer: '' } }], sourceReview: reviewSummary(review) });
    reader = new Reader(resolve(root), diagnostics); reader.prepare();
    const v = new Validator(reader, diagnostics, review);
    if (entry !== undefined) {
      const path = reader.path(entry, '', { file: '', pointer: '' });
      pack = reader.document(path);
      if (v.object(pack, '', ['schema', 'schemaVersion', 'ruleIds', 'scenario', 'world', 'publicRules', 'avatars'])) {
        if (pack.schema !== CONTENT_SCHEMA.id || pack.schemaVersion !== CONTENT_SCHEMA.version) v.error('CONTENT_SCHEMA_UNSUPPORTED', '');
      }
    } else {
      pack = { schema: CONTENT_SCHEMA.id, schemaVersion: CONTENT_SCHEMA.version, ruleIds: [...BUILTIN_RULE_IDS] };
      for (const [name, url] of Object.entries(BUILTIN_DOCUMENTS)) {
        const path = relative(ROOT, fileURLToPath(url)).split(sep).join('/');
        pack[name] = reader.document(path, `/${name}`);
      }
    }
    v.list(pack?.ruleIds, '/ruleIds', { min: 1, ids: true, unique: true });
    const identities = validateScenario(v, pack?.scenario);
    validateWorld(v, pack?.world, pack?.publicRules, identities);
    assets = validateAvatars(v, pack?.avatars, identities.actors);
    if (!diagnostics.length) validateCardProvenance(v, pack.scenario, pack.world);
  } catch (error) {
    if (!(error instanceof StopCompilation)) diagnostics.push({ code: 'CONTENT_VALIDATION_FAILED', source: { file: '', pointer: '' } });
  }
  const sourceReview = reviewSummary(review);
  if (diagnostics.length || !pack) return freeze({ ok: false, diagnostics, sourceReview });
  const sources = reader.sources();
  const rules = [...pack.ruleIds].sort(compare);
  const schemaSha256 = sha256(canonical(CONTENT_SCHEMA));
  const fingerprint = sha256(canonical({ schema: CONTENT_SCHEMA, schemaSha256, validationRules: CONTENT_VALIDATION_RULES, ruleIds: rules, sources }));
  const identity = `sha256:${fingerprint}`;
  const manifest = { schema: CONTENT_SCHEMA.id, schemaVersion: CONTENT_SCHEMA.version, visibility: 'HOST_ONLY',
    hashAlgorithm: 'sha256', identity, fingerprint, schemaSha256, validationRules: [...CONTENT_VALIDATION_RULES], ruleIds: rules, sources };
  const publicManifest = { schema: 'manosaba.content-public', schemaVersion: 1, visibility: 'PUBLIC', identity, fingerprint,
    scenario: { scenarioRef: pack.scenario.scenarioRef,
      // Publishing an actor's dossier never publishes their current location,
      // persona or private initial knowledge. Room-local facts stay in HOST too.
      actors: pack.scenario.actors.map(({ id, name, appearance, communication }) => ({ id, name, appearance, communication })),
      locations: pack.scenario.locations.map(({ id, name, description, exitIds }) => ({ id, name, description, exitIds: [...exitIds] })),
      opening: pack.scenario.opening.map(({ speakerId, text, delivery }) => ({ speakerId, text, delivery })) },
    rules: pack.publicRules.map(({ id, name, paragraphs }) => ({ id, name, paragraphs: [...paragraphs] })), assets };
  const sourceMap = Object.fromEntries(Object.entries(reader.sourceMap).sort(([left], [right]) => compare(left, right)));
  return freeze({ ok: true, identity, fingerprint, manifest, publicManifest, diagnostics: [], sourceReview,
    host: { visibility: 'HOST_ONLY', scenario: pack.scenario, world: pack.world, publicRules: pack.publicRules, avatars: pack.avatars, sourceMap } });
}

/** Fail closed at runtime without embedding card/lore text in an exception. */
export function assertContentPackage(result) {
  if (!result?.ok) throw Object.assign(new TypeError('Local content package validation failed.'), {
    code: 'CONTENT_VALIDATION_FAILED', diagnostics: result?.diagnostics ?? [],
  });
  return result;
}

/** Safe CLI/report projection: never serialize host content or authored text. */
export function contentCheckReport(result) {
  return freeze({ ok: result.ok, checkOnly: true,
    ...(result.ok ? { identity: result.identity, fingerprint: result.fingerprint,
      counts: { sources: result.manifest.sources.length, actors: result.host.scenario.actors.length,
        locations: result.host.scenario.locations.length, rules: result.host.publicRules.length, assets: result.publicManifest.assets.length } } : {}),
    diagnostics: result.diagnostics, sourceReview: result.sourceReview });
}

import { randomUUID } from 'node:crypto';
import { isProxy } from 'node:util/types';
import { normalizeCharacter, normalizeOpening } from '../../public/player-creation-rules.mjs';
import { avatarUrl, isAvatarId } from '../characters/character-avatars.mjs';

const MAX_PRESETS_PER_KIND = 100;
const MAX_INTEGER = Number.MAX_SAFE_INTEGER;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const MESSAGES = Object.freeze({
  INVALID_PRESET: '预设数据无效，请检查填写内容后重试。',
  STALE_PRESET: '该预设已被其他页面修改，请刷新预设列表后重试。',
  PRESET_NOT_FOUND: '没有找到该预设，请刷新预设列表。',
});
const COLUMNS = 'kind, id, version, name, content_json, avatar_id, loop, updated_at';

class PresetError extends Error {
  constructor(code) {
    super(MESSAGES[code]);
    this.name = 'PresetError';
    this.code = code;
  }
}

const fail = (code = 'INVALID_PRESET') => { throw new PresetError(code); };
const integer = (value, minimum = 0) => Number.isSafeInteger(value) && value >= minimum;

function safely(work) {
  try { return work(); }
  catch (error) {
    if (error instanceof PresetError) throw error;
    fail();
  }
}

// Read descriptors, never getters or proxy traps. Only JSON-shaped records are
// accepted, including at nested character/attribute/opening boundaries.
function record(value, allowed) {
  if (value === null || typeof value !== 'object' || isProxy(value)
    || Object.getPrototypeOf(value) !== Object.prototype) fail();
  const keys = Reflect.ownKeys(value);
  if (keys.length > 64) fail();
  const result = {};
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (typeof key !== 'string' || ['__proto__', 'prototype', 'constructor'].includes(key)
      || (allowed && !allowed.includes(key)) || !descriptor.enumerable
      || !Object.hasOwn(descriptor, 'value')) fail();
    result[key] = descriptor.value;
  }
  return result;
}

function copyData(value, context = { ancestors: new Set(), remaining: 128 }, depth = 0) {
  if (depth > 12 || context.remaining-- <= 0) fail();
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (context.ancestors.has(value)) fail();
  const fields = record(value);
  context.ancestors.add(value);
  const result = {};
  for (const [key, child] of Object.entries(fields)) result[key] = copyData(child, context, depth + 1);
  context.ancestors.delete(value);
  return result;
}

function content(kind, value) {
  // The shared browser/server rules own the complete schema and point budget.
  const data = copyData(record(value));
  return kind === 'character'
    ? normalizeCharacter(data, { partial: false })
    : normalizeOpening(data);
}

function kind(value) {
  if (value !== 'character' && value !== 'opening') fail();
  return value;
}

function id(value) {
  if (typeof value !== 'string' || value.length !== 36 || !UUID.test(value)) fail();
  return value.toLowerCase();
}

function name(value) {
  if (typeof value !== 'string' || value.length > 60 || !value.trim()
    || /[\p{Cc}\p{Cf}\p{Cs}<>]/u.test(value)) fail();
  return value.trim();
}

function target(input, withVersion = false) {
  const fields = record(input, withVersion ? ['kind', 'id', 'expectedVersion'] : ['kind', 'id']);
  fields.kind = kind(fields.kind);
  fields.id = id(fields.id);
  if (withVersion && !integer(fields.expectedVersion, 1)) fail();
  return fields;
}

/** Reusable creation data, deliberately independent of game heads and clocks.
 * The host owns all transactions, including writes to CharacterAvatars.
 */
export class PlayerPresets {
  #db;
  #avatars;

  constructor(db, avatars) {
    this.#db = db;
    this.#avatars = avatars;
  }

  initialize() {
    return safely(() => {
      this.#db.exec(`CREATE TABLE IF NOT EXISTS prologue_creation_presets (
        kind TEXT NOT NULL CHECK(kind IN ('character', 'opening')),
        id TEXT NOT NULL CHECK(typeof(id) = 'text' AND length(id) = 36),
        version INTEGER NOT NULL CHECK(typeof(version) = 'integer' AND version BETWEEN 1 AND ${MAX_INTEGER}),
        name TEXT NOT NULL CHECK(typeof(name) = 'text' AND length(name) BETWEEN 1 AND 60),
        content_json TEXT NOT NULL CHECK(typeof(content_json) = 'text'),
        avatar_id TEXT,
        loop INTEGER,
        updated_at INTEGER NOT NULL CHECK(typeof(updated_at) = 'integer' AND updated_at BETWEEN 0 AND ${MAX_INTEGER}),
        PRIMARY KEY(kind, id),
        CHECK((kind = 'character' AND loop IS NULL AND (avatar_id IS NULL
            OR (typeof(avatar_id) = 'text' AND length(avatar_id) = 64)))
          OR (kind = 'opening' AND avatar_id IS NULL AND typeof(loop) = 'integer' AND loop IN (1, 2)))
      );
      CREATE INDEX IF NOT EXISTS prologue_creation_presets_updated
        ON prologue_creation_presets(kind, updated_at DESC, id)`);
    });
  }

  #row(presetKind, presetId) {
    const row = this.#db.prepare(`SELECT ${COLUMNS} FROM prologue_creation_presets WHERE kind = ? AND id = ?`)
      .get(presetKind, presetId);
    if (!row) fail('PRESET_NOT_FOUND');
    return row;
  }

  #present(row) {
    const presetKind = kind(row.kind);
    if (id(row.id) !== row.id || !integer(row.version, 1) || !integer(row.updated_at)
      || name(row.name) !== row.name || typeof row.content_json !== 'string') fail();
    const body = content(presetKind, JSON.parse(row.content_json));
    const common = { id: row.id, version: row.version, name: row.name };
    if (presetKind === 'character') {
      if (row.loop !== null || (row.avatar_id !== null && !isAvatarId(row.avatar_id))) fail();
      return { ...common, character: body, avatarUrl: row.avatar_id === null ? null : avatarUrl(row.avatar_id),
        updatedAt: row.updated_at };
    }
    if (row.avatar_id !== null || (row.loop !== 1 && row.loop !== 2)) fail();
    return { ...common, loop: row.loop, opening: body, updatedAt: row.updated_at };
  }

  #list() {
    const rows = this.#db.prepare(`SELECT ${COLUMNS} FROM prologue_creation_presets
      ORDER BY kind, updated_at DESC, id LIMIT ?`).all(MAX_PRESETS_PER_KIND * 2 + 1);
    const result = { characters: [], openings: [] };
    for (const row of rows) {
      const collection = kind(row.kind) === 'character' ? result.characters : result.openings;
      if (collection.length >= MAX_PRESETS_PER_KIND) fail();
      collection.push(this.#present(row));
    }
    return result;
  }

  list() {
    return safely(() => this.#list());
  }

  read(input) {
    return safely(() => {
      const fields = target(input);
      const row = this.#row(fields.kind, fields.id);
      const preset = this.#present(row);
      if (fields.kind === 'opening') return preset;
      if (row.avatar_id === null) return { ...preset, avatarDataUrl: null };
      // read() validates the stored PNG and digest; never re-encode a raw DB blob.
      const asset = this.#avatars.read(row.avatar_id);
      if (!asset || asset.mime !== 'image/png' || !(asset.bytes instanceof Uint8Array)) fail();
      return { ...preset, avatarDataUrl: `data:image/png;base64,${Buffer.from(asset.bytes).toString('base64')}` };
    });
  }

  save(input) {
    return safely(() => {
      const fields = record(input, ['kind', 'id', 'expectedVersion', 'name', 'character', 'avatarDataUrl', 'loop', 'opening']);
      const presetKind = kind(fields.kind);
      const presetName = name(fields.name);
      const updating = Object.hasOwn(fields, 'id');
      const presetId = updating ? id(fields.id) : randomUUID();
      if (updating ? !integer(fields.expectedVersion, 1) : Object.hasOwn(fields, 'expectedVersion')) fail();
      if (presetKind === 'character') {
        if (Object.hasOwn(fields, 'loop') || Object.hasOwn(fields, 'opening') || !Object.hasOwn(fields, 'character')) fail();
        if (Object.hasOwn(fields, 'avatarDataUrl') && fields.avatarDataUrl !== null
          && typeof fields.avatarDataUrl !== 'string') fail();
      } else if (Object.hasOwn(fields, 'character') || Object.hasOwn(fields, 'avatarDataUrl')
        || !Object.hasOwn(fields, 'opening') || (fields.loop !== 1 && fields.loop !== 2)) fail();
      const body = content(presetKind, presetKind === 'character' ? fields.character : fields.opening);
      const bodyJson = JSON.stringify(body);
      const previous = updating ? this.#row(presetKind, presetId) : null;
      if (previous && previous.version !== fields.expectedVersion) fail('STALE_PRESET');
      if (previous) this.#present(previous);
      const version = previous ? previous.version + 1 : 1;
      if (!integer(version, 1)) fail();
      if (!updating && this.#db.prepare('SELECT count(*) AS count FROM prologue_creation_presets WHERE kind = ?')
        .get(presetKind).count >= MAX_PRESETS_PER_KIND) fail();
      const updatedAt = Date.now();
      if (!integer(updatedAt)) fail();

      let avatarId = previous?.avatar_id ?? null;
      if (presetKind === 'character' && Object.hasOwn(fields, 'avatarDataUrl')) {
        avatarId = fields.avatarDataUrl === null ? null : this.#avatars.put(fields.avatarDataUrl);
      }
      // A deduplicated immutable asset may already exist but be damaged.
      if (avatarId !== null) {
        if (!isAvatarId(avatarId)) fail();
        this.#avatars.assertReference(avatarId);
      }
      if (updating) {
        const result = this.#db.prepare(`UPDATE prologue_creation_presets
          SET version = ?, name = ?, content_json = ?, avatar_id = ?, loop = ?, updated_at = ?
          WHERE kind = ? AND id = ? AND version = ?`)
          .run(version, presetName, bodyJson, avatarId, presetKind === 'opening' ? fields.loop : null,
            updatedAt, presetKind, presetId, fields.expectedVersion);
        if (result.changes !== 1) fail('STALE_PRESET');
      } else {
        this.#db.prepare(`INSERT INTO prologue_creation_presets
          (kind, id, version, name, content_json, avatar_id, loop, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
          .run(presetKind, presetId, version, presetName, bodyJson, avatarId,
            presetKind === 'opening' ? fields.loop : null, updatedAt);
      }
      return { savedPreset: this.#present(this.#row(presetKind, presetId)), ...this.#list() };
    });
  }

  delete(input) {
    return safely(() => {
      const fields = target(input, true);
      const previous = this.#row(fields.kind, fields.id);
      if (previous.version !== fields.expectedVersion) fail('STALE_PRESET');
      const result = this.#db.prepare('DELETE FROM prologue_creation_presets WHERE kind = ? AND id = ? AND version = ?')
        .run(fields.kind, fields.id, fields.expectedVersion);
      if (result.changes !== 1) fail('STALE_PRESET');
      // Assets can also be referenced by other presets and live/historical games.
      return { deletedPreset: { kind: fields.kind, id: fields.id }, ...this.#list() };
    });
  }
}

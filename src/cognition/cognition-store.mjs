import { randomUUID, createHash } from 'node:crypto';
import { RELATIONSHIP_RUNTIME_REVISION, INTENT_RUNTIME_REVISION, hasIntentRuntime, isRelationshipRuntime, relationshipCanonicalJson, selectRelationshipWindow } from '../content/relationship-context-policy.mjs';
import { relationshipRootForRows } from '../creation/player-setup.mjs';
import { relationshipOwnerBlueprint, RELATIONSHIP_SOURCE_VERSION } from '../creation/relationship-setup.mjs';
import { composeInitialRunPolicy } from '../content/initial-run-policy.mjs';
import { relationshipPacketPolicy } from '../content/content-revisions.mjs';
const sha256 = value => createHash('sha256').update(value).digest('hex');
import { openSqliteScope } from '../host/sqlite-scope-owner.mjs';
import { cognitionAuthorizationSQL, COGNITION_HISTORY_SQL, COGNITION_AUTHORIZED_SQL, initializeMagicCognitionSchema } from './cognition-access-policy.mjs';
import { isProxy } from 'node:util/types';
import { buildRecallAliases, prepareRecallQuery, projectRecallText, scoreRecallText, fuseRecallRanks } from './recall-text.mjs';

// Host-only repository. A model/browser must never choose these scopes or receive
// this store/database handle. World-event bodies are never read into JS;
// experience continuity uses only whitelisted owner-source event metadata.
const VERSION = 1;
const MAX_BATCH = 128;
const MAX_SOURCES = 64;
const MAX_ANCESTORS = 4096;
const MAX_CANDIDATES = 4096;
const MAX_INPUT_BYTES = 256 * 1024;
const MAX_CANDIDATE_BYTES = 4 * 1024 * 1024;
const MAX_OUTPUT_BYTES = 256 * 1024;
// Independent of topic recall and adopted-record continuity: two route edges
// plus one received institutional notice. Legacy statement events have no
// movement kind, so inspect only a bounded owner-action tail, never all text.
const MAX_EXPERIENCE_ACTIONS = 32;
const MAX_EXPERIENCE_MOVES = 2;
const KINDS = new Set(['memory', 'belief', 'relationship', 'evidence_knowledge']);
const CANDIDATES = 'cognition_search_candidates';
const FTS = 'cognition_search_fts';
const INDEX_OBJECTS = [FTS, ...['_data', '_idx', '_content', '_docsize', '_config'].map(suffix => FTS + suffix)];
const TABLES = {
  cognition_schema: ['version'],
  cognition_observations: ['id', 'run_id', 'origin_branch_id', 'commit_ref', 'owner_id', 'event_ref', 'text', 'channel', 'occurred_at', 'learned_at', 'revision', 'origin_generation', 'schema_version'],
  cognition_records: ['id', 'run_id', 'origin_branch_id', 'commit_ref', 'owner_id', 'kind', 'summary', 'supersedes_ref', 'revision', 'origin_generation', 'schema_version'],
  cognition_record_sources: ['record_id', 'observation_id'],
  cognition_revocations: ['id', 'run_id', 'origin_branch_id', 'commit_ref', 'owner_id', 'observation_id', 'revision', 'origin_generation', 'schema_version'],
};

const fail = (code, message) => { throw Object.assign(new Error(message), { code }); };
const invalid = () => fail('ERR_COGNITION_VALIDATION', '认知仓储参数格式错误或超过限制。');
const sourceError = () => fail('ERR_COGNITION_SOURCE', '认知来源不存在、不可访问或已失效。');
const idsForDurable = ids => { if (!Array.isArray(ids) || ids.length > 128 || new Set(ids).size !== ids.length || ids.some(id => typeof id !== 'string')) invalid(); };
const schemaError = () => fail('ERR_COGNITION_SCHEMA', '认知仓储版本不受支持或结构不完整。');
const budgetError = () => fail('ERR_COGNITION_BUDGET', '认知查询超过预算；请缩小交付范围。');
function safely(operation) {
  try { return operation(); }
  catch (error) {
    if (error instanceof Error && (/^ERR_COGNITION_[A-Z_]+$/u.test(error.code ?? '') || error.code === 'ERR_AGENT_CONTEXT_TOO_LARGE')) throw error;
    // SQLite constraint messages, SQL, identifiers and text are not diagnostics.
    fail('ERR_COGNITION_STORAGE', '无法安全完成认知仓储操作。');
  }
}
function object(value, fields, required = fields) {
  if (value === null || typeof value !== 'object' || isProxy(value)
    || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) invalid();
  if (Reflect.ownKeys(value).some(key => typeof key !== 'string' || !fields.includes(key))) invalid();
  const result = {};
  for (const key of fields) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor && (!descriptor.enumerable || !Object.hasOwn(descriptor, 'value'))) invalid();
    if (!descriptor || descriptor.value === undefined) {
      if (required.includes(key)) invalid();
      continue;
    }
    result[key] = descriptor.value;
  }
  return result;
}
function list(value, maximum = MAX_BATCH) {
  if (isProxy(value) || !Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) invalid();
  const length = Object.getOwnPropertyDescriptor(value, 'length').value;
  if (!length || length > maximum || Reflect.ownKeys(value).length !== length + 1) invalid();
  const entries = [];
  for (let index = 0; index < length; index++) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (!descriptor?.enumerable || !Object.hasOwn(descriptor, 'value')) invalid();
    entries.push(descriptor.value);
  }
  return entries;
}
function identifier(value, maximum = 128) {
  if (typeof value !== 'string' || !value.length || value.length > maximum || !value.isWellFormed()
    || value.trim() !== value || /[\u0000-\u001f\u007f]/u.test(value)) invalid();
  return value;
}
function text(value, maximum) {
  if (typeof value !== 'string' || !value.trim() || value.length > maximum || !value.isWellFormed() || value.includes('\0')) invalid();
  return value;
}
function integer(value, minimum = 0) {
  if (!Number.isSafeInteger(value) || value < minimum) invalid();
  return value;
}
function unique(entries, key = value => value) {
  if (new Set(entries.map(key)).size !== entries.length) invalid();
  return entries;
}
function sources(value) { return unique(list(value, MAX_SOURCES).map(entry => identifier(entry))); }
function withinBudget(value, maximum = MAX_INPUT_BYTES) {
  if (Buffer.byteLength(JSON.stringify(value), 'utf8') > maximum) budgetError();
  return value;
}

const PERFORMER_SCHEMA = `
  CREATE TABLE IF NOT EXISTS cognition_observation_performers (
    observation_id TEXT PRIMARY KEY REFERENCES cognition_observations(id),
    source_actor_handle TEXT NOT NULL, source_relation TEXT NOT NULL CHECK(source_relation IN ('self','other')),
    schema_version INTEGER NOT NULL CHECK(schema_version=1)
  ) STRICT;
  CREATE TRIGGER IF NOT EXISTS cognition_performers_immutable_update BEFORE UPDATE ON cognition_observation_performers
    BEGIN SELECT RAISE(ABORT,'immutable observation performer'); END;
  CREATE TRIGGER IF NOT EXISTS cognition_performers_immutable_delete BEFORE DELETE ON cognition_observation_performers
    BEGIN SELECT RAISE(ABORT,'immutable observation performer'); END;
  CREATE TRIGGER IF NOT EXISTS cognition_performers_immutable_insert BEFORE INSERT ON cognition_observation_performers
    WHEN EXISTS(SELECT 1 FROM cognition_observation_performers WHERE observation_id=NEW.observation_id)
    BEGIN SELECT RAISE(ABORT,'sealed observation performer'); END;
`;

const CASE_SOURCE_SCHEMA = `
  CREATE TABLE IF NOT EXISTS cognition_case_sources (
    observation_id TEXT NOT NULL REFERENCES cognition_observations(id), case_ref TEXT NOT NULL,
    source_kind TEXT NOT NULL CHECK(source_kind IN ('experience','delivery','operation')),
    schema_version INTEGER NOT NULL CHECK(schema_version=1), PRIMARY KEY(observation_id,case_ref)
  ) STRICT;
  CREATE INDEX IF NOT EXISTS cognition_case_sources_ref ON cognition_case_sources(case_ref,observation_id);
  CREATE TRIGGER IF NOT EXISTS cognition_case_sources_update BEFORE UPDATE ON cognition_case_sources
    BEGIN SELECT RAISE(ABORT,'immutable case source'); END;
  CREATE TRIGGER IF NOT EXISTS cognition_case_sources_delete BEFORE DELETE ON cognition_case_sources
    BEGIN SELECT RAISE(ABORT,'immutable case source'); END;
  CREATE TRIGGER IF NOT EXISTS cognition_case_sources_replace BEFORE INSERT ON cognition_case_sources
    WHEN EXISTS(SELECT 1 FROM cognition_case_sources WHERE observation_id=NEW.observation_id AND case_ref=NEW.case_ref)
    BEGIN SELECT RAISE(ABORT,'immutable case source'); END;
`;

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS cognition_schema (version INTEGER NOT NULL) STRICT;
  CREATE TABLE IF NOT EXISTS cognition_observations (
    id TEXT PRIMARY KEY, run_id TEXT NOT NULL, origin_branch_id TEXT NOT NULL,
    commit_ref TEXT NOT NULL REFERENCES domain_commits(commit_ref), owner_id TEXT NOT NULL,
    event_ref TEXT NOT NULL REFERENCES domain_world_events(event_ref), text TEXT NOT NULL, channel TEXT NOT NULL,
    occurred_at INTEGER NOT NULL CHECK(occurred_at >= 0),
    learned_at INTEGER NOT NULL CHECK(learned_at >= occurred_at),
    revision INTEGER NOT NULL CHECK(revision >= 0), origin_generation INTEGER NOT NULL CHECK(origin_generation >= 1),
    schema_version INTEGER NOT NULL CHECK(schema_version = 1)
  ) STRICT;
  CREATE TABLE IF NOT EXISTS cognition_records (
    id TEXT PRIMARY KEY, run_id TEXT NOT NULL, origin_branch_id TEXT NOT NULL,
    commit_ref TEXT NOT NULL REFERENCES domain_commits(commit_ref), owner_id TEXT NOT NULL,
    kind TEXT NOT NULL CHECK(kind IN ('memory', 'belief', 'relationship', 'evidence_knowledge')),
    summary TEXT NOT NULL, supersedes_ref TEXT REFERENCES cognition_records(id),
    revision INTEGER NOT NULL CHECK(revision >= 0), origin_generation INTEGER NOT NULL CHECK(origin_generation >= 1),
    schema_version INTEGER NOT NULL CHECK(schema_version = 1)
  ) STRICT;
  CREATE TABLE IF NOT EXISTS cognition_record_sources (
    record_id TEXT NOT NULL REFERENCES cognition_records(id),
    observation_id TEXT NOT NULL REFERENCES cognition_observations(id),
    PRIMARY KEY(record_id, observation_id)
  ) STRICT;
  CREATE TABLE IF NOT EXISTS cognition_revocations (
    id TEXT PRIMARY KEY, run_id TEXT NOT NULL, origin_branch_id TEXT NOT NULL,
    commit_ref TEXT NOT NULL REFERENCES domain_commits(commit_ref), owner_id TEXT NOT NULL,
    observation_id TEXT NOT NULL REFERENCES cognition_observations(id),
    revision INTEGER NOT NULL CHECK(revision >= 0), origin_generation INTEGER NOT NULL CHECK(origin_generation >= 1),
    schema_version INTEGER NOT NULL CHECK(schema_version = 1),
    UNIQUE(commit_ref, owner_id, observation_id)
  ) STRICT;
  CREATE INDEX IF NOT EXISTS cognition_observations_owner ON cognition_observations(run_id, owner_id, commit_ref);
  CREATE INDEX IF NOT EXISTS cognition_records_owner ON cognition_records(run_id, owner_id, commit_ref);
  CREATE INDEX IF NOT EXISTS cognition_records_supersedes ON cognition_records(run_id, owner_id, supersedes_ref);
  CREATE INDEX IF NOT EXISTS cognition_sources_observation ON cognition_record_sources(observation_id, record_id);
  CREATE INDEX IF NOT EXISTS cognition_revocations_owner ON cognition_revocations(run_id, owner_id, observation_id, commit_ref);
`;

// The only parent is the narrative parent: a load/rewind points at its restored
// source, NOT the abandoned head. Run/owner filtering happens inside these SQL
// relations, before any text, summary, or source list can enter JavaScript/FTS.
const HISTORY = COGNITION_HISTORY_SQL;
const AUTHORIZED = COGNITION_AUTHORIZED_SQL;
const CANDIDATE_QUERY = `${AUTHORIZED}
  SELECT 'observation' AS type, o.id AS id, o.text, o.channel, NULL AS kind, NULL AS source_ids,
    o.occurred_at, o.learned_at, NULL AS supersedes_ref,
    (SELECT source_actor_handle FROM cognition_observation_performers WHERE observation_id=o.id) AS source_actor_handle,
    (SELECT source_relation FROM cognition_observation_performers WHERE observation_id=o.id) AS source_relation,
    (SELECT sequence FROM history WHERE commit_ref = o.commit_ref) AS sequence, o.rowid AS ordinal
  FROM visible_observations allowed JOIN cognition_observations o ON o.id = allowed.id
    AND o.run_id = $runId AND o.owner_id = $actorId
  UNION ALL
  SELECT 'record' AS type, r.id AS id, r.summary AS text, NULL AS channel, r.kind,
    (SELECT json_group_array(observation_id) FROM (
      SELECT observation_id FROM cognition_record_sources WHERE record_id = r.id ORDER BY observation_id COLLATE BINARY
    )) AS source_ids,
    NULL AS occurred_at, NULL AS learned_at, r.supersedes_ref, NULL AS source_actor_handle, NULL AS source_relation,
    (SELECT sequence FROM history WHERE commit_ref = r.commit_ref) AS sequence, r.rowid AS ordinal
  FROM current_records allowed JOIN cognition_records r ON r.id = allowed.id
    AND r.run_id = $runId AND r.owner_id = $actorId
  ORDER BY type COLLATE BINARY, id COLLATE BINARY
  LIMIT ${MAX_CANDIDATES + 1}`;

/** Owner-scoped, append-only cognitive authority with disposable local search. */
export class CognitionStore {
  #db;
  #aliases;
  #relationshipDisplayActions;
  // Host-only optimization for public capability projection, within the
  // outer read transaction that verifies main.data_version before/after.
  withRelationshipDisplayActions(memo, work) {
    if (!this.#db.isTransaction || this.#relationshipDisplayActions !== undefined || !(memo instanceof Map)) invalid();
    this.#relationshipDisplayActions = memo;
    try { return work(); }
    finally { this.#relationshipDisplayActions = undefined; }
  }
  /** Optional host-owned public labels only, never actor knowledge or ACL IDs.
   * actorAliases: [{ actorId, aliases: [label, ...] }], max 32 actors / 8 labels.
   * Existing one-argument construction uses the fixed canonical domain roster.
   */
  constructor(db, options = {}) {
    if (!db || typeof db.prepare !== 'function' || typeof db.exec !== 'function' || typeof db.isTransaction !== 'boolean') invalid();
    const args = object(options, ['actorAliases'], []);
    const actorAliases = args.actorAliases === undefined ? [] : unique(list(args.actorAliases, 32).map(entry => {
      const row = object(entry, ['actorId', 'aliases']);
      return { actorId: identifier(row.actorId), aliases: unique(list(row.aliases, 8).map(alias => identifier(alias, 64))) };
    }), row => row.actorId);
    withinBudget(actorAliases, 32 * 1024);
    this.#aliases = buildRecallAliases(actorAliases);
    this.#db = db;
  }

  #operation(mutation, operation) {
    return safely(() => {
      if (mutation && !this.#db.isTransaction) fail('ERR_COGNITION_TRANSACTION', '认知写入必须位于调用方事务中。');
      // Also gives standalone reads a consistent snapshot across authorization,
      // candidate construction and result selection. Never commit the caller.
      const savepoint = `cognition_${randomUUID().replaceAll('-', '')}`;
      const sqlScope = openSqliteScope(this.#db, savepoint);
      try {
        const result = operation();
        sqlScope.release();
        return result;
      } catch (error) {
        try { sqlScope.rollback(); } catch { /* Preserve the safe original failure. */ }
        throw error;
      }
    });
  }

  #version() {
    const entry = this.#db.prepare("SELECT type FROM sqlite_schema WHERE name = 'cognition_schema'").get();
    if (!entry) return false;
    if (entry.type !== 'table') schemaError();
    let rows;
    try { rows = this.#db.prepare('SELECT version FROM cognition_schema LIMIT 2').all(); }
    catch { schemaError(); }
    if (rows.length !== 1 || rows[0].version !== VERSION) schemaError();
    return true;
  }

  #ready() { if (!this.#version()) schemaError(); }

  /** Call inside the same host transaction that creates the domain schema. */
  initialize() {
    return this.#operation(true, () => {
      const existing = this.#version(); // No edits precede an unknown-version rejection.
      if (existing) {
        for (const [table, expected] of Object.entries(TABLES)) {
          const actual = this.#db.prepare(`PRAGMA table_info(${table})`).all().map(row => row.name);
          if (actual.length !== expected.length || actual.some((name, index) => name !== expected[index])) schemaError();
        }
      } else if (this.#db.prepare("SELECT 1 FROM sqlite_schema WHERE name GLOB 'cognition_*' LIMIT 1").get()) {
        schemaError();
      }
      try {
        this.#db.prepare('SELECT commit_ref, run_id, branch_id, parent_commit_ref, sequence, generation, revision, world_time FROM domain_commits LIMIT 0').all();
        this.#db.prepare('SELECT event_ref, run_id, branch_id, commit_ref, kind, payload, schema_version FROM domain_world_events LIMIT 0').all();
      } catch { schemaError(); }
      this.#db.exec(SCHEMA);
      this.#db.exec(PERFORMER_SCHEMA);
      this.#db.exec(CASE_SOURCE_SCHEMA);
      initializeMagicCognitionSchema(this.#db);
      this.#db.exec(`CREATE TABLE IF NOT EXISTS cognition_story_origins (
        target_id TEXT PRIMARY KEY, target_type TEXT NOT NULL CHECK(target_type IN ('observation','record')),
        source_id TEXT NOT NULL, source_commit_ref TEXT NOT NULL REFERENCES domain_commits(commit_ref),
        source_branch_id TEXT NOT NULL, owner_id TEXT NOT NULL, mind_id TEXT NOT NULL,
        original_occurred_at INTEGER, original_learned_at INTEGER, policy_ref TEXT NOT NULL CHECK(policy_ref='owner-mind-source-closure@1')
      ) STRICT;
      CREATE TRIGGER IF NOT EXISTS cognition_story_origins_update BEFORE UPDATE ON cognition_story_origins
        BEGIN SELECT RAISE(ABORT,'immutable story cognition origin'); END;
      CREATE TRIGGER IF NOT EXISTS cognition_story_origins_delete BEFORE DELETE ON cognition_story_origins
        BEGIN SELECT RAISE(ABORT,'immutable story cognition origin'); END;
      CREATE TRIGGER IF NOT EXISTS cognition_story_origins_replace BEFORE INSERT ON cognition_story_origins
        WHEN EXISTS(SELECT 1 FROM cognition_story_origins WHERE target_id=NEW.target_id)
        BEGIN SELECT RAISE(ABORT,'immutable story cognition origin'); END;`);
      const caseColumns = this.#db.prepare('PRAGMA table_info(cognition_case_sources)').all().map(row => row.name);
      if (JSON.stringify(caseColumns) !== JSON.stringify(['observation_id', 'case_ref', 'source_kind', 'schema_version'])) schemaError();
      const performerColumns = this.#db.prepare('PRAGMA table_info(cognition_observation_performers)').all().map(row => row.name);
      if (JSON.stringify(performerColumns) !== JSON.stringify(['observation_id', 'source_actor_handle', 'source_relation', 'schema_version'])) schemaError();
      for (const table of Object.keys(TABLES)) {
        for (const action of ['UPDATE', 'DELETE']) {
          this.#db.exec(`CREATE TRIGGER IF NOT EXISTS ${table}_immutable_${action.toLowerCase()}
            BEFORE ${action} ON ${table} BEGIN SELECT RAISE(ABORT, 'immutable cognition authority'); END`);
        }
        // DELETE triggers alone do not prevent INSERT OR REPLACE when SQLite's
        // recursive_triggers is off (the default). Reject replacement explicitly.
        const conflict = table === 'cognition_schema' ? '1'
          : table === 'cognition_record_sources' ? 'record_id = NEW.record_id AND observation_id = NEW.observation_id'
            : table === 'cognition_revocations' ? 'id = NEW.id OR (commit_ref = NEW.commit_ref AND owner_id = NEW.owner_id AND observation_id = NEW.observation_id)'
              : 'id = NEW.id';
        this.#db.exec(`CREATE TRIGGER IF NOT EXISTS ${table}_immutable_replace
          BEFORE INSERT ON ${table} WHEN EXISTS (SELECT 1 FROM ${table} WHERE ${conflict})
          BEGIN SELECT RAISE(ABORT, 'immutable cognition authority'); END`);
      }
      if (!existing) this.#db.prepare('INSERT INTO cognition_schema(version) VALUES(?)').run(VERSION);
      return { schemaVersion: VERSION };
    });
  }

  #head(commitRef) {
    identifier(commitRef);
    const head = this.#db.prepare(`SELECT commit_ref, run_id, branch_id, parent_commit_ref,
      sequence, generation, revision, world_time FROM domain_commits WHERE commit_ref = ?`).get(commitRef);
    if (!head) fail('ERR_COGNITION_SCOPE', '认知查询的提交或执行水位无效。');
    const scope = { commitRef, runId: identifier(head.run_id), branchId: identifier(head.branch_id),
      generation: integer(head.generation, 1), revision: integer(head.revision), worldTime: integer(head.world_time) };
    const lineage = this.#db.prepare(`${HISTORY} SELECT * FROM history ORDER BY depth`).all({ $commitRef: commitRef, $runId: scope.runId });
    if (lineage.length > MAX_ANCESTORS) budgetError();
    const seen = new Set();
    for (let index = 0; index < lineage.length; index++) {
      const row = lineage[index];
      if (seen.has(row.commit_ref) || row.run_id !== scope.runId
        || row.parent_commit_ref !== (lineage[index + 1]?.commit_ref ?? null)) {
        fail('ERR_COGNITION_SCOPE', '认知查询的有效历史不完整。');
      }
      identifier(row.commit_ref); identifier(row.branch_id);
      integer(row.generation, 1); integer(row.revision); integer(row.world_time); integer(row.sequence);
      seen.add(row.commit_ref);
    }
    return scope;
  }

  #readScope(input, search = false) {
    const args = object(input, ['commitRef', 'actorId', 'generation', 'revision', ...(search ? ['query', 'limit'] : [])],
      ['commitRef', 'actorId', 'generation', 'revision', ...(search ? ['query'] : [])]);
    const actorId = identifier(args.actorId);
    const generation = integer(args.generation, 1); const revision = integer(args.revision);
    const scope = this.#head(args.commitRef);
    if (generation !== scope.generation || revision !== scope.revision) {
      fail('ERR_COGNITION_SCOPE', '认知查询的提交或执行水位无效。');
    }
    return { ...scope, actorId, ...(search ? { query: text(args.query, 256).trim(), limit: integer(args.limit === undefined ? 20 : args.limit, 1) } : {}) };
  }

  #bindings(scope) {
    return { $commitRef: scope.commitRef, $runId: scope.runId, $actorId: scope.actorId, $worldTime: scope.worldTime };
  }

  #project(row, scope) {
    const boundary = { actorId: scope.actorId, branchId: scope.branchId, generation: scope.generation, revision: scope.revision };
    if (row.type === 'observation') return { id: row.id, text: row.text, channel: row.channel,
      ...(row.source_actor_handle ? { sourceActorHandle: row.source_actor_handle, sourceRelation: row.source_relation } : {}),
      occurredAt: row.occurred_at, learnedAt: row.learned_at, ...boundary };
    return { id: row.id, kind: row.kind, summary: row.text, sourceObservationIds: JSON.parse(row.source_ids),
      ...(row.supersedes_ref === null ? {} : { supersedesRef: row.supersedes_ref }), ...boundary };
  }

  #checkSources(scope, ids) {
    // Metadata-only query: do not fetch another owner's text to reject a source.
    const rows = this.#db.prepare(`${AUTHORIZED}
      SELECT id FROM visible_observations WHERE id IN (SELECT value FROM json_each($ids))`).all({
      ...this.#bindings(scope), $ids: JSON.stringify(ids),
    });
    if (rows.length !== ids.length) sourceError();
  }

  #storyCarryScope(input) {
    const args = object(input, ['sourceCommitRef', 'ownerId', 'mindId', 'sourceBranchId', 'memories']);
    const scope = { ...this.#head(args.sourceCommitRef), actorId: identifier(args.ownerId) };
    identifier(args.mindId); identifier(args.sourceBranchId);
    this.#storyOwnerIdentity(scope, args.mindId);
    if (!Array.isArray(args.memories) || args.memories.length > 128) invalid();
    const refs = args.memories.length ? unique(list(args.memories).map(value => {
      const row = object(value, ['recordId', 'ownerMindId', 'originBranchId', 'sourceEventId', 'learnedAt']);
      identifier(row.recordId); identifier(row.sourceEventId); integer(row.learnedAt);
      if (row.ownerMindId !== args.mindId || row.originBranchId !== args.sourceBranchId || row.learnedAt > scope.worldTime) sourceError();
      return row;
    }), row => row.recordId) : [];
    // IDs/metadata only: authorize owner, ancestry, time, revocation and ALL
    // sources of each typed record BEFORE selecting a summary or source body.
    const bindings = { ...this.#bindings(scope), $refs: JSON.stringify(refs) };
    const rows = this.#db.prepare(`${AUTHORIZED} SELECT j.value AS ref,
      CASE WHEN EXISTS(SELECT 1 FROM current_records r WHERE r.id=json_extract(j.value,'$.recordId')) THEN 'record' ELSE 'observation' END AS type
      FROM json_each($refs) j WHERE
        (EXISTS(SELECT 1 FROM visible_observations v JOIN cognition_observations o ON o.id=v.id
          WHERE o.id=json_extract(j.value,'$.recordId') AND o.owner_id=$actorId
            AND o.event_ref=json_extract(j.value,'$.sourceEventId') AND o.learned_at=json_extract(j.value,'$.learnedAt'))
        OR EXISTS(SELECT 1 FROM current_records r WHERE r.id=json_extract(j.value,'$.recordId')
          AND EXISTS(SELECT 1 FROM cognition_record_sources s JOIN cognition_observations o ON o.id=s.observation_id
            WHERE s.record_id=r.id AND o.event_ref=json_extract(j.value,'$.sourceEventId') AND o.owner_id=$actorId)
          AND (SELECT max(o.learned_at) FROM cognition_record_sources s JOIN cognition_observations o ON o.id=s.observation_id
            WHERE s.record_id=r.id)=json_extract(j.value,'$.learnedAt')))`)
      .all(bindings);
    if (rows.length !== refs.length) sourceError();
    return { args, scope, rows };
  }

  #storyOwnerIdentity(scope, mindId) {
    const row = this.#db.prepare(`SELECT 1 FROM domain_story_deaths
      WHERE commit_ref=? AND actor_id=? AND mind_id=?`).get(scope.commitRef, scope.actorId, mindId);
    if (!row) sourceError();
  }

  storyMemoryReferences({ commitRef, actorId, mindId, branchId }) {
    return this.#operation(false, () => {
      this.#ready(); identifier(mindId); identifier(branchId);
      const scope = { ...this.#head(commitRef), actorId: identifier(actorId) };
      this.#storyOwnerIdentity(scope, mindId);
      const rows = this.#db.prepare(`${AUTHORIZED} SELECT r.id,
        (SELECT o.event_ref FROM cognition_record_sources s JOIN cognition_observations o ON o.id=s.observation_id
          WHERE s.record_id=r.id ORDER BY o.id LIMIT 1) AS source_event_id,
        (SELECT max(o.learned_at) FROM cognition_record_sources s JOIN cognition_observations o ON o.id=s.observation_id
          WHERE s.record_id=r.id) AS learned_at
        FROM current_records v JOIN cognition_records r ON r.id=v.id AND r.owner_id=$actorId
        UNION ALL SELECT o.id,o.event_ref,o.learned_at FROM visible_observations v
          JOIN cognition_observations o ON o.id=v.id AND o.owner_id=$actorId
          WHERE NOT EXISTS(SELECT 1 FROM cognition_record_sources s JOIN current_records r ON r.id=s.record_id
            WHERE s.observation_id=o.id)
        ORDER BY 1 LIMIT 129`).all(this.#bindings(scope));
      if (rows.length > 128) budgetError();
      return rows.map(row => ({ id: row.id, ownerMindId: mindId, branchId,
        sourceEventId: row.source_event_id, learnedAt: row.learned_at }));
    });
  }

  validateStoryCarry(input) {
    return this.#operation(false, () => {
      this.#ready(); const { rows } = this.#storyCarryScope(input);
      return { authorizedCount: rows.length, policyRef: 'owner-mind-source-closure@1' };
    });
  }

  /** Relearn at the restored clock; original chronology remains immutable in
   * an explicit provenance sidecar. Belief/evidence types are NOT upgraded to
   * truth, and each record's owner-authorized observation closure is copied. */
  carryStoryMemories(input) {
    return this.#operation(true, () => {
      this.#ready();
      const args = object(input, ['sourceCommitRef', 'commitRef', 'ownerId', 'mindId', 'sourceBranchId', 'memories', 'eventRef']);
      const { scope, rows } = this.#storyCarryScope({ sourceCommitRef: args.sourceCommitRef, ownerId: args.ownerId,
        mindId: args.mindId, sourceBranchId: args.sourceBranchId, memories: args.memories });
      const target = this.#head(args.commitRef);
      if (target.runId !== scope.runId || target.worldTime >= scope.worldTime) sourceError();
      const fork = this.#db.prepare(`SELECT b.request_json FROM domain_story_commit_memberships m
        JOIN domain_story_branches b ON b.branch_id=m.story_branch_id
        WHERE m.commit_ref=? AND b.source_execution_ref=? AND b.policy_ref='owner-mind-source-closure@1'`)
        .get(target.commitRef, scope.commitRef);
      if (!fork) sourceError();
      const request = JSON.parse(fork.request_json);
      // Compare fields rather than object insertion order; never grant refs
      // merely because a caller labels them with an existing source mind.
      const key = row => JSON.stringify([row.recordId, row.ownerMindId, row.originBranchId, row.sourceEventId, row.learnedAt]);
      if (request.actorId !== args.ownerId || request.mindId !== args.mindId
        || JSON.stringify(request.carry.memories.map(key)) !== JSON.stringify(args.memories.map(key))) sourceError();
      const observationIds = new Set(); const recordIds = [];
      for (const row of rows) {
        const ref = JSON.parse(row.ref);
        if (row.type === 'observation') observationIds.add(ref.recordId);
        else {
          recordIds.push(ref.recordId);
          for (const source of this.#db.prepare('SELECT observation_id FROM cognition_record_sources WHERE record_id=?').all(ref.recordId)) observationIds.add(source.observation_id);
        }
      }
      if (observationIds.size > MAX_BATCH || recordIds.length > MAX_BATCH) budgetError();
      this.#checkSources(scope, [...observationIds]);
      const origin = this.#db.prepare('INSERT INTO cognition_story_origins VALUES(?,?,?,?,?,?,?,?,?,?)');
      const mapping = new Map();
      for (const sourceId of observationIds) {
        // Recheck in SQL at the body boundary. Never select from a global corpus.
        const row = this.#db.prepare(`${AUTHORIZED} SELECT o.*,p.source_actor_handle,p.source_relation
          FROM visible_observations v JOIN cognition_observations o ON o.id=v.id AND o.owner_id=$actorId
          LEFT JOIN cognition_observation_performers p ON p.observation_id=o.id WHERE o.id=$id`)
          .get({ ...this.#bindings(scope), $id: sourceId });
        if (!row) sourceError();
        const id = randomUUID(); mapping.set(sourceId, id);
        this.appendObservations({ commitRef: args.commitRef, observations: [{ id, ownerId: args.ownerId,
          eventRef: args.eventRef, text: row.text, channel: row.channel,
          occurredAt: target.worldTime, learnedAt: target.worldTime,
          ...(row.source_actor_handle ? { sourceActorHandle: row.source_actor_handle, sourceRelation: row.source_relation } : {}) }] });
        origin.run(id, 'observation', sourceId, scope.commitRef, args.sourceBranchId, args.ownerId, args.mindId,
          row.occurred_at, row.learned_at, 'owner-mind-source-closure@1');
      }
      for (const sourceId of recordIds) {
        const row = this.#db.prepare(`${AUTHORIZED} SELECT r.id,r.kind,r.summary FROM current_records v
          JOIN cognition_records r ON r.id=v.id AND r.owner_id=$actorId WHERE r.id=$id`)
          .get({ ...this.#bindings(scope), $id: sourceId });
        if (!row) sourceError();
        const ids = this.#db.prepare('SELECT observation_id FROM cognition_record_sources WHERE record_id=?').all(sourceId);
        const id = randomUUID();
        this.appendRecords({ commitRef: args.commitRef, records: [{ id, ownerId: args.ownerId, kind: row.kind,
          summary: row.summary, sourceObservationIds: ids.map(value => mapping.get(value.observation_id)) }] });
        origin.run(id, 'record', sourceId, scope.commitRef, args.sourceBranchId, args.ownerId, args.mindId, null, null, 'owner-mind-source-closure@1');
      }
      return { observationCount: mapping.size, recordCount: recordIds.length };
    });
  }

  appendObservations(input) {
    return this.#operation(true, () => {
      this.#ready();
      const args = object(input, ['commitRef', 'observations']);
      const observations = unique(list(args.observations).map(entry => {
        const row = object(entry, ['id', 'ownerId', 'eventRef', 'text', 'channel', 'occurredAt', 'learnedAt', 'sourceActorHandle', 'sourceRelation'],
          ['ownerId', 'eventRef', 'text', 'channel', 'occurredAt', 'learnedAt']);
        if ((row.sourceActorHandle === undefined) !== (row.sourceRelation === undefined)
          || row.sourceRelation !== undefined && (!['self', 'other'].includes(row.sourceRelation)
            || typeof row.sourceActorHandle !== 'string' || !/^person-[a-f0-9]{16}$/u.test(row.sourceActorHandle))) invalid();
        return { ...(row.sourceActorHandle === undefined ? {} : { sourceActorHandle: identifier(row.sourceActorHandle), sourceRelation: row.sourceRelation }),
          id: identifier(row.id === undefined ? randomUUID() : row.id), ownerId: identifier(row.ownerId), eventRef: identifier(row.eventRef),
          text: text(row.text, 4000), channel: identifier(row.channel, 64), occurredAt: integer(row.occurredAt), learnedAt: integer(row.learnedAt) };
      }), row => row.id);
      withinBudget(observations);
      const scope = this.#head(args.commitRef);
      const event = this.#db.prepare(`${HISTORY} SELECT 1 FROM domain_world_events e JOIN history h
        ON h.commit_ref = e.commit_ref AND h.run_id = e.run_id AND h.branch_id = e.branch_id
        WHERE e.event_ref = $eventRef AND e.run_id = $runId`);
      const insert = this.#db.prepare(`INSERT INTO cognition_observations
        (id, run_id, origin_branch_id, commit_ref, owner_id, event_ref, text, channel, occurred_at, learned_at, revision, origin_generation, schema_version)
        VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`);
      for (const row of observations) {
        if (row.occurredAt > row.learnedAt || row.learnedAt > scope.worldTime) invalid();
        if (!event.get({ $commitRef: scope.commitRef, $runId: scope.runId, $eventRef: row.eventRef })) sourceError();
        try { insert.run(row.id, scope.runId, scope.branchId, scope.commitRef, row.ownerId, row.eventRef,
          row.text, row.channel, row.occurredAt, row.learnedAt, scope.revision, scope.generation); }
        catch { fail('ERR_COGNITION_CONFLICT', '认知记录身份冲突或写入被拒绝。'); }
        if (row.sourceActorHandle !== undefined) this.#db.prepare('INSERT INTO cognition_observation_performers VALUES(?,?,?,1)')
          .run(row.id, row.sourceActorHandle, row.sourceRelation);
      }
      return observations.map(row => this.#project({ type: 'observation', id: row.id, text: row.text, channel: row.channel,
        occurred_at: row.occurredAt, learned_at: row.learnedAt, source_actor_handle: row.sourceActorHandle,
        source_relation: row.sourceRelation }, { ...scope, actorId: row.ownerId }));
    });
  }

  /** Host-only classification at original publication, never new knowledge. */
  appendCaseSources(input) {
    return this.#operation(true, () => {
      this.#ready();
      const args = object(input, ['commitRef', 'sources']); const scope = this.#head(args.commitRef);
      const entries = unique(list(args.sources).map(value => {
        const row = object(value, ['observationId', 'caseRef', 'kind']);
        if (!['experience', 'delivery', 'operation'].includes(row.kind)) invalid();
        return { observationId: identifier(row.observationId), caseRef: identifier(row.caseRef), kind: row.kind };
      }), row => JSON.stringify([row.observationId, row.caseRef]));
      for (const row of entries) {
        if (!this.#db.prepare('SELECT 1 FROM cognition_observations WHERE id=? AND commit_ref=? AND run_id=?')
          .get(row.observationId, scope.commitRef, scope.runId)) sourceError();
        this.#db.prepare('INSERT INTO cognition_case_sources VALUES(?,?,?,1)').run(row.observationId, row.caseRef, row.kind);
      }
      return { sourceCount: entries.length };
    });
  }

  /** Independent mandatory lane: metadata is authorized BEFORE any body read.
   * No search, FTS, world payload, generated summary or limit-based omission. */
  readRequiredCaseObservations(input) {
    return this.#operation(false, () => {
      this.#ready();
      const args = object(input, ['commitRef', 'actorId', 'generation', 'revision', 'caseRef', 'since', 'operationRef', 'requiredObservationIds'],
        ['commitRef', 'actorId', 'generation', 'revision', 'caseRef', 'since']);
      const { commitRef, actorId, generation, revision } = args;
      const scope = this.#readScope({ commitRef, actorId, generation, revision });
      const caseRef = identifier(args.caseRef); const since = integer(args.since);
      const operationRef = args.operationRef === undefined ? null : identifier(args.operationRef);
      if (since > scope.worldTime) invalid();
      const requiredIds = args.requiredObservationIds === undefined || Array.isArray(args.requiredObservationIds) && !isProxy(args.requiredObservationIds)
        && Object.getPrototypeOf(args.requiredObservationIds) === Array.prototype && Reflect.ownKeys(args.requiredObservationIds).length === 1
        && Object.getOwnPropertyDescriptor(args.requiredObservationIds, 'length').value === 0
        ? [] : unique(list(args.requiredObservationIds, MAX_CANDIDATES).map(id => identifier(id)));
      const bindings = { ...this.#bindings(scope), $caseRef: caseRef, $since: since, $operationRef: operationRef,
        $fixedCase: caseRef.startsWith('fixed:') ? 1 : 0, $requiredIds: JSON.stringify(requiredIds) };
      const selected = `${AUTHORIZED}, required_case AS MATERIALIZED (
        SELECT o.id FROM visible_observations v JOIN cognition_observations o ON o.id=v.id
        WHERE o.run_id=$runId AND o.owner_id=$actorId AND (
          o.id IN (SELECT value FROM json_each($requiredIds))
          OR EXISTS(SELECT 1 FROM cognition_case_sources s WHERE s.observation_id=o.id
            AND s.schema_version=1 AND (s.case_ref=$caseRef OR s.case_ref=$operationRef))
          OR ($fixedCase=1 AND o.channel='private_recollection'
            AND EXISTS(SELECT 1 FROM domain_world_events e WHERE e.event_ref=o.event_ref AND e.run_id=o.run_id
              AND e.kind='actor_initial_knowledge' AND e.schema_version=1))
          OR (o.occurred_at >= $since AND o.channel IN ('hearing','reading','sight','self_expression')
            AND EXISTS(SELECT 1 FROM domain_world_events e WHERE e.event_ref=o.event_ref AND e.run_id=o.run_id
              AND e.kind='statement' AND e.schema_version=1))
        ))`;
      const count = this.#db.prepare(`${selected} SELECT count(*) AS count,
        coalesce(sum(length(CAST(o.text AS BLOB))+512),0) AS bytes
        FROM required_case c JOIN cognition_observations o ON o.id=c.id`).get(bindings);
      if (count.count > 128 || count.bytes > MAX_OUTPUT_BYTES) {
        fail('ERR_AGENT_CONTEXT_TOO_LARGE', '本人的必需案件来源超过完整交付预算；未提交任何选票。请保留当前进度并检查上下文预算，不能省略证据后重试投票。');
      }
      const rows = this.#db.prepare(`${selected} SELECT o.id,o.text,o.channel,o.occurred_at,o.learned_at,
        p.source_actor_handle,p.source_relation
        FROM required_case c JOIN cognition_observations o ON o.id=c.id
        JOIN history h ON h.commit_ref=o.commit_ref
        LEFT JOIN cognition_observation_performers p ON p.observation_id=o.id
        ORDER BY h.sequence,o.rowid`).all(bindings);
      return rows.map(row => this.#project({ ...row, type: 'observation' }, scope));
    });
  }

  appendRecords(input) {
    return this.#operation(true, () => {
      this.#ready();
      const args = object(input, ['commitRef', 'records']);
      const records = unique(list(args.records).map(entry => {
        const row = object(entry, ['id', 'ownerId', 'kind', 'summary', 'sourceObservationIds', 'supersedesRef'],
          ['ownerId', 'kind', 'summary', 'sourceObservationIds']);
        if (!KINDS.has(row.kind)) invalid();
        return { id: identifier(row.id === undefined ? randomUUID() : row.id), ownerId: identifier(row.ownerId), kind: row.kind,
          summary: text(row.summary, 1000), sourceObservationIds: sources(row.sourceObservationIds),
          supersedesRef: row.supersedesRef === undefined ? null : identifier(row.supersedesRef) };
      }), row => row.id);
      withinBudget(records);
      const scope = this.#head(args.commitRef);
      const insert = this.#db.prepare(`INSERT INTO cognition_records
        (id, run_id, origin_branch_id, commit_ref, owner_id, kind, summary, supersedes_ref, revision, origin_generation, schema_version)
        VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`);
      const link = this.#db.prepare('INSERT INTO cognition_record_sources(record_id, observation_id) VALUES(?, ?)');
      for (const row of records) {
        const bound = { ...scope, actorId: row.ownerId };
        this.#checkSources(bound, row.sourceObservationIds);
        if (row.supersedesRef !== null) {
          const target = this.#db.prepare(`${AUTHORIZED} SELECT kind FROM current_records WHERE id = $id`).get({
            ...this.#bindings(bound), $id: row.supersedesRef,
          });
          if (!target || target.kind !== row.kind || row.supersedesRef === row.id) sourceError();
        }
        try {
          insert.run(row.id, scope.runId, scope.branchId, scope.commitRef, row.ownerId, row.kind, row.summary,
            row.supersedesRef, scope.revision, scope.generation);
          for (const observationId of row.sourceObservationIds) link.run(row.id, observationId);
        } catch { fail('ERR_COGNITION_CONFLICT', '认知记录身份冲突或写入被拒绝。'); }
      }
      return records.map(row => this.#project({ type: 'record', id: row.id, kind: row.kind, text: row.summary,
        source_ids: JSON.stringify([...row.sourceObservationIds].sort()), supersedes_ref: row.supersedesRef }, { ...scope, actorId: row.ownerId }));
    });
  }

  revokeObservations(input) {
    return this.#operation(true, () => {
      this.#ready();
      const args = object(input, ['commitRef', 'ownerId', 'sourceObservationIds']);
      const ownerId = identifier(args.ownerId); const ids = sources(args.sourceObservationIds);
      withinBudget(ids);
      const scope = this.#head(args.commitRef);
      this.#checkSources({ ...scope, actorId: ownerId }, ids);
      const insert = this.#db.prepare(`INSERT INTO cognition_revocations
        (id, run_id, origin_branch_id, commit_ref, owner_id, observation_id, revision, origin_generation, schema_version)
        VALUES(?, ?, ?, ?, ?, ?, ?, ?, 1)`);
      for (const id of ids) insert.run(randomUUID(), scope.runId, scope.branchId, scope.commitRef, ownerId, id, scope.revision, scope.generation);
      return { revokedObservationIds: [...ids] };
    });
  }

  #dropTemp(name) {
    const row = this.#db.prepare('SELECT type FROM temp.sqlite_schema WHERE name = ?').get(name);
    if (row?.type === 'view') this.#db.exec(`DROP VIEW temp.${name}`);
    else if (row?.type === 'table') this.#db.exec(`DROP TABLE temp.${name}`);
  }

  #discardIndex() { for (const name of INDEX_OBJECTS) this.#dropTemp(name); }

  #withCandidates(scope, operation) {
    this.#dropTemp(CANDIDATES);
    this.#db.exec(`CREATE TEMP TABLE ${CANDIDATES} (
      type TEXT, id TEXT, text TEXT, channel TEXT, kind TEXT, source_ids TEXT,
      occurred_at INTEGER, learned_at INTEGER, supersedes_ref TEXT, source_actor_handle TEXT, source_relation TEXT, sequence INTEGER, ordinal INTEGER
    ) STRICT`);
    try {
      this.#db.prepare(`INSERT INTO temp.${CANDIDATES} ${CANDIDATE_QUERY}`).run(this.#bindings(scope));
      const size = this.#db.prepare(`SELECT count(*) AS count,
        coalesce(sum(length(CAST(text AS BLOB)) + length(CAST(id AS BLOB)) + coalesce(length(CAST(source_ids AS BLOB)), 0) + 256), 0) AS bytes
        FROM temp.${CANDIDATES}`).get();
      if (size.count > MAX_CANDIDATES || size.bytes > MAX_CANDIDATE_BYTES) budgetError();
      return operation();
    } finally { this.#dropTemp(CANDIDATES); }
  }

  /** Complete strict acquisition closure. Metadata only: no body/summary is
   * selected until Domain has validated EVERY owner's closure. */
  durableMemoryMetadata(input) {
    return this.#operation(false, () => {
      this.#ready(); const scope = this.#readScope(input);
      const authorized = cognitionAuthorizationSQL({ strictWatermarks: true, includeRecords: false });
      const bindings = this.#bindings(scope);
      // Malformed acquired rows cannot disappear through strict authorization.
      const malformed = this.#db.prepare(`${HISTORY} SELECT 1 FROM cognition_observations o JOIN history h ON h.commit_ref=o.commit_ref
        WHERE o.owner_id=$actorId AND (o.run_id<>h.run_id OR o.origin_branch_id<>h.branch_id
          OR o.origin_generation<>h.generation OR o.revision<>h.revision OR o.learned_at>h.world_time
          OR o.learned_at>$worldTime OR o.occurred_at>o.learned_at) LIMIT 1`).get(bindings);
      const denied = this.#db.prepare(`${authorized} SELECT 1 FROM acquired_observations a
        WHERE NOT EXISTS(SELECT 1 FROM visible_observations v WHERE v.id=a.id) LIMIT 1`).get(bindings);
      if (malformed || denied) sourceError();
      const rows = this.#db.prepare(`${authorized} SELECT o.id,o.run_id,o.origin_branch_id,o.commit_ref,o.owner_id,
        o.event_ref,o.occurred_at,o.learned_at,length(CAST(o.text AS BLOB)) AS body_bytes
        FROM visible_observations v JOIN cognition_observations o ON o.id=v.id
        WHERE o.owner_id=$actorId AND o.channel<>'institutional_custody_private' ORDER BY o.id COLLATE BINARY LIMIT 129`).all(bindings);
      if (rows.length > 128 || rows.reduce((sum, row) => sum + row.body_bytes, 0) > 128 * 1024) budgetError();
      for (const row of rows) if (!this.#db.prepare(`${HISTORY} SELECT 1 FROM domain_world_events e JOIN history h
        ON h.commit_ref=e.commit_ref AND h.run_id=e.run_id AND h.branch_id=e.branch_id
        WHERE e.event_ref=$eventRef AND e.schema_version=1`).get({ $commitRef: scope.commitRef, $runId: scope.runId, $eventRef: row.event_ref })) sourceError();
      return rows.map(row => ({ ...row }));
    });
  }

  durableMemoryBodies(input, observationIds) {
    return this.#operation(false, () => {
      const scope = this.#readScope(input); idsForDurable(observationIds);
      const authorized = cognitionAuthorizationSQL({ strictWatermarks: true, includeRecords: false });
      const rows = this.#db.prepare(`${authorized} SELECT o.id,o.text,o.channel,o.occurred_at,o.learned_at,
        p.source_actor_handle,p.source_relation FROM visible_observations v JOIN cognition_observations o ON o.id=v.id
        LEFT JOIN cognition_observation_performers p ON p.observation_id=o.id
        WHERE o.owner_id=$actorId AND o.channel<>'institutional_custody_private' AND o.id IN(SELECT value FROM json_each($ids)) ORDER BY o.id`).all({
        ...this.#bindings(scope), $ids: JSON.stringify(observationIds) });
      if (rows.length !== observationIds.length) sourceError();
      return rows;
    });
  }

  /** Operational delivery evidence never changes owned cognition. Canceled
   * same-head jobs cannot consume a new task's required acquisition lane. */
  durablePending(input, { ignoreDelivery = false } = {}) {
    return this.#operation(false, () => {
      const scope = this.#readScope(input), bindings = this.#bindings(scope);
      const acquisitions = this.#db.prepare(`${HISTORY} SELECT a.acquisition_id,a.plan_json
        FROM domain_durable_acquisitions a JOIN history h ON h.commit_ref=a.commit_ref
        AND h.run_id=a.run_id AND h.branch_id=a.branch_id ORDER BY h.sequence`).all({
        $commitRef: scope.commitRef, $runId: scope.runId });
      const manifest = [], all = new Set();
      for (const acquisition of acquisitions) {
        const plan = JSON.parse(acquisition.plan_json);
        const recipient = plan.recipientClosure.find(row => row.recipientMindId === `mind:${scope.actorId}`);
        if (!recipient) continue;
        const delivered = this.#db.prepare(`${HISTORY} SELECT r.*,t.input_json,t.input_hash,t.result_json,t.result_hash,j.status
          FROM domain_durable_delivery_receipts r JOIN history h ON h.commit_ref=r.delivery_commit_ref
          JOIN agent_turn_tasks t ON t.job_id=r.job_id AND t.slot=r.slot
          JOIN agent_turn_jobs j ON j.job_id=t.job_id
          WHERE r.acquisition_id=$acquisition AND r.recipient_mind_id=$mind AND j.status='committed'
          AND t.input_hash=r.task_input_hash AND t.result_json IS NOT NULL
          AND t.actor_id=$owner AND j.branch_id=h.branch_id AND j.generation=h.generation AND j.base_revision=h.revision`).all({ $commitRef: scope.commitRef, $runId: scope.runId,
          $acquisition: acquisition.acquisition_id, $mind: recipient.recipientMindId, $owner: scope.actorId });
        // This receipt is an immutable INPUT RESERVATION, not a provider read
        // acknowledgement. Only a committed actual task/result discharges it.
        // Pending/running/failed/cancelled jobs retain the mandatory lane;
        // exact retries reuse their already immutable full task input.
        if (!ignoreDelivery && delivered.some(row => createHash('sha256').update(row.input_json).digest('hex') === row.input_hash
          && createHash('sha256').update(row.result_json).digest('hex') === row.result_hash)) continue;
        const copies = this.#db.prepare(`SELECT observation_id FROM cognition_durable_origins
          WHERE acquisition_id=? AND recipient_mind_id=? ORDER BY observation_id`).all(acquisition.acquisition_id, recipient.recipientMindId);
        if (copies.length !== recipient.acquireObservationIds.length) sourceError();
        const observationIds = [...recipient.selfCoveredObservationIds, ...copies.map(row => row.observation_id)].sort();
        manifest.push({ acquisitionId: acquisition.acquisition_id, observationIds });
        observationIds.forEach(id => all.add(id));
      }
      if (all.size > 128) budgetError();
      const rows = this.#db.prepare(`${AUTHORIZED} SELECT o.id,o.text,o.channel,o.occurred_at,o.learned_at,
        p.source_actor_handle,p.source_relation FROM visible_observations v JOIN cognition_observations o ON o.id=v.id AND o.owner_id=$actorId
        LEFT JOIN cognition_observation_performers p ON p.observation_id=o.id
        WHERE o.id IN(SELECT value FROM json_each($ids)) ORDER BY o.id`).all({ ...bindings, $ids: JSON.stringify([...all]) });
      if (rows.length !== all.size) sourceError();
      return withinBudget({ requiredDurableAcquisitionObservations: rows.map(row => this.#project({ ...row, type: 'observation' }, scope)),
        durableAcquisitionManifest: manifest }, 128 * 1024);
    });
  }

  /** HOST channel metadata only. Domain calls this AFTER law/acquisition
   * authorization. No text/summary, retrieval candidates or foreign handles.
   * A partial effective closure is never silently advertised as complete. */
  memoryChannelMetadata(input) {
    return this.#operation(false, () => {
      this.#ready();
      const scope = this.#readScope(input); const bindings = this.#bindings(scope);
      const denied = this.#db.prepare(`${AUTHORIZED}
        SELECT 1 FROM acquired_observations a WHERE NOT EXISTS(
          SELECT 1 FROM visible_observations v WHERE v.id=a.id) LIMIT 1`).get(bindings);
      if (denied) sourceError();
      const rows = this.#db.prepare(`${AUTHORIZED}
        SELECT o.id,o.learned_at FROM visible_observations v
        JOIN cognition_observations o ON o.id=v.id AND o.owner_id=$actorId
        WHERE o.channel<>'institutional_custody_private' ORDER BY o.id COLLATE BINARY LIMIT 129`).all(bindings);
      if (rows.length > MAX_BATCH) budgetError();
      // Observation IDs are legitimate core memory IDs. The frozen publisher
      // independently re-expands their SQL source closure and effective ACL.
      return rows.map(row => ({ id: row.id, ownerId: scope.actorId,
        learnedAt: row.learned_at, sourceObservationIds: [row.id], accessible: true }));
    });
  }

  /** Project inherited authority to the CURRENT head's packet boundary. */
  read(input) {
    return this.#operation(false, () => {
      this.#ready();
      const scope = this.#readScope(input);
      return this.#withCandidates(scope, () => {
        const counts = this.#db.prepare(`SELECT type, count(*) AS count FROM temp.${CANDIDATES} GROUP BY type`).all();
        if (counts.some(row => row.count > MAX_BATCH)) budgetError();
        const rows = this.#db.prepare(`SELECT * FROM temp.${CANDIDATES} ORDER BY type COLLATE BINARY, id COLLATE BINARY`).all();
        const observations = rows.filter(row => row.type === 'observation').map(row => this.#project(row, scope));
        const currentRecords = rows.filter(row => row.type === 'record').map(row => this.#project(row, scope));
        return withinBudget({ scope: { actorId: scope.actorId, branchId: scope.branchId, generation: scope.generation, revision: scope.revision },
          observations, currentRecords, memories: currentRecords.filter(row => row.kind === 'memory').map(row => ({ ...row, sourceObservationIds: [...row.sourceObservationIds] })) }, MAX_OUTPUT_BYTES);
      });
    });
  }

  #ranked(scope, preferRecords = false) {
    try { this.#discardIndex(); } catch { /* Derived state is never authoritative. */ }
    const tieOrder = preferRecords ? 'DESC' : 'ASC';
    const tie = (a, b) => (preferRecords ? -1 : 1) * Buffer.compare(Buffer.from(a.type), Buffer.from(b.type))
      || Buffer.compare(Buffer.from(a.id), Buffer.from(b.id));
    // This is the FIRST text read into JS. The SQL-authorized temp relation has
    // already enforced ancestry/run/owner/time/revocation/source closure AND
    // the unchanged 4096-row / 4 MiB budgets. Never fetch a global corpus here.
    const candidates = this.#db.prepare(`SELECT rowid AS search_rowid, * FROM temp.${CANDIDATES}
      ORDER BY type COLLATE BINARY ${tieOrder}, id COLLATE BINARY`).all();
    const query = prepareRecallQuery(scope.query, this.#aliases);
    const projected = []; let projectionBytes = 0;
    for (const row of candidates) {
      const document = projectRecallText(row.text, this.#aliases);
      projectionBytes += Buffer.byteLength(document.text) + Buffer.byteLength(row.id)
        + Buffer.byteLength(row.source_ids ?? '') + 256;
      if (projectionBytes > MAX_CANDIDATE_BYTES) budgetError();
      projected.push({ row, document });
    }
    const eligible = projected.flatMap(({ row, document }) => {
      const relevance = scoreRecallText(query, document);
      return relevance.eligible ? [{ ...row, ...relevance }] : [];
    });
    // Short queries keep literal membership, zero scores and source-key ties;
    // notably short actor aliases expand identity, never arbitrary characters.
    if (query.short) return eligible.sort(tie).slice(0, scope.limit).map(row => ({ ...row, score: 0 }));
    const ftsScores = new Map();
    try {
      this.#discardIndex();
      if (query.ftsQuery) {
        this.#db.exec(`CREATE VIRTUAL TABLE temp.${FTS} USING fts5(text, tokenize='trigram')`);
        this.#db.exec(`ALTER TABLE temp.${CANDIDATES} ADD COLUMN search_text TEXT`);
        const update = this.#db.prepare(`UPDATE temp.${CANDIDATES} SET search_text = ? WHERE rowid = ?`);
        for (const { row, document } of projected) update.run(document.text, row.search_rowid);
        this.#db.exec(`INSERT INTO temp.${FTS}(rowid, text)
          SELECT rowid, search_text FROM temp.${CANDIDATES} ORDER BY rowid`);
        // Multi-term MATCH is generated from bounded, individually quoted data;
        // BM25 sees only this snapshot's authorized, normalized projection.
        for (const row of this.#db.prepare(`SELECT rowid AS search_rowid, bm25(${FTS}) AS score
          FROM temp.${FTS} WHERE ${FTS} MATCH ? ORDER BY score, rowid LIMIT ${MAX_CANDIDATES}`)
          .all(query.ftsQuery)) ftsScores.set(row.search_rowid, row.score);
      }
    } catch { ftsScores.clear(); /* Lexical/character scoring needs no FTS extension. */ }
    finally {
      try { this.#discardIndex(); } catch { /* Never reuse a broken index. */ }
    }
    // Independent lexical gates run BEFORE fusion. No FTS score or character
    // similarity can admit an unrelated/ambiguous/actor-mismatched row. Literal
    // matches survive unsupported scripts, bounded expansion, or missing FTS.
    return fuseRecallRanks(eligible, ftsScores).sort((a, b) => a.score - b.score || tie(a, b)).slice(0, scope.limit);
  }

  /** Scoped lexical/character recall. No caller MATCH syntax or global stats. */
  search(input) {
    return this.#operation(false, () => {
      this.#ready();
      const scope = this.#readScope(input, true);
      if (scope.limit > 64 || Buffer.byteLength(scope.query, 'utf8') > 1024) invalid();
      return this.#withCandidates(scope, () => withinBudget(this.#ranked(scope)
        .map(row => ({ type: row.type, ...this.#project(row, scope), score: row.score })), MAX_OUTPUT_BYTES));
    });
  }

  #experience(scope) {
    // Read ONLY source metadata joined through the already-authorized own
    // observations. World text, audience lists, snapshots and other owners'
    // event bodies never enter JS or the derived lexical corpus.
    const metadata = `SELECT c.*, e.kind AS event_kind,
      json_extract(CASE WHEN json_valid(e.payload) THEN e.payload ELSE '{}' END, '$.actorId') AS activity_actor,
      json_extract(CASE WHEN json_valid(e.payload) THEN e.payload ELSE '{}' END, '$.from') AS activity_from,
      json_extract(CASE WHEN json_valid(e.payload) THEN e.payload ELSE '{}' END, '$.to') AS activity_to,
      json_extract(CASE WHEN json_valid(e.payload) THEN e.payload ELSE '{}' END, '$.speakerId') AS speaker_id,
      json_extract(CASE WHEN json_valid(e.payload) THEN e.payload ELSE '{}' END, '$.delivery') AS delivery,
      json_extract(CASE WHEN json_valid(e.payload) THEN e.payload ELSE '{}' END, '$.sourceFormat') AS source_format
      FROM temp.${CANDIDATES} c JOIN cognition_observations o ON o.id = c.id
        AND o.run_id = $runId AND o.owner_id = $actorId
      JOIN domain_world_events e ON e.event_ref = o.event_ref AND e.run_id = o.run_id
      WHERE c.type = 'observation' AND e.schema_version = 1`;
    const bindings = { $runId: scope.runId, $actorId: scope.actorId };
    const rows = (predicate, limit) => this.#db.prepare(`WITH metadata AS (${metadata}) SELECT * FROM metadata
      WHERE ${predicate} ORDER BY sequence DESC, ordinal DESC LIMIT ${limit}`).all(bindings);
    const activities = rows(`event_kind = 'prison_activity' AND activity_actor = $actorId
      AND channel = 'sight' AND typeof(activity_from) = 'text' AND typeof(activity_to) = 'text'
      AND activity_from <> activity_to`, MAX_EXPERIENCE_MOVES);
    const actions = rows(`event_kind = 'statement' AND source_format = 'fixture-delivery'
      AND speaker_id = $actorId AND delivery = 'action' AND channel = 'self_expression'`, MAX_EXPERIENCE_ACTIONS)
      // Exact reducer-produced travel forms, not speech/writing, lexical
      // similarity, or an inferred belief about whether a door must be open.
      .filter(row => /^(?:[^。\n]{1,160}由[^。\n]{1,40}走向[^。\n]{1,40}|你沿通路来到[^。\n]{1,40}|你依照原先明确的跟随打算，走到[^。\n]{1,40})。$/u.test(row.text));
    const order = (left, right) => right.sequence - left.sequence || right.ordinal - left.ordinal;
    const moves = [...activities, ...actions].sort(order).slice(0, MAX_EXPERIENCE_MOVES);
    const notice = rows(`event_kind = 'statement' AND source_format = 'fixture-delivery'
      AND speaker_id = 'warden' AND delivery = 'speech' AND channel = 'hearing'`, 1);
    return [...moves, ...notice].sort((left, right) => -order(left, right));
  }

  #relationshipSources(scope) {
    if (!this.#db.prepare("SELECT 1 FROM sqlite_schema WHERE type='table' AND name='domain_setups'").get()) return null;
    const revision = this.#db.prepare(`SELECT json_extract(s.manifest,'$.executionRevision.revisionId') AS id
      FROM domain_runs r JOIN domain_setups s ON s.run_id=r.run_id AND s.setup_ref=r.initial_setup_ref WHERE r.run_id=?`).get(scope.runId);
    if (!isRelationshipRuntime(revision?.id)) return null;
    const run = this.#db.prepare('SELECT * FROM domain_runs WHERE run_id=?').get(scope.runId);
    const root = this.#db.prepare(`${HISTORY} SELECT c.* FROM history h JOIN domain_commits c USING(commit_ref)
      WHERE h.parent_commit_ref IS NULL AND h.sequence=0`).get({ $commitRef: scope.commitRef, $runId: scope.runId });
    const setup = run && this.#db.prepare('SELECT * FROM domain_setups WHERE setup_ref=? AND run_id=?').get(run.initial_setup_ref, scope.runId);
    const verified = relationshipRootForRows({ run, root, setup });
    if (!verified.setup.actors.some(actor => actor.id === scope.actorId)) sourceError();
    const blueprint = relationshipOwnerBlueprint(verified.setup, scope.actorId, verified.context);
    const expected = blueprint.observations.filter(row => row.source.ruleVersion === RELATIONSHIP_SOURCE_VERSION
      && Number.isSafeInteger(row.source.entryIndex));
    // Owner/run/ancestor/root birth metadata is authorized BEFORE body reads.
    const metadata = this.#db.prepare(`${HISTORY} SELECT o.id,o.owner_id,o.event_ref,o.channel,o.occurred_at,o.learned_at
      FROM cognition_observations o JOIN history h ON h.commit_ref=o.commit_ref AND h.run_id=o.run_id AND h.branch_id=o.origin_branch_id
      WHERE o.owner_id=$actorId AND o.commit_ref=$rootRef AND o.run_id=$runId AND o.origin_generation=h.generation
        AND o.revision=h.revision AND o.schema_version=1 AND o.learned_at<=$worldTime
        AND o.id IN (SELECT value FROM json_each($ids))`).all({ ...this.#bindings(scope),
          $rootRef: root.commit_ref, $ids: JSON.stringify(expected.map(row => row.id)) });
    if (metadata.length !== expected.length) sourceError();
    const events = new Map();
    for (const row of metadata) {
      const source = expected.find(entry => entry.id === row.id);
      if (!source || row.owner_id !== scope.actorId || row.channel !== 'private_recollection' || row.occurred_at !== 0 || row.learned_at !== 0) sourceError();
      let event = events.get(row.event_ref);
      if (!event) {
        const stored = this.#db.prepare(`SELECT kind,payload,payload_hash FROM domain_world_events
          WHERE event_ref=? AND commit_ref=? AND run_id=? AND branch_id=? AND schema_version=1`).get(row.event_ref, root.commit_ref, scope.runId, root.branch_id);
        if (!stored || stored.kind !== 'actor_psychology_initialization' || sha256(stored.payload) !== stored.payload_hash) sourceError();
        event = JSON.parse(stored.payload);
        if (event.ownerId !== scope.actorId || !Array.isArray(event.sources)
          || event.profileFingerprint !== verified.setup.runtime.psychology.fingerprint
          || relationshipCanonicalJson(event.revision) !== relationshipCanonicalJson(verified.setup.runtime.executionRevision)) sourceError();
        events.set(row.event_ref, event);
      }
      const matches = event.sources.filter(entry => entry.observationId === row.id);
      if (matches.length !== 1) sourceError();
      const { observationId, ...locator } = matches[0];
      if (relationshipCanonicalJson(locator) !== relationshipCanonicalJson(source.source)) sourceError();
    }
    const visible = this.#db.prepare(`${AUTHORIZED} SELECT id FROM visible_observations WHERE id IN (SELECT value FROM json_each($ids))`)
      .all({ ...this.#bindings(scope), $ids: JSON.stringify(expected.map(row => row.id)) });
    const visibleIds = new Set(visible.map(row => row.id));
    const entries = expected.filter(row => visibleIds.has(row.id)).map(row => ({ ...row,
      entryIndex: row.source.entryIndex, actorIds: verified.setup.creation.relationships[row.source.entryIndex].actorIds }));
    const initialRunPolicy = composeInitialRunPolicy({ creation: verified.snapshot.creation, runId: scope.runId,
      setupRef: run.initial_setup_ref, executionRevision: verified.setup.runtime.executionRevision });
    return { ...verified, entries, ids: visibleIds, initialRunPolicy };
  }
  #publishedRelationshipActions(scope) {
    const fields = `json_extract(c.snapshot_json,'$.agentActions[#-1].jobId') AS job_id,
      json_extract(c.snapshot_json,'$.agentActions[#-1].sceneBeatVersion') AS scene_version,
      json_extract(c.snapshot_json,'$.agentActions[#-1].intent.targetId') AS target_id`;
    const actionMatch = `EXISTS(SELECT 1 FROM json_each(c.snapshot_json,'$.turnIds') t WHERE t.value=a.turn_ref)`;
    const columns = `a.actor_id,a.turn_ref,a.commit_ref`;
    const ancestry = `FROM history h JOIN domain_commits c USING(commit_ref) JOIN domain_actions a USING(commit_ref)
      WHERE a.run_id=$runId AND c.kind='act' AND c.world_time<=$worldTime`;
    const bindings = { $commitRef:scope.commitRef, $runId:scope.runId, $worldTime:scope.worldTime };
    const memo = this.#relationshipDisplayActions;
    if (!memo) return this.#db.prepare(`${HISTORY} SELECT ${columns},${fields} ${ancestry} AND ${actionMatch}
      ORDER BY h.depth DESC`).all(bindings);
    // Always re-read the full current commit path and published action IDs.
    // Only immutable commit content is reused; owner/task/source validation
    // in #relationshipPrefix still runs below for every exact request.
    const actions = this.#db.prepare(`${HISTORY} SELECT ${columns} ${ancestry} ORDER BY h.depth DESC`).all(bindings);
    const read = this.#db.prepare(`SELECT ${fields} FROM domain_commits c JOIN domain_actions a USING(commit_ref)
      WHERE c.commit_ref=? AND a.turn_ref=? AND ${actionMatch}`);
    const finiteId = value => value === null || typeof value === 'string' && value.length <= 128 && /^[a-z0-9_:@.-]+$/iu.test(value);
    const projected = [];
    for (const action of actions) {
      const key = JSON.stringify([action.commit_ref, action.turn_ref]);
      let row = memo.get(key);
      if (row === undefined) {
        row = read.get(action.commit_ref, action.turn_ref);
        if (!row) continue;
        if (memo.size < 192 && finiteId(action.commit_ref) && finiteId(action.turn_ref)
          && finiteId(row.job_id) && finiteId(row.target_id) && (row.scene_version === null || Number.isSafeInteger(row.scene_version))) memo.set(key, row);
      }
      projected.push({ ...action, ...row });
    }
    return projected;
  }
  #relationshipPrefix(scope, library) {
    // Only actual published narrative ancestors count. Completed provider calls,
    // unattached stages and abandoned/future branches cannot move this ordinal.
    const actions = this.#publishedRelationshipActions(scope);
    let ordinal = 0; const targetIds = [], adopted = new Set(), perJob = new Map(), consumedOwnerJobs = new Set();
    for (const action of actions) {
      if (action.actor_id === scope.actorId) {
        const key = typeof action.job_id === 'string' ? `job:${action.job_id}` : `turn:${action.turn_ref}`;
        if (!consumedOwnerJobs.has(key)) { consumedOwnerJobs.add(key); ordinal++; }
        targetIds.length = 0;
        if (library.setup.actors.some(actor => actor.id === action.target_id && actor.id !== scope.actorId)) targetIds.push(action.target_id);
        continue;
      }
      if (action.scene_version !== 1 || typeof action.job_id !== 'string') continue;
      // An independently validated owner snapshot is published only for an
      // actually considered owner journal, never an unplayed interrupted sibling.
      if (!this.#db.prepare(`SELECT 1 FROM cognition_decision_states WHERE commit_ref=? AND run_id=? AND owner_id=?`)
        .get(action.commit_ref, scope.runId, scope.actorId)) continue;
      // SQL selects ONLY this owner's adopted decisions, not other NPC prose.
      const decisions = this.#db.prepare(`SELECT json_extract(b.value,'$.beat') AS beat,
        json_extract(d.value,'$.proposal') AS proposal_json FROM domain_commits c,
        json_each(c.snapshot_json,'$.agentActions[#-1].beats') b,json_each(b.value,'$.decisions') d
        WHERE c.commit_ref=? AND c.run_id=? AND json_extract(d.value,'$.actorId')=? ORDER BY b.key`)
        .all(action.commit_ref, scope.runId, scope.actorId);
      for (const decision of decisions) {
        const slot = `npc:${decision.beat}:${scope.actorId}`, adoptedKey = `${action.job_id}:${slot}`;
        const metadata = this.#db.prepare(`SELECT input_hash,result_hash FROM agent_turn_tasks
          WHERE job_id=? AND slot=? AND actor_id=? AND role='roleplay'`).get(action.job_id, slot, scope.actorId);
        if (!metadata?.input_hash || !metadata.result_hash) sourceError();
        const task = this.#db.prepare(`SELECT input_json,result_json FROM agent_turn_tasks
          WHERE job_id=? AND slot=? AND actor_id=? AND role='roleplay'`).get(action.job_id, slot, scope.actorId);
        if (!task || sha256(task.input_json) !== metadata.input_hash || sha256(task.result_json) !== metadata.result_hash) sourceError();
        const input = JSON.parse(task.input_json), result = JSON.parse(task.result_json), proposal = JSON.parse(decision.proposal_json);
        if (input.id !== slot || input.actorId !== scope.actorId || input.role !== 'roleplay'
          || input.context?.scope?.actorId !== scope.actorId || input.context.relationshipContextVersion !== 1
          || relationshipCanonicalJson(result) !== relationshipCanonicalJson(proposal)
          || input.context.initialRunPolicy?.source?.runId !== scope.runId
          || input.context.initialRunPolicy?.source?.setupRef !== library.context.setupRef) sourceError();
        if (relationshipCanonicalJson(relationshipPacketPolicy(input.context, input.context.initialRunPolicy).executionRevision)
          !== relationshipCanonicalJson(library.setup.runtime.executionRevision)) sourceError();
        const plan = this.#db.prepare(`SELECT json_extract(context_json,'$.jobId') AS job_pin,
          json_extract(context_json,'$.executionRevision.revisionId') AS revision_pin,
          json_extract(context_json,'$.executionRevision') AS execution_pin,
          json_extract(context_json,'$.initialRunPolicy.source.runId') AS run_pin
          FROM agent_turn_jobs WHERE job_id=?`).get(action.job_id);
        if (!plan || plan.job_pin !== action.job_id || plan.revision_pin !== library.setup.runtime.executionRevision.revisionId || plan.run_pin !== scope.runId) sourceError();
        if (hasIntentRuntime(library.setup.runtime.id)
          && relationshipCanonicalJson(JSON.parse(plan.execution_pin)) !== relationshipCanonicalJson(library.setup.runtime.executionRevision)) sourceError();
        if (adopted.has(adoptedKey)) continue;
        const count = (perJob.get(action.job_id) ?? 0) + 1;
        if (count > library.setup.runtime.policy.sceneBudget.perActor) sourceError();
        perJob.set(action.job_id, count); adopted.add(adoptedKey);
        const key = `job:${action.job_id}`;
        if (!consumedOwnerJobs.has(key)) { consumedOwnerJobs.add(key); ordinal++; }
        targetIds.length = 0; targetIds.push(action.actor_id);
      }
    }
    return { ordinal, targetIds };
  }

  /** One snapshot for recent perception, ranked recall AND source closure.
   * Does not read the full history into JS or require read()'s 128-row cap.
   * Ordering is narrative commit sequence + insertion order, never random IDs
   * or the projected revision (inherited rows all have the CURRENT revision).
   */
  retrieve(input) {
    return this.#operation(false, () => {
      this.#ready();
      const args = object(input, ['commitRef', 'actorId', 'generation', 'revision', 'query', 'recentLimit', 'recallLimit', 'continuityLimit', 'includeBackground', 'requiredObservationIds'],
        ['commitRef', 'actorId', 'generation', 'revision']);
      const { commitRef, actorId, generation, revision } = args;
      const scope = this.#readScope({ commitRef, actorId, generation, revision });
      const query = args.query === undefined ? '' : args.query;
      if (typeof query !== 'string' || query.length > 256 || !query.isWellFormed() || query.includes('\0')) invalid();
      const recentLimit = integer(args.recentLimit === undefined ? 6 : args.recentLimit, 1);
      const recallLimit = integer(args.recallLimit === undefined ? 12 : args.recallLimit);
      const continuityLimit = integer(args.continuityLimit === undefined ? 0 : args.continuityLimit);
      const includeBackground = args.includeBackground === undefined ? false : args.includeBackground;
      const requiredIds = args.requiredObservationIds === undefined
        || (Array.isArray(args.requiredObservationIds) && !isProxy(args.requiredObservationIds)
          && Object.getPrototypeOf(args.requiredObservationIds) === Array.prototype
          && Reflect.ownKeys(args.requiredObservationIds).length === 1 && args.requiredObservationIds.length === 0)
        ? [] : unique(list(args.requiredObservationIds, 16).map(id => identifier(id)));
      if (typeof includeBackground !== 'boolean' || recentLimit > 32 || recallLimit > 32 || continuityLimit > 8 || recallLimit + continuityLimit > 32) invalid();
      const library = this.#relationshipSources(scope);
      const relationshipIds = library?.ids ?? new Set(), excludedIds = JSON.stringify([...relationshipIds]);
      return this.#withCandidates(scope, () => {
        if (library) for (const expected of library.entries) {
          const actual = this.#db.prepare(`SELECT text,channel FROM temp.${CANDIDATES} WHERE type='observation' AND id=?`).get(expected.id);
          if (!actual || actual.channel !== 'private_recollection' || actual.text !== expected.text || sha256(actual.text) !== expected.source.sha256) sourceError();
        }
        const prefix = library ? this.#relationshipPrefix(scope, library) : null;
        const selected = library ? selectRelationshipWindow(library.entries, prefix) : [];
        const relationshipRows = selected.map(entry => this.#db.prepare(`SELECT * FROM temp.${CANDIDATES} WHERE type='observation' AND id=?`).get(entry.id));
        const experience = this.#experience(scope);
        const requiredSourceIds = new Set([...requiredIds, ...experience.map(row => row.id)]);
        const required = this.#db.prepare(`SELECT * FROM temp.${CANDIDATES}
          WHERE type = 'observation' AND id IN (SELECT value FROM json_each(?)) ORDER BY sequence,ordinal`).all(JSON.stringify([...requiredSourceIds]));
        if (required.length !== requiredSourceIds.size) sourceError();
        const recent = this.#db.prepare(`SELECT * FROM temp.${CANDIDATES} WHERE type = 'observation'
          AND id NOT IN (SELECT value FROM json_each(?))
          ORDER BY sequence DESC, ordinal DESC LIMIT ?`).all(excludedIds, recentLimit).reverse();
        // Effect-bound acquisition has a delivery obligation, not merely a
        // lexical recall candidate. Read only this recipient's already SQL-
        // authorized candidate bodies. The latest sealed channel's whole
        // owner-local closure is indivisible; an oversized packet fails closed.
        if (this.#db.prepare("SELECT 1 FROM sqlite_schema WHERE type='table' AND name='domain_memory_channels'").get()) {
          const acquired = this.#db.prepare(`${HISTORY}
            SELECT c.* FROM temp.${CANDIDATES} c JOIN magic_cognition_origins o ON o.observation_id=c.id
            WHERE c.type='observation' AND o.owner_id=$actorId AND o.commit_ref=(
              SELECT a.commit_ref FROM domain_memory_channels a JOIN history h ON h.commit_ref=a.commit_ref
              JOIN magic_cognition_origins own ON own.commit_ref=a.commit_ref AND own.owner_id=$actorId
              ORDER BY h.depth LIMIT 1)
            ORDER BY c.sequence,c.ordinal LIMIT 129`).all({ $commitRef: scope.commitRef, $runId: scope.runId, $actorId: scope.actorId });
          if (acquired.length > 128) budgetError();
          const existing = new Set(recent.map(row => row.id));
          for (const row of acquired) if (!existing.has(row.id)) { recent.push(row); existing.add(row.id); }
          if (recent.length > 128) budgetError();
        }
        const background = includeBackground ? this.#db.prepare(`SELECT * FROM temp.${CANDIDATES}
          WHERE type = 'observation' AND channel = 'private_recollection' AND id NOT IN (SELECT value FROM json_each(?))
          ORDER BY sequence, ordinal LIMIT 33`).all(excludedIds) : [];
        if (background.length > 32) budgetError(); // Never silently forget authored personal constraints.
        const ranked = query.trim() && recallLimit ? this.#ranked({ ...scope, query: query.trim(), limit: recallLimit }, true)
          .filter(row => row.type !== 'observation' || !relationshipIds.has(row.id)) : [];
        // A literal topic miss must not erase interpersonal continuity. Reserve
        // a small independent tail of already-adopted own cognition; never
        // synthesize a new belief or query another actor to fill this lane.
        const continuity = this.#db.prepare(`SELECT * FROM temp.${CANDIDATES} WHERE type = 'record'
          ORDER BY sequence DESC, ordinal DESC LIMIT ?`).all(continuityLimit);
        const selectedRecords = new Set(ranked.filter(row => row.type === 'record').map(row => row.id));
        for (const row of continuity) {
          if (!selectedRecords.has(row.id)) { ranked.push(row); selectedRecords.add(row.id); }
        }
        const ids = new Set([...requiredSourceIds, ...selected.map(row => row.id)]);
        for (const row of ranked) {
          if (row.type === 'observation') ids.add(row.id);
          else for (const id of JSON.parse(row.source_ids)) ids.add(id);
        }
        const sources = this.#db.prepare(`SELECT * FROM temp.${CANDIDATES}
          WHERE type = 'observation' AND id IN (SELECT value FROM json_each(?))
          ORDER BY sequence, ordinal`).all(JSON.stringify([...ids]));
        if (sources.length !== ids.size) sourceError();
        const project = row => this.#project(row, scope);
        return withinBudget({ scope: { actorId: scope.actorId, branchId: scope.branchId,
          generation: scope.generation, revision: scope.revision },
        ...(library ? { relationshipContextVersion: 1, executionRevision: library.setup.runtime.executionRevision,
          initialRunPolicy: library.initialRunPolicy, relationshipObservations: relationshipRows.map(project),
          relationshipWindow: { ordinal: prefix.ordinal, entryIndexes: selected.map(row => row.entryIndex) } } : {}),
        recentObservations: recent.map(project),
        ...(args.requiredObservationIds === undefined && !required.length ? {} : { requiredObservations: required.map(project) }),
        ...(includeBackground ? { backgroundObservations: background.map(project) } : {}),
        recall: ranked.map(row => ({ type: row.type, ...project(row), score: row.score })),
        sourceObservations: sources.map(project) }, MAX_OUTPUT_BYTES);
      });
    });
  }

  /** There is no persisted global corpus. Next search builds a fresh own corpus. */
  rebuildIndex() {
    return this.#operation(true, () => {
      this.#ready();
      this.#discardIndex();
      this.#dropTemp(CANDIDATES);
      return { indexVersion: VERSION, persistentIndex: false };
    });
  }
}

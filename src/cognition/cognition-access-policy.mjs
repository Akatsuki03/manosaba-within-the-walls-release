// Shared SQL authority only: no database handle, text reads or model calls.
// All clients bind the effective narrative head and its story clock.
export const COGNITION_HISTORY_SQL = `WITH RECURSIVE history AS (
  SELECT commit_ref,parent_commit_ref,run_id,branch_id,generation,revision,world_time,sequence,0 AS depth
  FROM domain_commits WHERE commit_ref=$commitRef AND run_id=$runId
  UNION ALL
  SELECT p.commit_ref,p.parent_commit_ref,p.run_id,p.branch_id,p.generation,p.revision,p.world_time,p.sequence,h.depth+1
  FROM domain_commits p JOIN history h ON p.commit_ref=h.parent_commit_ref
  WHERE p.run_id=$runId AND h.depth<4096
)`;

export const MAGIC_COGNITION_TABLES = Object.freeze({
  magic_cognition_schema: ['version'],
  magic_cognition_access: ['id','run_id','origin_branch_id','commit_ref','owner_id','mind_id','observation_id','effect_id','access_mode','effect_status','starts_at','ends_at','sequence','schema_version'],
  magic_cognition_origins: ['observation_id','commit_ref','owner_id','mind_id','source_observation_id','source_owner_id','source_mind_id','effect_id','source_commit_ref','schema_version'],
});
const definitions = {
  magic_cognition_schema: 'version INTEGER NOT NULL CHECK(version=1)',
  magic_cognition_access: `id TEXT PRIMARY KEY,run_id TEXT NOT NULL,origin_branch_id TEXT NOT NULL,
    commit_ref TEXT NOT NULL REFERENCES domain_commits(commit_ref),owner_id TEXT NOT NULL,mind_id TEXT NOT NULL,
    observation_id TEXT NOT NULL REFERENCES cognition_observations(id),effect_id TEXT NOT NULL,
    access_mode TEXT NOT NULL CHECK(access_mode IN ('blocked','restored')),
    effect_status TEXT NOT NULL CHECK(effect_status IN ('active','suppressed','ended')),
    starts_at INTEGER NOT NULL CHECK(starts_at>=0),ends_at INTEGER CHECK(ends_at IS NULL OR ends_at>=starts_at),
    sequence INTEGER NOT NULL CHECK(sequence>=0),schema_version INTEGER NOT NULL CHECK(schema_version=1),
    UNIQUE(commit_ref,owner_id,observation_id,effect_id)`,
  magic_cognition_origins: `observation_id TEXT PRIMARY KEY REFERENCES cognition_observations(id),
    commit_ref TEXT NOT NULL REFERENCES domain_commits(commit_ref),owner_id TEXT NOT NULL,mind_id TEXT NOT NULL,
    source_observation_id TEXT NOT NULL REFERENCES cognition_observations(id),source_owner_id TEXT NOT NULL,source_mind_id TEXT NOT NULL,
    effect_id TEXT NOT NULL,source_commit_ref TEXT NOT NULL REFERENCES domain_commits(commit_ref),schema_version INTEGER NOT NULL CHECK(schema_version=1)`,

};
const schemaFailure = () => { throw Object.assign(new Error('魔法认知访问仓储结构不受支持。'), { code: 'ERR_COGNITION_SCHEMA' }); };
export function initializeMagicCognitionSchema(db) {
  if (!db.isTransaction) throw Object.assign(new Error('认知写入必须位于调用方事务中。'), { code: 'ERR_COGNITION_TRANSACTION' });
  const normalized = sql => sql.replace(/\s+/gu,' ').trim();
  const existing = db.prepare("SELECT name,type FROM sqlite_schema WHERE name GLOB 'magic_cognition_*' AND type IN ('table','view')").all();
  if (existing.length) {
    if (existing.length !== Object.keys(MAGIC_COGNITION_TABLES).length || existing.some(row => row.type !== 'table' || !Object.hasOwn(MAGIC_COGNITION_TABLES,row.name))) schemaFailure();
    const versions = db.prepare('SELECT version FROM magic_cognition_schema').all();
    if (versions.length !== 1 || versions[0].version !== 1) schemaFailure();
    for (const [name,columns] of Object.entries(MAGIC_COGNITION_TABLES)) {
      if (JSON.stringify(db.prepare(`PRAGMA table_info(${name})`).all().map(row=>row.name)) !== JSON.stringify(columns)
        || db.prepare('SELECT strict FROM pragma_table_list WHERE name=?').get(name)?.strict !== 1
        || normalized(db.prepare('SELECT sql FROM sqlite_schema WHERE name=?').get(name)?.sql||'')
          !== normalized(`CREATE TABLE ${name} (${definitions[name]}) STRICT`)) schemaFailure();
    }
  } else {
    for (const [name,definition] of Object.entries(definitions)) db.exec(`CREATE TABLE ${name} (${definition}) STRICT`);
    db.prepare('INSERT INTO magic_cognition_schema VALUES(1)').run();
  }
  for (const name of Object.keys(definitions)) {
    for (const action of ['UPDATE','DELETE']) db.exec(`CREATE TRIGGER IF NOT EXISTS ${name}_no_${action.toLowerCase()} BEFORE ${action} ON ${name} BEGIN SELECT RAISE(ABORT,'immutable magic cognition'); END`);
    const duplicate = name === 'magic_cognition_schema' ? '1' : name === 'magic_cognition_origins' ? 'observation_id=NEW.observation_id'
      : 'id=NEW.id OR (commit_ref=NEW.commit_ref AND owner_id=NEW.owner_id AND observation_id=NEW.observation_id AND effect_id=NEW.effect_id)';
    db.exec(`CREATE TRIGGER IF NOT EXISTS ${name}_no_replace BEFORE INSERT ON ${name}
      WHEN EXISTS(SELECT 1 FROM ${name} WHERE ${duplicate}) BEGIN SELECT RAISE(ABORT,'immutable magic cognition'); END`);
  }
  db.exec('CREATE INDEX IF NOT EXISTS magic_cognition_access_owner ON magic_cognition_access(run_id,owner_id,observation_id,commit_ref)');
}

/** Authorization is evaluated BEFORE observation bodies/record summaries leave
 * SQLite. acquired_observations is provenance metadata, NOT read authority;
 * it distinguishes an explicitly revoked source from a forged/missing ref.
 * Permanent cognition_revocations remain independent and irreversible.
 * Latest lifecycle per effect is selected first, so suppressing one effect
 * cannot accidentally resurrect an older status of that same effect. Cross-
 * effect precedence remains ORIGINAL establishment order, matching the core
 * append-only memoryAccess list: resuming an old effect is not a new cast. */
export function cognitionAuthorizationSQL({ strictWatermarks = false, includeRecords = true, magic = true } = {}) {
  return `${COGNITION_HISTORY_SQL},
    acquired_observations AS MATERIALIZED (
      SELECT o.id FROM cognition_observations o JOIN history h
        ON h.commit_ref=o.commit_ref AND h.run_id=o.run_id AND h.branch_id=o.origin_branch_id
      WHERE o.run_id=$runId AND o.owner_id=$actorId AND o.schema_version=1 AND o.learned_at<=$worldTime
        ${strictWatermarks ? 'AND o.origin_generation=h.generation AND o.revision=h.revision AND o.occurred_at>=0 AND o.occurred_at<=o.learned_at AND o.learned_at<=h.world_time' : ''}
    ), known_observations AS MATERIALIZED (
      SELECT o.id FROM acquired_observations o WHERE NOT EXISTS(SELECT 1 FROM cognition_revocations v JOIN history vh
          ON vh.commit_ref=v.commit_ref AND vh.run_id=v.run_id AND vh.branch_id=v.origin_branch_id
          WHERE v.run_id=$runId AND v.owner_id=$actorId AND v.observation_id=o.id)
    )${magic ? `,
    magic_access_ranked AS MATERIALIZED (
      SELECT a.*,h.depth,
        max(h.depth) OVER(PARTITION BY a.owner_id,a.observation_id,a.effect_id) AS established_depth,
        first_value(a.sequence) OVER(PARTITION BY a.owner_id,a.observation_id,a.effect_id ORDER BY h.depth DESC,a.sequence,a.rowid) AS established_sequence,
        row_number() OVER(PARTITION BY a.owner_id,a.observation_id,a.effect_id ORDER BY h.depth,a.sequence DESC,a.rowid DESC) AS effect_rank
      FROM magic_cognition_access a JOIN history h ON h.commit_ref=a.commit_ref AND h.run_id=a.run_id AND h.branch_id=a.origin_branch_id
      WHERE a.run_id=$runId AND a.owner_id=$actorId AND a.mind_id='mind:'||$actorId
        AND a.schema_version=1 AND a.starts_at<=$worldTime
    ), magic_access_active AS MATERIALIZED (
      SELECT *,row_number() OVER(PARTITION BY owner_id,observation_id ORDER BY established_depth,established_sequence DESC) AS source_rank
      FROM magic_access_ranked WHERE effect_rank=1 AND effect_status='active' AND (ends_at IS NULL OR ends_at>$worldTime)
    ), visible_observations AS MATERIALIZED (
      SELECT o.id FROM known_observations o WHERE NOT EXISTS(SELECT 1 FROM magic_access_active a
        WHERE a.observation_id=o.id AND a.source_rank=1 AND a.access_mode='blocked')
      AND NOT EXISTS(SELECT 1 FROM magic_cognition_origins origin WHERE origin.observation_id=o.id
        AND origin.owner_id=$actorId AND origin.mind_id='mind:'||$actorId
        AND NOT EXISTS(SELECT 1 FROM magic_access_ranked a WHERE a.observation_id=o.id
          AND a.effect_id=origin.effect_id AND a.effect_rank=1 AND a.effect_status='active'
          AND a.access_mode='restored' AND (a.ends_at IS NULL OR a.ends_at>$worldTime)))
    )` : ', visible_observations AS MATERIALIZED (SELECT id FROM known_observations)'}${includeRecords ? `,
    inherited_records AS MATERIALIZED (
      SELECT r.id,r.kind,r.supersedes_ref FROM cognition_records r JOIN history h
        ON h.commit_ref=r.commit_ref AND h.run_id=r.run_id AND h.branch_id=r.origin_branch_id
      WHERE r.run_id=$runId AND r.owner_id=$actorId AND r.schema_version=1
    ), current_records AS MATERIALIZED (
      SELECT r.* FROM inherited_records r WHERE EXISTS(SELECT 1 FROM cognition_record_sources s WHERE s.record_id=r.id)
        AND NOT EXISTS(SELECT 1 FROM cognition_record_sources s WHERE s.record_id=r.id
          AND NOT EXISTS(SELECT 1 FROM visible_observations o WHERE o.id=s.observation_id))
        AND NOT EXISTS(SELECT 1 FROM inherited_records newer WHERE newer.supersedes_ref=r.id)
    )` : ''}`;
}
export const COGNITION_AUTHORIZED_SQL = cognitionAuthorizationSQL();
export const DECISION_AUTHORIZED_SQL = cognitionAuthorizationSQL({ strictWatermarks: true, includeRecords: false });
export const COGNITION_KNOWN_SQL = cognitionAuthorizationSQL({ magic: false });

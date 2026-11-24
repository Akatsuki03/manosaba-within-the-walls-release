import { createHash } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { isProxy } from 'node:util/types';
import { openSqliteScope } from '../../host/sqlite-scope-owner.mjs';

/** Reusable HOST catalog only, never story authority. catalogId is a trusted
 * caller-selected namespace, NOT authentication. Use separate catalog IDs for
 * separate owners; this module neither discovers nor authorizes accounts.
 * No Domain/head/grant/task/cognition reads or writes; no compiler/provider.
 * Declaration validation below is STRUCTURAL storage compatibility only.
 * Lane A's final semantic validator must be integrated by the sole integrator
 * before production confirmation. Digests and author confirmation issue no power.
 */
export const CUSTOM_ABILITY_STORE_REFERENCE = Object.freeze({ ref: 'custom-ability-catalog@1', schemaVersion: 1,
  declarationRef: 'custom-ability-declaration@1', validation: 'structural-only-semantic-validator-integration-pending' });
const fail = (code = 'CUSTOM_ABILITY_CATALOG_INVALID') => {
  throw Object.assign(new Error('Custom ability catalog operation refused; no partial catalog changes.'), { code });
};
const freeze = value => {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
};
const canonical = value => {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
};
const digest = value => createHash('sha256').update(canonical(value)).digest('hex');
export const customAbilityTextDigest = text => {
  if (typeof text !== 'string' || !text.isWellFormed() || Buffer.byteLength(text, 'utf8') > 32768) fail();
  return createHash('sha256').update(text, 'utf8').digest('hex');
};
const id = value => typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9:._@/-]{0,191}$/u.test(value);
const hex = value => typeof value === 'string' && /^[a-f0-9]{64}$/u.test(value);
const integer = value => Number.isSafeInteger(value) && value >= 0 && !Object.is(value, -0);
const exact = (value, keys) => {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).length !== keys.length
    || keys.some(key => !Object.hasOwn(value, key))) fail();
};
const keysId = (value, keys) => { if (!keys.every(key => id(value[key]))) fail(); };
const text = (value, max) => { if (typeof value !== 'string' || !value.trim() || Buffer.byteLength(value, 'utf8') > max) fail(); };
const unique = rows => { if (new Set(rows).size !== rows.length) fail(); };
function snapshot(input) {
  const seen = new WeakSet(); let nodes = 0;
  const visit = (value, depth) => {
    if (++nodes > 10000 || depth > 12) fail('CUSTOM_ABILITY_CATALOG_BUDGET');
    if (typeof value === 'string') { if (!value.isWellFormed() || value.length > 32768) fail(); return value; }
    if (typeof value === 'number') { if (!integer(value)) fail(); return value; }
    if (value === null || typeof value === 'boolean') return value;
    if (!value || typeof value !== 'object' || isProxy(value) || seen.has(value)) fail();
    seen.add(value);
    const array = Array.isArray(value);
    if (Object.getPrototypeOf(value) !== (array ? Array.prototype : Object.prototype)) fail();
    const keys = Reflect.ownKeys(value);
    if (keys.some(key => typeof key !== 'string')) fail();
    const copy = array ? [] : {};
    const length = array ? Object.getOwnPropertyDescriptor(value, 'length').value : keys.length;
    if (length > (array ? 128 : 32) || array && keys.length !== length + 1) fail();
    for (const key of array ? Array.from({ length }, (_, index) => String(index)) : keys) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor?.enumerable || !Object.hasOwn(descriptor, 'value')) fail();
      Object.defineProperty(copy, key, { value: visit(descriptor.value, depth + 1), enumerable: true, writable: true, configurable: true });
    }
    return copy;
  };
  const copy = visit(input, 0);
  if (Buffer.byteLength(canonical(copy), 'utf8') > 131072) fail('CUSTOM_ABILITY_CATALOG_BUDGET');
  return copy;
}
const parse = json => { try { return JSON.parse(json); } catch { fail('CUSTOM_ABILITY_CATALOG_CORRUPT'); } };
const initial = value => {
  exact(value, ['stage','recognition']);
  if (!id(value.stage) || !['known','unknown','partial'].includes(value.recognition)) fail();
};
const pins = value => {
  exact(value, ['compilerRef','compilerVersion','mechanisms']);
  if (!id(value.compilerRef) || !integer(value.compilerVersion) || value.compilerVersion < 1
    || !Array.isArray(value.mechanisms) || value.mechanisms.length > 32) fail();
  for (const row of value.mechanisms) {
    exact(row, ['ref','version']); if (!id(row.ref) || !integer(row.version) || row.version < 1) fail();
  }
  unique(value.mechanisms.map(row => row.ref));
  value.mechanisms.sort((a,b) => a.ref < b.ref ? -1 : a.ref > b.ref ? 1 : 0);
};
const options = value => {
  exact(value, ['initialState','authorChoices']); initial(value.initialState);
  if (!Array.isArray(value.authorChoices) || value.authorChoices.length > 32) fail();
  for (const row of value.authorChoices) { exact(row, ['id','value']); if (!id(row.id)) fail(); text(row.value, 2048); }
  unique(value.authorChoices.map(row => row.id));
  value.authorChoices.sort((a,b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
};
const KINDS = new Set(['domain','effect','target','trigger','condition','limit','lifecycle','growth','exception','unresolved']);
function declaration(value, source, expectedPins) {
  exact(value, ['version','definitionId','revision','authoredText','clauses','initialState','unresolved','mechanismRequirements','provenance','semanticDigest']);
  if (value.version !== 1 || !id(value.definitionId) || !integer(value.revision) || value.revision < 1 || !hex(value.semanticDigest)) fail();
  text(value.authoredText, 32768); initial(value.initialState);
  if (value.authoredText !== source.authoredText || canonical(value.initialState) !== canonical(source.options.initialState))
    fail('CUSTOM_ABILITY_CATALOG_SOURCE_MISMATCH');
  if (!Array.isArray(value.clauses) || !value.clauses.length || value.clauses.length > 128
    || !Array.isArray(value.unresolved) || value.unresolved.length > 32) fail();
  for (const row of value.clauses) {
    exact(row, ['id','text','kind']); if (!id(row.id) || !KINDS.has(row.kind)) fail(); text(row.text, 4096);
  }
  unique(value.clauses.map(row => row.id));
  for (const row of value.unresolved) { exact(row, ['id','question']); if (!id(row.id)) fail(); text(row.question, 2048); }
  unique(value.unresolved.map(row => row.id));
  const requirements = { compilerRef: expectedPins.compilerRef, compilerVersion: expectedPins.compilerVersion,
    mechanisms: value.mechanismRequirements };
  pins(requirements);
  // Preserve unsupported mechanism requirements. Store does not equate support
  // inventory with declaration meaning or silently omit unsupported clauses.
  exact(value.provenance, ['draftId','draftRevision','authoredTextDigest']);
  if (value.provenance.draftId !== source.draftId || value.provenance.draftRevision !== source.revision
    || value.provenance.authoredTextDigest !== customAbilityTextDigest(source.authoredText)) fail('CUSTOM_ABILITY_CATALOG_SOURCE_MISMATCH');
}

const definitions = {
  custom_ability_catalog_schema: `id INTEGER PRIMARY KEY CHECK(id=1),version INTEGER NOT NULL CHECK(version=1)`,
  custom_ability_catalog_drafts: `catalog_id TEXT NOT NULL,draft_id TEXT NOT NULL,version INTEGER NOT NULL,source_revision INTEGER NOT NULL,
    deleted INTEGER NOT NULL CHECK(deleted IN(0,1)),cosmetics_json TEXT NOT NULL,confirmed_definition_id TEXT,confirmed_revision INTEGER,PRIMARY KEY(catalog_id,draft_id),
    FOREIGN KEY(catalog_id,confirmed_definition_id,confirmed_revision) REFERENCES custom_ability_catalog_definitions(catalog_id,definition_id,revision)`,
  custom_ability_catalog_sources: `catalog_id TEXT NOT NULL,draft_id TEXT NOT NULL,source_revision INTEGER NOT NULL,authored_text TEXT NOT NULL,
    options_json TEXT NOT NULL,source_digest TEXT NOT NULL,PRIMARY KEY(catalog_id,draft_id,source_revision),
    FOREIGN KEY(catalog_id,draft_id) REFERENCES custom_ability_catalog_drafts(catalog_id,draft_id)`,
  custom_ability_catalog_jobs: `catalog_id TEXT NOT NULL,job_id TEXT NOT NULL,draft_id TEXT NOT NULL,source_revision INTEGER NOT NULL,
    input_digest TEXT NOT NULL,pins_json TEXT NOT NULL,status TEXT NOT NULL CHECK(status IN('pending','completed','failed')),
    candidate_json TEXT,candidate_digest TEXT,failure_code TEXT,PRIMARY KEY(catalog_id,job_id),UNIQUE(catalog_id,draft_id,source_revision,input_digest),
    FOREIGN KEY(catalog_id,draft_id,source_revision) REFERENCES custom_ability_catalog_sources(catalog_id,draft_id,source_revision)`,
  custom_ability_catalog_artifacts: `catalog_id TEXT NOT NULL,artifact_digest TEXT NOT NULL,semantic_json TEXT NOT NULL,
    pins_json TEXT NOT NULL,PRIMARY KEY(catalog_id,artifact_digest)`,
  custom_ability_catalog_definitions: `catalog_id TEXT NOT NULL,definition_id TEXT NOT NULL,revision INTEGER NOT NULL,job_id TEXT NOT NULL,
    artifact_digest TEXT NOT NULL,declaration_json TEXT NOT NULL,candidate_digest TEXT NOT NULL,source_digest TEXT NOT NULL,
    PRIMARY KEY(catalog_id,definition_id,revision),UNIQUE(catalog_id,job_id),
    FOREIGN KEY(catalog_id,job_id) REFERENCES custom_ability_catalog_jobs(catalog_id,job_id),
    FOREIGN KEY(catalog_id,artifact_digest) REFERENCES custom_ability_catalog_artifacts(catalog_id,artifact_digest)`,
  custom_ability_catalog_presets: `catalog_id TEXT NOT NULL,preset_id TEXT NOT NULL,version INTEGER NOT NULL,deleted INTEGER NOT NULL CHECK(deleted IN(0,1)),
    PRIMARY KEY(catalog_id,preset_id)`,
  custom_ability_catalog_links: `catalog_id TEXT NOT NULL,preset_id TEXT NOT NULL,preset_version INTEGER NOT NULL,draft_id TEXT NOT NULL,source_revision INTEGER NOT NULL,
    definition_id TEXT NOT NULL,definition_revision INTEGER NOT NULL,PRIMARY KEY(catalog_id,preset_id,preset_version),
    FOREIGN KEY(catalog_id,preset_id) REFERENCES custom_ability_catalog_presets(catalog_id,preset_id),
    FOREIGN KEY(catalog_id,draft_id,source_revision) REFERENCES custom_ability_catalog_sources(catalog_id,draft_id,source_revision),
    FOREIGN KEY(catalog_id,definition_id,definition_revision) REFERENCES custom_ability_catalog_definitions(catalog_id,definition_id,revision)`,
  custom_ability_catalog_requests: `catalog_id TEXT NOT NULL,request_id TEXT NOT NULL,operation TEXT NOT NULL,input_digest TEXT NOT NULL,result_json TEXT NOT NULL,
    PRIMARY KEY(catalog_id,request_id)`,
};
const immutable = new Set(['custom_ability_catalog_schema','custom_ability_catalog_sources','custom_ability_catalog_artifacts',
  'custom_ability_catalog_definitions','custom_ability_catalog_links','custom_ability_catalog_requests']);
const normalized = sql => sql.replace(/\s+/gu,' ').trim();

export class CustomAbilityStore {
  #db; #catalogId;
  constructor(db, { catalogId } = {}) {
    if (!(db instanceof DatabaseSync) || !id(catalogId)) fail();
    this.#db = db; this.#catalogId = catalogId;
  }
  #tx() { if (!this.#db.isTransaction) fail('CUSTOM_ABILITY_CATALOG_TRANSACTION_REQUIRED'); }
  initialize() {
    this.#tx();
    if (this.#db.prepare('PRAGMA foreign_keys').get()?.foreign_keys !== 1) fail('CUSTOM_ABILITY_CATALOG_SCHEMA');
    const scope = openSqliteScope(this.#db, 'custom_ability_catalog_schema');
    try {
      const existing = this.#db.prepare("SELECT name,type,sql FROM sqlite_schema WHERE name GLOB 'custom_ability_catalog_*' AND type IN('table','view')").all();
      if (existing.length && (existing.length !== Object.keys(definitions).length || existing.some(row => row.type !== 'table'
        || !Object.hasOwn(definitions,row.name) || normalized(row.sql) !== normalized(`CREATE TABLE ${row.name} (${definitions[row.name]}) STRICT`))))
        fail('CUSTOM_ABILITY_CATALOG_SCHEMA');
      if (!existing.length) for (const [name,columns] of Object.entries(definitions)) this.#db.exec(`CREATE TABLE ${name} (${columns}) STRICT`);
      const versions = this.#db.prepare('SELECT * FROM custom_ability_catalog_schema').all();
      if (existing.length && (versions.length !== 1 || versions[0].id !== 1 || versions[0].version !== 1)) fail('CUSTOM_ABILITY_CATALOG_SCHEMA');
      for (const name of Object.keys(definitions)) {
        const uniqueKeys = this.#db.prepare(`PRAGMA index_list(${name})`).all().filter(row => row.unique).map(row =>
          this.#db.prepare(`PRAGMA index_info("${row.name}")`).all().map(column => column.name));
        const collision = name === 'custom_ability_catalog_schema' ? 'id=NEW.id'
          : uniqueKeys.map(keys => `(${keys.map(key => `${key}=NEW.${key}`).join(' AND ')})`).join(' OR ');
        if (!collision) fail('CUSTOM_ABILITY_CATALOG_SCHEMA');
        const triggers = {
          [`${name}_no_replace`]: `CREATE TRIGGER ${name}_no_replace BEFORE INSERT ON ${name} WHEN EXISTS(SELECT 1 FROM ${name} WHERE ${collision}) BEGIN SELECT RAISE(ABORT,'immutable catalog identity'); END`,
          [`${name}_no_delete`]: `CREATE TRIGGER ${name}_no_delete BEFORE DELETE ON ${name} BEGIN SELECT RAISE(ABORT,'immutable catalog history'); END`,
        };
        if (immutable.has(name)) triggers[`${name}_no_update`] = `CREATE TRIGGER ${name}_no_update BEFORE UPDATE ON ${name} BEGIN SELECT RAISE(ABORT,'immutable catalog history'); END`;
        if (name === 'custom_ability_catalog_jobs') triggers[`${name}_terminal`] = `CREATE TRIGGER ${name}_terminal BEFORE UPDATE ON ${name} WHEN OLD.status<>'pending' OR NEW.catalog_id<>OLD.catalog_id OR NEW.job_id<>OLD.job_id OR NEW.draft_id<>OLD.draft_id OR NEW.source_revision<>OLD.source_revision OR NEW.input_digest<>OLD.input_digest OR NEW.pins_json<>OLD.pins_json BEGIN SELECT RAISE(ABORT,'sealed compiler result'); END`;
        for (const [trigger,sql] of Object.entries(triggers)) {
          const found = this.#db.prepare('SELECT type,sql FROM sqlite_schema WHERE name=?').get(trigger);
          if (existing.length && !found || found && (found.type !== 'trigger' || normalized(found.sql) !== normalized(sql))) fail('CUSTOM_ABILITY_CATALOG_SCHEMA');
          if (!found) this.#db.exec(sql);
        }
      }
      if (!existing.length) this.#db.prepare('INSERT INTO custom_ability_catalog_schema VALUES(1,1)').run();
      scope.release();
    } catch (error) { scope.rollback(); throw error; }
  }
  #ready() {
    if (this.#db.prepare('SELECT version FROM custom_ability_catalog_schema WHERE id=1').get()?.version !== 1) fail('CUSTOM_ABILITY_CATALOG_SCHEMA');
  }
  #operation(operation, raw, work) {
    this.#tx(); this.#ready(); const input = snapshot(raw);
    if (!id(input?.requestId)) fail();
    const inputDigest = digest(input), catalog = this.#catalogId;
    const prior = this.#db.prepare('SELECT * FROM custom_ability_catalog_requests WHERE catalog_id=? AND request_id=?').get(catalog,input.requestId);
    if (prior) {
      if (prior.operation !== operation || prior.input_digest !== inputDigest) fail('CUSTOM_ABILITY_CATALOG_REQUEST_CONFLICT');
      return freeze(parse(prior.result_json));
    }
    const scope = openSqliteScope(this.#db, 'custom_ability_catalog_operation');
    try {
      const result = work(input);
      this.#db.prepare('INSERT INTO custom_ability_catalog_requests VALUES(?,?,?,?,?)').run(catalog,input.requestId,operation,inputDigest,canonical(result));
      scope.release(); return freeze(result);
    } catch (error) { scope.rollback(); throw error; }
  }
  #draft(draftId, expectedVersion) {
    const row = this.#db.prepare('SELECT * FROM custom_ability_catalog_drafts WHERE catalog_id=? AND draft_id=?').get(this.#catalogId,draftId);
    if (!row || row.deleted) fail('CUSTOM_ABILITY_CATALOG_NOT_FOUND');
    if (expectedVersion !== undefined && row.version !== expectedVersion) fail('CUSTOM_ABILITY_CATALOG_STALE');
    return row;
  }
  #source(draftId, revision) {
    const row = this.#db.prepare('SELECT * FROM custom_ability_catalog_sources WHERE catalog_id=? AND draft_id=? AND source_revision=?')
      .get(this.#catalogId,draftId,revision);
    if (!row) fail('CUSTOM_ABILITY_CATALOG_NOT_FOUND');
    return { draftId, revision, authoredText: row.authored_text, options: parse(row.options_json), sourceDigest: row.source_digest };
  }
  #job(jobId) {
    const row = this.#db.prepare('SELECT * FROM custom_ability_catalog_jobs WHERE catalog_id=? AND job_id=?').get(this.#catalogId,jobId);
    if (!row) fail('CUSTOM_ABILITY_CATALOG_NOT_FOUND'); return row;
  }
  saveDraft(raw) {
    return this.#operation('save-draft',raw,input => {
      exact(input,['requestId','draftId','expectedVersion','authoredText','options','cosmetics']);
      keysId(input,['draftId']); if (!integer(input.expectedVersion)) fail(); text(input.authoredText,32768); options(input.options);
      exact(input.cosmetics,['name','avatarRef']); text(input.cosmetics.name,256);
      if (input.cosmetics.avatarRef !== null && !id(input.cosmetics.avatarRef)) fail();
      const old = this.#db.prepare('SELECT * FROM custom_ability_catalog_drafts WHERE catalog_id=? AND draft_id=?').get(this.#catalogId,input.draftId);
      if (old?.deleted || (old?.version ?? 0) !== input.expectedVersion) fail('CUSTOM_ABILITY_CATALOG_STALE');
      const sourceDigest = digest({ authoredText:input.authoredText, options:input.options });
      const previous = old ? this.#source(input.draftId,old.source_revision) : null;
      const changed = previous?.sourceDigest !== sourceDigest;
      const revision = old ? old.source_revision + Number(changed) : 1, version = (old?.version ?? 0)+1;
      if (!old) this.#db.prepare('INSERT INTO custom_ability_catalog_drafts VALUES(?,?,?,?,0,?,NULL,NULL)').run(this.#catalogId,input.draftId,version,revision,canonical(input.cosmetics));
      else this.#db.prepare('UPDATE custom_ability_catalog_drafts SET version=?,source_revision=?,cosmetics_json=? WHERE catalog_id=? AND draft_id=?')
        .run(version,revision,canonical(input.cosmetics),this.#catalogId,input.draftId);
      if (changed) this.#db.prepare('INSERT INTO custom_ability_catalog_sources VALUES(?,?,?,?,?,?)')
        .run(this.#catalogId,input.draftId,revision,input.authoredText,canonical(input.options),sourceDigest);
      return { draftId:input.draftId,version,draftRevision:revision,sourceDigest,semanticInputChanged:changed };
    });
  }
  requestCompile(raw) {
    return this.#operation('request-compile',raw,input => {
      exact(input,['requestId','draftId','expectedVersion','pins']); keysId(input,['draftId']); pins(input.pins);
      if (!integer(input.expectedVersion) || input.expectedVersion < 1) fail();
      const draft = this.#draft(input.draftId,input.expectedVersion), source = this.#source(input.draftId,draft.source_revision);
      const inputDigest = digest({ sourceDigest:source.sourceDigest,pins:input.pins });
      const old = this.#db.prepare('SELECT * FROM custom_ability_catalog_jobs WHERE catalog_id=? AND draft_id=? AND source_revision=? AND input_digest=?')
        .get(this.#catalogId,input.draftId,draft.source_revision,inputDigest);
      const jobId = old?.job_id ?? `compile:${digest([this.#catalogId,input.draftId,draft.source_revision,inputDigest]).slice(0,48)}`;
      if (!old) this.#db.prepare('INSERT INTO custom_ability_catalog_jobs VALUES(?,?,?,?,?,?,\'pending\',NULL,NULL,NULL)')
        .run(this.#catalogId,jobId,input.draftId,draft.source_revision,inputDigest,canonical(input.pins));
      return { jobId,draftId:input.draftId,draftRevision:draft.source_revision,inputDigest,pins:input.pins,status:old?.status ?? 'pending' };
    });
  }
  completeCompile(raw) {
    return this.#operation('complete-compile',raw,input => {
      exact(input,['requestId','jobId','inputDigest','pins','candidate']); keysId(input,['jobId']); pins(input.pins);
      if (!hex(input.inputDigest)) fail(); const job = this.#job(input.jobId);
      const draft = this.#draft(job.draft_id);
      if (draft.source_revision !== job.source_revision) fail('CUSTOM_ABILITY_CATALOG_STALE');
      if (job.input_digest !== input.inputDigest || job.pins_json !== canonical(input.pins)) fail('CUSTOM_ABILITY_CATALOG_SOURCE_MISMATCH');
      declaration(input.candidate,this.#source(job.draft_id,job.source_revision),input.pins);
      const candidateDigest = digest({ inputDigest:input.inputDigest,pins:input.pins,candidate:input.candidate });
      if (job.status !== 'pending') {
        if (job.status !== 'completed' || job.candidate_digest !== candidateDigest) fail('CUSTOM_ABILITY_CATALOG_RESULT_CONFLICT');
      } else this.#db.prepare("UPDATE custom_ability_catalog_jobs SET status='completed',candidate_json=?,candidate_digest=? WHERE catalog_id=? AND job_id=?")
        .run(canonical(input.candidate),candidateDigest,this.#catalogId,input.jobId);
      return { jobId:input.jobId,candidateDigest,draftId:job.draft_id,draftRevision:job.source_revision,status:'completed' };
    });
  }
  failCompile(raw) {
    return this.#operation('fail-compile',raw,input => {
      exact(input,['requestId','jobId','failureCode']); keysId(input,['jobId']);
      if (!['compiler-unavailable','invalid-candidate','mechanism-version-missing'].includes(input.failureCode)) fail();
      const job = this.#job(input.jobId);
      if (job.status !== 'pending' && (job.status !== 'failed' || job.failure_code !== input.failureCode)) fail('CUSTOM_ABILITY_CATALOG_RESULT_CONFLICT');
      if (job.status === 'pending') this.#db.prepare("UPDATE custom_ability_catalog_jobs SET status='failed',failure_code=? WHERE catalog_id=? AND job_id=?")
        .run(input.failureCode,this.#catalogId,input.jobId);
      return { jobId:input.jobId,status:'failed',failureCode:input.failureCode };
    });
  }
  /** Explicit trusted HOST author-confirm operation. No candidate JSON or
   * approved flag accepted here. Reads exact immutable completed job content;
   * confirms content ONLY, never mechanism support, run eligibility or power. */
  confirmCandidate(raw) {
    return this.#operation('confirm-candidate',raw,input => {
      exact(input,['requestId','draftId','expectedVersion','draftRevision','jobId','candidateDigest']);
      keysId(input,['draftId','jobId']); if (!integer(input.expectedVersion) || !integer(input.draftRevision) || !hex(input.candidateDigest)) fail();
      const draft = this.#draft(input.draftId,input.expectedVersion), job = this.#job(input.jobId);
      if (draft.source_revision !== input.draftRevision || job.draft_id !== input.draftId || job.source_revision !== input.draftRevision)
        fail('CUSTOM_ABILITY_CATALOG_STALE');
      if (job.status !== 'completed' || job.candidate_digest !== input.candidateDigest) fail('CUSTOM_ABILITY_CATALOG_RESULT_CONFLICT');
      const candidate = parse(job.candidate_json), source = this.#source(input.draftId,input.draftRevision), compiledPins = parse(job.pins_json);
      declaration(candidate,source,compiledPins);
      if (digest({ inputDigest:job.input_digest,pins:compiledPins,candidate }) !== input.candidateDigest) fail('CUSTOM_ABILITY_CATALOG_CORRUPT');
      const semantic = { clauses:candidate.clauses,initialState:candidate.initialState,unresolved:candidate.unresolved,
        mechanismRequirements:candidate.mechanismRequirements,semanticDigest:candidate.semanticDigest };
      const artifactDigest = digest({ semantic,pins:compiledPins });
      if (!this.#db.prepare('SELECT 1 FROM custom_ability_catalog_artifacts WHERE catalog_id=? AND artifact_digest=?').get(this.#catalogId,artifactDigest))
        this.#db.prepare('INSERT INTO custom_ability_catalog_artifacts VALUES(?,?,?,?)').run(this.#catalogId,artifactDigest,canonical(semantic),job.pins_json);
      const existing = this.#db.prepare('SELECT * FROM custom_ability_catalog_definitions WHERE catalog_id=? AND definition_id=? AND revision=?')
        .get(this.#catalogId,candidate.definitionId,candidate.revision);
      if (existing && existing.candidate_digest !== input.candidateDigest) fail('CUSTOM_ABILITY_CATALOG_DEFINITION_CONFLICT');
      const last = this.#db.prepare('SELECT max(revision) AS revision FROM custom_ability_catalog_definitions WHERE catalog_id=? AND definition_id=?')
        .get(this.#catalogId,candidate.definitionId).revision ?? 0;
      if (!existing && candidate.revision !== last+1) fail('CUSTOM_ABILITY_CATALOG_DEFINITION_CONFLICT');
      if (!existing) this.#db.prepare('INSERT INTO custom_ability_catalog_definitions VALUES(?,?,?,?,?,?,?,?)').run(this.#catalogId,candidate.definitionId,
        candidate.revision,input.jobId,artifactDigest,job.candidate_json,input.candidateDigest,source.sourceDigest);
      const version = draft.version+1;
      this.#db.prepare('UPDATE custom_ability_catalog_drafts SET version=?,confirmed_definition_id=?,confirmed_revision=? WHERE catalog_id=? AND draft_id=?')
        .run(version,candidate.definitionId,candidate.revision,this.#catalogId,input.draftId);
      return { draftId:input.draftId,version,definitionId:candidate.definitionId,revision:candidate.revision,artifactDigest,
        candidateDigest:input.candidateDigest,confirmation:'author-content-only-not-run-authority' };
    });
  }
  linkPreset(raw) {
    return this.#operation('link-preset',raw,input => {
      exact(input,['requestId','presetId','expectedVersion','draftId','definitionId','revision']);
      keysId(input,['presetId','draftId','definitionId']); if (!integer(input.expectedVersion) || !integer(input.revision) || input.revision < 1) fail();
      const draft = this.#draft(input.draftId);
      if (draft.confirmed_definition_id !== input.definitionId || draft.confirmed_revision !== input.revision) fail('CUSTOM_ABILITY_CATALOG_SOURCE_MISMATCH');
      const def = this.#db.prepare('SELECT * FROM custom_ability_catalog_definitions WHERE catalog_id=? AND definition_id=? AND revision=?')
        .get(this.#catalogId,input.definitionId,input.revision);
      const old = this.#db.prepare('SELECT * FROM custom_ability_catalog_presets WHERE catalog_id=? AND preset_id=?').get(this.#catalogId,input.presetId);
      if (!def || old?.deleted || (old?.version ?? 0) !== input.expectedVersion) fail('CUSTOM_ABILITY_CATALOG_STALE');
      const version = input.expectedVersion+1;
      if (!old) this.#db.prepare('INSERT INTO custom_ability_catalog_presets VALUES(?,?,?,0)').run(this.#catalogId,input.presetId,version);
      else this.#db.prepare('UPDATE custom_ability_catalog_presets SET version=? WHERE catalog_id=? AND preset_id=?').run(version,this.#catalogId,input.presetId);
      const provenance = parse(def.declaration_json).provenance;
      if (provenance.draftId !== input.draftId) fail('CUSTOM_ABILITY_CATALOG_SOURCE_MISMATCH');
      this.#db.prepare('INSERT INTO custom_ability_catalog_links VALUES(?,?,?,?,?,?,?)').run(this.#catalogId,input.presetId,version,input.draftId,
        provenance.draftRevision,input.definitionId,input.revision);
      return { presetId:input.presetId,version,definitionId:input.definitionId,revision:input.revision };
    });
  }
  deletePreset(raw) {
    return this.#operation('delete-preset',raw,input => {
      exact(input,['requestId','presetId','expectedVersion']); keysId(input,['presetId']); if (!integer(input.expectedVersion)) fail();
      const row = this.#db.prepare('SELECT * FROM custom_ability_catalog_presets WHERE catalog_id=? AND preset_id=?').get(this.#catalogId,input.presetId);
      if (!row || row.deleted || row.version !== input.expectedVersion) fail('CUSTOM_ABILITY_CATALOG_STALE');
      this.#db.prepare('UPDATE custom_ability_catalog_presets SET version=?,deleted=1 WHERE catalog_id=? AND preset_id=?')
        .run(row.version+1,this.#catalogId,input.presetId);
      return { presetId:input.presetId,version:row.version+1,deleted:true };
    });
  }
  readDraft(draftId) {
    if (!id(draftId)) fail(); this.#ready(); const row = this.#draft(draftId), source = this.#source(draftId,row.source_revision);
    return freeze({ draftId,version:row.version,draftRevision:row.source_revision,authoredText:source.authoredText,options:source.options,
      cosmetics:parse(row.cosmetics_json),sourceDigest:source.sourceDigest,
      confirmed:row.confirmed_definition_id ? { definitionId:row.confirmed_definition_id,revision:row.confirmed_revision } : null });
  }
  readJob(jobId) {
    if (!id(jobId)) fail(); this.#ready(); const row = this.#job(jobId);
    return freeze({ jobId,draftId:row.draft_id,draftRevision:row.source_revision,inputDigest:row.input_digest,pins:parse(row.pins_json),
      status:row.status,candidate:row.candidate_json ? parse(row.candidate_json) : null,candidateDigest:row.candidate_digest,
      failureCode:row.failure_code });
  }
  readDefinition(definitionId,revision) {
    if (!id(definitionId) || !integer(revision) || revision < 1) fail(); this.#ready();
    const row = this.#db.prepare('SELECT * FROM custom_ability_catalog_definitions WHERE catalog_id=? AND definition_id=? AND revision=?')
      .get(this.#catalogId,definitionId,revision);
    if (!row) fail('CUSTOM_ABILITY_CATALOG_NOT_FOUND');
    return freeze({ definitionId,revision,candidateDigest:row.candidate_digest,artifactDigest:row.artifact_digest,
      declaration:parse(row.declaration_json),sourceDigest:row.source_digest,confirmation:'author-content-only-not-run-authority' });
  }
}

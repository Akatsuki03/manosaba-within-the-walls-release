import { randomUUID } from 'node:crypto';
import { openSqliteScope } from '../../host/sqlite-scope-owner.mjs';
import { abilityDigest, magicJson, magicId, magicOwn } from './ability-definitions.mjs';
import { CognitionStore } from '../../cognition/cognition-store.mjs';
import { COGNITION_HISTORY_SQL, COGNITION_AUTHORIZED_SQL, COGNITION_KNOWN_SQL, initializeMagicCognitionSchema } from '../../cognition/cognition-access-policy.mjs';

const fail = (code = 'ERR_MAGIC_COGNITION_PERMISSION') => { throw Object.assign(new Error('魔法认知来源、效果或提交授权不成立，未发布记忆。'), { code }); };
const id = value => { if (typeof value !== 'string' || !value.length || value.length > 192 || /[\u0000-\u001f\u007f]/u.test(value)) fail(); return value; };
const exact = (value, keys) => value && typeof value === 'object' && !Array.isArray(value)
  && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value,key));
const rosterArrays = ['grants','knowledge','uses','effects','signals','constraints','representations','memoryAccess',
  'branchRequests','deathReactions','lifecycleEvents','growthEvents','memories'];
// Compatibility is an explicitly small unversioned metadata protocol, not a
// fallback for an unrecognized/malformed full roster (including a lost marker).
const minimalProjectionKeys = ['branchId','headCommitRef','generation','time','identity','memories','effects','memoryAccess','representations','uses'];

// Acquisition is a SQL-only, explicit effect-position view, not a connection
// cutoff or a relaxation of the ordinary final-head authorization policy.
// Ancestors retain their authoritative SQL ACL. At this commit derive earlier
// obligations from the immutable ledger even BEFORE any sidecars are inserted.
// Permanent SQL revocations have no canonical magic ordinal: never exclude them.
const ACQUISITION_AUTHORIZED_SQL = COGNITION_AUTHORIZED_SQL.replace(
  'FROM magic_cognition_access a JOIN history h',
  `FROM (
    SELECT a.rowid,a.* FROM magic_cognition_access a WHERE a.commit_ref<>$commitRef
    UNION ALL
    SELECT CAST(e.key AS INTEGER) AS rowid,'sealed:'||e.key AS id,c.run_id,c.branch_id,c.commit_ref,
      json_extract(m.projection_json,'$.identity.minds.'||json_quote(json_extract(m.projection_json,
        '$.identity.occupants.'||json_quote(json_extract(e.value,'$.event.targetId'))))||'.actorId') AS owner_id,
      json_extract(m.projection_json,'$.identity.occupants.'||json_quote(json_extract(e.value,'$.event.targetId'))) AS mind_id,
      sources.observation_id,json_extract(e.value,'$.id') AS effect_id,
      CASE json_extract(e.value,'$.event.operation') WHEN 'memory-revoke' THEN 'blocked' ELSE 'restored' END AS access_mode,
      json_extract(e.value,'$.status') AS effect_status,json_extract(e.value,'$.startedAt') AS starts_at,
      json_extract(e.value,'$.expiresAt') AS ends_at,CAST(e.key AS INTEGER) AS sequence,1 AS schema_version
    FROM host_magic_commits_v2 m JOIN domain_commits c ON c.commit_ref=m.commit_ref AND c.branch_id=m.branch_id,
      json_each(m.projection_json,'$.effects') e,
      json_each(m.projection_json,'$.effects') acquisition,
      (SELECT o.id AS record_id,o.id AS observation_id,0 AS origin FROM cognition_observations o
       UNION SELECT s.record_id,s.observation_id,0 FROM cognition_record_sources s
       UNION SELECT origin.effect_id,origin.observation_id,1 FROM magic_cognition_origins origin) sources
    WHERE m.commit_ref=$commitRef AND json_extract(acquisition.value,'$.id')=$acquisitionEffectId
      AND json_extract(e.value,'$.event.operation') IN ('memory-share','memory-revoke','mental-heal')
      AND (
        (EXISTS(SELECT 1 FROM json_each(m.events_json) event
          WHERE json_extract(event.value,'$.id')=json_extract(e.value,'$.id'))
          AND CAST(e.key AS INTEGER)<CAST(acquisition.key AS INTEGER))
        OR EXISTS(SELECT 1 FROM json_each(m.events_json) life,json_each(m.events_json) share
          WHERE json_extract(life.value,'$.type')='MagicEffectLifecycleChanged'
            AND json_extract(life.value,'$.effectId')=json_extract(e.value,'$.id')
            AND json_extract(share.value,'$.id')=$acquisitionEffectId AND CAST(life.key AS INTEGER)<CAST(share.key AS INTEGER))
      )
      AND (json_extract(e.value,'$.event.operation')='memory-share' AND sources.origin=1 AND sources.record_id=json_extract(e.value,'$.id')
        OR json_extract(e.value,'$.event.operation')<>'memory-share' AND sources.origin=0 AND sources.record_id IN
          (SELECT value FROM json_each(e.value,'$.event.payload.recordIds')))
  ) a JOIN history h`);


/** HOST-only bridge. A string token or caller-labelled "HOST_ONLY" certificate
 * is insufficient: every mutation is checked against an immutable, same-head
 * MagicRepository commit including the exact event and its resulting state.
 * Parent must append that commit inside its authoritative Domain transaction
 * BEFORE calling publishMagicCognition. Never expose this repository to tools. */
export class MagicCognitionStore {
  #db;
  constructor(db) { if (!db || typeof db.prepare !== 'function') fail(); this.#db=db; }
  #operation(fn) {
    if (!this.#db.isTransaction) fail('ERR_MAGIC_COGNITION_TRANSACTION');
    const savepoint=`magic_cognition_${randomUUID().replaceAll('-','')}`; const sqlScope=openSqliteScope(this.#db,savepoint);
    try { const result=fn(); sqlScope.release(); return result; }
    catch(error) { sqlScope.rollback(); if (/^ERR_(MAGIC_)?COGNITION_/u.test(error.code||'')) throw error; fail(); }
  }
  initialize() { return this.#operation(()=>{ initializeMagicCognitionSchema(this.#db); return { schemaVersion:1 }; }); }
  #scope(commitRef) {
    id(commitRef);
    const row=this.#db.prepare('SELECT commit_ref,run_id,branch_id,generation,revision,world_time,parent_commit_ref FROM domain_commits WHERE commit_ref=?').get(commitRef);
    if (!row) fail(); return row;
  }
  #bindings(scope, ownerId) { return { $commitRef:scope.commit_ref,$runId:scope.run_id,$actorId:ownerId,$worldTime:scope.world_time }; }
  #proof(scope, effectId) {
    id(effectId);
    if (!this.#db.prepare("SELECT 1 FROM sqlite_schema WHERE type='table' AND name='host_magic_commits_v2'").get()) fail('ERR_MAGIC_COGNITION_EFFECT_NOT_COMMITTED');
    // Read only effect/identity/reference metadata, never another mind's
    // memory body or an unrestricted projection_json into JavaScript.
    const sealed=this.#db.prepare(`SELECT expected_head,events_json,
      (SELECT CAST(e.key AS INTEGER) FROM json_each(projection_json,'$.effects') e WHERE json_extract(e.value,'$.id')=$effectId) AS effect_sequence,
      json_object('branchId',json_extract(projection_json,'$.branchId'),
        'headCommitRef',json_extract(projection_json,'$.headCommitRef'),
        'generation',json_extract(projection_json,'$.generation'),'time',json_extract(projection_json,'$.time'),
        'identity',json_object('minds',json(json_extract(projection_json,'$.identity.minds')),
          'occupants',json(json_extract(projection_json,'$.identity.occupants'))),
        'memories',json((SELECT coalesce(json_group_array(json_object('id',json_extract(m.value,'$.id'),
          'ownerMindId',json_extract(m.value,'$.ownerMindId'))),'[]') FROM json_each(projection_json,'$.memories') m)),
        'effects',json((SELECT coalesce(json_group_array(json(e.value)),'[]') FROM json_each(projection_json,'$.effects') e
          WHERE json_extract(e.value,'$.id')=$effectId))) AS projection_json
      FROM host_magic_commits_v2 WHERE branch_id=$branchId AND commit_ref=$commitRef`)
      .get({$effectId:effectId,$branchId:scope.branch_id,$commitRef:scope.commit_ref});
    if (!sealed || sealed.expected_head!==scope.parent_commit_ref) fail('ERR_MAGIC_COGNITION_EFFECT_NOT_COMMITTED');
    const state=JSON.parse(sealed.projection_json); const published=JSON.parse(sealed.events_json);
    const effect=state.effects?.find(row=>row.id===effectId);
    if (!effect || !magicId(effect.event?.sourceMindId) || !state.identity?.minds || !state.identity?.occupants
      || state.branchId!==scope.branch_id || state.time!==scope.world_time || state.headCommitRef!==sealed.expected_head
      || state.generation!==scope.generation || effect.startedAt>scope.world_time
      || !['active','suppressed','ended'].includes(effect.status)) fail();
    const originals=published.filter(event=>event.id===effectId);const original=originals[0];
    if(originals.length>1 || !Number.isSafeInteger(effect.startedAt) || effect.startedAt<0
      || effect.expiresAt!==null && (!Number.isSafeInteger(effect.expiresAt) || effect.expiresAt<effect.startedAt)
      || Object.hasOwn(effect.event,'at') && effect.event.at!==effect.startedAt
      || Object.hasOwn(effect.event,'expiresAt') && effect.event.expiresAt!==effect.expiresAt
      || Object.hasOwn(effect.event,'sourceDeath') && effect.event.sourceDeath!==effect.sourceDeath
      || Object.hasOwn(effect.event,'sourceBodyId') && effect.event.sourceBodyId!==effect.sourceBodyId)
      fail('ERR_MAGIC_COGNITION_EFFECT_NOT_COMMITTED');
    const lifecycleEvents=published.filter(event=>event.effectId===effectId && event.type==='MagicEffectLifecycleChanged');
    const lifecycle=lifecycleEvents[0];
    if(lifecycleEvents.length>1 || lifecycle && (!exact(lifecycle,['type','effectId','at','to'])
      || lifecycle.at!==scope.world_time || lifecycle.to!==effect.status || original)) fail('ERR_MAGIC_COGNITION_EFFECT_NOT_COMMITTED');
    if(lifecycle) {
      const prior=this.#db.prepare(`${COGNITION_HISTORY_SQL} SELECT e.value AS effect_json FROM host_magic_commits_v2 m
        JOIN history h ON h.commit_ref=m.commit_ref AND h.branch_id=m.branch_id,
          json_each(m.projection_json,'$.effects') e
        WHERE json_extract(e.value,'$.id')=$effectId AND h.depth>0 ORDER BY h.depth LIMIT 1`)
        .get({$commitRef:scope.commit_ref,$runId:scope.run_id,$effectId:effectId});
      if(!prior) fail('ERR_MAGIC_COGNITION_EFFECT_NOT_COMMITTED');
      const old=JSON.parse(prior.effect_json);
      const {status:oldStatus,...oldFields}=old; const {status:newStatus,...newFields}=effect;
      if(abilityDigest(oldFields)!==abilityDigest(newFields) || oldStatus==='ended' || oldStatus===newStatus
        || !['active','suppressed'].includes(oldStatus)
        || !['active','suppressed','ended'].includes(newStatus)
        || newStatus!=='ended' && effect.expiresAt!==null && effect.expiresAt<=scope.world_time)
        fail('ERR_MAGIC_COGNITION_EFFECT_NOT_COMMITTED');
    }
    if (!(original && effect.status==='active' && effect.startedAt===scope.world_time
      && abilityDigest(original)===abilityDigest(effect.event)) && !lifecycle) fail('ERR_MAGIC_COGNITION_EFFECT_NOT_COMMITTED');
    // The reducer appends effects alongside their memoryAccess records. The
    // sealed position, not the order of publisher batches/observations, is the
    // original cross-effect precedence and remains unchanged on resume.
    const sequence=sealed.effect_sequence;
    if(!Number.isSafeInteger(sequence)||sequence<0) fail('ERR_MAGIC_COGNITION_EFFECT_NOT_COMMITTED');
    return { state,effect,sequence };
  }
  #owner(state,ownerId,mindId) {
    id(ownerId); id(mindId);
    if (magicOwn(state.identity.minds,mindId)?.actorId!==ownerId || mindId!==`mind:${ownerId}`) fail();
  }
  #known(scope,ownerId,observationIds,effective=false,acquisitionEffectId=null) {
    const sql=effective?(acquisitionEffectId?ACQUISITION_AUTHORIZED_SQL:COGNITION_AUTHORIZED_SQL):COGNITION_KNOWN_SQL;
    const rows=this.#db.prepare(`${sql} SELECT id FROM visible_observations WHERE id IN (SELECT value FROM json_each($ids))`)
      .all({...this.#bindings(scope,ownerId),$ids:JSON.stringify(observationIds),...(acquisitionEffectId?{$acquisitionEffectId:acquisitionEffectId}:{})});
    if (rows.length!==observationIds.length) fail();
  }
  #mappedSources(scope,ownerId,state,recordIds) {
    const ids=new Set();
    for(const recordId of recordIds) {
      if(!state.memories.some(row=>row.id===recordId&&row.ownerMindId===`mind:${ownerId}`)) fail();
      const observation=this.#db.prepare(`${COGNITION_KNOWN_SQL} SELECT id FROM visible_observations WHERE id=$id`)
        .get({...this.#bindings(scope,ownerId),$id:recordId});
      if(observation) { ids.add(recordId); continue; }
      const record=this.#db.prepare(`${COGNITION_KNOWN_SQL} SELECT id FROM current_records WHERE id=$id`)
        .get({...this.#bindings(scope,ownerId),$id:recordId});
      if(!record) fail();
      for(const row of this.#db.prepare('SELECT observation_id FROM cognition_record_sources WHERE record_id=?').all(recordId)) ids.add(row.observation_id);
    }
    const result=[...ids]; if(!result.length || result.length>128) fail(); this.#known(scope,ownerId,result); return result;
  }
  /** Metadata-only restoration check. Healing cannot renew a sharing grant:
   * its ORIGINAL effect must still be active and unexpired independently of
   * ordinary access overlays. Permanent revocations remain excluded in SQL. */
  assertRestorableSources({commitRef,ownerId,observationIds}) {
    const scope=this.#scope(commitRef); id(ownerId);
    if(!Array.isArray(observationIds)||!observationIds.length||new Set(observationIds).size!==observationIds.length) fail();
    observationIds.forEach(id); this.#known(scope,ownerId,observationIds);
    const denied=this.#db.prepare(`${COGNITION_AUTHORIZED_SQL}
      SELECT origin.observation_id FROM magic_cognition_origins origin
      JOIN known_observations known ON known.id=origin.observation_id
      WHERE origin.owner_id=$actorId AND origin.mind_id='mind:'||$actorId
        AND origin.observation_id IN (SELECT value FROM json_each($ids))
        AND NOT EXISTS(SELECT 1 FROM magic_access_ranked a
          WHERE a.observation_id=origin.observation_id AND a.effect_id=origin.effect_id
            AND a.effect_rank=1 AND a.effect_status='active' AND a.access_mode='restored'
            AND (a.ends_at IS NULL OR a.ends_at>$worldTime))`)
      .all({...this.#bindings(scope,ownerId),$ids:JSON.stringify(observationIds)});
    if(denied.length) fail('ERR_MAGIC_COGNITION_NONRESTORABLE_ORIGIN');
    return {sourceCount:observationIds.length};
  }
  #assertContinuity(scope) {
    // Read metadata only. Neither raw memory bodies nor record summaries leave SQL.
    // Traverse narrative ancestry, never previous_execution_ref/abandoned futures.
    const rows=this.#db.prepare(`${COGNITION_HISTORY_SQL}
      SELECT m.commit_ref,m.branch_id,m.request_id,m.expected_head,m.command_hash,m.events_json,h.depth,
        json_object('propertyTypes',json((SELECT json_group_object(p.key,p.type) FROM json_each(m.projection_json) p)),
          'version',json_extract(m.projection_json,'$.version'),
          'effects',json(json_extract(m.projection_json,'$.effects')),
          'memories',json((SELECT coalesce(json_group_array(json_object('id',json_extract(mm.value,'$.id'),
            'ownerMindId',json_extract(mm.value,'$.ownerMindId'))),'[]') FROM json_each(m.projection_json,'$.memories') mm)),
          'occupants',json(json_extract(m.projection_json,'$.identity.occupants')),
          'memoryAccess',json(coalesce(json_extract(m.projection_json,'$.memoryAccess'),'[]')),
          'representations',json((SELECT coalesce(json_group_array(json(r.value)),'[]')
            FROM json_each(m.projection_json,'$.representations') r WHERE json_extract(r.value,'$.kind')='shared-memory')),
          'bodies',json((SELECT coalesce(json_group_array(json_object('id',b.key,'alive',json_extract(b.value,'$.alive'))),'[]')
            FROM json_each(m.projection_json,'$.identity.bodies') b))) AS metadata_json
      FROM history h JOIN host_magic_commits_v2 m ON m.commit_ref=h.commit_ref AND m.branch_id=h.branch_id
      ORDER BY h.depth DESC`).all({$commitRef:scope.commit_ref,$runId:scope.run_id});
    const memoryOperation=effect=>['memory-share','mental-heal','memory-revoke'].includes(effect.event?.operation);
    let priorEffects=[];let priorAccess=[];let priorRepresentations=[];
    const seen=new Set();
    for(const row of rows) {
      const state=JSON.parse(row.metadata_json);const types=state.propertyTypes;
      const full=Object.hasOwn(types,'version');
      if(full ? types.version!=='integer' || state.version!==2 || rosterArrays.some(key=>types[key]!=='array')
        : Object.keys(types).some(key=>!minimalProjectionKeys.includes(key))
          || ['effects','memories'].some(key=>types[key]!=='array')
          || ['memoryAccess','representations','uses'].some(key=>Object.hasOwn(types,key)&&types[key]!=='array'))
        fail('ERR_MAGIC_COGNITION_EFFECT_NOT_COMMITTED');
      const all=state.effects;
      const effects=all.filter(memoryOperation);const ids=new Set(effects.map(effect=>effect.id));
      if(ids.size!==effects.length) fail('ERR_MAGIC_COGNITION_EFFECT_NOT_COMMITTED');
      for(const effect of priorEffects) if(!ids.has(effect.id)
        || all.findIndex(item=>item.id===effect.id)!==effect.sequence) fail('ERR_MAGIC_COGNITION_EFFECT_NOT_COMMITTED');
      effects.forEach(effect=>seen.add(effect.id));
      const access=state.memoryAccess||[];
      const representations=state.representations||[];
      if(access.some(item=>!ids.has(item.sourceEffectId)) || representations.some(item=>!ids.has(item.sourceEffectId)))
        fail('ERR_MAGIC_COGNITION_EFFECT_NOT_COMMITTED');
      if(access.length<priorAccess.length || priorAccess.some((item,index)=>abilityDigest(item)!==abilityDigest(access[index]))
        || representations.length<priorRepresentations.length
        || priorRepresentations.some((item,index)=>abilityDigest(item)!==abilityDigest(representations[index])))
        fail('ERR_MAGIC_COGNITION_EFFECT_NOT_COMMITTED');
      // An active source-death=end grant may not survive the actual dead source.
      for(const effect of effects) if(effect.sourceDeath==='end' && effect.status!=='ended'
        && state.bodies.some(body=>body.id===effect.sourceBodyId && body.alive===0)) fail('ERR_MAGIC_COGNITION_EFFECT_NOT_COMMITTED');
      if(full || types.representations==='array') {
        // Establishment creates exactly one representation per ordered record;
        // lifecycle changes retain these immutable rows rather than recreate them.
        const expected=effects.filter(effect=>effect.event.operation==='memory-share').flatMap(effect=>
          (effect.event.payload.recordIds||[]).map(recordId=>{
            const memories=state.memories.filter(memory=>memory.id===recordId);
            if(memories.length!==1) fail('ERR_MAGIC_COGNITION_EFFECT_NOT_COMMITTED');
            return {id:`shared:${effect.id}:${recordId}`,kind:'shared-memory',
              ownerMindId:magicOwn(state.occupants,effect.event.targetId),recordId,
              originalOwnerMindId:memories[0].ownerMindId,sourceEffectId:effect.id,at:effect.startedAt};
          }));
        if(expected.length!==representations.length || new Set(representations.map(item=>item.id)).size!==representations.length
          || expected.some((item,index)=>abilityDigest(item)!==abilityDigest(representations[index])))
          fail('ERR_MAGIC_COGNITION_EFFECT_NOT_COMMITTED');
      }
      if(effects.length && types.memoryAccess==='array') {
        const expected=effects.filter(effect=>effect.event.operation!=='memory-share').flatMap(effect=>
          (effect.event.payload.recordIds||[]).map(recordId=>({id:`access:${effect.id}:${recordId}`,recordId,
            sourceEffectId:effect.id,ownerMindId:magicOwn(state.occupants,effect.event.targetId),
            at:effect.startedAt,mode:effect.event.operation==='memory-revoke'?'revoked-access':'restored-access'})));
        if(expected.length!==access.length || expected.some((item,index)=>Object.entries(item).some(([key,value])=>access[index]?.[key]!==value)))
          fail('ERR_MAGIC_COGNITION_EFFECT_NOT_COMMITTED');
      }
      const events=JSON.parse(row.events_json);
      if(events.some(event=>(['memory-share','mental-heal','memory-revoke'].includes(event.operation)
        || event.type==='MagicEffectLifecycleChanged' && seen.has(event.effectId)) && !ids.has(event.effectId||event.id)))
        fail('ERR_MAGIC_COGNITION_EFFECT_NOT_COMMITTED');
      for(const effect of effects) {
        const old=priorEffects.find(item=>item.id===effect.id);
        const changed=!old || abilityDigest(old.value)!==abilityDigest(effect);
        const matching=events.filter(event=>(event.effectId||event.id)===effect.id);
        if(changed && (matching.length!==1 || old && matching[0].type!=='MagicEffectLifecycleChanged')
          || !changed && matching.length) fail('ERR_MAGIC_COGNITION_EFFECT_NOT_COMMITTED');
        if(changed) this.#proof(this.#scope(row.commit_ref),effect.id);
      }
      if(row.depth>0) this.#assertHistoricalPublication(row);
      priorEffects=effects.map(effect=>({id:effect.id,sequence:all.findIndex(item=>item.id===effect.id),value:effect}));
      priorAccess=access;priorRepresentations=representations;
    }
    // SQL origin/access proof cannot disappear merely by dropping every effect
    // and memoryAccess entry from all projections in an alternate producer.
    const sqlEffects=this.#db.prepare(`${COGNITION_HISTORY_SQL}
      SELECT DISTINCT a.effect_id FROM magic_cognition_access a JOIN history h ON h.commit_ref=a.commit_ref
        AND h.run_id=a.run_id AND h.branch_id=a.origin_branch_id
      UNION SELECT DISTINCT o.effect_id FROM magic_cognition_origins o JOIN history h ON h.commit_ref=o.commit_ref`)
      .all({$commitRef:scope.commit_ref,$runId:scope.run_id});
    if(sqlEffects.some(row=>!seen.has(row.effect_id))) fail('ERR_MAGIC_COGNITION_EFFECT_NOT_COMMITTED');
  }
  #assertHistoricalPublication(row) {
    const access=this.#db.prepare(`SELECT a.*,o.effect_id AS origin_effect FROM magic_cognition_access a
      LEFT JOIN magic_cognition_origins o ON o.observation_id=a.observation_id AND o.commit_ref=a.commit_ref
      WHERE a.commit_ref=?`).all(row.commit_ref);
    const origins=this.#db.prepare(`SELECT origin.*,o.event_ref FROM magic_cognition_origins origin
      JOIN cognition_observations o ON o.id=origin.observation_id WHERE origin.commit_ref=?`).all(row.commit_ref);
    const scope=this.#scope(row.commit_ref);
    for(const item of access) {
      const {effect,sequence,state}=this.#proof(scope,item.effect_id);
      if(item.run_id!==scope.run_id || item.origin_branch_id!==scope.branch_id
        || item.starts_at!==effect.startedAt || item.ends_at!==effect.expiresAt || item.sequence!==sequence
        || item.effect_status!==effect.status || item.mind_id!==magicOwn(state.identity.occupants,effect.event.targetId)
        || magicOwn(state.identity.minds,item.mind_id)?.actorId!==item.owner_id)
        fail('ERR_MAGIC_COGNITION_EFFECT_NOT_COMMITTED');
    }
    for(const origin of origins) {
      const matches=access.filter(item=>item.observation_id===origin.observation_id && item.effect_id===origin.effect_id
        && item.owner_id===origin.owner_id && item.mind_id===origin.mind_id && item.access_mode==='restored');
      if(matches.length!==1) fail('ERR_MAGIC_COGNITION_INCOMPLETE_PUBLICATION');
      const observation=this.#db.prepare(`SELECT o.owner_id,o.channel,o.learned_at,e.commit_ref FROM cognition_observations o
        JOIN domain_world_events e ON e.event_ref=o.event_ref WHERE o.id=?`).get(origin.observation_id);
      const source=this.#db.prepare('SELECT commit_ref,owner_id FROM cognition_observations WHERE id=?').get(origin.source_observation_id);
      if(!observation || observation.owner_id!==origin.owner_id || observation.channel!=='magic_shared_memory'
        || observation.commit_ref!==row.commit_ref || observation.learned_at!==scope.world_time
        || !source || source.commit_ref!==origin.source_commit_ref || source.owner_id!==origin.source_owner_id)
        fail('ERR_MAGIC_COGNITION_EFFECT_NOT_COMMITTED');
    }
    const accessChanges=access.filter(item=>!item.origin_effect).map(item=>({commitRef:row.commit_ref,
      ownerId:item.owner_id,mindId:item.mind_id,changes:[{effectId:item.effect_id,observationIds:[item.observation_id],mode:item.access_mode,status:item.effect_status}]}));
    const sharedMemories=origins.map(item=>({commitRef:row.commit_ref,effectId:item.effect_id,ownerId:item.owner_id,mindId:item.mind_id,
      sourceOwnerId:item.source_owner_id,sourceMindId:item.source_mind_id,sourceObservationIds:[item.source_observation_id],eventRef:item.event_ref}));
    this.#checkPublication({commitRef:row.commit_ref,ledger:{branchId:row.branch_id,requestId:row.request_id,
      expectedHead:row.expected_head,commandHash:row.command_hash},accessChanges,sharedMemories},true);
  }
  /** Exact pre-seal obligation check, derived from ledger effects and SQL
   * source closures, never from the publisher's claimed rows. The caller must
   * identify the immutable ledger even when both supplied lists are empty. */
  assertPublicationComplete(input) {
    if(!this.#db.isTransaction) fail('ERR_MAGIC_COGNITION_TRANSACTION');
    this.#assertContinuity(this.#scope(input.commitRef));
    return this.#checkPublication(input);
  }
  #checkPublication({commitRef,ledger,accessChanges=[],sharedMemories=[]},historical=false) {
    const scope=this.#scope(commitRef);
    const ledgerKeys=['branchId','requestId','expectedHead','commandHash'];
    const commandBinding=exact(ledger,[...ledgerKeys,'publicCommand','coreCommand']);
    if(!exact(ledger,ledgerKeys)&&!commandBinding) fail('ERR_MAGIC_COGNITION_COMMIT_METADATA_REQUIRED');
    const sealed=this.#db.prepare(`SELECT request_id,expected_head,command_hash,events_json,receipt_json FROM host_magic_commits_v2
      WHERE branch_id=? AND commit_ref=?`).get(scope.branch_id,scope.commit_ref);
    if(!sealed||ledger.branchId!==scope.branch_id||ledger.requestId!==sealed.request_id
      ||ledger.expectedHead!==scope.parent_commit_ref||sealed.expected_head!==scope.parent_commit_ref
      ||ledger.commandHash!==sealed.command_hash) fail('ERR_MAGIC_COGNITION_EFFECT_NOT_COMMITTED');
    const expectedAccess=[]; const expectedShared=[];
    const events=JSON.parse(sealed.events_json);
    const uses=this.#db.prepare(`SELECT u.value AS use_json FROM host_magic_commits_v2 m,json_each(m.projection_json,'$.uses') u
      WHERE m.branch_id=? AND m.commit_ref=? AND json_extract(u.value,'$.id')=?`)
      .all(scope.branch_id,scope.commit_ref,ledger.requestId);
    if(uses.length>1) fail('ERR_MAGIC_COGNITION_COMMAND_BINDING_REQUIRED');
    const coreUse=uses.length?JSON.parse(uses[0].use_json):null;
    const primaryEffects=new Set();
    const memoryEventIds=events.filter(event=>['memory-share','mental-heal','memory-revoke'].includes(event.operation)).map(event=>event.id);
    const otherUses=this.#db.prepare(`SELECT u.value AS use_json FROM host_magic_commits_v2 m,json_each(m.projection_json,'$.uses') u
      WHERE m.branch_id=? AND m.commit_ref=? AND json_extract(u.value,'$.id')<>?`)
      .all(scope.branch_id,scope.commit_ref,ledger.requestId);
    if(otherUses.some(row=>JSON.parse(row.use_json).receipt?.effectIds?.some(effectId=>memoryEventIds.includes(effectId))))
      fail('ERR_MAGIC_COGNITION_COMMAND_BINDING_REQUIRED');
    if(coreUse && events.some(event=>['memory-share','mental-heal','memory-revoke'].includes(event.operation))) {
      const receipt=JSON.parse(sealed.receipt_json);
      // Membership comes ONLY from the current immutable primary use/receipt.
      // Inherited uses, matching operations, event names and caller flags do
      // not establish ownership of a newly appended reducer primitive.
      const inherited=this.#db.prepare(`${COGNITION_HISTORY_SQL} SELECT 1 FROM host_magic_commits_v2 m
        JOIN history h ON h.commit_ref=m.commit_ref AND h.branch_id=m.branch_id,
        json_each(m.projection_json,'$.uses') u WHERE h.depth>0 AND json_extract(u.value,'$.id')=$useId LIMIT 1`)
        .get({$commitRef:scope.commit_ref,$runId:scope.run_id,$useId:ledger.requestId});
      if(inherited || coreUse.branchId!==scope.branch_id || coreUse.headCommitRef!==scope.parent_commit_ref
        || coreUse.at!==scope.world_time || receipt.useId!==ledger.requestId
        || abilityDigest(receipt)!==abilityDigest(coreUse.receipt)
        || !Array.isArray(receipt.effectIds) || !receipt.effectIds.length
        || new Set(receipt.effectIds).size!==receipt.effectIds.length)
        fail('ERR_MAGIC_COGNITION_COMMAND_BINDING_REQUIRED');
      for(const effectId of receipt.effectIds) {
        const issued=events.filter(event=>event.id===effectId && event.type!=='MagicEffectLifecycleChanged');
        const projected=this.#db.prepare(`SELECT e.value AS effect_json FROM host_magic_commits_v2 m,
          json_each(m.projection_json,'$.effects') e WHERE m.branch_id=? AND m.commit_ref=? AND json_extract(e.value,'$.id')=?`)
          .all(scope.branch_id,scope.commit_ref,effectId);
        if(issued.length!==1 || projected.length!==1) fail('ERR_MAGIC_COGNITION_COMMAND_BINDING_REQUIRED');
        const effect=JSON.parse(projected[0].effect_json);
        if(abilityDigest(issued[0])!==abilityDigest(effect.event) || effect.startedAt!==coreUse.at
          || effect.event.definitionRef!==coreUse.definitionRef || effect.event.grantId!==coreUse.grantId
          || effect.event.sourceMindId!==coreUse.sourceMindId)
          fail('ERR_MAGIC_COGNITION_COMMAND_BINDING_REQUIRED');
        primaryEffects.add(effectId);
      }
    }
    // Independently detect new/changed memory effects from immutable SQL
    // projections too. Omitting an event as well as all deltas must not make
    // an effect disappear from the publication obligations.
    const current=this.#db.prepare(`SELECT e.value AS effect_json FROM host_magic_commits_v2 m,
      json_each(m.projection_json,'$.effects') e WHERE m.branch_id=? AND m.commit_ref=?
      AND json_extract(e.value,'$.event.operation') IN ('memory-share','mental-heal','memory-revoke')`)
      .all(scope.branch_id,scope.commit_ref);
    for(const row of current) {
      const effect=JSON.parse(row.effect_json);
      const prior=this.#db.prepare(`${COGNITION_HISTORY_SQL}
        SELECT e.value AS effect_json FROM host_magic_commits_v2 m JOIN history h
          ON h.commit_ref=m.commit_ref AND h.branch_id=m.branch_id,
          json_each(m.projection_json,'$.effects') e
        WHERE h.depth>0 AND json_extract(e.value,'$.id')=$effectId ORDER BY h.depth LIMIT 1`)
        .get({$commitRef:scope.commit_ref,$runId:scope.run_id,$effectId:effect.id});
      if((!prior||abilityDigest(JSON.parse(prior.effect_json))!==abilityDigest(effect))
        &&!events.some(event=>(event.effectId||event.id)===effect.id)) fail('ERR_MAGIC_COGNITION_EFFECT_NOT_COMMITTED');
    }
    const effects=new Set();
    for(const event of events) {
      const effectId=event.type==='MagicEffectLifecycleChanged'?event.effectId:event.id;
      if(!effectId) continue;
      // Ignore physical effects, but inspect the ledger's effect metadata for
      // lifecycle events (which do not repeat their operation).
      const operation=this.#db.prepare(`SELECT json_extract(e.value,'$.event.operation') AS operation
        FROM host_magic_commits_v2 m,json_each(m.projection_json,'$.effects') e
        WHERE m.branch_id=? AND m.commit_ref=? AND json_extract(e.value,'$.id')=?`)
        .get(scope.branch_id,scope.commit_ref,effectId)?.operation;
      if(!['memory-share','mental-heal','memory-revoke'].includes(operation)) continue;
      if(effects.has(effectId)) fail('ERR_MAGIC_COGNITION_INCOMPLETE_PUBLICATION'); effects.add(effectId);
      const {state,effect}=this.#proof(scope,effectId);
      if(event.type!=='MagicEffectLifecycleChanged') {
        // A real core cast has two DISTINCT hashes: the public opaque command
        // in MagicRepository and the SQL-ID-resolved command in state.uses.
        // Do not "repair" either hash to match the other representation.
        if(primaryEffects.has(effectId) && !historical) {
          if(!commandBinding) fail('ERR_MAGIC_COGNITION_COMMAND_BINDING_REQUIRED');
          const publicCommand=ledger.publicCommand; const coreCommand=ledger.coreCommand;
          if(abilityDigest(publicCommand)!==sealed.command_hash||abilityDigest(coreCommand)!==coreUse.commandHash
            ||publicCommand.useId!==ledger.requestId||coreCommand.useId!==ledger.requestId
            ||coreCommand.definitionRef!==coreUse.definitionRef || coreCommand.grantId!==coreUse.grantId
            ||`mind:${coreCommand.actorId}`!==coreUse.sourceMindId
            ||abilityDigest({...publicCommand,parameters:null})!==abilityDigest({...coreCommand,parameters:null})
            ||!exact(publicCommand.parameters,['recordIds'])||!exact(coreCommand.parameters,['recordIds'])
            ||!Array.isArray(publicCommand.parameters.recordIds)||!Array.isArray(coreCommand.parameters.recordIds)
            ||abilityDigest(coreCommand.parameters.recordIds)!==abilityDigest(effect.event.payload.recordIds)
            ||publicCommand.parameters.recordIds.length!==coreCommand.parameters.recordIds.length
            ||new Set(publicCommand.parameters.recordIds).size!==publicCommand.parameters.recordIds.length
            ||new Set(coreCommand.parameters.recordIds).size!==coreCommand.parameters.recordIds.length) fail('ERR_MAGIC_COGNITION_COMMAND_BINDING_REQUIRED');
          for(const [index,recordId] of coreCommand.parameters.recordIds.entries()) {
            const memory=state.memories.filter(row=>row.id===recordId); if(memory.length!==1) fail();
            const ownerId=magicOwn(state.identity.minds,memory[0].ownerMindId)?.actorId; id(ownerId);
            const opaque=`magic-${abilityDigest([{branchId:scope.branch_id,headCommitRef:scope.parent_commit_ref,generation:scope.generation},
              scope.world_time,`mind:${publicCommand.actorId}`,'memory-record',`${ownerId}/${recordId}`]).slice(0,40)}`;
            if(publicCommand.parameters.recordIds[index]!==opaque) fail('ERR_MAGIC_COGNITION_COMMAND_BINDING_REQUIRED');
          }
        }
      }
      const mindId=magicOwn(state.identity.occupants,effect.event.targetId);
      const ownerId=magicOwn(state.identity.minds,mindId)?.actorId; this.#owner(state,ownerId,mindId);
      if(operation==='memory-share'&&event.type!=='MagicEffectLifecycleChanged') {
        const recordIds=effect.event.payload.recordIds;
        if(!Array.isArray(recordIds)||!recordIds.length||new Set(recordIds).size!==recordIds.length) fail();
        const grouped=new Map();
        for(const recordId of recordIds) {
          const memory=state.memories.filter(row=>row.id===recordId);
          if(memory.length!==1) fail();
          const sourceMindId=memory[0].ownerMindId; const sourceOwnerId=magicOwn(state.identity.minds,sourceMindId)?.actorId;
          this.#owner(state,sourceOwnerId,sourceMindId);
          if(!Array.isArray(effect.event.payload.localMindIds) || !effect.event.payload.localMindIds.includes(sourceMindId)) fail();
          const ids=grouped.get(sourceOwnerId)||[]; ids.push(recordId); grouped.set(sourceOwnerId,ids);
        }
        for(const [sourceOwnerId,recordIds] of grouped) {
          const ids=this.#mappedSources(scope,sourceOwnerId,state,recordIds);
          // Replay acquisition at the ORIGINAL share clock/head, including the
          // technical ACL and originating grant, not merely known provenance.
          // All mapped sources must authorize before any source body is read.
          this.#known(scope,sourceOwnerId,ids,true,effectId);
          for(const sourceId of ids) expectedShared.push({effectId,ownerId,mindId,sourceOwnerId,sourceMindId:`mind:${sourceOwnerId}`,sourceId});
        }
      } else {
        const ids=operation==='memory-share'?this.#db.prepare(`${COGNITION_HISTORY_SQL}
          SELECT origin.observation_id FROM magic_cognition_origins origin JOIN history h ON h.commit_ref=origin.commit_ref
          WHERE origin.owner_id=$actorId AND origin.mind_id=$mindId AND origin.effect_id=$effectId`)
          .all({$commitRef:scope.commit_ref,$runId:scope.run_id,$actorId:ownerId,$mindId:mindId,$effectId:effectId}).map(row=>row.observation_id)
          :this.#mappedSources(scope,ownerId,state,effect.event.payload.recordIds||[]);
        if(!ids.length) fail();
        for(const sourceId of ids) expectedAccess.push({effectId,ownerId,mindId,sourceId,mode:operation==='memory-revoke'?'blocked':'restored',status:effect.status});
      }
    }
    const actualAccess=[]; const actualShared=[];
    if(!Array.isArray(accessChanges)||!Array.isArray(sharedMemories)) fail();
    for(const row of accessChanges) {
      if(row.commitRef!==commitRef||!Array.isArray(row.changes)) fail();
      for(const change of row.changes) {
        if(!Array.isArray(change.observationIds)) fail();
        for(const sourceId of change.observationIds) actualAccess.push({effectId:change.effectId,ownerId:row.ownerId,mindId:row.mindId,sourceId,mode:change.mode,status:change.status});
      }
    }
    for(const row of sharedMemories) {
      if(row.commitRef!==commitRef||!Array.isArray(row.sourceObservationIds)) fail();
      for(const sourceId of row.sourceObservationIds) actualShared.push({effectId:row.effectId,ownerId:row.ownerId,mindId:row.mindId,sourceOwnerId:row.sourceOwnerId,sourceMindId:row.sourceMindId,sourceId});
    }
    const canonical=rows=>rows.map(row=>abilityDigest(row)).sort();
    if(abilityDigest(canonical(expectedAccess))!==abilityDigest(canonical(actualAccess))
      ||abilityDigest(canonical(expectedShared))!==abilityDigest(canonical(actualShared))) fail('ERR_MAGIC_COGNITION_INCOMPLETE_PUBLICATION');
    return {effectCount:effects.size,accessSourceCount:expectedAccess.length,sharedSourceCount:expectedShared.length};
  }
  appendMagicAccessChanges(input) {
    return this.#operation(()=>{
      const args=magicJson(input);
      if(!exact(args,['commitRef','ownerId','mindId','changes']) || !Array.isArray(args.changes)||!args.changes.length||args.changes.length>128) fail();
      const scope=this.#scope(args.commitRef); const rows=[];
      for(const change of args.changes) {
        if(!exact(change,['effectId','observationIds','mode','status']) || !['blocked','restored'].includes(change.mode)
          || !['active','suppressed','ended'].includes(change.status) || !Array.isArray(change.observationIds)
          || !change.observationIds.length || new Set(change.observationIds).size!==change.observationIds.length) fail();
        const {state,effect,sequence}=this.#proof(scope,change.effectId); this.#owner(state,args.ownerId,args.mindId);
        if(magicOwn(state.identity.occupants,effect.event.targetId)!==args.mindId || effect.status!==change.status) fail();
        let allowed;
        if(effect.event.operation==='memory-share') {
          if(change.mode!=='restored') fail();
          allowed=this.#db.prepare(`${COGNITION_HISTORY_SQL} SELECT origin.observation_id FROM magic_cognition_origins origin
            JOIN history h ON h.commit_ref=origin.commit_ref WHERE origin.owner_id=$actorId AND origin.mind_id=$mindId AND origin.effect_id=$effectId`)
            .all({$commitRef:scope.commit_ref,$runId:scope.run_id,$actorId:args.ownerId,$mindId:args.mindId,$effectId:effect.id}).map(row=>row.observation_id);
        } else {
          if(effect.event.operation!==(change.mode==='blocked'?'memory-revoke':'mental-heal')) fail();
          allowed=this.#mappedSources(scope,args.ownerId,state,effect.event.payload.recordIds||[]);
        }
        for(const sourceId of change.observationIds) { id(sourceId); if(!allowed.includes(sourceId)) fail(); }
        this.#known(scope,args.ownerId,change.observationIds);
        if(effect.event.operation==='mental-heal') this.assertRestorableSources({commitRef:scope.commit_ref,ownerId:args.ownerId,observationIds:change.observationIds});
        for(const sourceId of change.observationIds) rows.push({effect,sourceId,sequence,mode:change.mode,status:change.status});
      }
      const insert=this.#db.prepare('INSERT INTO magic_cognition_access VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,1)');
      for(const row of rows) {
        const existing=this.#db.prepare('SELECT access_mode,effect_status,starts_at,ends_at FROM magic_cognition_access WHERE commit_ref=? AND owner_id=? AND observation_id=? AND effect_id=?')
          .get(scope.commit_ref,args.ownerId,row.sourceId,row.effect.id);
        if(existing) { if(existing.access_mode!==row.mode||existing.effect_status!==row.status||existing.starts_at!==row.effect.startedAt||existing.ends_at!==row.effect.expiresAt) fail(); continue; }
        insert.run(randomUUID(),scope.run_id,scope.branch_id,scope.commit_ref,args.ownerId,args.mindId,row.sourceId,row.effect.id,
          row.mode,row.status,row.effect.startedAt,row.effect.expiresAt,row.sequence);
      }
      return { sourceCount:rows.length,policyRef:'magic-effective-access@1' };
    });
  }
  appendSharedMemories(input) {
    return this.#operation(()=>{
      const args=magicJson(input);
      if(!exact(args,['commitRef','effectId','ownerId','mindId','sourceOwnerId','sourceMindId','sourceObservationIds','eventRef'])
        || !Array.isArray(args.sourceObservationIds)||!args.sourceObservationIds.length||args.sourceObservationIds.length>128
        || new Set(args.sourceObservationIds).size!==args.sourceObservationIds.length) fail();
      const scope=this.#scope(args.commitRef); const {state,effect,sequence}=this.#proof(scope,args.effectId);
      this.#owner(state,args.ownerId,args.mindId); this.#owner(state,args.sourceOwnerId,args.sourceMindId);
      if(effect.event.operation!=='memory-share'||effect.status!=='active'||effect.expiresAt!==null&&effect.expiresAt<=scope.world_time
        || magicOwn(state.identity.occupants,effect.event.targetId)!==args.mindId
        || !effect.event.payload.localMindIds?.includes(args.sourceMindId)) fail();
      const approvedRecords=(effect.event.payload.recordIds||[]).filter(recordId=>state.memories.some(row=>row.id===recordId&&row.ownerMindId===args.sourceMindId));
      const allowed=this.#mappedSources(scope,args.sourceOwnerId,state,approvedRecords);
      if(args.sourceObservationIds.some(sourceId=>!allowed.includes(sourceId))) fail();
      this.#known(scope,args.sourceOwnerId,allowed,true,args.effectId);
      const event=this.#db.prepare(`${COGNITION_HISTORY_SQL} SELECT e.event_ref FROM domain_world_events e JOIN history h ON h.commit_ref=e.commit_ref
        AND h.run_id=e.run_id AND h.branch_id=e.branch_id WHERE e.event_ref=$eventRef AND e.commit_ref=$commitRef`)
        .get({$commitRef:scope.commit_ref,$runId:scope.run_id,$eventRef:id(args.eventRef)});
      if(!event) fail();
      // DomainStore.record seals cognition before it returns. A real shared
      // observation must be published inside Domain's pre-seal cognition hook,
      // not by deleting anchors or bypassing its immutable insert trigger.
      // Keep access-only overlays usable after record; refuse sharing clearly.
      if(this.#db.prepare("SELECT 1 FROM sqlite_schema WHERE type='table' AND name='domain_save_anchors'").get()
        && this.#db.prepare('SELECT 1 FROM domain_save_anchors WHERE commit_ref=?').get(scope.commit_ref)) fail('ERR_MAGIC_COGNITION_DOMAIN_PRESEAL_REQUIRED');
      const store=new CognitionStore(this.#db); const result=[];
      for(const sourceId of args.sourceObservationIds) {
        const existing=this.#db.prepare('SELECT observation_id FROM magic_cognition_origins WHERE commit_ref=? AND owner_id=? AND effect_id=? AND source_observation_id=?')
          .get(scope.commit_ref,args.ownerId,args.effectId,sourceId);
        if(existing) { result.push(existing.observation_id); continue; }
        // The FIRST body read is owner+ancestor+clock+effective-access joined.
        const source=this.#db.prepare(`${ACQUISITION_AUTHORIZED_SQL} SELECT o.text,o.commit_ref FROM visible_observations v
          JOIN cognition_observations o ON o.id=v.id AND o.owner_id=$actorId WHERE o.id=$id`)
          .get({...this.#bindings(scope,args.sourceOwnerId),$acquisitionEffectId:args.effectId,$id:sourceId});
        if(!source) fail(); const targetId=randomUUID();
        store.appendObservations({commitRef:scope.commit_ref,observations:[{id:targetId,ownerId:args.ownerId,eventRef:args.eventRef,
          text:source.text,channel:'magic_shared_memory',occurredAt:scope.world_time,learnedAt:scope.world_time}]});
        this.#db.prepare('INSERT INTO magic_cognition_origins VALUES(?,?,?,?,?,?,?,?,?,1)').run(targetId,scope.commit_ref,args.ownerId,args.mindId,
          sourceId,args.sourceOwnerId,args.sourceMindId,args.effectId,source.commit_ref);
        this.#db.prepare('INSERT INTO magic_cognition_access VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,1)').run(randomUUID(),scope.run_id,scope.branch_id,
          scope.commit_ref,args.ownerId,args.mindId,targetId,effect.id,'restored',effect.status,effect.startedAt,effect.expiresAt,sequence);
        result.push(targetId);
      }
      return {observationIds:result,policyRef:'magic-owner-local-shared-memory@1'};
    });
  }
}

/** Access-only integration: call AFTER DomainStore.record and the immutable
 * MagicRepository.append, BEFORE the caller transaction commits. Sharing also
 * inserts ordinary observations: use DomainStore.recordWithMagic to publish
 * AFTER its cognition/events but BEFORE #anchor seals the commit;
 * post-record sharing fails explicitly rather than bypassing that protection.
 * No standalone transaction and no implicit world truth extraction. */
export function publishMagicCognition(db,{commitRef,ledger,accessChanges=[],sharedMemories=[]}) {
  if(!Array.isArray(accessChanges)||!Array.isArray(sharedMemories)) fail();
  const store=new MagicCognitionStore(db);
  // One outer savepoint prevents partial access publication if sharing fails.
  if(!db.isTransaction) fail('ERR_MAGIC_COGNITION_TRANSACTION');
  const name=`publish_magic_${randomUUID().replaceAll('-','')}`; const sqlScope=openSqliteScope(db,name);
  try {
    store.initialize();
    // Domain must pass these even for []/[]: there is no safe way to infer
    // an omitted memory effect from an empty caller-supplied list.
    if(!magicId(commitRef)||!ledger) {
      // Compatibility ONLY for existing physical-only Domain publications.
      // Identify the one unsealed child on this connection; a memory effect
      // (including a lifecycle event) always requires the explicit metadata.
      if(accessChanges.length||sharedMemories.length
        ||!db.prepare("SELECT 1 FROM sqlite_schema WHERE type='table' AND name='domain_save_anchors'").get()) fail('ERR_MAGIC_COGNITION_COMMIT_METADATA_REQUIRED');
      const pending=db.prepare(`SELECT m.commit_ref,m.branch_id,m.request_id,m.expected_head,m.command_hash,
        m.events_json,m.projection_json FROM host_magic_commits_v2 m
        JOIN domain_commits c ON c.commit_ref=m.commit_ref AND c.branch_id=m.branch_id
        JOIN domain_head h ON h.commit_ref=m.expected_head AND h.run_id=c.run_id
        WHERE c.parent_commit_ref=m.expected_head AND NOT EXISTS(
          SELECT 1 FROM domain_save_anchors a WHERE a.commit_ref=m.commit_ref)`).all();
      if(pending.length!==1) fail('ERR_MAGIC_COGNITION_COMMIT_METADATA_REQUIRED');
      const row=pending[0]; const effects=JSON.parse(row.projection_json).effects||[];
      if(JSON.parse(row.events_json).some(event=>['memory-share','mental-heal','memory-revoke'].includes(
        effects.find(effect=>effect.id===(event.effectId||event.id))?.event.operation))) fail('ERR_MAGIC_COGNITION_COMMIT_METADATA_REQUIRED');
      commitRef=row.commit_ref;
      ledger={branchId:row.branch_id,requestId:row.request_id,expectedHead:row.expected_head,commandHash:row.command_hash};
    }
    store.assertPublicationComplete({commitRef,ledger,accessChanges,sharedMemories});
    // Interleave individual obligations in sealed causal order. Preserve the
    // public result's caller grouping; neither batches nor their input order
    // may force all access changes ahead of earlier acquisitions.
    const sealed=db.prepare(`SELECT events_json,(SELECT json_group_object(json_extract(e.value,'$.id'),CAST(e.key AS INTEGER))
      FROM json_each(projection_json,'$.effects') e) AS positions FROM host_magic_commits_v2 WHERE commit_ref=?`).get(commitRef);
    const positions=JSON.parse(sealed.positions);const events=JSON.parse(sealed.events_json);
    const position=effectId=>{
      const lifecycle=events.findIndex(e=>e.type==='MagicEffectLifecycleChanged'&&e.effectId===effectId);
      if(lifecycle<0) return positions[effectId];
      const next=events.slice(lifecycle+1).find(e=>Object.hasOwn(positions,e.id));
      return next?positions[next.id]-0.5:Math.max(-1,...Object.values(positions))+0.5;
    };
    for(const input of accessChanges) if(!exact(input,['commitRef','ownerId','mindId','changes'])
      ||!Array.isArray(input.changes)||!input.changes.length||input.changes.length>128) fail();
    const access=accessChanges.map(()=>({sourceCount:0,policyRef:'magic-effective-access@1'}));const shared=[];
    const obligations=accessChanges.flatMap((input,index)=>input.changes.map(change=>({position:position(change.effectId),
      apply:()=>{access[index].sourceCount+=store.appendMagicAccessChanges({...input,changes:[change]}).sourceCount;}})));
    sharedMemories.forEach((input,index)=>obligations.push({position:position(input.effectId),
      apply:()=>{shared[index]=store.appendSharedMemories(input);}}));
    obligations.sort((a,b)=>a.position-b.position).forEach(row=>row.apply());
    sqlScope.release(); return {access,shared};
  } catch(error) {sqlScope.rollback();throw error;}
}

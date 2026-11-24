import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { EVENT_DIRECTOR_RUNTIME_REVISION } from '../director/director-event-runtime.mjs';
import { decideRunPolicyChange, normalizeRunPolicyRequest, runPolicyRootValues } from '../content/run-policy-contract.mjs';

export const RUN_POLICY_KIND = 'run_policy';
const identity = 'effective-run-policy@1';
const hash = text => createHash('sha256').update(text).digest('hex');
const seal = value => hash(JSON.stringify(value));
const fail = () => { throw Object.assign(new Error('本局策略账本与实际剧情来源不一致。'), { code: 'INVALID_DOMAIN_STATE' }); };

function v1ActiveCase(state) {
  if (state.caseOne || state.storyArc || state.caseRuntime?.procedure) return true;
  const runtime = state.caseRuntime;
  const archived = new Set((runtime?.procedureHistory || []).flatMap(row => row.incidentIds || [row.incidentId]));
  return Boolean(runtime?.incidents?.some(incident => !archived.has(incident.id))
    || runtime?.operations?.some(operation => operation.kind === 'attack' && operation.status === 'pending'));
}

// Prevent newly excluding an already adopted case plan, even before an
// attack is pending. Keep the original ledger reader for pre-existing v1
// receipts; enforcement applies at current actual adoption, not replay.
export function activeRunPolicyCase(state) {
  return v1ActiveCase(state) || Boolean(state.caseRuntime?.plans?.some(plan => !['abandoned', 'completed'].includes(plan.status)));
}

export function initializeRunPolicyAuthority(db) {
  db.exec(`CREATE TABLE IF NOT EXISTS domain_run_policy_v1 (
    commit_ref TEXT PRIMARY KEY REFERENCES domain_commits(commit_ref),
    parent_policy_hash TEXT NOT NULL CHECK(length(parent_policy_hash)=64),
    request_json TEXT NOT NULL, request_hash TEXT NOT NULL CHECK(length(request_hash)=64),
    version INTEGER NOT NULL CHECK(version=1));
    CREATE TRIGGER IF NOT EXISTS domain_run_policy_v1_no_insert BEFORE INSERT ON domain_run_policy_v1
      WHEN EXISTS(SELECT 1 FROM domain_run_policy_v1 WHERE commit_ref=NEW.commit_ref)
        OR NOT EXISTS(SELECT 1 FROM domain_commits WHERE commit_ref=NEW.commit_ref AND kind='run_policy')
      BEGIN SELECT RAISE(ABORT,'invalid run policy adoption'); END;
    CREATE TRIGGER IF NOT EXISTS domain_run_policy_v1_no_update BEFORE UPDATE ON domain_run_policy_v1
      BEGIN SELECT RAISE(ABORT,'immutable run policy adoption'); END;
    CREATE TRIGGER IF NOT EXISTS domain_run_policy_v1_no_delete BEFORE DELETE ON domain_run_policy_v1
      BEGIN SELECT RAISE(ABORT,'immutable run policy adoption'); END;`);
}

export const runPolicyCommitState = state => ({ ...state, revision: state.revision + 1 });
export const sameRunPolicyState = (before, after) => isDeepStrictEqual(runPolicyCommitState(before), after);

export function currentRunPolicyPending(db, scope) {
  return Boolean(db.prepare(`SELECT 1 FROM agent_turn_jobs WHERE generation=? AND branch_id=? AND base_revision=?
    AND status IN ('pending','running','failed') LIMIT 1`).get(scope.generation, scope.branch_id, scope.revision));
}

// Called only by DomainStore after it proves the input snapshot/scope. Verify
// every actual policy adoption on the selected narrative ancestry; never
// include the previous execution link, another run, a sibling, or a future.
export function readRunPolicyAuthority(db, state, head, readCommit, readInitial, proveCustomRoot) {
  if (state?.exampleId !== 'agent' || state.agentRuntimeRevision !== EVENT_DIRECTOR_RUNTIME_REVISION) return null;
  const history = db.prepare(`WITH RECURSIVE h(commit_ref,parent_commit_ref,kind) AS (
    SELECT commit_ref,parent_commit_ref,kind FROM domain_commits WHERE commit_ref=?
    UNION ALL SELECT c.commit_ref,c.parent_commit_ref,c.kind FROM domain_commits c JOIN h ON c.commit_ref=h.parent_commit_ref WHERE c.run_id=?
  ) SELECT c.commit_ref,c.parent_commit_ref,c.kind,p.version,p.request_json,p.request_hash,p.parent_policy_hash
    FROM h JOIN domain_commits c USING(commit_ref) LEFT JOIN domain_run_policy_v1 p USING(commit_ref)
    WHERE h.parent_commit_ref IS NULL OR h.kind='run_policy' OR p.commit_ref IS NOT NULL ORDER BY c.sequence`).all(head.commit_ref, head.run_id);
  const [rootRow, ...adoptions] = history;
  if (!rootRow || rootRow.parent_commit_ref !== null || rootRow.version !== null) fail();
  const root = readCommit(rootRow.commit_ref); const rootState = JSON.parse(root.snapshot_json); const creation = rootState.creation;
  const branch = db.prepare('SELECT branch_kind FROM domain_branches WHERE branch_id=?').get(root.branch_id);
  if (root.run_id !== head.run_id || root.kind !== 'new_game' || branch?.branch_kind !== 'root' || root.world_time !== 0
    || creation?.version !== 2 || !['original', 'custom'].includes(creation.playerMode) || !creation.cellSetup
    || creation.scenarioId || creation.storyArcId || rootState.agentOpening || rootState.fixtureBranch) {
    if (adoptions.length) fail();
    return null;
  }
  if (rootState.customAbilitySetup !== undefined || state.customAbilitySetup !== undefined) {
    if (creation.playerMode !== 'custom' || rootState.agentRuntimeRevision !== EVENT_DIRECTOR_RUNTIME_REVISION
      || rootState.customAbilitySetup?.version !== 2 || rootState.customAbilitySetup.profile !== 'ordinary-guarded@1'
      || !isDeepStrictEqual(state.customAbilitySetup, rootState.customAbilitySetup)) fail();
    proveCustomRoot(root, rootState);
  }
  const initial = readInitial(state);
  const initialValues = runPolicyRootValues(initial, readInitial(rootState));
  let values = initialValues; let adoptedCommitRef = null;
  let fingerprint = seal([identity, root.commit_ref, initial]);
  for (const row of adoptions) {
    if (row.kind !== RUN_POLICY_KIND || row.version !== 1 || row.parent_policy_hash !== fingerprint || hash(row.request_json) !== row.request_hash) fail();
    const commit = readCommit(row.commit_ref); const parent = readCommit(row.parent_commit_ref); const before = JSON.parse(parent.snapshot_json);
    if (commit.run_id !== head.run_id || parent.run_id !== head.run_id || commit.branch_id !== parent.branch_id
      || commit.generation !== parent.generation || commit.revision !== parent.revision + 1 || commit.world_time !== parent.world_time
      || commit.previous_execution_ref !== parent.commit_ref || commit.causal_key !== parent.causal_key
      || !sameRunPolicyState(before, JSON.parse(commit.snapshot_json))) fail();
    const request = normalizeRunPolicyRequest(JSON.parse(row.request_json));
    if (JSON.stringify(request) !== row.request_json) fail();
    const decision = decideRunPolicyChange(values, request, { generation: parent.generation, revision: parent.revision,
      pending: false, activeCase: v1ActiveCase(before) });
    if (!decision.changed) fail();
    values = decision.next; adoptedCommitRef = commit.commit_ref;
    fingerprint = seal([identity, fingerprint, adoptedCommitRef, request]);
  }
  return { initial: initialValues, pin: { version: 1, policyRef: identity, fingerprint,
    source: { ...initial.source, rootCommitRef: root.commit_ref, adoptedCommitRef }, ...values } };
}

export function prepareRunPolicyAdoption(db, scope, state, next, policy, input) {
  if (!policy || !sameRunPolicyState(state, next)) fail();
  const current = { directorPreferences: policy.pin.directorPreferences, playPolicy: policy.pin.playPolicy };
  const decision = decideRunPolicyChange(current, input, { generation: scope.generation, revision: scope.revision,
    pending: currentRunPolicyPending(db, scope), activeCase: activeRunPolicyCase(state) });
  if (!decision.changed) fail();
  const json = JSON.stringify(decision.request);
  return [policy.pin.fingerprint, json, hash(json)];
}

export const effectiveRunPolicyValues = policy => ({ directorPreferences: policy.pin.directorPreferences, playPolicy: policy.pin.playPolicy });

export function isRunPolicyReceiptAncestor(db, head, ref) {
  return Boolean(db.prepare(`WITH RECURSIVE h(commit_ref,parent_commit_ref) AS (
    SELECT commit_ref,parent_commit_ref FROM domain_commits WHERE commit_ref=?
    UNION ALL SELECT c.commit_ref,c.parent_commit_ref FROM domain_commits c JOIN h ON c.commit_ref=h.parent_commit_ref
  ) SELECT 1 FROM h JOIN domain_commits c USING(commit_ref)
    WHERE c.commit_ref=? AND c.run_id=? AND c.branch_id=? AND c.generation=?`).get(head.commit_ref, ref, head.run_id, head.branch_id, head.generation));
}

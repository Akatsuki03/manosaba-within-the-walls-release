import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { EVENT_DIRECTOR_RUNTIME_REVISION } from './director-event-runtime.mjs';
import { buildDirectorContext, DIRECTOR_ASSEMBLY_EFFECT, DIRECTOR_EVENT_EXTENSION, DIRECTOR_PRINCIPAL } from './director-boundaries.mjs';
import { causalPlayerScene } from '../scenes/causal-scene.mjs';
import { createdPlayerId } from '../creation/player-setup.mjs';
import { runtimeActive } from '../case-runtime.mjs';
import { activeProcedure } from '../cases/case-procedure.mjs';
import { guardProtected } from '../world/guard-reaction.mjs';
import { hasPrisonWorld, prisonClock } from '../world/prison-activity.mjs';

const hash = text => createHash('sha256').update(text).digest('hex');
const seal = value => hash(JSON.stringify(value));
const fail = () => { throw Object.assign(new Error('导演提案来源或封存任务不一致。'), { code: 'INVALID_AGENT_JOB' }); };
const FIRST_FREE_START = 6 * 3600;
const FIRST_FREE_END = 10 * 3600;
const OFFER_ID = 'first-assembly';

// Do not spend the optional slot in a multi-step, social, case or legacy
// broadcast action. Only the already validated single ordinary look can review.
export function directorEventMayReviewIntent(intent) {
  const step = intent?.steps?.[0];
  return intent?.route === 'steps' && intent.steps.length === 1 && intent.activitySelection?.kind === 'ordinary'
    && step.condition === 'always' && step.intent?.type === 'look' && !step.intent.targetId;
}

// P5.2.1: Host derives a proposal window only. No registration or effect may
// be read from this pin or the model result. No legacy plan store consumes it.
export function captureDirectorEventPin(db, { branchId, generation, revision, jobId, initialRunPolicy, executionRevision }, expectedState) {
  if (executionRevision?.revisionId !== EVENT_DIRECTOR_RUNTIME_REVISION) return null;
  if (typeof jobId !== 'string' || !jobId || !isDeepStrictEqual(initialRunPolicy?.source?.executionRevision, executionRevision)) fail();
  const base = db.prepare(`SELECT c.commit_ref,c.run_id,c.kind,c.snapshot_json,c.snapshot_hash,c.world_time,b.branch_kind,
    p.world_time AS previous_time,r.initial_setup_ref
    FROM domain_commits c JOIN domain_branches b ON b.branch_id=c.branch_id
    JOIN domain_runs r ON r.run_id=c.run_id LEFT JOIN domain_commits p ON p.commit_ref=c.parent_commit_ref
    WHERE c.branch_id=? AND c.generation=? AND c.revision=?`).get(branchId, generation, revision);
  if (!base || base.run_id !== initialRunPolicy.source.runId || base.initial_setup_ref !== initialRunPolicy.source.setupRef
    || hash(base.snapshot_json) !== base.snapshot_hash) fail();
  const state = JSON.parse(base.snapshot_json);
  if (expectedState !== undefined && !isDeepStrictEqual(state, expectedState)) fail();
  if (state.agentRuntimeRevision !== EVENT_DIRECTOR_RUNTIME_REVISION || state.generation !== generation
    || state.revision !== revision || state.worldTime !== base.world_time) fail();
  if (base.kind !== 'act' || base.branch_kind !== 'root' || state.agentActions.at(-1)?.type !== 'scene'
    || !Number.isSafeInteger(base.previous_time) || base.previous_time >= base.world_time
    || !state.creation?.cellSetup || state.creation.version !== 2 || state.creation.scenarioId || state.creation.storyArcId
    || state.customAbilitySetup || state.agentOpening || state.completed || state.fixtureBranch || state.caseRuntime?.occupiedBody
    || !hasPrisonWorld(state) || state.agentWorld.broadcasts.length || activeProcedure(state)
    || state.guardReaction?.pending || guardProtected(state)) return null;
  const { startSecond } = state.agentWorld;
  const clock = prisonClock(state);
  // First actual committed crossing into the ordinary morning free period.
  // Administrative writes and pre-morning actions do not manufacture a second window.
  if (clock.day !== 1 || !clock.free || base.previous_time + startSecond >= FIRST_FREE_START
    || state.worldTime + startSecond < FIRST_FREE_START || state.worldTime + startSecond >= FIRST_FREE_END) return null;
  const player = createdPlayerId(state);
  if (!runtimeActive(state, player)) return null;
  const scene = causalPlayerScene(state);
  if (!scene.screenAvailable || !/^(?:cell|cell\d+|playercell)$/u.test(scene.roomId)) return null;
  // An earlier sealed slot consumes this review even if its player act later
  // stays at the same head. Rebuilding old jobs ignores subsequent jobs.
  if (db.prepare(`SELECT 1 FROM agent_turn_jobs j JOIN agent_turn_tasks t ON t.job_id=j.job_id AND t.slot='director'
    WHERE j.branch_id=? AND j.generation=? AND j.base_revision=? AND j.job_id<>?
    AND j.rowid<COALESCE((SELECT rowid FROM agent_turn_jobs WHERE job_id=?),9223372036854775807) LIMIT 1`)
    .get(branchId, generation, revision, jobId, jobId)) return null;
  const boundary = 'opening_review'; const expiresAt = FIRST_FREE_END - startSecond;
  const windowKey = seal([DIRECTOR_ASSEMBLY_EFFECT, base.run_id, 1]);
  const premiseDigest = seal([scene.roomId, state.agentWorld.sourceHash, startSecond, base.previous_time, state.worldTime, 0]);
  const definitionFingerprint = seal([DIRECTOR_ASSEMBLY_EFFECT, state.agentWorld.sourceHash]);
  const scope = { actorId: DIRECTOR_PRINCIPAL, branchId, generation, revision };
  const source = { executionRevision, setupRef: base.initial_setup_ref, runId: base.run_id,
    executionCommitRef: base.commit_ref, sourceCommitRef: base.commit_ref, snapshotHash: base.snapshot_hash,
    jobId, windowKey, definitionFingerprint, premiseDigest };
  const sourceToken = seal([DIRECTOR_EVENT_EXTENSION, source, scope, boundary, OFFER_ID, DIRECTOR_ASSEMBLY_EFFECT, expiresAt]);
  const packet = buildDirectorContext({ role: 'director', scope, data: { version: 4, extension: DIRECTOR_EVENT_EXTENSION,
    boundary, storyTime: state.worldTime, offers: [{ offerId: OFFER_ID, effectRef: DIRECTOR_ASSEMBLY_EFFECT, sourceToken, expiresAt }], active: [] } });
  return { version: 1, source, packet };
}

import { abilityDigest, magicFail, magicJson, magicId } from './ability-definitions.mjs';
import { effectiveMemoryAccess } from './magic-effects.mjs';

/** Pure story-fork protocol, NOT a second branch store or technical save/load.
 * DomainStore/CommitService must consume this request in the SAME transaction
 * as death reactions, observations, generation invalidation and receipt. */
export function requestMagicRewind({ useId, definition, actorId, mindId, death, anchor,
  memoryRecords, memoryWhitelist, branch, playerMindId, sourceApproval, memoryAccessState }) {
  if (!magicId(useId) || definition?.operation !== 'death-rewind' || !magicId(actorId) || !magicId(mindId)
    || !magicId(branch?.id) || !magicId(branch?.headCommitRef) || !Number.isSafeInteger(branch?.generation)) magicFail('MAGIC_TIMELINE_CONTEXT');
  if (death?.kind !== 'actual-death' || death.mindId !== mindId || death.branchId !== branch.id
    || death.at !== branch.time || !Number.isSafeInteger(death.day) || death.day < 1
    || death.reactionsClosed !== false || !magicId(death.id)) magicFail('MAGIC_DEATH_TRIGGER');
  if (!anchor || anchor.kind !== 'morning-waking' || anchor.actorId !== actorId
    || anchor.branchId !== branch.id || !magicId(anchor.commitRef) || !magicId(anchor.id)
    || !Number.isSafeInteger(anchor.at) || anchor.at < 0 || anchor.at >= death.at
    || !Number.isSafeInteger(anchor.day) || anchor.day > death.day || !anchor.authorizedMindIds?.includes(mindId)
    || anchor.ancestorVerified !== true) magicFail('MAGIC_REWIND_ANCHOR');
  if (definition.stage === 'basic' && anchor.day !== death.day) magicFail('MAGIC_REWIND_SAME_MORNING');
  if (definition.stage === 'awakened' && sourceApproval?.triggerReachable !== true) magicFail('MAGIC_SOURCE_CHECK_REQUIRED');
  if (!Array.isArray(memoryWhitelist) || new Set(memoryWhitelist).size !== memoryWhitelist.length || memoryWhitelist.length > 512
    || !Array.isArray(memoryRecords)) magicFail('MAGIC_REWIND_MEMORY');
  if (memoryAccessState && (memoryAccessState.branchId !== branch.id || memoryAccessState.headCommitRef !== branch.headCommitRef
    || memoryAccessState.generation !== branch.generation || memoryAccessState.time !== branch.time)) magicFail('MAGIC_REWIND_ACCESS_BOUNDARY');
  // With a magic projection use the shared access predicate at the exact
  // commit boundary. Without one, memoryRecords MUST already be privately
  // access-filtered by DomainStore.storyForkContext; this compatibility path
  // cannot inspect cognition/RAG itself and is never an actor-facing API.
  const carry = memoryWhitelist.map(id => {
    const row = memoryRecords.find(record => record.id === id);
    if (!row || row.ownerMindId !== mindId || row.branchId !== branch.id || !magicId(row.sourceEventId)
      || !Number.isSafeInteger(row.learnedAt) || row.learnedAt > death.at || row.learnedAt < 0
      || (memoryAccessState ? !effectiveMemoryAccess(memoryAccessState, mindId, id)
        : row.accessible === false || row.revoked === true)) magicFail('MAGIC_REWIND_MEMORY');
    // Reference only; parent materializes authorized representations via RAG.
    return { recordId: id, ownerMindId: mindId, originBranchId: branch.id,
      sourceEventId: row.sourceEventId, learnedAt: row.learnedAt };
  });
  const request = { type: 'MagicStoryForkRequested', version: 1, requestId: `rewind:${useId}`,
    source: { branchId: branch.id, headCommitRef: branch.headCommitRef, generation: branch.generation, deathEventId: death.id },
    definitionRef: definition.ref, actorId, mindId,
    target: { anchorId: anchor.id, commitRef: anchor.commitRef, at: anchor.at },
    carry: { memories: carry, items: [], bodies: [], otherMinds: [] },
    activation: playerMindId === mindId ? 'activate-player-fork' : 'retain-player-original-NPC-fork-dormant',
    restore: 'physical-and-institutional-state-from-authorized-domain-anchor',
    rng: 'reuse-for-identical-causal-conditions-no-technical-preload-change',
    backgroundSimulation: false, invalidateTasks: 'fork-generation-only',
    endCondition: 'pending-domain-fork-commit-before-permanent-death' };
  return Object.freeze({ ...magicJson(request), fingerprint: abilityDigest(request) });
}

export function validateMagicBranchRequest(request, input) {
  const expected = requestMagicRewind(input);
  if (abilityDigest(request) !== abilityDigest(expected)) magicFail('MAGIC_BRANCH_REQUEST_MISMATCH');
  return expected;
}
/** A legal but uncommitted rewind blocks BE; a missing anchor is an error,
 * never a fabricated exhausted-power outcome. No autonomous background loop. */
export function magicDeathDisposition({ reactionWindowClosed, branchRequest, domainReceipt, rewindInapplicable }) {
  if (reactionWindowClosed !== true) return 'await-death-reactions';
  if (branchRequest) {
    if (!domainReceipt) return 'await-domain-fork-commit';
    if (domainReceipt.requestId !== branchRequest.requestId || domainReceipt.requestFingerprint !== branchRequest.fingerprint
      || !magicId(domainReceipt.branchId) || !magicId(domainReceipt.commitRef)) magicFail('MAGIC_BRANCH_RECEIPT');
    return branchRequest.activation === 'activate-player-fork' ? 'continue-player-fork' : 'continue-player-original';
  }
  return rewindInapplicable === true ? 'permanent-death-eligible' : 'await-death-rule-resolution';
}

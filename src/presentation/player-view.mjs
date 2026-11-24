// Merge only Host-cropped presentation data; authority and evaluation stay in the Host.
export function composeDeliveredPlayerView({ delivered, current, roomLabels, bgm, guardRulesUpgrade }) {
  return { ...delivered, ...roomLabels, player: current.player, characters: current.characters,
    entries: current.entries, turns: current.turns, dailyHistory: current.dailyHistory,
    ...(current.guardReaction ? { guardReaction: current.guardReaction, guardRulesUpgrade, suggestions: current.suggestions } : {}),
    // Refresh disposable controls without rewriting durable delivery snapshots.
    ...(current.trial ? { trial: current.trial } : {}),
    ...(current.procedureKind ? { procedureKind: current.procedureKind } : {}),
    ...(current.mapLayout ? { mapLayout: current.mapLayout } : {}),
    ...(current.presentation ? { presentation: current.presentation } : {}), prototypeNotice: current.prototypeNotice,
    ...(Object.hasOwn(current, 'profileSummaryDirty') ? { profileSummaryDirty: current.profileSummaryDirty } : {}),
    ...(current.branchNotice ? { branchNotice: current.branchNotice } : {}), bgm,
    ...(current.magic ? { magic: current.magic } : {}), saveSlots: current.saveSlots };
}

// Public query shape only. The Host supplies materialized, owner-cropped parts;
// presence marks a Host-selected optional field, including false or undefined.
export function assemblePlayerQueryView(parts) {
  return {
    turns: parts.turns, dailyHistory: parts.dailyHistory,
    ...(parts.scenePresentation ? { presentation: parts.scenePresentation } : {}),
    unlockedLocations: parts.unlockedLocations,
    ...(Object.hasOwn(parts, 'mapLayout') ? { mapLayout: parts.mapLayout } : {}),
    exampleId: parts.exampleId, bgm: parts.bgm, player: parts.player,
    ...(parts.creationView ? { loop: parts.creationView.loop, playerMode: parts.creationView.playerMode,
      playerKnowledge: parts.creationView.playerKnowledge,
      ...(Object.hasOwn(parts.creationView, 'playerAttributes') ? { playerAttributes: parts.creationView.playerAttributes } : {}) } : {}),
    generation: parts.generation, revision: parts.revision, phase: parts.phase,
    worldTime: parts.worldTime, location: parts.location,
    characters: parts.characters, entries: parts.entries, suggestions: parts.baseSuggestions,
    ...(parts.prototypeView || {}),
    ...(parts.playView || {}),
    ...(Object.hasOwn(parts, 'guardSuggestions') ? { suggestions: parts.guardSuggestions } : {}),
    ...(Object.hasOwn(parts, 'guardReaction') ? { guardReaction: parts.guardReaction,
      guardRulesUpgrade: parts.guardRulesUpgrade } : {}),
    completed: parts.completed,
    ...(Object.hasOwn(parts, 'profileSummaryDirty') ? { profileSummaryDirty: parts.profileSummaryDirty } : {}),
    ...(Object.hasOwn(parts, 'magic') ? { magic: parts.magic } : {}),
    saveSlots: parts.saveSlots, prototypeNotice: parts.prototypeNotice,
    ...(Object.hasOwn(parts, 'branchNotice') ? { branchNotice: parts.branchNotice } : {}),
  };
}

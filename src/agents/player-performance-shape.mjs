// Shared closed labels only. Keep this leaf dependency-free for Worker boot.
export const PLAYER_PERFORMANCE_SHAPE = Object.freeze({ json: 'player_shape_json', object: 'player_shape_object',
  keys: 'player_shape_unexpected_keys', missing: 'player_shape_missing_action', action: 'player_shape_action',
  reflection: 'player_shape_reflection', utterance: 'player_shape_utterance' });
export const PLAYER_PERFORMANCE_SHAPE_ISSUES = Object.freeze(Object.values(PLAYER_PERFORMANCE_SHAPE));
export const ROLEPLAY_SHAPE_ISSUES = Object.freeze([
  'npc_shape_envelope', 'npc_shape_decision', 'npc_shape_expression',
  'npc_shape_communication', 'npc_shape_updates', 'npc_shape_participation',
  ...['object', 'keys', 'mode', 'goalId', 'strategy', 'assessment', 'operation', 'sourceObservationIds',
    'operation_object', 'operation_keys', 'operation_type', 'operation_targetHandle', 'operation_destination', 'operation_subjectId']
    .map(field => 'npc_shape_decision_' + field),
  ...['null', 'type', 'blank', 'length', 'budget'].map(kind => 'npc_shape_decision_assessment_' + kind),
]);

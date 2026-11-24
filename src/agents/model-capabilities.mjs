// Explicit verified transport contract, not a promise about a model name.
// No pricing is inferred: costs require provider-specific measured usage and
// current rates, neither of which is authority for accepting a game result.
const frozen = value => {
  if (value && typeof value === 'object') { Object.values(value).forEach(frozen); Object.freeze(value); }
  return value;
};
export const MODEL_PROTOCOL_CAPABILITIES = frozen({
  openai: { version: 1, transport: 'json', stream: false, acceptedFinish: 'stop',
    responseFormat: 'json_object', explicitPromptCache: false, usage: 'optional', pricing: 'not-inferred' },
  anthropic: { version: 1, transport: 'json', stream: false, acceptedFinish: 'end_turn',
    responseFormat: 'plain-json-text', explicitPromptCache: 'opt-in', usage: 'optional', pricing: 'not-inferred' },
});

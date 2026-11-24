import { createHash } from 'node:crypto';

// Host-authored identity aliases are not biographies or ability dossiers.
// Only a delivered, unambiguous name event may select one of these identities.
export const KNOWLEDGE_RUNTIME_REVISION = 'agent-prison-runtime@4';
const identities = [
  ['emma', '樱羽艾玛', ['艾玛', '樱羽艾玛', '艾瑪', '櫻羽艾瑪']],
  ['hiro', '二阶堂希罗', ['希罗', '二阶堂希罗', '希羅', '二階堂希羅']],
  ['anan', '夏目安安', ['安安', '夏目安安']],
  ['noah', '城崎诺亚', ['诺亚', '城崎诺亚', '諾亞', '城崎諾亞']],
  ['leia', '莲见蕾雅', ['蕾雅', '蕾娅', '莲见蕾雅', '蓮見蕾雅', '蓮見蕾婭']],
  ['milia', '佐伯米莉亚', ['米莉亚', '佐伯米莉亚', '米莉亞', '佐伯米莉亞']],
  ['margo', '宝生玛格', ['玛格', '宝生玛格', '瑪格', '寶生瑪格']],
  ['nanoka', '黑部奈叶香', ['奈叶香', '黑部奈叶香', '奈葉香', '黑部奈葉香']],
  ['alisa', '紫藤亚里沙', ['亚里沙', '紫藤亚里沙', '亞里沙', '紫藤亞里沙']],
  ['sherry', '橘雪莉', ['雪莉', '橘雪莉']],
  ['hanna', '远野汉娜', ['汉娜', '远野汉娜', '漢娜', '遠野漢娜']],
  ['coco', '泽渡可可', ['可可', '泽渡可可', '澤渡可可']],
  ['meruru', '冰上梅露露', ['梅露露', '冰上梅露露']],
  ['warden', '典狱长', ['典狱长', '典獄長']],
];
const freeze = value => {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
};
export const KNOWLEDGE_POLICY = freeze({ version: 1, ref: 'delivered-owner-knowledge@1',
  identities: identities.map(([id, name, aliases]) => ({ id, name, aliases })),
  profileFields: ['name', 'role', 'attributedStatements', 'observedCondition', 'knownCause', 'knowledgeSource', 'knowledgeAcquiredAt'],
  identityAcquisition: { introductions: 'exact-supported-alias-at-affirmative-clause',
    noahOwnName: 'supported-name-followed-by-own-preference-or-action-clause',
    thirdParty: 'direct-demonstrative-assertion-with-one-present-named-participant',
    vocative: 'one-host-resolved-addressee-and-an-exact-leading-name',
    ambiguity: 'leave-unresolved', explicitQuotes: 'never-infer-a-new-identity-from-attributed-quotation' },
  unavailableMaterials: ['magic-profile', 'inventory', 'stream'],
  rules: ['Name aliases unlock canonical identity only, never capabilities or private biography.',
    'Only delivered affirmative own-name assertions, direct introductions of one present participant, unique vocatives and host notices identify a person; quotation and negation never authenticate identity.',
    'Physical recognition and name-only notice knowledge are separate.',
    'No document is created from author/reference profiles; missing sources remain unavailable.',
    'Observed harm, official death reports and public executions retain their provenance; a later public execution supersedes a prior death notice for status without inventing a cause.',
    'Readable owner records retain up to eight recent complete attributed statements within 2400 characters, never truncated or synthesized.'],
});
export const KNOWLEDGE_FINGERPRINT = createHash('sha256').update(JSON.stringify(KNOWLEDGE_POLICY)).digest('hex');

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { assertContentPackage, compileContentPackage } from './content-package.mjs';

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const freeze = value => {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
};

/** Read-only provenance importer. Card text is inert JSON: no templates, macros,
 * extensions, scripts, greetings, or embedded instructions are evaluated.
 * Return references and hashes only, never the original card's prompt payload.
 */
export function inspectAgentCardSource(path) {
  const bytes = readFileSync(path);
  let card;
  try { card = JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/u, '')); }
  catch { throw new TypeError('角色卡不是有效的 JSON 数据。'); }
  const entries = card?.data?.character_book?.entries;
  if (!Array.isArray(entries)) throw new TypeError('角色卡缺少角色书条目。');
  const latest = new Map();
  const references = entries.map((entry, index) => {
    if (!entry || typeof entry.comment !== 'string' || typeof entry.content !== 'string'
      || !Number.isSafeInteger(entry.id) || typeof entry.enabled !== 'boolean') {
      throw new TypeError('角色书条目缺少明确的标识、标签、内容或启用状态。');
    }
    const reference = {
      entryId: entry.id, entryIndex: index,
      pointer: `/data/character_book/entries/${index}`,
      label: entry.comment, enabled: entry.enabled,
      contentSha256: sha256(Buffer.from(entry.content, 'utf8')),
    };
    if (entry.enabled) latest.set(entry.comment, reference);
    return reference;
  });
  const greetings = Array.isArray(card.data.alternate_greetings)
    ? card.data.alternate_greetings.map((greeting, index) => {
      if (typeof greeting !== 'string') throw new TypeError('候选开场必须是文本数据。');
      return { pointer: `/data/alternate_greetings/${index}`, contentSha256: sha256(Buffer.from(greeting, 'utf8')) };
    }) : [];
  return freeze({
    sha256: sha256(bytes), spec: card.spec, specVersion: card.spec_version,
    entryCount: entries.length, enabledEntryCount: references.filter(entry => entry.enabled).length,
    selection: 'last-enabled-by-comment-in-array-order',
    entries: references, latestEnabledEntries: [...latest.values()], greetings,
  });
}

// Runtime and the offline CLI use the identical compiler and checks. This new
// identity covers the declared world/rules/assets too; historical save anchors
// below deliberately keep their exact previous manifest-byte hash.
export const AGENT_CONTENT_PACKAGE = assertContentPackage(compileContentPackage());
export const AGENT_CONTENT_IDENTITY = AGENT_CONTENT_PACKAGE.identity;
export const AGENT_CONTENT_FINGERPRINT = AGENT_CONTENT_PACKAGE.fingerprint;
export const AGENT_PUBLIC_CONTENT_MANIFEST = AGENT_CONTENT_PACKAGE.publicManifest;
const manifest = AGENT_CONTENT_PACKAGE.host.scenario;

export const AGENT_SCENARIO_REF = 'agent-prison-opening@1';
if (manifest.scenarioRef !== AGENT_SCENARIO_REF) throw new TypeError('Agent 场景引用不一致。');
// Exact UTF-8 manifest bytes, not the large upstream card or a mutable save.
export const AGENT_SCENARIO_HASH = AGENT_CONTENT_PACKAGE.manifest.sources.find(source => source.file === 'data/agent-scenario.json').sha256;
export const AGENT_SCENARIO_NOTICE = '陌生的清晨，少女们在监牢中醒来。';

// Published opening WitchBook dossiers, not the private character cards.
// Keep these legacy strings byte-stable for replay. The formatted public edition
// below separates the original paragraphs; later identities, true abilities and
// deaths are deliberately NOT part of this reference. This is authored content,
// NOT a knowledge producer: a known name never grants the rest of these fields.
export const AGENT_PROFILES = freeze([
  { id: 'emma', name: '樱羽艾玛', prisonerNumber: 658, introduction: '15岁。虽然经检测，确认其携带魔女因子，并因此被收监到了监牢中；但是不会使用魔法。' },
  { id: 'hiro', name: '二阶堂希罗', prisonerNumber: 659, introduction: '15岁。是艾玛的儿时玩伴。曾经是同班同学。' },
  { id: 'anan', name: '夏目安安', prisonerNumber: 660, introduction: '拥有【洗脑】魔法的少女。可以让对方服从其认可的命令，属于轻度的催眠魔法。' },
  { id: 'noah', name: '城崎诺亚', prisonerNumber: 661, introduction: '可以使出画画的魔法。似乎无法控制魔法。' },
  { id: 'leia', name: '莲见蕾雅', prisonerNumber: 662, introduction: '艺能事务所所属的舞台剧演员。在电视上也经常露面。拥有【视线诱导】魔法，是能将对方视线固定到任意位置的魔法。' },
  { id: 'milia', name: '佐伯米莉亚', prisonerNumber: 663, introduction: '【互换】魔法的拥有者。可以互换人格。' },
  { id: 'margo', name: '宝生玛格', prisonerNumber: 664, introduction: '拥有【模仿】魔法的少女。能模仿他人的声音。因能同时满足兴趣和收益，擅长占卜他人的运势。' },
  { id: 'nanoka', name: '黑部奈叶香', prisonerNumber: 665, introduction: '拥有【幻视】魔法的少女。能以视觉和听觉的形式得知触碰之物的过去和未来的情况。但是，并不能主动发动。' },
  { id: 'alisa', name: '紫藤亚里沙', prisonerNumber: 666, introduction: '拥有【点火】魔法的少女。是可以不借助外物，像打火机一样生出火焰的魔法。' },
  { id: 'sherry', name: '橘雪莉', prisonerNumber: 667, introduction: '拥有【怪力】魔法的少女。是能单手捏爆苹果的魔法。' },
  { id: 'hanna', name: '远野汉娜', prisonerNumber: 668, introduction: '拥有【飘浮】魔法的少女。是只要使劲就能稍微飘在半空的魔法。' },
  { id: 'coco', name: '泽渡可可', prisonerNumber: 669, introduction: '拥有【千里眼】魔法的少女。能够知晓正在注视自己之人的状况。日常凭兴趣开展直播。' },
  { id: 'meruru', name: '冰上梅露露', prisonerNumber: 670, introduction: '拥有【治疗】魔法的少女。是可以瞬间治疗伤痛的魔法。' },
  { id: 'warden', name: '典狱长', role: '典狱长', introduction: '可以理解并用人类语言交流的猫头鹰怪物。职责是管理囚犯。' },
]);
const profilesById = new Map(AGENT_PROFILES.map(profile => [profile.id, profile]));
export const agentProfile = id => profilesById.get(id);

// Original localized paragraph boundaries (user's six captures, cross-checked
// with BWIKI's introduction sections). Only Emma/Hiro's public entries state an
// age; ages from private cards or wiki infoboxes are not added to other entries.
const publicParagraphs = {
  emma: ['15岁。\n虽然经检测，确认其携带魔女因子，并因此被收监到了监牢中；但是不会使用魔法。'],
  hiro: ['15岁。是艾玛的儿时玩伴。\n曾经是同班同学。'],
  anan: ['拥有【洗脑】魔法的少女。\n可以让对方服从其认可的命令，属于轻度的催眠魔法。'],
  noah: ['可以使出画画的魔法。\n似乎无法控制魔法。'],
  leia: ['艺能事务所所属的舞台剧演员。\n在电视上也经常露面。', '拥有【视线诱导】魔法。\n是能将对方视线固定到任意位置的魔法。'],
  milia: ['【互换】魔法的拥有者。\n可以互换人格。'],
  margo: ['拥有【模仿】魔法的少女。\n能模仿他人的声音。', '因能同时满足兴趣和收益，擅长占卜他人的运势。'],
  nanoka: ['拥有【幻视】魔法的少女。\n能以视觉和听觉的形式得知触碰之物的过去和未来的情况。\n但是，并不能主动发动。'],
  alisa: ['拥有【点火】魔法的少女。\n是可以不借助外物，像打火机一样生出火焰的魔法。'],
  sherry: ['拥有【怪力】魔法的少女。\n是能单手捏爆苹果的魔法。'],
  hanna: ['拥有【飘浮】魔法的少女。\n是只要使劲就能稍微飘在半空的魔法。'],
  coco: ['拥有【千里眼】魔法的少女。\n能够知晓正在注视自己之人的状况。', '日常凭兴趣开展直播。'],
  meruru: ['拥有【治疗】魔法的少女。\n是可以瞬间治疗伤痛的魔法。'],
  warden: ['可以理解并用人类语言交流的猫头鹰怪物。\n职责是管理囚犯。'],
};
export const PUBLIC_AGENT_PROFILES = freeze(AGENT_PROFILES.map(({ id, name, prisonerNumber, role }) => ({
  id, name, ...(prisonerNumber ? { prisonerNumber } : {}), ...(role ? { role } : {}),
  ...(['emma', 'hiro'].includes(id) ? { age: 15 } : {}), paragraphs: publicParagraphs[id],
})));
const publicProfilesById = new Map(PUBLIC_AGENT_PROFILES.map(profile => [profile.id, profile]));
export const publicAgentProfile = id => publicProfilesById.get(id);
export const MAX_CANON_PRISONER_NUMBER = Math.max(...AGENT_PROFILES.map(profile => profile.prisonerNumber || 0));
export const CUSTOM_PRISONER_NUMBER = MAX_CANON_PRISONER_NUMBER + 1;

// This explicit allowlist is the only actor-context projection. Provenance,
// host policies, housing, other actors' knowledge, and quarantined spoilers
// stay outside it even when the authored manifest acquires additional fields.
export const AGENT_ACTORS = freeze(manifest.actors.map(actor => ({
  id: actor.id,
  name: actor.name,
  persona: {
    name: actor.persona.name,
    voice: actor.persona.voice,
    values: [...actor.persona.values],
    boundaries: [...actor.persona.boundaries],
  },
  initialKnowledge: [...actor.initialKnowledge],
  appearance: actor.appearance,
  locationId: actor.locationId,
  communication: actor.communication,
})));
const actorsById = new Map(AGENT_ACTORS.map(actor => [actor.id, actor]));
export const agentActor = id => actorsById.get(id);

// Authored opening is player-facing narration, not NPC speech or a decision.
export const AGENT_OPENING = freeze(manifest.opening.map(entry => ({
  speakerId: entry.speakerId, text: entry.text, delivery: entry.delivery,
})));
export const AGENT_LOCATIONS = freeze(manifest.locations.map(location => ({
  id: location.id, name: location.name, description: location.description,
  exitIds: [...location.exitIds],
})));

// Host-only metadata. Do not spread this object into an actor's model packet.
export const AGENT_SCENARIO_PROVENANCE = freeze({
  scenarioRef: manifest.scenarioRef,
  manifestSha256: AGENT_SCENARIO_HASH,
  source: structuredClone(manifest.provenance.source),
  selection: manifest.provenance.selection,
  entries: structuredClone(manifest.provenance.entries),
  actorSources: structuredClone(manifest.provenance.actorSources),
  openingSource: structuredClone(manifest.provenance.openingSource),
  decisions: structuredClone(manifest.provenance.decisions),
});
export const AGENT_HOST_POLICIES = freeze(structuredClone(manifest.host));

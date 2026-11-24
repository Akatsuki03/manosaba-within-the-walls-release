// Impression colors shared by dialogue and the Witch Encyclopedia.
const entries = [
  ['emma', '樱羽艾玛', '252,145,172'], ['hiro', '二阶堂希罗', '235,78,85'],
  ['coco', '泽渡可可', '252,114,80'], ['hanna', '远野汉娜', '171,198,31'],
  ['milia', '佐伯米莉亚', '233,208,141'], ['alisa', '紫藤亚里沙', '235,77,61'],
  ['anan', '夏目安安', '158,146,250'], ['leia', '莲见蕾雅', '250,177,91'],
  ['margo', '宝生玛格', '183,125,234'], ['meruru', '冰上梅露露', '226,185,176'],
  ['nanoka', '黑部奈叶香', '132,142,147'], ['noah', '城崎诺亚', '102,222,228'],
  ['sherry', '橘雪莉', '133,177,255'],
];
export const CHARACTER_IDS = entries.map(([id]) => id);
export const characterInitialColors = Object.fromEntries(entries.map(([, name, color]) => [name, color]));
characterInitialColors['莲见蕾娅'] = characterInitialColors['莲见蕾雅'];
characterInitialColors['典狱长'] = '178,174,191';
const byId = new Map(entries.map(entry => [entry[0], entry]));
const byName = new Map(entries.map(entry => [entry[1], entry]));
byName.set('莲见蕾娅', byId.get('leia'));

// The reference web project's profile placeholder is UI_Common/BookButton.png.
export const DEFAULT_CUSTOM_AVATAR = '/assets/characters/custom-default.png';
const localAvatar = value => typeof value === 'string' && /^\/assets\/avatars\/[a-f0-9]{64}\.png$/u.test(value);
export function isCustomPlayer(person, view = {}) {
  return (view.exampleId === 'custom' || (view.exampleId === 'agent' && view.player?.custom === true)) && Boolean(person)
    && (view.player?.id ? person.id === view.player.id : Boolean(view.player?.name) && person.name === view.player.name);
}

export function characterAppearance(person, view = {}) {
  // An anonymously heard disclosure cannot identify a face through the atlas.
  if (person?.unidentified === true) return { color: 'rgb(180,180,180)', portrait: undefined, thumbnail: undefined };
  if (isCustomPlayer(person, view)) {
    const avatar = localAvatar(view.player?.avatarUrl) ? view.player.avatarUrl : DEFAULT_CUSTOM_AVATAR;
    return { color: view.player?.impressionColor || '#a0beeb', portrait: avatar, thumbnail: avatar, custom: true };
  }
  if (person?.id === 'warden' || person?.name === '典狱长') {
    return { color: 'rgb(178,174,191)', portrait: '/assets/characters/warden-profile.png', thumbnail: '/assets/characters/warden-profile.png' };
  }
  const entry = byId.get(person?.id) || byName.get(person?.name);
  return {
    color: entry ? `rgb(${entry[2]})` : `rgb(${characterInitialColors[person?.name] || '255,255,255'})`,
    portrait: entry ? `/assets/characters/${entry[0]}-portrait.webp` : undefined,
    thumbnail: entry ? `/assets/characters/${entry[0]}-thumb.webp` : undefined,
  };
}

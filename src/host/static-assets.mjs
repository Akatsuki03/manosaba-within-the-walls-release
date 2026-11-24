import { BACKGROUND_FILES } from '../../public/scene-backgrounds.mjs';

// Shared by HTTP serving, the Windows launcher, source archiving and release
// collection. A resource being absent from the current screen does not make it
// unused: every declared URL (including aliases) remains part of the contract.
export const VENDOR_SOURCES = Object.freeze([
  Object.freeze({ directory: 'manosaba-web', repository: 'https://github.com/Lianues/manosaba-web', revision: 'da31228ac5531e85afa298e58f4a49224074c289' }),
  Object.freeze({ directory: 'manosaba-ai', repository: 'https://github.com/Lianues/manosaba_ai', revision: 'ae89f7650bda62ca8d4aa2a2216434dde6688892' }),
]);
const sourceCategories = Object.freeze({
  Home: 'start', 'Home/Background': 'start', fonts: 'fonts', start_ui: 'start', cg: 'start',
  UI_Adv: 'ui', 'UI_Adv/Choice': 'ui', UI_Common: 'ui', UI_Log: 'ui', UI_Menu: 'menu',
  UI_SaveLoad: 'saveload', UI_WitchBook_1: 'witchbook', UI_WitchBook_2: 'witchbook',
  UI_Trial: 'trial', 'UI_Trial/Debate': 'trial', 'UI_Trial/Objection': 'trial',
});
const sourceAssets = new Map();
function importedAsset(upstreamPath, sourceId = 'manosaba-web') {
  const slash = upstreamPath.lastIndexOf('/');
  const category = sourceCategories[upstreamPath.slice(0, slash)];
  const source = VENDOR_SOURCES.find(item => item.directory === sourceId);
  if (!category || !source) throw new Error('Unknown runtime asset source.');
  // Two distinct upstream BookButton.png images share a category; distinguish
  // the generic fallback without introducing another directory layer.
  const name = upstreamPath === 'UI_Common/BookButton.png' ? 'common-book-button.png' : upstreamPath.slice(slash + 1);
  const file = `assets/${category}/${name}`;
  const url = `${source.repository.replace('https://github.com/', 'https://raw.githubusercontent.com/')}/${source.revision}/public/${upstreamPath}`;
  if (sourceAssets.has(file) && sourceAssets.get(file).url !== url) throw new Error(`Asset filename collision: ${file}`);
  sourceAssets.set(file, Object.freeze({ file: `public/${file}`, url }));
  return file;
}
const staticFiles = { '/assets/title.png': [importedAsset('Home/TitleLogo@ZhHans.png'), 'image/png'], '/assets/backdrop.png': [importedAsset('Home/Background/Background_1.png'), 'image/png'], '/': ['index.html', 'text/html; charset=utf-8'], '/app.js': ['app.js', 'text/javascript; charset=utf-8'], '/style.css': ['style.css', 'text/css; charset=utf-8'] };
staticFiles['/assets/fonts/SourceHanSerifSC.otf'] = [importedAsset('fonts/SourceHanSerifSC.otf'), 'font/otf'];
staticFiles['/dialogue-format.mjs'] = ['dialogue-format.mjs', 'text/javascript; charset=utf-8'];
staticFiles['/agent-activity.mjs'] = ['agent-activity.mjs', 'text/javascript; charset=utf-8'];
staticFiles['/developer-panel.mjs'] = ['developer-panel.mjs', 'text/javascript; charset=utf-8'];
staticFiles['/daily-history.mjs'] = ['daily-history.mjs', 'text/javascript; charset=utf-8'];
staticFiles['/testimony-draft.mjs'] = ['testimony-draft.mjs', 'text/javascript; charset=utf-8'];
staticFiles['/bgm-player.mjs'] = ['bgm-player.mjs', 'text/javascript; charset=utf-8'];
staticFiles['/dice-panel.mjs'] = ['dice-panel.mjs', 'text/javascript; charset=utf-8'];
staticFiles['/settings.js'] = ['settings.js', 'text/javascript; charset=utf-8'];
staticFiles['/custom-ability-entry.js'] = ['custom-ability-entry.js', 'text/javascript; charset=utf-8'];
staticFiles['/magic-controls.mjs'] = ['magic-controls.mjs', 'text/javascript; charset=utf-8'];
staticFiles['/case-item-controls.mjs'] = ['case-item-controls.mjs', 'text/javascript; charset=utf-8'];
staticFiles['/settings.css'] = ['settings.css', 'text/css; charset=utf-8'];
staticFiles['/witchbook.js'] = ['witchbook.js', 'text/javascript; charset=utf-8'];
staticFiles['/witchbook-present.mjs'] = ['witchbook-present.mjs', 'text/javascript; charset=utf-8'];
staticFiles['/witchbook-map.mjs'] = ['witchbook-map.mjs', 'text/javascript; charset=utf-8'];
staticFiles['/witchbook.css'] = ['witchbook.css', 'text/css; charset=utf-8'];
staticFiles['/character-appearance.mjs'] = ['character-appearance.mjs', 'text/javascript; charset=utf-8'];
staticFiles['/avatar-upload.mjs'] = ['avatar-upload.mjs', 'text/javascript; charset=utf-8'];
staticFiles['/player-creation-rules.mjs'] = ['player-creation-rules.mjs', 'text/javascript; charset=utf-8'];
staticFiles['/cell-setup-rules.mjs'] = ['cell-setup-rules.mjs', 'text/javascript; charset=utf-8'];
staticFiles['/player-creator.mjs'] = ['player-creator.mjs', 'text/javascript; charset=utf-8'];
staticFiles['/player-creator.css'] = ['player-creator.css', 'text/css; charset=utf-8'];
staticFiles['/assets/characters/custom-default.png'] = [importedAsset('UI_Common/BookButton.png'), 'image/png'];
staticFiles['/assets/characters/warden-profile.png'] = ['assets/characters/warden-profile.png', 'image/png'];
for (const id of ['emma', 'hiro', 'anan', 'noah', 'leia', 'milia', 'margo', 'nanoka', 'alisa', 'sherry', 'hanna', 'coco', 'meruru']) {
  for (const variant of ['portrait', 'thumb']) {
    const file = `${id}-${variant}.webp`;
    staticFiles[`/assets/characters/${file}`] = [`assets/characters/${file}`, 'image/webp'];
  }
}
staticFiles['/assets/characters/manifest.json'] = ['assets/characters/manifest.json', 'application/json; charset=utf-8'];
staticFiles['/assets/items/blue-bookmark.svg'] = ['assets/items/blue-bookmark.svg', 'image/svg+xml'];
const witchBookAssets = {
  UI_WitchBook_1: ['Background_1', 'BookTitle@ZhHans', 'PersonFrame', 'PersonOverlay', 'EvidenceFrame', 'EvidenceNameBase', 'PresentButtonBody@ZhHans', 'LoupeButton', 'ItemSlot', 'ItemButton_Common_1', 'ItemButton_Common_2', 'ItemButton_Common_3', 'TabBase_Default', 'TabBase_Highlighted', ...['Clue', 'Profile', 'Map', 'Rule', 'Note'].flatMap(tab => ['Active', 'Inactive'].map(state => `TabLabel_${tab}_${state}@ZhHans`))],
  UI_WitchBook_2: ['Background_2', 'Layout_F1_1', 'Layout_F2_1', 'Layout_B1_1', 'Rule_TitleBack', 'Rule_SubtitleUnderline', 'Note_TitleUnderline', 'Arrow_TopLeft', 'Arrow_Left', 'Arrow_BottomLeft', 'ArrowFocus_Plain', 'ArrowFocus_Shadow', 'AreaLabelPlate_1', 'AreaLabelPlate_2', 'AreaLabelPlate_3', 'AreaLabelPlate_4', 'AreaLabelPlate_5'],
};
for (const [directory, names] of Object.entries(witchBookAssets)) {
  for (const name of names) staticFiles[`/assets/witchbook/${directory}/${name}.png`] = [importedAsset(`${directory}/${name}.png`), 'image/png'];
}
for (const name of ['NewGame', 'LoadGame', 'Options', 'Exit']) {
  for (const state of ['selected', 'unselected']) staticFiles[`/assets/start/${name}-${state}.png`] = [importedAsset(`start_ui/${name}-${state}.png`, 'manosaba-ai'), 'image/png'];
}
for (const state of ['selected', 'unselected']) {
  staticFiles[`/assets/start/Continue-${state}.png`] = [`assets/start/Continue-${state}.png`, 'image/png'];
  staticFiles[`/assets/start/Continue-${state}.svg`] = [`assets/start/Continue-${state}.svg`, 'image/svg+xml'];
}
staticFiles['/assets/start/title.png'] = [importedAsset('start_ui/start_title.png', 'manosaba-ai'), 'image/png'];
staticFiles['/assets/start/subtitle.png'] = ['assets/start/subtitle.png', 'image/png'];
staticFiles['/assets/start/subtitle_gaogiangzhinei_ornate.png'] = ['assets/start/subtitle_gaogiangzhinei_ornate.png', 'image/png'];
staticFiles['/assets/start/background.png'] = [importedAsset('cg/Still_001_001.png', 'manosaba-ai'), 'image/png'];
for (const [name, file] of Object.entries({ 'dialogue-screen': 'UI_Adv/NormalPrinter_Screen.png', 'dialogue-top': 'UI_Adv/NormalPrinter_Frame_Top.png', 'dialogue-bottom': 'UI_Adv/NormalPrinter_Frame_Bottom.png', 'nameplate': 'UI_Adv/NamePlateBase.png', 'menu': 'UI_Adv/MenuButton.png', 'book': 'UI_Adv/BookButton.png', 'choice': 'UI_Adv/Choice/ChoiceFrame_Default.png', 'choice-hover': 'UI_Adv/Choice/ChoicesFrame_Highlighted.png', 'log-base': 'UI_Log/LogBase.png', 'log-title': 'UI_Log/TitleBase@ZhHans.png' })) {
  staticFiles[`/assets/ui/${name}.png`] = [importedAsset(file), 'image/png'];
}
for (const name of ['MenuFrame', 'MenuCloseIcon', 'WiFi_Notice', 'Pager_Decolation']) staticFiles[`/assets/menu/${name}.png`] = [importedAsset(`UI_Menu/${name}.png`), 'image/png'];
for (const name of ['Save', 'Load', 'Log', 'Options', 'Title']) {
  for (const state of ['Normal', 'Highlighted']) staticFiles[`/assets/menu/${name}-${state}.png`] = [importedAsset(`UI_Menu/MenuButton_${name}_${state}@ZhHans.png`), 'image/png'];
}
for (const name of ['NormalPrinter_Grass_1', 'NormalPrinter_Grass_2', 'InputIndicator']) staticFiles[`/assets/ui/${name}.png`] = [importedAsset(`UI_Adv/${name}.png`), 'image/png'];
for (const name of ['ButtonBase_Default', 'ButtonBase_Highlighted', 'CloseButton_Default', 'CloseButton_Highlighted', 'CloseButton_Pressed']) staticFiles[`/assets/ui/${name}.png`] = [importedAsset(`UI_Common/${name}.png`), 'image/png'];
for (const [name, file] of Object.entries({ 'base': 'SaveLoadBase.png', 'slot-frame': 'SaveLoadSlotFrame.png', 'empty-slot': 'EmptySlot.png', 'save-title': 'SaveTitle@ZhHans.png', 'load-title': 'LoadTitle@ZhHans.png' })) {
  staticFiles[`/assets/saveload/${name}.png`] = [importedAsset(`UI_SaveLoad/${file}`), 'image/png'];
}
for (const name of ['Background_1', 'BookTitle@ZhHans', 'EvidenceFrame', 'EvidenceNameBase', 'ItemButton_Common_1', 'ItemButton_Common_2', 'ItemButton_Common_3', 'ItemSlot', 'LoupeButton', 'PersonFrame', 'PersonOverlay', 'PresentButtonBody@ZhHans', 'TabBase_Default', 'TabBase_Highlighted']) {
  staticFiles[`/assets/witchbook/${name}.png`] = [importedAsset(`UI_WitchBook_1/${name}.png`), 'image/png'];
}
for (const tab of ['Clue', 'Profile', 'Map', 'Rule', 'Note']) {
  for (const state of ['Active', 'Inactive']) {
    staticFiles[`/assets/witchbook/TabLabel_${tab}_${state}.png`] = [importedAsset(`UI_WitchBook_1/TabLabel_${tab}_${state}@ZhHans.png`), 'image/png'];
  }
}
for (const name of ['Background_2', 'Rule_TitleBack', 'Rule_SubtitleUnderline', 'Note_TitleUnderline', 'Layout_F1_1', 'Layout_F2_1', 'Layout_B1_1', 'Arrow_TopLeft', 'Arrow_Left', 'Arrow_BottomLeft', 'ArrowFocus_Plain', 'ArrowFocus_Shadow', 'AreaLabelPlate_1', 'AreaLabelPlate_2', 'AreaLabelPlate_3', 'AreaLabelPlate_4', 'AreaLabelPlate_5']) {
  staticFiles[`/assets/witchbook/${name}.png`] = [importedAsset(`UI_WitchBook_2/${name}.png`), 'image/png'];
}
for (const filename of BACKGROUND_FILES) {
  staticFiles[`/assets/backgrounds/${filename}`] = [`assets/backgrounds/${filename}`, 'image/png'];
}
staticFiles['/scene-backgrounds.mjs'] = ['scene-backgrounds.mjs', 'text/javascript; charset=utf-8'];
staticFiles['/scene-playback.mjs'] = ['scene-playback.mjs', 'text/javascript; charset=utf-8'];
staticFiles['/story-typewriter.mjs'] = ['story-typewriter.mjs', 'text/javascript; charset=utf-8'];
staticFiles['/testimony-highlights.mjs'] = ['testimony-highlights.mjs', 'text/javascript; charset=utf-8'];
staticFiles['/trial-testimony.mjs'] = ['trial-testimony.mjs', 'text/javascript; charset=utf-8'];
staticFiles['/trial-opening.mjs'] = ['trial-opening.mjs', 'text/javascript; charset=utf-8'];
staticFiles['/screen-transition.mjs'] = ['screen-transition.mjs', 'text/javascript; charset=utf-8'];
staticFiles['/execution-seal.mjs'] = ['execution-seal.mjs', 'text/javascript; charset=utf-8'];
staticFiles['/phone-ballot.mjs'] = ['phone-ballot.mjs', 'text/javascript; charset=utf-8'];
staticFiles['/assets/execution/finish.png'] = ['assets/execution/finish.png', 'image/png'];
staticFiles['/assets/execution/screen-bg.webp'] = ['assets/execution/screen-bg.webp', 'image/webp'];
for (const name of ['button', 'button-bg']) {
  staticFiles[`/assets/execution/${name}.webp`] = [`assets/execution/${name}.webp`, 'image/webp'];
}
for (const name of ['hold', 'finished']) {
  staticFiles[`/assets/execution/${name}.mp3`] = [`assets/execution/${name}.mp3`, 'audio/mpeg'];
}
staticFiles['/assets/execution/provenance.json'] = ['assets/execution/provenance.json', 'application/json; charset=utf-8'];
// Original trial clock, pinned to the same audited Web asset source.
staticFiles['/assets/trial/ClockBase.png'] = [importedAsset('UI_Trial/ClockBase.png'), 'image/png'];
// Original trial-start artwork, pinned to the same audited Web asset source.
for (const variant of ['Normal', 'White']) {
  const names = [...['Book', 'Flame', 'Libra', 'Line'].map(part => `Debate_Deco_${part}_${variant}`),
    ...[1, 2, 3, 4].map(part => `Debate_Text_Begin_${part}_${variant}@ZhHans`)];
  for (const name of names) staticFiles[`/assets/trial/${name}.png`] = [importedAsset(`UI_Trial/Debate/${name}.png`), 'image/png'];
}
// Original choice balloons, labels and base; custom players do not use the fixed portraits.
for (const name of ['Balloon_Default', 'Balloon_Selected', 'Balloon_Cancel', 'Agreement@ZhHans', 'Objection@ZhHans', 'Perjury@ZhHans', 'Doubt@ZhHans', ...['Pink', 'Yellow', 'Blue', 'Purple', 'Orange', 'Gray'].map(color => `Magic_${color}@ZhHans`), 'TrialChoiceBase']) {
  staticFiles[`/assets/trial/choices/${name}.png`] = [importedAsset(`UI_Trial/Objection/${name}.png`), 'image/png'];
}
staticFiles['/locations.mjs'] = ['locations.mjs', 'text/javascript; charset=utf-8'];
export const STATIC_FILES = Object.freeze(Object.fromEntries(Object.entries(staticFiles).map(([url, asset]) => [url, Object.freeze(asset)])));

// Local layout is independent of upstream directories. Keep pinned download
// URLs and one physical copy per source asset, including compatibility aliases.
export const VENDOR_DOWNLOADS = Object.freeze([...sourceAssets.values()].sort((a, b) => a.file.localeCompare(b.file, 'en')));

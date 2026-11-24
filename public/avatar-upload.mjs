import { DEFAULT_CUSTOM_AVATAR } from './character-appearance.mjs';

export const MAX_SOURCE_BYTES = 10 * 1024 * 1024;
export const MAX_AVATAR_DIMENSION = 768;
const MAX_SOURCE_PIXELS = 32 * 1024 * 1024;
const MAX_ENCODED_BYTES = 3 * 1024 * 1024;
const TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);
const invalidImage = () => new Error('无法读取这张图片，请使用有效的 PNG、JPEG 或 WebP 图片。');

function rasterSignature(bytes) {
  return (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
      && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a)
    || (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)
    || (String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP');
}
async function decode(file) {
  if (typeof createImageBitmap === 'function') return createImageBitmap(file);
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return image;
  } finally { URL.revokeObjectURL(url); }
}

// Re-encode raster pixels only: filenames, EXIF and other source metadata are
// never sent to the server. Keep aspect ratio so upper-body artwork isn't cut.
export async function prepareAvatar(file) {
  if (!file || !TYPES.has(file.type)) throw invalidImage();
  if (!file.size || file.size > MAX_SOURCE_BYTES) throw new Error('头像原图不能超过 10 MB，请先缩小图片。');
  let image;
  try {
    if (!rasterSignature(new Uint8Array(await file.slice(0, 12).arrayBuffer()))) throw invalidImage();
    image = await decode(file);
    const width = image.width || image.naturalWidth;
    const height = image.height || image.naturalHeight;
    if (!width || !height || width * height > MAX_SOURCE_PIXELS || Math.max(width, height) > 16384) {
      throw new Error('图片尺寸过大，请使用不超过 3200 万像素、单边不超过 16384 像素的图片。');
    }
    const scale = Math.min(1, MAX_AVATAR_DIMENSION / Math.max(width, height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw invalidImage();
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    if (!blob || blob.size > MAX_ENCODED_BYTES) throw new Error('处理后的头像过大，请选择尺寸更小或内容更简单的图片。');
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(invalidImage());
      reader.readAsDataURL(blob);
    });
    return { blob, dataUrl };
  } catch (error) {
    if (error instanceof Error && /^(图片尺寸|处理后的)/u.test(error.message)) throw error;
    throw invalidImage();
  } finally { image?.close?.(); }
}

// Both creation and the encyclopedia use this picker. Only an accepted callback
// commits the preview; failed uploads keep the previous image and show an error.
export function mountAvatarPicker(root, { onChange, onBusyChange = () => {}, getContext = () => undefined }) {
  const input = root.querySelector('[data-avatar-file]');
  const upload = root.querySelector('[data-avatar-upload]');
  const reset = root.querySelector('[data-avatar-reset]');
  const preview = root.querySelector('[data-avatar-preview]');
  const message = root.querySelector('[data-avatar-message]');
  let value;
  let blobUrl;
  let busy = false;
  let disabled = false;
  let version = 0;
  function refresh() {
    upload.disabled = disabled || busy;
    reset.disabled = disabled || busy || !value;
    input.disabled = disabled || busy;
    root.setAttribute('aria-busy', String(busy));
  }
  function release() { if (blobUrl) URL.revokeObjectURL(blobUrl); blobUrl = undefined; }
  function setValue(next) {
    next = next || null;
    if (next === value) return;
    version += 1;
    value = next;
    release();
    // Presets return validated PNG bytes. Preview through a blob URL because
    // the page deliberately forbids data: image sources in its CSP.
    if (typeof value === 'string' && /^data:image\/png;base64,[A-Za-z0-9+/]+=*$/u.test(value) && value.length <= 4200000) {
      const binary = atob(value.slice('data:image/png;base64,'.length));
      const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
      blobUrl = URL.createObjectURL(new Blob([bytes], { type: 'image/png' }));
    }
    preview.src = blobUrl || value || DEFAULT_CUSTOM_AVATAR;
    root.dataset.hasAvatar = String(Boolean(value));
    message.textContent = '';
    refresh();
  }
  async function apply(file) {
    if (disabled || busy) return;
    const selectedVersion = version;
    const context = getContext();
    busy = true; refresh(); onBusyChange(true);
    message.textContent = file ? '正在处理头像……' : '正在恢复默认头像……';
    let prepared;
    try {
      prepared = file ? await prepareAvatar(file) : null;
      if (selectedVersion !== version) { message.textContent = '角色或进度已切换，请重新选择头像。'; return; }
      await onChange(prepared?.dataUrl || null, context);
      // onChange may have already rendered the authoritative saved asset URL.
      if (selectedVersion === version) {
        version += 1;
        value = prepared?.dataUrl || null;
        release();
        if (prepared) blobUrl = URL.createObjectURL(prepared.blob);
        preview.src = blobUrl || DEFAULT_CUSTOM_AVATAR;
        root.dataset.hasAvatar = String(Boolean(value));
      }
      message.textContent = file ? '头像已更新。' : '已恢复默认头像。';
    } catch (error) {
      message.textContent = error?.message || '头像更新失败，原头像已保留。';
    } finally {
      input.value = '';
      busy = false; refresh(); onBusyChange(false);
    }
  }
  preview.addEventListener('error', () => {
    if (preview.getAttribute('src') !== DEFAULT_CUSTOM_AVATAR) preview.src = DEFAULT_CUSTOM_AVATAR;
  });
  upload.addEventListener('click', () => { if (!disabled && !busy) input.click(); });
  input.addEventListener('change', () => { const file = input.files?.[0]; if (file) void apply(file); });
  reset.addEventListener('click', () => { void apply(null); });
  setValue(null);
  return {
    setValue,
    get value() { return value; },
    setDisabled(next) { disabled = Boolean(next); refresh(); },
    get busy() { return busy; },
    clearMessage() { message.textContent = ''; },
  };
}

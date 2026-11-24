import { createHash } from 'node:crypto';
import { crc32, inflateSync } from 'node:zlib';

export const MAX_AVATAR_DIMENSION = 768;
export const MAX_AVATAR_BYTES = 3 * 1024 * 1024;
export const MAX_AVATAR_BODY_BYTES = Math.ceil(MAX_AVATAR_BYTES / 3) * 4 + 4096;

const DATA_URL_PREFIX = 'data:image/png;base64,';
const MAX_BASE64_LENGTH = Math.ceil(MAX_AVATAR_BYTES / 3) * 4;
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const INVALID_AVATAR_MESSAGE = '头像图片或引用无效。';

function fail() {
  const error = new Error(INVALID_AVATAR_MESSAGE);
  error.code = 'INVALID_AVATAR';
  throw error;
}

export function isAvatarId(value) {
  return typeof value === 'string' && value.length === 64 && /^[0-9a-f]{64}$/u.test(value);
}

export function avatarUrl(id) {
  if (!isAvatarId(id)) fail();
  return `/assets/avatars/${id}.png`;
}

function dimension(value) {
  return Number.isInteger(value) && value >= 1 && value <= MAX_AVATAR_DIMENSION;
}

function digest(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function decodeDataUrl(value) {
  if (typeof value !== 'string' || value.length > MAX_AVATAR_BODY_BYTES || !value.startsWith(DATA_URL_PREFIX)) fail();
  const encoded = value.slice(DATA_URL_PREFIX.length);
  if (!encoded.length || encoded.length > MAX_BASE64_LENGTH || encoded.length % 4 !== 0) fail();
  const bytes = Buffer.from(encoded, 'base64');
  // Node's decoder is deliberately permissive; round-tripping also checks pad
  // bits, padding, whitespace and the standard (not URL-safe) alphabet.
  if (!bytes.length || bytes.length > MAX_AVATAR_BYTES || bytes.toString('base64') !== encoded) fail();
  return bytes;
}

function normalizePng(bytes) {
  if (bytes.length > MAX_AVATAR_BYTES || bytes.length < PNG_SIGNATURE.length
    || !bytes.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) fail();

  const kept = [PNG_SIGNATURE];
  const compressedParts = [];
  let offset = PNG_SIGNATURE.length;
  let width;
  let height;
  let channels;
  let hasPalette = false;
  let hasData = false;
  let dataEnded = false;
  let hasEnd = false;

  while (offset < bytes.length) {
    if (bytes.length - offset < 12) fail();
    const length = bytes.readUInt32BE(offset);
    if (length > 0x7fffffff || length > bytes.length - offset - 12) fail();
    const type = bytes.toString('latin1', offset + 4, offset + 8);
    // PNG chunk names contain four letters; the reserved third bit is zero.
    if (!/^[A-Za-z][A-Za-z][A-Z][A-Za-z]$/u.test(type)) fail();
    const end = offset + length + 12;
    const data = bytes.subarray(offset + 8, end - 4);
    if (crc32(bytes.subarray(offset + 4, end - 4)) !== bytes.readUInt32BE(end - 4)) fail();
    if (offset === PNG_SIGNATURE.length && type !== 'IHDR') fail();

    switch (type) {
      case 'IHDR':
        if (width !== undefined || offset !== PNG_SIGNATURE.length || length !== 13) fail();
        width = data.readUInt32BE(0);
        height = data.readUInt32BE(4);
        if (!dimension(width) || !dimension(height) || data[8] !== 8
          || ![2, 6].includes(data[9]) || data[10] !== 0 || data[11] !== 0 || data[12] !== 0) fail();
        channels = data[9] === 2 ? 3 : 4;
        break;
      case 'PLTE':
        if (hasPalette || hasData || !length || length > 256 * 3 || length % 3 !== 0) fail();
        hasPalette = true;
        break;
      case 'IDAT':
        if (dataEnded) fail();
        hasData = true;
        compressedParts.push(data);
        break;
      case 'IEND':
        if (!hasData || length !== 0 || end !== bytes.length) fail();
        hasEnd = true;
        break;
      default:
        // Unknown critical chunks cannot be decoded safely. Ancillary chunks
        // (including color/text/EXIF/animation metadata) are CRC-checked, then
        // discarded without parsing or decompressing their contents.
        if (type.charCodeAt(0) < 97) fail();
        if (hasData) dataEnded = true;
        offset = end;
        continue;
    }
    kept.push(bytes.subarray(offset, end));
    offset = end;
  }

  if (!hasEnd) fail();
  const compressed = Buffer.concat(compressedParts);
  const rowBytes = width * channels + 1;
  const expectedLength = rowBytes * height;
  const inflated = inflateSync(compressed, { maxOutputLength: expectedLength, info: true });
  // Reject short/long row data, concatenated zlib streams and unused compressed
  // trailing bytes. The output cap is derived only from the bounded IHDR.
  if (inflated.buffer.length !== expectedLength || inflated.engine.bytesWritten !== compressed.length) fail();
  for (let row = 0; row < height; row += 1) {
    if (inflated.buffer[row * rowBytes] > 4) fail();
  }
  // For 8-bit RGB/RGBA, every sample byte is legal after any of the five PNG
  // filters; no palette lookup or pixel expansion can hide additional bounds.
  return { bytes: Buffer.concat(kept), width, height };
}

export class CharacterAvatars {
  #db;

  constructor(db) {
    this.#db = db;
  }

  initialize() {
    try {
      this.#db.exec(`CREATE TABLE IF NOT EXISTS prologue_avatar_assets (
        id TEXT PRIMARY KEY,
        mime TEXT NOT NULL,
        width INTEGER NOT NULL,
        height INTEGER NOT NULL,
        bytes BLOB NOT NULL
      )`);
    } catch { fail(); }
  }

  put(dataUrl) {
    try {
      const asset = normalizePng(decodeDataUrl(dataUrl));
      const id = digest(asset.bytes);
      this.#db.prepare(`INSERT INTO prologue_avatar_assets (id, mime, width, height, bytes)
        VALUES (?, 'image/png', ?, ?, ?) ON CONFLICT(id) DO NOTHING`)
        .run(id, asset.width, asset.height, asset.bytes);
      return id;
    } catch { fail(); }
  }

  read(id) {
    if (!isAvatarId(id)) return null;
    try {
      const row = this.#db.prepare(`SELECT mime, width, height, bytes FROM prologue_avatar_assets
        WHERE id = ? AND length(bytes) <= ?`).get(id, MAX_AVATAR_BYTES);
      if (!row || row.mime !== 'image/png' || !dimension(row.width) || !dimension(row.height)
        || !(row.bytes instanceof Uint8Array) || row.bytes.byteLength > MAX_AVATAR_BYTES) return null;
      const bytes = Buffer.from(row.bytes);
      if (digest(bytes) !== id) return null;
      const asset = normalizePng(bytes);
      if (asset.width !== row.width || asset.height !== row.height || !asset.bytes.equals(bytes)) return null;
      return { bytes, mime: 'image/png', width: row.width, height: row.height };
    } catch { return null; }
  }

  assertReference(id) {
    if (!this.read(id)) fail();
    return id;
  }
}

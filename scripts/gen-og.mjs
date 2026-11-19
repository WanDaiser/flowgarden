#!/usr/bin/env node
/**
 * Open Graph görselleri (1200×630) — sosyal medyada paylaşılınca çıkan kart.
 * `npm run build` öncesi otomatik çalışır (prebuild). Bağımlılık yok.
 *
 *   public/og/default.png       → ana sayfa, hakkımızda, iletişim
 *   public/og/<slug>.png        → her oyun: ikon + ad + oyun rengi + stüdyo logosu
 *
 * Gökyüzü kodla çizilir, logo ve ikon PNG'leri tam sayı katla büyütülür.
 */
import { deflateSync, inflateSync, crc32 } from 'node:zlib';
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const W = 1200,
  H = 630;

// ------------------------------------------------------------------ PNG
function decodePNG(buf) {
  let p = 8,
    w,
    h,
    depth,
    type,
    palette = null,
    trns = null;
  const idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p);
    const kind = buf.toString('ascii', p + 4, p + 8);
    const data = buf.subarray(p + 8, p + 8 + len);
    if (kind === 'IHDR') {
      w = data.readUInt32BE(0);
      h = data.readUInt32BE(4);
      depth = data[8];
      type = data[9];
      if (data[12]) throw new Error('interlaced PNG desteklenmiyor');
    } else if (kind === 'PLTE') palette = data;
    else if (kind === 'tRNS') trns = data;
    else if (kind === 'IDAT') idat.push(data);
    else if (kind === 'IEND') break;
    p += 12 + len;
  }
  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[type];
  const bpp = Math.max(1, (channels * depth) >> 3);
  const stride = Math.ceil((w * channels * depth) / 8);
  const raw = inflateSync(Buffer.concat(idat));
  const out = Buffer.alloc(stride * h);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? out[y * stride + x - bpp] : 0;
      const b = y > 0 ? out[(y - 1) * stride + x] : 0;
      const c = x >= bpp && y > 0 ? out[(y - 1) * stride + x - bpp] : 0;
      let v = line[x];
      if (f === 1) v += a;
      else if (f === 2) v += b;
      else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) {
        const pp = a + b - c,
          pa = Math.abs(pp - a),
          pb = Math.abs(pp - b),
          pc = Math.abs(pp - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      out[y * stride + x] = v & 255;
    }
  }
  const px = new Uint8Array(w * h * 4);
  const sample = (y, i) => {
    if (depth === 8) return out[y * stride + i];
    const bit = i * depth;
    return (out[y * stride + (bit >> 3)] >> (8 - depth - (bit & 7))) & ((1 << depth) - 1);
  };
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4;
      if (type === 3) {
        const idx = sample(y, x);
        px[o] = palette[idx * 3];
        px[o + 1] = palette[idx * 3 + 1];
        px[o + 2] = palette[idx * 3 + 2];
        px[o + 3] = trns && idx < trns.length ? trns[idx] : 255;
      } else if (type === 6) {
        for (let k = 0; k < 4; k++) px[o + k] = sample(y, x * 4 + k);
      } else if (type === 2) {
        for (let k = 0; k < 3; k++) px[o + k] = sample(y, x * 3 + k);
        px[o + 3] = 255;
      } else if (type === 0 || type === 4) {
        const g = sample(y, x * channels);
        px[o] = px[o + 1] = px[o + 2] = g;
        px[o + 3] = type === 4 ? sample(y, x * 2 + 1) : 255;
      }
    }
  return { w, h, px };
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td) >>> 0);
  return Buffer.concat([len, td, crc]);
}
function encodePNG({ w, h, px }) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 2; // RGB
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4,
        o = y * (w * 3 + 1) + 1 + x * 3;
      raw[o] = px[i];
      raw[o + 1] = px[i + 1];
      raw[o + 2] = px[i + 2];
    }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ------------------------------------------------------------------ çizim
const hex = (s) => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
const C = {
  night: hex('#11102e'),
  void: hex('#07061a'),
  sleep: hex('#33386e'),
  faint: hex('#5d68ad'),
  blue: hex('#a3b1ec'),
  white: hex('#f3f5ff'),
  gold: hex('#ffd65c'),
};
const canvas = () => ({ w: W, h: H, px: new Uint8Array(W * H * 4) });
function rect(im, x, y, w, h, c) {
  for (let j = Math.max(0, y); j < Math.min(im.h, y + h); j++)
    for (let i = Math.max(0, x); i < Math.min(im.w, x + w); i++) {
      const o = (j * im.w + i) * 4;
      im.px[o] = c[0];
      im.px[o + 1] = c[1];
      im.px[o + 2] = c[2];
      im.px[o + 3] = 255;
    }
}
function blit(im, src, dx, dy, s) {
  for (let y = 0; y < src.h; y++)
    for (let x = 0; x < src.w; x++) {
      const i = (y * src.w + x) * 4;
      if (src.px[i + 3] < 128) continue;
      rect(im, dx + x * s, dy + y * s, s, s, [src.px[i], src.px[i + 1], src.px[i + 2]]);
    }
}
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/** Gökyüzü: 4 px'lik piksel ızgarasında yıldızlar */
function sky(im, seed) {
  rect(im, 0, 0, W, H, C.night);
  const r = rng(seed);
  const P = 4;
  for (let i = 0; i < 260; i++) {
    const x = Math.floor(r() * (W / P)) * P,
      y = Math.floor(r() * (H / P)) * P;
    const lvl = r();
    const c = lvl > 0.93 ? C.white : lvl > 0.75 ? C.blue : lvl > 0.45 ? C.faint : C.sleep;
    rect(im, x, y, P, P, c);
    if (lvl > 0.97) {
      rect(im, x - P, y, P, P, C.faint);
      rect(im, x + P, y, P, P, C.faint);
      rect(im, x, y - P, P, P, C.faint);
      rect(im, x, y + P, P, P, C.faint);
    }
  }
}
/** Pixel çerçeve (köşeleri kesik) */
function frame(im, x, y, w, h, t, c) {
  rect(im, x + t, y, w - 2 * t, t, c);
  rect(im, x + t, y + h - t, w - 2 * t, t, c);
  rect(im, x, y + t, t, h - 2 * t, c);
  rect(im, x + w - t, y + t, t, h - 2 * t, c);
}

// 5×7 pixel yazı (oyun adları için). Türkçe harfler temel harfe iner.
const F = {
  A: '01110100011000111111100011000110001', B: '11110100011000111110100011000111110', C: '01110100011000010000100001000101110',
  D: '11110100011000110001100011000111110', E: '11111100001000011110100001000011111', F: '11111100001000011110100001000010000',
  G: '01110100011000010111100011000101111', H: '10001100011000111111100011000110001', I: '01110001000010000100001000010001110',
  J: '00111000100001000010000101001001100', K: '10001100101010011000101001001010001', L: '10000100001000010000100001000011111',
  M: '10001110111010110101100011000110001', N: '10001110011010110011100011000110001', O: '01110100011000110001100011000101110',
  P: '11110100011000111110100001000010000', Q: '01110100011000110001101011001001101', R: '11110100011000111110101001001010001',
  S: '01111100001000001110000010000111110', T: '11111001000010000100001000010000100', U: '10001100011000110001100011000101110',
  V: '10001100011000110001100010101000100', W: '10001100011000110101101011010101010', X: '10001100010101000100010101000110001',
  Y: '10001100010101000100001000010000100', Z: '11111000010001000100010001000011111',
  0: '01110100011001110101110011000101110', 1: '00100011000010000100001000010001110', 2: '01110100010000100010001000100011111',
  3: '11111000100010000010000011000101110', 4: '00010001100101010010111110001000010', 5: '11111100001111000001000011000101110',
  6: '00110010001000011110100011000101110', 7: '11111000010001000100010000100001000', 8: '01110100011000101110100011000101110',
  9: '01110100011000101111000010001001100', ' ': '00000000000000000000000000000000000', '-': '00000000000000011111000000000000000',
  '&': '01100100101010001000101011001001101', "'": '00100001000100000000000000000000000', ':': '00000001000010000000001000010000000',
  '!': '00100001000010000100001000000000100', '.': '00000000000000000000000000110001100', '?': '01110100010000100010001000000000100',
};
const fold = (s) =>
  s
    .toLocaleUpperCase('tr')
    .replace(/[ÇĆ]/g, 'C').replace(/Ğ/g, 'G').replace(/[İIÎÍ]/g, 'I').replace(/[ÖÓ]/g, 'O')
    .replace(/Ş/g, 'S').replace(/[ÜÛÚ]/g, 'U').replace(/[ÂÁÀ]/g, 'A').replace(/[ÉÈÊ]/g, 'E');
function text(im, str, x, y, s, c) {
  let cx = x;
  for (const ch of fold(str)) {
    const g = F[ch] ?? F[' '];
    for (let i = 0; i < 35; i++) if (g[i] === '1') rect(im, cx + (i % 5) * s, y + Math.floor(i / 5) * s, s, s, c);
    cx += 6 * s;
  }
}
const textW = (str, s) => fold(str).length * 6 * s - s;

// ------------------------------------------------------------------ çalıştır
const read = (p) => decodePNG(readFileSync(join(root, 'public', p.replace(/^\//, ''))));
const logo = read('/brand/logo_wandaiser_x1.png');
const outDir = join(root, 'public/og');
mkdirSync(outDir, { recursive: true });

// Varsayılan kart
{
  const im = canvas();
  sky(im, 7);
  const s = 9;
  blit(im, logo, Math.round((W - logo.w * s) / 2), Math.round((H - logo.h * s) / 2) - 20, s);
  writeFileSync(join(outDir, 'default.png'), encodePNG(im));
  console.log('og  default.png');
}

// Oyun kartları
const gamesDir = join(root, 'src/content/games');
for (const file of readdirSync(gamesDir).filter((f) => /^[^_].*\.ya?ml$/.test(f))) {
  const y = readFileSync(join(gamesDir, file), 'utf8');
  const get = (k) => y.match(new RegExp(`^${k}:\\s*"?([^"\\n]+?)"?\\s*$`, 'm'))?.[1];
  const slug = get('slug'),
    name = get('name') ?? slug,
    accent = hex(get('accentColor') ?? '#ffd65c'),
    iconPath = get('icon');
  if (!slug) continue;
  const im = canvas();
  sky(im, slug.length * 131 + slug.charCodeAt(0));

  // ikon: ~288px'e tam sayı katla, oyun rengiyle pixel çerçeve
  const box = 288,
    bx = 96,
    by = Math.round((H - box) / 2);
  if (iconPath && existsSync(join(root, 'public', iconPath))) {
    const icon = read(iconPath);
    const s = Math.max(1, Math.floor((box - 32) / Math.max(icon.w, icon.h)));
    rect(im, bx, by, box, box, C.void);
    blit(im, icon, bx + Math.round((box - icon.w * s) / 2), by + Math.round((box - icon.h * s) / 2), s);
  }
  frame(im, bx - 12, by - 12, box + 24, box + 24, 8, accent);

  // ad: sığan en büyük tam sayı ölçek
  const tx = bx + box + 72,
    maxW = W - tx - 72;
  let s = 12;
  while (s > 4 && textW(name, s) > maxW) s--;
  text(im, name, tx, by + 40, s, C.white);
  rect(im, tx, by + 40 + 7 * s + 32, 96, 8, accent);
  // stüdyo logosu (4×)
  blit(im, logo, tx, by + box - logo.h * 4 + 4, 4);

  writeFileSync(join(outDir, `${slug}.png`), encodePNG(im));
  console.log(`og  ${slug}.png`);
}

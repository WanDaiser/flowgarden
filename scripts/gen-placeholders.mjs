#!/usr/bin/env node
/**
 * Yer tutucu pixel art üretir (bağımlılık yok; PNG'yi Node'un zlib'iyle yazar).
 *
 *   npm run placeholders            → eksik dosyaları üretir
 *   npm run placeholders -- --force → hepsini yeniden üretir
 *
 * Her oyun için src/content/games/*.yaml içindeki slug + accentColor okunur ve
 * public/games/<slug>/ altına icon.png, sprite.png, screen-1..3.png yazılır.
 * Gerçek varlık geldiğinde dosyanın üzerine yazman yeterli; script mevcut
 * dosyalara (--force olmadan) dokunmaz. Stüdyo logosu gerçek marka dosyasıdır (public/brand/).
 *
 * Görseller 1x mantıksal çözünürlükte; tarayıcıda tam sayı katıyla büyütülür.
 */
import { deflateSync, crc32 } from 'node:zlib';
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const force = process.argv.includes('--force');

// ---------- PNG ----------
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td) >>> 0);
  return Buffer.concat([len, td, crc]);
}
function encodePNG(img) {
  const { w, h, px } = img;
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    px.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------- tiny raster ----------
const hex = (s) => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16), 255];
const mix = (a, b, t) => a.map((v, i) => (i === 3 ? 255 : Math.round(v + (b[i] - v) * t)));
const img = (w, h) => ({ w, h, px: Buffer.alloc(w * h * 4) });
function set(im, x, y, c) {
  if (x < 0 || y < 0 || x >= im.w || y >= im.h) return;
  const i = (y * im.w + x) * 4;
  im.px[i] = c[0]; im.px[i + 1] = c[1]; im.px[i + 2] = c[2]; im.px[i + 3] = c[3];
}
function rect(im, x, y, w, h, c) {
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) set(im, i, j, c);
}

// 3x5 pixel font (only glyphs we need)
const GLYPHS = {
  '0': '111101101101111', '1': '010110010010111', '2': '111001111100111', '3': '111001111001111',
  '4': '101101111001001', '5': '111100111001111', '6': '111100111101111', '7': '111001001001001',
  '8': '111101111101111', '9': '111101111001111',
  P: '111101111100100', L: '100100100100111', A: '010101111101101', C: '111100100100111',
  E: '111100111100111', H: '101101111101101', O: '111101101101111', D: '110101101101110',
  R: '110101110101101', S: '111100111001111', T: '111010010010010', I: '111010010010111',
  N: '101111111111101', G: '111100101101111', M: '101111111101101', W: '101101111111101',
  ' ': '000000000000000', '-': '000000111000000',
};
function text(im, str, x, y, c, scale = 1) {
  let cx = x;
  for (const ch of str.toUpperCase()) {
    const g = GLYPHS[ch] ?? GLYPHS[' '];
    for (let i = 0; i < 15; i++) if (g[i] === '1') rect(im, cx + (i % 3) * scale, y + Math.floor(i / 3) * scale, scale, scale, c);
    cx += 4 * scale;
  }
}
const textWidth = (str, scale = 1) => str.length * 4 * scale - scale;

// Diagonal hatch = "this is a placeholder" at a glance
function hatch(im, x, y, w, h, a, b, step = 4) {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) set(im, x + i, y + j, (i + j) % step === 0 ? b : a);
}

const NIGHT = hex('#0b0d1a');
const DEEP = hex('#1a1d36');
const DIM = hex('#3a3f6b');
const TEXT = hex('#e8e6ff');

// ---------- generators ----------
function icon(n, accent) {
  const s = 32, im = img(s, s);
  const dark = mix(accent, NIGHT, 0.7);
  // rounded square (1px corner cut)
  hatch(im, 1, 1, s - 2, s - 2, dark, mix(accent, NIGHT, 0.55));
  for (let i = 2; i < s - 2; i++) { set(im, i, 1, accent); set(im, i, s - 2, accent); set(im, 1, i, accent); set(im, s - 2, i, accent); }
  const label = String(n);
  text(im, label, Math.floor((s - textWidth(label, 3)) / 2), 6, TEXT, 3);
  text(im, 'PH', Math.floor((s - textWidth('PH')) / 2), s - 9, accent);
  return im;
}

/** 4-frame idle: a little blob that breathes and blinks. Each frame 24x24. */
function sprite(accent, frames = 4) {
  const f = 24, im = img(f * frames, f);
  const shade = mix(accent, NIGHT, 0.45);
  const outline = mix(accent, NIGHT, 0.8);
  const bob = [0, 1, 1, 0];
  for (let k = 0; k < frames; k++) {
    const ox = k * f, dy = bob[k % 4];
    const top = 7 + dy, bottom = 20, left = 5, right = 18;
    for (let y = top; y <= bottom; y++) {
      for (let x = left; x <= right; x++) {
        const corner = (y === top || y === bottom) && (x === left || x === right);
        if (corner) continue;
        const edge = y === top || y === bottom || x === left || x === right;
        set(im, ox + x, y, edge ? outline : y > bottom - 4 ? shade : accent);
      }
    }
    // eyes (blink on frame 3)
    const ey = top + 5;
    if (k === 2) { rect(im, ox + 8, ey + 1, 2, 1, outline); rect(im, ox + 14, ey + 1, 2, 1, outline); }
    else { rect(im, ox + 8, ey, 2, 3, outline); rect(im, ox + 14, ey, 2, 3, outline); set(im, ox + 8, ey, TEXT); set(im, ox + 14, ey, TEXT); }
    // feet
    rect(im, ox + 7, 21, 3, 1, outline); rect(im, ox + 14, 21, 3, 1, outline);
  }
  return im;
}

/** Phone-shaped (9:16) screenshot placeholder, 90x160. */
function screenshot(n, k, accent) {
  const w = 90, h = 160, im = img(w, h);
  hatch(im, 0, 0, w, h, DEEP, mix(DEEP, accent, 0.18), 6);
  rect(im, 0, 0, w, 1, accent); rect(im, 0, h - 1, w, 1, accent); rect(im, 0, 0, 1, h, accent); rect(im, w - 1, 0, 1, h, accent);
  // fake HUD strip + ground
  rect(im, 4, 4, w - 8, 7, NIGHT); text(im, `G${n}`, 6, 5, accent); text(im, `S${k}`, w - 6 - textWidth(`S${k}`), 5, DIM);
  rect(im, 0, h - 26, w, 25, mix(accent, NIGHT, 0.75));
  for (let x = 0; x < w; x += 6) rect(im, x, h - 26, 3, 1, mix(accent, NIGHT, 0.4));
  const label = 'PLACEHOLDER';
  rect(im, Math.floor((w - textWidth(label)) / 2) - 3, 70, textWidth(label) + 6, 11, NIGHT);
  text(im, label, Math.floor((w - textWidth(label)) / 2), 73, TEXT);
  return im;
}

// ---------- run ----------
function write(path, data) {
  if (existsSync(path) && !force) return console.log(`  skip  ${path.replace(root, '.')}`);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, data);
  console.log(`  write ${path.replace(root, '.')}`);
}

const gamesDir = join(root, 'src/content/games');
for (const file of readdirSync(gamesDir).filter((f) => /^[^_].*\.ya?ml$/.test(f))) {
  const y = readFileSync(join(gamesDir, file), 'utf8');
  const slug = y.match(/^slug:\s*"?([a-z0-9-]+)"?/m)?.[1];
  const color = y.match(/^accentColor:\s*"?(#[0-9a-fA-F]{6})"?/m)?.[1];
  const frames = Number(y.match(/^spriteFrames:\s*(\d+)/m)?.[1] ?? 4);
  const n = Number(y.match(/^order:\s*(\d+)/m)?.[1] ?? 0);
  if (!slug || !color) { console.warn(`! ${file}: slug/accentColor okunamadı, atlandı`); continue; }
  const accent = hex(color);
  const dir = join(root, 'public/games', slug);
  console.log(`${slug}`);
  write(join(dir, 'icon.png'), encodePNG(icon(n, accent)));
  write(join(dir, 'sprite.png'), encodePNG(sprite(accent, frames)));
  for (let k = 1; k <= 3; k++) write(join(dir, `screen-${k}.png`), encodePNG(screenshot(n, k, accent)));
}


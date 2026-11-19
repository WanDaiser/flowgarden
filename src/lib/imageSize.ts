/**
 * Derleme sırasında public/ altındaki bir görselin piksel boyutunu okur (PNG, JPEG, WebP, GIF).
 * Sprite'ları tam sayı katla büyütmek ve CLS'yi önlemek (width/height) için kullanılır.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export type Size = { width: number; height: number };
const cache = new Map<string, Size | null>();

export function imageSize(publicPath: string): Size | null {
  if (cache.has(publicPath)) return cache.get(publicPath)!;
  const file = join(process.cwd(), 'public', publicPath.replace(/^\//, ''));
  let size: Size | null = null;
  if (existsSync(file)) {
    try {
      size = parse(readFileSync(file));
    } catch {
      size = null;
    }
  }
  if (!size) console.warn(`[imageSize] okunamadı: ${publicPath}`);
  cache.set(publicPath, size);
  return size;
}

function parse(b: Buffer): Size | null {
  // PNG
  if (b.readUInt32BE(0) === 0x89504e47) return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
  // GIF
  if (b.toString('ascii', 0, 3) === 'GIF') return { width: b.readUInt16LE(6), height: b.readUInt16LE(8) };
  // WebP
  if (b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') {
    const kind = b.toString('ascii', 12, 16);
    if (kind === 'VP8X') return { width: 1 + b.readUIntLE(24, 3), height: 1 + b.readUIntLE(27, 3) };
    if (kind === 'VP8 ') return { width: b.readUInt16LE(26) & 0x3fff, height: b.readUInt16LE(28) & 0x3fff };
    if (kind === 'VP8L') {
      const n = b.readUInt32LE(21);
      return { width: (n & 0x3fff) + 1, height: ((n >> 14) & 0x3fff) + 1 };
    }
  }
  // JPEG
  if (b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i < b.length) {
      if (b[i] !== 0xff) return null;
      const marker = b[i + 1]!;
      const len = b.readUInt16BE(i + 2);
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return { height: b.readUInt16BE(i + 5), width: b.readUInt16BE(i + 7) };
      }
      i += 2 + len;
    }
  }
  return null;
}

/** Hedef boyuta en yakın tam sayı ölçek (en az 1). */
export function intScale(source: number, target: number): number {
  return Math.max(1, Math.round(target / source));
}

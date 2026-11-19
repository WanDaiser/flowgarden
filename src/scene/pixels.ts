/**
 * Düşük çözünürlüklü piksel tamponu. Her şey tam sayı koordinatlara çizilir;
 * kare sonunda tek bir putImageData ile canvas'a aktarılır. Canvas CSS ile tam sayı
 * katıyla büyütüldüğü için piksel ızgarası her ekranda tutarlıdır.
 */
import { palette, type PaletteKey } from '../config/site.config';

/** "#rrggbb" → ImageData'nın Uint32 görünümü için ABGR (little-endian). */
export function rgb(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255,
    g = (n >> 8) & 255,
    b = n & 255;
  return ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0;
}

export const P = Object.fromEntries(Object.entries(palette).map(([k, v]) => [k, rgb(v)])) as Record<
  PaletteKey,
  number
>;

/** Yıldız parlaklık rampası: 0 uyuyan → 3 beyaz */
export const STAR_RAMP = [P.starSleep, P.starFaint, P.starBlue, P.starWhite];

export interface Sprite {
  w: number;
  h: number;
  data: Uint32Array;
}

export class PixelBuffer {
  w = 0;
  h = 0;
  data = new Uint32Array(0);
  private image: ImageData | null = null;

  resize(w: number, h: number) {
    this.w = w;
    this.h = h;
    const bytes = new Uint8ClampedArray(w * h * 4);
    this.data = new Uint32Array(bytes.buffer);
    this.image = new ImageData(bytes, w, h);
  }

  clear(c: number) {
    this.data.fill(c);
  }

  set(x: number, y: number, c: number) {
    x |= 0;
    y |= 0;
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.data[y * this.w + x] = c;
  }

  rect(x: number, y: number, w: number, h: number, c: number) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c);
  }

  /** Bresenham çizgi. `progress` < 1 ise çizginin yalnızca başı çizilir. Bitiş noktasını döndürür. */
  line(x0: number, y0: number, x1: number, y1: number, c: number, progress = 1, dotted = false) {
    x0 |= 0;
    y0 |= 0;
    x1 |= 0;
    y1 |= 0;
    const dx = Math.abs(x1 - x0),
      dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1,
      sy = y0 < y1 ? 1 : -1;
    const total = Math.max(dx, -dy);
    const limit = Math.round(total * progress);
    let err = dx + dy,
      i = 0;
    for (;;) {
      if (!dotted || i % 2 === 0) this.set(x0, y0, c);
      if (i >= limit || (x0 === x1 && y0 === y1)) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x0 += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y0 += sy;
      }
      i++;
    }
    return [x0, y0] as const;
  }

  /** Şeffaf olmayan pikselleri kopyalar. */
  blit(s: Sprite, dx: number, dy: number) {
    dx |= 0;
    dy |= 0;
    for (let y = 0; y < s.h; y++) {
      const ty = dy + y;
      if (ty < 0 || ty >= this.h) continue;
      for (let x = 0; x < s.w; x++) {
        const tx = dx + x;
        if (tx < 0 || tx >= this.w) continue;
        const c = s.data[y * s.w + x]!;
        if (c >>> 24) this.data[ty * this.w + tx] = c;
      }
    }
  }

  present(ctx: CanvasRenderingContext2D) {
    if (this.image) ctx.putImageData(this.image, 0, 0);
  }
}

/** Bir PNG'yi yükleyip piksel verisine çevirir (nebula gibi küçük marka görselleri için). */
export async function loadSprite(url: string): Promise<Sprite> {
  const img = new Image();
  img.decoding = 'async';
  img.src = url;
  await img.decode();
  const c = document.createElement('canvas');
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const ctx = c.getContext('2d')!;
  ctx.drawImage(img, 0, 0);
  const d = ctx.getImageData(0, 0, c.width, c.height);
  return { w: c.width, h: c.height, data: new Uint32Array(d.data.buffer) };
}

/** Tekrarlanabilir rastgelelik (her açılışta aynı gökyüzü). */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const mod = (a: number, m: number) => ((a % m) + m) % m;

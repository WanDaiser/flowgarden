/**
 * Kodla çizilen pixel sprite'lar: oyun yıldızları, pixel hale, ateşböceği,
 * uydu (Hakkımızda), gözlem kulesi (İletişim), kayan yıldız.
 * Yıldız biçimleri marka logosundaki yıldızlarla aynı (merkez beyaz, kollar mavi).
 */
import { PixelBuffer, P } from './pixels';

export interface StarLook {
  big: boolean;
  soon: boolean;
  hover: boolean;
  active: boolean;
  /** Yakınlaşınca bir basamak büyür */
  tier: 0 | 1;
  /** 0–1 arası ateşlenme (açılışta çizgi ulaşınca altın rengiyle yanar) */
  ignite: number;
  accent: number;
}

/** Yıldızın ekrandaki yarıçapı (etiket ve ateşböceği yerleşimi için). */
export function starRadius(l: Pick<StarLook, 'big' | 'hover' | 'active' | 'tier'>): number {
  return (l.big ? 2 : 1) + l.tier + (l.active || l.hover ? 1 : 0);
}

export function drawStar(buf: PixelBuffer, x: number, y: number, l: StarLook, t: number, animate: boolean) {
  const r = starRadius(l);
  let core = P.starWhite,
    arm = P.starBlue,
    tip = P.starFaint;

  if (l.soon) {
    // Henüz çıkmamış: sönük, yavaşça yanıp söner
    const on = !animate || Math.sin(t * 2.4) > 0.2;
    core = on ? P.starBlue : P.starFaint;
    arm = on ? P.starFaint : P.starSleep;
    tip = P.starSleep;
  }
  if (l.ignite > 0 && l.ignite < 1) {
    core = P.glowCore;
    arm = P.glowGold;
    tip = P.ember;
  }

  // Kollar
  for (let i = 1; i <= r; i++) {
    const c = i === r && r > 1 ? tip : arm;
    buf.set(x - i, y, c);
    buf.set(x + i, y, c);
    buf.set(x, y - i, c);
    buf.set(x, y + i, c);
  }
  // Büyük yıldızlarda kalın merkez
  if (r >= 3) {
    buf.set(x - 1, y, core);
    buf.set(x + 1, y, core);
    buf.set(x, y - 1, core);
    buf.set(x, y + 1, core);
  }
  buf.set(x, y, core);

  // Etkin / üzerine gelinmiş: köşegen pırıltı + dönen pixel hale
  if (l.hover || l.active) {
    const sparkle = !animate || Math.floor(t * 4) % 2 === 0;
    if (sparkle) {
      const d = Math.max(1, r - 1);
      const c = l.soon ? P.starFaint : P.starBlue;
      buf.set(x - d, y - d, c);
      buf.set(x + d, y - d, c);
      buf.set(x - d, y + d, c);
      buf.set(x + d, y + d, c);
    }
    halo(buf, x, y, r + (l.active ? 5 : 4), l.accent, animate ? t : 0, l.active ? 1 : 0.6);
    if (l.active) halo(buf, x, y, r + 8, P.starSleep, animate ? -t * 0.5 : 0, 0.3);
  }
}

/** Kesikli pixel çember; zamanla döner. */
export function halo(buf: PixelBuffer, cx: number, cy: number, r: number, c: number, t: number, spin: number) {
  const dashes = Math.max(6, Math.round(r * 1.4) & ~1);
  const steps = Math.ceil(Math.PI * 2 * r * 1.6);
  const off = t * spin * 1.6;
  let lx = NaN,
    ly = NaN;
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const seg = Math.floor((a / (Math.PI * 2)) * dashes + off);
    if (((seg % 2) + 2) % 2) continue;
    const x = Math.round(cx + Math.cos(a) * r),
      y = Math.round(cy + Math.sin(a) * r);
    if (x === lx && y === ly) continue;
    buf.set(x, y, c);
    lx = x;
    ly = y;
  }
}

/**
 * Marka ateşböceği: altın ışık (karın), gövde, iki kanat.
 * (x, y) = ışık pikseli. `flying` iken kanatlar çırpar.
 */
export function drawFirefly(buf: PixelBuffer, x: number, y: number, t: number, flying: boolean, animate: boolean) {
  const pulse = animate && Math.floor(t * 1.6) % 4 === 0;
  // ışık halesi (ember) — yalnızca nabızda
  if (pulse) {
    buf.set(x - 1, y, P.ember);
    buf.set(x + 1, y, P.ember);
    buf.set(x, y + 1, P.ember);
  }
  buf.set(x, y, pulse ? P.glowCore : P.glowGold);
  buf.set(x, y - 1, P.fireflyBody);
  const up = flying && animate && Math.floor(t * 14) % 2 === 0;
  buf.set(x - 1, y - (up ? 3 : 2), P.starFaint);
  buf.set(x + 1, y - (up ? 3 : 2), P.starFaint);
}

/** Uydu — Hakkımızda. 11×5, güneş panelleri + gövde + yanıp sönen anten ucu. */
export function drawSatellite(buf: PixelBuffer, x: number, y: number, t: number, lit: boolean, animate: boolean) {
  const panel = lit ? P.lineLit : P.lineRest;
  const grid = lit ? P.starBlue : P.starFaint;
  for (const side of [-1, 1]) {
    const px = side < 0 ? x - 5 : x + 3;
    buf.rect(px, y - 1, 3, 3, panel);
    buf.set(px + 1, y, grid);
    buf.set(side < 0 ? x - 2 : x + 2, y, P.starFaint); // bağlantı
  }
  buf.rect(x - 1, y - 1, 3, 3, P.starBlue);
  buf.set(x, y, P.starWhite);
  buf.set(x, y - 2, P.starFaint);
  const blink = !animate || Math.floor(t * 1.2) % 2 === 0;
  buf.set(x, y - 3, blink ? P.glowGold : P.ember);
}

/** Gözlem kulesi — İletişim. Kubbe + yarık + kule. */
export function drawObservatory(buf: PixelBuffer, x: number, y: number, t: number, lit: boolean, animate: boolean) {
  const dome = lit ? P.starBlue : P.starFaint;
  buf.rect(x - 1, y - 5, 3, 1, P.starFaint);
  buf.rect(x - 2, y - 4, 5, 1, dome);
  buf.rect(x - 3, y - 3, 7, 1, dome);
  // teleskop yarığı: dinliyor
  const glint = lit || !animate || Math.floor(t * 0.8) % 3 !== 0;
  buf.set(x, y - 4, glint ? P.glowGold : P.ember);
  buf.set(x, y - 3, glint ? P.glowCore : P.glowGold);
  buf.rect(x - 4, y - 2, 9, 1, P.lineRest);
  buf.rect(x - 3, y - 1, 1, 4, P.starSleep);
  buf.rect(x + 3, y - 1, 1, 4, P.starSleep);
  buf.rect(x - 2, y - 1, 5, 4, P.deepIndigo);
  buf.set(x, y, lit ? P.glowGold : P.starFaint); // pencere
  buf.rect(x - 4, y + 3, 9, 1, P.starSleep);
}

export interface Shooting {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  len: number;
}

const TAIL = [P.starWhite, P.starBlue, P.starBlue, P.starFaint, P.starFaint, P.starSleep];

export function drawShooting(buf: PixelBuffer, s: Shooting) {
  const sp = Math.hypot(s.vx, s.vy);
  const dx = -s.vx / sp,
    dy = -s.vy / sp;
  const fade = s.age / s.life;
  const len = Math.max(2, Math.round(s.len * (1 - fade * 0.6)));
  for (let i = len; i >= 0; i--) {
    const c = TAIL[Math.min(TAIL.length - 1, Math.floor((i / len) * TAIL.length + fade * 2))]!;
    buf.set(Math.round(s.x + dx * i), Math.round(s.y + dy * i), c);
  }
  buf.set(Math.round(s.x), Math.round(s.y), fade < 0.5 ? P.glowCore : P.starWhite);
}

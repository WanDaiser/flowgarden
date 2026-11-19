/**
 * Parallax gökyüzü: 3 yıldız katmanı + marka nebulası + nadiren geçen toz.
 * Yıldızlar ekranın biraz büyüğü bir alana dağıtılır ve kamera kaydıkça sarar (wrap).
 * Yanıp sönme ayrıktır (parlaklık bir basamak inip çıkar), ışıltı piksel düzeyindedir.
 */
import { sky } from '../config/site.config';
import { PixelBuffer, STAR_RAMP, P, rng, mod, type Sprite } from './pixels';

interface FieldStar {
  x: number;
  y: number;
  level: number;
  twinkle: boolean;
  speed: number;
  phase: number;
  cross: boolean;
}

interface Layer {
  parallax: number;
  stars: FieldStar[];
}

interface Dust {
  x: number;
  y: number;
  vx: number;
  shape: number;
}

export interface ViewShift {
  /** Kameranın mantıksal piksel cinsinden kayması (harita ölçeğinde). */
  x: number;
  y: number;
  /** Yakınlaşma oranı (1 = harita). */
  k: number;
  /** Son karedeki kayma hızı (çizgi efekti için). */
  vx: number;
  vy: number;
  /** Fare/eğim kayması, mantıksal piksel. */
  px: number;
  py: number;
}

export class Starfield {
  private layers: Layer[] = [];
  private dust: Dust[] = [];
  private fw = 0;
  private fh = 0;
  nebula: Sprite | null = null;

  resize(w: number, h: number) {
    this.fw = Math.ceil(w * 1.3) + 16;
    this.fh = Math.ceil(h * 1.3) + 16;
    const area = this.fw * this.fh;
    this.layers = sky.layers.map((cfg, li) => {
      const r = rng(sky.seed + li * 977);
      const n = Math.round(area * cfg.density);
      const stars: FieldStar[] = [];
      for (let i = 0; i < n; i++) {
        stars.push({
          x: r() * this.fw,
          y: r() * this.fh,
          level: Math.min(3, Math.floor(cfg.bright * 3 + r() * 1.2)),
          twinkle: r() < cfg.twinkle,
          speed: 0.5 + r() * 1.8,
          phase: r() * Math.PI * 2,
          cross: r() < cfg.cross,
        });
      }
      return { parallax: cfg.parallax, stars };
    });
    const r = rng(sky.seed + 31);
    this.dust = Array.from({ length: sky.dust.count }, () => ({
      x: r() * this.fw,
      y: r() * this.fh,
      vx: (0.4 + r()) * sky.dust.speed,
      shape: Math.floor(r() * 3),
    }));
  }

  draw(buf: PixelBuffer, t: number, v: ViewShift, animate: boolean) {
    const { w, h } = buf;
    const cx = w / 2,
      cy = h / 2;
    const ox = (this.fw - w) / 2,
      oy = (this.fh - h) / 2;
    const speed = Math.hypot(v.vx, v.vy);

    // Nebula — en uzak, çok yavaş
    if (this.nebula) {
      const p = sky.nebula.parallax;
      const nx = Math.round(sky.nebula.x * w - v.x * p + v.px * p);
      const ny = Math.round(sky.nebula.y * h - this.nebula.h / 2 - v.y * p + v.py * p);
      buf.blit(this.nebula, nx, ny);
    }

    for (const layer of this.layers) {
      const p = layer.parallax;
      const k = 1 + (v.k - 1) * p * 0.45;
      const sx = v.x * p - v.px * p,
        sy = v.y * p - v.py * p;
      const streak = animate && speed > 1.5 && p > 0.2 ? Math.min(7, speed * p * 1.4) : 0;
      const dirX = streak ? v.vx / speed : 0,
        dirY = streak ? v.vy / speed : 0;
      for (const s of layer.stars) {
        const rx = mod(s.x - sx, this.fw) - ox - cx;
        const ry = mod(s.y - sy, this.fh) - oy - cy;
        const x = Math.round(cx + rx * k),
          y = Math.round(cy + ry * k);
        if (x < -2 || y < -2 || x > w + 2 || y > h + 2) continue;
        let lvl = s.level;
        if (animate && s.twinkle) {
          const q = Math.sin(t * s.speed + s.phase);
          if (q > 0.93) lvl++;
          else if (q < -0.8) lvl--;
        }
        if (lvl < 0) continue;
        const c = STAR_RAMP[Math.min(3, lvl)]!;
        if (streak) {
          buf.line(x, y, x + dirX * streak, y + dirY * streak, STAR_RAMP[Math.max(0, lvl - 1)]!);
        }
        buf.set(x, y, c);
        if (s.cross && lvl >= 1) {
          const a = STAR_RAMP[lvl - 1]!;
          buf.set(x - 1, y, a);
          buf.set(x + 1, y, a);
          buf.set(x, y - 1, a);
          buf.set(x, y + 1, a);
        }
      }
    }

    // Toz: birkaç küçük piksel öbeği yavaşça geçer
    const dp = sky.dust.parallax;
    for (const d of this.dust) {
      const x = Math.round(mod(d.x + (animate ? t * d.vx : 0) - v.x * dp + v.px * dp, this.fw) - ox);
      const y = Math.round(mod(d.y - v.y * dp + v.py * dp, this.fh) - oy);
      const c = P.nebulaOrchid;
      buf.set(x, y, c);
      buf.set(x + 1, y, P.nebulaViolet);
      if (d.shape > 0) buf.set(x - 1, y + 1, P.nebulaViolet);
      if (d.shape > 1) buf.set(x + 2, y - 1, P.deepIndigo);
    }
  }
}

/**
 * Gökyüzü sahnesi: canvas boyutlandırma (tam sayı piksel ölçeği), çizim döngüsü,
 * kamera, takımyıldız, gök cisimleri, ateşböceği, kayan yıldızlar.
 *
 * Arayüzden habersizdir: yalnızca "şu yıldızı etkin yap", "şuraya uç" gibi komutlar alır
 * ve yıldızların ekran konumunu (CSS px) dışarı verir.
 */
import { camera as camCfg, constellationConfig, pixel, sky, timing } from '../config/site.config';
import { CameraRig, type Cam } from './camera';
import { PixelBuffer, P, rgb, loadSprite } from './pixels';
import { Starfield } from './starfield';
import {
  drawFirefly,
  drawObservatory,
  drawSatellite,
  drawShooting,
  drawStar,
  starRadius,
  type Shooting,
} from './sprites';

export interface SceneBody {
  id: string;
  kind: 'game' | 'body';
  x: number;
  y: number;
  big: boolean;
  soon: boolean;
  accent: string;
  bodyKind?: string;
  wStar?: string;
}

export interface SkyOptions {
  bodies: SceneBody[];
  reduced: boolean;
  nebulaUrl?: string;
  /** Her çizilen karede (yıldız konumları güncellendikten sonra) çağrılır. */
  onFrame?: () => void;
}

export class SkyScene {
  readonly canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private buf = new PixelBuffer();
  private field = new Starfield();
  private cam = new CameraRig();
  private bodies: SceneBody[];
  private accent = new Map<string, number>();
  private wStars = constellationConfig.stars;
  private reduced: boolean;
  private onFrame?: () => void;

  /** CSS pikseli / mantıksal piksel */
  cssPerPx = 1;
  private scale = 2;
  private mapZ = 100;
  private narrow = false;

  private active: string | null = null;
  private hover: string | null = null;
  private linesProgress = 1;
  private lineAnim: { start: number; dur: number; resolve: () => void } | null = null;

  private ptr = { x: 0, y: 0, tx: 0, ty: 0 };
  private lastShift = { x: 0, y: 0 };
  private fly = { x: 0.8, y: 0.24, tx: 0.8, ty: 0.24 };
  private shooting: Shooting[] = [];
  private rain: { until: number; next: number } | null = null;

  private raf = 0;
  private running = false;
  private lastFrame = 0;
  private lastTime = 0;
  private dirty = true;
  private t0 = performance.now();

  constructor(canvas: HTMLCanvasElement, opts: SkyOptions) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('canvas 2d unsupported');
    this.ctx = ctx;
    this.bodies = opts.bodies;
    this.reduced = opts.reduced;
    this.onFrame = opts.onFrame;
    for (const b of this.bodies) this.accent.set(b.id, rgb(b.accent));
    const top = this.wStars.find((s) => s.big) ?? this.wStars[this.wStars.length - 1];
    if (top) this.fly = { x: top.x, y: top.y, tx: top.x, ty: top.y };
    this.resize();
    if (opts.nebulaUrl)
      loadSprite(opts.nebulaUrl)
        .then((s) => {
          this.field.nebula = s;
          this.dirty = true;
        })
        .catch(() => {});
  }

  // ---------------------------------------------------------------- boyut

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const cssW = window.innerWidth,
      cssH = window.innerHeight;
    const devW = Math.round(cssW * dpr),
      devH = Math.round(cssH * dpr);
    const s = Math.round(Math.min(devW, devH) / pixel.targetShortSide);
    this.scale = Math.max(pixel.minScale, Math.min(pixel.maxScale, s));
    const w = Math.ceil(devW / this.scale),
      h = Math.ceil(devH / this.scale);
    this.canvas.width = w;
    this.canvas.height = h;
    this.cssPerPx = this.scale / dpr;
    this.canvas.style.width = `${w * this.cssPerPx}px`;
    this.canvas.style.height = `${h * this.cssPerPx}px`;
    this.narrow = cssW < camCfg.narrowBreakpoint || cssH > cssW * 1.15;
    this.buf.resize(w, h);
    this.field.resize(w, h);
    this.mapZ = this.computeMapZ();
    this.cam.retarget(this.cameraFor(this.active));
    this.dirty = true;
  }

  private computeMapZ() {
    const pts = [...this.wStars.map((s) => [s.x, s.y]), ...this.bodies.map((b) => [b.x, b.y])];
    const xs = pts.map((p) => p[0]!),
      ys = pts.map((p) => p[1]!);
    const bw = Math.max(...xs) - Math.min(...xs) + 0.08;
    const bh = Math.max(...ys) - Math.min(...ys) + 0.08;
    const f = camCfg.mapFit;
    return Math.min((this.buf.w * f.width) / bw, (this.buf.h * f.height) / bh);
  }

  private mapCenter() {
    const pts = [...this.wStars.map((s) => [s.x, s.y]), ...this.bodies.map((b) => [b.x, b.y])];
    const xs = pts.map((p) => p[0]!),
      ys = pts.map((p) => p[1]!);
    return { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 };
  }

  /** Bir durak için kamera kadrajı (null = harita). */
  cameraFor(id: string | null): Cam {
    const b = id ? this.bodies.find((x) => x.id === id) : undefined;
    if (!b) {
      const c = this.mapCenter();
      return { wx: c.x, wy: c.y, z: this.mapZ, ax: 0.5, ay: camCfg.mapFit.centerY };
    }
    const a = this.narrow ? camCfg.focusAnchorNarrow : camCfg.focusAnchorWide;
    return { wx: b.x, wy: b.y, z: this.mapZ * camCfg.focusZoom, ax: a.x, ay: a.y };
  }

  get isNarrow() {
    return this.narrow;
  }

  // ---------------------------------------------------------------- komutlar

  /** Etkin durağı değiştir ve kamerayı oraya uçur. */
  focus(id: string | null, instant = false): Promise<void> {
    const from = this.active;
    this.active = id;
    const target = this.cameraFor(id);
    const b = id ? this.bodies.find((x) => x.id === id) : null;
    const top = this.wStars.find((s) => s.big) ?? this.wStars[0]!;
    this.fly.tx = b ? b.x : top.x;
    this.fly.ty = b ? b.y : top.y;
    this.dirty = true;
    if (instant || this.reduced) {
      this.cam.jump(target);
      this.fly.x = this.fly.tx;
      this.fly.y = this.fly.ty;
      this.kick();
      return Promise.resolve();
    }
    const dip = from && id ? camCfg.flightDip : 0;
    const p = this.cam.fly(target, performance.now(), timing.flightMs, dip);
    this.kick();
    return p;
  }

  setHover(id: string | null) {
    if (this.hover === id) return;
    this.hover = id;
    this.dirty = true;
    this.kick();
  }

  /** nx, ny: -1..1 (fare konumu ya da cihaz eğimi) */
  setPointer(nx: number, ny: number) {
    if (this.reduced) return;
    this.ptr.tx = nx * sky.pointerParallax;
    this.ptr.ty = ny * sky.pointerParallax;
    this.kick();
  }

  /** Boş gökyüzüne tıklayınca kayan yıldız. cssX/cssY: viewport koordinatı. */
  shoot(cssX: number, cssY: number) {
    if (this.reduced) return;
    const x = cssX / this.cssPerPx,
      y = cssY / this.cssPerPx;
    const dir = x < this.buf.w / 2 ? 1 : -1;
    const a = (Math.PI / 180) * (25 + Math.random() * 20);
    const sp = sky.shootingStar.speed;
    this.shooting.push({
      x: x - dir * 6,
      y: y - 6,
      vx: Math.cos(a) * sp * dir,
      vy: Math.sin(a) * sp,
      age: 0,
      life: sky.shootingStar.life,
      len: sky.shootingStar.length,
    });
    this.kick();
  }

  /** Konami sürprizi: yıldız yağmuru. */
  starRain() {
    if (this.reduced) return;
    const now = performance.now();
    this.rain = { until: now + sky.starRain.durationMs, next: now };
    this.kick();
  }

  /** Açılış: W çizgileri yıldızdan yıldıza çizilir (ateşböceği ucunda uçar). */
  drawLines(ms: number = timing.introLinesMs): Promise<void> {
    if (this.reduced) {
      this.linesProgress = 1;
      this.dirty = true;
      this.kick();
      return Promise.resolve();
    }
    this.linesProgress = 0;
    return new Promise((resolve) => {
      this.lineAnim = { start: performance.now(), dur: ms, resolve };
      this.kick();
    });
  }

  setLinesProgress(p: number) {
    this.linesProgress = p;
    this.lineAnim?.resolve();
    this.lineAnim = null;
    this.dirty = true;
    this.kick();
  }

  /** Bir dünya noktasının viewport'taki CSS koordinatı. */
  project(x: number, y: number) {
    const s = this.toScreen(x, y);
    return { x: (s.x + 0.5) * this.cssPerPx, y: (s.y + 0.5) * this.cssPerPx };
  }

  /** Bir gövdenin ekrandaki yarıçapı (CSS px) — etiket yerleşimi için. */
  bodyRadiusCss(id: string) {
    const b = this.bodies.find((x) => x.id === id);
    if (!b) return 0;
    const r = b.kind === 'body' ? 5 : starRadius({ big: b.big, hover: this.hover === id, active: this.active === id, tier: this.tier() });
    return r * this.cssPerPx;
  }

  // ---------------------------------------------------------------- döngü

  start() {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  /** Bir sonraki karede çizim garanti et (azaltılmış hareket modunda isteğe bağlı çizim). */
  kick() {
    this.dirty = true;
    if (this.running && !this.raf) this.raf = requestAnimationFrame(this.loop);
  }

  private needsFastFrames() {
    return (
      this.cam.flying ||
      !!this.lineAnim ||
      this.shooting.length > 0 ||
      !!this.rain ||
      Math.abs(this.ptr.tx - this.ptr.x) > 0.05 ||
      Math.abs(this.ptr.ty - this.ptr.y) > 0.05 ||
      Math.abs(this.fly.tx - this.fly.x) + Math.abs(this.fly.ty - this.fly.y) > 0.0005
    );
  }

  private loop = (now: number) => {
    this.raf = 0;
    if (!this.running) return;
    const fast = this.needsFastFrames();
    const idleGap = 1000 / timing.idleFps;
    // Boştayken düşük kare hızı (pil), hareket varken tam hız. Azaltılmış harekette yalnızca değişince.
    const shouldDraw = this.reduced ? this.dirty || fast : fast || this.dirty || now - this.lastFrame >= idleGap;
    if (shouldDraw) {
      const dt = Math.min(0.05, (now - this.lastTime) / 1000);
      this.lastTime = now;
      this.lastFrame = now;
      this.update(now, dt);
      this.render(now);
      this.dirty = false;
      this.onFrame?.();
    }
    if (!this.reduced || this.needsFastFrames()) this.raf = requestAnimationFrame(this.loop);
  };

  private update(now: number, dt: number) {
    this.cam.update(now);
    const k = 1 - Math.exp(-dt * 7);
    this.ptr.x += (this.ptr.tx - this.ptr.x) * k;
    this.ptr.y += (this.ptr.ty - this.ptr.y) * k;
    const fk = 1 - Math.exp(-dt * (this.cam.flying ? 5 : 8));
    this.fly.x += (this.fly.tx - this.fly.x) * fk;
    this.fly.y += (this.fly.ty - this.fly.y) * fk;

    if (this.lineAnim) {
      const p = Math.min(1, (now - this.lineAnim.start) / this.lineAnim.dur);
      this.linesProgress = p;
      if (p >= 1) {
        const r = this.lineAnim.resolve;
        this.lineAnim = null;
        r();
      }
    }

    for (const s of this.shooting) {
      s.age += dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
    }
    this.shooting = this.shooting.filter((s) => s.age < s.life);

    if (this.rain) {
      if (now > this.rain.until) this.rain = null;
      else
        while (this.rain.next <= now) {
          this.rain.next += sky.starRain.durationMs / sky.starRain.count;
          const sp = sky.shootingStar.speed * (0.8 + Math.random() * 0.6);
          const a = (Math.PI / 180) * (55 + Math.random() * 15);
          this.shooting.push({
            x: Math.random() * this.buf.w * 1.2,
            y: -4 - Math.random() * 20,
            vx: -Math.cos(a) * sp,
            vy: Math.sin(a) * sp,
            age: 0,
            life: 1.6,
            len: sky.shootingStar.length + 3,
          });
        }
    }
  }

  private tier(): 0 | 1 {
    return this.cam.cur.z > this.mapZ * 1.6 ? 1 : 0;
  }

  private toScreen(x: number, y: number) {
    const c = this.cam.cur;
    const p = this.reduced ? 0 : 1;
    return {
      x: Math.round(c.ax * this.buf.w + (x - c.wx) * c.z + this.ptr.x * p),
      y: Math.round(c.ay * this.buf.h + (y - c.wy) * c.z + this.ptr.y * p),
    };
  }

  private render(now: number) {
    const t = (now - this.t0) / 1000;
    const animate = !this.reduced;
    const buf = this.buf;
    const c = this.cam.cur;
    buf.clear(P.night);

    // Gökyüzü katmanları — kaydırma harita ölçeğinde, yakınlaşma oranıyla açılır
    const shiftX = c.wx * this.mapZ - c.ax * buf.w;
    const shiftY = c.wy * this.mapZ - c.ay * buf.h;
    const vx = shiftX - this.lastShift.x,
      vy = shiftY - this.lastShift.y;
    this.lastShift = { x: shiftX, y: shiftY };
    this.field.draw(
      buf,
      t,
      { x: shiftX, y: shiftY, k: c.z / this.mapZ, vx: this.cam.flying ? vx : 0, vy: this.cam.flying ? vy : 0, px: -this.ptr.x, py: -this.ptr.y },
      animate,
    );

    // W çizgileri
    const pos = new Map(this.wStars.map((s) => [s.id, this.toScreen(s.x, s.y)]));
    const activeW = this.bodies.find((b) => b.id === this.active)?.wStar;
    const lines = constellationConfig.lines;
    const n = lines.length;
    let tip: { x: number; y: number } | null = null;
    const reached = new Set<string>();
    lines.forEach(([a, b], i) => {
      const local = Math.max(0, Math.min(1, this.linesProgress * n - i));
      const pa = pos.get(a),
        pb = pos.get(b);
      if (!pa || !pb) return;
      if (this.linesProgress * n >= i) reached.add(a);
      if (local <= 0) return;
      const lit = activeW === a || activeW === b;
      const [ex, ey] = buf.line(pa.x, pa.y, pb.x, pb.y, lit ? P.lineLit : P.lineRest, local);
      if (local < 1) tip = { x: ex, y: ey };
      else reached.add(b);
    });

    // Haritadaki gövdeler
    for (const b of this.bodies) {
      if (b.kind !== 'body') continue;
      const s = this.toScreen(b.x, b.y);
      const lit = this.hover === b.id || this.active === b.id;
      if (b.bodyKind === 'satellite') drawSatellite(buf, s.x, s.y, t, lit, animate);
      else drawObservatory(buf, s.x, s.y, t, lit, animate);
    }

    // Oyunu olmayan W yıldızları (dekoratif)
    const tier = this.tier();
    const claimed = new Set(this.bodies.map((b) => b.wStar).filter(Boolean));
    for (const w of this.wStars) {
      if (claimed.has(w.id) || !reached.has(w.id)) continue;
      const s = pos.get(w.id)!;
      drawStar(buf, s.x, s.y, { big: !!w.big, soon: false, hover: false, active: false, tier, ignite: 1, accent: P.glowGold }, t, animate);
    }

    // Oyun yıldızları
    const progressN = this.linesProgress * n;
    for (const b of this.bodies) {
      if (b.kind !== 'game') continue;
      if (b.wStar && !reached.has(b.wStar)) continue;
      const s = this.toScreen(b.x, b.y);
      // açılışta çizgi yıldıza yeni ulaştıysa kısa bir altın parlama
      const idx = b.wStar ? lines.findIndex(([a, z]) => z === b.wStar || a === b.wStar) : -1;
      const sinceReach = idx >= 0 ? progressN - (lines[idx]![0] === b.wStar ? idx : idx + 1) : 2;
      const ignite = this.linesProgress < 1 && sinceReach >= 0 && sinceReach < 0.5 ? 0.5 : 1;
      drawStar(
        buf,
        s.x,
        s.y,
        {
          big: b.big,
          soon: b.soon,
          hover: this.hover === b.id,
          active: this.active === b.id,
          tier,
          ignite,
          accent: this.accent.get(b.id) ?? P.glowGold,
        },
        t,
        animate,
      );
    }

    // Ateşböceği: açılışta çizginin ucunda, sonra etkin yıldızın tepesinde
    if (tip) {
      const tp = tip as { x: number; y: number };
      drawFirefly(buf, tp.x, tp.y - 1, t, true, animate);
    } else if (this.linesProgress >= 1) {
      const s = this.toScreen(this.fly.x, this.fly.y);
      const target = this.bodies.find((b) => b.x === this.fly.tx && b.y === this.fly.ty);
      const r =
        target?.kind === 'body'
          ? 6
          : starRadius({
              big: target ? target.big : true,
              hover: !!target && this.hover === target.id,
              active: !!target && this.active === target.id,
              tier,
            });
      const flying = Math.abs(this.fly.tx - this.fly.x) + Math.abs(this.fly.ty - this.fly.y) > 0.002;
      const bob = animate && !flying && Math.floor(t * 1.5) % 2 === 0 ? 1 : 0;
      drawFirefly(buf, s.x, s.y - r - 2 - bob, t, flying, animate);
    }

    for (const s of this.shooting) drawShooting(buf, s);

    buf.present(this.ctx);
  }
}

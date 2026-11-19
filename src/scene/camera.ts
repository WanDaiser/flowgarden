/**
 * Kamera: dünya noktasını (wx, wy) ekranın (ax, ay) oranına yerleştirir, z = dünya biriminin
 * mantıksal piksel karşılığı. Uçuşlar yumuşak geçişle (easing) pan + zoom yapar; iki yıldız
 * arasında ortada hafifçe geri çekilir (sinematik "uçuş" hissi).
 */
export interface Cam {
  wx: number;
  wy: number;
  z: number;
  ax: number;
  ay: number;
}

const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export class CameraRig {
  cur: Cam = { wx: 0.5, wy: 0.5, z: 100, ax: 0.5, ay: 0.5 };
  private from: Cam = this.cur;
  private to: Cam = this.cur;
  private start = 0;
  private dur = 0;
  private dip = 0;
  private resolve: (() => void) | null = null;

  get flying() {
    return this.dur > 0;
  }

  /** Uçuşun 0–1 ilerlemesi (uçuş yoksa 1). */
  progress(now: number) {
    return this.dur > 0 ? Math.min(1, (now - this.start) / this.dur) : 1;
  }

  jump(c: Cam) {
    this.cur = { ...c };
    this.to = { ...c };
    this.finish();
  }

  fly(to: Cam, now: number, dur: number, dip: number): Promise<void> {
    this.finish();
    this.from = { ...this.cur };
    this.to = { ...to };
    this.start = now;
    this.dur = dur;
    this.dip = dip;
    return new Promise((r) => (this.resolve = r));
  }

  /** Hedef değişirse (ör. ekran döndü) uçuşu yeni hedefe yönlendir. */
  retarget(to: Cam) {
    if (this.flying) this.to = { ...to };
    else this.jump(to);
  }

  update(now: number) {
    if (!this.dur) return;
    const p = this.progress(now);
    const e = easeInOutCubic(p);
    const f = this.from,
      t = this.to;
    this.cur = {
      wx: lerp(f.wx, t.wx, e),
      wy: lerp(f.wy, t.wy, e),
      ax: lerp(f.ax, t.ax, e),
      ay: lerp(f.ay, t.ay, e),
      // Zoom'u logaritmik uzayda karıştır: yakınlaşma hızı sabit hissettirir.
      z: Math.exp(lerp(Math.log(f.z), Math.log(t.z), e)) * (1 - this.dip * Math.sin(Math.PI * p)),
    };
    if (p >= 1) {
      this.cur = { ...t };
      this.finish();
    }
  }

  private finish() {
    this.dur = 0;
    const r = this.resolve;
    this.resolve = null;
    r?.();
  }
}

/**
 * Kısa, yumuşak 8-bit sesler — Web Audio ile sentezlenir (ses dosyası indirilmez).
 * Varsayılan olarak KAPALI; tercih localStorage'da hatırlanır.
 */
import { storageKeys } from '../config/site.config';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let enabled = false;

function read(): boolean {
  try {
    return localStorage.getItem(storageKeys.sound) === 'on';
  } catch {
    return false;
  }
}

export const sound = {
  init() {
    enabled = read();
    return enabled;
  },
  get enabled() {
    return enabled;
  },
  /** Kullanıcı hareketi içinde çağrılmalı (tarayıcı otomatik ses politikası). */
  set(on: boolean) {
    enabled = on;
    try {
      localStorage.setItem(storageKeys.sound, on ? 'on' : 'off');
    } catch {
      /* gizli pencere vb. — yok say */
    }
    if (on) {
      ensure();
      this.chime();
    }
  },
  hover() {
    tone(1318.5, 0.04, 'square', 0.025);
  },
  tap() {
    tone(659.3, 0.05, 'square', 0.03);
  },
  /** Uçuş: yükselen kısa arpej */
  whoosh() {
    [392, 523.3, 659.3].forEach((f, i) => tone(f, 0.07, 'triangle', 0.04, i * 0.05));
  },
  /** Varış: marka "çan"ına benzer iki nota */
  chime() {
    tone(1046.5, 0.18, 'triangle', 0.05);
    tone(1568, 0.26, 'triangle', 0.035, 0.07);
  },
  sparkle() {
    for (let i = 0; i < 6; i++) tone(1046.5 * Math.pow(2, (i * 2) / 12), 0.06, 'square', 0.02, i * 0.06);
  },
};

function ensure() {
  if (ctx) {
    if (ctx.state === 'suspended') void ctx.resume();
    return;
  }
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0.8;
  master.connect(ctx.destination);
}

function tone(freq: number, dur: number, type: OscillatorType, vol: number, delay = 0) {
  if (!enabled) return;
  ensure();
  if (!ctx || !master) return;
  const t = ctx.currentTime + delay;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.02);
}

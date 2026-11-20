/**
 * WanDaiser Games — tek yapılandırma noktası.
 *
 * Sahnenin ve arayüzün ayarları (renkler, gök cisimleri, hızlar, piksel ölçeği) burada.
 * Oyun verisi burada DEĞİL: src/content/games/*.yaml
 * Arayüz metinleri burada DEĞİL: src/i18n/*.json
 */
import constellation from './constellation.json';

export const site = {
  name: 'WanDaiser Games',
  /** [DOLDUR] Boş bırakılırsa iletişim panelinde gösterilmez. */
  contactEmail: 'wandaisergames@gmail.com',
  /** [DOLDUR] Örn: { label: 'X / Twitter', url: 'https://x.com/...' } */
  socials: [] as { label: string; url: string }[],
} as const;

/**
 * "WanDaiser Night" — marka paleti (wan-daiser-splash/art_source/wandaiser_palette.gpl).
 * CSS karşılıkları: src/styles/tokens.css
 */
export const palette = {
  void: '#07061a',
  night: '#11102e',
  deepIndigo: '#1b1745',
  nebulaViolet: '#2a1f5c',
  nebulaOrchid: '#3f2c78',
  nebulaGlow: '#5b3d8f',
  starSleep: '#33386e',
  starFaint: '#5d68ad',
  starBlue: '#a3b1ec',
  starWhite: '#f3f5ff',
  lineRest: '#4d5fb0',
  lineLit: '#86a3ea',
  fireflyBody: '#4a3326',
  ember: '#c9892f',
  glowGold: '#ffd65c',
  glowCore: '#fff6c4',
} as const;
export type PaletteKey = keyof typeof palette;

export type ConstellationStar = { id: string; x: number; y: number; big?: boolean };
export const constellationConfig: { stars: ConstellationStar[]; lines: [string, string][] } = {
  stars: constellation.stars,
  lines: constellation.lines.map(([a, b]) => [a!, b!] as [string, string]),
};

/** Haritanın kenarındaki küçük gök cisimleri. Konumlar dünya koordinatında (0–1). */
export const bodies = {
  about: { kind: 'satellite', x: 0.12, y: 0.15 },
  contact: { kind: 'observatory', x: 0.88, y: 0.86 },
} as const;
export type BodyId = keyof typeof bodies;

/** Piksel ızgarası: sahne düşük çözünürlükte çizilip tam sayı katıyla büyütülür. */
export const pixel = {
  /** Ekranın kısa kenarında hedeflenen mantıksal piksel sayısı (≈ 220 → telefonda 5x, masaüstünde 4x). */
  targetShortSide: 220,
  minScale: 2,
  maxScale: 8,
} as const;

/** Kamera kadrajı. Değerler ekran oranı (0–1). */
export const camera = {
  /** Harita görünümünde gök cisimlerinin sığdırılacağı alan (alt kısım başlık için boş kalır). */
  mapFit: { width: 0.9, height: 0.66, centerY: 0.4 },
  /** Bir yıldıza odaklanınca yakınlaştırma çarpanı (harita ölçeğine göre). */
  focusZoom: 2.3,
  /** Odaklanan yıldızın ekrandaki yeri. Geniş ekranda panel sağda, dar ekranda altta. */
  focusAnchorWide: { x: 0.3, y: 0.5 },
  focusAnchorNarrow: { x: 0.5, y: 0.2 },
  /** Bu genişliğin (CSS px) altında "dar ekran" düzeni. */
  narrowBreakpoint: 760,
  /** İki yıldız arası uçuşta ortada geri çekilme miktarı (sinematik his). */
  flightDip: 0.22,
} as const;

/** Gökyüzü katmanları. parallax: 0 = sabit, 1 = takımyıldızla aynı hızda. density: piksel başına yıldız. */
export const sky = {
  layers: [
    { id: 'far', density: 0.0024, parallax: 0.12, bright: 0.15, twinkle: 0.25, cross: 0 },
    { id: 'mid', density: 0.0009, parallax: 0.3, bright: 0.45, twinkle: 0.4, cross: 0.02 },
    { id: 'near', density: 0.0003, parallax: 0.55, bright: 0.8, twinkle: 0.5, cross: 0.12 },
  ],
  nebula: { parallax: 0.08, x: 0.05, y: 0.45 },
  dust: { count: 4, parallax: 0.85, speed: 2.5 },
  /** Fare / cihaz eğimiyle katmanların en fazla kayacağı mantıksal piksel. */
  pointerParallax: 5,
  shootingStar: { speed: 260, length: 9, life: 0.7 },
  starRain: { count: 46, durationMs: 2600 },
  seed: 20251119,
} as const;

/** Zamanlamalar (ms). Brief: kısa tut, ziyaretçiyi bekletme. */
export const timing = {
  flightMs: 950,
  /** Uçuşun hangi oranında yeni panel açılır. */
  panelRevealAt: 0.55,
  panelFadeMs: 180,
  introLinesMs: 700,
  /** Açılış ekranı splash'i (marka animasyonu) baştan bu kareden başlar (ilk kareler logo sönmesidir). */
  splashStartFrame: 4,
  /** Tekerlek/trackpad: adım eşiği ve atalet koruması. */
  wheelThreshold: 36,
  wheelGapMs: 160,
  swipeThreshold: 46,
  idleFps: 24,
} as const;

export const storageKeys = {
  introSeen: 'wg:intro-seen', // sessionStorage
  sound: 'wg:sound', // localStorage
} as const;

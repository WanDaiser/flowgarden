/**
 * "Duraklar": ziyaretçinin gezebileceği yerler (harita, her oyun yıldızı, uydu, gözlem kulesi).
 * Derleme sırasında hesaplanır ve sayfaya JSON olarak gömülür; istemci kodu içerik
 * koleksiyonunu bilmez, yalnızca bu listeyi okur.
 */
import { bodies, palette, constellationConfig } from '../config/site.config';
import { localizePath, t, type Locale } from '../i18n';
import type { Game } from './games';

export type StopKind = 'map' | 'game' | 'body';

export interface Stop {
  id: string;
  kind: StopKind;
  /** Dünya koordinatı (0–1). Harita durağında kullanılmaz. */
  x: number;
  y: number;
  path: string;
  /** Sekme başlığı */
  title: string;
  /** Kısa ad (harita göstergesi, ekran okuyucu) */
  label: string;
  accent: string;
  status?: 'released' | 'coming-soon';
  /** Oyunun bir W yıldızının üzerinde olup olmadığı */
  wStar?: string;
  big?: boolean;
  bodyKind?: string;
}

/** Bir oyun yıldızı, bu mesafeden yakın bir W yıldızının üzerine oturur. */
const SNAP = 0.03;

export function buildStops(games: Game[], locale: Locale): Stop[] {
  const siteName = t(locale, 'meta.title');
  const stops: Stop[] = [
    {
      id: 'map',
      kind: 'map',
      x: 0.5,
      y: 0.5,
      path: localizePath('/', locale),
      title: siteName,
      label: t(locale, 'nav.starMap'),
      accent: palette.glowGold,
    },
  ];
  for (const g of games) {
    const w = constellationConfig.stars.find(
      (s) => Math.hypot(s.x - g.starPosition.x, s.y - g.starPosition.y) < SNAP,
    );
    stops.push({
      id: g.slug,
      kind: 'game',
      x: w?.x ?? g.starPosition.x,
      y: w?.y ?? g.starPosition.y,
      path: localizePath(`/games/${g.slug}`, locale),
      title: `${g.name} · ${siteName}`,
      label: g.name,
      accent: g.accentColor,
      status: g.status,
      wStar: w?.id,
      big: w?.big ?? false,
    });
  }
  for (const [id, b] of Object.entries(bodies)) {
    const label = t(locale, id === 'about' ? 'about.title' : 'contact.title');
    stops.push({
      id,
      kind: 'body',
      x: b.x,
      y: b.y,
      path: localizePath(`/${id}`, locale),
      title: `${label} · ${siteName}`,
      label,
      accent: id === 'about' ? palette.lineLit : palette.glowGold,
      bodyKind: b.kind,
    });
  }
  return stops;
}

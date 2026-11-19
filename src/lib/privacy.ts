import { getCollection, type CollectionEntry } from 'astro:content';
import type { Locale } from '../i18n';

export type PrivacyEntry = CollectionEntry<'privacy'>;

/** Gizlilik politikası olan oyunların slug listesi. */
export async function privacyGames(): Promise<string[]> {
  const all = await getCollection('privacy');
  return [...new Set(all.map((e) => e.data.game))].sort();
}

/**
 * Bir oyunun politikasını istenen dilde getirir; o dilde yoksa diğer dile düşer.
 * `fallback` true ise gösterilen metin istenen dilde değildir.
 */
export async function privacyFor(game: string, locale: Locale) {
  const all = (await getCollection('privacy')).filter((e) => e.data.game === game);
  const exact = all.find((e) => e.data.locale === locale);
  const entry = exact ?? all.find((e) => e.data.locale === 'en') ?? all[0];
  return entry ? { entry, fallback: !exact } : null;
}

/** Her dil için sayfa yolları. */
export async function privacyPaths(locale: Locale) {
  const games = await privacyGames();
  const out = [];
  for (const game of games) {
    const r = await privacyFor(game, locale);
    if (r) out.push({ params: { game }, props: r });
  }
  return out;
}

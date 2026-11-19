import { getCollection, type CollectionEntry } from 'astro:content';
import { pick, type Locale } from '../i18n';

export type Game = CollectionEntry<'games'>['data'];

/** Tüm oyunlar, `order` alanına göre sıralı. */
export async function getGames(): Promise<Game[]> {
  const entries = await getCollection('games');
  const games = entries.map((e) => e.data).sort((a, b) => a.order - b.order);
  const slugs = new Set<string>();
  for (const g of games) {
    if (slugs.has(g.slug)) throw new Error(`Aynı slug iki kez kullanılmış: ${g.slug}`);
    slugs.add(g.slug);
  }
  return games;
}

/** Arayüzde kullanılacak, dile göre çözülmüş oyun. */
export function localizeGame(game: Game, locale: Locale) {
  return { ...game, tagline: pick(game.tagline, locale), description: pick(game.description, locale) };
}

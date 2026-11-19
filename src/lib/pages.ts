/** Sayfa dosyaları için ortak yardımcılar (her dil için aynı sayfayı üretmek). */
import { getGames, localizeGame } from './games';
import { t, type Locale } from '../i18n';

export async function gamePaths() {
  const games = await getGames();
  return games.map((g) => ({ params: { slug: g.slug }, props: { game: g } }));
}

export function gameMeta(game: Awaited<ReturnType<typeof getGames>>[number], locale: Locale) {
  const g = localizeGame(game, locale);
  return {
    title: g.name,
    description: `${g.tagline} ${g.description}`.slice(0, 300),
    ogImage: `/og/${g.slug}.png`,
  };
}

export function bodyMeta(id: 'about' | 'contact', locale: Locale) {
  return {
    title: t(locale, id === 'about' ? 'about.title' : 'contact.title'),
    description: t(locale, id === 'about' ? 'about.lead' : 'contact.lead'),
  };
}

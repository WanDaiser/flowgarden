import en from './en.json';
import tr from './tr.json';

export const locales = ['en', 'tr'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'en';

const dictionaries: Record<Locale, Record<string, string>> = { en, tr };
export type TKey = keyof typeof en;

/** Metin getir; Türkçe'de eksik anahtar varsa İngilizce'ye düşer. */
export function t(locale: Locale, key: TKey): string {
  return dictionaries[locale][key] ?? dictionaries.en[key] ?? key;
}

/** Oyun verisindeki { en, tr } ya da düz string alanını çözer. */
export function pick(value: string | { en: string; tr?: string }, locale: Locale): string {
  if (typeof value === 'string') return value;
  return value[locale] ?? value.en;
}

export function localeFromUrl(url: URL): Locale {
  const seg = url.pathname.split('/')[1];
  return (locales as readonly string[]).includes(seg) ? (seg as Locale) : defaultLocale;
}

/** Bir yolu verilen dile çevirir: localizePath('/games/x', 'tr') → '/tr/games/x' */
export function localizePath(path: string, locale: Locale): string {
  const clean = path.replace(/^\/(en|tr)(?=\/|$)/, '') || '/';
  if (locale === defaultLocale) return clean;
  return clean === '/' ? `/${locale}/` : `/${locale}${clean}`;
}

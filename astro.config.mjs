// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// [DOLDUR] Gerçek alan adı belli olunca değiştir (Open Graph ve sitemap bunu kullanır).
const SITE_URL = 'https://wandaiser.games';

export default defineConfig({
  site: SITE_URL,
  output: 'static',
  trailingSlash: 'ignore',
  i18n: {
    locales: ['en', 'tr'],
    defaultLocale: 'en',
    routing: { prefixDefaultLocale: false },
  },
  vite: {
    // Satır içi PostCSS ayarı, üst klasörlerdeki başka bir postcss.config dosyasının
    // (ör. Masaüstü'ndeki) bu projeye sızmasını engeller.
    css: { postcss: { plugins: [] } },
  },
  integrations: [
    sitemap({
      filter: (page) => !page.includes('/dev/'),
      i18n: { defaultLocale: 'en', locales: { en: 'en', tr: 'tr' } },
    }),
  ],
});

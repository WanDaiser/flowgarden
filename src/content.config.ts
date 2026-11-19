import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

/** Metin alanları düz string ya da dil başına nesne olabilir: { en: "...", tr: "..." } */
const localized = z.union([z.string(), z.object({ en: z.string(), tr: z.string().optional() })]);

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'accentColor "#rrggbb" biçiminde olmalı');

const games = defineCollection({
  // Her oyun = src/content/games/ altında tek bir .yaml dosyası. Dosya adı "_" ile başlarsa yok sayılır.
  loader: glob({ pattern: '**/[^_]*.{yaml,yml}', base: './src/content/games' }),
  schema: z.object({
    slug: z.string().regex(/^[a-z0-9-]+$/),
    name: z.string(),
    status: z.enum(['released', 'coming-soon']),
    accentColor: hexColor,
    tagline: localized,
    description: localized,
    googlePlayUrl: z.url().optional(),
    icon: z.string(),
    sprite: z.string(),
    spriteFrames: z.number().int().positive(),
    screenshots: z.array(z.string()).default([]),
    trailer: z.url().optional(),
    starPosition: z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1) }),
    order: z.number().int(),
    placeholder: z.boolean().default(false),
  }),
});

/**
 * Oyun başına gizlilik politikası (Google Play her uygulama için bir URL ister).
 * Dosya: src/content/privacy/<oyun-slug>.<en|tr>.md → /privacy/<oyun-slug>, /tr/privacy/<oyun-slug>
 * Bir dil eksikse o dilde diğer dilin metni gösterilir.
 */
const privacy = defineCollection({
  loader: glob({ pattern: '**/[^_]*.md', base: './src/content/privacy' }),
  schema: z.object({
    /** URL'deki ad. Siteye aynı slug ile bir oyun eklenirse panelinde bu politikaya link çıkar. */
    game: z.string().regex(/^[a-z0-9-]+$/),
    locale: z.enum(['en', 'tr']),
    /** Oyunun bu dildeki adı */
    gameName: z.string(),
    /** Google Play paket adı */
    packageName: z.string().optional(),
    updated: z.coerce.date(),
  }),
});

export const collections = { games, privacy };

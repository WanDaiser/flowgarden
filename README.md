# WanDaiser Games — web sitesi

Pixel art bir gece gökyüzü haritası: her oyun bir yıldız, yıldızlar birlikte W takımyıldızını çiziyor.
Astro + TypeScript, statik çıktı. Tasarım ve kapsam: [brief.md](brief.md).

## Çalıştırma

```bash
npm install
npm run dev        # geliştirme sunucusu → http://localhost:4321
npm run build      # OG görsellerini üretir, sonra statik siteyi dist/ klasörüne yazar
npm run preview    # dist/ klasörünü yerelde sun (yayından önce son kontrol)
npm run check      # tip kontrolü
```

Açılış animasyonu oturumda bir kez oynar. Tekrar görmek için sekmeyi kapatıp yeniden aç.

---

## Yeni oyun ekleme

**1. Veri dosyası:** `src/content/games/` altına `oyunun-adi.yaml` oluştur (mevcut bir dosyayı kopyalamak en kolayı):

```yaml
slug: isik-bahcesi                 # URL: /games/isik-bahcesi — küçük harf, rakam, tire
name: "Işık Bahçesi"
status: released                   # released | coming-soon
accentColor: "#7fe3c4"             # yıldıza yaklaşınca arayüz bu renge döner
tagline:
  en: "One sentence in English."
  tr: "Türkçe tek cümle."
description:
  en: "Two or three sentences."
  tr: "İki üç cümle."
googlePlayUrl: "https://play.google.com/store/apps/details?id=com.wandaiser.isikbahcesi"
icon: /games/isik-bahcesi/icon.png
sprite: /games/isik-bahcesi/sprite.png
spriteFrames: 4
screenshots:
  - /games/isik-bahcesi/screen-1.png
  - /games/isik-bahcesi/screen-2.png
trailer: "https://www.youtube.com/watch?v=..."   # isteğe bağlı
starPosition: { x: 0.20, y: 0.30 }               # haritadaki yeri (aşağıya bak)
order: 1                                          # gezinme sırası
```

- `tagline` / `description` düz metin de olabilir; o zaman iki dilde aynı görünür.
- `coming-soon` oyunlarda `googlePlayUrl` yazma: yıldız sönük yanıp söner, "Yakında" etiketi çıkar.
- Yer tutucu oyunlardaki `placeholder: true` satırını sil, yoksa panelde "Yer tutucu" etiketi kalır.
- Yer tutucu oyunları (`oyun-1.yaml` … `oyun-5.yaml` ve `public/games/oyun-*`) silebilirsin.
- Dosya adı `_` ile başlayan YAML'lar yok sayılır (taslak için).

**2. Görseller:** `public/games/<slug>/` klasörüne koy. **Pixel art'ı 1x (gerçek piksel) boyutunda kaydet**; site tam sayı katıyla (2x, 3x, 4x…) büyütür, piksel bozulmaz.

| Dosya | Ölçü | Not |
|---|---|---|
| `icon.png` | 32×32 ya da 64×64 | Kare. Site ~64 px'e tam sayı katla büyütür. Paylaşım kartında da kullanılır. |
| `sprite.png` | ör. 24×24 kare × 4 → **96×24** | Idle animasyon: kareler **yan yana, tek satır**, hepsi aynı genişlikte. Kare sayısı = `spriteFrames`. ~96 px yüksekliğe büyütülür. |
| `screen-*.png` | Dikey telefon oranı (9:16) | İki seçenek: küçük pixel art (ör. 90×160, 160×284) → tam sayı katla büyütülür; ya da telefondan alınmış gerçek ekran görüntüsü (1080×1920) → normal küçültülür. Büyük dosyaları WebP yap. Yatay görseller de çalışır. |

Henüz görsel yoksa `npm run placeholders` her oyun için yer tutucu üretir (var olan dosyaların üzerine yazmaz).

**3. Haritadaki yeri (`starPosition`):** Harita 0–1 arası kare bir dünya. W'nin 5 yıldızı `src/config/constellation.json` içinde:

| Yıldız | x | y |
|---|---|---|
| w1 (sol üst) | 0.20 | 0.30 |
| w2 (sol alt) | 0.35 | 0.72 |
| w3 (orta tepe) | 0.50 | 0.42 |
| w4 (sağ alt) | 0.65 | 0.72 |
| w5 (sağ üst, büyük, ateşböceğinin yıldızı) | 0.80 | 0.24 |

Bir oyunun `starPosition` değeri bu noktalardan birine yakınsa (±0.03), oyun o W yıldızına oturur. 6. ve sonraki oyunlar için W'nin dışında boş bir yer seç, ör. `{ x: 0.42, y: 0.12 }`. Oyunu olmayan W yıldızları süs yıldızı olarak çizilir.

**4.** `npm run build`. Bir alan eksik ya da yanlışsa build durur ve hangi dosyada hangi alanın sorunlu olduğunu söyler.

---

## Oyun gizlilik politikası ekleme

Google Play her uygulama için kalıcı bir gizlilik politikası URL'si ister. Her oyun için iki Markdown dosyası:

```
src/content/privacy/glow-garden.en.md   →  /privacy/glow-garden
src/content/privacy/glow-garden.tr.md   →  /tr/privacy/glow-garden
```

Dosyanın başı:

```yaml
---
game: glow-garden          # URL'deki ad — Play Console'a girdikten sonra değiştirme
locale: tr                 # en | tr
gameName: Işık Bahçesi     # bu dildeki oyun adı
packageName: com.wandaiser.glowgarden
updated: 2026-11-19
---
```

- Bir dil eksikse o dilin sayfası diğer dilin metnini bir notla gösterir.
- Politika `/privacy` sayfasında otomatik listelenir.
- Siteye **aynı slug ile** bir oyun eklenirse (`slug: glow-garden`), oyun panelinde politika linki kendiliğinden çıkar.
- Play Console'a girilecek adres: `https://<alan-adı>/privacy/glow-garden`

---

## Yayından önce doldurulacaklar

| Ne | Nerede |
|---|---|
| Alan adı | `astro.config.mjs` → `SITE_URL`, `public/robots.txt` |
| İletişim e-postası, sosyal medya | `src/config/site.config.ts` → `site.contactEmail`, `site.socials` |
| Oyun gizlilik politikalarındaki e-posta | `src/content/privacy/*.md` → `[iletişim e-postası]` / `[contact email]` |
| Sitenin genel gizlilik metni | `src/legal/privacy-en.md`, `src/legal/privacy-tr.md` |
| Stüdyo tanıtım cümlesi (öneri yazıldı) | `src/i18n/en.json` / `tr.json` → `studio.tagline` |
| Hakkımızda metni | `src/i18n/*.json` → `about.*` |

Tüm arayüz metinleri `src/i18n/en.json` ve `src/i18n/tr.json` içinde.

## Yayınlama

`npm run build` → `dist/` klasörü statik bir sitedir; herhangi bir statik hostinge yüklenir:

- **Cloudflare Pages / Netlify / Vercel:** depoyu bağla, build komutu `npm run build`, çıktı klasörü `dist`. Node 22+.
- `404.html` otomatik üretilir; bu platformlar onu kendiliğinden kullanır.

---

## Yapı

```
src/
  config/site.config.ts      tüm ayarlar: palet, kamera, gökyüzü katmanları, hızlar, zamanlamalar
  config/constellation.json  W yıldızlarının konumları ve çizgileri
  content/games/*.yaml       oyunlar (her dosya bir oyun)
  content.config.ts          oyun verisinin şeması
  i18n/                      en.json, tr.json, yardımcılar
  legal/                     gizlilik politikası (Markdown)
  scene/                     gökyüzü motoru — arayüzden bağımsız
    pixels.ts                  düşük çözünürlüklü piksel tamponu, palet
    starfield.ts               3 parallax yıldız katmanı + nebula + toz
    sprites.ts                 yıldız, hale, ateşböceği, uydu, gözlem kulesi, kayan yıldız
    camera.ts                  pan + zoom uçuşları
    sky.ts                     sahne: boyutlandırma, çizim döngüsü, komutlar
    input.ts                   tekerlek, klavye, kaydırma, Konami
    intro.ts                   açılış (marka splash animasyonu)
    sound.ts                   8-bit sesler (varsayılan kapalı)
    app.ts                     sahneyi HTML arayüze bağlar: yönlendirme, paneller, gösterge
  components/                SkyApp (ana deneyim), GamePanel, BodyPanel, PlayBadge, PressKit…
  layouts/                   BaseLayout (meta/OG), DocLayout (metin sayfaları)
  pages/                     /, /games/[slug], /about, /contact, /press, /privacy, 404 (+ /tr/…)
  styles/                    tokens.css (renk/tipografi), global.css, sky.css
public/
  brand/                     marka dosyaları (wan-daiser-splash'ten): logo, ikon, nebula, splash
  badges/                    resmi Google Play rozetleri (değiştirilmeden)
  games/<slug>/              oyun görselleri
  og/                        paylaşım kartları (build sırasında üretilir)
scripts/
  gen-og.mjs                 Open Graph görselleri (prebuild)
  gen-placeholders.mjs       yer tutucu pixel art
```

### Teknik kararlar

- **PixiJS / GSAP yok.** Gökyüzü ~240×480 mantıksal piksellik bir tampona Canvas 2D ile çiziliyor ve tam sayı katıyla büyütülüyor. Bu boyutta WebGL'e gerek yok; iki paket ve ~200 KB eksik, mobilde daha hafif. Kamera uçuşları ~60 satırlık bir easing.
- **Pil:** sahne boştayken 24 fps'ye düşer, sekme görünmezken durur. Azaltılmış harekette yalnızca değişince çizer.
- **Her içerik gerçek HTML.** JS kapalıysa ya da canvas yoksa aynı içerik sade bir sayfa olarak okunur. Yıldızlar odaklanabilir bağlantılardır (`<a href="/games/...">`).
- **Fontlar** self-host (Fontsource), yalnızca latin + latin-ext (Türkçe) alt kümeleri.

### Gezinme

| | Masaüstü | Mobil |
|---|---|---|
| Sonraki / önceki | tekerlek, ↓ ↑ → ←, PageDown/Up, boşluk | yukarı / aşağı kaydır |
| Bir yıldıza git | tıkla, Tab + Enter | dokun |
| Haritaya dön | Esc, Home, logo | logo, geri hareketi |
| Sürprizler | boş göğe tıkla → kayan yıldız · ↑↑↓↓←→←→BA → yıldız yağmuru | boş göğe dokun |

### Ölçümler (Lighthouse, mobil, yerel önizleme)

Performans 88–100 · Erişilebilirlik 100 · En iyi uygulamalar 100 · SEO 100.

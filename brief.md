# Wandaiser Games — Web Sitesi Brief'i

> Bu dosya projenin tasarım ve teknik brief'idir. Her işe başlamadan önce bunu oku ve buna sadık kal.
> `[DOLDUR]` ile işaretli yerler henüz kesinleşmedi; bunları varsayımla doldurma, yer tutucu bırak ve bana sor.

---

## 1. Proje özeti

Wandaiser Games, mobil (Google Play) için pixel art oyunlar yapan yeni bir bağımsız oyun stüdyosu. Şu an 5–6 oyun geliştiriliyor.

Sitenin amacı:
1. Stüdyoyu tanıtmak ve güçlü, akılda kalıcı bir ilk izlenim bırakmak.
2. Ziyaretçiyi oyunların Google Play sayfalarına yönlendirmek.

Sitede ekip / kişi bölümü **olmayacak**.

Hedef kitle: mobil oyuncular (ziyaretçilerin çoğu telefondan gelecek), ayrıca basın ve yayıncılar.

---

## 2. Ana konsept: "Yıldızdan yıldıza"

Stüdyonun logosu **W şeklinde bir takımyıldız**. Sitenin tamamı bu fikrin üzerine kurulu:

- Site, pixel art bir **gece gökyüzü / yıldız haritasıdır**. Ayrı sayfalardan oluşan bir web sitesi gibi değil, içinde gezilen **tek bir dünya** gibi hissettirmeli.
- **Her oyun bir yıldızdır.** Oyun yıldızları birlikte W takımyıldızını oluşturur. Yeni oyun çıktıkça haritaya yeni yıldız eklenir.
- Ziyaretçi **yıldızdan yıldıza yolculuk eder**: kaydırınca, oklarla, parmakla kaydırınca ya da bir yıldıza tıklayınca kamera o yıldıza yumuşakça uçar ve yaklaşır.
- Bir yıldıza yaklaşınca o oyunun kendi dünyası açılır: oyunun rengi, karakter sprite'ı, ekran görüntüleri, kısa açıklama, Google Play butonu.
- Henüz çıkmamış oyunlar **sönük ya da yanıp sönen** yıldızlardır ve "Yakında" etiketi taşır.
- "Hakkımızda" ve "İletişim" haritanın kenarlarında küçük ayrı gök cisimleridir (ör. bir uydu, bir gözlem kulesi).

W'nin yıldız sayısı ile oyun sayısı farklı olabilir. Bu yüzden yıldızların konumları **koddan değil, bir yapılandırma dosyasından** gelmeli. `[DOLDUR: logodaki yıldız sayısı ve konumları]`. O gelene kadar 5 yıldızlı bir W kullan.

### Kalite referansı
Kalite ve atmosfer hedefi **igloo.inc**: tek bir dünya hissi, kaydırmanın kamera hareketi gibi çalışması, karanlık ve az renkli palet, sade ve teknik tipografi, her etkileşimin küçük bir tepkisinin olması, oyun açılışı gibi bir yükleme ekranı.
Biz bunu 3D ile değil, **2D pixel art katmanlarla** yapıyoruz. Bu kimliğimize uyar ve telefonda hafif çalışır.

Ek ilham: Robby Leonardi'nin interaktif özgeçmişi (kaydırmayla ilerleyen dünya), Bruno Simon (siteyi "oynama" hissi; ama gezinme asla zorlaşmamalı).

---

## 3. Görsel dil

### Genel ton
**Profesyonel ve kaliteli; pixel art dokunuşları samimiyet katar.** Site oyuncak ya da "retro şablon" gibi görünmemeli. Pixel art bir vurgudur; her yere yayılmaz.

Pixel art'ın kullanılacağı yerler: gökyüzü ve yıldızlar, oyun sprite'ları, butonların çerçeveleri, köşe süsleri, imleç, yükleme ekranı, 404 sayfası, küçük ikonlar.
Pixel art'ın kullanılmayacağı yerler: gövde metni (okunabilir, temiz bir font kullan), uzun paragraflar.

### Renk paleti (başlangıç, gerekirse ince ayar yap)
| Rol | Renk |
|---|---|
| Arka plan (gece) | `#0b0d1a` |
| Derin katman | `#1a1d36` |
| Sönük yıldız / çizgi | `#3a3f6b` |
| İkincil metin | `#8a90d6` |
| Ana metin | `#e8e6ff` |
| Vurgu (W yıldızları, CTA) | `#ffd36b` |
| İkinci vurgu (kıvılcım) | `#ef7d57` |

Her oyunun kendi vurgu rengi olur (veri dosyasında tanımlanır). Oyunun yıldızına yaklaşınca arayüz o renge döner.

Arka planda gradient, yumuşak glow ya da bulanıklık kullanma. Işıltı hissini pixel düzeyinde yap: parlayan pikseller, yanıp sönen yıldızlar, pixel halkalar.

### Tipografi
- Başlıklar ve küçük etiketler: bir pixel font, **ölçülü** kullan (`Pixelify Sans` veya `Silkscreen` gibi). "Press Start 2P" kullanma, çok klişe ve okunması zor.
- Arayüz metinleri (HUD, etiketler, butonlar): monospace (`JetBrains Mono` veya `IBM Plex Mono`), küçük boyut, harf aralığı geniş. Igloo'daki gibi "arayüz" hissi vermeli.
- Gövde metni: temiz ve okunabilir bir sans-serif.
- Fontları kendi sunucumuzda barındır (self-host), `font-display: swap` kullan.

### Pixel art kuralları
- Tüm pixel varlıklar tam sayı katlarıyla büyütülmeli (2x, 3x, 4x). Bulanık ya da bozuk piksel olmamalı (`image-rendering: pixelated`).
- Canvas'ı düşük çözünürlükte çiz, sonra ölçekle; piksel ızgarası her ekranda tutarlı kalmalı.
- Hareketler de ızgaraya otursun: sprite'lar yarım pikselde durmamalı.

---

## 4. Etkileşim ve animasyon

### Açılış (ilk 3 saniye)
1. Kısa bir yükleme ekranı: pixel yıldızlardan oluşan bir ilerleme çubuğu ya da W'nin pikselleri tek tek yanar.
2. Gökyüzü açılır, yıldızlar yanıp söner.
3. W takımyıldızının çizgileri yıldızdan yıldıza çizilir.
4. "WANDAISER GAMES" yazısı ve tek cümlelik tanıtım belirir. `[DOLDUR: stüdyonun tek cümlelik tanıtımı]`
5. Ziyaretçiye nasıl gezeceğini gösteren küçük bir ipucu: "Kaydır ya da bir yıldıza dokun".

Açılış en fazla birkaç saniye sürmeli, tıklanınca atlanabilmeli ve aynı oturumda ikinci kez gösterilmemeli.

### Gezinme
- **Masaüstü:** fare tekerleği / trackpad, ok tuşları, yıldıza tıklama, `Esc` ile haritaya dönüş.
- **Mobil:** dikey kaydırma ile yıldızdan yıldıza geçiş (snap), yıldıza dokunma, geri hareketi.
- Kamera geçişleri yumuşak ve sinematik olmalı (easing ile pan + zoom). Kısa tut, ziyaretçiyi bekletme.
- Ekranın bir köşesinde her zaman küçük bir "harita" göstergesi olsun: nerede olduğunu ve kaç yıldız kaldığını gösterir. Kimse kaybolmamalı.
- Gezinme hiçbir zaman "oyun oynamak" kadar zorlaşmamalı. Oyunlara ve Google Play butonuna ulaşmak her zaman 1–2 hareket uzaklıkta olmalı.

### Derinlik
- Gökyüzü en az 3 parallax katmanından oluşsun (uzak yıldızlar, yakın yıldızlar, nadiren geçen bulut ya da toz).
- Fare hareketi (masaüstü) ve cihaz eğimi (mobilde, isteğe bağlı) katmanları hafifçe kaydırsın.

### Mikro etkileşimler
- Yıldızın üzerine gelince: büyür, pixel bir hale çıkar, oyunun adı belirir.
- Boş gökyüzüne tıklayınca: kayan yıldız geçer.
- Butonlar: hover'da pixel çerçeve "yanar", basınca 1 piksel aşağı iner.
- Oyun panelinde: karakter sprite'ı idle animasyonu oynar.
- Özel imleç: küçük bir pixel yıldız (sadece masaüstünde; dokunmatik cihazlarda kapalı).

### Sürprizler (samimiyet katmanı)
- 404 sayfası: haritadan kaybolmuş tek bir yıldız; tıklanınca eve döner.
- Konami kodu ile gizli bir mini etkileşim (ör. gökyüzünde yıldız yağmuru). Basit tut.

### Ses (isteğe bağlı, sonraki aşama)
Hover ve geçişlerde kısa, yumuşak 8-bit sesler. **Varsayılan olarak kapalı**; köşede bir ses düğmesi olsun. Tercih hatırlansın.

---

## 5. İçerik ve sayfa yapısı

Görsel deneyim tek bir dünya gibi hissettirse de **her içerik gerçek HTML olarak da var olmalı** (SEO, paylaşım linkleri, erişilebilirlik için):

- `/` — Gökyüzü haritası (ana deneyim)
- `/games/[slug]` — Her oyunun kendi adresi. Doğrudan bu linkle gelen ziyaretçi, kamera o yıldıza odaklanmış halde açılır. Sosyal medyada paylaşılınca doğru başlık, açıklama ve görsel çıkmalı (Open Graph).
- `/about` — Stüdyo hakkında kısa metin
- `/contact` — E-posta ve sosyal medya linkleri `[DOLDUR]`
- `/press` — Basın kiti: logo dosyaları, oyun görselleri, kısa stüdyo bilgisi (sonraki aşama)
- `/privacy` — Gizlilik politikası (Google Play'deki oyunlar için genellikle gerekli) `[DOLDUR: metin]`
- `404`

### Oyun verisi
Oyunlar kodun içine yazılmamalı. Her oyun bir veri dosyasında tanımlansın, yeni oyun eklemek tek bir dosya eklemek kadar kolay olsun:

```yaml
slug: oyun-adi
name: Oyun Adı
status: released | coming-soon
accentColor: "#7fe3c4"
tagline: Tek cümlelik açıklama
description: 2–3 cümlelik açıklama
googlePlayUrl: https://play.google.com/store/apps/details?id=...
icon: /games/oyun-adi/icon.png
sprite: /games/oyun-adi/sprite.png   # idle animasyonu için sprite sheet
spriteFrames: 4
screenshots: [...]
trailer: (isteğe bağlı) YouTube linki
starPosition: { x: 0.30, y: 0.35 }   # haritadaki konum, 0–1 arası
order: 1
```

Gerçek oyun bilgileri gelene kadar 5 tane yer tutucu oyun oluştur ("Oyun 1"… "Oyun 5"), bir tanesini `coming-soon` yap.

### Dil
`[DOLDUR: Türkçe / İngilizce / ikisi birden]`. Şimdilik **İngilizce ana dil + Türkçe** olacak şekilde, metinler tek bir çeviri dosyasından gelecek biçimde kur. Dil seçici sağ üst köşede küçük bir pixel düğme olsun.

### Google Play butonu
Google'ın resmi "Get it on Google Play" rozetini, Google'ın kullanım kurallarına uygun şekilde kullan (rozetin kendisini pixel art'a çevirme). Pixel art çerçeve rozetin etrafında olabilir.

---

## 6. Teknik gereksinimler

### Önerilen yapı
- **Astro** + **TypeScript**: statik site, hızlı açılış, her oyun için gerçek HTML sayfası.
- **PixiJS** (v8): gökyüzü sahnesi, sprite'lar ve kamera için. Canvas 2D yetersiz kalırsa ya da performans gerekirse bunu kullan; daha basit bir çözüm yeterliyse gerekçesini söyle.
- **GSAP**: kamera geçişleri ve arayüz animasyonları için (gerekirse).
- Yayın: `[DOLDUR: Vercel / Netlify / Cloudflare Pages]`, statik çıktı.

Gereksiz bağımlılık ekleme. Her yeni paket için neden gerektiğini kısaca açıkla.

### Performans (zorunlu)
Ziyaretçilerin çoğu telefondan gelecek. Bu bir tercih değil, gereklilik:
- Orta seviye bir Android telefonda akıcı çalışmalı (hedef 60 fps, en kötü 30 fps).
- İlk yükleme hızlı olmalı: gökyüzü sahnesi kod olarak çizilsin, büyük görsel dosyalar sadece ilgili yıldıza yaklaşınca yüklensin (lazy load).
- Görseller modern formatlarda (WebP/AVIF; pixel art için PNG kayıpsız kalabilir) ve doğru boyutta.
- Sekme görünür değilken animasyon dursun.
- Lighthouse mobil skorları: Performance ≥ 85, Accessibility ≥ 95, SEO ≥ 95.

### Erişilebilirlik ve yedek deneyim
- `prefers-reduced-motion` açıksa: kamera uçuşları yerine yumuşak geçişler, parallax ve yanıp sönmeler kapalı. Site yine güzel görünmeli.
- Canvas desteklenmezse ya da JavaScript kapalıysa: aynı içerik sade, düzgün bir HTML liste olarak görünsün.
- Klavyeyle tam gezilebilir olmalı; her yıldız odaklanabilir bir eleman olmalı, odak halkası görünmeli.
- Ekran okuyucular için her yıldızın erişilebilir bir adı olmalı.
- Metin kontrastı WCAG AA'yı geçmeli.

### Kod kalitesi
- Sahne mantığı (kamera, yıldızlar, girdi) arayüzden ayrı modüllerde olsun.
- Yıldız konumları, renkler, hızlar gibi ayarlar tek bir yapılandırma dosyasında toplansın.
- Kısa bir `README.md`: nasıl çalıştırılır, nasıl oyun eklenir, nasıl yayınlanır.

---

## 7. Varlıklar (asset'ler)

`[DOLDUR: hangileri hazır?]`
- Logo (W takımyıldızı) — tercihen SVG ve pixel PNG
- Oyun ikonları
- Oyun ekran görüntüleri ve trailer'lar
- Karakter sprite sheet'leri

Hazır olmayanlar için yer tutucu üret: basit pixel art şekiller, açıkça "yer tutucu" olduğu belli olsun. Varlıklar `public/` altında, her oyun kendi klasöründe dursun.

---

## 8. Çalışma şekli — aşamalar

Her şeyi tek seferde yapma. Aşağıdaki sırayla ilerle ve **her aşamanın sonunda dur**, ne yaptığını kısaca özetle, nasıl test edeceğimi söyle ve onayımı bekle.

1. **Kurulum:** Proje iskeleti, klasör yapısı, yapılandırma dosyası, yer tutucu oyun verisi, fontlar, renkler.
2. **Gökyüzü:** Parallax yıldız katmanları, yanıp sönme, W takımyıldızının çizilme animasyonu, açılış ekranı. Bu aşama sitenin kalitesini belirler; burada ince işçiliğe zaman ayır.
3. **Gezinme:** Yıldızdan yıldıza kamera hareketi; masaüstü ve mobil girdileri; harita göstergesi; `/games/[slug]` adresleri.
4. **Oyun panelleri:** Oyun bilgisi, sprite animasyonu, ekran görüntüleri, Google Play butonu, oyun rengine geçiş.
5. **Diğer sayfalar:** Hakkımızda, iletişim, gizlilik, 404.
6. **Cila:** Mikro etkileşimler, imleç, sürprizler, dil desteği, Open Graph görselleri.
7. **Kontrol:** Performans ölçümü, erişilebilirlik kontrolü, reduced-motion ve JavaScript kapalı halleri, gerçek bir telefon ekran boyutunda test. Bulduğun sorunları listele ve düzelt.

Her aşamada:
- Emin olmadığın bir tasarım kararını kendin uydurma; 2–3 seçenek sun.
- Görsel bir şey yaptığında, mümkünse tarayıcıda açıp kendin kontrol et (masaüstü ve mobil boyutta).

---

## 9. Kaçınılacaklar

- Jenerik "oyun stüdyosu şablonu" görünümü: neon glow, mor-mavi gradientler, büyük stok başlıklar.
- Her yeri pixel art'a boğmak. Pixel art vurgudur, duvar kâğıdı değil.
- Ziyaretçiyi bekleten uzun animasyonlar ya da atlanamayan girişler.
- Otomatik çalan ses.
- Sadece canvas içinde var olan, HTML karşılığı olmayan içerik.
- Telefonda ısınmaya ve pil tüketimine yol açan sürekli ağır render.
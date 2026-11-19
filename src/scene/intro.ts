/**
 * Açılış ekranı: markanın kendi splash animasyonu (ateşböceği W'yi çizer, "WanDaiser" harf
 * harf yanar) — wan-daiser-splash/art/splash_sheet.png. Tam sayı ölçekle oynatılır,
 * tıklama / dokunma / tuş ile atlanır.
 */
import splash from './data/splash.json';
import { timing } from '../config/site.config';

export function playSplash(canvas: HTMLCanvasElement, sheetUrl: string, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return resolve();
    const img = new Image();
    img.src = sheetUrl;
    let raf = 0;
    const done = () => {
      cancelAnimationFrame(raf);
      resolve();
    };
    signal.addEventListener('abort', done, { once: true });

    const fit = () => {
      const dpr = window.devicePixelRatio || 1;
      const s = Math.max(1, Math.floor(Math.min((innerWidth * dpr * 0.7) / splash.w, (innerHeight * dpr * 0.45) / splash.h)));
      canvas.width = splash.w;
      canvas.height = splash.h;
      canvas.style.width = `${(splash.w * s) / dpr}px`;
      canvas.style.height = `${(splash.h * s) / dpr}px`;
    };
    fit();

    const frames = splash.full.slice(timing.splashStartFrame);
    img
      .decode()
      .then(() => {
        if (signal.aborted) return;
        let i = 0;
        let next = performance.now();
        const tick = (now: number) => {
          if (signal.aborted) return;
          if (now >= next) {
            const f = frames[i]!;
            ctx.clearRect(0, 0, splash.w, splash.h);
            ctx.drawImage(img, f[0]!, f[1]!, splash.w, splash.h, 0, 0, splash.w, splash.h);
            next = now + f[2]!;
            i++;
            if (i >= frames.length) {
              setTimeout(done, f[2]!);
              return;
            }
          }
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      })
      .catch(done);
  });
}

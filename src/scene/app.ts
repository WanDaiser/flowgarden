/**
 * Uygulama katmanı: sahneyi (sky.ts) HTML arayüze bağlar.
 * - Duraklar arası gezinme + gerçek URL'ler (history API) + geri hareketi
 * - Paneller, harita göstergesi, yıldız bağlantıları (erişilebilir, odaklanabilir)
 * - Açılış akışı, ses düğmesi, lightbox, sürprizler
 *
 * HTML'de her şey zaten var (JS kapalıyken de içerik okunur); bu dosya yalnızca deneyimi ekler.
 */
import { storageKeys, timing } from '../config/site.config';
import { bindInput } from './input';
import { playSplash } from './intro';
import { SkyScene, type SceneBody } from './sky';
import { sound } from './sound';

interface Stop {
  id: string;
  kind: 'map' | 'game' | 'body';
  x: number;
  y: number;
  path: string;
  altPath: string;
  title: string;
  label: string;
  accent: string;
  status?: 'released' | 'coming-soon';
  wStar?: string;
  big?: boolean;
  bodyKind?: string;
}

interface SkyData {
  initial: string;
  stops: Stop[];
  intro: boolean;
  assets: { splash: string; nebula: string };
  strings: { soundOn: string; soundOff: string; released: string; soon: string };
}

const $ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector<T>(sel);
const $$ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) =>
  Array.from(root.querySelectorAll<T>(sel));

const norm = (p: string) => (p.length > 1 ? p.replace(/\/+$/, '') : p) || '/';

export async function initSky() {
  const root = $('#sky-app');
  const dataEl = $('#sky-data');
  const canvas = $<HTMLCanvasElement>('#sky-canvas');
  if (!root || !dataEl || !canvas) return;
  const data = JSON.parse(dataEl.textContent || '{}') as SkyData;
  const stops = data.stops;
  const html = document.documentElement;
  html.classList.add('js');
  const reducedMq = matchMedia('(prefers-reduced-motion: reduce)');
  const reduced = reducedMq.matches;

  // ------------------------------------------------------------------ sahne
  const bodies: SceneBody[] = stops
    .filter((s) => s.kind !== 'map')
    .map((s) => ({
      id: s.id,
      kind: s.kind === 'game' ? 'game' : 'body',
      x: s.x,
      y: s.y,
      big: !!s.big,
      soon: s.status === 'coming-soon',
      accent: s.accent,
      bodyKind: s.bodyKind,
      wStar: s.wStar,
    }));

  const starLinks = $$<HTMLAnchorElement>('.star-link', root);
  const linkStops = starLinks.map((a) => stops.find((x) => x.id === a.dataset.star));
  const linkCache: string[] = [];

  // Uzun görev oluşmasın diye kurulum ayrı görevlere bölünür (mobilde TBT).
  await nextTask();
  let scene: SkyScene;
  try {
    scene = new SkyScene(canvas, { bodies, reduced, nebulaUrl: data.assets.nebula, onFrame: placeLinks });
  } catch {
    html.classList.remove('js'); // canvas yok → sade HTML
    return;
  }
  await nextTask();

  /** Yıldız bağlantılarını canvas'taki yıldızların üstüne taşı — yalnızca konum değiştiyse. */
  function placeLinks() {
    starLinks.forEach((a, i) => {
      const s = linkStops[i];
      if (!s) return;
      const p = scene.project(s.x, s.y);
      const r = Math.round(scene.bodyRadiusCss(s.id));
      const key = `${Math.round(p.x)},${Math.round(p.y)},${r}`;
      if (linkCache[i] === key) return;
      linkCache[i] = key;
      a.style.transform = `translate3d(${Math.round(p.x)}px, ${Math.round(p.y)}px, 0)`;
      a.style.setProperty('--r', `${r}px`);
    });
  }

  // ------------------------------------------------------------------ durum
  let index = Math.max(
    0,
    stops.findIndex((s) => s.id === data.initial),
  );
  let navToken = 0;
  const live = $('#sky-live');
  const langLink = $<HTMLAnchorElement>('.lang-switch');
  const counter = $('.minimap-count');
  const miniLabel = $('.minimap-label');
  const miniDots = $$<HTMLAnchorElement>('[data-mini]');

  function panelEl(id: string) {
    return $(`[data-panel="${id}"]`, root!);
  }

  function setUi(stop: Stop) {
    document.title = stop.title;
    html.style.setProperty('--accent-game', stop.accent);
    html.dataset.stop = stop.kind;
    for (const a of starLinks) {
      if (a.dataset.star === stop.id) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    }
    for (const d of miniDots) d.classList.toggle('is-current', d.dataset.mini === stop.id);
    const i = stops.indexOf(stop);
    if (counter) counter.textContent = `${String(i + 1).padStart(2, '0')} / ${String(stops.length).padStart(2, '0')}`;
    if (miniLabel) miniLabel.textContent = stop.label;
    if (langLink) langLink.href = stop.altPath;
  }

  function showPanel(id: string, focus: boolean) {
    const el = panelEl(id);
    if (!el) return;
    el.classList.add('is-active');
    el.removeAttribute('inert');
    // bir sonraki karede animasyon sınıfı
    requestAnimationFrame(() => {
      el.classList.add('is-in');
      if (focus) $<HTMLElement>('[data-panel-heading]', el)?.focus({ preventScroll: true });
    });
    const scroller = $('.panel-scroll', el);
    if (scroller) scroller.scrollTop = 0;
  }

  function hidePanel(id: string) {
    const el = panelEl(id);
    if (!el) return;
    el.classList.remove('is-in');
    el.setAttribute('inert', '');
    const token = navToken;
    window.setTimeout(
      () => {
        if (token === navToken || !el.classList.contains('is-in')) el.classList.remove('is-active');
      },
      reduced ? 0 : timing.panelFadeMs,
    );
  }

  /** Bir durağa git. push: adres çubuğunu güncelle; focus: panel başlığına odaklan (klavye). */
  async function go(id: string, opts: { push?: boolean; focus?: boolean; instant?: boolean } = {}) {
    const next = stops.findIndex((s) => s.id === id);
    if (next < 0) return;
    const from = stops[index]!;
    const to = stops[next]!;
    if (next === index && !opts.instant) return;
    const token = ++navToken;
    index = next;
    if (opts.push !== false && norm(location.pathname) !== norm(to.path)) {
      history.pushState({ stop: to.id }, '', to.path);
    }
    setUi(to);
    if (live) live.textContent = to.kind === 'game' ? `${to.label}, ${to.status === 'coming-soon' ? data.strings.soon : data.strings.released}` : to.label;
    if (from.id !== to.id) hidePanel(from.id);
    sound.whoosh();
    const flight = scene.focus(to.kind === 'map' ? null : to.id, opts.instant);
    if (reduced || opts.instant) {
      canvas!.classList.add('is-fading');
      window.setTimeout(() => canvas!.classList.remove('is-fading'), 160);
      showPanel(to.id, !!opts.focus);
    } else {
      window.setTimeout(() => {
        if (token === navToken) showPanel(to.id, !!opts.focus);
      }, timing.flightMs * timing.panelRevealAt);
    }
    await flight;
    if (token !== navToken) return;
    sound.chime();
  }

  function step(dir: 1 | -1) {
    const n = index + dir;
    if (n < 0 || n >= stops.length) return;
    void go(stops[n]!.id);
  }

  // ------------------------------------------------------------------ bağlantılar
  root.addEventListener('click', (e) => {
    const me = e as MouseEvent;
    if (me.defaultPrevented || me.button !== 0 || me.metaKey || me.ctrlKey || me.shiftKey || me.altKey) return;
    const target = e.target as Element;
    const a = target.closest<HTMLAnchorElement>('a[data-go], a.star-link, a[data-mini]');
    if (a) {
      const id = a.dataset.go || a.dataset.star || a.dataset.mini;
      if (!id) return;
      e.preventDefault();
      sound.tap();
      // klavyeyle (Enter) etkinleştirildiyse odak panele taşınır
      void go(id, { focus: me.detail === 0 });
      return;
    }
    // Boş gökyüzü → kayan yıldız
    if (target === canvas || target.classList.contains('star-links') || target === root) {
      scene.shoot(me.clientX, me.clientY);
    }
  });

  for (const a of starLinks) {
    const id = a.dataset.star!;
    const enter = () => {
      scene.setHover(id);
      sound.hover();
    };
    const leave = () => scene.setHover(null);
    a.addEventListener('pointerenter', enter);
    a.addEventListener('pointerleave', leave);
    a.addEventListener('focus', () => scene.setHover(id));
    a.addEventListener('blur', leave);
  }

  window.addEventListener('popstate', () => {
    const p = norm(location.pathname);
    const s = stops.find((x) => norm(x.path) === p);
    if (s) void go(s.id, { push: false });
  });

  bindInput(root, {
    step,
    home: () => {
      const prev = stops[index]!;
      void go('map').then(() => {
        if (prev.kind !== 'map') $<HTMLElement>(`.star-link[data-star="${prev.id}"]`)?.focus({ preventScroll: true });
      });
    },
    konami: () => {
      scene.starRain();
      sound.sparkle();
    },
    blocked: () => !!document.querySelector('dialog[open]'),
  });

  // Fare ile parallax (masaüstü)
  if (!reduced) {
    window.addEventListener(
      'pointermove',
      (e) => {
        if (e.pointerType !== 'mouse') return;
        scene.setPointer((e.clientX / innerWidth) * 2 - 1, (e.clientY / innerHeight) * 2 - 1);
      },
      { passive: true },
    );
    // Cihaz eğimi (izin istemeyen tarayıcılarda; iOS izin ister — sessizce atlanır)
    const DOE = window.DeviceOrientationEvent as unknown as { requestPermission?: unknown } | undefined;
    if (DOE && typeof DOE.requestPermission !== 'function' && matchMedia('(pointer: coarse)').matches) {
      window.addEventListener(
        'deviceorientation',
        (e) => {
          if (e.gamma == null || e.beta == null) return;
          scene.setPointer(Math.max(-1, Math.min(1, e.gamma / 25)), Math.max(-1, Math.min(1, (e.beta - 45) / 25)));
        },
        { passive: true },
      );
    }
  }

  // Ekran boyutu
  let resizeRaf = 0;
  window.addEventListener('resize', () => {
    cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(() => {
      scene.resize();
      scene.kick();
    });
  });

  // Sekme görünmezken dur
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) scene.stop();
    else scene.start();
  });

  // ------------------------------------------------------------------ ses düğmesi
  const soundBtn = $<HTMLButtonElement>('.sound-toggle');
  const syncSound = () => {
    if (!soundBtn) return;
    soundBtn.setAttribute('aria-pressed', String(sound.enabled));
    const label = sound.enabled ? data.strings.soundOn : data.strings.soundOff;
    soundBtn.setAttribute('aria-label', label);
    soundBtn.title = label;
  };
  sound.init();
  syncSound();
  soundBtn?.addEventListener('click', () => {
    sound.set(!sound.enabled);
    syncSound();
  });

  // ------------------------------------------------------------------ lightbox
  const dialog = $<HTMLDialogElement>('#lightbox');
  const dialogImg = dialog ? $<HTMLImageElement>('img', dialog) : null;
  root.addEventListener('click', (e) => {
    const a = (e.target as Element).closest<HTMLAnchorElement>('a[data-lightbox]');
    if (!a || !dialog || !dialogImg || typeof dialog.showModal !== 'function') return;
    e.preventDefault();
    dialogImg.src = a.href;
    dialogImg.alt = a.dataset.alt || '';
    dialog.showModal();
  });
  dialog?.addEventListener('click', (e) => {
    if (e.target === dialog || (e.target as Element).closest('[data-close]')) dialog.close();
  });

  // ------------------------------------------------------------------ başlat
  const initial = stops[index]!;
  setUi(initial);
  for (const s of stops) {
    const el = panelEl(s.id);
    if (!el) continue;
    if (s.id === initial.id) el.classList.add('is-active', 'is-in');
    else {
      el.classList.remove('is-active', 'is-in');
      el.setAttribute('inert', '');
    }
  }
  history.replaceState({ stop: initial.id }, '', location.href);
  scene.focus(initial.kind === 'map' ? null : initial.id, true);
  scene.start();
  html.classList.add('app-ready');

  const loader = $('#loader');
  const runIntro = data.intro && initial.kind === 'map' && !reduced && !seenIntro();
  if (runIntro && loader) {
    markIntro();
    scene.setLinesProgress(0);
    const ctrl = new AbortController();
    const skip = (e?: Event) => {
      if (e instanceof KeyboardEvent && e.key === 'Tab') return;
      ctrl.abort();
    };
    window.addEventListener('pointerdown', skip, { once: true });
    window.addEventListener('keydown', skip, { once: true });
    const splashCanvas = $<HTMLCanvasElement>('#splash-canvas', loader);
    const splash = splashCanvas ? playSplash(splashCanvas, data.assets.splash, ctrl.signal) : Promise.resolve();
    void splash.then(async () => {
      window.removeEventListener('pointerdown', skip);
      window.removeEventListener('keydown', skip);
      loader.classList.add('is-out');
      html.classList.remove('intro-pending');
      html.classList.add('intro-title');
      const lines = scene.drawLines(ctrl.signal.aborted ? 250 : timing.introLinesMs);
      window.setTimeout(() => loader.remove(), 300);
      await lines;
      html.classList.remove('intro-title');
    });
  } else {
    loader?.remove();
    html.classList.remove('intro-pending');
    markIntro();
  }
}

function nextTask() {
  return new Promise<void>((r) => setTimeout(r, 0));
}

function seenIntro() {
  try {
    return sessionStorage.getItem(storageKeys.introSeen) === '1';
  } catch {
    return false;
  }
}
function markIntro() {
  try {
    sessionStorage.setItem(storageKeys.introSeen, '1');
  } catch {
    /* yok say */
  }
}

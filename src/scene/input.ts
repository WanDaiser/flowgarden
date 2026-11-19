/**
 * Girdi: tekerlek/trackpad, klavye, kaydırma (dokunmatik), Konami kodu.
 * Yalnızca niyeti bildirir: "sonraki", "önceki", "harita". Kararı uygulama verir.
 */
import { timing } from '../config/site.config';

export interface InputHandlers {
  step(dir: 1 | -1): void;
  home(): void;
  konami(): void;
  /** true dönerse girdi yok sayılır (ör. lightbox açık, uçuş sürüyor) */
  blocked(): boolean;
}

/** Hedef, kendi içinde o yöne kayabilen bir panelin içinde mi? */
function scrollsInside(target: EventTarget | null, dy: number): boolean {
  let el = target instanceof Element ? target : null;
  while (el && el !== document.body) {
    if (el instanceof HTMLElement && el.scrollHeight > el.clientHeight + 1) {
      const st = getComputedStyle(el).overflowY;
      if (st === 'auto' || st === 'scroll') {
        if (dy > 0 && el.scrollTop + el.clientHeight < el.scrollHeight - 1) return true;
        if (dy < 0 && el.scrollTop > 0) return true;
        if (dy === 0) return true;
      }
    }
    el = el.parentElement;
  }
  return false;
}

const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];

export function bindInput(root: HTMLElement, h: InputHandlers): () => void {
  let acc = 0;
  let lastWheel = 0;
  let needGap = false;
  let konamiPos = 0;

  const onWheel = (e: WheelEvent) => {
    if (e.ctrlKey) return; // yakınlaştırma hareketi
    const dy = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
    if (scrollsInside(e.target, dy)) return;
    e.preventDefault();
    const now = performance.now();
    const gap = now - lastWheel;
    lastWheel = now;
    // Trackpad ataleti: bir adımdan sonra akış duraksayana kadar yok say
    if (needGap) {
      if (gap < timing.wheelGapMs) return;
      needGap = false;
    }
    if (h.blocked()) return;
    if (gap > 300) acc = 0;
    acc += e.deltaMode === 1 ? dy * 16 : dy;
    if (Math.abs(acc) >= timing.wheelThreshold) {
      h.step(acc > 0 ? 1 : -1);
      acc = 0;
      needGap = true;
    }
  };

  const onKey = (e: KeyboardEvent) => {
    // Konami
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    konamiPos = k === KONAMI[konamiPos] ? konamiPos + 1 : k === KONAMI[0] ? 1 : 0;
    if (konamiPos === KONAMI.length) {
      konamiPos = 0;
      h.konami();
    }
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
    const t = e.target as HTMLElement | null;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    if (document.querySelector('dialog[open]')) return;
    const inPanel = !!t?.closest('[data-panel]');
    switch (e.key) {
      case 'Escape':
        h.home();
        break;
      case 'Home':
        if (inPanel) return;
        e.preventDefault();
        h.home();
        break;
      case 'ArrowRight':
        if (h.blocked()) return;
        e.preventDefault();
        h.step(1);
        break;
      case 'ArrowLeft':
        if (h.blocked()) return;
        e.preventDefault();
        h.step(-1);
        break;
      case 'ArrowDown':
      case 'PageDown':
        if (scrollsInside(t, 1)) return;
        if (h.blocked()) return;
        e.preventDefault();
        h.step(1);
        break;
      case 'ArrowUp':
      case 'PageUp':
        if (scrollsInside(t, -1)) return;
        if (h.blocked()) return;
        e.preventDefault();
        h.step(-1);
        break;
      case ' ':
        if (t && t.closest('a,button')) return;
        if (scrollsInside(t, e.shiftKey ? -1 : 1)) return;
        e.preventDefault();
        if (!h.blocked()) h.step(e.shiftKey ? -1 : 1);
        break;
    }
  };

  // Dokunmatik kaydırma: yalnızca gökyüzünde başlayan hareketler (panel içi kaydırma serbest)
  let touch: { x: number; y: number; t: number } | null = null;
  const onTouchStart = (e: TouchEvent) => {
    const tt = e.touches[0];
    if (!tt || e.touches.length > 1) return (touch = null);
    if ((e.target as Element).closest('[data-panel], dialog, .hud-bar, .minimap')) return (touch = null);
    touch = { x: tt.clientX, y: tt.clientY, t: performance.now() };
  };
  const onTouchMove = (e: TouchEvent) => {
    if (touch) e.preventDefault(); // tarayıcının sayfayı kaydırmasını engelle
  };
  const onTouchEnd = (e: TouchEvent) => {
    if (!touch) return;
    const tt = e.changedTouches[0];
    const start = touch;
    touch = null;
    if (!tt) return;
    const dx = tt.clientX - start.x,
      dy = tt.clientY - start.y;
    const dist = Math.max(Math.abs(dx), Math.abs(dy));
    if (dist < timing.swipeThreshold || performance.now() - start.t > 900) return;
    if (h.blocked()) return;
    if (Math.abs(dy) >= Math.abs(dx)) h.step(dy < 0 ? 1 : -1);
    else h.step(dx < 0 ? 1 : -1);
  };

  root.addEventListener('wheel', onWheel, { passive: false });
  window.addEventListener('keydown', onKey);
  root.addEventListener('touchstart', onTouchStart, { passive: true });
  root.addEventListener('touchmove', onTouchMove, { passive: false });
  root.addEventListener('touchend', onTouchEnd, { passive: true });
  return () => {
    root.removeEventListener('wheel', onWheel);
    window.removeEventListener('keydown', onKey);
    root.removeEventListener('touchstart', onTouchStart);
    root.removeEventListener('touchmove', onTouchMove);
    root.removeEventListener('touchend', onTouchEnd);
  };
}

export const $ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector<T>(s);
export const $$ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => [...r.querySelectorAll<T>(s)];
export const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

let toastTimer: number | undefined;
export function toast(msg: string) {
  const t = $('#toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('is-shown');
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => t.classList.remove('is-shown'), 3500);
}

export function addSwipe(target: Element, onSwipe: (dir: 1 | -1) => void) {
  let x0: number | null = null;
  let y0 = 0;
  target.addEventListener('touchstart', e => {
    const t = (e as TouchEvent).touches[0];
    x0 = t.clientX;
    y0 = t.clientY;
  }, { passive: true });
  target.addEventListener('touchend', e => {
    if (x0 === null) return;
    const t = (e as TouchEvent).changedTouches[0];
    const dx = t.clientX - x0;
    const dy = t.clientY - y0;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) onSwipe(dx < 0 ? 1 : -1);
    x0 = null;
  }, { passive: true });
}

// Hộp thoại: khóa cuộn trang khi mở
export function openDialog(d: HTMLDialogElement) {
  document.documentElement.classList.add('modal-open');
  if (!d.open) d.showModal();
}
export function wireDialog(d: HTMLDialogElement) {
  const done = () => document.documentElement.classList.remove('modal-open');
  // Mở khóa cuộn ngay khi hộp thoại đóng (Esc, nút đóng, bấm ra ngoài), không chờ sự kiện "close"
  new MutationObserver(() => { if (!d.open) done(); }).observe(d, { attributes: true, attributeFilter: ['open'] });
  d.addEventListener('close', done);
  d.addEventListener('click', e => {
    const t = e.target as Element;
    // Đóng khi bấm nút đóng, nền tối, hoặc vùng trống được đánh dấu data-backdrop
    if (t === d || t.closest('[data-close]') || t.hasAttribute('data-backdrop')) {
      d.close();
      done();
    }
  });
}

// Hành vi chung cho mọi trang: header, menu, hiện dần khi cuộn, nút lên đầu trang
import { $, $$, reduceMotion } from './util';

const header = $('#header');
const toTop = $('#to-top');
function onScroll() {
  const y = window.scrollY;
  header?.classList.toggle('is-scrolled', y > 8);
  toTop?.classList.toggle('is-shown', y > 900);
}
addEventListener('scroll', onScroll, { passive: true });
onScroll();
toTop?.addEventListener('click', () => scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' }));

// Menu trên điện thoại
const toggle = $('.nav-toggle');
const nav = $('#nav');
function setMenu(open: boolean) {
  nav?.classList.toggle('open', open);
  toggle?.setAttribute('aria-expanded', String(open));
  toggle?.setAttribute('aria-label', open ? 'Đóng menu' : 'Mở menu');
}
toggle?.addEventListener('click', () => setMenu(!nav?.classList.contains('open')));
nav?.addEventListener('click', e => { if ((e.target as Element).closest('a')) setMenu(false); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });

// Tô đậm mục menu đang xem
const path = location.pathname;
if (path.startsWith('/san-pham/')) $('[data-nav="san-pham"]')?.classList.add('is-active');
if (path.startsWith('/chat-lieu-go/')) $('[data-nav="chat-lieu"]')?.classList.add('is-active');
if (path === '/' && 'IntersectionObserver' in window) {
  const links = $$<HTMLAnchorElement>('.nav a[data-nav]');
  const spy = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) links.forEach(a => a.classList.toggle('is-active', a.dataset.nav === e.target.id));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  links.forEach(a => { const s = document.getElementById(a.dataset.nav!); if (s) spy.observe(s); });
}

// Hiện dần khi cuộn tới
const revealObs = 'IntersectionObserver' in window && !reduceMotion
  ? new IntersectionObserver((entries, obs) => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-visible');
        obs.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -8% 0px' })
  : null;
$$('[data-stagger]').forEach(group =>
  [...group.children].forEach((c, i) => (c as HTMLElement).style.setProperty('--i', String(i % 6))));
$$('[data-reveal]').forEach(n => (revealObs ? revealObs.observe(n) : n.classList.add('is-visible')));

// Nhấp nháy nhẹ một lần để khách để ý
if (!reduceMotion) setTimeout(() => $('#fab')?.classList.add('nudge'), 5000);

// Ảnh hiện dần khi tải xong (tránh cảnh ảnh hiện giật từng mảng)
if (!reduceMotion) {
  $$<HTMLImageElement>('main img').forEach(img => {
    if (img.complete) return;
    img.classList.add('img-loading');
    const done = () => img.classList.remove('img-loading');
    img.addEventListener('load', done, { once: true });
    img.addEventListener('error', done, { once: true });
  });
}

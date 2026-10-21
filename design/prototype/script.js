// ---------- Tiện ích ----------
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

const CATEGORIES = {
  'ban-tho': 'Bàn thờ & án gian',
  'hoanh-phi': 'Hoành phi, câu đối',
  'ban-ghe': 'Bàn ghế & sofa',
  'giuong-tu': 'Giường, tủ & bàn trang điểm',
  'my-nghe': 'Tượng & mỹ nghệ',
};
const STATUS = {
  'dat-lam': { label: 'Nhận đặt làm', note: 'Mẫu được sản xuất khi khách đặt. Thời gian làm sẽ trao đổi khi tư vấn.' },
  'co-san': { label: 'Có sẵn', note: 'Hiện có hàng hoàn thiện. Nên gọi trước để kiểm tra còn hàng.' },
  'trung-bay': { label: 'Mẫu tại cửa hàng', note: 'Mẫu đang trưng bày tại cửa hàng, có thể đến xem trực tiếp.' },
};
const PAGE_SIZE = 9;
const SLIDE_INTERVAL = 6000;

let site = {};

const digits = s => String(s || '').replace(/[^\d+]/g, '');
const isPlaceholder = s => !s || /^\s*\[/.test(s);
const slugify = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else node.setAttribute(k, v === true ? '' : v);
  }
  node.append(...children.filter(c => c != null));
  return node;
}

// Ảnh thật nếu có, nếu chưa có thì hiện khối màu gỗ giữ chỗ
function media(src, alt, ph, tag = 'div') {
  if (src) return el('img', { src, alt: alt || '', loading: 'lazy', decoding: 'async' });
  return el(tag, { class: 'ph ph-' + ph, role: alt ? 'img' : null, 'aria-label': alt || null });
}

function paragraphs(text) {
  return String(text || '').split(/\n\s*\n/).map(t => t.trim()).filter(Boolean).map(t => el('p', { text: t }));
}

let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('is-shown');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('is-shown'), 3500);
}

// ---------- Header, menu, lên đầu trang ----------
const header = $('#header');
const toTop = $('#to-top');
function onScroll() {
  const y = window.scrollY;
  header.classList.toggle('is-scrolled', y > 8);
  toTop.classList.toggle('is-shown', y > 900);
}
addEventListener('scroll', onScroll, { passive: true });
onScroll();
toTop.addEventListener('click', () => scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' }));

const toggle = $('.nav-toggle');
const nav = $('#nav');
function setMenu(open) {
  nav.classList.toggle('open', open);
  toggle.setAttribute('aria-expanded', open);
  toggle.setAttribute('aria-label', open ? 'Đóng menu' : 'Mở menu');
}
toggle.addEventListener('click', () => setMenu(!nav.classList.contains('open')));
nav.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });

// Tô đậm mục menu của phần đang xem
if ('IntersectionObserver' in window) {
  const links = $$('.nav > a, .nav-item > a');
  const spy = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) links.forEach(a => a.classList.toggle('is-active', a.hash === '#' + e.target.id));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  links.forEach(a => { const s = $(a.hash); if (s) spy.observe(s); });
}

// ---------- Hiện dần khi cuộn tới ----------
const revealObs = ('IntersectionObserver' in window && !reduceMotion)
  ? new IntersectionObserver((entries, obs) => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-visible');
        obs.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -8% 0px' })
  : null;

function observeReveal(root = document) {
  $$('[data-stagger]', root).forEach(group =>
    [...group.children].forEach((c, i) => c.style.setProperty('--i', i % 6)));
  $$('[data-reveal]:not(.is-visible)', root).forEach(n => revealObs ? revealObs.observe(n) : n.classList.add('is-visible'));
}
observeReveal();

// ---------- Thông tin chung ----------
async function loadJSON(path) {
  const res = await fetch(path, { cache: 'no-cache' });
  if (!res.ok) throw new Error(path + ' ' + res.status);
  return res.json();
}

function directionsUrl() {
  if (site.maps_url) return site.maps_url;
  if (!isPlaceholder(site.address)) return 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(site.address);
  return 'https://www.google.com/maps';
}

function applySite() {
  $$('[data-site]').forEach(node => {
    const value = site[node.dataset.site];
    if (typeof value !== 'string' || !value) return;
    if (node.hasAttribute('data-multiline')) {
      node.replaceChildren(...value.split('\n').flatMap((line, i) => i ? [el('br'), line] : [line]));
    } else {
      node.textContent = value;
    }
  });

  if (site.story_text) $('#story-text').replaceChildren(...paragraphs(site.story_text));
  if (site.story_image) $('#story-media').replaceChildren(media(site.story_image, 'Cửa hàng ' + (site.brand || '')));

  $$('[data-site-tel]').forEach(a => { a.href = 'tel:' + digits(site.phone); });
  $$('[data-site-zalo]').forEach(a => { a.href = 'https://zalo.me/' + digits(site.zalo || site.phone); });
  $$('[data-site-directions]').forEach(a => { a.href = directionsUrl(); });
  // Messenger / Facebook: để trống trong trang quản trị thì ẩn nút
  $$('[data-site-messenger]').forEach(a => { if (site.messenger) a.href = site.messenger; else a.hidden = true; });
  $$('[data-site-facebook]').forEach(a => { if (site.facebook) a.href = site.facebook; else a.hidden = true; });

  if (site.brand) document.title = site.brand + ' – Đồ gỗ, nội thất & đồ thờ';
}

// ---------- Banner sản phẩm nổi bật ----------
function heroSlide(p) {
  const i = products.indexOf(p);
  const info = [p.material, p.size].filter(Boolean).join(' · ');
  const desc = paragraphs(p.description)[0]?.textContent || STATUS[p.status].note;
  const bg = media(p.images[0], p.name, 'hero-' + ((i % 3) + 1));
  if (bg.tagName === 'IMG' && i === 0) bg.loading = 'eager';
  return el('article', { class: 'slide' },
    el('div', { class: 'slide-bg' }, bg),
    el('div', { class: 'container slide-content' },
      el('p', { class: 'eyebrow', text: 'Sản phẩm nổi bật · ' + CATEGORIES[p.category] }),
      el('h2', { class: 'slide-title', text: p.name || '' }),
      el('p', { class: 'slide-meta' },
        el('span', { class: 'badge badge-' + p.status, text: STATUS[p.status].label }),
        info ? el('span', { text: info }) : null),
      el('p', { class: 'lead', text: desc }),
      el('div', { class: 'hero-actions' },
        el('a', { class: 'btn btn-light', href: '#mau-' + p.slug, 'data-index': i, text: 'Xem chi tiết' }),
        el('a', { class: 'btn btn-ghost', href: 'tel:' + digits(site.phone), 'data-site-tel': true, text: 'Gọi hỏi giá' }))));
}

function initHero() {
  const hero = $('#hero');
  const track = $('#hero-track');
  const dots = $('#hero-dots');
  const count = $('#hero-count');
  let featured = products.filter(p => p.featured);
  if (!featured.length) featured = products.slice(0, 4);
  if (!featured.length) return; // giữ slide giới thiệu

  track.replaceChildren(...featured.map(heroSlide));
  const slides = [...track.children];
  slides.forEach((s, i) => {
    s.setAttribute('role', 'group');
    s.setAttribute('aria-roledescription', 'slide');
    s.setAttribute('aria-label', `${i + 1} / ${slides.length}: ${featured[i].name}`);
  });
  track.addEventListener('click', e => {
    const a = e.target.closest('a[data-index]');
    if (!a) return;
    e.preventDefault();
    openProduct(Number(a.dataset.index));
  });

  const auto = !reduceMotion && slides.length > 1;
  hero.style.setProperty('--slide-ms', SLIDE_INTERVAL + 'ms');
  hero.classList.toggle('is-auto', auto);
  $('.hero-controls').hidden = slides.length < 2;
  dots.replaceChildren(...slides.map((_, i) =>
    el('button', { type: 'button', class: 'dot', 'aria-label': 'Xem sản phẩm ' + (i + 1) })));

  let index = 0;
  let timer = null;
  let startedAt = 0;
  let remaining = SLIDE_INTERVAL;
  const paused = new Set();
  const pad = n => String(n).padStart(2, '0');

  function show(n, dir) {
    const next = (n + slides.length) % slides.length;
    if (next === index && slides[index].classList.contains('is-active')) return false;
    const old = slides[index];
    const neu = slides[next];
    // Đặt slide mới ở mép trái/phải rồi trượt vào, slide cũ trượt ra phía ngược lại
    neu.classList.remove('leave-left', 'leave-right');
    neu.style.transition = 'none';
    neu.style.transform = `translateX(${dir * 100}%)`;
    neu.style.visibility = 'visible';
    void neu.offsetWidth;
    neu.style.transition = neu.style.transform = neu.style.visibility = '';
    neu.classList.add('is-active');
    if (old !== neu) {
      old.classList.remove('is-active');
      old.classList.add(dir > 0 ? 'leave-left' : 'leave-right');
    }
    index = next;
    update();
    return true;
  }
  function update() {
    slides.forEach((s, i) => s.setAttribute('aria-hidden', i !== index));
    [...dots.children].forEach((d, i) => d.setAttribute('aria-current', i === index));
    count.textContent = pad(index + 1) + ' / ' + pad(slides.length);
  }
  function start() {
    clearTimeout(timer);
    timer = null;
    if (!auto || paused.size) return;
    hero.classList.remove('is-paused');
    startedAt = Date.now();
    timer = setTimeout(() => go(index + 1, 1), remaining);
  }
  function pause(why) {
    paused.add(why);
    hero.classList.add('is-paused');
    if (timer) {
      clearTimeout(timer);
      timer = null;
      remaining = Math.max(0, remaining - (Date.now() - startedAt));
    }
  }
  function resume(why) {
    paused.delete(why);
    if (!paused.size) start();
  }
  function go(n, dir) {
    if (!show(n, dir)) return;
    remaining = SLIDE_INTERVAL;
    start();
  }

  dots.addEventListener('click', e => {
    const i = [...dots.children].indexOf(e.target.closest('.dot'));
    if (i >= 0) go(i, i > index ? 1 : -1);
  });
  $('#hero-prev').addEventListener('click', () => go(index - 1, -1));
  $('#hero-next').addEventListener('click', () => go(index + 1, 1));
  hero.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') pause('hover'); });
  hero.addEventListener('pointerleave', () => resume('hover'));
  hero.addEventListener('focusin', () => pause('focus'));
  hero.addEventListener('focusout', () => resume('focus'));
  hero.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') go(index - 1, -1);
    if (e.key === 'ArrowRight') go(index + 1, 1);
  });
  document.addEventListener('visibilitychange', () => document.hidden ? pause('tab') : resume('tab'));
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => e.isIntersecting ? resume('offscreen') : pause('offscreen')).observe(hero);
  }
  addSwipe(hero, dir => go(index + dir, dir));

  slides[0].classList.add('is-active');
  update();
  start();
}

function addSwipe(target, onSwipe) {
  let x0 = null, y0 = null;
  target.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
  target.addEventListener('touchend', e => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0;
    const dy = e.changedTouches[0].clientY - y0;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) onSwipe(dx < 0 ? 1 : -1);
    x0 = null;
  }, { passive: true });
}

// ---------- Sản phẩm: lọc theo danh mục, tình trạng và tìm kiếm ----------
const grid = $('#product-grid');
const moreBtn = $('#more-btn');
const emptyBox = $('#grid-empty');
const searchInput = $('#search');
const statusSelect = $('#status-filter');
let products = [];
const state = { cat: 'all', status: 'all', q: '', limit: PAGE_SIZE };

// Bỏ dấu để gõ "ban tho" vẫn tìm ra "bàn thờ"
const fold = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase();

function normalizeProducts(items) {
  const used = new Set();
  return items.filter(p => p && p.visible !== false).map((p, i) => {
    const images = (p.images || []).map(x => typeof x === 'string' ? x : x && x.image).filter(Boolean);
    if (!images.length && p.image) images.push(p.image);
    let slug = slugify(p.name) || 'mau-' + (i + 1);
    if (used.has(slug)) slug += '-' + (i + 1);
    used.add(slug);
    const category = CATEGORIES[p.category] ? p.category : 'my-nghe';
    const status = STATUS[p.status] ? p.status : 'dat-lam';
    return {
      ...p,
      images,
      slug,
      category,
      status,
      ph: (i % 6) + 1,
      price: p.price || 'Liên hệ báo giá',
      text: fold([p.name, CATEGORIES[category], STATUS[status].label, p.material, p.size, p.description].join(' ')),
    };
  });
}

function matches(p, ignoreCat = false) {
  if (!ignoreCat && state.cat !== 'all' && p.category !== state.cat) return false;
  if (state.status !== 'all' && p.status !== state.status) return false;
  return fold(state.q).split(/\s+/).filter(Boolean).every(w => p.text.includes(w));
}

function productCard(p, i) {
  const main = media(p.images[0], p.name, p.ph);
  // Ảnh thứ hai hiện ra khi rê chuột, giúp xem thêm góc khác mà không cần mở chi tiết
  const alt = p.images[1] ? media(p.images[1], '', p.ph) : null;
  if (alt) alt.classList.add('card-img-alt');
  const card = el('article', { class: 'card', 'data-reveal': true },
    el('a', { class: 'card-link', href: '#mau-' + p.slug, 'data-index': i },
      el('div', { class: 'card-media' },
        main, alt,
        el('span', { class: 'badge badge-' + p.status, text: STATUS[p.status].label }),
        p.images.length > 1 ? el('span', { class: 'card-count', text: p.images.length + ' ảnh' }) : null,
        el('span', { class: 'card-cta', 'aria-hidden': 'true', text: 'Xem chi tiết' })),
      el('div', { class: 'card-body' },
        el('p', { class: 'card-cat', text: CATEGORIES[p.category] }),
        el('h3', { text: p.name || '' }),
        el('p', { class: 'card-price', text: p.price }))));
  card.style.viewTransitionName = 'card-' + i;
  card.style.setProperty('--i', i % 3);
  p.card = card;
  return card;
}

// Ảnh nhỏ trên nút danh mục lấy từ ảnh sản phẩm đầu tiên của danh mục đó
function decorateTabs() {
  $$('.cat-tab').forEach(tab => {
    const cat = tab.dataset.cat;
    if (!tab.querySelector('.cat-count')) tab.append(el('span', { class: 'cat-count' }));
    const first = products.find(p => p.category === cat && p.images[0]);
    if (first) {
      const img = el('img', { src: first.images[0], alt: '', loading: 'lazy', class: 'cat-thumb' });
      tab.querySelector('.cat-thumb').replaceWith(img);
    }
  });
}

function renderProducts() {
  grid.removeAttribute('aria-busy');
  grid.replaceChildren(...products.map(productCard));
  decorateTabs();
  update({ animate: false, resetLimit: false });
  observeReveal(grid);
}

function update({ animate = true, resetLimit = true } = {}) {
  if (resetLimit) state.limit = PAGE_SIZE;
  const matched = products.filter(p => matches(p));

  const apply = () => {
    products.forEach(p => {
      const pos = matched.indexOf(p);
      const show = pos > -1 && pos < state.limit;
      if (show && p.card.hidden) {
        p.card.hidden = false;
        p.card.classList.add('is-visible');
        if (animate && !document.startViewTransition && !reduceMotion) {
          p.card.classList.remove('is-entering');
          void p.card.offsetWidth;
          p.card.classList.add('is-entering');
        }
      } else if (!show) {
        p.card.hidden = true;
      }
    });

    $$('.cat-tab').forEach(tab => {
      const cat = tab.dataset.cat;
      const n = products.filter(p => matches(p, true) && (cat === 'all' || p.category === cat)).length;
      tab.setAttribute('aria-pressed', cat === state.cat);
      tab.classList.toggle('is-empty', n === 0);
      tab.querySelector('.cat-count').textContent = n;
    });

    const filtered = state.cat !== 'all' || state.status !== 'all' || state.q.trim();
    $('#result-count').textContent = products.length
      ? (filtered ? `${matched.length} / ${products.length} mẫu` : `${products.length} mẫu`)
      : '';
    $('#clear-filters').hidden = !filtered;
    $('#search-clear').hidden = !state.q;

    const rest = matched.length - state.limit;
    moreBtn.hidden = rest <= 0;
    moreBtn.textContent = `Xem thêm ${rest} mẫu`;

    emptyBox.hidden = matched.length > 0;
    $('#empty-title').textContent = products.length ? 'Chưa tìm thấy mẫu phù hợp' : 'Chưa có sản phẩm trên web';
    $('[data-clear-filters]', emptyBox).hidden = !filtered;
  };

  // Hiệu ứng các thẻ tự trượt về chỗ mới khi lọc (trình duyệt hỗ trợ View Transitions)
  if (animate && document.startViewTransition && !reduceMotion) document.startViewTransition(apply);
  else apply();
  syncUrl();
}

// Lưu bộ lọc lên địa chỉ trang để khách gửi link cho người nhà
function syncUrl() {
  const params = new URLSearchParams();
  if (state.cat !== 'all') params.set('danh-muc', state.cat);
  if (state.status !== 'all') params.set('tinh-trang', state.status);
  if (state.q.trim()) params.set('tim', state.q.trim());
  const qs = params.toString();
  history.replaceState(null, '', location.pathname + (qs ? '?' + qs : '') + location.hash);
}
function readUrl() {
  const params = new URLSearchParams(location.search);
  if (CATEGORIES[params.get('danh-muc')]) state.cat = params.get('danh-muc');
  if (STATUS[params.get('tinh-trang')]) state.status = params.get('tinh-trang');
  state.q = params.get('tim') || '';
  searchInput.value = state.q;
  statusSelect.value = state.status;
}

function setCategory(cat) {
  if (cat === state.cat) return;
  state.cat = cat;
  update();
}
function clearFilters() {
  state.cat = 'all';
  state.status = 'all';
  state.q = '';
  searchInput.value = '';
  statusSelect.value = 'all';
  update();
}

$('#cat-tabs').addEventListener('click', e => {
  const tab = e.target.closest('.cat-tab');
  if (!tab) return;
  setCategory(tab.dataset.cat);
  tab.scrollIntoView({ block: 'nearest', inline: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
});
// Link danh mục ở menu và chân trang
document.addEventListener('click', e => {
  const link = e.target.closest('a[data-filter]');
  if (link) setCategory(link.dataset.filter);
});
statusSelect.addEventListener('change', () => { state.status = statusSelect.value; update(); });

let searchTimer;
searchInput.addEventListener('input', () => {
  clearTimeout(searchTimer);
  $('#search-clear').hidden = !searchInput.value;
  searchTimer = setTimeout(() => { state.q = searchInput.value; update(); }, 220);
});
searchInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') { searchInput.blur(); $('#product-grid').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' }); }
  if (e.key === 'Escape' && searchInput.value) { e.stopPropagation(); searchInput.value = ''; state.q = ''; update(); }
});
$('#search-clear').addEventListener('click', () => { searchInput.value = ''; state.q = ''; update(); searchInput.focus(); });
$('#clear-filters').addEventListener('click', clearFilters);
$('[data-clear-filters]').addEventListener('click', clearFilters);
$('#header-search').addEventListener('click', () => {
  setMenu(false);
  $('#san-pham').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
  setTimeout(() => searchInput.focus({ preventScroll: true }), reduceMotion ? 0 : 450);
});

moreBtn.addEventListener('click', () => {
  state.limit += PAGE_SIZE;
  update({ resetLimit: false });
});

// ---------- Chi tiết sản phẩm ----------
const modal = $('#product-modal');
let current = null;
let currentImg = 0;

function openDialog(d) {
  document.documentElement.classList.add('modal-open');
  if (!d.open) d.showModal();
}
function onDialogClosed(d) {
  document.documentElement.classList.remove('modal-open');
  if (d === modal && location.hash.startsWith('#mau-')) history.replaceState(null, '', location.pathname + location.search);
}
function closeDialog(d) {
  d.close();
  onDialogClosed(d);
}
$$('dialog').forEach(d => {
  d.addEventListener('close', () => onDialogClosed(d)); // đóng bằng phím Esc
  d.addEventListener('click', e => { if (e.target === d || e.target.closest('[data-close]')) closeDialog(d); });
});

function showProductImage(i) {
  const p = current;
  const total = Math.max(p.images.length, 1);
  currentImg = (i + total) % total;
  $('#pm-stage').replaceChildren(media(p.images[currentImg], p.name, p.ph));
  $$('#pm-thumbs button').forEach((b, j) => b.setAttribute('aria-current', j === currentImg));
}

function openProduct(i) {
  const p = products[i];
  if (!p) return;
  current = p;
  const status = STATUS[p.status];
  $('#pm-status').className = 'badge badge-' + p.status;
  $('#pm-status').textContent = status.label;
  $('#pm-status-note').textContent = status.note;
  $('#pm-cat').textContent = CATEGORIES[p.category];
  $('#pm-title').textContent = p.name || '';
  $('#pm-specs').replaceChildren(...[['Chất liệu', p.material], ['Kích thước', p.size]]
    .filter(([, v]) => v).flatMap(([k, v]) => [el('dt', { text: k }), el('dd', { text: v })]));
  $('#pm-desc').replaceChildren(...paragraphs(p.description));
  $('#pm-price').textContent = p.price;

  const many = p.images.length > 1;
  $('#pm-prev').hidden = $('#pm-next').hidden = !many;
  $('#pm-thumbs').replaceChildren(...(many ? p.images.map((src, j) =>
    el('button', { type: 'button', 'aria-label': `Ảnh ${j + 1}` }, media(src, '', p.ph))) : []));
  showProductImage(0);

  const related = products.filter(r => r !== p && r.category === p.category).slice(0, 4);
  $('#pm-related-wrap').hidden = !related.length;
  $('#pm-related').replaceChildren(...related.map(r =>
    el('button', { type: 'button', class: 'pm-rel', 'data-index': products.indexOf(r) },
      media(r.images[0], '', r.ph, 'span'),
      el('span', { class: 'pm-rel-name', text: r.name }))));

  history.replaceState(null, '', location.pathname + location.search + '#mau-' + p.slug);
  openDialog(modal);
  modal.scrollTop = 0;
}

$('#pm-related').addEventListener('click', e => {
  const b = e.target.closest('.pm-rel');
  if (b) openProduct(Number(b.dataset.index));
});

grid.addEventListener('click', e => {
  const link = e.target.closest('.card-link');
  if (!link) return;
  e.preventDefault();
  openProduct(Number(link.dataset.index));
});
$('#pm-prev').addEventListener('click', () => showProductImage(currentImg - 1));
$('#pm-next').addEventListener('click', () => showProductImage(currentImg + 1));
$('#pm-thumbs').addEventListener('click', e => {
  const b = e.target.closest('button');
  if (b) showProductImage([...b.parentNode.children].indexOf(b));
});
addSwipe($('#pm-stage'), dir => current && current.images.length > 1 && showProductImage(currentImg + dir));

// Zalo không tự điền tin nhắn được, nên sao chép sẵn tên mẫu để khách dán vào
$('#pm-zalo').addEventListener('click', () => {
  if (!current || !navigator.clipboard) return;
  const text = `Tôi muốn hỏi về mẫu: ${current.name} – ${location.href}`;
  navigator.clipboard.writeText(text)
    .then(() => toast('Đã sao chép tên mẫu, hãy dán vào khung chat Zalo.'))
    .catch(() => {});
});

// ---------- Cửa hàng & xưởng + xem ảnh lớn ----------
const DEFAULT_GALLERY = ['Không gian cửa hàng', 'Xưởng sản xuất', 'Mẫu trưng bày', 'Chi tiết chạm khắc', 'Hoàn thiện sản phẩm', 'Sản phẩm trước khi giao']
  .map(caption => ({ caption, image: '' }));
let gallery = [];
let lbIndex = 0;
const lightbox = $('#lightbox');

function renderGallery() {
  gallery = (site.gallery || []).filter(g => g && (g.image || g.caption));
  if (!gallery.length) gallery = DEFAULT_GALLERY;
  $('#gallery').replaceChildren(...gallery.map((g, i) =>
    el('button', { type: 'button', class: 'gallery-item', 'data-reveal': true, 'aria-label': 'Xem ảnh lớn: ' + (g.caption || 'ảnh ' + (i + 1)) },
      media(g.image, '', (i % 7) + 1, 'span'),
      g.caption ? el('span', { class: 'gallery-cap', text: g.caption }) : null)));
  observeReveal($('#xuong'));
}

function showLightbox(i) {
  lbIndex = (i + gallery.length) % gallery.length;
  const g = gallery[lbIndex];
  $('#lb-stage').replaceChildren(media(g.image, g.caption, (lbIndex % 7) + 1));
  $('#lb-caption').textContent = g.caption || '';
}
$('#gallery').addEventListener('click', e => {
  const b = e.target.closest('.gallery-item');
  if (!b) return;
  showLightbox([...b.parentNode.children].indexOf(b));
  $('#lb-prev').hidden = $('#lb-next').hidden = gallery.length < 2;
  openDialog(lightbox);
});
$('#lb-prev').addEventListener('click', () => showLightbox(lbIndex - 1));
$('#lb-next').addEventListener('click', () => showLightbox(lbIndex + 1));
addSwipe(lightbox, dir => showLightbox(lbIndex + dir));
document.addEventListener('keydown', e => {
  if (lightbox.open && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) showLightbox(lbIndex + (e.key === 'ArrowRight' ? 1 : -1));
  if (modal.open && current && current.images.length > 1 && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) showProductImage(currentImg + (e.key === 'ArrowRight' ? 1 : -1));
});

// ---------- Google Maps (chỉ tải khi khách cuộn gần tới) ----------
function initMap() {
  const box = $('#map');
  let src = site.maps_embed || '';
  if (/<iframe/i.test(src)) src = (src.match(/src="([^"]+)"/) || [])[1] || '';
  if (!src && !isPlaceholder(site.address)) src = 'https://www.google.com/maps?q=' + encodeURIComponent(site.address) + '&output=embed';
  if (!src) return;
  const load = () => box.replaceChildren(el('iframe', {
    src, title: 'Bản đồ đường đến cửa hàng', loading: 'lazy', referrerpolicy: 'no-referrer-when-downgrade', allowfullscreen: true,
  }));
  if (!('IntersectionObserver' in window)) return load();
  const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { obs.disconnect(); load(); } }, { rootMargin: '400px' });
  obs.observe(box);
}

// ---------- Form liên hệ (gửi qua Netlify Forms khi đăng lên Netlify) ----------
const form = $('#contact-form');
const note = $('#form-note');
form.addEventListener('submit', async e => {
  e.preventDefault();
  const nameOk = form.name.value.trim().length > 0;
  const phoneOk = /^[0-9+\s.-]{9,15}$/.test(form.phone.value.trim());
  form.name.setAttribute('aria-invalid', !nameOk);
  form.phone.setAttribute('aria-invalid', !phoneOk);
  if (!nameOk || !phoneOk) {
    note.className = 'form-note err';
    note.textContent = 'Vui lòng nhập họ tên và số điện thoại hợp lệ.';
    (nameOk ? form.phone : form.name).focus();
    return;
  }
  const btn = form.querySelector('button[type="submit"]');
  btn.disabled = true;
  btn.textContent = 'Đang gửi…';
  note.textContent = '';
  try {
    const res = await fetch('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(new FormData(form)).toString(),
    });
    if (!res.ok) throw new Error(res.status);
    note.className = 'form-note ok';
    note.textContent = 'Đã gửi yêu cầu. Chúng tôi sẽ gọi lại cho bạn.';
    form.reset();
  } catch {
    note.className = 'form-note err';
    note.textContent = `Chưa gửi được yêu cầu. Vui lòng gọi ${site.phone || 'cho chúng tôi'} hoặc nhắn Zalo.`;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Gửi yêu cầu';
  }
});

// ---------- Khởi động ----------
$('#year').textContent = new Date().getFullYear();
if (!reduceMotion) setTimeout(() => $('#fab').classList.add('nudge'), 5000);

loadJSON('data/site.json')
  .then(data => { site = data || {}; applySite(); })
  .catch(err => console.warn('Không nạp được thông tin chung:', err))
  .finally(() => { renderGallery(); initMap(); });

loadJSON('data/products.json')
  .then(d => {
    products = normalizeProducts(d.items || []);
    readUrl();
    renderProducts();
    initHero();
    const m = location.hash.match(/^#mau-(.+)$/);
    if (m) {
      const i = products.findIndex(p => p.slug === decodeURIComponent(m[1]));
      if (i > -1) openProduct(i);
    }
  })
  .catch(err => {
    console.warn('Không nạp được sản phẩm:', err);
    grid.replaceChildren();
    grid.removeAttribute('aria-busy');
    $('#empty-title').textContent = 'Không tải được sản phẩm';
    $('#empty-text').textContent = 'Vui lòng gọi hoặc nhắn Zalo cho chúng tôi.';
    $('[data-clear-filters]').hidden = true;
    emptyBox.hidden = false;
  });

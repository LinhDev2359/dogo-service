// Menu di động
const toggle = document.querySelector('.nav-toggle');
const nav = document.getElementById('nav');
toggle.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  toggle.setAttribute('aria-expanded', open);
});
nav.addEventListener('click', e => {
  if (e.target.tagName === 'A') {
    nav.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
  }
});

// Nạp dữ liệu từ data/*.json (chỉnh sửa qua /admin)
async function loadJSON(path) {
  const res = await fetch(path, { cache: 'no-cache' });
  if (!res.ok) throw new Error(path + ' ' + res.status);
  return res.json();
}

function applySite(site) {
  document.querySelectorAll('[data-site]').forEach(el => {
    const value = site[el.dataset.site];
    if (value === undefined) return;
    if (el.hasAttribute('data-multiline')) {
      el.replaceChildren(...value.split('\n').flatMap((line, i) =>
        i ? [document.createElement('br'), line] : [line]));
    } else {
      el.textContent = value;
    }
  });

  const story = document.getElementById('story-text');
  if (site.story_text) {
    story.replaceChildren(...site.story_text.split(/\n\s*\n/).map(text => {
      const p = document.createElement('p');
      p.textContent = text.trim();
      return p;
    }));
  }

  const digits = s => String(s || '').replace(/[^\d+]/g, '');
  document.querySelectorAll('[data-site-tel]').forEach(a => { a.href = 'tel:' + digits(site.phone); });
  document.querySelectorAll('[data-site-zalo]').forEach(a => { a.href = 'https://zalo.me/' + digits(site.zalo); });

  const brand = (site.brand_main || '') + (site.brand_sub || '');
  document.getElementById('footer-brand').textContent = brand;
  document.title = brand + ' - Đồ gỗ thủ công';
}

const grid = document.getElementById('product-grid');
const chips = document.querySelectorAll('.chip');
let activeFilter = 'all';

function renderProducts(items) {
  const visible = items.filter(p => p.visible !== false);
  if (!visible.length) {
    grid.innerHTML = '<p class="grid-msg">Chưa có sản phẩm. Vui lòng quay lại sau.</p>';
    return;
  }
  grid.replaceChildren(...visible.map((p, i) => {
    const card = document.createElement('article');
    card.className = 'card';
    card.dataset.cat = p.category || 'khac';

    let media;
    if (p.image) {
      media = document.createElement('img');
      media.src = p.image;
      media.alt = p.name || '';
      media.loading = 'lazy';
    } else {
      media = document.createElement('div');
      media.className = 'ph ph-' + ((i % 6) + 1);
    }

    const h3 = document.createElement('h3');
    h3.textContent = p.name || '';
    const meta = document.createElement('p');
    meta.className = 'meta';
    meta.textContent = p.spec || '';
    const price = document.createElement('p');
    price.className = 'price';
    price.textContent = p.price || 'Liên hệ';

    card.append(media, h3, meta, price);
    return card;
  }));
  applyFilter(activeFilter);
}

function applyFilter(f) {
  activeFilter = f;
  chips.forEach(c => c.classList.toggle('active', c.dataset.filter === f));
  grid.querySelectorAll('.card').forEach(c => { c.hidden = f !== 'all' && c.dataset.cat !== f; });
}
chips.forEach(c => c.addEventListener('click', () => applyFilter(c.dataset.filter)));
document.querySelectorAll('.cat').forEach(c =>
  c.addEventListener('click', () => applyFilter(c.dataset.filter)));

loadJSON('data/site.json').then(applySite).catch(err => console.warn('Không nạp được thông tin chung:', err));
loadJSON('data/products.json').then(d => renderProducts(d.items || [])).catch(err => {
  console.warn('Không nạp được sản phẩm:', err);
  grid.innerHTML = '<p class="grid-msg">Không tải được sản phẩm. Vui lòng gọi hoặc nhắn Zalo cho chúng tôi.</p>';
});

// Form liên hệ: chưa có backend nên chỉ kiểm tra và báo lại.
// Khi có dịch vụ nhận form (Formspree, Google Forms...) thì gửi dữ liệu tại đây.
const form = document.getElementById('contact-form');
const note = document.getElementById('form-note');
form.addEventListener('submit', e => {
  e.preventDefault();
  const name = form.name.value.trim();
  const phone = form.phone.value.trim();
  if (!name || !/^[0-9+\s.-]{9,15}$/.test(phone)) {
    note.textContent = 'Vui lòng nhập họ tên và số điện thoại hợp lệ.';
    return;
  }
  note.textContent = 'Cảm ơn bạn! Chúng tôi sẽ liên hệ sớm nhất.';
  form.reset();
});

document.getElementById('year').textContent = new Date().getFullYear();

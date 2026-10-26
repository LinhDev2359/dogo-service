// Trang quản trị Doanh Tuyết: thiết kế cho điện thoại, để bố mẹ tự thêm/sửa sản phẩm, loại gỗ, thông tin cửa hàng
import { ADMIN } from './config';
import { GitHubBackend, LocalBackend, localAvailable, type Backend, type Change } from './backend';
import { clearToken, loginWithPopup, saveToken, savedToken } from './auth';
import { blobToBase64, prepareImage, type NewImage } from './images';
import {
  ASSETS, DIRS, assetPath, assetRef, fold, parseJson, parseProduct, serializeJson, serializeProduct, slugify, uniqueSlug,
  type JsonItem, type ProductItem,
} from './content';
import { CATEGORIES, STATUS } from '../lib/labels';

// ---------- Tiện ích hiển thị ----------
class Raw { constructor(public s: string) {} }
const raw = (s: string) => new Raw(s);
const esc = (v: unknown) => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
function html(strings: TemplateStringsArray, ...vals: unknown[]) {
  let out = strings[0];
  vals.forEach((v, i) => {
    const one = (x: unknown) => (x instanceof Raw ? x.s : x === false || x == null ? '' : esc(x));
    out += Array.isArray(v) ? v.map(one).join('') : one(v);
    out += strings[i + 1];
  });
  return new Raw(out);
}
const $ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector<T>(s);
const $$ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => [...r.querySelectorAll<T>(s)];

const ICON: Record<string, string> = {
  back: '<path d="m15 18-6-6 6-6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  box: '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/>',
  wood: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
  shop: '<path d="M3 9 4.5 4h15L21 9"/><path d="M4 9v11h16V9"/><path d="M3 9h18M9 20v-6h6v6"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  left: '<path d="m15 18-6-6 6-6"/>',
  right: '<path d="m9 18 6-6-6-6"/>',
  close: '<path d="M18 6 6 18M6 6l12 12"/>',
  camera: '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/>',
  chev: '<path d="m9 18 6-6-6-6"/>',
  up: '<path d="m18 15-6-6-6 6"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
};
const icon = (name: string) => raw(`<svg class="ai" viewBox="0 0 24 24" aria-hidden="true">${ICON[name]}</svg>`);

let toastTimer: number | undefined;
function toast(msg: string, kind: 'ok' | 'err' = 'ok') {
  const t = $('#ad-toast')!;
  t.textContent = msg;
  t.className = `ad-toast is-shown ${kind}`;
  clearTimeout(toastTimer);
  const ms = kind === 'err' ? 6000 : 3500;
  toastTimer = window.setTimeout(() => (t.className = 'ad-toast'), ms);
  // Khi chạy trên máy, trang có thể tự tải lại sau khi lưu file: giữ thông báo để hiện lại
  try { sessionStorage.setItem('dt-admin-toast', JSON.stringify({ msg, kind, until: Date.now() + ms })); } catch { /* bỏ qua */ }
}
function restoreToast() {
  try {
    const t = JSON.parse(sessionStorage.getItem('dt-admin-toast') || 'null');
    sessionStorage.removeItem('dt-admin-toast');
    if (t && t.until > Date.now()) toast(t.msg, t.kind);
  } catch { /* bỏ qua */ }
}

// ---------- Trạng thái ----------
const root = $('#app')!;
let backend: Backend;
let products: ProductItem[] = [];
let woods: JsonItem[] = [];
let site: JsonItem;
let dirty = false;
let currentHash = location.hash;

type Img = { kind: 'existing'; path: string; ref: string } | { kind: 'new'; img: NewImage };

const byOrder = (a: { data: any }, b: { data: any }) =>
  (a.data.order ?? 1e9) - (b.data.order ?? 1e9) || String(a.data.name || '').localeCompare(String(b.data.name || ''), 'vi');

const productsSorted = () => [...products].sort(byOrder);
const woodsSorted = () => [...woods].sort(byOrder);

// Ảnh được nạp sau khi vẽ giao diện (trên GitHub phải tải qua API)
function hydrateImages(scope: ParentNode = root) {
  const load = (img: HTMLImageElement) => {
    const path = img.dataset.path!;
    delete img.dataset.path;
    backend.imageUrl(path).then(url => { img.src = url; }).catch(() => img.classList.add('broken'));
  };
  const imgs = $$<HTMLImageElement>('img[data-path]', scope);
  if (!('IntersectionObserver' in window)) return imgs.forEach(load);
  const obs = new IntersectionObserver(entries => entries.forEach(e => {
    if (e.isIntersecting) { obs.unobserve(e.target); load(e.target as HTMLImageElement); }
  }), { rootMargin: '200px' });
  imgs.forEach(i => obs.observe(i));
}

const imgTag = (im: Img, alt = '') => im.kind === 'new'
  ? html`<img src="${im.img.url}" alt="${alt}">`
  : html`<img data-path="${im.path}" alt="${alt}">`;

const swatch = (tone: string, cls = '') => html`<span class="ad-swatch ${cls}" style="--tone:${/^#[0-9a-f]{6}$/i.test(tone) ? tone : '#8a5a32'}"></span>`;

// ---------- Khung trang ----------
type Tab = 'sp' | 'go' | 'ch';
function shell(o: { title: string; back?: string; tab?: Tab; body: Raw; savebar?: Raw; action?: Raw }) {
  root.innerHTML = html`
    <header class="ad-bar">
      ${o.back ? html`<a class="ad-icon-btn" href="${o.back}" aria-label="Quay lại">${icon('back')}</a>` : raw('<img class="ad-logo" src="/icon-192.png" alt="">')}
      <h1>${o.title}</h1>
      ${o.action || ''}
    </header>
    ${backend?.mode === 'local' ? raw('<p class="ad-mode">Đang chạy thử trên máy – thay đổi lưu thẳng vào file dự án</p>') : ''}
    <main class="ad-main">${o.body}</main>
    ${o.savebar
      ? html`<div class="ad-savebar">${o.savebar}</div>`
      : html`<nav class="ad-tabs" aria-label="Mục quản trị">
          <a href="#/san-pham" class="${o.tab === 'sp' ? 'on' : ''}">${icon('box')}<span>Sản phẩm</span></a>
          <a href="#/go" class="${o.tab === 'go' ? 'on' : ''}">${icon('wood')}<span>Loại gỗ</span></a>
          <a href="#/cua-hang" class="${o.tab === 'ch' ? 'on' : ''}">${icon('shop')}<span>Cửa hàng</span></a>
          <a href="/" target="_blank" rel="noopener">${icon('eye')}<span>Xem web</span></a>
        </nav>`}
  `.s;
  root.className = o.savebar ? 'ad-app has-savebar' : 'ad-app';
  window.scrollTo(0, 0);
  hydrateImages();
}

function setSaving(btn: HTMLButtonElement, on: boolean, label = 'Lưu') {
  btn.disabled = on;
  btn.innerHTML = on ? '<span class="ad-spin"></span>Đang lưu…' : label;
}

const savedMsg = () => backend.mode === 'github'
  ? 'Đã lưu. Web sẽ cập nhật sau khoảng 1–2 phút.'
  : 'Đã lưu vào máy.';

// ---------- Đăng nhập ----------
function viewLogin(error = '') {
  root.className = 'ad-app ad-login-page';
  root.innerHTML = html`
    <main class="ad-login">
      <img src="/icon-192.png" alt="" class="ad-login-logo">
      <h1>Quản trị Doanh Tuyết</h1>
      <p>Thêm, sửa sản phẩm, loại gỗ và thông tin cửa hàng ngay trên điện thoại.</p>
      ${error ? html`<p class="ad-error">${error}</p>` : ''}
      ${ADMIN.authUrl ? html`<button class="ad-btn ad-btn-primary ad-block" id="login-gh">Đăng nhập bằng GitHub</button>` : ''}
      <details class="ad-token" ${ADMIN.authUrl ? '' : raw('open')}>
        <summary>Đăng nhập bằng mã truy cập</summary>
        <form id="token-form">
          <label class="ad-field"><span>Mã truy cập GitHub</span>
            <input type="password" name="token" autocomplete="off" placeholder="github_pat_… hoặc ghp_…" required>
          </label>
          <button class="ad-btn ad-btn-primary ad-block" type="submit">Vào quản trị</button>
        </form>
        <p class="ad-hint">Người phụ trách kỹ thuật tạo mã này một lần (xem HUONG-DAN.md). Máy sẽ nhớ để lần sau không phải nhập lại.</p>
      </details>
    </main>
  `.s;
  const useToken = async (token: string) => {
    const b = new GitHubBackend(token);
    try {
      await b.verify();
      saveToken(token);
      backend = b;
      start();
    } catch (e) {
      viewLogin((e as Error).message === 'Bad credentials' ? 'Mã truy cập không đúng hoặc đã hết hạn.' : (e as Error).message);
    }
  };
  $('#login-gh')?.addEventListener('click', async () => {
    try { await useToken(await loginWithPopup(ADMIN.authUrl)); } catch (e) { viewLogin((e as Error).message); }
  });
  $<HTMLFormElement>('#token-form')?.addEventListener('submit', e => {
    e.preventDefault();
    useToken(String(new FormData(e.target as HTMLFormElement).get('token') || '').trim());
  });
}

// ---------- Danh sách sản phẩm ----------
const listState = { q: '', cat: 'all' };

function viewProducts() {
  const chips: [string, string][] = [['all', 'Tất cả'], ...Object.entries(CATEGORIES), ['an', 'Đang ẩn']];
  shell({
    title: 'Sản phẩm',
    tab: 'sp',
    body: html`
      <div class="ad-search">${icon('search')}<input type="search" id="q" placeholder="Tìm theo tên mẫu" value="${listState.q}" autocomplete="off"></div>
      <div class="ad-chips" role="group" aria-label="Lọc">
        ${chips.map(([k, v]) => html`<button type="button" class="ad-chip ${listState.cat === k ? 'on' : ''}" data-cat="${k}">${v}</button>`)}
      </div>
      <p class="ad-count" id="count"></p>
      <ul class="ad-list" id="list"></ul>
      <a class="ad-fab" href="#/san-pham/moi">${icon('plus')}<span>Thêm mẫu</span></a>
    `,
  });
  const list = $('#list')!;
  const draw = () => {
    const q = fold(listState.q.trim());
    const items = productsSorted().filter(p => {
      if (listState.cat === 'an') return p.data.visible === false;
      if (listState.cat !== 'all' && p.data.category !== listState.cat) return false;
      return !q || fold(String(p.data.name || '')).includes(q);
    });
    $('#count')!.textContent = `${items.length} mẫu`;
    list.innerHTML = items.length ? html`${items.map(p => {
      const first = p.data.images?.[0];
      const tags = [
        p.data.visible === false && html`<span class="ad-tag muted">Đang ẩn</span>`,
        p.data.banner && html`<span class="ad-tag">Banner</span>`,
        p.data.featured && html`<span class="ad-tag gold">Nổi bật</span>`,
      ].filter(Boolean);
      return html`<li><a href="#/san-pham/${p.id}" class="ad-row">
        <span class="ad-thumb">${first ? html`<img data-path="${assetPath(DIRS.products, first)}" alt="">` : icon('camera')}</span>
        <span class="ad-row-text">
          <b>${p.data.name || '(chưa có tên)'}</b>
          <small>${CATEGORIES[p.data.category as keyof typeof CATEGORIES] || ''} · ${STATUS[p.data.status as keyof typeof STATUS]?.label || ''}</small>
          ${tags.length ? html`<span class="ad-tags">${tags}</span>` : ''}
        </span>
        ${icon('chev')}
      </a></li>`;
    })}`.s : html`<li class="ad-empty">Không có mẫu nào.</li>`.s;
    hydrateImages(list);
  };
  draw();
  $<HTMLInputElement>('#q')!.addEventListener('input', e => { listState.q = (e.target as HTMLInputElement).value; draw(); });
  $$('.ad-chip').forEach(c => c.addEventListener('click', () => {
    listState.cat = c.dataset.cat!;
    $$('.ad-chip').forEach(x => x.classList.toggle('on', x === c));
    draw();
  }));
}

// ---------- Ô chọn ảnh (dùng chung) ----------
function imagesEditor(container: HTMLElement, images: Img[], opts: { multiple: boolean; onChange: () => void; label: string }) {
  const draw = () => {
    container.innerHTML = html`
      <div class="ad-images ${opts.multiple ? '' : 'single'}">
        ${images.map((im, i) => html`
          <figure class="ad-image">
            ${imgTag(im)}
            ${opts.multiple && i === 0 ? html`<span class="ad-cover">Ảnh chính</span>` : ''}
            <div class="ad-image-tools">
              ${opts.multiple && i > 0 ? html`<button type="button" data-act="left" data-i="${i}" aria-label="Đưa lên trước">${icon('left')}</button>` : ''}
              ${opts.multiple && i < images.length - 1 ? html`<button type="button" data-act="right" data-i="${i}" aria-label="Đưa ra sau">${icon('right')}</button>` : ''}
              <button type="button" data-act="del" data-i="${i}" aria-label="Bỏ ảnh này">${icon('close')}</button>
            </div>
          </figure>`)}
        ${opts.multiple || images.length === 0 ? html`
          <label class="ad-add-image">
            ${icon('camera')}<span>${images.length ? 'Thêm ảnh' : opts.label}</span>
            <input type="file" accept="image/*" ${opts.multiple ? raw('multiple') : ''} hidden>
          </label>` : ''}
      </div>
      <p class="ad-hint" data-status></p>`.s;
    hydrateImages(container);
  };
  container.addEventListener('click', e => {
    const b = (e.target as Element).closest<HTMLButtonElement>('button[data-act]');
    if (!b) return;
    const i = Number(b.dataset.i);
    if (b.dataset.act === 'del') images.splice(i, 1);
    if (b.dataset.act === 'left') [images[i - 1], images[i]] = [images[i], images[i - 1]];
    if (b.dataset.act === 'right') [images[i + 1], images[i]] = [images[i], images[i + 1]];
    opts.onChange();
    draw();
  });
  container.addEventListener('change', async e => {
    const input = e.target as HTMLInputElement;
    if (input.type !== 'file' || !input.files?.length) return;
    const status = $('[data-status]', container)!;
    const files = [...input.files];
    status.textContent = `Đang xử lý ${files.length} ảnh…`;
    for (const f of files) {
      try { images.push({ kind: 'new', img: await prepareImage(f) }); }
      catch { toast(`Không đọc được ảnh ${f.name}`, 'err'); }
      if (!opts.multiple) break;
    }
    opts.onChange();
    draw();
  });
  draw();
}

// Ghi ảnh mới thành file, trả về đường dẫn tương đối để lưu trong nội dung
async function uploadImages(images: Img[], contentDir: string, assetDir: string, prefix: string, changes: Change[]) {
  const refs: string[] = [];
  let n = 0;
  for (const im of images) {
    if (im.kind === 'existing') { refs.push(im.ref); continue; }
    const path = `${assetDir}/${prefix}-${Date.now().toString(36)}${n++}.${im.img.ext}`;
    changes.push({ path, content: await blobToBase64(im.img.blob), encoding: 'base64' });
    refs.push(assetRef(contentDir, path));
  }
  return refs;
}

const existingImg = (contentDir: string, ref: string): Img => ({ kind: 'existing', ref, path: assetPath(contentDir, ref) });

// ---------- Sửa sản phẩm ----------
function viewProduct(id: string | null) {
  const item = id ? products.find(p => p.id === id) : null;
  if (id && !item) { location.hash = '#/san-pham'; return; }
  const d = { name: '', category: 'ban-tho', status: 'dat-lam', woods: [] as string[], material: '', size: '', price: '', banner: false, featured: false, visible: true, order: null as number | null, ...(item?.data || {}) };
  d.woods = [...(d.woods || [])];
  let body = item?.body || '';
  const images: Img[] = (item?.data.images || []).map((r: string) => existingImg(DIRS.products, r));
  const wList = woodsSorted();

  shell({
    title: item ? 'Sửa mẫu' : 'Thêm mẫu mới',
    back: '#/san-pham',
    body: html`
      <form id="pf" class="ad-form" novalidate>
        <section class="ad-card">
          <h2>Ảnh sản phẩm</h2>
          <p class="ad-hint">Ảnh đầu tiên là ảnh đại diện. Nên chụp ngang, đủ sáng. Ảnh tự thu nhỏ khi lưu.</p>
          <div id="imgs"></div>
        </section>

        <section class="ad-card">
          <label class="ad-field"><span>Tên sản phẩm <em>*</em></span>
            <input name="name" value="${d.name}" placeholder="VD: Bàn thờ án gian chạm tứ linh" required>
          </label>
          <fieldset class="ad-field"><legend>Danh mục</legend>
            <div class="ad-pills">${Object.entries(CATEGORIES).map(([k, v]) => html`
              <label class="ad-pill"><input type="radio" name="category" value="${k}" ${k === d.category ? raw('checked') : ''}><span>${v}</span></label>`)}
            </div>
          </fieldset>
          <fieldset class="ad-field"><legend>Tình trạng</legend>
            <div class="ad-seg">${Object.entries(STATUS).map(([k, v]) => html`
              <label><input type="radio" name="status" value="${k}" ${k === d.status ? raw('checked') : ''}><span>${v.label}</span></label>`)}
            </div>
          </fieldset>
        </section>

        <section class="ad-card">
          <h2>Chất liệu gỗ</h2>
          ${wList.length ? html`
            <p class="ad-hint">Chọn các loại gỗ có thể làm mẫu này.</p>
            <div class="ad-pills">${wList.map(w => html`
              <label class="ad-pill wood"><input type="checkbox" name="woods" value="${w.id}" ${d.woods.includes(w.id) ? raw('checked') : ''}>
                <span>${swatch(w.data.tone)}${w.data.name}</span></label>`)}
            </div>` : html`<p class="ad-hint">Chưa có loại gỗ nào. <a href="#/go/moi">Thêm loại gỗ</a></p>`}
          <label class="ad-field"><span>Ghi chú chất liệu, màu sơn</span>
            <input name="material" value="${d.material || ''}" placeholder="VD: Sơn PU màu cánh gián">
          </label>
        </section>

        <section class="ad-card">
          <label class="ad-field"><span>Kích thước</span>
            <input name="size" value="${d.size || ''}" placeholder="Để trống = làm theo kích thước khách cần">
          </label>
          <label class="ad-field"><span>Giá</span>
            <input name="price" value="${d.price || ''}" placeholder="Để trống = Liên hệ báo giá">
          </label>
          <label class="ad-field"><span>Mô tả</span>
            <textarea name="body" rows="5" placeholder="Đặc điểm, hoa văn, gợi ý dùng cho không gian nào…">${body}</textarea>
          </label>
        </section>

        <section class="ad-card">
          <h2>Hiển thị</h2>
          ${toggle('visible', 'Hiện trên web', 'Tắt để ẩn tạm, không cần xóa', d.visible !== false)}
          ${toggle('featured', 'Sản phẩm nổi bật', 'Hiện trong dải nổi bật ở trang chủ (nên chọn khoảng 5 mẫu)', !!d.featured)}
          ${toggle('banner', 'Hiện trên banner lớn', 'Chạy ở đầu trang chủ (nên chọn 3–4 mẫu ảnh đẹp nhất)', !!d.banner)}
          <label class="ad-field"><span>Thứ tự hiển thị</span>
            <input name="order" type="number" inputmode="numeric" value="${d.order ?? ''}" placeholder="Số nhỏ hiện trước">
          </label>
        </section>

        ${item ? html`<button type="button" class="ad-btn ad-btn-danger ad-block" id="del">${icon('trash')}Xóa mẫu này</button>` : ''}
      </form>`,
    savebar: html`<button class="ad-btn ad-btn-primary ad-block" id="save" form="pf" type="submit">Lưu</button>`,
  });

  const form = $<HTMLFormElement>('#pf')!;
  const markDirty = () => { dirty = true; };
  imagesEditor($('#imgs')!, images, { multiple: true, onChange: markDirty, label: 'Chụp hoặc chọn ảnh' });
  form.addEventListener('input', markDirty);

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(form);
    const name = String(fd.get('name') || '').trim();
    if (!name) { toast('Vui lòng nhập tên sản phẩm', 'err'); $<HTMLInputElement>('[name=name]')!.focus(); return; }
    const btn = $<HTMLButtonElement>('#save')!;
    setSaving(btn, true);
    try {
      const pid = item?.id || uniqueSlug(slugify(name), products.map(p => p.id));
      const changes: Change[] = [];
      const refs = await uploadImages(images, DIRS.products, ASSETS.products, pid, changes);
      const orderVal = String(fd.get('order') || '').trim();
      const next: ProductItem = {
        id: pid,
        path: item?.path || `${DIRS.products}/${pid}.md`,
        body: String(fd.get('body') || ''),
        data: {
          ...(item?.data || {}),
          name,
          category: fd.get('category'),
          status: fd.get('status'),
          images: refs,
          woods: fd.getAll('woods').map(String),
          material: String(fd.get('material') || '').trim(),
          size: String(fd.get('size') || '').trim(),
          price: String(fd.get('price') || '').trim(),
          banner: fd.has('banner'),
          featured: fd.has('featured'),
          visible: fd.has('visible'),
          order: orderVal ? Number(orderVal) : null,
        },
      };
      changes.push({ path: next.path, content: serializeProduct(next), encoding: 'utf-8' });
      await backend.commit(`${item ? 'Sửa' : 'Thêm'} sản phẩm: ${name}`, changes);
      products = [...products.filter(p => p.id !== pid), next];
      dirty = false;
      toast(savedMsg());
      location.hash = '#/san-pham';
    } catch (err) {
      toast('Chưa lưu được: ' + (err as Error).message, 'err');
      setSaving(btn, false);
    }
  });

  $('#del')?.addEventListener('click', async () => {
    if (!item || !confirm(`Xóa hẳn "${item.data.name}" khỏi web?\n\nNếu chỉ muốn ẩn tạm, hãy tắt "Hiện trên web".`)) return;
    try {
      // Xóa luôn ảnh đã tải lên riêng cho mẫu này, trừ ảnh mẫu khác vẫn đang dùng
      const usedElsewhere = new Set(products.filter(p => p !== item).flatMap(p => (p.data.images || []).map((r: string) => assetPath(DIRS.products, r))));
      const ownImages = (item.data.images || []).map((r: string) => assetPath(DIRS.products, r))
        .filter((path: string) => path.startsWith(`${ASSETS.products}/${item.id}-`) && !usedElsewhere.has(path));
      await backend.commit(`Xóa sản phẩm: ${item.data.name}`, [], [item.path, ...ownImages]);
      products = products.filter(p => p !== item);
      dirty = false;
      toast(backend.mode === 'github' ? 'Đã xóa. Web sẽ cập nhật sau khoảng 1–2 phút.' : 'Đã xóa.');
      location.hash = '#/san-pham';
    } catch (err) { toast('Chưa xóa được: ' + (err as Error).message, 'err'); }
  });
}

function toggle(name: string, label: string, hint: string, on: boolean) {
  return html`<label class="ad-toggle">
    <span><b>${label}</b><small>${hint}</small></span>
    <input type="checkbox" name="${name}" ${on ? raw('checked') : ''}><i aria-hidden="true"></i>
  </label>`;
}

// ---------- Loại gỗ ----------
function viewWoods() {
  const used = (id: string) => products.filter(p => (p.data.woods || []).includes(id)).length;
  shell({
    title: 'Loại gỗ',
    tab: 'go',
    body: html`
      <p class="ad-hint ad-pad">Các loại gỗ hiện ở trang "Chất liệu gỗ" và trong trang chi tiết từng mẫu.</p>
      <ul class="ad-list">
        ${woodsSorted().map(w => html`<li><a href="#/go/${w.id}" class="ad-row">
          <span class="ad-thumb">${w.data.image ? html`<img data-path="${assetPath(DIRS.woods, w.data.image)}" alt="">` : swatch(w.data.tone, 'fill')}</span>
          <span class="ad-row-text"><b>${w.data.name}</b><small>Dùng ở ${used(w.id)} mẫu${w.data.visible === false ? ' · Đang ẩn' : ''}</small></span>
          ${icon('chev')}
        </a></li>`)}
        ${woods.length ? '' : html`<li class="ad-empty">Chưa có loại gỗ nào.</li>`}
      </ul>
      <a class="ad-fab" href="#/go/moi">${icon('plus')}<span>Thêm loại gỗ</span></a>`,
  });
}

function viewWood(id: string | null) {
  const item = id ? woods.find(w => w.id === id) : null;
  if (id && !item) { location.hash = '#/go'; return; }
  const d = { name: '', tone: '#8a5a32', summary: '', traits: [] as string[], uses: '', image: null as string | null, order: null as number | null, visible: true, ...(item?.data || {}) };
  const images: Img[] = d.image ? [existingImg(DIRS.woods, d.image)] : [];
  const usedBy = item ? products.filter(p => (p.data.woods || []).includes(item.id)) : [];

  shell({
    title: item ? 'Sửa loại gỗ' : 'Thêm loại gỗ',
    back: '#/go',
    body: html`
      <form id="wf" class="ad-form" novalidate>
        <section class="ad-card">
          <label class="ad-field"><span>Tên loại gỗ <em>*</em></span>
            <input name="name" value="${d.name}" placeholder="VD: Gỗ gụ" required>
          </label>
          <label class="ad-field"><span>Màu gỗ (dùng khi chưa có ảnh)</span>
            <span class="ad-color">${swatch(d.tone, 'lg')}<input type="color" name="tone" value="${d.tone}"></span>
          </label>
          <div class="ad-field"><span>Ảnh mẫu gỗ (không bắt buộc)</span><div id="wimg"></div></div>
        </section>
        <section class="ad-card">
          <label class="ad-field"><span>Mô tả ngắn</span>
            <textarea name="summary" rows="2" placeholder="VD: Gỗ màu nâu sẫm, thớ mịn, nặng và chắc tay.">${d.summary || ''}</textarea>
          </label>
          <label class="ad-field"><span>Đặc điểm (mỗi dòng một ý)</span>
            <textarea name="traits" rows="4" placeholder="Màu nâu sẫm&#10;Thớ mịn&#10;Nặng, chắc">${(d.traits || []).join('\n')}</textarea>
          </label>
          <label class="ad-field"><span>Thường dùng làm</span>
            <input name="uses" value="${d.uses || ''}" placeholder="VD: Bàn thờ, sập, tủ chè">
          </label>
        </section>
        <section class="ad-card">
          ${toggle('visible', 'Hiện trên web', 'Tắt để ẩn loại gỗ này', d.visible !== false)}
          <label class="ad-field"><span>Thứ tự hiển thị</span>
            <input name="order" type="number" inputmode="numeric" value="${d.order ?? ''}" placeholder="Số nhỏ hiện trước">
          </label>
        </section>
        ${item ? html`<button type="button" class="ad-btn ad-btn-danger ad-block" id="del">${icon('trash')}Xóa loại gỗ này</button>` : ''}
      </form>`,
    savebar: html`<button class="ad-btn ad-btn-primary ad-block" id="save" form="wf" type="submit">Lưu</button>`,
  });

  const form = $<HTMLFormElement>('#wf')!;
  form.addEventListener('input', e => {
    dirty = true;
    const t = e.target as HTMLInputElement;
    if (t.name === 'tone') $<HTMLElement>('.ad-color .ad-swatch')!.style.setProperty('--tone', t.value);
  });
  imagesEditor($('#wimg')!, images, { multiple: false, onChange: () => (dirty = true), label: 'Chọn ảnh vân gỗ' });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(form);
    const name = String(fd.get('name') || '').trim();
    if (!name) { toast('Vui lòng nhập tên loại gỗ', 'err'); return; }
    const btn = $<HTMLButtonElement>('#save')!;
    setSaving(btn, true);
    try {
      const wid = item?.id || uniqueSlug(slugify(name), woods.map(w => w.id));
      const changes: Change[] = [];
      const [ref] = await uploadImages(images, DIRS.woods, ASSETS.woods, wid, changes);
      const orderVal = String(fd.get('order') || '').trim();
      const next: JsonItem = {
        id: wid,
        path: item?.path || `${DIRS.woods}/${wid}.json`,
        data: {
          name,
          tone: String(fd.get('tone') || '#8a5a32'),
          summary: String(fd.get('summary') || '').trim(),
          traits: String(fd.get('traits') || '').split('\n').map(s => s.trim()).filter(Boolean),
          uses: String(fd.get('uses') || '').trim(),
          image: ref || null,
          order: orderVal ? Number(orderVal) : null,
          visible: fd.has('visible'),
        },
      };
      changes.push({ path: next.path, content: serializeJson(next.data), encoding: 'utf-8' });
      await backend.commit(`${item ? 'Sửa' : 'Thêm'} loại gỗ: ${name}`, changes);
      woods = [...woods.filter(w => w.id !== wid), next];
      dirty = false;
      toast(savedMsg());
      location.hash = '#/go';
    } catch (err) {
      toast('Chưa lưu được: ' + (err as Error).message, 'err');
      setSaving(btn, false);
    }
  });

  $('#del')?.addEventListener('click', async () => {
    if (!item) return;
    const msg = usedBy.length
      ? `"${item.data.name}" đang được chọn ở ${usedBy.length} mẫu. Xóa sẽ bỏ loại gỗ này khỏi các mẫu đó.\n\nVẫn xóa?`
      : `Xóa loại gỗ "${item.data.name}"?`;
    if (!confirm(msg)) return;
    try {
      // Bỏ loại gỗ khỏi các sản phẩm đang dùng, trong cùng một lần lưu
      const changes: Change[] = usedBy.map(p => {
        p.data.woods = (p.data.woods || []).filter((x: string) => x !== item.id);
        return { path: p.path, content: serializeProduct(p), encoding: 'utf-8' as const };
      });
      await backend.commit(`Xóa loại gỗ: ${item.data.name}`, changes, [item.path]);
      woods = woods.filter(w => w !== item);
      dirty = false;
      toast('Đã xóa loại gỗ.');
      location.hash = '#/go';
    } catch (err) { toast('Chưa xóa được: ' + (err as Error).message, 'err'); }
  });
}

// ---------- Thông tin cửa hàng ----------
function viewSettings() {
  const d = { ...site.data };
  const story: Img[] = d.story_image ? [existingImg(DIRS.settings, d.story_image)] : [];
  const gallery: { img: Img[]; caption: string }[] = (d.gallery || []).map((g: any) => ({
    img: g.image ? [existingImg(DIRS.settings, g.image)] : [],
    caption: g.caption || '',
  }));
  const field = (name: string, label: string, hint = '', type = 'text', extra = '') => html`
    <label class="ad-field"><span>${label}</span>
      <input name="${name}" type="${type}" value="${d[name] ?? ''}" ${raw(extra)}>
      ${hint ? html`<small class="ad-hint">${hint}</small>` : ''}
    </label>`;

  shell({
    title: 'Thông tin cửa hàng',
    tab: 'ch',
    body: html`
      <form id="sf" class="ad-form" novalidate>
        <section class="ad-card">
          <h2>Liên hệ</h2>
          ${field('phone', 'Số điện thoại', '', 'tel', 'inputmode="tel"')}
          ${field('zalo', 'Số Zalo', 'Chỉ chữ số. Để trống sẽ dùng số điện thoại.', 'tel', 'inputmode="numeric"')}
          ${field('address', 'Địa chỉ cửa hàng')}
          ${field('hours', 'Giờ mở cửa', 'VD: 7:30 – 18:00, tất cả các ngày')}
          ${field('messenger', 'Link Messenger', 'VD: https://m.me/ten-trang. Để trống sẽ ẩn nút Messenger.', 'url')}
          ${field('facebook', 'Link trang Facebook', '', 'url')}
        </section>
        <section class="ad-card">
          <h2>Bản đồ</h2>
          ${field('maps_url', 'Link Google Maps (nút Chỉ đường)', 'Mở Google Maps → tìm cửa hàng → Chia sẻ → Sao chép đường liên kết', 'url')}
          <label class="ad-field"><span>Mã nhúng bản đồ</span>
            <textarea name="maps_embed" rows="3" placeholder="Dán mã <iframe…> từ Google Maps → Chia sẻ → Nhúng bản đồ">${d.maps_embed || ''}</textarea>
          </label>
        </section>
        <section class="ad-card">
          <h2>Giới thiệu</h2>
          ${field('intro_title', 'Câu giới thiệu chính')}
          <label class="ad-field"><span>Đoạn giới thiệu ngắn</span><textarea name="intro_text" rows="3">${d.intro_text || ''}</textarea></label>
          ${field('story_title', 'Tiêu đề phần Về chúng tôi')}
          <label class="ad-field"><span>Nội dung Về chúng tôi</span><textarea name="story_text" rows="6">${d.story_text || ''}</textarea>
            <small class="ad-hint">Để trống một dòng giữa các đoạn.</small></label>
          <div class="ad-field"><span>Ảnh phần Về chúng tôi</span><div id="story-img"></div></div>
        </section>
        <section class="ad-card">
          <h2>Ảnh cửa hàng &amp; xưởng</h2>
          <p class="ad-hint">Ảnh đầu tiên hiện to nhất. Nên dùng ảnh thật tại cửa hàng, xưởng.</p>
          <div id="gallery"></div>
          <button type="button" class="ad-btn ad-btn-ghost ad-block" id="add-g">${icon('plus')}Thêm ảnh</button>
        </section>
        <section class="ad-card">
          <h2>Form liên hệ</h2>
          ${field('form_key', 'Mã nhận form (Web3Forms)', 'Lấy miễn phí tại web3forms.com bằng email cửa hàng.')}
        </section>
        <section class="ad-card ad-account">
          <p>${backend.mode === 'github' ? html`Đang đăng nhập: <b>${backend.user}</b>` : 'Đang chạy thử trên máy'}</p>
          ${backend.mode === 'github' ? html`<button type="button" class="ad-btn ad-btn-ghost" id="logout">Đăng xuất</button>` : ''}
        </section>
      </form>`,
    savebar: html`<button class="ad-btn ad-btn-primary ad-block" id="save" form="sf" type="submit">Lưu thông tin</button>`,
  });
  // Trang này có nút lưu riêng nhưng vẫn cần thanh tab: vẽ thêm thanh tab phía trên nút lưu
  root.insertAdjacentHTML('beforeend', html`<nav class="ad-tabs" aria-label="Mục quản trị">
    <a href="#/san-pham">${icon('box')}<span>Sản phẩm</span></a>
    <a href="#/go">${icon('wood')}<span>Loại gỗ</span></a>
    <a href="#/cua-hang" class="on">${icon('shop')}<span>Cửa hàng</span></a>
    <a href="/" target="_blank" rel="noopener">${icon('eye')}<span>Xem web</span></a>
  </nav>`.s);
  root.classList.add('has-tabs');

  const form = $<HTMLFormElement>('#sf')!;
  form.addEventListener('input', () => (dirty = true));
  imagesEditor($('#story-img')!, story, { multiple: false, onChange: () => (dirty = true), label: 'Chọn ảnh' });

  const gBox = $('#gallery')!;
  const drawGallery = () => {
    gBox.innerHTML = html`${gallery.map((g, i) => html`
      <div class="ad-gitem" data-i="${i}">
        <div class="ad-gimg"></div>
        <div class="ad-gside">
          <input data-cap="${i}" value="${g.caption}" placeholder="Chú thích ảnh" aria-label="Chú thích ảnh ${i + 1}">
          <div class="ad-gtools">
            <button type="button" data-g="up" data-i="${i}" aria-label="Lên trên" ${i === 0 ? raw('disabled') : ''}>${icon('up')}</button>
            <button type="button" data-g="down" data-i="${i}" aria-label="Xuống dưới" ${i === gallery.length - 1 ? raw('disabled') : ''}>${icon('down')}</button>
            <button type="button" data-g="del" data-i="${i}" aria-label="Bỏ ảnh này">${icon('trash')}</button>
          </div>
        </div>
      </div>`)}`.s || html`<p class="ad-hint">Chưa có ảnh.</p>`.s;
    $$('.ad-gitem', gBox).forEach(el => {
      const i = Number(el.dataset.i);
      imagesEditor($('.ad-gimg', el)!, gallery[i].img, { multiple: false, onChange: () => (dirty = true), label: 'Chọn ảnh' });
    });
  };
  gBox.addEventListener('input', e => {
    const t = e.target as HTMLInputElement;
    if (t.dataset.cap) gallery[Number(t.dataset.cap)].caption = t.value;
  });
  gBox.addEventListener('click', e => {
    const b = (e.target as Element).closest<HTMLButtonElement>('button[data-g]');
    if (!b) return;
    const i = Number(b.dataset.i);
    if (b.dataset.g === 'del' && confirm('Bỏ ảnh này khỏi phần cửa hàng & xưởng?')) gallery.splice(i, 1);
    if (b.dataset.g === 'up' && i > 0) [gallery[i - 1], gallery[i]] = [gallery[i], gallery[i - 1]];
    if (b.dataset.g === 'down' && i < gallery.length - 1) [gallery[i + 1], gallery[i]] = [gallery[i], gallery[i + 1]];
    dirty = true;
    drawGallery();
  });
  $('#add-g')!.addEventListener('click', () => { gallery.push({ img: [], caption: '' }); dirty = true; drawGallery(); });
  drawGallery();

  $('#logout')?.addEventListener('click', () => {
    if (dirty && !confirm('Có thay đổi chưa lưu. Vẫn đăng xuất?')) return;
    clearToken();
    dirty = false;
    viewLogin();
  });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(form);
    const btn = $<HTMLButtonElement>('#save')!;
    setSaving(btn, true, 'Lưu thông tin');
    try {
      const changes: Change[] = [];
      const [storyRef] = await uploadImages(story, DIRS.settings, ASSETS.site, 'cau-chuyen', changes);
      const galleryOut = [];
      for (const g of gallery) {
        const [ref] = await uploadImages(g.img, DIRS.settings, ASSETS.site, 'cua-hang', changes);
        if (ref || g.caption.trim()) galleryOut.push({ image: ref || null, caption: g.caption.trim() });
      }
      const next = { ...site.data };
      ['phone', 'zalo', 'address', 'hours', 'messenger', 'facebook', 'maps_url', 'maps_embed', 'intro_title', 'intro_text', 'story_title', 'story_text', 'form_key']
        .forEach(k => (next[k] = String(fd.get(k) ?? '').trim()));
      next.story_image = storyRef || null;
      next.gallery = galleryOut;
      changes.push({ path: site.path, content: serializeJson(next), encoding: 'utf-8' });
      await backend.commit('Cập nhật thông tin cửa hàng', changes);
      site = { ...site, data: next };
      dirty = false;
      toast(savedMsg());
      setSaving(btn, false, 'Lưu thông tin');
      viewSettings();
    } catch (err) {
      toast('Chưa lưu được: ' + (err as Error).message, 'err');
      setSaving(btn, false, 'Lưu thông tin');
    }
  });
}

// ---------- Điều hướng ----------
function route() {
  const [, section, id] = location.hash.replace(/^#\/?/, '#/').split('/');
  currentHash = location.hash;
  if (section === 'go') return id ? viewWood(id === 'moi' ? null : id) : viewWoods();
  if (section === 'cua-hang') return viewSettings();
  if (section === 'san-pham' && id) return viewProduct(id === 'moi' ? null : id);
  viewProducts();
}

// Hỏi lại trước khi rời trang đang sửa dở
addEventListener('hashchange', () => {
  if (dirty && location.hash !== currentHash) {
    if (!confirm('Có thay đổi chưa lưu. Bỏ thay đổi và rời trang?')) {
      history.replaceState(null, '', currentHash || '#/san-pham');
      return;
    }
    dirty = false;
  }
  route();
});
addEventListener('beforeunload', e => { if (dirty) e.preventDefault(); });

async function start() {
  root.className = 'ad-app';
  root.innerHTML = '<div class="ad-loading"><span class="ad-spin"></span>Đang tải dữ liệu…</div>';
  try {
    const [pf, wf, sf] = await Promise.all([backend.list(DIRS.products), backend.list(DIRS.woods), backend.list(DIRS.settings)]);
    products = pf.filter(f => f.name.endsWith('.md')).map(f => parseProduct(f.path, f.text || ''));
    woods = wf.filter(f => f.name.endsWith('.json')).map(f => parseJson(f.path, f.text || ''));
    const s = sf.find(f => f.name === 'site.json');
    if (!s) throw new Error('Không tìm thấy file thông tin cửa hàng');
    site = parseJson(s.path, s.text || '{}');
    route();
    restoreToast();
  } catch (e) {
    root.innerHTML = html`<div class="ad-loading"><p class="ad-error">Không tải được dữ liệu: ${(e as Error).message}</p>
      <button class="ad-btn ad-btn-primary" onclick="location.reload()">Thử lại</button></div>`.s;
  }
}

async function boot() {
  if (await localAvailable()) { backend = new LocalBackend(); return start(); }
  const token = savedToken();
  if (token) {
    const b = new GitHubBackend(token);
    try { await b.verify(); backend = b; return start(); } catch { clearToken(); }
  }
  viewLogin();
}

boot();

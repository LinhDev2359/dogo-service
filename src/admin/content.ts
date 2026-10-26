// Đọc/ghi file nội dung: sản phẩm (Markdown), loại gỗ và thông tin cửa hàng (JSON)
import YAML from 'yaml';

export const DIRS = {
  products: 'src/content/products',
  woods: 'src/content/woods',
  settings: 'src/content/settings',
};
export const ASSETS = {
  products: 'src/assets/products',
  woods: 'src/assets/woods',
  site: 'src/assets/site',
};

export interface ProductItem { id: string; path: string; data: Record<string, any>; body: string }
export interface JsonItem { id: string; path: string; data: Record<string, any> }

const join = (...parts: string[]) => {
  const out: string[] = [];
  parts.join('/').split('/').forEach(seg => {
    if (!seg || seg === '.') return;
    if (seg === '..') out.pop(); else out.push(seg);
  });
  return out.join('/');
};

/** Ảnh trong file nội dung được ghi theo đường dẫn tương đối, VD ../../assets/products/a.webp */
export const assetPath = (contentDir: string, ref: string) => join(contentDir, ref);
export const assetRef = (contentDir: string, path: string) => {
  const from = contentDir.split('/');
  const to = path.split('/');
  let i = 0;
  while (i < from.length && from[i] === to[i]) i++;
  return [...Array(from.length - i).fill('..'), ...to.slice(i)].join('/');
};

export function parseProduct(path: string, text: string): ProductItem {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  const data = (m ? YAML.parse(m[1]) : {}) || {};
  return { id: path.split('/').pop()!.replace(/\.md$/, ''), path, data, body: (m ? m[2] : text).trim() };
}

const PRODUCT_KEYS = ['name', 'category', 'status', 'images', 'woods', 'material', 'size', 'price', 'banner', 'featured', 'visible', 'order'];

export function serializeProduct(p: ProductItem) {
  const ordered: Record<string, any> = {};
  PRODUCT_KEYS.forEach(k => { if (p.data[k] !== undefined) ordered[k] = p.data[k]; });
  Object.keys(p.data).forEach(k => { if (!(k in ordered)) ordered[k] = p.data[k]; });
  return `---\n${YAML.stringify(ordered, { lineWidth: 0 })}---\n${p.body ? p.body.trim() + '\n' : ''}`;
}

export const parseJson = (path: string, text: string): JsonItem => ({
  id: path.split('/').pop()!.replace(/\.json$/, ''), path, data: JSON.parse(text || '{}'),
});
export const serializeJson = (data: unknown) => JSON.stringify(data, null, 2) + '\n';

/** Tạo tên file từ tên tiếng Việt: "Bàn thờ đẹp" → ban-tho-dep */
export const slugify = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'muc-moi';

export const uniqueSlug = (base: string, taken: string[]) => {
  let slug = base;
  for (let i = 2; taken.includes(slug); i++) slug = `${base}-${i}`;
  return slug;
};

export const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase();

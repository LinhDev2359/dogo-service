import { getCollection, getEntry, type CollectionEntry } from 'astro:content';

export { CATEGORIES, CATEGORY_SHORT, STATUS } from './labels';
import { CATEGORIES } from './labels';

export type Category = keyof typeof CATEGORIES;
export type Wood = CollectionEntry<'woods'> & { url: string };
export type Product = CollectionEntry<'products'> & { url: string; ph: number; price: string; woodList: Wood[] };
export type Site = CollectionEntry<'settings'>['data'];

/** Chuỗi trong ngoặc vuông là chỗ giữ chỗ, chưa phải thông tin thật */
export const isPlaceholder = (s?: string | null) => !s || /^\s*\[/.test(s);
export const digits = (s?: string | null) => String(s || '').replace(/[^\d+]/g, '');
/** Bỏ dấu tiếng Việt để tìm kiếm không phân biệt dấu */
export const fold = (s?: string | null) =>
  String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase();

const byOrder = <T extends { data: { order?: number | null; name: string } }>(a: T, b: T) =>
  (a.data.order ?? 1e9) - (b.data.order ?? 1e9) || a.data.name.localeCompare(b.data.name, 'vi');

export async function getWoods(): Promise<Wood[]> {
  const all = await getCollection('woods', w => w.data.visible);
  return all.sort(byOrder).map(w => ({ ...w, url: `/chat-lieu-go/#${w.id}` }));
}

export async function getProducts(): Promise<Product[]> {
  const woods = await getWoods();
  const all = await getCollection('products', p => p.data.visible);
  return all.sort(byOrder).map((p, i) => ({
    ...p,
    url: `/san-pham/${p.id}/`,
    ph: (i % 6) + 1,
    price: p.data.price || 'Liên hệ báo giá',
    // Bỏ qua loại gỗ đã bị xóa hoặc ẩn
    woodList: p.data.woods.map(ref => woods.find(w => w.id === ref.id)).filter((w): w is Wood => !!w),
  }));
}

export async function getSite(): Promise<Site> {
  const entry = await getEntry('settings', 'site');
  if (!entry) throw new Error('Thiếu file src/content/settings/site.json');
  return entry.data;
}

export function contactLinks(site: Site) {
  const address = isPlaceholder(site.address) ? '' : site.address;
  return {
    tel: 'tel:' + digits(site.phone),
    zalo: 'https://zalo.me/' + digits(site.zalo || site.phone),
    messenger: site.messenger || '',
    facebook: site.facebook || '',
    directions: site.maps_url
      || (address ? 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(address) : 'https://www.google.com/maps'),
    mapEmbed: mapEmbedSrc(site.maps_embed, address),
  };
}

// Chấp nhận cả đoạn mã <iframe> dán từ Google Maps lẫn đường link
function mapEmbedSrc(embed?: string | null, address?: string) {
  if (embed) {
    const m = embed.match(/src="([^"]+)"/);
    const src = m ? m[1] : embed.trim();
    if (/^https:\/\/(www\.)?google\.[^/]+\/maps\//.test(src)) return src;
  }
  return address ? 'https://www.google.com/maps?q=' + encodeURIComponent(address) + '&output=embed' : '';
}

export const paragraphs = (text?: string | null) =>
  String(text || '').split(/\n\s*\n/).map(t => t.trim()).filter(Boolean);

import { getCollection, getEntry, type CollectionEntry } from 'astro:content';

export const CATEGORIES = {
  'ban-tho': 'Bàn thờ & án gian',
  'hoanh-phi': 'Hoành phi, câu đối',
  'ban-ghe': 'Bàn ghế & sofa',
  'giuong-tu': 'Giường, tủ & bàn trang điểm',
  'my-nghe': 'Tượng & mỹ nghệ',
} as const;

/** Nhãn ngắn cho nút lọc danh mục (tên đầy đủ dùng ở menu và trang chi tiết) */
export const CATEGORY_SHORT: Record<keyof typeof CATEGORIES, string> = {
  'ban-tho': 'Bàn thờ',
  'hoanh-phi': 'Hoành phi, câu đối',
  'ban-ghe': 'Bàn ghế, sofa',
  'giuong-tu': 'Giường, tủ',
  'my-nghe': 'Tượng, mỹ nghệ',
};

export const STATUS = {
  'dat-lam': { label: 'Nhận đặt làm', note: 'Mẫu được sản xuất khi khách đặt. Thời gian làm sẽ trao đổi khi tư vấn.' },
  'co-san': { label: 'Có sẵn', note: 'Hiện có hàng hoàn thiện. Nên gọi trước để kiểm tra còn hàng.' },
  'trung-bay': { label: 'Mẫu tại cửa hàng', note: 'Mẫu đang trưng bày tại cửa hàng, có thể đến xem trực tiếp.' },
} as const;

export type Category = keyof typeof CATEGORIES;
export type Product = CollectionEntry<'products'> & { url: string; ph: number; price: string };
export type Site = CollectionEntry<'settings'>['data'];

/** Chuỗi trong ngoặc vuông là chỗ giữ chỗ, chưa phải thông tin thật */
export const isPlaceholder = (s?: string | null) => !s || /^\s*\[/.test(s);
export const digits = (s?: string | null) => String(s || '').replace(/[^\d+]/g, '');
/** Bỏ dấu tiếng Việt để tìm kiếm không phân biệt dấu */
export const fold = (s?: string | null) =>
  String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase();

export async function getProducts(): Promise<Product[]> {
  const all = await getCollection('products', p => p.data.visible);
  return all
    .sort((a, b) => (a.data.order ?? 1e9) - (b.data.order ?? 1e9) || a.data.name.localeCompare(b.data.name, 'vi'))
    .map((p, i) => ({ ...p, url: `/san-pham/${p.id}/`, ph: (i % 6) + 1, price: p.data.price || 'Liên hệ báo giá' }));
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

// Nhãn dùng chung cho trang web và trang quản trị (không phụ thuộc Astro)
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

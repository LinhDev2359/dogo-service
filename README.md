# Doanh Tuyết – website

Website showroom cho cửa hàng & xưởng đồ gỗ gia đình Doanh Tuyết.

- **Astro** (trang tĩnh), CSS và JavaScript thuần, không có backend và database
- **Sveltia CMS** tại `/admin/`: bố mẹ tự sửa sản phẩm và thông tin cửa hàng, dữ liệu lưu trong Git
- **Cloudflare Pages**: hosting miễn phí, tự build lại mỗi khi có thay đổi trên GitHub
- **Web3Forms**: nhận form "để lại số điện thoại" qua email (miễn phí)

## Chạy trên máy

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # build ra thư mục dist/
npm run preview    # xem bản build
npm run check      # kiểm tra lỗi kiểu dữ liệu
```

Cần Node 22.22 trở lên (xem `.node-version`).

Trang quản trị khi chạy trên máy: build rồi chạy `npm run preview`, mở `http://localhost:4321/admin/`, chọn **"Làm việc với kho mã nguồn cục bộ"** (cần Chrome hoặc Edge) và trỏ tới thư mục dự án.

## Cấu trúc

```
src/
  content/
    products/*.md          Mỗi sản phẩm một file (frontmatter + mô tả)
    settings/site.json     Thông tin cửa hàng: SĐT, Zalo, địa chỉ, ảnh xưởng…
  content.config.ts        Khai báo kiểu dữ liệu sản phẩm và thông tin cửa hàng
  assets/products|site/    Ảnh tải lên từ trang quản trị (Astro tự nén khi build)
                           vi-du-*.webp là ảnh VÍ DỤ tạm, phải thay trước khi ra mắt (xem NGUON-ANH-VI-DU.md)
  assets/brand/            Logo đã tách nền: biểu tượng, chữ, bản sáng màu cho nền tối
  lib/data.ts              Danh mục, tình trạng, hàm đọc dữ liệu
  components/              Header, Footer, Hero (banner), ProductCard, Gallery, Contact…
  pages/
    index.astro            Trang chủ
    san-pham/index.astro   Danh sách mẫu, có lọc và tìm kiếm
    san-pham/[slug].astro  Trang chi tiết từng mẫu
  styles/global.css
  scripts/                 JS dùng chung (header, menu, hiện dần khi cuộn…)
public/admin/              Sveltia CMS (index.html + config.yml)
design/prototype/          Bản thiết kế HTML ban đầu, chỉ để tham khảo
design/brand/              File logo gốc
```

Nguyên tắc nội dung: không tự viết thông tin chưa được gia đình xác nhận (địa chỉ, lịch sử, loại gỗ, giá, năng lực sản xuất). Chỗ chưa có thông tin để dạng `[… – cần bổ sung]`.

## Triển khai lần đầu

Các bước chi tiết ở [HUONG-DAN.md](HUONG-DAN.md#phần-2--triển-khai-lần-đầu-người-phụ-trách-kỹ-thuật).

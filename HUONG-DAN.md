# Hướng dẫn website Doanh Tuyết

## Phần 1 – Cập nhật hằng ngày (cho bố mẹ)

1. Mở `https://TEN-MIEN/admin/` và bấm **Đăng nhập bằng GitHub**. Chỉ cần đăng nhập lần đầu, các lần sau trình duyệt tự nhớ.
2. Chọn **Sản phẩm** hoặc **Thông tin cửa hàng**.
3. Thêm hoặc sửa nội dung, rồi bấm **Lưu**. Khoảng 1–2 phút sau web tự cập nhật.

**Thêm sản phẩm mới:** Sản phẩm → Tạo mới → điền tên, chọn danh mục và tình trạng → thêm ảnh → Lưu.

- **Ảnh:** chụp ngang, đủ sáng, nền gọn. Ảnh đầu tiên là ảnh đại diện. Chụp bằng điện thoại cứ tải lên bình thường, ảnh được tự thu nhỏ.
- **Tình trạng:**
  - *Nhận đặt làm*: làm khi khách đặt.
  - *Có sẵn*: đang có hàng hoàn thiện.
  - *Mẫu trưng bày tại cửa hàng*: khách đến xem được.
- **Giá:** để trống thì web hiện "Liên hệ báo giá".
- **Hiện trên banner lớn đầu trang:** bật cho 3–4 mẫu có ảnh ngang đẹp nhất; banner tự chạy qua các mẫu này.
- **Sản phẩm nổi bật:** bật cho khoảng 5 mẫu; chúng hiện trong dải "Sản phẩm nổi bật" trượt ngang trên trang chủ.
- **Ẩn tạm một mẫu:** tắt "Hiển thị trên web", không cần xóa.
- **Thứ tự hiển thị:** số nhỏ hiện trước.

**Thông tin cửa hàng:** đổi số điện thoại, Zalo, địa chỉ, giờ mở cửa, ảnh cửa hàng và xưởng, link Facebook/Messenger. Để trống link Messenger thì nút Messenger tự ẩn.

## Phần 2 – Triển khai lần đầu (người phụ trách kỹ thuật)

Mọi dịch vụ dưới đây đều dùng gói miễn phí. Chỉ tên miền là mất phí.

### 1. GitHub
1. Tạo repo **riêng tư**, ví dụ `doanh-tuyet-web`, rồi đẩy toàn bộ code lên nhánh `main`.
2. Tạo tài khoản GitHub cho bố mẹ (hoặc dùng chung) và mời vào repo với quyền **Write**.

### 2. Cloudflare Pages (hosting)
1. Cloudflare Dashboard → **Workers & Pages** → Create → **Pages** → Connect to Git → chọn repo.
2. Framework preset: **Astro**. Build command: `npm run build`. Build output: `dist`.
3. Bấm Deploy. Web sẽ có địa chỉ dạng `https://doanh-tuyet-web.pages.dev`.

### 3. Đăng nhập trang quản trị (Sveltia CMS Authenticator)
1. Cài theo hướng dẫn tại https://github.com/sveltia/sveltia-cms-auth (bấm nút Deploy to Cloudflare). Sau khi cài, ghi lại địa chỉ Worker, dạng `https://sveltia-cms-auth.<tài-khoản>.workers.dev`.
2. GitHub → Settings → Developer settings → **OAuth Apps** → New OAuth App:
   - Homepage URL: địa chỉ web
   - Authorization callback URL: `<địa-chỉ-Worker>/callback`
3. Trong Worker vừa tạo → Settings → Variables, thêm:
   - `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`: lấy từ OAuth App
   - `ALLOWED_DOMAINS`: tên miền của web, ví dụ `doanhtuyet.vn, *.pages.dev`
4. Sửa `public/admin/config.yml`:
   - `repo:` → `<tài-khoản>/<tên-repo>`
   - `base_url:` → địa chỉ Worker
5. Đẩy thay đổi lên GitHub, mở `/admin/` và thử đăng nhập.

Cách đơn giản hơn nếu chưa muốn cài Worker: ở màn hình đăng nhập chọn **"Đăng nhập bằng mã truy cập"** và dán một *fine-grained personal access token* của GitHub. Token chỉ cấp quyền **Contents: Read and write** cho đúng repo này. Cách này hợp để thử nghiệm; khi dùng lâu dài, Worker ở trên giúp bố mẹ đăng nhập dễ hơn.

### 4. Form liên hệ (Web3Forms)
1. Vào https://web3forms.com, nhập email của cửa hàng để nhận Access Key.
2. Vào `/admin/` → Thông tin cửa hàng → dán vào ô **Mã nhận form** → Lưu.
3. Gửi thử một form trên web và kiểm tra hộp thư (kể cả thư rác).

Khi chưa có mã, form sẽ báo khách gọi điện hoặc nhắn Zalo thay vì giả vờ gửi thành công.

### 5. Tên miền
1. Mua tên miền (`.vn` hoặc `.com`). Lưu ý giá gia hạn từ năm thứ hai.
2. Cloudflare Pages → dự án → **Custom domains** → thêm tên miền và làm theo hướng dẫn trỏ DNS.
3. Pages → Settings → **Environment variables** → thêm `SITE_URL` = `https://ten-mien` (dùng cho sitemap, link chia sẻ, ảnh xem trước), rồi deploy lại.
4. Thêm tên miền vào `ALLOWED_DOMAINS` của Worker ở bước 3.

### 6. Sau khi chạy
- **Google Business Profile:** tạo hồ sơ cửa hàng để hiện trên Google Maps, gắn link web.
- **Google Search Console:** thêm tên miền, gửi `https://ten-mien/sitemap-index.xml`.
- **Bản đồ:** dán link Google Maps của cửa hàng vào ô "Link Google Maps" và "Mã nhúng bản đồ" trong trang quản trị.

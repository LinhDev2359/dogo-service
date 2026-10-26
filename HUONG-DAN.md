# Hướng dẫn website Doanh Tuyết

## Phần 1 – Cập nhật hằng ngày (cho bố mẹ, trên điện thoại)

1. Mở `https://TEN-MIEN/admin/` trên điện thoại. Lần đầu đăng nhập (xem Phần 2, bước 3); các lần sau máy tự nhớ.
   Mẹo: trong trình duyệt chọn **Thêm vào màn hình chính** để có biểu tượng mở nhanh như một ứng dụng.
2. Dùng thanh dưới cùng: **Sản phẩm** · **Loại gỗ** · **Cửa hàng** · **Xem web**.
3. Sửa xong bấm nút **Lưu** to ở đáy màn hình. Khoảng 1–2 phút sau web tự cập nhật.

**Thêm mẫu mới:** Sản phẩm → nút **+ Thêm mẫu** → chụp hoặc chọn ảnh → điền tên, chọn danh mục, tình trạng, loại gỗ → Lưu.

- **Ảnh:** chụp ngang, đủ sáng, nền gọn. Ảnh đầu tiên (có chữ "Ảnh chính") là ảnh đại diện; dùng nút ‹ › trên ảnh để đổi thứ tự, nút ✕ để bỏ. Ảnh tự thu nhỏ khi lưu.
- **Tình trạng:** *Nhận đặt làm* (làm khi khách đặt) · *Có sẵn* (đang có hàng hoàn thiện) · *Mẫu tại cửa hàng* (khách đến xem được).
- **Chất liệu gỗ:** chọn các loại gỗ có thể làm mẫu này. Khách sẽ thấy đặc điểm từng loại ở trang chi tiết.
- **Kích thước, giá:** để trống thì web hiện "Theo kích thước gia đình cần" và "Liên hệ báo giá".
- **Hiện trên web:** tắt để ẩn tạm, không cần xóa.
- **Sản phẩm nổi bật:** khoảng 5 mẫu, hiện trong dải trượt ngang ở trang chủ.
- **Hiện trên banner lớn:** 3–4 mẫu có ảnh ngang đẹp nhất, chạy ở đầu trang chủ.
- **Thứ tự hiển thị:** số nhỏ hiện trước.

**Loại gỗ:** thêm/sửa tên gỗ, màu gỗ (dùng khi chưa có ảnh vân gỗ), mô tả, đặc điểm (mỗi dòng một ý), công dụng.
Danh sách 4 loại gỗ hiện có (gụ, hương, mít, xoan đào) chỉ là **ví dụ** – gia đình sửa lại cho đúng loại gỗ cửa hàng thực sự dùng.

**Cửa hàng:** số điện thoại, Zalo, địa chỉ, giờ mở cửa, link Messenger/Facebook, bản đồ, đoạn giới thiệu, ảnh cửa hàng & xưởng.
Để trống link Messenger thì nút Messenger tự ẩn.

## Phần 2 – Triển khai lần đầu (người phụ trách kỹ thuật)

Mọi dịch vụ dưới đây đều dùng gói miễn phí. Chỉ tên miền là mất phí.

### 1. GitHub
1. Tạo repo **riêng tư**, ví dụ `doanh-tuyet-web`, rồi đẩy toàn bộ code lên nhánh `main`.
2. Tạo tài khoản GitHub cho bố mẹ (hoặc dùng chung) và mời vào repo với quyền **Write**.

### 2. Cloudflare Pages (hosting)
1. Cloudflare Dashboard → **Workers & Pages** → Create → **Pages** → Connect to Git → chọn repo.
2. Framework preset: **Astro**. Build command: `npm run build`. Build output: `dist`.
3. Bấm Deploy. Web sẽ có địa chỉ dạng `https://doanh-tuyet-web.pages.dev`.

### 3. Đăng nhập trang quản trị
Trang `/admin/` là trang quản trị riêng của Doanh Tuyết. Mỗi lần bấm **Lưu**, nó ghi thay đổi thẳng vào repo GitHub
(một commit), Cloudflare Pages tự build lại. Có hai cách đăng nhập:

**Cách A – Mã truy cập (đơn giản, làm một lần trên điện thoại của bố mẹ):**
1. Đăng nhập GitHub bằng tài khoản có quyền **Write** vào repo.
2. Tạo mã: GitHub → Settings → Developer settings → Personal access tokens.
   - Nếu repo thuộc chính tài khoản đó hoặc một tổ chức: dùng **Fine-grained token**, chọn đúng repo, quyền **Contents: Read and write**.
   - Nếu tài khoản chỉ là *collaborator* trên repo của người khác: fine-grained token **không dùng được**, phải dùng **Tokens (classic)** với quyền `repo`.
3. Mở `/admin/` trên điện thoại → "Đăng nhập bằng mã truy cập" → dán mã. Máy sẽ nhớ mã này.

**Cách B – Nút "Đăng nhập bằng GitHub" (dễ hơn cho người dùng, cần cài thêm một lần):**
1. Cài Sveltia CMS Authenticator theo https://github.com/sveltia/sveltia-cms-auth (Deploy to Cloudflare), ghi lại địa chỉ Worker.
2. GitHub → Settings → Developer settings → **OAuth Apps** → New OAuth App; callback URL: `<địa-chỉ-Worker>/callback`.
3. Trong Worker → Settings → Variables: `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `ALLOWED_DOMAINS` (VD `doanhtuyet.vn, *.pages.dev`).
4. Cloudflare Pages → Settings → Environment variables: `PUBLIC_ADMIN_AUTH_URL` = địa chỉ Worker, rồi deploy lại.

Biến môi trường khác (không bắt buộc): `PUBLIC_ADMIN_REPO` (mặc định `LinhDev2359/dogo-service`), `PUBLIC_ADMIN_BRANCH` (mặc định `main`).

**Thử trên máy:** chạy `npm run dev`, mở `http://localhost:4321/admin/` – không cần đăng nhập, thay đổi lưu thẳng vào file
trong dự án (dải vàng "Đang chạy thử trên máy" ở đầu trang nhắc điều này).

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

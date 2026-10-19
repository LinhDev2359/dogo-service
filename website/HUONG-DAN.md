# Hướng dẫn cập nhật website

## Cập nhật hằng ngày (sau khi đã cài đặt xong)
1. Mở `https://TEN-MIEN-CUA-BAN/admin/` và đăng nhập bằng GitHub.
2. Chọn **Sản phẩm** hoặc **Thông tin chung**.
3. Thêm, sửa hoặc xóa, rồi bấm **Publish** (Xuất bản). Khoảng 1 phút sau web tự cập nhật.

Mẹo: tắt "Hiển thị trên web" để ẩn sản phẩm tạm thời mà không phải xóa.
Ảnh sản phẩm nên là ảnh ngang (tỉ lệ 4:3), dưới 500 KB cho tải nhanh.

## Cài đặt lần đầu (làm một lần)
1. Tạo tài khoản GitHub, tạo repo mới (ví dụ `go-viet-web`), đẩy toàn bộ thư mục `website` lên.
2. Tạo tài khoản Netlify, chọn **Add new site → Import from Git**, chọn repo vừa tạo, thư mục publish để trống (`/`).
3. Trong GitHub: Settings → Developer settings → OAuth Apps → New OAuth App.
   - Homepage URL: địa chỉ site Netlify.
   - Authorization callback URL: `https://api.netlify.com/auth/done`
   - Lấy **Client ID** và tạo **Client Secret**.
4. Trong Netlify: Site configuration → Access & security → OAuth → Install provider → GitHub, dán Client ID và Secret.
5. Mở `admin/config.yml`:
   - Sửa `repo:` thành `TAI-KHOAN-GITHUB/TEN-REPO`.
   - Bỏ dấu `#` ở hai dòng `base_url` và `auth_endpoint`.
   - Đẩy thay đổi lên GitHub.
6. Mở `/admin/`, đăng nhập GitHub. Người đăng nhập phải có quyền ghi vào repo.

## Chạy thử trên máy
```
cd website
npx decap-server          # cửa sổ 1
python3 -m http.server 8000   # cửa sổ 2
```
Mở `http://localhost:8000/` để xem web, `http://localhost:8000/admin/` để thử trang quản trị.
Lưu ý: không mở trực tiếp `index.html` bằng cách nhấp đúp, vì trình duyệt sẽ chặn việc đọc file dữ liệu.

## Cấu trúc thư mục
- `data/products.json`: danh sách sản phẩm
- `data/site.json`: tên thương hiệu, số điện thoại, địa chỉ, câu chuyện
- `images/uploads/`: ảnh tải lên từ trang quản trị
- `admin/`: trang quản trị

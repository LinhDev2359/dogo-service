// Cấu hình trang quản trị. Có thể đổi bằng biến môi trường trong Cloudflare Pages (xem HUONG-DAN.md).
export const ADMIN = {
  /** Kho GitHub chứa code web, dạng tai-khoan/ten-repo */
  repo: import.meta.env.PUBLIC_ADMIN_REPO || 'LinhDev2359/dogo-service',
  /** Nhánh mà Cloudflare Pages dùng để đăng web */
  branch: import.meta.env.PUBLIC_ADMIN_BRANCH || 'main',
  /** Địa chỉ Sveltia CMS Authenticator (Cloudflare Worker) để đăng nhập GitHub; để trống thì chỉ dùng mã truy cập */
  authUrl: import.meta.env.PUBLIC_ADMIN_AUTH_URL || '',
};

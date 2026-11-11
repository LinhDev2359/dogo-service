// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import adminDevApi from './src/integrations/admin-dev-api.ts';

// Địa chỉ chính thức của web. Khi có tên miền, đặt biến môi trường SITE_URL
// trong Cloudflare Pages (VD: https://doanhtuyet.vn). Không dùng CF_PAGES_URL vì đó là địa chỉ tạm của từng lần đăng.
const site = process.env.SITE_URL || 'https://dogo-service.pages.dev';

export default defineConfig({
  site,
  trailingSlash: 'always',
  integrations: [sitemap({ filter: page => !page.includes('/admin/') }), adminDevApi()],
});

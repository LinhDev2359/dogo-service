// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Địa chỉ chính thức của web. Khi có tên miền, đặt biến môi trường SITE_URL
// trong Cloudflare Pages (VD: https://doanhtuyet.vn). Cloudflare tự cung cấp CF_PAGES_URL.
const site = process.env.SITE_URL || process.env.CF_PAGES_URL || 'http://localhost:4321';

export default defineConfig({
  site,
  trailingSlash: 'always',
  integrations: [sitemap()],
});

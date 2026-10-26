// Chỉ dùng khi chạy trên máy (npm run dev): cho trang /admin/ đọc và ghi thẳng vào file của dự án,
// để thử quản trị mà không cần đăng nhập GitHub. Bản build lên mạng không có phần này.
import type { AstroIntegration } from 'astro';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const ALLOWED = ['src/content/', 'src/assets/'];
const MIME: Record<string, string> = { '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.svg': 'image/svg+xml' };

export default function adminDevApi(): AstroIntegration {
  return {
    name: 'doanh-tuyet-admin-dev-api',
    hooks: {
      'astro:server:setup': ({ server }) => {
        const root = server.config.root;
        // Chặn mọi đường dẫn ra ngoài thư mục nội dung và ảnh
        const safe = (p: string) => {
          const rel = path.posix.normalize(String(p || '')).replace(/^\/+/, '');
          if (rel.includes('..') || !ALLOWED.some(a => rel.startsWith(a))) throw new Error('Đường dẫn không hợp lệ: ' + p);
          return path.join(root, rel);
        };
        const send = (res: any, code: number, body: unknown, type = 'application/json') => {
          res.statusCode = code;
          res.setHeader('Content-Type', type);
          res.end(type === 'application/json' ? JSON.stringify(body) : body);
        };
        const readBody = (req: any) => new Promise<string>((ok, fail) => {
          let data = '';
          req.on('data', (c: Buffer) => (data += c));
          req.on('end', () => ok(data));
          req.on('error', fail);
        });

        server.middlewares.use('/__admin', async (req: any, res: any) => {
          try {
            const url = new URL(req.url, 'http://local');
            if (url.pathname === '/ping') return send(res, 200, { ok: true, mode: 'local' });

            if (url.pathname === '/files') {
              const dir = safe(url.searchParams.get('dir') || '');
              const names = await fs.readdir(dir).catch(() => [] as string[]);
              const files = await Promise.all(names.filter(n => !n.startsWith('.')).map(async name => ({
                name,
                path: path.posix.join(url.searchParams.get('dir')!, name),
                text: /\.(md|json)$/.test(name) ? await fs.readFile(path.join(dir, name), 'utf8') : undefined,
              })));
              return send(res, 200, files);
            }

            if (url.pathname === '/raw') {
              const file = safe(url.searchParams.get('path') || '');
              const buf = await fs.readFile(file);
              res.setHeader('Cache-Control', 'no-store');
              return send(res, 200, buf, MIME[path.extname(file).toLowerCase()] || 'application/octet-stream');
            }

            if (url.pathname === '/commit' && req.method === 'POST') {
              const { changes = [], deletions = [] } = JSON.parse(await readBody(req));
              for (const c of changes) {
                const file = safe(c.path);
                await fs.mkdir(path.dirname(file), { recursive: true });
                await fs.writeFile(file, c.encoding === 'base64' ? Buffer.from(c.content, 'base64') : c.content);
              }
              for (const d of deletions) await fs.rm(safe(d), { force: true });
              return send(res, 200, { ok: true });
            }
            send(res, 404, { error: 'Không có' });
          } catch (e) {
            send(res, 400, { error: (e as Error).message });
          }
        });
      },
    },
  };
}

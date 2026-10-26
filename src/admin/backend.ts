// Nơi lưu nội dung: trên máy (khi chạy npm run dev) hoặc GitHub (khi web chạy thật)
import { ADMIN } from './config';

export interface FileEntry { name: string; path: string; text?: string }
export interface Change { path: string; content: string; encoding: 'utf-8' | 'base64' }

export interface Backend {
  mode: 'local' | 'github';
  user: string;
  list(dir: string): Promise<FileEntry[]>;
  imageUrl(path: string): Promise<string>;
  commit(message: string, changes: Change[], deletions?: string[]): Promise<void>;
}

async function check(res: Response) {
  if (res.ok) return res;
  let msg = `${res.status}`;
  try { const j = await res.json(); msg = j.message || j.error || msg; } catch { /* không phải JSON */ }
  throw new Error(msg);
}

export async function localAvailable() {
  try {
    const r = await fetch('/__admin/ping', { cache: 'no-store' });
    return r.ok && (await r.json()).mode === 'local';
  } catch { return false; }
}

export class LocalBackend implements Backend {
  mode = 'local' as const;
  user = 'Chạy trên máy';
  async list(dir: string) {
    return (await check(await fetch(`/__admin/files?dir=${encodeURIComponent(dir)}`, { cache: 'no-store' }))).json();
  }
  async imageUrl(path: string) {
    return `/__admin/raw?path=${encodeURIComponent(path)}`;
  }
  async commit(_message: string, changes: Change[], deletions: string[] = []) {
    await check(await fetch('/__admin/commit', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ changes, deletions }),
    }));
  }
}

export class GitHubBackend implements Backend {
  mode = 'github' as const;
  user = '';
  private images = new Map<string, Promise<string>>();
  constructor(private token: string) {}

  private api(path: string, init: RequestInit = {}) {
    return fetch(`https://api.github.com${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${this.token}`, Accept: 'application/vnd.github+json', ...(init.headers || {}) },
    }).then(check);
  }

  /** Kiểm tra mã đăng nhập và quyền ghi vào kho */
  async verify() {
    const me = await (await this.api('/user')).json();
    const repo = await (await this.api(`/repos/${ADMIN.repo}`)).json();
    if (!repo.permissions?.push) throw new Error(`Tài khoản ${me.login} chưa có quyền ghi vào ${ADMIN.repo}`);
    this.user = me.login;
  }

  // Một lần gọi lấy toàn bộ nội dung các file trong thư mục
  async list(dir: string): Promise<FileEntry[]> {
    const [owner, name] = ADMIN.repo.split('/');
    const query = `query($owner:String!,$name:String!,$expr:String!){repository(owner:$owner,name:$name){object(expression:$expr){... on Tree{entries{name path object{... on Blob{text isBinary}}}}}}}`;
    const res = await (await this.api('/graphql', {
      method: 'POST',
      body: JSON.stringify({ query, variables: { owner, name, expr: `${ADMIN.branch}:${dir}` } }),
    })).json();
    if (res.errors?.length) throw new Error(res.errors[0].message);
    const entries = res.data?.repository?.object?.entries || [];
    return entries
      .filter((e: any) => !e.name.startsWith('.'))
      .map((e: any) => ({ name: e.name, path: e.path, text: e.object?.isBinary ? undefined : e.object?.text }));
  }

  imageUrl(path: string) {
    if (!this.images.has(path)) {
      this.images.set(path, this.api(`/repos/${ADMIN.repo}/contents/${encodeURI(path)}?ref=${ADMIN.branch}`, {
        headers: { Accept: 'application/vnd.github.raw' },
      }).then(r => r.blob()).then(b => URL.createObjectURL(b)));
    }
    return this.images.get(path)!;
  }

  // Gộp mọi thay đổi (ảnh + nội dung) vào một lần lưu duy nhất
  async commit(message: string, changes: Change[], deletions: string[] = [], retry = true): Promise<void> {
    const R = `/repos/${ADMIN.repo}/git`;
    const ref = await (await this.api(`${R}/ref/heads/${ADMIN.branch}`)).json();
    const base = await (await this.api(`${R}/commits/${ref.object.sha}`)).json();
    const blobs = await Promise.all(changes.map(async c => {
      const blob = await (await this.api(`${R}/blobs`, { method: 'POST', body: JSON.stringify({ content: c.content, encoding: c.encoding }) })).json();
      return { path: c.path, mode: '100644', type: 'blob', sha: blob.sha };
    }));
    const tree = await (await this.api(`${R}/trees`, {
      method: 'POST',
      body: JSON.stringify({ base_tree: base.tree.sha, tree: [...blobs, ...deletions.map(path => ({ path, mode: '100644', type: 'blob', sha: null }))] }),
    })).json();
    const commit = await (await this.api(`${R}/commits`, {
      method: 'POST', body: JSON.stringify({ message, tree: tree.sha, parents: [ref.object.sha] }),
    })).json();
    try {
      await this.api(`${R}/refs/heads/${ADMIN.branch}`, { method: 'PATCH', body: JSON.stringify({ sha: commit.sha }) });
    } catch (e) {
      // Có người vừa lưu cùng lúc: thử lại một lần trên bản mới nhất
      if (retry) return this.commit(message, changes, deletions, false);
      throw e;
    }
  }
}

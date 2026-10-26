// Đăng nhập GitHub qua Sveltia CMS Authenticator (cửa sổ bật lên) hoặc mã truy cập
const KEY = 'dt-admin-token';

export const savedToken = () => { try { return localStorage.getItem(KEY) || ''; } catch { return ''; } };
export const saveToken = (t: string) => { try { localStorage.setItem(KEY, t); } catch { /* chế độ riêng tư */ } };
export const clearToken = () => { try { localStorage.removeItem(KEY); } catch { /* bỏ qua */ } };

export function loginWithPopup(authUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = `${authUrl.replace(/\/$/, '')}/auth?provider=github&site_id=${encodeURIComponent(location.hostname)}&scope=repo`;
    const popup = window.open(url, 'dt-auth', 'width=600,height=720');
    if (!popup) return reject(new Error('Trình duyệt đã chặn cửa sổ đăng nhập. Hãy cho phép cửa sổ bật lên rồi thử lại.'));
    const onMessage = (e: MessageEvent) => {
      if (typeof e.data !== 'string') return;
      if (e.data === 'authorizing:github') { popup.postMessage(e.data, e.origin); return; }
      const m = e.data.match(/^authorization:github:(success|error):([\s\S]*)$/);
      if (!m) return;
      window.removeEventListener('message', onMessage);
      try {
        const data = JSON.parse(m[2]);
        if (m[1] === 'success' && data.token) resolve(data.token);
        else reject(new Error(data.message || 'Đăng nhập không thành công'));
      } catch { reject(new Error('Đăng nhập không thành công')); }
    };
    window.addEventListener('message', onMessage);
  });
}

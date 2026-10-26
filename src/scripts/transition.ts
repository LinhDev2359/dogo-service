import { reduceMotion } from './util';

/**
 * Cập nhật giao diện kèm hiệu ứng View Transitions (các thẻ tự trượt về chỗ mới).
 * Nội dung luôn được cập nhật kể cả khi hiệu ứng bị trễ (máy yếu, tab bận):
 * sau 400ms mà hiệu ứng chưa chạy thì bỏ qua hiệu ứng và cập nhật ngay.
 */
export function withTransition(apply: () => void, animate = true) {
  if (!animate || reduceMotion || !('startViewTransition' in document)) return apply();
  let done = false;
  const run = () => { if (!done) { done = true; apply(); } };
  const t = document.startViewTransition(run);
  t.ready.catch(() => {});
  t.finished.catch(() => {});
  setTimeout(() => { if (!done) { t.skipTransition(); run(); } }, 400);
}

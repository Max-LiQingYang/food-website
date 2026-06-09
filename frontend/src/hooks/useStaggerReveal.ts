import { useEffect } from 'react';

/**
 * 自动为页面上所有 .list-stagger 容器注册 IntersectionObserver
 * 进入视口时添加 .is-visible，触发子项 stagger 动画
 * 视口外时移除（重新进入会重放）
 */
export function useStaggerReveal() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      // 降级：直接显示
      document.querySelectorAll('.list-stagger').forEach((el) => el.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
          } else {
            // 滚出后移除，让再次进入时重放
            entry.target.classList.remove('is-visible');
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    // 当前 + 未来新增（用 MutationObserver 监听）
    const scan = () => {
      document.querySelectorAll('.list-stagger:not([data-observed])').forEach((el) => {
        observer.observe(el);
        el.setAttribute('data-observed', 'true');
      });
    };
    scan();

    const mo = new MutationObserver(scan);
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      mo.disconnect();
    };
  }, []);
}

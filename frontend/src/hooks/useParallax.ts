import { useEffect } from 'react';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';

/**
 * Hero 视差降级方案（仅在不支持 CSS view-timeline 时启用）
 * 使用 transform: translate3d + rAF 节流，避免 layout thrashing
 */
export function useParallax() {
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (prefersReducedMotion) return;

    // 检测 CSS view-timeline 支持
    const supportsViewTimeline = CSS.supports('animation-timeline: view()');
    if (supportsViewTimeline) return; // 浏览器原生支持，无需 JS

    const heroBg = document.querySelector<HTMLElement>('.hero-parallax__bg');
    if (!heroBg) return;

    const hero = heroBg.closest<HTMLElement>('.hero-parallax');
    if (!hero) return;

    hero.classList.add('hero-parallax-js');

    let ticking = false;
    const update = () => {
      const rect = hero.getBoundingClientRect();
      const vh = window.innerHeight;
      // 仅在视口内计算
      if (rect.bottom < 0 || rect.top > vh) {
        ticking = false;
        return;
      }
      // 滚动进度 -1 ~ 1
      const progress = (rect.top + rect.height / 2 - vh / 2) / vh;
      // translate Y: -5% ~ +5% (相对元素高度)
      const offset = progress * rect.height * 0.05;
      heroBg.style.setProperty('--parallax-y', `${-offset}px`);
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    update();

    return () => window.removeEventListener('scroll', onScroll);
  }, [prefersReducedMotion]);
}

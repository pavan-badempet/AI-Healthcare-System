/**
 * AI Healthcare System — Material Design Ripple Hook
 */
import { useRef, useCallback } from 'react';

export function useMaterialRipple() {
  const ref = useRef<HTMLButtonElement | HTMLAnchorElement | HTMLDivElement | null>(null);

  const triggerRipple = useCallback((e: React.MouseEvent<HTMLElement>) => {
    const target = e.currentTarget;
    if (!target) return;

    const rect = target.getBoundingClientRect();
    const circle = document.createElement('span');
    const diameter = Math.max(rect.width, rect.height);
    const radius = diameter / 2;

    circle.style.width = circle.style.height = `${diameter}px`;
    circle.style.left = `${e.clientX - rect.left - radius}px`;
    circle.style.top = `${e.clientY - rect.top - radius}px`;
    circle.classList.add('ripple-effect');

    const ripple = target.getElementsByClassName('ripple-effect')[0];
    if (ripple) {
      ripple.remove();
    }

    target.appendChild(circle);
    setTimeout(() => {
      circle.remove();
    }, 600);
  }, []);

  return { ref, triggerRipple };
}

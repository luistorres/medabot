import { useRef, useEffect, useCallback } from "react";

interface UseSwipeNavigationOptions {
  threshold?: number;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
}

export const useSwipeNavigation = (
  containerRef: React.RefObject<HTMLElement>,
  options: UseSwipeNavigationOptions = {}
) => {
  const { threshold = 50, onSwipeLeft, onSwipeRight } = options;
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    // Only track single-finger swipes
    if (e.touches.length !== 1) return;
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (startX.current === null || startY.current === null) return;

    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const deltaX = endX - startX.current;
    const deltaY = endY - startY.current;

    // Only trigger if horizontal swipe is dominant and exceeds threshold
    if (Math.abs(deltaX) > threshold && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
      if (deltaX < 0) {
        onSwipeLeft?.();
      } else {
        onSwipeRight?.();
      }
    }

    startX.current = null;
    startY.current = null;
  }, [threshold, onSwipeLeft, onSwipeRight]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    el.addEventListener("touchstart", handleTouchStart, { passive: true });
    el.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchend", handleTouchEnd);
    };
  }, [containerRef, handleTouchStart, handleTouchEnd]);
};

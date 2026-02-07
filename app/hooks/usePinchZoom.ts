import { useRef, useEffect, useCallback, useState } from "react";

interface UsePinchZoomOptions {
  minScale?: number;
  maxScale?: number;
  initialScale?: number;
}

export const usePinchZoom = (
  containerRef: React.RefObject<HTMLElement>,
  options: UsePinchZoomOptions = {}
) => {
  const { minScale = 0.5, maxScale = 3.0, initialScale = 1.0 } = options;
  const [scale, setScale] = useState(initialScale);
  const initialDistance = useRef<number | null>(null);
  const initialScale_ = useRef(initialScale);

  const getDistance = (touches: TouchList) => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (e.touches.length === 2) {
      initialDistance.current = getDistance(e.touches);
      initialScale_.current = scale;
    }
  }, [scale]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (e.touches.length === 2 && initialDistance.current !== null) {
      e.preventDefault();
      const currentDistance = getDistance(e.touches);
      const ratio = currentDistance / initialDistance.current;
      const newScale = Math.min(maxScale, Math.max(minScale, initialScale_.current * ratio));
      setScale(newScale);
    }
  }, [minScale, maxScale]);

  const handleTouchEnd = useCallback(() => {
    initialDistance.current = null;
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    el.addEventListener("touchstart", handleTouchStart, { passive: true });
    el.addEventListener("touchmove", handleTouchMove, { passive: false });
    el.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchmove", handleTouchMove);
      el.removeEventListener("touchend", handleTouchEnd);
    };
  }, [containerRef, handleTouchStart, handleTouchMove, handleTouchEnd]);

  return { scale, setScale };
};

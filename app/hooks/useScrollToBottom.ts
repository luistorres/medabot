import { useState, useEffect, RefObject } from "react";

interface UseScrollToBottomOptions {
  threshold?: number; // pixels from bottom to show button
}

export const useScrollToBottom = (
  scrollRef: RefObject<HTMLDivElement>,
  options: UseScrollToBottomOptions = {}
) => {
  const { threshold = 100 } = options;
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);

  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

      setIsAtBottom(distanceFromBottom < threshold);
      setShowScrollButton(distanceFromBottom > threshold);
    };

    scrollContainer.addEventListener("scroll", handleScroll);
    handleScroll(); // Check initial state

    return () => scrollContainer.removeEventListener("scroll", handleScroll);
  }, [scrollRef, threshold]);

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior,
    });
  };

  return { showScrollButton, isAtBottom, scrollToBottom };
};

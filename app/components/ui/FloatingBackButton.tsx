import { useEffect, useState } from "react";
import { usePDF } from "../../context/PDFContext";

const FloatingBackButton = () => {
  const { cameFromChat, setCameFromChat, setActiveTab } = usePDF();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (cameFromChat) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        setCameFromChat(false);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [cameFromChat, setCameFromChat]);

  if (!visible) return null;

  const handleClick = () => {
    setActiveTab("chat");
    setCameFromChat(false);
    setVisible(false);
  };

  return (
    <button
      onClick={handleClick}
      className="fixed bottom-20 left-1/2 -translate-x-1/2 z-20
        bg-primary-600 hover:bg-primary-700 text-white
        px-5 py-2.5 rounded-full shadow-lg
        text-sm font-medium
        animate-slide-up
        flex items-center gap-2
        active:scale-95 transition-transform"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
      </svg>
      Voltar ao Chat
    </button>
  );
};

export default FloatingBackButton;

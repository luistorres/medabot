import { usePDF } from "../../context/PDFContext";
import { Icon } from "./Icon";

const FloatingBackButton = () => {
  const { cameFromChat, setCameFromChat, setActiveTab } = usePDF();

  if (!cameFromChat) return null;

  const handleClick = () => {
    setActiveTab("chat");
    setCameFromChat(false);
  };

  return (
    <button
      onClick={handleClick}
      className="fixed bottom-20 left-1/2 -translate-x-1/2 z-20
        bg-brand hover:bg-brand-deep text-white
        px-5 py-2.5 rounded-lg shadow-1
        text-sm font-medium
        animate-slide-up
        flex items-center gap-2
        active:scale-95 transition-transform"
    >
      <Icon.back className="w-4 h-4" />
      Voltar à conversa
    </button>
  );
};

export default FloatingBackButton;

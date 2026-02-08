import { useState, useRef, useEffect } from "react";
import { queryLeafletPdf } from "../server/queryLeaflet";
import { usePDF } from "../context/PDFContext";
import { useScrollToBottom } from "../hooks/useScrollToBottom";
import { parseMessageWithReferences } from "../utils/parseReferences";
import { formatMessage } from "../utils/formatMessage";
import Chip from "./ui/Chip";

interface ChatMessage {
  id: string;
  type: "user" | "assistant";
  content: string;
  timestamp: Date;
  sourcePages?: number[];
}

interface ChatProps {
  pdfData: string;
  medicineName: string;
  initialOverview?: string;
}

const TypingDots = () => (
  <div className="flex items-center gap-1 px-1 py-1">
    {[0, 1, 2].map((i) => (
      <span
        key={i}
        className="w-2 h-2 bg-gray-400 rounded-full animate-typing-dots"
        style={{ animationDelay: `${i * 0.2}s` }}
      />
    ))}
  </div>
);

const Chat = ({ pdfData, medicineName, initialOverview }: ChatProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestionsOpen, setSuggestionsOpen] = useState(true);
  const [hasInteracted, setHasInteracted] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { jumpToPage } = usePDF();
  const { showScrollButton, isAtBottom, scrollToBottom } = useScrollToBottom(
    messagesContainerRef as React.RefObject<HTMLDivElement>,
    { threshold: 150 }
  );

  // Add initial overview as first message
  useEffect(() => {
    if (initialOverview && messages.length === 0) {
      setMessages([
        {
          id: "overview",
          type: "assistant",
          content: initialOverview,
          timestamp: new Date(),
        },
      ]);
    }
  }, [initialOverview]);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.type === "user" || isAtBottom) {
        scrollToBottom("smooth");
      }
    }
  }, [messages]);

  const handleAskQuestion = async (q?: string) => {
    const text = q || question;
    if (!text.trim() || !pdfData || loading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: "user",
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setQuestion("");
    setLoading(true);

    // Collapse suggestions after first interaction
    if (!hasInteracted) {
      setHasInteracted(true);
      setSuggestionsOpen(false);
    }

    try {
      const result = await queryLeafletPdf({
        data: {
          pdfBase64: pdfData,
          question: text,
        },
      });

      if (result.success && typeof result.answer === "string") {
        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          type: "assistant",
          content: result.answer,
          timestamp: new Date(),
          sourcePages: result.pageNumbers,
        };
        setMessages((prev) => [...prev, assistantMessage]);
      }
    } catch (error) {
      console.error("Error processing question:", error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content:
          "Desculpe, encontrei um erro ao processar a sua questão. Tente novamente.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const sampleQuestions = [
    "Quais são os efeitos secundários?",
    "Como devo tomar este medicamento?",
    "Quais são as contraindicações?",
  ];

  const handlePageReferenceClick = (pageNumber: number) => {
    jumpToPage(pageNumber);
  };

  const renderMessageContent = (message: ChatMessage) => {
    if (message.type === "user") {
      return <div className="text-sm leading-relaxed">{message.content}</div>;
    }

    // Format with markdown, then parse for page references
    const formatted = formatMessage(message.content);
    return (
      <div className="text-sm leading-relaxed space-y-1">
        {formatted.map((node, i) => {
          if (typeof node === "string") {
            return (
              <span key={i}>
                {parseMessageWithReferences(node, {
                  onPageClick: handlePageReferenceClick,
                })}
              </span>
            );
          }
          // For React elements (p, ul, ol etc.), we need to check if their children contain references
          return node;
        })}
      </div>
    );
  };

  return (
    <div className="bg-white flex flex-col h-full">
      {/* Disclaimer banner */}
      <div className="px-4 py-2 bg-primary-50 border-b border-primary-100 flex-shrink-0">
        <p className="text-xs text-primary-700 text-center">
          Respostas baseadas no folheto informativo oficial de {medicineName}.
        </p>
      </div>

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-4 pt-4 pb-2 min-h-0 scrollbar-thin"
      >
        <div className="max-w-2xl mx-auto space-y-1">
          {messages.map((message, index) => {
            const prevMessage = index > 0 ? messages[index - 1] : null;
            const sameSender = prevMessage?.type === message.type;
            const spacing = sameSender ? "mt-1" : "mt-4";

            return (
              <div
                key={message.id}
                className={`flex ${message.type === "user" ? "justify-end" : "justify-start"} ${index === 0 ? "" : spacing} animate-fade-in`}
              >
                <div
                  className={`max-w-[85%] md:max-w-[75%] ${
                    message.type === "user"
                      ? "bg-primary-600 text-white rounded-2xl rounded-br-md px-4 py-2.5 shadow-sm"
                      : "bg-gray-100 text-gray-800 rounded-2xl rounded-bl-md px-4 py-2.5"
                  }`}
                >
                  {renderMessageContent(message)}

                  {/* Source attribution for assistant messages */}
                  {message.type === "assistant" && message.sourcePages && message.sourcePages.length > 0 && (
                    <p className="text-xs text-gray-400 mt-2 pt-1.5 border-t border-gray-200">
                      Fonte: Folheto informativo, p. {message.sourcePages.join(", ")}
                    </p>
                  )}

                  <p
                    className={`text-xs mt-1 ${
                      message.type === "user" ? "text-primary-200" : "text-gray-400"
                    }`}
                  >
                    {message.timestamp.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="flex justify-start mt-4 animate-fade-in">
              <div className="bg-gray-100 text-gray-800 rounded-2xl rounded-bl-md px-4 py-2.5">
                <TypingDots />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Scroll to bottom button */}
      {showScrollButton && (
        <div className="relative">
          <button
            onClick={() => scrollToBottom("smooth")}
            className="absolute bottom-2 right-4 bg-white hover:bg-gray-50 text-gray-600 p-2.5 rounded-full shadow-lg border border-gray-200 transition-all z-10"
            aria-label="Scroll to bottom"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 14l-7 7m0 0l-7-7m7 7V3"
              />
            </svg>
          </button>
        </div>
      )}

      {/* Suggested questions — collapsible */}
      <div className="flex-shrink-0 border-t border-gray-100">
        {/* Toggle bar — only shows after first interaction */}
        {hasInteracted && (
          <button
            onClick={() => setSuggestionsOpen((v) => !v)}
            className="w-full flex items-center gap-2 px-4 py-2 text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
            </svg>
            <span className="font-medium">Sugestões</span>
            <svg
              className={`w-3 h-3 ml-auto transition-transform duration-200 ${suggestionsOpen ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
            </svg>
          </button>
        )}

        {/* Chips — animated open/close */}
        <div
          className={`overflow-hidden transition-all duration-250 ease-in-out ${
            suggestionsOpen ? "max-h-40 opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="px-4 pb-2 pt-1">
            <div className="max-w-2xl mx-auto flex flex-wrap gap-2">
              {sampleQuestions.map((sampleQ) => (
                <Chip
                  key={sampleQ}
                  onClick={() => handleAskQuestion(sampleQ)}
                  className="text-xs"
                >
                  {sampleQ}
                </Chip>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Input */}
      <div className="px-4 pb-4 pt-2 flex-shrink-0">
        <div className="max-w-2xl mx-auto flex gap-2">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Escreva a sua questão aqui..."
            className="flex-grow min-h-[44px] px-4 text-sm bg-gray-100 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent focus:bg-white transition-colors"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleAskQuestion();
              }
            }}
            disabled={loading}
          />
          <button
            onClick={() => handleAskQuestion()}
            disabled={loading || !question.trim()}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            aria-label="Enviar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Chat;

import { useState, useRef, useEffect } from "react";
import { queryLeafletPdf } from "../server/queryLeaflet";
import { usePDF } from "../context/PDFContext";
import { useScrollToBottom } from "../hooks/useScrollToBottom";
import { parseMessageWithReferences } from "../utils/parseReferences";

interface ChatMessage {
  id: string;
  type: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface ChatProps {
  pdfData: string;
  medicineName: string;
  initialOverview?: string;
}

const Chat = ({ pdfData, medicineName, initialOverview }: ChatProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { jumpToPage } = usePDF();
  const { showScrollButton, isAtBottom, scrollToBottom } = useScrollToBottom(
    messagesContainerRef,
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
  // Only auto-scroll if user was already at bottom or if it's their own message
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.type === "user" || isAtBottom) {
        scrollToBottom("smooth");
      }
    }
  }, [messages]);

  const handleAskQuestion = async () => {
    if (!question.trim() || !pdfData || loading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: "user",
      content: question,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setQuestion("");
    setLoading(true);

    try {
      const result = await queryLeafletPdf({
        data: {
          pdfBase64: pdfData,
          question: question,
        },
      });

      if (result.success && typeof result.answer === "string") {
        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          type: "assistant",
          content: result.answer,
          timestamp: new Date(),
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
    "O que devo fazer se me esquecer de uma dose?",
  ];

  const handlePageReferenceClick = (pageNumber: number) => {
    jumpToPage(pageNumber);
  };

  return (
    <div className="bg-white flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex-shrink-0">
        <h3 className="text-lg font-bold text-gray-800">
          Questões sobre {medicineName}
        </h3>
      </div>

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 scrollbar-thin"
      >
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] md:max-w-[75%] p-3 rounded-lg shadow-sm ${
                message.type === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              <div className="text-sm md:text-base leading-relaxed whitespace-pre-wrap">
                {message.type === "assistant"
                  ? parseMessageWithReferences(message.content, {
                      onPageClick: handlePageReferenceClick,
                    })
                  : message.content}
              </div>
              <p
                className={`text-xs mt-1.5 ${
                  message.type === "user" ? "text-blue-100" : "text-gray-500"
                }`}
              >
                {message.timestamp.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 text-gray-800 p-3 rounded-lg shadow-sm">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                <span className="text-sm">A pensar...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Scroll to bottom button */}
      {showScrollButton && (
        <button
          onClick={() => scrollToBottom("smooth")}
          className="fixed bottom-24 right-6 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition-all z-10"
          aria-label="Scroll to bottom"
        >
          <svg
            className="w-5 h-5"
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
      )}

      {/* Sample questions (only show if no messages yet) */}
      {messages.length <= 1 && (
        <div className="p-4 border-t border-gray-200 flex-shrink-0">
          <p className="text-sm text-gray-600 mb-2">Experimente perguntar:</p>
          <div className="flex flex-wrap gap-2">
            {sampleQuestions.map((sampleQ) => (
              <button
                key={sampleQ}
                onClick={() => setQuestion(sampleQ)}
                className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg transition-colors"
              >
                {sampleQ}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-gray-200 flex-shrink-0">
        <div className="flex space-x-2">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Escreva a sua questão aqui..."
            className="flex-grow p-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            onKeyPress={(e) => e.key === "Enter" && handleAskQuestion()}
            disabled={loading}
          />
          <button
            onClick={handleAskQuestion}
            disabled={loading || !question.trim()}
            className="bg-blue-600 text-white px-6 py-3 text-sm font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            Enviar
          </button>
        </div>
      </div>
    </div>
  );
};

export default Chat;

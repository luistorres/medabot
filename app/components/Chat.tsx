import { useState, useRef, useEffect } from "react";
import { queryLeafletPdf } from "../server/queryLeaflet";

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
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
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

  return (
    <div className="bg-white rounded-lg shadow-md flex flex-col h-140 md:h-160">
      {/* Header */}
      <div className="p-3 md:p-4 border-b border-gray-200">
        <h3 className="text-lg md:text-xl font-bold text-gray-800">
          Questões sobre {medicineName}
        </h3>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] md:max-w-[80%] p-2 md:p-3 rounded-lg ${
                message.type === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              <p className="text-sm md:text-base whitespace-pre-wrap leading-relaxed">
                {message.content}
              </p>
              <p
                className={`text-xs mt-1 ${
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
            <div className="bg-gray-100 text-gray-800 p-2 md:p-3 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-3 w-3 md:h-4 md:w-4 border-b-2 border-gray-600"></div>
                <span className="text-sm md:text-base">A pensar...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Sample questions (only show if no messages yet) */}
      {messages.length <= 1 && (
        <div className="p-3 md:p-4 border-t border-gray-200">
          <p className="text-xs md:text-sm text-gray-600 mb-2">
            Experimente perguntar:
          </p>
          <div className="flex flex-wrap gap-1 md:gap-2">
            {sampleQuestions.map((sampleQ) => (
              <button
                key={sampleQ}
                onClick={() => setQuestion(sampleQ)}
                className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded"
              >
                {sampleQ}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-3 md:p-4 border-t border-gray-200">
        <div className="flex space-x-2">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Escreva a sua questão aqui..."
            className="flex-grow p-2 text-sm md:text-base border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            onKeyPress={(e) => e.key === "Enter" && handleAskQuestion()}
            disabled={loading}
          />
          <button
            onClick={handleAskQuestion}
            disabled={loading || !question.trim()}
            className="bg-blue-600 text-white px-3 md:px-4 py-2 text-sm md:text-base rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            Enviar
          </button>
        </div>
      </div>
    </div>
  );
};

export default Chat;

import { useState, useRef, useEffect } from "react";
import { queryLeafletPdf } from "../server/queryLeaflet";
import { suggestFollowUps } from "../server/suggestFollowUps";
import { usePDF } from "../context/PDFContext";
import { useScrollToBottom } from "../hooks/useScrollToBottom";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { useRotatingPlaceholder } from "../hooks/useRotatingPlaceholder";
import { formatMessage } from "../utils/formatMessage";
import { isNotFoundAnswer } from "../utils/isNotFoundAnswer";
import Button from "./ui/Button";
import { Wordmark } from "./ui/Wordmark";
import { Icon } from "./ui/Icon";
import { SourceBadge } from "./ui/SourceBadge";
import { CitationRow } from "./ui/Citation";

interface ChatMessage {
  id: string;
  type: "user" | "assistant" | "error";
  content: string;
  timestamp: Date;
  sourcePages?: number[];
  /** Source chunks (text + page) the answer was grounded on — for PDF passage highlighting. */
  sources?: { page: number; text: string }[];
  sourceQuote?: string | null;
  sourceQuotePage?: number | null;
  isOverview?: boolean;
  /** Original question that triggered this error — for retry */
  retryQuestion?: string;
}

interface ChatProps {
  pdfData: string;
  /** Cache key for the already-parsed leaflet; lets chat turns skip re-uploading the PDF. */
  docId?: string;
  medicineName: string;
  initialOverview?: string;
  onBack?: () => void;
  dosage?: string;
}

const STATIC_SUGGESTIONS = [
  "Quais são os efeitos secundários?",
  "Como devo tomar este medicamento?",
  "Quais são as contraindicações?",
];

const PLACEHOLDER_PROMPTS = [
  "Posso tomar com café?",
  "E se for grávida?",
  "Há interações com álcool?",
];

const TypingDots = () => (
  <div className="flex items-center gap-1 px-1 py-1">
    {[0, 1, 2].map((i) => (
      <span
        key={i}
        className="w-2 h-2 bg-faint rounded-full animate-pulse-dot"
        style={{ animationDelay: `${i * 0.2}s` }}
      />
    ))}
  </div>
);

const buildOverviewMessage = (overview: string): ChatMessage => ({
  id: "overview",
  type: "assistant",
  content: overview,
  timestamp: new Date(),
  isOverview: true,
});

const Chat = ({
  pdfData,
  docId,
  medicineName,
  initialOverview,
  onBack,
  dosage,
}: ChatProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>(STATIC_SUGGESTIONS);
  // Suggestions start expanded, then auto-collapse once the conversation
  // begins (they cost too much vertical space on mobile while chatting).
  const [suggestionsExpanded, setSuggestionsExpanded] = useState(true);
  const hasAutoCollapsedSuggestions = useRef(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // Guards against out-of-order / post-unmount suggestion updates.
  const suggestionRequestId = useRef(0);
  // Guards against a stale in-flight answer landing after a reset/new question.
  const queryRequestId = useRef(0);
  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const { jumpToPage } = usePDF();
  const isDesktop = useMediaQuery("(min-width: 64rem)");
  const placeholder = useRotatingPlaceholder(
    PLACEHOLDER_PROMPTS,
    !inputFocused && question.length === 0
  );
  const { showScrollButton, isAtBottom, scrollToBottom } = useScrollToBottom(
    messagesContainerRef as React.RefObject<HTMLDivElement>,
    { threshold: 150 }
  );

  // Add initial overview as first message
  useEffect(() => {
    if (initialOverview && messages.length === 0) {
      setMessages([buildOverviewMessage(initialOverview)]);
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

  // Refresh suggested follow-up questions after each assistant answer.
  const refreshSuggestions = async (lastAnswer: string) => {
    const requestId = ++suggestionRequestId.current;
    // Only apply if this is still the latest request and we're mounted.
    const isStale = () =>
      !isMounted.current || requestId !== suggestionRequestId.current;
    try {
      const result = await suggestFollowUps({
        data: { lastAnswer, medicineName },
      });
      if (isStale()) return;
      if (Array.isArray(result) && result.length > 0) {
        setSuggestions(result);
      } else {
        setSuggestions(STATIC_SUGGESTIONS);
      }
    } catch {
      if (isStale()) return;
      setSuggestions(STATIC_SUGGESTIONS);
    }
  };

  const handleAskQuestion = async (q?: string) => {
    const text = q || question;
    if (!text.trim() || !pdfData || loading) return;

    // Auto-collapse the suggestions block the first time a question is asked.
    if (!hasAutoCollapsedSuggestions.current) {
      setSuggestionsExpanded(false);
      hasAutoCollapsedSuggestions.current = true;
    }

    const reqId = ++queryRequestId.current;
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: "user",
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => {
      let base = prev;
      const last = prev[prev.length - 1];
      if (last?.type === "error") {
        base = prev.slice(0, -1); // drop the stale error bubble on any new ask
        // On an exact retry, also drop the failed user bubble it retried (avoid dup).
        if (
          last.retryQuestion === text &&
          base[base.length - 1]?.type === "user" &&
          base[base.length - 1].content === text
        ) {
          base = base.slice(0, -1);
        }
      }
      return [...base, userMessage];
    });
    setQuestion("");
    setLoading(true);

    try {
      const history = messages
        .filter((m) => (m.type === "user" || m.type === "assistant") && !m.isOverview)
        .map((m) => ({
          role: m.type === "user" ? ("user" as const) : ("assistant" as const),
          content: m.content.replace(/==/g, ""),
        }));
      if (history.length > 0 && history[history.length - 1].role === "user") history.pop();

      // Prefer the lightweight docId (no PDF upload) when we have it; fall back to
      // the full PDF only if the server's cache no longer has it (DOC_NOT_CACHED).
      const baseData = { question: text, medicineName, history };
      let result = await queryLeafletPdf({
        data: docId ? { ...baseData, docId } : { ...baseData, pdfBase64: pdfData },
      });
      if (!result.success && result.error === "DOC_NOT_CACHED") {
        result = await queryLeafletPdf({
          data: { ...baseData, docId, pdfBase64: pdfData },
        });
      }

      // Reset/superseded while this query was in flight — drop the result.
      if (queryRequestId.current !== reqId) return;

      if (result.success && typeof result.answer === "string") {
        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          type: "assistant",
          content: result.answer,
          timestamp: new Date(),
          sourcePages: result.pageNumbers,
          sources: result.sources,
          sourceQuote: result.sourceQuote,
          sourceQuotePage: result.sourceQuotePage,
        };
        setMessages((prev) => [...prev, assistantMessage]);
        // Refresh suggestions based on the latest answer.
        void refreshSuggestions(result.answer);
      } else {
        // Backend reported failure without throwing — surface the same
        // retry-able error bubble as a thrown error rather than going silent.
        const errorMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          type: "error",
          content:
            "Não foi possível obter uma resposta neste momento. A sua questão foi guardada — pode tentar novamente.",
          timestamp: new Date(),
          retryQuestion: text,
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    } catch (error) {
      if (queryRequestId.current !== reqId) return;
      console.error("Error processing question:", error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: "error",
        content:
          "Não foi possível obter uma resposta neste momento. A sua questão foi guardada — pode tentar novamente.",
        timestamp: new Date(),
        retryQuestion: text,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      // Only clear loading for the current (non-superseded) request.
      if (queryRequestId.current === reqId) setLoading(false);
    }
  };

  // Refazer — reset the conversation to just the seed overview (or empty).
  const handleRefazer = () => {
    // Invalidate any in-flight suggestion AND answer request so a late
    // response can't repopulate the freshly reset conversation.
    suggestionRequestId.current++;
    queryRequestId.current++;
    setLoading(false);
    setMessages(initialOverview ? [buildOverviewMessage(initialOverview)] : []);
    setQuestion("");
    setSuggestions(STATIC_SUGGESTIONS);
    // Fresh conversation → re-expand suggestions and re-arm the auto-collapse.
    setSuggestionsExpanded(true);
    hasAutoCollapsedSuggestions.current = false;
  };

  const renderAssistantBody = (content: string) => {
    const formatted = formatMessage(content);
    return (
      <div className="font-serif text-[15px] leading-[1.6] text-ink space-y-1">
        {formatted.map((node, i) =>
          typeof node === "string" ? <span key={i}>{node}</span> : node,
        )}
      </div>
    );
  };

  return (
    <div className="bg-bg flex flex-col h-full">
      {/* Header — mobile only. On desktop the top bar + left medicine panel
          own the wordmark, medicine name, and source badge, so the chat column
          is just the conversation. */}
      {!isDesktop && (
        <header className="flex-shrink-0 border-b border-rule bg-bg px-4 pt-3.5 pb-3">
          {/* Row 1 */}
          <div className="flex items-center justify-between mb-1.5">
            {onBack ? (
              <button
                onClick={onBack}
                className="flex items-center justify-center min-w-[40px] min-h-[40px] -ml-2 text-ink-2 hover:text-ink transition-colors"
                aria-label="Início"
              >
                <Icon.back className="w-[18px] h-[18px]" />
              </button>
            ) : (
              <span className="w-[18px]" aria-hidden />
            )}
            <Wordmark size={16} />
            <button
              onClick={handleRefazer}
              className="text-[12px] font-medium text-muted hover:text-ink-2 transition-colors"
            >
              Refazer
            </button>
          </div>

          {/* Row 2 — always shown */}
          <div className="flex items-baseline justify-between gap-3">
            <h1 className="min-w-0 truncate">
              <span className="font-serif text-[22px] text-ink tracking-[-0.005em]">
                {medicineName}
              </span>
              {dosage && (
                <span className="ml-2 font-mono text-[13px] text-muted">
                  {dosage}
                </span>
              )}
            </h1>
            <SourceBadge medicine={medicineName} />
          </div>
        </header>
      )}

      {/* Conversation */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-4 pt-5 pb-2 min-h-0 scrollbar-thin"
      >
        <div className="max-w-2xl mx-auto flex flex-col gap-5">
          {/* Empty state — no messages yet */}
          {messages.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center py-12 text-center animate-fade-in">
              <Icon.search className="w-7 h-7 text-faint mb-3" />
              <p className="text-sm text-muted max-w-[260px]">
                Pergunte o que precisar sobre {medicineName}.
              </p>
            </div>
          )}

          {messages.map((message) => {
            // User message — small right-aligned bubble
            if (message.type === "user") {
              return (
                <div key={message.id} className="flex justify-end animate-fade-in">
                  <div
                    className="bg-brand-soft text-brand-ink px-3.5 py-2.5 max-w-[78%] leading-snug text-[14.5px] font-medium"
                    style={{ borderRadius: "16px 16px 4px 16px" }}
                  >
                    {message.content}
                  </div>
                </div>
              );
            }

            // Error message — error-soft box with retry link
            if (message.type === "error") {
              return (
                <div
                  key={message.id}
                  className="bg-error-soft text-error rounded-lg p-3 text-sm leading-relaxed animate-fade-in"
                >
                  <p>
                    Não foi possível obter uma resposta. Pode tentar novamente.
                  </p>
                  {message.retryQuestion && (
                    <Button
                      variant="link"
                      onClick={() => handleAskQuestion(message.retryQuestion)}
                      disabled={loading}
                      className="mt-1.5 inline-flex items-center gap-1.5"
                    >
                      <Icon.refresh className="w-3.5 h-3.5" />
                      Tentar novamente
                    </Button>
                  )}
                </div>
              );
            }

            // Assistant — "not found" answer gets the dashed note treatment
            if (isNotFoundAnswer(message.content)) {
              return (
                <div
                  key={message.id}
                  className="flex items-start gap-2 border border-dashed border-border bg-tint/60 rounded-lg p-3 italic text-ink-2 animate-fade-in"
                >
                  <Icon.search className="w-4 h-4 text-muted mt-0.5 flex-shrink-0" />
                  <p className="text-sm leading-relaxed">{message.content}</p>
                </div>
              );
            }

            // Assistant — document-as-conversation (vertical brand rule, no bubble)
            return (
              <div key={message.id} className="relative pl-4 animate-fade-in">
                <div
                  className="absolute left-0 top-1 bottom-1 w-0.5 bg-brand rounded-sm"
                  style={{ opacity: message.isOverview ? 1 : 0.4 }}
                />
                {message.isOverview && (
                  <p className="text-[11px] uppercase tracking-wider text-brand mb-2 font-medium">
                    Resumo do folheto
                  </p>
                )}
                {renderAssistantBody(message.content)}
                <CitationRow
                  pages={message.sourcePages ?? []}
                  onJump={jumpToPage}
                  sources={message.sources}
                  sourceQuote={message.sourceQuote}
                  sourceQuotePage={message.sourceQuotePage}
                />
              </div>
            );
          })}

          {loading && (
            <div className="relative pl-4 animate-fade-in">
              <div className="absolute left-0 top-1 bottom-1 w-0.5 bg-brand/40 rounded-sm" />
              <TypingDots />
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
            className="absolute bottom-2 right-4 bg-paper hover:bg-tint text-ink-2 p-2.5 rounded-full shadow-lg border border-border transition-all z-10"
            aria-label="Ir para o fim"
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

      {/* Suggested questions — collapsible vertical text-link list */}
      {suggestions.length > 0 && (
        <div className="flex-shrink-0 border-t border-rule bg-bg px-4 pt-2 pb-1.5">
          <div className="max-w-2xl mx-auto">
            <button
              type="button"
              onClick={() => setSuggestionsExpanded((v) => !v)}
              aria-expanded={suggestionsExpanded}
              aria-controls="chat-suggestions"
              className="flex items-center gap-1.5 py-1 text-[10px] uppercase tracking-wider text-muted font-medium hover:text-ink-2 transition-colors"
            >
              <span>Sugestões</span>
              <Icon.chevron
                className={`w-3 h-3 transition-transform duration-200 motion-reduce:transition-none ${
                  suggestionsExpanded ? "rotate-90" : ""
                }`}
              />
            </button>
            <div
              id="chat-suggestions"
              aria-hidden={!suggestionsExpanded}
              className={`grid transition-[grid-template-rows] duration-200 motion-reduce:transition-none ${
                suggestionsExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              }`}
            >
              <div className="overflow-hidden">
                <div className="flex flex-col gap-1.5 pt-1">
                  {suggestions.map((q) => (
                    <button
                      key={q}
                      onClick={() => handleAskQuestion(q)}
                      disabled={loading}
                      tabIndex={suggestionsExpanded ? 0 : -1}
                      className="flex items-center gap-2 text-left py-1.5 text-sm text-ink-2 hover:text-ink disabled:opacity-50 transition-colors"
                    >
                      <Icon.arrow className="text-accent w-4 h-4 flex-shrink-0" />
                      <span>{q}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Composer */}
      <div className="flex-shrink-0 bg-bg px-4 pb-3 pt-2.5">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-2 bg-paper border border-border rounded-lg pl-3.5 pr-1.5 py-1.5">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              placeholder={placeholder}
              className="flex-grow min-w-0 bg-transparent border-0 text-ink placeholder:text-muted focus:outline-none py-1.5"
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
              className="flex items-center justify-center w-9 h-9 bg-brand text-white rounded-sm hover:bg-brand-deep disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
              aria-label="Enviar pergunta"
            >
              <Icon.send className="w-[18px] h-[18px]" />
            </button>
          </div>
          {/* On mobile the pinned disclaimer costs scarce vertical space, so show
              it on the initial screen (seen once) and drop it after the first
              question. Desktop keeps it persistent — there's room. */}
          {(isDesktop || !messages.some((m) => m.type === "user")) && (
            <p className="mt-2 text-[11px] leading-snug text-muted text-center">
              O Medabot explica o folheto. Não substitui o seu médico ou farmacêutico.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Chat;

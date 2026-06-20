import { useState, useRef, useEffect } from "react";
import { Link } from "react-router";
import { ProblemBanner } from "@shared/ui/ProblemBanner";
import { normalizeApiProblem } from "@shared/api/problem";
import { cn } from "@shared/lib/cn";
import { useRagChat } from "./hooks/use-ai";
import type { RagChatMessageModel, RagSearchHitModel } from "@shared/api/types";

// ---- Intent -----------------------------------------------------------------
// Who: A user who wants to ask questions grounded in their document corpus.
// Task: Type a question, get an AI answer with source citations.
// Feel: Conversational, trustworthy, shows evidence — not a black box.

// ---- Sub-components ---------------------------------------------------------

interface CitationCardProps {
  citation: RagSearchHitModel;
  index: number;
}

function CitationCard({ citation, index }: CitationCardProps) {
  const [expanded, setExpanded] = useState(false);
  const preview = citation.content?.slice(0, 100) ?? "";
  const isLong = (citation.content?.length ?? 0) > 100;

  return (
    <div
      data-testid={`citation-${index}`}
      className="rounded-[8px] p-3"
      style={{ backgroundColor: "var(--color-stone-surface)" }}
    >
      <div className="mb-1.5 flex items-center gap-2">
        <span
          className="flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-semibold text-white"
          style={{ backgroundColor: "var(--color-graphite)" }}
        >
          {index + 1}
        </span>
        <Link
          to={`/documents/${citation.documentId}`}
          className="text-[12px] font-medium no-underline transition-colors"
          style={{ color: "var(--color-ember-orange)" }}
        >
          View source
        </Link>
        <span className="text-[11px]" style={{ color: "var(--color-ash)" }}>
          score: {citation.score.toFixed(2)}
        </span>
      </div>
      {citation.content && (
        <>
          <p
            className="text-[12px] leading-[1.6]"
            style={{ color: "var(--color-graphite)" }}
          >
            {expanded ? citation.content : preview}
            {isLong && !expanded && "…"}
          </p>
          {isLong && (
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="mt-1 text-[11px] font-medium"
              style={{ color: "var(--color-ember-orange)" }}
            >
              {expanded ? "Less" : "More"}
            </button>
          )}
        </>
      )}
    </div>
  );
}

interface ChatMessageProps {
  message: RagChatMessageModel;
}

function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={cn("flex", isUser ? "justify-end" : "justify-start")}
    >
      <div
        className={cn(
          "max-w-[75%] rounded-[10px] px-4 py-3",
          isUser ? "rounded-br-[4px]" : "rounded-bl-[4px]"
        )}
        style={{
          backgroundColor: isUser
            ? "var(--color-ember-orange)"
            : "var(--color-parchment-card)",
          color: isUser ? "#fff" : "var(--color-charcoal-primary)",
          boxShadow: isUser ? "none" : "var(--shadow-subtle)",
        }}
      >
        <p
          data-testid={isUser ? "chat-user-message" : "chat-answer"}
          className="text-[14px] leading-[1.6] whitespace-pre-wrap"
        >
          {message.content}
        </p>

        {!isUser && message.citations && message.citations.length > 0 && (
          <div
            data-testid="citations-list"
            className="mt-3 space-y-2"
          >
            <p
              className="text-[11px] font-semibold uppercase tracking-wide"
              style={{ color: "var(--color-graphite)" }}
            >
              Sources
            </p>
            {message.citations.map((c, i) => (
              <CitationCard key={c.chunkId} citation={c} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---- Main page --------------------------------------------------------------

export function RagChatPage() {
  const [messages, setMessages] = useState<RagChatMessageModel[]>([]);
  const [input, setInput] = useState("");
  const [apiError, setApiError] = useState<ReturnType<typeof normalizeApiProblem>>(null);
  const chatMutation = useRagChat();
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (bottomRef.current && typeof bottomRef.current.scrollIntoView === "function") {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  async function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || chatMutation.isPending) return;

    setApiError(null);
    setInput("");

    // Optimistically add user message
    setMessages((prev) => [
      ...prev,
      { role: "user" as const, content: trimmed },
    ]);

    try {
      const response = await chatMutation.mutateAsync({ message: trimmed });
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant" as const,
          content: response.answer,
          citations: response.citations,
        },
      ]);
    } catch (err) {
      const p = normalizeApiProblem(
        (err as { response?: { data?: unknown } })?.response?.data,
        (err as { response?: { status?: number } })?.response?.status ?? 500,
      );
      setApiError(
        p ?? {
          type: "about:blank",
          title: "Chat failed",
          status: 500,
          detail: "Could not get a response. Please try again.",
        }
      );
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }

  const isEmpty = messages.length === 0;

  return (
    <main
      data-testid="rag-chat-page"
      className="mx-auto flex max-w-[800px] flex-col px-6"
      style={{ height: "calc(100vh - 64px)" }}
    >
      {/* Header */}
      <div className="shrink-0 py-8">
        <h1
          className="mb-1 text-[23px] font-semibold"
          style={{ color: "var(--color-charcoal-primary)", letterSpacing: "-0.44px" }}
        >
          RAG Chat
        </h1>
        <p className="text-[15px]" style={{ color: "var(--color-ash)" }}>
          Ask questions grounded in your document library.
        </p>
      </div>

      {/* API error */}
      {apiError && (
        <div className="shrink-0 pb-4">
          <ProblemBanner
            problem={apiError}
            onDismiss={() => setApiError(null)}
          />
        </div>
      )}

      {/* Chat area */}
      <div className="min-h-0 flex-1 overflow-y-auto pb-4">
        {isEmpty && (
          <div
            data-testid="chat-empty-state"
            className="flex h-full flex-col items-center justify-center text-center"
          >
            <div
              className="mb-4 flex h-14 w-14 items-center justify-center rounded-full text-[24px]"
              style={{ backgroundColor: "var(--color-stone-surface)" }}
            >
              💬
            </div>
            <h2
              className="mb-2 text-[17px] font-semibold"
              style={{ color: "var(--color-charcoal-primary)" }}
            >
              Ask your documents
            </h2>
            <p
              className="max-w-[320px] text-[14px]"
              style={{ color: "var(--color-ash)" }}
            >
              Type a question below. Your answer will be grounded in your{" "}
              <Link
                to="/documents"
                className="font-medium no-underline"
                style={{ color: "var(--color-ember-orange)" }}
              >
                document library
              </Link>
              .
            </p>
          </div>
        )}

        {!isEmpty && (
          <div className="space-y-4">
            {messages.map((msg, i) => (
              <ChatMessage key={i} message={msg} />
            ))}
            {chatMutation.isPending && (
              <div className="flex justify-start">
                <div
                  className="rounded-[10px] rounded-bl-[4px] px-4 py-3"
                  style={{ backgroundColor: "var(--color-parchment-card)" }}
                >
                  <div className="flex items-center gap-1">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="h-2 w-2 animate-bounce rounded-full"
                        style={{
                          backgroundColor: "var(--color-graphite)",
                          animationDelay: `${i * 0.1}s`,
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input area */}
      <div
        className="shrink-0 border-t py-4"
        style={{ borderColor: "var(--color-fog)" }}
      >
        <div className="flex items-end gap-3">
          <textarea
            data-testid="chat-input"
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question… (Enter to send, Shift+Enter for newline)"
            className="min-h-[56px] flex-1 resize-none rounded-[10px] border-0 px-4 py-3 text-[14px] leading-[1.5] outline-none focus:ring-2"
            style={{
              backgroundColor: "var(--color-parchment-card)",
              color: "var(--color-charcoal-primary)",
            }}
          />
          <button
            type="button"
            data-testid="chat-send-btn"
            onClick={handleSend}
            disabled={!input.trim() || chatMutation.isPending}
            className="shrink-0 rounded-[32px] px-5 py-2.5 text-[14px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            style={{ backgroundColor: "var(--color-ember-orange)" }}
          >
            Send
          </button>
        </div>
      </div>
    </main>
  );
}

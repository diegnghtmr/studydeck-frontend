import { useState, useRef, useEffect } from "react";
import { useTranslation } from 'react-i18next';
import { ProblemBanner } from "@shared/ui/ProblemBanner";
import { normalizeApiProblem } from "@shared/api/problem";
import { cn } from "@shared/lib/cn";
import { useRagChat } from "./hooks/use-ai";
import { useDocuments } from "@features/documents/hooks/use-documents";
import type { RagChatMessageModel, RagSearchHitModel } from "@shared/api/types";

// ---- Intent -----------------------------------------------------------------
// Who: A user who wants to ask questions grounded in their document corpus.
// Task: Type a question, get an AI answer with source citations.
// Feel: Conversational, trustworthy, shows evidence — not a black box.

// ---- File icon SVG ----------------------------------------------------------

function FileIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <path
        d="M2.5 1.5h5l2 2v7a.5.5 0 0 1-.5.5h-7a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5Z"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      <path
        d="M7.5 1.5v2h2"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ---- Send arrow icon --------------------------------------------------------

function SendArrowIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M9 13V5M9 5L5.5 8.5M9 5L12.5 8.5"
        stroke="white"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ---- Source citation chip ---------------------------------------------------

interface SourceChipProps {
  citation: RagSearchHitModel;
  index: number;
}

function SourceChip({ citation, index }: SourceChipProps) {
  const { t } = useTranslation('ai');
  const label = citation.content
    ? citation.content.slice(0, 40) + (citation.content.length > 40 ? "…" : "")
    : t('ragChat.sourceChip', { index: index + 1 });

  return (
    <span
      data-testid={`citation-chip-${index}`}
      className="inline-flex items-center gap-1.5"
      style={{
        backgroundColor: "#eaf4ff",
        color: "#0086fc",
        borderRadius: "7px",
        padding: "3px 8px",
        fontSize: "12px",
        lineHeight: 1.4,
      }}
    >
      <FileIcon />
      {label}
    </span>
  );
}

// ---- Chat message -----------------------------------------------------------

interface ChatMessageProps {
  message: RagChatMessageModel;
}

function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn("max-w-[80%]")}
        style={{
          backgroundColor: isUser ? "#121212" : "#ffffff",
          color: isUser ? "#ffffff" : "#474645",
          borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
          padding: "12px 16px",
          boxShadow: isUser
            ? "none"
            : "color(display-p3 0.94902 0.941176 0.929412) 0px 0px 0px 1px inset",
        }}
      >
        <p
          data-testid={isUser ? "chat-user-message" : "chat-answer"}
          style={{
            fontSize: "14.5px",
            lineHeight: 1.6,
            margin: 0,
            whiteSpace: "pre-wrap",
          }}
        >
          {message.content}
        </p>

        {!isUser && message.citations && message.citations.length > 0 && (
          <div
            data-testid="citations-list"
            className="mt-3 flex flex-wrap gap-2"
          >
            {message.citations.map((c, i) => (
              <SourceChip key={c.chunkId} citation={c} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---- Typing indicator -------------------------------------------------------

function TypingBubble() {
  return (
    <div className="flex justify-start">
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "18px 18px 18px 4px",
          padding: "14px 18px",
          boxShadow:
            "color(display-p3 0.94902 0.941176 0.929412) 0px 0px 0px 1px inset",
        }}
      >
        <div className="flex items-center gap-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="animate-bounce rounded-full"
              style={{
                width: 7,
                height: 7,
                backgroundColor: "#c6c6c6",
                animationDelay: `${i * 0.12}s`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ---- Empty state ------------------------------------------------------------

function EmptyState() {
  const { t } = useTranslation('ai');
  return (
    <div
      data-testid="chat-empty-state"
      className="flex h-full flex-col items-center justify-center text-center"
      style={{ padding: "48px 24px" }}
    >
      <div
        className="mb-5 flex items-center justify-center"
        style={{
          width: 52,
          height: 52,
          borderRadius: "50%",
          backgroundColor: "#f2f0ed",
          fontSize: 22,
        }}
      >
        💬
      </div>
      <p
        style={{
          fontSize: 16,
          fontWeight: 600,
          color: "#343433",
          margin: "0 0 8px",
        }}
      >
        {t('ragChat.emptyHeading')}
      </p>
      <p
        style={{
          fontSize: 14,
          color: "#a7a7a7",
          margin: 0,
          maxWidth: 320,
          lineHeight: 1.6,
        }}
      >
        {t('ragChat.emptyBody')}
      </p>
    </div>
  );
}

// ---- Documents indexed badge ------------------------------------------------

function DocumentsBadge() {
  const { t } = useTranslation('ai');
  // Filter to only completed/indexed documents for an honest count.
  // The ingestStatus filter is not supported by the list endpoint in all
  // backend versions, so we fetch size=1 of all docs and use totalElements
  // as a "total uploaded" proxy. If the data is unavailable we omit the count.
  const { data } = useDocuments({ size: 1 });
  const total = data?.page.totalElements;

  return (
    <div
      data-testid="documents-indexed-badge"
      className="inline-flex items-center gap-2"
      style={{
        backgroundColor: "#f8f7f4",
        borderRadius: "20px",
        padding: "7px 12px",
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: "50%",
          backgroundColor: "#00ca48",
          flexShrink: 0,
          display: "inline-block",
        }}
      />
      <span style={{ fontSize: 12, fontWeight: 500, color: "#474645" }}>
        {total !== undefined
          ? t('ragChat.documentsBadge', { count: total })
          : t('ragChat.documentsBadgeFallback')}
      </span>
    </div>
  );
}

// ---- Main page --------------------------------------------------------------

export function RagChatPage() {
  const { t } = useTranslation('ai');
  const [messages, setMessages] = useState<RagChatMessageModel[]>([]);
  const [input, setInput] = useState("");
  const [apiError, setApiError] = useState<ReturnType<typeof normalizeApiProblem>>(null);
  const chatMutation = useRagChat();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (
      bottomRef.current &&
      typeof bottomRef.current.scrollIntoView === "function"
    ) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  async function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || chatMutation.isPending) return;

    setApiError(null);
    setInput("");

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
          title: t('ragChat.errors.chatFailed'),
          status: 500,
          detail: t('ragChat.errors.chatFailedDetail'),
        },
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
  const canSend = input.trim().length > 0 && !chatMutation.isPending;

  return (
    <main
      data-testid="rag-chat-page"
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header bar */}
      <div
        style={{
          padding: "22px 32px",
          borderBottom: "1px solid #f2f0ed",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <div>
          <p
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: "#343433",
              margin: 0,
              lineHeight: 1.25,
            }}
          >
            {t('ragChat.heading')}
          </p>
          <p
            style={{
              fontSize: 13,
              color: "#a7a7a7",
              margin: "2px 0 0",
              lineHeight: 1.4,
            }}
          >
            {t('ragChat.subtitle')}
          </p>
        </div>

        <DocumentsBadge />
      </div>

      {/* API error */}
      {apiError && (
        <div style={{ flexShrink: 0, padding: "12px 32px 0" }}>
          <ProblemBanner problem={apiError} onDismiss={() => setApiError(null)} />
        </div>
      )}

      {/* Messages area */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "32px",
        }}
      >
        <div
          style={{
            maxWidth: 720,
            margin: "0 auto",
            display: "flex",
            flexDirection: "column",
            gap: 20,
            height: isEmpty ? "100%" : undefined,
          }}
        >
          {isEmpty ? (
            <EmptyState />
          ) : (
            <>
              {messages.map((msg, i) => (
                <ChatMessage key={i} message={msg} />
              ))}
              {chatMutation.isPending && <TypingBubble />}
              <div ref={bottomRef} />
            </>
          )}
        </div>
      </div>

      {/* Input area */}
      <div
        style={{
          padding: "20px 32px 28px",
          borderTop: "1px solid #f2f0ed",
          flexShrink: 0,
        }}
      >
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          {/* Pill-shaped input wrapper */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              backgroundColor: "#ffffff",
              borderRadius: "32px",
              padding: "6px 6px 6px 20px",
              boxShadow:
                "color(display-p3 0.94902 0.941176 0.929412) 0px 0px 0px 1px inset",
              gap: 8,
            }}
          >
            <textarea
              data-testid="chat-input"
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('ragChat.inputPlaceholder')}
              style={{
                flex: 1,
                border: "none",
                outline: "none",
                background: "transparent",
                resize: "none",
                fontSize: 14,
                lineHeight: 1.6,
                color: "#343433",
                padding: "6px 0",
                fontFamily: "inherit",
                minHeight: 30,
                maxHeight: 120,
                overflowY: "auto",
              }}
              onInput={(e) => {
                const el = e.currentTarget;
                el.style.height = "auto";
                el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
              }}
            />
            <button
              type="button"
              data-testid="chat-send-btn"
              onClick={() => void handleSend()}
              disabled={!canSend}
              aria-label={t('ragChat.sendMessage')}
              style={{
                width: 42,
                height: 42,
                borderRadius: "50%",
                backgroundColor: canSend ? "#121212" : "#c6c6c6",
                border: "none",
                cursor: canSend ? "pointer" : "not-allowed",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                transition: "background-color 0.15s ease",
              }}
            >
              <SendArrowIcon />
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

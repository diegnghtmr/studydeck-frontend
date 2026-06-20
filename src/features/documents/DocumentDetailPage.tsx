import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router";
import { ProblemBanner } from "@shared/ui/ProblemBanner";
import { normalizeApiProblem } from "@shared/api/problem";
import { useDocument, useDocumentChunks, useIngestDocument, useDeleteDocument } from "./hooks/use-documents";
import type { ChunkModel } from "@shared/api/types";

// ---- Intent -----------------------------------------------------------------
// Who: A user managing a specific document in their corpus.
// Task: View metadata, see chunks, trigger re-ingest, delete.
// Feel: Informative, in-control, warm.

// ---- Ingest status styles ---------------------------------------------------

const INGEST_STATUS_STYLE = {
  registered: { label: "Registered", color: "var(--color-graphite)" },
  pending: { label: "Pending", color: "var(--color-deep-amber)" },
  processing: { label: "Processing...", color: "var(--color-ember-orange)" },
  completed: { label: "Ready", color: "var(--color-valid-green)" },
  failed: { label: "Failed", color: "var(--color-coral-red)" },
} as const;

// ---- Sub-components ---------------------------------------------------------

interface ChunkCardProps {
  chunk: ChunkModel;
  index: number;
}

function ChunkCard({ chunk, index }: ChunkCardProps) {
  const [expanded, setExpanded] = useState(false);
  const preview = chunk.content.slice(0, 120);
  const isLong = chunk.content.length > 120;

  return (
    <div
      data-testid={`chunk-card-${chunk.id}`}
      className="rounded-[8px] p-4"
      style={{ backgroundColor: "var(--color-stone-surface)" }}
    >
      <div className="mb-2 flex items-center gap-2">
        <span
          className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold text-white"
          style={{ backgroundColor: "var(--color-graphite)" }}
        >
          {index + 1}
        </span>
        {chunk.tokenCount !== undefined && (
          <span className="text-[11px]" style={{ color: "var(--color-ash)" }}>
            {chunk.tokenCount} tokens
          </span>
        )}
      </div>
      <p
        className="text-[13px] leading-[1.6]"
        style={{ color: "var(--color-charcoal-primary)" }}
      >
        {expanded ? chunk.content : preview}
        {isLong && !expanded && "…"}
      </p>
      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="mt-1 text-[12px] font-medium"
          style={{ color: "var(--color-ember-orange)" }}
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
}

// ---- Main page --------------------------------------------------------------

export function DocumentDetailPage() {
  const { documentId = "" } = useParams<{ documentId: string }>();
  const navigate = useNavigate();

  const { data: document, isLoading: docLoading } = useDocument(documentId);
  const { data: chunksData, isLoading: chunksLoading } = useDocumentChunks(documentId);
  const ingestMutation = useIngestDocument(documentId);
  const deleteMutation = useDeleteDocument(documentId);

  const [apiError, setApiError] = useState<ReturnType<typeof normalizeApiProblem>>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isLoading = docLoading;

  async function handleReingest() {
    setApiError(null);
    try {
      await ingestMutation.mutateAsync(undefined);
    } catch (err) {
      const p = normalizeApiProblem(
        (err as { response?: { data?: unknown } })?.response?.data,
        (err as { response?: { status?: number } })?.response?.status ?? 500,
      );
      setApiError(p ?? { type: "about:blank", title: "Ingest failed", status: 500 });
    }
  }

  async function handleDelete() {
    setApiError(null);
    try {
      await deleteMutation.mutateAsync();
      navigate("/documents");
    } catch (err) {
      const p = normalizeApiProblem(
        (err as { response?: { data?: unknown } })?.response?.data,
        (err as { response?: { status?: number } })?.response?.status ?? 500,
      );
      setApiError(p ?? { type: "about:blank", title: "Delete failed", status: 500 });
      setShowDeleteConfirm(false);
    }
  }

  if (isLoading) {
    return (
      <main
        data-testid="document-detail"
        className="mx-auto max-w-[800px] px-6 py-12"
      >
        <div
          data-testid="loading-state"
          className="flex items-center justify-center py-24"
        >
          <div
            className="h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"
            style={{ borderColor: "var(--color-ember-orange)" }}
          />
        </div>
      </main>
    );
  }

  if (!document) return null;

  const statusStyle = INGEST_STATUS_STYLE[document.ingestStatus] ?? INGEST_STATUS_STYLE.registered;

  return (
    <main
      data-testid="document-detail"
      className="mx-auto max-w-[800px] px-6 py-12"
    >
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-[13px]" aria-label="Breadcrumb">
        <Link
          to="/documents"
          className="no-underline transition-colors"
          style={{ color: "var(--color-graphite)" }}
        >
          Document Library
        </Link>
        <span style={{ color: "var(--color-ash)" }}>/</span>
        <span
          className="truncate font-medium"
          style={{ color: "var(--color-charcoal-primary)" }}
        >
          {document.title}
        </span>
      </nav>

      {/* API error */}
      {apiError && (
        <ProblemBanner
          problem={apiError}
          className="mb-6"
          onDismiss={() => setApiError(null)}
        />
      )}

      {/* Header card */}
      <div
        className="mb-6 rounded-[10px] p-6"
        style={{
          backgroundColor: "var(--color-parchment-card)",
          boxShadow: "var(--shadow-subtle)",
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h1
              className="mb-2 text-[23px] font-semibold"
              style={{ color: "var(--color-charcoal-primary)", letterSpacing: "-0.44px" }}
            >
              {document.title}
            </h1>
            <div className="flex flex-wrap items-center gap-3">
              <span
                data-testid="detail-ingest-status"
                className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                style={{
                  backgroundColor: `${statusStyle.color}1a`,
                  color: statusStyle.color,
                }}
              >
                {statusStyle.label}
              </span>
              <span className="text-[13px]" style={{ color: "var(--color-ash)" }}>
                {document.sourceType === "pasted-text" ? "Pasted text" : document.sourceType}
              </span>
              {document.chunkCount !== undefined && (
                <span className="text-[13px]" style={{ color: "var(--color-ash)" }}>
                  {document.chunkCount} chunks
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              data-testid="reingest-btn"
              onClick={handleReingest}
              disabled={ingestMutation.isPending}
              className="rounded-[32px] px-4 py-2 text-[13px] font-medium transition-opacity hover:opacity-80 disabled:opacity-50"
              style={{
                backgroundColor: "var(--color-stone-surface)",
                color: "var(--color-graphite)",
              }}
            >
              {ingestMutation.isPending ? "Ingesting…" : "Re-ingest"}
            </button>
            <button
              type="button"
              data-testid="delete-doc-btn"
              onClick={() => setShowDeleteConfirm(true)}
              className="rounded-[32px] px-4 py-2 text-[13px] font-medium transition-opacity hover:opacity-80"
              style={{
                backgroundColor: "var(--color-stone-surface)",
                color: "var(--color-coral-red)",
              }}
            >
              Delete
            </button>
          </div>
        </div>

        {/* Delete confirmation */}
        {showDeleteConfirm && (
          <div
            className="mt-4 rounded-[8px] p-4"
            style={{ backgroundColor: "var(--color-stone-surface)" }}
          >
            <p
              className="mb-3 text-[14px]"
              style={{ color: "var(--color-charcoal-primary)" }}
            >
              Delete this document permanently? This cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                data-testid="confirm-delete-btn"
                className="rounded-[32px] px-4 py-1.5 text-[13px] font-medium text-white disabled:opacity-50"
                style={{ backgroundColor: "var(--color-coral-red)" }}
              >
                {deleteMutation.isPending ? "Deleting…" : "Delete"}
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="rounded-[32px] px-4 py-1.5 text-[13px] font-medium"
                style={{
                  backgroundColor: "transparent",
                  color: "var(--color-graphite)",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Chunks section */}
      <section>
        <h2
          className="mb-4 text-[17px] font-semibold"
          style={{ color: "var(--color-charcoal-primary)" }}
        >
          Chunks
        </h2>

        {chunksLoading && (
          <p className="text-[14px]" style={{ color: "var(--color-ash)" }}>
            Loading chunks…
          </p>
        )}

        {!chunksLoading && chunksData && chunksData.items.length === 0 && (
          <p
            className="text-[14px]"
            style={{ color: "var(--color-ash)" }}
          >
            No chunks yet. Trigger ingest to generate embeddings.
          </p>
        )}

        {!chunksLoading && chunksData && chunksData.items.length > 0 && (
          <div data-testid="chunks-list" className="space-y-3">
            {chunksData.items.map((chunk, i) => (
              <ChunkCard key={chunk.id} chunk={chunk} index={i} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

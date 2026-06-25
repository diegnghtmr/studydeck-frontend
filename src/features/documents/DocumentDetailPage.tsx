import { useState } from "react";
import { useParams, useNavigate } from "react-router";
import { useTranslation } from 'react-i18next';
import { ProblemBanner } from "@shared/ui/ProblemBanner";
import { Breadcrumb } from "@shared/ui/Breadcrumb";
import { PillButton } from "@shared/ui/PillButton";
import { Badge } from "@shared/ui/Badge";
import { normalizeApiProblem } from "@shared/api/problem";
import { useDocument, useDocumentChunks, useIngestDocument, useDeleteDocument } from "./hooks/use-documents";
import type { ChunkModel } from "@shared/api/types";

// ---- Intent -----------------------------------------------------------------
// Who: A user managing a specific document in their corpus.
// Task: View metadata, see chunks, trigger re-ingest, delete.
// Feel: Informative, in-control, warm.

// ---- Ingest status styles ---------------------------------------------------

const INGEST_STATUS_STYLE = {
  registered: { color: "var(--color-graphite)" },
  pending: { color: "var(--color-deep-amber)" },
  processing: { color: "var(--color-ember-orange)" },
  completed: { color: "var(--color-valid-green)" },
  failed: { color: "var(--color-coral-red)" },
} as const;

// ---- Sub-components ---------------------------------------------------------

interface ChunkCardProps {
  chunk: ChunkModel;
  index: number;
}

function ChunkCard({ chunk, index }: ChunkCardProps) {
  const { t } = useTranslation('documents');
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
            {t('detail.tokens', { count: chunk.tokenCount })}
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
          {expanded ? t('detail.showLess') : t('detail.showMore')}
        </button>
      )}
    </div>
  );
}

// ---- Main page --------------------------------------------------------------

export function DocumentDetailPage() {
  const { t } = useTranslation('documents');
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
      setApiError(p ?? { type: "about:blank", title: t('detail.errors.ingestFailed'), status: 500 });
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
      setApiError(p ?? { type: "about:blank", title: t('detail.errors.deleteFailed'), status: 500 });
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
  const ingestStatusLabelMap: Record<typeof document.ingestStatus, string> = {
    registered: t('detail.ingestStatus.registered'),
    pending: t('detail.ingestStatus.pending'),
    processing: t('detail.ingestStatus.processing'),
    completed: t('detail.ingestStatus.ready'),
    failed: t('detail.ingestStatus.failed'),
  };
  const ingestStatusLabel = ingestStatusLabelMap[document.ingestStatus] ?? ingestStatusLabelMap.registered;

  return (
    <main
      data-testid="document-detail"
      className="mx-auto max-w-[800px] px-6 py-12"
    >
      <Breadcrumb
        items={[
          { label: t('detail.breadcrumb'), href: "/documents" },
          { label: document.title },
        ]}
      />

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
              <Badge
                data-testid="detail-ingest-status"
                label={ingestStatusLabel}
                shape="pill"
                bg={`${statusStyle.color}1a`}
                color={statusStyle.color}
              />
              <span className="text-[13px]" style={{ color: "var(--color-ash)" }}>
                {document.sourceType === "pasted-text" ? t('detail.sourceType.pastedText') : document.sourceType}
              </span>
              {document.chunkCount !== undefined && (
                <span className="text-[13px]" style={{ color: "var(--color-ash)" }}>
                  {t('detail.chunks', { count: document.chunkCount })}
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <PillButton
              type="button"
              variant="secondary"
              size="sm"
              data-testid="reingest-btn"
              onClick={handleReingest}
              disabled={ingestMutation.isPending}
            >
              {ingestMutation.isPending ? t('detail.reingestingBtn') : t('detail.reingestBtn')}
            </PillButton>
            <PillButton
              type="button"
              variant="ghost-danger"
              size="sm"
              data-testid="delete-doc-btn"
              onClick={() => setShowDeleteConfirm(true)}
            >
              {t('detail.deleteBtn')}
            </PillButton>
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
              {t('detail.deleteConfirm')}
            </p>
            <div className="flex gap-2">
              <PillButton
                type="button"
                variant="danger"
                size="sm"
                data-testid="confirm-delete-btn"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? t('detail.deletingBtn') : t('detail.confirmDeleteBtn')}
              </PillButton>
              <PillButton
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setShowDeleteConfirm(false)}
              >
                {t('detail.cancelBtn')}
              </PillButton>
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
          {t('detail.chunksHeading')}
        </h2>

        {chunksLoading && (
          <p className="text-[14px]" style={{ color: "var(--color-ash)" }}>
            {t('detail.chunksLoading')}
          </p>
        )}

        {!chunksLoading && chunksData && chunksData.items.length === 0 && (
          <p
            className="text-[14px]"
            style={{ color: "var(--color-ash)" }}
          >
            {t('detail.chunksEmpty')}
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

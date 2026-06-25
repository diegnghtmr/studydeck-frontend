import { useState } from "react";
import { Link } from "react-router";
import { useTranslation } from 'react-i18next';
import { ProblemBanner } from "@shared/ui/ProblemBanner";
import { normalizeApiProblem } from "@shared/api/problem";
import { useDocuments, useCreateDocument, useIngestDocument } from "./hooks/use-documents";
import type { DocumentModel } from "@shared/api/types";

// ---- Intent -----------------------------------------------------------------
// Who: A StudyDeck user managing their document corpus for RAG.
// Task: See all uploaded documents, add a new one (paste text), trigger ingest.
// Feel: Clean, informative, warm — not a scary file manager.

// ---- Sub-components ---------------------------------------------------------

const INGEST_STATUS_STYLE = {
  registered: { color: "var(--color-graphite)" },
  pending: { color: "var(--color-deep-amber)" },
  processing: { color: "var(--color-ember-orange)" },
  completed: { color: "var(--color-valid-green)" },
  failed: { color: "var(--color-coral-red)" },
} as const;

interface IngestBadgeProps {
  status: DocumentModel["ingestStatus"];
  documentId: string;
}

function IngestBadge({ status, documentId }: IngestBadgeProps) {
  const { t } = useTranslation('documents');
  const style = INGEST_STATUS_STYLE[status] ?? INGEST_STATUS_STYLE.registered;
  const labelMap: Record<DocumentModel["ingestStatus"], string> = {
    registered: t('library.ingestStatus.registered'),
    pending: t('library.ingestStatus.pending'),
    processing: t('library.ingestStatus.processing'),
    completed: t('library.ingestStatus.ready'),
    failed: t('library.ingestStatus.failed'),
  };
  const label = labelMap[status] ?? labelMap.registered;
  return (
    <span
      data-testid={`ingest-status-${documentId}`}
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
      style={{
        backgroundColor: `${style.color}1a`,
        color: style.color,
      }}
    >
      {label}
    </span>
  );
}

interface DocumentRowProps {
  doc: DocumentModel;
}

function DocumentRow({ doc }: DocumentRowProps) {
  const { t } = useTranslation('documents');
  return (
    <div
      data-testid={`document-row-${doc.id}`}
      className="flex items-center justify-between gap-4 rounded-[10px] px-4 py-3 transition-colors"
      style={{
        backgroundColor: "var(--color-parchment-card)",
        boxShadow: "var(--shadow-subtle)",
      }}
    >
      <div className="min-w-0 flex-1">
        <Link
          to={`/documents/${doc.id}`}
          className="block truncate text-[15px] font-medium no-underline transition-colors"
          style={{ color: "var(--color-charcoal-primary)" }}
        >
          {doc.title}
        </Link>
        <p className="mt-0.5 text-[12px]" style={{ color: "var(--color-ash)" }}>
          {doc.sourceType === "pasted-text" ? t('library.sourceType.pastedText') : doc.sourceType}
          {doc.chunkCount !== undefined && ` · ${t('library.chunks', { count: doc.chunkCount })}`}
        </p>
      </div>
      <IngestBadge status={doc.ingestStatus} documentId={doc.id} />
    </div>
  );
}

// ---- Create document form ---------------------------------------------------

interface CreateDocumentFormProps {
  onCancel: () => void;
  onCreated: (docId: string) => void;
}

function CreateDocumentForm({ onCancel, onCreated }: CreateDocumentFormProps) {
  const { t } = useTranslation('documents');
  const [title, setTitle] = useState("");
  const [textContent, setTextContent] = useState("");
  const [apiError, setApiError] = useState<ReturnType<typeof normalizeApiProblem>>(null);

  const createMutation = useCreateDocument();
  const ingestMutation = useIngestDocument(createMutation.data?.id ?? "");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setApiError(null);

    try {
      const payload: Parameters<typeof createMutation.mutateAsync>[0] = {
        title: title.trim(),
        sourceType: "pasted-text",
      };
      if (textContent.trim()) {
        payload.textContent = textContent.trim();
      }
      const doc = await createMutation.mutateAsync(payload);
      // Automatically trigger ingest after creation
      await ingestMutation.mutateAsync(undefined);
      onCreated(doc.id);
    } catch (err) {
      const p = normalizeApiProblem(
        (err as { response?: { data?: unknown } })?.response?.data,
        (err as { response?: { status?: number } })?.response?.status ?? 500,
      );
      setApiError(p ?? { type: "about:blank", title: t('library.errors.createFailed'), status: 500 });
    }
  }

  const isLoading = createMutation.isPending || ingestMutation.isPending;

  return (
    <div
      data-testid="create-document-form"
      className="rounded-[10px] p-6"
      style={{
        backgroundColor: "var(--color-parchment-card)",
        boxShadow: "var(--shadow-subtle)",
      }}
    >
      <h2
        className="mb-4 text-[19px] font-semibold"
        style={{ color: "var(--color-charcoal-primary)" }}
      >
        {t('library.form.heading')}
      </h2>

      {apiError && (
        <ProblemBanner
          problem={apiError}
          className="mb-4"
          onDismiss={() => setApiError(null)}
        />
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="doc-title"
            className="mb-1 block text-[13px] font-medium"
            style={{ color: "var(--color-graphite)" }}
          >
            {t('library.form.titleLabel')}
          </label>
          <input
            id="doc-title"
            data-testid="doc-title-input"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('library.form.titlePlaceholder')}
            required
            className="w-full rounded-[8px] border-0 px-3 py-2 text-[14px] outline-none focus:ring-2"
            style={{
              backgroundColor: "var(--color-stone-surface)",
              color: "var(--color-charcoal-primary)",
            }}
          />
        </div>

        <div>
          <label
            htmlFor="doc-text"
            className="mb-1 block text-[13px] font-medium"
            style={{ color: "var(--color-graphite)" }}
          >
            {t('library.form.contentLabel')}
          </label>
          <textarea
            id="doc-text"
            data-testid="doc-text-input"
            rows={10}
            value={textContent}
            onChange={(e) => setTextContent(e.target.value)}
            placeholder={t('library.form.contentPlaceholder')}
            className="w-full resize-y rounded-[8px] border-0 px-3 py-2 text-[14px] leading-[1.6] outline-none focus:ring-2"
            style={{
              backgroundColor: "var(--color-stone-surface)",
              color: "var(--color-charcoal-primary)",
              minHeight: "160px",
            }}
          />
        </div>

        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-[32px] px-5 py-2 text-[13px] font-medium transition-opacity hover:opacity-80"
            style={{
              backgroundColor: "var(--color-stone-surface)",
              color: "var(--color-graphite)",
            }}
          >
            {t('library.form.cancelBtn')}
          </button>
          <button
            type="submit"
            data-testid="create-doc-submit"
            disabled={isLoading || !title.trim()}
            className="rounded-[32px] px-5 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: "var(--color-ember-orange)" }}
          >
            {isLoading ? t('library.form.addingBtn') : t('library.form.submitBtn')}
          </button>
        </div>
      </form>
    </div>
  );
}

// ---- Main page --------------------------------------------------------------

export function DocumentLibraryPage() {
  const { t } = useTranslation('documents');
  const [showForm, setShowForm] = useState(false);
  const { data, isLoading, error } = useDocuments();

  const apiError = error
    ? normalizeApiProblem(
        (error as { response?: { data?: unknown } })?.response?.data,
        (error as { response?: { status?: number } })?.response?.status ?? 500,
      )
    : null;

  function handleDocumentCreated(_docId: string) {
    setShowForm(false);
  }

  return (
    <main
      data-testid="document-library"
      className="mx-auto max-w-[800px] px-6 py-12"
    >
      {/* Header */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1
            className="mb-1 text-[23px] font-semibold"
            style={{ color: "var(--color-charcoal-primary)", letterSpacing: "-0.44px" }}
          >
            {t('library.heading')}
          </h1>
          <p className="text-[15px]" style={{ color: "var(--color-ash)" }}>
            {t('library.subtitle')}
          </p>
        </div>

        {!showForm && (
          <button
            type="button"
            data-testid="add-document-btn"
            onClick={() => setShowForm(true)}
            className="shrink-0 rounded-[32px] px-5 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: "var(--color-ember-orange)" }}
          >
            {t('library.addButton')}
          </button>
        )}
      </div>

      {/* API error */}
      {apiError && (
        <ProblemBanner problem={apiError} className="mb-6" />
      )}

      {/* Create form */}
      {showForm && (
        <div className="mb-8">
          <CreateDocumentForm
            onCancel={() => setShowForm(false)}
            onCreated={handleDocumentCreated}
          />
        </div>
      )}

      {/* Document list */}
      {isLoading && (
        <div
          data-testid="loading-state"
          className="flex items-center justify-center py-16"
        >
          <div
            className="h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"
            style={{ borderColor: "var(--color-ember-orange)" }}
            aria-label={t('library.loadingAriaLabel')}
          />
        </div>
      )}

      {!isLoading && data && data.items.length === 0 && (
        <div
          data-testid="empty-state"
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <div
            className="mb-4 flex h-14 w-14 items-center justify-center rounded-full text-[24px]"
            style={{ backgroundColor: "var(--color-stone-surface)" }}
          >
            📄
          </div>
          <h2
            className="mb-2 text-[17px] font-semibold"
            style={{ color: "var(--color-charcoal-primary)" }}
          >
            {t('library.emptyHeading')}
          </h2>
          <p className="max-w-[320px] text-[14px]" style={{ color: "var(--color-ash)" }}>
            {t('library.emptyBody')}
          </p>
        </div>
      )}

      {!isLoading && data && data.items.length > 0 && (
        <div data-testid="document-list" className="space-y-3">
          {data.items.map((doc) => (
            <DocumentRow key={doc.id} doc={doc} />
          ))}
        </div>
      )}
    </main>
  );
}

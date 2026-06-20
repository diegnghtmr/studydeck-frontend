import { useExportDeck } from "./hooks/use-import";
import { normalizeApiProblem } from "@shared/api/problem";
import { useState } from "react";
import { ProblemBanner } from "@shared/ui/ProblemBanner";

interface ExportButtonProps {
  deckId: string;
  deckTitle?: string;
  className?: string;
}

/**
 * ExportButton — triggers GET /v1/exports/decks/{deckId}.json
 * and downloads the result as deck-{id}.json.
 */
export function ExportButton({ deckId, deckTitle, className }: ExportButtonProps) {
  const exportMutation = useExportDeck();
  const [exportError, setExportError] = useState<ReturnType<typeof normalizeApiProblem>>(null);

  async function handleExport() {
    setExportError(null);
    try {
      const data = await exportMutation.mutateAsync(deckId);

      // Trigger file download
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `deck-${deckId}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      anchor.remove();
    } catch (err) {
      const p = normalizeApiProblem(
        (err as { response?: { data?: unknown } })?.response?.data,
        (err as { response?: { status?: number } })?.response?.status ?? 500,
      );
      setExportError(p ?? { type: "about:blank", title: "Export failed", status: 500 });
    }
  }

  return (
    <div className={className}>
      {exportError && (
        <ProblemBanner
          problem={exportError}
          className="mb-2"
          onDismiss={() => setExportError(null)}
        />
      )}
      <button
        type="button"
        data-testid="export-deck-btn"
        onClick={handleExport}
        disabled={exportMutation.isPending}
        aria-label={`Export ${deckTitle ?? "deck"} as JSON`}
        className="rounded-[32px] px-4 py-1.5 text-[13px] font-medium transition-opacity hover:opacity-80 disabled:opacity-50"
        style={{
          backgroundColor: "var(--color-stone-surface)",
          color: "var(--color-graphite)",
        }}
      >
        {exportMutation.isPending ? "Exporting…" : "Export JSON"}
      </button>
    </div>
  );
}

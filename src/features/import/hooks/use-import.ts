import { useMutation, useQueryClient } from "@tanstack/react-query";
import { importExportApi } from "@shared/api/client";
import { queryKeys } from "@shared/query/query-keys";
import type {
  FlashcardImportV1Model,
  ImportValidationResponseModel,
  ImportPreviewModel,
  ImportResultModel,
} from "@shared/api/types";

/**
 * Validates an import payload without persisting.
 * POST /v1/imports/flashcards:validate
 */
export function useValidateImport() {
  return useMutation<ImportValidationResponseModel, Error, FlashcardImportV1Model>({
    mutationFn: async (payload) => {
      const response = await importExportApi.validateFlashcardImport(
        payload as Parameters<typeof importExportApi.validateFlashcardImport>[0],
      );
      return response.data as unknown as ImportValidationResponseModel;
    },
  });
}

/**
 * Previews an import — returns summary, warnings, and normalised payload.
 * POST /v1/imports/flashcards:preview
 */
export function usePreviewImport() {
  return useMutation<ImportPreviewModel, Error, FlashcardImportV1Model>({
    mutationFn: async (payload) => {
      const response = await importExportApi.previewFlashcardImport(
        payload as Parameters<typeof importExportApi.previewFlashcardImport>[0],
      );
      return response.data as unknown as ImportPreviewModel;
    },
  });
}

/**
 * Executes the import, creating notes and cards.
 * POST /v1/imports/flashcards
 * On success invalidates notes, cards, and decks queries.
 */
export function useExecuteImport() {
  const queryClient = useQueryClient();

  return useMutation<ImportResultModel, Error, FlashcardImportV1Model>({
    mutationFn: async (payload) => {
      const response = await importExportApi.importFlashcards(
        payload as Parameters<typeof importExportApi.importFlashcards>[0],
      );
      return response.data as unknown as ImportResultModel;
    },
    onSuccess: () => {
      // After a successful import, invalidate notes, cards, and decks so
      // any lists / detail pages reflect the newly imported content.
      queryClient.invalidateQueries({ queryKey: queryKeys.notes.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.cards.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.decks.all });
    },
  });
}

/**
 * Exports a deck to a FlashcardImportV1 JSON payload.
 * GET /v1/exports/decks/{deckId}.json
 * Returns the data so the caller can trigger a file download.
 */
export function useExportDeck() {
  return useMutation<FlashcardImportV1Model, Error, string>({
    mutationFn: async (deckId) => {
      const response = await importExportApi.exportDeckJson(deckId);
      return response.data as unknown as FlashcardImportV1Model;
    },
  });
}

import { useMutation } from "@tanstack/react-query";
import { aiApi, ragApi } from "@shared/api/client";
import type {
  GenerateFlashcardsResponseModel,
  ImproveFlashcardResponseModel,
  RagChatResponseModel,
} from "@shared/api/types";
import type {
  GenerateFlashcardsRequest,
  ImproveFlashcardRequest,
  RagChatRequest,
} from "@shared/api/generated/models";
import {
  useAiProviderStore,
  selectActiveProviderOverride,
} from "@features/settings/store/use-ai-provider-store";
import type { AiProviderOverride } from "@features/settings/store/use-ai-provider-store";

// ---- Local extended types ---------------------------------------------------

// These carry providerOverride through the cast without touching generated files.

type GenerateFlashcardsRequestWithOverride = GenerateFlashcardsRequest & {
  providerOverride?: AiProviderOverride;
};

type RagChatRequestWithOverride = RagChatRequest & {
  providerOverride?: AiProviderOverride;
};

type ImproveFlashcardRequestWithOverride = ImproveFlashcardRequest & {
  providerOverride?: AiProviderOverride;
};

// ---- AI mutations -----------------------------------------------------------

/**
 * Generate flashcard proposals from text or document source.
 * Returns proposed drafts for user approval — nothing is persisted until
 * the user explicitly confirms via the import flow.
 */
export function useGenerateFlashcards() {
  return useMutation<GenerateFlashcardsResponseModel, Error, GenerateFlashcardsRequest>({
    mutationFn: async (body) => {
      const override = selectActiveProviderOverride(useAiProviderStore.getState());
      const extBody: GenerateFlashcardsRequestWithOverride = {
        ...body,
        ...(override ? { providerOverride: override } : {}),
      };
      const response = await aiApi.generateFlashcards(extBody as GenerateFlashcardsRequest);
      return response.data as unknown as GenerateFlashcardsResponseModel;
    },
  });
}

/**
 * Improve an existing or proposed flashcard.
 * Returns the improved content + explanation.
 */
export function useImproveFlashcard() {
  return useMutation<ImproveFlashcardResponseModel, Error, ImproveFlashcardRequest>({
    mutationFn: async (body) => {
      const override = selectActiveProviderOverride(useAiProviderStore.getState());
      const extBody: ImproveFlashcardRequestWithOverride = {
        ...body,
        ...(override ? { providerOverride: override } : {}),
      };
      const response = await aiApi.improveFlashcard(extBody as ImproveFlashcardRequest);
      return response.data as unknown as ImproveFlashcardResponseModel;
    },
  });
}

// ---- RAG mutations ----------------------------------------------------------

/**
 * Chat with the RAG pipeline. Returns an answer with cited source chunks.
 * Throws on 503 if AI provider is not configured — callers should use
 * normalizeApiProblem + ProblemBanner to handle gracefully.
 */
export function useRagChat() {
  return useMutation<RagChatResponseModel, Error, RagChatRequest>({
    mutationFn: async (body) => {
      const override = selectActiveProviderOverride(useAiProviderStore.getState());
      const extBody: RagChatRequestWithOverride = {
        ...body,
        ...(override ? { providerOverride: override } : {}),
      };
      const response = await ragApi.ragChat(extBody as RagChatRequest);
      return response.data as unknown as RagChatResponseModel;
    },
  });
}

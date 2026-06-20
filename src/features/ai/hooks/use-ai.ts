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

// ---- AI mutations -----------------------------------------------------------

/**
 * Generate flashcard proposals from text or document source.
 * Returns proposed drafts for user approval — nothing is persisted until
 * the user explicitly confirms via the import flow.
 */
export function useGenerateFlashcards() {
  return useMutation<GenerateFlashcardsResponseModel, Error, GenerateFlashcardsRequest>({
    mutationFn: async (body) => {
      const response = await aiApi.generateFlashcards(body);
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
      const response = await aiApi.improveFlashcard(body);
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
      const response = await ragApi.ragChat(body);
      return response.data as unknown as RagChatResponseModel;
    },
  });
}

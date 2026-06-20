import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { documentsApi, ragApi } from "@shared/api/client";
import { queryKeys } from "@shared/query/query-keys";
import type {
  DocumentModel,
  PagedDocumentModel,
  IngestJobModel,
  PagedChunkModel,
} from "@shared/api/types";
import type { DocumentCreateRequest, IngestStatus } from "@shared/api/generated/models";

// ---- Params -----------------------------------------------------------------

export interface UseDocumentsParams {
  page?: number;
  size?: number;
  ingestStatus?: IngestStatus;
}

// ---- Queries ----------------------------------------------------------------

/**
 * List documents with optional pagination.
 */
export function useDocuments(params: UseDocumentsParams = {}) {
  const { page = 0, size = 20, ingestStatus } = params;

  return useQuery<PagedDocumentModel>({
    queryKey: queryKeys.documents.list({ page, size }),
    queryFn: async () => {
      const response = await documentsApi.listDocuments(page, size, ingestStatus);
      return response.data as unknown as PagedDocumentModel;
    },
  });
}

/**
 * Fetch a single document by ID.
 */
export function useDocument(documentId: string) {
  return useQuery<DocumentModel>({
    queryKey: queryKeys.documents.detail(documentId),
    queryFn: async () => {
      const response = await documentsApi.getDocument(documentId);
      return response.data as unknown as DocumentModel;
    },
    enabled: Boolean(documentId),
  });
}

/**
 * List chunks for a document.
 * Note: The generated listDocumentChunks endpoint only accepts documentId (no pagination params).
 */
export function useDocumentChunks(documentId: string) {
  return useQuery<PagedChunkModel>({
    queryKey: queryKeys.documents.chunks(documentId),
    queryFn: async () => {
      const response = await documentsApi.listDocumentChunks(documentId);
      return response.data as unknown as PagedChunkModel;
    },
    enabled: Boolean(documentId),
  });
}

// ---- Mutations --------------------------------------------------------------

/**
 * Create a new document (upload or paste text).
 */
export function useCreateDocument() {
  const queryClient = useQueryClient();

  return useMutation<DocumentModel, Error, DocumentCreateRequest>({
    mutationFn: async (body) => {
      const response = await documentsApi.createDocument(body);
      return response.data as unknown as DocumentModel;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.documents.all });
    },
  });
}

/**
 * Delete a document.
 */
export function useDeleteDocument(documentId: string) {
  const queryClient = useQueryClient();

  return useMutation<void, Error, void>({
    mutationFn: async () => {
      await documentsApi.deleteDocument(documentId);
    },
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: queryKeys.documents.detail(documentId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.documents.all });
    },
  });
}

/**
 * Trigger document ingest. Returns IngestJob with 202 Accepted.
 */
export function useIngestDocument(documentId: string) {
  const queryClient = useQueryClient();

  return useMutation<IngestJobModel, Error, undefined>({
    mutationFn: async (body) => {
      const response = await ragApi.ingestDocument(documentId, body);
      return response.data as unknown as IngestJobModel;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.documents.detail(documentId) });
    },
  });
}

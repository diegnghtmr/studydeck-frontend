import { z } from "zod";

// RFC 9457 problem+json schema (Zod 4)
export const ViolationSchema = z.object({
  field: z.string(),
  message: z.string(),
  code: z.string().optional(),
});

export const ApiProblemSchema = z.object({
  type: z.string().default("about:blank"),
  title: z.string(),
  status: z.number().int(),
  detail: z.string().optional(),
  instance: z.string().optional(),
  code: z.string().optional(),
  requestId: z.string().optional(),
  traceId: z.string().optional(),
  violations: z.array(ViolationSchema).optional(),
});

export type ApiProblem = z.infer<typeof ApiProblemSchema>;
export type Violation = z.infer<typeof ViolationSchema>;

const PROBLEM_JSON_CONTENT_TYPES = [
  "application/problem+json",
  "application/problem+json; charset=utf-8",
];

function isProblemContentType(contentType: string | undefined): boolean {
  if (!contentType) return false;
  return PROBLEM_JSON_CONTENT_TYPES.some((ct) =>
    contentType.toLowerCase().startsWith(ct.split(";")[0].trim()),
  );
}

/**
 * Attempt to normalize an axios error response body into an ApiProblem.
 * Returns null when the response is not a recognizable problem+json payload.
 */
export function normalizeApiProblem(
  responseData: unknown,
  status: number,
  contentType?: string,
): ApiProblem | null {
  // Only parse if content-type signals problem+json, OR if the data looks like one
  const looksLikeProblem =
    isProblemContentType(contentType) ||
    (typeof responseData === "object" &&
      responseData !== null &&
      "title" in responseData &&
      "status" in responseData);

  if (!looksLikeProblem) return null;

  const result = ApiProblemSchema.safeParse(responseData);
  if (result.success) return result.data;

  // Fallback: synthesize a minimal problem from HTTP status
  return {
    type: "about:blank",
    title: "Unexpected Error",
    status,
    detail: typeof responseData === "string" ? responseData : undefined,
  };
}

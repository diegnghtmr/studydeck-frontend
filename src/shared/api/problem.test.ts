import { describe, it, expect } from "vitest";
import { normalizeApiProblem, ApiProblemSchema } from "./problem";

describe("normalizeApiProblem", () => {
  describe("with application/problem+json content-type", () => {
    it("parses a full RFC 9457 problem payload", () => {
      const data = {
        type: "https://studydeck.ai/errors/not-found",
        title: "Resource Not Found",
        status: 404,
        detail: "Deck with id abc123 does not exist.",
        instance: "/v1/decks/abc123",
        code: "DECK_NOT_FOUND",
        traceId: "4bf92f3577b34da6a3ce929d0e0e4736",
      };

      const result = normalizeApiProblem(data, 404, "application/problem+json");

      expect(result).not.toBeNull();
      expect(result?.type).toBe("https://studydeck.ai/errors/not-found");
      expect(result?.title).toBe("Resource Not Found");
      expect(result?.status).toBe(404);
      expect(result?.detail).toBe("Deck with id abc123 does not exist.");
      expect(result?.code).toBe("DECK_NOT_FOUND");
      expect(result?.traceId).toBe("4bf92f3577b34da6a3ce929d0e0e4736");
    });

    it("parses a problem payload with violations", () => {
      const data = {
        type: "about:blank",
        title: "Validation Failed",
        status: 422,
        violations: [
          { field: "title", message: "must not be blank" },
          { field: "tags", message: "must have at most 50 items", code: "SIZE" },
        ],
      };

      const result = normalizeApiProblem(data, 422, "application/problem+json");

      expect(result).not.toBeNull();
      expect(result?.violations).toHaveLength(2);
      expect(result?.violations?.[0]).toEqual({
        field: "title",
        message: "must not be blank",
      });
      expect(result?.violations?.[1].code).toBe("SIZE");
    });

    it("provides 'about:blank' as default type when omitted", () => {
      const data = {
        title: "Bad Request",
        status: 400,
      };

      const result = normalizeApiProblem(data, 400, "application/problem+json");

      expect(result?.type).toBe("about:blank");
    });

    it("falls back to minimal problem when data is not parseable but content-type is problem+json", () => {
      const result = normalizeApiProblem(
        "unexpected string body",
        500,
        "application/problem+json",
      );

      expect(result).not.toBeNull();
      expect(result?.status).toBe(500);
      expect(result?.title).toBe("Unexpected Error");
      expect(result?.detail).toBe("unexpected string body");
    });

    it("handles charset suffix in content-type", () => {
      const data = {
        title: "Conflict",
        status: 409,
      };

      const result = normalizeApiProblem(
        data,
        409,
        "application/problem+json; charset=utf-8",
      );

      expect(result).not.toBeNull();
      expect(result?.status).toBe(409);
    });
  });

  describe("heuristic detection (no problem+json content-type)", () => {
    it("returns null for generic JSON body without problem fields", () => {
      const data = { id: "123", name: "some resource" };
      const result = normalizeApiProblem(data, 200, "application/json");
      expect(result).toBeNull();
    });

    it("detects problem payload by shape even without explicit content-type", () => {
      const data = {
        title: "Unauthorized",
        status: 401,
      };

      const result = normalizeApiProblem(data, 401, "application/json");
      expect(result).not.toBeNull();
      expect(result?.status).toBe(401);
    });

    it("returns null for null data", () => {
      expect(normalizeApiProblem(null, 200)).toBeNull();
    });

    it("returns null for undefined content-type and non-problem data", () => {
      const data = { foo: "bar" };
      expect(normalizeApiProblem(data, 400)).toBeNull();
    });
  });

  describe("401 synthesis for logout flow", () => {
    it("parses a 401 Spring Security problem", () => {
      const data = {
        type: "about:blank",
        title: "Unauthorized",
        status: 401,
        detail: "Full authentication is required to access this resource",
      };

      const result = normalizeApiProblem(data, 401, "application/problem+json");

      expect(result?.status).toBe(401);
      expect(result?.detail).toContain("Full authentication");
    });
  });

  describe("ApiProblemSchema", () => {
    it("rejects payload missing required title", () => {
      const parsed = ApiProblemSchema.safeParse({ status: 400 });
      expect(parsed.success).toBe(false);
    });

    it("rejects payload missing required status", () => {
      const parsed = ApiProblemSchema.safeParse({ title: "Bad Request" });
      expect(parsed.success).toBe(false);
    });

    it("accepts a minimal valid payload", () => {
      const parsed = ApiProblemSchema.safeParse({
        title: "Not Found",
        status: 404,
      });
      expect(parsed.success).toBe(true);
    });
  });
});

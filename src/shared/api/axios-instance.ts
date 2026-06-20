import axios from "axios";
import { normalizeApiProblem } from "./problem";
import { useAuthStore } from "@shared/auth/auth-store";

const BASE_URL = import.meta.env["VITE_API_URL"] ?? "http://localhost:8080";

export const axiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10_000,
});

// --- Request interceptor: inject Bearer token from Zustand store ---
axiosInstance.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers["Authorization"] = `Bearer ${token}`;
  }
  return config;
});

// --- Response interceptor: normalize RFC 9457 errors ---
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error)) return Promise.reject(error);

    const response = error.response;
    if (!response) return Promise.reject(error);

    const contentType = response.headers["content-type"] as string | undefined;
    const problem = normalizeApiProblem(response.data, response.status, contentType);

    if (problem) {
      // Attach normalized problem to the error so callers can use it
      (error as { problem?: typeof problem }).problem = problem;
    }

    // 401 → clear token and redirect to login
    if (response.status === 401) {
      useAuthStore.getState().clearAuth();
      window.location.href = "/login";
    }

    return Promise.reject(error);
  },
);

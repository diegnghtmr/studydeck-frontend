/**
 * Typed API client factory.
 * Each generated API class is instantiated with our shared axios instance.
 * Import from this file — never import directly from `generated/`.
 */
import { Configuration } from "./generated/configuration";
import { AuthApi, DecksApi, NotesApi, CardsApi, ReviewsApi, ImportExportApi } from "./generated/api";
import { axiosInstance } from "./axios-instance";

const BASE_URL = import.meta.env["VITE_API_URL"] ?? "http://localhost:8080";

// Generated API classes accept an optional Configuration + AxiosInstance.
// We pass our custom instance so all requests go through our interceptors.
const apiConfig = new Configuration({ basePath: BASE_URL });

export const authApi = new AuthApi(apiConfig, BASE_URL, axiosInstance);
export const decksApi = new DecksApi(apiConfig, BASE_URL, axiosInstance);
export const notesApi = new NotesApi(apiConfig, BASE_URL, axiosInstance);
export const cardsApi = new CardsApi(apiConfig, BASE_URL, axiosInstance);
export const reviewsApi = new ReviewsApi(apiConfig, BASE_URL, axiosInstance);
export const importExportApi = new ImportExportApi(apiConfig, BASE_URL, axiosInstance);

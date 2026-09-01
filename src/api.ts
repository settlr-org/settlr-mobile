import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import type { User } from "./types";

export type { User } from "./types";

// Parity note: web uses /api-proxy (Next.js route.ts -> cookie refresh, no refresh_token body, GET cache 60s)
// Mobile uses direct EXPO_PUBLIC_API_URL with Bearer + refresh_token body, same 60s GET cache via requestCache,
// and matching 401 -> refresh -> retry flow. Content-Type correctly omitted for FormData in both.
const API_URL = (
  process.env.EXPO_PUBLIC_API_URL ?? "https://api.example.com"
).replace(/\/$/, "");
const ACCESS = "settlr_access_token";
const REFRESH = "settlr_refresh_token";

// Web fallback: expo-secure-store is not available on web, use localStorage
const isWeb = Platform.OS === "web";
const storage = {
  getItemAsync: async (key: string) => {
    if (isWeb) {
      try {
        return globalThis.localStorage?.getItem(key) ?? null;
      } catch {
        return null;
      }
    }
    return SecureStore.getItemAsync(key);
  },
  setItemAsync: async (key: string, value: string) => {
    if (isWeb) {
      try {
        globalThis.localStorage?.setItem(key, value);
      } catch {}
      return;
    }
    return SecureStore.setItemAsync(key, value);
  },
  deleteItemAsync: async (key: string) => {
    if (isWeb) {
      try {
        globalThis.localStorage?.removeItem(key);
      } catch {}
      return;
    }
    return SecureStore.deleteItemAsync(key);
  },
};

type Session = {
  access_token: string;
  refresh_token: string;
  user?: User;
};
export type RegistrationPending = {
  email: string;
  verification_required: true;
};
export type AuthenticationResult = Session | RegistrationPending;
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

const REQUEST_TIMEOUT_MS = 15_000;
const GET_CACHE_MS = 60_000;
type CacheEntry = {
  expiresAt: number;
  promise: Promise<unknown>;
  value?: unknown;
};
const requestCache = new Map<string, CacheEntry>();

export const readApiCache = <T>(path: string) =>
  requestCache.get(path)?.value as T | undefined;
export const clearApiCache = () => requestCache.clear();

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
) {
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(
    () => controller.abort(),
    REQUEST_TIMEOUT_MS,
  );
  const abort = () => controller.abort();
  init.signal?.addEventListener("abort", abort, { once: true });
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    if (controller.signal.aborted) {
      throw new ApiError(
        408,
        "The server took too long to respond. Please try again.",
      );
    }
    throw error;
  } finally {
    globalThis.clearTimeout(timeout);
    init.signal?.removeEventListener("abort", abort);
  }
}

async function saveSession(session: Session) {
  await Promise.all([
    storage.setItemAsync(ACCESS, session.access_token),
    storage.setItemAsync(REFRESH, session.refresh_token),
  ]);
}
async function clearSession() {
  clearApiCache();
  await Promise.all([
    storage.deleteItemAsync(ACCESS),
    storage.deleteItemAsync(REFRESH),
    storage.deleteItemAsync("settlr_pending_invite"),
  ]);
}

async function errorMessage(response: Response) {
  try {
    return (
      ((await response.json()) as { error?: { message?: string } }).error
        ?.message || `Request failed (${response.status})`
    );
  } catch {
    return `Request failed (${response.status})`;
  }
}

async function refresh() {
  const refreshToken = await storage.getItemAsync(REFRESH);
  if (!refreshToken) return null;
  const response = await fetchWithTimeout(`${API_URL}/api/v1/auth/refresh`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!response.ok) {
    await clearSession();
    return null;
  }
  const session = (await response.json()) as Session;
  await saveSession(session);
  return session.access_token;
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
  retry = true,
): Promise<T> {
  const method = (init.method || "GET").toUpperCase();
  const cacheable = method === "GET" && !init.body && retry;
  if (cacheable) {
    const cached = requestCache.get(path);
    if (cached && cached.expiresAt > Date.now())
      return cached.promise as Promise<T>;
    const entry: CacheEntry = {
      expiresAt: Date.now() + GET_CACHE_MS,
      promise: Promise.resolve(undefined),
      value: cached?.value,
    };
    entry.promise = performRequest<T>(path, init, retry)
      .then((value) => {
        entry.value = value;
        return value;
      })
      .catch((error) => {
        if (requestCache.get(path) === entry) requestCache.delete(path);
        throw error;
      });
    requestCache.set(path, entry);
    return entry.promise as Promise<T>;
  }
  const value = await performRequest<T>(path, init, retry);
  if (method !== "GET") clearApiCache();
  return value;
}

async function performRequest<T>(
  path: string,
  init: RequestInit,
  retry: boolean,
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (
    init.body &&
    !(init.body instanceof FormData) &&
    !headers.has("Content-Type")
  )
    headers.set("Content-Type", "application/json");
  const token = await storage.getItemAsync(ACCESS);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetchWithTimeout(`${API_URL}${path}`, {
    ...init,
    headers,
  });
  if (response.status === 401 && retry && (await refresh()))
    return performRequest<T>(path, init, false);
  if (!response.ok)
    throw new ApiError(response.status, await errorMessage(response));
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export async function apiUpload<T>(
  path: string,
  file: { uri: string; name: string; type: string },
): Promise<T> {
  const form = new FormData();
  form.append("file", file as never);
  return apiFetch<T>(path, { method: "POST", body: form });
}

export async function apiDownload(path: string): Promise<Blob> {
  const token = await storage.getItemAsync(ACCESS);
  const headers = new Headers({ Accept: "application/octet-stream" });
  if (token) headers.set("Authorization", `Bearer ${token}`);
  let response = await fetchWithTimeout(`${API_URL}${path}`, { headers });
  if (response.status === 401 && (await refresh())) {
    const refreshed = await storage.getItemAsync(ACCESS);
    if (refreshed) headers.set("Authorization", `Bearer ${refreshed}`);
    response = await fetchWithTimeout(`${API_URL}${path}`, { headers });
  }
  if (!response.ok)
    throw new ApiError(response.status, await errorMessage(response));
  return response.blob();
}

export const apiBaseUrl = () => API_URL;

export async function authenticate(
  mode: "login" | "register",
  input: { name?: string; email: string; password: string },
): Promise<AuthenticationResult> {
  const body =
    mode === "register"
      ? { name: input.name, email: input.email, password: input.password }
      : { email: input.email, password: input.password };
  const response = await fetchWithTimeout(`${API_URL}/api/v1/auth/${mode}`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok)
    throw new ApiError(response.status, await errorMessage(response));
  const result = (await response.json()) as AuthenticationResult;
  if ("verification_required" in result) return result;
  await saveSession(result);
  return result;
}

export async function authenticateWithGoogle(
  idToken: string,
): Promise<Session> {
  const response = await fetchWithTimeout(`${API_URL}/api/v1/auth/google`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ id_token: idToken }),
  });
  if (!response.ok)
    throw new ApiError(response.status, await errorMessage(response));
  const session = (await response.json()) as Session;
  await saveSession(session);
  return session;
}

export async function logout() {
  const token = await storage.getItemAsync(REFRESH);
  try {
    await fetchWithTimeout(`${API_URL}/api/v1/auth/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: token }),
    });
  } finally {
    await clearSession();
  }
}

export async function restoreUser() {
  try {
    return await apiFetch<User>("/api/v1/me");
  } catch {
    return null;
  }
}

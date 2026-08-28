import * as SecureStore from "expo-secure-store";

const API_URL = (
  process.env.EXPO_PUBLIC_API_URL ?? "https://settlrapi.theswissknife.com"
).replace(/\/$/, "");
const ACCESS = "settlr_access_token";
const REFRESH = "settlr_refresh_token";

export type User = {
  id: string;
  name: string;
  email: string;
  default_currency?: string;
};
export type Session = {
  access_token: string;
  refresh_token: string;
  user?: User;
};
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

const REQUEST_TIMEOUT_MS = 15_000;

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
) {
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(
    () => controller.abort(),
    REQUEST_TIMEOUT_MS,
  );
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
  }
}

export async function saveSession(session: Session) {
  await Promise.all([
    SecureStore.setItemAsync(ACCESS, session.access_token),
    SecureStore.setItemAsync(REFRESH, session.refresh_token),
  ]);
}
export async function clearSession() {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS),
    SecureStore.deleteItemAsync(REFRESH),
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
  const refreshToken = await SecureStore.getItemAsync(REFRESH);
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
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body) headers.set("Content-Type", "application/json");
  const token = await SecureStore.getItemAsync(ACCESS);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetchWithTimeout(`${API_URL}${path}`, {
    ...init,
    headers,
  });
  if (response.status === 401 && retry && (await refresh()))
    return apiFetch<T>(path, init, false);
  if (!response.ok)
    throw new ApiError(response.status, await errorMessage(response));
  return response.json() as Promise<T>;
}

export async function authenticate(
  mode: "login" | "register",
  input: { name?: string; email: string; password: string },
) {
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
  const session = (await response.json()) as Session;
  await saveSession(session);
  return session;
}

export async function logout() {
  const token = await SecureStore.getItemAsync(REFRESH);
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

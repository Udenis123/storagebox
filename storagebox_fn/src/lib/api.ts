import { API_BASE_URL, DASHBOARD_API_URL } from "./constants";
import { sessionStore } from "./session";

type ApiEnvelope<T> = {
  status: "success" | "error";
  message: string;
  data?: T;
  errorCode?: string;
};

export class ApiRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly errorCode?: string,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

export type ApiResult<T> = { message: string; data: T };

const UNAUTHORIZED = 401;
let refreshing: Promise<boolean> | null = null;

async function parseEnvelope<T>(res: Response): Promise<ApiResult<T>> {
  const body = (await res.json().catch(() => null)) as ApiEnvelope<T> | null;
  if (!res.ok || !body || body.status === "error") {
    throw new ApiRequestError(body?.message ?? `Request failed (${res.status})`, res.status, body?.errorCode);
  }
  return { message: body.message, data: body.data as T };
}

async function refreshTokens(): Promise<boolean> {
  const refreshToken = sessionStore.get()?.refreshToken;
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${DASHBOARD_API_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    const { data } = await parseEnvelope<{ accessToken: string; refreshToken: string }>(res);
    sessionStore.updateTokens(data);
    return true;
  } catch {
    sessionStore.set(null);
    return false;
  }
}

/** Concurrent 401s share a single refresh so the rotating refresh token is only spent once. */
export function refreshSessionOnce(): Promise<boolean> {
  refreshing ??= refreshTokens().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

function send(path: string, init: RequestInit): Promise<Response> {
  const isFormData = init.body instanceof FormData;
  const token = sessionStore.get()?.accessToken;
  return fetch(`${DASHBOARD_API_URL}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<ApiResult<T>> {
  let res: Response;
  try {
    res = await send(path, init);
    if (res.status === UNAUTHORIZED && sessionStore.get() && (await refreshSessionOnce())) {
      res = await send(path, init);
    }
  } catch {
    throw new ApiRequestError("Cannot reach StorageBox. Check your connection and try again.", 0);
  }
  return parseEnvelope<T>(res);
}

/** Unauthenticated reads (share links): no session header, no token refresh. */
export async function publicFetch<T>(path: string): Promise<ApiResult<T>> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`);
  } catch {
    throw new ApiRequestError("Cannot reach StorageBox. Check your connection and try again.", 0);
  }
  return parseEnvelope<T>(res);
}

export const jsonBody = (value: unknown): RequestInit["body"] => JSON.stringify(value);

export function queryString(params: Record<string, string | number | undefined>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") query.set(key, String(value));
  }
  const text = query.toString();
  return text ? `?${text}` : "";
}

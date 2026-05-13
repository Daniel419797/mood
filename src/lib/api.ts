import axios, { type AxiosRequestConfig } from "axios";
import {
  clearStoredAuthTokens,
  getStoredAccessToken,
  getStoredRefreshToken,
  setStoredAuthTokens,
} from "@/lib/authTokens";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: { "Content-Type": "application/json" },
});

const MAX_TRANSIENT_RETRIES = 3;
const RETRY_DELAYS_MS = [400, 1000, 2000];

let wakePromise: Promise<void> | null = null;
let refreshPromise: Promise<string> | null = null;

type RetryableRequestConfig = AxiosRequestConfig & {
  __authRetry?: boolean;
  __transientRetryCount?: number;
};

type AuthRefreshPayload = {
  accessToken?: string;
  token?: string;
  refreshToken?: string;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getApiBase(): string {
  return (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/, "");
}

export function getAuthApiBase(): string {
  const base = getApiBase();
  const projectScopedMatch = base.match(/\/api\/v1\/p\/[0-9a-fA-F-]+$/);
  if (projectScopedMatch) {
    return base.replace(/\/p\/[0-9a-fA-F-]+$/, "");
  }
  if (base.endsWith("/api/v1")) return base;
  if (base) return `${base}/api/v1`;
  return "/api/v1";
}

export function extractProjectIdFromApiBase(base = getApiBase()): string | null {
  const m = base.match(/\/api\/v1\/p\/([0-9a-fA-F-]+)$/);
  return m?.[1] ?? null;
}

export function withProjectId(url: string): string {
  const projectId = extractProjectIdFromApiBase();
  if (!projectId) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}projectId=${encodeURIComponent(projectId)}`;
}

function getBackendHealthUrl(): string | null {
  const base = getApiBase();
  if (!base) return null;

  try {
    const parsed = new URL(base);
    return `${parsed.origin}/health`;
  } catch {
    return null;
  }
}

async function wakeBackendOnce(): Promise<void> {
  if (typeof window === "undefined") return;
  if (wakePromise) return wakePromise;

  const healthUrl = getBackendHealthUrl();
  if (!healthUrl) return;

  wakePromise = (async () => {
    try {
      // no-cors still triggers the request and wakes Render even when CORS is strict.
      await fetch(healthUrl, { method: "GET", mode: "no-cors", cache: "no-store" });
    } catch {
      // Ignore warmup failures; retry interceptor handles transient failures.
    }
  })();

  await wakePromise;
}

function extractAuthTokens(payload: unknown): AuthRefreshPayload | null {
  if (!payload || typeof payload !== "object") return null;

  const envelope = payload as { data?: unknown };
  const raw = envelope.data && typeof envelope.data === "object"
    ? envelope.data as AuthRefreshPayload
    : payload as AuthRefreshPayload;

  const accessToken = raw.token ?? raw.accessToken;
  if (!accessToken) return null;

  return {
    accessToken,
    refreshToken: raw.refreshToken,
  };
}

function shouldClearAuthForRefreshFailure(status?: number): boolean {
  return status === 400 || status === 401 || status === 403;
}

function requestPath(config?: RetryableRequestConfig): string {
  const rawUrl = String(config?.url ?? "");
  if (rawUrl.startsWith("http://") || rawUrl.startsWith("https://")) {
    try {
      return new URL(rawUrl).pathname;
    } catch {
      return rawUrl;
    }
  }
  return rawUrl;
}

function shouldAttemptRefresh(config: RetryableRequestConfig, status?: number): boolean {
  if (status !== 401 || config.__authRetry) return false;
  const pathname = requestPath(config);
  return !/\/auth\/(?:login|register|oauth\/exchange|refresh|logout)(?:$|\?)/.test(pathname);
}

async function refreshAccessToken(): Promise<string> {
  if (typeof window === "undefined") {
    throw new Error("Token refresh is only available in the browser");
  }

  refreshPromise ??= (async () => {
    const refreshToken = getStoredRefreshToken();
    const apiKey = process.env.NEXT_PUBLIC_API_KEY;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (apiKey) headers["x-api-key"] = apiKey;

    const response = await axios.post(
      withProjectId(`${getAuthApiBase()}/auth/refresh`),
      refreshToken ? { refreshToken } : {},
      {
        headers,
        withCredentials: true,
      },
    );

    const tokens = extractAuthTokens(response.data);
    if (!tokens?.accessToken) {
      throw new Error("Refresh response did not include an access token");
    }

    setStoredAuthTokens({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });

    return tokens.accessToken;
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

// Attach JWT from localStorage on every request
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    void wakeBackendOnce();
  }
  const apiKey = process.env.NEXT_PUBLIC_API_KEY;
  if (apiKey) {
    config.headers["x-api-key"] = apiKey;
  }
  if (typeof window !== "undefined") {
    const token = getStoredAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Redirect to /login on 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const config = error?.config as RetryableRequestConfig | undefined;
    const status = error?.response?.status as number | undefined;
    const isNetworkError = !error?.response;
    const isTransientStatus = status === 502 || status === 503 || status === 504;

    if (config && (isNetworkError || isTransientStatus)) {
      const currentRetry = Number(config.__transientRetryCount ?? 0);
      if (currentRetry < MAX_TRANSIENT_RETRIES) {
        config.__transientRetryCount = currentRetry + 1;
        if (currentRetry === 0) {
          await wakeBackendOnce();
        }
        await sleep(RETRY_DELAYS_MS[currentRetry] ?? RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1]);
        return api.request(config);
      }
    }

    if (typeof window !== "undefined" && config && shouldAttemptRefresh(config, status)) {
      config.__authRetry = true;

      try {
        const token = await refreshAccessToken();
        config.headers = {
          ...(config.headers as Record<string, string> | undefined),
          Authorization: `Bearer ${token}`,
        };
        return api.request(config);
      } catch (refreshError) {
        const refreshStatus = (refreshError as { response?: { status?: number } })?.response?.status;
        if (shouldClearAuthForRefreshFailure(refreshStatus)) {
          clearStoredAuthTokens();
          window.location.href = "/login";
        }
        return Promise.reject(refreshError);
      }
    }

    if (typeof window !== "undefined" && status === 401) {
      const pathname = requestPath(config);

      // Only force logout when identity verification fails.
      // Other 401s (e.g., project API-key / gateway auth) should not wipe the session.
      const isAuthMeEndpoint = /\/auth\/me(?:$|\?)/.test(pathname);
      if (isAuthMeEndpoint) {
        clearStoredAuthTokens();
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;

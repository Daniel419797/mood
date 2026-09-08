import axios, { type AxiosRequestConfig } from "axios";
import {
  clearStoredAuthTokens,
  getStoredAccessToken,
  setStoredAuthTokens,
} from "@/lib/authTokens";

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "/api/v1").replace(/\/+$/, "");

const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
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
  token?: string;
  accessToken?: string;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getApiBase(): string {
  return API_BASE;
}

function getBackendHealthUrl(): string | null {
  try {
    const parsed = new URL(API_BASE, typeof window !== "undefined" ? window.location.origin : "http://localhost");
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
      await fetch(healthUrl, { method: "GET", mode: "no-cors", cache: "no-store" });
    } catch {
      // Best effort only. The retry interceptor handles transient failures.
    }
  })();

  await wakePromise;
}

function extractAccessToken(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;

  const envelope = payload as { data?: unknown };
  const raw =
    envelope.data && typeof envelope.data === "object"
      ? (envelope.data as AuthRefreshPayload)
      : (payload as AuthRefreshPayload);

  return raw.token ?? raw.accessToken ?? null;
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
  return !/\/auth\/(?:login|register|oauth|refresh|logout)(?:\/|$|\?)/.test(pathname);
}

async function refreshAccessToken(): Promise<string> {
  if (typeof window === "undefined") {
    throw new Error("Token refresh is only available in the browser");
  }

  refreshPromise ??= axios
    .post(
      `${API_BASE}/auth/refresh`,
      {},
      {
        headers: { "Content-Type": "application/json" },
        withCredentials: true,
      },
    )
    .then((response) => {
      const accessToken = extractAccessToken(response.data);
      if (!accessToken) {
        throw new Error("Refresh response did not include an access token");
      }

      setStoredAuthTokens({ accessToken, refreshToken: null });
      return accessToken;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    void wakeBackendOnce();
    const token = getStoredAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

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
        if (refreshStatus === 400 || refreshStatus === 401 || refreshStatus === 403) {
          clearStoredAuthTokens();
          window.location.href = "/login";
        }
        return Promise.reject(refreshError);
      }
    }

    if (typeof window !== "undefined" && status === 401 && /\/auth\/me(?:$|\?)/.test(requestPath(config))) {
      clearStoredAuthTokens();
      window.location.href = "/login";
    }

    return Promise.reject(error);
  },
);

export default api;

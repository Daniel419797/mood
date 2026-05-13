"use client";

export type StoredAuthTokens = {
  accessToken: string;
  refreshToken?: string | null;
};

const ACCESS_TOKEN_KEY = "token";
const LEGACY_ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";

function emitStorageEvent(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("mood-tracker:auth-tokens-changed"));
}

function decodeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  return atob(padded);
}

export function getStoredAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY) ?? localStorage.getItem(LEGACY_ACCESS_TOKEN_KEY);
}

export function getStoredRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setStoredAuthTokens(tokens: StoredAuthTokens): void {
  if (typeof window === "undefined") return;

  localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
  localStorage.removeItem(LEGACY_ACCESS_TOKEN_KEY);

  if (tokens.refreshToken === null) {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  } else if (tokens.refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
  }

  emitStorageEvent();
}

export function clearStoredAuthTokens(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(LEGACY_ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  emitStorageEvent();
}

export function getJwtPayload(token: string | null | undefined): Record<string, unknown> | null {
  if (!token) return null;

  try {
    const [, payload] = token.split(".");
    if (!payload) return null;
    return JSON.parse(decodeBase64Url(payload)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function getStoredUserId(): string {
  const payload = getJwtPayload(getStoredAccessToken());
  const id = payload?.sub ?? payload?.userId ?? payload?.id;
  return typeof id === "string" ? id : "";
}

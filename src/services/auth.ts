import api from "@/lib/api";
import type {
  LoginRequestDTO,
  LoginResponseDTO,
  RegisterRequestDTO,
  UpdateProfileRequestDTO,
  User,
} from "@/types";

type ApiUser = {
  id: string;
  email: string;
  name?: string;
  displayName?: string;
  role: string;
  createdAt?: string;
};

type OAuthExchangePayload = {
  accessToken?: string;
  token?: string;
  user: ApiUser;
};

function getApiBase(): string {
  return (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/, "");
}

function extractProjectIdFromApiBase(base: string): string | null {
  const m = base.match(/\/api\/v1\/p\/([0-9a-fA-F-]+)$/);
  return m?.[1] ?? null;
}

function oauthStartUrl(provider: "google" | "github"): string {
  const base = getApiBase();
  const redirect = typeof window !== "undefined" ? window.location.origin : "";
  const projectId = extractProjectIdFromApiBase(base);
  const q = new URLSearchParams();
  if (redirect) q.set("redirect", redirect);
  if (projectId) q.set("projectId", projectId);

  // Strip /p/{projectId} suffix so auth routes resolve correctly
  // e.g. /api/v1/p/{id} → /api/v1
  const authBase = projectId ? base.replace(/\/p\/[0-9a-fA-F-]+$/, "") : base;
  const qs = q.toString() ? `?${q.toString()}` : "";

  if (authBase.endsWith("/api/v1")) {
    return `${authBase}/auth/oauth/${provider}${qs}`;
  }

  if (authBase) {
    return `${authBase}/api/v1/auth/oauth/${provider}${qs}`;
  }

  return `/api/v1/auth/oauth/${provider}${qs}`;
}

function toUser(u: ApiUser): User {
  return {
    id: u.id,
    email: u.email,
    displayName: u.displayName ?? u.name ?? "",
    role: u.role,
    createdAt: u.createdAt ?? new Date().toISOString(),
  };
}

export const authApi = {
  register: (data: RegisterRequestDTO) =>
    // NexusForge expects `name`, not `displayName`.
    api.post<{ data: ApiUser }>(
      "/auth/register",
      { email: data.email, password: data.password, name: data.displayName },
    ).then((res) => ({
      ...res,
      data: {
        ...res.data,
        data: toUser(res.data.data),
      },
    })),

  login: (data: LoginRequestDTO) =>
    api.post<{ data: { token?: string; accessToken?: string; user: ApiUser } }>("/auth/login", data).then((res) => ({
      ...res,
      data: {
        ...res.data,
        data: {
          token: res.data.data.token ?? res.data.data.accessToken ?? "",
          user: toUser(res.data.data.user),
        },
      },
    })) as unknown as Promise<{ data: LoginResponseDTO }>,

  getOAuthStartUrl: (provider: "google" | "github") => oauthStartUrl(provider),

  exchangeOAuthCode: (code: string) =>
    api.post<{ data: OAuthExchangePayload }>("/auth/oauth/exchange", { code }).then((res) => ({
      ...res,
      data: {
        ...res.data,
        data: {
          token: res.data.data.token ?? res.data.data.accessToken ?? "",
          user: toUser(res.data.data.user),
        },
      },
    })) as unknown as Promise<{ data: LoginResponseDTO }>,

  logout: () => api.post("/auth/logout"),

  getProfile: () =>
    api.get<{ data: ApiUser }>("/auth/me").then((res) => ({
      ...res,
      data: {
        ...res.data,
        data: toUser(res.data.data),
      },
    })),

  updateProfile: (data: UpdateProfileRequestDTO) =>
    // NexusForge PATCH /auth/me accepts `name`.
    api.patch<{ data: ApiUser }>("/auth/me", {
      ...(data.displayName !== undefined ? { name: data.displayName } : {}),
      ...(data.currentPassword !== undefined ? { currentPassword: data.currentPassword } : {}),
      ...(data.newPassword !== undefined ? { newPassword: data.newPassword } : {}),
    }).then((res) => ({
      ...res,
      data: {
        ...res.data,
        data: toUser(res.data.data),
      },
    })),

  deleteAccount: () => api.delete("/auth/me"),
};

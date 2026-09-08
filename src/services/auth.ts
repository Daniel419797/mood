import api, { getApiBase } from "@/lib/api";
import type {
  LoginRequestDTO,
  LoginResponseDTO,
  RegisterRequestDTO,
  UpdateProfileRequestDTO,
  User,
} from "@/types";

type SessionResponse = {
  data: {
    token: string;
    user: User;
  };
  message: string;
};

export const authApi = {
  register: (data: RegisterRequestDTO) =>
    api.post<{ data: User; message: string }>("/auth/register", data),

  login: (data: LoginRequestDTO) =>
    api.post<SessionResponse>("/auth/login", data) as unknown as Promise<{ data: LoginResponseDTO }>,

  getOAuthStartUrl: (provider: "google") => {
    if (typeof window === "undefined") return "";
    const apiBase = new URL(getApiBase(), window.location.origin);
    const url = new URL(`${apiBase.toString().replace(/\/+$/, "")}/auth/oauth/${provider}`);
    url.searchParams.set("redirect", window.location.origin);
    return url.toString();
  },

  completeOAuth: () =>
    api.post<SessionResponse>("/auth/refresh", {}) as unknown as Promise<{ data: LoginResponseDTO }>,

  logout: () => api.post("/auth/logout"),

  getProfile: () => api.get<{ data: User }>("/auth/me"),

  updateProfile: (data: UpdateProfileRequestDTO) =>
    api.patch<{ data: User }>("/auth/me", data),

  deleteAccount: () => api.delete("/auth/me"),
};

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

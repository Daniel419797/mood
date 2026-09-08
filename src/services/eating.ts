import api from "@/lib/api";
import type {
  CreateEatingLogRequestDTO,
  EatingLog,
  ListResponseDTO,
  LogQueryParams,
  UpdateEatingLogRequestDTO,
} from "@/types";

export const eatingApi = {
  list: (params?: LogQueryParams) =>
    api.get<ListResponseDTO<EatingLog>>("/eating", {
      params: {
        ...(params?.from ? { from: params.from } : {}),
        ...(params?.to ? { to: params.to } : {}),
        limit: params?.limit ?? 200,
        offset: 0,
      },
    }),

  create: (data: CreateEatingLogRequestDTO) =>
    api.post<{ data: EatingLog }>("/eating", data),

  update: (id: string, data: UpdateEatingLogRequestDTO) =>
    api.patch<{ data: EatingLog }>(`/eating/${id}`, data),

  delete: (id: string) => api.delete(`/eating/${id}`),
};

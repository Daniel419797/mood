import api from "@/lib/api";
import type {
  CreateMoodLogRequestDTO,
  ListResponseDTO,
  LogQueryParams,
  MoodLog,
  UpdateMoodLogRequestDTO,
} from "@/types";

export const moodApi = {
  list: (params?: LogQueryParams) =>
    api.get<ListResponseDTO<MoodLog>>("/moods", {
      params: {
        ...(params?.from ? { from: params.from } : {}),
        ...(params?.to ? { to: params.to } : {}),
        limit: params?.limit ?? 200,
        offset: 0,
      },
    }),

  create: (data: CreateMoodLogRequestDTO) =>
    api.post<{ data: MoodLog }>("/moods", data),

  update: (id: string, data: UpdateMoodLogRequestDTO) =>
    api.patch<{ data: MoodLog }>(`/moods/${id}`, data),

  delete: (id: string) => api.delete(`/moods/${id}`),
};

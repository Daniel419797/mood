import api from "@/lib/api";
import type {
  CreateMoodLogRequestDTO,
  ListResponseDTO,
  LogQueryParams,
  MoodLog,
  UpdateMoodLogRequestDTO,
} from "@/types";

type MoodRow = {
  id: string;
  user_id: string;
  mood_score: number;
  mood_label: MoodLog["moodLabel"];
  stress_level: number;
  energy_level: number;
  sleep_hours: number;
  workload: MoodLog["workload"];
  notes?: string;
  logged_at: string;
};

function getCurrentUserId(): string {
  if (typeof window === "undefined") return "";
  const token = localStorage.getItem("token");
  if (!token) return "";
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))) as Record<string, string>;
    return payload.sub ?? payload.userId ?? payload.id ?? "";
  } catch {
    return "";
  }
}

function toMoodLog(row: MoodRow): MoodLog {
  return {
    id: row.id,
    userId: row.user_id,
    moodScore: row.mood_score,
    moodLabel: row.mood_label,
    stressLevel: row.stress_level,
    energyLevel: row.energy_level,
    sleepHours: row.sleep_hours,
    workload: row.workload,
    notes: row.notes,
    loggedAt: row.logged_at,
  };
}

function toMoodRowPayload(data: CreateMoodLogRequestDTO | UpdateMoodLogRequestDTO): Partial<MoodRow> {
  const payload: Partial<MoodRow> = {};
  if (data.moodScore !== undefined) payload.mood_score = data.moodScore;
  if (data.moodLabel !== undefined) payload.mood_label = data.moodLabel;
  if (data.stressLevel !== undefined) payload.stress_level = data.stressLevel;
  if (data.energyLevel !== undefined) payload.energy_level = data.energyLevel;
  if (data.sleepHours !== undefined) payload.sleep_hours = data.sleepHours;
  if (data.workload !== undefined) payload.workload = data.workload;
  if (data.notes !== undefined) payload.notes = data.notes;
  return payload;
}

function asListResponse(rows: MoodLog[], limit: number, offset: number): ListResponseDTO<MoodLog> {
  return {
    data: rows,
    total: rows.length,
    limit,
    offset,
  };
}

export const moodApi = {
  list: async (params?: LogQueryParams) => {
    const limit = params?.limit ?? 200;
    const offset = 0;
    const userId = getCurrentUserId();
    const res = await api.get<{ data: { rows: MoodRow[]; total: number } }>("/table/mood_logs", {
      params: { limit, offset },
    });
    let rows = (res.data.data.rows ?? []).map(toMoodLog);
    if (userId) rows = rows.filter((r) => r.userId === userId);
    if (params?.from) rows = rows.filter((r) => r.loggedAt >= params.from!);
    if (params?.to) rows = rows.filter((r) => r.loggedAt <= `${params.to}T23:59:59Z`);
    return { ...res, data: asListResponse(rows, limit, offset) };
  },

  create: async (data: CreateMoodLogRequestDTO) => {
    const userId = getCurrentUserId();
    const payload: Partial<MoodRow> = {
      ...toMoodRowPayload(data),
      user_id: userId,
      logged_at: new Date().toISOString(),
    };
    const res = await api.post<{ data: MoodRow }>("/table/mood_logs", payload);
    return { ...res, data: { data: toMoodLog(res.data.data) } };
  },

  update: async (id: string, data: UpdateMoodLogRequestDTO) => {
    const res = await api.patch<{ data: MoodRow }>(`/table/mood_logs/${id}`, toMoodRowPayload(data));
    return { ...res, data: { data: toMoodLog(res.data.data) } };
  },

  delete: (id: string) => api.delete(`/table/mood_logs/${id}`),
};

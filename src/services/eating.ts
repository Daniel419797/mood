import api from "@/lib/api";
import type {
  CreateEatingLogRequestDTO,
  EatingLog,
  ListResponseDTO,
  LogQueryParams,
  UpdateEatingLogRequestDTO,
} from "@/types";

type EatingRow = {
  id: string;
  user_id: string;
  meal_type: EatingLog["mealType"];
  food_category: EatingLog["foodCategory"];
  portion_rating: EatingLog["portionRating"];
  hunger_before: number;
  time_of_day: EatingLog["timeOfDay"];
  description?: string;
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

function toEatingLog(row: EatingRow): EatingLog {
  return {
    id: row.id,
    userId: row.user_id,
    mealType: row.meal_type,
    foodCategory: row.food_category,
    portionRating: row.portion_rating,
    hungerBefore: row.hunger_before,
    timeOfDay: row.time_of_day,
    description: row.description,
    loggedAt: row.logged_at,
  };
}

function toEatingRowPayload(data: CreateEatingLogRequestDTO | UpdateEatingLogRequestDTO): Partial<EatingRow> {
  const payload: Partial<EatingRow> = {};
  if (data.mealType !== undefined) payload.meal_type = data.mealType;
  if (data.foodCategory !== undefined) payload.food_category = data.foodCategory;
  if (data.portionRating !== undefined) payload.portion_rating = data.portionRating;
  if (data.hungerBefore !== undefined) payload.hunger_before = data.hungerBefore;
  if (data.timeOfDay !== undefined) payload.time_of_day = data.timeOfDay;
  if (data.description !== undefined) payload.description = data.description;
  return payload;
}

function asListResponse(rows: EatingLog[], limit: number, offset: number): ListResponseDTO<EatingLog> {
  return {
    data: rows,
    total: rows.length,
    limit,
    offset,
  };
}

export const eatingApi = {
  list: async (params?: LogQueryParams) => {
    const limit = params?.limit ?? 200;
    const offset = 0;
    const userId = getCurrentUserId();
    const res = await api.get<{ data: { rows: EatingRow[]; total: number } }>("/table/eating_logs", {
      params: { limit, offset },
    });
    let rows = (res.data.data.rows ?? []).map(toEatingLog);
    if (userId) rows = rows.filter((r) => r.userId === userId);
    if (params?.from) rows = rows.filter((r) => r.loggedAt >= params.from!);
    if (params?.to) rows = rows.filter((r) => r.loggedAt <= `${params.to}T23:59:59Z`);
    return { ...res, data: asListResponse(rows, limit, offset) };
  },

  create: async (data: CreateEatingLogRequestDTO) => {
    const userId = getCurrentUserId();
    const payload: Partial<EatingRow> = {
      ...toEatingRowPayload(data),
      user_id: userId,
      logged_at: new Date().toISOString(),
    };
    const res = await api.post<{ data: EatingRow }>("/table/eating_logs", payload);
    return { ...res, data: { data: toEatingLog(res.data.data) } };
  },

  update: async (id: string, data: UpdateEatingLogRequestDTO) => {
    const res = await api.patch<{ data: EatingRow }>(`/table/eating_logs/${id}`, toEatingRowPayload(data));
    return { ...res, data: { data: toEatingLog(res.data.data) } };
  },

  delete: (id: string) => api.delete(`/table/eating_logs/${id}`),
};

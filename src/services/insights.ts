import api from "@/lib/api";
import type { DashboardRange, DashboardResponseDTO, InsightsResponseDTO } from "@/types";

const INSIGHT_THRESHOLD_KEY = "insight_threshold";
const DEFAULT_INSIGHT_THRESHOLD = 60;

function getInsightThreshold(): number {
  if (typeof window === "undefined") return DEFAULT_INSIGHT_THRESHOLD;
  const raw = window.localStorage.getItem(INSIGHT_THRESHOLD_KEY);
  if (!raw) return DEFAULT_INSIGHT_THRESHOLD;

  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return DEFAULT_INSIGHT_THRESHOLD;
  return Math.min(95, Math.max(40, Math.round(parsed)));
}

export const insightsApi = {
  getInsights: () =>
    api.get<InsightsResponseDTO>("/analytics/insights", {
      params: {
        range: "30d",
        threshold: getInsightThreshold(),
      },
    }),

  getDashboard: (range: DashboardRange = "30d") =>
    api.get<DashboardResponseDTO>("/analytics/dashboard", {
      params: {
        range,
        threshold: getInsightThreshold(),
      },
    }),
};

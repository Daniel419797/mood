import api from "@/lib/api";
import type {
  DashboardRange,
  DashboardResponseDTO,
  EatingLog,
  InsightDTO,
  InsightsResponseDTO,
  MoodLog,
} from "@/types";
import { moodApi } from "@/services/mood";
import { eatingApi } from "@/services/eating";

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

function rangeStart(range: DashboardRange): Date | null {
  if (range === "all") return null;
  const d = new Date();
  if (range === "7d") d.setDate(d.getDate() - 7);
  if (range === "30d") d.setDate(d.getDate() - 30);
  return d;
}

function inRange(iso: string, start: Date | null): boolean {
  if (!start) return true;
  return new Date(iso).getTime() >= start.getTime();
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function buildMoodTrend(moods: MoodLog[]) {
  const byDay = new Map<string, { moodSum: number; stressSum: number; count: number }>();
  for (const m of moods) {
    const day = m.loggedAt.slice(0, 10);
    const current = byDay.get(day) ?? { moodSum: 0, stressSum: 0, count: 0 };
    current.moodSum += m.moodScore;
    current.stressSum += m.stressLevel;
    current.count += 1;
    byDay.set(day, current);
  }
  return Array.from(byDay.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, v]) => ({
      date,
      avgMoodScore: round2(v.moodSum / v.count),
      avgStressLevel: round2(v.stressSum / v.count),
    }));
}

function topCategory<T extends string>(values: T[]): T | null {
  if (values.length === 0) return null;
  const counts = new Map<T, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  return sorted[0]?.[0] ?? null;
}

function buildEatingFrequency(eating: EatingLog[]) {
  const counts = new Map<EatingLog["foodCategory"], number>();
  for (const e of eating) counts.set(e.foodCategory, (counts.get(e.foodCategory) ?? 0) + 1);
  return Array.from(counts.entries()).map(([foodCategory, count]) => ({ foodCategory, count }));
}

function buildStressFoodCorrelation(moods: MoodLog[], eating: EatingLog[]) {
  const byDayMood = new Map<string, number[]>();
  for (const m of moods) {
    const day = m.loggedAt.slice(0, 10);
    const list = byDayMood.get(day) ?? [];
    list.push(m.stressLevel);
    byDayMood.set(day, list);
  }

  const empty = { Healthy: 0, Neutral: 0, Sugary: 0, Junk: 0, Skipped: 0 };
  const buckets = new Map<string, typeof empty>();

  for (const e of eating) {
    const day = e.loggedAt.slice(0, 10);
    const stressList = byDayMood.get(day);
    if (!stressList || stressList.length === 0) continue;
    const avg = stressList.reduce((a, b) => a + b, 0) / stressList.length;
    const level = String(Math.max(1, Math.min(5, Math.round(avg))));
    const bucket = buckets.get(level) ?? { ...empty };
    bucket[e.foodCategory] += 1;
    buckets.set(level, bucket);
  }

  return Array.from(buckets.entries())
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([stressLevel, v]) => ({ stressLevel, ...v }));
}

function buildInsights(moods: MoodLog[], eating: EatingLog[], thresholdPct: number): InsightDTO[] {
  const insights: InsightDTO[] = [];
  const totalDays = new Set([...moods, ...eating].map((x) => x.loggedAt.slice(0, 10))).size;
  const threshold = thresholdPct / 100;

  const stressed = moods.filter((m) => m.stressLevel >= 4).map((m) => m.loggedAt.slice(0, 10));
  const stressedDays = new Set(stressed);
  const sugaryDays = new Set(
    eating.filter((e) => e.foodCategory === "Sugary" || e.foodCategory === "Junk").map((e) => e.loggedAt.slice(0, 10)),
  );
  const overlap1 = Array.from(stressedDays).filter((d) => sugaryDays.has(d)).length;
  if (stressedDays.size > 0) {
    const score = overlap1 / stressedDays.size;
    if (score >= threshold) {
      insights.push({
        correlationId: "stress-sugary",
        headline: "Higher stress days align with sugary/junk choices",
        supportingStat: `${overlap1}/${stressedDays.size} high-stress days included sugary/junk meals`,
        dateRangeLabel: "Recent tracking period",
        suggestion: "Try a planned healthy snack on high-stress days to avoid reactive choices.",
        strengthScore: round2(score),
        matchingDays: overlap1,
        totalDays,
      });
    }
  }

  const lowSleepDays = new Set(moods.filter((m) => m.sleepHours < 6).map((m) => m.loggedAt.slice(0, 10)));
  const lowMoodDays = new Set(moods.filter((m) => m.moodScore <= 2).map((m) => m.loggedAt.slice(0, 10)));
  const overlap2 = Array.from(lowSleepDays).filter((d) => lowMoodDays.has(d)).length;
  if (lowSleepDays.size > 0) {
    const score = overlap2 / lowSleepDays.size;
    if (score >= threshold) {
      insights.push({
        correlationId: "sleep-mood",
        headline: "Short sleep correlates with lower mood",
        supportingStat: `${overlap2}/${lowSleepDays.size} low-sleep days had low mood scores`,
        dateRangeLabel: "Recent tracking period",
        suggestion: "Protect your sleep window and monitor whether mood improves over a week.",
        strengthScore: round2(score),
        matchingDays: overlap2,
        totalDays,
      });
    }
  }

  return insights.sort((a, b) => b.strengthScore - a.strengthScore);
}

export const insightsApi = {
  getInsights: async () => {
    const threshold = getInsightThreshold();
    const [moodRes, eatingRes] = await Promise.all([
      moodApi.list({ limit: 1000 }),
      eatingApi.list({ limit: 1000 }),
    ]);
    const moods = moodRes.data.data;
    const eating = eatingRes.data.data;
    const allDays = new Set([...moods, ...eating].map((x) => x.loggedAt.slice(0, 10))).size;
    const requiredDays = 7;

    if (allDays < requiredDays) {
      return {
        data: {
          data: {
            insufficientData: true,
            daysLogged: allDays,
            requiredDays,
          },
        },
      } as { data: InsightsResponseDTO };
    }

    const insights = buildInsights(moods, eating, threshold);
    return {
      data: {
        data: {
          insufficientData: false,
          insights,
          lastUpdated: new Date().toISOString(),
          threshold,
        },
      },
    } as { data: InsightsResponseDTO };
  },

  getDashboard: async (range: DashboardRange = "30d") => {
    const threshold = getInsightThreshold();
    const [moodRes, eatingRes] = await Promise.all([
      moodApi.list({ limit: 1000 }),
      eatingApi.list({ limit: 1000 }),
    ]);

    const start = rangeStart(range);
    const moods = moodRes.data.data.filter((m) => inRange(m.loggedAt, start));
    const eating = eatingRes.data.data.filter((e) => inRange(e.loggedAt, start));

    const summary = {
      totalMoodLogs: moods.length,
      totalEatingLogs: eating.length,
      daysTracked: new Set([...moods, ...eating].map((x) => x.loggedAt.slice(0, 10))).size,
      topMoodLabel: topCategory(moods.map((m) => m.moodLabel)),
      topFoodCategory: topCategory(eating.map((e) => e.foodCategory)),
    };

    const topInsights = buildInsights(moods, eating, threshold).slice(0, 3);

    return {
      data: {
        data: {
          summary,
          moodTrend: buildMoodTrend(moods),
          eatingFrequency: buildEatingFrequency(eating),
          stressFoodCorrelation: buildStressFoodCorrelation(moods, eating),
          topInsights,
        },
      },
    } as { data: DashboardResponseDTO };
  },
};

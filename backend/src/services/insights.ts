export type MoodPoint = {
  moodScore: number;
  moodLabel: "Happy" | "Anxious" | "Stressed" | "Sad" | "Calm" | "Bored";
  stressLevel: number;
  sleepHours: number;
  loggedAt: Date;
};

export type EatingPoint = {
  foodCategory: "Healthy" | "Neutral" | "Sugary" | "Junk" | "Skipped";
  loggedAt: Date;
};

export type Insight = {
  correlationId: string;
  headline: string;
  supportingStat: string;
  dateRangeLabel: string;
  suggestion: string;
  strengthScore: number;
  matchingDays: number;
  totalDays: number;
};

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function topCategory<T extends string>(values: T[]): T | null {
  if (values.length === 0) return null;
  const counts = new Map<T, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

export function buildInsights(moods: MoodPoint[], eating: EatingPoint[], thresholdPct: number): Insight[] {
  const insights: Insight[] = [];
  const totalDays = new Set([...moods.map((m) => dateKey(m.loggedAt)), ...eating.map((e) => dateKey(e.loggedAt))]).size;
  const threshold = thresholdPct / 100;

  const stressedDays = new Set(moods.filter((m) => m.stressLevel >= 4).map((m) => dateKey(m.loggedAt)));
  const sugaryDays = new Set(
    eating.filter((e) => e.foodCategory === "Sugary" || e.foodCategory === "Junk").map((e) => dateKey(e.loggedAt)),
  );
  const stressedSugaryOverlap = [...stressedDays].filter((day) => sugaryDays.has(day)).length;

  if (stressedDays.size > 0) {
    const score = stressedSugaryOverlap / stressedDays.size;
    if (score >= threshold) {
      insights.push({
        correlationId: "stress-sugary",
        headline: "Higher stress days align with sugary/junk choices",
        supportingStat: `${stressedSugaryOverlap}/${stressedDays.size} high-stress days included sugary/junk meals`,
        dateRangeLabel: "Selected tracking period",
        suggestion: "Try a planned healthy snack on high-stress days and compare the pattern over time.",
        strengthScore: round2(score),
        matchingDays: stressedSugaryOverlap,
        totalDays,
      });
    }
  }

  const lowSleepDays = new Set(moods.filter((m) => m.sleepHours < 6).map((m) => dateKey(m.loggedAt)));
  const lowMoodDays = new Set(moods.filter((m) => m.moodScore <= 2).map((m) => dateKey(m.loggedAt)));
  const sleepMoodOverlap = [...lowSleepDays].filter((day) => lowMoodDays.has(day)).length;

  if (lowSleepDays.size > 0) {
    const score = sleepMoodOverlap / lowSleepDays.size;
    if (score >= threshold) {
      insights.push({
        correlationId: "sleep-mood",
        headline: "Short sleep correlates with lower mood",
        supportingStat: `${sleepMoodOverlap}/${lowSleepDays.size} low-sleep days had low mood scores`,
        dateRangeLabel: "Selected tracking period",
        suggestion: "Protect your sleep window and watch whether your mood pattern changes over the next week.",
        strengthScore: round2(score),
        matchingDays: sleepMoodOverlap,
        totalDays,
      });
    }
  }

  return insights.sort((a, b) => b.strengthScore - a.strengthScore);
}

export function buildDashboard(moods: MoodPoint[], eating: EatingPoint[], thresholdPct: number) {
  const moodByDay = new Map<string, { mood: number; stress: number; count: number }>();
  for (const mood of moods) {
    const day = dateKey(mood.loggedAt);
    const current = moodByDay.get(day) ?? { mood: 0, stress: 0, count: 0 };
    current.mood += mood.moodScore;
    current.stress += mood.stressLevel;
    current.count += 1;
    moodByDay.set(day, current);
  }

  const moodTrend = [...moodByDay.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, value]) => ({
      date,
      avgMoodScore: round2(value.mood / value.count),
      avgStressLevel: round2(value.stress / value.count),
    }));

  const foodCounts = new Map<EatingPoint["foodCategory"], number>();
  for (const entry of eating) {
    foodCounts.set(entry.foodCategory, (foodCounts.get(entry.foodCategory) ?? 0) + 1);
  }

  const eatingFrequency = [...foodCounts.entries()].map(([foodCategory, count]) => ({ foodCategory, count }));

  const emptyBucket = () => ({ Healthy: 0, Neutral: 0, Sugary: 0, Junk: 0, Skipped: 0 });
  const stressFood = new Map<string, ReturnType<typeof emptyBucket>>();
  for (const entry of eating) {
    const day = dateKey(entry.loggedAt);
    const mood = moodByDay.get(day);
    if (!mood) continue;

    const level = String(Math.max(1, Math.min(5, Math.round(mood.stress / mood.count))));
    const bucket = stressFood.get(level) ?? emptyBucket();
    bucket[entry.foodCategory] += 1;
    stressFood.set(level, bucket);
  }

  const stressFoodCorrelation = [...stressFood.entries()]
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([stressLevel, values]) => ({ stressLevel, ...values }));

  const daysTracked = new Set([
    ...moods.map((m) => dateKey(m.loggedAt)),
    ...eating.map((e) => dateKey(e.loggedAt)),
  ]).size;

  return {
    summary: {
      totalMoodLogs: moods.length,
      totalEatingLogs: eating.length,
      daysTracked,
      topMoodLabel: topCategory(moods.map((m) => m.moodLabel)),
      topFoodCategory: topCategory(eating.map((e) => e.foodCategory)),
    },
    moodTrend,
    eatingFrequency,
    stressFoodCorrelation,
    topInsights: buildInsights(moods, eating, thresholdPct).slice(0, 3),
  };
}

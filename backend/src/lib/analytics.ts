export type InsightEvidence = "strong" | "emerging";
export type InsightDirection = "positive" | "negative";

export interface AnalyticsMoodLog {
  moodScore: number;
  moodLabel: string;
  stressLevel: number;
  energyLevel: number;
  sleepHours: number;
  workload: string;
  loggedAt: Date | string;
}

export interface AnalyticsEatingLog {
  foodCategory: string;
  portionRating: string;
  timeOfDay: string;
  loggedAt: Date | string;
}

export interface BehavioralInsight {
  correlationId: string;
  headline: string;
  supportingStat: string;
  dateRangeLabel: string;
  suggestion: string;
  strengthScore: number;
  patternConsistency: number;
  triggerOutcomeRate: number;
  baselineOutcomeRate: number;
  lift: number;
  pValue: number;
  evidence: InsightEvidence;
  direction: InsightDirection;
  matchingDays: number;
  triggerDays: number;
  totalDays: number;
}

interface DailyAggregate {
  date: string;
  moodCount: number;
  moodSum: number;
  stressSum: number;
  energySum: number;
  sleepSum: number;
  highWorkload: boolean;
  eatingCount: number;
  sugaryOrJunk: boolean;
  skippedMeal: boolean;
  largeOrBinge: boolean;
  nightEating: boolean;
  healthyMeal: boolean;
}

interface PatternSpec {
  id: string;
  triggerDescription: string;
  outcomeDescription: string;
  positiveHeadline: string;
  negativeHeadline: string;
  positiveSuggestion: string;
  negativeSuggestion: string;
  eligible: (day: DailyAggregate) => boolean;
  trigger: (day: DailyAggregate) => boolean;
  outcome: (day: DailyAggregate) => boolean;
}

const MIN_ANALYZED_DAYS = 7;
const MIN_TRIGGER_DAYS = 3;
const MIN_COMPARISON_DAYS = 3;
const MIN_ABSOLUTE_LIFT = 0.1;
const MIN_ASSOCIATION_STRENGTH = 0.1;

function round(value: number, digits = 4): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function percent(value: number): number {
  return Math.round(value * 100);
}

function isoDay(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString().slice(0, 10);
}

function emptyDay(date: string): DailyAggregate {
  return {
    date,
    moodCount: 0,
    moodSum: 0,
    stressSum: 0,
    energySum: 0,
    sleepSum: 0,
    highWorkload: false,
    eatingCount: 0,
    sugaryOrJunk: false,
    skippedMeal: false,
    largeOrBinge: false,
    nightEating: false,
    healthyMeal: false,
  };
}

function buildDailyAggregates(
  moods: AnalyticsMoodLog[],
  eating: AnalyticsEatingLog[],
): DailyAggregate[] {
  const byDay = new Map<string, DailyAggregate>();

  for (const mood of moods) {
    const date = isoDay(mood.loggedAt);
    const day = byDay.get(date) ?? emptyDay(date);
    day.moodCount += 1;
    day.moodSum += mood.moodScore;
    day.stressSum += mood.stressLevel;
    day.energySum += mood.energyLevel;
    day.sleepSum += mood.sleepHours;
    day.highWorkload ||= mood.workload === "High";
    byDay.set(date, day);
  }

  for (const meal of eating) {
    const date = isoDay(meal.loggedAt);
    const day = byDay.get(date) ?? emptyDay(date);
    day.eatingCount += 1;
    day.sugaryOrJunk ||= meal.foodCategory === "Sugary" || meal.foodCategory === "Junk";
    day.skippedMeal ||= meal.foodCategory === "Skipped";
    day.largeOrBinge ||= meal.portionRating === "Large" || meal.portionRating === "Binge";
    day.nightEating ||= meal.timeOfDay === "Night";
    day.healthyMeal ||= meal.foodCategory === "Healthy";
    byDay.set(date, day);
  }

  return Array.from(byDay.values()).sort((a, b) => a.date.localeCompare(b.date));
}

function avgMood(day: DailyAggregate): number {
  return day.moodCount === 0 ? 0 : day.moodSum / day.moodCount;
}

function avgStress(day: DailyAggregate): number {
  return day.moodCount === 0 ? 0 : day.stressSum / day.moodCount;
}

function avgEnergy(day: DailyAggregate): number {
  return day.moodCount === 0 ? 0 : day.energySum / day.moodCount;
}

function avgSleep(day: DailyAggregate): number {
  return day.moodCount === 0 ? 0 : day.sleepSum / day.moodCount;
}

const patterns: PatternSpec[] = [
  {
    id: "stress-sugary",
    triggerDescription: "high-stress",
    outcomeDescription: "sugary/junk food",
    positiveHeadline: "Higher-stress days align with more sugary/junk choices",
    negativeHeadline: "Higher-stress days align with fewer sugary/junk choices",
    positiveSuggestion: "Plan an easy alternative snack or meal for high-stress periods and see whether the pattern changes.",
    negativeSuggestion: "Your current logs suggest high stress is not driving sugary/junk choices. Keep logging to confirm the pattern.",
    eligible: (day) => day.moodCount > 0 && day.eatingCount > 0,
    trigger: (day) => avgStress(day) >= 4,
    outcome: (day) => day.sugaryOrJunk,
  },
  {
    id: "sleep-mood",
    triggerDescription: "short-sleep",
    outcomeDescription: "low mood",
    positiveHeadline: "Short-sleep days align with lower mood",
    negativeHeadline: "Short-sleep days align with less low mood",
    positiveSuggestion: "Protect a consistent sleep window and compare your mood over the next week.",
    negativeSuggestion: "Low mood is currently less common after short sleep in your logs. Continue tracking before drawing conclusions.",
    eligible: (day) => day.moodCount > 0,
    trigger: (day) => avgSleep(day) < 6,
    outcome: (day) => avgMood(day) <= 2.5,
  },
  {
    id: "sleep-stress",
    triggerDescription: "short-sleep",
    outcomeDescription: "high stress",
    positiveHeadline: "Short-sleep days align with higher stress",
    negativeHeadline: "Short-sleep days align with less high stress",
    positiveSuggestion: "Track whether improving sleep duration changes next-day stress levels.",
    negativeSuggestion: "Your current logs do not show higher stress on short-sleep days. Keep tracking as the sample grows.",
    eligible: (day) => day.moodCount > 0,
    trigger: (day) => avgSleep(day) < 6,
    outcome: (day) => avgStress(day) >= 4,
  },
  {
    id: "workload-stress",
    triggerDescription: "high-workload",
    outcomeDescription: "high stress",
    positiveHeadline: "High-workload days align with higher stress",
    negativeHeadline: "High-workload days align with less high stress",
    positiveSuggestion: "On high-workload days, schedule a short recovery block and track whether stress shifts.",
    negativeSuggestion: "High-workload days are currently associated with less high stress in your logs. Keep logging to verify this.",
    eligible: (day) => day.moodCount > 0,
    trigger: (day) => day.highWorkload,
    outcome: (day) => avgStress(day) >= 4,
  },
  {
    id: "workload-mood",
    triggerDescription: "high-workload",
    outcomeDescription: "low mood",
    positiveHeadline: "High-workload days align with lower mood",
    negativeHeadline: "High-workload days align with less low mood",
    positiveSuggestion: "Compare mood on high-workload days where you add breaks versus days without them.",
    negativeSuggestion: "Your current logs show less low mood on high-workload days. More data will show whether that holds.",
    eligible: (day) => day.moodCount > 0,
    trigger: (day) => day.highWorkload,
    outcome: (day) => avgMood(day) <= 2.5,
  },
  {
    id: "stress-mood",
    triggerDescription: "high-stress",
    outcomeDescription: "low mood",
    positiveHeadline: "Higher-stress days align with lower mood",
    negativeHeadline: "Higher-stress days align with less low mood",
    positiveSuggestion: "Note what was happening on high-stress days so you can test which changes improve mood.",
    negativeSuggestion: "Low mood is currently less common on high-stress days in your logs. Continue tracking for a larger sample.",
    eligible: (day) => day.moodCount > 0,
    trigger: (day) => avgStress(day) >= 4,
    outcome: (day) => avgMood(day) <= 2.5,
  },
  {
    id: "stress-energy",
    triggerDescription: "high-stress",
    outcomeDescription: "low energy",
    positiveHeadline: "Higher-stress days align with lower energy",
    negativeHeadline: "Higher-stress days align with less low energy",
    positiveSuggestion: "Track rest breaks, hydration, and meal timing on high-stress days to see what changes the energy pattern.",
    negativeSuggestion: "Low energy is currently less common on high-stress days in your logs. Keep tracking before interpreting it.",
    eligible: (day) => day.moodCount > 0,
    trigger: (day) => avgStress(day) >= 4,
    outcome: (day) => avgEnergy(day) <= 2.5,
  },
  {
    id: "sleep-energy",
    triggerDescription: "short-sleep",
    outcomeDescription: "low energy",
    positiveHeadline: "Short-sleep days align with lower energy",
    negativeHeadline: "Short-sleep days align with less low energy",
    positiveSuggestion: "Compare energy after nights with at least six hours of sleep against shorter nights.",
    negativeSuggestion: "Low energy is currently less common after short sleep in your logs. Continue tracking to test whether it persists.",
    eligible: (day) => day.moodCount > 0,
    trigger: (day) => avgSleep(day) < 6,
    outcome: (day) => avgEnergy(day) <= 2.5,
  },
  {
    id: "energy-food",
    triggerDescription: "low-energy",
    outcomeDescription: "sugary/junk food",
    positiveHeadline: "Low-energy days align with more sugary/junk choices",
    negativeHeadline: "Low-energy days align with fewer sugary/junk choices",
    positiveSuggestion: "Prepare a convenient balanced option for low-energy periods and compare future logs.",
    negativeSuggestion: "Your current logs show fewer sugary/junk choices on low-energy days. Continue tracking to confirm it.",
    eligible: (day) => day.moodCount > 0 && day.eatingCount > 0,
    trigger: (day) => avgEnergy(day) <= 2.5,
    outcome: (day) => day.sugaryOrJunk,
  },
  {
    id: "mood-food",
    triggerDescription: "low-mood",
    outcomeDescription: "sugary/junk food",
    positiveHeadline: "Lower-mood days align with more sugary/junk choices",
    negativeHeadline: "Lower-mood days align with fewer sugary/junk choices",
    positiveSuggestion: "Keep an easy meal option available on low-mood days and compare whether food choices change.",
    negativeSuggestion: "Your current logs show fewer sugary/junk choices on low-mood days. Continue logging to verify the relationship.",
    eligible: (day) => day.moodCount > 0 && day.eatingCount > 0,
    trigger: (day) => avgMood(day) <= 2.5,
    outcome: (day) => day.sugaryOrJunk,
  },
  {
    id: "stress-skip",
    triggerDescription: "high-stress",
    outcomeDescription: "skipped meals",
    positiveHeadline: "Higher-stress days align with more skipped meals",
    negativeHeadline: "Higher-stress days align with fewer skipped meals",
    positiveSuggestion: "Use a simple meal reminder on high-stress days and see whether skipped meals decrease.",
    negativeSuggestion: "Skipped meals are currently less common on high-stress days in your logs. Keep tracking to confirm this.",
    eligible: (day) => day.moodCount > 0 && day.eatingCount > 0,
    trigger: (day) => avgStress(day) >= 4,
    outcome: (day) => day.skippedMeal,
  },
  {
    id: "stress-portion",
    triggerDescription: "high-stress",
    outcomeDescription: "large/binge portions",
    positiveHeadline: "Higher-stress days align with larger portions",
    negativeHeadline: "Higher-stress days align with fewer large portions",
    positiveSuggestion: "On high-stress days, pause before eating and log hunger first to see whether portion patterns change.",
    negativeSuggestion: "Large portions are currently less common on high-stress days. Continue tracking before treating this as stable.",
    eligible: (day) => day.moodCount > 0 && day.eatingCount > 0,
    trigger: (day) => avgStress(day) >= 4,
    outcome: (day) => day.largeOrBinge,
  },
  {
    id: "night-sugary",
    triggerDescription: "night-eating",
    outcomeDescription: "sugary/junk food",
    positiveHeadline: "Night-eating days align with more sugary/junk choices",
    negativeHeadline: "Night-eating days align with fewer sugary/junk choices",
    positiveSuggestion: "Compare nights with a planned evening meal against unplanned late eating.",
    negativeSuggestion: "Sugary/junk choices are currently less common on night-eating days. Keep logging to test whether that remains true.",
    eligible: (day) => day.eatingCount > 0,
    trigger: (day) => day.nightEating,
    outcome: (day) => day.sugaryOrJunk,
  },
  {
    id: "healthy-mood",
    triggerDescription: "healthy-meal",
    outcomeDescription: "high mood",
    positiveHeadline: "Healthy-meal days align with higher mood",
    negativeHeadline: "Healthy-meal days align with less high mood",
    positiveSuggestion: "Keep tracking meal quality and mood together to see whether this positive pattern holds.",
    negativeSuggestion: "High mood is currently less common on days with healthy meals. More logs are needed before interpreting that pattern.",
    eligible: (day) => day.moodCount > 0 && day.eatingCount > 0,
    trigger: (day) => day.healthyMeal && !day.sugaryOrJunk,
    outcome: (day) => avgMood(day) >= 4,
  },
];

function phiCoefficient(a: number, b: number, c: number, d: number): number {
  const denominator = Math.sqrt((a + b) * (c + d) * (a + c) * (b + d));
  if (denominator === 0) return 0;
  return (a * d - b * c) / denominator;
}

function fisherExactTwoSided(a: number, b: number, c: number, d: number): number {
  const row1 = a + b;
  const row2 = c + d;
  const col1 = a + c;
  const total = row1 + row2;

  const logFactorials = new Array<number>(total + 1).fill(0);
  for (let i = 1; i <= total; i += 1) {
    logFactorials[i] = (logFactorials[i - 1] ?? 0) + Math.log(i);
  }

  const logChoose = (n: number, k: number): number => {
    if (k < 0 || k > n) return Number.NEGATIVE_INFINITY;
    return (logFactorials[n] ?? 0) - (logFactorials[k] ?? 0) - (logFactorials[n - k] ?? 0);
  };

  const probability = (x: number): number =>
    Math.exp(logChoose(row1, x) + logChoose(row2, col1 - x) - logChoose(total, col1));

  const observed = probability(a);
  const minA = Math.max(0, col1 - row2);
  const maxA = Math.min(row1, col1);
  let p = 0;

  for (let x = minA; x <= maxA; x += 1) {
    const px = probability(x);
    if (px <= observed + 1e-12) p += px;
  }

  return Math.min(1, p);
}

function evaluatePattern(
  spec: PatternSpec,
  days: DailyAggregate[],
  dateRangeLabel: string,
): BehavioralInsight | null {
  const eligible = days.filter(spec.eligible);
  if (eligible.length < MIN_ANALYZED_DAYS) return null;

  let a = 0;
  let b = 0;
  let c = 0;
  let d = 0;

  for (const day of eligible) {
    const trigger = spec.trigger(day);
    const outcome = spec.outcome(day);
    if (trigger && outcome) a += 1;
    else if (trigger) b += 1;
    else if (outcome) c += 1;
    else d += 1;
  }

  const triggerDays = a + b;
  const comparisonDays = c + d;
  if (triggerDays < MIN_TRIGGER_DAYS || comparisonDays < MIN_COMPARISON_DAYS) return null;

  const triggerOutcomeRate = a / triggerDays;
  const baselineOutcomeRate = c / comparisonDays;
  const lift = triggerOutcomeRate - baselineOutcomeRate;
  const strengthScore = Math.abs(phiCoefficient(a, b, c, d));

  if (Math.abs(lift) < MIN_ABSOLUTE_LIFT || strengthScore < MIN_ASSOCIATION_STRENGTH) {
    return null;
  }

  const direction: InsightDirection = lift >= 0 ? "positive" : "negative";
  const patternConsistency = direction === "positive" ? triggerOutcomeRate : 1 - triggerOutcomeRate;
  const pValue = fisherExactTwoSided(a, b, c, d);

  return {
    correlationId: spec.id,
    headline: direction === "positive" ? spec.positiveHeadline : spec.negativeHeadline,
    supportingStat:
      "On " +
      a +
      "/" +
      triggerDays +
      " " +
      spec.triggerDescription +
      " days, " +
      spec.outcomeDescription +
      " was logged (" +
      percent(triggerOutcomeRate) +
      "% vs " +
      percent(baselineOutcomeRate) +
      "% on comparison days).",
    dateRangeLabel,
    suggestion: direction === "positive" ? spec.positiveSuggestion : spec.negativeSuggestion,
    strengthScore: round(strengthScore),
    patternConsistency: round(patternConsistency),
    triggerOutcomeRate: round(triggerOutcomeRate),
    baselineOutcomeRate: round(baselineOutcomeRate),
    lift: round(lift),
    pValue: round(pValue, 6),
    evidence: "emerging",
    direction,
    matchingDays: a,
    triggerDays,
    totalDays: eligible.length,
  };
}

function rankInsights(a: BehavioralInsight, b: BehavioralInsight): number {
  if (a.evidence !== b.evidence) return a.evidence === "strong" ? -1 : 1;
  if (b.strengthScore !== a.strengthScore) return b.strengthScore - a.strengthScore;
  if (Math.abs(b.lift) !== Math.abs(a.lift)) return Math.abs(b.lift) - Math.abs(a.lift);
  return b.patternConsistency - a.patternConsistency;
}

export function analyzeBehavioralInsights(
  moods: AnalyticsMoodLog[],
  eating: AnalyticsEatingLog[],
  patternThresholdPct: number,
  dateRangeLabel: string,
): { insights: BehavioralInsight[]; emergingInsights: BehavioralInsight[]; analyzedDays: number } {
  const days = buildDailyAggregates(moods, eating);
  const threshold = patternThresholdPct / 100;
  const evaluated = patterns
    .map((pattern) => evaluatePattern(pattern, days, dateRangeLabel))
    .filter((value): value is BehavioralInsight => value !== null);

  const correctionFactor = Math.max(1, evaluated.length);
  const candidates = evaluated
    .map((insight) => {
      const adjustedPValue = Math.min(1, insight.pValue * correctionFactor);
      const comparisonDays = insight.totalDays - insight.triggerDays;
      const evidence: InsightEvidence =
        insight.totalDays >= 14 &&
        insight.triggerDays >= 5 &&
        comparisonDays >= 5 &&
        adjustedPValue <= 0.05 &&
        insight.strengthScore >= 0.2
          ? "strong"
          : "emerging";

      return {
        ...insight,
        pValue: round(adjustedPValue, 6),
        evidence,
      };
    })
    .sort(rankInsights);

  return {
    insights: candidates.filter((insight) => insight.patternConsistency >= threshold),
    emergingInsights: candidates.filter((insight) => insight.patternConsistency < threshold).slice(0, 3),
    analyzedDays: days.length,
  };
}

export function countTrackedDays(
  moods: Array<Pick<AnalyticsMoodLog, "loggedAt">>,
  eating: Array<Pick<AnalyticsEatingLog, "loggedAt">>,
): number {
  return new Set([...moods, ...eating].map((entry) => isoDay(entry.loggedAt))).size;
}

export function buildMoodTrend(moods: AnalyticsMoodLog[]) {
  const byDay = new Map<string, { moodSum: number; stressSum: number; count: number }>();
  for (const mood of moods) {
    const day = isoDay(mood.loggedAt);
    const current = byDay.get(day) ?? { moodSum: 0, stressSum: 0, count: 0 };
    current.moodSum += mood.moodScore;
    current.stressSum += mood.stressLevel;
    current.count += 1;
    byDay.set(day, current);
  }

  return Array.from(byDay.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, value]) => ({
      date,
      avgMoodScore: round(value.moodSum / value.count, 2),
      avgStressLevel: round(value.stressSum / value.count, 2),
    }));
}

export function buildEatingFrequency(eating: AnalyticsEatingLog[]) {
  const counts = new Map<string, number>();
  for (const meal of eating) {
    counts.set(meal.foodCategory, (counts.get(meal.foodCategory) ?? 0) + 1);
  }
  return Array.from(counts.entries()).map(([foodCategory, count]) => ({ foodCategory, count }));
}

export function buildStressFoodCorrelation(moods: AnalyticsMoodLog[], eating: AnalyticsEatingLog[]) {
  const byDayMood = new Map<string, number[]>();
  for (const mood of moods) {
    const day = isoDay(mood.loggedAt);
    const values = byDayMood.get(day) ?? [];
    values.push(mood.stressLevel);
    byDayMood.set(day, values);
  }

  const empty = { Healthy: 0, Neutral: 0, Sugary: 0, Junk: 0, Skipped: 0 };
  const buckets = new Map<string, typeof empty>();

  for (const meal of eating) {
    const day = isoDay(meal.loggedAt);
    const stressValues = byDayMood.get(day);
    if (!stressValues?.length) continue;

    const average = stressValues.reduce((sum, value) => sum + value, 0) / stressValues.length;
    const stressLevel = String(Math.max(1, Math.min(5, Math.round(average))));
    const bucket = buckets.get(stressLevel) ?? { ...empty };
    const category = meal.foodCategory as keyof typeof empty;
    if (category in bucket) bucket[category] += 1;
    buckets.set(stressLevel, bucket);
  }

  return Array.from(buckets.entries())
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([stressLevel, values]) => ({ stressLevel, ...values }));
}

export function topCategory<T extends string>(values: T[]): T | null {
  if (values.length === 0) return null;
  const counts = new Map<T, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

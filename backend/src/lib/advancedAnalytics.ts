import {
  benjaminiHochberg,
  correlationInference,
  fitLinearRegression,
  fitLogisticRegression,
  roundTo,
  spearmanCorrelation,
  type ConfidenceInterval,
  type LinearModelResult,
  type LogisticModelResult,
} from "./statistics.js";
import type { AnalyticsEatingLog, AnalyticsMoodLog } from "./analytics.js";

export interface AdvancedEatingLog extends AnalyticsEatingLog {
  hungerBefore: number;
}

export interface ContinuousCorrelationResult {
  id: string;
  x: string;
  xLabel: string;
  y: string;
  yLabel: string;
  n: number;
  pearson: number;
  spearman: number;
  confidenceInterval: ConfidenceInterval;
  pValue: number;
  adjustedPValue: number;
  evidence: "strong" | "emerging" | "weak";
}

export interface LaggedEffectResult extends ContinuousCorrelationResult {
  lagDays: number;
  directionLabel: string;
}

export interface RegressionModelReport {
  id: string;
  title: string;
  description: string;
  model: LinearModelResult;
}

export interface LogisticModelReport {
  id: string;
  title: string;
  description: string;
  model: LogisticModelResult;
}

export interface InferenceQualityReport {
  analysisClass: "limited" | "exploratory" | "research-oriented";
  clinicalValidated: false;
  trackedDays: number;
  completeMoodDays: number;
  pairedMoodEatingDays: number;
  continuousTests: number;
  laggedTests: number;
  linearModels: number;
  logisticModels: number;
  multiplicityMethod: string;
  regressionUncertaintyMethod: string;
  confidenceLevel: number;
  warnings: string[];
  limitations: string[];
}

export interface AdvancedAnalyticsReport {
  continuousCorrelations: ContinuousCorrelationResult[];
  laggedEffects: LaggedEffectResult[];
  linearModels: RegressionModelReport[];
  logisticModels: LogisticModelReport[];
  quality: InferenceQualityReport;
}

interface DailyObservation {
  date: string;
  moodScore: number | null;
  stressLevel: number | null;
  energyLevel: number | null;
  sleepHours: number | null;
  workloadLevel: number | null;
  unhealthyMealRate: number | null;
  healthyMealRate: number | null;
  skippedMealRate: number | null;
  bingeMealRate: number | null;
  nightMealRate: number | null;
  hungerBefore: number | null;
}

type VariableKey = Exclude<keyof DailyObservation, "date">;
type PairDefinition = readonly [id: string, x: VariableKey, y: VariableKey];
type LagDefinition = readonly [id: string, x: VariableKey, y: VariableKey, directionLabel: string];
type Evidence = ContinuousCorrelationResult["evidence"];

const VARIABLE_LABELS: Record<VariableKey, string> = {
  moodScore: "Mood",
  stressLevel: "Stress",
  energyLevel: "Energy",
  sleepHours: "Sleep hours",
  workloadLevel: "Workload",
  unhealthyMealRate: "Junk meal share",
  healthyMealRate: "Healthy meal share",
  skippedMealRate: "Skipped meal share",
  bingeMealRate: "Large/binge meal share",
  nightMealRate: "Night meal share",
  hungerBefore: "Pre-meal hunger",
};

const CONTINUOUS_PAIRS: PairDefinition[] = [
  ["mood-stress", "moodScore", "stressLevel"],
  ["mood-energy", "moodScore", "energyLevel"],
  ["mood-sleep", "moodScore", "sleepHours"],
  ["stress-sleep", "stressLevel", "sleepHours"],
  ["stress-energy", "stressLevel", "energyLevel"],
  ["energy-sleep", "energyLevel", "sleepHours"],
  ["workload-stress", "workloadLevel", "stressLevel"],
  ["workload-mood", "workloadLevel", "moodScore"],
  ["workload-energy", "workloadLevel", "energyLevel"],
  ["unhealthy-mood", "unhealthyMealRate", "moodScore"],
  ["unhealthy-stress", "unhealthyMealRate", "stressLevel"],
  ["unhealthy-energy", "unhealthyMealRate", "energyLevel"],
  ["healthy-mood", "healthyMealRate", "moodScore"],
  ["healthy-stress", "healthyMealRate", "stressLevel"],
  ["hunger-mood", "hungerBefore", "moodScore"],
  ["hunger-stress", "hungerBefore", "stressLevel"],
  ["night-mood", "nightMealRate", "moodScore"],
  ["binge-stress", "bingeMealRate", "stressLevel"],
];

const LAGGED_PAIRS: LagDefinition[] = [
  ["sleep-next-mood", "sleepHours", "moodScore", "Sleep → next-day mood"],
  ["sleep-next-stress", "sleepHours", "stressLevel", "Sleep → next-day stress"],
  ["sleep-next-energy", "sleepHours", "energyLevel", "Sleep → next-day energy"],
  ["stress-next-mood", "stressLevel", "moodScore", "Stress → next-day mood"],
  ["workload-next-stress", "workloadLevel", "stressLevel", "Workload → next-day stress"],
  ["workload-next-mood", "workloadLevel", "moodScore", "Workload → next-day mood"],
  ["stress-next-unhealthy", "stressLevel", "unhealthyMealRate", "Stress → next-day food choices"],
  ["mood-next-unhealthy", "moodScore", "unhealthyMealRate", "Mood → next-day food choices"],
  ["unhealthy-next-mood", "unhealthyMealRate", "moodScore", "Food choices → next-day mood"],
  ["night-next-energy", "nightMealRate", "energyLevel", "Night eating → next-day energy"],
];

interface LinearDefinition {
  id: string;
  title: string;
  description: string;
  outcome: VariableKey;
  predictors: VariableKey[];
}

const LINEAR_DEFINITIONS: LinearDefinition[] = [
  {
    id: "adjusted-mood",
    title: "Adjusted mood model",
    description:
      "Estimates each same-day association with mood while holding sleep, stress, workload, and food quality constant.",
    outcome: "moodScore",
    predictors: ["sleepHours", "stressLevel", "workloadLevel", "unhealthyMealRate"],
  },
  {
    id: "adjusted-stress",
    title: "Adjusted stress model",
    description:
      "Estimates stress associations after accounting for sleep, workload, energy, and food quality.",
    outcome: "stressLevel",
    predictors: ["sleepHours", "workloadLevel", "energyLevel", "unhealthyMealRate"],
  },
  {
    id: "adjusted-energy",
    title: "Adjusted energy model",
    description:
      "Estimates energy associations after accounting for sleep, stress, workload, and food quality.",
    outcome: "energyLevel",
    predictors: ["sleepHours", "stressLevel", "workloadLevel", "unhealthyMealRate"],
  },
];

function average(values: number[]): number | null {
  return values.length === 0
    ? null
    : values.reduce((sum, value) => sum + value, 0) / values.length;
}

function dayKey(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString().slice(0, 10);
}

function workloadScore(value: string): number {
  if (value === "Low") return 1;
  if (value === "High") return 3;
  return 2;
}

function mealRate(
  meals: AdvancedEatingLog[],
  predicate: (meal: AdvancedEatingLog) => boolean,
): number | null {
  if (meals.length === 0) return null;
  return meals.filter(predicate).length / meals.length;
}

function groupByDay<T extends { loggedAt: Date | string }>(rows: T[]): Map<string, T[]> {
  const grouped = new Map<string, T[]>();
  for (const row of rows) {
    const key = dayKey(row.loggedAt);
    const bucket = grouped.get(key) ?? [];
    bucket.push(row);
    grouped.set(key, bucket);
  }
  return grouped;
}

function makeDailyObservation(
  date: string,
  moodRows: AnalyticsMoodLog[],
  mealRows: AdvancedEatingLog[],
): DailyObservation {
  return {
    date,
    moodScore: average(moodRows.map((row) => row.moodScore)),
    stressLevel: average(moodRows.map((row) => row.stressLevel)),
    energyLevel: average(moodRows.map((row) => row.energyLevel)),
    sleepHours: average(moodRows.map((row) => row.sleepHours)),
    workloadLevel: average(moodRows.map((row) => workloadScore(row.workload))),
    unhealthyMealRate: mealRate(
      mealRows,
      (row) => row.foodCategory === "Sugary" || row.foodCategory === "Junk",
    ),
    healthyMealRate: mealRate(mealRows, (row) => row.foodCategory === "Healthy"),
    skippedMealRate: mealRate(mealRows, (row) => row.foodCategory === "Skipped"),
    bingeMealRate: mealRate(
      mealRows,
      (row) => row.portionRating === "Large" || row.portionRating === "Binge",
    ),
    nightMealRate: mealRate(mealRows, (row) => row.timeOfDay === "Night"),
    hungerBefore: average(mealRows.map((row) => row.hungerBefore)),
  };
}

function buildDailyDataset(
  moods: AnalyticsMoodLog[],
  eating: AdvancedEatingLog[],
): DailyObservation[] {
  const moodsByDay = groupByDay(moods);
  const mealsByDay = groupByDay(eating);
  const dates = Array.from(new Set([...moodsByDay.keys(), ...mealsByDay.keys()])).sort((a, b) =>
    a.localeCompare(b),
  );

  return dates.map((date) =>
    makeDailyObservation(date, moodsByDay.get(date) ?? [], mealsByDay.get(date) ?? []),
  );
}

function numericValue(row: DailyObservation, key: VariableKey): number | null {
  const value = row[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function classifyCorrelation(estimate: number, adjustedPValue: number, n: number): Evidence {
  const magnitude = Math.abs(estimate);
  if (n >= 20 && adjustedPValue <= 0.05 && magnitude >= 0.3) return "strong";
  if (n >= 10 && magnitude >= 0.2) return "emerging";
  return "weak";
}

interface RawCorrelation {
  id: string;
  x: VariableKey;
  y: VariableKey;
  n: number;
  pearson: number;
  spearman: number;
  confidenceInterval: ConfidenceInterval;
  pValue: number;
}

function inferPair(
  id: string,
  xKey: VariableKey,
  yKey: VariableKey,
  pairs: Array<{ x: number; y: number }>,
): RawCorrelation | null {
  if (pairs.length < 7) return null;
  const xValues = pairs.map((pair) => pair.x);
  const yValues = pairs.map((pair) => pair.y);
  const inference = correlationInference(xValues, yValues);
  const spearman = spearmanCorrelation(xValues, yValues);
  if (!inference || spearman === null) return null;

  return {
    id,
    x: xKey,
    y: yKey,
    n: inference.n,
    pearson: inference.estimate,
    spearman: roundTo(spearman),
    confidenceInterval: inference.confidenceInterval,
    pValue: inference.pValue,
  };
}

function sameDayPairs(
  rows: DailyObservation[],
  xKey: VariableKey,
  yKey: VariableKey,
): Array<{ x: number; y: number }> {
  const pairs: Array<{ x: number; y: number }> = [];
  for (const row of rows) {
    const x = numericValue(row, xKey);
    const y = numericValue(row, yKey);
    if (x !== null && y !== null) pairs.push({ x, y });
  }
  return pairs;
}

function isNextCalendarDay(first: string, second: string): boolean {
  const oneDay = 24 * 60 * 60 * 1000;
  return Date.parse(second + "T00:00:00.000Z") - Date.parse(first + "T00:00:00.000Z") === oneDay;
}

function laggedPairs(
  rows: DailyObservation[],
  xKey: VariableKey,
  yKey: VariableKey,
): Array<{ x: number; y: number }> {
  const pairs: Array<{ x: number; y: number }> = [];
  for (let index = 0; index < rows.length - 1; index += 1) {
    const current = rows[index];
    const next = rows[index + 1];
    if (!current || !next || !isNextCalendarDay(current.date, next.date)) continue;
    const x = numericValue(current, xKey);
    const y = numericValue(next, yKey);
    if (x !== null && y !== null) pairs.push({ x, y });
  }
  return pairs;
}

function rankCorrelations<T extends { evidence: Evidence; pearson: number }>(results: T[]): T[] {
  const order: Record<Evidence, number> = { strong: 0, emerging: 1, weak: 2 };
  return results.sort((a, b) => {
    const evidenceOrder = order[a.evidence] - order[b.evidence];
    return evidenceOrder !== 0 ? evidenceOrder : Math.abs(b.pearson) - Math.abs(a.pearson);
  });
}

function finalizeCorrelations(
  raw: RawCorrelation[],
): ContinuousCorrelationResult[] {
  const adjusted = benjaminiHochberg(raw.map((result) => result.pValue));
  return rankCorrelations(
    raw.map((result, index) => {
      const adjustedPValue = adjusted[index] ?? 1;
      return {
        ...result,
        x: String(result.x),
        xLabel: VARIABLE_LABELS[result.x],
        y: String(result.y),
        yLabel: VARIABLE_LABELS[result.y],
        adjustedPValue,
        evidence: classifyCorrelation(result.pearson, adjustedPValue, result.n),
      };
    }),
  );
}

function evaluateContinuous(rows: DailyObservation[]): ContinuousCorrelationResult[] {
  const raw = CONTINUOUS_PAIRS.flatMap(([id, x, y]) => {
    const result = inferPair(id, x, y, sameDayPairs(rows, x, y));
    return result ? [result] : [];
  });
  return finalizeCorrelations(raw);
}

function evaluateLagged(rows: DailyObservation[]): LaggedEffectResult[] {
  const raw = LAGGED_PAIRS.flatMap(([id, x, y]) => {
    const result = inferPair(id, x, y, laggedPairs(rows, x, y));
    return result ? [result] : [];
  });
  const finalized = finalizeCorrelations(raw);
  const directions = new Map(LAGGED_PAIRS.map(([id, , , label]) => [id, label]));

  return finalized.map((result) => ({
    ...result,
    lagDays: 1,
    directionLabel: directions.get(result.id) ?? result.xLabel + " → next-day " + result.yLabel,
  }));
}

function completeRows(
  rows: DailyObservation[],
  outcomeKey: VariableKey,
  predictorKeys: VariableKey[],
): { outcome: number[]; predictors: number[][] } {
  const outcome: number[] = [];
  const predictors: number[][] = [];

  for (const row of rows) {
    const y = numericValue(row, outcomeKey);
    const x = predictorKeys.map((key) => numericValue(row, key));
    if (y === null || x.includes(null)) continue;
    outcome.push(y);
    predictors.push(x.map((value) => value ?? 0));
  }

  return { outcome, predictors };
}

function buildLinearModel(
  rows: DailyObservation[],
  definition: LinearDefinition,
): RegressionModelReport | null {
  const data = completeRows(rows, definition.outcome, definition.predictors);
  if (data.outcome.length < 12) return null;

  const model = fitLinearRegression({
    outcomeName: VARIABLE_LABELS[definition.outcome],
    predictorNames: definition.predictors.map((key) => VARIABLE_LABELS[key]),
    predictors: data.predictors,
    outcome: data.outcome,
  });
  if (!model) return null;

  return {
    id: definition.id,
    title: definition.title,
    description: definition.description,
    model,
  };
}

function buildLinearModels(rows: DailyObservation[]): RegressionModelReport[] {
  return LINEAR_DEFINITIONS.flatMap((definition) => {
    const report = buildLinearModel(rows, definition);
    return report ? [report] : [];
  });
}

function buildLogisticModels(rows: DailyObservation[]): LogisticModelReport[] {
  const predictorKeys: VariableKey[] = [
    "stressLevel",
    "moodScore",
    "sleepHours",
    "workloadLevel",
  ];
  const predictors: number[][] = [];
  const outcome: number[] = [];

  for (const row of rows) {
    const unhealthy = numericValue(row, "unhealthyMealRate");
    const values = predictorKeys.map((key) => numericValue(row, key));
    if (unhealthy === null || values.includes(null)) continue;
    predictors.push(values.map((value) => value ?? 0));
    outcome.push(unhealthy > 0 ? 1 : 0);
  }

  if (outcome.length < 20) return [];
  const model = fitLogisticRegression({
    outcomeName: "Any junk food that day",
    predictorNames: predictorKeys.map((key) => VARIABLE_LABELS[key]),
    predictors,
    outcome,
  });
  if (!model) return [];

  return [{
    id: "adjusted-unhealthy-food",
    title: "Adjusted food-choice model",
    description:
      "Models the odds of any junk-food choice while adjusting simultaneously for stress, mood, sleep, and workload.",
    model,
  }];
}

function modelWarnings(
  linearModels: RegressionModelReport[],
  logisticModels: LogisticModelReport[],
): string[] {
  const reports = [...linearModels, ...logisticModels];
  return reports.flatMap((report) =>
    report.model.warnings.map((warning) => report.title + ": " + warning),
  );
}

function analysisClass(args: {
  trackedDays: number;
  completeMoodDays: number;
  strongAssociations: number;
  stableModels: number;
  hasAnalyses: boolean;
}): InferenceQualityReport["analysisClass"] {
  const { trackedDays, completeMoodDays, strongAssociations, stableModels, hasAnalyses } = args;
  if (
    trackedDays >= 30 &&
    completeMoodDays >= 20 &&
    (strongAssociations > 0 || stableModels > 0)
  ) {
    return "research-oriented";
  }
  return trackedDays >= 14 && hasAnalyses ? "exploratory" : "limited";
}

function buildQualityReport(
  rows: DailyObservation[],
  continuous: ContinuousCorrelationResult[],
  lagged: LaggedEffectResult[],
  linearModels: RegressionModelReport[],
  logisticModels: LogisticModelReport[],
): InferenceQualityReport {
  const completeMoodDays = rows.filter((row) =>
    ["moodScore", "stressLevel", "energyLevel", "sleepHours", "workloadLevel"].every(
      (key) => numericValue(row, key as VariableKey) !== null,
    ),
  ).length;
  const pairedMoodEatingDays = rows.filter(
    (row) => row.moodScore !== null && row.unhealthyMealRate !== null,
  ).length;

  const warnings = modelWarnings(linearModels, logisticModels);
  if (rows.length < 14) {
    warnings.push("Fewer than 14 tracked days limits stability of continuous and lagged estimates.");
  }
  if (pairedMoodEatingDays < 14) {
    warnings.push(
      "Fewer than 14 days contain both mood and eating data, limiting adjusted food-behavior inference.",
    );
  }

  const strongAssociations = [...continuous, ...lagged].filter(
    (result) => result.evidence === "strong",
  ).length;
  const stableModels = [...linearModels, ...logisticModels].filter(
    (report) => report.model.warnings.length === 0,
  ).length;

  return {
    analysisClass: analysisClass({
      trackedDays: rows.length,
      completeMoodDays,
      strongAssociations,
      stableModels,
      hasAnalyses: continuous.length + lagged.length > 0,
    }),
    clinicalValidated: false,
    trackedDays: rows.length,
    completeMoodDays,
    pairedMoodEatingDays,
    continuousTests: continuous.length,
    laggedTests: lagged.length,
    linearModels: linearModels.length,
    logisticModels: logisticModels.length,
    multiplicityMethod:
      "Benjamini-Hochberg false-discovery-rate control within each analysis family",
    regressionUncertaintyMethod:
      "HC3 heteroskedasticity-robust standard errors for linear models; Wald intervals for logistic models",
    confidenceLevel: 0.95,
    warnings: Array.from(new Set(warnings)),
    limitations: [
      "This is a single-user observational time series; associations do not establish causation.",
      "Daily aggregation can hide within-day timing and sequence effects.",
      "Self-reported measures can contain recall, measurement, and selection bias.",
      "The models adjust only for variables captured by the app; unmeasured confounding remains possible.",
      "Clinical-grade validity requires external validation, protocol review, and prospective study; software calculations alone cannot establish it.",
    ],
  };
}

export function analyzeAdvancedAnalytics(
  moods: AnalyticsMoodLog[],
  eating: AdvancedEatingLog[],
): AdvancedAnalyticsReport {
  const rows = buildDailyDataset(moods, eating);
  const continuousCorrelations = evaluateContinuous(rows);
  const laggedEffects = evaluateLagged(rows);
  const linearModels = buildLinearModels(rows);
  const logisticModels = buildLogisticModels(rows);

  return {
    continuousCorrelations,
    laggedEffects,
    linearModels,
    logisticModels,
    quality: buildQualityReport(
      rows,
      continuousCorrelations,
      laggedEffects,
      linearModels,
      logisticModels,
    ),
  };
}

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

interface CorrelationSpec {
  id: string;
  x: keyof DailyObservation;
  xLabel: string;
  y: keyof DailyObservation;
  yLabel: string;
}

interface LagSpec extends CorrelationSpec {
  directionLabel: string;
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
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

function buildDailyDataset(
  moods: AnalyticsMoodLog[],
  eating: AdvancedEatingLog[],
): DailyObservation[] {
  const moodMap = new Map<string, AnalyticsMoodLog[]>();
  const eatingMap = new Map<string, AdvancedEatingLog[]>();

  for (const mood of moods) {
    const key = dayKey(mood.loggedAt);
    const list = moodMap.get(key) ?? [];
    list.push(mood);
    moodMap.set(key, list);
  }

  for (const meal of eating) {
    const key = dayKey(meal.loggedAt);
    const list = eatingMap.get(key) ?? [];
    list.push(meal);
    eatingMap.set(key, list);
  }

  const dates = Array.from(new Set([...moodMap.keys(), ...eatingMap.keys()])).sort();

  return dates.map((date) => {
    const moodRows = moodMap.get(date) ?? [];
    const mealRows = eatingMap.get(date) ?? [];
    const mealCount = mealRows.length;

    return {
      date,
      moodScore: average(moodRows.map((row) => row.moodScore)),
      stressLevel: average(moodRows.map((row) => row.stressLevel)),
      energyLevel: average(moodRows.map((row) => row.energyLevel)),
      sleepHours: average(moodRows.map((row) => row.sleepHours)),
      workloadLevel: average(moodRows.map((row) => workloadScore(row.workload))),
      unhealthyMealRate:
        mealCount === 0
          ? null
          : mealRows.filter((row) => row.foodCategory === "Sugary" || row.foodCategory === "Junk").length /
            mealCount,
      healthyMealRate:
        mealCount === 0
          ? null
          : mealRows.filter((row) => row.foodCategory === "Healthy").length / mealCount,
      skippedMealRate:
        mealCount === 0
          ? null
          : mealRows.filter((row) => row.foodCategory === "Skipped").length / mealCount,
      bingeMealRate:
        mealCount === 0
          ? null
          : mealRows.filter((row) => row.portionRating === "Large" || row.portionRating === "Binge")
              .length / mealCount,
      nightMealRate:
        mealCount === 0
          ? null
          : mealRows.filter((row) => row.timeOfDay === "Night").length / mealCount,
      hungerBefore: average(mealRows.map((row) => row.hungerBefore)),
    };
  });
}

const continuousSpecs: CorrelationSpec[] = [
  { id: "mood-stress", x: "moodScore", xLabel: "Mood", y: "stressLevel", yLabel: "Stress" },
  { id: "mood-energy", x: "moodScore", xLabel: "Mood", y: "energyLevel", yLabel: "Energy" },
  { id: "mood-sleep", x: "moodScore", xLabel: "Mood", y: "sleepHours", yLabel: "Sleep hours" },
  { id: "stress-sleep", x: "stressLevel", xLabel: "Stress", y: "sleepHours", yLabel: "Sleep hours" },
  { id: "stress-energy", x: "stressLevel", xLabel: "Stress", y: "energyLevel", yLabel: "Energy" },
  { id: "energy-sleep", x: "energyLevel", xLabel: "Energy", y: "sleepHours", yLabel: "Sleep hours" },
  { id: "workload-stress", x: "workloadLevel", xLabel: "Workload", y: "stressLevel", yLabel: "Stress" },
  { id: "workload-mood", x: "workloadLevel", xLabel: "Workload", y: "moodScore", yLabel: "Mood" },
  { id: "workload-energy", x: "workloadLevel", xLabel: "Workload", y: "energyLevel", yLabel: "Energy" },
  {
    id: "unhealthy-mood",
    x: "unhealthyMealRate",
    xLabel: "Sugary/junk meal share",
    y: "moodScore",
    yLabel: "Mood",
  },
  {
    id: "unhealthy-stress",
    x: "unhealthyMealRate",
    xLabel: "Sugary/junk meal share",
    y: "stressLevel",
    yLabel: "Stress",
  },
  {
    id: "unhealthy-energy",
    x: "unhealthyMealRate",
    xLabel: "Sugary/junk meal share",
    y: "energyLevel",
    yLabel: "Energy",
  },
  {
    id: "healthy-mood",
    x: "healthyMealRate",
    xLabel: "Healthy meal share",
    y: "moodScore",
    yLabel: "Mood",
  },
  {
    id: "healthy-stress",
    x: "healthyMealRate",
    xLabel: "Healthy meal share",
    y: "stressLevel",
    yLabel: "Stress",
  },
  {
    id: "hunger-mood",
    x: "hungerBefore",
    xLabel: "Pre-meal hunger",
    y: "moodScore",
    yLabel: "Mood",
  },
  {
    id: "hunger-stress",
    x: "hungerBefore",
    xLabel: "Pre-meal hunger",
    y: "stressLevel",
    yLabel: "Stress",
  },
  {
    id: "night-mood",
    x: "nightMealRate",
    xLabel: "Night meal share",
    y: "moodScore",
    yLabel: "Mood",
  },
  {
    id: "binge-stress",
    x: "bingeMealRate",
    xLabel: "Large/binge meal share",
    y: "stressLevel",
    yLabel: "Stress",
  },
];

const lagSpecs: LagSpec[] = [
  {
    id: "sleep-next-mood",
    x: "sleepHours",
    xLabel: "Sleep hours",
    y: "moodScore",
    yLabel: "Next-day mood",
    directionLabel: "Sleep → next-day mood",
  },
  {
    id: "sleep-next-stress",
    x: "sleepHours",
    xLabel: "Sleep hours",
    y: "stressLevel",
    yLabel: "Next-day stress",
    directionLabel: "Sleep → next-day stress",
  },
  {
    id: "sleep-next-energy",
    x: "sleepHours",
    xLabel: "Sleep hours",
    y: "energyLevel",
    yLabel: "Next-day energy",
    directionLabel: "Sleep → next-day energy",
  },
  {
    id: "stress-next-mood",
    x: "stressLevel",
    xLabel: "Stress",
    y: "moodScore",
    yLabel: "Next-day mood",
    directionLabel: "Stress → next-day mood",
  },
  {
    id: "workload-next-stress",
    x: "workloadLevel",
    xLabel: "Workload",
    y: "stressLevel",
    yLabel: "Next-day stress",
    directionLabel: "Workload → next-day stress",
  },
  {
    id: "workload-next-mood",
    x: "workloadLevel",
    xLabel: "Workload",
    y: "moodScore",
    yLabel: "Next-day mood",
    directionLabel: "Workload → next-day mood",
  },
  {
    id: "stress-next-unhealthy",
    x: "stressLevel",
    xLabel: "Stress",
    y: "unhealthyMealRate",
    yLabel: "Next-day sugary/junk meal share",
    directionLabel: "Stress → next-day food choices",
  },
  {
    id: "mood-next-unhealthy",
    x: "moodScore",
    xLabel: "Mood",
    y: "unhealthyMealRate",
    yLabel: "Next-day sugary/junk meal share",
    directionLabel: "Mood → next-day food choices",
  },
  {
    id: "unhealthy-next-mood",
    x: "unhealthyMealRate",
    xLabel: "Sugary/junk meal share",
    y: "moodScore",
    yLabel: "Next-day mood",
    directionLabel: "Food choices → next-day mood",
  },
  {
    id: "night-next-energy",
    x: "nightMealRate",
    xLabel: "Night meal share",
    y: "energyLevel",
    yLabel: "Next-day energy",
    directionLabel: "Night eating → next-day energy",
  },
];

function numericValue(row: DailyObservation, key: keyof DailyObservation): number | null {
  if (key === "date") return null;
  const value = row[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function classifyCorrelation(
  estimate: number,
  adjustedPValue: number,
  n: number,
): "strong" | "emerging" | "weak" {
  const magnitude = Math.abs(estimate);
  if (n >= 20 && adjustedPValue <= 0.05 && magnitude >= 0.3) return "strong";
  if (n >= 10 && magnitude >= 0.2) return "emerging";
  return "weak";
}

function evaluateContinuous(
  rows: DailyObservation[],
  specs: CorrelationSpec[],
): ContinuousCorrelationResult[] {
  const raw: Array<Omit<ContinuousCorrelationResult, "adjustedPValue" | "evidence">> = [];

  for (const spec of specs) {
    const pairs = rows
      .map((row) => ({
        x: numericValue(row, spec.x),
        y: numericValue(row, spec.y),
      }))
      .filter((pair): pair is { x: number; y: number } => pair.x !== null && pair.y !== null);

    if (pairs.length < 7) continue;
    const x = pairs.map((pair) => pair.x);
    const y = pairs.map((pair) => pair.y);
    const inference = correlationInference(x, y);
    const spearman = spearmanCorrelation(x, y);
    if (!inference || spearman === null) continue;

    raw.push({
      id: spec.id,
      x: String(spec.x),
      xLabel: spec.xLabel,
      y: String(spec.y),
      yLabel: spec.yLabel,
      n: inference.n,
      pearson: inference.estimate,
      spearman: roundTo(spearman),
      confidenceInterval: inference.confidenceInterval,
      pValue: inference.pValue,
    });
  }

  const adjusted = benjaminiHochberg(raw.map((result) => result.pValue));
  return raw
    .map((result, index) => {
      const adjustedPValue = adjusted[index] ?? 1;
      return {
        ...result,
        adjustedPValue,
        evidence: classifyCorrelation(result.pearson, adjustedPValue, result.n),
      };
    })
    .sort((a, b) => {
      if (a.evidence !== b.evidence) {
        const order = { strong: 0, emerging: 1, weak: 2 };
        return order[a.evidence] - order[b.evidence];
      }
      return Math.abs(b.pearson) - Math.abs(a.pearson);
    });
}

function nextCalendarDay(first: string, second: string): boolean {
  const firstMs = Date.parse(first + "T00:00:00.000Z");
  const secondMs = Date.parse(second + "T00:00:00.000Z");
  return secondMs - firstMs === 24 * 60 * 60 * 1000;
}

function evaluateLagged(
  rows: DailyObservation[],
  specs: LagSpec[],
): LaggedEffectResult[] {
  const raw: Array<Omit<LaggedEffectResult, "adjustedPValue" | "evidence">> = [];

  for (const spec of specs) {
    const x: number[] = [];
    const y: number[] = [];

    for (let index = 0; index < rows.length - 1; index += 1) {
      const current = rows[index];
      const next = rows[index + 1];
      if (!current || !next || !nextCalendarDay(current.date, next.date)) continue;
      const predictor = numericValue(current, spec.x);
      const outcome = numericValue(next, spec.y);
      if (predictor === null || outcome === null) continue;
      x.push(predictor);
      y.push(outcome);
    }

    if (x.length < 7) continue;
    const inference = correlationInference(x, y);
    const spearman = spearmanCorrelation(x, y);
    if (!inference || spearman === null) continue;

    raw.push({
      id: spec.id,
      x: String(spec.x),
      xLabel: spec.xLabel,
      y: String(spec.y),
      yLabel: spec.yLabel,
      n: inference.n,
      pearson: inference.estimate,
      spearman: roundTo(spearman),
      confidenceInterval: inference.confidenceInterval,
      pValue: inference.pValue,
      lagDays: 1,
      directionLabel: spec.directionLabel,
    });
  }

  const adjusted = benjaminiHochberg(raw.map((result) => result.pValue));
  return raw
    .map((result, index) => {
      const adjustedPValue = adjusted[index] ?? 1;
      return {
        ...result,
        adjustedPValue,
        evidence: classifyCorrelation(result.pearson, adjustedPValue, result.n),
      };
    })
    .sort((a, b) => {
      if (a.evidence !== b.evidence) {
        const order = { strong: 0, emerging: 1, weak: 2 };
        return order[a.evidence] - order[b.evidence];
      }
      return Math.abs(b.pearson) - Math.abs(a.pearson);
    });
}

function completeRows(
  rows: DailyObservation[],
  outcomeKey: keyof DailyObservation,
  predictorKeys: Array<keyof DailyObservation>,
): { outcome: number[]; predictors: number[][] } {
  const outcome: number[] = [];
  const predictors: number[][] = [];

  for (const row of rows) {
    const y = numericValue(row, outcomeKey);
    const x = predictorKeys.map((key) => numericValue(row, key));
    if (y === null || x.some((value) => value === null)) continue;
    outcome.push(y);
    predictors.push(x.map((value) => value ?? 0));
  }

  return { outcome, predictors };
}

function buildLinearModels(rows: DailyObservation[]): RegressionModelReport[] {
  const definitions: Array<{
    id: string;
    title: string;
    description: string;
    outcomeKey: keyof DailyObservation;
    outcomeLabel: string;
    predictors: Array<{ key: keyof DailyObservation; label: string }>;
  }> = [
    {
      id: "adjusted-mood",
      title: "Adjusted mood model",
      description: "Estimates each same-day association with mood while holding sleep, stress, workload, and food quality constant.",
      outcomeKey: "moodScore",
      outcomeLabel: "Mood score",
      predictors: [
        { key: "sleepHours", label: "Sleep hours" },
        { key: "stressLevel", label: "Stress level" },
        { key: "workloadLevel", label: "Workload level" },
        { key: "unhealthyMealRate", label: "Sugary/junk meal share" },
      ],
    },
    {
      id: "adjusted-stress",
      title: "Adjusted stress model",
      description: "Estimates stress associations after accounting for sleep, workload, energy, and food quality.",
      outcomeKey: "stressLevel",
      outcomeLabel: "Stress level",
      predictors: [
        { key: "sleepHours", label: "Sleep hours" },
        { key: "workloadLevel", label: "Workload level" },
        { key: "energyLevel", label: "Energy level" },
        { key: "unhealthyMealRate", label: "Sugary/junk meal share" },
      ],
    },
    {
      id: "adjusted-energy",
      title: "Adjusted energy model",
      description: "Estimates energy associations after accounting for sleep, stress, workload, and food quality.",
      outcomeKey: "energyLevel",
      outcomeLabel: "Energy level",
      predictors: [
        { key: "sleepHours", label: "Sleep hours" },
        { key: "stressLevel", label: "Stress level" },
        { key: "workloadLevel", label: "Workload level" },
        { key: "unhealthyMealRate", label: "Sugary/junk meal share" },
      ],
    },
  ];

  const reports: RegressionModelReport[] = [];

  for (const definition of definitions) {
    const data = completeRows(
      rows,
      definition.outcomeKey,
      definition.predictors.map((predictor) => predictor.key),
    );
    if (data.outcome.length < 12) continue;

    const model = fitLinearRegression({
      outcomeName: definition.outcomeLabel,
      predictorNames: definition.predictors.map((predictor) => predictor.label),
      predictors: data.predictors,
      outcome: data.outcome,
    });
    if (!model) continue;

    reports.push({
      id: definition.id,
      title: definition.title,
      description: definition.description,
      model,
    });
  }

  return reports;
}

function buildLogisticModels(rows: DailyObservation[]): LogisticModelReport[] {
  const predictorDefinitions = [
    { key: "stressLevel" as const, label: "Stress level" },
    { key: "moodScore" as const, label: "Mood score" },
    { key: "sleepHours" as const, label: "Sleep hours" },
    { key: "workloadLevel" as const, label: "Workload level" },
  ];

  const predictors: number[][] = [];
  const outcome: number[] = [];

  for (const row of rows) {
    const unhealthy = numericValue(row, "unhealthyMealRate");
    const x = predictorDefinitions.map((definition) => numericValue(row, definition.key));
    if (unhealthy === null || x.some((value) => value === null)) continue;
    predictors.push(x.map((value) => value ?? 0));
    outcome.push(unhealthy > 0 ? 1 : 0);
  }

  if (outcome.length < 20) return [];
  const model = fitLogisticRegression({
    outcomeName: "Any sugary/junk food that day",
    predictorNames: predictorDefinitions.map((definition) => definition.label),
    predictors,
    outcome,
  });
  if (!model) return [];

  return [
    {
      id: "adjusted-unhealthy-food",
      title: "Adjusted food-choice model",
      description: "Models the odds of any sugary/junk food while adjusting simultaneously for stress, mood, sleep, and workload.",
      model,
    },
  ];
}

function buildQualityReport(
  rows: DailyObservation[],
  continuous: ContinuousCorrelationResult[],
  lagged: LaggedEffectResult[],
  linearModels: RegressionModelReport[],
  logisticModels: LogisticModelReport[],
): InferenceQualityReport {
  const completeMoodDays = rows.filter(
    (row) =>
      row.moodScore !== null &&
      row.stressLevel !== null &&
      row.energyLevel !== null &&
      row.sleepHours !== null &&
      row.workloadLevel !== null,
  ).length;
  const pairedMoodEatingDays = rows.filter(
    (row) => row.moodScore !== null && row.unhealthyMealRate !== null,
  ).length;

  const warnings = [
    ...linearModels.flatMap((report) => report.model.warnings.map((warning) => report.title + ": " + warning)),
    ...logisticModels.flatMap((report) => report.model.warnings.map((warning) => report.title + ": " + warning)),
  ];

  if (rows.length < 14) warnings.push("Fewer than 14 tracked days limits stability of continuous and lagged estimates.");
  if (pairedMoodEatingDays < 14) {
    warnings.push("Fewer than 14 days contain both mood and eating data, limiting adjusted food-behavior inference.");
  }

  const strongContinuous = continuous.filter((result) => result.evidence === "strong").length;
  const strongLagged = lagged.filter((result) => result.evidence === "strong").length;
  const stableModels = [...linearModels.map((report) => report.model), ...logisticModels.map((report) => report.model)]
    .filter((model) => model.warnings.length === 0).length;

  let analysisClass: InferenceQualityReport["analysisClass"] = "limited";
  if (rows.length >= 14 && (continuous.length > 0 || lagged.length > 0)) analysisClass = "exploratory";
  if (
    rows.length >= 30 &&
    completeMoodDays >= 20 &&
    (strongContinuous + strongLagged > 0 || stableModels > 0)
  ) {
    analysisClass = "research-oriented";
  }

  return {
    analysisClass,
    clinicalValidated: false,
    trackedDays: rows.length,
    completeMoodDays,
    pairedMoodEatingDays,
    continuousTests: continuous.length,
    laggedTests: lagged.length,
    linearModels: linearModels.length,
    logisticModels: logisticModels.length,
    multiplicityMethod: "Benjamini-Hochberg false-discovery-rate control within each analysis family",
    regressionUncertaintyMethod: "HC3 heteroskedasticity-robust standard errors for linear models; Wald intervals for logistic models",
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
  const continuousCorrelations = evaluateContinuous(rows, continuousSpecs);
  const laggedEffects = evaluateLagged(rows, lagSpecs);
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

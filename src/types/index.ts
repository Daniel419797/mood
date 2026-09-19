// ─── Auth ────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  displayName: string;  // maps from NexusForge's `name` field
  role: string;
  createdAt: string;
}

export interface RegisterRequestDTO {
  displayName: string;
  email: string;
  password: string;
}

export interface LoginRequestDTO {
  email: string;
  password: string;
}

export interface LoginResponseDTO {
  data: {
    token: string;
    refreshToken?: string;
    user: User;
  };
  message: string;
}

export interface UpdateProfileRequestDTO {
  displayName?: string;
  currentPassword?: string;
  newPassword?: string;
}

// ─── Mood Logs ───────────────────────────────────────────────────────────────

export type MoodLabel = "Happy" | "Anxious" | "Stressed" | "Sad" | "Calm" | "Bored";
export type WorkloadLevel = "Low" | "Medium" | "High";

export interface MoodLog {
  id: string;
  userId: string;
  moodScore: number;
  moodLabel: MoodLabel;
  stressLevel: number;
  energyLevel: number;
  sleepHours: number;
  workload: WorkloadLevel;
  notes?: string;
  loggedAt: string;
}

export interface CreateMoodLogRequestDTO {
  moodScore: number;
  moodLabel: MoodLabel;
  stressLevel: number;
  energyLevel: number;
  sleepHours: number;
  workload: WorkloadLevel;
  notes?: string;
}

export type UpdateMoodLogRequestDTO = Partial<CreateMoodLogRequestDTO>;

// ─── Eating Logs ─────────────────────────────────────────────────────────────

export type MealType = "Breakfast" | "Lunch" | "Dinner" | "Snack" | "Other";
export type FoodCategory = "Healthy" | "Junk" | "Neutral" | "Skipped";
export type PortionRating = "Small" | "Normal" | "Large" | "Binge";
export type TimeOfDay = "Morning" | "Afternoon" | "Evening" | "Night";

export interface EatingLog {
  id: string;
  userId: string;
  mealType: MealType;
  foodCategory: FoodCategory;
  portionRating: PortionRating;
  hungerBefore: number;
  timeOfDay: TimeOfDay;
  description?: string;
  loggedAt: string;
}

export interface CreateEatingLogRequestDTO {
  mealType: MealType;
  foodCategory: FoodCategory;
  portionRating: PortionRating;
  hungerBefore: number;
  timeOfDay: TimeOfDay;
  description?: string;
}

export type UpdateEatingLogRequestDTO = Partial<CreateEatingLogRequestDTO>;

// ─── Insights ────────────────────────────────────────────────────────────────

export type InsightEvidence = "strong" | "emerging";
export type InsightDirection = "positive" | "negative";

export interface ConfidenceIntervalDTO {
  low: number;
  high: number;
  level: number;
}

export interface ContinuousCorrelationDTO {
  id: string;
  x: string;
  xLabel: string;
  y: string;
  yLabel: string;
  n: number;
  pearson: number;
  spearman: number;
  confidenceInterval: ConfidenceIntervalDTO;
  pValue: number;
  adjustedPValue: number;
  evidence: "strong" | "emerging" | "weak";
}

export interface LaggedEffectDTO extends ContinuousCorrelationDTO {
  lagDays: number;
  directionLabel: string;
}

export interface LinearCoefficientDTO {
  name: string;
  estimate: number;
  standardizedEstimate: number | null;
  standardError: number;
  pValue: number;
  adjustedPValue: number;
  confidenceInterval: ConfidenceIntervalDTO;
  vif: number | null;
}

export interface LinearModelDTO {
  outcome: string;
  n: number;
  predictorCount: number;
  rSquared: number;
  adjustedRSquared: number;
  rmse: number;
  residualDf: number;
  coefficients: LinearCoefficientDTO[];
  warnings: string[];
}

export interface LogisticCoefficientDTO {
  name: string;
  estimate: number;
  standardError: number;
  pValue: number;
  adjustedPValue: number;
  oddsRatio: number;
  confidenceInterval: ConfidenceIntervalDTO;
  oddsRatioConfidenceInterval: ConfidenceIntervalDTO;
  vif: number | null;
}

export interface LogisticModelDTO {
  outcome: string;
  n: number;
  eventCount: number;
  predictorCount: number;
  converged: boolean;
  iterations: number;
  pseudoRSquared: number;
  coefficients: LogisticCoefficientDTO[];
  warnings: string[];
}

export interface RegressionModelReportDTO {
  id: string;
  title: string;
  description: string;
  model: LinearModelDTO;
}

export interface LogisticModelReportDTO {
  id: string;
  title: string;
  description: string;
  model: LogisticModelDTO;
}

export interface InferenceQualityDTO {
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

export interface AdvancedAnalyticsDTO {
  continuousCorrelations: ContinuousCorrelationDTO[];
  laggedEffects: LaggedEffectDTO[];
  linearModels: RegressionModelReportDTO[];
  logisticModels: LogisticModelReportDTO[];
  quality: InferenceQualityDTO;
}

export interface InsightDTO {
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
  effectConfidenceInterval: ConfidenceIntervalDTO;
  evidence: InsightEvidence;
  direction: InsightDirection;
  matchingDays: number;
  triggerDays: number;
  totalDays: number;
}

export interface InsightsResponseDTO {
  data:
    | {
        insufficientData: false;
        insights: InsightDTO[];
        emergingInsights: InsightDTO[];
        advanced: AdvancedAnalyticsDTO;
        lastUpdated: string;
        patternThreshold: number;
        analyzedDays: number;
        range: DashboardRange;
      }
    | {
        insufficientData: true;
        daysLogged: number;
        requiredDays: number;
        range: DashboardRange;
      };
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

export interface DashboardSummary {
  totalMoodLogs: number;
  totalEatingLogs: number;
  daysTracked: number;
  topMoodLabel: MoodLabel | null;
  topFoodCategory: FoodCategory | null;
}

export interface MoodTrendPoint {
  date: string;
  avgMoodScore: number;
  avgStressLevel: number;
}

export interface EatingFrequencyPoint {
  foodCategory: FoodCategory;
  count: number;
}

export interface StressFoodPoint {
  stressLevel: string;
  Healthy: number;
  Neutral: number;
  Junk: number;
  Skipped: number;
}

export interface DashboardResponseDTO {
  data: {
    summary: DashboardSummary;
    moodTrend: MoodTrendPoint[];
    eatingFrequency: EatingFrequencyPoint[];
    stressFoodCorrelation: StressFoodPoint[];
    topInsights: InsightDTO[];
  };
}

// ─── Shared ──────────────────────────────────────────────────────────────────

export interface ErrorResponseDTO {
  message: string;
  errors?: Record<string, string[]>;
  retryAfter?: string;
}

export interface ListResponseDTO<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface LogQueryParams {
  from?: string;
  to?: string;
  limit?: number;
}

export type DashboardRange = "7d" | "30d" | "all";

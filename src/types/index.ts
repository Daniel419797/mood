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
export type FoodCategory = "Healthy" | "Neutral" | "Sugary" | "Junk" | "Skipped";
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

export interface InsightDTO {
  correlationId: string;
  headline: string;
  supportingStat: string;
  dateRangeLabel: string;
  suggestion: string;
  strengthScore: number;
  matchingDays: number;
  totalDays: number;
}

export interface InsightsResponseDTO {
  data:
    | {
        insufficientData: false;
        insights: InsightDTO[];
        lastUpdated: string;
        threshold: number;
      }
    | {
        insufficientData: true;
        daysLogged: number;
        requiredDays: number;
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
  Sugary: number;
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

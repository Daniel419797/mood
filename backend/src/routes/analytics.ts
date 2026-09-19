import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { analyzeAdvancedAnalytics } from "../lib/advancedAnalytics.js";
import {
  analyzeBehavioralInsights,
  buildEatingFrequency,
  buildMoodTrend,
  buildStressFoodCorrelation,
  countTrackedDays,
  topCategory,
} from "../lib/analytics.js";
import { authenticatedUserId, requireAuth } from "../middleware/auth.js";
import { analyticsQuerySchema } from "../validation.js";

const router = Router();
router.use(requireAuth);

type AnalyticsRange = "7d" | "30d" | "all";

function rangeStart(range: AnalyticsRange): Date | undefined {
  if (range === "all") return undefined;
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() - (range === "7d" ? 6 : 29));
  return date;
}

function rangeLabel(range: AnalyticsRange): string {
  if (range === "7d") return "Last 7 days";
  if (range === "30d") return "Last 30 days";
  return "All tracked data";
}

async function loadAnalyticsData(userId: string, range: AnalyticsRange) {
  const start = rangeStart(range);
  const where = {
    userId,
    ...(start ? { loggedAt: { gte: start } } : {}),
  };

  const [moods, eating] = await Promise.all([
    prisma.moodLog.findMany({
      where,
      orderBy: { loggedAt: "asc" },
      select: {
        moodScore: true,
        moodLabel: true,
        stressLevel: true,
        energyLevel: true,
        sleepHours: true,
        workload: true,
        loggedAt: true,
      },
    }),
    prisma.eatingLog.findMany({
      where,
      orderBy: { loggedAt: "asc" },
      select: {
        foodCategory: true,
        portionRating: true,
        timeOfDay: true,
        hungerBefore: true,
        loggedAt: true,
      },
    }),
  ]);

  return { moods, eating };
}

router.get("/insights", async (req, res) => {
  const userId = authenticatedUserId(req);
  const query = analyticsQuerySchema.parse(req.query);
  const { moods, eating } = await loadAnalyticsData(userId, query.range);
  const daysLogged = countTrackedDays(moods, eating);
  const requiredDays = 7;

  if (daysLogged < requiredDays) {
    res.json({
      data: {
        insufficientData: true,
        daysLogged,
        requiredDays,
        range: query.range,
      },
    });
    return;
  }

  const analysis = analyzeBehavioralInsights(
    moods,
    eating,
    query.threshold,
    rangeLabel(query.range),
  );
  const advanced = analyzeAdvancedAnalytics(moods, eating);

  res.json({
    data: {
      insufficientData: false,
      insights: analysis.insights,
      emergingInsights: analysis.emergingInsights,
      advanced,
      lastUpdated: new Date().toISOString(),
      patternThreshold: query.threshold,
      analyzedDays: analysis.analyzedDays,
      range: query.range,
    },
  });
});

router.get("/dashboard", async (req, res) => {
  const userId = authenticatedUserId(req);
  const query = analyticsQuerySchema.parse(req.query);
  const { moods, eating } = await loadAnalyticsData(userId, query.range);
  const analysis = analyzeBehavioralInsights(
    moods,
    eating,
    query.threshold,
    rangeLabel(query.range),
  );

  const summary = {
    totalMoodLogs: moods.length,
    totalEatingLogs: eating.length,
    daysTracked: countTrackedDays(moods, eating),
    topMoodLabel: topCategory(moods.map((mood) => mood.moodLabel)),
    topFoodCategory: topCategory(eating.map((meal) => meal.foodCategory)),
  };

  const topInsights =
    analysis.insights.length > 0
      ? analysis.insights.slice(0, 3)
      : analysis.emergingInsights.slice(0, 3);

  res.json({
    data: {
      summary,
      moodTrend: buildMoodTrend(moods),
      eatingFrequency: buildEatingFrequency(eating),
      stressFoodCorrelation: buildStressFoodCorrelation(moods, eating),
      topInsights,
    },
  });
});

export { router as analyticsRouter };

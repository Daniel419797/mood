import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";
import { buildDashboard, buildInsights } from "../services/insights.js";
import { dashboardQuerySchema, insightsQuerySchema } from "../validation.js";

const router = Router();
router.use(requireAuth);

function rangeStart(range: "7d" | "30d" | "all"): Date | undefined {
  if (range === "all") return undefined;
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - (range === "7d" ? 7 : 30));
  return date;
}

async function loadLogs(userId: string, start?: Date) {
  const where = { userId, ...(start ? { loggedAt: { gte: start } } : {}) };
  const [moods, eating] = await prisma.$transaction([
    prisma.moodLog.findMany({ where, orderBy: { loggedAt: "asc" } }),
    prisma.eatingLog.findMany({ where, orderBy: { loggedAt: "asc" } }),
  ]);
  return { moods, eating };
}

router.get("/dashboard", async (req, res) => {
  const { userId } = (req as AuthenticatedRequest).auth;
  const query = dashboardQuerySchema.parse(req.query);
  const { moods, eating } = await loadLogs(userId, rangeStart(query.range));
  res.json({ data: buildDashboard(moods, eating, query.threshold) });
});

router.get("/insights", async (req, res) => {
  const { userId } = (req as AuthenticatedRequest).auth;
  const query = insightsQuerySchema.parse(req.query);
  const { moods, eating } = await loadLogs(userId);

  const daysLogged = new Set([
    ...moods.map((m) => m.loggedAt.toISOString().slice(0, 10)),
    ...eating.map((e) => e.loggedAt.toISOString().slice(0, 10)),
  ]).size;
  const requiredDays = 7;

  if (daysLogged < requiredDays) {
    res.json({
      data: {
        insufficientData: true,
        daysLogged,
        requiredDays,
      },
    });
    return;
  }

  res.json({
    data: {
      insufficientData: false,
      insights: buildInsights(moods, eating, query.threshold),
      lastUpdated: new Date().toISOString(),
      threshold: query.threshold,
    },
  });
});

export { router as insightsRouter };

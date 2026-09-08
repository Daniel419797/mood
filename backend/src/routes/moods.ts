import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";
import { AppError } from "../middleware/errors.js";
import { createMoodSchema, logQuerySchema, updateMoodSchema } from "../validation.js";

const router = Router();
router.use(requireAuth);

function dateWhere(from?: string, to?: string) {
  if (!from && !to) return undefined;
  return {
    ...(from ? { gte: new Date(`${from}T00:00:00.000Z`) } : {}),
    ...(to ? { lte: new Date(`${to}T23:59:59.999Z`) } : {}),
  };
}

router.get("/", async (req, res) => {
  const { userId } = (req as AuthenticatedRequest).auth;
  const query = logQuerySchema.parse(req.query);
  const where = {
    userId,
    ...(dateWhere(query.from, query.to) ? { loggedAt: dateWhere(query.from, query.to) } : {}),
  };

  const [rows, total] = await prisma.$transaction([
    prisma.moodLog.findMany({
      where,
      orderBy: { loggedAt: "desc" },
      take: query.limit,
      skip: query.offset,
    }),
    prisma.moodLog.count({ where }),
  ]);

  res.json({ data: rows, total, limit: query.limit, offset: query.offset });
});

router.post("/", async (req, res) => {
  const { userId } = (req as AuthenticatedRequest).auth;
  const data = createMoodSchema.parse(req.body);
  const row = await prisma.moodLog.create({
    data: {
      userId,
      moodScore: data.moodScore,
      moodLabel: data.moodLabel,
      stressLevel: data.stressLevel,
      energyLevel: data.energyLevel,
      sleepHours: data.sleepHours,
      workload: data.workload,
      notes: data.notes,
      ...(data.loggedAt ? { loggedAt: new Date(data.loggedAt) } : {}),
    },
  });
  res.status(201).json({ data: row });
});

router.get("/:id", async (req, res) => {
  const { userId } = (req as AuthenticatedRequest).auth;
  const row = await prisma.moodLog.findFirst({ where: { id: req.params.id, userId } });
  if (!row) throw new AppError(404, "Mood log not found.");
  res.json({ data: row });
});

router.patch("/:id", async (req, res) => {
  const { userId } = (req as AuthenticatedRequest).auth;
  const data = updateMoodSchema.parse(req.body);
  const existing = await prisma.moodLog.findFirst({ where: { id: req.params.id, userId }, select: { id: true } });
  if (!existing) throw new AppError(404, "Mood log not found.");

  const row = await prisma.moodLog.update({
    where: { id: existing.id },
    data: {
      ...data,
      ...(data.loggedAt ? { loggedAt: new Date(data.loggedAt) } : {}),
    },
  });
  res.json({ data: row });
});

router.delete("/:id", async (req, res) => {
  const { userId } = (req as AuthenticatedRequest).auth;
  const deleted = await prisma.moodLog.deleteMany({ where: { id: req.params.id, userId } });
  if (deleted.count === 0) throw new AppError(404, "Mood log not found.");
  res.status(204).send();
});

export { router as moodsRouter };

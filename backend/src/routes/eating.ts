import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { authenticatedUserId, requireAuth } from "../middleware/auth.js";
import { AppError } from "../middleware/errors.js";
import { createEatingSchema, logQuerySchema, updateEatingSchema } from "../validation.js";

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
  const userId = authenticatedUserId(req);
  const query = logQuerySchema.parse(req.query);
  const loggedAt = dateWhere(query.from, query.to);
  const where = { userId, ...(loggedAt ? { loggedAt } : {}) };

  const [rows, total] = await prisma.$transaction([
    prisma.eatingLog.findMany({
      where,
      orderBy: { loggedAt: "desc" },
      take: query.limit,
      skip: query.offset,
    }),
    prisma.eatingLog.count({ where }),
  ]);

  res.json({ data: rows, total, limit: query.limit, offset: query.offset });
});

router.post("/", async (req, res) => {
  const userId = authenticatedUserId(req);
  const data = createEatingSchema.parse(req.body);
  const row = await prisma.eatingLog.create({ data: { userId, ...data } });
  res.status(201).json({ data: row });
});

router.patch("/:id", async (req, res) => {
  const userId = authenticatedUserId(req);
  const data = updateEatingSchema.parse(req.body);
  const existing = await prisma.eatingLog.findFirst({
    where: { id: req.params.id, userId },
    select: { id: true },
  });
  if (!existing) throw new AppError(404, "Eating log not found.");

  const row = await prisma.eatingLog.update({
    where: { id: existing.id },
    data,
  });
  res.json({ data: row });
});

router.delete("/:id", async (req, res) => {
  const userId = authenticatedUserId(req);
  const deleted = await prisma.eatingLog.deleteMany({ where: { id: req.params.id, userId } });
  if (deleted.count === 0) throw new AppError(404, "Eating log not found.");
  res.status(204).send();
});

export { router as eatingRouter };

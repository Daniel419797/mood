import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import type { User } from "../generated/prisma/client.js";
import { allowedOrigins, env } from "../config.js";
import { prisma } from "../lib/prisma.js";
import {
  clearRefreshCookie,
  createRefreshSession,
  hashPassword,
  hashRefreshToken,
  rotateRefreshSession,
  setRefreshCookie,
  signAccessToken,
  verifyPassword,
} from "../lib/security.js";
import { AppError } from "../middleware/errors.js";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";
import { loginSchema, registerSchema, updateProfileSchema } from "../validation.js";

const router = Router();

function requireAllowedBrowserOrigin(origin: string | undefined): void {
  if (origin && !allowedOrigins.includes(origin)) {
    throw new AppError(403, "Origin not allowed.");
  }
}

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "Too many authentication attempts. Try again later." },
});

function publicUser(user: Pick<User, "id" | "email" | "displayName" | "role" | "createdAt">) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
  };
}

async function respondWithSession(res: Parameters<typeof setRefreshCookie>[0], user: User, status = 200) {
  const refreshToken = await createRefreshSession(user.id);
  setRefreshCookie(res, refreshToken);

  res.status(status).json({
    data: {
      token: signAccessToken(user.id),
      user: publicUser(user),
    },
    message: status === 201 ? "Account created." : "Authenticated.",
  });
}

router.post("/register", authLimiter, async (req, res) => {
  const data = registerSchema.parse(req.body);
  const email = data.email.trim().toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) throw new AppError(409, "An account with that email already exists.");

  const user = await prisma.user.create({
    data: {
      email,
      displayName: data.displayName,
      passwordHash: await hashPassword(data.password),
    },
  });

  await respondWithSession(res, user, 201);
});

router.post("/login", authLimiter, async (req, res) => {
  const data = loginSchema.parse(req.body);
  const email = data.email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !(await verifyPassword(data.password, user.passwordHash))) {
    throw new AppError(401, "Invalid email or password.");
  }

  await respondWithSession(res, user);
});

router.post("/refresh", authLimiter, async (req, res) => {
  requireAllowedBrowserOrigin(req.header("origin"));
  const token = req.cookies?.[env.COOKIE_NAME] as string | undefined;
  if (!token) throw new AppError(401, "Refresh session required.");

  try {
    const { userId, newToken } = await rotateRefreshSession(token);
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError(401, "Refresh session is no longer valid.");

    setRefreshCookie(res, newToken);
    res.json({
      data: {
        token: signAccessToken(user.id),
        user: publicUser(user),
      },
      message: "Session refreshed.",
    });
  } catch (error) {
    clearRefreshCookie(res);
    if (error instanceof AppError) throw error;
    throw new AppError(401, "Invalid or expired refresh session.");
  }
});

router.post("/logout", async (req, res) => {
  requireAllowedBrowserOrigin(req.header("origin"));
  const token = req.cookies?.[env.COOKIE_NAME] as string | undefined;
  if (token) {
    await prisma.refreshSession.updateMany({
      where: { tokenHash: hashRefreshToken(token), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
  clearRefreshCookie(res);
  res.status(204).send();
});

router.get("/me", requireAuth, async (req, res) => {
  const { userId } = (req as AuthenticatedRequest).auth;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError(404, "User not found.");
  res.json({ data: publicUser(user) });
});

router.patch("/me", requireAuth, async (req, res) => {
  const { userId } = (req as AuthenticatedRequest).auth;
  const data = updateProfileSchema.parse(req.body);
  const current = await prisma.user.findUnique({ where: { id: userId } });
  if (!current) throw new AppError(404, "User not found.");

  let passwordHash: string | undefined;
  if (data.newPassword) {
    const valid = await verifyPassword(data.currentPassword!, current.passwordHash);
    if (!valid) throw new AppError(400, "Current password is incorrect.");
    passwordHash = await hashPassword(data.newPassword);
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(data.displayName !== undefined ? { displayName: data.displayName } : {}),
      ...(passwordHash ? { passwordHash } : {}),
    },
  });

  if (passwordHash) {
    await prisma.refreshSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    const refreshToken = await createRefreshSession(userId);
    setRefreshCookie(res, refreshToken);
  }

  res.json({ data: publicUser(user) });
});

router.delete("/me", requireAuth, async (req, res) => {
  const { userId } = (req as AuthenticatedRequest).auth;
  await prisma.user.deleteMany({ where: { id: userId } });
  clearRefreshCookie(res);
  res.status(204).send();
});

export { router as authRouter };

import crypto from "node:crypto";
import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import type { Request, Response } from "express";
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
const OAUTH_STATE_COOKIE = `${env.COOKIE_NAME}_oauth_state`;
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;
const AUTH_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

type OAuthState = { state: string; redirectOrigin: string };
type GoogleTokenResponse = { access_token?: string; error?: string; error_description?: string };
type GoogleUserInfo = { sub?: string; email?: string; email_verified?: boolean; name?: string };

function normalizeOrigin(value: string): string {
  return new URL(value).origin.replace(/\/+$/, "");
}

function requireAllowedBrowserOrigin(origin: string | undefined): void {
  if (!origin) return;
  let normalized: string;
  try {
    normalized = normalizeOrigin(origin);
  } catch {
    throw new AppError(403, "Origin not allowed.");
  }
  if (!allowedOrigins.includes(normalized)) throw new AppError(403, "Origin not allowed.");
}

function publicUser(user: Pick<User, "id" | "email" | "displayName" | "role" | "createdAt">) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
  };
}

const authLimiter = rateLimit({
  windowMs: AUTH_RATE_LIMIT_WINDOW_MS,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler(_req, res) {
    res.status(429).json({
      message: "Too many authentication attempts. Try again later.",
      retryAfter: new Date(Date.now() + AUTH_RATE_LIMIT_WINDOW_MS).toISOString(),
    });
  },
});

async function createSessionResponse(res: Response, user: User) {
  const refreshToken = await createRefreshSession(user.id);
  setRefreshCookie(res, refreshToken);
  res.json({
    data: { token: signAccessToken(user.id), user: publicUser(user) },
    message: "Authenticated.",
  });
}

function googleCallbackUrl(req: Request): string {
  const origin = env.PUBLIC_API_URL
    ? env.PUBLIC_API_URL.replace(/\/+$/, "")
    : `${req.protocol}://${req.get("host")}`;
  return `${origin}/api/v1/auth/oauth/google/callback`;
}

function requireGoogleConfig(): { clientId: string; clientSecret: string } {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    throw new AppError(503, "Google sign-in is not configured.");
  }
  return { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET };
}

function encodeOAuthState(value: OAuthState): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

function decodeOAuthState(value: string | undefined): OAuthState | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as OAuthState;
    if (!parsed.state || !parsed.redirectOrigin) return null;
    return parsed;
  } catch {
    return null;
  }
}

function setOAuthStateCookie(res: Response, state: OAuthState): void {
  res.cookie(OAUTH_STATE_COOKIE, encodeOAuthState(state), {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: "lax",
    path: "/api/v1/auth/oauth/google/callback",
    maxAge: OAUTH_STATE_TTL_MS,
  });
}

function clearOAuthStateCookie(res: Response): void {
  res.clearCookie(OAUTH_STATE_COOKIE, {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: "lax",
    path: "/api/v1/auth/oauth/google/callback",
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

  res.status(201).json({ data: publicUser(user), message: "Account created." });
});

router.post("/login", authLimiter, async (req, res) => {
  const data = loginSchema.parse(req.body);
  const email = data.email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user?.passwordHash || !(await verifyPassword(data.password, user.passwordHash))) {
    throw new AppError(401, "Invalid email or password.");
  }
  await createSessionResponse(res, user);
});

router.get("/oauth/google", async (req, res) => {
  const { clientId } = requireGoogleConfig();
  const rawRedirect = typeof req.query.redirect === "string" ? req.query.redirect : "";
  if (!rawRedirect) throw new AppError(400, "OAuth redirect origin is required.");

  let redirectOrigin: string;
  try {
    redirectOrigin = normalizeOrigin(rawRedirect);
  } catch {
    throw new AppError(400, "Invalid OAuth redirect origin.");
  }
  if (!allowedOrigins.includes(redirectOrigin)) {
    throw new AppError(403, "OAuth redirect origin is not allowed.");
  }

  const state = crypto.randomBytes(32).toString("base64url");
  setOAuthStateCookie(res, { state, redirectOrigin });
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: googleCallbackUrl(req),
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

router.get("/oauth/google/callback", async (req, res) => {
  const cookieState = decodeOAuthState(req.cookies?.[OAUTH_STATE_COOKIE] as string | undefined);
  const queryState = typeof req.query.state === "string" ? req.query.state : "";
  const code = typeof req.query.code === "string" ? req.query.code : "";
  const redirectOrigin = cookieState?.redirectOrigin;

  try {
    const { clientId, clientSecret } = requireGoogleConfig();
    if (!cookieState || !queryState || cookieState.state !== queryState || !code) {
      throw new AppError(400, "Invalid Google OAuth callback.");
    }
    clearOAuthStateCookie(res);

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: googleCallbackUrl(req),
        grant_type: "authorization_code",
      }),
    });
    const tokenPayload = (await tokenResponse.json()) as GoogleTokenResponse;
    if (!tokenResponse.ok || !tokenPayload.access_token) {
      throw new AppError(401, tokenPayload.error_description ?? "Google authorization failed.");
    }

    const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { Authorization: `Bearer ${tokenPayload.access_token}` },
    });
    const profile = (await profileResponse.json()) as GoogleUserInfo;
    if (!profileResponse.ok || !profile.sub || !profile.email || profile.email_verified !== true) {
      throw new AppError(401, "Google did not return a verified account.");
    }

    const email = profile.email.trim().toLowerCase();
    let user = await prisma.user.findFirst({ where: { OR: [{ googleSub: profile.sub }, { email }] } });
    if (user) {
      if (user.googleSub && user.googleSub !== profile.sub) {
        throw new AppError(409, "This email is already linked to another Google account.");
      }
      if (!user.googleSub) {
        user = await prisma.user.update({ where: { id: user.id }, data: { googleSub: profile.sub } });
      }
    } else {
      user = await prisma.user.create({
        data: {
          email,
          displayName: profile.name?.trim() || email.split("@")[0] || "User",
          googleSub: profile.sub,
          passwordHash: null,
        },
      });
    }

    const refreshToken = await createRefreshSession(user.id);
    setRefreshCookie(res, refreshToken);
    res.redirect(`${redirectOrigin}/oauth/callback?oauth=success`);
  } catch (error) {
    clearOAuthStateCookie(res);
    if (redirectOrigin && allowedOrigins.includes(redirectOrigin)) {
      const message = error instanceof AppError ? error.message : "Google sign-in failed.";
      res.redirect(`${redirectOrigin}/oauth/callback?error=${encodeURIComponent(message)}`);
      return;
    }
    throw error;
  }
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
      data: { token: signAccessToken(user.id), user: publicUser(user) },
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
    if (!current.passwordHash) {
      throw new AppError(400, "Password changes are unavailable for Google-only accounts.");
    }
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
    await prisma.refreshSession.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
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

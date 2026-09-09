import type { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../lib/security.js";

export interface AuthenticatedRequest extends Request {
  auth: {
    userId: string;
  };
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.header("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    res.status(401).json({ message: "Authentication required." });
    return;
  }

  try {
    const userId = verifyAccessToken(token);
    (req as AuthenticatedRequest).auth = { userId };
    next();
  } catch {
    res.status(401).json({ message: "Invalid or expired access token." });
  }
}

export function authenticatedUserId(req: Request): string {
  return (req as AuthenticatedRequest).auth.userId;
}

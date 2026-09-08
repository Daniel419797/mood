import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { rateLimit } from "express-rate-limit";
import helmet from "helmet";
import { allowedOrigins, env } from "./config.js";
import { authRouter } from "./routes/auth.js";
import { eatingRouter } from "./routes/eating.js";
import { moodsRouter } from "./routes/moods.js";
import { errorHandler, notFound } from "./middleware/errors.js";
import { prisma } from "./lib/prisma.js";

export const app = express();

if (env.TRUST_PROXY) {
  app.set("trust proxy", 1);
}

app.disable("x-powered-by");
app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin.replace(/\/+$/, ""))) return callback(null, true);
      return callback(new Error("Origin not allowed by CORS"));
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: "32kb" }));
app.use(cookieParser());

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: "draft-8",
    legacyHeaders: false,
  }),
);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/ready", async (_req, res) => {
  await prisma.$queryRaw`SELECT 1`;
  res.json({ status: "ready" });
});

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/moods", moodsRouter);
app.use("/api/v1/eating", eatingRouter);

app.use(notFound);
app.use(errorHandler);

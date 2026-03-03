import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import packageJson from "../package.json";
import { env } from "./config";
import { errorHandler } from "./middleware";
import { statusRoutes } from "./routes/status";
import { authRoutes } from "./routes/auth";
import { success } from "./utils";

const app = new Hono();

// Global error handler
app.onError(errorHandler);

// Global middleware
app.use("*", logger());
app.use("*", cors({ origin: env.CORS_ORIGIN }));

// Health check (outside /api/v1 — used by load balancers)
app.get("/health", (c) =>
  success(c, { status: "ok", version: packageJson.version, timestamp: new Date().toISOString() }),
);

// API v1
const api = new Hono();
api.route("/status", statusRoutes);
api.route("/auth", authRoutes);

app.route("/api/v1", api);

export { app };

export default {
  port: env.PORT,
  fetch: app.fetch,
};

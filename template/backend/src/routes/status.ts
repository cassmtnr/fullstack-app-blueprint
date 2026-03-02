import { Hono } from "hono";
import { sql } from "drizzle-orm";
import packageJson from "../../package.json";
import { env } from "../config";
import { db } from "../db";
import { error, success } from "../utils";

const statusRoutes = new Hono();

statusRoutes.get("/", async (c) => {
  try {
    await db.execute(sql`SELECT 1`);
  } catch {
    return error(c, "DATABASE_UNAVAILABLE", "Database connection failed", 503);
  }

  return success(c, {
    status: "ok",
    version: packageJson.version,
    environment: env.NODE_ENV,
    database: "connected",
    timestamp: new Date().toISOString(),
  });
});

export { statusRoutes };

import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { AppError } from "../utils/errors";
import { error } from "../utils/response";

export function errorHandler(err: Error, c: Context) {
  if (err instanceof AppError) {
    return error(c, err.code, err.message, err.statusCode as ContentfulStatusCode);
  }
  if (err.name === "ZodError") {
    const zodErr = err as Error & { issues: Array<{ message: string }> };
    return error(c, "VALIDATION_ERROR", zodErr.issues[0]?.message || "Validation failed", 400);
  }
  console.error("Unhandled error:", err);
  return error(c, "INTERNAL_ERROR", "Internal server error", 500);
}

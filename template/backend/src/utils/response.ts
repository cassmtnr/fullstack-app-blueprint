import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

export function success<T>(c: Context, data: T, status?: ContentfulStatusCode): Response {
  return c.json({ success: true, data }, status ?? 200);
}

export function error(
  c: Context,
  code: string,
  message: string,
  status?: ContentfulStatusCode,
): Response {
  return c.json({ success: false, error: { code, message } }, status ?? 400);
}

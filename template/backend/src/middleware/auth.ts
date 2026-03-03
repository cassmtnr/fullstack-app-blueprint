import type { Context, Next } from "hono";
import { jwtVerify } from "jose";
import { env } from "../config";
import { UnauthorizedError } from "../utils/errors";

export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new UnauthorizedError("Missing or invalid authorization header");
  }

  const token = authHeader.slice(7);
  try {
    const secret = new TextEncoder().encode(env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    if (typeof payload.sub !== "string") {
      throw new UnauthorizedError("Token missing subject claim");
    }
    c.set("userId", payload.sub);
  } catch (err) {
    if (err instanceof UnauthorizedError) throw err;
    throw new UnauthorizedError("Invalid or expired token");
  }

  await next();
}

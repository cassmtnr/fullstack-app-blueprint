import type { Context } from "hono";
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { users } from "../db/schema";
import { authMiddleware } from "../middleware/auth";
import {
  verifyAppleIdentityToken,
  createOrFindUser,
  issueTokens,
  refreshTokens,
  revokeRefreshToken,
} from "../services/auth";
import { error, success } from "../utils";

const authRoutes = new Hono();

// Production hardening: add rate limiting to auth endpoints.
// See Section 11 "Rate Limiter" pattern for a per-IP limiter using Hono middleware.

// Custom validation error hook — ensures Zod validation errors use the standard envelope
// instead of @hono/zod-validator's default format.
function zodHook(
  result: { success: boolean; error?: { issues: Array<{ message: string }> } },
  c: Context,
) {
  if (!result.success) {
    return error(c, "VALIDATION_ERROR", result.error!.issues[0]?.message || "Validation failed", 400);
  }
}

// POST /auth/apple — Sign in with Apple
const appleAuthSchema = z.object({
  identityToken: z.string().min(1),
  fullName: z.string().optional(),
});

authRoutes.post("/apple", zValidator("json", appleAuthSchema, zodHook), async (c) => {
  const { identityToken, fullName } = c.req.valid("json");

  const { sub: appleUserId, email } = await verifyAppleIdentityToken(identityToken);
  const user = await createOrFindUser(appleUserId, email, fullName ?? undefined);
  const tokens = await issueTokens(user.id);

  return success(
    c,
    {
      user: { id: user.id, email: user.email, fullName: user.fullName },
      ...tokens,
    },
    201,
  );
});

// POST /auth/refresh — Refresh access token
const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

authRoutes.post("/refresh", zValidator("json", refreshSchema, zodHook), async (c) => {
  const { refreshToken } = c.req.valid("json");
  const tokens = await refreshTokens(refreshToken);
  return success(c, tokens);
});

// GET /auth/me — Get current user
authRoutes.get("/me", authMiddleware, async (c) => {
  const userId = c.get("userId");
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    return error(c, "NOT_FOUND", "User not found", 404);
  }

  return success(c, {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    createdAt: user.createdAt,
  });
});

// POST /auth/logout — Revoke refresh token
const logoutSchema = z.object({
  refreshToken: z.string().min(1),
});

authRoutes.post("/logout", authMiddleware, zValidator("json", logoutSchema, zodHook), async (c) => {
  const { refreshToken } = c.req.valid("json");
  await revokeRefreshToken(refreshToken);
  return success(c, { message: "Logged out successfully" });
});

export { authRoutes };

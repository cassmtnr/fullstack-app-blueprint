import { SignJWT, jwtVerify, createRemoteJWKSet } from "jose";
import { eq, and, isNull, gt } from "drizzle-orm";
import { db } from "../db";
import { users, refreshTokens as refreshTokensTable } from "../db/schema";
import { env } from "../config";
import { AppError, UnauthorizedError } from "../utils/errors";

// Apple JWKS endpoint (public keys for verifying identity tokens)
const APPLE_JWKS = createRemoteJWKSet(
  new URL("https://appleid.apple.com/auth/keys"),
);

export async function verifyAppleIdentityToken(
  identityToken: string,
): Promise<{ sub: string; email?: string }> {
  try {
    const { payload } = await jwtVerify(identityToken, APPLE_JWKS, {
      issuer: "https://appleid.apple.com",
      audience: env.APPLE_BUNDLE_ID,
    });
    return {
      sub: payload.sub as string,
      email: payload.email as string | undefined,
    };
  } catch {
    throw new AppError("INVALID_CREDENTIALS", "Invalid Apple identity token", 401);
  }
}

export async function createOrFindUser(appleUserId: string, email?: string, fullName?: string) {
  const [user] = await db
    .insert(users)
    .values({
      appleUserId,
      email: email ?? null,
      fullName: fullName ?? null,
    })
    .onConflictDoUpdate({
      target: users.appleUserId,
      set: {
        ...(email ? { email } : {}),
        ...(fullName ? { fullName } : {}),
        updatedAt: new Date(),
      },
    })
    .returning();

  return user;
}

function durationToSeconds(duration: string): number {
  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) return 900;
  const [, num, unit] = match;
  const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
  return parseInt(num) * multipliers[unit];
}

function durationToMs(duration: string): number {
  return durationToSeconds(duration) * 1000;
}

export async function issueTokens(userId: string, tx?: typeof db) {
  const client = tx ?? db;
  const secret = new TextEncoder().encode(env.JWT_SECRET);
  const accessToken = await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(env.JWT_ACCESS_EXPIRES_IN)
    .sign(secret);

  // Refresh token is a random UUID stored in DB
  const refreshToken = crypto.randomUUID();
  await client.insert(refreshTokensTable).values({
    token: refreshToken,
    userId,
    expiresAt: new Date(Date.now() + durationToMs(env.JWT_REFRESH_EXPIRES_IN)),
  });

  return {
    accessToken,
    refreshToken,
    expiresIn: durationToSeconds(env.JWT_ACCESS_EXPIRES_IN),
  };
}

export async function refreshTokens(token: string) {
  return db.transaction(async (tx) => {
    const [stored] = await tx
      .select()
      .from(refreshTokensTable)
      .where(
        and(
          eq(refreshTokensTable.token, token),
          isNull(refreshTokensTable.revokedAt),
          gt(refreshTokensTable.expiresAt, new Date()),
        ),
      )
      .limit(1);

    if (!stored) {
      throw new UnauthorizedError("Invalid or expired refresh token");
    }

    // Revoke the used refresh token (rotation)
    await tx
      .update(refreshTokensTable)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokensTable.id, stored.id));

    // Issue new token pair
    return issueTokens(stored.userId, tx);
  });
}

export async function revokeRefreshToken(token: string) {
  await db
    .update(refreshTokensTable)
    .set({ revokedAt: new Date() })
    .where(eq(refreshTokensTable.token, token));
}

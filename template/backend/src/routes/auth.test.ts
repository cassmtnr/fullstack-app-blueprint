import { describe, expect, it, mock } from "bun:test";

// Import real jose before applying mock
const realJose = await import("jose");

// Mock jose for Apple Sign-In verification
mock.module("jose", () => ({
  ...realJose,
  createRemoteJWKSet: () => async () => ({}),
  jwtVerify: async (token: string, keyOrSecret: unknown, options?: unknown) => {
    // Apple token verification (options include audience)
    if (options && typeof options === "object" && "audience" in options) {
      return {
        payload: { sub: "apple-test-user-id", email: "test@example.com" },
      };
    }
    // Our own JWT verification (for authMiddleware) — use real implementation
    return realJose.jwtVerify(token, keyOrSecret as Parameters<typeof realJose.jwtVerify>[1]);
  },
}));

// Import app AFTER mock is set up
const { app } = await import("../index");

describe("POST /api/v1/auth/apple", () => {
  it("creates a new user and returns tokens", async () => {
    const res = await app.request("/api/v1/auth/apple", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identityToken: "mock-apple-identity-token",
        fullName: "Test User",
      }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.accessToken).toBeDefined();
    expect(body.data.refreshToken).toBeDefined();
    expect(body.data.expiresIn).toBeTypeOf("number");
    expect(body.data.user.email).toBe("test@example.com");
  });

  it("returns 400 for missing identityToken", async () => {
    const res = await app.request("/api/v1/auth/apple", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(400);
  });
});

describe("POST /api/v1/auth/refresh", () => {
  it("returns 401 for invalid refresh token", async () => {
    const res = await app.request("/api/v1/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: "invalid-token" }),
    });

    expect(res.status).toBe(401);
  });
});

describe("GET /api/v1/auth/me", () => {
  it("returns 401 without auth header", async () => {
    const res = await app.request("/api/v1/auth/me");
    expect(res.status).toBe(401);
  });
});

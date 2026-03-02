import { describe, expect, it } from "bun:test";
import { app } from "./index";

describe("GET /health", () => {
  it('returns { success: true, data: { status: "ok" } }', async () => {
    const res = await app.request("/health");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.status).toBe("ok");
    expect(body.data.version).toMatch(/^\d+\.\d+\.\d+/);
    expect(body.data.timestamp).toBeDefined();
  });
});

describe("GET /api/v1/status", () => {
  it("returns 200 with database connectivity", async () => {
    const res = await app.request("/api/v1/status");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.status).toBe("ok");
    expect(body.data.database).toBe("connected");
    expect(body.data.version).toMatch(/^\d+\.\d+\.\d+/);
    expect(body.data.environment).toBe("test");
    expect(body.data.timestamp).toBeDefined();
  });
});

describe("404 handling", () => {
  it("returns 404 for unknown routes", async () => {
    const res = await app.request("/nonexistent");
    expect(res.status).toBe(404);
  });
});

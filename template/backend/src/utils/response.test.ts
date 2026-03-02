import { Hono } from "hono";
import { describe, expect, it } from "bun:test";
import { error, success } from "./response";

function createTestApp() {
  const app = new Hono();
  app.get("/success", (c) => success(c, { message: "hello" }));
  app.get("/success-201", (c) => success(c, { id: "123" }, 201));
  app.get("/error", (c) => error(c, "TEST_ERROR", "Something went wrong"));
  app.get("/error-404", (c) => error(c, "NOT_FOUND", "Resource not found", 404));
  return app;
}

describe("success()", () => {
  const app = createTestApp();

  it("returns { success: true, data: T } with status 200", async () => {
    const res = await app.request("/success");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ success: true, data: { message: "hello" } });
  });

  it("returns custom status code", async () => {
    const res = await app.request("/success-201");
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toEqual({ success: true, data: { id: "123" } });
  });
});

describe("error()", () => {
  const app = createTestApp();

  it("returns { success: false, error: { code, message } } with status 400", async () => {
    const res = await app.request("/error");
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({
      success: false,
      error: { code: "TEST_ERROR", message: "Something went wrong" },
    });
  });

  it("returns custom status code", async () => {
    const res = await app.request("/error-404");
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toEqual({
      success: false,
      error: { code: "NOT_FOUND", message: "Resource not found" },
    });
  });
});

import { defineConfig } from "drizzle-kit";

// drizzle-kit runs as a standalone CLI tool (not inside the app),
// so it reads process.env directly instead of the Zod-parsed env module.
export default defineConfig({
  schema: "./src/db/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});

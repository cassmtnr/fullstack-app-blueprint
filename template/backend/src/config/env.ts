import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  ENCRYPTION_KEY: z.string().length(64, "Must be exactly 64 hex characters (32 bytes for AES-256-GCM)"),
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  APPLE_BUNDLE_ID: z.string().min(1),
  JWT_ACCESS_EXPIRES_IN: z.string().regex(/^\d+[smhd]$/, 'Must match <number><s|m|h|d> (e.g. "15m")').default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().regex(/^\d+[smhd]$/, 'Must match <number><s|m|h|d> (e.g. "30d")').default("30d"),
  CORS_ORIGIN: z.string().default("*"),
});

export const env = envSchema.parse(process.env);

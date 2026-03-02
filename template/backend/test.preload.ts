// Use ??= so CI env vars (set in workflow) take precedence over these defaults.
// Default password "postgres" below must match your POSTGRES_PASSWORD in .env.
// Override by setting DATABASE_URL before running tests.
process.env.DATABASE_URL ??= "postgresql://{{DB_NAME}}:postgres@localhost:{{DB_PORT}}/{{DB_NAME}}_test";
process.env.JWT_SECRET ??= "test-jwt-secret-that-is-at-least-32-characters-long";
process.env.ENCRYPTION_KEY ??=
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
process.env.NODE_ENV ??= "test";
process.env.APPLE_BUNDLE_ID ??= "com.test.app";

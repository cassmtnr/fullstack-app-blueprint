# BLUEPRINT — iOS + Backend Monorepo Standard

A reusable template for bootstrapping and maintaining iOS (SwiftUI) + backend (Bun/Hono/Drizzle) monorepo projects. This document is self-contained: a developer reading only this file can scaffold a new project from scratch.

> **For AI agents (Claude Code, etc.):** When asked to scaffold a new project using this document, create every file listed in **Section 7 (File Templates)** and follow the **Scaffolding Order** within that section. Replace all `{{PLACEHOLDER}}` variables (listed in Section 1) with the values provided by the user. If placeholder values aren't provided, ask for them before starting. After creating files, run the setup commands in the scaffolding order (install deps, push schema, generate Xcode project). The project should compile and run after scaffolding is complete.

---

## 1. Overview

### Purpose

This standard defines the architecture, conventions, and boilerplate for every iOS + backend monorepo. It combines the best patterns from prior projects covering mature networking layers, production-grade backends, modern Swift 6.2, `@Observable`, MVVM+DI, and design systems.

### Monorepo Structure

```
{{REPO_NAME}}/
├── app/                          # iOS app (SwiftUI, XcodeGen)
│   ├── project.yml               # XcodeGen spec (generates .xcodeproj)
│   ├── Sources/
│   │   ├── Info.plist            # Minimal Info.plist
│   │   ├── {{PROJECT_NAME}}.entitlements  # Apple Sign-In + iCloud KVS
│   │   ├── App/
│   │   │   ├── {{PROJECT_NAME}}App.swift  # @main entry point
│   │   │   └── ContentView.swift          # Auth gate
│   │   ├── Views/
│   │   │   ├── Auth/
│   │   │   │   └── OnboardingView.swift   # Sign in with Apple
│   │   │   ├── Tab/
│   │   │   │   └── MainTabView.swift      # Tab bar + SettingsView
│   │   │   └── Components/               # Reusable view components
│   │   ├── ViewModels/
│   │   │   ├── StatusViewModel.swift
│   │   │   └── AuthViewModel.swift
│   │   ├── Services/
│   │   │   ├── APIClient.swift            # Actor-based with auto 401 retry
│   │   │   ├── APIEndpoint.swift          # Typed endpoint enum
│   │   │   ├── KeychainManager.swift      # Keychain token storage
│   │   │   └── AuthManager.swift          # Auth state management
│   │   ├── Models/                        # Data types, API response models
│   │   ├── Design/                        # Theme, Typography, Spacing
│   │   └── Extensions/                    # Swift extensions
│   └── {{PROJECT_NAME}}Tests/
│       └── {{PROJECT_NAME}}Tests.swift   # Swift Testing unit tests
├── backend/                      # API server (Bun, Hono, Drizzle)
│   ├── src/
│   │   ├── config/
│   │   │   ├── env.ts            # Zod env schema + parse
│   │   │   └── index.ts
│   │   ├── db/
│   │   │   ├── client.ts         # Drizzle + postgres client
│   │   │   ├── schema/
│   │   │   │   ├── users.ts
│   │   │   │   ├── refresh-tokens.ts
│   │   │   │   └── index.ts      # Barrel export
│   │   │   └── index.ts
│   │   ├── middleware/
│   │   │   ├── error-handler.ts  # Global error catching
│   │   │   ├── auth.ts           # JWT verification
│   │   │   └── index.ts
│   │   ├── routes/
│   │   │   ├── status.ts         # GET /status with DB ping
│   │   │   ├── auth.ts           # Apple auth + token management
│   │   │   └── auth.test.ts
│   │   ├── services/
│   │   │   └── auth.ts           # Apple verification, token issuance
│   │   ├── utils/
│   │   │   ├── errors.ts
│   │   │   ├── response.ts
│   │   │   ├── response.test.ts
│   │   │   ├── crypto.ts
│   │   │   └── index.ts
│   │   ├── index.ts              # App entry point
│   │   └── index.test.ts
│   ├── package.json
│   ├── tsconfig.json
│   ├── biome.json
│   ├── drizzle.config.ts
│   ├── bunfig.toml
│   ├── test.preload.ts
│   └── Dockerfile
├── scripts/                      # Deployment scripts
├── .github/workflows/            # CI/CD
├── docker-compose.yml
├── .env.example
├── .gitignore
└── README.md
```

### Placeholder Variables

Every template uses these placeholders. Replace them when scaffolding a new project:

| Placeholder        | Description                                       | Example                      |
| ------------------ | ------------------------------------------------- | ---------------------------- |
| `{{PROJECT_NAME}}` | PascalCase project name (used in Swift, XcodeGen) | `NightOwl`                 |
| `{{BUNDLE_ID}}`    | Reverse-domain bundle identifier                  | `com.example.nightowl`     |
| `{{DB_NAME}}`      | Lowercase database name                           | `nightowl`                 |
| `{{BACKEND_PORT}}` | Host port exposed for the API                     | `4000`                       |
| `{{DB_PORT}}`      | Host port exposed for PostgreSQL                  | `5433`                       |
| `{{TEAM_ID}}`      | Apple Developer Team ID                           | `A1B2C3D4E5`                 |
| `{{API_DOMAIN}}`   | Production API domain                             | `api.nightowl.example.com` |
| `{{REPO_NAME}}`    | kebab-case repo name (for deploy paths)           | `night-owl`                |
| `{{VPS_HOME_USER}}`| VPS user that owns the app directory              | `sudoUser`                       |
| `{{VPS_DEPLOYER_USER}}` | VPS user with deploy-only permissions (git pull, restart) | `deployerUser`          |

> **`VPS_HOME_USER` vs `VPS_DEPLOYER_USER`**: The home user owns the app files under `/home/<user>/apps/`. The deployer user is a restricted account that only has the permissions needed for deployment — an SSH key for `git pull` and access to run `docker compose`. It cannot modify system config, install packages, or access other users' data. The deploy script runs as the deployer but operates on files in the home user's directory.

---

## 2. Tech Stack

### iOS

- **Target**: iOS 26+
- **Language**: Swift 6.2 with default MainActor isolation (`SWIFT_DEFAULT_ACTOR_ISOLATION: MainActor`)
- **IDE**: Xcode 26
- **Project generator**: XcodeGen (`project.yml` is the source of truth)
- **UI**: SwiftUI with `@Observable` macro + Liquid Glass design language
- **Architecture**: MVVM with dedicated ViewModel files and init injection
- **Networking**: `actor`-based `APIClient` with typed `APIEndpoint` enum
- **Response decoding**: `APIResponse<T>` generic wrapper matching backend envelope
- **Auth tokens**: Keychain (Security framework)
- **Cross-device preferences**: `NSUbiquitousKeyValueStore` (iCloud key-value)
- **Design system**: `Theme` (semantic system colors), `Typography`, `Spacing` token structs

### Backend

- **Runtime**: Bun
- **Framework**: Hono
- **ORM**: Drizzle ORM (PostgreSQL 17)
- **Validation**: Zod + `@hono/zod-validator`
- **Testing**: Bun test runner (built-in, dedicated test DB)
- **Linter/Formatter**: Biome
- **Auth**: Apple Sign-In only, JWT via `jose`
- **Encryption**: AES-256-GCM via `crypto.ts`
- **IDs**: UUID (`gen_random_uuid()` in PostgreSQL, `UUID()` in Swift)

### Deployment

- **Containerization**: Docker (multi-stage build with `bun build --compile`)
- **CI/CD**: GitHub Actions (lint → typecheck → test → version-bump → deploy)
- **Hosting**: VPS via SSH deploy

---

## 3. iOS Architecture Rules

### Concurrency (Swift 6.2)

- Default MainActor isolation is enabled via `SWIFT_DEFAULT_ACTOR_ISOLATION: MainActor` build setting. All declarations are `@MainActor` unless explicitly `nonisolated` or assigned to a different actor.
- Do NOT add explicit `@MainActor` annotations — it is redundant with the default isolation setting.
- Use `@concurrent` on functions that must run on a background thread. `@concurrent` implies `nonisolated`.
- `nonisolated async` functions inherit the caller's actor by default (SE-0461). Use `@concurrent` when you explicitly need background execution.

### State Management

- Use `@Observable` macro exclusively. Never use `ObservableObject` + `@Published` + `@StateObject`.
- Views use `@State` for local state and accept `@Observable` objects via init.

### MVVM Pattern

- Every non-trivial view gets a dedicated ViewModel file in `ViewModels/`.
- ViewModels are `@Observable final class` with init-injected dependencies. They are `@MainActor` by default (via the build setting) — do NOT annotate them explicitly.
- Default parameter values allow convenient initialization: `init(apiClient: APIClient = .shared)`.

### Networking

- `APIClient` is an `actor` (its own isolation domain, separate from the default MainActor) so network calls don't block the main thread. `AuthManager` is MainActor-isolated by default (via the build setting) because it drives UI state (`isAuthenticated`). Swift handles cross-actor calls automatically via `await`.
- `APIEndpoint` enum provides type-safe routing with `.path`, `.method`, `.requiresAuth`, `.body` properties.
- All responses decode through `APIResponse<T>` matching the backend's `{ success, data/error }` envelope.
- JSON wire format is camelCase (matching JavaScript's native format). No key conversion strategies on encoder/decoder.
- `EnvironmentConfig` struct provides dev/prod API base URLs via `#if DEBUG`.

### Design System (Liquid Glass)

- `Theme` struct with semantic system colors for backgrounds (`Color(.systemBackground)`) — adapts to Liquid Glass and dark mode automatically.
- Accent colors remain custom hex values for brand identity. Text uses semantic system colors (`Color(.label)` etc.).
- Navigation bars, tab bars, toolbars, and sheets automatically use Liquid Glass — do NOT override their backgrounds.
- Apply `.glassEffect()` only to navigation-layer elements (floating action buttons, overlay controls). Never to content views.
- Use `.scrollContentBackground(.hidden)` on Forms/Lists inside sheets to let glass show through.
- `Typography` struct with static `Font` properties.
- `Spacing` struct with static `CGFloat` constants (`xs`, `sm`, `md`, `lg`, `xl`, `xxl`).

### Folder Structure

```
Sources/
├── Info.plist
├── {{PROJECT_NAME}}.entitlements
├── App/                    # @main App struct, ContentView (auth gate)
├── Views/
│   ├── Auth/               # OnboardingView (Sign in with Apple)
│   ├── Tab/                # MainTabView + tab placeholder views
│   └── Components/         # Reusable view components
├── ViewModels/             # @Observable ViewModel files
├── Services/               # APIClient, APIEndpoint, KeychainManager, AuthManager
├── Models/                 # APIResponse, data models
├── Design/                 # Theme, Typography, Spacing
└── Extensions/             # Color+Hex, etc.
```

---

## 4. Backend Architecture Rules

### Environment Validation

- Zod schema validates all env vars at startup. Missing or invalid vars cause an immediate crash with a clear error message.

### API Response Envelope

Every endpoint returns one of:

```typescript
// Success
{ success: true, data: T }

// Error
{ success: false, error: { code: string, message: string } }
```

Use `success()` and `error()` helper functions from `src/utils/response.ts`. Never return raw objects.

### API Versioning

All routes are mounted under `/api/v1`. A separate `/health` endpoint lives outside the versioned prefix for load balancers.

### Request Validation

Use Zod schemas with `@hono/zod-validator` middleware on every route that accepts a body. Always pass `zodHook` as the third argument so validation errors use the standard error envelope:

```typescript
routes.post(
  '/',
  authMiddleware,
  zValidator('json', schema, zodHook),
  async (c) => {
    const data = c.req.valid('json');
    return success(c, result, 201);
  },
);
```

### Error Handling

- `AppError` base class with `code`, `message`, `statusCode` constructor.
- Convenience subclasses: `NotFoundError`, `UnauthorizedError`, `ValidationError`.
- Centralized `ErrorCodes` catalog (project extends as needed).
- Global middleware catches `AppError` and `ZodError`, returns the standard envelope.

### Status Endpoint

`GET /api/v1/status` pings the database with `SELECT 1` and reports connectivity. Returns 503 if the database is unreachable.

### Auth Endpoints

- `POST /api/v1/auth/apple` — Verify Apple identity token, create/find user, issue JWT
- `POST /api/v1/auth/refresh` — Exchange refresh token for new token pair
- `GET /api/v1/auth/me` — Get current user profile (requires auth)
- `POST /api/v1/auth/logout` — Revoke refresh token (requires auth)

### Middleware Stack

Applied globally in order: `hono/logger` → `hono/cors` → `errorHandler()`.

Per-route: `authMiddleware` — extracts Bearer token, verifies JWT, sets `userId` on context.

> **Why `errorHandler()` with parens but `authMiddleware` without?** `errorHandler()` is a factory function that _returns_ a middleware — called once at startup via `app.use("*", errorHandler())`. `authMiddleware` is a direct middleware function applied per-route: `routes.get("/me", authMiddleware, handler)`.

### Barrel Exports

Every module directory has an `index.ts` that re-exports its public API:

- `src/config/index.ts` → `env`
- `src/db/index.ts` → `db`
- `src/middleware/index.ts` → `errorHandler`, `authMiddleware`
- `src/utils/index.ts` → `success`, `error`, `AppError`, `ErrorCodes`, `encrypt`, `decrypt`, etc.

### Folder Structure

```
src/
├── config/
│   ├── env.ts              # Zod env schema + parse
│   └── index.ts
├── db/
│   ├── client.ts           # Drizzle + postgres client
│   ├── schema/
│   │   ├── users.ts
│   │   ├── refresh-tokens.ts
│   │   └── index.ts        # Barrel export for all table schemas
│   └── index.ts
├── middleware/
│   ├── error-handler.ts    # Global error catching middleware
│   ├── auth.ts             # JWT verification middleware
│   └── index.ts
├── routes/
│   ├── status.ts           # GET /status with DB ping
│   ├── auth.ts             # Auth endpoints (apple, refresh, me, logout)
│   └── auth.test.ts
├── services/
│   └── auth.ts             # Apple verification, user management, token issuance
├── utils/
│   ├── errors.ts           # AppError, subclasses, ErrorCodes
│   ├── response.ts         # success() / error() helpers
│   ├── crypto.ts           # AES-256-GCM encrypt/decrypt
│   └── index.ts
├── index.ts                # App entry point
└── index.test.ts           # Endpoint tests
```

---

## 5. Testing Conventions

### Backend

- **Runner**: `bun test` (built-in — `describe`/`it`/`expect` are globals, import `mock` from `bun:test` when needed).
- **Database**: Dedicated `{{DB_NAME}}_test` database. `test.preload.ts` sets test env vars.
- **Pattern**: Test Hono routes via `app.request()` — no HTTP server needed.
- **Coverage**: `bun test --coverage`.
- **Location**: Co-located `.test.ts` files next to source (e.g., `response.test.ts` next to `response.ts`).

### iOS

- **Runner**: Swift Testing framework (`import Testing`).
- **Annotations**: `@Suite` for test groups, `@Test` for individual tests.
- **Assertions**: `#expect()` macro for expectations.
- **Testability**: ViewModels are testable via init injection — pass mock dependencies in tests.

```swift
import Testing
@testable import {{PROJECT_NAME}}

@Suite("StatusViewModel")
struct StatusViewModelTests {
    @Test func checkStatusUpdatesState() async {
        let vm = await StatusViewModel()
        await vm.checkStatus()
        #expect(await vm.isChecking == false)
    }
}
```

### CI Pipeline Order

`lint` → `typecheck` → `test` → `version-bump` → `deploy`

Lint and typecheck run in parallel. Test requires a PostgreSQL service. Version-bump and deploy only run on `main` branch pushes.

---

## 6. Deployment Conventions

### Port Allocation

Each project assigns its own `{{BACKEND_PORT}}` (host-mapped) and `{{DB_PORT}}` (host-mapped). The internal container ports are always 3000 (backend) and 5432 (PostgreSQL).

### Docker

- Multi-stage build: install deps → compile binary with `bun build --compile` → slim runtime image.
- `HEALTHCHECK` directive pings `/api/v1/status` every 30s.
- Backend depends on `db` service with `condition: service_healthy`.

### GitHub Actions

- Trigger: pushes and PRs to `main` that touch `backend/**` or `docker-compose.yml`.
- Test job spins up a `postgres:17-alpine` service container.
- Version-bump uses `npm version patch` and pushes a commit.
- Deploy uses `appleboy/ssh-action` to SSH into the VPS.

### VPS Deploy Script Pattern

```
git pull → docker compose build backend → docker compose up -d backend → sleep 5 → curl healthcheck
```

---

## 7. File Templates

Every template below is copy-pasteable. Replace `{{PLACEHOLDER}}` variables documented in Section 1.

### Prerequisites

Install these before scaffolding:

- **Bun** — JavaScript runtime (`curl -fsSL https://bun.sh/install | bash`)
- **PostgreSQL 17** — database server (via Docker or native install)
- **XcodeGen** — generates .xcodeproj from project.yml (`brew install xcodegen`)
- **Xcode 26** — iOS IDE (Mac App Store)
- **Docker** — containerization (for deployment and optionally local PostgreSQL)

### Scaffolding Order

1. Create the repo directory: `mkdir {{REPO_NAME}} && cd {{REPO_NAME}}`
2. Copy root files: `docker-compose.yml`, `.env.example`, `.gitignore`, `README.md`
3. Copy `.env.example` to `.env` and fill in real values (see secret generation comments in the file)
4. Start PostgreSQL: `docker compose up db -d` (or use a local install)
5. Create `backend/` — copy all config files (`package.json`, `tsconfig.json`, `biome.json`, `drizzle.config.ts`, `bunfig.toml`, `test.preload.ts`, `Dockerfile`, `.env.example`), then copy the `src/` tree
6. `cd backend && bun install`
7. Copy `backend/.env.example` to `backend/.env` and fill in values
8. Create the test database:
   - Docker: `docker compose exec db createdb -U {{DB_NAME}} {{DB_NAME}}_test`
   - Native install: `createdb -U {{DB_NAME}} {{DB_NAME}}_test`
9. Apply schema to both databases:
   - Main DB: `bun run db:push`
   - Test DB: `DATABASE_URL="postgresql://{{DB_NAME}}:YOUR_PASSWORD@localhost:{{DB_PORT}}/{{DB_NAME}}_test" bun run db:push`
     (Replace `YOUR_PASSWORD` with the `POSTGRES_PASSWORD` value from your `.env`)
10. Run tests to verify: `bun run test`
11. Start the backend: `bun run dev` — should be running on port 3000
12. Create `app/` — copy `project.yml`, then all `Sources/` files and `{{PROJECT_NAME}}Tests/` directory
13. Generate the Xcode project: `cd app && xcodegen generate`
14. Open and run: `open {{PROJECT_NAME}}.xcodeproj` — build and run in simulator

---

### Root: `docker-compose.yml`

```yaml
services:
  db:
    image: postgres:17-alpine
    restart: unless-stopped
    volumes:
      - pgdata:/var/lib/postgresql/data
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-{{DB_NAME}}}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?Set POSTGRES_PASSWORD in .env}
      POSTGRES_DB: ${POSTGRES_DB:-{{DB_NAME}}}
    ports:
      - '127.0.0.1:{{DB_PORT}}:5432'
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U ${POSTGRES_USER:-{{DB_NAME}}}']
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    restart: unless-stopped
    depends_on:
      db:
        condition: service_healthy
    ports:
      - '${BACKEND_PORT:-{{BACKEND_PORT}}}:3000'
    environment:
      DATABASE_URL: postgresql://${POSTGRES_USER:-{{DB_NAME}}}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB:-{{DB_NAME}}}
      JWT_SECRET: ${JWT_SECRET:?Set JWT_SECRET in .env}
      ENCRYPTION_KEY: ${ENCRYPTION_KEY:?Set ENCRYPTION_KEY in .env}
      PORT: '3000'
      NODE_ENV: production
      APPLE_BUNDLE_ID: ${APPLE_BUNDLE_ID:-{{BUNDLE_ID}}}
    healthcheck:
      test:
        [
          'CMD',
          'bun',
          '-e',
          "fetch('http://localhost:3000/api/v1/status').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))",
        ]
      interval: 30s
      timeout: 5s
      start_period: 10s
      retries: 3

volumes:
  pgdata:
```

---

### Root: `.env.example`

```bash
# =========================================
# {{PROJECT_NAME}} — Docker Compose Environment
# =========================================
# Used by: docker compose up (NOT by 'bun run dev' — see backend/.env.example for that)
# Copy this file to .env and fill in real values.

# ---- PostgreSQL ----
POSTGRES_USER={{DB_NAME}}
POSTGRES_PASSWORD=            # REQUIRED — choose a strong password
POSTGRES_DB={{DB_NAME}}

# ---- Backend ----
JWT_SECRET=                   # REQUIRED — at least 32 characters. Generate: openssl rand -base64 32
ENCRYPTION_KEY=               # REQUIRED — exactly 64 hex characters. Generate: openssl rand -hex 32
BACKEND_PORT={{BACKEND_PORT}}

# ---- Apple Sign-In ----
APPLE_BUNDLE_ID={{BUNDLE_ID}}

# ---- CORS (optional — defaults to "*") ----
# CORS_ORIGIN=*                # Set to your frontend origin in production (e.g., https://your-domain.com)

# ---- JWT Expiry (optional — defaults shown) ----
# JWT_ACCESS_EXPIRES_IN=15m
# JWT_REFRESH_EXPIRES_IN=30d
```

---

### Root: `.gitignore`

```gitignore
# Dependencies
node_modules/

# Build output
dist/
server

# Xcode (generated by XcodeGen)
*.xcodeproj
*.xcworkspace
DerivedData/
build/
*.pbxuser
!default.pbxuser
*.mode1v3
!default.mode1v3
*.mode2v3
!default.mode2v3
*.perspectivev3
!default.perspectivev3
xcuserdata/
*.moved-aside
*.hmap
*.ipa
*.dSYM.zip
*.dSYM

# Environment
.env
.env.local
.env.*.local

# IDE
.idea/
.vscode/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Drizzle migrations
drizzle/

# Coverage
coverage/
```

---

### Root: `README.md`

````markdown
# {{PROJECT_NAME}}

iOS app + backend monorepo.

## Structure

- `app/` — iOS app (SwiftUI, XcodeGen)
- `backend/` — API server (Bun, Hono, Drizzle, PostgreSQL)
- `scripts/` — Deployment scripts
- `.github/` — CI/CD workflows

## Setup

### Backend

```bash
cd backend
cp .env.example .env    # Fill in required values
bun install
bun run db:push
bun run dev
```

### iOS

```bash
cd app
xcodegen generate
open {{PROJECT_NAME}}.xcodeproj
```

## Development

| Command             | Description                   |
| ------------------- | ----------------------------- |
| `bun run dev`       | Start backend with hot reload |
| `bun run test`      | Run backend tests             |
| `bun run lint`      | Lint backend code             |
| `bun run typecheck` | Type-check backend            |
| `bun run db:push`   | Apply schema to database      |
| `bun run db:studio` | Open Drizzle Studio           |
````

---

### Backend: `backend/package.json`

```json
{
  "name": "{{DB_NAME}}-backend",
  "version": "0.1.0",
  "module": "src/index.ts",
  "type": "module",
  "private": true,
  "scripts": {
    "dev": "bun run --watch src/index.ts",
    "start": "bun run src/index.ts",
    "build": "bun build src/index.ts --outdir dist --target bun",
    "test": "bun test",
    "test:watch": "bun test --watch",
    "typecheck": "tsc --noEmit",
    "lint": "biome check src/",
    "lint:fix": "biome check --write src/",
    "db:generate": "drizzle-kit generate",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio"
  },
  "dependencies": {
    "@hono/zod-validator": "^0.7.6",
    "drizzle-orm": "^0.45.1",
    "hono": "^4.12.3",
    "jose": "^6.1.3",
    "postgres": "^3.4.8",
    "zod": "^3.24.0"
  },
  "devDependencies": {
    "@biomejs/biome": "^1.9.0",
    "@types/bun": "latest",
    "drizzle-kit": "^0.31.9",
    "typescript": "^5.9.0"
  }
}
```

---

### Backend: `backend/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "types": ["bun-types"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

---

### Backend: `backend/biome.json`

```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.0/schema.json",
  "organizeImports": { "enabled": true },
  "linter": {
    "enabled": true,
    "rules": { "recommended": true }
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  }
}
```

---

### Backend: `backend/drizzle.config.ts`

```typescript
import { defineConfig } from 'drizzle-kit';

// drizzle-kit runs as a standalone CLI tool (not inside the app),
// so it reads process.env directly instead of the Zod-parsed env module.
export default defineConfig({
  schema: './src/db/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

---

### Backend: `backend/bunfig.toml`

```toml
[test]
preload = ["./test.preload.ts"]
```

---

### Backend: `backend/test.preload.ts`

```typescript
// Use ??= so CI env vars (set in workflow) take precedence over these defaults.
// Default password "postgres" below must match your POSTGRES_PASSWORD in .env.
// Override by setting DATABASE_URL before running tests.
process.env.DATABASE_URL ??=
  'postgresql://{{DB_NAME}}:postgres@localhost:{{DB_PORT}}/{{DB_NAME}}_test';
process.env.JWT_SECRET ??=
  'test-jwt-secret-that-is-at-least-32-characters-long';
process.env.ENCRYPTION_KEY ??=
  '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
process.env.NODE_ENV ??= 'test';
process.env.APPLE_BUNDLE_ID ??= 'com.test.app';
```

---

### Backend: `backend/Dockerfile`

```dockerfile
# ---- Build stage ----
FROM oven/bun:1 AS build
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY tsconfig.json drizzle.config.ts ./
COPY src/ src/

RUN bun build src/index.ts --compile --outfile server

# ---- Runtime stage ----
FROM oven/bun:1-slim
WORKDIR /app

COPY --from=build /app/server .
COPY --from=build /app/node_modules node_modules
COPY --from=build /app/package.json .
COPY --from=build /app/drizzle.config.ts .
COPY --from=build /app/src src

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD bun -e "fetch('http://localhost:3000/api/v1/status').then(r => { if (!r.ok) process.exit(1) }).catch(() => process.exit(1))"

CMD ["./server"]
```

---

### Backend: `backend/.env.example`

```bash
# Local development environment — used by 'bun run dev' (NOT by Docker — see root .env.example for that)

# Required
DATABASE_URL=postgresql://{{DB_NAME}}:YOUR_PASSWORD@localhost:{{DB_PORT}}/{{DB_NAME}}
JWT_SECRET=change-me-to-a-random-string-at-least-32-chars    # Generate: openssl rand -base64 32
ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef  # Generate: openssl rand -hex 32
APPLE_BUNDLE_ID={{BUNDLE_ID}}

# Optional
PORT=3000
NODE_ENV=development

# CORS (optional — defaults to "*")
# CORS_ORIGIN=*               # Set to your frontend origin in production (e.g., https://your-domain.com)

# JWT Expiry (optional — defaults shown)
# JWT_ACCESS_EXPIRES_IN=15m
# JWT_REFRESH_EXPIRES_IN=30d
```

---

### Backend: `backend/src/config/env.ts`

```typescript
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  ENCRYPTION_KEY: z
    .string()
    .length(64, 'Must be exactly 64 hex characters (32 bytes for AES-256-GCM)'),
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  APPLE_BUNDLE_ID: z.string().min(1),
  JWT_ACCESS_EXPIRES_IN: z
    .string()
    .regex(/^\d+[smhd]$/, 'Must match <number><s|m|h|d> (e.g. "15m")')
    .default('15m'),
  JWT_REFRESH_EXPIRES_IN: z
    .string()
    .regex(/^\d+[smhd]$/, 'Must match <number><s|m|h|d> (e.g. "30d")')
    .default('30d'),
  CORS_ORIGIN: z.string().default('*'),
});

export const env = envSchema.parse(process.env);
```

---

### Backend: `backend/src/config/index.ts`

```typescript
export { env } from './env';
```

---

### Backend: `backend/src/db/client.ts`

```typescript
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '../config';
import * as schema from './schema';

const client = postgres(env.DATABASE_URL);
export const db = drizzle(client, { schema });
```

---

### Backend: `backend/src/db/index.ts`

```typescript
export { db } from './client';
```

---

### Backend: `backend/src/db/schema/users.ts`

```typescript
import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  appleUserId: text('apple_user_id').notNull().unique(),
  email: text('email'),
  fullName: text('full_name'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});
```

---

### Backend: `backend/src/db/schema/refresh-tokens.ts`

```typescript
import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';
import { users } from './users';

export const refreshTokens = pgTable('refresh_tokens', {
  id: uuid('id').defaultRandom().primaryKey(),
  token: text('token').notNull().unique(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
});
```

---

### Backend: `backend/src/db/schema/index.ts`

```typescript
export * from './users';
export * from './refresh-tokens';
```

---

### Backend: `backend/src/middleware/error-handler.ts`

```typescript
import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { AppError } from '../utils/errors';
import { error } from '../utils/response';

export function errorHandler(err: Error, c: Context) {
  if (err instanceof AppError) {
    return error(
      c,
      err.code,
      err.message,
      err.statusCode as ContentfulStatusCode,
    );
  }
  if (err.name === 'ZodError') {
    const zodErr = err as Error & { issues: Array<{ message: string }> };
    return error(
      c,
      'VALIDATION_ERROR',
      zodErr.issues[0]?.message || 'Validation failed',
      400,
    );
  }
  console.error('Unhandled error:', err);
  return error(c, 'INTERNAL_ERROR', 'Internal server error', 500);
}
```

---

### Backend: `backend/src/middleware/auth.ts`

```typescript
import type { Context, Next } from 'hono';
import { jwtVerify } from 'jose';
import { env } from '../config';
import { UnauthorizedError } from '../utils/errors';

export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing or invalid authorization header');
  }

  const token = authHeader.slice(7);
  try {
    const secret = new TextEncoder().encode(env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    if (typeof payload.sub !== 'string') {
      throw new UnauthorizedError('Token missing subject claim');
    }
    c.set('userId', payload.sub);
  } catch (err) {
    if (err instanceof UnauthorizedError) throw err;
    throw new UnauthorizedError('Invalid or expired token');
  }

  await next();
}
```

---

### Backend: `backend/src/middleware/index.ts`

```typescript
export { errorHandler } from './error-handler';
export { authMiddleware } from './auth';
```

---

### Backend: `backend/src/utils/errors.ts`

```typescript
export class AppError extends Error {
  constructor(
    public code: string,
    public override message: string,
    public statusCode = 400,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super('NOT_FOUND', `${resource} not found`, 404);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super('UNAUTHORIZED', message, 401);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super('VALIDATION_ERROR', message, 400);
  }
}

export const ErrorCodes = {
  // Auth
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  UNAUTHORIZED: 'UNAUTHORIZED',

  // General
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  RATE_LIMITED: 'RATE_LIMITED',
  DATABASE_UNAVAILABLE: 'DATABASE_UNAVAILABLE',
} as const;
```

---

### Backend: `backend/src/utils/response.ts`

```typescript
import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

export function success<T>(
  c: Context,
  data: T,
  status?: ContentfulStatusCode,
): Response {
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
```

---

### Backend: `backend/src/utils/response.test.ts`

```typescript
import { Hono } from 'hono';
import { describe, expect, it } from 'bun:test';
import { error, success } from './response';

function createTestApp() {
  const app = new Hono();
  app.get('/success', (c) => success(c, { message: 'hello' }));
  app.get('/success-201', (c) => success(c, { id: '123' }, 201));
  app.get('/error', (c) => error(c, 'TEST_ERROR', 'Something went wrong'));
  app.get('/error-404', (c) =>
    error(c, 'NOT_FOUND', 'Resource not found', 404),
  );
  return app;
}

describe('success()', () => {
  const app = createTestApp();

  it('returns { success: true, data: T } with status 200', async () => {
    const res = await app.request('/success');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ success: true, data: { message: 'hello' } });
  });

  it('returns custom status code', async () => {
    const res = await app.request('/success-201');
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toEqual({ success: true, data: { id: '123' } });
  });
});

describe('error()', () => {
  const app = createTestApp();

  it('returns { success: false, error: { code, message } } with status 400', async () => {
    const res = await app.request('/error');
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({
      success: false,
      error: { code: 'TEST_ERROR', message: 'Something went wrong' },
    });
  });

  it('returns custom status code', async () => {
    const res = await app.request('/error-404');
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toEqual({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Resource not found' },
    });
  });
});
```

---

### Backend: `backend/src/utils/crypto.ts`

```typescript
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

export function encrypt(text: string, key: string): string {
  const keyBuffer = Buffer.from(key, 'hex');
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', keyBuffer, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

export function decrypt(ciphertext: string, key: string): string {
  const [ivHex, authTagHex, encrypted] = ciphertext.split(':');
  const keyBuffer = Buffer.from(key, 'hex');
  const decipher = createDecipheriv(
    'aes-256-gcm',
    keyBuffer,
    Buffer.from(ivHex, 'hex'),
  );
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
```

---

### Backend: `backend/src/utils/index.ts`

```typescript
export {
  AppError,
  ErrorCodes,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from './errors';
export { error, success } from './response';
export { decrypt, encrypt } from './crypto';
```

---

### Backend: `backend/src/services/auth.ts`

```typescript
import { SignJWT, jwtVerify, createRemoteJWKSet } from 'jose';
import { eq, and, isNull, gt } from 'drizzle-orm';
import { db } from '../db';
import { users, refreshTokens as refreshTokensTable } from '../db/schema';
import { env } from '../config';
import { AppError, UnauthorizedError } from '../utils/errors';

// Apple JWKS endpoint (public keys for verifying identity tokens)
const APPLE_JWKS = createRemoteJWKSet(
  new URL('https://appleid.apple.com/auth/keys'),
);

export async function verifyAppleIdentityToken(
  identityToken: string,
): Promise<{ sub: string; email?: string }> {
  try {
    const { payload } = await jwtVerify(identityToken, APPLE_JWKS, {
      issuer: 'https://appleid.apple.com',
      audience: env.APPLE_BUNDLE_ID,
    });
    return {
      sub: payload.sub as string,
      email: payload.email as string | undefined,
    };
  } catch {
    throw new AppError(
      'INVALID_CREDENTIALS',
      'Invalid Apple identity token',
      401,
    );
  }
}

export async function createOrFindUser(
  appleUserId: string,
  email?: string,
  fullName?: string,
) {
  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.appleUserId, appleUserId))
    .limit(1);

  if (existing) {
    // Update email/name if provided (Apple only sends these on first sign-in)
    if (email || fullName) {
      const [updated] = await db
        .update(users)
        .set({
          ...(email ? { email } : {}),
          ...(fullName ? { fullName } : {}),
          updatedAt: new Date(),
        })
        .where(eq(users.id, existing.id))
        .returning();
      return updated;
    }
    return existing;
  }

  const [newUser] = await db
    .insert(users)
    .values({
      appleUserId,
      email: email ?? null,
      fullName: fullName ?? null,
    })
    .returning();

  return newUser;
}

function durationToSeconds(duration: string): number {
  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) return 900;
  const [, num, unit] = match;
  const multipliers: Record<string, number> = {
    s: 1,
    m: 60,
    h: 3600,
    d: 86400,
  };
  return parseInt(num) * multipliers[unit];
}

function durationToMs(duration: string): number {
  return durationToSeconds(duration) * 1000;
}

export async function issueTokens(userId: string) {
  const secret = new TextEncoder().encode(env.JWT_SECRET);
  const accessToken = await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(env.JWT_ACCESS_EXPIRES_IN)
    .sign(secret);

  // Refresh token is a random UUID stored in DB
  const refreshToken = crypto.randomUUID();
  await db.insert(refreshTokensTable).values({
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
  const [stored] = await db
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
    throw new UnauthorizedError('Invalid or expired refresh token');
  }

  // Revoke the used refresh token (rotation)
  await db
    .update(refreshTokensTable)
    .set({ revokedAt: new Date() })
    .where(eq(refreshTokensTable.id, stored.id));

  // Issue new token pair
  return issueTokens(stored.userId);
}

export async function revokeRefreshToken(token: string) {
  await db
    .update(refreshTokensTable)
    .set({ revokedAt: new Date() })
    .where(eq(refreshTokensTable.token, token));
}
```

---

### Backend: `backend/src/routes/status.ts`

```typescript
import { Hono } from 'hono';
import { sql } from 'drizzle-orm';
import packageJson from '../../package.json';
import { env } from '../config';
import { db } from '../db';
import { error, success } from '../utils';

const statusRoutes = new Hono();

statusRoutes.get('/', async (c) => {
  try {
    await db.execute(sql`SELECT 1`);
  } catch {
    return error(c, 'DATABASE_UNAVAILABLE', 'Database connection failed', 503);
  }

  return success(c, {
    status: 'ok',
    version: packageJson.version,
    environment: env.NODE_ENV,
    database: 'connected',
    timestamp: new Date().toISOString(),
  });
});

export { statusRoutes };
```

---

### Backend: `backend/src/routes/auth.ts`

```typescript
import type { Context } from 'hono';
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { users } from '../db/schema';
import { authMiddleware } from '../middleware/auth';
import {
  verifyAppleIdentityToken,
  createOrFindUser,
  issueTokens,
  refreshTokens,
  revokeRefreshToken,
} from '../services/auth';
import { error, success } from '../utils';

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
    return error(
      c,
      'VALIDATION_ERROR',
      result.error!.issues[0]?.message || 'Validation failed',
      400,
    );
  }
}

// POST /auth/apple — Sign in with Apple
const appleAuthSchema = z.object({
  identityToken: z.string().min(1),
  fullName: z.string().optional(),
});

authRoutes.post(
  '/apple',
  zValidator('json', appleAuthSchema, zodHook),
  async (c) => {
    const { identityToken, fullName } = c.req.valid('json');

    const { sub: appleUserId, email } =
      await verifyAppleIdentityToken(identityToken);
    const user = await createOrFindUser(
      appleUserId,
      email,
      fullName ?? undefined,
    );
    const tokens = await issueTokens(user.id);

    return success(
      c,
      {
        user: { id: user.id, email: user.email, fullName: user.fullName },
        ...tokens,
      },
      201,
    );
  },
);

// POST /auth/refresh — Refresh access token
const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

authRoutes.post(
  '/refresh',
  zValidator('json', refreshSchema, zodHook),
  async (c) => {
    const { refreshToken } = c.req.valid('json');
    const tokens = await refreshTokens(refreshToken);
    return success(c, tokens);
  },
);

// GET /auth/me — Get current user
authRoutes.get('/me', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    return error(c, 'NOT_FOUND', 'User not found', 404);
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

authRoutes.post(
  '/logout',
  authMiddleware,
  zValidator('json', logoutSchema, zodHook),
  async (c) => {
    const { refreshToken } = c.req.valid('json');
    await revokeRefreshToken(refreshToken);
    return success(c, { message: 'Logged out successfully' });
  },
);

export { authRoutes };
```

---

### Backend: `backend/src/routes/auth.test.ts`

```typescript
import { describe, expect, it, mock } from 'bun:test';

// Import real jose before applying mock
const realJose = await import('jose');

// Mock jose for Apple Sign-In verification
mock.module('jose', () => ({
  ...realJose,
  createRemoteJWKSet: () => async () => ({}),
  jwtVerify: async (token: string, keyOrSecret: unknown, options?: unknown) => {
    // Apple token verification (options include audience)
    if (options && typeof options === 'object' && 'audience' in options) {
      return {
        payload: { sub: 'apple-test-user-id', email: 'test@example.com' },
      };
    }
    // Our own JWT verification (for authMiddleware) — use real implementation
    return realJose.jwtVerify(
      token,
      keyOrSecret as Parameters<typeof realJose.jwtVerify>[1],
    );
  },
}));

// Import app AFTER mock is set up
const { app } = await import('../index');

describe('POST /api/v1/auth/apple', () => {
  it('creates a new user and returns tokens', async () => {
    const res = await app.request('/api/v1/auth/apple', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identityToken: 'mock-apple-identity-token',
        fullName: 'Test User',
      }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.accessToken).toBeDefined();
    expect(body.data.refreshToken).toBeDefined();
    expect(body.data.expiresIn).toBeTypeOf('number');
    expect(body.data.user.email).toBe('test@example.com');
  });

  it('returns 400 for missing identityToken', async () => {
    const res = await app.request('/api/v1/auth/apple', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(400);
  });
});

describe('POST /api/v1/auth/refresh', () => {
  it('returns 401 for invalid refresh token', async () => {
    const res = await app.request('/api/v1/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: 'invalid-token' }),
    });

    expect(res.status).toBe(401);
  });
});

describe('GET /api/v1/auth/me', () => {
  it('returns 401 without auth header', async () => {
    const res = await app.request('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });
});
```

---

### Backend: `backend/src/index.ts`

```typescript
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import packageJson from '../package.json';
import { env } from './config';
import { errorHandler } from './middleware';
import { statusRoutes } from './routes/status';
import { authRoutes } from './routes/auth';
import { success } from './utils';

const app = new Hono();

// Global error handler
app.onError(errorHandler);

// Global middleware
app.use('*', logger());
app.use('*', cors({ origin: env.CORS_ORIGIN }));

// Health check (outside /api/v1 — used by load balancers)
app.get('/health', (c) =>
  success(c, {
    status: 'ok',
    version: packageJson.version,
    timestamp: new Date().toISOString(),
  }),
);

// API v1
const api = new Hono();
api.route('/status', statusRoutes);
api.route('/auth', authRoutes);

app.route('/api/v1', api);

export { app };

export default {
  port: env.PORT,
  fetch: app.fetch,
};
```

---

### Backend: `backend/src/index.test.ts`

```typescript
import { describe, expect, it } from 'bun:test';
import { app } from './index';

describe('GET /health', () => {
  it('returns { success: true, data: { status: "ok" } }', async () => {
    const res = await app.request('/health');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('ok');
    expect(body.data.version).toMatch(/^\d+\.\d+\.\d+/);
    expect(body.data.timestamp).toBeDefined();
  });
});

describe('GET /api/v1/status', () => {
  it('returns 200 with database connectivity', async () => {
    const res = await app.request('/api/v1/status');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('ok');
    expect(body.data.database).toBe('connected');
    expect(body.data.version).toMatch(/^\d+\.\d+\.\d+/);
    expect(body.data.environment).toBe('test');
    expect(body.data.timestamp).toBeDefined();
  });
});

describe('404 handling', () => {
  it('returns 404 for unknown routes', async () => {
    const res = await app.request('/nonexistent');
    expect(res.status).toBe(404);
  });
});
```

---

### iOS: `app/project.yml`

```yaml
name: {{PROJECT_NAME}}
options:
  deploymentTarget:
    iOS: "26.0"
  xcodeVersion: "26.0"
  createIntermediateGroups: true
  generateEmptyDirectories: true

schemes:
  {{PROJECT_NAME}}:
    build:
      targets:
        {{PROJECT_NAME}}: all
    run:
      config: Debug
    test:
      config: Debug
      targets:
        - {{PROJECT_NAME}}Tests
    profile:
      config: Release
    analyze:
      config: Debug
    archive:
      config: Release

settings:
  base:
    MARKETING_VERSION: "1.0.0"
    CURRENT_PROJECT_VERSION: "1"
    SWIFT_VERSION: "6.2"
    SWIFT_DEFAULT_ACTOR_ISOLATION: MainActor

targets:
  {{PROJECT_NAME}}:
    type: application
    platform: iOS
    sources:
      - path: Sources
        excludes:
          - "**/.DS_Store"
    settings:
      base:
        PRODUCT_BUNDLE_IDENTIFIER: {{BUNDLE_ID}}
        CODE_SIGN_STYLE: Automatic
        CODE_SIGN_IDENTITY: "Apple Development"
        DEVELOPMENT_TEAM: {{TEAM_ID}}
        INFOPLIST_FILE: Sources/Info.plist
        CODE_SIGN_ENTITLEMENTS: Sources/{{PROJECT_NAME}}.entitlements
    entitlements:
      path: Sources/{{PROJECT_NAME}}.entitlements
      properties:
        com.apple.developer.applesignin:
          - Default
        com.apple.developer.ubiquity-kvstore-identifier: $(TeamIdentifierPrefix)$(CFBundleIdentifier)
    dependencies: []

  {{PROJECT_NAME}}Tests:
    type: bundle.unit-test
    platform: iOS
    sources:
      - path: {{PROJECT_NAME}}Tests
        excludes:
          - "**/.DS_Store"
    dependencies:
      - target: {{PROJECT_NAME}}
    settings:
      base:
        PRODUCT_BUNDLE_IDENTIFIER: {{BUNDLE_ID}}.tests
        GENERATE_INFOPLIST_FILE: YES
```

---

### iOS: `app/Sources/Info.plist`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleDevelopmentRegion</key>
    <string>en</string>
    <key>CFBundleDisplayName</key>
    <string>{{PROJECT_NAME}}</string>
    <key>UILaunchScreen</key>
    <dict/>
</dict>
</plist>
```

---

### iOS: `app/Sources/{{PROJECT_NAME}}.entitlements`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>com.apple.developer.applesignin</key>
    <array>
        <string>Default</string>
    </array>
    <key>com.apple.developer.ubiquity-kvstore-identifier</key>
    <string>$(TeamIdentifierPrefix)$(CFBundleIdentifier)</string>
</dict>
</plist>
```

---

### iOS: `app/Sources/App/{{PROJECT_NAME}}App.swift`

```swift
import SwiftUI

@main
struct {{PROJECT_NAME}}App: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}
```

---

### iOS: `app/Sources/App/ContentView.swift`

```swift
import SwiftUI

struct ContentView: View {
    @State private var authManager = AuthManager.shared

    var body: some View {
        Group {
            if authManager.isAuthenticated {
                MainTabView()
            } else {
                OnboardingView()
            }
        }
        .task {
            if authManager.isAuthenticated {
                await authManager.fetchCurrentUser()
            }
        }
    }
}
```

---

### iOS: `app/Sources/Views/Auth/OnboardingView.swift`

```swift
import SwiftUI
import AuthenticationServices

struct OnboardingView: View {
    @State private var viewModel = AuthViewModel()

    var body: some View {
        VStack(spacing: Spacing.xl) {
            Spacer()

            Image(systemName: "app.fill")
                .font(.system(size: 80))
                .foregroundStyle(Theme.accentPrimary)

            Text("Welcome to {{PROJECT_NAME}}")
                .font(Typography.largeTitle)
                .foregroundStyle(Theme.textPrimary)

            Text("Sign in to get started")
                .font(Typography.body)
                .foregroundStyle(Theme.textSecondary)

            Spacer()

            SignInWithAppleButton(.signIn) { request in
                request.requestedScopes = [.fullName, .email]
            } onCompletion: { result in
                Task { await viewModel.handleSignIn(result: result) }
            }
            .signInWithAppleButtonStyle(.black)
            .frame(height: 50)
            .padding(.horizontal, Spacing.xl)

            if let error = viewModel.errorMessage {
                Text(error)
                    .font(Typography.caption)
                    .foregroundStyle(Theme.accentDanger)
            }
        }
        .padding(Spacing.lg)
    }
}
```

---

### iOS: `app/Sources/Views/Tab/MainTabView.swift`

```swift
import SwiftUI

struct MainTabView: View {
    var body: some View {
        TabView {
            Tab("Home", systemImage: "house.fill") {
                NavigationStack {
                    Text("Home")
                        .navigationTitle("Home")
                }
            }
            Tab("Settings", systemImage: "gearshape.fill") {
                SettingsView()
            }
        }
        .tabBarMinimizeBehavior(.onScrollDown)
    }
}

struct SettingsView: View {
    @State private var authManager = AuthManager.shared
    @State private var statusVM = StatusViewModel()

    var body: some View {
        NavigationStack {
            List {
                if let user = authManager.currentUser {
                    Section("Profile") {
                        if let name = user.fullName {
                            LabeledContent("Name", value: name)
                        }
                        if let email = user.email {
                            LabeledContent("Email", value: email)
                        }
                    }
                }

                Section("Backend Status") {
                    HStack(spacing: Spacing.sm) {
                        Image(systemName: "circle.fill")
                            .foregroundStyle(statusVM.isConnected ? .green : .red)
                            .font(.caption)
                        Text(statusVM.isConnected ? "Connected" : "Disconnected")
                            .font(Typography.headline)
                    }
                    if let error = statusVM.errorMessage {
                        Text(error)
                            .font(Typography.caption)
                            .foregroundStyle(.red)
                    }
                    Button("Check Connection") {
                        Task { await statusVM.checkStatus() }
                    }
                    .disabled(statusVM.isChecking)
                }

                Section {
                    Button("Sign Out", role: .destructive) {
                        authManager.signOut()
                    }
                }
            }
            .navigationTitle("Settings")
            .task {
                await statusVM.checkStatus()
            }
        }
    }
}
```

---

### iOS: `app/Sources/Services/APIClient.swift`

```swift
import Foundation

// MARK: - Environment Configuration

nonisolated enum AppEnvironment {
    case development, production

    static var current: AppEnvironment {
        #if DEBUG
        return .development
        #else
        return .production
        #endif
    }
}

nonisolated struct EnvironmentConfig {
    let apiBaseURL: String

    static var current: EnvironmentConfig {
        switch AppEnvironment.current {
        case .development:
            // Simulator: localhost works. Device: replace with your machine's IP or use ngrok.
            return EnvironmentConfig(apiBaseURL: "http://localhost:3000/api/v1")
        case .production:
            return EnvironmentConfig(apiBaseURL: "https://{{API_DOMAIN}}/api/v1")
        }
    }
}

// MARK: - API Errors

nonisolated enum APIError: Error, LocalizedError, Sendable {
    case invalidURL
    case networkError(Error)
    case decodingError(Error)
    case serverError(String)
    case unauthorized
    case unknown

    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid URL"
        case .networkError(let error):
            return "Network error: \(error.localizedDescription)"
        case .decodingError(let error):
            return "Decoding error: \(error.localizedDescription)"
        case .serverError(let code):
            return "Server error: \(code)"
        case .unauthorized:
            return "Unauthorized"
        case .unknown:
            return "Unknown error"
        }
    }
}

// MARK: - API Client

actor APIClient {
    static let shared = APIClient()

    private let baseURL: String
    private let session: URLSession

    private let encoder = JSONEncoder()
    private let decoder = JSONDecoder()

    init() {
        self.baseURL = EnvironmentConfig.current.apiBaseURL

        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30
        config.timeoutIntervalForResource = 60
        self.session = URLSession(configuration: config)
    }

    func request<T: Decodable & Sendable>(_ endpoint: APIEndpoint, retryOn401: Bool = true) async throws -> T {
        let urlString = baseURL + endpoint.path

        guard let url = URL(string: urlString) else {
            throw APIError.invalidURL
        }

        var urlRequest = URLRequest(url: url)
        urlRequest.httpMethod = endpoint.method
        urlRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")

        if endpoint.requiresAuth {
            let token = try await AuthManager.shared.getValidAccessToken()
            urlRequest.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        if let body = endpoint.body {
            urlRequest.httpBody = try encoder.encode(AnyEncodable(body))
        }

        let data: Data
        let response: URLResponse
        do {
            (data, response) = try await session.data(for: urlRequest)
        } catch {
            throw APIError.networkError(error)
        }

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.unknown
        }

        // Automatic 401 retry with token refresh (once only)
        if httpResponse.statusCode == 401 && endpoint.requiresAuth && retryOn401 {
            do {
                try await AuthManager.shared.refreshTokens()
                return try await request(endpoint, retryOn401: false)
            } catch {
                await AuthManager.shared.signOut()
                throw APIError.unauthorized
            }
        }

        do {
            let apiResponse = try decoder.decode(APIResponse<T>.self, from: data)
            if apiResponse.success, let responseData = apiResponse.data {
                return responseData
            }
            throw APIError.serverError(apiResponse.error?.code ?? "UNKNOWN")
        } catch let error as APIError {
            throw error
        } catch {
            throw APIError.decodingError(error)
        }
    }
}

// MARK: - Type Erasure
// Swift can't directly encode existential `any Encodable` — this wrapper bridges it.

nonisolated private struct AnyEncodable: Encodable, @unchecked Sendable {
    private let encode: (Encoder) throws -> Void

    init(_ wrapped: any Encodable & Sendable) {
        self.encode = { encoder in
            try wrapped.encode(to: encoder)
        }
    }

    func encode(to encoder: Encoder) throws {
        try encode(encoder)
    }
}
```

---

### iOS: `app/Sources/Services/APIEndpoint.swift`

```swift
import Foundation

enum APIEndpoint {
    case status

    // Auth
    case authApple(body: AppleAuthRequest)
    case authRefresh(body: RefreshRequest)
    case authMe
    case authLogout(body: LogoutRequest)

    var path: String {
        switch self {
        case .status:
            return "/status"
        case .authApple:
            return "/auth/apple"
        case .authRefresh:
            return "/auth/refresh"
        case .authMe:
            return "/auth/me"
        case .authLogout:
            return "/auth/logout"
        }
    }

    var method: String {
        switch self {
        case .status, .authMe:
            return "GET"
        case .authApple, .authRefresh, .authLogout:
            return "POST"
        }
    }

    var requiresAuth: Bool {
        switch self {
        case .status, .authApple, .authRefresh:
            return false
        case .authMe, .authLogout:
            return true
        }
    }

    var body: (any Encodable)? {
        switch self {
        case .status, .authMe:
            return nil
        case .authApple(let body):
            return body
        case .authRefresh(let body):
            return body
        case .authLogout(let body):
            return body
        }
    }
}
```

---

### iOS: `app/Sources/Services/KeychainManager.swift`

```swift
import Foundation
import Security

// Sendable: safe because the only stored property is `let` and all methods call thread-safe SecItem* C functions.
final class KeychainManager: Sendable {
    static let shared = KeychainManager()
    private let service = "{{BUNDLE_ID}}"

    func save(key: String, data: Data) throws {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecValueData as String: data,
        ]
        SecItemDelete(query as CFDictionary) // remove existing
        let status = SecItemAdd(query as CFDictionary, nil)
        guard status == errSecSuccess else {
            throw KeychainError.saveFailed(status)
        }
    }

    func load(key: String) -> Data? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne,
        ]
        var result: AnyObject?
        SecItemCopyMatching(query as CFDictionary, &result)
        return result as? Data
    }

    func delete(key: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
        ]
        SecItemDelete(query as CFDictionary)
    }

    func deleteAll() {
        for key in ["accessToken", "refreshToken"] {
            delete(key: key)
        }
    }
}

enum KeychainError: Error {
    case saveFailed(OSStatus)
}
```

---

### iOS: `app/Sources/Services/AuthManager.swift`

```swift
import Foundation

@Observable
final class AuthManager {
    static let shared = AuthManager()

    private(set) var isAuthenticated = false
    private(set) var currentUser: UserProfile?

    private let keychain = KeychainManager.shared
    private let apiClient = APIClient.shared

    init() {
        isAuthenticated = keychain.load(key: "accessToken") != nil
    }

    func signIn(identityToken: String, fullName: String?) async throws {
        let response: AuthResponse = try await apiClient.request(.authApple(
            body: AppleAuthRequest(identityToken: identityToken, fullName: fullName)
        ))

        try saveTokens(accessToken: response.accessToken, refreshToken: response.refreshToken)
        currentUser = response.user
        isAuthenticated = true
    }

    func refreshTokens() async throws {
        guard let refreshData = keychain.load(key: "refreshToken"),
              let refreshToken = String(data: refreshData, encoding: .utf8) else {
            signOut()
            throw APIError.unauthorized
        }

        let response: TokenResponse = try await apiClient.request(.authRefresh(
            body: RefreshRequest(refreshToken: refreshToken)
        ))

        try saveTokens(accessToken: response.accessToken, refreshToken: response.refreshToken)
    }

    func fetchCurrentUser() async {
        do {
            let user: UserProfile = try await apiClient.request(.authMe)
            currentUser = user
        } catch {
            // If fetch fails, user can still use cached auth state
        }
    }

    // Intentionally synchronous — clears local state immediately.
    // The server logout is fire-and-forget; if it fails, the refresh token
    // expires on its own. The user is signed out locally regardless.
    func signOut() {
        if let refreshData = keychain.load(key: "refreshToken"),
           let refreshToken = String(data: refreshData, encoding: .utf8) {
            Task {
                let _: EmptyResponse? = try? await apiClient.request(.authLogout(
                    body: LogoutRequest(refreshToken: refreshToken)
                ))
            }
        }
        keychain.deleteAll()
        currentUser = nil
        isAuthenticated = false
    }

    func getValidAccessToken() async throws -> String {
        guard let tokenData = keychain.load(key: "accessToken"),
              let token = String(data: tokenData, encoding: .utf8) else {
            throw APIError.unauthorized
        }
        return token
    }

    private func saveTokens(accessToken: String, refreshToken: String) throws {
        try keychain.save(key: "accessToken", data: Data(accessToken.utf8))
        try keychain.save(key: "refreshToken", data: Data(refreshToken.utf8))
    }
}
```

---

### iOS: `app/Sources/Models/APIModels.swift`

```swift
import Foundation

// MARK: - Generic API Response

struct APIResponse<T: Decodable>: Decodable {
    let success: Bool
    let data: T?
    let error: APIErrorDetails?
}

struct APIErrorDetails: Decodable {
    let code: String
    let message: String
}

// MARK: - Status

struct StatusResponse: Decodable {
    let status: String
    let version: String
    let environment: String
    let database: String
    let timestamp: String
}

// MARK: - Auth

struct AppleAuthRequest: Encodable {
    let identityToken: String
    let fullName: String?
}

struct RefreshRequest: Encodable {
    let refreshToken: String
}

struct LogoutRequest: Encodable {
    let refreshToken: String
}

struct AuthResponse: Decodable {
    let user: UserProfile
    let accessToken: String
    let refreshToken: String
    let expiresIn: Int
}

struct TokenResponse: Decodable {
    let accessToken: String
    let refreshToken: String
    let expiresIn: Int
}

struct UserProfile: Decodable {
    let id: String
    let email: String?
    let fullName: String?
    let createdAt: String?  // ISO 8601 string — kept as String to avoid dateDecodingStrategy complexity
}

struct EmptyResponse: Decodable {}
```

---

### iOS: `app/Sources/Design/Theme.swift`

```swift
import SwiftUI

struct Theme {
    // Backgrounds — use semantic system colors so content layers work with Liquid Glass chrome
    static let backgroundPrimary = Color(.systemBackground)
    static let backgroundSecondary = Color(.secondarySystemBackground)
    static let backgroundGrouped = Color(.systemGroupedBackground)

    // Text — semantic colors adapt to light/dark mode and Liquid Glass vibrancy
    static let textPrimary = Color(.label)
    static let textSecondary = Color(.secondaryLabel)
    static let textTertiary = Color(.tertiaryLabel)

    // Accent
    static let accentPrimary = Color(hex: "#3B82F6")
    static let accentSuccess = Color(hex: "#22C55E")
    static let accentWarning = Color(hex: "#F59E0B")
    static let accentDanger = Color(hex: "#EF4444")
}

struct Typography {
    static let largeTitle = Font.system(size: 24, weight: .semibold)
    static let title = Font.system(size: 18, weight: .semibold)
    static let headline = Font.system(size: 15, weight: .medium)
    static let body = Font.system(size: 14, weight: .regular)
    static let caption = Font.system(size: 11, weight: .medium)
    static let tiny = Font.system(size: 10, weight: .medium)
}

struct Spacing {
    static let xs: CGFloat = 4
    static let sm: CGFloat = 8
    static let md: CGFloat = 12
    static let lg: CGFloat = 16
    static let xl: CGFloat = 24
    static let xxl: CGFloat = 32
}
```

---

### iOS: `app/Sources/Extensions/Color+Hex.swift`

```swift
import SwiftUI

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet(charactersIn: "#"))
        let scanner = Scanner(string: hex)
        var rgbValue: UInt64 = 0
        scanner.scanHexInt64(&rgbValue)
        let r = Double((rgbValue & 0xFF0000) >> 16) / 255.0
        let g = Double((rgbValue & 0x00FF00) >> 8) / 255.0
        let b = Double(rgbValue & 0x0000FF) / 255.0
        self.init(red: r, green: g, blue: b)
    }
}
```

---

### iOS: `app/Sources/ViewModels/StatusViewModel.swift`

```swift
import Foundation

@Observable
final class StatusViewModel {
    var isConnected = false
    var isChecking = false
    var errorMessage: String?

    private let apiClient: APIClient

    init(apiClient: APIClient = .shared) {
        self.apiClient = apiClient
    }

    func checkStatus() async {
        isChecking = true
        errorMessage = nil

        do {
            let response: StatusResponse = try await apiClient.request(.status)
            isConnected = response.status == "ok"
        } catch {
            isConnected = false
            errorMessage = error.localizedDescription
        }

        isChecking = false
    }
}
```

---

### iOS: `app/Sources/ViewModels/AuthViewModel.swift`

```swift
import Foundation
import AuthenticationServices

@Observable
final class AuthViewModel {
    var errorMessage: String?
    var isSigningIn = false

    private let authManager: AuthManager

    init(authManager: AuthManager = .shared) {
        self.authManager = authManager
    }

    func handleSignIn(result: Result<ASAuthorization, Error>) async {
        isSigningIn = true
        errorMessage = nil

        switch result {
        case .success(let authorization):
            guard let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
                  let identityTokenData = credential.identityToken,
                  let identityToken = String(data: identityTokenData, encoding: .utf8) else {
                errorMessage = "Failed to get Apple credentials"
                isSigningIn = false
                return
            }

            let fullName = [credential.fullName?.givenName, credential.fullName?.familyName]
                .compactMap { $0 }
                .joined(separator: " ")

            do {
                try await authManager.signIn(
                    identityToken: identityToken,
                    fullName: fullName.isEmpty ? nil : fullName
                )
            } catch {
                errorMessage = error.localizedDescription
            }

        case .failure(let error):
            if (error as NSError).code != ASAuthorizationError.canceled.rawValue {
                errorMessage = error.localizedDescription
            }
        }

        isSigningIn = false
    }
}
```

---

### iOS: `app/{{PROJECT_NAME}}Tests/{{PROJECT_NAME}}Tests.swift`

```swift
import Testing
@testable import {{PROJECT_NAME}}

@Suite("StatusViewModel")
struct StatusViewModelTests {
    @Test func checkStatusUpdatesState() async {
        let vm = await StatusViewModel()
        await vm.checkStatus()
        #expect(await vm.isChecking == false)
    }
}
```

---

### CI/CD: `.github/workflows/deploy.yml`

```yaml
name: CI / Deploy Backend

on:
  workflow_dispatch:
  push:
    branches: [main]
    paths:
      - "backend/**"
      - "docker-compose.yml"
  pull_request:
    branches: [main]
    paths:
      - "backend/**"
      - "docker-compose.yml"

jobs:
  lint:
    name: Lint
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: backend
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install --frozen-lockfile
      - run: bun run lint

  typecheck:
    name: Typecheck
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: backend
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install --frozen-lockfile
      - run: bun run typecheck

  test:
    name: Test
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: backend
    services:
      postgres:
        image: postgres:17-alpine
        env:
          POSTGRES_USER: {{DB_NAME}}
          POSTGRES_PASSWORD: testpassword
          POSTGRES_DB: {{DB_NAME}}_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd "pg_isready -U {{DB_NAME}}"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    env:
      DATABASE_URL: postgresql://{{DB_NAME}}:testpassword@localhost:5432/{{DB_NAME}}_test
      JWT_SECRET: test-jwt-secret-at-least-32-characters-long
      ENCRYPTION_KEY: 0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
      NODE_ENV: test
      APPLE_BUNDLE_ID: com.test.app
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install --frozen-lockfile
      - run: bun run db:push
      - run: bun run test

  version-bump:
    name: Bump Version
    runs-on: ubuntu-latest
    needs: [lint, typecheck, test]
    if: github.ref == 'refs/heads/main' && (github.event_name == 'push' || github.event_name == 'workflow_dispatch')
    permissions:
      contents: write
    defaults:
      run:
        working-directory: backend
    steps:
      - uses: actions/checkout@v4
      - name: Bump patch version and push
        run: |
          npm version patch --no-git-tag-version
          NEW_VERSION=$(node -p "require('./package.json').version")
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add package.json
          git commit -m "chore: bump backend to v${NEW_VERSION} [skip ci]"
          git push

  deploy:
    name: Deploy to VPS
    runs-on: ubuntu-latest
    needs: [version-bump]
    if: github.ref == 'refs/heads/main' && (github.event_name == 'push' || github.event_name == 'workflow_dispatch')
    steps:
      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          port: ${{ secrets.VPS_PORT }}
          script: bash /home/{{VPS_HOME_USER}}/apps/{{REPO_NAME}}/scripts/deploy.sh
```

---

### Scripts: `scripts/deploy.sh`

```bash
#!/bin/bash
set -e

export GIT_SSH_COMMAND="ssh -i /home/{{VPS_DEPLOYER_USER}}/.ssh/github_readonly -o StrictHostKeyChecking=accept-new"

cd /home/{{VPS_HOME_USER}}/apps/{{REPO_NAME}}
git pull origin main
docker compose build backend
docker compose up -d backend
sleep 5
curl --fail --retry 3 --retry-delay 3 http://localhost:{{BACKEND_PORT}}/api/v1/status
```

---

## 8. CLAUDE.md Template

Copy this into `.claude/CLAUDE.md` and fill in the blanks:

````markdown
# {{PROJECT_NAME}} — Project Rules for Claude Code

## Workflow

1. Implement one phase at a time, in order
2. Read the entire phase file before writing any code
3. The app must compile and work after every phase
4. Do NOT build anything from future phases unless the current phase explicitly says to

---

## Tech Stack

### Backend (`backend/`)

- **Runtime**: Bun
- **Framework**: Hono
- **ORM**: Drizzle (PostgreSQL)
- **Validation**: Zod + @hono/zod-validator
- **Testing**: Bun test runner (built-in, real PostgreSQL test DB `{{DB_NAME}}_test`)
- **Auth**: JWT via jose, Apple Sign-In only
- **IDs**: UUID (`gen_random_uuid()` in PostgreSQL, `UUID()` in Swift)
- **Linter**: Biome
- **Encryption**: AES-256-GCM via crypto.ts

### iOS (`app/`)

- **Target**: iOS 26+ / Swift 6.2 / Xcode 26
- **Concurrency**: Default MainActor isolation enabled (`SWIFT_DEFAULT_ACTOR_ISOLATION: MainActor`). All declarations are `@MainActor` unless explicitly `nonisolated`. Use `@concurrent` for functions that must run on background threads.
- **Project**: XcodeGen (`app/project.yml` → `xcodegen generate`)
- **UI**: SwiftUI with `@Observable` macro + Liquid Glass design language
- **Architecture**: MVVM — dedicated ViewModel files with init injection
- **Networking**: `actor`-based `APIClient` (explicitly `nonisolated` from default MainActor) with typed `APIEndpoint` enum, auto 401 retry
- **Auth tokens**: Keychain (Security framework) via `KeychainManager`
- **Auth state**: `AuthManager` — sign in, sign out, token refresh
- **Preferences sync**: NSUbiquitousKeyValueStore (iCloud key-value)
- **Design**: Theme (semantic system colors) + Typography + Spacing token structs
- **Testing**: Swift Testing framework (`import Testing`, `@Test`, `#expect`)

---

## Critical Conventions

### API Response Format

All endpoints return:

```typescript
// Success
{ success: true, data: T }
// Error
{ success: false, error: { code: string, message: string } }
```

Use `success()` and `error()` helpers from `src/utils/response.ts`. Never return raw objects.

### Column Naming

camelCase in TypeScript, snake_case in PostgreSQL. Drizzle maps between them:

```typescript
displayName: text('display_name');
```

### JSON Wire Format

camelCase over the wire (matching JavaScript's native format). No key conversion strategies on iOS encoder/decoder.

### Auth

Apple Sign-In only. No email/password.

### iCloud

`NSUbiquitousKeyValueStore` for cross-device preferences only. Multi-user data stays in PostgreSQL.

### Syntax Patterns

For Drizzle, Hono, JWT, Apple Sign-In, and iOS patterns, refer to **BLUEPRINT.md Section 11: Developer Reference**.

---

## Code Patterns

### Backend Route

```typescript
routes.post(
  '/',
  authMiddleware,
  zValidator('json', schema, zodHook),
  async (c) => {
    const data = c.req.valid('json');
    const userId = c.get('userId');
    return success(c, result, 201);
  },
);
```

### Backend Testing

Tests hit a real PostgreSQL database (`{{DB_NAME}}_test`). Test Hono routes via `app.request()`:

```typescript
const res = await app.request('/api/v1/endpoint', {
  headers: { Authorization: `Bearer ${token}` },
});
expect(res.status).toBe(200);
```

### iOS APIClient

Actor-based singleton. All endpoints go through `APIClient.shared.request<T>(.endpoint)`.
Auto-retries once on 401 after token refresh via `AuthManager`.

### iOS Response Decoding

Use `APIResponse<T>` wrapper for ALL endpoints. Never create per-endpoint response types:

```swift
struct APIResponse<T: Decodable>: Decodable {
    let success: Bool
    let data: T?
    let error: APIErrorDetails?
}
```

### Transactions

Use Drizzle transactions for any operation touching multiple tables:

```typescript
await db.transaction(async (tx) => {
  await tx.update(table).set({ ... }).where(...);
  await tx.insert(other).values({ ... });
});
```

### Atomic Counters

Always use SQL arithmetic for counters (never read-then-write):

```typescript
points: sql`${users.points} + ${amount}`;
```

---

## Database Rules

- `bun run db:push` to apply schema changes
- Enums must be created before tables that reference them
- Schema barrel export: `src/db/schema/index.ts`
- Test database: `{{DB_NAME}}_test`

---

## iOS Project Rules

- Bundle ID: `{{BUNDLE_ID}}`
- Minimum deployment target: iOS 26.0
- Default actor isolation: `MainActor` (set in project.yml build settings)
- Capabilities: Sign in with Apple, iCloud (key-value store)
<!-- Add more capabilities as needed: Push Notifications, Background Modes, etc. -->

---

## Liquid Glass Rules

- Navigation bars, tab bars, toolbars, and sheets automatically use Liquid Glass — do NOT override their backgrounds with opaque colors.
- Apply `.glassEffect()` only to navigation-layer elements: floating action buttons, overlay controls, custom toolbars.
- Do NOT apply `.glassEffect()` to content views (lists, text, media, cards).
- Use `.scrollContentBackground(.hidden)` on Forms/Lists inside sheets to let glass show through.
- Use `GlassEffectContainer` when multiple glass elements need coordinated sampling or morphing.
- Use `Theme.backgroundPrimary` / `Theme.backgroundSecondary` (semantic system colors) for content backgrounds — they adapt to Liquid Glass automatically.

---

## Concurrency Rules (Swift 6.2)

- Default MainActor isolation is enabled — do NOT add explicit `@MainActor` to types or functions (it's redundant).
- Mark `actor` types (like `APIClient`) as needed — they opt out of the default MainActor isolation.
- Use `@concurrent` on functions that must run on a background thread (e.g., heavy data processing). `@concurrent` implies `nonisolated`.
- `nonisolated async` functions now inherit the caller's actor by default (SE-0461). Use `@concurrent` if you need background execution.

---

## What NOT to Do

- Do NOT add email/password auth
- Do NOT create per-endpoint response types on iOS (use `APIResponse<T>`)
- Do NOT use `ObservableObject` + `@Published` (use `@Observable`)
- Do NOT use auto-increment IDs (use UUID)
- Do NOT store auth tokens in UserDefaults (use Keychain)
- Do NOT return raw JSON without the response envelope
- Do NOT skip Zod validation on request bodies
- Do NOT use `.tabItem` modifier (use `Tab` initializer)
- Do NOT use XCTest (use Swift Testing: `import Testing`)
- Do NOT add explicit `@MainActor` annotations (default actor isolation handles it)
- Do NOT apply `.glassEffect()` to content views — only navigation-layer elements
- Do NOT use opaque custom backgrounds on navigation bars, tab bars, or toolbars (Liquid Glass handles them)
- Do NOT use hardcoded hex colors for backgrounds (use semantic system colors via `Color(.systemBackground)` etc.)
````

---

## 9. Feature-Specific Appendix

These features are **NOT** in the standard scaffold. Add them per-project as needed.

### Bluetooth / CoreBluetooth

- **Entitlements**: Add `com.apple.developer.bluetooth` to entitlements.
- **Info.plist**: `NSBluetoothAlwaysUsageDescription`.
- **project.yml**: Add Background Modes capability (`bluetooth-central`).
- **Code**: `BluetoothManager` class using `CBCentralManager`.

### Push Notifications (APNs)

- **Entitlements**: Add `aps-environment: development` to entitlements.
- **project.yml**: Add Push Notifications capability.
- **Backend env vars**: `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_BUNDLE_ID`, `APNS_KEY_PATH`.
- **Backend**: APNs integration service in `src/services/apns.ts`.

### WebSocket

- **iOS**: `WebSocketManager` class for real-time messaging.
- **Backend**: `src/websocket/` folder with Hono WebSocket handlers.
- **EnvironmentConfig**: Add `wsBaseURL` property (`wss://{{API_DOMAIN}}/ws`).

### CloudKit / SwiftData

- **Entitlements**: Add `com.apple.developer.icloud-services: [CloudKit]` and `com.apple.developer.icloud-container-identifiers`.
- **Code**: `ModelConfiguration(cloudKitDatabase: .automatic)` in SwiftData container.
- **Rule**: All `@Model` classes must be `final class` (no inheritance — breaks CloudKit sync).

### Camera / Photos

- **Info.plist**: `NSCameraUsageDescription`, `NSPhotoLibraryUsageDescription`.
- **project.yml**: Add usage descriptions to Info.plist keys.

### Encryption (AES-256-GCM)

Already included in the standard scaffold (`src/utils/crypto.ts` + `ENCRYPTION_KEY` env var). Projects that don't need encryption can remove:

1. Delete `src/utils/crypto.ts`
2. Remove `encrypt`/`decrypt` exports from `src/utils/index.ts`
3. Remove `ENCRYPTION_KEY` from `src/config/env.ts` and all `.env.example` files

### CUID2 (alternative to UUID)

When to prefer CUID2 over UUID:

- URL-safe IDs without hyphens
- Application-generated IDs (no database round-trip)
- Sortable by creation time

Setup:

```bash
bun add @paralleldrive/cuid2
```

```typescript
import { createId } from '@paralleldrive/cuid2';
const id = createId(); // e.g., "clh3am8kz0000mj08..."
```

In Drizzle schema, use `text("id").$defaultFn(() => createId())` instead of `uuid("id").defaultRandom()`.

---

## 10. Naming Conventions

| Context                   | Convention                       | Example                                    |
| ------------------------- | -------------------------------- | ------------------------------------------ |
| **Swift files**           | PascalCase                       | `APIClient.swift`, `StatusViewModel.swift` |
| **TypeScript files**      | kebab-case                       | `error-handler.ts`, `response.ts`          |
| **Swift variables**       | camelCase                        | `isConnected`, `apiClient`                 |
| **TypeScript variables**  | camelCase                        | `statusCode`, `userId`                     |
| **PostgreSQL columns**    | snake_case                       | `created_at`, `apple_user_id`              |
| **Drizzle schema**        | camelCase (mapped to snake_case) | `createdAt: timestamp('created_at')`       |
| **JSON wire format**      | camelCase                        | `{ "userId": "...", "createdAt": "..." }`  |
| **iOS folders**           | PascalCase                       | `Views/`, `Services/`, `ViewModels/`       |
| **Backend folders**       | kebab-case                       | `src/routes/`, `src/middleware/`           |
| **Environment variables** | SCREAMING_SNAKE_CASE             | `DATABASE_URL`, `JWT_SECRET`               |
| **Error codes**           | SCREAMING_SNAKE_CASE             | `NOT_FOUND`, `TOKEN_EXPIRED`               |
| **Git branches**          | kebab-case                       | `feature/add-auth`, `fix/status-endpoint`  |
| **Database names**        | lowercase                        | `nightowl`, `taskflow`                   |

---

## 11. Developer Reference — Patterns & Syntax

This section is a **reference** for syntax patterns. Section 7 (File Templates) is the **source of truth** for actual file contents — if you see a difference between a template and a pattern here, the template wins.

### Package Imports (Backend)

```typescript
// Zod (validation) — use Zod 3.x, import from 'zod'
import { z } from 'zod';

// Drizzle ORM
import { drizzle } from 'drizzle-orm/postgres-js';
import {
  pgTable,
  text,
  boolean,
  integer,
  timestamp,
  decimal,
  jsonb,
  pgEnum,
  uuid,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import {
  eq,
  and,
  or,
  desc,
  asc,
  sql,
  count,
  gt,
  lt,
  ne,
  isNull,
} from 'drizzle-orm';
import postgres from 'postgres';

// Jose (JWT)
import { SignJWT, jwtVerify, createRemoteJWKSet } from 'jose';

// Hono
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';

// Rate limiting (add-on — not in standard scaffold, install: bun add hono-rate-limiter)
import { rateLimiter } from 'hono-rate-limiter';

// Node crypto (AES-256-GCM) — Bun fully supports Node.js crypto module
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  createHash,
} from 'node:crypto';
```

### Drizzle ORM Syntax Patterns

```typescript
// --- Table definition with UUID ---
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email'),
  displayName: text('display_name'),      // camelCase TS prop, snake_case PG column
  pushEnabled: boolean('push_enabled').notNull().default(true),
  reputationPoints: integer('reputation_points').notNull().default(0),
  latitude: decimal('latitude', { precision: 10, scale: 7 }),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => [
  index('users_email_idx').on(table.email),
]);

// --- Enum definition (in enums.ts) ---
export const statusEnum = pgEnum('status', ['active', 'inactive', 'archived']);

// --- Using enum in table ---
import { statusEnum } from './enums';
export const items = pgTable('items', {
  status: statusEnum('status').notNull().default('active'),
});

// --- Text array column ---
tags: text('tags').array(),

// --- Compound unique index ---
export const providerAccounts = pgTable('provider_accounts', {
  // ... columns
}, (table) => [
  uniqueIndex('provider_user_idx').on(table.provider, table.providerUserId),
]);

// --- Foreign key ---
ownerId: uuid('owner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

// --- Transactions ---
await db.transaction(async (tx) => {
  await tx.update(users).set({ points: sql`${users.points} + ${amount}` }).where(eq(users.id, userId));
  await tx.insert(rewards).values({ ... });
});

// --- Schema barrel export (src/db/schema/index.ts) ---
export * from './users';
export * from './refresh-tokens';
// ... add new schemas as each phase creates them
```

> **Column naming convention**: Use camelCase for TypeScript property names and snake_case for PostgreSQL column names. Drizzle maps between them via the string argument: `displayName: text('display_name')`.

### Hono Patterns

```typescript
// --- App setup ---
const app = new Hono();
const api = new Hono(); // sub-router for /api/v1
app.route('/api/v1', api);

// --- Error handler middleware ---
app.onError((err, c) => {
  if (err instanceof AppError) {
    return error(c, err.code, err.message, err.statusCode);
  }
  if (err.name === 'ZodError') {
    return error(
      c,
      'VALIDATION_ERROR',
      err.issues[0]?.message || 'Validation failed',
      400,
    );
  }
  console.error('Unhandled error:', err);
  return error(c, 'INTERNAL_ERROR', 'Internal server error', 500);
});

// --- Route with Zod validation ---
import { zValidator } from '@hono/zod-validator';

// Custom hook so validation errors use the standard { success, error } envelope
// instead of @hono/zod-validator's default format.
function zodHook(
  result: { success: boolean; error?: { issues: Array<{ message: string }> } },
  c: Context,
) {
  if (!result.success) {
    return error(
      c,
      'VALIDATION_ERROR',
      result.error!.issues[0]?.message || 'Validation failed',
      400,
    );
  }
}

routes.post(
  '/',
  authMiddleware,
  zValidator('json', createItemSchema, zodHook),
  async (c) => {
    const data = c.req.valid('json'); // typed and validated
    // ...
    return success(c, result, 201); // 201 for creates
  },
);

// --- Response helpers (from src/utils/response.ts) ---
// function success<T>(c: Context, data: T, status?: number): Response;
// function error(c: Context, code: string, message: string, status?: number): Response;
// Usage: return success(c, user);
// Usage: return success(c, result, 201);
// Usage: return error(c, 'NOT_FOUND', 'User not found', 404);

// --- Context typing for userId ---
type AuthEnv = { Variables: { userId: string } };
const protectedRoutes = new Hono<AuthEnv>();
// After authMiddleware sets c.set('userId', ...):
const userId = c.get('userId'); // typed as string

// --- Rate limiter setup ---
const authRateLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 5,
  keyGenerator: (c) =>
    c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown',
});

// --- Multipart form data parsing ---
routes.post('/upload', authMiddleware, async (c) => {
  const body = await c.req.parseBody();
  const file = body['file']; // File object
  if (!(file instanceof File))
    return error(c, 'VALIDATION_ERROR', 'No file', 400);
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    /* reject */
  }
  if (file.size > 5 * 1024 * 1024) {
    /* reject - 5MB limit */
  }
  const ext = file.name.split('.').pop();
  const filename = `${crypto.randomUUID()}.${ext}`;
  await Bun.write(`./uploads/${filename}`, file);
  return success(c, { url: `/uploads/${filename}` }, 201);
});

// --- Static file serving ---
app.get('/uploads/*', async (c) => {
  const path = c.req.path;
  const file = Bun.file(`./backend${path}`);
  if (await file.exists()) return new Response(file);
  return error(c, 'NOT_FOUND', 'File not found', 404);
});
```

### HTTP Status Codes Convention

| Operation          | Success                          | Error                                                            |
| ------------------ | -------------------------------- | ---------------------------------------------------------------- |
| Create (POST)      | `201 Created`                    | `400` validation, `401` unauth, `409` conflict                   |
| Read (GET)         | `200 OK`                         | `401` unauth, `403` forbidden, `404` not found                   |
| Update (PATCH/PUT) | `200 OK`                         | `400` validation, `401` unauth, `403` not owner, `404` not found |
| Delete (DELETE)    | `200 OK` (with success response) | `401` unauth, `403` not owner, `404` not found                   |
| Auth error         | -                                | `401 Unauthorized` (invalid/missing token)                       |
| Rate limited       | -                                | `429 Too Many Requests`                                          |
| Server error       | -                                | `500 Internal Server Error`                                      |

### JWT Patterns (jose)

```typescript
// --- Create access token ---
const secret = new TextEncoder().encode(env.JWT_SECRET);
const accessToken = await new SignJWT({ sub: userId })
  .setProtectedHeader({ alg: 'HS256' })
  .setIssuedAt()
  .setExpirationTime(env.JWT_ACCESS_EXPIRES_IN) // jose parses '15m', '1h', '7d' etc.
  .sign(secret);

// --- Verify access token ---
const { payload } = await jwtVerify(token, secret);
const userId = payload.sub; // string

// --- expiresIn for response (parse duration to seconds) ---
function durationToSeconds(duration: string): number {
  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) return 900;
  const [, num, unit] = match;
  const multipliers: Record<string, number> = {
    s: 1,
    m: 60,
    h: 3600,
    d: 86400,
  };
  return parseInt(num) * multipliers[unit];
}
// Usage: expiresIn: durationToSeconds(env.JWT_ACCESS_EXPIRES_IN) → 900

// --- Refresh token (not a JWT — random token stored in DB) ---
const refreshToken = crypto.randomUUID();
// Store in DB: { token: refreshToken, userId, expiresAt: new Date(Date.now() + durationToMs('7d')), revokedAt: null }
```

### Apple Sign-In Verification

```typescript
// Apple JWKS endpoint (public keys for verifying identity tokens)
const APPLE_JWKS = createRemoteJWKSet(
  new URL('https://appleid.apple.com/auth/keys'),
);

async function verifyAppleIdentityToken(
  identityToken: string,
): Promise<{ sub: string; email?: string }> {
  const { payload } = await jwtVerify(identityToken, APPLE_JWKS, {
    issuer: 'https://appleid.apple.com',
    audience: env.APPLE_BUNDLE_ID, // iOS bundle ID
  });
  return {
    sub: payload.sub as string,
    email: payload.email as string | undefined,
  };
}
// If token is expired or invalid: jwtVerify throws — catch and throw AppError('INVALID_CREDENTIALS', 401)
```

### Testing Patterns (Bun Test + Hono)

```typescript
// bunfig.toml configures test.preload.ts which sets env vars:
// test.preload.ts — use ??= so CI env vars take precedence over these defaults:
process.env.DATABASE_URL ??=
  'postgresql://{{DB_NAME}}:postgres@localhost:{{DB_PORT}}/{{DB_NAME}}_test';
process.env.JWT_SECRET ??= 'a'.repeat(32); // 32+ chars
process.env.ENCRYPTION_KEY ??= 'ab'.repeat(32); // 64 hex chars = 32 bytes
process.env.APPLE_BUNDLE_ID ??= 'com.test.app';

// --- Testing Hono routes (no real server needed) ---
// describe/it/expect are globals in bun test — import mock explicitly when needed
import { app } from '../index';

describe('GET /health', () => {
  it('returns ok', async () => {
    const res = await app.request('/health');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.status).toBe('ok');
  });
});

// --- Authenticated request ---
const token = await createTestAccessToken(testUserId); // helper that creates a real JWT
const res = await app.request('/api/v1/auth/me', {
  headers: { Authorization: `Bearer ${token}` },
});

// --- Database test strategy ---
// Tests hit a REAL PostgreSQL database ({{DB_NAME}}_test).
// Before running tests: create the test DB manually:
//   createdb {{DB_NAME}}_test
// Before each test suite: run db:push to sync schema.
// Each test should clean up its own data (DELETE FROM ... WHERE id = testId)
// OR use transactions that roll back after each test.

// --- Mocking jose for Apple Sign-In tests ---
import { mock } from 'bun:test';

// Import real jose before applying mock
const realJose = await import('jose');

mock.module('jose', () => ({
  ...realJose,
  createRemoteJWKSet: () => async () => ({}),
  jwtVerify: async (token: string, keyOrSecret: unknown, options?: unknown) => {
    if (options && typeof options === 'object' && 'audience' in options) {
      // Apple token verification — return mock payload
      return { payload: { sub: 'apple-user-123', email: 'test@example.com' } };
    }
    // Our JWT verification — use real implementation
    return realJose.jwtVerify(token, keyOrSecret);
  },
}));

// Import app AFTER mock is set up
const { app } = await import('../index');
```

### Bun Server Patterns

```typescript
// Basic (no WebSocket): simple export default
export default {
  port: env.PORT,
  fetch: app.fetch,
};

// With WebSocket: Bun.serve()
// Bun.serve's fetch handler CAN return undefined for successful WebSocket upgrades.
Bun.serve({
  port: env.PORT,
  fetch(req, server) {
    if (new URL(req.url).pathname === '/ws') {
      const token = new URL(req.url).searchParams.get('token');
      if (server.upgrade(req, { data: { token } })) return; // undefined is OK
      return new Response('WebSocket upgrade failed', { status: 400 });
    }
    return app.fetch(req);
  },
  websocket: {
    async open(ws) {
      const userId = await verifyAccessToken(ws.data.token);
      if (!userId) {
        ws.close();
        return;
      }
      ws.data.userId = userId;
      connectionManager.addConnection(userId, ws);
    },
    message(ws, message) {
      const parsed = JSON.parse(message as string);
      // Route by parsed.type
    },
    close(ws) {
      if (ws.data.userId)
        connectionManager.removeConnection(ws.data.userId, ws);
    },
  },
});
```

### iOS Patterns

```swift
// --- KeychainManager (Security framework) ---
import Security

// Sendable: only `let` stored property + thread-safe SecItem* C functions.
final class KeychainManager: Sendable {
    static let shared = KeychainManager()
    private let service = "{{BUNDLE_ID}}"

    func save(key: String, data: Data) throws {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecValueData as String: data,
        ]
        SecItemDelete(query as CFDictionary)  // remove existing
        let status = SecItemAdd(query as CFDictionary, nil)
        guard status == errSecSuccess else { throw KeychainError.saveFailed(status) }
    }

    func load(key: String) -> Data? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne,
        ]
        var result: AnyObject?
        SecItemCopyMatching(query as CFDictionary, &result)
        return result as? Data
    }

    func delete(key: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
        ]
        SecItemDelete(query as CFDictionary)
    }
}

// --- Apple Sign-In Coordinator (UIKit delegate pattern) ---
// Alternative to SignInWithAppleButton. Use this only if you need UIKit-level
// control (e.g., presenting from a specific window scene). The standard scaffold
// uses SignInWithAppleButton in OnboardingView.swift instead.
import AuthenticationServices

class AppleSignInCoordinator: NSObject, ASAuthorizationControllerDelegate,
                               ASAuthorizationControllerPresentationContextProviding {
    var onComplete: ((String, String, PersonNameComponents?) -> Void)?
    var onError: ((Error) -> Void)?

    func startSignIn() {
        let request = ASAuthorizationAppleIDProvider().createRequest()
        request.requestedScopes = [.fullName, .email]
        let controller = ASAuthorizationController(authorizationRequests: [request])
        controller.delegate = self
        controller.presentationContextProvider = self
        controller.performRequests()
    }

    func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .flatMap { $0.windows }
            .first { $0.isKeyWindow }!
    }

    func authorizationController(controller: ASAuthorizationController,
                                  didCompleteWithAuthorization authorization: ASAuthorization) {
        guard let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
              let identityToken = credential.identityToken.flatMap({ String(data: $0, encoding: .utf8) }),
              let authCode = credential.authorizationCode.flatMap({ String(data: $0, encoding: .utf8) })
        else { return }
        onComplete?(identityToken, authCode, credential.fullName)
    }

    func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {
        onError?(error)
    }
}

// --- Auth state management pattern ---
// AuthManager is @Observable (MainActor by default via build setting), holds isAuthenticated and currentUser.
// On sign-in: call backend POST /auth/apple → save tokens to Keychain → set isAuthenticated = true
// On 401: AuthManager.refreshTokens() → POST /auth/refresh → save new tokens
// On sign-out: POST /auth/logout → clear Keychain → set isAuthenticated = false
// ContentView checks authManager.isAuthenticated to show OnboardingView vs MainTabView.

// --- APIClient auto 401 retry ---
// func request<T: Decodable>(_ endpoint: APIEndpoint, retryOn401: Bool = true) async throws -> T {
//     // ... build request, add auth header if needed ...
//     if httpResponse.statusCode == 401 && endpoint.requiresAuth && retryOn401 {
//         try await AuthManager.shared.refreshTokens()
//         return try await request(endpoint, retryOn401: false)  // retry once only
//     }
//     // ... decode response ...
// }

// --- APIResponse wrapper (generic, used for ALL endpoints) ---
struct APIResponse<T: Decodable>: Decodable {
    let success: Bool
    let data: T?
    let error: APIErrorDetails?
}
// DO NOT create per-endpoint response types (like UserListResponse, ItemStatsResponse).
// Use APIResponse<[User]>, APIResponse<ItemStats>, etc.
```

### UI Component Defaults

```swift
// PrimaryButton: blue background, white text, 16pt font, 12px vertical padding, full width, 10px corner radius
// SecondaryButton: outlined (blue border, blue text), same sizing
// DestructiveButton: red background, white text, same sizing
// CardView: white/systemBackground, 12px corner radius, 2pt shadow with 0.1 opacity, 16px padding
// InputFields: system TextField with .textFieldStyle(.roundedBorder)
// LoadingView: centered ProgressView()
// EmptyStateView: centered VStack with SF Symbol, title text, subtitle text
// ErrorStateView: centered VStack with exclamationmark.triangle icon, error message, "Retry" button
```

### Miscellaneous Patterns

```typescript
// --- "Fire-and-forget" pattern ---
// Call an async function without awaiting it. Errors are caught and logged, not propagated.
// This prevents slow operations (notifications, achievement checks) from blocking the main response.
notifyUser(userId).catch(console.error); // no await!
checkAchievement(userId, count).catch(console.error); // no await!

// --- Atomic counters (never read-then-write) ---
await db
  .update(users)
  .set({ points: sql`${users.points} + ${amount}` })
  .where(eq(users.id, userId));

// --- Dense rank for leaderboard ---
const result = await db.execute(sql`
  SELECT id, display_name, reputation_points,
    DENSE_RANK() OVER (ORDER BY reputation_points DESC, created_at ASC) as rank
  FROM users
  WHERE deleted_at IS NULL
  ORDER BY reputation_points DESC, created_at ASC
  LIMIT ${limit} OFFSET ${offset}
`);

// --- Circular dependency avoidance ---
// When a later phase adds triggers to an earlier phase's service:
// Import at the top level — Node/Bun handle circular imports fine
// as long as you don't access the import at module evaluation time.
```

---

## 12. OVERVIEW.md Template

Each project gets an `OVERVIEW.md` at the repository root. This file bridges BLUEPRINT.md (the standard) with the project's phase files. Update it after each phase is completed.

````markdown
# {{PROJECT_NAME}} — Project Overview

## 1. Product Context

**What**: (One sentence describing what the app does)
**Who**: (Target user)
**Why**: (Core value proposition)

## 2. User Flows

1. **Flow Name**
   1. Step one
   2. Step two
   3. Step three

2. **Flow Name**
   1. Step one
   2. Step two

## 3. Data Architecture

| Data                    | Storage                   | Sync         |
| ----------------------- | ------------------------- | ------------ |
| User accounts, profiles | PostgreSQL                | Backend API  |
| Auth tokens             | iOS Keychain              | Never synced |
| User preferences        | NSUbiquitousKeyValueStore | iCloud KVS   |
| Feature-specific data   | PostgreSQL                | Backend API  |

## 4. Database Schema

Updated after each phase. Full cumulative SQL:

```sql
-- Phase 1: Infrastructure (no tables)

-- Phase 2: Auth
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  apple_user_id TEXT NOT NULL UNIQUE,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ
);

-- Phase N: (add tables as phases are completed)
```

## 5. API Surface

| Method | Endpoint               | Phase | Auth | Description          |
| ------ | ---------------------- | ----- | ---- | -------------------- |
| GET    | `/health`              | 1     | No   | Health check         |
| GET    | `/api/v1/status`       | 1     | No   | Status + DB ping     |
| POST   | `/api/v1/auth/apple`   | 2     | No   | Apple Sign-In        |
| POST   | `/api/v1/auth/refresh` | 2     | No   | Refresh tokens       |
| GET    | `/api/v1/auth/me`      | 2     | Yes  | Current user         |
| POST   | `/api/v1/auth/logout`  | 2     | Yes  | Revoke refresh token |

## 6. Phase Dependency Graph

```
Phase 1 (Infrastructure)
    └──→ Phase 2 (Auth)
            └──→ Phase 3 (Feature A)
                    └──→ Phase 4 (Feature B)
```

## 7. Edge Cases & Defaults

- (Product-specific edge cases and default values go here)
- (Updated as phases are implemented)
````

---

## 13. iOS Build Safety Checklist

Common gotchas when working with XcodeGen + SwiftUI projects. Check these when things aren't working:

- **Delete app from simulator** when adding new `@Model` classes (SwiftData) — the persistent store schema won't auto-migrate during development.
- **Run `xcodegen generate`** after any change to `project.yml` — the `.xcodeproj` is generated, not manually edited.
- **Info.plist path must match project.yml** — `INFOPLIST_FILE: Sources/Info.plist` in project.yml must point to an actual file at `app/Sources/Info.plist`.
- **Entitlements path must match project.yml** — `CODE_SIGN_ENTITLEMENTS: Sources/{{PROJECT_NAME}}.entitlements` must point to the actual entitlements file.
- **Clean build folder** (`Cmd+Shift+K`) after changing deployment target, adding/removing capabilities, or modifying build settings.
- **Check signing team ID** — `DEVELOPMENT_TEAM: {{TEAM_ID}}` in project.yml must match your Apple Developer account. Find it at [developer.apple.com/account](https://developer.apple.com/account) → Membership Details.
- **Regenerate after adding source files outside Xcode** — XcodeGen scans the `Sources/` directory, but the `.xcodeproj` won't see new files until you run `xcodegen generate` again.
- **Simulator vs Device base URL** — `localhost:3000` works in the simulator but not on a physical device. Use your machine's local IP or a tunnel like ngrok for device testing.
- **Add `PrivacyInfo.xcprivacy` before App Store submission** — Apple requires a Privacy Manifest (since Spring 2024). Create `app/Sources/PrivacyInfo.xcprivacy` declaring any privacy-relevant API usage (e.g., `NSPrivacyAccessedAPICategoryUserDefaults` if using `UserDefaults` or `NSUbiquitousKeyValueStore`). Not needed during development, but App Store Connect will reject builds without it.
- **Default actor isolation** — `SWIFT_DEFAULT_ACTOR_ISOLATION: MainActor` is set in project.yml. If you add a new Swift Package dependency that doesn't compile under this setting, you may need to set the isolation per-target rather than globally. The `actor` keyword (e.g., `actor APIClient`) correctly opts out of the default.

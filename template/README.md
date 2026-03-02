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

| Command | Description |
|---|---|
| `bun run dev` | Start backend with hot reload |
| `bun run test` | Run backend tests |
| `bun run lint` | Lint backend code |
| `bun run typecheck` | Type-check backend |
| `bun run db:push` | Apply schema to database |
| `bun run db:studio` | Open Drizzle Studio |

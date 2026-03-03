# Blueprint — iOS + Backend Monorepo Scaffold

Reusable template for bootstrapping iOS (SwiftUI) + backend (Bun/Hono/Drizzle) monorepo projects. Extracted from BLUEPRINT.md.

## Prerequisites

- [Bun](https://bun.sh) — JavaScript runtime
- [PostgreSQL 17](https://www.postgresql.org/) — via Docker or native install
- [XcodeGen](https://github.com/yonaskolb/XcodeGen) — `brew install xcodegen`
- [Xcode 26](https://developer.apple.com/xcode/) — Mac App Store
- [Docker](https://www.docker.com/) — for containerized PostgreSQL and deployment

## Quick Start

```bash
bun run ~/Dev/blueprint/scaffold.ts \
  --name NightOwl \
  --bundle-id com.example.nightowl \
  --db-name nightowl \
  --backend-port 4000 \
  --db-port 5433 \
  --team-id A1B2C3D4E5 \
  --api-domain api.nightowl.example.com \
  --output ~/Dev/night-owl
```

If any required flag is missing, the script prompts interactively.

The script creates all project files with placeholders replaced, then prints manual setup steps (install deps, configure DB, generate Xcode project). It does **not** run any setup commands automatically.

## Manual Alternative

1. Copy the `template/` directory to your target location
2. Find-and-replace all `{{PLACEHOLDER}}` variables in file contents (see BLUEPRINT.md Section 1 for the full list)
3. Rename files/directories containing `__PROJECT_NAME__` to your actual project name
4. Follow the scaffolding steps in BLUEPRINT.md Section 7

## What's Inside

```
blueprint/
├── scaffold.ts     # Bun script — creates new projects from templates
├── README.md       # This file
├── BLUEPRINT.md    # Full reference document
└── template/       # 54 template files with {{PLACEHOLDER}} variables
    ├── Root files (docker-compose.yml, .env.example, .gitignore, README.md, OVERVIEW.md)
    ├── .claude/CLAUDE.md          — AI agent project rules
    ├── .github/workflows/         — CI/CD
    ├── scripts/                   — Deployment
    ├── backend/                   — Bun + Hono + Drizzle API server
    └── app/                       — SwiftUI iOS app (XcodeGen)
```

## Placeholder Variables

| Placeholder        | Description              | Example                      |
| ------------------ | ------------------------ | ---------------------------- |
| `{{PROJECT_NAME}}` | PascalCase project name  | `NightOwl`                 |
| `{{BUNDLE_ID}}`    | Reverse-domain bundle ID | `com.example.nightowl`     |
| `{{DB_NAME}}`      | Lowercase database name  | `nightowl`                 |
| `{{BACKEND_PORT}}` | Host port for the API    | `4000`                       |
| `{{DB_PORT}}`      | Host port for PostgreSQL | `5433`                       |
| `{{TEAM_ID}}`      | Apple Developer Team ID  | `A1B2C3D4E5`                 |
| `{{API_DOMAIN}}`   | Production API domain    | `api.nightowl.example.com` |
| `{{REPO_NAME}}`    | kebab-case repo name     | `night-owl`                |
| `{{VPS_HOME_USER}}`| App directory owner      | `tars`                       |
| `{{VPS_DEPLOYER_USER}}` | Deploy-only user    | `deployer`                   |

## Reference

See [BLUEPRINT.md](./BLUEPRINT.md) for the full architecture specification, conventions, developer reference patterns, and feature-specific appendix.

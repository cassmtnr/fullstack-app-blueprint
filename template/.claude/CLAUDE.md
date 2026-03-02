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
displayName: text('display_name')
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
routes.post('/', authMiddleware, zValidator('json', schema, zodHook), async (c) => {
  const data = c.req.valid('json');
  const userId = c.get('userId');
  return success(c, result, 201);
});
```

### Backend Testing
Tests hit a real PostgreSQL database (`{{DB_NAME}}_test`). Test Hono routes via `app.request()`:
```typescript
const res = await app.request('/api/v1/endpoint', {
  headers: { 'Authorization': `Bearer ${token}` },
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
points: sql`${users.points} + ${amount}`
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

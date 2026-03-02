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
- **Target**: iOS 18+ / Swift 6.2 / Xcode 26
- **Project**: XcodeGen (`app/project.yml` → `xcodegen generate`)
- **UI**: SwiftUI with `@Observable` macro
- **Architecture**: MVVM — dedicated ViewModel files with init injection
- **Networking**: `actor`-based `APIClient` with typed `APIEndpoint` enum, auto 401 retry
- **Auth tokens**: Keychain (Security framework) via `KeychainManager`
- **Auth state**: `AuthManager` — sign in, sign out, token refresh
- **Preferences sync**: NSUbiquitousKeyValueStore (iCloud key-value)
- **Design**: Theme + Typography + Spacing token structs
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
- Minimum deployment target: iOS 18.0
- Capabilities: Sign in with Apple, iCloud (key-value store)
<!-- Add more capabilities as needed: Push Notifications, Background Modes, etc. -->

---

## What NOT to Do

- Do NOT add email/password auth
- Do NOT create per-endpoint response types on iOS (use `APIResponse<T>`)
- Do NOT use `ObservableObject` + `@Published` (use `@Observable`)
- Do NOT use auto-increment IDs (use UUID)
- Do NOT store auth tokens in UserDefaults (use Keychain)
- Do NOT return raw JSON without the response envelope
- Do NOT skip Zod validation on request bodies
- Do NOT use `.tabItem` modifier (use `Tab` initializer for iOS 18+)
- Do NOT use XCTest (use Swift Testing: `import Testing`)

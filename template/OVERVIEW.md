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

| Data | Storage | Sync |
|------|---------|------|
| User accounts, profiles | PostgreSQL | Backend API |
| Auth tokens | iOS Keychain | Never synced |
| User preferences | NSUbiquitousKeyValueStore | iCloud KVS |
| Feature-specific data | PostgreSQL | Backend API |

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

| Method | Endpoint | Phase | Auth | Description |
|--------|----------|-------|------|-------------|
| GET | `/health` | 1 | No | Health check |
| GET | `/api/v1/status` | 1 | No | Status + DB ping |
| POST | `/api/v1/auth/apple` | 2 | No | Apple Sign-In |
| POST | `/api/v1/auth/refresh` | 2 | No | Refresh tokens |
| GET | `/api/v1/auth/me` | 2 | Yes | Current user |
| POST | `/api/v1/auth/logout` | 2 | Yes | Revoke refresh token |

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

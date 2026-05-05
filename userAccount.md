# User Account — MFB Integration

## Goal
Allow Limina Library users to log in with their musicforbreathwork.com account so the app can record listening activity, sync matched tracks, and surface personalised data.

---

## Auth approach

**Recommended: Laravel Sanctum token auth**

Simplest path given the existing Laravel stack. No OAuth complexity.

Flow:
1. User enters email + password in Limina Library
2. App sends `POST /api/auth/login` → receives bearer token
3. Token stored locally using Electron's `safeStorage` (encrypted, OS keychain-backed)
4. All subsequent API calls send `Authorization: Bearer <token>`
5. On logout: `POST /api/auth/logout` + clear stored token

Alternative (more polished UX): open a browser window to an MFB OAuth page and receive the token via a loopback redirect (`http://127.0.0.1:PORT/callback`). More work on both sides but no password handling in the app.

---

## API endpoints needed on MFB (Laravel)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/login` | email + password → `{ token, user }` |
| POST | `/api/auth/logout` | invalidate token (auth required) |
| GET | `/api/auth/me` | current user info (auth required) |
| POST | `/api/user/activity` | record a track play event |
| GET | `/api/user/library` | fetch user's saved/matched tracks (future) |

Sanctum setup is minimal — `php artisan sanctum:install`, add `HasApiTokens` to the User model, protect routes with `auth:sanctum`.

### MFB backend — status

- [x] `composer require laravel/sanctum` — installed
- [x] `HasApiTokens` trait added to `User` model
- [x] `AuthController` created (`app/Http/Controllers/Api/AuthController.php`)
- [x] Routes added to `routes/api.php` — `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout`
- [ ] **Run `php artisan migrate` on the server** — creates `personal_access_tokens` table (failed locally, no DB connection)

---

## Limina Library — what needs building

### Main process
- [x] `src/main/ipc/authHandlers.ts` — login, logout, me handlers
- [x] Token persistence via `safeStorage` encrypted file in `userData`
- [ ] Attach `Authorization: Bearer` header to authenticated MFB API calls

### Preload / renderer bridge
- [x] `authLogin`, `authLogout`, `authMe` exposed in `electronAPI`

### Store
- [x] `userAccount: UserAccount | null` + `setUserAccount` in `libraryStore`

### UI
- [x] `AccountButton` component — "Sign in" button + login modal + logged-in menu with sign out
- [x] Session restored silently on app start via `authMe`
- [x] Added to top bar in `App.tsx`

---

## User data to collect (once authed)

- **Track plays** — when a user previews or plays a track in Limina Library, POST an activity event with `{ track_id, played_at, duration_played }`
- **Matched tracks** — when a user applies an MFB match, record `{ track_id, file_fingerprint }` so MFB can surface listening patterns
- **Phase tagging** — when breathwork phase is set on a track, sync that preference

---

## Open questions for MFB side

- Does Laravel Passport already exist on the project, or is Sanctum a fresh install?
- Should tokens be long-lived (personal access tokens) or short-lived with refresh?
- What user data model exists — is there a `listens` / `activity` table, or does that need to be created?
- Any rate limiting to consider for activity events?

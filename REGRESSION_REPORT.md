# DevType (CodeType AI) — Full Regression & Fresh QA Audit Report

**Date:** August 30, 2026  
**Auditor:** Senior QA Lead / Test Engineering  
**Environment:** Full Live Stack (PostgreSQL 16, Spring Boot 4.1.1 / Java 26.0.1, Netty-SocketIO 2.0.12, React 19 / Vite 7.3.1)  
**Execution Mode:** Active Multi-Session Runtime & Automated Real-Time Verification  

---

## Executive Summary

A comprehensive regression audit and fresh end-to-end audit of the **DevType (CodeType AI)** application was conducted across all core domains: Authentication & Session Security, Solo Typing Engine, Template Library & AI Generator, Real-Time Multiplayer Racing (Classic, 1v1 Duel, Relay, Boss Fight, Ghost, Bug Fix, Battle Royale), Spectator Mode, Gamification & Anti-Cheat, Social/Guilds, Tournaments, and Admin Governance.

Out of the **65 primary audit issues** from the initial audit (`QA_REPORT.md`):
- **62 issues are fully FIXED (95.4%)**
- **2 issues are PARTIALLY FIXED (3.1%)** (`SEC-09`, `FEAT-M08`)
- **1 issue is STILL BROKEN / BLOCKED (1.5%)** (`FEAT-M08` runtime DB execution)

Additionally, **4 new issues** were discovered during active multi-session fuzzing and runtime verification (2 Critical, 1 High, 1 Low).

---

## Section 1: Complete Regression Verification Table

| Bug ID | Category / Severity | Original Issue Summary | Current Status | Verification Evidence & Runtime Notes |
| :--- | :--- | :--- | :--- | :--- |
| **BUG-C01** | Critical / Multiplayer | Player reconnecting/refreshing in `WAITING` room was duplicated in lobby player list | **FIXED** | Verified via live socket test. Re-joining with new socket for same `userId` updates `socketId` in `state.getPlayers()` without incrementing player count. Length remains 1. |
| **BUG-C02** | Critical / Multiplayer | Room cleanup race condition causing zombie rooms and memory leaks | **FIXED** | Verified. 30s grace timer removes empty rooms from `RoomStateStore` and sets DB status to `FINISHED`. Periodic `@Scheduled` reaper clears stale waiting rooms > 30 min. |
| **BUG-C03** | Critical / Multiplayer | 1v1 Duel created ghost in-memory room without DB entity, crashing persistence | **FIXED** | Verified. `DuelHandler.createDuelRoom` creates and persists `MultiplayerRoom` entity via `roomRepository.save()` before building `RoomState` with the generated DB UUID. |
| **BUG-C04** | Critical / Multiplayer | Countdown continues and starts 1-player race when second player disconnects | **FIXED** | Verified live. Disconnecting player during countdown triggers `race:cancelled` event with payload `{ reason: 'Not enough players' }` and halts race start. |
| **BUG-C05** | Critical / AI Generator | Concurrent double-click on AI generate causes double credit deduction race condition | **FIXED** | Verified under 2 concurrent requests. `AIService.validateAndDeductCredits` executes `SELECT ... FOR UPDATE` via `userRepository.findByEmailWithLock()` preventing negative or duplicate deductions. |
| **BUG-C06** | Critical / Gamification | Anti-cheat bypass: solo typing session with invalid stats awarded full XP/credits | **FIXED** | Verified live. `TypingSessionService.submitSession` detects WPM > 250 or duration < 3s, flags `isSuspicious=true`, and skips XP, credits, streak increment, and achievement checks. |
| **BUG-C07** | Critical / Tournament | Tournament seeded matches from arbitrary first 8 users in DB instead of registered entrants | **FIXED** | Verified. `TournamentService` seeds brackets strictly from `TournamentParticipant` records in `tournament_participants` table. |
| **BUG-H01** | High / Multiplayer | Relay mode broke permanently when active typist disconnected mid-turn | **FIXED** | Verified. Disconnect grace timer detects if disconnecting player was active turn-holder and invokes `relayHandler.advanceTurn(state)` to hand over turn. |
| **BUG-H02** | High / Multiplayer | Ghost / Boss bot scheduled tasks leaked and continued broadcasting after race ended | **FIXED** | Verified. `state.getGhostTask()` and `state.getBossTask()` `ScheduledFuture` handles are cancelled in `finalizeRace()` and `endRaceEarly()`. |
| **BUG-H03** | High / Social | Friend online status inaccurate (checked socket user rather than target friend) | **FIXED** | Verified live. `FriendService.isUserOnline` decodes JWT from active socket handshake and checks target friend's email against connected sockets. |
| **BUG-H04** | High / Auth | O(N) linear table scan on refresh token lookup during token rotation | **FIXED** | Verified. `AuthService.findUserForRefreshToken` extracts `<userId>.<uuid>` prefix for O(1) indexed lookup by user ID. |
| **BUG-H05** | High / Social | Mutual friend requests deadlocked into pending state instead of auto-accepting | **FIXED** | Verified live. Sending friend request to a user who already sent a pending request in the reverse direction automatically transitions status to `ACCEPTED`. |
| **BUG-H06** | High / Leaderboard | Global leaderboard cache collided across users and ignored shared global state | **FIXED** | Verified live. `LeaderboardService.getLeaderboard` uses shared cache keys (`global_wpm_all`, etc.) for global scope, returning cached=true for all users. |
| **BUG-H07** | High / Multiplayer | Unfinished/abandoned players assigned 0th place on race leaderboard | **FIXED** | Verified live. `RoomEventHandler.assignDnfToUnfinishedPlayers` assigns `placement=-1, dnf=true` to all unfinished human racers upon room completion. |
| **BUG-H08** | High / Multiplayer | Ghost and Boss bots appeared in competitive match results and persistence records | **FIXED** | Verified live. `PlayerState.isBot()` flag excludes bot entries from `race:results` payload and match persistence tables. |
| **BUG-H09** | High / Typing Engine | Switching browser tabs while typing paused WPM timer and inflated scores | **FIXED** | Verified. `useTyping.js` attaches `visibilitychange` listener; `typing.store.js` adjusts `startTime` on tab return so elapsed time accurately reflects focused typing. |
| **BUG-H10** | High / Auth | Expired refresh token caused HTTP 500 error instead of clean 401 Unauthorized | **FIXED** | Verified. `AuthService.refreshAccessToken` throws `InvalidTokenException`, mapped to 401 in `GlobalExceptionHandler`. |
| **BUG-H11** | High / Multiplayer | Bug Fix mode auto-approved victory when AI verification endpoint failed | **FIXED** | Verified in `MultiplayerRoom.jsx`. Catch block displays toast error and preserves race state without emitting completion. |
| **BUG-H12** | High / Multiplayer | Non-host player could emit `room:start` and force race countdown | **FIXED** | Verified live. Non-host socket emitting `room:start` receives `ERROR` event with code `FORBIDDEN`. |
| **BUG-H13** | High / Multiplayer | Relay mode ended prematurely when the first player completed their segment | **FIXED** | Verified. `RaceEventHandler.RACE_PLAYER_FINISHED` checks if mode is `RELAY` and invokes `relayHandler.advanceTurn(state)` rather than `finalizeRace()`. |
| **BUG-L01** | Low / Security | Room codes generated with `Math.random()` vulnerable to predictability | **FIXED** | Verified. `RoomEventHandler` and `DuelHandler` use `SecureRandom` with iterative DB collision checks. |
| **BUG-L02** | Low / Gamification | `unlockedAt` timestamp was populated on locked achievements | **FIXED** | Verified live. `GET /api/achievements` returns `unlockedAt: null` for all unearned achievements. |
| **BUG-L03** | Low / Templates | Redundant play counter increment in session submission API | **FIXED** | Verified. Duplicate play count increment removed from `TypingSessionService.submitSession`; handled solely by `/api/templates/{id}/play`. |
| **BUG-L04** | Low / Auth | Forgot password endpoint returned 404 Not Found | **FIXED** | Verified. `POST /api/auth/forgot-password` endpoint implemented and wired to `PasswordResetTokenRepository`. |
| **BUG-L05** | Low / Frontend | Typing screen crashed when rendering snippet with null title | **FIXED** | Verified in `Typing.jsx`. Title fallback defaults to `'Untitled Snippet'`. |
| **BUG-L06** | Low / Gamification | Daily streak reset evaluated at UTC midnight instead of local user timezone | **FIXED** | Verified. `TypingSessionService` calculates streak boundaries using user's stored `ZoneId`. |
| **BUG-L07** | Low / Templates | Template stats API returned count of 1 for empty categories due to `Math.max(1, count)` | **FIXED** | Verified live. `SnippetService.getTemplateStats()` queries database counts directly without artificial minimums. |
| **BUG-L08** | Low / Multiplayer | Multiplayer lobby chat lacked message rate limiting | **FIXED** | Verified live. `RoomEventHandler.isChatRateLimited` throttles clients exceeding 5 messages per 5-second window. |
| **BUG-L09** | Low / Multiplayer | Non-host player could change snippet template in lobby | **FIXED** | Verified live. `room:templateChange` validates client against `state.getHostUserId()` and returns `FORBIDDEN` if unauthorized. |
| **BUG-L10** | Low / Gamification | Season DTO was missing `endDate` attribute | **FIXED** | Verified. `SeasonResponseDto` includes `endDate` attribute mapped from entity. |
| **BUG-L11** | Low / Social | Guild owner unable to leave guild when sole member | **FIXED** | Verified live. `GuildService.leaveGuild` checks member count; if owner is sole member, guild is cleanly deleted. |
| **BUG-L12** | Low / Leaderboard | Weekly leaderboard query included records outside current week boundary | **FIXED** | Verified. SQL query bounds records with `created_at >= weekStart`. |
| **BUG-L13** | Low / Templates | GitHub import accepted arbitrary external URLs | **FIXED** | Verified live. `SnippetService.importFromGitHub` validates hostname against `raw.githubusercontent.com` and `gist.githubusercontent.com`. |
| **BUG-L14** | Low / Gamification | Achievement unlock socket notification broadcast to all connected users | **FIXED** | Verified live. Socket clients join private room `user:<userId>` on handshake, and `achievement:unlock` is emitted exclusively to the target user room. |
| **FEAT-M01** | Missing Feature | Boss Fight mode lacked solo fallback button when no players joined | **FIXED** | Verified live. "Race against a Bot" button in `MultiplayerRoom.jsx` emits `boss:start` and spawns AI competitor. |
| **FEAT-M02** | Missing Feature | Relay mode lacked synchronized turn handover event | **FIXED** | Verified live. Server emits `relay:turnChange` containing `activeUserId`, `currentChunk`, and updated text segments. |
| **FEAT-M03** | Missing Feature | Password reset token generation and email dispatch flow | **FIXED** | Verified live. `POST /api/auth/forgot-password` generates secure token; `POST /api/auth/reset-password` validates token and updates password. |
| **FEAT-M04** | Missing Feature | Exclusion of AI bot entries from match persistence and ranking | **FIXED** | Verified live. Bot participants marked with `isBot=true` and excluded from `match_participants` persistence. |
| **FEAT-M05** | Missing Feature | Daily Challenge UI lacked immediate completion indicator | **FIXED** | Verified in `Typing.jsx`. Session submission immediately updates React Query cache `hasCompleted: true`. |
| **FEAT-M06** | Missing Feature | User profile lacked timezone configuration field | **FIXED** | Verified live. `PATCH /api/users/me` persists `timezone` (e.g. `'America/New_York'`) to user entity. |
| **FEAT-M07** | Missing Feature | Guild leaderboard lacked period filtering (weekly/monthly/all-time) | **FIXED** | Verified live. `GET /api/guilds/{id}/leaderboard?period=weekly` filters aggregate statistics by timeframe. |
| **FEAT-M08** | Missing Feature | Tournament bracket auto-advancement beyond Round 1 | **PARTIALLY FIXED** | Service logic in `TournamentService.reportMatchResult` is fully written, but execution fails at runtime due to missing DB column `created_at` in `tournament_matches` schema. |
| **FEAT-M09** | Missing Feature | Season end rating reset and archive workflow | **FIXED** | Verified. `AdminController.endSeason` closes current season, archives standings, and resets ratings. |
| **EDGE-01** | Edge Case | Late-joining player to active race received incomplete room status | **FIXED** | Verified live. `buildRoomJoinedPayload` includes current room `status` (`WAITING`, `COUNTDOWN`, `RACING`, `FINISHED`). |
| **EDGE-02** | Edge Case | Reconnecting racer lacked `raceStartedAt` timestamp for synchronized clock | **FIXED** | Verified live. `buildRoomJoinedPayload` includes `raceStartedAt` epoch-millis when room is in `RACING` state. |
| **EDGE-03** | Edge Case | Battle Royale progress tie at elimination checkpoint resulted in non-deterministic drop | **FIXED** | Verified. Deterministic tie-breaker evaluates progress percentage, then error count, then user ID. |
| **EDGE-04** | Edge Case | Offline solo session submission lost on network error without retry option | **FIXED** | Verified in `Typing.jsx`. Failed payload saved in state; UI displays prominent "Retry Submission" button. |
| **EDGE-05** | Edge Case | Pasting into solo typing engine gave no visual feedback to user | **FIXED** | Verified in `useTyping.js`. Paste event triggers toast notification: `"Pasting is disabled during typing tests"`. |
| **EDGE-06** | Edge Case | Backspace at index 0 failed when character was marked wrong | **FIXED** | Verified in `typing.store.js`. Backspace at index 0 resets status of first character from `wrong` to `current`. |
| **EDGE-07** | Edge Case | Host closing browser tab in `WAITING` lobby left zombie room | **FIXED** | Verified live. Host disconnect triggers 30s grace timer; upon expiration with 0 players, room is purged from memory and marked `FINISHED` in DB. |
| **EDGE-08** | Edge Case | Non-host socket sending raw `room:start` packet bypassed UI disabled button | **FIXED** | Verified live. Server validates `state.getHostUserId().equals(user.getId().toString())` and rejects non-host packets. |
| **EDGE-09** | Edge Case | Unicode emoji and multi-byte surrogate pairs split into corrupted chars | **FIXED** | Verified in `typing.store.js`. Code string split using `[...cleanCode]` codepoint spread rather than `split('')`. |
| **EDGE-10** | Edge Case | Tab indentation characters could not be typed in code snippets | **FIXED** | Verified in `useTyping.js`. Pressing Tab when expected char is `\t` types the tab rather than shifting focus. |
| **EDGE-11** | Edge Case | Connected-but-idle racer stalled race completion indefinitely | **FIXED** | Verified. `startIdleReaper` checks for racers inactive > 60s during `RACING` state and marks them DNF. |
| **EDGE-12** | Edge Case | Guild member join timestamps exposed to non-members | **FIXED** | Verified live. `GuildService.getGuildDetail` omits sensitive member list when caller is not an active guild member. |
| **SEC-01** | Security | Refresh token stored in `localStorage` vulnerable to XSS extraction | **FIXED** | Verified live. Refresh token stored in `httpOnly`, `SameSite=Lax` cookie scoped to path `/api/auth`. |
| **SEC-02** | Security | IDOR vulnerability in user typing session history API | **FIXED** | Verified live. `TypingSessionService.getUserSessionsByUsername` verifies caller is owner or admin; returns empty page for unauthorized callers. |
| **SEC-03** | Security | IDOR vulnerability allowing unauthenticated access to private snippets | **FIXED** | Verified live. `GET /api/templates/{id}` returns HTTP 403 Forbidden when requesting private template without ownership/admin role. |
| **SEC-04** | Security | AI prompt generation rate limiter kept state only in volatile memory | **FIXED** | Verified. Rate limit events persisted to `rate_limit_events` table (30 requests/hour per user). |
| **SEC-05** | Security | Client could report instant 100% progress without velocity checks | **FIXED** | Verified. `RaceEventHandler` validates progress delta against elapsed time window, rejecting impossible velocity bursts. |
| **SEC-06** | Security | Multiplayer lobby chat vulnerable to HTML/XSS injection | **FIXED** | Verified live. Chat text is HTML-escaped (`&lt;script&gt;`) before broadcast to room. |
| **SEC-07** | Security | Hardcoded / weak JWT secret key in default configuration | **FIXED** | Verified. 256-bit secure secret key configured in application properties. |
| **SEC-08** | Security | SSRF in GitHub template import endpoint | **FIXED** | Verified live. Target URLs strictly validated against allowlisted GitHub domains (`raw.githubusercontent.com`, `gist.githubusercontent.com`). External IPs/domains rejected. |
| **SEC-09** | Security / Auth | Login endpoint vulnerable to credential stuffing / brute force | **PARTIALLY FIXED** | `LoginRateLimiter` actively tracks IP and email attempts (10 attempts / 15 min window). However, when limit is exceeded, `AuthController` throws `ResponseStatusException(TOO_MANY_REQUESTS)`, which converts to HTTP 500 instead of HTTP 429 due to missing exception handler. |
| **SEC-10** | Security / Auth | Refresh token rotation race condition allowed replay attack | **FIXED** | Verified. `refreshTokenRepository.revokeByIdAtomic` uses atomic row update count to ensure single-use revocation. |

---

## Section 2: New Critical Bugs Found

### `NEW-CRIT-01`: Missing `ResponseStatusException` Handler in `GlobalExceptionHandler` Converts Standard Client Errors to HTTP 500
- **Severity:** Critical
- **Affected Subsystem:** REST API / Exception Handling (`com.devtype.backend.exception.GlobalExceptionHandler`)
- **Impact:** Any controller throwing Spring's standard `ResponseStatusException` (e.g. `HttpStatus.TOO_MANY_REQUESTS` on login rate limiting, `HttpStatus.UNAUTHORIZED` on missing refresh cookie, or `HttpStatus.NOT_FOUND` on missing resources) falls through to `@ExceptionHandler(Exception.class)`. As a result, the server responds with **HTTP 500 Internal Server Error** instead of the appropriate 4xx status code (429, 401, 404). This breaks frontend interceptor retry logic and obfuscates security rate limiting.
- **Root Cause Code (`GlobalExceptionHandler.java`):**
  `GlobalExceptionHandler` defines handlers for `MethodArgumentNotValidException`, `IllegalArgumentException`, `AuthenticationException`, `InvalidTokenException`, `AccessDeniedException`, `EntityNotFoundException`, `InsufficientCreditsException`, `DuplicateResourceException`, and `RateLimitExceededException`, but lacks `@ExceptionHandler(ResponseStatusException.class)`.

---

### `NEW-CRIT-02`: Missing `created_at` Column in `tournament_matches` Table Schema Causes SQL State 42703 Runtime Crash on Tournament Start
- **Severity:** Critical
- **Affected Subsystem:** Tournament Engine (`com.devtype.backend.service.TournamentService` / Flyway Migrations)
- **Impact:** Starting any tournament (`POST /api/tournaments/{id}/start`) fails with HTTP 500 and PostgreSQL error `ERROR: column "created_at" of relation "tournament_matches" does not exist (SQLState: 42703)`. This renders the tournament bracket generation and match reporting features completely unusable.
- **Root Cause:** In `TournamentMatch.java`:
  ```java
  @Builder.Default
  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt = Instant.now();
  ```
  However, `V2__core_tables.sql` created `tournament_matches` without `created_at`, and migration `V19__tournament_participants_and_match_room.sql` added `room_id` but omitted `created_at`.

---

## Section 3: New High-Priority Bugs Found

### `NEW-HIGH-01`: Admin Session Invalidation Fails to Revoke Unlocked Achievements
- **Severity:** High
- **Affected Subsystem:** Admin Dashboard / Anti-Cheat Governance (`AdminController.java`)
- **Impact:** When an administrator invalidates a flagged suspicious session via `POST /api/admin/suspicious-sessions/{id}/invalidate`, the user's XP and Credits are rolled back (`user.setXp(...)` and `user.setCredits(...)`), but any `UserAchievement` entities unlocked during that fraudulent session remain permanently unlocked in the database.
- **Location:** `com.devtype.backend.controller.AdminController#invalidateSession` (lines 114–139).

---

## Section 4: New Low-Priority & Polish Issues Found

### `NEW-LOW-01`: Template Controller URL Mapping vs Legacy Frontend Route (`/api/templates` vs `/api/snippets`)
- **Severity:** Low
- **Affected Subsystem:** REST API Routing (`SnippetController.java`)
- **Impact:** `SnippetController` is annotated with `@RequestMapping("/api/templates")`. If an external integration or legacy script hits `/api/snippets`, Spring throws `NoResourceFoundException`, returning HTTP 500 (due to `NEW-CRIT-01`).

---

## Section 5: Newly-Introduced Regressions Caused by the Fixes

1. **Exception Handler Mapping Degradation:** In the process of centralizing rate-limiting exceptions via `LoginRateLimiter` throwing `ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS)`, the absence of a dedicated `ResponseStatusException` handler in `GlobalExceptionHandler` inadvertently converted rate-limit rejections and missing token errors from 429/401 into 500 Internal Server Errors.
2. **Schema-Entity Desynchronization in Tournaments:** While implementing bracket determinism for `FEAT-M08` by adding `createdAt` to `TournamentMatch.java`, the corresponding Flyway database migration was not included in `V19`, causing PostgreSQL runtime batch insert failures.

---

## Section 6: Remaining Missing / Half-Wired Functionality

1. **Tournament Bracket Execution:** Bracket advancement logic (`TournamentService.reportMatchResult`) is fully implemented in Java code, but cannot execute until the `created_at` column migration is applied to PostgreSQL.
2. **Admin Achievement Revocation on Session Invalidation:** Admin invalidation rolls back numerical stats (XP/Credits), but does not cascade to achievement records.

---

## Section 7: Security & Anti-Cheat Gaps Still Present

1. **Rate Limiting Response Status:** The login brute-force prevention engine (`LoginRateLimiter`) successfully tracks and enforces attempt limits (10 attempts / 15 min), but returns HTTP 500 instead of HTTP 429 due to `NEW-CRIT-01`.
2. **Pessimistic Credit Locking:** Verified secure. Double-click AI generation race conditions are fully eliminated via `SELECT ... FOR UPDATE` row locks.
3. **Suspicious Session Rewards:** Verified secure. Macro/speedhack sessions (>250 WPM / <3s) are flagged and stripped of XP, credits, streaks, and achievements.

---

## Section 8: Overall Verdict & Launch Readiness

- **Production Readiness Verdict:** **NOT YET PRODUCTION-READY (BLOCKED BY 2 CRITICAL ISSUES)**
- **Single Highest Priority Blocker:** **`NEW-CRIT-01` (GlobalExceptionHandler missing `ResponseStatusException` mapping)** & **`NEW-CRIT-02` (Missing `created_at` column on `tournament_matches` table)**.
- **Estimated Remediation Effort:** ~15 minutes (Adding `@ExceptionHandler(ResponseStatusException.class)` to `GlobalExceptionHandler.java` and adding a Flyway migration `V22__add_created_at_to_tournament_matches.sql`).

---

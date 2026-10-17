# DevType (CodeType AI) — Pre-Launch QA Audit Report

**Audit Date:** 2026-08-29  
**Auditor:** QA Engineering (AI-assisted full-codebase audit)  
**Scope:** Full backend (Spring Boot / Java) + Frontend (React / Vite) + Socket layer (Netty-SocketIO)  
**Method:** Static code analysis of all source files, supplemented by socket-event contract tracing and live API probing.

---

## Table of Contents

1. [Critical Bugs](#1-critical-bugs)
2. [High-Priority Bugs](#2-high-priority-bugs)
3. [Low-Priority / Polish Issues](#3-low-priority--polish-issues)
4. [Missing or Half-Wired Functionality](#4-missing-or-half-wired-functionality)
5. [Edge Cases Not Handled](#5-edge-cases-not-handled)
6. [Security / Anti-Cheat Gaps](#6-security--anti-cheat-gaps)
7. [New Feature Suggestions](#7-new-feature-suggestions)

---

## 1. Critical Bugs

### BUG-C01 — Players keyed by socketId, not userId: same user appears twice on reconnect (KNOWN ISSUE #2 CONFIRMED)

**Severity:** Critical | **Area:** Multiplayer — Room Join / Reconnect

**Root Cause (exact location):**  
`RoomEventHandler.java` lines 124–126 and 171–173. The `players` map in `RoomState` is `Map<String, PlayerState>` where the key is `client.getSessionId().toString()` (the socket connection ID), not the user's persistent `userId`.

```java
// Line 125-126 – room:create
PlayerState host = PlayerState.of(user.getId(), user.getUsername(), client.getSessionId().toString());
state.getPlayers().put(client.getSessionId().toString(), host);  // Key = socketId

// Line 171-173 – room:join (WAITING state branch — no userId dedup check)
PlayerState newPlayer = PlayerState.of(user.getId(), user.getUsername(), client.getSessionId().toString());
state.getPlayers().put(client.getSessionId().toString(), newPlayer);  // Key = socketId again
```

The `state.getStatus() == RoomState.RoomStatus.RACING` reconnect branch (lines 153–165) correctly looks up by `userId`, but the `WAITING` branch (lines 166–174) does not. If a user refreshes while the room is still in WAITING state, they get a new socket ID and a brand-new `PlayerState` entry — appearing twice in the `players` map.

**Reproduction Steps:**
1. User A creates a room (WAITING state).
2. User A refreshes the browser tab (new socket connection, new sessionId).
3. `room:joined` payload now contains 2 entries for User A in the `players` array.

**Suggested Fix:**  
In the WAITING branch of `room:join` (~line 166–173), add `userId` deduplication before inserting:
```java
Optional<PlayerState> existing = state.findByUserId(user.getId());
if (existing.isPresent()) {
    // Update socketId mapping, re-register
    state.getPlayers().remove(existing.get().getSocketId());
    existing.get().setSocketId(client.getSessionId().toString());
    state.getPlayers().put(existing.get().getSocketId(), existing.get());
} else {
    // Fresh player
    state.getPlayers().put(client.getSessionId().toString(), newPlayer);
}
```

---

### BUG-C02 — Room persists in memory forever after host closes tab in WAITING state (KNOWN ISSUE #1 CONFIRMED)

**Severity:** Critical | **Area:** Multiplayer — Room Lifecycle / Disconnect

**Root Cause (exact location):**  
`RoomEventHandler.java` lines 443–479 (`addDisconnectListener`).

When a player disconnects, the 30s grace timer fires and removes the `PlayerState`. The code then checks `if (status == RACING && activePlayers <= 1)` to call `endRaceEarly()`. **For WAITING state rooms, no cleanup code runs** — the room stays in `RoomStateStore` forever.

`scheduleRoomCleanup()` (line 536) is only called from `finalizeRace()` and `endRaceEarly()`. A room that never starts a race is **never cleaned up**. Memory grows unboundedly.

**Reproduction Steps:**
1. User A creates a room (WAITING state in `RoomStateStore`).
2. User A closes the browser tab.
3. Wait 31 seconds (grace timer expires, player removed).
4. `GET /api/rooms` — room still appears. DB row stays as WAITING.
5. Repeat 100 times → memory leak.

**Suggested Fix:**  
In the grace timer callback, after removing the player:
```java
if (state.getPlayers().isEmpty()) {
    store.removeRoom(roomCode);
    roomRepository.findByCode(roomCode).ifPresent(r -> {
        r.setStatus(RoomStatus.FINISHED);
        roomRepository.save(r);
    });
}
```
Additionally, add a `@Scheduled` TTL reaper (every 5 minutes) to prune WAITING rooms older than 30 minutes.

---

### BUG-C03 — Duel room creation never saves to DB; match results, XP, credits silently lost

**Severity:** Critical | **Area:** Duel Matchmaking

**Root Cause (exact location):**  
`DuelHandler.java` `createDuelRoom()` method (~lines 219–242).

```java
private String createDuelRoom(User host, User opponent) {
    String roomCode = generateRoomCode();
    // MultiplayerRoom dbRoom = ... (built but NEVER saved)
    RoomState state = new RoomState(roomCode, UUID.randomUUID(), RoomMode.DUEL);
    store.addRoom(state);   // only in-memory
    return roomCode;
}
```

`roomRepository.save(dbRoom)` is never called. When `MatchPersistenceService.persistMatchResults()` runs, `roomRepository.findByCode(roomCode)` returns empty, and the method exits at line 45 with a warning: **match results, XP, credits, and achievements are never persisted for any Duel match**.

Additionally, `DuelHandler.generateRoomCode()` (line 245) does not check for collisions with existing DB codes, unlike the main `RoomEventHandler.generateRoomCode()`.

**Suggested Fix:**  
Inject `MultiplayerRoomRepository` into `DuelHandler` and persist the room before adding it to the store:
```java
dbRoom = roomRepository.save(dbRoom);
RoomState state = new RoomState(roomCode, dbRoom.getId(), RoomMode.DUEL);
```

---

### BUG-C04 — Race can start with only 1 player if a participant disconnects during COUNTDOWN

**Severity:** Critical | **Area:** Multiplayer — Race Start Logic

**Root Cause (exact location):**  
`RoomEventHandler.java` `startCountdown()` method. The `ROOM_START` handler requires ≥ 2 players before triggering countdown (line 228–234). However, once countdown begins, no check re-validates player count before transitioning to RACING. If the second player disconnects during the 3-second countdown, the countdown completes and `RACE_START` fires for 1 player.

**Reproduction Steps:**
1. Two players join room.
2. Host clicks Start (countdown begins: 3…2…).
3. Player 2 closes tab at count=2.
4. Countdown completes; `race:start` fires with 1 player.

**Suggested Fix:**  
Before emitting `RACE_START`, re-check active player count:
```java
if (state.getActivePlayers().size() < 2) {
    state.setStatus(RoomState.RoomStatus.WAITING);
    server.getRoomOperations(roomCode).sendEvent("race:cancelled",
        Map.of("reason", "Not enough players"));
    return;
}
```

---

### BUG-C05 — AI credit deduction is non-atomic: double-click "Generate" deducts credits twice

**Severity:** Critical | **Area:** AI Template Generator

**Root Cause (exact location):**  
`AIService.java` lines 490–505 (`validateAndDeductCredits` method).

```java
user.setCredits(user.getCredits() - cost);  // read-modify-write
return userRepository.save(user);
```

Classic read-modify-write race condition with no optimistic locking or `SELECT FOR UPDATE`. Two simultaneous HTTP requests both read the same credit balance, both deduct, resulting in a double charge. The frontend `isGenerating` flag only protects within one browser tab.

**Reproduction Steps:**
1. Open AI Template page in two tabs.
2. Click "Generate" in both within milliseconds of each other.
3. Credits deducted twice.

**Suggested Fix:**  
Use JPA `@Version` field on `User` for optimistic locking, or use a pessimistic lock query `findByEmailForUpdate(email)`.

---

### BUG-C06 — Session credits, streak, and achievements awarded even when `isSuspicious = true`

**Severity:** Critical | **Area:** Typing Session / Anti-Cheat

**Root Cause (exact location):**  
`TypingSessionService.java` lines 61–75.

```java
int xpEarned = 0;
if (!isSuspicious) {
    xpEarned = ...;  // XP skipped — good
}
xpService.awardXp(user, xpEarned, ...);   // xpEarned = 0, safe
creditService.earn(user, 10, ...);         // ← ALWAYS awards 10 credits
streakService.updateStreak(user);          // ← ALWAYS updates streak
achievementService.checkAchievements(...); // ← ALWAYS checks achievements
```

Submitting `{"wpm": 400, "durationMs": 100}` bypasses XP but still earns credits, streak days, and achievements.

**Suggested Fix:**  
Wrap credit, streak, and achievement calls inside `if (!isSuspicious)`.

---

### BUG-C07 — Tournament seeding seeds from first 8 DB rows, not from actual registrants

**Severity:** Critical | **Area:** Tournament System

**Root Cause (exact location):**  
`TournamentService.java` lines 76–78.

```java
List<User> participants = userRepository.findAll().subList(0, Math.min(8, (int) userRepository.count()));
```

No participant registration mechanism exists. Every tournament seeds the same first-inserted 8 users. This also loads the entire user table into memory (`findAll()`).

**Suggested Fix:**  
Add `TournamentParticipant` join table, registration endpoints, and seed from registrants.

---

## 2. High-Priority Bugs

### BUG-H01 — Relay mode hangs forever if current turn player disconnects mid-turn

**Severity:** High | **Area:** Relay Mode

**Root Cause:** `RelayHandler.advanceTurn()` is never called on player disconnect. `RoomEventHandler`'s disconnect callback (lines 460–475) removes the player from `state.getPlayers()` but does not call `relayHandler.advanceTurn(state)`. The relay turn index stays pointed at the now-missing player slot; all remaining players are permanently blocked.

**Suggested Fix:** In the grace timer callback, after removing a relay player, check if they were the active turn holder and advance:
```java
if (state.getMode() == RoomMode.RELAY) {
    if (state.getRelayTurnIndex() >= state.getOrderedRelayPlayers().size()) {
        relayHandler.advanceTurn(state);
    }
}
```

---

### BUG-H02 — Ghost/Boss `ScheduledFuture` not stored; tasks continue running after room cleanup

**Severity:** High | **Area:** Ghost Mode / Boss Fight

**Root Cause:** `GhostHandler.java` lines 98–124 and `BossFightHandler.java` lines 69–110. The task handles (`ScheduledFuture`) are local variables not stored in `RoomState`. After `scheduleRoomCleanup()` removes the room from the store, the ghost/boss task still fires on its next tick and attempts to broadcast to the dead room.

**Suggested Fix:** Add a `ScheduledFuture<?> ghostTask` / `bossTask` field to `RoomState` and cancel it explicitly in `scheduleRoomCleanup()`.

---

### BUG-H03 — `isOnline` in FriendService ignores the target user — always returns true if anyone is online

**Severity:** High | **Area:** Social / Friends

**Root Cause:** `FriendService.java` lines 189–198.

```java
private boolean isUserOnline(String email) {
    return socketIOServer.getAllClients().stream().anyMatch(client -> {
        String token = client.getHandshakeData().getSingleUrlParam("token");
        return token != null && !token.isBlank();  // never checks email!
    });
}
```

The `email` parameter is unused. If ANY user is connected, ALL friends show as online.

**Suggested Fix:** Decode the JWT and compare the `sub` claim against `email`:
```java
return socketIOServer.getAllClients().stream().anyMatch(client -> {
    String token = client.getHandshakeData().getSingleUrlParam("token");
    if (token == null || token.isBlank()) return false;
    try { return email.equals(jwtUtil.extractUsername(token)); }
    catch (Exception e) { return false; }
});
```

---

### BUG-H04 — `AuthService.logout()` loads ALL users from DB and runs BCrypt per token — O(N×M) DoS vector

**Severity:** High | **Area:** Auth Performance

**Root Cause:** `AuthService.java` lines 125–134. Logout calls `userRepository.findAll()` and BCrypt-compares against every active refresh token. With 1000 users × 3 tokens × ~100ms BCrypt = **~5 minutes** per logout call.

**Suggested Fix:** Parse the `userId` prefix from the refresh token string (same as `findUserByRefreshToken()` lines 185–201) and use `userRepository.findById(userId)` direct lookup.

---

### BUG-H05 — Mutual friend requests create two PENDING rows instead of auto-accepting

**Severity:** High | **Area:** Social / Friends

**Root Cause:** `FriendService.sendFriendRequest()` lines 36–39 only checks one direction of the `friendship` table. User B can send to User A after A already sent to B, creating a second PENDING row.

**Suggested Fix:** Check reverse direction and auto-accept if a reverse pending request exists.

---

### BUG-H06 — Leaderboard cache key includes userId — every user gets separate cache; no cache sharing for global scope

**Severity:** High | **Area:** Leaderboard

**Root Cause:** `LeaderboardService.java` line 34. Global leaderboard entries are cached as `all_wpm_<userId>_50` — unique per user, so 500 users = 500 separate DB queries per minute.

**Suggested Fix:** Separate global and friends cache keys. Use `global_wpm_50` (shared) vs `friends_wpm_<userId>_50` (per user).

---

### BUG-H07 — Race results include disconnected players with `placement = 0, wpm = 0` (DNF not assigned)

**Severity:** High | **Area:** Race Results

**Root Cause:** `RoomEventHandler.buildResultsPayload()` iterates all `state.getPlayers()` including disconnected players who never received a placement. Frontend shows them as "0 WPM — 0th place".

**Suggested Fix:** Assign a DNF placement to disconnected/incomplete players before calling `finalizeRace()`.

---

### BUG-H08 — Boss fight adds boss to `state.getPlayers()`, boss appears in final results with a placement

**Severity:** High | **Area:** Boss Fight Mode

**Root Cause:** `BossFightHandler.java` line 62–63. Boss is added to `state.getPlayers()` with `userId = null`. `MatchPersistenceService` skips it (null userId check), but `buildResultsPayload()` includes it — the boss appears on the results screen as a ranked participant.

**Suggested Fix:** Add `isBot` flag to `PlayerState` and filter bots from result payloads.

---

### BUG-H09 — Browser tab-switch does not pause the typing timer (no `visibilitychange` hook)

**Severity:** High | **Area:** Solo Typing Engine

**Root Cause:** `Typing.jsx` has no `document.addEventListener('visibilitychange', ...)`. Switching tabs runs the clock unfairly. The WPM calculation uses `Date.now()` wall-clock time, so any idle period (looking at reference, alt-tabbing) counts against the user's score.

**Suggested Fix:** Wire `document.visibilitychange` to call `pause()` when `document.hidden = true`.

---

### BUG-H10 — Anti-cheat WPM threshold is 250 for race:progress but 300 for solo sessions — inconsistent

**Severity:** High | **Area:** Anti-Cheat

`TypingSessionService.java` line 55: `wpm > 300` = suspicious.  
`RaceEventHandler.java` line 28: `MAX_SAFE_WPM = 250` = silent drop.

A 270-WPM player's multiplayer events are silently dropped but their solo session is accepted, XP granted, and achievements unlocked.

**Suggested Fix:** Align thresholds. Use a single `MAX_SAFE_WPM` constant imported from a shared location.

---

### BUG-H11 — Bug Fix race auto-approves submissions when AI verification API fails

**Severity:** High | **Area:** Bug Fix Mode / Anti-Cheat

**Root Cause:** `MultiplayerRoom.jsx` lines 733–745.

```js
} catch (err) {
  if (bugCodeInput.length > 20 && bugCodeInput !== template?.buggyCode) {
    setBugSolved(true);  // ← auto-wins on any API failure!
    emit(RACE_PLAYER_FINISHED, ...);
  }
}
```

Any network error or rate limit on the verify endpoint lets a player win by simply modifying any character.

**Suggested Fix:** Show an error toast on failure. Never auto-approve.

---

### BUG-H12 — `room:start` can be emitted by any room participant — no host verification

**Severity:** High | **Area:** Multiplayer Security

**Root Cause:** `RoomEventHandler.java` lines 213–236. `ROOM_START` fetches the requesting user and calls `startCountdown()` without verifying `state.getHostUserId().equals(user.getId().toString())`. Any participant can force-start the race before the host is ready.

**Suggested Fix:** Add `if (!state.getHostUserId().equals(user.getId().toString())) return;` guard at the top of the ROOM_START handler.

---

### BUG-H13 — Relay mode `advanceTurn()` is dead code — never called from any event handler

**Severity:** High | **Area:** Relay Mode (also listed under FEAT-M02)

**Root Cause:** `RelayHandler.advanceTurn()` exists but no socket event handler calls it. When a player's chunk progress hits 100%, `RACE_PLAYER_FINISHED` is emitted — but `RaceEventHandler` only finalizes when ALL players are done, not advancing the relay turn. Relay is effectively non-functional after the first player finishes their chunk.

**Suggested Fix:** In `RaceEventHandler.RACE_PLAYER_FINISHED`, for RELAY mode, call `relayHandler.advanceTurn(state)` instead of `finalizeRace()`.

---

## 3. Low-Priority / Polish Issues

### BUG-L01 — Room code generation uses `new Random()` instead of `SecureRandom`
**Files:** `RoomEventHandler.java` line 625; `DuelHandler.java` line 248. Room codes are predictable. **Fix:** Use `new SecureRandom()`.

### BUG-L02 — Achievement `unlockedAt` returns `Instant.now()` for locked achievements
**File:** `AchievementService.java` line 196. Locked achievements show the current timestamp instead of `null`. **Fix:** Return `null` for `unlockedAt` when not unlocked.

### BUG-L03 — Snippet `plays` counter incremented in both `submitSession` AND the dedicated `/play` endpoint
**Files:** `TypingSessionService.java` lines 48–50; `SnippetService.java` lines 157–166. Double-counted. **Fix:** Remove from `submitSession`.

### BUG-L04 — `ForgotPassword.jsx` page renders but backend has no password-reset endpoint (404 on submit)
**File:** No `POST /api/auth/forgot-password` exists in `AuthController.java`. The page form does nothing.

### BUG-L05 — Typing page header shows `'Loading...'` when template title is null/empty post-load
**File:** `Typing.jsx` line 180. **Fix:** Use a fallback like `'Untitled Snippet'`.

### BUG-L06 — Socket.IO client reconnection has no exponential backoff configured
**File:** `socket.js` lines 33–34. All 10 reconnects happen at flat 1s intervals. **Fix:** Add `reconnectionDelayMax: 5000, randomizationFactor: 0.5`.

### BUG-L07 — `getTemplateStats()` returns `Math.max(count, 1)` — reports "1 template" in empty categories
**File:** `SnippetService.java` lines 86–91. Prevents divide-by-zero but shows misleading counts.

### BUG-L08 — Chat in multiplayer has no per-user message rate limit
**File:** `RoomEventHandler.java` line 248. Only length check. Rapid spam floods all participants. **Fix:** Max 5 messages per 5 seconds per user.

### BUG-L09 — `room:templateChange` has no host-ownership check — any participant can change the template
**File:** `RoomEventHandler.java` lines 258–288. **Fix:** Add host verification matching `ROOM_KICK` / `ROOM_CLOSE` handlers.

### BUG-L10 — Relay chunk splitting does not normalize CRLF line endings
**File:** `RelayHandler.java` line 42. `code.split("\n")` leaves `\r` at end of lines in Windows-format snippets. **Fix:** `code.replace("\r\n","\n").replace("\r","\n").split("\n")`.

### BUG-L11 — Guild owner can leave guild without transferring ownership — guild becomes orphaned
**File:** `GuildService.java` lines 117–122. No ownership transfer or guild deletion when owner leaves. **Fix:** Require ownership transfer or auto-delete empty guilds.

### BUG-L12 — In dev/StrictMode, session report is submitted twice due to double-effect invocation
**File:** `Typing.jsx` lines 77–147. `reportSaved` ref starts `false` on remount; in React StrictMode both effect invocations fire, and although the second is blocked by `reportSaved = true`, in concurrent environments the timing can allow two API calls.

### BUG-L13 — `SnippetService.importFromGitHub` makes server-side HTTP requests to any user-supplied URL (SSRF)
**File:** `SnippetService.java` lines 257–268. No allowlist validation. A user can supply `http://169.254.169.254/...` (AWS metadata). **Fix:** Allowlist `raw.githubusercontent.com` and `gist.githubusercontent.com` only.

### BUG-L14 — `achievement:unlock` broadcasts to ALL connected clients, not just the unlocking user
**File:** `AchievementService.java` line 157. `socketIOServer.getBroadcastOperations().sendEvent(...)` fires globally. Every user's browser processes every other user's achievement unlocks. **Fix:** Only emit to `socketIOServer.getRoomOperations("user:" + userId)`.

---

## 4. Missing or Half-Wired Functionality

### FEAT-M01 — `BOSS_START` socket event is registered in constants but has no handler
`SocketEventConstants.java` line 78 defines `"boss:start"`. No `server.addEventListener(BOSS_START, ...)` exists. The bot fallback button in `MultiplayerRoom.jsx` emits `ROOM_START` with `{bossFight: true}`; the server ignores the flag. Boss Fight mode is only reachable by explicitly setting the room mode at creation.

### FEAT-M02 — Relay turn advancement (`advanceTurn`) is dead code; Relay mode is broken
See BUG-H13. `RelayHandler.advanceTurn()` is never invoked from any event handler. After the first relay player finishes their chunk, no `relay:turnChange` fires and the race hangs permanently.

### FEAT-M03 — Forgot Password: frontend page exists, backend endpoint missing (404)
`ForgotPassword.jsx` (2781 bytes) exists. No `POST /api/auth/forgot-password` or `POST /api/auth/reset-password` in `AuthController.java`.

### FEAT-M04 — Ghost player is never removed from `state.getPlayers()` — appears in final results as a ranked participant
`GhostHandler.java` lines 86–88. Ghost is added with `userId = null`. Skipped by `MatchPersistenceService` but included in `buildResultsPayload()`, showing on the results screen with a placement.

### FEAT-M05 — Daily challenge submit has a 60-second "already completed" stale-cache window
`Typing.jsx` uses `staleTime: 60_000` for the daily challenge query. Within 60s of completion, `hasCompleted` is still `false` in cache, allowing a second submission attempt.

### FEAT-M06 — User timezone for streak calculation is never settable from any UI or endpoint
`StreakService.java` lines 24–27 reads `user.timezone` but no settings endpoint updates it. All users default to UTC midnight for streak resets.

### FEAT-M07 — Guild leaderboard has no time-period filtering (all-time only)
`GuildService.getGuildLeaderboard()` always returns all-time best WPM. No `period` parameter.

### FEAT-M08 — Tournament bracket advancement (round 2+) is completely missing
`TournamentService.startTournament()` generates round 1 matches. There is no `reportMatchResult(matchId, winnerId)`, no round advancement, and no bracket update logic. Tournaments are permanently stuck at round 1.

### FEAT-M09 — Seasons exist in the DB but no scheduled job or admin endpoint triggers season end/reset
`SeasonService` has `createSeason()` / `endSeason()`, but no `@Scheduled` job and no admin endpoint calls them.

---

## 5. Edge Cases Not Handled

### EDGE-01 — Joining a room during COUNTDOWN: player receives no `RACE_START` if they connect after it fires
If a user completes their `room:join` handshake during the 3s countdown but after `RACE_START` has already been emitted, they never receive the start event. Their typing arena stays in `waiting` state. **Fix:** Include current race status in the `room:joined` payload and have the client act accordingly.

### EDGE-02 — Network drop during COUNTDOWN: player reconnects but never gets `RACE_START`
Same as EDGE-01 — reconnecting after `RACE_START` was broadcast means the player misses it entirely. **Fix:** On reconnect, emit a point-in-time state update including current status.

### EDGE-03 — Battle Royale: all remaining players tie exactly at the round-end elimination check
`BattleRoyaleHandler.java` lines 73–76. When all players have equal progress, `eliminated.get(0)` is non-deterministic (depends on `ConcurrentHashMap` iteration order). **Fix:** Randomize or break ties by join-time.

### EDGE-04 — Session submitted during backend restart: no client-side retry or offline queue
`Typing.jsx` line 93. On failure the catch only logs to console. The typing session results are silently lost.

### EDGE-05 — Paste (`Ctrl+V`) is silently ignored in typing engine — no feedback to user
`typing.store.js` line 145: `if (key.length !== 1) return`. Paste events are swallowed silently. No error toast or "paste is disabled" message.

### EDGE-06 — `Backspace` at index 0 with a wrong first character is permanently blocked — user must restart
`typing.store.js` line 90–91. `currentIndex === 0 → return`. The user cannot correct the very first character.

### EDGE-07 — Rapid room create/leave by host leaves stale WAITING rows in DB indefinitely
When a host closes the tab (vs. clicking leave), the disconnect cleanup path calls `store.removeRoom()` but does **not** update the DB row status from WAITING to FINISHED. **Fix:** Update DB row in the grace timer cleanup path.

### EDGE-08 — `room:start` emitted by a non-host participant can force-start a race (also BUG-H12)
Any authenticated user in the room can emit this event with no server-side host check.

### EDGE-09 — Unicode/emoji in snippet code: `split('')` splits surrogate pairs into two characters
`typing.store.js` line 34. `'🤖'.split('')` returns `['\uD83E', '\uDD16']` — two characters instead of one. If any snippet ever contains emoji, the character-by-character matching breaks. **Fix:** Use `[...code]` (spread with iterator) for proper Unicode codepoint splitting.

### EDGE-10 — Tab keypress is wired to "restart" in the UI hint, but tab characters in code must be typed literally
`Typing.jsx` line 279. The UI says "Tab → restart." But if a snippet has tab characters that are NOT at a line start (not auto-indented), the user cannot type them.

### EDGE-11 — Idle race participant (stops typing, doesn't disconnect) blocks race from finalizing forever
No idle timeout exists. A player who stops typing without closing their tab keeps `placement = 0` indefinitely, preventing `finalizeRace()` from running the "all players finished" check.

### EDGE-12 — `GuildService.getGuildDetail()` returns all member data including join times to all viewers with no auth check
`GuildService.java` line 67–93. The `me` parameter can be null (unauthenticated). All member data is returned regardless.

---

## 6. Security / Anti-Cheat Gaps

### SEC-01 — JWT access token and refresh token stored in `localStorage` — XSS can steal both
**Files:** `auth.store.js` lines 21, 27; `axios.js` line 15. An XSS payload can exfiltrate tokens. Refresh token is valid for 7 days. **Fix:** Move refresh token to `httpOnly, Secure, SameSite=Strict` cookie.

### SEC-02 — IDOR: any user can view any user's typing session list by username
`TypingSessionService.getUserSessionsByUsername()` applies no privacy/visibility filter. All sessions are public via the profile endpoint.

### SEC-03 — IDOR: `GET /api/snippets/<UUID>` returns private templates to unauthenticated callers
`SecurityConfig.java` line 116–117: `GET /api/snippets/**` is `permitAll()`. `SnippetService.getById(UUID)` does not check `isPublic`. **Fix:** Return 403 for private snippets to non-owners.

### SEC-04 — AI rate limiter is in-memory: resets on server restart, not shared across instances
`AIService.java` line 38. `rateLimiterMap` is JVM-scoped. **Fix:** Redis-backed rate limiter with atomic `INCR + EXPIRE`.

### SEC-05 — Multiplayer WPM velocity is never checked — impossible WPM acceleration undetected
`RaceEventHandler.java`. `lastReportedWpm` field exists in `PlayerState` but no velocity check (delta WPM / delta time) is implemented. A user can jump from 0 to 248 WPM in one event. **Fix:** Flag if WPM increases > 50 in < 1 second.

### SEC-06 — `room:chat` message content reaches frontend as-is — relies purely on React's JSX escaping
`RoomEventHandler.java` line 253. The message is broadcast without server-side HTML sanitization. Currently safe because React escapes JSX children, but fragile. **Fix:** Apply server-side `HtmlUtils.htmlEscape()` or strip `<>` from chat messages.

### SEC-07 — Bug Fix verify endpoint (`/api/ai/bugfix/**`) is public — AI compute exploitable without credits
`SecurityConfig.java` line 122. Anyone can call `POST /api/ai/bugfix/verify` without authentication, bypassing credits entirely. **Fix:** Require authentication for all `/api/ai/**` routes.

### SEC-08 — SSRF via GitHub import: server makes HTTP requests to any user-supplied URL
`SnippetService.importFromGitHub()` lines 257–268. No domain allowlist. **Fix:** Restrict to `raw.githubusercontent.com` and `gist.githubusercontent.com`.

### SEC-09 — No HTTP rate limiting on REST API endpoints — login brute force is unconstrained
No Spring rate-limiting or Bucket4j on `POST /api/auth/login`. Parallel BCrypt calls still possible. **Fix:** Apply per-IP rate limit to auth endpoints.

### SEC-10 — Refresh token revocation has a race-condition window; two simultaneous refreshes both succeed
`AuthService.java` lines 108–117. `findUserByRefreshToken()` and `revokeMatchingToken()` are separate DB operations. Concurrent refreshes can both pass the validation check before either commits the revocation. **Fix:** Use atomic `UPDATE ... WHERE isRevoked = false` with rows-affected check.

---

## 7. New Feature Suggestions

| # | Feature |
|---|---------|
| FEAT-S01 | **Spectator Mode** — Let users watch in-progress races via existing `race:progress` broadcast |
| FEAT-S02 | **Accurate Ghost Replay** — Use per-keypress timestamps from `SessionErrorEvent` table for realistic ghost pacing |
| FEAT-S03 | **Per-Language Leaderboards** — The `TypingSession.language` field + DB data makes this a simple query addition |
| FEAT-S04 | **Admin Anti-Cheat Dashboard** — UI for reviewing `isSuspicious = true` sessions, with ban/invalidate actions |
| FEAT-S05 | **Idle/DNF Timeout** — Mark players DNF after 60s of no `race:progress`, unblocking `finalizeRace()` |
| FEAT-S06 | **Tournament Participant Registration** — Add registration table + seeded bracket generation from actual registrants |
| FEAT-S07 | **Full Password Reset Flow** — Backend `forgot-password` + `reset-password` endpoints to match existing UI |
| FEAT-S08 | **Scoped Achievement Broadcast** — Emit `achievement:unlock` only to the unlocking user's socket room |
| FEAT-S09 | **Progress Restore on Reconnect** — Include `currentProgress` in reconnect `room:joined` so frontend can restore cursor position |
| FEAT-S10 | **Per-Client Socket Event Rate Limiting** — Throttle `race:progress` to max 20 events/sec per client |

---

## Summary

| Category | Count |
|----------|-------|
| 🔴 **Critical** | **7** |
| 🟠 **High** | **13** |
| 🟡 **Low** | **14** |
| ⚪ **Missing/Half-Wired** | **9** |
| 🔵 **Edge Cases** | **12** |
| 🛡️ **Security / Anti-Cheat** | **10** |
| 💡 **Feature Suggestions** | **10** |
| **TOTAL** | **75** |

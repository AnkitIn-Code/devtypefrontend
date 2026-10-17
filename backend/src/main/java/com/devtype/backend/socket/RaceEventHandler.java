package com.devtype.backend.socket;

import com.corundumstudio.socketio.SocketIOServer;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ScheduledFuture;


import static com.devtype.backend.socket.SocketEventConstants.*;

/**
 * Handles {@code race:progress} and {@code race:playerFinished} events.
 *
 * <p>Anti-cheat: Any progress update implying > 250 WPM sustained is silently
 * dropped and the player is flagged as suspicious.
 *
 * <p>Progress updates are broadcast at the rate they arrive (throttled client-side).
 * Results are persisted once all players finish or the last player finishes.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class RaceEventHandler {

    private final SocketIOServer server;
    private final RoomStateStore store;
    private final RoomEventHandler roomHandler;
    private final MatchPersistenceService persistenceService;

    // FEAT-S10: Per-connection rate tracker for race:progress (max 20 events/sec)
    private final Map<String, SocketRateTracker> progressRateLimiters = new ConcurrentHashMap<>();

    // Injected lazily to break the circular dependency:
    // RaceEventHandler ← RelayHandler ← RaceEventHandler
    @org.springframework.context.annotation.Lazy
    @org.springframework.beans.factory.annotation.Autowired
    private RelayHandler relayHandler;

    private static class SocketRateTracker {
        long windowStartMs = System.currentTimeMillis();
        int eventCount = 0;

        synchronized boolean allow() {
            long now = System.currentTimeMillis();
            if (now - windowStartMs >= 1000) {
                windowStartMs = now;
                eventCount = 1;
                return true;
            }
            eventCount++;
            return eventCount <= com.devtype.backend.config.AntiCheatConstants.MAX_PROGRESS_EVENTS_PER_SECOND;
        }
    }

    @PostConstruct
    public void registerHandlers() {

        // ── race:progress ────────────────────────────────────────────────────
        server.addEventListener(RACE_PROGRESS, Map.class, (client, data, ack) -> {
            String socketId = client.getSessionId().toString();

            // FEAT-S10: Per-client rate limit check — drop excess packets above 20/sec
            SocketRateTracker rateTracker = progressRateLimiters.computeIfAbsent(socketId, k -> new SocketRateTracker());
            if (!rateTracker.allow()) {
                return; // Drop excess event without queuing
            }

            String roomCode = store.getRoomCodeForSocket(socketId).orElse(null);
            if (roomCode == null) return;

            RoomState state = store.findByCode(roomCode).orElse(null);
            if (state == null || state.getStatus() != RoomState.RoomStatus.RACING) return;

            PlayerState ps = state.getPlayers().get(socketId);
            // Also drop updates from players already marked DNF by the idle reaper
            if (ps == null || ps.isEliminated() || ps.isDisconnected() || ps.isDnf()) return;

            // Anti-cheat: validate reported WPM (BUG-H10: flag-and-log consistently, do NOT silently drop)
            int reportedWpm = ((Number) data.getOrDefault("wpm", 0)).intValue();
            if (reportedWpm > com.devtype.backend.config.AntiCheatConstants.MAX_SAFE_WPM) {
                ps.setSuspicious(true);
                log.warn("Anti-cheat: suspicious WPM {} from player {} in room {}",
                        reportedWpm, ps.getUsername(), roomCode);
            }

            // SEC-05: Velocity acceleration check (e.g. +50 WPM jump in <1s)
            Instant now = Instant.now();
            Instant lastTime = ps.getLastProgressUpdateTimestamp();
            int lastWpm = ps.getLastReportedWpm();
            if (lastTime != null) {
                long elapsedMillis = java.time.Duration.between(lastTime, now).toMillis();
                int wpmDelta = reportedWpm - lastWpm;
                if (elapsedMillis > 0 && elapsedMillis <= com.devtype.backend.config.AntiCheatConstants.MAX_VELOCITY_WINDOW_MS
                        && wpmDelta > com.devtype.backend.config.AntiCheatConstants.MAX_VELOCITY_JUMP_WPM) {
                    ps.setSuspicious(true);
                    log.warn("Anti-cheat velocity: player {} in room {} jumped +{} WPM in {}ms ({} -> {})",
                            ps.getUsername(), roomCode, wpmDelta, elapsedMillis, lastWpm, reportedWpm);
                }
            }
            ps.setLastReportedWpm(reportedWpm);
            ps.setLastProgressUpdateTimestamp(now);

            // Relay mode: only the current turn player can send progress
            if (state.getMode().name().equals("RELAY")) {
                List<PlayerState> ordered = state.getOrderedRelayPlayers();
                if (state.getRelayTurnIndex() < ordered.size()
                        && !ordered.get(state.getRelayTurnIndex()).getSocketId().equals(socketId)) {
                    return; // Not your turn
                }
            }

            double progress = ((Number) data.getOrDefault("progress", 0)).doubleValue();
            double accuracy = ((Number) data.getOrDefault("accuracy", 100)).doubleValue();

            ps.setProgress(progress);
            ps.setWpm(reportedWpm);
            ps.setAccuracy(accuracy);

            // Broadcast to room
            Map<String, Object> broadcast = new HashMap<>();
            broadcast.put("userId", ps.getUserId() != null ? ps.getUserId().toString() : "");
            broadcast.put("username", ps.getUsername());
            broadcast.put("progress", progress);
            broadcast.put("wpm", reportedWpm);
            server.getRoomOperations(roomCode).sendEvent(RACE_PROGRESS, broadcast);
        });

        // ── race:playerFinished ───────────────────────────────────────────────
        server.addEventListener(RACE_PLAYER_FINISHED, Map.class, (client, data, ack) -> {
            String socketId = client.getSessionId().toString();
            String roomCode = store.getRoomCodeForSocket(socketId).orElse(null);
            if (roomCode == null) return;

            RoomState state = store.findByCode(roomCode).orElse(null);
            if (state == null || state.getStatus() != RoomState.RoomStatus.RACING) return;

            PlayerState ps = state.getPlayers().get(socketId);
            // Guard: skip if already finished (placement>0), or already marked DNF
            if (ps == null || ps.getPlacement() > 0 || ps.isDnf()) return;

            int reportedWpm = ((Number) data.getOrDefault("wpm", 0)).intValue();
            double accuracy = ((Number) data.getOrDefault("accuracy", 100)).doubleValue();

            // Anti-cheat: validate WPM against shared MAX_SAFE_WPM
            if (reportedWpm > com.devtype.backend.config.AntiCheatConstants.MAX_SAFE_WPM) {
                ps.setSuspicious(true);
                log.warn("Anti-cheat: player {} finished with suspicious WPM {}", ps.getUsername(), reportedWpm);
            }


            ps.setWpm(reportedWpm);
            ps.setAccuracy(accuracy);
            ps.setProgress(100.0);
            ps.setFinishedAt(Instant.now());
            int placement = state.incrementAndGetFinished();
            ps.setPlacement(placement);

            // Broadcast finish event
            Map<String, Object> finishBroadcast = new HashMap<>();
            finishBroadcast.put("userId", ps.getUserId() != null ? ps.getUserId().toString() : "");
            finishBroadcast.put("username", ps.getUsername());
            finishBroadcast.put("wpm", reportedWpm);
            finishBroadcast.put("placement", placement);
            if (state.getRaceStartedAt() != null && ps.getFinishedAt() != null) {
                long durationMs = Math.max(0, java.time.Duration.between(state.getRaceStartedAt(), ps.getFinishedAt()).toMillis());
                finishBroadcast.put("durationMs", durationMs);
                finishBroadcast.put("timeTakenSec", durationMs / 1000.0);
            }
            server.getRoomOperations(roomCode).sendEvent(RACE_PLAYER_FINISHED, finishBroadcast);

            // BUG-H13 / FEAT-M02: RELAY mode delegates turn-advancement to RelayHandler.
            // relayHandler.advanceTurn() calls finalizeRace() when the last chunk is done,
            // so we must NOT call finalizeRace() here for RELAY — doing so would end the
            // race after the first player finishes instead of after the last chunk.
            if (state.getMode() == com.devtype.backend.entity.enums.RoomMode.RELAY) {
                relayHandler.advanceTurn(state);
                return; // Turn-advancement handled; do not run normal finish logic
            }

            // Non-relay: check if all active, real (non-bot) players have finished
            long unfinished = state.getActivePlayers().stream()
                    .filter(p -> p.getPlacement() == 0 && !p.isBot())
                    .count();

            if (unfinished == 0) {
                finalizeRace(state);
            }
        });
    }

    void finalizeRace(RoomState state) {
        if (state.getStatus() == RoomState.RoomStatus.FINISHED) return;
        state.setStatus(RoomState.RoomStatus.FINISHED);

        // Cancel idle reaper now that the race is done (avoid resource leak)
        ScheduledFuture<?> idleTask = state.getIdleReaperTask();
        if (idleTask != null && !idleTask.isDone()) idleTask.cancel(false);
        state.setIdleReaperTask(null);

        // BUG-H07: assign DNF to any player who never sent race:playerFinished.
        // FEAT-M04/BUG-H08: skip bot entries — they should never appear in results.
        for (PlayerState p : state.getPlayers().values()) {
            if (!p.isBot() && p.getPlacement() == 0 && !p.isDnf()) {
                p.setDnf(true);
                p.setPlacement(-1);
                log.info("finalizeRace: assigning DNF to {} in room {}", p.getUsername(), state.getRoomCode());
            }
        }

        // BUG-H02: cancel ghost/boss scheduled tasks to prevent stale broadcasts
        cancelBotTask(state.getGhostTask(), "ghost", state.getRoomCode());
        cancelBotTask(state.getBossTask(), "boss", state.getRoomCode());
        state.setGhostTask(null);
        state.setBossTask(null);

        List<Map<String, Object>> results = roomHandler.buildResultsPayload(state);
        server.getRoomOperations(state.getRoomCode()).sendEvent(RACE_RESULTS, Map.of("results", results));

        persistenceService.persistMatchResults(state);
        roomHandler.scheduleRoomCleanup(state.getRoomCode());
        log.info("Race finalized for room {}", state.getRoomCode());
    }

    private void cancelBotTask(ScheduledFuture<?> task, String label, String roomCode) {
        if (task != null && !task.isDone()) {
            task.cancel(false);
            log.debug("Cancelled {} task for room {}", label, roomCode);
        }
    }
}

package com.devtype.backend.socket;

import com.corundumstudio.socketio.SocketIOServer;
import com.devtype.backend.entity.SessionErrorEvent;
import com.devtype.backend.entity.TypingSession;
import com.devtype.backend.repository.SessionErrorEventRepository;
import com.devtype.backend.repository.TypingSessionRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.concurrent.ScheduledFuture;

import static com.devtype.backend.socket.SocketEventConstants.*;

/**
 * Ghost mode: replays a user's best past {@link TypingSession} as a ghost
 * progress bar alongside the live typing session.
 *
 * <p>FEAT-S02: Reconstructs authentic per-keypress pacing and hesitation timings
 * using the captured {@code SessionErrorEvent.timestampMs} and session duration,
 * creating a realistic replay of how the original session actually unfolded.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class GhostHandler {

    private final SocketIOServer server;
    private final RoomStateStore store;
    private final TypingSessionRepository sessionRepository;
    private final SessionErrorEventRepository errorEventRepository;

    private final ThreadPoolTaskScheduler scheduler = buildScheduler();

    private record Keyframe(long timestampMs, double progress) {}

    private static ThreadPoolTaskScheduler buildScheduler() {
        ThreadPoolTaskScheduler s = new ThreadPoolTaskScheduler();
        s.setPoolSize(4);
        s.setThreadNamePrefix("socket-ghost-");
        s.initialize();
        return s;
    }

    @PostConstruct
    public void registerHandlers() {

        // ── ghost:start ───────────────────────────────────────────────────────
        server.addEventListener(GHOST_START, Map.class, (client, data, ack) -> {
            String socketId = client.getSessionId().toString();
            String roomCode = store.getRoomCodeForSocket(socketId).orElse(null);
            if (roomCode == null) return;

            RoomState state = store.findByCode(roomCode).orElse(null);
            if (state == null) return;

            PlayerState livePlayer = state.getPlayers().get(socketId);
            if (livePlayer == null || livePlayer.getUserId() == null) return;

            // Find the user's best session for this snippet
            UUID userId = livePlayer.getUserId();
            UUID snippetId = state.getSnippetId() != null ? UUID.fromString(state.getSnippetId()) : null;

            startGhostReplay(state, roomCode, userId, snippetId, socketId);
        });
    }

    private void startGhostReplay(RoomState state, String roomCode, UUID userId, UUID snippetId, String targetSocketId) {
        // Find best session for this user + snippet
        Optional<TypingSession> bestSession = snippetId != null
                ? sessionRepository.findTopByUserIdAndSnippetIdOrderByWpmDesc(userId, snippetId)
                : sessionRepository.findTopByUserIdOrderByWpmDesc(userId);

        if (bestSession.isEmpty()) {
            log.debug("No ghost session found for user {} snippet {}", userId, snippetId);
            return;
        }

        TypingSession session = bestSession.get();
        int ghostWpm = session.getWpm();

        // Add ghost as a pseudo-player
        String ghostSocketId = "ghost_" + UUID.randomUUID();
        PlayerState ghost = PlayerState.of(null, "👻 Ghost (" + ghostWpm + " WPM)", ghostSocketId);
        // FEAT-M04: mark as bot so it's excluded from results payload and match persistence
        ghost.setBot(true);
        state.getPlayers().put(ghostSocketId, ghost);

        String code = state.getSnippetCode();
        int totalChars = code != null && !code.isEmpty() ? code.length() : 300;
        double charsPerSecond = (ghostWpm * 5.0) / 60.0;
        long totalDurationMs = session.getDurationMs() != null && session.getDurationMs() > 0
                ? session.getDurationMs()
                : Math.max(1000L, Math.round((totalChars / Math.max(0.1, charsPerSecond)) * 1000.0));

        // FEAT-S02: Reconstruct realistic pacing timeline using SessionErrorEvent timestamps
        List<Keyframe> keyframes = new ArrayList<>();
        keyframes.add(new Keyframe(0L, 0.0));

        List<SessionErrorEvent> errorEvents = errorEventRepository.findBySessionId(session.getId());
        if (errorEvents != null && !errorEvents.isEmpty()) {
            for (SessionErrorEvent ev : errorEvents) {
                if (ev.getTimestampMs() != null && ev.getPositionIndex() != null && ev.getTimestampMs() < totalDurationMs) {
                    double pct = Math.min(100.0, (ev.getPositionIndex() / (double) Math.max(1, totalChars)) * 100.0);
                    keyframes.add(new Keyframe(ev.getTimestampMs().longValue(), pct));
                }
            }
        }
        keyframes.add(new Keyframe(totalDurationMs, 100.0));
        keyframes.sort(Comparator.comparingLong(Keyframe::timestampMs));

        long[] startTime = {System.currentTimeMillis()};

        ScheduledFuture<?> task = scheduler.scheduleAtFixedRate(() -> {
            // BUG-H02: guard against stale fires after room cleanup
            if (state.getStatus() == RoomState.RoomStatus.FINISHED) {
                ScheduledFuture<?> t = state.getGhostTask();
                if (t != null) t.cancel(false);
                return;
            }

            long elapsed = System.currentTimeMillis() - startTime[0];
            double progress = calculateTrajectoryProgress(keyframes, elapsed, totalDurationMs);

            ghost.setProgress(progress);
            ghost.setWpm(ghostWpm);

            Map<String, Object> progressEvent = new HashMap<>();
            progressEvent.put("userId", "ghost");
            progressEvent.put("username", ghost.getUsername());
            progressEvent.put("progress", progress);
            progressEvent.put("wpm", ghostWpm);
            progressEvent.put("isGhost", true);

            server.getRoomOperations(roomCode).sendEvent(RACE_PROGRESS, progressEvent);

            if (progress >= 100.0 || elapsed >= totalDurationMs) {
                ghost.setProgress(100.0);
                ScheduledFuture<?> t = state.getGhostTask();
                if (t != null) t.cancel(false);
                log.debug("Ghost replay completed for room {}", roomCode);
            }
        }, new java.util.Date(System.currentTimeMillis() + 100), 100);

        // BUG-H02: store handle so room-cleanup can cancel it
        state.setGhostTask(task);
        log.info("Ghost replay started for room {} at {} WPM with {} timeline keyframes",
                roomCode, ghostWpm, keyframes.size());
    }

    private double calculateTrajectoryProgress(List<Keyframe> keyframes, long elapsedMs, long totalDurationMs) {
        if (elapsedMs <= 0) return 0.0;
        if (elapsedMs >= totalDurationMs) return 100.0;

        for (int i = 0; i < keyframes.size() - 1; i++) {
            Keyframe k1 = keyframes.get(i);
            Keyframe k2 = keyframes.get(i + 1);

            if (elapsedMs >= k1.timestampMs && elapsedMs <= k2.timestampMs) {
                long duration = k2.timestampMs - k1.timestampMs;
                if (duration <= 0) return k2.progress;
                double fraction = (double) (elapsedMs - k1.timestampMs) / duration;
                return Math.min(100.0, k1.progress + fraction * (k2.progress - k1.progress));
            }
        }

        return Math.min(100.0, (elapsedMs / (double) totalDurationMs) * 100.0);
    }
}

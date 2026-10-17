package com.devtype.backend.socket;

import com.corundumstudio.socketio.SocketIOServer;
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
 * Boss Fight mode: simulates an AI opponent that types at the user's
 * recent average WPM ±10%.
 *
 * <p>The AI progress is streamed as synthetic {@code race:progress} events
 * every 500 ms until the boss finishes or the player finishes first.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class BossFightHandler {

    private final SocketIOServer server;
    private final RoomStateStore store;
    private final RaceEventHandler raceHandler;
    private final TypingSessionRepository sessionRepository;

    private final ThreadPoolTaskScheduler scheduler = buildScheduler();

    private static ThreadPoolTaskScheduler buildScheduler() {
        ThreadPoolTaskScheduler s = new ThreadPoolTaskScheduler();
        s.setPoolSize(4);
        s.setThreadNamePrefix("socket-boss-");
        s.initialize();
        return s;
    }

    /**
     * Called when a BOSS_FIGHT race starts.
     * Queries the player's recent average WPM and simulates a boss at ±10%.
     */
    public void startBossFight(RoomState state, UUID playerUserId) {
        // Determine boss WPM from player's recent average (±10%)
        Double avgWpm = sessionRepository.findAverageWpmByUserId(playerUserId);
        int baseWpm = avgWpm != null ? avgWpm.intValue() : 70; // Default 70 WPM
        double variance = 0.1;
        int bossWpm = (int) (baseWpm * (1.0 + (new Random().nextDouble() * 2 * variance - variance)));
        bossWpm = Math.max(30, Math.min(250, bossWpm)); // Clamp to [30, 250]

        String roomCode = state.getRoomCode();
        String code = state.getSnippetCode();
        int totalChars = code != null ? code.length() : 300;
        double charsPerSecond = (bossWpm * 5.0) / 60.0;

        // Add boss as a pseudo-player
        String bossSocketId = "boss_" + UUID.randomUUID();
        PlayerState boss = PlayerState.of(null, "🤖 Boss (" + bossWpm + " WPM)", bossSocketId);
        // BUG-H08: mark as bot so it's excluded from results payload and match persistence
        boss.setBot(true);
        state.getPlayers().put(bossSocketId, boss);

        long[] startTime = {System.currentTimeMillis()};

        final int finalBossWpm = bossWpm;

        ScheduledFuture<?> task = scheduler.scheduleAtFixedRate(() -> {
            // BUG-H02: guard against stale fires after room cleanup
            if (state.getStatus() == RoomState.RoomStatus.FINISHED) {
                ScheduledFuture<?> t = state.getBossTask();
                if (t != null) t.cancel(false);
                return;
            }

            long elapsed = System.currentTimeMillis() - startTime[0];
            double elapsedSeconds = elapsed / 1000.0;
            double charsTyped = elapsedSeconds * charsPerSecond;
            double progress = Math.min(100.0, (charsTyped / totalChars) * 100.0);

            boss.setProgress(progress);
            boss.setWpm(finalBossWpm);

            Map<String, Object> progressEvent = new HashMap<>();
            progressEvent.put("userId", "boss");
            progressEvent.put("username", boss.getUsername());
            progressEvent.put("progress", progress);
            progressEvent.put("wpm", finalBossWpm);
            progressEvent.put("isBoss", true);

            server.getRoomOperations(roomCode).sendEvent(RACE_PROGRESS, progressEvent);

            if (progress >= 100.0) {
                ScheduledFuture<?> t = state.getBossTask();
                if (t != null) t.cancel(false);
                // Boss finished — assign placement if not already done
                if (boss.getPlacement() == 0) {
                    boss.setPlacement(state.incrementAndGetFinished());
                    boss.setFinishedAt(java.time.Instant.now());

                    // BUG-H08: use isBot() instead of fragile username.startsWith("🤖") check
                    // If all real (non-bot) active players have finished, finalize
                    long unfinished = state.getActivePlayers().stream()
                            .filter(p -> p.getPlacement() == 0 && !p.isDisconnected() && !p.isBot())
                            .count();
                    if (unfinished == 0) {
                        raceHandler.finalizeRace(state);
                    }
                }
                log.info("Boss fight AI finished in room {}", roomCode);
            }
        }, new java.util.Date(System.currentTimeMillis() + 500), 500);

        // BUG-H02: store handle so room-cleanup can cancel it
        state.setBossTask(task);
        log.info("Boss fight started for room {} at boss WPM={}", roomCode, bossWpm);
    }
}

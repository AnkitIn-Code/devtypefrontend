package com.devtype.backend.socket;

import com.corundumstudio.socketio.SocketIOServer;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

import static com.devtype.backend.socket.SocketEventConstants.*;

/**
 * Battle Royale mode: after each round interval (60s default),
 * the slowest active player(s) are eliminated.
 * Broadcasts {@code royale:eliminated} and {@code royale:roundStart} events.
 * Continues until one player remains — that player wins.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class BattleRoyaleHandler {

    private static final long ROUND_DURATION_SECONDS = 60;

    private final SocketIOServer server;
    private final RoomStateStore store;
    private final RaceEventHandler raceHandler;

    private final ThreadPoolTaskScheduler scheduler = buildScheduler();

    private static ThreadPoolTaskScheduler buildScheduler() {
        ThreadPoolTaskScheduler s = new ThreadPoolTaskScheduler();
        s.setPoolSize(4);
        s.setThreadNamePrefix("socket-royale-");
        s.initialize();
        return s;
    }

    /**
     * Called by {@link RoomEventHandler} when a BATTLE_ROYALE race starts.
     * Kicks off the first round timer.
     */
    public void startRoyaleRounds(RoomState state) {
        log.info("Battle Royale rounds started for room {}", state.getRoomCode());
        scheduleRoundEnd(state);
    }

    private void scheduleRoundEnd(RoomState state) {
        scheduler.schedule(() -> processRoundEnd(state),
                Instant.now().plusSeconds(ROUND_DURATION_SECONDS));
    }

    private void processRoundEnd(RoomState state) {
        if (state.getStatus() != RoomState.RoomStatus.RACING) return;

        List<PlayerState> activePlayers = state.getActivePlayers().stream()
                .filter(p -> p.getPlacement() == 0) // Not yet finished
                .sorted(Comparator.comparingDouble(PlayerState::getProgress))
                .collect(Collectors.toList());

        if (activePlayers.isEmpty()) return;

        // Eliminate bottom player(s) — if a tie in progress, eliminate all tied last
        double minProgress = activePlayers.get(0).getProgress();
        List<PlayerState> eliminated = activePlayers.stream()
                .filter(p -> p.getProgress() <= minProgress)
                .toList();

        // Always keep at least 1 player.
        // EDGE-03: When all remaining players are tied (eliminated.size() >= activePlayers.size()),
        // eliminate only 1. Break the tie deterministically by joinedAt — the most recently-joined
        // player is eliminated first, ensuring consistent ordering regardless of map iteration order.
        if (eliminated.size() >= activePlayers.size()) {
            PlayerState tieLoser = eliminated.stream()
                    .max(Comparator.comparing(p ->
                            p.getJoinedAt() != null ? p.getJoinedAt() : java.time.Instant.EPOCH))
                    .orElse(eliminated.get(0));
            eliminated = List.of(tieLoser);
        }


        for (PlayerState ps : eliminated) {
            ps.setEliminated(true);
            state.getEliminatedSockets().add(ps.getSocketId());

            server.getRoomOperations(state.getRoomCode()).sendEvent(ROYALE_ELIMINATED, Map.of(
                    "userId", ps.getUserId() != null ? ps.getUserId().toString() : "",
                    "username", ps.getUsername(),
                    "round", state.getRoyaleRound(),
                    "progress", ps.getProgress()
            ));
            log.info("Player {} eliminated from royale room {} at round {}",
                    ps.getUsername(), state.getRoomCode(), state.getRoyaleRound());
        }

        // Check if only 1 (or 0) players remain active
        List<PlayerState> remaining = state.getActivePlayers().stream()
                .filter(p -> p.getPlacement() == 0)
                .toList();

        if (remaining.size() <= 1) {
            // Winner is the last standing player
            if (!remaining.isEmpty()) {
                PlayerState winner = remaining.get(0);
                winner.setPlacement(state.incrementAndGetFinished());
                winner.setFinishedAt(Instant.now());
            }
            // Assign placements to eliminated players in reverse order
            List<PlayerState> allPlayers = new ArrayList<>(state.getPlayers().values());
            allPlayers.stream()
                    .filter(p -> p.getPlacement() == 0)
                    .forEach(p -> p.setPlacement(state.incrementAndGetFinished()));

            raceHandler.finalizeRace(state);
        } else {
            // Next round
            state.setRoyaleRound(state.getRoyaleRound() + 1);
            server.getRoomOperations(state.getRoomCode()).sendEvent(ROYALE_ROUND_START, Map.of(
                    "round", state.getRoyaleRound(),
                    "players", remaining.stream().map(p -> Map.of(
                            "userId", p.getUserId() != null ? p.getUserId().toString() : "",
                            "username", p.getUsername(),
                            "progress", p.getProgress()
                    )).toList()
            ));
            scheduleRoundEnd(state); // Schedule next round
        }
    }
}

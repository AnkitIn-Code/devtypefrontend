package com.devtype.backend.socket;

import com.corundumstudio.socketio.SocketIOServer;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.*;

import static com.devtype.backend.socket.SocketEventConstants.*;

/**
 * Relay mode: splits the snippet into N chunks (one per player),
 * enforces turn order, and broadcasts {@code relay:turnChange} when
 * a player completes their chunk.
 *
 * <p>A player's {@code race:progress} update is rejected unless it is
 * currently their turn (enforced in {@link RaceEventHandler}).
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class RelayHandler {

    private final SocketIOServer server;
    private final RoomStateStore store;
    private final RaceEventHandler raceHandler;

    /**
     * Initialises relay state: splits snippet code into equal chunks.
     * Called by {@link RoomEventHandler} when a RELAY race starts.
     */
    public void initRelay(RoomState state) {
        List<PlayerState> orderedPlayers = state.getOrderedRelayPlayers();
        if (orderedPlayers.isEmpty()) return;

        String code = state.getSnippetCode();
        if (code == null || code.isBlank()) return;

        // BUG-L10: normalize CRLF and bare CR so Windows-formatted snippets don't produce
        // stray \r characters at the end of each relay chunk line.
        String[] lines = code.replace("\r\n", "\n").replace("\r", "\n").split("\n");

        int chunkSize = Math.max(1, (int) Math.ceil((double) lines.length / orderedPlayers.size()));

        state.getRelayChunks().clear();
        for (int i = 0; i < orderedPlayers.size(); i++) {
            int from = i * chunkSize;
            int to   = Math.min(from + chunkSize, lines.length);
            if (from >= lines.length) {
                state.getRelayChunks().add("// (end of relay)");
            } else {
                state.getRelayChunks().add(String.join("\n", Arrays.copyOfRange(lines, from, to)));
            }
        }

        state.setRelayTurnIndex(0);

        // Notify room of first player's turn
        broadcastTurnChange(state, 0);
        log.info("Relay initialised for room {} — {} players, {} chunks",
                state.getRoomCode(), orderedPlayers.size(), state.getRelayChunks().size());
    }

    /**
     * Called when the current relay player signals completion.
     * Advances the turn index and broadcasts the next player's turn.
     * If all chunks are done, finalises the race.
     */
    public void advanceTurn(RoomState state) {
        int nextIndex = state.getRelayTurnIndex() + 1;
        List<PlayerState> ordered = state.getOrderedRelayPlayers();

        if (nextIndex >= ordered.size()) {
            // All players have typed their chunk → race complete
            for (int i = 0; i < ordered.size(); i++) {
                PlayerState p = ordered.get(i);
                if (p.getPlacement() == 0) p.setPlacement(state.incrementAndGetFinished());
            }
            raceHandler.finalizeRace(state);
        } else {
            state.setRelayTurnIndex(nextIndex);
            broadcastTurnChange(state, nextIndex);
        }
    }

    private void broadcastTurnChange(RoomState state, int turnIndex) {
        List<PlayerState> ordered = state.getOrderedRelayPlayers();
        if (turnIndex >= ordered.size()) return;

        PlayerState nextPlayer = ordered.get(turnIndex);
        String chunk = turnIndex < state.getRelayChunks().size()
                ? state.getRelayChunks().get(turnIndex) : "";

        server.getRoomOperations(state.getRoomCode()).sendEvent(RELAY_TURN_CHANGE, Map.of(
                "nextUserId",   nextPlayer.getUserId() != null ? nextPlayer.getUserId().toString() : "",
                "nextUsername", nextPlayer.getUsername(),
                "chunkIndex",  turnIndex,
                "chunk",       chunk
        ));
    }
}

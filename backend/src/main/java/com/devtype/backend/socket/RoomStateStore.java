package com.devtype.backend.socket;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Singleton in-memory store for all live {@link RoomState} objects.
 *
 * <p>Rooms are added on creation and removed a short time after FINISHED.
 * All access is thread-safe via {@link ConcurrentHashMap}.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class RoomStateStore {

    /** roomCode → RoomState */
    private final ConcurrentHashMap<String, RoomState> rooms = new ConcurrentHashMap<>();

    /** socketId → roomCode (to find a player's room on disconnect) */
    private final ConcurrentHashMap<String, String> socketToRoom = new ConcurrentHashMap<>();

    // ── Room CRUD ────────────────────────────────────────────────────────────

    public void addRoom(RoomState state) {
        rooms.put(state.getRoomCode(), state);
        log.debug("Room created: {} mode={}", state.getRoomCode(), state.getMode());
    }

    public Optional<RoomState> findByCode(String roomCode) {
        return Optional.ofNullable(rooms.get(roomCode));
    }

    public void removeRoom(String roomCode) {
        rooms.remove(roomCode);
        log.debug("Room removed: {}", roomCode);
    }

    public Collection<RoomState> allRooms() {
        return rooms.values();
    }

    // ── Socket → Room tracking ───────────────────────────────────────────────

    public void registerSocket(String socketId, String roomCode) {
        socketToRoom.put(socketId, roomCode);
    }

    public Optional<String> getRoomCodeForSocket(String socketId) {
        return Optional.ofNullable(socketToRoom.get(socketId));
    }

    public void unregisterSocket(String socketId) {
        socketToRoom.remove(socketId);
    }

    // ── Duel matchmaking queue ────────────────────────────────────────────────

    /** userId → socketId waiting for duel opponent */
    private final ConcurrentHashMap<String, String> duelQueue = new ConcurrentHashMap<>();

    public void enqueueDuel(String userId, String socketId) {
        duelQueue.put(userId, socketId);
    }

    public Optional<String[]> dequeueDuelPair(String waitingUserId) {
        // Remove the first queued player who isn't the requesting user
        for (var entry : duelQueue.entrySet()) {
            if (!entry.getKey().equals(waitingUserId)) {
                String opponentUserId = entry.getKey();
                String opponentSocketId = entry.getValue();
                duelQueue.remove(opponentUserId);
                return Optional.of(new String[]{opponentUserId, opponentSocketId});
            }
        }
        return Optional.empty();
    }

    public void removeDuelQueue(String userId) {
        duelQueue.remove(userId);
    }
}

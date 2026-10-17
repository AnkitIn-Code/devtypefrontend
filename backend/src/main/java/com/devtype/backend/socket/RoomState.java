package com.devtype.backend.socket;

import com.devtype.backend.entity.enums.RoomMode;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ScheduledFuture;

/**
 * Immutable-ish snapshot of all live-room and per-player state.
 * Held in {@link RoomStateStore} — no DB round-trips during racing.
 */
@Data
public class RoomState {

    private final String roomCode;
    private final UUID roomDbId;
    /** FEAT-M01: non-final so BOSS_START can transition a WAITING room into BOSS_FIGHT mode. */
    private volatile RoomMode mode;

    /**
     * Wall-clock time when this RoomState was first created in memory.
     * Used by the WAITING-room reaper (BUG-C02/EDGE-07) to find stale rooms.
     */
    private final Instant createdAt = Instant.now();

    /** Snippet fields cached in memory to avoid DB look-ups per keystroke. */
    private String snippetId;
    private String snippetTitle;
    private String snippetLanguage;
    private String snippetCode;
    /** Only non-null for BUG_FIX rooms. */
    private String buggyCode;
    private String snippetDescription;

    /** WAITING → COUNTDOWN → RACING → FINISHED */
    private volatile RoomStatus status = RoomStatus.WAITING;

    /** UserId (as String) of the player who created the room. */
    private String hostUserId;

    /** socketId → PlayerState */
    private final Map<String, PlayerState> players = new ConcurrentHashMap<>();

    /** Relay mode: index of the player whose turn it currently is. */
    private volatile int relayTurnIndex = 0;

    /** Relay mode: per-player code chunk (ordered list). */
    private final List<String> relayChunks = new ArrayList<>();

    /** Battle Royale: current round number (1-based). */
    private volatile int royaleRound = 1;

    /** Battle Royale: socketIds already eliminated. */
    private final Set<String> eliminatedSockets = ConcurrentHashMap.newKeySet();

    /** Per-player disconnection grace timers (30 s before forfeit). */
    private final Map<String, ScheduledFuture<?>> graceTimers = new ConcurrentHashMap<>();

    /** Timestamp when the race actually started (after countdown). */
    private volatile Instant raceStartedAt;

    /** Number of players who have finished (used for placement ordering). */
    private volatile int finishedCount = 0;

    /**
     * Handle to the per-room idle-reaper task (FEAT-S05/EDGE-11).
     * Cancelled when the room finalizes to avoid resource leaks.
     */
    private volatile ScheduledFuture<?> idleReaperTask;

    /**
     * BUG-H02: Handle to the Ghost replay scheduled task.
     * Stored here so the room-cleanup path can cancel it after the race ends.
     */
    private volatile ScheduledFuture<?> ghostTask;

    /**
     * BUG-H02: Handle to the Boss Fight AI scheduled task.
     * Stored here so the room-cleanup path can cancel it after the race ends.
     */
    private volatile ScheduledFuture<?> bossTask;

    public enum RoomStatus { WAITING, COUNTDOWN, RACING, FINISHED }

    // ── Convenience helpers ──────────────────────────────────────────────────

    /** Atomically increments and returns the next placement rank (1, 2, 3…). */
    public synchronized int incrementAndGetFinished() {
        return ++finishedCount;
    }

    public Collection<PlayerState> getActivePlayers() {
        return players.values().stream()
                .filter(p -> !p.isEliminated() && !p.isDisconnected() && !p.isDnf())
                .toList();
    }

    public Optional<PlayerState> findByUserId(UUID userId) {
        return players.values().stream()
                .filter(p -> userId.equals(p.getUserId()))
                .findFirst();
    }

    /** @return true if every connected player has marked themselves ready. */
    public boolean allPlayersReady() {
        var connected = players.values().stream().filter(p -> !p.isDisconnected()).toList();
        return !connected.isEmpty() && connected.stream().allMatch(PlayerState::isReady);
    }

    /** @return ordered list of PlayerStates sorted by relay turn index. */
    public List<PlayerState> getOrderedRelayPlayers() {
        var ordered = new ArrayList<>(players.values().stream()
                .filter(p -> !p.isDisconnected())
                .toList());
        ordered.sort(Comparator.comparingInt(PlayerState::getRelayPosition));
        return ordered;
    }

    /**
     * FEAT-M01: Explicit 3-arg constructor needed because {@code mode} was made
     * non-final (volatile) to allow BOSS_START to switch modes at runtime.
     * Lombok's {@code @Data} only generates constructors for {@code final} fields,
     * so we must provide this constructor explicitly to keep existing call-sites
     * (buildRoomState in RoomEventHandler, DuelHandler) compiling unchanged.
     */
    public RoomState(String roomCode, UUID roomDbId, RoomMode mode) {
        this.roomCode  = roomCode;
        this.roomDbId  = roomDbId;
        this.mode      = mode;
    }
}

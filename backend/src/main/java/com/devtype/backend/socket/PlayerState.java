package com.devtype.backend.socket;

import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

/**
 * Per-player live state inside a {@link RoomState}.
 * Updated on every {@code race:progress} event; never directly persisted.
 */
@Data
@NoArgsConstructor
public class PlayerState {

    private UUID userId;
    private String username;
    private String socketId;

    /** 0.0 → 100.0 */
    private volatile double progress = 0.0;
    private volatile int wpm = 0;
    private volatile double accuracy = 100.0;

    private volatile boolean isReady = false;
    private volatile boolean isEliminated = false;
    private volatile boolean isDisconnected = false;

    /** Relay mode: which position (0-based) this player occupies in the chain. */
    private int relayPosition = 0;

    /** Anti-cheat: set true when >250 WPM sustained is detected. */
    private volatile boolean isSuspicious = false;

    /**
     * Timestamp of last received progress event.
     * Used by the idle-reaper (FEAT-S05/EDGE-11) to detect players who stop
     * typing without disconnecting, and by WPM-velocity anti-cheat.
     */
    private volatile Instant lastProgressUpdateTimestamp;

    /** WPM value at lastProgressUpdateTimestamp (used to compute instantaneous WPM delta). */
    private volatile int lastReportedWpm = 0;

    /**
     * Final placement (1-based). 0 = not yet finished.
     * -1 = DNF (Did Not Finish — idle timeout or disconnect during RACING).
     */
    private volatile int placement = 0;

    /**
     * True when this player was marked Did-Not-Finish (idle timeout or disconnect
     * while the race was in progress). Distinct from placement so the frontend can
     * render DNF players differently from ranked finishers.
     */
    private volatile boolean dnf = false;

    /**
     * FEAT-M04 / BUG-H08: True for synthetic bot/ghost pseudo-players (boss, ghost).
     * Bot entries are excluded from {@code buildResultsPayload()} and from DNF
     * assignment in {@code finalizeRace()}, so only real players appear in the
     * results screen and in match persistence.
     */
    private volatile boolean bot = false;

    private volatile Instant finishedAt;

    /**
     * EDGE-03: Wall-clock time when this PlayerState was inserted into the room.
     * Used by {@link BattleRoyaleHandler} to break exact-progress ties deterministically
     * (last-joined player is eliminated first).
     */
    private volatile Instant joinedAt;

    // ── Factory ──────────────────────────────────────────────────────────────

    public static PlayerState of(UUID userId, String username, String socketId) {
        PlayerState p = new PlayerState();
        p.userId = userId;
        p.username = username;
        p.socketId = socketId;
        p.lastProgressUpdateTimestamp = Instant.now();
        p.joinedAt = Instant.now();
        return p;
    }
}

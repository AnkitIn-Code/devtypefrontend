package com.devtype.backend.config;

/**
 * Shared anti-cheat thresholds and parameters across solo practice and multiplayer rooms.
 *
 * <p>BUG-H10: Single source of truth for safe WPM limits so solo typing and
 * multiplayer races use consistent rules.
 * <p>SEC-05: Velocity parameters for detecting instant acceleration.
 * <p>FEAT-S10: Rate limiting parameters for socket progress packets.
 */
public final class AntiCheatConstants {

    private AntiCheatConstants() {}

    /** Maximum plausible sustained WPM for human typing. */
    public static final int MAX_SAFE_WPM = 300;

    /** Maximum plausible burst raw WPM (including uncorrected errors). */
    public static final int MAX_RAW_WPM = 350;

    /** Minimum duration in milliseconds for a valid solo session. */
    public static final int MIN_SESSION_DURATION_MS = 1000;

    /** Maximum plausible WPM jump within a short window (SEC-05). */
    public static final int MAX_VELOCITY_JUMP_WPM = 50;

    /** Velocity window in milliseconds (SEC-05). */
    public static final long MAX_VELOCITY_WINDOW_MS = 1000L;

    /** Maximum allowed race:progress socket events per second per client (FEAT-S10). */
    public static final int MAX_PROGRESS_EVENTS_PER_SECOND = 20;
}

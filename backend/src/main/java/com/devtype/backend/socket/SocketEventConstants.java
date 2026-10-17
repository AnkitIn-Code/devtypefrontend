package com.devtype.backend.socket;

/**
 * Central registry of all Socket.IO event names.
 *
 * <p>Keep in sync with {@code src/websocket/events.js} on the frontend.
 */
public final class SocketEventConstants {

    private SocketEventConstants() {}

    // ── Room lifecycle ───────────────────────────────────────────────────────
    /** Client → Server: create a new room. Payload: {mode, maxPlayers?, snippetId?} */
    public static final String ROOM_CREATE         = "room:create";
    /** Client → Server: join an existing room. Payload: {roomCode} */
    public static final String ROOM_JOIN           = "room:join";
    /** Client → Server: spectate/watch a room in read-only mode (FEAT-S01). Payload: {roomCode} */
    public static final String ROOM_SPECTATE       = "room:spectate";
    public static final String ROOM_WATCH          = "room:watch";
    /** Server → Client: confirmation that client has joined a room. */
    public static final String ROOM_JOINED         = "room:joined";

    /** Server → Room: another player joined. */
    public static final String ROOM_PLAYER_JOINED  = "room:playerJoined";
    /** Server → Room: a player left or disconnected. */
    public static final String ROOM_PLAYER_LEFT    = "room:playerLeft";
    /** Client → Server: player voluntarily leaves room. Payload: {roomCode} */
    public static final String ROOM_LEAVE          = "room:leave";
    /** Client → Server: host kicks a player. Payload: {roomCode, userId?, username?} */
    public static final String ROOM_KICK           = "room:kick";
    /** Server → Client: player was removed from lobby by host. */
    public static final String ROOM_KICKED         = "room:kicked";
    /** Client → Server: host closes the room. Payload: {roomCode} */
    public static final String ROOM_CLOSE          = "room:close";
    /** Server → Room: room was closed by host. */
    public static final String ROOM_CLOSED         = "room:closed";
    /** Client → Server: host requests race start (auto-readies all, triggers countdown). */
    public static final String ROOM_START          = "room:start";
    /** Bidirectional: in-room chat message. C→S: {roomCode, message}. S→Room: {userId, username, message, timestamp} */
    public static final String ROOM_CHAT           = "room:chat";
    /** Client → Server: host changes room template. Payload: {roomCode, snippetId?, title, language, code} */
    public static final String ROOM_TEMPLATE_CHANGE = "room:templateChange";

    // ── Race lifecycle ───────────────────────────────────────────────────────
    /** Client → Server: mark self as ready. Payload: {roomCode} */
    public static final String PLAYER_READY        = "player:ready";
    /** Server → Room: countdown tick. Payload: {count} */
    public static final String RACE_COUNTDOWN      = "race:countdown";
    /** Server → Room: race has started. Payload: {startedAt, snippet} */
    public static final String RACE_START          = "race:start";
    /** Bidirectional: typing progress update. Payload: {roomCode, progress, wpm, accuracy} (C→S) / {userId, username, progress, wpm} (S→Room) */
    public static final String RACE_PROGRESS       = "race:progress";
    /** Client → Server: player finished typing. Payload: {roomCode, wpm, accuracy} */
    public static final String RACE_PLAYER_FINISHED = "race:playerFinished";
    /** Server → Room: race fully complete, show results. */
    public static final String RACE_RESULTS        = "race:results";
    /**
     * Server → Room: race cancelled before it started (e.g. player count dropped
     * below 2 during the countdown). Payload: {reason: String}
     */
    public static final String RACE_CANCELLED      = "race:cancelled";

    // ── Duel ─────────────────────────────────────────────────────────────────
    /** Client → Server: join 1v1 matchmaking queue. */
    public static final String DUEL_QUEUE          = "duel:queue";
    /** Server → Client: opponent found, room ready. */
    public static final String DUEL_MATCH_FOUND    = "duel:matchFound";
    /** Server → Client: post-match ELO delta. */
    public static final String DUEL_RATING_UPDATE  = "duel:ratingUpdate";

    // ── Battle Royale ────────────────────────────────────────────────────────
    /** Server → Room: one or more players eliminated. */
    public static final String ROYALE_ELIMINATED   = "royale:eliminated";
    /** Server → Room: new royale round starting. */
    public static final String ROYALE_ROUND_START  = "royale:roundStart";

    // ── Relay ────────────────────────────────────────────────────────────────
    /** Server → Room: turn changed to next player. */
    public static final String RELAY_TURN_CHANGE   = "relay:turnChange";

    // ── Ghost ────────────────────────────────────────────────────────────────
    /** Client → Server: start ghost race mode. */
    public static final String GHOST_START         = "ghost:start";

    // ── Boss Fight ───────────────────────────────────────────────────────────
    /** Client → Server: start boss fight mode. */
    public static final String BOSS_START          = "boss:start";

    // ── Error ────────────────────────────────────────────────────────────────
    /** Server → Client: error message. */
    public static final String ERROR               = "error";
}

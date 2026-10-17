package com.devtype.backend.socket;

import com.corundumstudio.socketio.SocketIOClient;
import com.corundumstudio.socketio.SocketIOServer;

import com.devtype.backend.entity.Snippet;
import com.devtype.backend.entity.User;
import com.devtype.backend.entity.MultiplayerRoom;
import com.devtype.backend.entity.enums.RoomMode;
import com.devtype.backend.entity.enums.RoomStatus;
import com.devtype.backend.repository.MultiplayerRoomRepository;
import com.devtype.backend.repository.SnippetRepository;
import com.devtype.backend.repository.UserRepository;
import com.devtype.backend.security.JwtUtil;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.atomic.AtomicInteger;


import static com.devtype.backend.socket.SocketEventConstants.*;

/**
 * Handles room lifecycle Socket.IO events:
 * room:create, room:join, player:ready, disconnect (with 30s grace period).
 *
 * <p>Also drives the countdown timer and emits race:start when all players ready.
 *
 * <p>Bug fixes included (see individual method/handler comments):
 * BUG-C01, BUG-C02/EDGE-07, BUG-C04, BUG-H12/EDGE-08,
 * BUG-L09, BUG-H07, EDGE-01/EDGE-02, FEAT-S09, FEAT-S05/EDGE-11.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class RoomEventHandler {

    /**
     * BUG-L01: cryptographically-strong random for room-code generation.
     * {@link java.security.SecureRandom} is thread-safe so this can be a static field.
     */
    private static final java.security.SecureRandom SECURE_RANDOM = new java.security.SecureRandom();

    private final SocketIOServer server;
    private final RoomStateStore store;
    private final JwtUtil jwtUtil;
    private final UserRepository userRepository;
    private final MultiplayerRoomRepository roomRepository;
    private final SnippetRepository snippetRepository;
    private final MatchPersistenceService persistenceService;

    // Mode-specific handlers — injected lazily to avoid circular deps
    @org.springframework.context.annotation.Lazy
    @org.springframework.beans.factory.annotation.Autowired
    private BattleRoyaleHandler battleRoyaleHandler;

    @org.springframework.context.annotation.Lazy
    @org.springframework.beans.factory.annotation.Autowired
    private RelayHandler relayHandler;

    @org.springframework.context.annotation.Lazy
    @org.springframework.beans.factory.annotation.Autowired
    private BossFightHandler bossFightHandler;

    // BUG-L08: Chat rate limiting (max 5 messages per 5 seconds per user in room)
    private static final int MAX_CHAT_MESSAGES_PER_WINDOW = 5;
    private static final long CHAT_WINDOW_MS = 5000L;
    private final Map<String, List<Long>> chatMessageTimestamps = new ConcurrentHashMap<>();

    private boolean isChatRateLimited(String userId, String roomCode) {
        String key = userId + ":" + roomCode;
        long now = System.currentTimeMillis();
        List<Long> timestamps = chatMessageTimestamps.computeIfAbsent(key, k -> Collections.synchronizedList(new ArrayList<>()));
        synchronized (timestamps) {
            timestamps.removeIf(t -> (now - t) > CHAT_WINDOW_MS);
            if (timestamps.size() >= MAX_CHAT_MESSAGES_PER_WINDOW) {
                return true;
            }
            timestamps.add(now);
            return false;
        }
    }

    private final ThreadPoolTaskScheduler scheduler = buildScheduler();


    private static ThreadPoolTaskScheduler buildScheduler() {
        ThreadPoolTaskScheduler s = new ThreadPoolTaskScheduler();
        s.setPoolSize(10);
        s.setThreadNamePrefix("socket-room-");
        s.initialize();
        return s;
    }

    @PostConstruct
    public void registerHandlers() {

        // ── Connect listener: auto-join personal user room (FEAT-S08 / BUG-L14) ──
        server.addConnectListener(client -> {
            User user = getUserFromClient(client);
            if (user != null) {
                String userRoom = "user:" + user.getId().toString();
                client.joinRoom(userRoom);
                log.debug("[Socket.IO] Client {} joined personal user room {}", client.getSessionId(), userRoom);
            }
        });

        // ── room:create ──────────────────────────────────────────────────────
        server.addEventListener(ROOM_CREATE, Map.class, (client, data, ack) -> {
            try {
                User user = getUserFromClient(client);
                if (user == null) { sendError(client, "AUTH_FAILED", "Not authenticated"); return; }

                RoomMode mode = parseMode((String) data.getOrDefault("mode", "CLASSIC_RACE"));
                int maxPlayers = 8;
                Object maxPObj = data.get("maxPlayers");
                if (maxPObj instanceof Number n) {
                    maxPlayers = n.intValue();
                } else if (maxPObj instanceof String s) {
                    try {
                        String digits = s.replaceAll("[^0-9]", "");
                        if (!digits.isEmpty()) maxPlayers = Integer.parseInt(digits);
                    } catch (Exception ignored) {}
                }

                String snippetId = (String) data.get("snippetId");
                String roomCode = generateRoomCode();

                // Persist room to DB
                MultiplayerRoom dbRoom = MultiplayerRoom.builder()
                        .code(roomCode)
                        .mode(mode)
                        .status(RoomStatus.WAITING)
                        .host(user)
                        .maxPlayers(maxPlayers)
                        .build();

                // Optionally attach snippet
                if (snippetId != null) {
                    try {
                        snippetRepository.findById(UUID.fromString(snippetId))
                                .ifPresent(dbRoom::setSnippet);
                    } catch (IllegalArgumentException ignored) {}
                }
                if (dbRoom.getSnippet() == null) {
                    // Pick a random public snippet
                    Snippet random = snippetRepository.findRandomByLanguageAndDifficulty("javascript", "INTERMEDIATE");
                    dbRoom.setSnippet(random);
                }
                dbRoom = roomRepository.save(dbRoom);

                // Build in-memory RoomState
                RoomState state = buildRoomState(dbRoom);
                state.setHostUserId(user.getId().toString()); // Track host
                store.addRoom(state);
                store.registerSocket(client.getSessionId().toString(), roomCode);

                // Add host as first player
                PlayerState host = PlayerState.of(user.getId(), user.getUsername(), client.getSessionId().toString());
                state.getPlayers().put(client.getSessionId().toString(), host);

                client.joinRoom(roomCode);

                Map<String, Object> payload = buildRoomJoinedPayload(state, user.getId().toString());
                client.sendEvent(ROOM_JOINED, payload);
                log.info("Room created: {} mode={} host={}", roomCode, mode, user.getUsername());
            } catch (Exception e) {
                log.error("Failed to create room: {}", e.getMessage(), e);
                sendError(client, "ROOM_CREATE_FAILED", "Failed to create room: " + e.getMessage());
            }
        });

        // ── room:join ────────────────────────────────────────────────────────
        server.addEventListener(ROOM_JOIN, Map.class, (client, data, ack) -> {
            User user = getUserFromClient(client);
            if (user == null) { sendError(client, "AUTH_FAILED", "Not authenticated"); return; }

            String roomCode = (String) data.get("roomCode");
            if (roomCode == null) { sendError(client, "BAD_REQUEST", "roomCode required"); return; }
            roomCode = roomCode.toUpperCase();

            Optional<RoomState> optState = store.findByCode(roomCode);
            if (optState.isEmpty()) { sendError(client, "ROOM_NOT_FOUND", "Room not found: " + roomCode); return; }

            RoomState state = optState.get();
            if (state.getStatus() == RoomState.RoomStatus.RACING
                    || state.getStatus() == RoomState.RoomStatus.COUNTDOWN) {
                // Allow reconnect if player was already in this room (RACING or COUNTDOWN)
                Optional<PlayerState> existingPlayer = state.findByUserId(user.getId());
                if (existingPlayer.isEmpty()) {
                    sendError(client, "RACE_IN_PROGRESS", "Race already in progress");
                    return;
                }
                // Reconnect: update socketId
                PlayerState ps = existingPlayer.get();
                state.getPlayers().remove(ps.getSocketId());
                store.unregisterSocket(ps.getSocketId());
                ps.setSocketId(client.getSessionId().toString());
                ps.setDisconnected(false);
                state.getPlayers().put(ps.getSocketId(), ps);
                cancelGraceTimer(state, ps.getSocketId());
            } else {
                // ── BUG-C01: WAITING-state — look up existing player by userId first ──
                // A page refresh creates a new socket connection; without this check the same
                // user would appear twice in the player list.
                Optional<PlayerState> existingPlayer = state.findByUserId(user.getId());
                if (existingPlayer.isPresent()) {
                    // Re-joining with a new socket: reuse existing PlayerState, update socketId
                    PlayerState ps = existingPlayer.get();
                    state.getPlayers().remove(ps.getSocketId());
                    store.unregisterSocket(ps.getSocketId());
                    cancelGraceTimer(state, ps.getSocketId());
                    ps.setSocketId(client.getSessionId().toString());
                    ps.setDisconnected(false);
                    state.getPlayers().put(ps.getSocketId(), ps);
                    log.info("Player {} re-joined WAITING room {} (socket updated)", user.getUsername(), roomCode);
                } else {
                    // Brand-new player joining the lobby
                    if (state.getPlayers().size() >= getRoomCapacity(state)) {
                        sendError(client, "ROOM_FULL", "Room is full");
                        return;
                    }
                    PlayerState newPlayer = PlayerState.of(user.getId(), user.getUsername(), client.getSessionId().toString());
                    newPlayer.setRelayPosition(state.getPlayers().size());
                    state.getPlayers().put(client.getSessionId().toString(), newPlayer);
                }
            }

            store.registerSocket(client.getSessionId().toString(), roomCode);
            client.joinRoom(roomCode);

            // Notify the joining client — payload now includes status + raceStartedAt
            // so clients joining mid-race (EDGE-01/EDGE-02) or reconnecting (FEAT-S09)
            // can immediately sync to the correct state.
            Map<String, Object> payload = buildRoomJoinedPayload(state, user.getId().toString());
            client.sendEvent(ROOM_JOINED, payload);

            // Notify everyone else in the room
            Map<String, Object> joinNotif = new HashMap<>();
            joinNotif.put("player", Map.of(
                    "userId", user.getId().toString(),
                    "username", user.getUsername()
            ));
            server.getRoomOperations(roomCode).sendEvent(ROOM_PLAYER_JOINED, joinNotif);
            log.info("Player {} joined room {}", user.getUsername(), roomCode);
        });

        // ── room:spectate / room:watch (FEAT-S01: Spectator mode) ────────────
        server.addEventListener(ROOM_SPECTATE, Map.class, (client, data, ack) -> {
            handleSpectate(client, data);
        });
        server.addEventListener(ROOM_WATCH, Map.class, (client, data, ack) -> {
            handleSpectate(client, data);
        });

        // ── player:ready ─────────────────────────────────────────────────────

        server.addEventListener(PLAYER_READY, Map.class, (client, data, ack) -> {
            String roomCode = store.getRoomCodeForSocket(client.getSessionId().toString()).orElse(null);
            if (roomCode == null) return;

            RoomState state = store.findByCode(roomCode).orElse(null);
            if (state == null) return;

            PlayerState ps = state.getPlayers().get(client.getSessionId().toString());
            if (ps != null) ps.setReady(true);

            // Check if all connected players are ready — auto-start countdown
            if (state.allPlayersReady() && state.getPlayers().size() >= 2
                    && state.getStatus() == RoomState.RoomStatus.WAITING) {
                startCountdown(state);
            }
        });

        // ── room:start (host-initiated) ───────────────────────────────────────
        // Host clicks "Start Race" — auto-readies everyone and starts countdown immediately.
        server.addEventListener(ROOM_START, Map.class, (client, data, ack) -> {
            String socketId = client.getSessionId().toString();
            String roomCode = store.getRoomCodeForSocket(socketId).orElse(null);
            if (roomCode == null) { sendError(client, "NOT_IN_ROOM", "You are not in a room"); return; }

            RoomState state = store.findByCode(roomCode).orElse(null);
            if (state == null) { sendError(client, "ROOM_NOT_FOUND", "Room not found"); return; }
            if (state.getStatus() != RoomState.RoomStatus.WAITING) return; // already started

            User user = getUserFromClient(client);
            if (user == null) { sendError(client, "AUTH_FAILED", "Not authenticated"); return; }

            // ── BUG-H12/EDGE-08: Only the host may start the race ──
            if (state.getHostUserId() == null || !state.getHostUserId().equals(user.getId().toString())) {
                sendError(client, "FORBIDDEN", "Only the room host can start the race");
                return;
            }

            // Mark all players as ready then start
            state.getPlayers().values().forEach(p -> p.setReady(true));

            if (state.getPlayers().size() < 2) {
                sendError(client, "NOT_ENOUGH_PLAYERS", "Need at least 2 players to start");
                return;
            }
            startCountdown(state);
            log.info("Host {} force-started room {}", user.getUsername(), roomCode);
        });

        // ── room:chat ─────────────────────────────────────────────────────────
        server.addEventListener(ROOM_CHAT, Map.class, (client, data, ack) -> {
            String socketId = client.getSessionId().toString();
            String roomCode = store.getRoomCodeForSocket(socketId).orElse(null);
            if (roomCode == null) return;

            User user = getUserFromClient(client);
            if (user == null) return;

            // BUG-L08: Chat rate limiting (max 5 messages per 5s)
            if (isChatRateLimited(user.getId().toString(), roomCode)) {
                sendError(client, "RATE_LIMITED", "You are sending messages too quickly (max 5 per 5s)");
                return;
            }

            String message = (String) data.get("message");
            if (message == null || message.isBlank() || message.length() > 200) return;

            // SEC-06: Server-side HTML sanitization
            String sanitizedMessage = org.springframework.web.util.HtmlUtils.htmlEscape(message.trim());

            Map<String, Object> chatBroadcast = new HashMap<>();
            chatBroadcast.put("userId", user.getId().toString());
            chatBroadcast.put("username", user.getUsername());
            chatBroadcast.put("message", sanitizedMessage);
            chatBroadcast.put("timestamp", System.currentTimeMillis());
            server.getRoomOperations(roomCode).sendEvent(ROOM_CHAT, chatBroadcast);
        });



        // ── room:templateChange (host-initiated) ──────────────────────────────
        server.addEventListener(ROOM_TEMPLATE_CHANGE, Map.class, (client, data, ack) -> {
            String socketId = client.getSessionId().toString();
            String roomCode = store.getRoomCodeForSocket(socketId).orElse(null);
            if (roomCode == null) return;

            RoomState state = store.findByCode(roomCode).orElse(null);
            if (state == null || state.getStatus() != RoomState.RoomStatus.WAITING) return;

            // ── BUG-L09: Only the host may change the template ──
            User user = getUserFromClient(client);
            if (user == null) { sendError(client, "AUTH_FAILED", "Not authenticated"); return; }
            if (state.getHostUserId() == null || !state.getHostUserId().equals(user.getId().toString())) {
                sendError(client, "FORBIDDEN", "Only the room host can change the template");
                return;
            }

            String title = (String) data.getOrDefault("title", "Custom Code");
            String language = (String) data.getOrDefault("language", "javascript");
            String code = (String) data.get("code");
            String snippetId = (String) data.get("snippetId");
            String buggyCode = (String) data.get("buggyCode");
            String description = (String) data.get("description");

            if (code == null || code.isBlank()) return;

            state.setSnippetId(snippetId != null ? snippetId : UUID.randomUUID().toString());
            state.setSnippetTitle(title);
            state.setSnippetLanguage(language);
            state.setSnippetCode(code);
            if (buggyCode != null) state.setBuggyCode(buggyCode);
            if (description != null) state.setSnippetDescription(description);

            // Broadcast updated room state / snippet to everyone in room
            Map<String, Object> payload = buildRoomJoinedPayload(state, state.getHostUserId());
            server.getRoomOperations(roomCode).sendEvent(ROOM_JOINED, payload);
            server.getRoomOperations(roomCode).sendEvent(ROOM_TEMPLATE_CHANGE, buildSnippetPayload(state));
            log.info("Host updated template for room {}: {}", roomCode, title);
        });

        // ── room:leave ────────────────────────────────────────────────────────
        server.addEventListener(ROOM_LEAVE, Map.class, (client, data, ack) -> {
            String socketId = client.getSessionId().toString();
            String roomCode = store.getRoomCodeForSocket(socketId).orElse(null);
            if (roomCode == null && data != null && data.get("roomCode") != null) {
                roomCode = ((String) data.get("roomCode")).toUpperCase();
            }
            if (roomCode == null) return;

            RoomState state = store.findByCode(roomCode).orElse(null);
            if (state == null) return;

            PlayerState ps = state.getPlayers().remove(socketId);
            store.unregisterSocket(socketId);
            client.leaveRoom(roomCode);

            if (ps != null) {
                log.info("Player {} voluntarily left room {}", ps.getUsername(), roomCode);
                server.getRoomOperations(roomCode).sendEvent(ROOM_PLAYER_LEFT,
                        Map.of("userId", ps.getUserId() != null ? ps.getUserId().toString() : "",
                               "username", ps.getUsername()));
            }

            // If room is empty, clean up both in-memory store and DB row
            if (state.getPlayers().isEmpty()) {
                log.info("Room {} is empty after leave — removing", roomCode);
                store.removeRoom(roomCode);
                final String finalRoomCode = roomCode;
                roomRepository.findByCode(finalRoomCode).ifPresent(r -> {
                    r.setStatus(RoomStatus.FINISHED);
                    roomRepository.save(r);
                });
            } else if (state.getHostUserId() != null && ps != null && state.getHostUserId().equals(ps.getUserId() != null ? ps.getUserId().toString() : "")) {
                // Transfer host to first remaining player
                PlayerState nextHost = state.getPlayers().values().iterator().next();
                if (nextHost != null && nextHost.getUserId() != null) {
                    state.setHostUserId(nextHost.getUserId().toString());
                    Map<String, Object> updatePayload = buildRoomJoinedPayload(state, state.getHostUserId());
                    server.getRoomOperations(roomCode).sendEvent(ROOM_JOINED, updatePayload);
                    log.info("Transferred host of room {} to {}", roomCode, nextHost.getUsername());
                }
            }
        });

        // ── room:kick (host kicks player) ───────────────────────────────────────
        server.addEventListener(ROOM_KICK, Map.class, (client, data, ack) -> {
            String socketId = client.getSessionId().toString();
            String roomCode = (String) data.get("roomCode");
            if (roomCode == null) return;
            roomCode = roomCode.toUpperCase();

            RoomState state = store.findByCode(roomCode).orElse(null);
            if (state == null) { sendError(client, "ROOM_NOT_FOUND", "Room not found"); return; }

            User caller = getUserFromClient(client);
            if (caller == null) { sendError(client, "AUTH_FAILED", "Not authenticated"); return; }

            // Only host can kick
            if (state.getHostUserId() == null || !state.getHostUserId().equals(caller.getId().toString())) {
                sendError(client, "FORBIDDEN", "Only the room host can kick players");
                return;
            }

            // Only allow kick in WAITING lobby
            if (state.getStatus() != RoomState.RoomStatus.WAITING) {
                sendError(client, "INVALID_STATE", "Cannot kick players while race is in progress");
                return;
            }

            String targetUserId = (String) data.get("userId");
            String targetUsername = (String) data.get("username");

            PlayerState targetPlayer = null;
            String targetSocketId = null;

            for (Map.Entry<String, PlayerState> entry : state.getPlayers().entrySet()) {
                PlayerState p = entry.getValue();
                if ((targetUserId != null && p.getUserId() != null && p.getUserId().toString().equals(targetUserId))
                        || (targetUsername != null && p.getUsername().equalsIgnoreCase(targetUsername))) {
                    targetPlayer = p;
                    targetSocketId = entry.getKey();
                    break;
                }
            }

            if (targetPlayer == null || targetSocketId == null) {
                sendError(client, "PLAYER_NOT_FOUND", "Player not found in room");
                return;
            }

            // Prevent host from kicking themselves
            if (targetPlayer.getUserId() != null && targetPlayer.getUserId().equals(caller.getId())) {
                sendError(client, "INVALID_ACTION", "Cannot kick yourself from the room");
                return;
            }

            state.getPlayers().remove(targetSocketId);
            store.unregisterSocket(targetSocketId);

            // Notify kicked client
            try {
                com.corundumstudio.socketio.SocketIOClient targetClient = server.getClient(UUID.fromString(targetSocketId));
                if (targetClient != null) {
                    targetClient.sendEvent(ROOM_KICKED, Map.of("message", "You were removed from the lobby by the host."));
                    targetClient.leaveRoom(roomCode);
                }
            } catch (Exception ignored) {}

            // Broadcast player left to remaining players in room
            server.getRoomOperations(roomCode).sendEvent(ROOM_PLAYER_LEFT,
                    Map.of("userId", targetPlayer.getUserId() != null ? targetPlayer.getUserId().toString() : "",
                           "username", targetPlayer.getUsername()));

            log.info("Host {} kicked {} from room {}", caller.getUsername(), targetPlayer.getUsername(), roomCode);
        });

        // ── room:close (host closes the room) ──────────────────────────────────
        server.addEventListener(ROOM_CLOSE, Map.class, (client, data, ack) -> {
            String socketId = client.getSessionId().toString();
            String roomCode = (String) data.get("roomCode");
            if (roomCode == null) return;
            roomCode = roomCode.toUpperCase();

            RoomState state = store.findByCode(roomCode).orElse(null);
            if (state == null) return;

            User caller = getUserFromClient(client);
            if (caller == null) { sendError(client, "AUTH_FAILED", "Not authenticated"); return; }

            // Only host can close room
            if (state.getHostUserId() == null || !state.getHostUserId().equals(caller.getId().toString())) {
                sendError(client, "FORBIDDEN", "Only the room host can close the room");
                return;
            }

            // Notify everyone that room is closed
            server.getRoomOperations(roomCode).sendEvent(ROOM_CLOSED,
                    Map.of("message", "The room has been closed by the host."));

            // Remove all sockets from room in store
            for (String sId : state.getPlayers().keySet()) {
                store.unregisterSocket(sId);
            }

            store.removeRoom(roomCode);
            roomRepository.findByCode(roomCode).ifPresent(r -> {
                r.setStatus(RoomStatus.FINISHED);
                roomRepository.save(r);
            });

            log.info("Host {} closed room {}", caller.getUsername(), roomCode);
        });

        // ── boss:start (bot-fallback — FEAT-M01) ────────────────────────────────
        // Emitted by the frontend's "Race against a Bot" button. Creates a solo
        // BOSS_FIGHT race for the requesting player. The room must currently be in
        // WAITING state. Since boss fight is solo, we skip the ≥2-player requirement
        // and start the countdown immediately.
        server.addEventListener(BOSS_START, Map.class, (client, data, ack) -> {
            String socketId = client.getSessionId().toString();
            String roomCode = store.getRoomCodeForSocket(socketId).orElse(null);
            if (roomCode == null) { sendError(client, "NOT_IN_ROOM", "You are not in a room"); return; }

            RoomState state = store.findByCode(roomCode).orElse(null);
            if (state == null) { sendError(client, "ROOM_NOT_FOUND", "Room not found"); return; }
            if (state.getStatus() != RoomState.RoomStatus.WAITING) {
                sendError(client, "INVALID_STATE", "Boss fight can only be started from the WAITING lobby");
                return;
            }

            User user = getUserFromClient(client);
            if (user == null) { sendError(client, "AUTH_FAILED", "Not authenticated"); return; }

            // Switch room to BOSS_FIGHT mode (mode is now non-final — see RoomState)
            state.setMode(com.devtype.backend.entity.enums.RoomMode.BOSS_FIGHT);
            // Mark the requesting player as ready so countdown can start immediately
            PlayerState ps = state.getPlayers().get(socketId);
            if (ps != null) ps.setReady(true);

            // Start countdown — the BOSS_FIGHT branch in startCountdown() skips the
            // ≥2 player guard and calls bossFightHandler.startBossFight() after RACE_START.
            startCountdown(state);
            log.info("Boss fight started by {} in room {}", user.getUsername(), roomCode);
        });

        // ── disconnect ───────────────────────────────────────────────────────
        server.addDisconnectListener(client -> {
            String socketId = client.getSessionId().toString();
            store.getRoomCodeForSocket(socketId).ifPresent(roomCode -> {
                RoomState state = store.findByCode(roomCode).orElse(null);
                if (state == null) return;

                PlayerState ps = state.getPlayers().get(socketId);
                if (ps == null) return;

                ps.setDisconnected(true);
                log.info("Player {} disconnected from room {} — 30s grace period", ps.getUsername(), roomCode);

                // Notify others
                server.getRoomOperations(roomCode).sendEvent(ROOM_PLAYER_LEFT,
                        Map.of("userId", ps.getUserId().toString(), "username", ps.getUsername()));

                // Start 30-second grace timer
                ScheduledFuture<?> graceTimer = scheduler.schedule(() -> {
                    PlayerState current = state.getPlayers().get(socketId);
                    if (current != null && current.isDisconnected()) {
                        log.info("Grace period expired for {} in room {} — forfeiting", current.getUsername(), roomCode);
                        state.getPlayers().remove(socketId);
                        store.unregisterSocket(socketId);

                        // ── BUG-C02/EDGE-07: Clean up empty rooms regardless of status ──
                        if (state.getPlayers().isEmpty()) {
                            log.info("Room {} empty after grace expiry (status={}) — removing", roomCode, state.getStatus());
                            // BUG-H02: cancel bot tasks before removing the room
                            cancelBotTasksSilently(state);
                            store.removeRoom(roomCode);
                            roomRepository.findByCode(roomCode).ifPresent(r -> {
                                r.setStatus(RoomStatus.FINISHED);
                                roomRepository.save(r);
                            });
                        } else if (state.getStatus() == RoomState.RoomStatus.RACING
                                && state.getActivePlayers().size() <= 1) {
                            // Only one active racer left — end the race early
                            endRaceEarly(state);
                        } else if (state.getStatus() == RoomState.RoomStatus.RACING
                                && state.getMode() == com.devtype.backend.entity.enums.RoomMode.RELAY) {
                            // BUG-H01: In RELAY mode, if the disconnecting player was the current
                            // turn-holder, advance the turn so the next player isn't blocked.
                            List<PlayerState> ordered = state.getOrderedRelayPlayers();
                            int turnIdx = state.getRelayTurnIndex();
                            if (turnIdx < ordered.size()) {
                                PlayerState turnHolder = ordered.get(turnIdx);
                                if (current.getSocketId().equals(turnHolder.getSocketId())) {
                                    log.info("Relay turn-holder {} disconnected in room {} — advancing turn",
                                            current.getUsername(), roomCode);
                                    relayHandler.advanceTurn(state);
                                }
                            }
                        }
                    }
                }, Instant.now().plusSeconds(30));

                state.getGraceTimers().put(socketId, graceTimer);
            });

            store.removeDuelQueue(socketId);
        });
    }

    // ── Countdown ────────────────────────────────────────────────────────────

    void startCountdown(RoomState state) {
        if (state.getStatus() != RoomState.RoomStatus.WAITING) return;
        state.setStatus(RoomState.RoomStatus.COUNTDOWN);
        String roomCode = state.getRoomCode();

        AtomicInteger count = new AtomicInteger(3);
        Runnable tick = new Runnable() {
            @Override
            public void run() {
                int c = count.getAndDecrement();
                server.getRoomOperations(roomCode).sendEvent(RACE_COUNTDOWN, Map.of("count", c));
                if (c <= 0) {
                    // ── BUG-C04: Re-verify player count before RACE_START fires ──
                    // Skip this check for BOSS_FIGHT — it is a solo mode and the
                    // boss pseudo-player hasn't been added yet at this point.
                    boolean isBossFight = state.getMode() == com.devtype.backend.entity.enums.RoomMode.BOSS_FIGHT;
                    long activeCount = state.getActivePlayers().size();
                    if (!isBossFight && activeCount < 2) {
                        log.warn("Race cancelled in room {} — only {} active player(s) at start", roomCode, activeCount);
                        state.setStatus(RoomState.RoomStatus.WAITING);
                        state.getPlayers().values().forEach(p -> p.setReady(false));
                        server.getRoomOperations(roomCode).sendEvent(RACE_CANCELLED,
                                Map.of("reason", "Not enough players"));
                        return;
                    }

                    state.setStatus(RoomState.RoomStatus.RACING);
                    state.setRaceStartedAt(Instant.now());
                    Map<String, Object> startPayload = new HashMap<>();
                    startPayload.put("startedAt", state.getRaceStartedAt().toEpochMilli());
                    startPayload.put("snippet", buildSnippetPayload(state));
                    server.getRoomOperations(roomCode).sendEvent(RACE_START, startPayload);
                    log.info("Race started in room {} mode={}", roomCode, state.getMode());

                    // ── FEAT-S05/EDGE-11: idle-player reaper ──
                    // Skip for BOSS_FIGHT — solo mode, the boss drives completion.
                    if (!isBossFight) startIdleReaper(state);

                    // Dispatch mode-specific startup logic
                    switch (state.getMode()) {
                        case BATTLE_ROYALE -> battleRoyaleHandler.startRoyaleRounds(state);
                        case RELAY         -> relayHandler.initRelay(state);
                        case BOSS_FIGHT    -> {
                            state.getActivePlayers().stream()
                                    .filter(p -> p.getUserId() != null)
                                    .findFirst()
                                    .ifPresent(p -> bossFightHandler.startBossFight(state, p.getUserId()));
                        }
                        default -> {} // CLASSIC_RACE, DUEL, GHOST, BUG_FIX handled via events
                    }
                } else {
                    scheduler.schedule(this, Instant.now().plusSeconds(1));
                }
            }
        };
        scheduler.schedule(tick, Instant.now().plusSeconds(1));
    }

    /**
     * FEAT-S05 / EDGE-11 — Per-room idle-player reaper.
     *
     * <p>Runs every 10 seconds while the room is RACING. Any player who has not
     * sent a {@code race:progress} event within the last 60 seconds is assumed idle
     * and marked DNF (placement=-1, dnf=true). This prevents {@link RaceEventHandler#finalizeRace}
     * from blocking forever waiting for a player who stopped typing without disconnecting.
     *
     * <p>After marking DNF players, if all remaining active players have finished
     * (or there are none), the race is finalized automatically.
     */
    private void startIdleReaper(RoomState state) {
        String roomCode = state.getRoomCode();
        Instant[] lastCheck = {Instant.now()};

        Runnable reaper = new Runnable() {
            @Override
            public void run() {
                if (state.getStatus() != RoomState.RoomStatus.RACING) return;

                Instant idleCutoff = Instant.now().minusSeconds(60);
                boolean anyMarkedDnf = false;

                for (PlayerState p : state.getPlayers().values()) {
                    // Skip already-finished, disconnected, eliminated, or DNF players
                    if (p.getPlacement() != 0 || p.isDisconnected() || p.isEliminated() || p.isDnf()) continue;

                    Instant lastUpdate = p.getLastProgressUpdateTimestamp();
                    if (lastUpdate != null && lastUpdate.isBefore(idleCutoff)) {
                        log.info("Marking player {} in room {} as DNF (idle >60s)", p.getUsername(), roomCode);
                        p.setDnf(true);
                        p.setPlacement(-1);
                        anyMarkedDnf = true;

                        // Notify the room that this player is DNF
                        server.getRoomOperations(roomCode).sendEvent(RACE_PLAYER_FINISHED, Map.of(
                                "userId", p.getUserId() != null ? p.getUserId().toString() : "",
                                "username", p.getUsername(),
                                "wpm", p.getWpm(),
                                "placement", -1,
                                "dnf", true
                        ));
                    }
                }

                if (anyMarkedDnf || state.getActivePlayers().isEmpty()) {
                    // Check whether the race can now finalize
                    long unfinished = state.getActivePlayers().stream()
                            .filter(p -> p.getPlacement() == 0)
                            .count();
                    if (unfinished == 0 && !state.getPlayers().isEmpty()) {
                        // Cancel the reaper before finalizing to avoid re-entrant calls
                        cancelIdleReaper(state);
                        // Delegate to RaceEventHandler via endRaceEarly which handles finalization
                        endRaceEarly(state);
                        return;
                    }
                }

                // Re-schedule for next 10s tick
                if (state.getStatus() == RoomState.RoomStatus.RACING) {
                    ScheduledFuture<?> next = scheduler.schedule(this, Instant.now().plusSeconds(10));
                    state.setIdleReaperTask(next);
                }
            }
        };

        ScheduledFuture<?> first = scheduler.schedule(reaper, Instant.now().plusSeconds(10));
        state.setIdleReaperTask(first);
    }

    private void cancelIdleReaper(RoomState state) {
        ScheduledFuture<?> task = state.getIdleReaperTask();
        if (task != null && !task.isDone()) {
            task.cancel(false);
            state.setIdleReaperTask(null);
        }
    }

    // ── BUG-C02/EDGE-07: Global safety-net reaper for stale WAITING rooms ────
    /**
     * Runs every 5 minutes and closes any WAITING room whose in-memory
     * {@code createdAt} is older than 30 minutes. This catches rooms that the
     * per-player disconnect path misses (e.g., all players hard-refreshed without
     * a clean Socket.IO disconnect event).
     */
    @Scheduled(fixedDelay = 5 * 60 * 1000) // every 5 minutes
    public void reaperSweepStaleWaitingRooms() {
        Instant cutoff = Instant.now().minus(Duration.ofMinutes(30));
        for (RoomState state : store.allRooms()) {
            if (state.getStatus() == RoomState.RoomStatus.WAITING
                    && state.getCreatedAt().isBefore(cutoff)) {
                String roomCode = state.getRoomCode();
                log.info("Reaper: closing stale WAITING room {} (created {})", roomCode, state.getCreatedAt());
                store.removeRoom(roomCode);
                for (String sid : state.getPlayers().keySet()) {
                    store.unregisterSocket(sid);
                }
                roomRepository.findByCode(roomCode).ifPresent(r -> {
                    r.setStatus(RoomStatus.FINISHED);
                    roomRepository.save(r);
                });
            }
        }
    }

    private void endRaceEarly(RoomState state) {
        if (state.getStatus() == RoomState.RoomStatus.FINISHED) return;
        state.setStatus(RoomState.RoomStatus.FINISHED);
        cancelIdleReaper(state);
        // BUG-H02: cancel ghost/boss tasks so they stop broadcasting to a dead room
        cancelBotTasksSilently(state);
        // Assign placement only to real (non-bot) active players
        state.getActivePlayers().stream()
                .filter(p -> !p.isBot())
                .forEach(p -> { if (p.getPlacement() == 0) p.setPlacement(state.incrementAndGetFinished()); });
        // BUG-H07: mark remaining unfinished real players as DNF
        assignDnfToUnfinishedPlayers(state);
        List<Map<String, Object>> results = buildResultsPayload(state);
        server.getRoomOperations(state.getRoomCode()).sendEvent(RACE_RESULTS, Map.of("results", results));
        persistenceService.persistMatchResults(state);
        scheduleRoomCleanup(state.getRoomCode());
    }

    /**
     * BUG-H07 — Assign placement=-1 / dnf=true to any real player still at placement=0.
     * FEAT-M04/BUG-H08: bot entries (ghost/boss) are skipped — they must never appear
     * in the results screen or in match persistence records.
     */
    private void assignDnfToUnfinishedPlayers(RoomState state) {
        for (PlayerState p : state.getPlayers().values()) {
            if (!p.isBot() && p.getPlacement() == 0 && !p.isDnf()) {
                p.setDnf(true);
                p.setPlacement(-1);
                log.info("Assigned DNF to player {} in room {} (never finished)", p.getUsername(), state.getRoomCode());
            }
        }
    }

    void scheduleRoomCleanup(String roomCode) {
        scheduler.schedule(() -> store.removeRoom(roomCode), Instant.now().plusSeconds(120));
    }

    /**
     * BUG-H02: Cancel ghost and boss scheduled tasks silently.
     * Called from endRaceEarly() and the empty-room grace-timer path so stale
     * fixed-rate tasks don't keep broadcasting to a room that no longer exists.
     */
    private void cancelBotTasksSilently(RoomState state) {
        ScheduledFuture<?> ghost = state.getGhostTask();
        if (ghost != null && !ghost.isDone()) ghost.cancel(false);
        state.setGhostTask(null);
        ScheduledFuture<?> boss = state.getBossTask();
        if (boss != null && !boss.isDone()) boss.cancel(false);
        state.setBossTask(null);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    User getUserFromClient(com.corundumstudio.socketio.SocketIOClient client) {
        try {
            String token = client.getHandshakeData().getSingleUrlParam("token");
            if (token == null || token.isBlank()) return null;
            String email = jwtUtil.extractUsername(token);
            return userRepository.findByEmail(email).orElse(null);
        } catch (Exception e) {
            return null;
        }
    }

    private RoomState buildRoomState(MultiplayerRoom dbRoom) {
        RoomState state = new RoomState(dbRoom.getCode(), dbRoom.getId(), dbRoom.getMode());
        if (dbRoom.getSnippet() != null) {
            Snippet s = dbRoom.getSnippet();
            state.setSnippetId(s.getId().toString());
            state.setSnippetTitle(s.getTitle());
            state.setSnippetLanguage(s.getLanguage());
            state.setSnippetCode(s.getCode());
            state.setBuggyCode(s.getBuggyCode());
        }
        return state;
    }

    /**
     * Builds the {@code room:joined} payload.
     *
     * <p>EDGE-01/EDGE-02 / FEAT-S09: includes the current room {@code status} and,
     * when RACING, the {@code raceStartedAt} epoch-millis so a client joining or
     * reconnecting mid-race can immediately sync rather than waiting for a broadcast
     * it already missed.
     *
     * <p>Per-player {@code progress} and {@code currentIndex} are also included so
     * reconnecting clients can restore their visual position on the race track.
     */
    Map<String, Object> buildRoomJoinedPayload(RoomState state, String currentUserId) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("roomCode", state.getRoomCode());
        payload.put("mode", state.getMode().name());
        payload.put("snippet", buildSnippetPayload(state));
        payload.put("players", state.getPlayers().values().stream().map(this::playerToMap).toList());
        payload.put("hostId", state.getHostUserId() != null ? state.getHostUserId() : currentUserId);

        // EDGE-01/EDGE-02: include current room status so late-joiners can sync
        payload.put("status", state.getStatus().name());

        // EDGE-02 / FEAT-S09: include race start time when racing so the client can
        // compute elapsed time and know the race is live
        if (state.getStatus() == RoomState.RoomStatus.RACING
                || state.getStatus() == RoomState.RoomStatus.COUNTDOWN) {
            if (state.getRaceStartedAt() != null) {
                payload.put("raceStartedAt", state.getRaceStartedAt().toEpochMilli());
            }
        }

        return payload;
    }

    Map<String, Object> buildSnippetPayload(RoomState state) {
        Map<String, Object> snippet = new HashMap<>();
        snippet.put("id", state.getSnippetId());
        snippet.put("title", state.getSnippetTitle());
        snippet.put("language", state.getSnippetLanguage());
        snippet.put("code", state.getSnippetCode());
        if (state.getBuggyCode() != null) snippet.put("buggyCode", state.getBuggyCode());
        if (state.getSnippetDescription() != null) snippet.put("description", state.getSnippetDescription());
        return snippet;
    }

    /**
     * Serialises a {@link PlayerState} for broadcast.
     *
     * <p>FEAT-S09: includes {@code progress} (0–100) so reconnecting clients can
     * restore each player's visual position on the race track without waiting for
     * the next {@code race:progress} event.
     */
    Map<String, Object> playerToMap(PlayerState p) {
        Map<String, Object> m = new HashMap<>();
        m.put("userId",    p.getUserId() != null ? p.getUserId().toString() : "");
        m.put("username",  p.getUsername());
        m.put("progress",  p.getProgress());
        m.put("wpm",       p.getWpm());
        m.put("isReady",   p.isReady());
        m.put("placement", p.getPlacement());
        m.put("dnf",       p.isDnf());
        return m;
    }

    /**
     * BUG-H07 — Results payload.
     * FEAT-M04/BUG-H08: bot pseudo-players (ghost, boss) are excluded entirely so
     * only real human players appear in the results screen and leaderboard.
     */
    List<Map<String, Object>> buildResultsPayload(RoomState state) {
        return state.getPlayers().values().stream()
                // FEAT-M04/BUG-H08: filter out bot entries (ghost / boss AI)
                .filter(p -> !p.isBot())
                .sorted(Comparator.comparingInt(p -> {
                    int pl = p.getPlacement();
                    // placement=-1 (DNF) sorts after all ranked finishers
                    return (pl <= 0) ? Integer.MAX_VALUE : pl;
                }))
                .map(p -> {
                    Map<String, Object> r = new HashMap<>();
                    r.put("userId",    p.getUserId() != null ? p.getUserId().toString() : "");
                    r.put("username",  p.getUsername());
                    r.put("wpm",       p.getWpm());
                    r.put("accuracy",  p.getAccuracy());
                    r.put("placement", p.getPlacement());
                    r.put("progress",  p.getProgress());
                    r.put("dnf",       p.isDnf());
                    if (p.getFinishedAt() != null && state.getRaceStartedAt() != null) {
                        long ms = Math.max(0, Duration.between(state.getRaceStartedAt(), p.getFinishedAt()).toMillis());
                        r.put("durationMs",   ms);
                        r.put("timeTakenSec", ms / 1000.0);
                    }
                    return r;
                }).toList();
    }

    private void cancelGraceTimer(RoomState state, String socketId) {
        ScheduledFuture<?> timer = state.getGraceTimers().remove(socketId);
        if (timer != null) timer.cancel(false);
    }

    /**
     * BUG-L01: generates a 6-character room code using {@link java.security.SecureRandom}
     * and checks for DB collisions in an iterative loop (no stack-overflow risk under load).
     */
    private String generateRoomCode() {
        String chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        String code;
        do {
            StringBuilder sb = new StringBuilder(6);
            for (int i = 0; i < 6; i++) sb.append(chars.charAt(SECURE_RANDOM.nextInt(chars.length())));
            code = sb.toString();
        } while (roomRepository.existsByCode(code));
        return code;
    }

    private RoomMode parseMode(String modeStr) {
        try { return RoomMode.valueOf(modeStr.toUpperCase()); }
        catch (Exception e) { return RoomMode.CLASSIC_RACE; }
    }

    private int getRoomCapacity(RoomState state) {
        return switch (state.getMode()) {
            case DUEL -> 2;
            case RELAY -> 6;
            case BATTLE_ROYALE -> 16;
            default -> 8;
        };
    }

    private void handleSpectate(SocketIOClient client, Map data) {
        String roomCode = (String) data.get("roomCode");
        if (roomCode == null || roomCode.isBlank()) {
            sendError(client, "INVALID_ROOM_CODE", "Room code is required to spectate");
            return;
        }

        Optional<RoomState> optState = store.findByCode(roomCode);
        if (optState.isEmpty()) {
            sendError(client, "ROOM_NOT_FOUND", "Room not found: " + roomCode);
            return;
        }

        RoomState state = optState.get();
        client.joinRoom(roomCode);

        Map<String, Object> payload = buildRoomJoinedPayload(state, "spectator");
        payload.put("isSpectator", true);
        client.sendEvent(ROOM_JOINED, payload);
        log.info("Client {} joined room {} as spectator", client.getSessionId(), roomCode);
    }


    void sendError(com.corundumstudio.socketio.SocketIOClient client, String code, String message) {
        client.sendEvent(ERROR, Map.of("code", code, "message", message));
    }
}


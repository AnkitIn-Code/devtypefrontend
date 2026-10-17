package com.devtype.backend.socket;

import com.corundumstudio.socketio.SocketIOServer;
import com.devtype.backend.entity.DuelRating;
import com.devtype.backend.entity.MultiplayerRoom;
import com.devtype.backend.entity.User;
import com.devtype.backend.entity.enums.RoomMode;
import com.devtype.backend.entity.enums.RoomStatus;
import com.devtype.backend.repository.DuelRatingRepository;
import com.devtype.backend.repository.MultiplayerRoomRepository;
import com.devtype.backend.repository.UserRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.*;

import static com.devtype.backend.socket.SocketEventConstants.*;

/**
 * Handles 1v1 ranked DUEL matchmaking and ELO rating updates.
 *
 * <p>Flow:
 * <ol>
 *   <li>Client emits {@code duel:queue} to join matchmaking.</li>
 *   <li>If an opponent is waiting, both are paired and {@code duel:matchFound} is sent to each.</li>
 *   <li>After the race, ELO is computed with K=32 and {@code duel:ratingUpdate} is sent to each player.</li>
 * </ol>
 *
 * <p>ELO formula: {@code E_a = 1 / (1 + 10^((R_b - R_a)/400))}
 * {@code R_a' = R_a + K * (S_a - E_a)}  where S_a=1 for win, 0 for loss.
 *
 * <p>BUG-C03: The duel {@link MultiplayerRoom} is now persisted to the DB before being
 * added to the in-memory store, so {@link MatchPersistenceService} can look it up by
 * code when the race finalises.
 *
 * <p>BUG-L01: Room codes are generated with {@link SecureRandom} and checked for
 * DB collisions, matching the behaviour of {@link RoomEventHandler#generateRoomCode()}.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class DuelHandler {

    private static final int ELO_K_FACTOR = 32;

    /**
     * BUG-L01: use a single cryptographically-strong SecureRandom instance.
     * SecureRandom is thread-safe so this static field is safe to share.
     */
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final SocketIOServer server;
    private final RoomStateStore store;
    private final RoomEventHandler roomHandler;
    private final DuelRatingRepository duelRatingRepository;
    private final UserRepository userRepository;
    // BUG-C03: inject the repository so we can persist the room before adding it to the store
    private final MultiplayerRoomRepository roomRepository;

    @PostConstruct
    public void registerHandlers() {

        // ── duel:queue ────────────────────────────────────────────────────────
        server.addEventListener(DUEL_QUEUE, Map.class, (client, data, ack) -> {
            User user = roomHandler.getUserFromClient(client);
            if (user == null) { roomHandler.sendError(client, "AUTH_FAILED", "Not authenticated"); return; }

            String userId = user.getId().toString();
            String socketId = client.getSessionId().toString();

            // Check if already in a room
            if (store.getRoomCodeForSocket(socketId).isPresent()) {
                roomHandler.sendError(client, "ALREADY_IN_ROOM", "Leave your current room first");
                return;
            }

            // Try to find an opponent
            Optional<String[]> opponentOpt = store.dequeueDuelPair(userId);
            if (opponentOpt.isPresent()) {
                String[] opponent = opponentOpt.get();
                String opponentUserId = opponent[0];
                String opponentSocketId = opponent[1];

                User opponentUser = userRepository.findById(UUID.fromString(opponentUserId)).orElse(null);
                if (opponentUser == null) {
                    // Opponent left — re-queue this player
                    store.enqueueDuel(userId, socketId);
                    client.sendEvent(DUEL_MATCH_FOUND, Map.of(
                            "status", "QUEUING",
                            "message", "Searching for opponent..."
                    ));
                    return;
                }

                // BUG-C03: createDuelRoom now persists to DB and returns the RoomState
                String roomCode = createDuelRoom(user, opponentUser, socketId, opponentSocketId);

                if (roomCode == null) {
                    roomHandler.sendError(client, "INTERNAL_ERROR", "Could not create duel room");
                    return;
                }

                // Get ELO ratings for both players
                DuelRating myRating = getOrCreateRating(user);
                DuelRating theirRating = getOrCreateRating(opponentUser);

                // Notify both players
                com.corundumstudio.socketio.SocketIOClient opponentClient = server.getClient(
                        UUID.fromString(opponentSocketId));

                Map<String, Object> matchPayload = new HashMap<>();
                matchPayload.put("roomCode", roomCode);
                matchPayload.put("opponent", Map.of(
                        "userId", opponentUser.getId().toString(),
                        "username", opponentUser.getUsername(),
                        "eloRating", theirRating.getEloRating()
                ));
                client.sendEvent(DUEL_MATCH_FOUND, matchPayload);

                if (opponentClient != null) {
                    Map<String, Object> opponentPayload = new HashMap<>();
                    opponentPayload.put("roomCode", roomCode);
                    opponentPayload.put("opponent", Map.of(
                            "userId", user.getId().toString(),
                            "username", user.getUsername(),
                            "eloRating", myRating.getEloRating()
                    ));
                    opponentClient.sendEvent(DUEL_MATCH_FOUND, opponentPayload);
                }

                log.info("Duel matched: {} vs {} in room {}", user.getUsername(), opponentUser.getUsername(), roomCode);

            } else {
                // No opponent yet — queue this player
                store.enqueueDuel(userId, socketId);
                client.sendEvent(DUEL_MATCH_FOUND, Map.of(
                        "status", "QUEUING",
                        "message", "Searching for opponent..."
                ));
                log.info("Player {} queued for duel matchmaking", user.getUsername());
            }
        });
    }

    /**
     * Called from {@link RaceEventHandler} after DUEL race finalizes.
     * Computes ELO K=32, persists, and emits {@code duel:ratingUpdate} to both players.
     */
    public void updateDuelElo(RoomState state) {
        if (state.getMode() != RoomMode.DUEL) return;

        List<PlayerState> players = state.getPlayers().values().stream()
                .filter(p -> p.getUserId() != null)
                .sorted(Comparator.comparingInt(p -> (p.getPlacement() == 0 ? Integer.MAX_VALUE : p.getPlacement())))
                .toList();

        if (players.size() < 2) return;

        PlayerState winner = players.get(0);
        PlayerState loser  = players.get(1);

        DuelRating winnerRating = getOrCreateRating(
                userRepository.findById(winner.getUserId()).orElse(null));
        DuelRating loserRating  = getOrCreateRating(
                userRepository.findById(loser.getUserId()).orElse(null));

        if (winnerRating == null || loserRating == null) return;

        int[] deltas = computeElo(winnerRating.getEloRating(), loserRating.getEloRating());
        int winnerDelta = deltas[0];
        int loserDelta  = deltas[1];

        winnerRating.setEloRating(winnerRating.getEloRating() + winnerDelta);
        winnerRating.setWins(winnerRating.getWins() + 1);
        winnerRating.setUpdatedAt(Instant.now());
        duelRatingRepository.save(winnerRating);

        loserRating.setEloRating(Math.max(100, loserRating.getEloRating() + loserDelta));
        loserRating.setLosses(loserRating.getLosses() + 1);
        loserRating.setUpdatedAt(Instant.now());
        duelRatingRepository.save(loserRating);

        // Notify players
        com.corundumstudio.socketio.SocketIOClient winnerClient = server.getClient(
                UUID.fromString(winner.getSocketId()));
        com.corundumstudio.socketio.SocketIOClient loserClient  = server.getClient(
                UUID.fromString(loser.getSocketId()));

        if (winnerClient != null) {
            winnerClient.sendEvent(DUEL_RATING_UPDATE, Map.of(
                    "newRating", winnerRating.getEloRating(),
                    "delta", winnerDelta,
                    "wins", winnerRating.getWins(),
                    "losses", winnerRating.getLosses()
            ));
        }
        if (loserClient != null) {
            loserClient.sendEvent(DUEL_RATING_UPDATE, Map.of(
                    "newRating", loserRating.getEloRating(),
                    "delta", loserDelta,
                    "wins", loserRating.getWins(),
                    "losses", loserRating.getLosses()
            ));
        }
    }

    // ── ELO calculation ───────────────────────────────────────────────────────

    /**
     * @return [winnerDelta, loserDelta] (loserDelta is negative)
     */
    private int[] computeElo(int winnerRating, int loserRating) {
        double expectedWinner = 1.0 / (1.0 + Math.pow(10.0, (loserRating - winnerRating) / 400.0));
        double expectedLoser  = 1.0 - expectedWinner;
        int winnerDelta = (int) Math.round(ELO_K_FACTOR * (1.0 - expectedWinner));
        int loserDelta  = (int) Math.round(ELO_K_FACTOR * (0.0 - expectedLoser));
        return new int[]{winnerDelta, loserDelta};
    }

    private DuelRating getOrCreateRating(User user) {
        if (user == null) return null;
        return duelRatingRepository.findByUserId(user.getId())
                .orElseGet(() -> {
                    DuelRating r = DuelRating.builder().user(user).build();
                    return duelRatingRepository.save(r);
                });
    }

    /**
     * Creates a DUEL room, persists it to DB, registers both players' sockets, and
     * adds the in-memory {@link RoomState} to the store.
     *
     * <p>BUG-C03: previously the room was never saved to the DB, so
     * {@link MatchPersistenceService} could never find it after the race and silently
     * dropped XP, credits, and achievements for all duel matches.
     *
     * <p>BUG-L01: codes are generated with {@link SecureRandom} and collision-checked
     * against the DB (same logic as {@link RoomEventHandler#generateRoomCode()}).
     *
     * @param hostSocketId     socket ID of the host player
     * @param opponentSocketId socket ID of the opponent player
     * @return room code, or {@code null} on failure
     */
    private String createDuelRoom(User host, User opponent,
                                  String hostSocketId, String opponentSocketId) {
        try {
            // BUG-L01: collision-checked, SecureRandom-generated code
            String roomCode = generateRoomCode();

            // BUG-C03: build the entity and persist it BEFORE touching the in-memory store
            MultiplayerRoom dbRoom = MultiplayerRoom.builder()
                    .code(roomCode)
                    .mode(RoomMode.DUEL)
                    .status(RoomStatus.WAITING)
                    .host(host)
                    .maxPlayers(2)
                    .build();

            // Persist: this assigns the DB-generated UUID we use for RoomState
            dbRoom = roomRepository.save(dbRoom);

            // Build in-memory state using the persisted entity's ID
            RoomState state = new RoomState(roomCode, dbRoom.getId(), RoomMode.DUEL);
            state.setHostUserId(host.getId().toString());

            // Register both players' sockets so getRoomCodeForSocket() works for
            // disconnect handling and MatchPersistenceService look-up
            PlayerState hostPs = PlayerState.of(host.getId(), host.getUsername(), hostSocketId);
            PlayerState guestPs = PlayerState.of(opponent.getId(), opponent.getUsername(), opponentSocketId);

            state.getPlayers().put(hostSocketId, hostPs);
            state.getPlayers().put(opponentSocketId, guestPs);

            store.addRoom(state);
            store.registerSocket(hostSocketId, roomCode);
            store.registerSocket(opponentSocketId, roomCode);

            log.info("Duel room {} created in DB (id={}) for {} vs {}",
                    roomCode, dbRoom.getId(), host.getUsername(), opponent.getUsername());
            return roomCode;
        } catch (Exception e) {
            log.error("Error creating duel room: {}", e.getMessage(), e);
            return null;
        }
    }

    /**
     * BUG-L01: generates a 6-character room code using {@link SecureRandom} and
     * checks for collisions against the DB (same logic as RoomEventHandler).
     */
    private String generateRoomCode() {
        String chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        String code;
        do {
            StringBuilder sb = new StringBuilder(6);
            for (int i = 0; i < 6; i++) sb.append(chars.charAt(SECURE_RANDOM.nextInt(chars.length())));
            code = sb.toString();
        } while (roomRepository.existsByCode(code)); // collision guard
        return code;
    }
}

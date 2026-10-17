package com.devtype.backend.socket;

import com.devtype.backend.entity.MultiplayerRoom;
import com.devtype.backend.entity.User;
import com.devtype.backend.entity.MatchParticipant;
import com.devtype.backend.entity.enums.RoomMode;
import com.devtype.backend.entity.enums.RoomStatus;
import com.devtype.backend.repository.MultiplayerRoomRepository;
import com.devtype.backend.repository.MatchParticipantRepository;
import com.devtype.backend.repository.SnippetRepository;
import com.devtype.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;

/**
 * Persists match results to the database when a race finishes.
 * Also awards XP (+50 per finish, bonus for winner) and credits (+5).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MatchPersistenceService {

    private final MultiplayerRoomRepository roomRepository;
    private final MatchParticipantRepository participantRepository;
    private final UserRepository userRepository;
    private final SnippetRepository snippetRepository;
    private final com.devtype.backend.service.XpService xpService;
    private final com.devtype.backend.service.CreditService creditService;
    private final com.devtype.backend.service.AchievementService achievementService;

    // BUG-C03: inject lazily to avoid circular dependency
    // MatchPersistenceService ← DuelHandler ← RoomEventHandler ← MatchPersistenceService
    @org.springframework.context.annotation.Lazy
    @org.springframework.beans.factory.annotation.Autowired
    private DuelHandler duelHandler;

    @Transactional
    public void persistMatchResults(RoomState roomState) {
        try {
            MultiplayerRoom room = roomRepository.findByCode(roomState.getRoomCode())
                    .orElse(null);
            if (room == null) {
                log.warn("Cannot persist results — room {} not found in DB", roomState.getRoomCode());
                return;
            }

            room.setStatus(RoomStatus.FINISHED);
            roomRepository.save(room);

            List<PlayerState> players = new ArrayList<>(roomState.getPlayers().values());
            players.sort(Comparator.comparingInt(p -> (p.getPlacement() == 0 ? Integer.MAX_VALUE : p.getPlacement())));

            for (PlayerState ps : players) {
                // Skip bot pseudo-players (ghost, boss) — they have no DB user to update
                if (ps.getUserId() == null || ps.isBot()) continue;

                User user = userRepository.findById(ps.getUserId()).orElse(null);
                if (user == null) continue;

                MatchParticipant participant = MatchParticipant.builder()
                        .room(room)
                        .user(user)
                        .progressPercent(BigDecimal.valueOf(ps.getProgress()))
                        .wpm(ps.getWpm())
                        .finishedAt(ps.getFinishedAt())
                        .placement(ps.getPlacement() > 0 ? ps.getPlacement() : null)
                        .eliminatedAtRound(ps.isEliminated() ? roomState.getRoyaleRound() : null)
                        .build();

                participantRepository.save(participant);

                // Award XP and credits via services
                int xpAward = ps.getPlacement() == 1 ? 100 : 50;
                xpService.awardXp(user, xpAward, "Multiplayer race placement: " + (ps.getPlacement() > 0 ? ps.getPlacement() : "Finished"));
                creditService.earn(user, 10, "Multiplayer race completion");

                // Check for achievements (e.g. MULTIPLAYER_WINS)
                achievementService.checkAchievements(user);
            }
            log.info("Persisted match results for room {}, {} participants", roomState.getRoomCode(), players.size());

            // BUG-C03: trigger ELO update for DUEL rooms
            if (roomState.getMode() == RoomMode.DUEL) {
                duelHandler.updateDuelElo(roomState);
            }
        } catch (Exception e) {
            log.error("Error persisting match results for room {}: {}", roomState.getRoomCode(), e.getMessage(), e);
        }
    }
}

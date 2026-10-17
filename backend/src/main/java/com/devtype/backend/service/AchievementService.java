package com.devtype.backend.service;

import com.corundumstudio.socketio.SocketIOServer;
import com.devtype.backend.entity.*;
import com.devtype.backend.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class AchievementService {

    private final AchievementRepository achievementRepository;
    private final UserAchievementRepository userAchievementRepository;
    private final TypingSessionRepository typingSessionRepository;
    private final SnippetRepository snippetRepository;
    private final MatchParticipantRepository matchParticipantRepository;
    private final DailyChallengeResultRepository dailyChallengeResultRepository;
    private final CreditLedgerRepository creditLedgerRepository;
    private final XpService xpService;
    private final CreditService creditService;
    private final SocketIOServer socketIOServer;
    private final UserRepository userRepository;

    private static class UserStats {
        long templatesCount;
        long sessionsCount;
        int bestWpm;
        int perfectSessionsCount;
        int streakDays;
        int level;
        long multiplayerWins;
        long dailyChallenges;
    }

    private UserStats fetchUserStats(User user) {
        UserStats stats = new UserStats();
        try {
            stats.templatesCount = snippetRepository.countByAuthorId(user.getId());
            stats.sessionsCount = typingSessionRepository.countByUserId(user.getId());
            stats.bestWpm = typingSessionRepository.findTopByUserIdOrderByWpmDesc(user.getId())
                    .map(TypingSession::getWpm).orElse(0);
            stats.perfectSessionsCount = typingSessionRepository.findPerfectSessionsByUserId(user.getId()).size();
            stats.streakDays = user.getCurrentStreak() != null ? user.getCurrentStreak() : 0;
            stats.level = user.getLevel() != null ? user.getLevel() : 1;
            stats.multiplayerWins = matchParticipantRepository.countByUserIdAndPlacement(user.getId(), 1);
            stats.dailyChallenges = dailyChallengeResultRepository.countByIdUserId(user.getId());
        } catch (Exception e) {
            log.warn("Error fetching user stats for achievements evaluation: {}", e.getMessage());
        }
        return stats;
    }

    @Transactional
    public List<Achievement> checkAchievements(User user) {
        List<Achievement> unlockedList = new ArrayList<>();
        List<Achievement> allAchievements = achievementRepository.findAll();
        List<UserAchievement> existingUnlocked = userAchievementRepository.findUnlockedWithAchievementByUserId(user.getId());

        Set<UUID> alreadyUnlockedIds = new HashSet<>();
        for (UserAchievement ua : existingUnlocked) {
            if (ua.getAchievement() != null) {
                alreadyUnlockedIds.add(ua.getAchievement().getId());
            }
        }

        UserStats stats = fetchUserStats(user);

        for (Achievement achievement : allAchievements) {
            if (alreadyUnlockedIds.contains(achievement.getId())) continue;

            int progress = calculateProgress(stats, achievement);
            boolean conditionMet = evaluateCriteria(stats, achievement) || progress >= 100;
            if (conditionMet) {
                UserAchievement userAchievement = UserAchievement.builder()
                        .id(new UserAchievementId(user.getId(), achievement.getId()))
                        .user(user)
                        .achievement(achievement)
                        .unlockedAt(Instant.now())
                        .build();

                userAchievementRepository.saveAndFlush(userAchievement);
                unlockedList.add(achievement);
                alreadyUnlockedIds.add(achievement.getId());

                // Award XP and Credits for achievement
                if (achievement.getXpReward() != null && achievement.getXpReward() > 0) {
                    xpService.awardXp(user, achievement.getXpReward(), "Achievement unlock: " + achievement.getName());
                }
                creditService.earn(user, 50, "Achievement unlock: " + achievement.getName());

                // Emit Socket event to user's socket room
                emitAchievementNotification(user.getId(), achievement);
                log.info("User {} unlocked achievement: {}", user.getUsername(), achievement.getName());
            }
        }

        return unlockedList;
    }

    private boolean evaluateCriteria(UserStats stats, Achievement achievement) {
        String type = achievement.getCriteriaType() != null ? achievement.getCriteriaType() : "";
        String code = achievement.getCode() != null ? achievement.getCode() : "";
        int value = achievement.getCriteriaValue();

        if ("TEMPLATES_CREATED".equalsIgnoreCase(type) || type.startsWith("TEMPLATE_") || code.contains("TEMPLATE")) {
            return stats.templatesCount >= value;
        }

        if ("SESSIONS_COMPLETED".equalsIgnoreCase(type) || code.contains("SESSION") || code.startsWith("SESSIONS_")) {
            return stats.sessionsCount >= value;
        }

        if ("WPM_REACHED".equalsIgnoreCase(type) || code.startsWith("WPM_") || code.startsWith("SPEED_")) {
            return stats.bestWpm >= value;
        }

        if ("ACCURACY_100".equalsIgnoreCase(type) || "ACCURACY_PERFECT".equalsIgnoreCase(type) || code.contains("PERFECT")) {
            return stats.perfectSessionsCount >= value;
        }

        if ("STREAK_DAYS".equalsIgnoreCase(type) || code.startsWith("STREAK_")) {
            return stats.streakDays >= value;
        }

        if ("LEVEL_REACHED".equalsIgnoreCase(type) || code.startsWith("LEVEL_")) {
            return stats.level >= value;
        }

        if ("MULTIPLAYER_WINS".equalsIgnoreCase(type) || code.contains("WIN")) {
            return stats.multiplayerWins >= value;
        }

        if ("DAILY_CHALLENGE_COMPLETED".equalsIgnoreCase(type) || code.contains("DAILY")) {
            return stats.dailyChallenges >= value;
        }

        return false;
    }

    private void emitAchievementNotification(UUID userId, Achievement achievement) {
        try {
            Map<String, Object> payload = Map.of(
                "id", achievement.getCode(),
                "code", achievement.getCode(),
                "name", achievement.getName(),
                "description", achievement.getDescription(),
                "iconUrl", achievement.getIconUrl() != null ? achievement.getIconUrl() : "🏆",
                "xpReward", achievement.getXpReward()
            );
            // BUG-L14 / FEAT-S08: Only emit to the unlocking user's personal room, not global broadcast
            socketIOServer.getRoomOperations("user:" + userId.toString()).sendEvent("achievement:unlock", payload);
        } catch (Exception e) {
            log.warn("Failed to emit achievement socket event: {}", e.getMessage());
        }
    }

    /**
     * Identifies and deletes any UserAchievement records that the user is no longer
     * eligible for, or that were unlocked during a fraudulent/invalidated session.
     * Also reverts awarded XP/credits and recalculates level.
     */
    @Transactional
    public List<String> revokeUnqualifiedAchievements(User user, TypingSession session) {
        if (user == null) return List.of();

        List<UserAchievement> currentUnlocked = userAchievementRepository.findUnlockedWithAchievementByUserId(user.getId());
        if (currentUnlocked.isEmpty()) return List.of();

        UserStats stats = fetchUserStats(user);
        List<String> revokedCodes = new ArrayList<>();
        int totalAchievementXpToRevert = 0;
        int totalAchievementCreditsToRevert = 0;

        Instant sessionTime = session != null ? session.getCreatedAt() : null;

        for (UserAchievement ua : currentUnlocked) {
            Achievement a = ua.getAchievement();
            if (a == null) continue;

            int progress = calculateProgress(stats, a);
            boolean conditionMet = evaluateCriteria(stats, a) || progress >= 100;

            // Check if achievement was unlocked at/around session submission time (within 10s window)
            boolean unlockedDuringSession = sessionTime != null && ua.getUnlockedAt() != null
                    && Math.abs(java.time.Duration.between(sessionTime, ua.getUnlockedAt()).toSeconds()) <= 10;

            if (!conditionMet || (unlockedDuringSession && !conditionMet)) {
                log.info("Revoking fraudulent achievement '{}' ({}) from user {}", a.getName(), a.getCode(), user.getUsername());
                userAchievementRepository.delete(ua);
                revokedCodes.add(a.getCode());

                if (a.getXpReward() != null && a.getXpReward() > 0) {
                    totalAchievementXpToRevert += a.getXpReward();
                }
                totalAchievementCreditsToRevert += 50;
            }
        }

        if (!revokedCodes.isEmpty()) {
            userAchievementRepository.flush();

            if (totalAchievementXpToRevert > 0) {
                user.setXp(Math.max(0, (user.getXp() != null ? user.getXp() : 0) - totalAchievementXpToRevert));
                user.setLevel(xpService.calculateLevelFromXp(user.getXp()));
            }
            if (totalAchievementCreditsToRevert > 0) {
                int curCredits = user.getCredits() != null ? user.getCredits() : 0;
                user.setCredits(Math.max(0, curCredits - totalAchievementCreditsToRevert));
                String reason = "Revocation of achievements: " + String.join(", ", revokedCodes);
                if (reason.length() > 120) {
                    reason = reason.substring(0, 117) + "...";
                }
                CreditLedger ledger = CreditLedger.builder()
                        .user(user)
                        .delta(-Math.min(curCredits, totalAchievementCreditsToRevert))
                        .reason(reason)
                        .build();
                creditLedgerRepository.save(ledger);
            }
            userRepository.save(user);
        }

        return revokedCodes;
    }

    @Transactional
    public List<Map<String, Object>> getUserAchievementsWithProgress(User user) {
        // Evaluate any un-unlocked achievements
        checkAchievements(user);

        List<Achievement> all = achievementRepository.findAll();
        List<UserAchievement> unlocked = userAchievementRepository.findUnlockedWithAchievementByUserId(user.getId());
        Set<UUID> unlockedIds = new HashSet<>();
        Map<UUID, Instant> unlockedDates = new HashMap<>();

        for (UserAchievement ua : unlocked) {
            if (ua.getAchievement() != null) {
                unlockedIds.add(ua.getAchievement().getId());
                unlockedDates.put(ua.getAchievement().getId(), ua.getUnlockedAt());
            }
        }

        UserStats stats = fetchUserStats(user);

        List<Map<String, Object>> result = new ArrayList<>();
        for (Achievement a : all) {
            int progress = unlockedIds.contains(a.getId()) ? 100 : calculateProgress(stats, a);
            boolean isUnlocked = unlockedIds.contains(a.getId());
            if (isUnlocked) progress = 100;

            Map<String, Object> map = new HashMap<>();
            map.put("id", a.getCode());
            map.put("code", a.getCode());
            map.put("name", a.getName());
            map.put("description", a.getDescription());
            map.put("icon", a.getIconUrl() != null ? a.getIconUrl() : "🏆");
            map.put("xp", a.getXpReward());
            map.put("unlocked", isUnlocked);
            // BUG-L02: return null when not unlocked instead of Instant.now()
            map.put("unlockedAt", isUnlocked ? (unlockedDates.get(a.getId()) != null ? unlockedDates.get(a.getId()) : Instant.now()) : null);
            map.put("progress", progress);
            map.put("criteriaType", a.getCriteriaType());
            map.put("criteriaValue", a.getCriteriaValue());
            result.add(map);
        }

        return result;
    }

    @Transactional
    public List<Map<String, Object>> getRecentUnlockedAchievements(User user, int limit) {
        checkAchievements(user);

        List<UserAchievement> unlocked = userAchievementRepository.findUnlockedWithAchievementByUserId(user.getId());

        List<Map<String, Object>> result = new ArrayList<>();
        for (int i = 0; i < Math.min(limit, unlocked.size()); i++) {
            UserAchievement ua = unlocked.get(i);
            Achievement a = ua.getAchievement();
            if (a == null) continue;
            result.add(Map.of(
                "id", a.getCode(),
                "name", a.getName(),
                "description", a.getDescription(),
                "icon", a.getIconUrl() != null ? a.getIconUrl() : "🏆",
                "xp", a.getXpReward() != null ? a.getXpReward() : 100,
                "unlockedAt", ua.getUnlockedAt() != null ? ua.getUnlockedAt() : Instant.now()
            ));
        }
        return result;
    }


    private int calculateProgress(UserStats stats, Achievement a) {
        int target = a.getCriteriaValue();
        if (target <= 0) return 100;
        long current = 0;

        String type = a.getCriteriaType() != null ? a.getCriteriaType() : "";
        String code = a.getCode() != null ? a.getCode() : "";

        if ("TEMPLATES_CREATED".equalsIgnoreCase(type) || type.startsWith("TEMPLATE_") || code.contains("TEMPLATE")) {
            current = stats.templatesCount;
        } else if ("SESSIONS_COMPLETED".equalsIgnoreCase(type) || code.contains("SESSION") || code.startsWith("SESSIONS_")) {
            current = stats.sessionsCount;
        } else if ("WPM_REACHED".equalsIgnoreCase(type) || code.startsWith("WPM_") || code.startsWith("SPEED_")) {
            current = stats.bestWpm;
        } else if ("ACCURACY_100".equalsIgnoreCase(type) || "ACCURACY_PERFECT".equalsIgnoreCase(type) || code.contains("PERFECT")) {
            current = stats.perfectSessionsCount;
        } else if ("STREAK_DAYS".equalsIgnoreCase(type) || code.startsWith("STREAK_")) {
            current = stats.streakDays;
        } else if ("LEVEL_REACHED".equalsIgnoreCase(type) || code.startsWith("LEVEL_")) {
            current = stats.level;
        } else if ("MULTIPLAYER_WINS".equalsIgnoreCase(type) || code.contains("WIN")) {
            current = stats.multiplayerWins;
        } else if ("DAILY_CHALLENGE_COMPLETED".equalsIgnoreCase(type) || code.contains("DAILY")) {
            current = stats.dailyChallenges;
        }

        return Math.min(100, (int) Math.round(((double) current / target) * 100));
    }
}

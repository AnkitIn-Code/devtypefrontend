package com.devtype.backend.service;

import com.devtype.backend.entity.User;
import com.devtype.backend.repository.UserRepository;
import lombok.Builder;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class XpService {

    private final UserRepository userRepository;

    @Data
    @Builder
    public static class LevelUpResult {
        private boolean leveledUp;
        private int oldLevel;
        private int newLevel;
        private int xpEarned;
        private int totalXp;
        private int currentLevelXpThreshold;
        private int nextLevelXpThreshold;
    }

    /**
     * Calculate cumulative XP required to reach a specific level.
     * Dynamic curve: Level 1 = 0-100 XP, Level 2 = 100-500 XP, Level 3 = 500-1200 XP, etc.
     */
    public int xpForLevel(int level) {
        if (level <= 1) return 0;
        long l = (long) level - 1;
        return (int) (100 * l + 150 * l * (l - 1));
    }

    /**
     * Determine the level for a given total XP amount.
     */
    public int calculateLevelFromXp(int totalXp) {
        int level = 1;
        while (level < 100 && totalXp >= xpForLevel(level + 1)) {
            level++;
        }
        return level;
    }

    /**
     * Returns level curve data points for frontend progress bars.
     */
    public List<Map<String, Object>> getLevelCurve(int maxLevel) {
        List<Map<String, Object>> curve = new ArrayList<>();
        for (int l = 1; l <= maxLevel; l++) {
            curve.add(Map.of(
                "level", l,
                "xpRequired", xpForLevel(l)
            ));
        }
        return curve;
    }

    @Transactional
    public LevelUpResult awardXp(User user, int amount, String reason) {
        int oldXp = user.getXp() != null ? user.getXp() : 0;
        int newXp = Math.max(0, oldXp + amount);
        user.setXp(newXp);

        int oldLevel = user.getLevel() != null ? user.getLevel() : 1;
        int newLevel = calculateLevelFromXp(newXp);
        boolean leveledUp = newLevel > oldLevel;

        if (leveledUp) {
            user.setLevel(newLevel);
            // Award bonus credits on level up
            int creditBonus = (newLevel - oldLevel) * 25;
            user.setCredits((user.getCredits() != null ? user.getCredits() : 0) + creditBonus);
            log.info("User {} leveled up from {} to {} (+{} credits)", user.getUsername(), oldLevel, newLevel, creditBonus);
        }

        userRepository.save(user);

        return LevelUpResult.builder()
                .leveledUp(leveledUp)
                .oldLevel(oldLevel)
                .newLevel(newLevel)
                .xpEarned(amount)
                .totalXp(newXp)
                .currentLevelXpThreshold(xpForLevel(newLevel))
                .nextLevelXpThreshold(xpForLevel(newLevel + 1))
                .build();
    }
}

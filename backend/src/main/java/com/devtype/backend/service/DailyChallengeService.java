package com.devtype.backend.service;

import com.devtype.backend.entity.*;
import com.devtype.backend.repository.*;
import lombok.Builder;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class DailyChallengeService {

    private final DailyChallengeRepository dailyChallengeRepository;
    private final DailyChallengeResultRepository dailyChallengeResultRepository;
    private final SnippetRepository snippetRepository;
    private final XpService xpService;
    private final CreditService creditService;
    private final StreakService streakService;
    private final AchievementService achievementService;

    /** How many days back to check for already-used snippets (avoid repeats). */
    private static final int REPEAT_AVOID_DAYS = 30;

    /** XP bonus for completing every day in a calendar month. */
    private static final int MONTHLY_COMPLETION_XP = 1000;

    @Data
    @Builder
    public static class DailyChallengeDto {
        private UUID id;
        private LocalDate date;
        private Map<String, Object> snippet;
        private boolean hasCompleted;
        private Integer userWpm;
        private BigDecimal userAccuracy;
        private Integer userRank;
        private List<Map<String, Object>> leaderboard;
    }

    /**
     * Daily cron job at midnight UTC — picks a truly random snippet not used
     * in the last {@value REPEAT_AVOID_DAYS} days and persists it as today's challenge.
     */
    @Scheduled(cron = "0 0 0 * * *", zone = "UTC")
    @Transactional
    public DailyChallenge generateDailyChallenge() {
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        return dailyChallengeRepository.findByDate(today).orElseGet(() -> pickAndSaveChallenge(today));
    }

    /**
     * Internal: selects a random snippet (avoiding recent repeats) and saves it
     * as the challenge for the given date.  Returns {@code null} if no snippets exist.
     */
    private DailyChallenge pickAndSaveChallenge(LocalDate date) {
        // Build exclusion list — snippets used in the last REPEAT_AVOID_DAYS days
        LocalDate since = date.minusDays(REPEAT_AVOID_DAYS);
        List<UUID> recentIds = snippetRepository.findRecentDailyChallengeSnippetIds(since);

        // Pick a truly random public snippet not in the exclusion list
        Optional<Snippet> snippetOpt = snippetRepository.findRandomPublicExcluding(recentIds);

        // If all snippets were excluded (very small DB), relax the constraint
        if (snippetOpt.isEmpty()) {
            log.warn("All snippets were excluded from daily challenge for {}; relaxing constraint.", date);
            snippetOpt = snippetRepository.findRandomPublicExcluding(Collections.emptyList());
        }

        if (snippetOpt.isEmpty()) {
            log.warn("No snippets available to generate Daily Challenge for {}", date);
            return null;
        }

        Snippet snippet = snippetOpt.get();
        DailyChallenge challenge = DailyChallenge.builder()
                .date(date)
                .snippet(snippet)
                .build();

        log.info("Generated Daily Challenge for {} with snippet '{}' ({})",
                date, snippet.getTitle(), snippet.getLanguage());
        return dailyChallengeRepository.save(challenge);
    }

    @Transactional
    public DailyChallengeDto getTodayChallenge(User user) {
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        DailyChallenge challenge = dailyChallengeRepository.findByDate(today)
                .orElseGet(() -> pickAndSaveChallenge(today));

        if (challenge == null) {
            return null;
        }

        Optional<DailyChallengeResult> userResult = dailyChallengeResultRepository
                .findByIdUserIdAndIdDailyChallengeId(user.getId(), challenge.getId());

        List<DailyChallengeResult> topResults = dailyChallengeResultRepository
                .findByIdDailyChallengeIdOrderByWpmDesc(challenge.getId(), PageRequest.of(0, 5))
                .getContent();

        List<Map<String, Object>> leaderboard = new ArrayList<>();
        int rankCounter = 1;
        for (DailyChallengeResult r : topResults) {
            leaderboard.add(Map.of(
                "rank", rankCounter++,
                "username", r.getUser().getUsername(),
                "avatarUrl", r.getUser().getAvatarUrl() != null ? r.getUser().getAvatarUrl() : "",
                "wpm", r.getWpm(),
                "accuracy", r.getAccuracy()
            ));
        }

        Map<String, Object> snippetMap = Map.of(
            "id", challenge.getSnippet().getId().toString(),
            "title", challenge.getSnippet().getTitle(),
            "language", challenge.getSnippet().getLanguage(),
            "difficulty", challenge.getSnippet().getDifficulty().name(),
            "code", challenge.getSnippet().getCode()
        );

        return DailyChallengeDto.builder()
                .id(challenge.getId())
                .date(challenge.getDate())
                .snippet(snippetMap)
                .hasCompleted(userResult.isPresent())
                .userWpm(userResult.map(DailyChallengeResult::getWpm).orElse(null))
                .userAccuracy(userResult.map(DailyChallengeResult::getAccuracy).orElse(null))
                .userRank(userResult.map(DailyChallengeResult::getRank).orElse(null))
                .leaderboard(leaderboard)
                .build();
    }

    @Transactional
    public Map<String, Object> submitDailyChallenge(User user, int wpm, BigDecimal accuracy) {
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        DailyChallenge challenge = dailyChallengeRepository.findByDate(today)
                .orElseGet(() -> pickAndSaveChallenge(today));

        if (challenge == null) {
            throw new IllegalStateException("Daily challenge is not available today");
        }

        if (dailyChallengeResultRepository.existsByIdUserIdAndIdDailyChallengeId(user.getId(), challenge.getId())) {
            throw new IllegalArgumentException("You have already submitted today's daily challenge");
        }

        DailyChallengeResult result = DailyChallengeResult.builder()
                .id(new DailyChallengeResultId(user.getId(), challenge.getId()))
                .user(user)
                .dailyChallenge(challenge)
                .wpm(wpm)
                .accuracy(accuracy)
                .build();

        dailyChallengeResultRepository.save(result);

        // Update streak
        streakService.updateStreak(user);

        // Award bonus XP and Credits for Daily Challenge
        int baseBonusXp = 150;
        int bonusCredits = 25;
        XpService.LevelUpResult levelResult = xpService.awardXp(user, baseBonusXp, "Daily Challenge completion");
        creditService.earn(user, bonusCredits, "Daily Challenge completion");

        // Check for full-month completion bonus
        boolean monthCompleted = checkAndAwardMonthlyBonus(user, today);

        // Trigger achievements check
        achievementService.checkAchievements(user);

        return Map.of(
            "success", true,
            "xpEarned", baseBonusXp + (monthCompleted ? MONTHLY_COMPLETION_XP : 0),
            "creditsEarned", bonusCredits,
            "leveledUp", levelResult.isLeveledUp(),
            "newLevel", levelResult.getNewLevel(),
            "wpm", wpm,
            "accuracy", accuracy,
            "monthCompleted", monthCompleted,
            "monthlyBonusXp", monthCompleted ? MONTHLY_COMPLETION_XP : 0
        );
    }

    /**
     * Checks whether the user has now completed ALL days in the current month
     * (up to and including today). If so, awards {@value MONTHLY_COMPLETION_XP} XP.
     *
     * @return {@code true} if the monthly bonus was awarded this call.
     */
    private boolean checkAndAwardMonthlyBonus(User user, LocalDate today) {
        LocalDate monthStart = today.withDayOfMonth(1);

        // Count how many days from month-start to today (inclusive) have a challenge
        List<DailyChallenge> challengesThisMonth = new ArrayList<>();
        for (LocalDate d = monthStart; !d.isAfter(today); d = d.plusDays(1)) {
            dailyChallengeRepository.findByDate(d).ifPresent(challengesThisMonth::add);
        }

        if (challengesThisMonth.isEmpty()) {
            return false;
        }

        // Collect user completions for this month
        List<DailyChallengeResult> completions = dailyChallengeResultRepository
                .findByUserIdAndDateRange(user.getId(), monthStart, today);

        Set<UUID> completedChallengeIds = new HashSet<>();
        completions.forEach(r -> completedChallengeIds.add(r.getDailyChallenge().getId()));

        boolean allComplete = challengesThisMonth.stream()
                .allMatch(c -> completedChallengeIds.contains(c.getId()));

        if (allComplete) {
            xpService.awardXp(user, MONTHLY_COMPLETION_XP,
                    "Monthly challenge completion bonus — " + today.getMonth().name() + " " + today.getYear());
            log.info("User {} completed all daily challenges for {} {} — awarded {} XP bonus",
                    user.getUsername(), today.getMonth(), today.getYear(), MONTHLY_COMPLETION_XP);
            return true;
        }

        return false;
    }

    /**
     * Get monthly challenge calendar for a user. Returns 1 entry per day of the month
     * with completion status correctly reflected even for days without a persisted
     * {@link DailyChallenge} record.
     */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getMonthlyCalendar(User user, int year, int month) {
        LocalDate start = LocalDate.of(year, month, 1);
        LocalDate end = start.withDayOfMonth(start.lengthOfMonth());
        LocalDate today = LocalDate.now(ZoneOffset.UTC);

        // All public snippets available (used as predictive fallback for future days)
        List<Snippet> publicSnippets = snippetRepository.findByIsPublicTrue(PageRequest.of(0, 200)).getContent();

        // Load all persisted challenges for this month into a date-keyed map
        Map<LocalDate, DailyChallenge> challengeByDate = new LinkedHashMap<>();
        for (LocalDate d = start; !d.isAfter(end); d = d.plusDays(1)) {
            dailyChallengeRepository.findByDate(d).ifPresent(c -> challengeByDate.put(c.getDate(), c));
        }

        // User completions in this month (join through DailyChallenge to get date)
        List<DailyChallengeResult> results = dailyChallengeResultRepository
                .findByUserIdAndDateRange(user.getId(), start, end);

        // Build fast lookup: challenge UUID → result
        Map<UUID, DailyChallengeResult> resultByChallengeId = new HashMap<>();
        results.forEach(r -> resultByChallengeId.put(r.getDailyChallenge().getId(), r));

        List<Map<String, Object>> calendar = new ArrayList<>();

        for (LocalDate day = start; !day.isAfter(end); day = day.plusDays(1)) {
            DailyChallenge challenge = challengeByDate.get(day);
            DailyChallengeResult res = (challenge != null) ? resultByChallengeId.get(challenge.getId()) : null;

            // For past/today days without a DB row, use a deterministic snippet fallback
            // (same hash-based approach so it's consistent across calendar loads)
            Snippet daySnippet = null;
            if (challenge != null) {
                daySnippet = challenge.getSnippet();
            } else if (!publicSnippets.isEmpty()) {
                int index = Math.abs(day.hashCode()) % publicSnippets.size();
                daySnippet = publicSnippets.get(index);
            }

            boolean isPast   = day.isBefore(today);
            boolean isToday  = day.equals(today);
            boolean isFuture = day.isAfter(today);

            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("date",              day.toString());
            entry.put("hasChallengeToday", challenge != null || isToday || isPast);
            entry.put("hasCompleted",      res != null);
            entry.put("isToday",           isToday);
            entry.put("isPast",            isPast);
            entry.put("isFuture",          isFuture);
            entry.put("snippetId",         daySnippet != null ? daySnippet.getId().toString() : null);
            entry.put("snippetTitle",      daySnippet != null ? daySnippet.getTitle() : "Daily Code Challenge");
            entry.put("snippetLanguage",   daySnippet != null ? daySnippet.getLanguage() : "javascript");
            entry.put("wpm",               res != null ? res.getWpm() : null);
            entry.put("accuracy",          res != null ? res.getAccuracy() : null);

            calendar.add(entry);
        }
        return calendar;
    }
}

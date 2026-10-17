package com.devtype.backend.service;

import com.devtype.backend.entity.User;
import com.devtype.backend.repository.FriendshipRepository;
import com.devtype.backend.repository.TypingSessionRepository;
import com.devtype.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
@RequiredArgsConstructor
public class LeaderboardService {

    private final UserRepository userRepository;
    private final TypingSessionRepository typingSessionRepository;
    private final FriendshipRepository friendshipRepository;

    // Lightweight in-memory cache with 60-second TTL
    private final ConcurrentHashMap<String, CacheEntry> cache = new ConcurrentHashMap<>();

    private record CacheEntry(List<Map<String, Object>> data, Instant cachedAt) {}

    public Instant parsePeriod(String period) {
        if (period == null) return null;
        return switch (period.toLowerCase().trim()) {
            case "daily", "day", "today" -> Instant.now().minus(24, ChronoUnit.HOURS);
            case "weekly", "week" -> Instant.now().minus(7, ChronoUnit.DAYS);
            case "monthly", "month" -> Instant.now().minus(30, ChronoUnit.DAYS);
            default -> null; // all / all-time
        };
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getLeaderboard(User currentUser, String scope, String metric, int limit) {
        return getLeaderboard(currentUser, scope, metric, "all", null, limit);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getLeaderboard(User currentUser, String scope, String metric, String period, String language, int limit) {
        String normScope = (scope != null && !scope.isBlank()) ? scope.toLowerCase().trim() : "global";
        String normMetric = (metric != null && !metric.isBlank()) ? metric.toLowerCase().trim() : "wpm";
        String normPeriod = (period != null && !period.isBlank()) ? period.toLowerCase().trim() : "all";
        String normLang = (language != null && !language.isBlank() && !"all".equalsIgnoreCase(language)) ? language.toLowerCase().trim() : "all";

        // BUG-H06: Global leaderboard cache key is shared across all users.
        // Friends-scoped cache key is scoped to the requesting user.
        String cacheKey;
        if ("friends".equalsIgnoreCase(normScope) && currentUser != null) {
            cacheKey = String.format("friends_%s_%s_%s_%s_%d", normMetric, currentUser.getId(), normPeriod, normLang, limit);
        } else {
            cacheKey = String.format("global_%s_%s_%s_%d", normMetric, normPeriod, normLang, limit);
        }

        CacheEntry entry = cache.get(cacheKey);
        if (entry != null && entry.cachedAt().isAfter(Instant.now().minusSeconds(60))) {
            return Map.of("leaderboard", entry.data(), "cached", true);
        }

        Instant since = parsePeriod(normPeriod);
        String langFilter = "all".equalsIgnoreCase(normLang) ? null : normLang;

        List<User> usersList;

        if ("friends".equalsIgnoreCase(normScope) && currentUser != null) {
            List<UUID> friendIds = new ArrayList<>(friendshipRepository.findFriendUserIds(currentUser.getId()));
            friendIds.add(currentUser.getId()); // include self
            usersList = userRepository.findAllById(friendIds);
        } else {
            usersList = userRepository.findAll(PageRequest.of(0, 200)).getContent();
        }

        List<Map<String, Object>> entries = new ArrayList<>();
        for (User u : usersList) {
            int score = 0;
            if ("wpm".equalsIgnoreCase(normMetric)) {
                if (since == null && langFilter == null) {
                    score = typingSessionRepository.findTopByUserIdOrderByWpmDesc(u.getId())
                            .map(s -> s.getWpm()).orElse(0);
                } else {
                    Integer maxWpm = typingSessionRepository.findMaxWpmByUserIdAndFilters(u.getId(), since, langFilter);
                    score = maxWpm != null ? maxWpm : 0;
                }
            } else {
                if (since == null && langFilter == null) {
                    score = u.getXp() != null ? u.getXp() : 0;
                } else {
                    Integer periodXp = typingSessionRepository.sumXpByUserIdAndFilters(u.getId(), since, langFilter);
                    score = periodXp != null ? periodXp : 0;
                }
            }

            entries.add(Map.of(
                "userId", u.getId().toString(),
                "username", u.getUsername(),
                "avatarUrl", u.getAvatarUrl() != null ? u.getAvatarUrl() : "",
                "level", u.getLevel() != null ? u.getLevel() : 1,
                "score", score
            ));
        }

        entries.sort((a, b) -> Integer.compare((Integer) b.get("score"), (Integer) a.get("score")));

        // Assign ranks
        List<Map<String, Object>> rankedList = new ArrayList<>();
        int userRank = 0;
        int rank = 1;
        for (Map<String, Object> item : entries) {
            Map<String, Object> row = new HashMap<>(item);
            row.put("rank", rank);
            if (currentUser != null && currentUser.getId().toString().equals(item.get("userId"))) {
                userRank = rank;
            }
            if (rank <= limit) {
                rankedList.add(row);
            }
            rank++;
        }

        cache.put(cacheKey, new CacheEntry(rankedList, Instant.now()));

        Map<String, Object> response = new HashMap<>();
        response.put("leaderboard", rankedList);
        response.put("userRank", userRank);
        response.put("totalParticipants", entries.size());
        return response;
    }
}

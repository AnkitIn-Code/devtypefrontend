package com.devtype.backend.service;

import com.devtype.backend.dto.stats.*;
import com.devtype.backend.entity.TypingSession;
import com.devtype.backend.entity.User;
import com.devtype.backend.repository.SessionErrorEventRepository;
import com.devtype.backend.repository.TypingSessionRepository;
import com.devtype.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class StatsService {

    private final UserRepository userRepository;
    private final TypingSessionRepository typingSessionRepository;
    private final SessionErrorEventRepository sessionErrorEventRepository;

    @Transactional(readOnly = true)
    public DashboardStatsDto getDashboardStats(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + email));

        UUID userId = user.getId();
        Integer bestWpm = typingSessionRepository.findTopByUserIdOrderByWpmDesc(userId)
                .map(TypingSession::getWpm)
                .orElse(0);

        Double avgWpm = typingSessionRepository.findAverageWpmByUserId(userId);
        Double avgAccuracy = typingSessionRepository.findAverageAccuracyByUserId(userId);
        Long totalSessions = typingSessionRepository.countByUserId(userId);
        Long totalTimeMs = typingSessionRepository.sumDurationMsByUserId(userId);

        int xpToNextLevel = 1000 - (user.getXp() % 1000);

        return new DashboardStatsDto(
                bestWpm,
                avgWpm != null ? Math.round(avgWpm * 10.0) / 10.0 : 0.0,
                avgAccuracy != null ? Math.round(avgAccuracy * 10.0) / 10.0 : 0.0,
                totalSessions,
                totalTimeMs != null ? totalTimeMs.intValue() : 0,
                user.getCurrentStreak(),
                user.getLongestStreak(),
                user.getLevel(),
                user.getXp(),
                xpToNextLevel,
                user.getCredits()
        );
    }

    @Transactional(readOnly = true)
    public List<TimeSeriesPointDto> getStatsHistory(String email, String range) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + email));

        Instant now = Instant.now();
        int days = switch (range != null ? range.toLowerCase() : "30d") {
            case "7d" -> 7;
            case "90d" -> 90;
            default -> 30;
        };

        Instant from = now.minus(days, ChronoUnit.DAYS);
        List<TypingSession> sessions = typingSessionRepository
                .findByUserIdAndCreatedAtBetweenOrderByCreatedAtAsc(user.getId(), from, now);

        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("MMM dd")
                .withZone(ZoneId.systemDefault());

        return sessions.stream()
                .map(s -> new TimeSeriesPointDto(
                        s.getCreatedAt(),
                        formatter.format(s.getCreatedAt()),
                        s.getWpm(),
                        s.getAccuracy()
                ))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<SymbolHeatmapDto> getSymbolHeatmap(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + email));

        List<Object[]> rawErrors = sessionErrorEventRepository.findErrorFrequencyByUserId(user.getId());
        long totalUserSessions = typingSessionRepository.countByUserId(user.getId());

        List<SymbolHeatmapDto> heatmapList = new ArrayList<>();

        for (Object[] row : rawErrors) {
            String charExpected = (String) row[0];
            Long errorCount = (Long) row[1];

            // Estimate attempts based on session volume & typical symbol distribution
            long estimatedAttempts = Math.max(errorCount * 3, totalUserSessions * 5);
            double errorRate = Math.min(100.0, (errorCount * 100.0) / estimatedAttempts);
            errorRate = Math.round(errorRate * 10.0) / 10.0;

            heatmapList.add(new SymbolHeatmapDto(
                    charExpected,
                    estimatedAttempts,
                    errorCount,
                    errorRate
            ));
        }

        // Sort by error rate descending (worst first)
        heatmapList.sort((a, b) -> Double.compare(b.errorRate(), a.errorRate()));
        return heatmapList;
    }

    @Transactional(readOnly = true)
    public List<String> getWeakKeys(String email, int limit) {
        List<SymbolHeatmapDto> heatmap = getSymbolHeatmap(email);
        List<String> weak = heatmap.stream()
                .limit(limit)
                .map(SymbolHeatmapDto::character)
                .toList();

        if (weak.isEmpty()) {
            // Default weak symbol set for new accounts
            return List.of("{", "}", "=>", ";", "===");
        }
        return weak;
    }
}

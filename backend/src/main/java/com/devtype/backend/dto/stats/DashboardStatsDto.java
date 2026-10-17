package com.devtype.backend.dto.stats;

public record DashboardStatsDto(
    Integer bestWpm,
    Double avgWpm,
    Double avgAccuracy,
    Long totalSessions,
    Integer totalTimeMs,
    Integer currentStreak,
    Integer longestStreak,
    Integer level,
    Integer xp,
    Integer xpToNextLevel,
    Integer credits
) {}

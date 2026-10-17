package com.devtype.backend.dto.user;

import com.devtype.backend.entity.User;
import com.devtype.backend.entity.enums.UserRole;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Public-safe user representation — never includes passwordHash.
 *
 * <p>Used in both the auth response (abbreviated) and the /api/users/me
 * endpoint (full profile with stats). Stats fields are populated separately
 * by the UserService when needed.
 */
public record UserResponseDto(
    UUID id,
    String username,
    String email,
    String avatarUrl,
    Integer level,
    Integer xp,
    Integer credits,
    Integer currentStreak,
    Integer longestStreak,
    LocalDate lastActiveDate,
    String country,
    String timezone,
    UserRole role,
    Instant createdAt,
    // Aggregated stats — null when not requested
    Long totalSessions,
    Double avgWpm,
    Double avgAccuracy,
    Integer bestWpm
) {
    private static String resolveAvatarUrl(User u) {
        if (u.getAvatarUrl() != null && !u.getAvatarUrl().isBlank()) {
            return u.getAvatarUrl();
        }
        // Default to avatar 1 — frontend resolves /avatar/N to inline SVG
        return "/avatar/1";
    }

    /** Map from entity — stats fields left null (populated by service when needed). */
    public static UserResponseDto from(User u) {
        return new UserResponseDto(
            u.getId(),
            u.getUsername(),
            u.getEmail(),
            resolveAvatarUrl(u),
            u.getLevel(),
            u.getXp(),
            u.getCredits(),
            u.getCurrentStreak(),
            u.getLongestStreak(),
            u.getLastActiveDate(),
            u.getCountry(),
            u.getTimezone() != null ? u.getTimezone() : "UTC",
            u.getRole(),
            u.getCreatedAt(),
            null, null, null, null
        );
    }

    /** Full profile with aggregated stats. */
    public static UserResponseDto withStats(
            User u, Long totalSessions, Double avgWpm,
            Double avgAccuracy, Integer bestWpm) {
        return new UserResponseDto(
            u.getId(),
            u.getUsername(),
            u.getEmail(),
            resolveAvatarUrl(u),
            u.getLevel(),
            u.getXp(),
            u.getCredits(),
            u.getCurrentStreak(),
            u.getLongestStreak(),
            u.getLastActiveDate(),
            u.getCountry(),
            u.getTimezone() != null ? u.getTimezone() : "UTC",
            u.getRole(),
            u.getCreatedAt(),
            totalSessions, avgWpm, avgAccuracy, bestWpm
        );
    }
}


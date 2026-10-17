package com.devtype.backend.entity;

import com.devtype.backend.entity.enums.UserRole;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Represents a registered DevType user.
 *
 * <p>Maps to the {@code users} table. {@code passwordHash} is nullable
 * to support future OAuth-only sign-in flows.
 */
@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @UuidGenerator
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(nullable = false, unique = true, length = 30)
    private String username;

    @Column(nullable = false, unique = true, length = 255)
    private String email;

    /** BCrypt hash. Null for OAuth-only users. */
    @Column(name = "password_hash")
    private String passwordHash;

    @Column(name = "avatar_url")
    private String avatarUrl;

    @Builder.Default
    @Column(nullable = false)
    private Integer level = 1;

    @Builder.Default
    @Column(nullable = false)
    private Integer xp = 0;

    @Builder.Default
    @Column(nullable = false)
    private Integer credits = 50;

    @Builder.Default
    @Column(name = "current_streak", nullable = false)
    private Integer currentStreak = 0;

    @Builder.Default
    @Column(name = "longest_streak", nullable = false)
    private Integer longestStreak = 0;

    @Column(name = "last_active_date")
    private LocalDate lastActiveDate;

    /** ISO 3166-1 alpha-2 country code, e.g. "IN", "US". */
    @Column(length = 2)
    private String country;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private UserRole role = UserRole.USER;

    /**
     * IANA timezone identifier (e.g. "Asia/Kolkata", "America/New_York").
     * Used by {@code StreakService} to determine the user's local calendar day.
     */
    @Builder.Default
    @Column(nullable = false, length = 50)
    private String timezone = "UTC";

    /**
     * JSON blob with user preferences: theme, fontSize, soundVolume, showLiveWpm, etc.
     */
    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private String settings;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    @Builder.Default
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
}

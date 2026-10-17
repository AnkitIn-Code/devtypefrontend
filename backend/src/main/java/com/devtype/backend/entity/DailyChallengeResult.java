package com.devtype.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * A user's result for a specific daily challenge.
 *
 * <p>Uses a composite primary key ({@link DailyChallengeResultId}) ensuring
 * each user can only submit one result per daily challenge. {@code rank} is
 * computed and stored by a background job after the challenge closes.
 */
@Entity
@Table(name = "daily_challenge_results")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DailyChallengeResult {

    @EmbeddedId
    private DailyChallengeResultId id;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("userId")
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("dailyChallengeId")
    @JoinColumn(name = "daily_challenge_id", nullable = false)
    private DailyChallenge dailyChallenge;

    @Column(nullable = false)
    private Integer wpm;

    @Column(nullable = false, precision = 5, scale = 2)
    private BigDecimal accuracy;

    /** Leaderboard rank within this challenge; null until rankings are computed. */
    @Column
    private Integer rank;

    @Builder.Default
    @Column(name = "completed_at", nullable = false, updatable = false)
    private Instant completedAt = Instant.now();
}

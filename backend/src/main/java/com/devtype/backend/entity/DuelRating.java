package com.devtype.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

/**
 * Stores the Elo-based competitive rating for a player in 1v1 DUEL mode.
 *
 * <p>Uses the user's UUID as both the PK and the FK to {@code users},
 * implemented via {@code @MapsId} on the {@code @OneToOne} relationship.
 * This ensures a strict 1-to-1 relationship without a separate surrogate key.
 *
 * <p>Starting Elo: 1200 (standard chess baseline).
 */
@Entity
@Table(name = "duel_ratings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DuelRating {

    @Id
    private UUID userId;

    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "user_id")
    private User user;

    @Builder.Default
    @Column(name = "elo_rating", nullable = false)
    private Integer eloRating = 1200;

    @Builder.Default
    @Column(nullable = false)
    private Integer wins = 0;

    @Builder.Default
    @Column(nullable = false)
    private Integer losses = 0;

    @Builder.Default
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();
}

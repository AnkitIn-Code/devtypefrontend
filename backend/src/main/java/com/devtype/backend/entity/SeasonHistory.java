package com.devtype.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.time.Instant;
import java.util.UUID;

/**
 * End-of-season ELO snapshot for a user.
 *
 * <p>Created by {@code SeasonService} when a season closes.
 * Allows users to see their historical ranked performance across seasons.
 */
@Entity
@Table(name = "season_history", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"season_id", "user_id"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SeasonHistory {

    @Id
    @UuidGenerator
    @Column(updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "season_id", nullable = false)
    private Season season;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /** ELO rating at end of season. */
    @Column(name = "final_elo", nullable = false)
    private Integer finalElo;

    /** Global rank within the season (1 = highest ELO). Null if not yet computed. */
    @Column(name = "final_rank")
    private Integer finalRank;

    @Builder.Default
    @Column(name = "snapshotted_at", nullable = false, updatable = false)
    private Instant snapshottedAt = Instant.now();
}

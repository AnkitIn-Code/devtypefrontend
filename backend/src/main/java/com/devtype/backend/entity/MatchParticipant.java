package com.devtype.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Tracks an individual player's progress and result within a multiplayer room.
 *
 * <p>{@code user} is nullable to support AI bots (BOSS_FIGHT mode) and
 * ghost replays. {@code eliminatedAtRound} is set only in BATTLE_ROYALE mode.
 */
@Entity
@Table(name = "match_participants")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MatchParticipant {

    @Id
    @UuidGenerator
    @Column(updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_id", nullable = false)
    private MultiplayerRoom room;

    /** Nullable for AI bots and ghost replays. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    /** Typing progress from 0.00 to 100.00. */
    @Builder.Default
    @Column(name = "progress_percent", nullable = false, precision = 5, scale = 2)
    private BigDecimal progressPercent = BigDecimal.ZERO;

    /** Final WPM result; null until the participant finishes. */
    @Column
    private Integer wpm;

    /** Timestamp when the participant completed typing; null if not yet finished. */
    @Column(name = "finished_at")
    private Instant finishedAt;

    /** Final placement (1 = 1st place); null until the race ends. */
    @Column
    private Integer placement;

    /** Round number at which this participant was eliminated (Battle Royale only). */
    @Column(name = "eliminated_at_round")
    private Integer eliminatedAtRound;
}

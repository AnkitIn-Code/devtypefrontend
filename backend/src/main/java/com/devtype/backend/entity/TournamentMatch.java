package com.devtype.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.time.Instant;
import java.util.UUID;

/**
 * A single head-to-head match within a tournament bracket.
 *
 * <p>Participants and winner are linked to {@code users}. Either participant
 * slot can be {@code null} if a player received a bye. The {@code round}
 * field represents the bracket round number (1 = first round, etc.).
 *
 * <p>FEAT-M08: {@code room} is an optional FK to the {@link MultiplayerRoom}
 * created for this match as a DUEL, so match results flow through
 * {@link com.devtype.backend.socket.MatchPersistenceService}.
 */
@Entity
@Table(name = "tournament_matches")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TournamentMatch {

    @Id
    @UuidGenerator
    @Column(updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tournament_id", nullable = false)
    private Tournament tournament;

    @Column(nullable = false)
    private Integer round;

    /** Nullable if a player received a bye. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "participant_a_id")
    private User participantA;

    /** Nullable if a player received a bye. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "participant_b_id")
    private User participantB;

    /** Null until the match is completed. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "winner_id")
    private User winner;

    /**
     * FEAT-M08: optional link to the DUEL {@link MultiplayerRoom} that is played
     * for this match. Null for bye matches (participantB == null).
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_id")
    private MultiplayerRoom room;

    /**
     * FEAT-M08: creation timestamp used to order matches deterministically when
     * generating next-round pairings from round winners.
     */
    @Builder.Default
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
}

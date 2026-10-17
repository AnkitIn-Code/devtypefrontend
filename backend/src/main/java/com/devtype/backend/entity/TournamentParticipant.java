package com.devtype.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.time.Instant;
import java.util.UUID;

/**
 * Join entity that records a user's registration in a tournament.
 *
 * <p>FEAT-S06 / BUG-C07: Replaces the broken {@code userRepository.findAll().subList(0, 8)}
 * seeding strategy. When a tournament starts, {@link com.devtype.backend.service.TournamentService}
 * reads registrants from this table instead of pulling an arbitrary DB slice.
 *
 * <p>The unique constraint on {@code (tournament_id, user_id)} prevents double-registration.
 */
@Entity
@Table(
    name = "tournament_participants",
    uniqueConstraints = @UniqueConstraint(
        name = "uq_tournament_participant",
        columnNames = {"tournament_id", "user_id"}
    )
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TournamentParticipant {

    @Id
    @UuidGenerator
    @Column(updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tournament_id", nullable = false)
    private Tournament tournament;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Builder.Default
    @Column(name = "registered_at", nullable = false, updatable = false)
    private Instant registeredAt = Instant.now();
}

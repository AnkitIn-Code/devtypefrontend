package com.devtype.backend.entity;

import com.devtype.backend.entity.enums.BracketType;
import com.devtype.backend.entity.enums.TournamentStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.time.Instant;
import java.util.UUID;

/**
 * A typing tournament, optionally scoped to a guild.
 *
 * <p>When {@code guild} is {@code null} the tournament is "open" — any
 * DevType user may participate. {@code bracketType} determines the
 * elimination format. The {@code status} lifecycle:
 * {@code UPCOMING → IN_PROGRESS → FINISHED} (or {@code CANCELLED}).
 */
@Entity
@Table(name = "tournaments")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Tournament {

    @Id
    @UuidGenerator
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(nullable = false, length = 255)
    private String name;

    /** Null for open (cross-guild) tournaments. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "guild_id")
    private Guild guild;

    @Enumerated(EnumType.STRING)
    @Column(name = "bracket_type", nullable = false, length = 15)
    private BracketType bracketType;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 15)
    private TournamentStatus status = TournamentStatus.UPCOMING;

    @Column(name = "starts_at", nullable = false)
    private Instant startsAt;

    @Builder.Default
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
}

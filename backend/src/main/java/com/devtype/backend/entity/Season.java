package com.devtype.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.time.LocalDate;
import java.util.UUID;

/**
 * A ranked duel season with a fixed start date and optional end date.
 *
 * <p>Only one season can be active ({@code isActive = true}) at a time.
 * At season end, a scheduled job snapshots all ELO ratings into
 * {@link SeasonHistory} and resets {@link DuelRating} to 1200.
 */
@Entity
@Table(name = "seasons")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Season {

    @Id
    @UuidGenerator
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    /** Null while the season is ongoing. Set when the season ends. */
    @Column(name = "end_date")
    private LocalDate endDate;

    @Builder.Default
    @Column(name = "is_active", nullable = false)
    private Boolean isActive = false;

    /** Ordinal number of this season (1, 2, 3 ...). Populated by V23 migration. */
    @Column(name = "season_number")
    private Integer seasonNumber;
}

package com.devtype.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.util.UUID;

/**
 * Defines an unlockable achievement/badge.
 *
 * <p>{@code code} is a stable business key (e.g. "SPEED_100") used by the
 * achievement-evaluation service to reference achievements without coupling
 * to UUIDs. {@code criteriaType} + {@code criteriaValue} describe the unlock
 * condition (interpreted by the service layer, not enforced at DB level).
 */
@Entity
@Table(name = "achievements")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Achievement {

    @Id
    @UuidGenerator
    @Column(updatable = false, nullable = false)
    private UUID id;

    /** Stable business key, e.g. "100_WPM", "PERFECTIONIST". */
    @Column(nullable = false, unique = true, length = 50)
    private String code;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    @Column(name = "icon_url")
    private String iconUrl;

    @Builder.Default
    @Column(name = "xp_reward", nullable = false)
    private Integer xpReward = 0;

    /**
     * Semantic key for the unlock check, e.g. "WPM_REACHED",
     * "SESSIONS_COMPLETED", "STREAK_DAYS". Interpreted by the
     * achievement evaluation service.
     */
    @Column(name = "criteria_type", nullable = false, length = 50)
    private String criteriaType;

    /** Numeric threshold for the criteria (e.g. 100 for WPM_REACHED). */
    @Builder.Default
    @Column(name = "criteria_value", nullable = false)
    private Integer criteriaValue = 0;
}

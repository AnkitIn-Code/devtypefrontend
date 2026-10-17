package com.devtype.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.io.Serializable;
import java.time.Instant;
import java.util.UUID;

/**
 * Records that a user has purchased/unlocked a {@link Cosmetic}.
 * Uses a composite key of (userId, cosmeticId).
 */
@Entity
@Table(name = "user_cosmetics")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserCosmetic {

    @EmbeddedId
    private UserCosmeticId id;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("userId")
    @JoinColumn(name = "user_id")
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("cosmeticId")
    @JoinColumn(name = "cosmetic_id")
    private Cosmetic cosmetic;

    @Builder.Default
    @Column(name = "purchased_at", nullable = false, updatable = false)
    private Instant purchasedAt = Instant.now();

    // ── Composite key ─────────────────────────────────────────────────────────

    @Embeddable
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserCosmeticId implements Serializable {
        @Column(name = "user_id")
        private UUID userId;

        @Column(name = "cosmetic_id")
        private UUID cosmeticId;
    }
}

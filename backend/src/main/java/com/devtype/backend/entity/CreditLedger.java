package com.devtype.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.time.Instant;
import java.util.UUID;

/**
 * Records every credit earn or spend event for a user.
 *
 * <p>{@code delta} is positive for earnings and negative for spends.
 * Together these rows form a transparent ledger the user can browse
 * at {@code GET /api/users/me/credits/history}.
 */
@Entity
@Table(name = "credit_ledger")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreditLedger {

    @Id
    @UuidGenerator
    @Column(updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /** Positive = earned, Negative = spent. */
    @Column(nullable = false)
    private Integer delta;

    /** Human-readable reason e.g. "Session XP award", "AI Generator (5 credits)". */
    @Column(nullable = false, length = 120)
    private String reason;

    @Builder.Default
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
}

package com.devtype.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Records the outcome of a single typing practice session.
 *
 * <p>{@code accuracy} is stored as {@code NUMERIC(5,2)} (e.g. 98.45).
 * {@code rawWpm} includes uncorrected errors; {@code wpm} is the net speed
 * after penalties. {@code xpEarned} is calculated and stored at session end.
 */
@Entity
@Table(name = "typing_sessions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TypingSession {

    @Id
    @UuidGenerator
    @Column(updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /** Nullable — snippet may be deleted after session was recorded. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "snippet_id")
    private Snippet snippet;

    @Column(name = "language", length = 50)
    private String language;

    @Column(name = "snippet_title", length = 255)
    private String snippetTitle;

    @Column(nullable = false)
    private Integer wpm;

    @Column(name = "raw_wpm", nullable = false)
    private Integer rawWpm;

    /** Net accuracy as a percentage, e.g. 98.45. */
    @Column(nullable = false, precision = 5, scale = 2)
    private BigDecimal accuracy;

    @Builder.Default
    @Column(name = "error_count", nullable = false)
    private Integer errorCount = 0;

    /** Total session length in milliseconds. */
    @Column(name = "duration_ms", nullable = false)
    private Integer durationMs;

    @Builder.Default
    @Column(name = "xp_earned", nullable = false)
    private Integer xpEarned = 0;

    @Builder.Default
    @Column(name = "is_suspicious", nullable = false)
    private Boolean isSuspicious = false;

    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.JSON)
    @Column(name = "wpm_history", columnDefinition = "jsonb")
    private java.util.List<java.util.Map<String, Object>> wpmHistory;

    @Builder.Default
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
}

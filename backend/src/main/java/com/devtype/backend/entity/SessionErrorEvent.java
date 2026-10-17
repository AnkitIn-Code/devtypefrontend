package com.devtype.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.util.UUID;

/**
 * Captures individual keystroke errors within a typing session.
 *
 * <p>Used to power the per-character error heatmap and position-based
 * analytics (e.g. "you struggle most with semicolons at line 3").
 *
 * <p>{@code timestampMs} is the elapsed time in milliseconds from session
 * start, enabling temporal analysis (e.g. "errors cluster after 60s").
 */
@Entity
@Table(name = "session_error_events")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SessionErrorEvent {

    @Id
    @UuidGenerator
    @Column(updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id", nullable = false)
    private TypingSession session;

    /** The character the user was expected to type. */
    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.CHAR)
    @Column(name = "character_expected", nullable = false)
    private String characterExpected;

    /** The character the user actually typed. */
    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.CHAR)
    @Column(name = "character_typed", nullable = false)
    private String characterTyped;

    /** Zero-based character index in the snippet. */
    @Column(name = "position_index", nullable = false)
    private Integer positionIndex;

    /** Milliseconds elapsed from session start when the error occurred. */
    @Column(name = "timestamp_ms", nullable = false)
    private Integer timestampMs;
}

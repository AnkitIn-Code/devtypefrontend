package com.devtype.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UuidGenerator;
import org.hibernate.type.SqlTypes;

import java.util.UUID;

/**
 * A purchasable cosmetic item — keyboard sound pack or cursor theme.
 *
 * <p>The actual audio/visual assets are delivered frontend-side.
 * This entity only tracks metadata (what file/class to use) and the
 * credit cost to unlock. Default cosmetics have {@code creditCost = 0}.
 *
 * <p>Type values: {@code KEYBOARD_SOUND}, {@code CURSOR_THEME}.
 */
@Entity
@Table(name = "cosmetics")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Cosmetic {

    @Id
    @UuidGenerator
    @Column(updatable = false, nullable = false)
    private UUID id;

    /** Stable business key, e.g. "SOUND_MECHANICAL". */
    @Column(nullable = false, unique = true, length = 60)
    private String key;

    @Column(nullable = false, length = 100)
    private String name;

    /** {@code KEYBOARD_SOUND} or {@code CURSOR_THEME}. */
    @Column(nullable = false, length = 30)
    private String type;

    @Column(columnDefinition = "TEXT")
    private String description;

    /**
     * JSON blob with asset references, e.g.
     * {@code {"soundFile":"mechanical.mp3","volume":0.5}}.
     */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private String metadata;

    @Builder.Default
    @Column(name = "credit_cost", nullable = false)
    private Integer creditCost = 0;

    /** {@code true} for the built-in free cosmetics every user gets by default. */
    @Builder.Default
    @Column(name = "is_default", nullable = false)
    private Boolean isDefault = false;
}

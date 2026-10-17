package com.devtype.backend.entity;

import com.devtype.backend.entity.enums.Difficulty;
import com.devtype.backend.entity.enums.SourceType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.time.Instant;
import java.util.LinkedHashSet;
import java.util.Set;
import java.util.UUID;

/**
 * A code snippet / typing template that users practice against.
 *
 * <p>{@code authorId} is nullable — system-generated and AI snippets have no
 * human author. Tags are stored in a separate {@code snippet_tags} join table
 * and exposed as a {@code Set<String>} via {@code @ElementCollection}.
 */
@Entity
@Table(name = "snippets")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Snippet {

    @Id
    @UuidGenerator
    @Column(updatable = false, nullable = false)
    private UUID id;

    /** Nullable — system / AI snippets have no human author. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "author_id")
    private User author;

    @Column(nullable = false, length = 50)
    private String language;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 15)
    private Difficulty difficulty;

    @Column(nullable = false, length = 255)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String code;

    /**
     * Stored in the {@code snippet_tags} join table.
     * Use {@code EAGER} here because tags are always needed with the snippet.
     */
    @Builder.Default
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(
        name = "snippet_tags",
        joinColumns = @JoinColumn(name = "snippet_id")
    )
    @Column(name = "tag", length = 50)
    private Set<String> tags = new LinkedHashSet<>();

    @Builder.Default
    @Column(name = "is_public", nullable = false)
    private Boolean isPublic = true;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "source_type", nullable = false, length = 20)
    private SourceType sourceType = SourceType.MANUAL;

    /**
     * Intentionally buggy code for BUG_FIX game mode.
     * Players type the corrected version; scoring rewards speed + diff correctness.
     * Null for all non-BUG_FIX snippets.
     */
    @Column(name = "buggy_code", columnDefinition = "TEXT")
    private String buggyCode;

    @Builder.Default
    @Column(name = "plays", nullable = false)
    private Integer plays = 0;

    @Builder.Default
    @Column(name = "likes", nullable = false)
    private Integer likes = 0;

    @Builder.Default
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
}

package com.devtype.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.io.Serializable;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "snippet_likes")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@IdClass(SnippetLike.SnippetLikeId.class)
public class SnippetLike {

    @Id
    @Column(name = "snippet_id", nullable = false)
    private UUID snippetId;

    @Id
    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Builder.Default
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SnippetLikeId implements Serializable {
        private UUID snippetId;
        private UUID userId;
    }
}

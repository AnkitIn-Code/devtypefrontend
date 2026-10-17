package com.devtype.backend.dto.template;

import com.devtype.backend.entity.Snippet;
import com.devtype.backend.entity.enums.Difficulty;
import com.devtype.backend.entity.enums.SourceType;

import java.time.Instant;
import java.util.Set;
import java.util.UUID;

public record TemplateResponseDto(
    UUID id,
    UUID authorId,
    String authorUsername,
    String language,
    Difficulty difficulty,
    String title,
    String code,
    Set<String> tags,
    Boolean isPublic,
    SourceType sourceType,
    Integer plays,
    Integer likes,
    Boolean isLiked,
    Instant createdAt
) {
    public static TemplateResponseDto from(Snippet s) {
        return from(s, false);
    }

    public static TemplateResponseDto from(Snippet s, boolean isLiked) {
        return new TemplateResponseDto(
            s.getId(),
            s.getAuthor() != null ? s.getAuthor().getId() : null,
            s.getAuthor() != null ? s.getAuthor().getUsername() : "System",
            s.getLanguage(),
            s.getDifficulty(),
            s.getTitle(),
            s.getCode(),
            s.getTags() != null ? s.getTags() : Set.of(),
            s.getIsPublic(),
            s.getSourceType(),
            s.getPlays() != null ? s.getPlays() : 0,
            s.getLikes() != null ? s.getLikes() : 0,
            isLiked,
            s.getCreatedAt()
        );
    }
}

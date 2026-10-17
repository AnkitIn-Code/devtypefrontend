package com.devtype.backend.dto.session;

import com.devtype.backend.entity.TypingSession;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record SessionResponseDto(
    UUID id,
    UUID snippetId,
    String snippetTitle,
    String language,
    Integer wpm,
    Integer rawWpm,
    BigDecimal accuracy,
    Integer errorCount,
    Integer durationMs,
    Integer xpEarned,
    Boolean isSuspicious,
    Instant createdAt
) {
    public static SessionResponseDto from(TypingSession s) {
        String lang = s.getLanguage();
        if (lang == null || lang.isBlank() || lang.equalsIgnoreCase("mixed")) {
            lang = s.getSnippet() != null ? s.getSnippet().getLanguage() : "cpp";
        }
        if (lang == null || lang.isBlank() || lang.equalsIgnoreCase("mixed")) {
            lang = "cpp";
        }

        String title = s.getSnippetTitle();
        if (title == null || title.isBlank()) {
            title = s.getSnippet() != null ? s.getSnippet().getTitle() : "Practice Session";
        }
        if (title == null || title.isBlank()) {
            title = "Practice Session";
        }

        return new SessionResponseDto(
            s.getId(),
            s.getSnippet() != null ? s.getSnippet().getId() : null,
            title,
            lang,
            s.getWpm(),
            s.getRawWpm(),
            s.getAccuracy(),
            s.getErrorCount(),
            s.getDurationMs(),
            s.getXpEarned(),
            s.getIsSuspicious(),
            s.getCreatedAt()
        );
    }
}

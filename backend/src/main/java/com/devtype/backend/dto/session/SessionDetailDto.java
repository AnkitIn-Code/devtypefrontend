package com.devtype.backend.dto.session;

import com.devtype.backend.entity.SessionErrorEvent;
import com.devtype.backend.entity.TypingSession;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record SessionDetailDto(
    UUID id,
    UUID snippetId,
    String snippetTitle,
    String snippetCode,
    String language,
    Integer wpm,
    Integer rawWpm,
    BigDecimal accuracy,
    Integer errorCount,
    Integer durationMs,
    Integer xpEarned,
    Boolean isSuspicious,
    Instant createdAt,
    List<SessionErrorEventDto> errorEvents,
    List<java.util.Map<String, Object>> wpmHistory
) {
    public static SessionDetailDto from(TypingSession s, List<SessionErrorEvent> events) {
        List<SessionErrorEventDto> eventDtos = events != null ? events.stream()
            .map(e -> new SessionErrorEventDto(
                e.getCharacterExpected(),
                e.getCharacterTyped(),
                e.getPositionIndex(),
                e.getTimestampMs()
            )).toList() : List.of();

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

        return new SessionDetailDto(
            s.getId(),
            s.getSnippet() != null ? s.getSnippet().getId() : null,
            title,
            s.getSnippet() != null ? s.getSnippet().getCode() : "",
            lang,
            s.getWpm(),
            s.getRawWpm(),
            s.getAccuracy(),
            s.getErrorCount(),
            s.getDurationMs(),
            s.getXpEarned(),
            s.getIsSuspicious(),
            s.getCreatedAt(),
            eventDtos,
            s.getWpmHistory()
        );
    }
}

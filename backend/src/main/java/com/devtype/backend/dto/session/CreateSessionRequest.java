package com.devtype.backend.dto.session;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record CreateSessionRequest(
    UUID snippetId,
    String language,
    String snippetTitle,
    @NotNull @Min(0) Integer wpm,
    @NotNull @Min(0) Integer rawWpm,
    @NotNull BigDecimal accuracy,
    @NotNull @Min(1) Integer durationMs,
    List<SessionErrorEventDto> errorEvents,
    List<java.util.Map<String, Object>> wpmHistory
) {}

package com.devtype.backend.dto.session;

import jakarta.validation.constraints.NotNull;

public record SessionErrorEventDto(
    @NotNull String characterExpected,
    @NotNull String characterTyped,
    @NotNull Integer positionIndex,
    @NotNull Integer timestampMs
) {}

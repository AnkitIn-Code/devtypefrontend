package com.devtype.backend.dto.ai;

import java.util.UUID;

public record AIResponseDto(
    String code,
    String explanation,
    Integer creditsRemaining,
    UUID snippetId
) {}

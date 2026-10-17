package com.devtype.backend.dto.ai;

import jakarta.validation.constraints.NotBlank;

public record AIExplainRequest(
    @NotBlank(message = "Code content is required")
    String code,

    @NotBlank(message = "Language is required")
    String language
) {}

package com.devtype.backend.dto.ai;

import com.devtype.backend.entity.enums.Difficulty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record AIGenerateRequest(
    @NotBlank(message = "Language is required")
    String language,

    @NotBlank(message = "Topic is required")
    String topic,

    @NotNull(message = "Difficulty is required")
    Difficulty difficulty,

    String approach,

    String codeScope
) {}

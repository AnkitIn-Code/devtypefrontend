package com.devtype.backend.dto.ai;

import jakarta.validation.constraints.NotBlank;

public record SuggestTopicRequest(
    @NotBlank(message = "Prompt cannot be blank")
    String prompt,
    String language
) {}

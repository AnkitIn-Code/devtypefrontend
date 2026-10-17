package com.devtype.backend.dto.ai;

import jakarta.validation.constraints.NotBlank;

public record VerifyBugFixRequest(
        @NotBlank(message = "Language is required")
        String language,
        String description,
        String originalBuggyCode,
        @NotBlank(message = "Submitted code cannot be empty")
        String userSubmittedCode
) {}

package com.devtype.backend.dto.ai;

import jakarta.validation.constraints.NotBlank;

public record GenerateBuggyRequest(
        String language,
        String prompt
) {}

package com.devtype.backend.dto.ai;

public record VerifyBugFixResponse(
        boolean correct,
        String feedback
) {}

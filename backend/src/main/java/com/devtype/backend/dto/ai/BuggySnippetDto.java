package com.devtype.backend.dto.ai;

public record BuggySnippetDto(
        String title,
        String description,
        String language,
        String buggyCode,
        String solutionCode
) {}

package com.devtype.backend.dto.template;

import com.devtype.backend.entity.enums.Difficulty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.Set;

public record CreateTemplateRequest(
    @NotBlank(message = "Title is required")
    @Size(min = 2, max = 255, message = "Title must be between 2 and 255 characters")
    String title,

    @NotBlank(message = "Language is required")
    String language,

    @NotNull(message = "Difficulty is required")
    Difficulty difficulty,

    @NotBlank(message = "Code content is required")
    String code,

    Set<String> tags,

    Boolean isPublic
) {}

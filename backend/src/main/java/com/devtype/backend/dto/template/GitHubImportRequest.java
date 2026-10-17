package com.devtype.backend.dto.template;

import com.devtype.backend.entity.enums.Difficulty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.Set;

public record GitHubImportRequest(
    @NotBlank(message = "GitHub raw URL or Gist URL is required")
    String url,

    String title,

    Difficulty difficulty,

    Set<String> tags,

    Boolean isPublic
) {}

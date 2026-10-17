package com.devtype.backend.dto.template;

import com.devtype.backend.entity.enums.Difficulty;
import java.util.Set;

public record UpdateTemplateRequest(
    String title,
    Difficulty difficulty,
    String code,
    Set<String> tags,
    Boolean isPublic
) {}

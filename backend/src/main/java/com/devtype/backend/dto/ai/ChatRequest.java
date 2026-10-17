package com.devtype.backend.dto.ai;

import jakarta.validation.constraints.NotBlank;
import java.util.List;

public record ChatRequest(
    @NotBlank(message = "Message cannot be blank")
    String message,
    List<ChatMessage> history
) {}

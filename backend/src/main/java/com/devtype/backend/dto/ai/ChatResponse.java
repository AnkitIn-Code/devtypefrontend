package com.devtype.backend.dto.ai;

public record ChatResponse(
    boolean success,
    String response,
    String error
) {
    public static ChatResponse ofSuccess(String response) {
        return new ChatResponse(true, response, null);
    }

    public static ChatResponse ofError(String error) {
        return new ChatResponse(false, null, error);
    }
}

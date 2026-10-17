package com.devtype.backend.dto.auth;

import com.devtype.backend.dto.user.UserResponseDto;

/**
 * Response body for register, login, and token-refresh endpoints.
 *
 * <p>{@code user} is {@code null} for the refresh endpoint (only tokens
 * are rotated); present on register and login.
 *
 * @param accessToken  short-lived JWT (15 min)
 * @param refreshToken long-lived opaque token (7 days)
 * @param tokenType    always "Bearer"
 * @param user         full user profile (null on /auth/refresh)
 */
public record AuthResponseDto(
    String accessToken,
    String refreshToken,
    String tokenType,
    UserResponseDto user
) {
    public static AuthResponseDto of(
            String accessToken, String refreshToken, UserResponseDto user) {
        return new AuthResponseDto(accessToken, refreshToken, "Bearer", user);
    }

    public static AuthResponseDto tokenOnly(String accessToken, String refreshToken) {
        return new AuthResponseDto(accessToken, refreshToken, "Bearer", null);
    }
}

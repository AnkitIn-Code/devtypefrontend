package com.devtype.backend.dto.auth;

import jakarta.validation.constraints.NotBlank;

/**
 * Request body for POST /api/auth/refresh.
 */
public record RefreshTokenRequest(

    @NotBlank(message = "Refresh token is required")
    String refreshToken

) {}

package com.devtype.backend.dto.user;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Request body for PATCH /api/users/me.
 *
 * <p>All fields are optional — only non-null values are applied.
 * Email and password changes require a separate dedicated endpoint
 * (with re-authentication) and are intentionally excluded here.
 */
public record UpdateUserRequest(
    String username,
    String firstName,
    String lastName,
    String email,
    String avatarUrl,
    String country,
    String timezone,
    String password
) {}


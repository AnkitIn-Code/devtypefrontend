package com.devtype.backend.dto.auth;

import jakarta.validation.constraints.*;

/**
 * Request body for POST /api/auth/register.
 *
 * @param username 3-20 chars, alphanumeric + underscore only
 * @param email    valid RFC email address
 * @param password min 8 characters
 */
public record RegisterRequest(

    @NotBlank(message = "Username is required")
    @Size(min = 3, max = 20, message = "Username must be between 3 and 20 characters")
    @Pattern(
        regexp = "^[a-zA-Z0-9_]+$",
        message = "Username may only contain letters, numbers, and underscores"
    )
    String username,

    @NotBlank(message = "Email is required")
    @Email(message = "Please provide a valid email address")
    String email,

    @NotBlank(message = "Password is required")
    @Size(min = 8, message = "Password must be at least 8 characters")
    String password

) {}

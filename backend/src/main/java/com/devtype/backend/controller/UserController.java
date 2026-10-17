package com.devtype.backend.controller;

import com.devtype.backend.dto.user.UpdateUserRequest;
import com.devtype.backend.dto.user.UserResponseDto;
import com.devtype.backend.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

/**
 * User profile endpoints.
 *
 * <p>{@code GET /api/users/{username}} is public (no auth required).
 * {@code GET /api/users/me} and {@code PATCH /api/users/me} require a valid
 * JWT — enforced by the security filter chain.
 */
@Tag(name = "Users", description = "User profile and settings")
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    // ── GET /api/users/me ─────────────────────────────────────────────────────

    @Operation(
        summary = "Get the authenticated user's full profile",
        security = @SecurityRequirement(name = "bearerAuth")
    )
    @GetMapping("/me")
    public ResponseEntity<UserResponseDto> getMe(
            @AuthenticationPrincipal UserDetails principal) {
        if (principal == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized");
        }
        return ResponseEntity.ok(userService.getMe(principal.getUsername()));
    }

    // ── PATCH /api/users/me ───────────────────────────────────────────────────

    @Operation(
        summary = "Update the authenticated user's profile",
        security = @SecurityRequirement(name = "bearerAuth")
    )
    @PatchMapping("/me")
    public ResponseEntity<UserResponseDto> updateMe(
            @AuthenticationPrincipal UserDetails principal,
            @Valid @RequestBody UpdateUserRequest req) {
        if (principal == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized");
        }
        return ResponseEntity.ok(userService.updateMe(principal.getUsername(), req));
    }

    // ── GET /api/users/{username} ─────────────────────────────────────────────

    @Operation(summary = "Get a public user profile by username (no auth required)")
    @GetMapping("/{username}")
    public ResponseEntity<UserResponseDto> getByUsername(
            @PathVariable String username) {
        return ResponseEntity.ok(userService.getByUsername(username));
    }

    @Operation(summary = "Get user settings JSON", security = @SecurityRequirement(name = "bearerAuth"))
    @GetMapping("/me/settings")
    public ResponseEntity<String> getSettings(
            @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(userService.getUserSettings(principal.getUsername()));
    }

    @Operation(summary = "Update user settings JSON", security = @SecurityRequirement(name = "bearerAuth"))
    @PatchMapping("/me/settings")
    public ResponseEntity<String> updateSettings(
            @AuthenticationPrincipal UserDetails principal,
            @RequestBody String settingsJson) {
        return ResponseEntity.ok(userService.updateUserSettings(principal.getUsername(), settingsJson));
    }

    // ── GET /api/users/search ───────────────────────────────────────────────────

    @Operation(summary = "Search users by username (min 2 chars)", security = @SecurityRequirement(name = "bearerAuth"))
    @GetMapping("/search")
    public ResponseEntity<List<UserResponseDto>> searchUsers(
            @AuthenticationPrincipal UserDetails principal,
            @RequestParam("q") String query) {
        return ResponseEntity.ok(userService.searchUsers(query, principal.getUsername()));
    }

    @Operation(summary = "Delete user account with password confirmation", security = @SecurityRequirement(name = "bearerAuth"))
    @DeleteMapping("/me")
    public ResponseEntity<java.util.Map<String, String>> deleteAccount(
            @AuthenticationPrincipal UserDetails principal,
            @RequestBody java.util.Map<String, String> body) {
        String password = body.get("password");
        if (password == null || password.isBlank()) {
            return ResponseEntity.badRequest().body(java.util.Map.of("message", "Password is required for account deletion"));
        }
        userService.deleteAccount(principal.getUsername(), password);
        return ResponseEntity.ok(java.util.Map.of("message", "Account successfully deleted"));
    }
}

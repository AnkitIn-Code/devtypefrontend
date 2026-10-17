package com.devtype.backend.controller;

import com.devtype.backend.dto.auth.*;
import com.devtype.backend.entity.User;
import com.devtype.backend.repository.UserRepository;
import com.devtype.backend.security.LoginRateLimiter;
import com.devtype.backend.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

/**
 * Authentication endpoints — publicly accessible.
 *
 * <p>SEC-01: Refresh tokens are issued and stored in HttpOnly, Secure cookies.
 * <p>SEC-09: Login endpoint is rate-limited per IP and email.
 * <p>FEAT-M03: Password reset endpoints (forgot-password, reset-password).
 */
@Tag(name = "Authentication", description = "Register, login, refresh, logout, and password reset")
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private static final String REFRESH_COOKIE_NAME = "refreshToken";

    private final AuthService authService;
    private final UserRepository userRepository;
    private final LoginRateLimiter loginRateLimiter;

    private String getClientIp(HttpServletRequest request) {
        String xf = request.getHeader("X-Forwarded-For");
        if (xf != null && !xf.isBlank()) {
            return xf.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    private ResponseCookie createRefreshTokenCookie(String refreshToken) {
        return ResponseCookie.from(REFRESH_COOKIE_NAME, refreshToken)
                .httpOnly(true)
                .secure(false) // Set to false for dev/localhost compatibility; true in HTTPS production
                .sameSite("Lax")
                .path("/api/auth")
                .maxAge(7 * 24 * 3600)
                .build();
    }

    private ResponseCookie createCleanRefreshTokenCookie() {
        return ResponseCookie.from(REFRESH_COOKIE_NAME, "")
                .httpOnly(true)
                .sameSite("Lax")
                .path("/api/auth")
                .maxAge(0)
                .build();
    }

    // ── POST /api/auth/register ───────────────────────────────────────────────

    @Operation(summary = "Register a new user account")
    @PostMapping("/register")
    public ResponseEntity<AuthResponseDto> register(
            @Valid @RequestBody RegisterRequest req) {
        AuthResponseDto response = authService.register(req);
        ResponseCookie cookie = createRefreshTokenCookie(response.refreshToken());
        return ResponseEntity.status(HttpStatus.CREATED)
                .header(HttpHeaders.SET_COOKIE, cookie.toString())
                .body(response);
    }

    // ── POST /api/auth/login ──────────────────────────────────────────────────

    @Operation(summary = "Login with email and password")
    @PostMapping("/login")
    public ResponseEntity<AuthResponseDto> login(
            @Valid @RequestBody LoginRequest req,
            HttpServletRequest request) {

        String clientIp = getClientIp(request);

        // SEC-09: Rate limiting on login attempts
        if (!loginRateLimiter.isAllowed(clientIp, req.email())) {
            throw new ResponseStatusException(
                HttpStatus.TOO_MANY_REQUESTS,
                "Too many login attempts. Please try again after 15 minutes."
            );
        }

        try {
            AuthResponseDto response = authService.login(req);
            loginRateLimiter.resetOnSuccess(clientIp, req.email());

            // SEC-01: Set refresh token as httpOnly cookie
            ResponseCookie cookie = createRefreshTokenCookie(response.refreshToken());
            return ResponseEntity.ok()
                    .header(HttpHeaders.SET_COOKIE, cookie.toString())
                    .body(response);
        } catch (Exception e) {
            throw e;
        }
    }

    // ── POST /api/auth/refresh ────────────────────────────────────────────────

    @Operation(summary = "Rotate refresh token — get a new access token")
    @PostMapping("/refresh")
    public ResponseEntity<AuthResponseDto> refresh(
            @RequestBody(required = false) RefreshTokenRequest req,
            @CookieValue(name = REFRESH_COOKIE_NAME, required = false) String cookieToken) {

        String token = (req != null && req.refreshToken() != null && !req.refreshToken().isBlank())
                ? req.refreshToken()
                : cookieToken;

        if (token == null || token.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Refresh token is missing");
        }

        AuthResponseDto response = authService.refresh(new RefreshTokenRequest(token));
        ResponseCookie newCookie = createRefreshTokenCookie(response.refreshToken());

        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, newCookie.toString())
                .body(response);
    }

    // ── POST /api/auth/logout ─────────────────────────────────────────────────

    @Operation(summary = "Logout — revoke the provided refresh token")
    @PostMapping("/logout")
    public ResponseEntity<Map<String, String>> logout(
            @RequestBody(required = false) RefreshTokenRequest req,
            @CookieValue(name = REFRESH_COOKIE_NAME, required = false) String cookieToken,
            @AuthenticationPrincipal UserDetails principal) {

        String token = (req != null && req.refreshToken() != null && !req.refreshToken().isBlank())
                ? req.refreshToken()
                : cookieToken;

        if (principal != null && token != null) {
            userRepository.findByEmail(principal.getUsername()).ifPresent(user ->
                authService.logoutUser(user, token));
        } else if (token != null) {
            authService.logout(new RefreshTokenRequest(token));
        }

        ResponseCookie cleanCookie = createCleanRefreshTokenCookie();
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cleanCookie.toString())
                .body(Map.of("message", "Logged out successfully"));
    }

    // ── POST /api/auth/forgot-password ────────────────────────────────────────

    @Operation(summary = "Request a password reset link (FEAT-M03)")
    @PostMapping("/forgot-password")
    public ResponseEntity<Map<String, Object>> forgotPassword(
            @Valid @RequestBody ForgotPasswordRequest req) {
        return ResponseEntity.ok(authService.forgotPassword(req));
    }

    // ── POST /api/auth/reset-password ─────────────────────────────────────────

    @Operation(summary = "Reset password using reset token (FEAT-M03)")
    @PostMapping("/reset-password")
    public ResponseEntity<Map<String, Object>> resetPassword(
            @Valid @RequestBody ResetPasswordRequest req) {
        return ResponseEntity.ok(authService.resetPassword(req));
    }
}

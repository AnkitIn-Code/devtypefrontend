package com.devtype.backend.service;

import com.devtype.backend.dto.auth.*;
import com.devtype.backend.dto.user.UserResponseDto;
import com.devtype.backend.entity.RefreshToken;
import com.devtype.backend.entity.User;
import com.devtype.backend.exception.DuplicateResourceException;
import com.devtype.backend.exception.InvalidTokenException;
import com.devtype.backend.repository.RefreshTokenRepository;
import com.devtype.backend.repository.UserRepository;
import com.devtype.backend.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Handles user registration, login, token refresh, and logout.
 *
 * <p>Token strategy:
 * <ul>
 *   <li><strong>Access token</strong> — signed JWT, validated stateless by
 *       {@code JwtAuthFilter}. Short-lived (15 min).</li>
 *   <li><strong>Refresh token</strong> — random UUID, BCrypt-hashed before
 *       storage, used once then rotated. Long-lived (7 days).</li>
 * </ul>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final com.devtype.backend.repository.PasswordResetTokenRepository passwordResetTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final AuthenticationManager authenticationManager;
    private final UserDetailsService userDetailsService;
    private final EmailService emailService;
    private final org.springframework.core.env.Environment environment;

    @Value("${jwt.refresh-expiry-ms:604800000}")
    private long refreshExpiryMs;

    @Value("${app.expose-dev-reset-token:${EXPOSE_DEV_RESET_TOKEN:true}}")
    private boolean exposeDevResetToken;

    // ── Register ─────────────────────────────────────────────────────────────

    @Transactional
    public AuthResponseDto register(RegisterRequest req) {
        if (userRepository.existsByUsername(req.username())) {
            throw new DuplicateResourceException(
                "Username '" + req.username() + "' is already taken");
        }
        if (userRepository.existsByEmail(req.email())) {
            throw new DuplicateResourceException(
                "An account with email '" + req.email() + "' already exists");
        }

        // Assign a random cartoon developer avatar (1–6)
        int avatarNum = (int) (Math.random() * 6) + 1;
        String avatarUrl = "/avatar/" + avatarNum;

        User user = User.builder()
                .username(req.username())
                .email(req.email())
                .passwordHash(passwordEncoder.encode(req.password()))
                .avatarUrl(avatarUrl)
                .credits(50)
                .level(1)
                .xp(0)
                .build();
        user = userRepository.save(user);

        return issueTokens(user);
    }

    // ── Login ─────────────────────────────────────────────────────────────────

    @Transactional
    public AuthResponseDto login(LoginRequest req) {
        try {
            authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(req.email(), req.password()));
        } catch (BadCredentialsException e) {
            throw new BadCredentialsException("Invalid email or password");
        }

        User user = userRepository.findByEmail(req.email())
                .orElseThrow(() -> new BadCredentialsException("Invalid email or password"));

        return issueTokens(user);
    }

    // ── Refresh ───────────────────────────────────────────────────────────────

    /**
     * SEC-10: Validates the incoming refresh token and atomically revokes it
     * before issuing a brand-new rotated token pair.
     * Prevents race condition where concurrent requests could both reuse the token.
     */
    @Transactional
    public AuthResponseDto refresh(RefreshTokenRequest req) {
        String rawToken = req.refreshToken();
        if (rawToken == null || rawToken.isBlank()) {
            throw new InvalidTokenException("Refresh token is required");
        }

        User user = findUserForRefreshToken(rawToken);
        List<RefreshToken> activeTokens = refreshTokenRepository.findByUserAndIsRevokedFalse(user);

        RefreshToken matchingToken = activeTokens.stream()
                .filter(rt -> !rt.isExpired() && passwordEncoder.matches(rawToken, rt.getTokenHash()))
                .findFirst()
                .orElseThrow(() -> new InvalidTokenException("Refresh token is invalid, expired, or already used"));

        // Atomic revocation — if affected rows is 0, a concurrent request already used it
        int rows = refreshTokenRepository.revokeByIdAtomic(matchingToken.getId(), Instant.now());
        if (rows == 0) {
            throw new InvalidTokenException("Refresh token is invalid, expired, or already used");
        }

        // Issue brand-new access + refresh pair
        return issueTokens(user);
    }

    // ── Logout ────────────────────────────────────────────────────────────────

    /**
     * BUG-H04: Fast O(1) logout using token prefix without scanning the entire user table.
     */
    @Transactional
    public void logout(RefreshTokenRequest req) {
        String rawToken = req != null ? req.refreshToken() : null;
        if (rawToken == null || rawToken.isBlank()) return;

        try {
            User user = findUserForRefreshToken(rawToken);
            revokeMatchingToken(user, rawToken);
        } catch (Exception ignored) {
            // Logout is idempotent — succeed silently
        }
    }

    /**
     * Single-device logout — revoke the given refresh token.
     * Used when the caller's user identity is already known (from JWT).
     */
    @Transactional
    public void logoutUser(User user, String rawRefreshToken) {
        revokeMatchingToken(user, rawRefreshToken);
    }

    /**
     * Logout from all devices — revoke every active refresh token for the user.
     */
    @Transactional
    public void logoutAllDevices(User user) {
        refreshTokenRepository.revokeAllByUser(user);
    }

    // ── Password Reset (FEAT-M03 / FEAT-S07 / BUG-L04) ────────────────────────

    @Transactional
    public java.util.Map<String, Object> forgotPassword(ForgotPasswordRequest req) {
        User user = userRepository.findByEmail(req.email().trim().toLowerCase()).orElse(null);

        String resetToken = UUID.randomUUID().toString().replace("-", "");

        if (user != null) {
            // Delete existing reset tokens for this user
            passwordResetTokenRepository.deleteAllByUser(user);

            com.devtype.backend.entity.PasswordResetToken tokenEntity = com.devtype.backend.entity.PasswordResetToken.builder()
                    .user(user)
                    .tokenHash(passwordEncoder.encode(resetToken))
                    .expiresAt(Instant.now().plus(java.time.Duration.ofMinutes(15)))
                    .build();

            passwordResetTokenRepository.save(tokenEntity);
            log.info("Password reset token generated for user {}: {}", user.getEmail(), resetToken);

            // Dispatch transactional reset email
            emailService.sendPasswordResetEmail(user.getEmail(), resetToken);
        } else {
            log.info("Password reset requested for non-existent email: {}", req.email());
        }

        // Generic response to prevent email enumeration
        java.util.Map<String, Object> resp = new java.util.HashMap<>();
        resp.put("message", "If an account exists with this email, a reset link has been sent.");

        // Return devResetToken ONLY when running under dev/test environments
        boolean isProduction = java.util.Arrays.asList(environment.getActiveProfiles()).contains("prod") || !exposeDevResetToken;
        if (!isProduction) {
            resp.put("devResetToken", resetToken);
        }
        return resp;
    }

    @Transactional
    public java.util.Map<String, Object> resetPassword(ResetPasswordRequest req) {
        String rawToken = req.token().trim();

        // B-06 fix: use indexed DB query instead of findAll() + in-memory filter
        List<com.devtype.backend.entity.PasswordResetToken> activeTokens =
                passwordResetTokenRepository.findActiveTokens(Instant.now());

        com.devtype.backend.entity.PasswordResetToken matchingToken = activeTokens.stream()
                .filter(t -> passwordEncoder.matches(rawToken, t.getTokenHash()))
                .findFirst()
                .orElseThrow(() -> new InvalidTokenException("Password reset token is invalid or has expired"));

        User user = matchingToken.getUser();
        user.setPasswordHash(passwordEncoder.encode(req.newPassword()));
        userRepository.save(user);

        // Security best practice: invalidate all existing refresh tokens across all devices
        refreshTokenRepository.revokeAllByUser(user);

        // Invalidate used reset token
        passwordResetTokenRepository.deleteAllByUser(user);

        log.info("Password successfully reset for user: {}", user.getEmail());
        return java.util.Map.of(
            "success", true,
            "message", "Password has been reset successfully. Please log in with your new password."
        );
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    /** Generate a new access + refresh token pair, persist the refresh hash. */
    private AuthResponseDto issueTokens(User user) {
        UserDetails userDetails = userDetailsService.loadUserByUsername(user.getEmail());
        String accessToken = jwtUtil.generateAccessToken(userDetails);

        // Unique per-user raw refresh token: <userId>.<randomToken>
        String rawRefresh = user.getId().toString() + "." + UUID.randomUUID().toString().replace("-", "");
        persistRefreshToken(user, rawRefresh);

        return AuthResponseDto.of(accessToken, rawRefresh, UserResponseDto.from(user));
    }

    /** BCrypt-hash and persist a new refresh token for the given user. */
    private void persistRefreshToken(User user, String rawToken) {
        RefreshToken rt = RefreshToken.builder()
                .user(user)
                .tokenHash(passwordEncoder.encode(rawToken))
                .expiresAt(Instant.now().plusMillis(refreshExpiryMs))
                .build();
        refreshTokenRepository.save(rt);
    }

    /**
     * BUG-H04: Fast O(1) user lookup from token prefix.
     */
    private User findUserForRefreshToken(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) {
            throw new InvalidTokenException("Refresh token is required");
        }

        if (rawToken.contains(".")) {
            String[] parts = rawToken.split("\\.", 2);
            try {
                UUID userId = UUID.fromString(parts[0]);
                return userRepository.findById(userId)
                        .orElseThrow(() -> new InvalidTokenException("User not found for refresh token"));
            } catch (IllegalArgumentException ignored) {}
        }

        throw new InvalidTokenException("Refresh token is invalid, expired, or already used");
    }

    /** Revoke the matching stored token (soft-delete via isRevoked flag). */
    private void revokeMatchingToken(User user, String rawToken) {
        if (user == null || rawToken == null) return;
        List<RefreshToken> tokens = refreshTokenRepository.findByUserAndIsRevokedFalse(user);
        for (RefreshToken rt : tokens) {
            if (!rt.isExpired() && passwordEncoder.matches(rawToken, rt.getTokenHash())) {
                refreshTokenRepository.revokeByIdAtomic(rt.getId(), Instant.now());
            }
        }
    }
}


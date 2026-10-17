package com.devtype.backend.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.util.Date;
import java.util.UUID;

/**
 * JWT utility for generating and validating both access and refresh tokens.
 *
 * <p>Token lifetimes:
 * <ul>
 *   <li><strong>Access token</strong>: {@code jwt.access-expiry-ms} (default 15 min)</li>
 *   <li><strong>Refresh token</strong>: {@code jwt.refresh-expiry-ms} (default 7 days)</li>
 * </ul>
 *
 * <p>The refresh token stored in the DB is a random UUID (not a JWT) hashed
 * with BCrypt. This class only produces the JWT access token. Refresh token
 * generation (random UUID) is handled in {@code AuthService}.
 */
@Slf4j
@Component
public class JwtUtil {

    @Value("${jwt.secret}")
    private String jwtSecret;

    /** Access token lifetime — default 15 minutes. */
    @Value("${jwt.access-expiry-ms:900000}")
    private long accessExpiryMs;

    // ── Token generation ────────────────────────────────────────────────────

    /**
     * Generate a signed JWT access token for the given user.
     *
     * @param userDetails authenticated user principal
     * @return compact JWT string
     */
    public String generateAccessToken(UserDetails userDetails) {
        return buildToken(userDetails.getUsername(), accessExpiryMs);
    }

    // ── Token validation ────────────────────────────────────────────────────

    /**
     * Extract the username (subject) from a JWT.
     *
     * @param token JWT string
     * @return subject claim (email)
     */
    public String extractUsername(String token) {
        return parseClaims(token).getPayload().getSubject();
    }

    /**
     * Validate token signature, expiry, and subject match.
     *
     * @param token       JWT string
     * @param userDetails user to validate against
     * @return {@code true} if valid
     */
    public boolean isTokenValid(String token, UserDetails userDetails) {
        try {
            String username = extractUsername(token);
            return username.equals(userDetails.getUsername()) && !isTokenExpired(token);
        } catch (JwtException | IllegalArgumentException e) {
            log.debug("JWT validation failed: {}", e.getMessage());
            return false;
        }
    }

    /**
     * Validate token signature and expiry only (no user lookup required).
     * Used to quickly reject obviously bad tokens at the filter level.
     */
    public boolean isTokenStructurallyValid(String token) {
        try {
            parseClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    // ── Private helpers ──────────────────────────────────────────────────────

    private String buildToken(String subject, long expiryMs) {
        Date now = new Date();
        return Jwts.builder()
                .subject(subject)
                .issuedAt(now)
                .expiration(new Date(now.getTime() + expiryMs))
                .signWith(signingKey())
                .compact();
    }

    private Jws<Claims> parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(signingKey())
                .build()
                .parseSignedClaims(token);
    }

    private boolean isTokenExpired(String token) {
        return parseClaims(token).getPayload().getExpiration().before(new Date());
    }

    private SecretKey signingKey() {
        byte[] keyBytes = Decoders.BASE64.decode(jwtSecret);
        return Keys.hmacShaKeyFor(keyBytes);
    }
}

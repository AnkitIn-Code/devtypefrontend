package com.devtype.backend.controller;

import com.devtype.backend.dto.auth.ForgotPasswordRequest;
import com.devtype.backend.entity.User;
import com.devtype.backend.repository.PasswordResetTokenRepository;
import com.devtype.backend.repository.RefreshTokenRepository;
import com.devtype.backend.repository.UserRepository;
import com.devtype.backend.security.JwtUtil;
import com.devtype.backend.security.LoginRateLimiter;
import com.devtype.backend.service.AuthService;
import com.devtype.backend.service.EmailService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.env.Environment;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/**
 * Regression test for B-02:
 * When EXPOSE_DEV_RESET_TOKEN is false (the new production/staging safe default),
 * forgotPassword() MUST NOT return "devResetToken" in the response.
 */
@ExtendWith(MockitoExtension.class)
class ForgotPasswordSecurityTest {

    @Mock private UserRepository userRepository;
    @Mock private RefreshTokenRepository refreshTokenRepository;
    @Mock private PasswordResetTokenRepository passwordResetTokenRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private JwtUtil jwtUtil;
    @Mock private AuthenticationManager authenticationManager;
    @Mock private UserDetailsService userDetailsService;
    @Mock private EmailService emailService;
    @Mock private Environment environment;
    @Mock private LoginRateLimiter loginRateLimiter;

    private AuthService authService;
    private AuthController authController;

    @BeforeEach
    void setUp() {
        authService = new AuthService(
                userRepository,
                refreshTokenRepository,
                passwordResetTokenRepository,
                passwordEncoder,
                jwtUtil,
                authenticationManager,
                userDetailsService,
                emailService,
                environment
        );
        authController = new AuthController(authService, userRepository, loginRateLimiter);
    }

    @Test
    @DisplayName("B-02 regression: devResetToken is NOT exposed when exposeDevResetToken is false (default)")
    void forgotPassword_defaultFlag_doesNotExposeDevResetToken() {
        // Safe default: false
        ReflectionTestUtils.setField(authService, "exposeDevResetToken", false);
        when(environment.getActiveProfiles()).thenReturn(new String[]{"default"});

        User user = User.builder()
                .id(UUID.randomUUID())
                .email("user@devtype.test")
                .username("testuser")
                .passwordHash("hashed")
                .build();
        when(userRepository.findByEmail("user@devtype.test")).thenReturn(Optional.of(user));
        when(passwordEncoder.encode(anyString())).thenReturn("hashedToken");

        ForgotPasswordRequest req = new ForgotPasswordRequest("user@devtype.test");
        ResponseEntity<Map<String, Object>> response = authController.forgotPassword(req);

        assertNotNull(response.getBody());
        assertEquals("If an account exists with this email, a reset link has been sent.", response.getBody().get("message"));
        assertNull(response.getBody().get("devResetToken"), "devResetToken must NOT be present when exposeDevResetToken=false");
    }

    @Test
    @DisplayName("B-02 verification: devResetToken IS returned only when explicitly opted-in (exposeDevResetToken=true in local dev)")
    void forgotPassword_explicitOptIn_exposesDevResetToken() {
        ReflectionTestUtils.setField(authService, "exposeDevResetToken", true);
        when(environment.getActiveProfiles()).thenReturn(new String[]{"dev"});

        ForgotPasswordRequest req = new ForgotPasswordRequest("user@devtype.test");
        ResponseEntity<Map<String, Object>> response = authController.forgotPassword(req);

        assertNotNull(response.getBody());
        assertNotNull(response.getBody().get("devResetToken"), "devResetToken should be present when explicitly opted in");
    }
}

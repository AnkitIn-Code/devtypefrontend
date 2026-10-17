package com.devtype.backend.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

/**
 * Transactional email service using Resend HTTP API.
 * Reads RESEND_API_KEY from environment. Falls back to console logging when unconfigured.
 */
@Slf4j
@Service
public class ResendEmailService implements EmailService {

    @Value("${resend.api-key:${RESEND_API_KEY:}}")
    private String resendApiKey;

    @Value("${resend.from-email:${RESEND_FROM_EMAIL:onboarding@resend.dev}}")
    private String fromEmail;

    @Value("${app.frontend-url:${FRONTEND_URL:http://localhost:3000}}")
    private String frontendUrl;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    @Override
    public void sendPasswordResetEmail(String toEmail, String resetToken) {
        String resetLink = frontendUrl + "/forgot-password?token=" + resetToken;

        if (resendApiKey == null || resendApiKey.isBlank()) {
            log.info("[EmailService] No RESEND_API_KEY configured. Password reset link for {}: {}", toEmail, resetLink);
            return;
        }

        try {
            String jsonPayload = String.format(
                    "{\"from\":\"%s\",\"to\":[\"%s\"],\"subject\":\"Reset your DevType password\",\"html\":\"<p>Click the link below to reset your DevType password:</p><p><a href=\\\"%s\\\">%s</a></p><p>This link expires in 15 minutes.</p>\"}",
                    fromEmail, toEmail, resetLink, resetLink
            );

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://api.resend.com/emails"))
                    .header("Authorization", "Bearer " + resendApiKey)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(jsonPayload))
                    .timeout(Duration.ofSeconds(10))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                log.info("[EmailService] Successfully sent password reset email via Resend to {}", toEmail);
            } else {
                log.error("[EmailService] Resend API error (status {}): {}", response.statusCode(), response.body());
            }
        } catch (Exception e) {
            log.error("[EmailService] Failed to send password reset email to {}: {}", toEmail, e.getMessage());
        }
    }
}

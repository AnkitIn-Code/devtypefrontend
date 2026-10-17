package com.devtype.backend.security;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * SEC-09: In-memory rate limiter for login attempts (10 attempts per 15 minutes per IP/key).
 * Prevents automated credential stuffing and brute-force password guessing attacks.
 */
@Slf4j
@Component
public class LoginRateLimiter {

    private static final int MAX_ATTEMPTS = 10;
    private static final long WINDOW_MS = 15 * 60 * 1000L; // 15 minutes

    private final Map<String, WindowTracker> ipTrackers = new ConcurrentHashMap<>();
    private final Map<String, WindowTracker> emailTrackers = new ConcurrentHashMap<>();

    private static class WindowTracker {
        long windowStart = System.currentTimeMillis();
        int attempts = 0;

        synchronized boolean checkAndIncrement() {
            long now = System.currentTimeMillis();
            if (now - windowStart > WINDOW_MS) {
                windowStart = now;
                attempts = 1;
                return true;
            }
            attempts++;
            return attempts <= MAX_ATTEMPTS;
        }

        synchronized int getRemainingAttempts() {
            long now = System.currentTimeMillis();
            if (now - windowStart > WINDOW_MS) return MAX_ATTEMPTS;
            return Math.max(0, MAX_ATTEMPTS - attempts);
        }
    }

    public boolean isAllowed(String ip, String email) {
        boolean ipAllowed = true;
        if (ip != null && !ip.isBlank()) {
            WindowTracker tracker = ipTrackers.computeIfAbsent(ip, k -> new WindowTracker());
            ipAllowed = tracker.checkAndIncrement();
        }

        boolean emailAllowed = true;
        if (email != null && !email.isBlank()) {
            WindowTracker tracker = emailTrackers.computeIfAbsent(email.toLowerCase().trim(), k -> new WindowTracker());
            emailAllowed = tracker.checkAndIncrement();
        }

        if (!ipAllowed || !emailAllowed) {
            log.warn("SEC-09: Login rate limit exceeded for IP={} email={}", ip, email);
            return false;
        }

        return true;
    }

    public void resetOnSuccess(String ip, String email) {
        if (ip != null) ipTrackers.remove(ip);
        if (email != null) emailTrackers.remove(email.toLowerCase().trim());
    }
}

package com.devtype.backend.service;

import com.devtype.backend.dto.user.UpdateUserRequest;
import com.devtype.backend.dto.user.UserResponseDto;
import com.devtype.backend.entity.User;
import com.devtype.backend.exception.DuplicateResourceException;
import com.devtype.backend.repository.TypingSessionRepository;
import com.devtype.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * User profile management — retrieve and update user data.
 *
 * <p>All public-facing methods return {@link UserResponseDto} so that
 * {@code passwordHash} never leaks out of the service layer.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final TypingSessionRepository sessionRepository;
    private final org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;
    private final AchievementService achievementService;

    // ── GET /api/users/me ─────────────────────────────────────────────────

    /**
     * Full profile for the authenticated user, including aggregated stats.
     *
     * @param email the authenticated user's email (JWT subject)
     */
    @Transactional(readOnly = true)
    public UserResponseDto getMe(String email) {
        User user = findByEmail(email);
        return buildWithStats(user);
    }

    // ── PATCH /api/users/me ───────────────────────────────────────────────

    @Transactional
    public UserResponseDto updateMe(String email, UpdateUserRequest req) {
        User user = findByEmail(email);

        if (req.username() != null && !req.username().isBlank()) {
            if (!req.username().equals(user.getUsername()) &&
                userRepository.existsByUsername(req.username())) {
                throw new DuplicateResourceException(
                    "Username '" + req.username() + "' is already taken");
            }
            user.setUsername(req.username().trim());
        }
        if (req.email() != null && !req.email().isBlank()) {
            if (!req.email().equalsIgnoreCase(user.getEmail()) &&
                userRepository.existsByEmail(req.email().trim())) {
                throw new DuplicateResourceException(
                    "Email '" + req.email() + "' is already registered");
            }
            user.setEmail(req.email().trim());
        }
        if (req.avatarUrl() != null) {
            user.setAvatarUrl(req.avatarUrl());
        }
        if (req.country() != null && !req.country().isBlank()) {
            user.setCountry(req.country().toUpperCase());
        }
        if (req.timezone() != null && !req.timezone().isBlank()) {
            try {
                java.time.ZoneId.of(req.timezone().trim());
                user.setTimezone(req.timezone().trim());
            } catch (Exception e) {
                throw new IllegalArgumentException("Invalid IANA timezone identifier: " + req.timezone());
            }
        }
        if (req.password() != null && !req.password().isBlank()) {
            user.setPasswordHash(passwordEncoder.encode(req.password()));
        }

        user = userRepository.save(user);

        return buildWithStats(user);
    }

    // ── GET /api/users/{username} ─────────────────────────────────────────

    /**
     * Public profile view — stats included, supports username or UUID string.
     *
     * @param identifier target username or UUID string
     * @throws UsernameNotFoundException if user doesn't exist
     */
    @Transactional(readOnly = true)
    public UserResponseDto getByUsername(String identifier) {
        User user = null;
        try {
            java.util.UUID uuid = java.util.UUID.fromString(identifier);
            user = userRepository.findById(uuid).orElse(null);
        } catch (IllegalArgumentException ignored) {}

        if (user == null) {
            user = userRepository.findByUsername(identifier)
                    .orElseThrow(() ->
                        new UsernameNotFoundException("User not found: " + identifier));
        }
        return buildWithStats(user);
    }

    // ── Private helpers ───────────────────────────────────────────────────

    private User findByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() ->
                    new UsernameNotFoundException("User not found: " + email));
    }

    private UserResponseDto buildWithStats(User user) {
        long totalSessions = sessionRepository.countByUserId(user.getId());
        Double avgWpm      = sessionRepository.findAverageWpmByUserId(user.getId());
        Double avgAccuracy = sessionRepository.findAverageAccuracyByUserId(user.getId());
        Integer bestWpm    = sessionRepository.findTopByUserIdOrderByWpmDesc(user.getId())
                                .map(s -> s.getWpm())
                                .orElse(0);

        return UserResponseDto.withStats(user, totalSessions, avgWpm, avgAccuracy, bestWpm);
    }

    @Transactional(readOnly = true)
    public String getUserSettings(String email) {
        User user = findByEmail(email);
        return user.getSettings() != null ? user.getSettings() : "{}";
    }

    @Transactional
    public String updateUserSettings(String email, String settingsJson) {
        User user = findByEmail(email);
        user.setSettings(settingsJson);
        userRepository.save(user);
        return user.getSettings();
    }

    @Transactional
    public void deleteAccount(String email, String password) {
        User user = findByEmail(email);
        if (user.getPasswordHash() != null && passwordEncoder != null) {
            if (!passwordEncoder.matches(password, user.getPasswordHash())) {
                throw new IllegalArgumentException("Incorrect account password. Account deletion failed.");
            }
        }
        user.setDeletedAt(java.time.Instant.now());
        user.setPasswordHash(null);
        userRepository.save(user);
        log.info("User account {} deleted and set to deletedAt={}", user.getUsername(), user.getDeletedAt());
    }

    /**
     * Search users by username — returns up to 20 results ordered by XP.
     * Excludes the requesting user from results.
     */
    @Transactional(readOnly = true)
    public List<UserResponseDto> searchUsers(String query, String requestingEmail) {
        if (query == null || query.trim().length() < 2) {
            return java.util.Collections.emptyList();
        }
        return userRepository.searchByUsername(query.trim(), PageRequest.of(0, 20))
                .stream()
                .filter(u -> !u.getEmail().equals(requestingEmail))
                .map(UserResponseDto::from)
                .collect(java.util.stream.Collectors.toList());
    }
}

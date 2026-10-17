package com.devtype.backend.controller;

import com.devtype.backend.entity.CreditLedger;
import com.devtype.backend.entity.TypingSession;
import com.devtype.backend.entity.User;
import com.devtype.backend.repository.CreditLedgerRepository;
import com.devtype.backend.repository.TypingSessionRepository;
import com.devtype.backend.repository.UserRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Admin operations controller (FEAT-S04).
 * Protected by Spring Security to require ROLE_ADMIN.
 */
@Slf4j
@Tag(name = "Admin", description = "Admin dashboard, audit logs, and session invalidation")
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final TypingSessionRepository typingSessionRepository;
    private final UserRepository userRepository;
    private final CreditLedgerRepository creditLedgerRepository;
    private final com.devtype.backend.service.SeasonService seasonService;
    private final com.devtype.backend.service.AchievementService achievementService;
    private final com.devtype.backend.service.XpService xpService;

    /**
     * POST /api/admin/seasons/{id}/end
     * FEAT-M09: Admin manual override to immediately end a season and reset duel ratings.
     */
    @Operation(summary = "End a season manually and trigger duel rating reset", security = @SecurityRequirement(name = "bearerAuth"))
    @PostMapping("/seasons/{id}/end")
    public ResponseEntity<Map<String, Object>> endSeason(@PathVariable UUID id) {
        return ResponseEntity.ok(seasonService.endSeason(id));
    }


    /**
     * GET /api/admin/suspicious-sessions
     * Paginated list of sessions flagged as suspicious, filterable by date range.
     */
    @Operation(summary = "Get suspicious sessions for audit", security = @SecurityRequirement(name = "bearerAuth"))
    @GetMapping("/suspicious-sessions")
    @Transactional(readOnly = true)
    public ResponseEntity<Page<Map<String, Object>>> getSuspiciousSessions(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        Pageable pageable = PageRequest.of(page, Math.min(100, Math.max(1, size)));
        Page<TypingSession> sessions = typingSessionRepository.findSuspiciousSessions(from, to, pageable);

        Page<Map<String, Object>> result = sessions.map(s -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", s.getId().toString());
            map.put("wpm", s.getWpm());
            map.put("rawWpm", s.getRawWpm());
            map.put("accuracy", s.getAccuracy());
            map.put("errorCount", s.getErrorCount());
            map.put("durationMs", s.getDurationMs());
            map.put("xpEarned", s.getXpEarned());
            map.put("isSuspicious", s.getIsSuspicious());
            map.put("language", s.getLanguage());
            map.put("snippetTitle", s.getSnippetTitle());
            map.put("createdAt", s.getCreatedAt());

            if (s.getUser() != null) {
                map.put("userId", s.getUser().getId().toString());
                map.put("username", s.getUser().getUsername());
                map.put("email", s.getUser().getEmail());
                map.put("avatarUrl", s.getUser().getAvatarUrl());
            }

            return map;
        });

        return ResponseEntity.ok(result);
    }

    /**
     * POST /api/admin/sessions/{id}/invalidate
     * Invalidates a session, rolls back awarded XP/credits, and revokes fraudulent achievements (NEW-HIGH-01).
     */
    @Operation(summary = "Invalidate a session and revert rewards", security = @SecurityRequirement(name = "bearerAuth"))
    @PostMapping("/sessions/{id}/invalidate")
    @Transactional
    public ResponseEntity<Map<String, Object>> invalidateSession(@PathVariable UUID id) {
        TypingSession session = typingSessionRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Session not found: " + id));

        session.setIsSuspicious(true);

        User user = session.getUser();
        int xpReverted = 0;
        int creditsReverted = 0;
        java.util.List<String> revokedAchievements = java.util.List.of();

        if (user != null) {
            // Revert XP if any was granted
            if (session.getXpEarned() != null && session.getXpEarned() > 0) {
                xpReverted = session.getXpEarned();
                user.setXp(Math.max(0, (user.getXp() != null ? user.getXp() : 0) - xpReverted));
                session.setXpEarned(0);
            }

            // Deduct session completion credits if user balance permits
            int currentCredits = user.getCredits() != null ? user.getCredits() : 0;
            if (currentCredits >= 10) {
                creditsReverted = 10;
                user.setCredits(currentCredits - 10);
                CreditLedger ledger = CreditLedger.builder()
                        .user(user)
                        .delta(-10)
                        .reason("Admin invalidation of suspicious session " + id)
                        .build();
                creditLedgerRepository.save(ledger);
            }

            if (user.getXp() != null) {
                user.setLevel(xpService.calculateLevelFromXp(user.getXp()));
            }

            userRepository.save(user);
        }

        typingSessionRepository.saveAndFlush(session);

        // NEW-HIGH-01: Identify and revoke fraudulent achievements
        if (user != null) {
            revokedAchievements = achievementService.revokeUnqualifiedAchievements(user, session);
        }

        log.info("Admin invalidated session {} for user {} (reverted {} XP, {} credits, revoked achievements: {})",
                id, user != null ? user.getUsername() : "unknown", xpReverted, creditsReverted, revokedAchievements);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Session invalidated and rewards reverted");
        response.put("sessionId", id.toString());
        response.put("xpReverted", xpReverted);
        response.put("creditsReverted", creditsReverted);
        response.put("revokedAchievements", revokedAchievements);

        return ResponseEntity.ok(response);
    }
}

package com.devtype.backend.service;

import com.devtype.backend.dto.session.*;
import com.devtype.backend.entity.SessionErrorEvent;
import com.devtype.backend.entity.Snippet;
import com.devtype.backend.entity.TypingSession;
import com.devtype.backend.entity.User;
import jakarta.persistence.EntityNotFoundException;
import com.devtype.backend.repository.SessionErrorEventRepository;
import com.devtype.backend.repository.SnippetRepository;
import com.devtype.backend.repository.TypingSessionRepository;
import com.devtype.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class TypingSessionService {

    private final UserRepository userRepository;
    private final SnippetRepository snippetRepository;
    private final TypingSessionRepository typingSessionRepository;
    private final SessionErrorEventRepository sessionErrorEventRepository;
    private final XpService xpService;
    private final StreakService streakService;
    private final CreditService creditService;
    private final AchievementService achievementService;

    @Transactional
    public SessionResponseDto submitSession(String email, CreateSessionRequest req) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + email));

        Snippet snippet = null;
        if (req.snippetId() != null) {
            snippet = snippetRepository.findById(req.snippetId()).orElse(null);
            // BUG-L03: Play count is incremented via dedicated /api/snippets/{id}/play endpoint;
            // removed duplicate increment here to avoid double-counting.
        }

        // Anti-cheat verification (BUG-H10: centralized AntiCheatConstants)
        boolean isSuspicious = false;
        if (req.durationMs() < com.devtype.backend.config.AntiCheatConstants.MIN_SESSION_DURATION_MS
                || req.wpm() > com.devtype.backend.config.AntiCheatConstants.MAX_SAFE_WPM
                || (req.rawWpm() != null && req.rawWpm() > com.devtype.backend.config.AntiCheatConstants.MAX_RAW_WPM)
                || req.accuracy() == null
                || req.accuracy().doubleValue() > 100.0
                || req.accuracy().doubleValue() < 0.0) {
            isSuspicious = true;
            log.warn("Anti-cheat: Flagged suspicious solo session by user {} (wpm={}, rawWpm={}, durationMs={}, accuracy={})",
                    user.getUsername(), req.wpm(), req.rawWpm(), req.durationMs(), req.accuracy());
        }

        // Calculate XP and award gamification rewards (BUG-C06: guard all rewards under !isSuspicious)
        int xpEarned = 0;
        if (!isSuspicious) {
            xpEarned = (int) Math.round(req.wpm() * 1.5 + req.accuracy().doubleValue() * 1.0);
            if (req.accuracy().doubleValue() >= 100.0) {
                xpEarned += 50; // Perfect accuracy bonus
            }

            xpService.awardXp(user, xpEarned, "Typing session completion");
            creditService.earn(user, 10, "Typing session completion");
            streakService.updateStreak(user);
        } else {
            log.info("Anti-cheat: Skipped XP, credits, streak, and achievements for suspicious session by user {}",
                    user.getUsername());
        }

        // Save session
        int errorCount = req.errorEvents() != null ? req.errorEvents().size() : 0;

        String sessionLang = req.language();
        String sessionTitle = req.snippetTitle();
        if (snippet != null) {
            if (sessionLang == null || sessionLang.isBlank() || "mixed".equalsIgnoreCase(sessionLang)) {
                sessionLang = snippet.getLanguage();
            }
            if (sessionTitle == null || sessionTitle.isBlank()) {
                sessionTitle = snippet.getTitle();
            }
        }
        if (sessionLang == null || sessionLang.isBlank() || "mixed".equalsIgnoreCase(sessionLang)) {
            sessionLang = "cpp";
        }
        if (sessionTitle == null || sessionTitle.isBlank()) {
            sessionTitle = "Practice Session";
        }

        TypingSession session = TypingSession.builder()
                .user(user)
                .snippet(snippet)
                .language(sessionLang)
                .snippetTitle(sessionTitle)
                .wpm(req.wpm())
                .rawWpm(req.rawWpm())
                .accuracy(req.accuracy())
                .errorCount(errorCount)
                .durationMs(req.durationMs())
                .xpEarned(xpEarned)
                .isSuspicious(isSuspicious)
                .wpmHistory(req.wpmHistory())
                .build();

        session = typingSessionRepository.save(session);

        if (!isSuspicious) {
            achievementService.checkAchievements(user);
        }

        // Save error events for heatmap analytics
        if (req.errorEvents() != null && !req.errorEvents().isEmpty()) {
            TypingSession savedSession = session;
            List<SessionErrorEvent> events = req.errorEvents().stream()
                    .map(e -> SessionErrorEvent.builder()
                            .session(savedSession)
                            .characterExpected(e.characterExpected())
                            .characterTyped(e.characterTyped())
                            .positionIndex(e.positionIndex())
                            .timestampMs(e.timestampMs())
                            .build())
                    .toList();
            sessionErrorEventRepository.saveAll(events);
        }

        return SessionResponseDto.from(session);
    }

    @Transactional(readOnly = true)
    public Page<SessionResponseDto> getUserSessions(String email, Pageable pageable) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + email));

        return typingSessionRepository.findByUserIdOrderByCreatedAtDesc(user.getId(), pageable)
                .map(SessionResponseDto::from);
    }

    @Transactional(readOnly = true)
    public Page<SessionResponseDto> getUserSessionsByUsername(String callerEmail, String identifier, Pageable pageable) {
        User targetUser = null;
        try {
            UUID uuid = UUID.fromString(identifier);
            targetUser = userRepository.findById(uuid).orElse(null);
        } catch (IllegalArgumentException ignored) {}

        if (targetUser == null) {
            targetUser = userRepository.findByUsername(identifier)
                    .orElseThrow(() -> new UsernameNotFoundException("User not found: " + identifier));
        }

        // SEC-02: Privacy check — detailed session history is private to the owner.
        // Third parties view aggregate stats via public profile / leaderboard endpoints.
        if (callerEmail == null || !callerEmail.equalsIgnoreCase(targetUser.getEmail())) {
            boolean isAdmin = false;
            if (callerEmail != null) {
                User caller = userRepository.findByEmail(callerEmail).orElse(null);
                if (caller != null && caller.getRole() == com.devtype.backend.entity.enums.UserRole.ADMIN) {
                    isAdmin = true;
                }
            }
            if (!isAdmin) {
                return Page.empty(pageable);
            }
        }

        return typingSessionRepository.findByUserIdOrderByCreatedAtDesc(targetUser.getId(), pageable)
                .map(SessionResponseDto::from);
    }

    @Transactional(readOnly = true)
    public SessionDetailDto getSessionDetail(String email, UUID sessionId) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + email));

        TypingSession session = typingSessionRepository.findById(sessionId)
                .orElseThrow(() -> new EntityNotFoundException("Session not found with id: " + sessionId));

        if (!session.getUser().getId().equals(user.getId())) {
            throw new IllegalArgumentException("Unauthorized access to session detail");
        }

        List<SessionErrorEvent> events = sessionErrorEventRepository.findBySessionId(sessionId);
        return SessionDetailDto.from(session, events);
    }

    @Transactional(readOnly = true)
    public java.util.Map<String, Object> getShareCardData(UUID sessionId) {
        TypingSession session = typingSessionRepository.findById(sessionId)
                .orElseThrow(() -> new EntityNotFoundException("Session not found with id: " + sessionId));

        User user = session.getUser();
        String rankBadge = session.getWpm() >= 100 ? "GRANDMASTER"
                : session.getWpm() >= 75 ? "MASTER"
                : session.getWpm() >= 50 ? "PRO" : "ROOKIE";

        java.util.Map<String, Object> map = new java.util.HashMap<>();
        map.put("sessionId", session.getId().toString());
        map.put("username", user.getUsername());
        map.put("avatarUrl", user.getAvatarUrl() != null ? user.getAvatarUrl() : "");
        map.put("userLevel", user.getLevel() != null ? user.getLevel() : 1);
        map.put("wpm", session.getWpm());
        map.put("rawWpm", session.getRawWpm() != null ? session.getRawWpm() : session.getWpm());
        map.put("accuracy", session.getAccuracy());
        map.put("durationMs", session.getDurationMs());
        map.put("snippetTitle", session.getSnippet() != null ? session.getSnippet().getTitle() : "Practice Snippet");
        map.put("snippetLanguage", session.getSnippet() != null ? session.getSnippet().getLanguage() : "javascript");
        map.put("rankBadge", rankBadge);
        map.put("completedAt", session.getCreatedAt());
        return map;
    }
}

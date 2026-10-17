package com.devtype.backend.controller;

import com.devtype.backend.entity.CreditLedger;
import com.devtype.backend.entity.TypingSession;
import com.devtype.backend.entity.User;
import com.devtype.backend.repository.CreditLedgerRepository;
import com.devtype.backend.repository.TypingSessionRepository;
import com.devtype.backend.repository.UserRepository;
import com.devtype.backend.service.AchievementService;
import com.devtype.backend.service.SeasonService;
import com.devtype.backend.service.XpService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminControllerTest {

    @Mock private TypingSessionRepository typingSessionRepository;
    @Mock private UserRepository userRepository;
    @Mock private CreditLedgerRepository creditLedgerRepository;
    @Mock private SeasonService seasonService;
    @Mock private AchievementService achievementService;
    @Mock private XpService xpService;

    @InjectMocks
    private AdminController adminController;

    private User testUser;
    private TypingSession session;
    private UUID sessionId;

    @BeforeEach
    void setUp() {
        sessionId = UUID.randomUUID();
        testUser = User.builder()
                .id(UUID.randomUUID())
                .username("cheater")
                .email("cheater@test.com")
                .xp(300)
                .credits(100)
                .level(2)
                .build();

        session = TypingSession.builder()
                .id(sessionId)
                .user(testUser)
                .wpm(150)
                .xpEarned(250)
                .isSuspicious(false)
                .build();
    }

    @Test
    @DisplayName("Invalidating a session reverts XP/credits and revokes fraudulent achievements (NEW-HIGH-01)")
    void testInvalidateSessionRevokesAchievements() {
        when(typingSessionRepository.findById(sessionId)).thenReturn(Optional.of(session));
        when(achievementService.revokeUnqualifiedAchievements(eq(testUser), eq(session)))
                .thenReturn(List.of("WPM_100", "PERFECTIONIST"));
        when(xpService.calculateLevelFromXp(anyInt())).thenReturn(1);

        ResponseEntity<Map<String, Object>> response = adminController.invalidateSession(sessionId);

        assertEquals(200, response.getStatusCode().value());
        assertTrue((Boolean) response.getBody().get("success"));
        assertEquals(250, response.getBody().get("xpReverted"));
        assertEquals(10, response.getBody().get("creditsReverted"));

        @SuppressWarnings("unchecked")
        List<String> revoked = (List<String>) response.getBody().get("revokedAchievements");
        assertNotNull(revoked);
        assertEquals(2, revoked.size());
        assertTrue(revoked.contains("WPM_100"));
        assertTrue(revoked.contains("PERFECTIONIST"));

        assertTrue(session.getIsSuspicious());
        assertEquals(0, session.getXpEarned());
        verify(typingSessionRepository).saveAndFlush(session);
        verify(creditLedgerRepository).save(any(CreditLedger.class));
        verify(userRepository).save(testUser);
        verify(achievementService).revokeUnqualifiedAchievements(eq(testUser), eq(session));
    }
}

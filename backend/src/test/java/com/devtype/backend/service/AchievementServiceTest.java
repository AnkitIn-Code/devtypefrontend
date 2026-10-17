package com.devtype.backend.service;

import com.corundumstudio.socketio.SocketIOServer;
import com.devtype.backend.entity.Achievement;
import com.devtype.backend.entity.TypingSession;
import com.devtype.backend.entity.User;
import com.devtype.backend.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AchievementServiceTest {

    @Mock private AchievementRepository achievementRepository;
    @Mock private UserAchievementRepository userAchievementRepository;
    @Mock private TypingSessionRepository typingSessionRepository;
    @Mock private SnippetRepository snippetRepository;
    @Mock private MatchParticipantRepository matchParticipantRepository;
    @Mock private DailyChallengeResultRepository dailyChallengeResultRepository;
    @Mock private CreditLedgerRepository creditLedgerRepository;
    @Mock private XpService xpService;
    @Mock private CreditService creditService;
    @Mock private SocketIOServer socketIOServer;
    @Mock private UserRepository userRepository;

    @InjectMocks
    private AchievementService achievementService;

    private User testUser;
    private Achievement wpmAchievement;

    @BeforeEach
    void setUp() {
        testUser = User.builder()
                .id(UUID.randomUUID())
                .username("achiever")
                .email("achiever@test.com")
                .build();

        wpmAchievement = Achievement.builder()
                .id(UUID.randomUUID())
                .code("WPM_100")
                .name("Century Typist")
                .criteriaType("WPM_REACHED")
                .criteriaValue(100)
                .xpReward(500)
                .build();
    }

    @Test
    @DisplayName("Unlock achievement when criteria condition is met")
    void testAchievementUnlock() {
        when(achievementRepository.findAll()).thenReturn(List.of(wpmAchievement));
        when(userAchievementRepository.findUnlockedWithAchievementByUserId(testUser.getId())).thenReturn(List.of());
        when(typingSessionRepository.findTopByUserIdOrderByWpmDesc(testUser.getId()))
                .thenReturn(Optional.of(TypingSession.builder().wpm(105).build()));

        com.corundumstudio.socketio.BroadcastOperations ops = mock(com.corundumstudio.socketio.BroadcastOperations.class);
        lenient().when(socketIOServer.getRoomOperations(anyString())).thenReturn(ops);
        lenient().when(socketIOServer.getBroadcastOperations()).thenReturn(ops);

        List<Achievement> unlocked = achievementService.checkAchievements(testUser);

        assertEquals(1, unlocked.size());
        assertEquals("WPM_100", unlocked.get(0).getCode());
        verify(userAchievementRepository).saveAndFlush(any());
        verify(xpService).awardXp(eq(testUser), eq(500), anyString());
    }

    @Test
    @DisplayName("Revoke achievement when criteria is no longer met post-invalidation")
    void testAchievementRevocation() {
        com.devtype.backend.entity.UserAchievement ua = com.devtype.backend.entity.UserAchievement.builder()
                .id(new com.devtype.backend.entity.UserAchievementId(testUser.getId(), wpmAchievement.getId()))
                .user(testUser)
                .achievement(wpmAchievement)
                .unlockedAt(java.time.Instant.now())
                .build();

        when(userAchievementRepository.findUnlockedWithAchievementByUserId(testUser.getId()))
                .thenReturn(List.of(ua));
        // User's best non-suspicious WPM is only 60 (less than 100 required)
        when(typingSessionRepository.findTopByUserIdOrderByWpmDesc(testUser.getId()))
                .thenReturn(Optional.of(TypingSession.builder().wpm(60).build()));

        List<String> revoked = achievementService.revokeUnqualifiedAchievements(testUser, null);

        assertEquals(1, revoked.size());
        assertEquals("WPM_100", revoked.get(0));
        verify(userAchievementRepository).delete(ua);
        verify(userAchievementRepository).flush();
    }
}

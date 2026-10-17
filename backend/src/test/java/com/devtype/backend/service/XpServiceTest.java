package com.devtype.backend.service;

import com.devtype.backend.entity.User;
import com.devtype.backend.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class XpServiceTest {

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private XpService xpService;

    private User testUser;

    @BeforeEach
    void setUp() {
        testUser = User.builder()
                .username("testuser")
                .email("test@example.com")
                .xp(0)
                .level(1)
                .credits(0)
                .build();
    }

    @Test
    @DisplayName("Level 1 requires 0 XP threshold")
    void testXpForLevelOne() {
        assertEquals(0, xpService.xpForLevel(1));
    }

    @Test
    @DisplayName("Level curve scales with formula 100 * (level-1) + 150 * (level-1) * (level-2)")
    void testLevelCurveThresholds() {
        // Level 2: 100
        assertEquals(100, xpService.xpForLevel(2));
        // Level 3: 500
        assertEquals(500, xpService.xpForLevel(3));
        // Level 5: 2200
        assertEquals(2200, xpService.xpForLevel(5));
    }

    @Test
    @DisplayName("Calculate level correctly for given XP")
    void testCalculateLevelFromXp() {
        assertEquals(1, xpService.calculateLevelFromXp(50));
        assertEquals(2, xpService.calculateLevelFromXp(100));
        assertEquals(2, xpService.calculateLevelFromXp(200));
        assertEquals(2, xpService.calculateLevelFromXp(499));
        assertEquals(3, xpService.calculateLevelFromXp(500));
    }

    @Test
    @DisplayName("Awarding XP updates user total XP and detects level up")
    void testAwardXpAndLevelUp() {
        XpService.LevelUpResult result = xpService.awardXp(testUser, 500, "Test Award");

        assertTrue(result.isLeveledUp());
        assertEquals(1, result.getOldLevel());
        assertEquals(3, result.getNewLevel());
        assertEquals(500, testUser.getXp());
        assertEquals(3, testUser.getLevel());
        verify(userRepository).save(any(User.class));
    }
}

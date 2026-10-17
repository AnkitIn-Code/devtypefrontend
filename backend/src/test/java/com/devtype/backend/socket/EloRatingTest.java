package com.devtype.backend.socket;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class EloRatingTest {

    private static final int K = 32;

    private int[] computeElo(int ratingA, int ratingB, boolean aWon) {
        double expectedA = 1.0 / (1.0 + Math.pow(10, (ratingB - ratingA) / 400.0));
        double expectedB = 1.0 / (1.0 + Math.pow(10, (ratingA - ratingB) / 400.0));

        double actualA = aWon ? 1.0 : 0.0;
        double actualB = aWon ? 0.0 : 1.0;

        int newA = (int) Math.round(ratingA + K * (actualA - expectedA));
        int newB = (int) Math.round(ratingB + K * (actualB - expectedB));

        return new int[]{newA, newB};
    }

    @Test
    @DisplayName("Equal rating match awards +16 to winner and -16 to loser")
    void testEqualRatingElo() {
        int[] result = computeElo(1200, 1200, true);
        assertEquals(1216, result[0]);
        assertEquals(1184, result[1]);
    }

    @Test
    @DisplayName("Underdog win awards higher rating boost")
    void testUnderdogWinElo() {
        int[] result = computeElo(1000, 1400, true);
        int deltaA = result[0] - 1000;
        assertTrue(deltaA > 25, "Underdog should gain > 25 ELO for defeating higher rated player");
    }
}

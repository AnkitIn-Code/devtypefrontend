package com.devtype.backend.repository;

import com.devtype.backend.entity.DailyChallengeResult;
import com.devtype.backend.entity.DailyChallengeResultId;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DailyChallengeResultRepository
        extends JpaRepository<DailyChallengeResult, DailyChallengeResultId> {

    Optional<DailyChallengeResult> findByIdUserIdAndIdDailyChallengeId(
            UUID userId, UUID dailyChallengeId);

    boolean existsByIdUserIdAndIdDailyChallengeId(UUID userId, UUID dailyChallengeId);

    /** Leaderboard for a specific daily challenge, sorted by WPM descending. */
    Page<DailyChallengeResult> findByIdDailyChallengeIdOrderByWpmDesc(
            UUID dailyChallengeId, Pageable pageable);

    /** All daily challenge results for a user (their history). */
    List<DailyChallengeResult> findByIdUserIdOrderByCompletedAtDesc(UUID userId);

    long countByIdDailyChallengeId(UUID dailyChallengeId);

    long countByIdUserId(UUID userId);

    /**
     * Results for a user within a date range (for monthly calendar).
     * Joins through DailyChallenge to get the challenge date.
     */
    @Query("SELECT r FROM DailyChallengeResult r JOIN r.dailyChallenge dc " +
           "WHERE r.user.id = :userId AND dc.date >= :start AND dc.date <= :end")
    List<DailyChallengeResult> findByUserIdAndDateRange(
            @Param("userId") UUID userId,
            @Param("start") LocalDate start,
            @Param("end") LocalDate end);
}


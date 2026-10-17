package com.devtype.backend.repository;

import com.devtype.backend.entity.TypingSession;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TypingSessionRepository extends JpaRepository<TypingSession, UUID> {

    Page<TypingSession> findByUserIdOrderByCreatedAtDesc(UUID userId, Pageable pageable);

    @Query("SELECT COUNT(s) FROM TypingSession s WHERE s.user.id = :userId AND (s.isSuspicious = false OR s.isSuspicious IS NULL)")
    long countByUserId(@Param("userId") UUID userId);

    /** User's personal best (highest WPM ever). */
    @Query("SELECT s FROM TypingSession s WHERE s.user.id = :userId AND (s.isSuspicious = false OR s.isSuspicious IS NULL) ORDER BY s.wpm DESC LIMIT 1")
    Optional<TypingSession> findTopByUserIdOrderByWpmDesc(@Param("userId") UUID userId);

    /** User's personal best for a specific snippet (used by Ghost mode). */
    @Query("SELECT s FROM TypingSession s WHERE s.user.id = :userId AND s.snippet.id = :snippetId AND (s.isSuspicious = false OR s.isSuspicious IS NULL) ORDER BY s.wpm DESC LIMIT 1")
    Optional<TypingSession> findTopByUserIdAndSnippetIdOrderByWpmDesc(@Param("userId") UUID userId, @Param("snippetId") UUID snippetId);

    /** Global WPM leaderboard — best single session per query. */
    @Query("SELECT s FROM TypingSession s WHERE (s.isSuspicious = false OR s.isSuspicious IS NULL) ORDER BY s.wpm DESC")
    Page<TypingSession> findAllByOrderByWpmDesc(Pageable pageable);

    /** User sessions within a date range — for streak / history charts. */
    @Query("SELECT s FROM TypingSession s WHERE s.user.id = :userId AND s.createdAt >= :from AND s.createdAt <= :to AND (s.isSuspicious = false OR s.isSuspicious IS NULL) ORDER BY s.createdAt ASC")
    List<TypingSession> findByUserIdAndCreatedAtBetweenOrderByCreatedAtAsc(
            @Param("userId") UUID userId, @Param("from") Instant from, @Param("to") Instant to);

    /** User's total practice time in ms. */
    @Query("SELECT SUM(s.durationMs) FROM TypingSession s WHERE s.user.id = :userId AND (s.isSuspicious = false OR s.isSuspicious IS NULL)")
    Long sumDurationMsByUserId(@Param("userId") UUID userId);

    /** User's average WPM. */
    @Query("SELECT AVG(s.wpm) FROM TypingSession s WHERE s.user.id = :userId AND (s.isSuspicious = false OR s.isSuspicious IS NULL)")
    Double findAverageWpmByUserId(@Param("userId") UUID userId);

    /** User's average accuracy. */
    @Query("SELECT AVG(s.accuracy) FROM TypingSession s WHERE s.user.id = :userId AND (s.isSuspicious = false OR s.isSuspicious IS NULL)")
    Double findAverageAccuracyByUserId(@Param("userId") UUID userId);

    /** Sessions where user achieved 100% accuracy (for PERFECTIONIST achievement). */
    @Query("SELECT s FROM TypingSession s WHERE s.user.id = :userId AND s.accuracy = 100 AND (s.isSuspicious = false OR s.isSuspicious IS NULL)")
    List<TypingSession> findPerfectSessionsByUserId(@Param("userId") UUID userId);

    /** Top WPM per language — for JAVA_MASTER / POLYGLOT achievements. */
    @Query("""
           SELECT s FROM TypingSession s
           WHERE s.user.id = :userId
             AND s.snippet.language = :lang
             AND (s.isSuspicious = false OR s.isSuspicious IS NULL)
           ORDER BY s.wpm DESC
           """)
    Page<TypingSession> findTopByUserIdAndLanguage(
            @Param("userId") UUID userId,
            @Param("lang") String language,
            Pageable pageable);

    /** Count of distinct languages a user has scored in (for POLYGLOT). */
    @Query("""
           SELECT COUNT(DISTINCT s.snippet.language)
           FROM TypingSession s
           WHERE s.user.id = :userId AND s.snippet IS NOT NULL
             AND (s.isSuspicious = false OR s.isSuspicious IS NULL)
           """)
    long countDistinctLanguagesByUserId(@Param("userId") UUID userId);

    /**
     * FEAT-S03 & FEAT-M07: User's top WPM with optional time-period and language filters.
     */
    @Query("""
           SELECT MAX(s.wpm) FROM TypingSession s
           WHERE s.user.id = :userId
             AND (s.isSuspicious = false OR s.isSuspicious IS NULL)
             AND (cast(:since as timestamp) IS NULL OR s.createdAt >= :since)
             AND (:language IS NULL OR :language = '' OR LOWER(s.snippet.language) = LOWER(:language))
           """)
    Integer findMaxWpmByUserIdAndFilters(
            @Param("userId") UUID userId,
            @Param("since") Instant since,
            @Param("language") String language);

    /**
     * FEAT-S03 & FEAT-M07: User's sum of XP earned with optional time-period and language filters.
     */
    @Query("""
           SELECT COALESCE(SUM(s.xpEarned), 0) FROM TypingSession s
           WHERE s.user.id = :userId
             AND (s.isSuspicious = false OR s.isSuspicious IS NULL)
             AND (cast(:since as timestamp) IS NULL OR s.createdAt >= :since)
             AND (:language IS NULL OR :language = '' OR LOWER(s.snippet.language) = LOWER(:language))
           """)
    Integer sumXpByUserIdAndFilters(
            @Param("userId") UUID userId,
            @Param("since") Instant since,
            @Param("language") String language);

    /**
     * FEAT-S04: Paginated list of suspicious typing sessions for admin review.
     */
    @Query("""
           SELECT s FROM TypingSession s
           WHERE s.isSuspicious = true
             AND (cast(:from as timestamp) IS NULL OR s.createdAt >= :from)
             AND (cast(:to as timestamp) IS NULL OR s.createdAt <= :to)
           ORDER BY s.createdAt DESC
           """)
    Page<TypingSession> findSuspiciousSessions(
            @Param("from") Instant from,
            @Param("to") Instant to,
            Pageable pageable);
}

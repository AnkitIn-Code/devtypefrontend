package com.devtype.backend.repository;

import com.devtype.backend.entity.Snippet;
import com.devtype.backend.entity.User;
import com.devtype.backend.entity.enums.Difficulty;
import com.devtype.backend.entity.enums.SourceType;
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
public interface SnippetRepository extends JpaRepository<Snippet, UUID> {

    Page<Snippet> findByIsPublicTrue(Pageable pageable);

    Page<Snippet> findByLanguageAndIsPublicTrue(String language, Pageable pageable);

    Page<Snippet> findByDifficultyAndIsPublicTrue(Difficulty difficulty, Pageable pageable);

    Page<Snippet> findByLanguageAndDifficultyAndIsPublicTrue(
            String language, Difficulty difficulty, Pageable pageable);

    List<Snippet> findByAuthor(User author);

    List<Snippet> findByAuthorAndIsPublicTrue(User author);

    Page<Snippet> findBySourceType(SourceType sourceType, Pageable pageable);

    Page<Snippet> findByAuthor(User author, Pageable pageable);

    long countByAuthorId(UUID authorId);
    long countByIsPublicTrue();
    long countByIsPublicTrueAndDifficulty(Difficulty difficulty);

    /** Filter public templates by language, difficulty, tag, or search query. */
    @Query("""
           SELECT DISTINCT s FROM Snippet s LEFT JOIN s.tags t
           WHERE s.isPublic = true
             AND (cast(:language as string) IS NULL OR s.language = cast(:language as string))
             AND (:difficulty IS NULL OR s.difficulty = :difficulty)
             AND (cast(:tag as string) IS NULL OR t = cast(:tag as string))
             AND (cast(:q as string) IS NULL OR LOWER(s.title) LIKE LOWER(CONCAT('%', cast(:q as string), '%')) OR LOWER(s.code) LIKE LOWER(CONCAT('%', cast(:q as string), '%')))
           """)
    Page<Snippet> findPublicTemplates(
            @Param("language") String language,
            @Param("difficulty") Difficulty difficulty,
            @Param("tag") String tag,
            @Param("q") String query,
            Pageable pageable);

    /** Find pre-saved system templates (author IS NULL OR sourceType = 'PRESET') for unauthenticated guests */
    @Query("""
           SELECT DISTINCT s FROM Snippet s LEFT JOIN s.tags t
           WHERE s.isPublic = true
             AND (s.author IS NULL OR s.sourceType = 'PRESET')
           """)
    Page<Snippet> findSystemTemplates(Pageable pageable);

    /** Find templates visible to a specific user (All public templates + User's own templates) */
    @Query("""
           SELECT DISTINCT s FROM Snippet s LEFT JOIN s.tags t
           WHERE (s.isPublic = true OR s.author = :user)
             AND (cast(:language as string) IS NULL OR s.language = cast(:language as string))
             AND (:difficulty IS NULL OR s.difficulty = :difficulty)
             AND (cast(:tag as string) IS NULL OR t = cast(:tag as string))
             AND (cast(:q as string) IS NULL OR LOWER(s.title) LIKE LOWER(CONCAT('%', cast(:q as string), '%')) OR LOWER(s.code) LIKE LOWER(CONCAT('%', cast(:q as string), '%')))
           """)
    Page<Snippet> findTemplatesForUser(
            @Param("user") User user,
            @Param("language") String language,
            @Param("difficulty") Difficulty difficulty,
            @Param("tag") String tag,
            @Param("q") String query,
            Pageable pageable);

    /** Random public snippet for a given language and difficulty — for practice mode. */
    @Query(value = """
           SELECT * FROM snippets
           WHERE is_public = true
             AND language = :lang
             AND difficulty = :diff
           ORDER BY RANDOM()
           LIMIT 1
           """, nativeQuery = true)
    Snippet findRandomByLanguageAndDifficulty(
            @Param("lang") String language,
            @Param("diff") String difficulty);

    /**
     * Pick one random public snippet that is NOT in the exclusion list.
     * Used by DailyChallengeService to avoid repeating recent snippets.
     * Falls back gracefully — if all snippets are excluded the result may be empty.
     */
    @Query(value = """
           SELECT * FROM snippets
           WHERE is_public = true
             AND (:#{#excludedIds.size()} = 0 OR id NOT IN :excludedIds)
           ORDER BY RANDOM()
           LIMIT 1
           """, nativeQuery = true)
    Optional<Snippet> findRandomPublicExcluding(
            @Param("excludedIds") List<UUID> excludedIds);

    /**
     * Find the snippet IDs used as daily challenges in the last N days.
     * Used to build the exclusion list for fresh randomization.
     */
    @Query("SELECT dc.snippet.id FROM DailyChallenge dc WHERE dc.date >= :since ORDER BY dc.date DESC")
    List<UUID> findRecentDailyChallengeSnippetIds(@Param("since") LocalDate since);
}

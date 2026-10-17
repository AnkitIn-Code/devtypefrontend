package com.devtype.backend.repository;

import com.devtype.backend.entity.TournamentMatch;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface TournamentMatchRepository extends JpaRepository<TournamentMatch, UUID> {

    List<TournamentMatch> findByTournamentIdOrderByRoundAsc(UUID tournamentId);

    List<TournamentMatch> findByTournamentIdAndRound(UUID tournamentId, int round);

    /**
     * FEAT-M08: ordered by createdAt so next-round pairing picks winners in
     * the same order the matches were originally generated (deterministic bracket).
     */
    List<TournamentMatch> findByTournamentIdAndRoundOrderByCreatedAtAsc(UUID tournamentId, int round);

    /** All matches a user participated in within a tournament. */
    @Query("""
           SELECT m FROM TournamentMatch m
           WHERE m.tournament.id = :tid
             AND (m.participantA.id = :uid OR m.participantB.id = :uid)
           ORDER BY m.round ASC
           """)
    List<TournamentMatch> findByTournamentAndUser(
            @Param("tid") UUID tournamentId,
            @Param("uid") UUID userId);

    /** Tournaments a user has won (for TOURNAMENT_CHAMPION achievement). */
    @Query("SELECT m FROM TournamentMatch m WHERE m.winner.id = :uid")
    List<TournamentMatch> findWonMatchesByUserId(@Param("uid") UUID userId);
}

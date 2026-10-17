package com.devtype.backend.repository;

import com.devtype.backend.entity.TournamentParticipant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface TournamentParticipantRepository extends JpaRepository<TournamentParticipant, UUID> {

    /** All registrants for a tournament, ordered by registration time. */
    List<TournamentParticipant> findByTournamentIdOrderByRegisteredAtAsc(UUID tournamentId);

    /** Used to prevent double-registration. */
    boolean existsByTournamentIdAndUserId(UUID tournamentId, UUID userId);

    /** Quick head-count of registered players. */
    long countByTournamentId(UUID tournamentId);
}

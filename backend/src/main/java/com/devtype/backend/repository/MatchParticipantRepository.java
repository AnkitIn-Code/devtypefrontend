package com.devtype.backend.repository;

import com.devtype.backend.entity.MatchParticipant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface MatchParticipantRepository extends JpaRepository<MatchParticipant, UUID> {

    List<MatchParticipant> findByRoomId(UUID roomId);

    Optional<MatchParticipant> findByRoomIdAndUserId(UUID roomId, UUID userId);

    boolean existsByRoomIdAndUserId(UUID roomId, UUID userId);

    long countByRoomId(UUID roomId);

    /** Ranked final results for a room, sorted by placement. */
    List<MatchParticipant> findByRoomIdOrderByPlacementAsc(UUID roomId);

    /** All rooms a user has participated in (for match history). */
    @Query("""
           SELECT mp FROM MatchParticipant mp
           LEFT JOIN FETCH mp.room r
           LEFT JOIN FETCH r.snippet s
           WHERE mp.user.id = :userId
           ORDER BY COALESCE(mp.finishedAt, r.createdAt) DESC
           """)
    List<MatchParticipant> findRecentByUserId(@Param("userId") UUID userId);

    long countByUserIdAndPlacement(UUID userId, Integer placement);
}

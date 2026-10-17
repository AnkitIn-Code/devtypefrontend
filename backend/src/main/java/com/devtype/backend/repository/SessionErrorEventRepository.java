package com.devtype.backend.repository;

import com.devtype.backend.entity.SessionErrorEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface SessionErrorEventRepository extends JpaRepository<SessionErrorEvent, UUID> {

    List<SessionErrorEvent> findBySessionId(UUID sessionId);

    /** Error frequency per expected character — for the heatmap. */
    @Query("""
           SELECT e.characterExpected, COUNT(e)
           FROM SessionErrorEvent e
           WHERE e.session.user.id = :userId
           GROUP BY e.characterExpected
           ORDER BY COUNT(e) DESC
           """)
    List<Object[]> findErrorFrequencyByUserId(@Param("userId") UUID userId);

    /** Error positions within a specific session — for position-based analytics. */
    @Query("""
           SELECT e.positionIndex, COUNT(e)
           FROM SessionErrorEvent e
           WHERE e.session.id = :sessionId
           GROUP BY e.positionIndex
           ORDER BY e.positionIndex ASC
           """)
    List<Object[]> findErrorPositionFrequencyBySessionId(@Param("sessionId") UUID sessionId);

    long countBySessionId(UUID sessionId);
}

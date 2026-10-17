package com.devtype.backend.repository;

import com.devtype.backend.entity.Tournament;
import com.devtype.backend.entity.enums.TournamentStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Repository
public interface TournamentRepository extends JpaRepository<Tournament, UUID> {

    Page<Tournament> findByStatus(TournamentStatus status, Pageable pageable);

    List<Tournament> findByGuildIdOrderByStartsAtDesc(UUID guildId);

    /** Open (no guild) tournaments. */
    Page<Tournament> findByGuildIsNullAndStatusOrderByStartsAtAsc(
            TournamentStatus status, Pageable pageable);

    /** Tournaments starting within the next N hours — for lobby notifications. */
    @Query("SELECT t FROM Tournament t WHERE t.startsAt BETWEEN :now AND :until AND t.status = 'UPCOMING'")
    List<Tournament> findUpcomingSoon(@Param("now") Instant now, @Param("until") Instant until);
}

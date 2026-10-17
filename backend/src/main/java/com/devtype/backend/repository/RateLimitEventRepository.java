package com.devtype.backend.repository;

import com.devtype.backend.entity.RateLimitEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.UUID;

@Repository
public interface RateLimitEventRepository extends JpaRepository<RateLimitEvent, UUID> {

    @Query("SELECT COUNT(e) FROM RateLimitEvent e WHERE e.user.id = :userId AND e.action = :action AND e.createdAt >= :cutoff")
    long countRecentEvents(
            @Param("userId") UUID userId,
            @Param("action") String action,
            @Param("cutoff") Instant cutoff);

    @Modifying
    @Query("DELETE FROM RateLimitEvent e WHERE e.createdAt < :cutoff")
    int deleteEventsOlderThan(@Param("cutoff") Instant cutoff);
}

package com.devtype.backend.repository;

import com.devtype.backend.entity.SeasonHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface SeasonHistoryRepository extends JpaRepository<SeasonHistory, UUID> {
    List<SeasonHistory> findByUserIdOrderBySnapshottedAtDesc(UUID userId);
    List<SeasonHistory> findBySeasonIdOrderByFinalEloDesc(UUID seasonId);
}

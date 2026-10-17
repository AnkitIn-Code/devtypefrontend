package com.devtype.backend.repository;

import com.devtype.backend.entity.DailyChallenge;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DailyChallengeRepository extends JpaRepository<DailyChallenge, UUID> {

    Optional<DailyChallenge> findByDate(LocalDate date);

    boolean existsByDate(LocalDate date);

    /** Convenience — today's challenge. */
    default Optional<DailyChallenge> findToday() {
        return findByDate(LocalDate.now());
    }
}

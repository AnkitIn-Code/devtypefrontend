package com.devtype.backend.repository;

import com.devtype.backend.entity.DuelRating;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface DuelRatingRepository extends JpaRepository<DuelRating, UUID> {

    Optional<DuelRating> findByUserId(UUID userId);

    /** Global Elo leaderboard. */
    Page<DuelRating> findAllByOrderByEloRatingDesc(Pageable pageable);

    /** Country-scoped Elo leaderboard via user join. */
    Page<DuelRating> findByUser_CountryOrderByEloRatingDesc(String country, Pageable pageable);

}

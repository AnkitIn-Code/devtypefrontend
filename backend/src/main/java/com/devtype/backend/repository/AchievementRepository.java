package com.devtype.backend.repository;

import com.devtype.backend.entity.Achievement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AchievementRepository extends JpaRepository<Achievement, UUID> {

    Optional<Achievement> findByCode(String code);

    boolean existsByCode(String code);

    List<Achievement> findByCriteriaType(String criteriaType);
}

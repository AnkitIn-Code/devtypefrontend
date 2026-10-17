package com.devtype.backend.repository;

import com.devtype.backend.entity.UserAchievement;
import com.devtype.backend.entity.UserAchievementId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface UserAchievementRepository extends JpaRepository<UserAchievement, UserAchievementId> {

    List<UserAchievement> findByIdUserId(UUID userId);

    @Query("SELECT ua FROM UserAchievement ua JOIN FETCH ua.achievement WHERE ua.id.userId = :userId ORDER BY ua.unlockedAt DESC")
    List<UserAchievement> findUnlockedWithAchievementByUserId(@Param("userId") UUID userId);

    boolean existsByIdUserIdAndIdAchievementId(UUID userId, UUID achievementId);

    long countByIdUserId(UUID userId);

    /** Users who unlocked a specific achievement — for achievement leaderboard. */
    @Query("SELECT ua FROM UserAchievement ua WHERE ua.achievement.code = :code ORDER BY ua.unlockedAt ASC")
    List<UserAchievement> findByAchievementCode(@Param("code") String achievementCode);
}

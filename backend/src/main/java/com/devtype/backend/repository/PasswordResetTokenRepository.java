package com.devtype.backend.repository;

import com.devtype.backend.entity.PasswordResetToken;
import com.devtype.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Repository
public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, UUID> {

    List<PasswordResetToken> findByUserAndExpiresAtAfter(User user, Instant now);

    /**
     * Returns all non-expired reset tokens in a single indexed DB query.
     * Replaces the previous findAll() + in-memory filter (B-06 fix).
     */
    @Query("SELECT t FROM PasswordResetToken t WHERE t.expiresAt > :now")
    List<PasswordResetToken> findActiveTokens(@Param("now") Instant now);

    @Modifying
    @Query("DELETE FROM PasswordResetToken t WHERE t.user = :user")
    int deleteAllByUser(@Param("user") User user);

    @Modifying
    @Query("DELETE FROM PasswordResetToken t WHERE t.expiresAt < :now")
    int deleteExpired(@Param("now") Instant now);
}

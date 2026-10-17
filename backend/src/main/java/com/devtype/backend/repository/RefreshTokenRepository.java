package com.devtype.backend.repository;

import com.devtype.backend.entity.RefreshToken;
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
public interface RefreshTokenRepository extends JpaRepository<RefreshToken, UUID> {

    /** All active (non-revoked, non-expired) tokens for a user — for token matching. */
    List<RefreshToken> findByUserAndIsRevokedFalse(User user);

    /**
     * SEC-10: Atomic revocation query.
     * Returns 1 if this call successfully revoked the token, 0 if it was already
     * revoked by a concurrent request or expired.
     */
    @Modifying
    @Query("UPDATE RefreshToken r SET r.isRevoked = true WHERE r.id = :id AND r.isRevoked = false AND r.expiresAt > :now")
    int revokeByIdAtomic(@Param("id") UUID id, @Param("now") Instant now);

    /** Revoke all tokens for a user — used on logout-all-devices and password resets. */
    @Modifying
    @Query("UPDATE RefreshToken r SET r.isRevoked = true WHERE r.user = :user AND r.isRevoked = false")
    int revokeAllByUser(@Param("user") User user);

    /** Clean up expired tokens — for a scheduled maintenance job. */
    @Modifying
    @Query("DELETE FROM RefreshToken r WHERE r.expiresAt < :now OR r.isRevoked = true")
    int deleteExpiredAndRevoked(@Param("now") Instant now);
}

package com.devtype.backend.repository;

import com.devtype.backend.entity.Friendship;
import com.devtype.backend.entity.FriendshipId;
import com.devtype.backend.entity.enums.FriendshipStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface FriendshipRepository extends JpaRepository<Friendship, FriendshipId> {

    List<Friendship> findByIdUserId(UUID userId);

    List<Friendship> findByIdFriendId(UUID friendId);

    Optional<Friendship> findByIdUserIdAndIdFriendId(UUID userId, UUID friendId);

    List<Friendship> findByIdUserIdAndStatus(UUID userId, FriendshipStatus status);

    /** Bi-directional accepted friends of a user. */
    @Query("""
           SELECT f FROM Friendship f
           WHERE (f.id.userId = :uid OR f.id.friendId = :uid)
             AND f.status = 'ACCEPTED'
           """)
    List<Friendship> findAcceptedFriends(@Param("uid") UUID userId);

    /** Pending requests received by a user. */
    @Query("""
           SELECT f FROM Friendship f
           WHERE f.id.friendId = :uid AND f.status = 'PENDING'
           """)
    List<Friendship> findPendingRequestsFor(@Param("uid") UUID userId);

    /** Pending requests sent by a user. */
    @Query("""
           SELECT f FROM Friendship f
           WHERE f.id.userId = :uid AND f.status = 'PENDING'
           """)
    List<Friendship> findSentRequestsBy(@Param("uid") UUID userId);

    @Query("""
           SELECT CASE WHEN f.id.userId = :uid THEN f.id.friendId ELSE f.id.userId END
           FROM Friendship f
           WHERE (f.id.userId = :uid OR f.id.friendId = :uid) AND f.status = 'ACCEPTED'
           """)
    List<UUID> findFriendUserIds(@Param("uid") UUID userId);
}

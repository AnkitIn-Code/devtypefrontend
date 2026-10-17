package com.devtype.backend.entity;

import com.devtype.backend.entity.enums.FriendshipStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/**
 * Directed friendship relationship between two users.
 *
 * <p>The relationship is directional: user A sends a request to user B.
 * The check constraint {@code ck_friendship_no_self} prevents self-friendship.
 * To query all of a user's friends, check both directions (userId OR friendId).
 *
 * <p>Uses a composite primary key ({@link FriendshipId}).
 */
@Entity
@Table(name = "friendships")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Friendship {

    @EmbeddedId
    private FriendshipId id;

    /** The user who sent the friend request. */
    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("userId")
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /** The user who received the friend request. */
    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("friendId")
    @JoinColumn(name = "friend_id", nullable = false)
    private User friend;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private FriendshipStatus status = FriendshipStatus.PENDING;

    @Builder.Default
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
}

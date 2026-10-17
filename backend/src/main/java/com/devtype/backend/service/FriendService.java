package com.devtype.backend.service;

import com.corundumstudio.socketio.SocketIOServer;
import com.devtype.backend.entity.Friendship;
import com.devtype.backend.entity.FriendshipId;
import com.devtype.backend.entity.User;
import com.devtype.backend.entity.enums.FriendshipStatus;
import com.devtype.backend.repository.FriendshipRepository;
import com.devtype.backend.repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class FriendService {

    private final FriendshipRepository friendshipRepository;
    private final UserRepository userRepository;
    private final SocketIOServer socketIOServer;
    private final com.devtype.backend.security.JwtUtil jwtUtil;

    @Transactional
    public Map<String, Object> sendFriendRequest(User me, String targetUsername) {
        if (me.getUsername().equalsIgnoreCase(targetUsername)) {
            throw new IllegalArgumentException("Cannot send friend request to yourself");
        }

        User target = userRepository.findByUsername(targetUsername)
                .orElseThrow(() -> new EntityNotFoundException("User not found: " + targetUsername));

        // BUG-H05: Check reverse friend request (target -> me) for mutual auto-acceptance
        Optional<Friendship> reverse = friendshipRepository.findByIdUserIdAndIdFriendId(target.getId(), me.getId());
        if (reverse.isPresent()) {
            Friendship reverseFriendship = reverse.get();
            if (reverseFriendship.getStatus() == FriendshipStatus.PENDING) {
                reverseFriendship.setStatus(FriendshipStatus.ACCEPTED);
                friendshipRepository.save(reverseFriendship);
                log.info("Mutual friend request auto-accepted between {} and {}", me.getUsername(), target.getUsername());
                return Map.of("success", true, "message", "Accepted friend request from " + target.getUsername());
            } else if (reverseFriendship.getStatus() == FriendshipStatus.ACCEPTED) {
                return Map.of("success", true, "message", "You are already friends with " + target.getUsername());
            }
        }

        Optional<Friendship> existing = friendshipRepository.findByIdUserIdAndIdFriendId(me.getId(), target.getId());
        if (existing.isPresent()) {
            Friendship existingFriendship = existing.get();
            if (existingFriendship.getStatus() == FriendshipStatus.ACCEPTED) {
                return Map.of("success", true, "message", "You are already friends with " + target.getUsername());
            }
            return Map.of("success", true, "message", "Friend request already sent");
        }

        Friendship friendship = Friendship.builder()
                .id(new FriendshipId(me.getId(), target.getId()))
                .user(me)
                .friend(target)
                .status(FriendshipStatus.PENDING)
                .build();

        friendshipRepository.save(friendship);
        log.info("User {} sent friend request to {}", me.getUsername(), target.getUsername());
        return Map.of("success", true, "message", "Friend request sent to " + target.getUsername());
    }


    @Transactional
    public Map<String, Object> acceptFriendRequest(User me, UUID requesterId) {
        Friendship friendship = friendshipRepository.findByIdUserIdAndIdFriendId(requesterId, me.getId())
                .orElseThrow(() -> new EntityNotFoundException("Friend request not found"));

        friendship.setStatus(FriendshipStatus.ACCEPTED);
        friendshipRepository.save(friendship);

        log.info("User {} accepted friend request from {}", me.getUsername(), friendship.getUser().getUsername());
        return Map.of("success", true, "message", "Accepted friend request");
    }

    @Transactional
    public Map<String, Object> removeFriend(User me, UUID friendId) {
        friendshipRepository.findByIdUserIdAndIdFriendId(me.getId(), friendId)
                .ifPresent(friendshipRepository::delete);
        friendshipRepository.findByIdUserIdAndIdFriendId(friendId, me.getId())
                .ifPresent(friendshipRepository::delete);

        return Map.of("success", true, "message", "Friend removed");
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getFriends(User me) {
        List<Friendship> accepted = friendshipRepository.findAcceptedFriends(me.getId());
        List<Friendship> pending = friendshipRepository.findPendingRequestsFor(me.getId());

        List<Map<String, Object>> result = new ArrayList<>();

        for (Friendship f : accepted) {
            User friendUser = f.getUser().getId().equals(me.getId()) ? f.getFriend() : f.getUser();
            boolean isOnline = isUserOnline(friendUser.getEmail());

            result.add(Map.of(
                "id", friendUser.getId().toString(),
                "friendshipId", f.getId().getUserId().toString(),
                "username", friendUser.getUsername(),
                "avatarUrl", friendUser.getAvatarUrl() != null ? friendUser.getAvatarUrl() : "",
                "level", friendUser.getLevel() != null ? friendUser.getLevel() : 1,
                "status", "ACCEPTED",
                "isOnline", isOnline
            ));
        }

        for (Friendship f : pending) {
            User requester = f.getUser();
            result.add(Map.of(
                "id", requester.getId().toString(),
                "friendshipId", requester.getId().toString(),
                "username", requester.getUsername(),
                "avatarUrl", requester.getAvatarUrl() != null ? requester.getAvatarUrl() : "",
                "level", requester.getLevel() != null ? requester.getLevel() : 1,
                "status", "PENDING",
                "isOnline", false
            ));
        }

        return result;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getFriendsByUsername(String identifier) {
        User target = null;
        try {
            UUID uuid = UUID.fromString(identifier);
            target = userRepository.findById(uuid).orElse(null);
        } catch (IllegalArgumentException ignored) {}

        if (target == null) {
            target = userRepository.findByUsername(identifier)
                    .orElseThrow(() -> new EntityNotFoundException("User not found: " + identifier));
        }

        List<Friendship> accepted = friendshipRepository.findAcceptedFriends(target.getId());
        List<Map<String, Object>> result = new ArrayList<>();

        for (Friendship f : accepted) {
            User friendUser = f.getUser().getId().equals(target.getId()) ? f.getFriend() : f.getUser();
            boolean isOnline = isUserOnline(friendUser.getEmail());

            result.add(Map.of(
                "id", friendUser.getId().toString(),
                "friendshipId", f.getId().getUserId().toString(),
                "username", friendUser.getUsername(),
                "avatarUrl", friendUser.getAvatarUrl() != null ? friendUser.getAvatarUrl() : "",
                "level", friendUser.getLevel() != null ? friendUser.getLevel() : 1,
                "status", "ACCEPTED",
                "isOnline", isOnline
            ));
        }
        return result;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getPendingRequests(User me) {
        List<Friendship> pending = friendshipRepository.findPendingRequestsFor(me.getId());
        List<Map<String, Object>> result = new ArrayList<>();
        for (Friendship f : pending) {
            User requester = f.getUser();
            result.add(Map.of(
                "id", requester.getId().toString(),
                "friendshipId", requester.getId().toString(),
                "username", requester.getUsername(),
                "avatarUrl", requester.getAvatarUrl() != null ? requester.getAvatarUrl() : "",
                "level", requester.getLevel() != null ? requester.getLevel() : 1,
                "status", "PENDING"
            ));
        }
        return result;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getSentRequests(User me) {
        List<Friendship> sent = friendshipRepository.findSentRequestsBy(me.getId());
        List<Map<String, Object>> result = new ArrayList<>();
        for (Friendship f : sent) {
            User target = f.getFriend();
            result.add(Map.of(
                "id", target.getId().toString(),
                "friendshipId", target.getId().toString(),
                "username", target.getUsername(),
                "avatarUrl", target.getAvatarUrl() != null ? target.getAvatarUrl() : "",
                "level", target.getLevel() != null ? target.getLevel() : 1,
                "status", "PENDING_SENT"
            ));
        }
        return result;
    }

    @Transactional
    public Map<String, Object> declineFriendRequest(User me, UUID requesterId) {
        friendshipRepository.findByIdUserIdAndIdFriendId(requesterId, me.getId())
                .ifPresent(friendshipRepository::delete);
        return Map.of("success", true, "message", "Friend request declined");
    }

    private boolean isUserOnline(String email) {
        if (email == null || email.isBlank()) return false;
        try {
            return socketIOServer.getAllClients().stream().anyMatch(client -> {
                String token = client.getHandshakeData().getSingleUrlParam("token");
                if (token == null || token.isBlank()) return false;
                try {
                    if (!jwtUtil.isTokenStructurallyValid(token)) return false;
                    String usernameOrEmail = jwtUtil.extractUsername(token);
                    return email.equalsIgnoreCase(usernameOrEmail);
                } catch (Exception ignored) {
                    return false;
                }
            });
        } catch (Exception e) {
            return false;
        }
    }
}



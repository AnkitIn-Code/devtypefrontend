package com.devtype.backend.controller;

import com.devtype.backend.entity.User;
import com.devtype.backend.repository.UserRepository;
import com.devtype.backend.service.FriendService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Tag(name = "Friends", description = "Friends list, friend requests, and online status")
@RestController
@RequestMapping("/api/friends")
@RequiredArgsConstructor
public class FriendController {

    private final FriendService friendService;
    private final UserRepository userRepository;

    @Operation(summary = "Get list of friends with online status and pending requests", security = @SecurityRequirement(name = "bearerAuth"))
    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getFriends(
            @AuthenticationPrincipal UserDetails principal) {
        User me = userRepository.findByEmail(principal.getUsername())
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + principal.getUsername()));

        return ResponseEntity.ok(friendService.getFriends(me));
    }

    @Operation(summary = "Get public friends list for a user by username")
    @GetMapping("/user/{username}")
    public ResponseEntity<List<Map<String, Object>>> getFriendsByUsername(
            @PathVariable String username) {
        return ResponseEntity.ok(friendService.getFriendsByUsername(username));
    }

    @Operation(summary = "Send a friend request by username", security = @SecurityRequirement(name = "bearerAuth"))
    @PostMapping("/request/{username}")
    public ResponseEntity<Map<String, Object>> sendRequest(
            @AuthenticationPrincipal UserDetails principal,
            @PathVariable String username) {
        User me = userRepository.findByEmail(principal.getUsername())
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + principal.getUsername()));

        return ResponseEntity.ok(friendService.sendFriendRequest(me, username));
    }

    @Operation(summary = "Accept a friend request", security = @SecurityRequirement(name = "bearerAuth"))
    @PostMapping("/{id}/accept")
    public ResponseEntity<Map<String, Object>> acceptRequest(
            @AuthenticationPrincipal UserDetails principal,
            @PathVariable UUID id) {
        User me = userRepository.findByEmail(principal.getUsername())
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + principal.getUsername()));

        return ResponseEntity.ok(friendService.acceptFriendRequest(me, id));
    }

    @Operation(summary = "Remove a friend or cancel/decline a request", security = @SecurityRequirement(name = "bearerAuth"))
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> removeFriend(
            @AuthenticationPrincipal UserDetails principal,
            @PathVariable UUID id) {
        User me = userRepository.findByEmail(principal.getUsername())
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + principal.getUsername()));

        return ResponseEntity.ok(friendService.removeFriend(me, id));
    }

    @Operation(summary = "Get incoming pending friend requests", security = @SecurityRequirement(name = "bearerAuth"))
    @GetMapping("/requests/pending")
    public ResponseEntity<List<Map<String, Object>>> getPendingRequests(
            @AuthenticationPrincipal UserDetails principal) {
        User me = userRepository.findByEmail(principal.getUsername())
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + principal.getUsername()));
        return ResponseEntity.ok(friendService.getPendingRequests(me));
    }

    @Operation(summary = "Get outgoing pending friend requests", security = @SecurityRequirement(name = "bearerAuth"))
    @GetMapping("/requests/sent")
    public ResponseEntity<List<Map<String, Object>>> getSentRequests(
            @AuthenticationPrincipal UserDetails principal) {
        User me = userRepository.findByEmail(principal.getUsername())
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + principal.getUsername()));
        return ResponseEntity.ok(friendService.getSentRequests(me));
    }

    @Operation(summary = "Decline a friend request", security = @SecurityRequirement(name = "bearerAuth"))
    @PostMapping("/{id}/decline")
    public ResponseEntity<Map<String, Object>> declineRequest(
            @AuthenticationPrincipal UserDetails principal,
            @PathVariable UUID id) {
        User me = userRepository.findByEmail(principal.getUsername())
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + principal.getUsername()));
        return ResponseEntity.ok(friendService.declineFriendRequest(me, id));
    }
}

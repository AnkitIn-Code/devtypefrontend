package com.devtype.backend.controller;

import com.devtype.backend.entity.User;
import com.devtype.backend.repository.UserRepository;
import com.devtype.backend.service.LeaderboardService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@Tag(name = "Leaderboard", description = "Global, regional, and friends leaderboards")
@RestController
@RequestMapping("/api/leaderboard")
@RequiredArgsConstructor
public class LeaderboardController {

    private final LeaderboardService leaderboardService;
    private final UserRepository userRepository;

    @Operation(summary = "Get leaderboard by scope, metric, period, and language", security = @SecurityRequirement(name = "bearerAuth"))
    @GetMapping
    public ResponseEntity<Map<String, Object>> getLeaderboard(
            @AuthenticationPrincipal UserDetails principal,
            @RequestParam(defaultValue = "global") String scope,
            @RequestParam(defaultValue = "wpm") String metric,
            @RequestParam(defaultValue = "all") String period,
            @RequestParam(required = false) String language,
            @RequestParam(defaultValue = "50") int limit) {

        User currentUser = null;
        if (principal != null) {
            currentUser = userRepository.findByEmail(principal.getUsername()).orElse(null);
        }

        return ResponseEntity.ok(leaderboardService.getLeaderboard(currentUser, scope, metric, period, language, limit));
    }
}


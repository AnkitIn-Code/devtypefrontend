package com.devtype.backend.controller;

import com.devtype.backend.entity.User;
import com.devtype.backend.repository.UserRepository;
import com.devtype.backend.service.AchievementService;
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

@Tag(name = "Achievements", description = "Achievements and badges endpoints")
@RestController
@RequestMapping("/api/achievements")
@RequiredArgsConstructor
public class AchievementController {

    private final AchievementService achievementService;
    private final UserRepository userRepository;

    @Operation(summary = "Get user achievements with unlock state and progress", security = @SecurityRequirement(name = "bearerAuth"))
    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getAchievements(
            @AuthenticationPrincipal UserDetails principal) {
        User user = userRepository.findByEmail(principal.getUsername())
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + principal.getUsername()));

        return ResponseEntity.ok(achievementService.getUserAchievementsWithProgress(user));
    }

    @Operation(summary = "Get recent unlocked achievements for user widget", security = @SecurityRequirement(name = "bearerAuth"))
    @GetMapping("/recent")
    public ResponseEntity<List<Map<String, Object>>> getRecentAchievements(
            @AuthenticationPrincipal UserDetails principal,
            @RequestParam(required = false) String username,
            @RequestParam(defaultValue = "5") int limit) {
        User user = null;
        if (username != null && !username.isBlank()) {
            user = userRepository.findByUsername(username).orElse(null);
        }
        if (user == null && principal != null) {
            user = userRepository.findByEmail(principal.getUsername()).orElse(null);
        }
        if (user == null) {
            return ResponseEntity.ok(List.of());
        }

        return ResponseEntity.ok(achievementService.getRecentUnlockedAchievements(user, limit));
    }
}

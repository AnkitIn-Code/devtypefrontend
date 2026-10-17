package com.devtype.backend.controller;

import com.devtype.backend.entity.Guild;
import com.devtype.backend.entity.User;
import com.devtype.backend.repository.UserRepository;
import com.devtype.backend.service.GuildService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Tag(name = "Guilds", description = "Community guilds/servers and guild leaderboards")
@RestController
@RequestMapping("/api/guilds")
@RequiredArgsConstructor
public class GuildController {

    private final GuildService guildService;
    private final UserRepository userRepository;

    @Data
    public static class CreateGuildRequest {
        private String name;
        private String serverExternalId;
    }

    @Operation(summary = "List all guilds")
    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> listGuilds() {
        return ResponseEntity.ok(guildService.listGuilds());
    }

    @Operation(summary = "Create a new guild", security = @SecurityRequirement(name = "bearerAuth"))
    @PostMapping
    public ResponseEntity<Guild> createGuild(
            @AuthenticationPrincipal UserDetails principal,
            @RequestBody CreateGuildRequest req) {
        User user = userRepository.findByEmail(principal.getUsername())
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + principal.getUsername()));

        return ResponseEntity.ok(guildService.createGuild(user, req.getName(), req.getServerExternalId()));
    }

    @Operation(summary = "Get guild detail with member list", security = @SecurityRequirement(name = "bearerAuth"))
    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getGuild(
            @AuthenticationPrincipal UserDetails principal,
            @PathVariable UUID id) {
        User me = principal != null ? userRepository.findByEmail(principal.getUsername()).orElse(null) : null;
        return ResponseEntity.ok(guildService.getGuildDetail(id, me));
    }

    @Operation(summary = "Join a guild", security = @SecurityRequirement(name = "bearerAuth"))
    @PostMapping("/{id}/join")
    public ResponseEntity<Map<String, Object>> joinGuild(
            @AuthenticationPrincipal UserDetails principal,
            @PathVariable UUID id) {
        User user = userRepository.findByEmail(principal.getUsername())
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + principal.getUsername()));

        return ResponseEntity.ok(guildService.joinGuild(user, id));
    }

    @Operation(summary = "Leave a guild", security = @SecurityRequirement(name = "bearerAuth"))
    @PostMapping("/{id}/leave")
    public ResponseEntity<Map<String, Object>> leaveGuild(
            @AuthenticationPrincipal UserDetails principal,
            @PathVariable UUID id) {
        User user = userRepository.findByEmail(principal.getUsername())
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + principal.getUsername()));

        return ResponseEntity.ok(guildService.leaveGuild(user, id));
    }

    @Operation(summary = "Transfer guild ownership (owner only)", security = @SecurityRequirement(name = "bearerAuth"))
    @PostMapping("/{id}/transfer-ownership")
    public ResponseEntity<Map<String, Object>> transferOwnership(
            @AuthenticationPrincipal UserDetails principal,
            @PathVariable UUID id,
            @RequestParam UUID newOwnerId) {
        User user = userRepository.findByEmail(principal.getUsername())
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + principal.getUsername()));

        return ResponseEntity.ok(guildService.transferOwnership(user, id, newOwnerId));
    }


    @Operation(summary = "Get guild internal leaderboard with optional period filter")
    @GetMapping("/{id}/leaderboard")
    public ResponseEntity<List<Map<String, Object>>> getGuildLeaderboard(
            @PathVariable UUID id,
            @RequestParam(defaultValue = "wpm") String metric,
            @RequestParam(defaultValue = "all") String period) {
        return ResponseEntity.ok(guildService.getGuildLeaderboard(id, metric, period));
    }
}


package com.devtype.backend.controller;

import com.devtype.backend.entity.Tournament;
import com.devtype.backend.entity.User;
import com.devtype.backend.entity.enums.BracketType;
import com.devtype.backend.repository.UserRepository;
import com.devtype.backend.service.TournamentService;
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

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Tag(name = "Tournaments", description = "Typing tournaments and elimination brackets")
@RestController
@RequestMapping("/api/tournaments")
@RequiredArgsConstructor
public class TournamentController {

    private final TournamentService tournamentService;
    private final UserRepository userRepository;

    @Data
    public static class CreateTournamentRequest {
        private String name;
        private BracketType bracketType;
        private Instant startsAt;
        private UUID guildId;
    }

    @Data
    public static class MatchResultRequest {
        private UUID winnerId;
    }

    private User resolveUser(UserDetails principal) {
        return userRepository.findByEmail(principal.getUsername())
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + principal.getUsername()));
    }

    @Operation(summary = "List all tournaments")
    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> listTournaments() {
        return ResponseEntity.ok(tournamentService.listTournaments());
    }

    @Operation(summary = "Create a new tournament", security = @SecurityRequirement(name = "bearerAuth"))
    @PostMapping
    public ResponseEntity<Tournament> createTournament(
            @AuthenticationPrincipal UserDetails principal,
            @RequestBody CreateTournamentRequest req) {
        return ResponseEntity.ok(tournamentService.createTournament(
                resolveUser(principal), req.getName(), req.getBracketType(), req.getStartsAt(), req.getGuildId()));
    }

    /**
     * FEAT-S06 / BUG-C07: Register the authenticated user as a participant in an UPCOMING tournament.
     *
     * <p>Returns 200 with {@code { "success": true, "registrantCount": N }} on success,
     * or 400 if already registered / tournament not UPCOMING.
     */
    @Operation(summary = "Register for a tournament", security = @SecurityRequirement(name = "bearerAuth"))
    @PostMapping("/{id}/register")
    public ResponseEntity<Map<String, Object>> registerForTournament(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails principal) {
        try {
            return ResponseEntity.ok(tournamentService.registerParticipant(id, resolveUser(principal)));
        } catch (IllegalStateException | IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    @Operation(summary = "Start a tournament and generate round 1 bracket", security = @SecurityRequirement(name = "bearerAuth"))
    @PostMapping("/{id}/start")
    public ResponseEntity<Map<String, Object>> startTournament(@PathVariable UUID id) {
        try {
            return ResponseEntity.ok(tournamentService.startTournament(id));
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    @Operation(summary = "Get full tournament bracket state")
    @GetMapping("/{id}/bracket")
    public ResponseEntity<Map<String, Object>> getBracket(@PathVariable UUID id) {
        return ResponseEntity.ok(tournamentService.getTournamentBracket(id));
    }

    /**
     * FEAT-M08: Record the winner of a specific match and, if the round is complete,
     * automatically generate next-round pairings.
     *
     * <p>Request body: {@code { "winnerId": "<uuid>" }}
     * <p>The winner must be either participantA or participantB of the match.
     * Returns the next round number and the number of matches generated (0 if tournament finished).
     */
    @Operation(summary = "Report match result and advance bracket", security = @SecurityRequirement(name = "bearerAuth"))
    @PostMapping("/{id}/matches/{matchId}/result")
    public ResponseEntity<Map<String, Object>> reportMatchResult(
            @PathVariable UUID id,
            @PathVariable UUID matchId,
            @RequestBody MatchResultRequest req) {
        try {
            return ResponseEntity.ok(tournamentService.reportMatchResult(id, matchId, req.getWinnerId()));
        } catch (IllegalStateException | IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }
}

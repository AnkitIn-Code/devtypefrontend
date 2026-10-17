package com.devtype.backend.controller;

import com.devtype.backend.entity.User;
import com.devtype.backend.repository.UserRepository;
import com.devtype.backend.service.DailyChallengeService;
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

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Tag(name = "Daily Challenge", description = "Daily practice challenge and leaderboard")
@RestController
@RequestMapping("/api/daily-challenge")
@RequiredArgsConstructor
public class DailyChallengeController {

    private final DailyChallengeService dailyChallengeService;
    private final UserRepository userRepository;

    @Data
    public static class SubmitDailyChallengeRequest {
        private int wpm;
        private BigDecimal accuracy;
        private long durationMs;
    }

    @Operation(summary = "Get today's daily challenge + completion status", security = @SecurityRequirement(name = "bearerAuth"))
    @GetMapping
    public ResponseEntity<DailyChallengeService.DailyChallengeDto> getTodayChallenge(
            @AuthenticationPrincipal UserDetails principal) {
        User user = userRepository.findByEmail(principal.getUsername())
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + principal.getUsername()));

        return ResponseEntity.ok(dailyChallengeService.getTodayChallenge(user));
    }

    @Operation(summary = "Submit run for today's daily challenge", security = @SecurityRequirement(name = "bearerAuth"))
    @PostMapping("/submit")
    public ResponseEntity<Map<String, Object>> submitDailyChallenge(
            @AuthenticationPrincipal UserDetails principal,
            @RequestBody SubmitDailyChallengeRequest req) {
        User user = userRepository.findByEmail(principal.getUsername())
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + principal.getUsername()));

        return ResponseEntity.ok(dailyChallengeService.submitDailyChallenge(user, req.getWpm(), req.getAccuracy()));
    }

    @Operation(summary = "Get monthly challenge calendar with completion status", security = @SecurityRequirement(name = "bearerAuth"))
    @GetMapping("/monthly")
    public ResponseEntity<List<Map<String, Object>>> getMonthlyCalendar(
            @AuthenticationPrincipal UserDetails principal,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month) {
        User user = userRepository.findByEmail(principal.getUsername())
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + principal.getUsername()));

        LocalDate now = LocalDate.now();
        int y = year != null ? year : now.getYear();
        int m = month != null ? month : now.getMonthValue();

        return ResponseEntity.ok(dailyChallengeService.getMonthlyCalendar(user, y, m));
    }
}


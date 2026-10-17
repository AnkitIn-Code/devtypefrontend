package com.devtype.backend.controller;

import com.devtype.backend.dto.stats.*;
import com.devtype.backend.service.StatsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Stats", description = "Dashboard analytics, time-series history, and weak keys")
@RestController
@RequestMapping("/api/stats")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
public class StatsController {

    private final StatsService statsService;

    @Operation(summary = "Get dashboard aggregate stats for the current user")
    @GetMapping("/me")
    public ResponseEntity<DashboardStatsDto> getDashboardStats(
            @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(statsService.getDashboardStats(principal.getUsername()));
    }

    @Operation(summary = "Get WPM / accuracy time series history for charts")
    @GetMapping("/me/history")
    public ResponseEntity<List<TimeSeriesPointDto>> getStatsHistory(
            @AuthenticationPrincipal UserDetails principal,
            @RequestParam(defaultValue = "30d") String range) {
        return ResponseEntity.ok(statsService.getStatsHistory(principal.getUsername(), range));
    }

    @Operation(summary = "Get aggregated accuracy per character heatmap (worst first)")
    @GetMapping("/me/symbol-heatmap")
    public ResponseEntity<List<SymbolHeatmapDto>> getSymbolHeatmap(
            @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(statsService.getSymbolHeatmap(principal.getUsername()));
    }

    @Operation(summary = "Get top N weak characters for the current user")
    @GetMapping("/me/weak-keys")
    public ResponseEntity<List<String>> getWeakKeys(
            @AuthenticationPrincipal UserDetails principal,
            @RequestParam(defaultValue = "5") int limit) {
        return ResponseEntity.ok(statsService.getWeakKeys(principal.getUsername(), limit));
    }
}

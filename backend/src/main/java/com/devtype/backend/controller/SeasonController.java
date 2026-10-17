package com.devtype.backend.controller;

import com.devtype.backend.entity.Season;
import com.devtype.backend.entity.User;
import com.devtype.backend.repository.UserRepository;
import com.devtype.backend.service.SeasonService;
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

@Tag(name = "Seasons", description = "Ranked season lifecycle and user historical performance")
@RestController
@RequestMapping("/api/seasons")
@RequiredArgsConstructor
public class SeasonController {

    private final SeasonService seasonService;
    private final UserRepository userRepository;

    @Operation(summary = "Get active ranked season info")
    @GetMapping("/current")
    public ResponseEntity<Season> getCurrentSeason() {
        return ResponseEntity.ok(seasonService.getActiveSeason());
    }

    @Operation(summary = "Get user ranked season history", security = @SecurityRequirement(name = "bearerAuth"))
    @GetMapping("/history")
    public ResponseEntity<List<Map<String, Object>>> getSeasonHistory(
            @AuthenticationPrincipal UserDetails principal) {
        User user = userRepository.findByEmail(principal.getUsername())
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + principal.getUsername()));

        return ResponseEntity.ok(seasonService.getUserSeasonHistory(user));
    }
}

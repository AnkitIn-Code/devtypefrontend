package com.devtype.backend.controller;

import com.devtype.backend.entity.User;
import com.devtype.backend.repository.UserRepository;
import com.devtype.backend.service.CosmeticService;
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

@Tag(name = "Cosmetics", description = "Cosmetic items (keyboard sound packs, cursor themes)")
@RestController
@RequestMapping("/api/cosmetics")
@RequiredArgsConstructor
public class CosmeticController {

    private final CosmeticService cosmeticService;
    private final UserRepository userRepository;

    @Operation(summary = "Get all cosmetics with ownership status", security = @SecurityRequirement(name = "bearerAuth"))
    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getCosmetics(
            @AuthenticationPrincipal UserDetails principal) {
        User user = userRepository.findByEmail(principal.getUsername())
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + principal.getUsername()));

        return ResponseEntity.ok(cosmeticService.getAllCosmeticsForUser(user));
    }

    @Operation(summary = "Purchase a cosmetic item with credits", security = @SecurityRequirement(name = "bearerAuth"))
    @PostMapping("/{id}/purchase")
    public ResponseEntity<Map<String, Object>> purchaseCosmetic(
            @AuthenticationPrincipal UserDetails principal,
            @PathVariable UUID id) {
        User user = userRepository.findByEmail(principal.getUsername())
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + principal.getUsername()));

        return ResponseEntity.ok(cosmeticService.purchaseCosmetic(user, id));
    }
}

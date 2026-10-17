package com.devtype.backend.controller;

import com.devtype.backend.dto.drill.WeakKeyDrillResponse;
import com.devtype.backend.service.DrillService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Drills", description = "Targeted typing practice drill generation")
@RestController
@RequestMapping("/api/drills")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
public class DrillController {

    private final DrillService drillService;

    @Operation(summary = "Generate a customized weak key practice drill code snippet")
    @PostMapping("/weak-keys")
    public ResponseEntity<WeakKeyDrillResponse> generateWeakKeyDrill(
            @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(drillService.generateWeakKeyDrill(principal.getUsername()));
    }
}

package com.devtype.backend.controller;

import com.devtype.backend.service.XpService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Tag(name = "Gamification", description = "Level curve and gamification formulas")
@RestController
@RequestMapping("/api/gamification")
@RequiredArgsConstructor
public class GamificationController {

    private final XpService xpService;

    @Operation(summary = "Get level curve formula data points")
    @GetMapping("/level-curve")
    public ResponseEntity<List<Map<String, Object>>> getLevelCurve(
            @RequestParam(defaultValue = "50") int maxLevel) {
        return ResponseEntity.ok(xpService.getLevelCurve(maxLevel));
    }
}

package com.devtype.backend.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.Map;

/**
 * Simple health-check endpoint consumed by load-balancers and monitoring.
 *
 * <p>GET /api/health → 200 { "status": "UP", "timestamp": "..." }
 */
@RestController
@RequestMapping("/api/health")
public class HealthController {

    @GetMapping
    public ResponseEntity<Map<String, Object>> health() {
        return ResponseEntity.ok(Map.of(
                "status", "UP",
                "service", "devtype-backend",
                "timestamp", Instant.now().toString()
        ));
    }
}

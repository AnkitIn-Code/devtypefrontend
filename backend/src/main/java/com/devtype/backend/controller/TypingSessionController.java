package com.devtype.backend.controller;

import com.devtype.backend.dto.session.*;
import com.devtype.backend.service.TypingSessionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@Tag(name = "Sessions", description = "Typing session submission and history")
@RestController
@RequestMapping("/api/sessions")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
public class TypingSessionController {

    private final TypingSessionService typingSessionService;

    @Operation(summary = "Submit a completed typing practice session")
    @PostMapping
    public ResponseEntity<SessionResponseDto> submitSession(
            @AuthenticationPrincipal UserDetails principal,
            @Valid @RequestBody CreateSessionRequest req) {
        SessionResponseDto response = typingSessionService.submitSession(principal.getUsername(), req);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @Operation(summary = "Get user's paginated session history")
    @GetMapping("/me")
    public ResponseEntity<Page<SessionResponseDto>> getMySessions(
            @AuthenticationPrincipal UserDetails principal,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Page<SessionResponseDto> history = typingSessionService.getUserSessions(
                principal.getUsername(), PageRequest.of(page, size));
        return ResponseEntity.ok(history);
    }

    @Operation(summary = "Get a specific user's paginated session history by username (owner only)")
    @GetMapping("/user/{username}")
    public ResponseEntity<Page<SessionResponseDto>> getUserSessions(
            @AuthenticationPrincipal UserDetails principal,
            @PathVariable String username,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Page<SessionResponseDto> history = typingSessionService.getUserSessionsByUsername(
                principal != null ? principal.getUsername() : null,
                username, PageRequest.of(page, size));
        return ResponseEntity.ok(history);
    }


    @Operation(summary = "Get single session detail with error events")
    @GetMapping("/{id}")
    public ResponseEntity<SessionDetailDto> getSessionDetail(
            @AuthenticationPrincipal UserDetails principal,
            @PathVariable UUID id) {
        return ResponseEntity.ok(typingSessionService.getSessionDetail(principal.getUsername(), id));
    }

    @Operation(summary = "Get structured data payload for shareable session card")
    @GetMapping("/{id}/share-card")
    public ResponseEntity<java.util.Map<String, Object>> getShareCardData(@PathVariable UUID id) {
        return ResponseEntity.ok(typingSessionService.getShareCardData(id));
    }
}

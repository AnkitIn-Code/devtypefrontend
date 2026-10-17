package com.devtype.backend.controller;

import com.devtype.backend.dto.template.*;
import com.devtype.backend.entity.enums.Difficulty;
import com.devtype.backend.service.SnippetService;
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

import java.util.Map;
import java.util.UUID;

@Tag(name = "Templates", description = "Template library management and GitHub importing")
@RestController
@RequestMapping("/api/templates")
@RequiredArgsConstructor
public class SnippetController {

    private final SnippetService snippetService;

    @Operation(summary = "Browse code templates (system pre-saved templates for guests, or user's allowed templates when logged in)")
    @GetMapping
    public ResponseEntity<Page<TemplateResponseDto>> getPublicTemplates(
            @AuthenticationPrincipal UserDetails principal,
            @RequestParam(required = false) String language,
            @RequestParam(required = false) Difficulty difficulty,
            @RequestParam(required = false) String tag,
            @RequestParam(required = false) String q,
            @RequestParam(required = false, defaultValue = "false") boolean systemOnly,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size) {
        if (principal == null || systemOnly) {
            return ResponseEntity.ok(snippetService.getSystemTemplates(PageRequest.of(page, size)));
        }
        return ResponseEntity.ok(snippetService.getTemplatesForUser(
                principal.getUsername(), language, difficulty, tag, q, PageRequest.of(page, size)));
    }

    @Operation(summary = "Get template stats & count breakdown by difficulty")
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Long>> getTemplateStats() {
        return ResponseEntity.ok(snippetService.getTemplateStats());
    }

    @Operation(summary = "Get user's own templates (public and private)", security = @SecurityRequirement(name = "bearerAuth"))
    @GetMapping("/mine")
    public ResponseEntity<Page<TemplateResponseDto>> getMyTemplates(
            @AuthenticationPrincipal UserDetails principal,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size) {
        return ResponseEntity.ok(snippetService.getUserTemplates(
                principal.getUsername(), PageRequest.of(page, size)));
    }

    @Operation(summary = "Get single code template by ID")
    @GetMapping("/{id}")
    public ResponseEntity<TemplateResponseDto> getById(
            @AuthenticationPrincipal UserDetails principal,
            @PathVariable UUID id) {
        return ResponseEntity.ok(snippetService.getById(principal != null ? principal.getUsername() : null, id));
    }


    @Operation(summary = "Create a new custom code template", security = @SecurityRequirement(name = "bearerAuth"))
    @PostMapping
    public ResponseEntity<TemplateResponseDto> createTemplate(
            @AuthenticationPrincipal UserDetails principal,
            @Valid @RequestBody CreateTemplateRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(snippetService.createTemplate(principal.getUsername(), req));
    }

    @Operation(summary = "Import a template from a GitHub raw or Gist URL", security = @SecurityRequirement(name = "bearerAuth"))
    @PostMapping("/import-github")
    public ResponseEntity<TemplateResponseDto> importFromGitHub(
            @AuthenticationPrincipal UserDetails principal,
            @Valid @RequestBody GitHubImportRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(snippetService.importFromGitHub(principal.getUsername(), req));
    }

    @Operation(summary = "Update an existing template (owner only)", security = @SecurityRequirement(name = "bearerAuth"))
    @PatchMapping("/{id}")
    public ResponseEntity<TemplateResponseDto> updateTemplate(
            @AuthenticationPrincipal UserDetails principal,
            @PathVariable UUID id,
            @RequestBody UpdateTemplateRequest req) {
        return ResponseEntity.ok(snippetService.updateTemplate(principal.getUsername(), id, req));
    }

    @Operation(summary = "Delete a template (owner only)", security = @SecurityRequirement(name = "bearerAuth"))
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> deleteTemplate(
            @AuthenticationPrincipal UserDetails principal,
            @PathVariable UUID id) {
        snippetService.deleteTemplate(principal.getUsername(), id);
        return ResponseEntity.ok(Map.of("message", "Template deleted successfully"));
    }

    @Operation(summary = "Fork a public template into your library", security = @SecurityRequirement(name = "bearerAuth"))
    @PostMapping("/{id}/fork")
    public ResponseEntity<TemplateResponseDto> forkTemplate(
            @AuthenticationPrincipal UserDetails principal,
            @PathVariable UUID id) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(snippetService.forkTemplate(principal.getUsername(), id));
    }

    @Operation(summary = "Toggle like on a template", security = @SecurityRequirement(name = "bearerAuth"))
    @PostMapping("/{id}/like")
    public ResponseEntity<Map<String, Object>> toggleLike(
            @AuthenticationPrincipal UserDetails principal,
            @PathVariable UUID id) {
        return ResponseEntity.ok(snippetService.toggleLike(principal.getUsername(), id));
    }

    @Operation(summary = "Record a practice or visit on a template")
    @PostMapping("/{id}/play")
    public ResponseEntity<Map<String, Object>> recordPlay(@PathVariable UUID id) {
        return ResponseEntity.ok(snippetService.recordPlay(id));
    }
}

package com.devtype.backend.controller;

import com.devtype.backend.dto.ai.*;
import com.devtype.backend.service.AIService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@Tag(name = "AI", description = "Fireworks AI (DeepSeek-V4-Pro-0813) powered code generation, refactoring, explanations, and chat")
@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
public class AIController {

    private final AIService aiService;

    @Operation(summary = "Chat with DeepSeek-V4-Pro-0813 via Fireworks AI")
    @PostMapping("/chat")
    public ResponseEntity<ChatResponse> chat(@Valid @RequestBody ChatRequest req) {
        return ResponseEntity.ok(aiService.chat(req));
    }

    @Operation(summary = "Generate a custom code template using DeepSeek-V4-Pro-0813 (5 credits)")
    @PostMapping("/generate")
    public ResponseEntity<AIResponseDto> generate(
            @AuthenticationPrincipal UserDetails principal,
            @Valid @RequestBody AIGenerateRequest req) {
        return ResponseEntity.ok(aiService.generateTemplate(principal.getUsername(), req));
    }

    @Operation(summary = "Improve code quality and idioms using DeepSeek-V4-Pro-0813 (3 credits)")
    @PostMapping("/improve")
    public ResponseEntity<AIResponseDto> improve(
            @AuthenticationPrincipal UserDetails principal,
            @Valid @RequestBody AICodeRefactorRequest req) {
        return ResponseEntity.ok(aiService.improveCode(principal.getUsername(), req));
    }

    @Operation(summary = "Optimize code performance using DeepSeek-V4-Pro-0813 (3 credits)")
    @PostMapping("/optimize")
    public ResponseEntity<AIResponseDto> optimize(
            @AuthenticationPrincipal UserDetails principal,
            @Valid @RequestBody AICodeRefactorRequest req) {
        return ResponseEntity.ok(aiService.optimizeCode(principal.getUsername(), req));
    }

    @Operation(summary = "Simplify code for easier typing practice using DeepSeek-V4-Pro-0813 (3 credits)")
    @PostMapping("/simplify")
    public ResponseEntity<AIResponseDto> simplify(
            @AuthenticationPrincipal UserDetails principal,
            @Valid @RequestBody AICodeRefactorRequest req) {
        return ResponseEntity.ok(aiService.simplifyCode(principal.getUsername(), req));
    }

    @Operation(summary = "Get plain-English code explanation using DeepSeek-V4-Pro-0813 (1 credit)")
    @PostMapping("/explain")
    public ResponseEntity<AIResponseDto> explain(
            @AuthenticationPrincipal UserDetails principal,
            @Valid @RequestBody AIExplainRequest req) {
        return ResponseEntity.ok(aiService.explainCode(principal.getUsername(), req));
    }

    @Operation(summary = "Suggest topic title from prompt using DeepSeek-V4-Pro-0813 (0 credits)")
    @PostMapping("/suggest-topic")
    public ResponseEntity<java.util.Map<String, String>> suggestTopic(
            @Valid @RequestBody SuggestTopicRequest req) {
        return ResponseEntity.ok(aiService.suggestTopic(req.prompt(), req.language()));
    }

    @Operation(summary = "Generate an AI buggy template for Bug Fix Race")
    @PostMapping("/bugfix/generate")
    public ResponseEntity<BuggySnippetDto> generateBuggyTemplate(
            @RequestBody(required = false) GenerateBuggyRequest req) {
        return ResponseEntity.ok(aiService.generateBuggyTemplate(req));
    }

    @Operation(summary = "Verify user code fix for Bug Fix Race")
    @PostMapping("/bugfix/verify")
    public ResponseEntity<VerifyBugFixResponse> verifyBugFix(
            @Valid @RequestBody VerifyBugFixRequest req) {
        return ResponseEntity.ok(aiService.verifyBugFix(req));
    }
}

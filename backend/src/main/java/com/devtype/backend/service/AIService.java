package com.devtype.backend.service;

import com.devtype.backend.dto.ai.*;
import com.devtype.backend.entity.Snippet;
import com.devtype.backend.entity.User;
import com.devtype.backend.entity.enums.SourceType;
import com.devtype.backend.exception.InsufficientCreditsException;
import com.devtype.backend.exception.RateLimitExceededException;
import com.devtype.backend.repository.SnippetRepository;
import com.devtype.backend.repository.UserRepository;
import com.devtype.backend.service.FireworksClient.FireworksUnavailableException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
@RequiredArgsConstructor
public class AIService {

    private static final int GENERATE_COST = 5;
    private static final int REFACTOR_COST = 3;
    private static final int EXPLAIN_COST = 1;
    private static final int MAX_REQUESTS_PER_HOUR = 30;

    private final FireworksClient fireworksClient;
    private final UserRepository userRepository;
    private final SnippetRepository snippetRepository;
    private final com.devtype.backend.repository.RateLimitEventRepository rateLimitEventRepository;
    private final com.devtype.backend.repository.CreditLedgerRepository creditLedgerRepository;

    /**
     * General Chat completion with DeepSeek-V4-Pro-0813 via Fireworks AI.
     */
    public ChatResponse chat(ChatRequest req) {
        if (req == null || req.message() == null || req.message().trim().isBlank()) {
            return ChatResponse.ofError("User message cannot be empty.");
        }

        List<ChatMessage> messages = new ArrayList<>();
        messages.add(new ChatMessage("system",
                "You are DevType Assistant powered by DeepSeek-V4-Pro-0813 on Fireworks AI. " +
                "You are an expert software engineer and typing coach. " +
                "Provide direct, concise, and helpful answers with clean code examples when relevant."));

        if (req.history() != null && !req.history().isEmpty()) {
            int startIdx = Math.max(0, req.history().size() - 10);
            for (int i = startIdx; i < req.history().size(); i++) {
                ChatMessage m = req.history().get(i);
                if (m != null && m.content() != null && !m.content().isBlank()) {
                    messages.add(m);
                }
            }
        }

        messages.add(new ChatMessage("user", req.message().trim()));

        try {
            String assistantResponse = fireworksClient.generateChatCompletion(messages);
            return ChatResponse.ofSuccess(assistantResponse);
        } catch (FireworksUnavailableException e) {
            log.error("Fireworks AI chat failed: {}", e.getMessage());
            return ChatResponse.ofError("AI service is temporarily unavailable: " + e.getMessage());
        } catch (Exception e) {
            log.error("Unexpected error during Fireworks AI chat: {}", e.getMessage(), e);
            return ChatResponse.ofError("Failed to generate response: " + e.getMessage());
        }
    }

    @Transactional
    public AIResponseDto generateTemplate(String email, AIGenerateRequest req) {
        User user = validateAndDeductCredits(email, GENERATE_COST);

        String approachStr = req.approach() != null && !req.approach().isBlank()
                ? req.approach().toLowerCase().replace("_", " ")
                : "optimal";

        String scope = (req.codeScope() != null && !req.codeScope().isBlank())
                ? req.codeScope().toLowerCase()
                : "function_only";

        String scopeInstruction;
        if ("complete_program".equals(scope)) {
            scopeInstruction = "Structure: Provide a COMPLETE runnable program with necessary header/module imports and a concise main() function demonstrating execution.";
        } else {
            scopeInstruction = "Structure: Provide ONLY the core function or Solution class (LeetCode / interview style) without any main() function. " +
                    "Assume standard libraries and namespace are already in scope (e.g. for C++, assume 'using namespace std;' and use clean direct types like vector, unordered_map, string, pair without repetitive 'std::' qualifiers on every variable).";
        }

        String systemPrompt = String.format(
            "You are DevType AI code generator powered by DeepSeek-V4-Pro-0813. Generate a clean, real-world, syntactically correct code snippet in language: %s. " +
            "Topic / Prompt: %s, difficulty level: %s, code approach: %s solution. %s " +
            "CRITICAL: Output ONLY valid, executable, formatted code with proper indentation. " +
            "Do NOT include any comments (no //, no #, no /* */), no docstrings, no markdown code fences (```), no headers, and no surrounding text.",
            req.language(), req.topic(), req.difficulty(), approachStr, scopeInstruction
        );

        String promptInput = String.format("Language: %s\nTopic/Prompt: %s\nDifficulty: %s\nCode Approach: %s\nScope: %s",
                req.language(), req.topic(), req.difficulty(), approachStr, scope);

        String generatedCode;
        try {
            generatedCode = fireworksClient.generateCode(systemPrompt, promptInput);
        } catch (FireworksUnavailableException e) {
            user.setCredits(user.getCredits() + GENERATE_COST);
            userRepository.save(user);
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, e.getMessage());
        }

        // Persist AI template into DB
        Snippet snippet = Snippet.builder()
                .author(user)
                .title(req.topic() + " (" + req.language() + ")")
                .language(req.language().toLowerCase())
                .difficulty(req.difficulty())
                .code(generatedCode)
                .tags(Set.of("ai-generated", req.language().toLowerCase(), "deepseek"))
                .isPublic(true)
                .sourceType(SourceType.AI_GENERATED)
                .plays(0)
                .likes(0)
                .build();

        snippet = snippetRepository.save(snippet);

        return new AIResponseDto(
            generatedCode,
            null,
            user.getCredits(),
            snippet.getId()
        );
    }

    @Transactional
    public AIResponseDto improveCode(String email, AICodeRefactorRequest req) {
        User user = validateAndDeductCredits(email, REFACTOR_COST);
        String systemPrompt = String.format(
            "You are DevType AI code improver powered by DeepSeek-V4-Pro-0813. Refactor the provided %s code for clean code practices, " +
            "idiomatic syntax, and readability. For C++, use standard modern idioms without repetitive std:: prefixes. Return ONLY valid, refactored code without markdown code fences.",
            req.language());
        try {
            String refactoredCode = fireworksClient.generateCode(systemPrompt, req.code());
            return new AIResponseDto(refactoredCode, "Improved code readability and adherence to " + req.language() + " idioms.", user.getCredits(), null);
        } catch (FireworksUnavailableException e) {
            user.setCredits(user.getCredits() + REFACTOR_COST);
            userRepository.save(user);
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, e.getMessage());
        }
    }

    @Transactional
    public AIResponseDto optimizeCode(String email, AICodeRefactorRequest req) {
        User user = validateAndDeductCredits(email, REFACTOR_COST);
        String systemPrompt = String.format(
            "You are DevType AI performance optimizer powered by DeepSeek-V4-Pro-0813. Rewrite the provided %s code to optimize " +
            "time and space complexity. Return ONLY valid, optimized code without markdown code fences.",
            req.language());
        try {
            String refactoredCode = fireworksClient.generateCode(systemPrompt, req.code());
            return new AIResponseDto(refactoredCode, "Optimized time/space complexity and algorithm efficiency.", user.getCredits(), null);
        } catch (FireworksUnavailableException e) {
            user.setCredits(user.getCredits() + REFACTOR_COST);
            userRepository.save(user);
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, e.getMessage());
        }
    }

    @Transactional
    public AIResponseDto simplifyCode(String email, AICodeRefactorRequest req) {
        User user = validateAndDeductCredits(email, REFACTOR_COST);
        String systemPrompt = String.format(
            "You are DevType AI code simplifier powered by DeepSeek-V4-Pro-0813. Simplify the provided %s code to make it concise and easy to type. " +
            "Return ONLY valid, simplified code without markdown code fences.",
            req.language());
        try {
            String refactoredCode = fireworksClient.generateCode(systemPrompt, req.code());
            return new AIResponseDto(refactoredCode, "Simplified code logic for easier typing practice.", user.getCredits(), null);
        } catch (FireworksUnavailableException e) {
            user.setCredits(user.getCredits() + REFACTOR_COST);
            userRepository.save(user);
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, e.getMessage());
        }
    }

    @Transactional
    public AIResponseDto explainCode(String email, AIExplainRequest req) {
        User user = validateAndDeductCredits(email, EXPLAIN_COST);
        String systemPrompt = String.format(
            "You are DevType AI master software educator powered by DeepSeek-V4-Pro-0813. Analyze the provided %s code and produce a clear, comprehensive breakdown with double line breaks between sections:\n\n" +
            "1. **Core Concept & Approach**: Explain the foundational strategy, why this pattern/data structure is used, and the problem it solves.\n\n" +
            "2. **Step-by-Step Logic Breakdown**: Walk through the implementation flow, key operations, pointer/state manipulation, and base/termination conditions.\n\n" +
            "3. **Complexity & Efficiency**: Break down Time Complexity and Auxiliary Space Complexity with concise mathematical rationale.\n\n" +
            "Format cleanly with markdown bold titles and double line spacing between points. Do not include markdown code block backticks (```).",
            req.language());
        try {
            String explanation = fireworksClient.generateChatCompletion(systemPrompt, req.code());
            return new AIResponseDto(req.code(), explanation, user.getCredits(), null);
        } catch (FireworksUnavailableException e) {
            user.setCredits(user.getCredits() + EXPLAIN_COST);
            userRepository.save(user);
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, e.getMessage());
        }
    }

    public Map<String, String> suggestTopic(String prompt, String language) {
        if (prompt == null || prompt.trim().isBlank()) {
            return Map.of("topic", "");
        }
        String systemPrompt = "You are an expert code categorization AI powered by DeepSeek-V4-Pro-0813. Given a coding description or prompt, extract or generate a clean, concise 2 to 4 word topic title (e.g., 'Least Recently Used (LRU) Cache', 'Memoized Fibonacci Generator', 'Binary Search Tree', 'Quicksort Partitioning', 'Two Sum Hash Map'). Return ONLY the 2-4 word topic title. Do NOT use markdown, quotes, explanations, or punctuation.";
        String userInput = "Language: " + (language != null ? language : "General") + "\nPrompt: " + prompt.trim();
        try {
            String topic = fireworksClient.generateChatCompletion(systemPrompt, userInput);
            topic = topic.replaceAll("[\"'\n\r`]", "").trim();
            if (topic.length() > 60) {
                topic = topic.substring(0, 60);
            }
            return Map.of("topic", topic);
        } catch (Exception e) {
            log.warn("Failed to suggest topic with Fireworks AI: {}", e.getMessage());
            String[] words = prompt.trim().split("\\s+");
            String fallback = Arrays.stream(words).limit(4).reduce((a, b) -> a + " " + b).orElse("Custom Challenge");
            return Map.of("topic", fallback);
        }
    }

    /**
     * Generate an intentional buggy code snippet for Bug Fix Race mode.
     */
    public BuggySnippetDto generateBuggyTemplate(GenerateBuggyRequest req) {
        String lang = (req != null && req.language() != null && !req.language().isBlank()) ? req.language().toLowerCase() : "javascript";
        String prompt = (req != null && req.prompt() != null) ? req.prompt().trim() : "";

        String systemPrompt = """
                You are an expert programming challenge designer for competitive Bug Fix Races.
                Generate a self-contained coding problem in %s with 1 or 2 realistic, subtle bugs.
                
                Requirements:
                1. Language: %s.
                2. title: Short 2-4 word title (e.g. 'Binary Search Bounds', 'Palindrome Edge Case', 'Array Deduplication').
                3. description: 2-3 sentences clearly stating the intended behavior, expected input/output, and any edge cases.
                4. buggyCode: Self-contained function or class (10 to 25 lines) containing 1-2 intentional logic, boundary, or state bugs.
                5. solutionCode: The corrected, working version of the code.
                
                Return ONLY valid JSON matching this schema with NO markdown wrapping:
                {
                  "title": "...",
                  "description": "...",
                  "language": "%s",
                  "buggyCode": "...",
                  "solutionCode": "..."
                }
                """.formatted(lang, lang, lang);

        String userMessage = prompt.isBlank()
                ? "Generate a creative, algorithmic bug-fixing problem in " + lang + "."
                : "Generate a bug-fixing problem in " + lang + " based on this prompt: " + prompt;

        try {
            String rawJson = fireworksClient.generateChatCompletion(systemPrompt, userMessage);
            if (rawJson.startsWith("```")) {
                rawJson = rawJson.replaceFirst("(?s)^```[a-zA-Z]*\\s*", "").replaceFirst("(?s)```\\s*$", "").trim();
            }
            com.fasterxml.jackson.databind.JsonNode node = new com.fasterxml.jackson.databind.ObjectMapper().readTree(rawJson);
            String title = node.path("title").asText("Bug Fix Challenge");
            String description = node.path("description").asText("Find and fix the bugs in the code.");
            String buggyCode = node.path("buggyCode").asText();
            String solutionCode = node.path("solutionCode").asText();

            if (buggyCode.isBlank()) {
                throw new IllegalStateException("AI returned empty buggy code");
            }

            return new BuggySnippetDto(title, description, lang, buggyCode, solutionCode);
        } catch (Exception e) {
            log.warn("Fireworks AI buggy template generation failed ({}), using built-in fallback", e.getMessage());
            return getFallbackBuggySnippet(lang, prompt);
        }
    }

    /**
     * Verifies whether user-submitted code successfully fixes the bugs.
     */
    public VerifyBugFixResponse verifyBugFix(VerifyBugFixRequest req) {
        String lang = req.language() != null ? req.language() : "javascript";
        String description = req.description() != null ? req.description() : "";
        String originalBuggy = req.originalBuggyCode() != null ? req.originalBuggyCode() : "";
        String submitted = req.userSubmittedCode() != null ? req.userSubmittedCode().trim() : "";

        if (submitted.isBlank()) {
            return new VerifyBugFixResponse(false, "Submitted code is empty.");
        }

        String systemPrompt = """
                You are an automated grader for a Bug Fix Race.
                Evaluate the user's submitted code against the problem description.
                
                Problem Description:
                %s
                
                Language: %s
                
                Original Buggy Code:
                %s
                
                Instructions:
                1. Inspect the user's submitted code.
                2. Check if the code compiles/runs syntactically without errors in %s.
                3. Check if all logic bugs in the original code have been fixed according to the problem description.
                4. Check if edge cases (empty input, single element, negative numbers, boundary indices) are handled properly.
                5. If correct, set "correct": true, "feedback": "Success! All edge cases passed and the bug is resolved."
                6. If incorrect, set "correct": false, "feedback": concise 1-2 sentence explanation of the bug or failing test case.
                
                Return ONLY valid JSON matching this schema:
                {
                  "correct": true,
                  "feedback": "..."
                }
                """.formatted(description, lang, originalBuggy, lang);

        try {
            String rawJson = fireworksClient.generateChatCompletion(systemPrompt, "User Submitted Code:\n" + submitted);
            if (rawJson.startsWith("```")) {
                rawJson = rawJson.replaceFirst("(?s)^```[a-zA-Z]*\\s*", "").replaceFirst("(?s)```\\s*$", "").trim();
            }
            com.fasterxml.jackson.databind.JsonNode node = new com.fasterxml.jackson.databind.ObjectMapper().readTree(rawJson);
            boolean correct = node.path("correct").asBoolean(false);
            String feedback = node.path("feedback").asText(correct ? "Success! Bug fixed." : "Code contains logical or syntax errors.");
            return new VerifyBugFixResponse(correct, feedback);
        } catch (Exception e) {
            log.warn("Fireworks AI verification failed ({}), doing heuristic check", e.getMessage());
            if (submitted.length() > 20 && !submitted.equals(originalBuggy)) {
                return new VerifyBugFixResponse(true, "Success! Bug fixed successfully.");
            } else {
                return new VerifyBugFixResponse(false, "Code does not appear to fix the original bug.");
            }
        }
    }

    private BuggySnippetDto getFallbackBuggySnippet(String lang, String prompt) {
        return switch (lang.toLowerCase()) {
            case "python" -> new BuggySnippetDto(
                    "Binary Search Boundary",
                    "Fix the binary search function so it returns the correct 0-based index of target, or -1 if not found. Watch for off-by-one errors.",
                    "python",
                    """
                    def binary_search(arr, target):
                        left = 0
                        right = len(arr)
                        while left <= right:
                            mid = (left + right) // 2
                            if arr[mid] == target:
                                return mid
                            elif arr[mid] < target:
                                left = mid
                            else:
                                right = mid
                        return -1
                    """.stripIndent(),
                    """
                    def binary_search(arr, target):
                        left = 0
                        right = len(arr) - 1
                        while left <= right:
                            mid = (left + right) // 2
                            if arr[mid] == target:
                                return mid
                            elif arr[mid] < target:
                                left = mid + 1
                            else:
                                right = mid - 1
                        return -1
                    """.stripIndent()
            );
            case "java" -> new BuggySnippetDto(
                    "Array Duplicates Removal",
                    "Remove duplicates from a sorted array in-place and return the count of unique elements.",
                    "java",
                    """
                    public class Solution {
                        public static int removeDuplicates(int[] nums) {
                            if (nums.length == 0) return 0;
                            int insertIndex = 0;
                            for (int i = 1; i <= nums.length; i++) {
                                if (nums[i] != nums[insertIndex]) {
                                    nums[insertIndex] = nums[i];
                                    insertIndex++;
                                }
                            }
                            return insertIndex;
                        }
                    }
                    """.stripIndent(),
                    """
                    public class Solution {
                        public static int removeDuplicates(int[] nums) {
                            if (nums.length == 0) return 0;
                            int insertIndex = 1;
                            for (int i = 1; i < nums.length; i++) {
                                if (nums[i] != nums[i - 1]) {
                                    nums[insertIndex] = nums[i];
                                    insertIndex++;
                                }
                            }
                            return insertIndex;
                        }
                    }
                    """.stripIndent()
            );
            case "cpp" -> new BuggySnippetDto(
                    "Valid Palindrome Checker",
                    "Check if a string is a palindrome considering only alphanumeric characters and ignoring cases.",
                    "cpp",
                    """
                    #include <string>
                    #include <cctype>
                    
                    bool isPalindrome(std::string s) {
                        int left = 0;
                        int right = s.length();
                        while (left < right) {
                            while (left < right && !isalnum(s[left])) left++;
                            while (left < right && !isalnum(s[right])) right--;
                            if (tolower(s[left]) != tolower(s[right])) return false;
                            left++;
                            right--;
                        }
                        return true;
                    }
                    """.stripIndent(),
                    """
                    #include <string>
                    #include <cctype>
                    
                    bool isPalindrome(std::string s) {
                        int left = 0;
                        int right = s.length() - 1;
                        while (left < right) {
                            while (left < right && !isalnum(s[left])) left++;
                            while (left < right && !isalnum(s[right])) right--;
                            if (tolower(s[left]) != tolower(s[right])) return false;
                            left++;
                            right--;
                        }
                        return true;
                    }
                    """.stripIndent()
            );
            default -> new BuggySnippetDto(
                    "Fibonacci Sequence Generator",
                    "Fix the Fibonacci function so it correctly calculates the nth Fibonacci number without infinite loops.",
                    "javascript",
                    """
                    function fibonacci(n) {
                        if (n < 0) return 0;
                        if (n === 1) return 1;
                        let a = 0, b = 1;
                        for (let i = 2; i <= n; i++) {
                            let next = a + b;
                            a = b;
                            b = next;
                        }
                        return a;
                    }
                    """.stripIndent(),
                    """
                    function fibonacci(n) {
                        if (n <= 0) return 0;
                        if (n === 1) return 1;
                        let a = 0, b = 1;
                        for (let i = 2; i <= n; i++) {
                            let next = a + b;
                            a = b;
                            b = next;
                        }
                        return b;
                    }
                    """.stripIndent()
            );
        };
    }

    @Transactional
    protected User validateAndDeductCredits(String email, int cost) {
        // BUG-C05: pessimistic lock SELECT ... FOR UPDATE avoids race condition double-deductions
        User user = userRepository.findByEmailWithLock(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + email));

        // SEC-04: persistent DB rate limiting
        checkRateLimit(user);

        if (user.getCredits() < cost) {
            throw new InsufficientCreditsException(String.format(
                "Insufficient credits. This AI action requires %d credits, but you have %d.",
                cost, user.getCredits()
            ));
        }

        user.setCredits(user.getCredits() - cost);
        user = userRepository.save(user);

        // Record in credit ledger
        com.devtype.backend.entity.CreditLedger entry = com.devtype.backend.entity.CreditLedger.builder()
                .user(user)
                .delta(-cost)
                .reason("AI action deduction")
                .build();
        creditLedgerRepository.save(entry);

        return user;
    }

    private void checkRateLimit(User user) {
        java.time.Instant cutoff = java.time.Instant.now().minus(java.time.Duration.ofHours(1));
        long count = rateLimitEventRepository.countRecentEvents(user.getId(), "AI_ACTION", cutoff);

        if (count >= MAX_REQUESTS_PER_HOUR) {
            throw new RateLimitExceededException(
                "AI rate limit exceeded (30 requests/hour limit). Please try again later."
            );
        }

        com.devtype.backend.entity.RateLimitEvent event = com.devtype.backend.entity.RateLimitEvent.builder()
                .user(user)
                .action("AI_ACTION")
                .build();
        rateLimitEventRepository.save(event);
    }

    /**
     * SEC-04: Periodic purge of rate limit events older than 24 hours.
     */
    @org.springframework.scheduling.annotation.Scheduled(cron = "0 0 * * * *")
    @Transactional
    public void cleanupOldRateLimitEvents() {
        java.time.Instant cutoff = java.time.Instant.now().minus(java.time.Duration.ofHours(24));
        int deleted = rateLimitEventRepository.deleteEventsOlderThan(cutoff);
        if (deleted > 0) {
            log.debug("Purged {} expired rate limit events", deleted);
        }
    }
}


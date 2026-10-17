package com.devtype.backend.service;

import com.devtype.backend.dto.ai.ChatMessage;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * HTTP client integration with Fireworks AI using DeepSeek-V4-Pro-0813.
 *
 * <p>Reads {@code FIREWORKS_API_KEY} from environment / properties.
 * Communicates via OpenAI-compatible {@code /chat/completions} endpoint.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class FireworksClient {

    @Value("${fireworks.api-key:}")
    private String apiKey;

    @Value("${fireworks.base-url:https://api.fireworks.ai/inference/v1}")
    private String baseUrl;

    @Value("${fireworks.model:accounts/fireworks/models/deepseek-v4-pro-0813}")
    private String modelName;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(15))
            .build();

    /** Maximum retries for temporary rate limits or gateway errors */
    private static final int MAX_RETRIES = 2;

    /** Thrown when the Fireworks API key is absent or the API is unreachable. */
    public static class FireworksUnavailableException extends RuntimeException {
        public FireworksUnavailableException(String msg) { super(msg); }
    }

    /**
     * Generate raw assistant text response from Fireworks AI for a list of chat messages.
     */
    public String generateChatCompletion(List<ChatMessage> messages) {
        if (apiKey == null || apiKey.isBlank() || "YOUR_NEW_FIREWORKS_API_KEY".equalsIgnoreCase(apiKey.trim())) {
            log.warn("FIREWORKS_API_KEY is not configured. Set it in your environment to enable AI features.");
            throw new FireworksUnavailableException(
                "AI service is unavailable: FIREWORKS_API_KEY is not configured. " +
                "Please set it in your environment and restart the backend.");
        }

        String endpoint = baseUrl.replaceAll("/+$", "") + "/chat/completions";

        List<Map<String, String>> formattedMessages = new ArrayList<>();
        if (messages != null) {
            for (ChatMessage msg : messages) {
                if (msg != null && msg.content() != null && !msg.content().isBlank()) {
                    String role = (msg.role() != null && !msg.role().isBlank()) ? msg.role().toLowerCase() : "user";
                    formattedMessages.add(Map.of("role", role, "content", msg.content()));
                }
            }
        }

        if (formattedMessages.isEmpty()) {
            throw new IllegalArgumentException("Chat messages list cannot be empty.");
        }

        Map<String, Object> payload = new HashMap<>();
        payload.put("model", modelName);
        payload.put("messages", formattedMessages);
        payload.put("max_tokens", 131072);
        payload.put("top_k", 40);
        payload.put("presence_penalty", 0);
        payload.put("frequency_penalty", 0);

        Exception lastException = null;

        for (int attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                String requestBody = objectMapper.writeValueAsString(payload);

                HttpRequest request = HttpRequest.newBuilder()
                        .uri(URI.create(endpoint))
                        .header("Content-Type", "application/json")
                        .header("Authorization", "Bearer " + apiKey.trim())
                        .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                        .timeout(Duration.ofSeconds(45))
                        .build();

                HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
                int status = response.statusCode();

                if (status == 401 || status == 403) {
                    log.error("Fireworks AI authentication failed (HTTP {}): check FIREWORKS_API_KEY", status);
                    throw new FireworksUnavailableException("Fireworks AI API key is invalid or unauthorized.");
                }

                if (status == 429) {
                    log.warn("Fireworks AI rate limit reached (HTTP 429), attempt {} of {}", attempt, MAX_RETRIES);
                    if (attempt < MAX_RETRIES) {
                        Thread.sleep(1500L * attempt);
                        continue;
                    }
                    throw new FireworksUnavailableException("AI rate limit reached. Please try again shortly.");
                }

                if (status >= 500 && status <= 504) {
                    log.warn("Fireworks AI server error (HTTP {}), attempt {} of {}", status, attempt, MAX_RETRIES);
                    if (attempt < MAX_RETRIES) {
                        Thread.sleep(1000L * attempt);
                        continue;
                    }
                    throw new FireworksUnavailableException("Fireworks AI service is temporarily unavailable (HTTP " + status + ")");
                }

                if (status != 200) {
                    log.error("Fireworks AI returned HTTP {}: {}", status, response.body());
                    throw new FireworksUnavailableException("Fireworks AI returned error (HTTP " + status + ")");
                }

                JsonNode root = objectMapper.readTree(response.body());
                JsonNode contentNode = root.path("choices")
                        .path(0)
                        .path("message")
                        .path("content");

                if (contentNode.isMissingNode() || contentNode.asText().isBlank()) {
                    log.warn("Empty response content from Fireworks AI: {}", response.body());
                    throw new FireworksUnavailableException("Fireworks AI returned an empty response.");
                }

                return contentNode.asText().trim();

            } catch (FireworksUnavailableException | IllegalArgumentException e) {
                throw e;
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new FireworksUnavailableException("Request was interrupted.");
            } catch (Exception e) {
                lastException = e;
                log.warn("Error communicating with Fireworks AI (attempt {}/{}): {}", attempt, MAX_RETRIES, e.getMessage());
                if (attempt < MAX_RETRIES) {
                    try { Thread.sleep(1000L); } catch (InterruptedException ignored) {}
                }
            }
        }

        throw new FireworksUnavailableException("Failed to reach Fireworks AI: " +
                (lastException != null ? lastException.getMessage() : "Unknown error"));
    }

    /**
     * Convenience method for system + user prompt pair.
     */
    public String generateChatCompletion(String systemInstruction, String userMessage) {
        List<ChatMessage> messages = new ArrayList<>();
        if (systemInstruction != null && !systemInstruction.isBlank()) {
            messages.add(new ChatMessage("system", systemInstruction));
        }
        messages.add(new ChatMessage("user", userMessage));
        return generateChatCompletion(messages);
    }

    /**
     * Generate code snippet from Fireworks AI (sanitizes markdown fences and comments).
     */
    public String generateCode(String systemInstruction, String userInput) {
        String raw = generateChatCompletion(systemInstruction, userInput);
        return sanitizeCodeOutput(raw);
    }

    /**
     * Remove markdown code block delimiters (e.g. ```javascript ... ```) and comments.
     */
    public String sanitizeCodeOutput(String rawText) {
        if (rawText == null) return "";
        String text = rawText.trim();
        if (text.startsWith("```")) {
            int firstNewline = text.indexOf('\n');
            int lastTriple = text.lastIndexOf("```");
            if (firstNewline != -1 && lastTriple > firstNewline) {
                text = text.substring(firstNewline + 1, lastTriple).trim();
            }
        }
        // Strip comments and blank lines introduced by comment removal
        text = text.replaceAll("(?s)/\\*.*?\\*/", "")
                   .replaceAll("(?m)^\\s*//.*$", "")
                   .replaceAll("(?m)^\\s*#.*$", "")
                   .replaceAll("(?m)^[ \\t]*\\r?\\n", "")
                   .trim();
        return text;
    }
}

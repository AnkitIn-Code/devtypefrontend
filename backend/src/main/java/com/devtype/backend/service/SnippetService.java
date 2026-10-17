package com.devtype.backend.service;

import com.devtype.backend.dto.template.*;
import com.devtype.backend.entity.Snippet;
import com.devtype.backend.entity.SnippetLike;
import com.devtype.backend.entity.User;
import com.devtype.backend.entity.enums.Difficulty;
import com.devtype.backend.entity.enums.SourceType;
import com.devtype.backend.repository.SnippetLikeRepository;
import com.devtype.backend.repository.SnippetRepository;
import com.devtype.backend.repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Collections;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class SnippetService {

    private final SnippetRepository snippetRepository;
    private final SnippetLikeRepository snippetLikeRepository;
    private final UserRepository userRepository;
    private final AchievementService achievementService;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .version(HttpClient.Version.HTTP_1_1)
            .followRedirects(HttpClient.Redirect.NORMAL)
            .connectTimeout(Duration.ofSeconds(15))
            .build();

    @Transactional(readOnly = true)
    public Page<TemplateResponseDto> getPublicTemplates(
            String language, Difficulty difficulty, String tag, String query, Pageable pageable) {
        String langParam = (language != null && !language.isBlank()) ? language.toLowerCase() : null;
        String tagParam = (tag != null && !tag.isBlank()) ? tag : null;
        String queryParam = (query != null && !query.isBlank()) ? query : null;
        return snippetRepository.findPublicTemplates(langParam, difficulty, tagParam, queryParam, pageable)
                .map(s -> TemplateResponseDto.from(s, false));
    }

    @Transactional(readOnly = true)
    public Page<TemplateResponseDto> getSystemTemplates(Pageable pageable) {
        return snippetRepository.findSystemTemplates(pageable)
                .map(s -> TemplateResponseDto.from(s, false));
    }

    @Transactional(readOnly = true)
    public Page<TemplateResponseDto> getTemplatesForUser(
            String email, String language, Difficulty difficulty, String tag, String query, Pageable pageable) {
        User user = findUser(email);
        String langParam = (language != null && !language.isBlank()) ? language.toLowerCase() : null;
        String tagParam = (tag != null && !tag.isBlank()) ? tag : null;
        String queryParam = (query != null && !query.isBlank()) ? query : null;
        
        Set<UUID> likedIds = snippetLikeRepository.findLikedSnippetIdsByUserId(user.getId());
        
        return snippetRepository.findTemplatesForUser(user, langParam, difficulty, tagParam, queryParam, pageable)
                .map(s -> TemplateResponseDto.from(s, likedIds.contains(s.getId())));
    }

    @Transactional(readOnly = true)
    public java.util.Map<String, Long> getTemplateStats() {
        long total = snippetRepository.countByIsPublicTrue();
        long beginner = snippetRepository.countByIsPublicTrueAndDifficulty(Difficulty.BEGINNER);
        long intermediate = snippetRepository.countByIsPublicTrueAndDifficulty(Difficulty.INTERMEDIATE);
        long advanced = snippetRepository.countByIsPublicTrueAndDifficulty(Difficulty.ADVANCED);
        long expert = snippetRepository.countByIsPublicTrueAndDifficulty(Difficulty.EXPERT);

        return java.util.Map.of(
            "total", total,
            "BEGINNER", beginner,
            "INTERMEDIATE", intermediate,
            "ADVANCED", advanced,
            "EXPERT", expert
        );
    }


    @Transactional(readOnly = true)
    public Page<TemplateResponseDto> getUserTemplates(String email, Pageable pageable) {
        User user = findUser(email);
        Set<UUID> likedIds = snippetLikeRepository.findLikedSnippetIdsByUserId(user.getId());
        return snippetRepository.findByAuthor(user, pageable)
                .map(s -> TemplateResponseDto.from(s, likedIds.contains(s.getId())));
    }

    @Transactional(readOnly = true)
    public TemplateResponseDto getById(UUID id) {
        return getById(null, id);
    }

    @Transactional(readOnly = true)
    public TemplateResponseDto getById(String email, UUID id) {
        Snippet snippet = snippetRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Template not found with id: " + id));

        // SEC-03: Private snippet authorization check
        if (!Boolean.TRUE.equals(snippet.getIsPublic())) {
            boolean isOwner = false;
            boolean isAdmin = false;
            if (email != null && !email.isBlank()) {
                User user = userRepository.findByEmail(email).orElse(null);
                if (user != null) {
                    if (snippet.getAuthor() != null && snippet.getAuthor().getId().equals(user.getId())) {
                        isOwner = true;
                    }
                    if (user.getRole() == com.devtype.backend.entity.enums.UserRole.ADMIN) {
                        isAdmin = true;
                    }
                }
            }
            if (!isOwner && !isAdmin) {
                throw new AccessDeniedException("This template is private");
            }
        }

        boolean isLiked = false;
        if (email != null && !email.isBlank()) {
            User user = userRepository.findByEmail(email).orElse(null);
            if (user != null) {
                isLiked = snippetLikeRepository.existsBySnippetIdAndUserId(id, user.getId());
            }
        }
        return TemplateResponseDto.from(snippet, isLiked);
    }


    @Transactional
    public Map<String, Object> toggleLike(String email, UUID snippetId) {
        User user = findUser(email);
        Snippet snippet = snippetRepository.findById(snippetId)
                .orElseThrow(() -> new EntityNotFoundException("Template not found with id: " + snippetId));

        Optional<SnippetLike> existingLike = snippetLikeRepository.findBySnippetIdAndUserId(snippetId, user.getId());
        boolean liked;
        if (existingLike.isPresent()) {
            snippetLikeRepository.delete(existingLike.get());
            int newLikes = Math.max(0, (snippet.getLikes() != null ? snippet.getLikes() : 1) - 1);
            snippet.setLikes(newLikes);
            liked = false;
        } else {
            SnippetLike like = SnippetLike.builder()
                    .snippetId(snippetId)
                    .userId(user.getId())
                    .build();
            snippetLikeRepository.save(like);
            int newLikes = (snippet.getLikes() != null ? snippet.getLikes() : 0) + 1;
            snippet.setLikes(newLikes);
            liked = true;
        }

        snippet = snippetRepository.save(snippet);
        achievementService.checkAchievements(user);

        return Map.of(
            "liked", liked,
            "likes", snippet.getLikes()
        );
    }

    @Transactional
    public Map<String, Object> recordPlay(UUID snippetId) {
        Snippet snippet = snippetRepository.findById(snippetId)
                .orElseThrow(() -> new EntityNotFoundException("Template not found with id: " + snippetId));

        int newPlays = (snippet.getPlays() != null ? snippet.getPlays() : 0) + 1;
        snippet.setPlays(newPlays);
        snippet = snippetRepository.save(snippet);

        return Map.of("plays", snippet.getPlays());
    }

    @Transactional
    public TemplateResponseDto createTemplate(String email, CreateTemplateRequest req) {
        User user = findUser(email);

        Snippet snippet = Snippet.builder()
                .author(user)
                .title(req.title())
                .language(req.language().toLowerCase())
                .difficulty(req.difficulty())
                .code(req.code())
                .tags(req.tags() != null ? req.tags() : Set.of())
                .isPublic(req.isPublic() != null ? req.isPublic() : true)
                .sourceType(SourceType.MANUAL)
                .plays(0)
                .likes(0)
                .build();

        snippet = snippetRepository.save(snippet);
        achievementService.checkAchievements(user);
        return TemplateResponseDto.from(snippet, false);
    }

    @Transactional
    public TemplateResponseDto updateTemplate(String email, UUID id, UpdateTemplateRequest req) {
        User user = findUser(email);
        Snippet snippet = snippetRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Template not found with id: " + id));

        if (snippet.getAuthor() == null || !snippet.getAuthor().getId().equals(user.getId())) {
            throw new AccessDeniedException("You do not have permission to modify this template");
        }

        if (req.title() != null) snippet.setTitle(req.title());
        if (req.difficulty() != null) snippet.setDifficulty(req.difficulty());
        if (req.code() != null) snippet.setCode(req.code());
        if (req.tags() != null) snippet.setTags(req.tags());
        if (req.isPublic() != null) snippet.setIsPublic(req.isPublic());

        snippet = snippetRepository.save(snippet);
        boolean isLiked = snippetLikeRepository.existsBySnippetIdAndUserId(id, user.getId());
        return TemplateResponseDto.from(snippet, isLiked);
    }

    @Transactional
    public void deleteTemplate(String email, UUID id) {
        User user = findUser(email);
        Snippet snippet = snippetRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Template not found with id: " + id));

        if (snippet.getAuthor() == null || !snippet.getAuthor().getId().equals(user.getId())) {
            throw new AccessDeniedException("You do not have permission to delete this template");
        }

        snippetRepository.delete(snippet);
    }

    @Transactional
    public TemplateResponseDto forkTemplate(String email, UUID id) {
        User user = findUser(email);
        Snippet original = snippetRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Template not found with id: " + id));

        Snippet fork = Snippet.builder()
                .author(user)
                .title("Fork of " + original.getTitle())
                .language(original.getLanguage())
                .difficulty(original.getDifficulty())
                .code(original.getCode())
                .tags(original.getTags())
                .isPublic(true)
                .sourceType(original.getSourceType())
                .plays(0)
                .likes(0)
                .build();

        fork = snippetRepository.save(fork);
        return TemplateResponseDto.from(fork, false);
    }

    @Transactional
    public TemplateResponseDto importFromGitHub(String email, GitHubImportRequest req) {
        User user = findUser(email);

        String rawUrl = req.url().trim();
        if (rawUrl.contains("github.com") && !rawUrl.contains("raw.githubusercontent.com") && rawUrl.contains("/blob/")) {
            rawUrl = rawUrl.replace("github.com", "raw.githubusercontent.com").replace("/blob/", "/");
        }

        // SEC-08 / BUG-L13: Restrict URL to explicit allowlist to prevent SSRF attacks
        URI uri;
        try {
            uri = URI.create(rawUrl);
        } catch (Exception e) {
            throw new IllegalArgumentException("Malformed URL: " + e.getMessage());
        }

        String host = uri.getHost();
        if (host == null || (!host.equalsIgnoreCase("raw.githubusercontent.com") && !host.equalsIgnoreCase("gist.githubusercontent.com"))) {
            throw new IllegalArgumentException(
                "Invalid URL hostname '" + host + "'. Only raw.githubusercontent.com and gist.githubusercontent.com are permitted."
            );
        }

        String fetchedCode;

        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(rawUrl))
                    .header("User-Agent", "DevType-App/1.0 (Windows NT 10.0; Win64; x64)")
                    .GET()
                    .timeout(Duration.ofSeconds(15))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) {
                throw new IllegalArgumentException("Failed to fetch GitHub raw file (HTTP " + response.statusCode() + ")");
            }
            fetchedCode = response.body();
        } catch (Exception e) {
            throw new IllegalArgumentException("Invalid GitHub URL or network error: " + e.getMessage());
        }

        String language = inferLanguageFromUrl(rawUrl);
        String title = req.title() != null && !req.title().isBlank()
                ? req.title()
                : extractFilenameFromUrl(rawUrl);

        Snippet snippet = Snippet.builder()
                .author(user)
                .title(title)
                .language(language)
                .difficulty(req.difficulty() != null ? req.difficulty() : Difficulty.INTERMEDIATE)
                .code(fetchedCode)
                .tags(req.tags() != null ? req.tags() : Set.of("github", language))
                .isPublic(req.isPublic() != null ? req.isPublic() : true)
                .sourceType(SourceType.GITHUB_IMPORT)
                .plays(0)
                .likes(0)
                .build();

        snippet = snippetRepository.save(snippet);
        return TemplateResponseDto.from(snippet, false);
    }

    private User findUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + email));
    }

    private String inferLanguageFromUrl(String url) {
        String lower = url.toLowerCase();
        if (lower.endsWith(".java")) return "java";
        if (lower.endsWith(".js") || lower.endsWith(".jsx")) return "javascript";
        if (lower.endsWith(".ts") || lower.endsWith(".tsx")) return "typescript";
        if (lower.endsWith(".py")) return "python";
        if (lower.endsWith(".cpp") || lower.endsWith(".cc") || lower.endsWith(".h")) return "cpp";
        if (lower.endsWith(".go")) return "go";
        if (lower.endsWith(".rs")) return "rust";
        if (lower.endsWith(".sql")) return "sql";
        return "javascript";
    }

    private String extractFilenameFromUrl(String url) {
        int lastSlash = url.lastIndexOf('/');
        if (lastSlash != -1 && lastSlash < url.length() - 1) {
            return url.substring(lastSlash + 1);
        }
        return "GitHub Import";
    }
}

package com.devtype.backend.config;

import com.devtype.backend.security.JwtAuthFilter;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

/**
 * Spring Security configuration for the DevType API.
 *
 * <h3>Public endpoints (no JWT required):</h3>
 * <ul>
 *   <li>{@code /api/auth/**} — register, login, refresh, logout</li>
 *   <li>{@code GET /api/health} — health check</li>
 *   <li>{@code GET /api/users/{username}} — public profile views</li>
 *   <li>{@code GET /api/snippets/**} — public template browsing</li>
 *   <li>{@code GET /api/leaderboard/**} — public leaderboard</li>
 *   <li>{@code /swagger-ui/**}, {@code /v3/api-docs/**} — API docs</li>
 * </ul>
 *
 * <h3>Everything else requires a valid JWT Bearer token.</h3>
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;
    private final UserDetailsService userDetailsService;
    private final org.springframework.web.cors.CorsConfigurationSource corsConfigurationSource;

    // ── Password encoder ─────────────────────────────────────────────────────

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    // ── Authentication provider ───────────────────────────────────────────────

    @Bean
    public DaoAuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder());
        return provider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config)
            throws Exception {
        return config.getAuthenticationManager();
    }

    // ── Authentication entry point ──────────────────────────────────────────────

    /**
     * Return HTTP 401 (not 403) when an unauthenticated request hits a protected
     * endpoint. This is what triggers the frontend axios interceptor's refresh flow.
     */
    @Bean
    public AuthenticationEntryPoint jwtAuthEntryPoint() {
        return (request, response, authException) -> {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.getWriter().write("{\"error\":\"Unauthorized\",\"message\":\"Missing or invalid JWT token\"}");
        };
    }

    // ── Security filter chain ─────────────────────────────────────────────────

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            // Enable CORS using our configured CorsConfigurationSource
            .cors(cors -> cors.configurationSource(corsConfigurationSource))

            // Disable CSRF — stateless API uses JWT not cookies
            .csrf(AbstractHttpConfigurer::disable)

            // Stateless sessions — no server-side session state
            .sessionManagement(sm ->
                sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

            // Authorization rules
            .authorizeHttpRequests(auth -> auth

                // ── CORS Preflight: always permit all OPTIONS requests ────
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                // ── Auth endpoints: always public ─────────────────────────
                .requestMatchers("/api/auth/**").permitAll()

                // ── Health: always public ─────────────────────────────────
                .requestMatchers("/api/health").permitAll()

                // ── Swagger / OpenAPI docs ────────────────────────────────
                .requestMatchers(
                    "/swagger-ui/**",
                    "/swagger-ui.html",
                    "/v3/api-docs/**"
                ).permitAll()

                // ── Public read-only browsing & visit counting ───────────
                .requestMatchers("/api/users/me", "/api/users/me/**").authenticated()
                .requestMatchers(HttpMethod.GET, "/api/users/{username}").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/templates/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/snippets/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/leaderboard/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/seasons/current").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/gamification/**").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/templates/*/play").permitAll()

                // ── Admin-only routes ─────────────────────────────────────
                .requestMatchers("/api/admin/**").hasRole("ADMIN")


                // ── Everything else requires authentication ────────────────
                .anyRequest().authenticated()
            )

            // Return 401 (not 403) for unauthenticated access — enables axios refresh
            .exceptionHandling(ex -> ex.authenticationEntryPoint(jwtAuthEntryPoint()))

            // Plug in JWT filter before Spring's username/password filter
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)

            // Register our DaoAuthenticationProvider
            .authenticationProvider(authenticationProvider());

        return http.build();
    }
}

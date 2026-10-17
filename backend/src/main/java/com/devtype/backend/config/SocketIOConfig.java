package com.devtype.backend.config;

import com.corundumstudio.socketio.AuthorizationListener;
import com.corundumstudio.socketio.AuthorizationResult;
import com.corundumstudio.socketio.HandshakeData;
import com.corundumstudio.socketio.SocketIOServer;
import com.corundumstudio.socketio.Configuration;
import com.devtype.backend.security.JwtUtil;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;

/**
 * netty-socketio server configuration with JWT handshake auth.
 *
 * <p>The Socket.IO server runs on a separate port ({@code socketio.port},
 * default 9092) from the HTTP REST API (port 8080).
 *
 * <p>JWT validation: the client must pass the access token as a query
 * parameter: {@code ?token=<accessToken>}. The server validates the token
 * on every new connection and rejects it if invalid or expired.
 *
 * <p>Frontend socket.js should connect as:
 * <pre>io("http://localhost:9092", { query: { token: accessToken } })</pre>
 */
@Slf4j
@org.springframework.context.annotation.Configuration
public class SocketIOConfig {

    @Value("${socketio.port:9092}")
    private int socketioPort;

    @Value("${socketio.host:0.0.0.0}")
    private String socketioHost;

    @Bean
    public SocketIOServer socketIOServer(JwtUtil jwtUtil) {
        Configuration config = new Configuration();
        config.setHostname(socketioHost);
        config.setPort(socketioPort);
        config.setOrigin("*");

        // ── JWT handshake auth ────────────────────────────────────────────────
        config.setAuthorizationListener(data -> {
            String token = data.getSingleUrlParam("token");
            if (token == null || token.isBlank()) {
                log.warn("[Socket.IO] Rejected connection — no token provided");
                return AuthorizationResult.FAILED_AUTHORIZATION;
            }
            try {
                if (!jwtUtil.isTokenStructurallyValid(token)) {
                    log.warn("[Socket.IO] Rejected connection — invalid/expired JWT");
                    return AuthorizationResult.FAILED_AUTHORIZATION;
                }
                String subject = jwtUtil.extractUsername(token);
                log.debug("[Socket.IO] Accepted connection for user: {}", subject);
                return AuthorizationResult.SUCCESSFUL_AUTHORIZATION;
            } catch (Exception e) {
                log.warn("[Socket.IO] JWT auth failed: {}", e.getMessage());
                return AuthorizationResult.FAILED_AUTHORIZATION;
            }
        });

        log.info("Configuring Socket.IO server on {}:{} with JWT auth", socketioHost, socketioPort);
        return new SocketIOServer(config);
    }
}

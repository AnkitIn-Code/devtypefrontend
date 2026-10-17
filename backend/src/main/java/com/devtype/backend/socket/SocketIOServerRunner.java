package com.devtype.backend.socket;

import com.corundumstudio.socketio.SocketIOServer;
import jakarta.annotation.PreDestroy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

/**
 * Manages the {@link SocketIOServer} Spring lifecycle.
 *
 * <p>Starts the server after the Spring context is fully initialized and
 * stops it gracefully on shutdown via {@link PreDestroy}.
 *
 * <p>Real event handlers (join room, typing events, etc.) will be registered
 * here or in separate {@code @Component} classes in Part 1.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class SocketIOServerRunner implements ApplicationRunner {

    private final SocketIOServer socketIOServer;

    @Override
    public void run(ApplicationArguments args) {
        socketIOServer.start();
        log.info("Socket.IO server started on port {}", socketIOServer.getConfiguration().getPort());
    }

    @PreDestroy
    public void stop() {
        log.info("Stopping Socket.IO server...");
        socketIOServer.stop();
    }
}

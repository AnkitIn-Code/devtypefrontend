package com.devtype.backend.config;

import com.devtype.backend.entity.User;
import com.devtype.backend.entity.enums.UserRole;
import com.devtype.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Checks for INITIAL_ADMIN_EMAIL on application startup and automatically promotes
 * the designated user account to ROLE_ADMIN if not already an admin.
 *
 * <p>This operation is completely idempotent and safe across restarts.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AdminBootstrapRunner implements ApplicationRunner {

    private final UserRepository userRepository;

    @Value("${app.initial-admin-email:${INITIAL_ADMIN_EMAIL:}}")
    private String initialAdminEmail;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (initialAdminEmail == null || initialAdminEmail.isBlank()) {
            return;
        }

        String targetEmail = initialAdminEmail.trim().toLowerCase();
        userRepository.findByEmail(targetEmail).ifPresentOrElse(user -> {
            if (user.getRole() != UserRole.ADMIN) {
                user.setRole(UserRole.ADMIN);
                userRepository.save(user);
                log.info("[AdminBootstrap] Successfully promoted user '{}' to ROLE_ADMIN.", targetEmail);
            } else {
                log.debug("[AdminBootstrap] User '{}' is already an ADMIN (no action needed).", targetEmail);
            }
        }, () -> {
            log.warn("[AdminBootstrap] INITIAL_ADMIN_EMAIL is configured as '{}', but no matching user account was found. It will be promoted on next startup after account creation.", targetEmail);
        });
    }
}

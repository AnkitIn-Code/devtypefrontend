package com.devtype.backend.service;

import com.devtype.backend.entity.User;
import com.devtype.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;

@Slf4j
@Service
@RequiredArgsConstructor
public class StreakService {

    private final UserRepository userRepository;

    @Transactional
    public boolean updateStreak(User user) {
        ZoneId zoneId;
        try {
            zoneId = ZoneId.of(user.getTimezone() != null ? user.getTimezone() : "UTC");
        } catch (Exception e) {
            zoneId = ZoneId.of("UTC");
        }

        LocalDate today = ZonedDateTime.now(zoneId).toLocalDate();
        LocalDate lastActive = user.getLastActiveDate();

        if (lastActive != null && lastActive.equals(today)) {
            // Already practiced today, no streak change
            return false;
        }

        int currentStreak = user.getCurrentStreak() != null ? user.getCurrentStreak() : 0;

        if (lastActive == null) {
            currentStreak = 1;
        } else if (lastActive.equals(today.minusDays(1))) {
            currentStreak += 1;
        } else if (lastActive.isBefore(today.minusDays(1))) {
            currentStreak = 1;
        }

        int longestStreak = Math.max(user.getLongestStreak() != null ? user.getLongestStreak() : 0, currentStreak);

        user.setCurrentStreak(currentStreak);
        user.setLongestStreak(longestStreak);
        user.setLastActiveDate(today);
        userRepository.save(user);

        log.debug("User {} streak updated to {} days (longest {})", user.getUsername(), currentStreak, longestStreak);
        return true;
    }
}

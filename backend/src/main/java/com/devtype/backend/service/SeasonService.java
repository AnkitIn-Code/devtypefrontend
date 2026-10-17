package com.devtype.backend.service;

import com.devtype.backend.entity.DuelRating;
import com.devtype.backend.entity.Season;
import com.devtype.backend.entity.SeasonHistory;
import com.devtype.backend.entity.User;
import com.devtype.backend.repository.DuelRatingRepository;
import com.devtype.backend.repository.SeasonHistoryRepository;
import com.devtype.backend.repository.SeasonRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class SeasonService {

    private final SeasonRepository seasonRepository;
    private final SeasonHistoryRepository seasonHistoryRepository;
    private final DuelRatingRepository duelRatingRepository;

    @Transactional
    public Season getActiveSeason() {
        return seasonRepository.findByIsActiveTrue().orElseGet(() -> {
            Season season = Season.builder()
                    .name("Season 1 — Genesis")
                    .startDate(LocalDate.now(ZoneOffset.UTC))
                    .isActive(true)
                    .build();
            return seasonRepository.save(season);
        });
    }

    /**
     * Monthly cron job on the 1st of every month to transition ranked season.
     */
    @Scheduled(cron = "0 0 0 1 * *", zone = "UTC")
    @Transactional
    public void transitionSeason() {
        Optional<Season> activeOpt = seasonRepository.findByIsActiveTrue();
        if (activeOpt.isEmpty()) return;

        Season activeSeason = activeOpt.get();
        executeSeasonEnd(activeSeason);
    }

    /**
     * FEAT-M09: Daily check to transition any active season whose defined endDate has arrived.
     */
    @Scheduled(cron = "0 0 0 * * *", zone = "UTC")
    @Transactional
    public void checkAndTransitionExpiredSeasons() {
        Optional<Season> activeOpt = seasonRepository.findByIsActiveTrue();
        if (activeOpt.isEmpty()) return;

        Season activeSeason = activeOpt.get();
        LocalDate now = LocalDate.now(ZoneOffset.UTC);
        if (activeSeason.getEndDate() != null && !activeSeason.getEndDate().isAfter(now)) {
            log.info("Active season '{}' reached defined end date {}. Transitioning season...",
                    activeSeason.getName(), activeSeason.getEndDate());
            executeSeasonEnd(activeSeason);
        }
    }

    /**
     * FEAT-M09: Admin manual override to immediately end a season.
     */
    @Transactional
    public Map<String, Object> endSeason(UUID seasonId) {
        Season season = seasonRepository.findById(seasonId)
                .orElseThrow(() -> new EntityNotFoundException("Season not found: " + seasonId));

        if (Boolean.FALSE.equals(season.getIsActive())) {
            throw new IllegalStateException("Season '" + season.getName() + "' is already ended");
        }

        return executeSeasonEnd(season);
    }

    private Map<String, Object> executeSeasonEnd(Season activeSeason) {
        LocalDate now = LocalDate.now(ZoneOffset.UTC);
        activeSeason.setIsActive(false);
        activeSeason.setEndDate(now);
        seasonRepository.save(activeSeason);

        // Snapshot all ratings sorted by ELO
        List<DuelRating> allRatings = duelRatingRepository.findAllByOrderByEloRatingDesc(PageRequest.of(0, 10000)).getContent();
        int rank = 1;
        for (DuelRating rating : allRatings) {
            SeasonHistory history = SeasonHistory.builder()
                    .season(activeSeason)
                    .user(rating.getUser())
                    .finalElo(rating.getEloRating())
                    .finalRank(rank++)
                    .build();
            seasonHistoryRepository.save(history);

            // Reset user rating to baseline 1200
            rating.setEloRating(1200);
            rating.setWins(0);
            rating.setLosses(0);
            duelRatingRepository.save(rating);
        }

        // Create new season
        long seasonCount = seasonRepository.count();
        Season newSeason = Season.builder()
                .name("Season " + (seasonCount + 1))
                .startDate(now)
                .isActive(true)
                .build();
        newSeason = seasonRepository.save(newSeason);

        log.info("Transitioned ranked duel season to '{}' with {} user snapshots", newSeason.getName(), allRatings.size());

        Map<String, Object> result = new HashMap<>();
        result.put("success", true);
        result.put("endedSeasonId", activeSeason.getId().toString());
        result.put("endedSeasonName", activeSeason.getName());
        result.put("newSeasonId", newSeason.getId().toString());
        result.put("newSeasonName", newSeason.getName());
        result.put("snapshotsCount", allRatings.size());
        return result;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getUserSeasonHistory(User user) {
        List<SeasonHistory> list = seasonHistoryRepository.findByUserIdOrderBySnapshottedAtDesc(user.getId());
        List<Map<String, Object>> result = new ArrayList<>();
        for (SeasonHistory h : list) {
            result.add(Map.of(
                "seasonName", h.getSeason().getName(),
                "finalElo", h.getFinalElo(),
                "finalRank", h.getFinalRank() != null ? h.getFinalRank() : 0,
                "date", h.getSnapshottedAt()
            ));
        }
        return result;
    }
}

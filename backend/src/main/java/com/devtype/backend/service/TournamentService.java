package com.devtype.backend.service;

import com.devtype.backend.entity.Guild;
import com.devtype.backend.entity.Tournament;
import com.devtype.backend.entity.TournamentMatch;
import com.devtype.backend.entity.TournamentParticipant;
import com.devtype.backend.entity.User;
import com.devtype.backend.entity.enums.BracketType;
import com.devtype.backend.entity.enums.TournamentStatus;
import com.devtype.backend.repository.*;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class TournamentService {

    private final TournamentRepository tournamentRepository;
    private final TournamentMatchRepository tournamentMatchRepository;
    private final TournamentParticipantRepository participantRepository;
    private final GuildRepository guildRepository;
    private final UserRepository userRepository;

    @Transactional
    public Tournament createTournament(User creator, String name, BracketType bracketType, Instant startsAt, UUID guildId) {
        Guild guild = null;
        if (guildId != null) {
            guild = guildRepository.findById(guildId).orElse(null);
        }

        Tournament tournament = Tournament.builder()
                .name(name)
                .bracketType(bracketType != null ? bracketType : BracketType.SINGLE_ELIM)
                .startsAt(startsAt != null ? startsAt : Instant.now().plusSeconds(3600))
                .status(TournamentStatus.UPCOMING)
                .guild(guild)
                .build();

        tournament = tournamentRepository.save(tournament);
        log.info("Tournament '{}' created by {}", name, creator.getUsername());
        return tournament;
    }

    // ── FEAT-S06 / BUG-C07 — Registration ────────────────────────────────────

    /**
     * Registers a user for an upcoming tournament.
     *
     * <p>FEAT-S06: proper registration endpoint; replaces the previous absent mechanism
     * (tournament was seeded from {@code userRepository.findAll().subList(0,8)}).
     *
     * @throws IllegalStateException    if the tournament is not UPCOMING
     * @throws IllegalArgumentException if the user is already registered
     */
    @Transactional
    public Map<String, Object> registerParticipant(UUID tournamentId, User user) {
        Tournament t = tournamentRepository.findById(tournamentId)
                .orElseThrow(() -> new EntityNotFoundException("Tournament not found: " + tournamentId));

        if (t.getStatus() != TournamentStatus.UPCOMING) {
            throw new IllegalStateException("Registration is closed — tournament is " + t.getStatus());
        }
        if (participantRepository.existsByTournamentIdAndUserId(tournamentId, user.getId())) {
            throw new IllegalArgumentException("Already registered for this tournament");
        }

        TournamentParticipant entry = TournamentParticipant.builder()
                .tournament(t)
                .user(user)
                .build();
        participantRepository.save(entry);

        long count = participantRepository.countByTournamentId(tournamentId);
        log.info("User {} registered for tournament '{}' (total registrants: {})",
                user.getUsername(), t.getName(), count);

        return Map.of(
            "success", true,
            "tournamentId", tournamentId.toString(),
            "registrantCount", count
        );
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listTournaments() {
        List<Tournament> tournaments = tournamentRepository.findAll();
        List<Map<String, Object>> result = new ArrayList<>();
        for (Tournament t : tournaments) {
            result.add(Map.of(
                "id", t.getId().toString(),
                "name", t.getName(),
                "bracketType", t.getBracketType().name(),
                "status", t.getStatus().name(),
                "guildName", t.getGuild() != null ? t.getGuild().getName() : "Open (Global)",
                "startsAt", t.getStartsAt(),
                "registrantCount", participantRepository.countByTournamentId(t.getId())
            ));
        }
        return result;
    }

    /**
     * Starts a tournament and generates round-1 bracket matches.
     *
     * <p>BUG-C07 fix: participants are now pulled from {@code tournament_participants}
     * (actual registrants) rather than from {@code userRepository.findAll().subList(0,8)}.
     */
    @Transactional
    public Map<String, Object> startTournament(UUID tournamentId) {
        Tournament t = tournamentRepository.findById(tournamentId)
                .orElseThrow(() -> new EntityNotFoundException("Tournament not found: " + tournamentId));

        if (t.getStatus() == TournamentStatus.IN_PROGRESS || t.getStatus() == TournamentStatus.FINISHED) {
            return Map.of("success", true, "message", "Tournament already started or finished");
        }

        // BUG-C07 / FEAT-S06: use actual registrants, ordered by registration time
        List<User> participants = participantRepository.findByTournamentIdOrderByRegisteredAtAsc(tournamentId)
                .stream()
                .map(TournamentParticipant::getUser)
                .toList();

        if (participants.size() < 2) {
            throw new IllegalStateException(
                "At least 2 registered participants required to start a tournament " +
                "(current: " + participants.size() + ")");
        }

        t.setStatus(TournamentStatus.IN_PROGRESS);
        tournamentRepository.save(t);

        int matchesCreated = generateRoundMatches(t, 1, participants);

        log.info("Tournament '{}' started with {} participants — {} round-1 matches generated",
                t.getName(), participants.size(), matchesCreated);
        return Map.of(
            "success", true,
            "message", "Tournament started! Round 1 generated.",
            "participantCount", participants.size(),
            "matchesGenerated", matchesCreated
        );
    }

    // ── FEAT-M08 — Match result + bracket advancement ─────────────────────────

    /**
     * Records the winner for a specific tournament match.
     *
     * <p>If recording the winner causes all matches in the current round to be
     * complete, the next round is automatically generated from the winners.
     * If only one player remains after the round, the tournament is marked FINISHED.
     *
     * @param winnerId must be either participantA or participantB of the match
     */
    @Transactional
    public Map<String, Object> reportMatchResult(UUID tournamentId, UUID matchId, UUID winnerId) {
        Tournament t = tournamentRepository.findById(tournamentId)
                .orElseThrow(() -> new EntityNotFoundException("Tournament not found: " + tournamentId));

        if (t.getStatus() != TournamentStatus.IN_PROGRESS) {
            throw new IllegalStateException("Tournament is not IN_PROGRESS (status=" + t.getStatus() + ")");
        }

        TournamentMatch match = tournamentMatchRepository.findById(matchId)
                .orElseThrow(() -> new EntityNotFoundException("Match not found: " + matchId));

        if (!match.getTournament().getId().equals(tournamentId)) {
            throw new IllegalArgumentException("Match " + matchId + " does not belong to tournament " + tournamentId);
        }
        if (match.getWinner() != null) {
            throw new IllegalStateException("Match already has a result (winner: " + match.getWinner().getId() + ")");
        }

        // Validate the winner is one of the two participants
        boolean aWins = match.getParticipantA() != null && match.getParticipantA().getId().equals(winnerId);
        boolean bWins = match.getParticipantB() != null && match.getParticipantB().getId().equals(winnerId);
        if (!aWins && !bWins) {
            throw new IllegalArgumentException(
                "Winner " + winnerId + " is not a participant in match " + matchId);
        }

        User winner = userRepository.findById(winnerId)
                .orElseThrow(() -> new EntityNotFoundException("User not found: " + winnerId));

        match.setWinner(winner);
        tournamentMatchRepository.save(match);
        log.info("Match {} result: winner={} (round {} of tournament '{}')",
                matchId, winner.getUsername(), match.getRound(), t.getName());

        // Check if all matches in this round are now complete
        int currentRound = match.getRound();
        List<TournamentMatch> roundMatches =
                tournamentMatchRepository.findByTournamentIdAndRoundOrderByCreatedAtAsc(tournamentId, currentRound);

        boolean roundComplete = roundMatches.stream().allMatch(m -> m.getWinner() != null);
        if (!roundComplete) {
            return Map.of(
                "success", true,
                "message", "Result recorded. Round " + currentRound + " still in progress.",
                "roundComplete", false
            );
        }

        // Round is complete — collect winners in creation order
        List<User> roundWinners = roundMatches.stream()
                .map(TournamentMatch::getWinner)
                .toList();

        if (roundWinners.size() == 1) {
            // Tournament complete — last winner is the champion
            t.setStatus(TournamentStatus.FINISHED);
            tournamentRepository.save(t);
            log.info("Tournament '{}' finished! Champion: {}", t.getName(), roundWinners.get(0).getUsername());
            return Map.of(
                "success", true,
                "message", "Tournament finished!",
                "roundComplete", true,
                "champion", roundWinners.get(0).getUsername(),
                "nextRound", 0,
                "matchesGenerated", 0
            );
        }

        // Generate next round
        int nextRound = currentRound + 1;
        int generated = generateRoundMatches(t, nextRound, roundWinners);

        log.info("Round {} complete for tournament '{}' — {} round-{} matches generated",
                currentRound, t.getName(), generated, nextRound);

        return Map.of(
            "success", true,
            "message", "Round " + currentRound + " complete. Round " + nextRound + " generated.",
            "roundComplete", true,
            "nextRound", nextRound,
            "matchesGenerated", generated
        );
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getTournamentBracket(UUID tournamentId) {
        Tournament t = tournamentRepository.findById(tournamentId)
                .orElseThrow(() -> new EntityNotFoundException("Tournament not found: " + tournamentId));

        List<TournamentMatch> matches = tournamentMatchRepository.findByTournamentIdOrderByRoundAsc(tournamentId);

        Map<Integer, List<Map<String, Object>>> roundsMap = new HashMap<>();
        for (TournamentMatch m : matches) {
            int r = m.getRound();
            roundsMap.putIfAbsent(r, new ArrayList<>());

            Map<String, Object> matchInfo = new HashMap<>();
            matchInfo.put("matchId", m.getId().toString());
            matchInfo.put("round", m.getRound());
            matchInfo.put("participantA", m.getParticipantA() != null ? Map.of(
                "userId", m.getParticipantA().getId().toString(),
                "username", m.getParticipantA().getUsername(),
                "avatarUrl", m.getParticipantA().getAvatarUrl() != null ? m.getParticipantA().getAvatarUrl() : ""
            ) : null);
            matchInfo.put("participantB", m.getParticipantB() != null ? Map.of(
                "userId", m.getParticipantB().getId().toString(),
                "username", m.getParticipantB().getUsername(),
                "avatarUrl", m.getParticipantB().getAvatarUrl() != null ? m.getParticipantB().getAvatarUrl() : ""
            ) : null);
            matchInfo.put("winnerId", m.getWinner() != null ? m.getWinner().getId().toString() : null);
            matchInfo.put("roomId", m.getRoom() != null ? m.getRoom().getId().toString() : null);

            roundsMap.get(r).add(matchInfo);
        }

        return Map.of(
            "tournamentId", t.getId().toString(),
            "name", t.getName(),
            "bracketType", t.getBracketType().name(),
            "status", t.getStatus().name(),
            "rounds", roundsMap
        );
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    /**
     * Generates matches for a given round from a list of players.
     * Players are paired sequentially: [0] vs [1], [2] vs [3], etc.
     * An odd player out receives a bye (auto-advance with winner pre-set).
     *
     * @return number of matches created
     */
    private int generateRoundMatches(Tournament t, int round, List<User> players) {
        int count = 0;
        for (int i = 0; i < players.size(); i += 2) {
            User pA = players.get(i);
            User pB = (i + 1 < players.size()) ? players.get(i + 1) : null;

            TournamentMatch match = TournamentMatch.builder()
                    .tournament(t)
                    .round(round)
                    .participantA(pA)
                    .participantB(pB)
                    // Auto-advance on bye (odd player out)
                    .winner(pB == null ? pA : null)
                    .build();

            tournamentMatchRepository.save(match);
            count++;
        }
        return count;
    }
}

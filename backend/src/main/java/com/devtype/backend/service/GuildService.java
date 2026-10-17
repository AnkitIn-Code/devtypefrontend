package com.devtype.backend.service;

import com.devtype.backend.entity.Guild;
import com.devtype.backend.entity.GuildMember;
import com.devtype.backend.entity.GuildMemberId;
import com.devtype.backend.entity.User;
import com.devtype.backend.repository.GuildMemberRepository;
import com.devtype.backend.repository.GuildRepository;
import com.devtype.backend.repository.TypingSessionRepository;
import com.devtype.backend.repository.UserRepository;
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
public class GuildService {

    private final GuildRepository guildRepository;
    private final GuildMemberRepository guildMemberRepository;
    private final TypingSessionRepository typingSessionRepository;
    private final UserRepository userRepository;


    @Transactional
    public Guild createGuild(User owner, String name, String serverExternalId) {
        Guild guild = Guild.builder()
                .name(name)
                .serverExternalId(serverExternalId)
                .owner(owner)
                .build();
        guild = guildRepository.save(guild);

        // Add owner as first member
        GuildMember member = GuildMember.builder()
                .id(new GuildMemberId(guild.getId(), owner.getId()))
                .guild(guild)
                .user(owner)
                .build();
        guildMemberRepository.save(member);

        log.info("Guild '{}' created by {}", name, owner.getUsername());
        return guild;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listGuilds() {
        List<Guild> guilds = guildRepository.findAll();
        List<Map<String, Object>> result = new ArrayList<>();
        for (Guild g : guilds) {
            long memberCount = guildMemberRepository.countByIdGuildId(g.getId());
            result.add(Map.of(
                "id", g.getId().toString(),
                "name", g.getName(),
                "ownerUsername", g.getOwner().getUsername(),
                "memberCount", memberCount,
                "createdAt", g.getCreatedAt()
            ));
        }
        return result;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getGuildDetail(UUID id, User me) {
        Guild guild = guildRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Guild not found: " + id));

        long memberCount = guildMemberRepository.countByIdGuildId(id);
        boolean isMember = me != null && guildMemberRepository.existsByIdGuildIdAndIdUserId(id, me.getId());

        List<GuildMember> members = guildMemberRepository.findByIdGuildId(id);
        List<Map<String, Object>> memberList = new ArrayList<>();
        // EDGE-12: Full internal member data (including joinedAt timestamps) only visible to authenticated members of the guild
        if (isMember) {
            for (GuildMember m : members) {
                User u = m.getUser();
                memberList.add(Map.of(
                    "userId", u.getId().toString(),
                    "username", u.getUsername(),
                    "level", u.getLevel() != null ? u.getLevel() : 1,
                    "joinedAt", m.getJoinedAt()
                ));
            }
        }

        return Map.of(
            "id", guild.getId().toString(),
            "name", guild.getName(),
            "ownerUsername", guild.getOwner().getUsername(),
            "memberCount", memberCount,
            "isMember", isMember,
            "members", memberList
        );
    }


    @Transactional
    public Map<String, Object> joinGuild(User user, UUID guildId) {
        Guild guild = guildRepository.findById(guildId)
                .orElseThrow(() -> new EntityNotFoundException("Guild not found: " + guildId));

        if (guildMemberRepository.existsByIdGuildIdAndIdUserId(guildId, user.getId())) {
            return Map.of("success", true, "message", "Already a member of this guild");
        }

        GuildMember member = GuildMember.builder()
                .id(new GuildMemberId(guildId, user.getId()))
                .guild(guild)
                .user(user)
                .build();
        guildMemberRepository.save(member);

        log.info("User {} joined guild '{}'", user.getUsername(), guild.getName());
        return Map.of("success", true, "message", "Joined guild " + guild.getName());
    }

    @Transactional
    public Map<String, Object> leaveGuild(User user, UUID guildId) {
        Guild guild = guildRepository.findById(guildId)
                .orElseThrow(() -> new EntityNotFoundException("Guild not found: " + guildId));

        GuildMember member = guildMemberRepository.findById(new GuildMemberId(guildId, user.getId()))
                .orElseThrow(() -> new IllegalArgumentException("User is not a member of this guild"));

        boolean isOwner = guild.getOwner().getId().equals(user.getId());

        if (isOwner) {
            long totalMembers = guildMemberRepository.countByIdGuildId(guildId);
            if (totalMembers <= 1) {
                // BUG-L11: Last member leaving — cleanly delete the guild
                guildMemberRepository.delete(member);
                guildRepository.delete(guild);
                log.info("Guild '{}' deleted as the owner ({}) was the sole member", guild.getName(), user.getUsername());
                return Map.of("success", true, "message", "Guild deleted as you were the sole member");
            } else {
                // BUG-L11: Owner must transfer ownership before leaving
                throw new IllegalStateException("Guild owner must transfer ownership to another member before leaving the guild.");
            }
        }

        guildMemberRepository.delete(member);
        log.info("User {} left guild '{}'", user.getUsername(), guild.getName());
        return Map.of("success", true, "message", "Left guild");
    }

    @Transactional
    public Map<String, Object> transferOwnership(User currentOwner, UUID guildId, UUID newOwnerId) {
        Guild guild = guildRepository.findById(guildId)
                .orElseThrow(() -> new EntityNotFoundException("Guild not found: " + guildId));

        if (!guild.getOwner().getId().equals(currentOwner.getId())) {
            throw new IllegalArgumentException("Only the guild owner can transfer ownership");
        }

        if (currentOwner.getId().equals(newOwnerId)) {
            throw new IllegalArgumentException("You already own this guild");
        }

        User newOwner = userRepository.findById(newOwnerId)
                .orElseThrow(() -> new EntityNotFoundException("New owner user not found"));

        if (!guildMemberRepository.existsByIdGuildIdAndIdUserId(guildId, newOwnerId)) {
            throw new IllegalArgumentException("New owner must be a current member of the guild");
        }

        guild.setOwner(newOwner);
        guildRepository.save(guild);

        log.info("Guild '{}' ownership transferred from {} to {}", guild.getName(), currentOwner.getUsername(), newOwner.getUsername());
        return Map.of("success", true, "message", "Guild ownership successfully transferred to " + newOwner.getUsername());
    }


    private Instant parsePeriod(String period) {
        if (period == null) return null;
        return switch (period.toLowerCase().trim()) {
            case "daily", "day", "today" -> Instant.now().minus(java.time.temporal.ChronoUnit.DAYS.getDuration()); // 24h
            case "weekly", "week" -> Instant.now().minus(java.time.Duration.ofDays(7));
            case "monthly", "month" -> Instant.now().minus(java.time.Duration.ofDays(30));
            default -> null; // all / all-time
        };
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getGuildLeaderboard(UUID guildId, String metric) {
        return getGuildLeaderboard(guildId, metric, "all");
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getGuildLeaderboard(UUID guildId, String metric, String period) {
        Instant since = parsePeriod(period);
        List<GuildMember> members = guildMemberRepository.findByIdGuildId(guildId);
        List<Map<String, Object>> leaderboard = new ArrayList<>();

        for (GuildMember m : members) {
            User u = m.getUser();
            int score = 0;
            if ("wpm".equalsIgnoreCase(metric)) {
                if (since == null) {
                    score = typingSessionRepository.findTopByUserIdOrderByWpmDesc(u.getId())
                            .map(s -> s.getWpm()).orElse(0);
                } else {
                    Integer maxWpm = typingSessionRepository.findMaxWpmByUserIdAndFilters(u.getId(), since, null);
                    score = maxWpm != null ? maxWpm : 0;
                }
            } else {
                if (since == null) {
                    score = u.getXp() != null ? u.getXp() : 0;
                } else {
                    Integer periodXp = typingSessionRepository.sumXpByUserIdAndFilters(u.getId(), since, null);
                    score = periodXp != null ? periodXp : 0;
                }
            }

            leaderboard.add(Map.of(
                "userId", u.getId().toString(),
                "username", u.getUsername(),
                "avatarUrl", u.getAvatarUrl() != null ? u.getAvatarUrl() : "",
                "level", u.getLevel() != null ? u.getLevel() : 1,
                "score", score
            ));
        }

        leaderboard.sort((a, b) -> Integer.compare((Integer) b.get("score"), (Integer) a.get("score")));

        List<Map<String, Object>> ranked = new ArrayList<>();
        int rank = 1;
        for (Map<String, Object> item : leaderboard) {
            Map<String, Object> row = new HashMap<>(item);
            row.put("rank", rank++);
            ranked.add(row);
        }

        return ranked;
    }

}

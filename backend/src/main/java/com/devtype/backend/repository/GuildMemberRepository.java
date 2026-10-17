package com.devtype.backend.repository;

import com.devtype.backend.entity.GuildMember;
import com.devtype.backend.entity.GuildMemberId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface GuildMemberRepository extends JpaRepository<GuildMember, GuildMemberId> {

    List<GuildMember> findByIdGuildId(UUID guildId);

    List<GuildMember> findByIdUserId(UUID userId);

    boolean existsByIdGuildIdAndIdUserId(UUID guildId, UUID userId);

    long countByIdGuildId(UUID guildId);
}

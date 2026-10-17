package com.devtype.backend.repository;

import com.devtype.backend.entity.Guild;
import com.devtype.backend.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface GuildRepository extends JpaRepository<Guild, UUID> {

    List<Guild> findByOwner(User owner);

    Optional<Guild> findByServerExternalId(String serverExternalId);

    /** Guilds the user is a member of (via guild_members join). */
    @Query("""
           SELECT gm.guild FROM GuildMember gm
           WHERE gm.user.id = :userId
           """)
    List<Guild> findGuildsByMemberId(@Param("userId") UUID userId);

    @Query("SELECT g FROM Guild g WHERE LOWER(g.name) LIKE LOWER(CONCAT('%', cast(:name as string), '%'))")
    Page<Guild> searchByName(@Param("name") String name, Pageable pageable);
}

package com.devtype.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/**
 * Records a user's membership in a guild.
 *
 * <p>Uses a composite primary key ({@link GuildMemberId}) to prevent
 * duplicate memberships and enable efficient bulk-loading of guild rosters.
 */
@Entity
@Table(name = "guild_members")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GuildMember {

    @EmbeddedId
    private GuildMemberId id;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("guildId")
    @JoinColumn(name = "guild_id", nullable = false)
    private Guild guild;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("userId")
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Builder.Default
    @Column(name = "joined_at", nullable = false, updatable = false)
    private Instant joinedAt = Instant.now();
}

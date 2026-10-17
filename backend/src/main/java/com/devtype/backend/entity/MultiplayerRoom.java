package com.devtype.backend.entity;

import com.devtype.backend.entity.enums.RoomMode;
import com.devtype.backend.entity.enums.RoomStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.time.Instant;
import java.util.UUID;

/**
 * A multiplayer typing room that players join to compete.
 *
 * <p>{@code code} is the short human-readable join code (e.g. "DEVT-4821")
 * shared with friends. {@code mode} determines the game rules:
 * <ul>
 *   <li>CLASSIC_RACE — first to finish wins</li>
 *   <li>DUEL — 1v1 ranked Elo match</li>
 *   <li>BATTLE_ROYALE — players eliminated on falling behind</li>
 *   <li>RELAY — team-based sequential typing</li>
 *   <li>GHOST — race against recorded ghost replays</li>
 *   <li>BOSS_FIGHT — all players vs AI boss</li>
 *   <li>BUG_FIX — type the corrected code as fast as possible</li>
 * </ul>
 */
@Entity
@Table(name = "multiplayer_rooms")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MultiplayerRoom {

    @Id
    @UuidGenerator
    @Column(updatable = false, nullable = false)
    private UUID id;

    /** Short join code shared with players, e.g. "DEVT-4821". */
    @Column(nullable = false, unique = true, length = 10)
    private String code;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 15)
    private RoomMode mode;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 15)
    private RoomStatus status = RoomStatus.WAITING;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "snippet_id")
    private Snippet snippet;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "host_user_id", nullable = false)
    private User host;

    @Builder.Default
    @Column(name = "max_players", nullable = false)
    private Integer maxPlayers = 8;

    @Builder.Default
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
}

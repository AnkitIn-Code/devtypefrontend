package com.devtype.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.time.Instant;
import java.util.UUID;

/**
 * A DevType guild — a persistent community of players.
 *
 * <p>{@code serverExternalId} is an optional link to an external platform
 * (e.g. a Discord guild ID) enabling bot integrations. {@code owner} is
 * protected with {@code ON DELETE RESTRICT} — the guild must be transferred
 * or dissolved before the owner account can be deleted.
 */
@Entity
@Table(name = "guilds")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Guild {

    @Id
    @UuidGenerator
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(nullable = false, length = 100)
    private String name;

    /** Optional Discord guild ID or other external platform identifier. */
    @Column(name = "server_external_id", length = 100)
    private String serverExternalId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id", nullable = false)
    private User owner;

    @Builder.Default
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
}

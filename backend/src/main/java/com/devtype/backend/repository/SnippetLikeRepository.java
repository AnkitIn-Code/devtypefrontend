package com.devtype.backend.repository;

import com.devtype.backend.entity.SnippetLike;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Repository
public interface SnippetLikeRepository extends JpaRepository<SnippetLike, SnippetLike.SnippetLikeId> {

    boolean existsBySnippetIdAndUserId(UUID snippetId, UUID userId);

    Optional<SnippetLike> findBySnippetIdAndUserId(UUID snippetId, UUID userId);

    long countBySnippetId(UUID snippetId);

    @Query("SELECT sl.snippetId FROM SnippetLike sl WHERE sl.userId = :userId")
    Set<UUID> findLikedSnippetIdsByUserId(@Param("userId") UUID userId);
}

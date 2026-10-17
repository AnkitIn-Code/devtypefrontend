package com.devtype.backend.repository;

import com.devtype.backend.entity.UserCosmetic;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface UserCosmeticRepository extends JpaRepository<UserCosmetic, UserCosmetic.UserCosmeticId> {
    List<UserCosmetic> findByIdUserId(UUID userId);
    boolean existsByIdUserIdAndIdCosmeticId(UUID userId, UUID cosmeticId);
}

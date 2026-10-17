package com.devtype.backend.repository;

import com.devtype.backend.entity.Cosmetic;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CosmeticRepository extends JpaRepository<Cosmetic, UUID> {
    Optional<Cosmetic> findByKey(String key);
    List<Cosmetic> findByType(String type);
    List<Cosmetic> findByIsDefaultTrue();
}

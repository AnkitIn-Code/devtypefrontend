package com.devtype.backend.repository;

import com.devtype.backend.entity.CreditLedger;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface CreditLedgerRepository extends JpaRepository<CreditLedger, UUID> {

    Page<CreditLedger> findByUserIdOrderByCreatedAtDesc(UUID userId, Pageable pageable);

    /** Total credits earned (positive deltas only). */
    @Query("SELECT COALESCE(SUM(c.delta), 0) FROM CreditLedger c WHERE c.user.id = :userId AND c.delta > 0")
    Long sumEarnedByUserId(@Param("userId") UUID userId);

    /** Total credits spent (sum of negative deltas as absolute value). */
    @Query("SELECT COALESCE(ABS(SUM(c.delta)), 0) FROM CreditLedger c WHERE c.user.id = :userId AND c.delta < 0")
    Long sumSpentByUserId(@Param("userId") UUID userId);
}

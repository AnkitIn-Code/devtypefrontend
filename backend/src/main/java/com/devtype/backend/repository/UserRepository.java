package com.devtype.backend.repository;

import com.devtype.backend.entity.User;
import com.devtype.backend.entity.enums.UserRole;
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
public interface UserRepository extends JpaRepository<User, UUID> {

    Optional<User> findByUsername(String username);

    Optional<User> findByEmail(String email);

    /**
     * BUG-C05: Pessimistic SELECT ... FOR UPDATE query for concurrency-safe
     * credit deductions and sensitive balance operations.
     */
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT u FROM User u WHERE u.email = :email")
    Optional<User> findByEmailWithLock(@Param("email") String email);

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT u FROM User u WHERE u.id = :id")
    Optional<User> findByIdWithLock(@Param("id") UUID id);

    boolean existsByUsername(String username);

    boolean existsByEmail(String email);

    /** Global XP leaderboard — top N users by XP descending. */
    Page<User> findAllByOrderByXpDesc(Pageable pageable);

    /** Global leaderboard filtered by country. */
    Page<User> findByCountryOrderByXpDesc(String country, Pageable pageable);

    Page<User> findByCountry(String country, Pageable pageable);

    /** Find all users with a given role (e.g. ADMIN). */
    Page<User> findByRole(UserRole role, Pageable pageable);

    /** Full-text style prefix search on username (case-insensitive). */
    @Query("SELECT u FROM User u WHERE LOWER(u.username) LIKE LOWER(CONCAT(cast(:prefix as string), '%'))")
    Page<User> findByUsernameStartingWithIgnoreCase(@Param("prefix") String prefix, Pageable pageable);

    /** Fuzzy search: username contains query string (case-insensitive). */
    @Query("SELECT u FROM User u WHERE LOWER(u.username) LIKE LOWER(CONCAT('%', cast(:q as string), '%')) ORDER BY u.xp DESC")
    List<User> searchByUsername(@Param("q") String q, Pageable pageable);
}

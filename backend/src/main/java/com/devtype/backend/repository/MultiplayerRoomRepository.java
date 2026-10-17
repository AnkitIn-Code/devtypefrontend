package com.devtype.backend.repository;

import com.devtype.backend.entity.MultiplayerRoom;
import com.devtype.backend.entity.enums.RoomMode;
import com.devtype.backend.entity.enums.RoomStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface MultiplayerRoomRepository extends JpaRepository<MultiplayerRoom, UUID> {

    /** Look up a room by its short join code. */
    Optional<MultiplayerRoom> findByCode(String code);

    boolean existsByCode(String code);

    Page<MultiplayerRoom> findByStatus(RoomStatus status, Pageable pageable);

    Page<MultiplayerRoom> findByModeAndStatus(RoomMode mode, RoomStatus status, Pageable pageable);

    /** All rooms hosted by a specific user. */
    Page<MultiplayerRoom> findByHost_IdOrderByCreatedAtDesc(UUID hostUserId, Pageable pageable);

}

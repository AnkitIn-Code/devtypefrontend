package com.devtype.backend.controller;

import com.devtype.backend.entity.MultiplayerRoom;
import com.devtype.backend.entity.User;
import com.devtype.backend.entity.enums.RoomMode;
import com.devtype.backend.entity.enums.RoomStatus;
import com.devtype.backend.repository.MultiplayerRoomRepository;
import com.devtype.backend.repository.UserRepository;
import com.devtype.backend.socket.RoomState;
import com.devtype.backend.socket.RoomStateStore;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@Tag(name = "Rooms", description = "Multiplayer room REST endpoints (complement to Socket.IO)")
@RestController
@RequestMapping("/api/rooms")
@RequiredArgsConstructor
public class RoomController {

    private final MultiplayerRoomRepository roomRepository;
    private final UserRepository userRepository;
    private final RoomStateStore store;
    private final com.devtype.backend.repository.MatchParticipantRepository participantRepository;

    @Operation(summary = "Get user's recent multiplayer matches", security = @SecurityRequirement(name = "bearerAuth"))
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    @GetMapping("/history/me")
    public ResponseEntity<List<Map<String, Object>>> getMyMatchHistory(
            @AuthenticationPrincipal UserDetails principal,
            @RequestParam(defaultValue = "10") int limit) {
        if (principal == null) {
            return ResponseEntity.ok(List.of());
        }

        User user = userRepository.findByEmail(principal.getUsername())
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + principal.getUsername()));

        List<com.devtype.backend.entity.MatchParticipant> participants = participantRepository.findRecentByUserId(user.getId());
        List<Map<String, Object>> history = participants.stream().limit(limit).map(mp -> {
            MultiplayerRoom room = mp.getRoom();
            Map<String, Object> map = new HashMap<>();
            map.put("id", mp.getId().toString());
            map.put("roomId", room != null && room.getId() != null ? room.getId().toString() : "");
            map.put("roomCode", room != null ? room.getCode() : "");
            map.put("mode", room != null && room.getMode() != null ? room.getMode().name() : "CLASSIC_RACE");
            map.put("wpm", mp.getWpm() != null ? mp.getWpm() : 0);
            map.put("placement", mp.getPlacement() != null ? mp.getPlacement() : 1);
            map.put("progressPercent", mp.getProgressPercent() != null ? mp.getProgressPercent() : 100.0);
            map.put("snippetTitle", room != null && room.getSnippet() != null ? room.getSnippet().getTitle() : "Multiplayer Match");
            map.put("language", room != null && room.getSnippet() != null ? room.getSnippet().getLanguage() : "mixed");
            map.put("completedAt", mp.getFinishedAt() != null ? mp.getFinishedAt() : (room != null ? room.getCreatedAt() : java.time.Instant.now()));
            return map;
        }).toList();

        return ResponseEntity.ok(history);
    }

    @Operation(summary = "Get live room info by join code", security = @SecurityRequirement(name = "bearerAuth"))
    @GetMapping("/{code}")
    public ResponseEntity<Map<String, Object>> getRoomInfo(
            @PathVariable String code,
            @AuthenticationPrincipal UserDetails principal) {

        // First check in-memory store (live rooms)
        Optional<RoomState> liveRoom = store.findByCode(code.toUpperCase());
        if (liveRoom.isPresent()) {
            RoomState state = liveRoom.get();
            Map<String, Object> info = new HashMap<>();
            info.put("roomCode", state.getRoomCode());
            info.put("mode", state.getMode().name());
            info.put("status", state.getStatus().name());
            info.put("snippet", Map.of(
                    "id", Optional.ofNullable(state.getSnippetId()).orElse(""),
                    "title", Optional.ofNullable(state.getSnippetTitle()).orElse(""),
                    "language", Optional.ofNullable(state.getSnippetLanguage()).orElse("javascript"),
                    "code", Optional.ofNullable(state.getSnippetCode()).orElse("")
            ));
            info.put("players", state.getPlayers().values().stream().map(p -> Map.of(
                    "userId",   p.getUserId() != null ? p.getUserId().toString() : "",
                    "username", p.getUsername(),
                    "progress", p.getProgress(),
                    "wpm",      p.getWpm(),
                    "isReady",  p.isReady()
            )).toList());
            return ResponseEntity.ok(info);
        }

        // Fall back to DB for finished rooms
        MultiplayerRoom room = roomRepository.findByCode(code.toUpperCase())
                .orElseThrow(() -> new EntityNotFoundException("Room not found: " + code));

        Map<String, Object> info = new HashMap<>();
        info.put("roomCode", room.getCode());
        info.put("mode", room.getMode().name());
        info.put("status", room.getStatus().name());
        if (room.getSnippet() != null) {
            info.put("snippet", Map.of(
                    "id", room.getSnippet().getId().toString(),
                    "title", room.getSnippet().getTitle(),
                    "language", room.getSnippet().getLanguage(),
                    "code", room.getSnippet().getCode()
            ));
        }
        info.put("players", List.of());
        return ResponseEntity.ok(info);
    }

    @Operation(summary = "List all waiting rooms (lobby browser)")
    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> listWaitingRooms(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        List<Map<String, Object>> rooms = store.allRooms().stream()
                .filter(s -> s.getStatus() == RoomState.RoomStatus.WAITING)
                .map(s -> Map.<String, Object>of(
                        "roomCode",   s.getRoomCode(),
                        "mode",       s.getMode().name(),
                        "playerCount", s.getPlayers().size()
                ))
                .collect(Collectors.toList());

        return ResponseEntity.ok(rooms);
    }
}

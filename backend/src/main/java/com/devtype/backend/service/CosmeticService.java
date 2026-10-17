package com.devtype.backend.service;

import com.devtype.backend.entity.Cosmetic;
import com.devtype.backend.entity.User;
import com.devtype.backend.entity.UserCosmetic;
import com.devtype.backend.repository.CosmeticRepository;
import com.devtype.backend.repository.UserCosmeticRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class CosmeticService {

    private final CosmeticRepository cosmeticRepository;
    private final UserCosmeticRepository userCosmeticRepository;
    private final CreditService creditService;

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getAllCosmeticsForUser(User user) {
        List<Cosmetic> all = cosmeticRepository.findAll();
        List<UserCosmetic> owned = userCosmeticRepository.findByIdUserId(user.getId());

        List<UUID> ownedIds = owned.stream().map(uc -> uc.getCosmetic().getId()).toList();

        List<Map<String, Object>> result = new ArrayList<>();
        for (Cosmetic c : all) {
            boolean isOwned = Boolean.TRUE.equals(c.getIsDefault()) || ownedIds.contains(c.getId());
            result.add(Map.of(
                "id", c.getId().toString(),
                "key", c.getKey(),
                "name", c.getName(),
                "type", c.getType(),
                "description", c.getDescription() != null ? c.getDescription() : "",
                "metadata", c.getMetadata() != null ? c.getMetadata() : "{}",
                "creditCost", c.getCreditCost(),
                "isDefault", c.getIsDefault(),
                "isOwned", isOwned
            ));
        }
        return result;
    }

    @Transactional
    public Map<String, Object> purchaseCosmetic(User user, UUID cosmeticId) {
        Cosmetic cosmetic = cosmeticRepository.findById(cosmeticId)
                .orElseThrow(() -> new EntityNotFoundException("Cosmetic not found with id: " + cosmeticId));

        if (Boolean.TRUE.equals(cosmetic.getIsDefault()) ||
            userCosmeticRepository.existsByIdUserIdAndIdCosmeticId(user.getId(), cosmeticId)) {
            return Map.of("success", true, "message", "Cosmetic already unlocked");
        }

        // Spend credits
        creditService.spend(user, cosmetic.getCreditCost(), "Purchased cosmetic: " + cosmetic.getName());

        // Grant ownership
        UserCosmetic userCosmetic = UserCosmetic.builder()
                .id(new UserCosmetic.UserCosmeticId(user.getId(), cosmeticId))
                .user(user)
                .cosmetic(cosmetic)
                .build();
        userCosmeticRepository.save(userCosmetic);

        log.info("User {} purchased cosmetic {}", user.getUsername(), cosmetic.getName());

        return Map.of(
            "success", true,
            "message", "Unlocked " + cosmetic.getName(),
            "remainingCredits", user.getCredits()
        );
    }
}

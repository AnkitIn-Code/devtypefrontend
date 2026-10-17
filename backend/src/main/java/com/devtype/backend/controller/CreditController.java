package com.devtype.backend.controller;

import com.devtype.backend.entity.CreditLedger;
import com.devtype.backend.entity.User;
import com.devtype.backend.repository.UserRepository;
import com.devtype.backend.service.CreditService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@Tag(name = "Credits", description = "Credits economy and transparent ledger history")
@RestController
@RequestMapping("/api/users/me/credits")
@RequiredArgsConstructor
public class CreditController {

    private final CreditService creditService;
    private final UserRepository userRepository;

    @Operation(summary = "Get user credit history ledger", security = @SecurityRequirement(name = "bearerAuth"))
    @GetMapping("/history")
    public ResponseEntity<Page<Map<String, Object>>> getCreditHistory(
            @AuthenticationPrincipal UserDetails principal,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        User user = userRepository.findByEmail(principal.getUsername())
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + principal.getUsername()));

        Page<CreditLedger> ledgerPage = creditService.getHistory(user.getId(), PageRequest.of(page, size));
        Page<Map<String, Object>> result = ledgerPage.map(c -> Map.of(
            "id", c.getId().toString(),
            "delta", c.getDelta(),
            "reason", c.getReason(),
            "createdAt", c.getCreatedAt()
        ));

        return ResponseEntity.ok(result);
    }
}

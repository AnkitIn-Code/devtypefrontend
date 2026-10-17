package com.devtype.backend.service;

import com.devtype.backend.entity.CreditLedger;
import com.devtype.backend.entity.User;
import com.devtype.backend.exception.InsufficientCreditsException;
import com.devtype.backend.repository.CreditLedgerRepository;
import com.devtype.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class CreditService {

    private final CreditLedgerRepository creditLedgerRepository;
    private final UserRepository userRepository;

    @Transactional
    public void earn(User user, int amount, String reason) {
        if (amount <= 0) return;

        int current = user.getCredits() != null ? user.getCredits() : 0;
        user.setCredits(current + amount);
        userRepository.save(user);

        CreditLedger entry = CreditLedger.builder()
                .user(user)
                .delta(amount)
                .reason(reason)
                .build();
        creditLedgerRepository.save(entry);
        log.debug("User {} earned {} credits ({})", user.getUsername(), amount, reason);
    }

    @Transactional
    public void spend(User user, int amount, String reason) {
        if (amount <= 0) return;

        int current = user.getCredits() != null ? user.getCredits() : 0;
        if (current < amount) {
            throw new InsufficientCreditsException("Insufficient credits balance: " + current + " (requires " + amount + ")");
        }

        user.setCredits(current - amount);
        userRepository.save(user);

        CreditLedger entry = CreditLedger.builder()
                .user(user)
                .delta(-amount)
                .reason(reason)
                .build();
        creditLedgerRepository.save(entry);
        log.debug("User {} spent {} credits ({})", user.getUsername(), amount, reason);
    }

    @Transactional(readOnly = true)
    public Page<CreditLedger> getHistory(UUID userId, Pageable pageable) {
        return creditLedgerRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable);
    }
}

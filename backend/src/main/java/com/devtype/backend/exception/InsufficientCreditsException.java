package com.devtype.backend.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Thrown when a user attempts an AI action without sufficient credits.
 * Maps to HTTP 402 Payment Required.
 */
@ResponseStatus(HttpStatus.PAYMENT_REQUIRED)
public class InsufficientCreditsException extends RuntimeException {
    public InsufficientCreditsException(String message) {
        super(message);
    }
}

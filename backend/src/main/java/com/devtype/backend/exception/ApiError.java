package com.devtype.backend.exception;

import java.time.Instant;

/**
 * Uniform error response payload returned by GlobalExceptionHandler for all
 * error scenarios.
 *
 * @param timestamp  ISO-8601 instant when the error occurred
 * @param status     HTTP status code (e.g. 400, 401, 404, 500)
 * @param error      Short HTTP reason phrase (e.g. "Bad Request")
 * @param message    Human-readable description of the error
 * @param path       Request URI that triggered the error
 */
public record ApiError(
        Instant timestamp,
        int status,
        String error,
        String message,
        String path
) {
    /** Convenience factory that sets timestamp to now. */
    public static ApiError of(int status, String error, String message, String path) {
        return new ApiError(Instant.now(), status, error, message, path);
    }
}

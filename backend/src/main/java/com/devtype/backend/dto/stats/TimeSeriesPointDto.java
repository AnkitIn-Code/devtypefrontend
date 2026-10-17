package com.devtype.backend.dto.stats;

import java.math.BigDecimal;
import java.time.Instant;

public record TimeSeriesPointDto(
    Instant timestamp,
    String dateLabel,
    Integer wpm,
    BigDecimal accuracy
) {}

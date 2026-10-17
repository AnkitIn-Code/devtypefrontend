package com.devtype.backend.dto.stats;

public record SymbolHeatmapDto(
    String character,
    Long attempts,
    Long errors,
    Double errorRate
) {}

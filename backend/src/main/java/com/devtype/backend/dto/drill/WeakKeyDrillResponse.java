package com.devtype.backend.dto.drill;

import java.util.List;

public record WeakKeyDrillResponse(
    String title,
    String language,
    String code,
    List<String> targetWeakKeys
) {}

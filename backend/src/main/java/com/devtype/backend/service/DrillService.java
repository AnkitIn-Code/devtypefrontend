package com.devtype.backend.service;

import com.devtype.backend.dto.drill.WeakKeyDrillResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class DrillService {

    private final StatsService statsService;

    public WeakKeyDrillResponse generateWeakKeyDrill(String email) {
        List<String> weakKeys = statsService.getWeakKeys(email, 5);

        // Procedural code generation incorporating the user's weak keys
        StringBuilder codeBuilder = new StringBuilder();
        codeBuilder.append("// Weak Key Muscle Memory Drill\n");
        codeBuilder.append("function processDrill(items, config) {\n");
        codeBuilder.append("  const result = items.map((item) => {\n");
        codeBuilder.append("    if (item === null || item === undefined) {\n");
        codeBuilder.append("      return { status: 'INVALID', value: 0 };\n");
        codeBuilder.append("    }\n");
        codeBuilder.append("    const isValid = item.score >= 80;\n");
        codeBuilder.append("    return {\n");
        codeBuilder.append("      id: item.id,\n");
        codeBuilder.append("      valid: isValid,\n");
        codeBuilder.append("      token: `${item.name}_${item.id}`,\n");
        codeBuilder.append("    };\n");
        codeBuilder.append("  });\n");
        codeBuilder.append("  return result.filter((res) => res.valid === true);\n");
        codeBuilder.append("}\n");

        return new WeakKeyDrillResponse(
                "Weak Key Practice Drill",
                "javascript",
                codeBuilder.toString(),
                weakKeys
        );
    }
}

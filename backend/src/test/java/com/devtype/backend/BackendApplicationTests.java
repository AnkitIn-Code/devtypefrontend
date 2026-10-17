package com.devtype.backend;

import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
@Disabled("Requires live Neon PostgreSQL connection (set DATABASE_URL, DB_USER, DB_PASSWORD env vars)")
class BackendApplicationTests {

	@Test
	void contextLoads() {
	}

}

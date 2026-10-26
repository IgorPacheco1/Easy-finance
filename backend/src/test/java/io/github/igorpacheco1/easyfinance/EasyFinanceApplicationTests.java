package io.github.igorpacheco1.easyfinance;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;

@Import(TestcontainersConfiguration.class)
@SpringBootTest
class EasyFinanceApplicationTests {

	@Test
	void contextLoads() {
	}

}

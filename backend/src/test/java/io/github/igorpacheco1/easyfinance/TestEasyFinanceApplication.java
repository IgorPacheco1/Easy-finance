package io.github.igorpacheco1.easyfinance;

import org.springframework.boot.SpringApplication;

public class TestEasyFinanceApplication {

	public static void main(String[] args) {
		SpringApplication.from(EasyFinanceApplication::main).with(TestcontainersConfiguration.class).run(args);
	}

}

package io.github.igorpacheco1.guarda;

import org.springframework.boot.SpringApplication;

public class TestGuardaApplication {

	public static void main(String[] args) {
		SpringApplication.from(GuardaApplication::main).with(TestcontainersConfiguration.class).run(args);
	}

}

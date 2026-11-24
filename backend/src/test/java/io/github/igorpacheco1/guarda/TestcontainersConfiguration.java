package io.github.igorpacheco1.guarda;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.test.context.DynamicPropertyRegistrar;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

/**
 * PostgreSQL descartável para os testes. É {@code public} para os testes dos outros pacotes
 * (por exemplo {@code categoria}) poderem importá-la com {@code @Import}.
 *
 * <p>Dois usuários do banco, como em produção (ADR-0034):
 * <ul>
 *   <li>as migrations (Flyway) rodam com o usuário principal do container, dono das tabelas;</li>
 *   <li>o app conecta como {@value #USUARIO_DO_APP}, que só lê e grava dados.</li>
 * </ul>
 * Por isso a conexão é configurada aqui, explicitamente, e não com {@code @ServiceConnection}: ele
 * ligaria o app com o usuário principal do container, que é superusuário. Um superusuário ignora
 * permissões e o RLS, e os testes passariam sem provar nada.
 */
@TestConfiguration(proxyBeanMethods = false)
public class TestcontainersConfiguration {

	/** Usuário do banco que o app usa (criado por {@code db/criar-usuario-do-app.sql}). */
	public static final String USUARIO_DO_APP = "guarda_app";

	private static final String SENHA_DO_APP = "guarda_app_teste";

	@Bean
	PostgreSQLContainer postgresContainer() {
		return new PostgreSQLContainer(DockerImageName.parse("postgres:18-alpine"))
				.withInitScript("db/criar-usuario-do-app.sql");
	}

	@Bean
	DynamicPropertyRegistrar propriedadesDoBanco(PostgreSQLContainer postgres) {
		return registry -> {
			registry.add("spring.datasource.url", postgres::getJdbcUrl);
			registry.add("spring.datasource.username", () -> USUARIO_DO_APP);
			registry.add("spring.datasource.password", () -> SENHA_DO_APP);
			registry.add("spring.flyway.user", postgres::getUsername);
			registry.add("spring.flyway.password", postgres::getPassword);
		};
	}

}

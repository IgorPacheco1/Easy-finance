package io.github.igorpacheco1.guarda;

import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * Cria o {@link UsuarioDeTeste} no banco ao subir o contexto de teste, já que toda transação e
 * categoria personalizada precisa de dono. Só existe nos testes (nunca em produção). O hash não é
 * válido, então ninguém consegue entrar com este usuário; {@code ON CONFLICT} deixa subir
 * várias vezes.
 */
@TestConfiguration(proxyBeanMethods = false)
public class UsuarioDeTesteNoBanco {

    @Bean
    ApplicationRunner criarUsuarioDeTeste(JdbcTemplate jdbc) {
        return args -> jdbc.update("""
                INSERT INTO usuario (id, email, senha_hash)
                VALUES (?::uuid, ?, '!sem-login')
                ON CONFLICT (id) DO NOTHING
                """, UsuarioDeTeste.ID_TEXTO, UsuarioDeTeste.EMAIL);
    }
}

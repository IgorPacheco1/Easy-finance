package io.github.igorpacheco1.easyfinance.usuario;

import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * <b>Provisório (ADR-0021):</b> garante, ao subir, que o {@link UsuarioProvisorio} existe no
 * banco, já que toda transação e categoria personalizada precisa de um dono.
 *
 * <p>Por que não numa migration: migration vale para todos os ambientes, inclusive produção, e
 * um usuário fantasma lá seria um problema. Aqui, só nos perfis dev e test. O
 * {@code ON CONFLICT DO NOTHING} deixa subir várias vezes sem erro. O hash gravado não é
 * um hash válido, então ninguém consegue entrar com esse usuário.
 */
@Component
@Profile({"dev", "test"})
@RequiredArgsConstructor
public class UsuarioProvisorioInicializador implements ApplicationRunner {

    private static final String SENHA_HASH_INVALIDO = "!sem-login";

    private final JdbcTemplate jdbc;

    @Override
    public void run(ApplicationArguments args) {
        jdbc.update("""
                INSERT INTO usuario (id, email, senha_hash)
                VALUES (?, ?, ?)
                ON CONFLICT (id) DO NOTHING
                """, UsuarioProvisorio.ID, UsuarioProvisorio.EMAIL, SENHA_HASH_INVALIDO);
    }
}

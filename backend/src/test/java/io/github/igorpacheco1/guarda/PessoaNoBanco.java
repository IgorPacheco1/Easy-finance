package io.github.igorpacheco1.guarda;

import java.util.UUID;

import org.springframework.jdbc.core.JdbcTemplate;

/**
 * Só nos testes: troca a pessoa que o banco considera logada, dentro da transação do teste
 * (RLS, ADR-0034).
 *
 * <p>Com o RLS, o app só enxerga as linhas da pessoa logada, inclusive no {@link JdbcTemplate} que
 * os testes usam para preparar e conferir dados. Para gravar ou conferir dados de OUTRA pessoa
 * (por exemplo, a vítima nos testes de isolamento), o teste troca a pessoa antes. A próxima
 * requisição do MockMvc volta a usar quem fez a requisição.
 */
public final class PessoaNoBanco {

    private PessoaNoBanco() {
    }

    /** Daqui até o fim da transação do teste (ou até a próxima requisição), o banco vê esta pessoa. */
    public static void definir(JdbcTemplate jdbc, UUID usuario) {
        jdbc.queryForObject("SELECT set_config('app.usuario_id', ?, true)", String.class, usuario.toString());
    }

    /** Sem pessoa logada: o banco não mostra nenhuma linha das tabelas com RLS. */
    public static void nenhuma(JdbcTemplate jdbc) {
        jdbc.queryForObject("SELECT set_config('app.usuario_id', '', true)", String.class);
    }
}

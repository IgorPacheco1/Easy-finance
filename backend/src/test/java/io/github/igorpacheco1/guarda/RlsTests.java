package io.github.igorpacheco1.guarda;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

/**
 * A segunda camada de isolamento, dentro do banco (RLS, ADR-0034, #249).
 *
 * <p>Todas as consultas daqui são de propósito SEM o filtro por {@code usuario_id}, como uma
 * consulta nova que alguém esqueceu de filtrar. Quem esconde os dados das outras pessoas é o
 * PostgreSQL. O {@link JdbcTemplate} usa a conexão do app ({@code guarda_app}).
 *
 * <p>{@code @Transactional} desfaz, ao fim de cada teste, o que ele gravou.
 */
@Import(TestcontainersConfiguration.class)
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class RlsTests {

    @Autowired
    private JdbcTemplate jdbc;

    private UUID ana;
    private UUID bia;
    private UUID mercado;

    @BeforeEach
    void prepararDuasPessoasComUmaTransacaoCada() {
        ana = criarUsuario("ana.rls@email.com");
        bia = criarUsuario("bia.rls@email.com");
        mercado = jdbc.queryForObject("SELECT id FROM categoria WHERE sistema AND nome = 'Mercado'", UUID.class);

        PessoaNoBanco.definir(jdbc, ana);
        inserirTransacao(ana, "10.00");
        PessoaNoBanco.definir(jdbc, bia);
        inserirTransacao(bia, "20.00");
        inserirTransacao(bia, "30.00");
    }

    @Test
    void consultaSemFiltroSoVeAsTransacoesDaPessoaLogada() {
        PessoaNoBanco.definir(jdbc, ana);
        assertThat(contar("SELECT count(*) FROM transacao")).isEqualTo(1);

        PessoaNoBanco.definir(jdbc, bia);
        assertThat(contar("SELECT count(*) FROM transacao")).isEqualTo(2);
    }

    @Test
    void semPessoaLogadaNaoVeNenhumaTransacao() {
        PessoaNoBanco.nenhuma(jdbc);

        assertThat(contar("SELECT count(*) FROM transacao")).isZero();
        assertThat(contar("SELECT count(*) FROM transacao_excluida")).isZero();
    }

    @Test
    void alterarSemFiltroSoAlteraAsTransacoesDaPessoaLogada() {
        PessoaNoBanco.definir(jdbc, ana);
        int alteradas = jdbc.update("UPDATE transacao SET descricao = 'alterada'");
        int apagadas = jdbc.update("DELETE FROM transacao");

        assertThat(alteradas).isEqualTo(1);
        assertThat(apagadas).isEqualTo(1);
        PessoaNoBanco.definir(jdbc, bia);
        assertThat(contar("SELECT count(*) FROM transacao WHERE descricao IS NULL")).isEqualTo(2);
    }

    @Test
    void naoGravaTransacaoEmNomeDeOutraPessoa() {
        PessoaNoBanco.definir(jdbc, ana);

        assertThatThrownBy(() -> inserirTransacao(bia, "99.00"))
                .isInstanceOf(DataAccessException.class)
                .rootCause()
                .hasMessageContaining("row-level security");
    }

    @Test
    void naoRegistraExclusaoEmNomeDeOutraPessoa() {
        PessoaNoBanco.definir(jdbc, ana);

        assertThatThrownBy(() -> jdbc.update(
                "INSERT INTO transacao_excluida (id, usuario_id) VALUES (?, ?)", UUID.randomUUID(), bia))
                .isInstanceOf(DataAccessException.class)
                .rootCause()
                .hasMessageContaining("row-level security");
    }

    @Test
    void categoriaPropriaSoApareceParaADona() {
        PessoaNoBanco.definir(jdbc, ana);
        jdbc.update("INSERT INTO categoria (nome, tipo, usuario_id) VALUES ('Pets', 'DESPESA', ?)", ana);

        assertThat(contar("SELECT count(*) FROM categoria WHERE nome = 'Pets'")).isEqualTo(1);
        PessoaNoBanco.definir(jdbc, bia);
        assertThat(contar("SELECT count(*) FROM categoria WHERE nome = 'Pets'")).isZero();
    }

    @Test
    void categoriasDoSistemaAparecemParaTodosMesmoSemPessoaLogada() {
        PessoaNoBanco.nenhuma(jdbc);

        assertThat(contar("SELECT count(*) FROM categoria WHERE sistema")).isPositive();
        assertThat(contar("SELECT count(*) FROM categoria WHERE NOT sistema")).isZero();
    }

    @Test
    void categoriasDoSistemaNaoMudamPeloApp() {
        PessoaNoBanco.definir(jdbc, ana);

        int alteradas = jdbc.update("UPDATE categoria SET nome = nome || '!' WHERE sistema");
        int apagadas = jdbc.update("DELETE FROM categoria WHERE sistema");

        assertThat(alteradas).isZero();
        assertThat(apagadas).isZero();
    }

    @Test
    void naoCriaCategoriaDoSistemaPeloApp() {
        PessoaNoBanco.definir(jdbc, ana);

        assertThatThrownBy(() -> jdbc.update(
                "INSERT INTO categoria (nome, tipo, sistema) VALUES ('Intrusa', 'DESPESA', TRUE)"))
                .isInstanceOf(DataAccessException.class)
                .rootCause()
                .hasMessageContaining("row-level security");
    }

    private UUID criarUsuario(String email) {
        return jdbc.queryForObject(
                "INSERT INTO usuario (email, senha_hash) VALUES (?, '!sem-login') RETURNING id", UUID.class, email);
    }

    private void inserirTransacao(UUID dono, String valor) {
        jdbc.update("INSERT INTO transacao (usuario_id, categoria_id, valor, data) VALUES (?, ?, CAST(? AS NUMERIC), CURRENT_DATE)",
                dono, mercado, valor);
    }

    private int contar(String sql) {
        Integer total = jdbc.queryForObject(sql, Integer.class);
        return total == null ? 0 : total;
    }
}

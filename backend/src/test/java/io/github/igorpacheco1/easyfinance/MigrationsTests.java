package io.github.igorpacheco1.easyfinance;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Confere o resultado das migrations Flyway (V1 e V2) num PostgreSQL real (Testcontainers):
 * as categorias do sistema existem e as restrições do schema recusam dados inválidos.
 *
 * <p>{@code @Transactional} desfaz, ao fim de cada teste, o que ele gravou no banco,
 * para um teste não interferir no outro.
 */
@Import(TestcontainersConfiguration.class)
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class MigrationsTests {

    @Autowired
    private JdbcTemplate jdbc;

    @Test
    void categoriasDoSistemaExistemAposAsMigrations() {
        Integer despesas = jdbc.queryForObject(
                "SELECT count(*) FROM categoria WHERE sistema AND tipo = 'DESPESA'", Integer.class);
        Integer receitas = jdbc.queryForObject(
                "SELECT count(*) FROM categoria WHERE sistema AND tipo = 'RECEITA'", Integer.class);

        assertThat(despesas).isEqualTo(14);
        assertThat(receitas).isEqualTo(5);
    }

    @Test
    void categoriasDoSistemaIncluemAsCategoriasCuringa() {
        // "Outras despesas" e "Outras receitas" garantem que o usuário sempre tem onde lançar.
        Integer curingas = jdbc.queryForObject(
                "SELECT count(*) FROM categoria WHERE sistema AND nome IN ('Outras despesas', 'Outras receitas')",
                Integer.class);

        assertThat(curingas).isEqualTo(2);
    }

    @Test
    void recusaCategoriaComTipoInvalido() {
        // 'OUTRO' cabe nos 10 caracteres da coluna, então quem recusa é a regra CHECK do tipo.
        assertThatThrownBy(() -> jdbc.update(
                "INSERT INTO categoria (nome, tipo) VALUES ('Investimentos', 'OUTRO')"))
                .isInstanceOf(DataIntegrityViolationException.class)
                .hasMessageContaining("ck_categoria_tipo");
    }

    @Test
    void recusaCategoriaComNomeSoDeEspacos() {
        assertThatThrownBy(() -> jdbc.update(
                "INSERT INTO categoria (nome, tipo) VALUES ('   ', 'DESPESA')"))
                .isInstanceOf(DataIntegrityViolationException.class)
                .hasMessageContaining("ck_categoria_nome_nao_vazio");
    }

    @Test
    void recusaCategoriaComNomeRepetidoMesmoComOutrasMaiusculas() {
        // "Mercado" já existe (categoria do sistema).
        assertThatThrownBy(() -> jdbc.update(
                "INSERT INTO categoria (nome, tipo) VALUES ('MERCADO', 'DESPESA')"))
                .isInstanceOf(DataIntegrityViolationException.class)
                .hasMessageContaining("uk_categoria_nome");
    }

    @Test
    void recusaTransacaoComValorZero() {
        UUID mercado = idDaCategoria("Mercado");

        assertThatThrownBy(() -> jdbc.update(
                "INSERT INTO transacao (categoria_id, valor, data) VALUES (?, ?, ?)",
                mercado, BigDecimal.ZERO, LocalDate.of(2026, 10, 28)))
                .isInstanceOf(DataIntegrityViolationException.class)
                .hasMessageContaining("ck_transacao_valor_positivo");
    }

    @Test
    void recusaTransacaoComCategoriaInexistente() {
        assertThatThrownBy(() -> jdbc.update(
                "INSERT INTO transacao (categoria_id, valor, data) VALUES (?, ?, ?)",
                UUID.randomUUID(), new BigDecimal("10.00"), LocalDate.of(2026, 10, 28)))
                .isInstanceOf(DataIntegrityViolationException.class)
                .hasMessageContaining("fk_transacao_categoria");
    }

    @Test
    void naoApagaCategoriaQueTemTransacoes() {
        UUID mercado = idDaCategoria("Mercado");
        jdbc.update("INSERT INTO transacao (categoria_id, valor, data) VALUES (?, ?, ?)",
                mercado, new BigDecimal("52.90"), LocalDate.of(2026, 10, 28));

        assertThatThrownBy(() -> jdbc.update("DELETE FROM categoria WHERE id = ?", mercado))
                .isInstanceOf(DataIntegrityViolationException.class)
                .hasMessageContaining("fk_transacao_categoria");
    }

    @Test
    void guardaOValorExatoComDuasCasasDecimais() {
        UUID mercado = idDaCategoria("Mercado");
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO transacao (id, categoria_id, valor, data) VALUES (?, ?, ?, ?)",
                id, mercado, new BigDecimal("0.10"), LocalDate.of(2026, 10, 28));

        BigDecimal gravado = jdbc.queryForObject(
                "SELECT valor FROM transacao WHERE id = ?", BigDecimal.class, id);

        assertThat(gravado).isEqualByComparingTo("0.10");
    }

    @Test
    void tabelaDeExcluidasRecusaOMesmoIdDuasVezes() {
        // V3 (#98): o id é a chave primária, então cada transação excluída aparece uma vez só.
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO transacao_excluida (id) VALUES (?)", id);
        // Conferido antes do INSERT repetido: depois de um erro, o PostgreSQL recusa qualquer
        // outro comando na mesma transação (e o teste roda dentro de uma, por causa do @Transactional).
        assertThat(jdbc.queryForObject(
                "SELECT excluido_em IS NOT NULL FROM transacao_excluida WHERE id = ?", Boolean.class, id))
                .isTrue();

        assertThatThrownBy(() -> jdbc.update("INSERT INTO transacao_excluida (id) VALUES (?)", id))
                .isInstanceOf(DataIntegrityViolationException.class)
                .hasMessageContaining("pk_transacao_excluida");
    }

    private UUID idDaCategoria(String nome) {
        return jdbc.queryForObject("SELECT id FROM categoria WHERE nome = ?", UUID.class, nome);
    }
}

package io.github.igorpacheco1.guarda;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

/**
 * O app conecta ao banco com um usuário que só lê e grava dados (ADR-0034, #248).
 *
 * <p>É a base do RLS: o dono de uma tabela e os superusuários ignoram as políticas de linha. E se
 * uma falha um dia permitir rodar SQL pelo app, esse usuário não consegue criar, alterar nem apagar
 * tabelas. O {@link JdbcTemplate} aqui usa a mesma conexão do app.
 *
 * <p>As recusas são conferidas na mensagem do próprio PostgreSQL (a causa raiz): a mensagem da
 * exceção do Spring muda conforme o tipo de erro e nem sempre repete o texto do banco.
 */
@Import(TestcontainersConfiguration.class)
@SpringBootTest
@ActiveProfiles("test")
class UsuarioDoAppTests {

    @Autowired
    private JdbcTemplate jdbc;

    @Test
    void oAppConectaComOUsuarioDoApp() {
        String usuario = jdbc.queryForObject("SELECT current_user", String.class);

        assertThat(usuario).isEqualTo(TestcontainersConfiguration.USUARIO_DO_APP);
    }

    @Test
    void oUsuarioDoAppNaoESuperusuario() {
        Boolean superusuario = jdbc.queryForObject(
                "SELECT rolsuper FROM pg_roles WHERE rolname = current_user", Boolean.class);

        assertThat(superusuario).isFalse();
    }

    @Test
    void oUsuarioDoAppNaoEDonoDeNenhumaTabela() {
        Integer tabelas = jdbc.queryForObject(
                "SELECT count(*) FROM pg_tables WHERE schemaname = 'public' AND tableowner = current_user",
                Integer.class);

        assertThat(tabelas).isZero();
    }

    @Test
    void oUsuarioDoAppNaoCriaTabela() {
        assertThatThrownBy(() -> jdbc.execute("CREATE TABLE tabela_intrusa (id integer)"))
                .isInstanceOf(DataAccessException.class)
                .rootCause()
                .hasMessageContaining("permission denied");
    }

    @Test
    void oUsuarioDoAppNaoApagaTabela() {
        assertThatThrownBy(() -> jdbc.execute("DROP TABLE transacao"))
                .isInstanceOf(DataAccessException.class)
                .rootCause()
                .hasMessageContaining("must be owner");
    }

    @Test
    void oUsuarioDoAppNaoAlteraTabela() {
        assertThatThrownBy(() -> jdbc.execute("ALTER TABLE transacao ADD COLUMN intrusa text"))
                .isInstanceOf(DataAccessException.class)
                .rootCause()
                .hasMessageContaining("must be owner");
    }

    @Test
    void oUsuarioDoAppNaoLeOHistoricoDasMigrations() {
        assertThatThrownBy(() -> jdbc.queryForObject(
                "SELECT count(*) FROM flyway_schema_history", Integer.class))
                .isInstanceOf(DataAccessException.class)
                .rootCause()
                .hasMessageContaining("permission denied");
    }

    @Test
    void oUsuarioDoAppLeEGravaDados() {
        // Lê: as categorias do sistema vêm das migrations.
        Integer categorias = jdbc.queryForObject("SELECT count(*) FROM categoria", Integer.class);
        assertThat(categorias).isPositive();

        // Grava e apaga: mesma operação que o app faz numa transação de verdade.
        String chave = "f".repeat(64);
        int gravadas = jdbc.update(
                "INSERT INTO tentativa_login (tipo, chave_hash, criada_em) VALUES ('IP', ?, now())", chave);
        int apagadas = jdbc.update("DELETE FROM tentativa_login WHERE chave_hash = ?", chave);
        assertThat(gravadas).isEqualTo(1);
        assertThat(apagadas).isEqualTo(1);
    }

}

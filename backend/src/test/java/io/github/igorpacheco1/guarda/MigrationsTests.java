package io.github.igorpacheco1.guarda;

import org.junit.jupiter.api.BeforeEach;
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
 * Confere o resultado das migrations Flyway (V1 a V6) num PostgreSQL real (Testcontainers):
 * as categorias do sistema existem e as restrições do schema recusam dados inválidos.
 *
 * <p>Desde a V4 (#123) toda transação e toda categoria personalizada tem dono. Estes testes usam o
 * usuário de teste ({@code UsuarioDeTesteNoBanco}), criado ao subir o contexto.
 *
 * <p>Desde a V10 (#249) as tabelas de dados têm RLS: o teste começa logado como o usuário de teste
 * ({@link PessoaNoBanco}). Num INSERT, o PostgreSQL confere o RLS antes das restrições da tabela;
 * por isso os testes de linhas "sem dono" ou de dono inexistente usam o {@link AdministradorDoBanco},
 * que não passa pelo RLS. Só para comandos que o banco recusa: nada fica gravado.
 *
 * <p>{@code @Transactional} desfaz, ao fim de cada teste, o que ele gravou no banco,
 * para um teste não interferir no outro.
 */
@Import({TestcontainersConfiguration.class, UsuarioDeTesteNoBanco.class})
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class MigrationsTests {

    private static final UUID DONO = UsuarioDeTeste.ID;

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private AdministradorDoBanco administrador;

    @BeforeEach
    void entrarComoODono() {
        PessoaNoBanco.definir(jdbc, DONO);
    }

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
                "INSERT INTO categoria (nome, tipo, usuario_id) VALUES ('Investimentos', 'OUTRO', ?)", DONO))
                .isInstanceOf(DataIntegrityViolationException.class)
                .hasMessageContaining("ck_categoria_tipo");
    }

    @Test
    void recusaCategoriaComNomeSoDeEspacos() {
        assertThatThrownBy(() -> jdbc.update(
                "INSERT INTO categoria (nome, tipo, usuario_id) VALUES ('   ', 'DESPESA', ?)", DONO))
                .isInstanceOf(DataIntegrityViolationException.class)
                .hasMessageContaining("ck_categoria_nome_nao_vazio");
    }

    @Test
    void recusaCategoriaDoSistemaComNomeRepetidoMesmoComOutrasMaiusculas() {
        // "Mercado" já existe (categoria do sistema). Entre as do sistema o nome é único.
        // Pelo app, o RLS já recusa criar categoria do sistema (RlsTests); aqui é a regra do schema.
        assertThatThrownBy(() -> administrador.jdbc().update(
                "INSERT INTO categoria (nome, tipo, sistema) VALUES ('MERCADO', 'DESPESA', TRUE)"))
                .isInstanceOf(DataIntegrityViolationException.class)
                .hasMessageContaining("uk_categoria_nome_sistema");
    }

    @Test
    void recusaCategoriaDoMesmoUsuarioComNomeRepetidoMesmoComOutrasMaiusculas() {
        jdbc.update("INSERT INTO categoria (nome, tipo, usuario_id) VALUES ('Pets', 'DESPESA', ?)", DONO);

        assertThatThrownBy(() -> jdbc.update(
                "INSERT INTO categoria (nome, tipo, usuario_id) VALUES ('PETS', 'DESPESA', ?)", DONO))
                .isInstanceOf(DataIntegrityViolationException.class)
                .hasMessageContaining("uk_categoria_nome_usuario");
    }

    @Test
    void usuariosDiferentesPodemTerCategoriasComOMesmoNome() {
        UUID outro = criarUsuario("outra.pessoa@email.com");
        jdbc.update("INSERT INTO categoria (nome, tipo, usuario_id) VALUES ('Pets', 'DESPESA', ?)", DONO);
        PessoaNoBanco.definir(jdbc, outro);
        jdbc.update("INSERT INTO categoria (nome, tipo, usuario_id) VALUES ('Pets', 'DESPESA', ?)", outro);

        // Cada pessoa vê só a sua (RLS); as duas gravações deram certo, então o nome pode repetir.
        assertThat(jdbc.queryForObject("SELECT count(*) FROM categoria WHERE nome = 'Pets'", Integer.class)).isEqualTo(1);
        PessoaNoBanco.definir(jdbc, DONO);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM categoria WHERE nome = 'Pets'", Integer.class)).isEqualTo(1);
    }

    @Test
    void recusaCategoriaPersonalizadaSemDono() {
        // sistema = false (padrão) e sem usuario_id: nem do sistema, nem de ninguém.
        assertThatThrownBy(() -> administrador.jdbc().update(
                "INSERT INTO categoria (nome, tipo) VALUES ('Pets', 'DESPESA')"))
                .isInstanceOf(DataIntegrityViolationException.class)
                .hasMessageContaining("ck_categoria_dono");
    }

    @Test
    void recusaCategoriaDoSistemaComDono() {
        assertThatThrownBy(() -> jdbc.update(
                "INSERT INTO categoria (nome, tipo, sistema, usuario_id) VALUES ('Pets', 'DESPESA', TRUE, ?)", DONO))
                .isInstanceOf(DataIntegrityViolationException.class)
                .hasMessageContaining("ck_categoria_dono");
    }

    @Test
    void categoriasDoSistemaNaoTemDono() {
        Integer comDono = jdbc.queryForObject(
                "SELECT count(*) FROM categoria WHERE sistema AND usuario_id IS NOT NULL", Integer.class);

        assertThat(comDono).isZero();
    }

    @Test
    void recusaTransacaoComValorZero() {
        UUID mercado = idDaCategoria("Mercado");

        assertThatThrownBy(() -> jdbc.update(
                "INSERT INTO transacao (usuario_id, categoria_id, valor, data) VALUES (?, ?, ?, ?)",
                DONO, mercado, BigDecimal.ZERO, LocalDate.of(2026, 10, 28)))
                .isInstanceOf(DataIntegrityViolationException.class)
                .hasMessageContaining("ck_transacao_valor_positivo");
    }

    @Test
    void recusaTransacaoComCategoriaInexistente() {
        assertThatThrownBy(() -> jdbc.update(
                "INSERT INTO transacao (usuario_id, categoria_id, valor, data) VALUES (?, ?, ?, ?)",
                DONO, UUID.randomUUID(), new BigDecimal("10.00"), LocalDate.of(2026, 10, 28)))
                .isInstanceOf(DataIntegrityViolationException.class)
                .hasMessageContaining("fk_transacao_categoria");
    }

    @Test
    void naoApagaCategoriaQueTemTransacoes() {
        // Categoria própria: as do sistema nem podem ser apagadas pelo app (RLS, ver RlsTests).
        UUID pets = jdbc.queryForObject(
                "INSERT INTO categoria (nome, tipo, usuario_id) VALUES ('Pets', 'DESPESA', ?) RETURNING id", UUID.class, DONO);
        jdbc.update("INSERT INTO transacao (usuario_id, categoria_id, valor, data) VALUES (?, ?, ?, ?)",
                DONO, pets, new BigDecimal("52.90"), LocalDate.of(2026, 10, 28));

        assertThatThrownBy(() -> jdbc.update("DELETE FROM categoria WHERE id = ?", pets))
                .isInstanceOf(DataIntegrityViolationException.class)
                .hasMessageContaining("fk_transacao_categoria");
    }

    @Test
    void guardaOValorExatoComDuasCasasDecimais() {
        UUID mercado = idDaCategoria("Mercado");
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO transacao (id, usuario_id, categoria_id, valor, data) VALUES (?, ?, ?, ?, ?)",
                id, DONO, mercado, new BigDecimal("0.10"), LocalDate.of(2026, 10, 28));

        BigDecimal gravado = jdbc.queryForObject(
                "SELECT valor FROM transacao WHERE id = ?", BigDecimal.class, id);

        assertThat(gravado).isEqualByComparingTo("0.10");
    }

    @Test
    void tabelaDeExcluidasRecusaOMesmoIdDuasVezes() {
        // V3 (#98): o id é a chave primária, então cada transação excluída aparece uma vez só.
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO transacao_excluida (id, usuario_id) VALUES (?, ?)", id, DONO);
        // Conferido antes do INSERT repetido: depois de um erro, o PostgreSQL recusa qualquer
        // outro comando na mesma transação (e o teste roda dentro de uma, por causa do @Transactional).
        assertThat(jdbc.queryForObject(
                "SELECT excluido_em IS NOT NULL FROM transacao_excluida WHERE id = ?", Boolean.class, id))
                .isTrue();

        assertThatThrownBy(() -> jdbc.update("INSERT INTO transacao_excluida (id, usuario_id) VALUES (?, ?)", id, DONO))
                .isInstanceOf(DataIntegrityViolationException.class)
                .hasMessageContaining("pk_transacao_excluida");
    }

    // ---------------------------------------------------------------- usuário e dono dos dados (V4, #123)

    @Test
    void usuarioProvisorioExisteNosPerfisDeTeste() {
        Integer total = jdbc.queryForObject("SELECT count(*) FROM usuario WHERE id = ?", Integer.class, DONO);

        assertThat(total).isEqualTo(1);
    }

    @Test
    void recusaUsuarioComEmailRepetido() {
        criarUsuario("ana@email.com");

        assertThatThrownBy(() -> criarUsuario("ana@email.com"))
                .isInstanceOf(DataIntegrityViolationException.class)
                .hasMessageContaining("uk_usuario_email");
    }

    @Test
    void recusaEmailComLetrasMaiusculas() {
        // A aplicação grava em minúsculas; o banco garante, para "Ana@x.com" e "ana@x.com" não virarem duas contas.
        assertThatThrownBy(() -> criarUsuario("Ana@Email.com"))
                .isInstanceOf(DataIntegrityViolationException.class)
                .hasMessageContaining("ck_usuario_email_minusculo");
    }

    @Test
    void recusaUsuarioComEmailVazio() {
        assertThatThrownBy(() -> criarUsuario("   "))
                .isInstanceOf(DataIntegrityViolationException.class)
                .hasMessageContaining("ck_usuario_email_nao_vazio");
    }

    @Test
    void recusaTransacaoSemDono() {
        UUID mercado = idDaCategoria("Mercado");

        assertThatThrownBy(() -> administrador.jdbc().update(
                "INSERT INTO transacao (categoria_id, valor, data) VALUES (?, ?, ?)",
                mercado, new BigDecimal("10.00"), LocalDate.of(2026, 10, 28)))
                .isInstanceOf(DataIntegrityViolationException.class)
                .hasMessageContaining("usuario_id");
    }

    @Test
    void recusaTransacaoDeUsuarioInexistente() {
        UUID mercado = idDaCategoria("Mercado");

        assertThatThrownBy(() -> administrador.jdbc().update(
                "INSERT INTO transacao (usuario_id, categoria_id, valor, data) VALUES (?, ?, ?, ?)",
                UUID.randomUUID(), mercado, new BigDecimal("10.00"), LocalDate.of(2026, 10, 28)))
                .isInstanceOf(DataIntegrityViolationException.class)
                .hasMessageContaining("fk_transacao_usuario");
    }

    @Test
    void recusaIdExcluidoSemDono() {
        assertThatThrownBy(() -> administrador.jdbc().update("INSERT INTO transacao_excluida (id) VALUES (?)", UUID.randomUUID()))
                .isInstanceOf(DataIntegrityViolationException.class)
                .hasMessageContaining("usuario_id");
    }

    @Test
    void excluirOUsuarioApagaOsDadosDeleMasNaoOsDeOutraPessoaNemOsDoSistema() {
        // Base da "excluir minha conta" (LGPD): ON DELETE CASCADE leva tudo que é do usuário.
        UUID saindo = criarUsuario("vai.sair@email.com");
        UUID ficando = criarUsuario("vai.ficar@email.com");
        UUID mercado = idDaCategoria("Mercado");
        for (UUID dono : new UUID[]{saindo, ficando}) {
            PessoaNoBanco.definir(jdbc, dono);
            jdbc.update("INSERT INTO categoria (nome, tipo, usuario_id) VALUES ('Pets', 'DESPESA', ?)", dono);
            jdbc.update("INSERT INTO transacao (usuario_id, categoria_id, valor, data) VALUES (?, ?, ?, ?)",
                    dono, mercado, new BigDecimal("10.00"), LocalDate.of(2026, 10, 28));
            jdbc.update("INSERT INTO transacao_excluida (id, usuario_id) VALUES (?, ?)", UUID.randomUUID(), dono);
        }

        jdbc.update("DELETE FROM usuario WHERE id = ?", saindo);

        PessoaNoBanco.definir(jdbc, saindo);
        assertThat(contar("transacao", saindo)).isZero();
        assertThat(contar("transacao_excluida", saindo)).isZero();
        assertThat(contar("categoria", saindo)).isZero();
        PessoaNoBanco.definir(jdbc, ficando);
        assertThat(contar("transacao", ficando)).isEqualTo(1);
        assertThat(contar("transacao_excluida", ficando)).isEqualTo(1);
        assertThat(contar("categoria", ficando)).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM categoria WHERE sistema", Integer.class)).isEqualTo(19);
    }

    private int contar(String tabela, UUID usuario) {
        // O nome da tabela vem sempre de um literal deste arquivo, nunca de entrada de alguém.
        return jdbc.queryForObject("SELECT count(*) FROM " + tabela + " WHERE usuario_id = ?", Integer.class, usuario);
    }

    private UUID criarUsuario(String email) {
        return jdbc.queryForObject(
                "INSERT INTO usuario (email, senha_hash) VALUES (?, '!sem-login') RETURNING id", UUID.class, email);
    }

    private UUID idDaCategoria(String nome) {
        return jdbc.queryForObject("SELECT id FROM categoria WHERE nome = ?", UUID.class, nome);
    }

    // ---------------------------------------------------------------- sessão (V5, #125)

    @Test
    void asTabelasDaSessaoExistemAposAsMigrations() {
        Integer tabelas = jdbc.queryForObject(
                "SELECT count(*) FROM information_schema.tables WHERE table_name IN ('spring_session', 'spring_session_attributes')",
                Integer.class);

        assertThat(tabelas).isEqualTo(2);
    }

    // ---------------------------------------------------------------- tentativas de login (V6, #126)

    @Test
    void tentativaDeLoginAceitaEmailEIpERecusaOutroTipo() {
        String hash = "a".repeat(64);
        jdbc.update("INSERT INTO tentativa_login (tipo, chave_hash, criada_em) VALUES ('EMAIL', ?, now())", hash);
        jdbc.update("INSERT INTO tentativa_login (tipo, chave_hash, criada_em) VALUES ('IP', ?, now())", hash);

        assertThatThrownBy(() -> jdbc.update(
                "INSERT INTO tentativa_login (tipo, chave_hash, criada_em) VALUES ('OUTRO', ?, now())", hash))
                .hasMessageContaining("ck_tentativa_login_tipo");
    }
}

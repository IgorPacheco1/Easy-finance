package io.github.igorpacheco1.guarda.transacao;

import com.jayway.jsonpath.JsonPath;
import io.github.igorpacheco1.guarda.PessoaNoBanco;
import io.github.igorpacheco1.guarda.ComoUsuarioDeTeste;
import io.github.igorpacheco1.guarda.TestcontainersConfiguration;
import io.github.igorpacheco1.guarda.UsuarioDeTesteNoBanco;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.convention.TestBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Prova, de ponta a ponta, que uma pessoa não enxerga nem altera as transações de outra (#129).
 *
 * <p>Quem faz os pedidos é o usuário de teste. O "outro usuário" é criado direto no banco, com
 * as transações dele, e os testes conferem que nada disso aparece (nem muda) para o primeiro.
 */
@ComoUsuarioDeTeste
@Import({TestcontainersConfiguration.class, UsuarioDeTesteNoBanco.class})
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class TransacaoIsolamentoApiTests {

    private static final String URL = "/api/v1/transacoes";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbc;

    /** Substitui o Clock da aplicação pelo que o método {@link #clock()} devolve. */
    @TestBean
    private Clock clock;

    private UUID mercado;
    private UUID outro;

    static Clock clock() {
        return Clock.fixed(Instant.parse("2026-11-03T12:00:00Z"), ZoneOffset.UTC);
    }

    @BeforeEach
    void prepararOutroUsuario() {
        mercado = jdbc.queryForObject("SELECT id FROM categoria WHERE sistema AND nome = 'Mercado'", UUID.class);
        outro = UUID.randomUUID();
        jdbc.update("INSERT INTO usuario (id, email, senha_hash) VALUES (?, ?, 'x')", outro, "outro-" + outro + "@email.com");
    }

    // ---------------------------------------------------------------- leitura

    @Test
    void listarNaoMostraTransacaoDeOutroUsuario() throws Exception {
        transacaoDoOutro("20.00", "2026-11-02", mercado);
        criar("30.00", "2026-11-03", "minha", mercado).andExpect(status().isCreated());

        mockMvc.perform(get(URL))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.itens", hasSize(1)))
                .andExpect(jsonPath("$.itens[0].descricao").value("minha"));
    }

    @Test
    void buscarTransacaoDeOutroUsuarioRetorna404() throws Exception {
        UUID id = transacaoDoOutro("20.00", "2026-11-02", mercado);

        mockMvc.perform(get(URL + "/" + id)).andExpect(status().isNotFound());
    }

    @Test
    void saldoEResumoContamSoAsTransacoesDoProprioUsuario() throws Exception {
        transacaoDoOutro("500.00", "2026-11-02", mercado);
        criar("30.00", "2026-11-03", null, mercado).andExpect(status().isCreated());

        String saldo = mockMvc.perform(get("/api/v1/saldo").param("de", "2026-11-01").param("ate", "2026-11-30"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        assertThat(numero(saldo, "$.despesas")).isEqualByComparingTo("30.00");

        String resumo = mockMvc.perform(get("/api/v1/resumo").param("de", "2026-11-01").param("ate", "2026-11-30"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.despesas.categorias", hasSize(1)))
                .andReturn().getResponse().getContentAsString();
        assertThat(numero(resumo, "$.despesas.total")).isEqualByComparingTo("30.00");
        assertThat(numero(resumo, "$.despesas.categorias[0].percentual")).isEqualByComparingTo("100.0");
    }

    // ---------------------------------------------------------------- escrita

    @Test
    void editarTransacaoDeOutroUsuarioRetorna404ENaoMuda() throws Exception {
        UUID id = transacaoDoOutro("20.00", "2026-11-02", mercado);

        mockMvc.perform(put(URL + "/" + id).contentType(MediaType.APPLICATION_JSON)
                        .content(corpo("99.00", "2026-11-02", "invadida", mercado)))
                .andExpect(status().isNotFound());

        PessoaNoBanco.definir(jdbc, outro); // confere como o dono: com o RLS, só ele vê a transação
        assertThat(jdbc.queryForObject("SELECT valor FROM transacao WHERE id = ?", BigDecimal.class, id))
                .isEqualByComparingTo("20.00");
    }

    @Test
    void excluirTransacaoDeOutroUsuarioRetorna404ENaoApaga() throws Exception {
        UUID id = transacaoDoOutro("20.00", "2026-11-02", mercado);

        mockMvc.perform(delete(URL + "/" + id)).andExpect(status().isNotFound());

        PessoaNoBanco.definir(jdbc, outro);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM transacao WHERE id = ?", Integer.class, id)).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM transacao_excluida WHERE id = ?", Integer.class, id)).isZero();
    }

    // ---------------------------------------------------------------- categoria de outro usuário

    @Test
    void lancarEmCategoriaDeOutroUsuarioRetorna400() throws Exception {
        UUID categoriaDoOutro = categoriaDoOutro("Pets do outro");

        criar("10.00", "2026-11-03", null, categoriaDoOutro)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erros[0].campo").value("categoriaId"))
                .andExpect(jsonPath("$.erros[0].mensagem").value("Categoria não encontrada."));
    }

    @Test
    void trocarParaCategoriaDeOutroUsuarioRetorna400() throws Exception {
        UUID categoriaDoOutro = categoriaDoOutro("Pets do outro");
        String id = JsonPath.read(criar("10.00", "2026-11-03", null, mercado)
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString(), "$.id");

        mockMvc.perform(put(URL + "/" + id).contentType(MediaType.APPLICATION_JSON)
                        .content(corpo("10.00", "2026-11-03", null, categoriaDoOutro)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erros[0].campo").value("categoriaId"));
    }

    @Test
    void filtrarPorCategoriaDeOutroUsuarioRetorna400() throws Exception {
        UUID categoriaDoOutro = categoriaDoOutro("Pets do outro");

        mockMvc.perform(get(URL).param("categoriaId", categoriaDoOutro.toString()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erros[0].campo").value("categoriaId"));
    }

    // ---------------------------------------------------------------- id escolhido pelo cliente

    @Test
    void enviarIdQueJaEDeOutroUsuarioRetorna409ENaoMexeNaTransacaoDele() throws Exception {
        UUID id = transacaoDoOutro("20.00", "2026-11-02", mercado);

        criarComId(id, "99.00", "2026-11-03", mercado).andExpect(status().isConflict());

        PessoaNoBanco.definir(jdbc, outro);
        assertThat(jdbc.queryForObject("SELECT valor FROM transacao WHERE id = ?", BigDecimal.class, id))
                .isEqualByComparingTo("20.00");
        assertThat(jdbc.queryForObject("SELECT usuario_id FROM transacao WHERE id = ?", UUID.class, id))
                .isEqualTo(outro);
    }

    @Test
    void idExcluidoPorOutroUsuarioNaoDa410() throws Exception {
        // O 410 não pode revelar que esse id existiu para outra pessoa: aqui o lançamento é criado.
        UUID id = UUID.randomUUID();
        PessoaNoBanco.definir(jdbc, outro);
        jdbc.update("INSERT INTO transacao_excluida (id, usuario_id, excluido_em) VALUES (?, ?, now())", id, outro);

        criarComId(id, "10.00", "2026-11-03", mercado).andExpect(status().isCreated());
    }

    @Test
    void idExcluidoPeloProprioUsuarioContinuaDando410() throws Exception {
        String id = JsonPath.read(criar("10.00", "2026-11-03", null, mercado)
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString(), "$.id");
        mockMvc.perform(delete(URL + "/" + id)).andExpect(status().isNoContent());

        criarComId(UUID.fromString(id), "10.00", "2026-11-03", mercado).andExpect(status().isGone());
    }

    // ---------------------------------------------------------------- auxiliares

    private ResultActions criar(String valor, String data, String descricao, UUID categoriaId) throws Exception {
        return mockMvc.perform(post(URL).contentType(MediaType.APPLICATION_JSON)
                .content(corpo(valor, data, descricao, categoriaId)));
    }

    private ResultActions criarComId(UUID id, String valor, String data, UUID categoriaId) throws Exception {
        return mockMvc.perform(post(URL).contentType(MediaType.APPLICATION_JSON).content("""
                {"id": "%s", "valor": %s, "data": "%s", "categoriaId": "%s"}
                """.formatted(id, valor, data, categoriaId)));
    }

    private static String corpo(String valor, String data, String descricao, UUID categoriaId) {
        String descricaoJson = (descricao == null) ? "null" : "\"" + descricao + "\"";
        return """
                {"valor": %s, "data": "%s", "descricao": %s, "categoriaId": "%s"}
                """.formatted(valor, data, descricaoJson, categoriaId);
    }

    /** Grava direto no banco uma transação do outro usuário. */
    private UUID transacaoDoOutro(String valor, String data, UUID categoriaId) {
        PessoaNoBanco.definir(jdbc, outro); // com o RLS, só o próprio dono grava (a próxima requisição volta ao usuário de teste)
        return jdbc.queryForObject(
                "INSERT INTO transacao (usuario_id, categoria_id, valor, data) VALUES (?, ?, CAST(? AS NUMERIC), CAST(? AS DATE)) RETURNING id",
                UUID.class, outro, categoriaId, valor, data);
    }

    /** Grava direto no banco uma categoria personalizada do outro usuário. */
    private UUID categoriaDoOutro(String nome) {
        UUID id = UUID.randomUUID();
        PessoaNoBanco.definir(jdbc, outro);
        jdbc.update("INSERT INTO categoria (id, nome, tipo, sistema, usuario_id) VALUES (?, ?, 'DESPESA', FALSE, ?)",
                id, nome, outro);
        return id;
    }

    private static BigDecimal numero(String json, String caminho) {
        return new BigDecimal(JsonPath.read(json, caminho).toString());
    }
}

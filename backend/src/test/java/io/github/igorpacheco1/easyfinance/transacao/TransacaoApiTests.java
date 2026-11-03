package io.github.igorpacheco1.easyfinance.transacao;

import com.jayway.jsonpath.JsonPath;
import io.github.igorpacheco1.easyfinance.TestcontainersConfiguration;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.matchesPattern;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Testa a API de transações de ponta a ponta, com PostgreSQL real (Testcontainers).
 * Usa as categorias do sistema "Mercado" (DESPESA) e "Salário" (RECEITA).
 *
 * <p>{@code @Transactional} desfaz o que cada teste gravou: todo teste começa sem transações.
 */
@Import(TestcontainersConfiguration.class)
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class TransacaoApiTests {

    private static final String URL = "/api/v1/transacoes";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbc;

    /**
     * O Hibernate guarda INSERTs e UPDATEs e só os envia ao banco no fim da transação (ou antes
     * de uma consulta feita por ele). Os testes que leem o banco direto por SQL (JdbcTemplate)
     * chamam {@code entityManager.flush()} antes, para enviar o que está pendente.
     */
    @Autowired
    private EntityManager entityManager;

    private UUID mercado;
    private UUID salario;

    @BeforeEach
    void buscarCategoriasDoSistema() {
        mercado = idDaCategoria("Mercado");
        salario = idDaCategoria("Salário");
    }

    // ---------------------------------------------------------------- criar

    @Test
    void criarRetorna201ComACategoriaResumida() throws Exception {
        criar("52.90", "2026-11-03", "  Feira  ", mercado)
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", matchesPattern(".*/api/v1/transacoes/[0-9a-f-]{36}$")))
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.valor").value(52.90))
                .andExpect(jsonPath("$.data").value("2026-11-03"))
                .andExpect(jsonPath("$.descricao").value("Feira"))
                .andExpect(jsonPath("$.categoria.id").value(mercado.toString()))
                .andExpect(jsonPath("$.categoria.nome").value("Mercado"))
                .andExpect(jsonPath("$.categoria.tipo").value("DESPESA"));
    }

    @Test
    void criarGuardaOValorExatoNoBanco() throws Exception {
        String id = idDaCriada("52.90", "2026-11-03", null, mercado);
        entityManager.flush();

        BigDecimal valor = jdbc.queryForObject(
                "SELECT valor FROM transacao WHERE id = ?", BigDecimal.class, UUID.fromString(id));
        assertThat(valor).isEqualByComparingTo("52.90");
    }

    @Test
    void criarSemDescricaoOuComDescricaoEmBrancoGuardaSemDescricao() throws Exception {
        criar("10.00", "2026-11-03", null, mercado)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.descricao").value(nullValue()));
        criar("10.00", "2026-11-03", "   ", mercado)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.descricao").value(nullValue()));
    }

    @Test
    void criarComCategoriaInexistenteRetorna400NoCampoCategoriaId() throws Exception {
        criar("10.00", "2026-11-03", null, UUID.randomUUID())
                .andExpect(status().isBadRequest())
                .andExpect(content().contentType(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.title").value("Dados inválidos"))
                .andExpect(jsonPath("$.erros", hasSize(1)))
                .andExpect(jsonPath("$.erros[0].campo").value("categoriaId"))
                .andExpect(jsonPath("$.erros[0].mensagem").value("Categoria não encontrada."));
    }

    @Test
    void criarSemOsCamposObrigatoriosRetorna400ComTodosOsCampos() throws Exception {
        mockMvc.perform(post(URL).contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erros", hasSize(3)))
                .andExpect(jsonPath("$.erros[*].campo", contains("categoriaId", "data", "valor")));
    }

    @Test
    void criarComDataEmFormatoErradoRetorna400() throws Exception {
        criar("10.00", "03/11/2026", null, mercado)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("Valor inválido para o campo 'data'."));
    }

    // ---------------------------------------------------------------- listar e buscar

    @Test
    void listarSemTransacoesRetornaListaVazia() throws Exception {
        mockMvc.perform(get(URL))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    void listarTrazDaMaisRecenteParaAMaisAntiga() throws Exception {
        criar("1.00", "2026-10-01", "antiga", mercado);
        criar("2.00", "2026-11-03", "recente", mercado);
        criar("3.00", "2026-10-15", "meio", salario);

        mockMvc.perform(get(URL))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].descricao", contains("recente", "meio", "antiga")));
    }

    @Test
    void buscarPorIdRetornaATransacao() throws Exception {
        String id = idDaCriada("52.90", "2026-11-03", "Feira", mercado);

        mockMvc.perform(get(URL + "/" + id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id))
                .andExpect(jsonPath("$.categoria.nome").value("Mercado"));
    }

    @Test
    void buscarIdInexistenteRetorna404() throws Exception {
        mockMvc.perform(get(URL + "/" + UUID.randomUUID()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.title").value("Transação não encontrada"));
    }

    // ---------------------------------------------------------------- atualizar

    @Test
    void atualizarSubstituiTodosOsCampos() throws Exception {
        String id = idDaCriada("52.90", "2026-11-03", "Feira", mercado);

        atualizar(id, "60.00", "2026-11-02", null, mercado)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.valor").value(60.00))
                .andExpect(jsonPath("$.data").value("2026-11-02"))
                .andExpect(jsonPath("$.descricao").value(nullValue()));
    }

    @Test
    void atualizarPodeTrocarParaUmaCategoriaDeOutroTipo() throws Exception {
        // Lançou o salário como despesa por engano e corrigiu.
        String id = idDaCriada("3000.00", "2026-11-05", "Salário", mercado);

        atualizar(id, "3000.00", "2026-11-05", "Salário", salario)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.categoria.nome").value("Salário"))
                .andExpect(jsonPath("$.categoria.tipo").value("RECEITA"));
    }

    @Test
    void atualizarMudaAtualizadoEm() throws Exception {
        String id = idDaCriada("10.00", "2026-11-03", null, mercado);
        entityManager.flush();
        // Data antiga gravada direto no banco, para a mudança ser visível no teste.
        jdbc.update("UPDATE transacao SET atualizado_em = '2000-01-01T00:00:00Z' WHERE id = ?", UUID.fromString(id));

        atualizar(id, "20.00", "2026-11-03", null, mercado).andExpect(status().isOk());
        entityManager.flush();

        Boolean mudou = jdbc.queryForObject(
                "SELECT atualizado_em > '2000-01-01T00:00:00Z' FROM transacao WHERE id = ?",
                Boolean.class, UUID.fromString(id));
        assertThat(mudou).isTrue();
    }

    @Test
    void atualizarComCategoriaInexistenteRetorna400() throws Exception {
        String id = idDaCriada("10.00", "2026-11-03", null, mercado);

        atualizar(id, "10.00", "2026-11-03", null, UUID.randomUUID())
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erros[0].campo").value("categoriaId"));
    }

    @Test
    void atualizarIdInexistenteRetorna404() throws Exception {
        atualizar(UUID.randomUUID().toString(), "10.00", "2026-11-03", null, mercado)
                .andExpect(status().isNotFound());
    }

    // ---------------------------------------------------------------- excluir

    @Test
    void excluirRetorna204EATransacaoDeixaDeExistir() throws Exception {
        String id = idDaCriada("10.00", "2026-11-03", null, mercado);

        mockMvc.perform(delete(URL + "/" + id)).andExpect(status().isNoContent());
        mockMvc.perform(get(URL + "/" + id)).andExpect(status().isNotFound());
    }

    @Test
    void excluirIdInexistenteRetorna404() throws Exception {
        mockMvc.perform(delete(URL + "/" + UUID.randomUUID()))
                .andExpect(status().isNotFound());
    }

    // ---------------------------------------------------------------- auxiliares

    private ResultActions criar(String valor, String data, String descricao, UUID categoriaId) throws Exception {
        return mockMvc.perform(post(URL).contentType(MediaType.APPLICATION_JSON)
                .content(corpo(valor, data, descricao, categoriaId)));
    }

    private ResultActions atualizar(String id, String valor, String data, String descricao, UUID categoriaId)
            throws Exception {
        return mockMvc.perform(put(URL + "/" + id).contentType(MediaType.APPLICATION_JSON)
                .content(corpo(valor, data, descricao, categoriaId)));
    }

    private String idDaCriada(String valor, String data, String descricao, UUID categoriaId) throws Exception {
        String resposta = criar(valor, data, descricao, categoriaId)
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return JsonPath.read(resposta, "$.id");
    }

    /** Monta o JSON. O valor vai como número (sem aspas), como define o ADR-0007. */
    private static String corpo(String valor, String data, String descricao, UUID categoriaId) {
        String descricaoJson = (descricao == null) ? "null" : "\"" + descricao + "\"";
        return """
                {"valor": %s, "data": "%s", "descricao": %s, "categoriaId": "%s"}
                """.formatted(valor, data, descricaoJson, categoriaId);
    }

    private UUID idDaCategoria(String nome) {
        return jdbc.queryForObject("SELECT id FROM categoria WHERE sistema AND nome = ?", UUID.class, nome);
    }
}

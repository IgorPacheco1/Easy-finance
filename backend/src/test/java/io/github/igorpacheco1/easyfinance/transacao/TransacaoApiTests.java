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
 *
 * <p>O relógio da aplicação fica parado em 03/11/2026 ({@code @TestBean}), para as regras de
 * data darem o mesmo resultado em qualquer dia em que o teste rodar.
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

    /** Substitui o Clock da aplicação pelo que o método {@link #clock()} devolve. */
    @TestBean
    private Clock clock;

    private UUID mercado;
    private UUID salario;

    static Clock clock() {
        return Clock.fixed(Instant.parse("2026-11-03T12:00:00Z"), ZoneOffset.UTC);
    }

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
    void listarPorPeriodoIncluiOsDiasDasPontas() throws Exception {
        criar("1.00", "2026-09-30", "antes", mercado);
        criar("2.00", "2026-10-01", "primeiro dia", mercado);
        criar("3.00", "2026-10-31", "último dia", mercado);
        criar("4.00", "2026-11-01", "depois", mercado);

        mockMvc.perform(get(URL).param("de", "2026-10-01").param("ate", "2026-10-31"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].descricao", contains("último dia", "primeiro dia")));
    }

    @Test
    void listarPorPeriodoDeUmDiaSo() throws Exception {
        criar("1.00", "2026-10-31", "outro dia", mercado);
        criar("2.00", "2026-11-01", "o dia", mercado);

        mockMvc.perform(get(URL).param("de", "2026-11-01").param("ate", "2026-11-01"))
                .andExpect(jsonPath("$[*].descricao", contains("o dia")));
    }

    @Test
    void listarComSoUmaDasDatasRetorna400() throws Exception {
        mockMvc.perform(get(URL).param("de", "2026-11-01"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erros[0].campo").value("ate"));
        mockMvc.perform(get(URL).param("ate", "2026-11-30"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erros[0].campo").value("de"));
    }

    @Test
    void listarComDataInicialDepoisDaFinalRetorna400() throws Exception {
        mockMvc.perform(get(URL).param("de", "2026-11-30").param("ate", "2026-11-01"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erros[0].campo").value("ate"))
                .andExpect(jsonPath("$.erros[0].mensagem").value(
                        "A data final deve ser igual ou posterior à data inicial."));
    }

    @Test
    void listarComDataEmFormatoErradoRetorna400() throws Exception {
        mockMvc.perform(get(URL).param("de", "01/11/2026").param("ate", "2026-11-30"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.title").value("Parâmetro inválido"));
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

    // ---------------------------------------------------------------- validação (#20)

    @Test
    void valorZeroOuNegativoRetorna400() throws Exception {
        criar("0.00", "2026-11-03", null, mercado)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erros[0].campo").value("valor"))
                .andExpect(jsonPath("$.erros[0].mensagem").value("O valor deve ser maior que zero."));
        criar("-10.00", "2026-11-03", null, mercado)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erros[0].mensagem").value("O valor deve ser maior que zero."));
    }

    @Test
    void valorComMaisDeDuasCasasDecimaisRetorna400() throws Exception {
        criar("10.555", "2026-11-03", null, mercado)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erros", hasSize(1)))
                .andExpect(jsonPath("$.erros[0].campo").value("valor"))
                .andExpect(jsonPath("$.erros[0].mensagem").value(
                        "O valor deve ter no máximo 2 casas decimais e 17 dígitos antes da vírgula."));
    }

    @Test
    void valorDeUmCentavoEhAceito() throws Exception {
        criar("0.01", "2026-11-03", null, mercado).andExpect(status().isCreated());
    }

    @Test
    void descricaoComAte255CaracteresEhAceita() throws Exception {
        criar("10.00", "2026-11-03", "a".repeat(255), mercado).andExpect(status().isCreated());
    }

    @Test
    void descricaoComMaisDe255CaracteresRetorna400() throws Exception {
        criar("10.00", "2026-11-03", "a".repeat(256), mercado)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erros[0].campo").value("descricao"))
                .andExpect(jsonPath("$.erros[0].mensagem").value("A descrição deve ter no máximo 255 caracteres."));
    }

    @Test
    void dataNosLimitesDeUmAnoEhAceita() throws Exception {
        criar("10.00", "2025-11-03", null, mercado).andExpect(status().isCreated());
        criar("10.00", "2027-11-03", null, mercado).andExpect(status().isCreated());
    }

    @Test
    void dataMaisDeUmAnoNoPassadoRetorna400() throws Exception {
        criar("10.00", "2025-11-02", null, mercado)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erros[0].campo").value("data"))
                .andExpect(jsonPath("$.erros[0].mensagem").value("A data deve estar entre 03/11/2025 e 03/11/2027."));
    }

    @Test
    void dataMaisDeUmAnoNoFuturoRetorna400() throws Exception {
        // O erro típico que a regra pega: "2062" digitado no lugar de "2026".
        criar("10.00", "2062-11-03", null, mercado)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erros[0].campo").value("data"));
    }

    @Test
    void editarLancamentoAntigoSemMudarADataEhPermitido() throws Exception {
        UUID id = transacaoAntigaGravadaNoBanco();

        atualizar(id.toString(), "10.00", "2020-01-15", "descrição corrigida", mercado)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.descricao").value("descrição corrigida"));
    }

    @Test
    void editarLancamentoAntigoMudandoParaOutraDataForaDoLimiteRetorna400() throws Exception {
        UUID id = transacaoAntigaGravadaNoBanco();

        atualizar(id.toString(), "10.00", "2020-02-15", null, mercado)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erros[0].campo").value("data"));
    }

    @Test
    void editarMudandoADataParaDentroDoLimiteEhPermitido() throws Exception {
        UUID id = transacaoAntigaGravadaNoBanco();

        atualizar(id.toString(), "10.00", "2026-11-01", null, mercado)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").value("2026-11-01"));
    }

    // ---------------------------------------------------------------- criação idempotente (#19)

    @Test
    void criarComIdDoClienteUsaEsseId() throws Exception {
        UUID id = UUID.randomUUID();

        criarComId(id, "52.90", "2026-11-03", "Feira", mercado)
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", matchesPattern(".*/api/v1/transacoes/" + id + "$")))
                .andExpect(jsonPath("$.id").value(id.toString()));
    }

    @Test
    void reenvioIdenticoRetorna200ComATransacaoExistenteSemDuplicar() throws Exception {
        UUID id = UUID.randomUUID();
        criarComId(id, "52.90", "2026-11-03", "Feira", mercado).andExpect(status().isCreated());

        criarComId(id, "52.90", "2026-11-03", "Feira", mercado)
                .andExpect(status().isOk())
                .andExpect(header().doesNotExist("Location"))
                .andExpect(jsonPath("$.id").value(id.toString()))
                .andExpect(jsonPath("$.descricao").value("Feira"));

        mockMvc.perform(get(URL)).andExpect(jsonPath("$", hasSize(1)));
    }

    @Test
    void reenvioComDiferencasSoDeFormatoContaComoIdentico() throws Exception {
        UUID id = UUID.randomUUID();
        criarComId(id, "52.90", "2026-11-03", "Feira", mercado).andExpect(status().isCreated());

        // 52.9 = 52.90 e " Feira " = "Feira" depois de remover os espaços.
        criarComId(id, "52.9", "2026-11-03", "  Feira ", mercado).andExpect(status().isOk());
    }

    @Test
    void mesmoIdComDadosDiferentesRetorna409() throws Exception {
        UUID id = UUID.randomUUID();
        criarComId(id, "52.90", "2026-11-03", "Feira", mercado).andExpect(status().isCreated());

        criarComId(id, "60.00", "2026-11-03", "Feira", mercado)
                .andExpect(status().isConflict())
                .andExpect(content().contentType(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.title").value("Conflito de identificador"));

        // A transação original continua intacta.
        mockMvc.perform(get(URL + "/" + id)).andExpect(jsonPath("$.valor").value(52.90));
    }

    @Test
    void reenvioDepoisDeUmaEdicaoRetorna409() throws Exception {
        // O cliente criou, editou e depois chegou um reenvio atrasado da criação original.
        UUID id = UUID.randomUUID();
        criarComId(id, "52.90", "2026-11-03", "Feira", mercado).andExpect(status().isCreated());
        atualizar(id.toString(), "52.90", "2026-11-03", "Feira do sábado", mercado).andExpect(status().isOk());

        criarComId(id, "52.90", "2026-11-03", "Feira", mercado).andExpect(status().isConflict());
    }

    @Test
    void idMalFormatadoNoCorpoRetorna400() throws Exception {
        mockMvc.perform(post(URL).contentType(MediaType.APPLICATION_JSON).content("""
                        {"id": "abc", "valor": 10.00, "data": "2026-11-03", "categoriaId": "%s"}
                        """.formatted(mercado)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("Valor inválido para o campo 'id'."));
    }

    // ---------------------------------------------------------------- auxiliares

    private ResultActions criarComId(UUID id, String valor, String data, String descricao, UUID categoriaId)
            throws Exception {
        String corpoComId = """
                {"id": "%s", "valor": %s, "data": "%s", "descricao": "%s", "categoriaId": "%s"}
                """.formatted(id, valor, data, descricao, categoriaId);
        return mockMvc.perform(post(URL).contentType(MediaType.APPLICATION_JSON).content(corpoComId));
    }

    /**
     * Grava direto no banco um lançamento de 15/01/2020, como se tivesse sido feito anos atrás.
     * Pela API não daria, justamente por causa da regra de data.
     */
    private UUID transacaoAntigaGravadaNoBanco() {
        return jdbc.queryForObject(
                "INSERT INTO transacao (categoria_id, valor, data) VALUES (?, 10.00, '2020-01-15') RETURNING id",
                UUID.class, mercado);
    }

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

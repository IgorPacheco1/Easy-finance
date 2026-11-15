package io.github.igorpacheco1.easyfinance.isolamento;

import com.jayway.jsonpath.JsonPath;
import io.github.igorpacheco1.easyfinance.TestcontainersConfiguration;
import jakarta.servlet.http.Cookie;
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
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Prova, de ponta a ponta e com <b>duas sessões reais</b>, que uma pessoa não enxerga nem altera
 * os dados de outra (M5, #131). É o critério que diz se o isolamento do M5 está pronto.
 *
 * <p>Diferente dos testes de API das issues #128 e #129 (que simulam o usuário logado), aqui Ana e
 * Bia se cadastram pelo endpoint de verdade, cada uma com o próprio cookie de sessão e o próprio
 * token CSRF, como dois navegadores. Todo teste roda nos dois sentidos: Ana contra os dados da
 * Bia e Bia contra os da Ana. Cada uma tem uma categoria própria, uma transação nela, uma transação
 * na categoria do sistema e uma transação excluída.
 *
 * <p>Os valores são bem diferentes entre as duas (para qualquer soma que misture os dados ficar
 * errada) e cada texto tem um marcador exclusivo (para a busca por descrição também denunciar um
 * vazamento).
 *
 * <p>{@code @Transactional} desfaz o que cada teste gravou.
 */
@Import(TestcontainersConfiguration.class)
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class IsolamentoEntreUsuariosApiTests {

    private static final String SENHA = "uma senha longa";
    private static final String CABECALHO_CSRF = "X-XSRF-TOKEN";
    private static final String CATEGORIAS = "/api/v1/categorias";
    private static final String TRANSACOES = "/api/v1/transacoes";
    private static final String PERIODO_DE = "2026-11-01";
    private static final String PERIODO_ATE = "2026-11-30";

    /** O que o navegador guarda: o cookie da sessão e o token CSRF dela. */
    private record Sessao(Cookie cookie, String token) {
    }

    /** Uma pessoa e tudo que ela criou pela API. */
    private record Pessoa(String nome, UUID id, Sessao sessao, UUID categoria, UUID transacaoNaCategoria,
                          UUID transacaoNoSistema, UUID transacaoExcluida, String marcador, BigDecimal totalDespesas) {
    }

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbc;

    /** Substitui o Clock da aplicação pelo que o método {@link #clock()} devolve. */
    @TestBean
    private Clock clock;

    private UUID mercado;
    private Pessoa ana;
    private Pessoa bia;

    static Clock clock() {
        return Clock.fixed(Instant.parse("2026-11-03T12:00:00Z"), ZoneOffset.UTC);
    }

    @BeforeEach
    void criarAsDuasPessoas() throws Exception {
        mercado = jdbc.queryForObject("SELECT id FROM categoria WHERE sistema AND nome = 'Mercado'", UUID.class);
        ana = criarPessoa("ana", "11.00", "13.00");
        bia = criarPessoa("bia", "700.00", "900.00");
    }

    // ================================================================ leitura

    @Test
    void listarCategoriasMostraAsDoSistemaEAsProprias_NuncaAsDaOutraPessoa() throws Exception {
        for (var par : pares()) {
            Pessoa eu = par.atacante();
            Pessoa outra = par.vitima();

            String corpo = como(eu, get(CATEGORIAS)).andExpect(status().isOk())
                    .andReturn().getResponse().getContentAsString();
            assertThat(nomes(corpo)).contains("Mercado", "cat-" + eu.nome()).doesNotContain("cat-" + outra.nome());

            String maisUsadas = como(eu, get(CATEGORIAS).param("ordem", "USO")).andExpect(status().isOk())
                    .andReturn().getResponse().getContentAsString();
            assertThat(nomes(maisUsadas)).contains("cat-" + eu.nome()).doesNotContain("cat-" + outra.nome());
        }
    }

    @Test
    void buscarCategoriaDeOutraPessoaRetorna404() throws Exception {
        for (var par : pares()) {
            como(par.atacante(), get(CATEGORIAS + "/" + par.vitima().categoria())).andExpect(status().isNotFound());
        }
    }

    @Test
    void listarTransacoesMostraSoAsProprias_EmTodosOsFiltros() throws Exception {
        for (var par : pares()) {
            Pessoa eu = par.atacante();
            Pessoa outra = par.vitima();

            como(eu, get(TRANSACOES)).andExpect(status().isOk())
                    .andExpect(jsonPath("$.itens", hasSize(2)))
                    .andExpect(content().string(not(containsString(outra.marcador()))));
            como(eu, get(TRANSACOES).param("de", PERIODO_DE).param("ate", PERIODO_ATE)).andExpect(status().isOk())
                    .andExpect(jsonPath("$.itens", hasSize(2)));
            como(eu, get(TRANSACOES).param("tipo", "DESPESA")).andExpect(status().isOk())
                    .andExpect(jsonPath("$.itens", hasSize(2)));
            // Busca pelo texto exclusivo da outra pessoa: não pode achar nada.
            como(eu, get(TRANSACOES).param("descricao", outra.marcador())).andExpect(status().isOk())
                    .andExpect(jsonPath("$.itens", hasSize(0)));
            // Na categoria do sistema, só as minhas transações.
            como(eu, get(TRANSACOES).param("categoriaId", mercado.toString())).andExpect(status().isOk())
                    .andExpect(jsonPath("$.itens", hasSize(1)))
                    .andExpect(jsonPath("$.itens[0].descricao").value("sistema-" + eu.nome()));
        }
    }

    @Test
    void filtrarPorCategoriaDeOutraPessoaRetorna400ComoCategoriaInexistente() throws Exception {
        for (var par : pares()) {
            como(par.atacante(), get(TRANSACOES).param("categoriaId", par.vitima().categoria().toString()))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.erros[0].campo").value("categoriaId"));
        }
    }

    @Test
    void buscarTransacaoDeOutraPessoaRetorna404() throws Exception {
        for (var par : pares()) {
            como(par.atacante(), get(TRANSACOES + "/" + par.vitima().transacaoNaCategoria()))
                    .andExpect(status().isNotFound())
                    .andExpect(content().string(not(containsString(par.vitima().marcador()))));
            como(par.atacante(), get(TRANSACOES + "/" + par.vitima().transacaoNoSistema()))
                    .andExpect(status().isNotFound());
        }
    }

    @Test
    void saldoEResumoSomamSoOsDadosDoProprioUsuario() throws Exception {
        for (var par : pares()) {
            Pessoa eu = par.atacante();

            String saldo = como(eu, get("/api/v1/saldo").param("de", PERIODO_DE).param("ate", PERIODO_ATE))
                    .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
            assertThat(numero(saldo, "$.despesas")).isEqualByComparingTo(eu.totalDespesas());
            assertThat(numero(saldo, "$.receitas")).isEqualByComparingTo("0");

            String resumo = como(eu, get("/api/v1/resumo").param("de", PERIODO_DE).param("ate", PERIODO_ATE))
                    .andExpect(status().isOk())
                    .andExpect(content().string(not(containsString("cat-" + par.vitima().nome()))))
                    .andReturn().getResponse().getContentAsString();
            assertThat(numero(resumo, "$.despesas.total")).isEqualByComparingTo(eu.totalDespesas());
        }
    }

    @Test
    void euDevolveSempreAPessoaDaPropriaSessao() throws Exception {
        for (var par : pares()) {
            como(par.atacante(), get("/api/v1/eu")).andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(par.atacante().id().toString()))
                    .andExpect(jsonPath("$.email").value(par.atacante().nome() + "@email.com"));
        }
    }

    // ================================================================ escrita

    @Test
    void editarCategoriaDeOutraPessoaRetorna404ENaoMuda() throws Exception {
        for (var par : pares()) {
            Pessoa vitima = par.vitima();

            como(par.atacante(), put(CATEGORIAS + "/" + vitima.categoria()), "{\"nome\": \"invadida\"}")
                    .andExpect(status().isNotFound());

            assertThat(jdbc.queryForObject("SELECT nome FROM categoria WHERE id = ?", String.class, vitima.categoria()))
                    .isEqualTo("cat-" + vitima.nome());
        }
    }

    @Test
    void excluirCategoriaDeOutraPessoaRetorna404ENaoApaga() throws Exception {
        for (var par : pares()) {
            como(par.atacante(), delete(CATEGORIAS + "/" + par.vitima().categoria())).andExpect(status().isNotFound());

            assertThat(contar("SELECT count(*) FROM categoria WHERE id = ?", par.vitima().categoria())).isEqualTo(1);
        }
    }

    @Test
    void editarTransacaoDeOutraPessoaRetorna404ENaoMuda() throws Exception {
        for (var par : pares()) {
            Pessoa vitima = par.vitima();
            // A categoria é do sistema (visível para as duas): só o dono da transação a impede de mudar.
            como(par.atacante(), put(TRANSACOES + "/" + vitima.transacaoNoSistema()),
                    corpo(null, "1.00", "2026-11-03", "invadida", mercado))
                    .andExpect(status().isNotFound());

            assertThat(jdbc.queryForObject("SELECT descricao FROM transacao WHERE id = ?", String.class,
                    vitima.transacaoNoSistema())).isEqualTo("sistema-" + vitima.nome());
        }
    }

    @Test
    void excluirTransacaoDeOutraPessoaRetorna404ENaoApagaNemRegistraExclusao() throws Exception {
        for (var par : pares()) {
            UUID id = par.vitima().transacaoNoSistema();

            como(par.atacante(), delete(TRANSACOES + "/" + id)).andExpect(status().isNotFound());

            assertThat(contar("SELECT count(*) FROM transacao WHERE id = ?", id)).isEqualTo(1);
            assertThat(contar("SELECT count(*) FROM transacao_excluida WHERE id = ?", id)).isZero();
        }
    }

    @Test
    void lancarOuTrocarParaCategoriaDeOutraPessoaRetorna400() throws Exception {
        for (var par : pares()) {
            Pessoa eu = par.atacante();
            UUID categoriaDaOutra = par.vitima().categoria();

            como(eu, post(TRANSACOES), corpo(null, "5.00", "2026-11-03", null, categoriaDaOutra))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.erros[0].campo").value("categoriaId"));
            como(eu, put(TRANSACOES + "/" + eu.transacaoNoSistema()),
                    corpo(null, "5.00", "2026-11-03", null, categoriaDaOutra))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.erros[0].campo").value("categoriaId"));
        }
    }

    @Test
    void criarCategoriaComONomeDaOutraPessoaDa201() throws Exception {
        for (var par : pares()) {
            // Cada pessoa tem o seu espaço de nomes: o nome da outra não está "ocupado".
            como(par.atacante(), post(CATEGORIAS), "{\"nome\": \"cat-%s\", \"tipo\": \"DESPESA\"}"
                    .formatted(par.vitima().nome()))
                    .andExpect(status().isCreated());
        }
    }

    // ================================================================ ids escolhidos pelo cliente

    @Test
    void enviarIdQueJaEDeOutraPessoaRetorna409ENaoMexeNaTransacaoDela() throws Exception {
        for (var par : pares()) {
            UUID id = par.vitima().transacaoNoSistema();

            como(par.atacante(), post(TRANSACOES), corpo(id, "99.00", "2026-11-03", "roubada", mercado))
                    .andExpect(status().isConflict());

            assertThat(jdbc.queryForObject("SELECT usuario_id FROM transacao WHERE id = ?", UUID.class, id))
                    .isEqualTo(par.vitima().id());
        }
    }

    @Test
    void idExcluidoPorOutraPessoaNaoDa410_MasOdaPropriaPessoaDa() throws Exception {
        for (var par : pares()) {
            // O 410 de quem excluiu continua valendo...
            como(par.vitima(), post(TRANSACOES), corpo(par.vitima().transacaoExcluida(), "1.00", "2026-11-03", null, mercado))
                    .andExpect(status().isGone());
            // ...mas não pode revelar para a outra pessoa que o id existiu: ali o lançamento é criado.
            como(par.atacante(), post(TRANSACOES), corpo(par.vitima().transacaoExcluida(), "1.00", "2026-11-03", null, mercado))
                    .andExpect(status().isCreated());
        }
    }

    // ================================================================ a conta e a sessão

    @Test
    void trocarASenhaDeUmaContaNaoMudaADaOutra() throws Exception {
        como(ana, put("/api/v1/eu/senha"),
                "{\"senhaAtual\": \"%s\", \"novaSenha\": \"outra senha bem longa\"}".formatted(SENHA))
                .andExpect(status().isNoContent());

        // A Bia continua entrando com a senha dela, e a sessão dela segue valendo.
        entrar("bia@email.com", SENHA);
        como(bia, get("/api/v1/eu")).andExpect(status().isOk());
        // A senha antiga da Ana deixou de valer (senha errada = 401, como qualquer outra).
        como(anonima(), post("/api/v1/auth/entrar"), login("ana@email.com", SENHA)).andExpect(status().isUnauthorized());
    }

    @Test
    void excluirUmaContaNaoApagaNadaDaOutra() throws Exception {
        como(ana, delete("/api/v1/eu"), "{\"senha\": \"%s\"}".formatted(SENHA)).andExpect(status().isNoContent());

        assertThat(contar("SELECT count(*) FROM transacao WHERE usuario_id = ?", ana.id())).isZero();
        assertThat(contar("SELECT count(*) FROM categoria WHERE usuario_id = ?", ana.id())).isZero();
        // A sessão da Ana morreu junto com a conta...
        como(ana, get("/api/v1/eu")).andExpect(status().isUnauthorized());
        // ...e a Bia segue com tudo dela, na mesma sessão.
        como(bia, get(TRANSACOES)).andExpect(status().isOk()).andExpect(jsonPath("$.itens", hasSize(2)));
        como(bia, get(CATEGORIAS + "/" + bia.categoria())).andExpect(status().isOk());
    }

    @Test
    void oTokenCsrfDeUmaSessaoNaoValeParaOutra() throws Exception {
        Sessao mistura = new Sessao(bia.sessao().cookie(), ana.sessao().token());

        mockMvc.perform(post(CATEGORIAS).cookie(mistura.cookie()).header(CABECALHO_CSRF, mistura.token())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"nome\": \"x\", \"tipo\": \"DESPESA\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void semSessaoNenhumEndpointDeDadosResponde() throws Exception {
        UUID qualquer = bia.transacaoNaCategoria();
        List<MockHttpServletRequestBuilder> pedidos = List.of(
                get("/api/v1/eu"),
                put("/api/v1/eu/senha"),
                delete("/api/v1/eu"),
                get(CATEGORIAS), get(CATEGORIAS + "/" + bia.categoria()), post(CATEGORIAS),
                put(CATEGORIAS + "/" + bia.categoria()), delete(CATEGORIAS + "/" + bia.categoria()),
                get(TRANSACOES), get(TRANSACOES + "/" + qualquer), post(TRANSACOES),
                put(TRANSACOES + "/" + qualquer), delete(TRANSACOES + "/" + qualquer),
                get("/api/v1/saldo").param("de", PERIODO_DE).param("ate", PERIODO_ATE),
                get("/api/v1/resumo").param("de", PERIODO_DE).param("ate", PERIODO_ATE));

        for (MockHttpServletRequestBuilder pedido : pedidos) {
            Sessao anonima = anonima();
            // Com cookie e token CSRF de uma sessão anônima, para a recusa ser por falta de login (e não de CSRF).
            mockMvc.perform(pedido.cookie(anonima.cookie()).header(CABECALHO_CSRF, anonima.token())
                            .contentType(MediaType.APPLICATION_JSON).content("{}"))
                    .andExpect(status().isUnauthorized());
        }
    }

    @Test
    void sairEncerraSoASessaoDeQuemSaiu() throws Exception {
        como(ana, post("/api/v1/auth/sair")).andExpect(status().isNoContent());

        como(ana, get(TRANSACOES)).andExpect(status().isUnauthorized());
        // O logout da Ana não derrubou a Bia.
        como(bia, get(TRANSACOES)).andExpect(status().isOk());
    }

    // ================================================================ auxiliares

    private record Par(Pessoa atacante, Pessoa vitima) {
    }

    /** Os dois sentidos do ataque: Ana contra a Bia e Bia contra a Ana. */
    private List<Par> pares() {
        return List.of(new Par(ana, bia), new Par(bia, ana));
    }

    /** Cadastra a pessoa de verdade e cria os dados dela pela API. */
    private Pessoa criarPessoa(String nome, String valorNaCategoria, String valorNoSistema) throws Exception {
        String email = nome + "@email.com";
        Sessao anonima = anonima();
        MvcResult cadastro = como(anonima, post("/api/v1/auth/cadastro"), login(email, SENHA))
                .andExpect(status().isCreated()).andReturn();
        UUID id = UUID.fromString(JsonPath.read(cadastro.getResponse().getContentAsString(), "$.id"));
        Sessao sessao = sessaoDe(cadastro.getResponse().getCookie("SESSION"));

        String marcador = "marcador-" + nome;
        UUID categoria = idDe(como(sessao, post(CATEGORIAS), "{\"nome\": \"cat-%s\", \"tipo\": \"DESPESA\"}"
                .formatted(nome)).andExpect(status().isCreated()));
        UUID naCategoria = idDe(como(sessao, post(TRANSACOES),
                corpo(null, valorNaCategoria, "2026-11-02", marcador, categoria)).andExpect(status().isCreated()));
        UUID noSistema = idDe(como(sessao, post(TRANSACOES),
                corpo(null, valorNoSistema, "2026-11-02", "sistema-" + nome, mercado)).andExpect(status().isCreated()));
        UUID excluida = idDe(como(sessao, post(TRANSACOES),
                corpo(null, "1.00", "2026-11-02", "excluida-" + nome, mercado)).andExpect(status().isCreated()));
        como(sessao, delete(TRANSACOES + "/" + excluida)).andExpect(status().isNoContent());

        BigDecimal total = new BigDecimal(valorNaCategoria).add(new BigDecimal(valorNoSistema));
        return new Pessoa(nome, id, sessao, categoria, naCategoria, noSistema, excluida, marcador, total);
    }

    /** Primeiro contato do app: busca o token CSRF e recebe o cookie de uma sessão ainda anônima. */
    private Sessao anonima() throws Exception {
        MvcResult resultado = mockMvc.perform(get("/api/v1/auth/csrf")).andExpect(status().isOk()).andReturn();
        return new Sessao(resultado.getResponse().getCookie("SESSION"),
                JsonPath.read(resultado.getResponse().getContentAsString(), "$.token"));
    }

    /** Busca o token CSRF de uma sessão que já existe (o app faz isso logo após entrar). */
    private Sessao sessaoDe(Cookie cookie) throws Exception {
        MvcResult resultado = mockMvc.perform(get("/api/v1/auth/csrf").cookie(cookie))
                .andExpect(status().isOk()).andReturn();
        return new Sessao(cookie, JsonPath.read(resultado.getResponse().getContentAsString(), "$.token"));
    }

    private Sessao entrar(String email, String senha) throws Exception {
        MvcResult resultado = como(anonima(), post("/api/v1/auth/entrar"), login(email, senha))
                .andExpect(status().isOk()).andReturn();
        return sessaoDe(resultado.getResponse().getCookie("SESSION"));
    }

    private ResultActions como(Pessoa pessoa, MockHttpServletRequestBuilder pedido) throws Exception {
        return como(pessoa.sessao(), pedido, null);
    }

    private ResultActions como(Pessoa pessoa, MockHttpServletRequestBuilder pedido, String corpo) throws Exception {
        return como(pessoa.sessao(), pedido, corpo);
    }

    private ResultActions como(Sessao sessao, MockHttpServletRequestBuilder pedido) throws Exception {
        return como(sessao, pedido, null);
    }

    private ResultActions como(Sessao sessao, MockHttpServletRequestBuilder pedido, String corpo) throws Exception {
        pedido.cookie(sessao.cookie()).header(CABECALHO_CSRF, sessao.token());
        if (corpo != null) {
            pedido.contentType(MediaType.APPLICATION_JSON).content(corpo);
        }
        return mockMvc.perform(pedido);
    }

    private static UUID idDe(ResultActions resposta) throws Exception {
        return UUID.fromString(JsonPath.read(resposta.andReturn().getResponse().getContentAsString(), "$.id"));
    }

    private static String login(String email, String senha) {
        return "{\"email\": \"%s\", \"senha\": \"%s\"}".formatted(email, senha);
    }

    private static String corpo(UUID id, String valor, String data, String descricao, UUID categoriaId) {
        String idJson = (id == null) ? "" : "\"id\": \"%s\", ".formatted(id);
        String descricaoJson = (descricao == null) ? "null" : "\"" + descricao + "\"";
        return "{%s\"valor\": %s, \"data\": \"%s\", \"descricao\": %s, \"categoriaId\": \"%s\"}"
                .formatted(idJson, valor, data, descricaoJson, categoriaId);
    }

    private static List<String> nomes(String json) {
        return JsonPath.read(json, "$[*].nome");
    }

    private static BigDecimal numero(String json, String caminho) {
        return new BigDecimal(JsonPath.read(json, caminho).toString());
    }

    private int contar(String sql, Object... argumentos) {
        Integer total = jdbc.queryForObject(sql, Integer.class, argumentos);
        return total == null ? 0 : total;
    }
}

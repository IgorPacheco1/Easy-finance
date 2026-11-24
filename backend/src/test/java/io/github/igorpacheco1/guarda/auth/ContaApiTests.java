package io.github.igorpacheco1.guarda.auth;

import com.jayway.jsonpath.JsonPath;
import io.github.igorpacheco1.guarda.PessoaNoBanco;
import io.github.igorpacheco1.guarda.TestcontainersConfiguration;
import jakarta.persistence.EntityManager;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Testa trocar a senha e excluir a conta de ponta a ponta (ADR-0024), com PostgreSQL real e o
 * login de verdade: o MockMvc é o "navegador" e guarda cookie e token CSRF de cada sessão.
 */
@Import(TestcontainersConfiguration.class)
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class ContaApiTests {

    private static final String URL_SENHA = "/api/v1/eu/senha";
    private static final String URL_EU = "/api/v1/eu";
    private static final String URL_PERFIL = "/api/v1/eu/perfil";
    private static final String URL_ENTRAR = "/api/v1/auth/entrar";
    private static final String CABECALHO_CSRF = "X-XSRF-TOKEN";
    private static final String SENHA = "uma senha longa";
    private static final String NOVA_SENHA = "outra senha bem longa";

    /** O que o navegador guarda: o cookie da sessão e o token CSRF desta sessão. */
    private record Sessao(Cookie cookie, String token) {
    }

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private EntityManager entityManager;

    // ------------------------------------------------------------------ perfil (#193)

    @Test
    void contaNovaTemONomeDoCadastroEOAvatarPadrao() throws Exception {
        Sessao ana = criarConta("ana@email.com");

        mockMvc.perform(get(URL_EU).cookie(ana.cookie()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nome").value("Ana"))
                .andExpect(jsonPath("$.avatar").value("iniciais:cinza"));
    }

    @Test
    void mudarONomeEOAvatarGravaEDevolveOPerfilNovo() throws Exception {
        Sessao ana = criarConta("ana@email.com");

        enviarCorpo(patch(URL_PERFIL), ana, "{\"nome\": \"  Ana Souza \", \"avatar\": \"iniciais:verde\"}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nome").value("Ana Souza"))
                .andExpect(jsonPath("$.avatar").value("iniciais:verde"));

        assertThat(jdbc.queryForObject("SELECT nome FROM usuario WHERE email = 'ana@email.com'", String.class))
                .isEqualTo("Ana Souza");
    }

    @Test
    void campoQueNaoVemNoPerfilFicaComoEsta() throws Exception {
        Sessao ana = criarConta("ana@email.com");

        enviarCorpo(patch(URL_PERFIL), ana, "{\"avatar\": \"iniciais:roxo\"}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nome").value("Ana"))
                .andExpect(jsonPath("$.avatar").value("iniciais:roxo"));
    }

    @Test
    void contaSemNomeDevolveNomeNullAtePreencher() throws Exception {
        Sessao ana = criarConta("ana@email.com");
        // Como as contas criadas antes da V8.
        jdbc.update("UPDATE usuario SET nome = NULL WHERE email = 'ana@email.com'");
        // O UPDATE foi direto no banco; o Hibernate ainda guarda a Ana de antes (com nome) no cache
        // da transação do teste. clear() esvazia esse cache, e a próxima leitura vai ao banco.
        entityManager.clear();

        mockMvc.perform(get(URL_EU).cookie(ana.cookie()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nome").isEmpty());
    }

    @Test
    void perfilComNomeEmBrancoOuAvatarForaDaListaRetorna400ENaoMuda() throws Exception {
        Sessao ana = criarConta("ana@email.com");

        enviarCorpo(patch(URL_PERFIL), ana, "{\"nome\": \"   \"}")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erros[0].campo").value("nome"));
        enviarCorpo(patch(URL_PERFIL), ana, "{\"avatar\": \"mascote:lobo\"}")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erros[0].campo").value("avatar"))
                .andExpect(jsonPath("$.erros[0].mensagem").value("Escolha um avatar da lista do app."));

        assertThat(jdbc.queryForObject("SELECT nome FROM usuario WHERE email = 'ana@email.com'", String.class))
                .isEqualTo("Ana");
    }

    @Test
    void mudarOPerfilSemLoginRetorna401() throws Exception {
        enviarCorpo(patch(URL_PERFIL), anonima(), "{\"nome\": \"Ana\"}")
                .andExpect(status().isUnauthorized());
    }

    // ------------------------------------------------------------------ trocar a senha

    @Test
    void trocarASenhaFazOLoginValerSoComANova() throws Exception {
        Sessao ana = criarConta("ana@email.com");

        trocarSenha(ana, SENHA, NOVA_SENHA).andExpect(status().isNoContent());

        assertThat(entrarComStatus("ana@email.com", NOVA_SENHA)).isEqualTo(200);
        assertThat(entrarComStatus("ana@email.com", SENHA)).isEqualTo(401);
    }

    @Test
    void trocarASenhaGravaUmHashNovoENuncaASenha() throws Exception {
        Sessao ana = criarConta("ana@email.com");
        String antes = hashDe("ana@email.com");

        trocarSenha(ana, SENHA, NOVA_SENHA).andExpect(status().isNoContent());

        String depois = hashDe("ana@email.com");
        assertThat(depois).isNotEqualTo(antes).startsWith("{bcrypt}$2a$12$").doesNotContain(NOVA_SENHA);
    }

    @Test
    void trocarASenhaEncerraAsOutrasSessoesEMantemAAtual() throws Exception {
        criarConta("ana@email.com");
        Sessao noCelular = entrar("ana@email.com", SENHA);
        Sessao noComputador = entrar("ana@email.com", SENHA);

        MvcResult troca = trocarSenha(noCelular, SENHA, NOVA_SENHA).andExpect(status().isNoContent()).andReturn();

        // Quem estava em outro aparelho (ou roubou o cookie) cai na hora.
        mockMvc.perform(get(URL_EU).cookie(noComputador.cookie())).andExpect(status().isUnauthorized());
        // A sessão de quem trocou continua, agora com id novo.
        Cookie atual = troca.getResponse().getCookie("SESSION");
        assertThat(atual).isNotNull();
        assertThat(atual.getValue()).isNotEqualTo(noCelular.cookie().getValue());
        mockMvc.perform(get(URL_EU).cookie(atual)).andExpect(status().isOk());
    }

    @Test
    void senhaAtualErradaRetorna400NoCampoENaoTrocaNada() throws Exception {
        Sessao ana = criarConta("ana@email.com");
        String antes = hashDe("ana@email.com");

        trocarSenha(ana, "senha errada qualquer", NOVA_SENHA)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erros[0].campo").value("senhaAtual"))
                .andExpect(jsonPath("$.erros[0].mensagem").value("Senha incorreta."));

        assertThat(hashDe("ana@email.com")).isEqualTo(antes);
        // 400, e não 401: a pessoa continua logada.
        mockMvc.perform(get(URL_EU).cookie(ana.cookie())).andExpect(status().isOk());
    }

    @Test
    void erroNaSenhaAtualContaNoLimiteDeTentativasDoLogin() throws Exception {
        Sessao ana = criarConta("ana@email.com");
        for (int i = 0; i < 5; i++) {
            trocarSenha(ana, "senha errada qualquer", NOVA_SENHA).andExpect(status().isBadRequest());
        }

        // Bloqueado: nem a senha certa troca, e o login também está barrado.
        trocarSenha(ana, SENHA, NOVA_SENHA).andExpect(status().isTooManyRequests());
        assertThat(entrarComStatus("ana@email.com", SENHA)).isEqualTo(429);
    }

    @Test
    void novaSenhaIgualAAtualRetorna400() throws Exception {
        Sessao ana = criarConta("ana@email.com");

        trocarSenha(ana, SENHA, SENHA)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erros[0].campo").value("novaSenha"));
    }

    @Test
    void novaSenhaCurtaOuAusenteRetorna400() throws Exception {
        Sessao ana = criarConta("ana@email.com");

        trocarSenha(ana, SENHA, "curta")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erros[?(@.campo == 'novaSenha')]").exists());
        enviarCorpo(put(URL_SENHA), ana, "{}")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erros[?(@.campo == 'senhaAtual')]").exists())
                .andExpect(jsonPath("$.erros[?(@.campo == 'novaSenha')]").exists());
    }

    @Test
    void trocarASenhaSemLoginRetorna401ESemTokenCsrfRetorna403() throws Exception {
        Sessao anonima = anonima();
        enviarCorpo(put(URL_SENHA), anonima, corpoTroca(SENHA, NOVA_SENHA)).andExpect(status().isUnauthorized());

        Sessao ana = criarConta("ana@email.com");
        mockMvc.perform(put(URL_SENHA).cookie(ana.cookie()).contentType(MediaType.APPLICATION_JSON)
                        .content(corpoTroca(SENHA, NOVA_SENHA)))
                .andExpect(status().isForbidden());
        assertThat(entrarComStatus("ana@email.com", SENHA)).isEqualTo(200);
    }

    // ------------------------------------------------------------------ excluir a conta

    @Test
    void excluirApagaAContaESeusDadosEDeixaOsDeOutraContaIntactos() throws Exception {
        Sessao ana = criarConta("ana@email.com");
        criarConta("bia@email.com");
        UUID idAna = idDe("ana@email.com");
        UUID idBia = idDe("bia@email.com");
        criarCategoriaETransacao(idAna, "Pets");
        criarCategoriaETransacao(idBia, "Viagens");

        excluir(ana, SENHA).andExpect(status().isNoContent());

        assertThat(contar("SELECT count(*) FROM usuario WHERE id = ?", idAna)).isZero();
        PessoaNoBanco.definir(jdbc, idAna); // como a Ana: assim o zero vem da exclusão, e não do RLS
        assertThat(contar("SELECT count(*) FROM categoria WHERE usuario_id = ?", idAna)).isZero();
        assertThat(contar("SELECT count(*) FROM transacao WHERE usuario_id = ?", idAna)).isZero();
        // A outra conta não perdeu nada.
        assertThat(contar("SELECT count(*) FROM usuario WHERE id = ?", idBia)).isEqualTo(1);
        PessoaNoBanco.definir(jdbc, idBia);
        assertThat(contar("SELECT count(*) FROM categoria WHERE usuario_id = ?", idBia)).isEqualTo(1);
        assertThat(contar("SELECT count(*) FROM transacao WHERE usuario_id = ?", idBia)).isEqualTo(1);
        // As categorias do sistema continuam existindo.
        assertThat(contar("SELECT count(*) FROM categoria WHERE sistema AND usuario_id IS NULL")).isPositive();
    }

    @Test
    void excluirEncerraTodasAsSessoesEImpedeODeNovoLogin() throws Exception {
        Sessao ana = criarConta("ana@email.com");
        Sessao outroAparelho = entrar("ana@email.com", SENHA);

        MvcResult resultado = excluir(ana, SENHA).andExpect(status().isNoContent()).andReturn();

        mockMvc.perform(get(URL_EU).cookie(ana.cookie())).andExpect(status().isUnauthorized());
        mockMvc.perform(get(URL_EU).cookie(outroAparelho.cookie())).andExpect(status().isUnauthorized());
        assertThat(entrarComStatus("ana@email.com", SENHA)).isEqualTo(401);
        // O navegador recebe o cookie de sessão expirado.
        Cookie cookie = resultado.getResponse().getCookie("SESSION");
        assertThat(cookie).isNotNull();
        assertThat(cookie.getValue().isEmpty() || cookie.getMaxAge() == 0).isTrue();
    }

    @Test
    void excluirComSenhaErradaRetorna400ENaoApagaNada() throws Exception {
        Sessao ana = criarConta("ana@email.com");

        excluir(ana, "senha errada qualquer")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erros[0].campo").value("senha"));

        assertThat(contar("SELECT count(*) FROM usuario WHERE email = ?", "ana@email.com")).isEqualTo(1);
        mockMvc.perform(get(URL_EU).cookie(ana.cookie())).andExpect(status().isOk());
    }

    @Test
    void excluirSemSenhaRetorna400() throws Exception {
        Sessao ana = criarConta("ana@email.com");

        enviarCorpo(delete(URL_EU), ana, "{}")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erros[?(@.campo == 'senha')]").exists());
    }

    @Test
    void excluirSemLoginRetorna401ESemTokenCsrfRetorna403() throws Exception {
        enviarCorpo(delete(URL_EU), anonima(), "{\"senha\": \"" + SENHA + "\"}").andExpect(status().isUnauthorized());

        Sessao ana = criarConta("ana@email.com");
        mockMvc.perform(delete(URL_EU).cookie(ana.cookie()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"senha\": \"" + SENHA + "\"}"))
                .andExpect(status().isForbidden());
        assertThat(contar("SELECT count(*) FROM usuario WHERE email = ?", "ana@email.com")).isEqualTo(1);
    }

    @Test
    void excluirApagaOHistoricoDeFalhasDeLoginDoEmail() throws Exception {
        Sessao ana = criarConta("ana@email.com");
        enviarCorpo(post(URL_ENTRAR), anonima(), "{\"email\": \"ana@email.com\", \"senha\": \"errada qualquer\"}")
                .andExpect(status().isUnauthorized());
        assertThat(contar("SELECT count(*) FROM tentativa_login WHERE tipo = 'EMAIL'")).isEqualTo(1);

        excluir(ana, SENHA).andExpect(status().isNoContent());

        assertThat(contar("SELECT count(*) FROM tentativa_login WHERE tipo = 'EMAIL'")).isZero();
    }

    // ------------------------------------------------------------------ auxiliares ("o navegador")

    /** Cria a conta (que já deixa a pessoa logada) e devolve a sessão, com o token CSRF atual. */
    private Sessao criarConta(String email) throws Exception {
        Sessao anonima = anonima();
        MvcResult resultado = enviarCorpo(post("/api/v1/auth/cadastro"), anonima, corpoDoCadastro(email, SENHA))
                .andExpect(status().isCreated()).andReturn();
        return sessaoDe(resultado.getResponse().getCookie("SESSION"));
    }

    private Sessao entrar(String email, String senha) throws Exception {
        MvcResult resultado = enviarCorpo(post(URL_ENTRAR), anonima(), corpoLogin(email, senha))
                .andExpect(status().isOk()).andReturn();
        return sessaoDe(resultado.getResponse().getCookie("SESSION"));
    }

    private int entrarComStatus(String email, String senha) throws Exception {
        return enviarCorpo(post(URL_ENTRAR), anonima(), corpoLogin(email, senha)).andReturn().getResponse().getStatus();
    }

    private Sessao anonima() throws Exception {
        MvcResult resultado = mockMvc.perform(get("/api/v1/auth/csrf")).andExpect(status().isOk()).andReturn();
        return new Sessao(resultado.getResponse().getCookie("SESSION"),
                JsonPath.read(resultado.getResponse().getContentAsString(), "$.token"));
    }

    private Sessao sessaoDe(Cookie cookie) throws Exception {
        MvcResult resultado = mockMvc.perform(get("/api/v1/auth/csrf").cookie(cookie))
                .andExpect(status().isOk()).andReturn();
        return new Sessao(cookie, JsonPath.read(resultado.getResponse().getContentAsString(), "$.token"));
    }

    private ResultActions trocarSenha(Sessao sessao, String atual, String nova) throws Exception {
        return enviarCorpo(put(URL_SENHA), sessao, corpoTroca(atual, nova));
    }

    private ResultActions excluir(Sessao sessao, String senha) throws Exception {
        return enviarCorpo(delete(URL_EU), sessao, "{\"senha\": \"%s\"}".formatted(senha));
    }

    private ResultActions enviarCorpo(MockHttpServletRequestBuilder metodo,
                                      Sessao sessao, String corpo) throws Exception {
        return mockMvc.perform(metodo.cookie(sessao.cookie()).header(CABECALHO_CSRF, sessao.token())
                .contentType(MediaType.APPLICATION_JSON).content(corpo));
    }

    private static String corpoTroca(String atual, String nova) {
        return "{\"senhaAtual\": \"%s\", \"novaSenha\": \"%s\"}".formatted(atual, nova);
    }

    private static String corpoDoCadastro(String email, String senha) {
        return "{\"email\": \"%s\", \"senha\": \"%s\", \"nome\": \"Ana\"}".formatted(email, senha);
    }

    private static String corpoLogin(String email, String senha) {
        return "{\"email\": \"%s\", \"senha\": \"%s\"}".formatted(email, senha);
    }

    private String hashDe(String email) {
        return jdbc.queryForObject("SELECT senha_hash FROM usuario WHERE email = ?", String.class, email);
    }

    private UUID idDe(String email) {
        return jdbc.queryForObject("SELECT id FROM usuario WHERE email = ?", UUID.class, email);
    }

    private int contar(String sql, Object... parametros) {
        Integer total = jdbc.queryForObject(sql, Integer.class, parametros);
        return total == null ? 0 : total;
    }

    private void criarCategoriaETransacao(UUID usuarioId, String nomeDaCategoria) {
        PessoaNoBanco.definir(jdbc, usuarioId); // com o RLS, só o próprio dono grava
        UUID categoriaId = jdbc.queryForObject(
                "INSERT INTO categoria (nome, tipo, usuario_id) VALUES (?, 'DESPESA', ?) RETURNING id",
                UUID.class, nomeDaCategoria, usuarioId);
        jdbc.update("INSERT INTO transacao (usuario_id, categoria_id, valor, data) VALUES (?, ?, 10.00, CURRENT_DATE)",
                usuarioId, categoriaId);
    }
}

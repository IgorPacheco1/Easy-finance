package io.github.igorpacheco1.easyfinance.auth;

import com.jayway.jsonpath.JsonPath;
import io.github.igorpacheco1.easyfinance.TestcontainersConfiguration;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.core.env.Environment;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Testa cadastro, entrar, sair e a sessão de ponta a ponta, com PostgreSQL real (Testcontainers).
 *
 * <p>Aqui o MockMvc é o "navegador": guarda o cookie de sessão e o token CSRF de cada etapa e os
 * devolve como o app faria. Não há usuário simulado: o login é o de verdade.
 *
 * <p>{@code @Transactional} desfaz o que cada teste gravou. O hash BCrypt com custo 12 leva uma
 * fração de segundo por cadastro: é o comportamento real, então os testes não o enfraquecem.
 */
@Import(TestcontainersConfiguration.class)
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class AuthApiTests {

    private static final String URL = "/api/v1/auth/cadastro";
    private static final String URL_ENTRAR = "/api/v1/auth/entrar";
    private static final String URL_SAIR = "/api/v1/auth/sair";
    private static final String URL_EU = "/api/v1/eu";
    private static final String CABECALHO_CSRF = "X-XSRF-TOKEN";
    private static final String SENHA = "uma senha longa";

    /** O que o navegador guarda: o cookie da sessão e o token CSRF desta sessão. */
    private record Sessao(Cookie cookie, String token) {
    }

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private Environment ambiente;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Test
    void cadastrarRetorna201SemDevolverASenha() throws Exception {
        cadastrar("ana@email.com", "uma senha longa")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.email").value("ana@email.com"))
                .andExpect(jsonPath("$.senha").doesNotExist())
                .andExpect(content().string(not(containsString("bcrypt"))))
                .andExpect(content().string(not(containsString("uma senha longa"))));
    }

    @Test
    void cadastrarGuardaSoOHashBCryptENuncaASenha() throws Exception {
        cadastrar("ana@email.com", "uma senha longa").andExpect(status().isCreated());

        String hash = jdbc.queryForObject(
                "SELECT senha_hash FROM usuario WHERE email = 'ana@email.com'", String.class);

        assertThat(hash).startsWith("{bcrypt}$2a$12$").doesNotContain("uma senha longa");
        assertThat(passwordEncoder.matches("uma senha longa", hash)).isTrue();
        assertThat(passwordEncoder.matches("outra senha longa", hash)).isFalse();
    }

    @Test
    void cadastrarGuardaOEmailEmMinusculasSemEspacosNasPontas() throws Exception {
        cadastrar("  Ana.Silva@Email.COM ", "uma senha longa")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.email").value("ana.silva@email.com"));

        Integer contas = jdbc.queryForObject(
                "SELECT count(*) FROM usuario WHERE email = 'ana.silva@email.com'", Integer.class);
        assertThat(contas).isEqualTo(1);
    }

    @Test
    void cadastrarComEmailRepetidoRetorna409MesmoComOutrasMaiusculas() throws Exception {
        cadastrar("ana@email.com", "uma senha longa").andExpect(status().isCreated());

        cadastrar("ANA@Email.com", "outra senha longa")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.title").value("E-mail já cadastrado"));
    }

    @Test
    void cadastrarComDadosInvalidosRetorna400ENaoGravaNada() throws Exception {
        cadastrar("isso-nao-e-email", "curta")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.title").value("Dados inválidos"))
                .andExpect(jsonPath("$.erros[?(@.campo == 'email')]").exists())
                .andExpect(jsonPath("$.erros[?(@.campo == 'senha')]").exists());

        Integer contas = jdbc.queryForObject(
                "SELECT count(*) FROM usuario WHERE email = 'isso-nao-e-email'", Integer.class);
        assertThat(contas).isZero();
    }

    @Test
    void duasContasPodemTerAMesmaSenhaComHashesDiferentes() throws Exception {
        cadastrar("ana@email.com", "uma senha longa").andExpect(status().isCreated());
        cadastrar("bia@email.com", "uma senha longa").andExpect(status().isCreated());

        Integer hashesDistintos = jdbc.queryForObject(
                "SELECT count(DISTINCT senha_hash) FROM usuario WHERE email IN ('ana@email.com', 'bia@email.com')",
                Integer.class);
        assertThat(hashesDistintos).isEqualTo(2);
    }

    // ------------------------------------------------------------------ sessão, CSRF, entrar e sair

    @Test
    void tokenCsrfVemNoCorpoEACriaOCookieDaSessao() throws Exception {
        MvcResult resultado = mockMvc.perform(get("/api/v1/auth/csrf"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.cabecalho").value(CABECALHO_CSRF))
                .andReturn();

        Cookie cookie = resultado.getResponse().getCookie("SESSION");
        assertThat(cookie).isNotNull();
        assertThat(cookie.getPath()).isEqualTo("/");
    }

    /**
     * O MockMvc não reproduz todos os atributos do cabeçalho Set-Cookie, então a configuração
     * que o Spring Session usa para escrevê-los é conferida direto (ADR-0020).
     */
    @Test
    void oCookieDaSessaoEConfiguradoHttpOnlySecureESameSiteStrict() {
        assertThat(ambiente.getProperty("server.servlet.session.cookie.http-only")).isEqualTo("true");
        assertThat(ambiente.getProperty("server.servlet.session.cookie.secure")).isEqualTo("true");
        assertThat(ambiente.getProperty("server.servlet.session.cookie.same-site")).isEqualTo("strict");
        assertThat(ambiente.getProperty("spring.session.timeout")).isEqualTo("30d");
    }

    @Test
    void cadastroSemTokenCsrfRetorna403() throws Exception {
        mockMvc.perform(post(URL).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\": \"ana@email.com\", \"senha\": \"%s\"}".formatted(SENHA)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.title").value("Sessão desatualizada"))
                .andExpect(jsonPath("$.detail").value("Sessão desatualizada. Tente de novo."));

        assertThat(contas("ana@email.com")).isZero();
    }

    @Test
    void entrarComTokenCsrfInvalidoRetorna403() throws Exception {
        cadastrar("ana@email.com", SENHA).andExpect(status().isCreated());
        Sessao anonima = anonima();

        mockMvc.perform(post(URL_ENTRAR).cookie(anonima.cookie()).header(CABECALHO_CSRF, "token-inventado")
                        .contentType(MediaType.APPLICATION_JSON).content(json("ana@email.com", SENHA)))
                .andExpect(status().isForbidden());
    }

    @Test
    void cadastrarJaDeixaAPessoaLogada() throws Exception {
        Sessao anonima = anonima();

        MvcResult resultado = enviar(anonima, URL, "ana@email.com", SENHA)
                .andExpect(status().isCreated())
                .andReturn();
        Cookie logada = resultado.getResponse().getCookie("SESSION");

        mockMvc.perform(get(URL_EU).cookie(logada))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("ana@email.com"))
                .andExpect(jsonPath("$.senha").doesNotExist());
    }

    @Test
    void entrarComSenhaCertaAbreASessaoEEuMostraQuemEstaLogado() throws Exception {
        cadastrar("ana@email.com", SENHA).andExpect(status().isCreated());

        Cookie logada = entrar("ANA@email.com ", SENHA).getResponse().getCookie("SESSION");

        mockMvc.perform(get(URL_EU).cookie(logada))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.email").value("ana@email.com"));
    }

    @Test
    void entrarTrocaOIdDaSessaoEOTokenCsrfEOIdAntigoDeixaDeValer() throws Exception {
        cadastrar("ana@email.com", SENHA).andExpect(status().isCreated());
        Sessao anonima = anonima();

        MvcResult resultado = enviar(anonima, URL_ENTRAR, "ana@email.com", SENHA)
                .andExpect(status().isOk())
                .andReturn();
        Cookie logada = resultado.getResponse().getCookie("SESSION");

        // Proteção contra "session fixation": o id da sessão anônima não vale mais...
        assertThat(logada.getValue()).isNotEqualTo(anonima.cookie().getValue());
        mockMvc.perform(get(URL_EU).cookie(anonima.cookie())).andExpect(status().isUnauthorized());

        // ...e o token CSRF de antes do login também não serve depois dele.
        mockMvc.perform(post(URL_SAIR).cookie(logada).header(CABECALHO_CSRF, anonima.token()))
                .andExpect(status().isForbidden());
        Sessao nova = sessaoDe(logada);
        assertThat(nova.token()).isNotEqualTo(anonima.token());
        mockMvc.perform(get(URL_EU).cookie(logada)).andExpect(status().isOk());
    }

    @Test
    void asSessoesGuardamOIdDoUsuarioComoPrincipal() throws Exception {
        MvcResult resultado = enviar(anonima(), URL, "ana@email.com", SENHA)
                .andExpect(status().isCreated())
                .andReturn();
        String id = JsonPath.read(resultado.getResponse().getContentAsString(), "$.id");

        Integer sessoesDoUsuario = jdbc.queryForObject(
                "SELECT count(*) FROM spring_session WHERE principal_name = ?", Integer.class, id);

        assertThat(sessoesDoUsuario).isEqualTo(1);
    }

    @Test
    void entrarComSenhaErradaEComEmailInexistenteDaoARespostaIdentica() throws Exception {
        cadastrar("ana@email.com", SENHA).andExpect(status().isCreated());

        MvcResult senhaErrada = enviar(anonima(), URL_ENTRAR, "ana@email.com", "senha errada qualquer")
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.title").value("Credenciais inválidas"))
                .andExpect(jsonPath("$.detail").value("E-mail ou senha inválidos."))
                .andReturn();
        MvcResult emailInexistente = enviar(anonima(), URL_ENTRAR, "ninguem@email.com", SENHA)
                .andExpect(status().isUnauthorized())
                .andReturn();

        assertThat(emailInexistente.getResponse().getContentAsString())
                .isEqualTo(senhaErrada.getResponse().getContentAsString());
        // Quem errou o login não ganha sessão autenticada.
        assertThat(senhaErrada.getResponse().getCookie("SESSION")).isNull();
    }

    @Test
    void usuarioComHashForaDoFormatoNaoEntraENaoGeraErro500() throws Exception {
        jdbc.update("INSERT INTO usuario (email, senha_hash) VALUES ('legado@email.com', '!sem-login')");

        enviar(anonima(), URL_ENTRAR, "legado@email.com", SENHA)
                .andExpect(status().isUnauthorized());
    }

    @Test
    void sairEncerraASessaoNoServidor() throws Exception {
        cadastrar("ana@email.com", SENHA).andExpect(status().isCreated());
        Cookie logada = entrar("ana@email.com", SENHA).getResponse().getCookie("SESSION");
        Sessao sessao = sessaoDe(logada);

        mockMvc.perform(post(URL_SAIR).cookie(logada).header(CABECALHO_CSRF, sessao.token()))
                .andExpect(status().isNoContent());

        // Mesmo que alguém tenha guardado o cookie, a sessão não existe mais no servidor.
        mockMvc.perform(get(URL_EU).cookie(logada)).andExpect(status().isUnauthorized());
    }

    @Test
    void sairSemEstarLogadoTambemRetorna204() throws Exception {
        Sessao anonima = anonima();

        mockMvc.perform(post(URL_SAIR).cookie(anonima.cookie()).header(CABECALHO_CSRF, anonima.token()))
                .andExpect(status().isNoContent());
    }

    @Test
    void euSemLoginRetorna401EmProblemDetail() throws Exception {
        mockMvc.perform(get(URL_EU))
                .andExpect(status().isUnauthorized())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.title").value("Não autenticado"))
                .andExpect(jsonPath("$.detail").value("Entre na sua conta para continuar."));
    }

    @Test
    void aApiEFechadaPorPadraoParaQuemNaoEstaLogado() throws Exception {
        mockMvc.perform(get("/api/v1/categorias")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/v1/transacoes")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/v1/saldo")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/v1/rota-que-nao-existe")).andExpect(status().isUnauthorized());
    }

    @Test
    void aSessaoAnonimaNaoGanhaAcessoMesmoComTokenCsrfValido() throws Exception {
        Sessao anonima = anonima();

        mockMvc.perform(post("/api/v1/categorias").cookie(anonima.cookie()).header(CABECALHO_CSRF, anonima.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nome\": \"Mercado\", \"tipo\": \"DESPESA\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void oHealthCheckContinuaPublico() throws Exception {
        mockMvc.perform(get("/actuator/health")).andExpect(status().isOk());
    }

    // ------------------------------------------------------------------ auxiliares ("o navegador")

    private int contas(String email) {
        Integer total = jdbc.queryForObject("SELECT count(*) FROM usuario WHERE email = ?", Integer.class, email);
        return total == null ? 0 : total;
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

    private ResultActions enviar(Sessao sessao, String url, String email, String senha) throws Exception {
        return mockMvc.perform(post(url).cookie(sessao.cookie()).header(CABECALHO_CSRF, sessao.token())
                .contentType(MediaType.APPLICATION_JSON).content(json(email, senha)));
    }

    /** Entra como o app: token da sessão anônima, depois o login. Devolve a resposta (com o cookie novo). */
    private MvcResult entrar(String email, String senha) throws Exception {
        return enviar(anonima(), URL_ENTRAR, email, senha).andExpect(status().isOk()).andReturn();
    }

    private ResultActions cadastrar(String email, String senha) throws Exception {
        return enviar(anonima(), URL, email, senha);
    }

    private static String json(String email, String senha) {
        return "{\"email\": \"%s\", \"senha\": \"%s\"}".formatted(email, senha);
    }
}

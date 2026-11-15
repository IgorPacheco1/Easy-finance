package io.github.igorpacheco1.easyfinance.shared;

import com.jayway.jsonpath.JsonPath;
import io.github.igorpacheco1.easyfinance.TestcontainersConfiguration;
import io.github.igorpacheco1.easyfinance.UsuarioDeTeste;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Confere os cabeçalhos de segurança nas respostas de <b>recusa</b>: 401 (sem login), 403 (sem
 * token CSRF) e 429 (tentativas demais). Revisão de segurança do M5 (#132).
 *
 * <p>Por que um teste à parte: o 401 e o 403 nascem dentro do Spring Security, antes do
 * {@code CabecalhosDeSegurancaFilter}, e quem escreve o {@code Cache-Control} neles é o próprio
 * Spring (com o valor padrão dele, mais longo, que também contém {@code no-store}). O 429 vem
 * do controller e leva o valor do nosso filtro. Os dois valores bastam, e este teste garante que
 * nenhuma recusa deixe de proibir o cache nem de proibir a troca de tipo.
 *
 * <p>Sem {@code @ComoUsuarioDeTeste} de propósito: ele colocaria um token CSRF em toda
 * requisição, e aqui queremos justamente a requisição sem ele.
 */
@Import(TestcontainersConfiguration.class)
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class CabecalhosNasRecusasApiTests {

    private static final String CABECALHO_CSRF = "X-XSRF-TOKEN";

    @Autowired
    private MockMvc mockMvc;

    @Test
    void respostaSemLoginTemOsCabecalhos() throws Exception {
        verificar(mockMvc.perform(get("/api/v1/categorias")).andExpect(status().isUnauthorized()));
    }

    @Test
    @WithMockUser(username = UsuarioDeTeste.ID_TEXTO)
    void respostaSemTokenCsrfTemOsCabecalhos() throws Exception {
        verificar(mockMvc.perform(post("/api/v1/categorias").contentType(MediaType.APPLICATION_JSON)
                .content("{\"nome\": \"x\", \"tipo\": \"DESPESA\"}")).andExpect(status().isForbidden()));
    }

    @Test
    void respostaDeTentativasDemaisTemOsCabecalhos() throws Exception {
        // Cinco falhas bloqueiam o e-mail (easyfinance.login.max-falhas-por-email); a seguinte dá 429.
        for (int i = 0; i < 5; i++) {
            entrar("ninguem@email.com").andExpect(status().isUnauthorized());
        }

        ResultActions resposta = entrar("ninguem@email.com").andExpect(status().isTooManyRequests());

        resposta.andExpect(header().exists("Retry-After"));
        verificar(resposta);
    }

    private void verificar(ResultActions resposta) throws Exception {
        resposta
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(header().string("Cache-Control", containsString("no-store")))
                .andExpect(header().string("X-Content-Type-Options", "nosniff"));
    }

    /** Tenta entrar com senha errada, como o app: token CSRF da sessão anônima e depois o POST. */
    private ResultActions entrar(String email) throws Exception {
        MvcResult csrf = mockMvc.perform(get("/api/v1/auth/csrf")).andExpect(status().isOk()).andReturn();
        Cookie cookie = csrf.getResponse().getCookie("SESSION");
        String token = JsonPath.read(csrf.getResponse().getContentAsString(), "$.token");
        return mockMvc.perform(post("/api/v1/auth/entrar").cookie(cookie).header(CABECALHO_CSRF, token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\": \"%s\", \"senha\": \"senha errada qualquer\"}".formatted(email)));
    }
}

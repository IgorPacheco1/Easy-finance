package io.github.igorpacheco1.guarda.limites;

import io.github.igorpacheco1.guarda.MockMvcComCsrfConfiguration;
import io.github.igorpacheco1.guarda.TestcontainersConfiguration;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Testa os limites do ADR-0035 de ponta a ponta, com os valores reais da configuração (120
 * requisições por minuto e 3 cadastros por hora, por IP) e PostgreSQL real (Testcontainers).
 *
 * <p>Cada teste começa com os contadores zerados ({@code LimitesNosTestesTestExecutionListener}).
 * O MockMvc chama do IP 127.0.0.1; para simular outra rede, {@link #doIp(String)}.
 */
@Import({TestcontainersConfiguration.class, MockMvcComCsrfConfiguration.class})
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class LimitesApiTests {

    private static final int MAX_REQUISICOES = 120;
    private static final String URL_PUBLICA = "/api/v1/auth/csrf";
    private static final String URL_CADASTRO = "/api/v1/auth/cadastro";

    @Autowired
    private MockMvc mockMvc;

    // ------------------------------------------------------------------ limite geral

    @Test
    void ateOMaximoPassaEOSeguinteRecebe429EmProblemDetail() throws Exception {
        gastarACota();

        MvcResult recusado = mockMvc.perform(get(URL_PUBLICA))
                .andExpect(status().isTooManyRequests())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.title").value("Muitas requisições"))
                .andExpect(jsonPath("$.status").value(429))
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(header().string("X-Content-Type-Options", "nosniff"))
                .andReturn();

        long retryAfter = Long.parseLong(recusado.getResponse().getHeader("Retry-After"));
        assertThat(retryAfter).isBetween(1L, 60L);
    }

    @Test
    void quemNaoEstaLogadoTambemEContadoEOLimiteVemAntesDoLogin() throws Exception {
        gastarACota();

        // Sem limite, seria 401. O 429 mostra que o filtro roda antes do Spring Security.
        mockMvc.perform(get("/api/v1/eu")).andExpect(status().isTooManyRequests());
    }

    @Test
    void oLimiteDeUmIpNaoBarraOutro() throws Exception {
        gastarACota();

        mockMvc.perform(get(URL_PUBLICA).with(doIp("198.51.100.9"))).andExpect(status().isOk());
    }

    @Test
    void oHealthCheckFicaForaDoLimite() throws Exception {
        // O health não gasta a cota: depois de mais chamadas ao health que o máximo, as 120
        // requisições da API ainda passam todas...
        for (int i = 0; i < MAX_REQUISICOES + 10; i++) {
            mockMvc.perform(get("/actuator/health")).andExpect(status().isOk());
        }
        gastarACota();

        // ...e o health continua respondendo com a cota da API já acabada.
        mockMvc.perform(get(URL_PUBLICA)).andExpect(status().isTooManyRequests());
        mockMvc.perform(get("/actuator/health")).andExpect(status().isOk());
    }

    // ------------------------------------------------------------------ limite de cadastros

    @Test
    void depoisDeTresContasOQuartoCadastroDoMesmoIpRecebe429() throws Exception {
        cadastrar("ana@email.com").andExpect(status().isCreated());
        cadastrar("bia@email.com").andExpect(status().isCreated());
        cadastrar("caio@email.com").andExpect(status().isCreated());

        MvcResult recusado = cadastrar("davi@email.com")
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.title").value("Muitas contas novas"))
                .andExpect(jsonPath("$.detail").value("Muitas contas criadas a partir desta rede. Tente de novo em 60 minutos."))
                .andReturn();

        long retryAfter = Long.parseLong(recusado.getResponse().getHeader("Retry-After"));
        assertThat(retryAfter).isBetween(1L, 3_600L);
        assertThat(recusado.getResponse().getCookie("SESSION")).isNull();
    }

    @Test
    void cadastrosQueFalhamNaoGastamACota() throws Exception {
        cadastrar("ana@email.com").andExpect(status().isCreated());
        for (int i = 0; i < 3; i++) {
            cadastrar("isso-nao-e-email").andExpect(status().isBadRequest());
            cadastrar("ana@email.com").andExpect(status().isConflict());
        }

        cadastrar("bia@email.com").andExpect(status().isCreated());
        cadastrar("caio@email.com").andExpect(status().isCreated());
    }

    @Test
    void oLimiteDeCadastrosDeUmIpNaoBarraOutro() throws Exception {
        cadastrar("ana@email.com").andExpect(status().isCreated());
        cadastrar("bia@email.com").andExpect(status().isCreated());
        cadastrar("caio@email.com").andExpect(status().isCreated());

        mockMvc.perform(post(URL_CADASTRO).with(doIp("198.51.100.9"))
                        .contentType(MediaType.APPLICATION_JSON).content(jsonDoCadastro("davi@email.com")))
                .andExpect(status().isCreated());
    }

    /** Faz as 120 requisições permitidas no minuto, conferindo que todas passaram. */
    private void gastarACota() throws Exception {
        for (int i = 0; i < MAX_REQUISICOES; i++) {
            mockMvc.perform(get(URL_PUBLICA)).andExpect(status().isOk());
        }
    }

    private ResultActions cadastrar(String email) throws Exception {
        return mockMvc.perform(post(URL_CADASTRO).contentType(MediaType.APPLICATION_JSON).content(jsonDoCadastro(email)));
    }

    private static String jsonDoCadastro(String email) {
        return "{\"email\": \"%s\", \"senha\": \"uma senha longa\", \"nome\": \"Ana\"}".formatted(email);
    }

    /** Faz a requisição parecer vir de outro IP. */
    private static RequestPostProcessor doIp(String ip) {
        return request -> {
            request.setRemoteAddr(ip);
            return request;
        };
    }
}

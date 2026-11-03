package io.github.igorpacheco1.easyfinance.config;

import io.github.igorpacheco1.easyfinance.TestcontainersConfiguration;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Garante que, com a configuração base (a mesma de produção), a especificação OpenAPI e o
 * Swagger UI não ficam expostos (ADR-0010).
 */
@Import(TestcontainersConfiguration.class)
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class DocumentacaoDaApiDesligadaTests {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void especificacaoNaoFicaExpostaForaDoPerfilDev() throws Exception {
        mockMvc.perform(get("/v3/api-docs")).andExpect(status().isNotFound());
    }

    @Test
    void swaggerUiNaoFicaExpostoForaDoPerfilDev() throws Exception {
        mockMvc.perform(get("/swagger-ui.html")).andExpect(status().isNotFound());
    }
}

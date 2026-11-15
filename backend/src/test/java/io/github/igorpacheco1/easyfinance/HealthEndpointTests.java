package io.github.igorpacheco1.easyfinance;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Garante que o health check responde e que a configuração de produção não expõe
 * detalhes internos nem outros endpoints do Actuator.
 */
@Import(TestcontainersConfiguration.class)
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class HealthEndpointTests {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void healthRespondeUpComOBancoDisponivel() throws Exception {
        mockMvc.perform(get("/actuator/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"));
    }

    @Test
    void healthNaoExpoeDetalhesInternos() throws Exception {
        mockMvc.perform(get("/actuator/health"))
                .andExpect(jsonPath("$.components").doesNotExist());
    }

    @Test
    void outrosEndpointsDoActuatorNaoFicamExpostos() throws Exception {
        // Logado, eles simplesmente não existem.
        mockMvc.perform(get("/actuator/env").with(user("qualquer")))
                .andExpect(status().isNotFound());
        mockMvc.perform(get("/actuator").with(user("qualquer")))
                .andExpect(status().isNotFound());
    }

    @Test
    void outrosEndpointsDoActuatorExigemLoginParaQuemEstaDeFora() throws Exception {
        mockMvc.perform(get("/actuator/env")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/actuator")).andExpect(status().isUnauthorized());
    }
}

package io.github.igorpacheco1.guarda.estatisticas;

import io.github.igorpacheco1.guarda.ComoUsuarioDeTeste;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Testa só a camada HTTP das estatísticas (#194), com o service simulado. */
@ComoUsuarioDeTeste
@WebMvcTest(EstatisticasController.class)
class EstatisticasControllerTests {

    private static final String URL = "/api/v1/eu/estatisticas";

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private EstatisticasService service;

    @Test
    void semFusoUsaSaoPaulo() throws Exception {
        when(service.calcular("America/Sao_Paulo"))
                .thenReturn(new EstatisticasResponse(LocalDate.parse("2026-11-01"), 3, 42, 7));

        mockMvc.perform(get(URL))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.desde").value("2026-11-01"))
                .andExpect(jsonPath("$.sequenciaDeDias").value(3))
                .andExpect(jsonPath("$.totalDeLancamentos").value(42))
                .andExpect(jsonPath("$.totalDeCategorias").value(7));
    }

    @Test
    void passaOFusoDoAparelho() throws Exception {
        when(service.calcular("America/Manaus"))
                .thenReturn(new EstatisticasResponse(LocalDate.parse("2026-11-01"), 1, 1, 1));

        mockMvc.perform(get(URL).param("fuso", "America/Manaus"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sequenciaDeDias").value(1));
    }
}

package io.github.igorpacheco1.easyfinance.transacao;

import io.github.igorpacheco1.easyfinance.transacao.dto.ResumoResponse;
import io.github.igorpacheco1.easyfinance.transacao.dto.ResumoResponse.ResumoDaCategoria;
import io.github.igorpacheco1.easyfinance.transacao.dto.ResumoResponse.ResumoDoTipo;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Testa só a camada HTTP do resumo, com o service simulado. */
@WebMvcTest(ResumoController.class)
class ResumoControllerTests {

    private static final String URL = "/api/v1/resumo";

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private TransacaoService service;

    @Test
    void retornaOResumoNoFormatoDaApi() throws Exception {
        LocalDate de = LocalDate.parse("2026-11-01");
        LocalDate ate = LocalDate.parse("2026-11-30");
        ResumoDaCategoria mercado = new ResumoDaCategoria(UUID.randomUUID(), "Mercado",
                new BigDecimal("800.00"), 12, new BigDecimal("61.5"));
        when(service.resumir(de, ate)).thenReturn(new ResumoResponse(de, ate,
                new ResumoDoTipo(new BigDecimal("0.00"), List.of()),
                new ResumoDoTipo(new BigDecimal("1300.00"), List.of(mercado))));

        mockMvc.perform(get(URL).param("de", "2026-11-01").param("ate", "2026-11-30"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.de").value("2026-11-01"))
                .andExpect(jsonPath("$.receitas.categorias").isEmpty())
                .andExpect(jsonPath("$.despesas.total").value(1300.00))
                .andExpect(jsonPath("$.despesas.categorias[0].nome").value("Mercado"))
                .andExpect(jsonPath("$.despesas.categorias[0].quantidade").value(12))
                .andExpect(jsonPath("$.despesas.categorias[0].percentual").value(61.5));
    }

    @Test
    void semADataInicialNemChamaOService() throws Exception {
        mockMvc.perform(get(URL).param("ate", "2026-11-30"))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentType(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.detail").value("O parâmetro 'de' é obrigatório."));

        verify(service, never()).resumir(any(), any());
    }
}

package io.github.igorpacheco1.easyfinance.transacao;

import io.github.igorpacheco1.easyfinance.transacao.dto.SaldoResponse;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Testa só a camada HTTP do saldo, com o service simulado. */
@WebMvcTest(SaldoController.class)
class SaldoControllerTests {

    private static final String URL = "/api/v1/saldo";

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private TransacaoService service;

    @Test
    void retornaOsTotaisDoPeriodo() throws Exception {
        LocalDate de = LocalDate.parse("2026-11-01");
        LocalDate ate = LocalDate.parse("2026-11-30");
        when(service.calcularSaldo(de, ate)).thenReturn(new SaldoResponse(de, ate,
                new BigDecimal("3200.00"), new BigDecimal("1300.00"), new BigDecimal("1900.00")));

        mockMvc.perform(get(URL).param("de", "2026-11-01").param("ate", "2026-11-30"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.de").value("2026-11-01"))
                .andExpect(jsonPath("$.receitas").value(3200.00))
                .andExpect(jsonPath("$.despesas").value(1300.00))
                .andExpect(jsonPath("$.saldo").value(1900.00));
    }

    @Test
    void semADataFinalNemChamaOService() throws Exception {
        mockMvc.perform(get(URL).param("de", "2026-11-01"))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentType(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.title").value("Parâmetro obrigatório"))
                .andExpect(jsonPath("$.detail").value("O parâmetro 'ate' é obrigatório."));

        verify(service, never()).calcularSaldo(any(), any());
    }

    @Test
    void dataEmFormatoErradoRetorna400() throws Exception {
        mockMvc.perform(get(URL).param("de", "01/11/2026").param("ate", "2026-11-30"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.title").value("Parâmetro inválido"))
                .andExpect(jsonPath("$.detail").value("O valor informado para 'de' tem um formato inválido."));
    }
}

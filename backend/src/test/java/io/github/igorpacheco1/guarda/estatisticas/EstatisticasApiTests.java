package io.github.igorpacheco1.guarda.estatisticas;

import io.github.igorpacheco1.guarda.ComoUsuarioDeTeste;
import io.github.igorpacheco1.guarda.TestcontainersConfiguration;
import io.github.igorpacheco1.guarda.UsuarioDeTeste;
import io.github.igorpacheco1.guarda.UsuarioDeTesteNoBanco;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.convention.TestBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Testa o {@code GET /api/v1/eu/estatisticas} (#194) com PostgreSQL real: o dia de cada lançamento
 * no fuso é calculado pelo banco ({@code AT TIME ZONE}), então é aqui que ele é conferido.
 *
 * <p>O relógio fica parado em 03/11/2026 às 12:00 UTC (09:00 em São Paulo).
 */
@ComoUsuarioDeTeste
@Import({TestcontainersConfiguration.class, UsuarioDeTesteNoBanco.class})
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class EstatisticasApiTests {

    private static final String URL = "/api/v1/eu/estatisticas";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbc;

    /** Substitui o Clock da aplicação pelo que o método {@link #clock()} devolve. */
    @TestBean
    private Clock clock;

    private UUID mercado;
    private UUID transporte;

    static Clock clock() {
        return Clock.fixed(Instant.parse("2026-11-03T12:00:00Z"), ZoneOffset.UTC);
    }

    @BeforeEach
    void buscarCategorias() {
        mercado = jdbc.queryForObject("SELECT id FROM categoria WHERE sistema AND nome = 'Mercado'", UUID.class);
        transporte = jdbc.queryForObject("SELECT id FROM categoria WHERE sistema AND nome = 'Transporte'", UUID.class);
    }

    @Test
    void semLancamentosDaZeroEmTudo() throws Exception {
        estatisticas(null)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.desde").exists())
                .andExpect(jsonPath("$.sequenciaDeDias").value(0))
                .andExpect(jsonPath("$.totalDeLancamentos").value(0))
                .andExpect(jsonPath("$.totalDeCategorias").value(0));
    }

    @Test
    void contaOsLancamentosEAsCategoriasDiferentesUsadas() throws Exception {
        lancar(mercado, "2026-11-03T11:00:00Z");
        lancar(mercado, "2026-11-02T11:00:00Z");
        lancar(transporte, "2026-11-01T11:00:00Z");

        estatisticas(null)
                .andExpect(jsonPath("$.totalDeLancamentos").value(3))
                .andExpect(jsonPath("$.totalDeCategorias").value(2))
                .andExpect(jsonPath("$.sequenciaDeDias").value(3));
    }

    @Test
    void oDiaDoLancamentoDependeDoFuso() throws Exception {
        // 03/11 às 02:30 UTC: em UTC é dia 3; em São Paulo ainda era 02/11, às 23:30.
        lancar(mercado, "2026-11-03T02:30:00Z");
        // 01/11 às 15:00 UTC: dia 1 nos dois fusos.
        lancar(mercado, "2026-11-01T15:00:00Z");

        // Em São Paulo: dias 2 e 1, e hoje (dia 3) ainda sem lançamento: sequência de 2.
        estatisticas("America/Sao_Paulo").andExpect(jsonPath("$.sequenciaDeDias").value(2));
        // Em UTC: dias 3 e 1, com o dia 2 vazio no meio: sequência de 1.
        estatisticas("UTC").andExpect(jsonPath("$.sequenciaDeDias").value(1));
    }

    @Test
    void transacaoDeOutraPessoaNaoConta() throws Exception {
        UUID outra = UUID.randomUUID();
        jdbc.update("INSERT INTO usuario (id, email, senha_hash) VALUES (?, 'outra@email.com', '!sem-login')", outra);
        jdbc.update("""
                INSERT INTO transacao (usuario_id, categoria_id, valor, data, criado_em)
                VALUES (?, ?, 10.00, CAST('2026-11-03' AS DATE), CAST('2026-11-03T11:00:00Z' AS TIMESTAMPTZ))
                """, outra, mercado);

        estatisticas(null)
                .andExpect(jsonPath("$.totalDeLancamentos").value(0))
                .andExpect(jsonPath("$.sequenciaDeDias").value(0));
    }

    @Test
    void fusoInvalidoRetorna400() throws Exception {
        estatisticas("+03:00")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erros[0].campo").value("fuso"));
    }

    private ResultActions estatisticas(String fuso) throws Exception {
        var pedido = get(URL);
        return mockMvc.perform(fuso == null ? pedido : pedido.param("fuso", fuso));
    }

    private void lancar(UUID categoriaId, String criadoEm) {
        jdbc.update("""
                INSERT INTO transacao (usuario_id, categoria_id, valor, data, criado_em)
                VALUES (?::uuid, ?, ?, CAST(? AS DATE), CAST(? AS TIMESTAMPTZ))
                """, UsuarioDeTeste.ID_TEXTO, categoriaId, new BigDecimal("10.00"), criadoEm.substring(0, 10), criadoEm);
    }
}

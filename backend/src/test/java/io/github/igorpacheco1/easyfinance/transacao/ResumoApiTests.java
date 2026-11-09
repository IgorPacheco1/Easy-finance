package io.github.igorpacheco1.easyfinance.transacao;

import io.github.igorpacheco1.easyfinance.TestcontainersConfiguration;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.UUID;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Testa o {@code GET /api/v1/resumo} (#95) com PostgreSQL real: a soma e o agrupamento são
 * feitos pelo banco, então é aqui que eles são conferidos de verdade.
 *
 * <p>As transações entram direto no banco (JdbcTemplate), como no {@link SaldoApiTests}.
 */
@Import(TestcontainersConfiguration.class)
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class ResumoApiTests {

    private static final String URL = "/api/v1/resumo";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbc;

    private UUID salario;
    private UUID rendaExtra;
    private UUID mercado;
    private UUID transporte;

    @BeforeEach
    void buscarCategoriasDoSistema() {
        salario = idDaCategoria("Salário");
        rendaExtra = idDaCategoria("Renda extra");
        mercado = idDaCategoria("Mercado");
        transporte = idDaCategoria("Transporte");
    }

    @Test
    void periodoSemLancamentosDaListasVaziasETotaisZero() throws Exception {
        resumo("2026-11-01", "2026-11-30")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.de").value("2026-11-01"))
                .andExpect(jsonPath("$.receitas.total").value(0.0))
                .andExpect(jsonPath("$.receitas.categorias", hasSize(0)))
                .andExpect(jsonPath("$.despesas.total").value(0.0))
                .andExpect(jsonPath("$.despesas.categorias", hasSize(0)));
    }

    @Test
    void somaPorCategoriaDaMaiorParaAMenor() throws Exception {
        inserir(mercado, "500.00", "2026-11-03");
        inserir(mercado, "300.00", "2026-11-10");
        inserir(transporte, "23.50", "2026-11-04");
        inserir(transporte, "476.50", "2026-11-20");
        inserir(transporte, "100.00", "2026-11-21");
        inserir(salario, "3000.00", "2026-11-05");
        inserir(rendaExtra, "200.00", "2026-11-15");

        resumo("2026-11-01", "2026-11-30")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.despesas.total").value(1400.00))
                .andExpect(jsonPath("$.despesas.categorias[*].nome", contains("Mercado", "Transporte")))
                .andExpect(jsonPath("$.despesas.categorias[*].total", contains(800.00, 600.00)))
                .andExpect(jsonPath("$.despesas.categorias[*].quantidade", contains(2, 3)))
                .andExpect(jsonPath("$.despesas.categorias[*].percentual", contains(57.1, 42.9)))
                .andExpect(jsonPath("$.receitas.total").value(3200.00))
                .andExpect(jsonPath("$.receitas.categorias[*].nome", contains("Salário", "Renda extra")))
                .andExpect(jsonPath("$.receitas.categorias[*].percentual", contains(93.8, 6.3)));
    }

    @Test
    void totalDoTipoBateComOSaldo() throws Exception {
        inserir(mercado, "1250.40", "2026-11-12");
        inserir(mercado, "49.60", "2026-11-20");
        inserir(salario, "3200.00", "2026-11-05");

        resumo("2026-11-01", "2026-11-30")
                .andExpect(jsonPath("$.despesas.total").value(1300.00))
                .andExpect(jsonPath("$.receitas.total").value(3200.00));
        mockMvc.perform(get("/api/v1/saldo").param("de", "2026-11-01").param("ate", "2026-11-30"))
                .andExpect(jsonPath("$.despesas").value(1300.00))
                .andExpect(jsonPath("$.receitas").value(3200.00));
    }

    @Test
    void contaOsDiasDasPontasEIgnoraOsDeFora() throws Exception {
        inserir(mercado, "1000.00", "2026-10-31"); // fora
        inserir(mercado, "10.00", "2026-11-01");   // primeiro dia
        inserir(transporte, "20.00", "2026-11-30"); // último dia
        inserir(transporte, "1000.00", "2026-12-01"); // fora

        resumo("2026-11-01", "2026-11-30")
                .andExpect(jsonPath("$.despesas.total").value(30.00))
                .andExpect(jsonPath("$.despesas.categorias[*].nome", contains("Transporte", "Mercado")));
    }

    @Test
    void empateNoTotalOrdenaPeloNome() throws Exception {
        inserir(transporte, "50.00", "2026-11-03");
        inserir(mercado, "50.00", "2026-11-04");

        resumo("2026-11-01", "2026-11-30")
                .andExpect(jsonPath("$.despesas.categorias[*].nome", contains("Mercado", "Transporte")))
                .andExpect(jsonPath("$.despesas.categorias[*].percentual", contains(50.0, 50.0)));
    }

    @Test
    void dataInicialDepoisDaFinalRetorna400() throws Exception {
        resumo("2026-11-30", "2026-11-01")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erros[0].campo").value("ate"));
    }

    // ---------------------------------------------------------------- auxiliares

    private ResultActions resumo(String de, String ate) throws Exception {
        return mockMvc.perform(get(URL).param("de", de).param("ate", ate));
    }

    private void inserir(UUID categoriaId, String valor, String data) {
        jdbc.update("INSERT INTO transacao (categoria_id, valor, data) VALUES (?, ?, CAST(? AS DATE))",
                categoriaId, new BigDecimal(valor), data);
    }

    private UUID idDaCategoria(String nome) {
        return jdbc.queryForObject("SELECT id FROM categoria WHERE sistema AND nome = ?", UUID.class, nome);
    }
}

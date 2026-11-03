package io.github.igorpacheco1.easyfinance.transacao;

import io.github.igorpacheco1.easyfinance.TestcontainersConfiguration;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Testa o {@code GET /api/v1/saldo} com PostgreSQL real.
 *
 * <p>As transações entram direto no banco (JdbcTemplate): o foco aqui é a conta, não a criação.
 * Usa as categorias do sistema "Salário" e "Renda extra" (RECEITA) e "Mercado" (DESPESA).
 */
@Import(TestcontainersConfiguration.class)
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class SaldoApiTests {

    private static final String URL = "/api/v1/saldo";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbc;

    private UUID salario;
    private UUID rendaExtra;
    private UUID mercado;

    @BeforeEach
    void buscarCategoriasDoSistema() {
        salario = idDaCategoria("Salário");
        rendaExtra = idDaCategoria("Renda extra");
        mercado = idDaCategoria("Mercado");
    }

    @Test
    void periodoSemTransacoesRetornaTudoZero() throws Exception {
        saldo("2026-11-01", "2026-11-30")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.de").value("2026-11-01"))
                .andExpect(jsonPath("$.ate").value("2026-11-30"))
                .andExpect(jsonPath("$.receitas").value(0.0))
                .andExpect(jsonPath("$.despesas").value(0.0))
                .andExpect(jsonPath("$.saldo").value(0.0));
    }

    @Test
    void saldoEhReceitasMenosDespesas() throws Exception {
        inserir(salario, "3000.00", "2026-11-05");
        inserir(rendaExtra, "200.00", "2026-11-10");
        inserir(mercado, "1250.40", "2026-11-12");
        inserir(mercado, "49.60", "2026-11-20");

        saldo("2026-11-01", "2026-11-30")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.receitas").value(3200.00))
                .andExpect(jsonPath("$.despesas").value(1300.00))
                .andExpect(jsonPath("$.saldo").value(1900.00));
    }

    @Test
    void somaEmDecimalExatoSemErroDeArredondamento() throws Exception {
        // Com double, 0.10 + 0.20 daria 0.30000000000000004.
        inserir(rendaExtra, "0.10", "2026-11-05");
        inserir(rendaExtra, "0.20", "2026-11-06");

        saldo("2026-11-01", "2026-11-30")
                .andExpect(jsonPath("$.receitas").value(0.30))
                .andExpect(jsonPath("$.saldo").value(0.30));
    }

    @Test
    void contaOsDiasDasPontasEIgnoraOsDeFora() throws Exception {
        inserir(salario, "1000.00", "2026-10-31"); // fora
        inserir(salario, "10.00", "2026-11-01");   // primeiro dia
        inserir(salario, "20.00", "2026-11-30");   // último dia
        inserir(salario, "1000.00", "2026-12-01"); // fora

        saldo("2026-11-01", "2026-11-30")
                .andExpect(jsonPath("$.receitas").value(30.00))
                .andExpect(jsonPath("$.saldo").value(30.00));
    }

    @Test
    void soReceitasDaSaldoIgualAsReceitas() throws Exception {
        inserir(salario, "3000.00", "2026-11-05");

        saldo("2026-11-01", "2026-11-30")
                .andExpect(jsonPath("$.receitas").value(3000.00))
                .andExpect(jsonPath("$.despesas").value(0.0))
                .andExpect(jsonPath("$.saldo").value(3000.00));
    }

    @Test
    void soDespesasDaSaldoNegativo() throws Exception {
        inserir(mercado, "150.75", "2026-11-05");

        saldo("2026-11-01", "2026-11-30")
                .andExpect(jsonPath("$.receitas").value(0.0))
                .andExpect(jsonPath("$.despesas").value(150.75))
                .andExpect(jsonPath("$.saldo").value(-150.75));
    }

    @Test
    void semAsDatasRetorna400ParametroObrigatorio() throws Exception {
        mockMvc.perform(get(URL).param("ate", "2026-11-30"))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentType(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.title").value("Parâmetro obrigatório"))
                .andExpect(jsonPath("$.detail").value("O parâmetro 'de' é obrigatório."));
    }

    @Test
    void dataInicialDepoisDaFinalRetorna400() throws Exception {
        saldo("2026-11-30", "2026-11-01")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erros[0].campo").value("ate"));
    }

    // ---------------------------------------------------------------- auxiliares

    private ResultActions saldo(String de, String ate) throws Exception {
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

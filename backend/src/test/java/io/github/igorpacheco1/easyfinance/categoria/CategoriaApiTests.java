package io.github.igorpacheco1.easyfinance.categoria;

import com.jayway.jsonpath.JsonPath;
import io.github.igorpacheco1.easyfinance.TestcontainersConfiguration;
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

import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.matchesPattern;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Testa a API de categorias de ponta a ponta: requisição HTTP → controller → service →
 * PostgreSQL real (Testcontainers) → resposta.
 *
 * <p>{@code @Transactional} desfaz o que cada teste gravou, então o banco começa todo teste
 * só com as 19 categorias do sistema.
 */
@Import(TestcontainersConfiguration.class)
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class CategoriaApiTests {

    private static final String URL = "/api/v1/categorias";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbc;

    // ---------------------------------------------------------------- criar

    @Test
    void criarRetorna201ComLocationENomeSemEspacosNasPontas() throws Exception {
        criar("  Pets  ", "DESPESA")
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", matchesPattern(".*/api/v1/categorias/[0-9a-f-]{36}$")))
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.nome").value("Pets"))
                .andExpect(jsonPath("$.tipo").value("DESPESA"))
                .andExpect(jsonPath("$.sistema").value(false));
    }

    @Test
    void criarComNomeRepetidoRetorna409IgnorandoMaiusculas() throws Exception {
        criar("Pets", "DESPESA").andExpect(status().isCreated());

        criar("pets", "RECEITA")
                .andExpect(status().isConflict())
                .andExpect(content().contentType(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.status").value(409))
                .andExpect(jsonPath("$.title").value("Nome de categoria já existe"));
    }

    @Test
    void criarComNomeDeCategoriaDoSistemaRetorna409() throws Exception {
        criar("MERCADO", "DESPESA").andExpect(status().isConflict());
    }

    @Test
    void criarComNomeEmBrancoRetorna400() throws Exception {
        criar("   ", "DESPESA")
                .andExpect(status().isBadRequest())
                .andExpect(content().contentType(MediaType.APPLICATION_PROBLEM_JSON));
    }

    @Test
    void criarComNomeMaiorQue50CaracteresRetorna400() throws Exception {
        criar("a".repeat(51), "DESPESA").andExpect(status().isBadRequest());
    }

    @Test
    void criarSemTipoRetorna400() throws Exception {
        mockMvc.perform(post(URL).contentType(MediaType.APPLICATION_JSON).content("""
                        {"nome": "Pets"}
                        """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void criarComTipoInvalidoRetorna400() throws Exception {
        criar("Pets", "OUTRO").andExpect(status().isBadRequest());
    }

    // ---------------------------------------------------------------- listar e buscar

    @Test
    void listarRetornaAsCategoriasDoSistema() throws Exception {
        mockMvc.perform(get(URL))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(19)));
    }

    @Test
    void listarFiltraPorTipo() throws Exception {
        mockMvc.perform(get(URL).param("tipo", "RECEITA"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(5)))
                .andExpect(jsonPath("$[*].tipo", everyItem(is("RECEITA"))));
    }

    // ---------------------------------------------------------------- ordem por uso (#97)

    @Test
    void ordemPorUsoTrazAsMaisUsadasNosUltimos90DiasPrimeiro() throws Exception {
        LocalDate hoje = LocalDate.now(ZoneOffset.UTC);
        // Transporte: 3 lançamentos recentes. Lazer: 2 recentes. Mercado: 5, mas todos antigos
        // (fora dos 90 dias), então não conta e volta para a ordem alfabética.
        lancar("Transporte", hoje, hoje.minusDays(1), hoje.minusDays(30));
        lancar("Lazer", hoje.minusDays(10), hoje.minusDays(89));
        lancar("Mercado", hoje.minusDays(120), hoje.minusDays(121), hoje.minusDays(122),
                hoje.minusDays(200), hoje.minusDays(300));

        String resposta = mockMvc.perform(get(URL).param("ordem", "USO").param("tipo", "DESPESA"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(14)))
                .andExpect(jsonPath("$[*].tipo", everyItem(is("DESPESA"))))
                .andReturn().getResponse().getContentAsString();

        List<String> nomes = JsonPath.read(resposta, "$[*].nome");
        assertThat(nomes.subList(0, 2)).containsExactly("Transporte", "Lazer");
        // O resto (sem uso no período, inclusive o Mercado) segue em ordem alfabética.
        List<String> resto = nomes.subList(2, nomes.size());
        assertThat(resto).contains("Mercado").isSortedAccordingTo(String.CASE_INSENSITIVE_ORDER);
    }

    @Test
    void semOrdemContinuaAlfabetica() throws Exception {
        lancar("Transporte", LocalDate.now(ZoneOffset.UTC));

        String resposta = mockMvc.perform(get(URL).param("tipo", "DESPESA"))
                .andReturn().getResponse().getContentAsString();

        List<String> nomes = JsonPath.read(resposta, "$[*].nome");
        assertThat(nomes).isSortedAccordingTo(String.CASE_INSENSITIVE_ORDER);
    }

    @Test
    void listarComTipoInvalidoRetorna400() throws Exception {
        mockMvc.perform(get(URL).param("tipo", "OUTRO"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void buscarPorIdRetornaACategoria() throws Exception {
        String id = idDaCriada("Pets", "DESPESA");

        mockMvc.perform(get(URL + "/" + id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id))
                .andExpect(jsonPath("$.nome").value("Pets"));
    }

    @Test
    void buscarIdInexistenteRetorna404() throws Exception {
        mockMvc.perform(get(URL + "/" + UUID.randomUUID()))
                .andExpect(status().isNotFound())
                .andExpect(content().contentType(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.status").value(404));
    }

    @Test
    void buscarComIdMalFormatadoRetorna400() throws Exception {
        mockMvc.perform(get(URL + "/123"))
                .andExpect(status().isBadRequest());
    }

    // ---------------------------------------------------------------- atualizar

    @Test
    void atualizarRenomeiaEMantemOTipo() throws Exception {
        String id = idDaCriada("Pets", "DESPESA");

        atualizar(id, "Animais")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nome").value("Animais"))
                .andExpect(jsonPath("$.tipo").value("DESPESA"));
    }

    @Test
    void atualizarPermiteMudarSoAsMaiusculasDoProprioNome() throws Exception {
        String id = idDaCriada("pets", "DESPESA");

        atualizar(id, "Pets")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nome").value("Pets"));
    }

    @Test
    void atualizarComNomeDeOutraCategoriaRetorna409() throws Exception {
        String id = idDaCriada("Pets", "DESPESA");

        atualizar(id, "lazer").andExpect(status().isConflict());
    }

    @Test
    void atualizarCategoriaDoSistemaRetorna409() throws Exception {
        atualizar(idDoSistema("Mercado").toString(), "Supermercado")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.title").value("Categoria do sistema"));
    }

    @Test
    void atualizarIdInexistenteRetorna404() throws Exception {
        atualizar(UUID.randomUUID().toString(), "Pets").andExpect(status().isNotFound());
    }

    // ---------------------------------------------------------------- excluir

    @Test
    void excluirRetorna204EACategoriaDeixaDeExistir() throws Exception {
        String id = idDaCriada("Pets", "DESPESA");

        mockMvc.perform(delete(URL + "/" + id)).andExpect(status().isNoContent());
        mockMvc.perform(get(URL + "/" + id)).andExpect(status().isNotFound());
    }

    @Test
    void excluirCategoriaDoSistemaRetorna409() throws Exception {
        mockMvc.perform(delete(URL + "/" + idDoSistema("Mercado")))
                .andExpect(status().isConflict());
    }

    @Test
    void excluirCategoriaComTransacoesRetorna409() throws Exception {
        String id = idDaCriada("Pets", "DESPESA");
        // A API de transações só chega na #18; por enquanto a transação entra direto no banco.
        jdbc.update("INSERT INTO transacao (categoria_id, valor, data) VALUES (?, 50.00, CURRENT_DATE)",
                UUID.fromString(id));

        mockMvc.perform(delete(URL + "/" + id))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.title").value("Categoria em uso"));
    }

    @Test
    void excluirIdInexistenteRetorna404() throws Exception {
        mockMvc.perform(delete(URL + "/" + UUID.randomUUID()))
                .andExpect(status().isNotFound());
    }

    // ---------------------------------------------------------------- auxiliares

    private ResultActions criar(String nome, String tipo) throws Exception {
        return mockMvc.perform(post(URL).contentType(MediaType.APPLICATION_JSON).content("""
                {"nome": "%s", "tipo": "%s"}
                """.formatted(nome, tipo)));
    }

    private ResultActions atualizar(String id, String nome) throws Exception {
        return mockMvc.perform(put(URL + "/" + id).contentType(MediaType.APPLICATION_JSON).content("""
                {"nome": "%s"}
                """.formatted(nome)));
    }

    private String idDaCriada(String nome, String tipo) throws Exception {
        String corpo = criar(nome, tipo)
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return JsonPath.read(corpo, "$.id");
    }

    /** Grava direto no banco um lançamento de R$ 10,00 da categoria do sistema, em cada data. */
    private void lancar(String categoria, LocalDate... datas) {
        UUID id = idDoSistema(categoria);
        for (LocalDate data : datas) {
            jdbc.update("INSERT INTO transacao (categoria_id, valor, data) VALUES (?, 10.00, ?)", id, data);
        }
    }

    private UUID idDoSistema(String nome) {
        return jdbc.queryForObject("SELECT id FROM categoria WHERE sistema AND nome = ?", UUID.class, nome);
    }
}

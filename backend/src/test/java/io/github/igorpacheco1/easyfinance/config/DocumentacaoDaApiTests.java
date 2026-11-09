package io.github.igorpacheco1.easyfinance.config;

import io.github.igorpacheco1.easyfinance.TestcontainersConfiguration;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Confere a especificação OpenAPI gerada pelo springdoc (ADR-0010), com ela ligada como no
 * perfil dev. Garante que os pontos mais importantes do contrato estão documentados.
 */
@Import(TestcontainersConfiguration.class)
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@TestPropertySource(properties = "springdoc.api-docs.enabled=true")
class DocumentacaoDaApiTests {

    private static final String POST_TRANSACOES = "$.paths['/api/v1/transacoes'].post";

    @Autowired
    private MockMvc mockMvc;

    @Test
    void especificacaoTemOsDadosDaApi() throws Exception {
        mockMvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.info.title").value("Easy Finance API"))
                .andExpect(jsonPath("$.info.version").value("v1"));
    }

    @Test
    void especificacaoDocumentaTodosOsEndpoints() throws Exception {
        mockMvc.perform(get("/v3/api-docs"))
                .andExpect(jsonPath("$.paths['/api/v1/categorias']").exists())
                .andExpect(jsonPath("$.paths['/api/v1/categorias/{id}']").exists())
                .andExpect(jsonPath("$.paths['/api/v1/transacoes']").exists())
                .andExpect(jsonPath("$.paths['/api/v1/transacoes/{id}']").exists())
                .andExpect(jsonPath("$.paths['/api/v1/saldo']").exists());
    }

    @Test
    void criacaoDeTransacaoDocumentaAIdempotencia() throws Exception {
        // Critério herdado da #19: 201 na criação, 200 no reenvio idêntico e 409 no conflito.
        mockMvc.perform(get("/v3/api-docs"))
                .andExpect(jsonPath(POST_TRANSACOES + ".responses['201']").exists())
                .andExpect(jsonPath(POST_TRANSACOES + ".responses['200']").exists())
                .andExpect(jsonPath(POST_TRANSACOES + ".responses['409']").exists())
                .andExpect(jsonPath("$.components.schemas.CriarTransacaoRequest.properties.id").exists());
    }

    @Test
    void respostasDeErroUsamOFormatoProblema() throws Exception {
        mockMvc.perform(get("/v3/api-docs"))
                .andExpect(jsonPath("$.components.schemas.Problema.properties.erros").exists())
                .andExpect(jsonPath(POST_TRANSACOES + ".responses['409'].content['application/problem+json']").exists())
                .andExpect(jsonPath(POST_TRANSACOES + ".responses['500']").exists());
    }

    @Test
    void camposQueSempreVemNasRespostasSaoObrigatorios() throws Exception {
        // #77: o PWA gera os tipos a partir desta especificação. Campo obrigatório aqui vira
        // campo obrigatório no TypeScript, sem ajuste à mão no front (ADR-0013).
        mockMvc.perform(get("/v3/api-docs"))
                .andExpect(jsonPath("$.components.schemas.CategoriaResponse.required",
                        containsInAnyOrder("id", "nome", "tipo", "sistema")))
                .andExpect(jsonPath("$.components.schemas.TransacaoResponse.required",
                        containsInAnyOrder("id", "valor", "data", "descricao", "categoria")))
                .andExpect(jsonPath("$.components.schemas.CategoriaResumo.required",
                        containsInAnyOrder("id", "nome", "tipo")))
                .andExpect(jsonPath("$.components.schemas.SaldoResponse.required",
                        containsInAnyOrder("de", "ate", "receitas", "despesas", "saldo")))
                .andExpect(jsonPath("$.components.schemas.ErroDeCampo.required",
                        containsInAnyOrder("campo", "mensagem")))
                // #92: a listagem paginada. O springdoc junta o nome do tipo genérico com o do item.
                .andExpect(jsonPath("$.components.schemas.PaginaResponseTransacaoResponse.required",
                        containsInAnyOrder("itens", "pagina", "tamanho", "temMais")));
    }

    @Test
    void especificacaoPodeSerExportadaEmYaml() throws Exception {
        mockMvc.perform(get("/v3/api-docs.yaml"))
                .andExpect(status().isOk());
    }
}

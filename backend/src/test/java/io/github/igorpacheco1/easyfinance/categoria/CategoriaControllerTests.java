package io.github.igorpacheco1.easyfinance.categoria;

import io.github.igorpacheco1.easyfinance.categoria.dto.AtualizarCategoriaRequest;
import io.github.igorpacheco1.easyfinance.categoria.dto.CategoriaResponse;
import io.github.igorpacheco1.easyfinance.categoria.dto.CriarCategoriaRequest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.UUID;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.endsWith;
import static org.hamcrest.Matchers.not;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Testa só a camada HTTP de categorias: rota, status, cabeçalhos, validação da entrada e
 * formato dos erros. {@code @WebMvcTest} sobe só a parte web (controller + tratador de erros),
 * sem banco; o service é simulado ({@code @MockitoBean}). Roda em milissegundos.
 */
@WebMvcTest(CategoriaController.class)
class CategoriaControllerTests {

    private static final String URL = "/api/v1/categorias";
    private static final UUID ID = UUID.fromString("3f2b8c1e-7a4d-4c1b-9e2a-5d6f7a8b9c0d");
    private static final CategoriaResponse PETS = new CategoriaResponse(ID, "Pets", TipoCategoria.DESPESA, false);

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private CategoriaService service;

    @Test
    void listarRepassaOFiltroDeTipo() throws Exception {
        when(service.listar(TipoCategoria.DESPESA, OrdemDasCategorias.ALFABETICA)).thenReturn(List.of(PETS));

        mockMvc.perform(get(URL).param("tipo", "DESPESA"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].nome").value("Pets"));
    }

    @Test
    void criarRetorna201ComLocation() throws Exception {
        when(service.criar(new CriarCategoriaRequest("Pets", TipoCategoria.DESPESA))).thenReturn(PETS);

        mockMvc.perform(post(URL).contentType(MediaType.APPLICATION_JSON).content("""
                        {"nome": "Pets", "tipo": "DESPESA"}
                        """))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", endsWith("/api/v1/categorias/" + ID)))
                .andExpect(jsonPath("$.id").value(ID.toString()))
                .andExpect(jsonPath("$.sistema").value(false));
    }

    @Test
    void criarComDadosInvalidosNemChamaOService() throws Exception {
        mockMvc.perform(post(URL).contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentType(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.erros[0].campo").value("nome"))
                .andExpect(jsonPath("$.erros[1].campo").value("tipo"));

        verify(service, never()).criar(any());
    }

    @Test
    void buscarInexistenteRetorna404NoFormatoProblema() throws Exception {
        when(service.buscar(ID)).thenThrow(new CategoriaNaoEncontradaException());

        mockMvc.perform(get(URL + "/" + ID))
                .andExpect(status().isNotFound())
                .andExpect(content().contentType(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.title").value("Categoria não encontrada"));
    }

    @Test
    void atualizarCategoriaDoSistemaRetorna409() throws Exception {
        when(service.atualizar(ID, new AtualizarCategoriaRequest("Supermercado")))
                .thenThrow(new CategoriaDoSistemaException());

        mockMvc.perform(put(URL + "/" + ID).contentType(MediaType.APPLICATION_JSON).content("""
                        {"nome": "Supermercado"}
                        """))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.title").value("Categoria do sistema"));
    }

    @Test
    void excluirRetorna204SemCorpo() throws Exception {
        mockMvc.perform(delete(URL + "/" + ID))
                .andExpect(status().isNoContent())
                .andExpect(content().string(""));

        verify(service).excluir(ID);
    }

    @Test
    void excluirComTransacoesRetorna409() throws Exception {
        doThrow(new CategoriaComTransacoesException()).when(service).excluir(ID);

        mockMvc.perform(delete(URL + "/" + ID))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.title").value("Categoria em uso"));
    }

    @Test
    void listarRepassaAOrdemPorUso() throws Exception {
        when(service.listar(null, OrdemDasCategorias.USO)).thenReturn(List.of(PETS));

        mockMvc.perform(get(URL).param("ordem", "USO"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].nome").value("Pets"));
    }

    @Test
    void listarComOrdemInvalidaRetorna400ComOsValoresAceitos() throws Exception {
        mockMvc.perform(get(URL).param("ordem", "QUALQUER"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value(containsString("ALFABETICA, USO")));

        verify(service, never()).listar(any(), any());
    }

    @Test
    void erroInesperadoRetorna500SemDetalhesInternos() throws Exception {
        when(service.listar(null, OrdemDasCategorias.ALFABETICA)).thenThrow(new IllegalStateException("detalhe interno que não pode vazar"));

        mockMvc.perform(get(URL))
                .andExpect(status().isInternalServerError())
                .andExpect(content().contentType(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.title").value("Erro interno"))
                .andExpect(content().string(not(containsString("detalhe interno"))));
    }
}

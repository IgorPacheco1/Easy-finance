package io.github.igorpacheco1.easyfinance.transacao;

import io.github.igorpacheco1.easyfinance.categoria.TipoCategoria;
import io.github.igorpacheco1.easyfinance.shared.CampoInvalidoException;
import io.github.igorpacheco1.easyfinance.transacao.dto.TransacaoResponse;
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

import static org.hamcrest.Matchers.endsWith;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Testa só a camada HTTP de transações, com o service simulado. O foco é o que é
 * responsabilidade do controller: escolher 201 ou 200 na criação idempotente, validar a
 * entrada antes de chamar o service e ler os parâmetros do período.
 */
@WebMvcTest(TransacaoController.class)
class TransacaoControllerTests {

    private static final String URL = "/api/v1/transacoes";
    private static final UUID ID = UUID.fromString("9b1d4e2a-6c3f-4a8b-b7d5-1e2f3a4b5c6d");
    private static final UUID MERCADO = UUID.fromString("3f2b8c1e-7a4d-4c1b-9e2a-5d6f7a8b9c0d");
    private static final TransacaoResponse FEIRA = new TransacaoResponse(
            ID, new BigDecimal("52.90"), LocalDate.parse("2026-11-03"), "Feira",
            new TransacaoResponse.CategoriaResumo(MERCADO, "Mercado", TipoCategoria.DESPESA));
    private static final String CORPO = """
            {"id": "%s", "valor": 52.90, "data": "2026-11-03", "descricao": "Feira", "categoriaId": "%s"}
            """.formatted(ID, MERCADO);

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private TransacaoService service;

    @Test
    void criacaoNovaRetorna201ComLocation() throws Exception {
        when(service.criar(any())).thenReturn(new ResultadoDaCriacao(FEIRA, true));

        mockMvc.perform(post(URL).contentType(MediaType.APPLICATION_JSON).content(CORPO))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", endsWith("/api/v1/transacoes/" + ID)))
                .andExpect(jsonPath("$.valor").value(52.90))
                .andExpect(jsonPath("$.categoria.tipo").value("DESPESA"));
    }

    @Test
    void reenvioIdenticoRetorna200SemLocation() throws Exception {
        when(service.criar(any())).thenReturn(new ResultadoDaCriacao(FEIRA, false));

        mockMvc.perform(post(URL).contentType(MediaType.APPLICATION_JSON).content(CORPO))
                .andExpect(status().isOk())
                .andExpect(header().doesNotExist("Location"))
                .andExpect(jsonPath("$.id").value(ID.toString()));
    }

    @Test
    void conflitoDeIdRetorna409() throws Exception {
        when(service.criar(any())).thenThrow(new TransacaoConflitanteException());

        mockMvc.perform(post(URL).contentType(MediaType.APPLICATION_JSON).content(CORPO))
                .andExpect(status().isConflict())
                .andExpect(content().contentType(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.title").value("Conflito de identificador"));
    }

    @Test
    void valorInvalidoNemChamaOService() throws Exception {
        mockMvc.perform(post(URL).contentType(MediaType.APPLICATION_JSON).content("""
                        {"valor": -10.555, "data": "2026-11-03", "categoriaId": "%s"}
                        """.formatted(MERCADO)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erros[0].campo").value("valor"))
                .andExpect(jsonPath("$.erros[1].campo").value("valor"));

        verify(service, never()).criar(any());
    }

    @Test
    void erroDeCampoVindoDoServiceSaiNaListaErros() throws Exception {
        when(service.criar(any())).thenThrow(new CampoInvalidoException("categoriaId", "Categoria não encontrada."));

        mockMvc.perform(post(URL).contentType(MediaType.APPLICATION_JSON).content(CORPO))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.title").value("Dados inválidos"))
                .andExpect(jsonPath("$.erros[0].campo").value("categoriaId"))
                .andExpect(jsonPath("$.erros[0].mensagem").value("Categoria não encontrada."));
    }

    @Test
    void listarLeOsParametrosDoPeriodo() throws Exception {
        LocalDate de = LocalDate.parse("2026-11-01");
        LocalDate ate = LocalDate.parse("2026-11-30");
        when(service.listar(de, ate)).thenReturn(List.of(FEIRA));

        mockMvc.perform(get(URL).param("de", "2026-11-01").param("ate", "2026-11-30"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].descricao").value("Feira"));
    }

    @Test
    void buscarInexistenteRetorna404() throws Exception {
        when(service.buscar(ID)).thenThrow(new TransacaoNaoEncontradaException());

        mockMvc.perform(get(URL + "/" + ID))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.title").value("Transação não encontrada"));
    }

    @Test
    void excluirRetorna204() throws Exception {
        mockMvc.perform(delete(URL + "/" + ID)).andExpect(status().isNoContent());

        verify(service).excluir(ID);
    }

    @Test
    void excluirInexistenteRetorna404() throws Exception {
        doThrow(new TransacaoNaoEncontradaException()).when(service).excluir(ID);

        mockMvc.perform(delete(URL + "/" + ID)).andExpect(status().isNotFound());
    }
}

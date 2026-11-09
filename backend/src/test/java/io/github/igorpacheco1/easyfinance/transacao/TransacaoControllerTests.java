package io.github.igorpacheco1.easyfinance.transacao;

import io.github.igorpacheco1.easyfinance.categoria.TipoCategoria;
import io.github.igorpacheco1.easyfinance.shared.CampoInvalidoException;
import io.github.igorpacheco1.easyfinance.shared.PaginaResponse;
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

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.endsWith;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
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
 * entrada antes de chamar o service e ler os parâmetros do período e da página.
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
    void listarLeOsParametrosDoPeriodoEDaPagina() throws Exception {
        LocalDate de = LocalDate.parse("2026-11-01");
        LocalDate ate = LocalDate.parse("2026-11-30");
        when(service.listar(FiltroDeTransacoes.doPeriodo(de, ate), 2, 10)).thenReturn(new PaginaResponse<>(List.of(FEIRA), 2, 10, true));

        mockMvc.perform(get(URL).param("de", "2026-11-01").param("ate", "2026-11-30")
                        .param("pagina", "2").param("tamanho", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.itens[0].descricao").value("Feira"))
                .andExpect(jsonPath("$.pagina").value(2))
                .andExpect(jsonPath("$.tamanho").value(10))
                .andExpect(jsonPath("$.temMais").value(true));
    }

    @Test
    void listarSemPaginaETamanhoUsaPrimeiraPaginaCom20() throws Exception {
        when(service.listar(FiltroDeTransacoes.NENHUM, 1, 20)).thenReturn(new PaginaResponse<>(List.of(), 1, 20, false));

        mockMvc.perform(get(URL))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.itens").isEmpty())
                .andExpect(jsonPath("$.temMais").value(false));

        verify(service).listar(FiltroDeTransacoes.NENHUM, 1, 20);
    }

    @Test
    void listarLeTodosOsFiltros() throws Exception {
        FiltroDeTransacoes esperado = new FiltroDeTransacoes(null, null, MERCADO, TipoCategoria.DESPESA, "uber",
                new BigDecimal("10.00"), new BigDecimal("500"));
        when(service.listar(esperado, 1, 20)).thenReturn(new PaginaResponse<>(List.of(FEIRA), 1, 20, false));

        mockMvc.perform(get(URL).param("categoriaId", MERCADO.toString()).param("tipo", "DESPESA")
                        .param("descricao", "uber").param("valorMinimo", "10.00").param("valorMaximo", "500"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.itens[0].descricao").value("Feira"));

        verify(service).listar(esperado, 1, 20);
    }

    @Test
    void listarComTipoInvalidoRetorna400ComOsValoresAceitos() throws Exception {
        mockMvc.perform(get(URL).param("tipo", "GASTO"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.title").value("Parâmetro inválido"))
                .andExpect(jsonPath("$.detail").value(containsString("DESPESA")));

        verify(service, never()).listar(any(), anyInt(), anyInt());
    }

    @Test
    void listarComPaginaQueNaoEhNumeroRetorna400() throws Exception {
        mockMvc.perform(get(URL).param("pagina", "dois"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.title").value("Parâmetro inválido"));

        verify(service, never()).listar(any(), anyInt(), anyInt());
    }

    @Test
    void erroDePaginacaoVindoDoServiceSaiNaListaErros() throws Exception {
        when(service.listar(FiltroDeTransacoes.NENHUM, 1, 500))
                .thenThrow(new CampoInvalidoException("tamanho", "O tamanho da página deve ser de 1 a 100."));

        mockMvc.perform(get(URL).param("tamanho", "500"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erros[0].campo").value("tamanho"));
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

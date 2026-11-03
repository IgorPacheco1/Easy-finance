package io.github.igorpacheco1.easyfinance.shared;

import io.github.igorpacheco1.easyfinance.TestcontainersConfiguration;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Confere o formato das respostas de erro 400 da API, usando os endpoints de categorias como
 * exemplo. O que vale aqui vale para qualquer endpoint, porque o tratamento é central.
 */
@Import(TestcontainersConfiguration.class)
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class TratamentoDeErrosApiTests {

    private static final String URL = "/api/v1/categorias";

    @Autowired
    private MockMvc mockMvc;

    @Test
    void campoInvalidoRetorna400ComOCampoEAMensagem() throws Exception {
        postar("""
                {"nome": "   ", "tipo": "DESPESA"}
                """)
                .andExpect(status().isBadRequest())
                .andExpect(content().contentType(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.title").value("Dados inválidos"))
                .andExpect(jsonPath("$.erros", hasSize(1)))
                .andExpect(jsonPath("$.erros[0].campo").value("nome"))
                .andExpect(jsonPath("$.erros[0].mensagem").value("O nome é obrigatório."));
    }

    @Test
    void variosCamposInvalidosAparecemTodosEmOrdemAlfabetica() throws Exception {
        postar("{}")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erros", hasSize(2)))
                .andExpect(jsonPath("$.erros[0].campo").value("nome"))
                .andExpect(jsonPath("$.erros[1].campo").value("tipo"))
                .andExpect(jsonPath("$.erros[1].mensagem").value("O tipo é obrigatório (RECEITA ou DESPESA)."));
    }

    @Test
    void jsonMalFormadoRetorna400ComMensagemClara() throws Exception {
        postar("{\"nome\": ")
                .andExpect(status().isBadRequest())
                .andExpect(content().contentType(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.title").value("Corpo da requisição inválido"))
                .andExpect(jsonPath("$.detail").value("O corpo da requisição está ausente ou não é um JSON válido."));
    }

    @Test
    void valorForaDasOpcoesNoCorpoInformaOCampoEOsValoresAceitos() throws Exception {
        postar("""
                {"nome": "Pets", "tipo": "OUTRO"}
                """)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.title").value("Corpo da requisição inválido"))
                .andExpect(jsonPath("$.detail").value(
                        "Valor inválido para o campo 'tipo'. Valores aceitos: RECEITA, DESPESA."));
    }

    @Test
    void idMalFormatadoNaUrlRetorna400() throws Exception {
        mockMvc.perform(get(URL + "/123"))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentType(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.title").value("Parâmetro inválido"))
                .andExpect(jsonPath("$.detail").value("O valor informado para 'id' tem um formato inválido."));
    }

    @Test
    void valorForaDasOpcoesNaUrlInformaOsValoresAceitos() throws Exception {
        mockMvc.perform(get(URL).param("tipo", "OUTRO"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value(containsString("Valores aceitos: RECEITA, DESPESA")));
    }

    @Test
    void errosDeNegocioContinuamComTituloEmPortugues() throws Exception {
        mockMvc.perform(get(URL + "/00000000-0000-4000-8000-000000000000"))
                .andExpect(status().isNotFound())
                .andExpect(content().contentType(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.title").value("Categoria não encontrada"));
    }

    private ResultActions postar(String corpo) throws Exception {
        return mockMvc.perform(post(URL).contentType(MediaType.APPLICATION_JSON).content(corpo));
    }
}

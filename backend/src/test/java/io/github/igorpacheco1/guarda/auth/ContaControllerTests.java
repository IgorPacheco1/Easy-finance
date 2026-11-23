package io.github.igorpacheco1.guarda.auth;

import io.github.igorpacheco1.guarda.ComoUsuarioDeTeste;
import io.github.igorpacheco1.guarda.usuario.SenhaAtualIncorretaException;
import io.github.igorpacheco1.guarda.usuario.dto.ExcluirContaRequest;
import io.github.igorpacheco1.guarda.usuario.dto.TrocarSenhaRequest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Testa só a camada HTTP de trocar a senha e excluir a conta: rota, status, validação da entrada
 * e formato dos erros. O {@code ContaService} e a sessão são simulados.
 */
@ComoUsuarioDeTeste
@WebMvcTest(ContaController.class)
class ContaControllerTests {

    private static final String URL_SENHA = "/api/v1/eu/senha";
    private static final String URL_EU = "/api/v1/eu";

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ContaService conta;

    @MockitoBean
    private SessaoDoUsuario sessao;

    @Test
    void trocarSenhaRetorna204SemCorpo() throws Exception {
        trocar("senha atual", "senha nova longa")
                .andExpect(status().isNoContent());

        verify(conta).trocarSenha(eq(new TrocarSenhaRequest("senha atual", "senha nova longa")), any(), any());
    }

    @Test
    void trocarSenhaSemCamposRetorna400ComAListaDeErros() throws Exception {
        mockMvc.perform(put(URL_SENHA).contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erros[?(@.campo == 'senhaAtual')]").exists())
                .andExpect(jsonPath("$.erros[?(@.campo == 'novaSenha')]").exists());
        verify(conta, never()).trocarSenha(any(), any(), any());
    }

    @Test
    void trocarSenhaComNovaSenhaCurtaRetorna400() throws Exception {
        trocar("senha atual", "1234567")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erros[0].campo").value("novaSenha"))
                .andExpect(jsonPath("$.erros[0].mensagem").value("A senha deve ter no mínimo 8 caracteres."));
        verify(conta, never()).trocarSenha(any(), any(), any());
    }

    @Test
    void trocarSenhaComNovaSenhaDe73BytesRetorna400() throws Exception {
        trocar("senha atual", "a".repeat(73))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erros[0].campo").value("novaSenha"));
    }

    @Test
    void trocarSenhaComSenhaAtualIncorretaRetorna400NoCampo() throws Exception {
        doThrow(new SenhaAtualIncorretaException("senhaAtual")).when(conta).trocarSenha(any(), any(), any());

        trocar("senha errada", "senha nova longa")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erros[0].campo").value("senhaAtual"))
                .andExpect(jsonPath("$.erros[0].mensagem").value("Senha incorreta."));
    }

    @Test
    void trocarSenhaBloqueadaRetorna429ComRetryAfter() throws Exception {
        doThrow(new MuitasTentativasException(Duration.ofSeconds(90))).when(conta).trocarSenha(any(), any(), any());

        trocar("senha atual", "senha nova longa")
                .andExpect(status().isTooManyRequests())
                .andExpect(header().string("Retry-After", "90"));
    }

    @Test
    void excluirContaRetorna204EEncerraASessaoAtual() throws Exception {
        excluir("senha atual").andExpect(status().isNoContent());

        verify(conta).excluir(eq(new ExcluirContaRequest("senha atual")), any(), any());
        verify(sessao).encerrar(any(), any());
    }

    @Test
    void excluirContaSemSenhaRetorna400() throws Exception {
        mockMvc.perform(delete(URL_EU).contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erros[0].campo").value("senha"));
        verify(conta, never()).excluir(any(), any(), any());
        verify(sessao, never()).encerrar(any(), any());
    }

    @Test
    void excluirContaComSenhaIncorretaRetorna400ENaoEncerraASessao() throws Exception {
        doThrow(new SenhaAtualIncorretaException("senha")).when(conta).excluir(any(), any(), any());

        excluir("senha errada")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erros[0].campo").value("senha"));
        verify(sessao, never()).encerrar(any(), any());
    }

    @Test
    void asSenhasNaoApareceNoToStringDosRequests() {
        assertThat(new TrocarSenhaRequest("senha atual", "senha nova longa").toString())
                .doesNotContain("senha atual", "senha nova longa");
        assertThat(new ExcluirContaRequest("senha atual").toString()).doesNotContain("senha atual");
    }

    private ResultActions trocar(String atual, String nova) throws Exception {
        return mockMvc.perform(put(URL_SENHA).contentType(MediaType.APPLICATION_JSON)
                .content("{\"senhaAtual\": \"%s\", \"novaSenha\": \"%s\"}".formatted(atual, nova)));
    }

    private ResultActions excluir(String senha) throws Exception {
        return mockMvc.perform(delete(URL_EU).contentType(MediaType.APPLICATION_JSON)
                .content("{\"senha\": \"%s\"}".formatted(senha)));
    }
}

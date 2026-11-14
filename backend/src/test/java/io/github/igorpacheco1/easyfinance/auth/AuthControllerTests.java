package io.github.igorpacheco1.easyfinance.auth;

import io.github.igorpacheco1.easyfinance.usuario.EmailJaCadastradoException;
import io.github.igorpacheco1.easyfinance.usuario.UsuarioService;
import io.github.igorpacheco1.easyfinance.usuario.dto.CadastroRequest;
import io.github.igorpacheco1.easyfinance.usuario.dto.UsuarioResponse;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Testa só a camada HTTP do cadastro: rota, status, validação da entrada e formato dos erros.
 * Sem banco; o service é simulado ({@code @MockitoBean}).
 */
@WebMvcTest(AuthController.class)
class AuthControllerTests {

    private static final String URL = "/api/v1/auth/cadastro";
    private static final UUID ID = UUID.fromString("3f2b8c1e-7a4d-4c1b-9e2a-5d6f7a8b9c0d");

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private UsuarioService service;

    @Test
    void cadastrarRetorna201SoComIdEEmail() throws Exception {
        when(service.cadastrar(new CadastroRequest("ana@email.com", "uma senha longa")))
                .thenReturn(new UsuarioResponse(ID, "ana@email.com"));

        cadastrar("ana@email.com", "uma senha longa")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(ID.toString()))
                .andExpect(jsonPath("$.email").value("ana@email.com"))
                .andExpect(jsonPath("$.senha").doesNotExist())
                .andExpect(jsonPath("$.senhaHash").doesNotExist())
                .andExpect(content().string(not(containsString("uma senha longa"))));
    }

    @Test
    void cadastrarTiraOsEspacosDasPontasDoEmail() throws Exception {
        when(service.cadastrar(new CadastroRequest("ana@email.com", "uma senha longa")))
                .thenReturn(new UsuarioResponse(ID, "ana@email.com"));

        cadastrar("  ana@email.com ", "uma senha longa").andExpect(status().isCreated());
    }

    @Test
    void cadastrarSemCamposRetorna400ComAListaDeErros() throws Exception {
        mockMvc.perform(post(URL).contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.title").value("Dados inválidos"))
                .andExpect(jsonPath("$.erros[?(@.campo == 'email')]").exists())
                .andExpect(jsonPath("$.erros[?(@.campo == 'senha')]").exists());
        verify(service, never()).cadastrar(any());
    }

    @Test
    void cadastrarComEmailInvalidoRetorna400() throws Exception {
        cadastrar("isso-nao-e-email", "uma senha longa")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erros[0].campo").value("email"))
                .andExpect(jsonPath("$.erros[0].mensagem").value("Informe um e-mail válido."));
        verify(service, never()).cadastrar(any());
    }

    @Test
    void cadastrarComSenhaCurtaRetorna400() throws Exception {
        cadastrar("ana@email.com", "1234567")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erros[0].campo").value("senha"))
                .andExpect(jsonPath("$.erros[0].mensagem").value("A senha deve ter no mínimo 8 caracteres."));
        verify(service, never()).cadastrar(any());
    }

    @Test
    void cadastrarComSenhaDeOitoEspacosRetorna400() throws Exception {
        cadastrar("ana@email.com", "        ")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erros[?(@.campo == 'senha' && @.mensagem == 'A senha é obrigatória.')]").exists());
    }

    @Test
    void cadastrarAceitaSenhaDeExatamente72Bytes() throws Exception {
        String senha = "a".repeat(72);
        when(service.cadastrar(new CadastroRequest("ana@email.com", senha)))
                .thenReturn(new UsuarioResponse(ID, "ana@email.com"));

        cadastrar("ana@email.com", senha).andExpect(status().isCreated());
    }

    @Test
    void cadastrarComSenhaDe73BytesRetorna400() throws Exception {
        cadastrar("ana@email.com", "a".repeat(73))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erros[0].campo").value("senha"));
        verify(service, never()).cadastrar(any());
    }

    @Test
    void oLimiteDaSenhaContaBytesECaracteres() throws Exception {
        // 37 letras "ç": 37 caracteres (passa no mínimo), mas 74 bytes em UTF-8 (passa do máximo).
        cadastrar("ana@email.com", "ç".repeat(37))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erros[0].campo").value("senha"));
        verify(service, never()).cadastrar(any());
    }

    @Test
    void cadastrarComEmailExistenteRetorna409() throws Exception {
        when(service.cadastrar(any())).thenThrow(new EmailJaCadastradoException());

        cadastrar("ana@email.com", "uma senha longa")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.title").value("E-mail já cadastrado"));
    }

    @Test
    void aSenhaNaoApareceNoToStringDoRequest() {
        assertThat(new CadastroRequest("ana@email.com", "uma senha longa").toString())
                .contains("ana@email.com")
                .doesNotContain("uma senha longa");
    }

    private ResultActions cadastrar(String email, String senha) throws Exception {
        return mockMvc.perform(post(URL).contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\": \"%s\", \"senha\": \"%s\"}".formatted(email, senha)));
    }
}

package io.github.igorpacheco1.easyfinance.auth;

import io.github.igorpacheco1.easyfinance.ComoUsuarioDeTeste;
import io.github.igorpacheco1.easyfinance.usuario.CredenciaisInvalidasException;
import io.github.igorpacheco1.easyfinance.usuario.EmailJaCadastradoException;
import io.github.igorpacheco1.easyfinance.usuario.UsuarioService;
import io.github.igorpacheco1.easyfinance.usuario.dto.CadastroRequest;
import io.github.igorpacheco1.easyfinance.usuario.dto.EntrarRequest;
import io.github.igorpacheco1.easyfinance.usuario.dto.UsuarioResponse;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import java.time.Duration;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Testa só a camada HTTP de cadastro, entrar e sair: rota, status, validação da entrada e formato
 * dos erros. Sem banco; o service e a sessão são simulados ({@code @MockitoBean}). A sessão de
 * verdade, o CSRF e o cookie são testados de ponta a ponta em {@code AuthApiTests}.
 */
@ComoUsuarioDeTeste
@WebMvcTest(AuthController.class)
class AuthControllerTests {

    private static final String URL = "/api/v1/auth/cadastro";
    private static final String URL_ENTRAR = "/api/v1/auth/entrar";
    private static final UUID ID = UUID.fromString("3f2b8c1e-7a4d-4c1b-9e2a-5d6f7a8b9c0d");

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private UsuarioService service;

    @MockitoBean
    private LoginService loginService;

    @MockitoBean
    private SessaoDoUsuario sessao;

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

    @Test
    void cadastrarAbreASessaoDoNovoUsuario() throws Exception {
        when(service.cadastrar(new CadastroRequest("ana@email.com", "uma senha longa")))
                .thenReturn(new UsuarioResponse(ID, "ana@email.com"));

        cadastrar("ana@email.com", "uma senha longa").andExpect(status().isCreated());

        verify(sessao).iniciar(eq(ID), any(), any());
    }

    @Test
    void entrarRetorna200SoComIdEEmailEAbreASessao() throws Exception {
        when(loginService.entrar(eq(new EntrarRequest("ana@email.com", "uma senha longa")), any()))
                .thenReturn(new UsuarioResponse(ID, "ana@email.com"));

        entrar("ana@email.com", "uma senha longa")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(ID.toString()))
                .andExpect(jsonPath("$.email").value("ana@email.com"))
                .andExpect(content().string(not(containsString("uma senha longa"))));

        verify(sessao).iniciar(eq(ID), any(), any());
    }

    @Test
    void entrarComCredenciaisErradasRetorna401ENaoAbreSessao() throws Exception {
        when(loginService.entrar(any(), any())).thenThrow(new CredenciaisInvalidasException());

        entrar("ana@email.com", "senha errada")
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.title").value("Credenciais inválidas"))
                .andExpect(jsonPath("$.detail").value("E-mail ou senha inválidos."));

        verify(sessao, never()).iniciar(any(), any(), any());
    }

    @Test
    void entrarComMuitasFalhasRetorna429ComRetryAfterENaoAbreSessao() throws Exception {
        when(loginService.entrar(any(), any())).thenThrow(new MuitasTentativasException(Duration.ofSeconds(125)));

        entrar("ana@email.com", "uma senha longa")
                .andExpect(status().isTooManyRequests())
                .andExpect(header().string("Retry-After", "125"))
                .andExpect(jsonPath("$.title").value("Muitas tentativas"))
                .andExpect(jsonPath("$.detail").value("Muitas tentativas de login. Tente de novo em 3 minutos."));

        verify(sessao, never()).iniciar(any(), any(), any());
    }

    @Test
    void entrarSemCamposRetorna400() throws Exception {
        mockMvc.perform(post(URL_ENTRAR).contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erros[?(@.campo == 'email')]").exists())
                .andExpect(jsonPath("$.erros[?(@.campo == 'senha')]").exists());
        verify(loginService, never()).entrar(any(), any());
    }

    @Test
    void entrarTiraOsEspacosDasPontasDoEmail() throws Exception {
        when(loginService.entrar(eq(new EntrarRequest("ana@email.com", "uma senha longa")), any()))
                .thenReturn(new UsuarioResponse(ID, "ana@email.com"));

        entrar("  ana@email.com ", "uma senha longa").andExpect(status().isOk());
    }

    @Test
    void sairRetorna204EEncerraASessao() throws Exception {
        mockMvc.perform(post("/api/v1/auth/sair"))
                .andExpect(status().isNoContent());

        verify(sessao).encerrar(any(), any());
    }

    @Test
    void aSenhaNaoApareceNoToStringDoEntrarRequest() {
        assertThat(new EntrarRequest("ana@email.com", "uma senha longa").toString())
                .contains("ana@email.com")
                .doesNotContain("uma senha longa");
    }

    private ResultActions entrar(String email, String senha) throws Exception {
        return mockMvc.perform(post(URL_ENTRAR).contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\": \"%s\", \"senha\": \"%s\"}".formatted(email, senha)));
    }

    private ResultActions cadastrar(String email, String senha) throws Exception {
        return mockMvc.perform(post(URL).contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\": \"%s\", \"senha\": \"%s\"}".formatted(email, senha)));
    }
}

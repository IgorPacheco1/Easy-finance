package io.github.igorpacheco1.guarda.usuario;

import io.github.igorpacheco1.guarda.ComoUsuarioDeTeste;
import io.github.igorpacheco1.guarda.usuario.dto.PerfilRequest;
import io.github.igorpacheco1.guarda.usuario.dto.UsuarioResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Testa só a camada HTTP de "quem sou eu" e do perfil (#193), com o service simulado. */
@ComoUsuarioDeTeste
@WebMvcTest(UsuarioController.class)
class UsuarioControllerTests {

    private static final UUID ID = UUID.fromString("00000000-0000-0000-0000-0000000000aa");
    private static final String URL_PERFIL = "/api/v1/eu/perfil";

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private UsuarioService service;

    @MockitoBean
    private UsuarioAtual usuarioAtual;

    @BeforeEach
    void logado() {
        when(usuarioAtual.id()).thenReturn(ID);
    }

    @Test
    void euDevolveNomeEAvatar() throws Exception {
        when(service.buscar(ID)).thenReturn(new UsuarioResponse(ID, "ana@email.com", "Ana", "iniciais:verde"));

        mockMvc.perform(get("/api/v1/eu"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nome").value("Ana"))
                .andExpect(jsonPath("$.avatar").value("iniciais:verde"));
    }

    @Test
    void mudarOPerfilTiraOsEspacosDoNomeEDevolveOPerfilNovo() throws Exception {
        when(service.atualizarPerfil(ID, new PerfilRequest("Ana Souza", "iniciais:roxo")))
                .thenReturn(new UsuarioResponse(ID, "ana@email.com", "Ana Souza", "iniciais:roxo"));

        perfil("{\"nome\": \"  Ana Souza \", \"avatar\": \"iniciais:roxo\"}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nome").value("Ana Souza"))
                .andExpect(jsonPath("$.avatar").value("iniciais:roxo"));
    }

    @Test
    void nomeSoDeEspacosRetorna400() throws Exception {
        perfil("{\"nome\": \"   \"}")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erros[0].campo").value("nome"))
                .andExpect(jsonPath("$.erros[0].mensagem").value("O nome deve ter de 1 a 60 caracteres."));
        verify(service, never()).atualizarPerfil(any(), any());
    }

    @Test
    void nomeDe61CaracteresRetorna400() throws Exception {
        perfil("{\"nome\": \"%s\"}".formatted("a".repeat(61)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erros[0].campo").value("nome"));
        verify(service, never()).atualizarPerfil(any(), any());
    }

    @Test
    void avatarForaDaListaRetorna400() throws Exception {
        for (String avatar : new String[] {"iniciais:dourado", "mascote:lobo", "foto:https://x.com/a.png"}) {
            perfil("{\"avatar\": \"%s\"}".formatted(avatar))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.erros[0].campo").value("avatar"));
        }
        verify(service, never()).atualizarPerfil(any(), any());
    }

    private ResultActions perfil(String corpo) throws Exception {
        return mockMvc.perform(patch(URL_PERFIL).contentType(MediaType.APPLICATION_JSON).content(corpo));
    }
}

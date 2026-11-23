package io.github.igorpacheco1.guarda.auth;

import io.github.igorpacheco1.guarda.usuario.CredenciaisInvalidasException;
import io.github.igorpacheco1.guarda.usuario.UsuarioService;
import io.github.igorpacheco1.guarda.usuario.dto.EntrarRequest;
import io.github.igorpacheco1.guarda.usuario.dto.UsuarioResponse;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Duration;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/** Testes de unidade do {@link LoginService}: a ordem entre o limite e o login. */
@ExtendWith(MockitoExtension.class)
class LoginServiceTests {

    private static final EntrarRequest REQUEST = new EntrarRequest("ana@email.com", "uma senha longa");
    private static final String IP = "203.0.113.7";

    @Mock
    private UsuarioService usuarioService;

    @Mock
    private LimiteDeTentativas limite;

    @InjectMocks
    private LoginService service;

    @Test
    void loginCertoLimpaAsFalhasDoEmailEDevolveOUsuario() {
        UsuarioResponse usuario = new UsuarioResponse(UUID.randomUUID(), "ana@email.com", "Ana", "iniciais:cinza");
        when(usuarioService.autenticar(REQUEST)).thenReturn(usuario);

        assertThat(service.entrar(REQUEST, IP)).isEqualTo(usuario);

        InOrder ordem = inOrder(limite, usuarioService);
        ordem.verify(limite).verificar("ana@email.com", IP);
        ordem.verify(usuarioService).autenticar(REQUEST);
        ordem.verify(limite).registrarSucesso("ana@email.com");
        verify(limite, never()).registrarFalha(any(), any());
    }

    @Test
    void loginErradoGravaAFalhaEPropagaOErro() {
        when(usuarioService.autenticar(REQUEST)).thenThrow(new CredenciaisInvalidasException());

        assertThatThrownBy(() -> service.entrar(REQUEST, IP)).isInstanceOf(CredenciaisInvalidasException.class);

        verify(limite).registrarFalha("ana@email.com", IP);
        verify(limite, never()).registrarSucesso(any());
    }

    @Test
    void comLimiteEstouradoNemTentaOLoginENaoGravaOutraFalha() {
        doThrow(new MuitasTentativasException(Duration.ofMinutes(5))).when(limite).verificar("ana@email.com", IP);

        assertThatThrownBy(() -> service.entrar(REQUEST, IP)).isInstanceOf(MuitasTentativasException.class);

        verifyNoInteractions(usuarioService);
        verify(limite, never()).registrarFalha(any(), any());
    }
}

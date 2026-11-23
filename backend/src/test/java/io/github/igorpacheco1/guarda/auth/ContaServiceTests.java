package io.github.igorpacheco1.guarda.auth;

import io.github.igorpacheco1.guarda.usuario.SenhaAtualIncorretaException;
import io.github.igorpacheco1.guarda.usuario.UsuarioAtual;
import io.github.igorpacheco1.guarda.usuario.UsuarioService;
import io.github.igorpacheco1.guarda.usuario.dto.ExcluirContaRequest;
import io.github.igorpacheco1.guarda.usuario.dto.TrocarSenhaRequest;
import io.github.igorpacheco1.guarda.usuario.dto.UsuarioResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Duration;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/** Testes de unidade do {@link ContaService}: a ordem entre o limite, a operação e as sessões. */
@ExtendWith(MockitoExtension.class)
class ContaServiceTests {

    private static final UUID ID = UUID.randomUUID();
    private static final String IP = "203.0.113.7";
    private static final String SESSAO_ATUAL = "sessao-atual";
    private static final TrocarSenhaRequest TROCA = new TrocarSenhaRequest("senha atual", "senha nova longa");
    private static final ExcluirContaRequest EXCLUSAO = new ExcluirContaRequest("senha atual");

    @Mock
    private UsuarioService usuarioService;

    @Mock
    private LimiteDeTentativas limite;

    @Mock
    private SessoesDaConta sessoes;

    private ContaService service;

    @BeforeEach
    void montar() {
        UsuarioAtual usuarioAtual = () -> ID;
        service = new ContaService(usuarioService, usuarioAtual, limite, sessoes);
    }

    private void usuarioExiste() {
        when(usuarioService.buscar(ID)).thenReturn(new UsuarioResponse(ID, "ana@email.com", "Ana", "iniciais:cinza"));
    }

    @Test
    void trocarSenhaConfereOLimiteTrocaELimpaFalhasEEncerraAsOutrasSessoes() {
        usuarioExiste();

        service.trocarSenha(TROCA, IP, SESSAO_ATUAL);

        InOrder ordem = inOrder(limite, usuarioService, sessoes);
        ordem.verify(limite).verificar("ana@email.com", IP);
        ordem.verify(usuarioService).trocarSenha(ID, "senha atual", "senha nova longa");
        ordem.verify(limite).registrarSucesso("ana@email.com");
        ordem.verify(sessoes).encerrarOutras(ID, SESSAO_ATUAL);
    }

    @Test
    void trocarSenhaComSenhaAtualErradaGravaAFalhaENaoMexeNasSessoes() {
        usuarioExiste();
        doThrow(new SenhaAtualIncorretaException("senhaAtual")).when(usuarioService)
                .trocarSenha(ID, "senha atual", "senha nova longa");

        assertThatThrownBy(() -> service.trocarSenha(TROCA, IP, SESSAO_ATUAL))
                .isInstanceOf(SenhaAtualIncorretaException.class);

        verify(limite).registrarFalha("ana@email.com", IP);
        verify(limite, never()).registrarSucesso(any());
        verifyNoInteractions(sessoes);
    }

    @Test
    void trocarSenhaBloqueadoPeloLimiteNemTentaATroca() {
        usuarioExiste();
        doThrow(new MuitasTentativasException(Duration.ofMinutes(5))).when(limite)
                .verificar("ana@email.com", IP);

        assertThatThrownBy(() -> service.trocarSenha(TROCA, IP, SESSAO_ATUAL))
                .isInstanceOf(MuitasTentativasException.class);

        verify(usuarioService, never()).trocarSenha(any(), any(), any());
        verify(limite, never()).registrarFalha(any(), any());
        verifyNoInteractions(sessoes);
    }

    @Test
    void excluirConfereOLimiteApagaLimpaFalhasEEncerraAsOutrasSessoes() {
        usuarioExiste();

        service.excluir(EXCLUSAO, IP, SESSAO_ATUAL);

        InOrder ordem = inOrder(limite, usuarioService, sessoes);
        ordem.verify(limite).verificar("ana@email.com", IP);
        ordem.verify(usuarioService).excluir(ID, "senha atual");
        ordem.verify(limite).registrarSucesso("ana@email.com");
        ordem.verify(sessoes).encerrarOutras(ID, SESSAO_ATUAL);
    }

    @Test
    void excluirComSenhaErradaGravaAFalhaENaoApagaNemEncerraSessoes() {
        usuarioExiste();
        doThrow(new SenhaAtualIncorretaException("senha")).when(usuarioService).excluir(ID, "senha atual");

        assertThatThrownBy(() -> service.excluir(EXCLUSAO, IP, SESSAO_ATUAL))
                .isInstanceOf(SenhaAtualIncorretaException.class);

        verify(limite).registrarFalha("ana@email.com", IP);
        verifyNoInteractions(sessoes);
    }
}

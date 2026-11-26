package io.github.igorpacheco1.guarda.auth;

import io.github.igorpacheco1.guarda.limites.LimiteDeCadastros;
import io.github.igorpacheco1.guarda.limites.LimiteExcedidoException;
import io.github.igorpacheco1.guarda.limites.LimitesProperties;
import io.github.igorpacheco1.guarda.usuario.EmailJaCadastradoException;
import io.github.igorpacheco1.guarda.usuario.UsuarioService;
import io.github.igorpacheco1.guarda.usuario.dto.CadastroRequest;
import io.github.igorpacheco1.guarda.usuario.dto.UsuarioResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Testes de unidade do {@link CadastroService}: quando o limite de cadastros conta e quando barra. */
@ExtendWith(MockitoExtension.class)
class CadastroServiceTests {

    private static final String IP = "203.0.113.7";
    private static final CadastroRequest PEDIDO = new CadastroRequest("ana@email.com", "uma senha longa", "Ana");
    private static final UsuarioResponse CRIADO =
            new UsuarioResponse(UUID.randomUUID(), "ana@email.com", "Ana", "iniciais:cinza");

    @Mock
    private UsuarioService usuarioService;

    private LimiteDeCadastros limite;
    private CadastroService service;

    @BeforeEach
    void montar() {
        // Máximo de 2 cadastros por hora, para o teste ficar curto.
        limite = new LimiteDeCadastros(new LimitesProperties(120, Duration.ofMinutes(1), 2, Duration.ofHours(1)),
                Clock.fixed(Instant.parse("2026-11-25T12:00:00Z"), ZoneOffset.UTC));
        service = new CadastroService(usuarioService, limite);
    }

    @Test
    void cadastroQueDaCertoContaNoLimiteDoIp() {
        when(usuarioService.cadastrar(PEDIDO)).thenReturn(CRIADO);

        assertThat(service.cadastrar(PEDIDO, IP)).isEqualTo(CRIADO);
        service.cadastrar(PEDIDO, IP);

        assertThat(limite.esperaSeCheio(IP)).contains(Duration.ofHours(1));
    }

    @Test
    void comOLimiteCheioRecusaAntesDeCadastrar() {
        when(usuarioService.cadastrar(PEDIDO)).thenReturn(CRIADO);
        service.cadastrar(PEDIDO, IP);
        service.cadastrar(PEDIDO, IP);

        assertThatThrownBy(() -> service.cadastrar(PEDIDO, IP))
                .isInstanceOf(LimiteExcedidoException.class);
        // Só as duas primeiras chegaram ao cadastro.
        verify(usuarioService, times(2)).cadastrar(any());
    }

    @Test
    void cadastroQueFalhaNaoGastaACotaDoIp() {
        when(usuarioService.cadastrar(PEDIDO)).thenThrow(new EmailJaCadastradoException());

        for (int i = 0; i < 5; i++) {
            assertThatThrownBy(() -> service.cadastrar(PEDIDO, IP)).isInstanceOf(EmailJaCadastradoException.class);
        }

        assertThat(limite.esperaSeCheio(IP)).isEmpty();
    }

    @Test
    void oLimiteDeUmIpNaoBarraOutro() {
        when(usuarioService.cadastrar(PEDIDO)).thenReturn(CRIADO);
        service.cadastrar(PEDIDO, IP);
        service.cadastrar(PEDIDO, IP);

        assertThat(service.cadastrar(PEDIDO, "198.51.100.9")).isEqualTo(CRIADO);
    }
}

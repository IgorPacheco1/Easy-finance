package io.github.igorpacheco1.guarda.limites;

import org.junit.jupiter.api.Test;

import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;

/** Testes de unidade da mensagem e do {@code Retry-After} da {@link LimiteExcedidoException}. */
class LimiteExcedidoExceptionTests {

    @Test
    void oRetryAfterEArredondadoParaCimaENuncaEZero() {
        assertThat(retryAfter(Duration.ofMillis(400))).isEqualTo("1");
        assertThat(retryAfter(Duration.ofMillis(1_001))).isEqualTo("2");
        assertThat(retryAfter(Duration.ZERO)).isEqualTo("1");
        assertThat(retryAfter(Duration.ofMinutes(42))).isEqualTo("2520");
    }

    @Test
    void oTempoDaMensagemEmSegundosOuMinutos() {
        assertThat(LimiteExcedidoException.tempo(1)).isEqualTo("1 segundo");
        assertThat(LimiteExcedidoException.tempo(40)).isEqualTo("40 segundos");
        assertThat(LimiteExcedidoException.tempo(60)).isEqualTo("1 minuto");
        assertThat(LimiteExcedidoException.tempo(61)).isEqualTo("2 minutos");
        assertThat(LimiteExcedidoException.tempo(3_600)).isEqualTo("60 minutos");
    }

    @Test
    void cadaLimiteTemOSeuTituloEMensagem() {
        LimiteExcedidoException requisicoes = LimiteExcedidoException.deRequisicoes(Duration.ofSeconds(30));
        assertThat(requisicoes.getBody().getTitle()).isEqualTo("Muitas requisições");
        assertThat(requisicoes.getBody().getDetail())
                .isEqualTo("Muitas requisições em pouco tempo. Tente de novo em 30 segundos.");

        LimiteExcedidoException cadastros = LimiteExcedidoException.deCadastros(Duration.ofMinutes(42));
        assertThat(cadastros.getBody().getTitle()).isEqualTo("Muitas contas novas");
        assertThat(cadastros.getBody().getDetail())
                .isEqualTo("Muitas contas criadas a partir desta rede. Tente de novo em 42 minutos.");
    }

    private static String retryAfter(Duration espera) {
        return LimiteExcedidoException.deRequisicoes(espera).getHeaders().getFirst("Retry-After");
    }
}

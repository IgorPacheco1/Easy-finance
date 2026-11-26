package io.github.igorpacheco1.guarda.limites;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Testes de unidade da {@link JanelaDeContagem}: a contagem, a janela fixa e a limpeza. */
class JanelaDeContagemTests {

    private static final Duration UM_MINUTO = Duration.ofMinutes(1);
    private static final String IP = "203.0.113.7";

    private RelogioAjustavel relogio;
    private JanelaDeContagem janela;

    @BeforeEach
    void montar() {
        relogio = new RelogioAjustavel(Instant.parse("2026-11-25T12:00:00Z"));
        janela = new JanelaDeContagem(3, UM_MINUTO, relogio);
    }

    @Test
    void ateOMaximoPassa() {
        assertThat(janela.contar(IP)).isEmpty();
        assertThat(janela.contar(IP)).isEmpty();
        assertThat(janela.contar(IP)).isEmpty();
    }

    @Test
    void depoisDoMaximoRecusaComOTempoQueFaltaParaAJanelaVencer() {
        contar(IP, 3);
        relogio.avancar(Duration.ofSeconds(20));

        // A janela abriu no primeiro pedido: faltam 40 dos 60 segundos.
        assertThat(janela.contar(IP)).contains(Duration.ofSeconds(40));
        // Continuar insistindo não aumenta a espera: a janela é fixa.
        assertThat(janela.contar(IP)).contains(Duration.ofSeconds(40));
    }

    @Test
    void quandoAJanelaVenceAContagemRecomeca() {
        contar(IP, 5);
        relogio.avancar(UM_MINUTO);

        assertThat(janela.contar(IP)).isEmpty();
        assertThat(janela.contar(IP)).isEmpty();
        assertThat(janela.contar(IP)).isEmpty();
        assertThat(janela.contar(IP)).isPresent();
    }

    @Test
    void cadaChaveTemASuaPropriaContagem() {
        contar(IP, 3);

        assertThat(janela.contar(IP)).isPresent();
        assertThat(janela.contar("198.51.100.9")).isEmpty();
    }

    @Test
    void esperaSeCheioConfereSemContar() {
        contar(IP, 2);

        assertThat(janela.esperaSeCheio(IP)).isEmpty();
        assertThat(janela.esperaSeCheio(IP)).isEmpty();
        contar(IP, 1);
        assertThat(janela.esperaSeCheio(IP)).contains(UM_MINUTO);

        relogio.avancar(UM_MINUTO);
        assertThat(janela.esperaSeCheio(IP)).isEmpty();
    }

    @Test
    void chaveQueNuncaApareceuNaoEstaCheia() {
        assertThat(janela.esperaSeCheio(IP)).isEmpty();
    }

    @Test
    void zerarEsqueceTodasAsContagens() {
        contar(IP, 3);

        janela.zerar();

        assertThat(janela.contar(IP)).isEmpty();
    }

    @Test
    void asJanelasVencidasSaoApagadasDaMemoria() {
        contar("198.51.100.1", 1);
        contar("198.51.100.2", 1);
        assertThat(janela.chavesGuardadas()).isEqualTo(2);

        relogio.avancar(UM_MINUTO);
        contar(IP, 1);

        // As duas antigas venceram e foram apagadas; só fica a nova.
        assertThat(janela.chavesGuardadas()).isEqualTo(1);
    }

    @Test
    void maximoOuJanelaInvalidosNaoSaoAceitos() {
        assertThatThrownBy(() -> new JanelaDeContagem(0, UM_MINUTO, relogio))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new JanelaDeContagem(3, Duration.ZERO, relogio))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new JanelaDeContagem(3, Duration.ofSeconds(-1), relogio))
                .isInstanceOf(IllegalArgumentException.class);
    }

    private void contar(String chave, int vezes) {
        for (int i = 0; i < vezes; i++) {
            janela.contar(chave);
        }
    }
}

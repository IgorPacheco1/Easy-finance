package io.github.igorpacheco1.guarda.limites;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Contador em memória por chave (o IP), com <b>janela fixa</b> (ADR-0035).
 *
 * <p>A primeira vez que uma chave aparece abre uma janela (por exemplo, de 1 minuto). Cada vez
 * seguinte soma 1 nessa janela. Quando a janela vence, a contagem recomeça do zero. É o jeito
 * mais simples de contar "quantas vezes neste minuto", e basta para um teto contra abusos.
 *
 * <p>Por que janela fixa, e não deslizante como no login (ADR-0022): a deslizante precisa guardar
 * o horário de cada vez, e aqui contamos toda requisição. A fixa guarda só dois valores por chave.
 * O custo aceito: na virada da janela, alguém pode fazer até o dobro do máximo em pouco tempo.
 *
 * <p>Pode ser usado por várias requisições ao mesmo tempo: o {@link ConcurrentHashMap#compute}
 * soma de forma atômica. As janelas vencidas são apagadas de tempos em tempos, para a memória não
 * crescer sem parar com IPs que nunca voltam.
 */
public class JanelaDeContagem {

    /** Uma chave: quando a janela dela começou e quantas vezes ela apareceu nessa janela. */
    private record Janela(Instant inicio, int contagem) {
    }

    private final int maximo;
    private final Duration duracao;
    private final Clock clock;
    private final Map<String, Janela> janelas = new ConcurrentHashMap<>();
    private volatile Instant proximaLimpeza;

    public JanelaDeContagem(int maximo, Duration duracao, Clock clock) {
        if (maximo < 1 || duracao.isNegative() || duracao.isZero()) {
            throw new IllegalArgumentException("O limite precisa de um máximo e de uma janela positivos.");
        }
        this.maximo = maximo;
        this.duracao = duracao;
        this.clock = clock;
        this.proximaLimpeza = clock.instant().plus(duracao);
    }

    /**
     * Conta esta vez. Se, com ela, a chave passou do máximo, devolve quanto falta para a janela
     * vencer (o tempo de espera); senão, vazio.
     */
    public Optional<Duration> contar(String chave) {
        Instant agora = agora();
        Janela janela = janelas.compute(chave, (k, atual) -> atual == null || venceu(atual, agora)
                ? new Janela(agora, 1)
                : new Janela(atual.inicio(), atual.contagem() + 1));
        return janela.contagem() > maximo ? Optional.of(espera(janela, agora)) : Optional.empty();
    }

    /**
     * Sem contar: se a chave já chegou ao máximo, devolve o tempo de espera; senão, vazio. Serve
     * para conferir antes de uma ação que só deve ser contada se der certo (o cadastro).
     */
    public Optional<Duration> esperaSeCheio(String chave) {
        Instant agora = agora();
        Janela janela = janelas.get(chave);
        if (janela == null || venceu(janela, agora) || janela.contagem() < maximo) {
            return Optional.empty();
        }
        return Optional.of(espera(janela, agora));
    }

    /** Esquece todas as contagens. Usado pelos testes, para cada um começar do zero. */
    public void zerar() {
        janelas.clear();
    }

    /** Quantas chaves estão guardadas agora (para os testes da limpeza). */
    int chavesGuardadas() {
        return janelas.size();
    }

    /** O instante atual, aproveitando para apagar as janelas vencidas uma vez a cada janela. */
    private Instant agora() {
        Instant agora = clock.instant();
        if (!agora.isBefore(proximaLimpeza)) {
            janelas.values().removeIf(janela -> venceu(janela, agora));
            proximaLimpeza = agora.plus(duracao);
        }
        return agora;
    }

    private boolean venceu(Janela janela, Instant agora) {
        return !agora.isBefore(janela.inicio().plus(duracao));
    }

    private Duration espera(Janela janela, Instant agora) {
        return Duration.between(agora, janela.inicio().plus(duracao));
    }
}

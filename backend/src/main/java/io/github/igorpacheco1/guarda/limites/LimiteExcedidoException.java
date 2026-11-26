package io.github.igorpacheco1.guarda.limites;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.web.ErrorResponseException;

import java.time.Duration;

/**
 * 429: um dos limites do ADR-0035 estourou. Leva o cabeçalho {@code Retry-After} (em segundos),
 * no mesmo formato do limite de login ({@code MuitasTentativasException}).
 */
public class LimiteExcedidoException extends ErrorResponseException {

    private final long segundos;

    private LimiteExcedidoException(String titulo, String motivo, Duration espera) {
        super(HttpStatus.TOO_MANY_REQUESTS);
        // Arredonda para cima: esperar 0,4 s vira 1 s, e nunca "tente de novo em 0 segundos".
        this.segundos = Math.max(1, (espera.toMillis() + 999) / 1000);
        setTitle(titulo);
        setDetail("%s Tente de novo em %s.".formatted(motivo, tempo(segundos)));
    }

    /** O limite geral de requisições por IP. */
    public static LimiteExcedidoException deRequisicoes(Duration espera) {
        return new LimiteExcedidoException("Muitas requisições",
                "Muitas requisições em pouco tempo.", espera);
    }

    /** O limite de contas novas por IP. */
    public static LimiteExcedidoException deCadastros(Duration espera) {
        return new LimiteExcedidoException("Muitas contas novas",
                "Muitas contas criadas a partir desta rede.", espera);
    }

    @Override
    public HttpHeaders getHeaders() {
        HttpHeaders cabecalhos = new HttpHeaders();
        cabecalhos.set(HttpHeaders.RETRY_AFTER, String.valueOf(segundos));
        return cabecalhos;
    }

    /** "30 segundos", "1 minuto", "45 minutos". */
    static String tempo(long segundos) {
        if (segundos < 60) {
            return segundos == 1 ? "1 segundo" : segundos + " segundos";
        }
        long minutos = (segundos + 59) / 60;
        return minutos == 1 ? "1 minuto" : minutos + " minutos";
    }
}

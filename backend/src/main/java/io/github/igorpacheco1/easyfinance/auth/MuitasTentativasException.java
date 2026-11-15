package io.github.igorpacheco1.easyfinance.auth;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.web.ErrorResponseException;

import java.time.Duration;

/**
 * 429: falhas de login demais para este e-mail ou este IP. Leva o cabeçalho {@code Retry-After}
 * (em segundos) e a mesma mensagem para qualquer e-mail, existindo conta ou não (ADR-0022).
 */
public class MuitasTentativasException extends ErrorResponseException {

    private final long segundos;

    public MuitasTentativasException(Duration espera) {
        super(HttpStatus.TOO_MANY_REQUESTS);
        this.segundos = Math.max(1, espera.toSeconds());
        long minutos = (segundos + 59) / 60;
        setTitle("Muitas tentativas");
        setDetail("Muitas tentativas de login. Tente de novo em %d %s."
                .formatted(minutos, minutos == 1 ? "minuto" : "minutos"));
    }

    @Override
    public HttpHeaders getHeaders() {
        HttpHeaders cabecalhos = new HttpHeaders();
        cabecalhos.set(HttpHeaders.RETRY_AFTER, String.valueOf(segundos));
        return cabecalhos;
    }
}

package io.github.igorpacheco1.easyfinance.categoria;

import org.springframework.http.HttpStatus;
import org.springframework.web.ErrorResponseException;

/**
 * 404: não existe categoria com o id pedido.
 *
 * <p>Herdar de {@link ErrorResponseException} faz o Spring responder no formato ProblemDetail
 * (RFC 9457) com o status, o título e a mensagem definidos aqui. Quem monta a resposta é o
 * {@code TratadorGlobalDeErros} (pacote {@code shared}).
 */
public class CategoriaNaoEncontradaException extends ErrorResponseException {

    public CategoriaNaoEncontradaException() {
        super(HttpStatus.NOT_FOUND);
        setTitle("Categoria não encontrada");
        setDetail("Não existe categoria com o id informado.");
    }
}

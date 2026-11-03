package io.github.igorpacheco1.easyfinance.transacao;

import org.springframework.http.HttpStatus;
import org.springframework.web.ErrorResponseException;

/**
 * 409: já existe uma transação com o id enviado, mas com dados diferentes.
 *
 * <p>A mensagem é genérica de propósito. No M5, se o id pertencer a outro usuário, a resposta
 * será exatamente esta, para não revelar que o id existe (ADR-0006).
 */
public class TransacaoConflitanteException extends ErrorResponseException {

    public TransacaoConflitanteException() {
        super(HttpStatus.CONFLICT);
        setTitle("Conflito de identificador");
        setDetail("Já existe uma transação com este id e com dados diferentes.");
    }
}

package io.github.igorpacheco1.easyfinance.transacao;

import org.springframework.http.HttpStatus;
import org.springframework.web.ErrorResponseException;

/** 404: não existe transação com o id pedido. */
public class TransacaoNaoEncontradaException extends ErrorResponseException {

    public TransacaoNaoEncontradaException() {
        super(HttpStatus.NOT_FOUND);
        setTitle("Transação não encontrada");
        setDetail("Não existe transação com o id informado.");
    }
}

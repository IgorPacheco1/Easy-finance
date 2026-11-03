package io.github.igorpacheco1.easyfinance.shared;

import org.springframework.http.HttpStatus;
import org.springframework.web.ErrorResponseException;

import java.util.List;

/**
 * 400 para um campo que passou no Bean Validation, mas que o service recusou
 * (ex.: {@code categoriaId} bem formatado, mas de uma categoria que não existe).
 *
 * <p>A resposta tem o mesmo formato dos erros de validação (lista {@code erros}), então o PWA
 * mostra a mensagem embaixo do campo, como qualquer outro erro de preenchimento.
 */
public class CampoInvalidoException extends ErrorResponseException {

    public CampoInvalidoException(String campo, String mensagem) {
        super(HttpStatus.BAD_REQUEST);
        setTitle("Dados inválidos");
        setDetail("Um ou mais campos estão inválidos.");
        getBody().setProperty("erros", List.of(new ErroDeCampo(campo, mensagem)));
    }
}

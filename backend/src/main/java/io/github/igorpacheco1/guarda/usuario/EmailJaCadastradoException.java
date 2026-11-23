package io.github.igorpacheco1.guarda.usuario;

import org.springframework.http.HttpStatus;
import org.springframework.web.ErrorResponseException;

/**
 * 409: já existe uma conta com esse e-mail.
 *
 * <p>Revela que o e-mail está cadastrado, o que é o comportamento comum em cadastros e ajuda
 * quem esqueceu que já tem conta. No M6, com a confirmação por e-mail, isso pode deixar de
 * ser revelado.
 */
public class EmailJaCadastradoException extends ErrorResponseException {

    public EmailJaCadastradoException() {
        super(HttpStatus.CONFLICT);
        setTitle("E-mail já cadastrado");
        setDetail("Já existe uma conta com este e-mail. Entre nela ou use outro e-mail.");
    }
}

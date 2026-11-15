package io.github.igorpacheco1.easyfinance.usuario;

import org.springframework.http.HttpStatus;
import org.springframework.web.ErrorResponseException;

/**
 * 401: e-mail ou senha não conferem.
 *
 * <p>A mensagem é uma só, para "esse e-mail não existe" e "a senha está errada" (ADR-0020). Se
 * fossem diferentes, qualquer pessoa descobriria quais e-mails têm conta.
 */
public class CredenciaisInvalidasException extends ErrorResponseException {

    public CredenciaisInvalidasException() {
        super(HttpStatus.UNAUTHORIZED);
        setTitle("Credenciais inválidas");
        setDetail("E-mail ou senha inválidos.");
    }
}

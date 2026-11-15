package io.github.igorpacheco1.easyfinance.usuario;

import io.github.igorpacheco1.easyfinance.shared.CampoInvalidoException;

/**
 * 400 no campo {@code senhaAtual}: a senha de confirmação não confere.
 *
 * <p>É 400, e não 401: a pessoa está logada e só errou um campo. Um 401 faria o app achar que a
 * sessão expirou e mandá-la para a tela de login. Quem a lança conta como falha no limite de
 * tentativas (ADR-0022).
 */
public class SenhaAtualIncorretaException extends CampoInvalidoException {

    public SenhaAtualIncorretaException(String campo) {
        super(campo, "Senha incorreta.");
    }
}

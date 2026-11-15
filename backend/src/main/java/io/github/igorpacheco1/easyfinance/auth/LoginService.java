package io.github.igorpacheco1.easyfinance.auth;

import io.github.igorpacheco1.easyfinance.usuario.CredenciaisInvalidasException;
import io.github.igorpacheco1.easyfinance.usuario.UsuarioService;
import io.github.igorpacheco1.easyfinance.usuario.dto.EntrarRequest;
import io.github.igorpacheco1.easyfinance.usuario.dto.UsuarioResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * Entrar com limite de tentativas: confere o limite, tenta o login e anota o resultado.
 *
 * <p>Não é {@code @Transactional} de propósito: a falha precisa ficar gravada mesmo quando o
 * login termina em exceção (401).
 */
@Service
@RequiredArgsConstructor
public class LoginService {

    private final UsuarioService usuarioService;
    private final LimiteDeTentativas limite;

    /** @throws MuitasTentativasException 429, antes de olhar a senha, se o limite já estourou */
    public UsuarioResponse entrar(EntrarRequest request, String ip) {
        limite.verificar(request.email(), ip);
        UsuarioResponse usuario;
        try {
            usuario = usuarioService.autenticar(request);
        } catch (CredenciaisInvalidasException e) {
            limite.registrarFalha(request.email(), ip);
            throw e;
        }
        limite.registrarSucesso(request.email());
        return usuario;
    }
}

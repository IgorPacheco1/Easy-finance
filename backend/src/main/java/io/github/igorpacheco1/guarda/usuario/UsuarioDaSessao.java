package io.github.igorpacheco1.guarda.usuario;

import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Quem está logado neste pedido, lido da sessão (ADR-0020, ADR-0021).
 *
 * <p>Os services pedem o dono dos dados a esta classe (pela interface {@link UsuarioAtual}) e
 * nunca o recebem do cliente: o app não manda "sou o usuário X", quem diz é a sessão.
 */
@Component
public class UsuarioDaSessao implements UsuarioAtual {

    @Override
    public UUID id() {
        Authentication autenticacao = SecurityContextHolder.getContext().getAuthentication();
        if (autenticacao == null || !autenticacao.isAuthenticated()) {
            // Não acontece nas rotas protegidas (o filtro de segurança barra antes). Se
            // acontecer, é falha de configuração, e é melhor parar do que gravar sem dono.
            throw new AuthenticationCredentialsNotFoundException("Não há usuário autenticado.");
        }
        return UUID.fromString(autenticacao.getName());
    }
}

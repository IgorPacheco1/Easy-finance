package io.github.igorpacheco1.easyfinance.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.logout.SecurityContextLogoutHandler;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CsrfTokenRepository;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.UUID;

/**
 * Abre e encerra a sessão de login (ADR-0020).
 *
 * <p>O que a sessão guarda sobre quem está logado é só o <b>id</b> do usuário, como texto. Esse
 * id é o "nome" da autenticação, e o Spring Session o grava em {@code PRINCIPAL_NAME}: é isso
 * que permite, mais adiante, encerrar todas as sessões de uma conta (trocar a senha, excluir
 * a conta). Por ser só um texto, também se serializa sem problema na sessão do banco.
 */
@Component
@RequiredArgsConstructor
public class SessaoDoUsuario {

    private final SecurityContextRepository securityContextRepository;
    private final CsrfTokenRepository csrfTokenRepository;

    /**
     * Deixa o usuário logado neste navegador.
     *
     * <p>Duas trocas importantes acontecem aqui, e as duas existem por segurança:
     * <ul>
     *   <li>o <b>id da sessão muda</b> (proteção contra "session fixation": se alguém tivesse
     *       plantado um id de sessão no navegador da vítima, ele deixa de valer no login);</li>
     *   <li>o <b>token CSRF muda</b>: o que veio antes do login não serve depois.</li>
     * </ul>
     * Por isso o app busca um token novo ({@code GET /auth/csrf}) após entrar.
     */
    public void iniciar(UUID usuarioId, HttpServletRequest request, HttpServletResponse response) {
        request.getSession(true);
        request.changeSessionId();

        Authentication autenticacao = UsernamePasswordAuthenticationToken.authenticated(
                usuarioId.toString(), null, List.<GrantedAuthority>of());
        SecurityContext contexto = SecurityContextHolder.createEmptyContext();
        contexto.setAuthentication(autenticacao);
        SecurityContextHolder.setContext(contexto);
        securityContextRepository.saveContext(contexto, request, response);

        csrfTokenRepository.saveToken(csrfTokenRepository.generateToken(request), request, response);
    }

    /**
     * Encerra a sessão: apaga do banco, limpa o contexto e o Spring Session expira o cookie.
     * Sem sessão, não faz nada (sair é idempotente).
     */
    public void encerrar(HttpServletRequest request, HttpServletResponse response) {
        new SecurityContextLogoutHandler()
                .logout(request, response, SecurityContextHolder.getContext().getAuthentication());
    }
}

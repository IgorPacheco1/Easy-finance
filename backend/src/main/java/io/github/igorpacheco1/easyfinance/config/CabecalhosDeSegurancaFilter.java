package io.github.igorpacheco1.easyfinance.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Cabeçalhos de segurança em todas as respostas da API (revisão de segurança, v0.4.0).
 *
 * <ul>
 *   <li>{@code Cache-Control: no-store}: as respostas têm dados financeiros. Sem isso, o
 *       navegador ou algum intermediário da rede (um proxy, por exemplo) poderia guardar uma
 *       cópia e entregá-la depois a quem não deveria vê-la.</li>
 *   <li>{@code X-Content-Type-Options: nosniff}: o navegador respeita o tipo informado
 *       ({@code application/json}) e nunca tenta "adivinhar" que a resposta é HTML ou script.</li>
 * </ul>
 *
 * <p>É um filtro, e não algo em cada controller, para valer em tudo, inclusive nas respostas
 * de erro. Os cabeçalhos do app em si (CSP, HSTS...) ficam para o servidor de produção (M6).
 */
@Component
public class CabecalhosDeSegurancaFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        response.setHeader(HttpHeaders.CACHE_CONTROL, "no-store");
        response.setHeader("X-Content-Type-Options", "nosniff");
        chain.doFilter(request, response);
    }
}

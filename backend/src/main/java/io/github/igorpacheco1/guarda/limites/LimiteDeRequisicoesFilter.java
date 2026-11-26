package io.github.igorpacheco1.guarda.limites;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.servlet.HandlerExceptionResolver;

import java.io.IOException;
import java.time.Duration;
import java.util.Optional;

/**
 * Limite geral de requisições por IP em toda a API ({@code /api/**}), ADR-0035.
 *
 * <p>Roda <b>antes</b> do Spring Security (ver {@link LimitesConfiguration}): conta também quem
 * não está logado ou manda pedidos sem o token CSRF, e recusa o excesso sem nem carregar a sessão
 * do banco. Fora da API (o {@code /actuator/health} da hospedagem, por exemplo) nada é contado.
 *
 * <p>A recusa (429) é entregue ao mecanismo de erros do Spring MVC, como no
 * {@code RespostasDeSegurancaHandler}, para sair no mesmo formato ProblemDetail dos demais erros.
 *
 * <p>O IP é o da conexão ({@code getRemoteAddr()}). Atrás do proxy da hospedagem, o Spring passa a
 * devolver ali o IP real quando a leitura dos cabeçalhos do proxy for ligada (M11).
 */
public class LimiteDeRequisicoesFilter extends OncePerRequestFilter {

    private final LimiteDeRequisicoes limite;
    private final HandlerExceptionResolver resolver;

    public LimiteDeRequisicoesFilter(LimiteDeRequisicoes limite, HandlerExceptionResolver resolver) {
        this.limite = limite;
        this.resolver = resolver;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !request.getRequestURI().startsWith("/api/");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        Optional<Duration> espera = limite.contar(request.getRemoteAddr());
        if (espera.isEmpty()) {
            chain.doFilter(request, response);
            return;
        }
        // O CabecalhosDeSegurancaFilter só roda mais adiante na cadeia, e esta resposta para aqui.
        response.setHeader(HttpHeaders.CACHE_CONTROL, "no-store");
        response.setHeader("X-Content-Type-Options", "nosniff");
        resolver.resolveException(request, response, null, LimiteExcedidoException.deRequisicoes(espera.get()));
    }
}

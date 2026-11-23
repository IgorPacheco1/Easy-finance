package io.github.igorpacheco1.guarda.config;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerExceptionResolver;

/**
 * Faz os erros 401 e 403 do Spring Security saírem no mesmo formato dos demais erros da API
 * (ProblemDetail, em português).
 *
 * <p>O Spring Security barra o pedido num filtro, antes de chegar a qualquer controller, e por
 * isso o {@code TratadorGlobalDeErros} não seria consultado. Aqui entregamos a exceção ao
 * mecanismo de erros do Spring MVC, que a encaminha para ele. Assim há um só lugar com as
 * mensagens.
 */
@Component
public class RespostasDeSegurancaHandler implements AuthenticationEntryPoint, AccessDeniedHandler {

    private final HandlerExceptionResolver resolver;

    public RespostasDeSegurancaHandler(@Qualifier("handlerExceptionResolver") HandlerExceptionResolver resolver) {
        this.resolver = resolver;
    }

    /** 401: pedido sem login numa rota que exige login. */
    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response,
                         AuthenticationException exception) {
        resolver.resolveException(request, response, null, exception);
    }

    /** 403: pedido recusado, na prática o token CSRF ausente ou inválido. */
    @Override
    public void handle(HttpServletRequest request, HttpServletResponse response,
                       AccessDeniedException exception) {
        resolver.resolveException(request, response, null, exception);
    }
}

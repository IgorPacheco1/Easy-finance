package io.github.igorpacheco1.guarda;

import java.io.IOException;

import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.core.Ordered;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.filter.OncePerRequestFilter;

import io.github.igorpacheco1.guarda.usuario.UsuarioNoBanco;
import jakarta.persistence.EntityManagerFactory;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * Só nos testes: informa ao banco quem está logado em cada requisição do MockMvc (RLS, ADR-0034).
 *
 * <p>Em produção, cada requisição abre a sua transação, e o {@code TransacaoComUsuarioNoBanco}
 * informa a pessoa ao abri-la. Nos testes {@code @Transactional}, a transação é aberta pelo teste,
 * antes de qualquer login, e as requisições do MockMvc rodam dentro dela (os services só entram na
 * transação que já existe). Por isso este filtro, que roda depois do Spring Security, repete o
 * mesmo passo a cada requisição. Sem pessoa logada, ele limpa o valor, como em produção.
 */
@TestConfiguration(proxyBeanMethods = false)
public class UsuarioNoBancoNosTestesConfiguration {

    @Bean
    FilterRegistrationBean<OncePerRequestFilter> usuarioNoBancoNosTestes(EntityManagerFactory entityManagerFactory) {
        OncePerRequestFilter filtro = new OncePerRequestFilter() {
            @Override
            protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                            FilterChain chain) throws ServletException, IOException {
                if (TransactionSynchronizationManager.isActualTransactionActive()) {
                    UsuarioNoBanco.informarNaTransacao(entityManagerFactory, UsuarioNoBanco.daSessao());
                }
                chain.doFilter(request, response);
            }
        };
        FilterRegistrationBean<OncePerRequestFilter> registro = new FilterRegistrationBean<>(filtro);
        // Depois do Spring Security, que é quem descobre a pessoa pela sessão.
        registro.setOrder(Ordered.LOWEST_PRECEDENCE);
        return registro;
    }
}

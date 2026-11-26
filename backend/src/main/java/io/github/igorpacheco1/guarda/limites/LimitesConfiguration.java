package io.github.igorpacheco1.guarda.limites;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.HandlerExceptionResolver;

import java.time.Clock;

/** Monta os limites do ADR-0035 e coloca o filtro do limite geral antes do Spring Security. */
@Configuration(proxyBeanMethods = false)
@EnableConfigurationProperties(LimitesProperties.class)
public class LimitesConfiguration {

    /**
     * Ordem do filtro: o Spring Security roda na ordem -100 (o padrão do Spring Boot). Com -101,
     * o limite geral vem logo antes dele.
     */
    static final int ORDEM_DO_FILTRO = -101;

    @Bean
    LimiteDeRequisicoes limiteDeRequisicoes(LimitesProperties limites, Clock clock) {
        return new LimiteDeRequisicoes(limites, clock);
    }

    @Bean
    LimiteDeCadastros limiteDeCadastros(LimitesProperties limites, Clock clock) {
        return new LimiteDeCadastros(limites, clock);
    }

    @Bean
    FilterRegistrationBean<LimiteDeRequisicoesFilter> filtroDoLimiteDeRequisicoes(
            LimiteDeRequisicoes limite,
            @Qualifier("handlerExceptionResolver") HandlerExceptionResolver resolver) {
        FilterRegistrationBean<LimiteDeRequisicoesFilter> registro =
                new FilterRegistrationBean<>(new LimiteDeRequisicoesFilter(limite, resolver));
        registro.setOrder(ORDEM_DO_FILTRO);
        return registro;
    }
}

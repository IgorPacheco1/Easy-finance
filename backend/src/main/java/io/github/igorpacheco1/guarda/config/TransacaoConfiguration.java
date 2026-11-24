package io.github.igorpacheco1.guarda.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import jakarta.persistence.EntityManagerFactory;

/**
 * Troca o gerenciador de transações padrão do Spring Boot pelo que informa ao banco quem está
 * logado (RLS, ADR-0034). Com um bean {@code transactionManager} declarado aqui, o Spring Boot não
 * cria o dele.
 */
@Configuration(proxyBeanMethods = false)
class TransacaoConfiguration {

    @Bean
    TransacaoComUsuarioNoBanco transactionManager(EntityManagerFactory entityManagerFactory) {
        return new TransacaoComUsuarioNoBanco(entityManagerFactory);
    }
}

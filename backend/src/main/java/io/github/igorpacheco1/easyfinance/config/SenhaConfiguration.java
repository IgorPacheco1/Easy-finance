package io.github.igorpacheco1.easyfinance.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.DelegatingPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Map;

/**
 * Como as senhas viram hash (ADR-0020).
 *
 * <p>BCrypt com <em>cost</em> 12: cada +1 dobra o tempo da conta, e 12 fica na faixa de décimos de
 * segundo por verificação. Imperceptível para quem entra, mas inviável para quem tenta bilhões de
 * senhas depois de um vazamento. O BCrypt também usa um sal aleatório: a mesma senha gera hashes
 * diferentes para pessoas diferentes.
 *
 * <p>O {@link DelegatingPasswordEncoder} grava o hash com o prefixo do algoritmo
 * ({@code {bcrypt}$2a$12$...}). Se um dia trocarmos de algoritmo (por exemplo, Argon2), basta
 * mudar o id usado para gravar: as senhas antigas continuam sendo conferidas pelo algoritmo certo.
 */
@Configuration(proxyBeanMethods = false)
public class SenhaConfiguration {

    /** Algoritmo usado para gravar senhas novas. */
    static final String ALGORITMO_ATUAL = "bcrypt";

    static final int CUSTO_DO_BCRYPT = 12;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new DelegatingPasswordEncoder(ALGORITMO_ATUAL,
                Map.of(ALGORITMO_ATUAL, new BCryptPasswordEncoder(CUSTO_DO_BCRYPT)));
    }
}

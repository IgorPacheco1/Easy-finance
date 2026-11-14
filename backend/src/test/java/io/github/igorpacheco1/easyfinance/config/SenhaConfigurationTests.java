package io.github.igorpacheco1.easyfinance.config;

import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.assertj.core.api.Assertions.assertThat;

/** Testes de unidade do encoder de senhas: formato do hash e conferência. Sem Spring e sem banco. */
class SenhaConfigurationTests {

    private final PasswordEncoder encoder = new SenhaConfiguration().passwordEncoder();

    @Test
    void gravaComOPrefixoDoAlgoritmoECustoDoce() {
        // {bcrypt}: id do algoritmo, para poder trocar de algoritmo no futuro. $12$: o custo.
        assertThat(encoder.encode("uma senha longa")).startsWith("{bcrypt}$2a$12$");
    }

    @Test
    void confereASenhaCerta() {
        String hash = encoder.encode("uma senha longa");

        assertThat(encoder.matches("uma senha longa", hash)).isTrue();
    }

    @Test
    void recusaASenhaErrada() {
        String hash = encoder.encode("uma senha longa");

        assertThat(encoder.matches("outra senha longa", hash)).isFalse();
    }

    @Test
    void amesmaSenhaGeraHashesDiferentesPorCausaDoSal() {
        assertThat(encoder.encode("uma senha longa")).isNotEqualTo(encoder.encode("uma senha longa"));
    }
}

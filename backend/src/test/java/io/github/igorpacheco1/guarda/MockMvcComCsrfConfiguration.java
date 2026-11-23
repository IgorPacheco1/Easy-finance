package io.github.igorpacheco1.guarda;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.MockMvcBuilderCustomizer;
import org.springframework.context.annotation.Bean;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

/**
 * Faz toda requisição do MockMvc levar um token CSRF válido, para os testes de API não
 * repetirem {@code .with(csrf())} em cada chamada. Nos testes que verificam o próprio CSRF
 * (ver {@code AuthApiTests}) o MockMvc é montado sem isto.
 */
@TestConfiguration(proxyBeanMethods = false)
public class MockMvcComCsrfConfiguration {

    @Bean
    MockMvcBuilderCustomizer csrfEmTodaRequisicao() {
        return builder -> builder.defaultRequest(get("/").with(csrf()));
    }
}

package io.github.igorpacheco1.easyfinance;

import org.springframework.context.annotation.Import;
import org.springframework.security.test.context.support.WithMockUser;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Roda o teste logado como o {@link UsuarioDeTeste} e com token CSRF em toda requisição.
 * O {@code username} é o id do usuário porque é isso que o {@code UsuarioDaSessao} lê.
 */
@Documented
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.TYPE)
@WithMockUser(username = UsuarioDeTeste.ID_TEXTO)
@Import(MockMvcComCsrfConfiguration.class)
public @interface ComoUsuarioDeTeste {
}

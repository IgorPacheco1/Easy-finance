package io.github.igorpacheco1.guarda.shared;

import jakarta.validation.Constraint;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import jakarta.validation.Payload;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;
import java.nio.charset.StandardCharsets;

/**
 * O texto não pode passar de {@code value} bytes em UTF-8.
 *
 * <p>Existe por causa do BCrypt, que só lê os primeiros 72 <em>bytes</em> da senha e ignora o
 * resto em silêncio. O {@code @Size} conta caracteres, e um "ç" ocupa 2 bytes: 40 letras "ç"
 * já passariam de 72 bytes.
 */
@Documented
@Constraint(validatedBy = TamanhoMaximoEmBytes.Validador.class)
@Target({ElementType.FIELD, ElementType.PARAMETER, ElementType.RECORD_COMPONENT})
@Retention(RetentionPolicy.RUNTIME)
public @interface TamanhoMaximoEmBytes {

    int value();

    String message() default "O texto é grande demais.";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};

    class Validador implements ConstraintValidator<TamanhoMaximoEmBytes, String> {

        private int maximo;

        @Override
        public void initialize(TamanhoMaximoEmBytes anotacao) {
            this.maximo = anotacao.value();
        }

        /** {@code null} é válido aqui: quem exige o campo é o {@code @NotBlank}. */
        @Override
        public boolean isValid(String texto, ConstraintValidatorContext contexto) {
            return texto == null || texto.getBytes(StandardCharsets.UTF_8).length <= maximo;
        }
    }
}

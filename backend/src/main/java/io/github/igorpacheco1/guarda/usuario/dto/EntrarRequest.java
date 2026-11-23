package io.github.igorpacheco1.guarda.usuario.dto;

import io.github.igorpacheco1.guarda.shared.TamanhoMaximoEmBytes;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Corpo do {@code POST /api/v1/auth/entrar}.
 *
 * <p>Não valida o formato do e-mail nem o tamanho mínimo da senha: quem erra o e-mail ou a senha
 * recebe sempre a mesma resposta (401), sem pista do que estava errado. Os limites de tamanho
 * existem só para barrar entradas absurdas antes do BCrypt (a senha de uma conta nunca passa de
 * 72 bytes, regra do cadastro).
 *
 * <p>O {@code toString} é sobrescrito para a senha nunca ir parar num log.
 */
public record EntrarRequest(

        @Schema(description = "E-mail da conta. Não diferencia maiúsculas.", example = "ana@email.com")
        @NotBlank(message = "O e-mail é obrigatório.")
        @Size(max = 254, message = "O e-mail deve ter no máximo 254 caracteres.")
        String email,

        @Schema(description = "Senha da conta.", example = "uma senha bem longa", format = "password")
        @NotBlank(message = "A senha é obrigatória.")
        @TamanhoMaximoEmBytes(value = 72, message = "A senha é grande demais (no máximo 72 bytes).")
        String senha
) {

    /** Espaços nas pontas do e-mail (autocompletar do celular) não contam. A senha fica como veio. */
    public EntrarRequest {
        email = (email == null) ? null : email.strip();
    }

    /** Nunca mostra a senha. */
    @Override
    public String toString() {
        return "EntrarRequest[email=" + email + ", senha=***]";
    }
}

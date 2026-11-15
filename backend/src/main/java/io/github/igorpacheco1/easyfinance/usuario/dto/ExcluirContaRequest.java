package io.github.igorpacheco1.easyfinance.usuario.dto;

import io.github.igorpacheco1.easyfinance.shared.TamanhoMaximoEmBytes;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;

/**
 * Corpo do {@code DELETE /api/v1/eu}. Excluir a conta apaga tudo e não tem volta, então pede a
 * senha. O {@code toString} é sobrescrito para a senha nunca ir parar num log.
 */
public record ExcluirContaRequest(

        @Schema(description = "Senha da conta, para confirmar a exclusão.",
                example = "uma senha bem longa", format = "password")
        @NotBlank(message = "A senha é obrigatória.")
        @TamanhoMaximoEmBytes(value = 72, message = "A senha é grande demais (no máximo 72 bytes).")
        String senha
) {

    /** Nunca mostra a senha. */
    @Override
    public String toString() {
        return "ExcluirContaRequest[senha=***]";
    }
}

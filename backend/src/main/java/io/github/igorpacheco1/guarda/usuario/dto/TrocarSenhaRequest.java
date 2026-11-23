package io.github.igorpacheco1.guarda.usuario.dto;

import io.github.igorpacheco1.guarda.shared.TamanhoMaximoEmBytes;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Corpo do {@code PUT /api/v1/eu/senha}. A nova senha segue a mesma regra do cadastro. O
 * {@code toString} é sobrescrito para nenhuma das senhas ir parar num log.
 */
public record TrocarSenhaRequest(

        @Schema(description = "Senha atual, para confirmar que quem pede é o dono da conta.",
                example = "uma senha bem longa", format = "password")
        @NotBlank(message = "A senha atual é obrigatória.")
        @TamanhoMaximoEmBytes(value = 72, message = "A senha é grande demais (no máximo 72 bytes).")
        String senhaAtual,

        @Schema(description = "Nova senha, de 8 caracteres a 72 bytes. Precisa ser diferente da atual.",
                example = "outra senha bem longa", format = "password")
        @NotBlank(message = "A nova senha é obrigatória.")
        @Size(min = 8, message = "A senha deve ter no mínimo 8 caracteres.")
        @TamanhoMaximoEmBytes(value = 72, message = "A senha é grande demais (no máximo 72 bytes; "
                + "letras com acento ocupam 2).")
        String novaSenha
) {

    /** Nunca mostra as senhas. */
    @Override
    public String toString() {
        return "TrocarSenhaRequest[senhaAtual=***, novaSenha=***]";
    }
}

package io.github.igorpacheco1.easyfinance.categoria.dto;

import io.github.igorpacheco1.easyfinance.categoria.TipoCategoria;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Corpo do {@code POST /api/v1/categorias}. Não tem {@code id} nem {@code sistema}:
 * quem define esses campos é o servidor.
 */
public record CriarCategoriaRequest(

        @Schema(description = "Nome único, sem diferenciar maiúsculas. Até 50 caracteres.", example = "Pets")
        @NotBlank(message = "O nome é obrigatório.")
        @Size(max = 50, message = "O nome deve ter no máximo 50 caracteres.")
        String nome,

        @Schema(description = "Se o dinheiro desta categoria entra (RECEITA) ou sai (DESPESA). Não muda depois.",
                example = "DESPESA")
        @NotNull(message = "O tipo é obrigatório (RECEITA ou DESPESA).")
        TipoCategoria tipo
) {
}

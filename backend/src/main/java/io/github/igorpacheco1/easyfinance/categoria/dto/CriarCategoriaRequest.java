package io.github.igorpacheco1.easyfinance.categoria.dto;

import io.github.igorpacheco1.easyfinance.categoria.TipoCategoria;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Corpo do {@code POST /api/v1/categorias}. Não tem {@code id} nem {@code sistema}:
 * quem define esses campos é o servidor.
 */
public record CriarCategoriaRequest(

        @NotBlank(message = "O nome é obrigatório.")
        @Size(max = 50, message = "O nome deve ter no máximo 50 caracteres.")
        String nome,

        @NotNull(message = "O tipo é obrigatório (RECEITA ou DESPESA).")
        TipoCategoria tipo
) {
}

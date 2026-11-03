package io.github.igorpacheco1.easyfinance.categoria.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Corpo do {@code PUT /api/v1/categorias/{id}}. Só o nome pode mudar: o campo {@code tipo}
 * não existe aqui de propósito, porque trocar o tipo mudaria o saldo de todo o histórico.
 */
public record AtualizarCategoriaRequest(

        @NotBlank(message = "O nome é obrigatório.")
        @Size(max = 50, message = "O nome deve ter no máximo 50 caracteres.")
        String nome
) {
}

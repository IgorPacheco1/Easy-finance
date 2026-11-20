package io.github.igorpacheco1.easyfinance.categoria.dto;

import io.github.igorpacheco1.easyfinance.categoria.AparenciaDaCategoria;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Corpo do {@code PUT /api/v1/categorias/{id}}. Mudam o nome, o ícone e a cor: o campo
 * {@code tipo} não existe aqui de propósito, porque trocar o tipo mudaria o saldo de todo o
 * histórico.
 *
 * <p>{@code icone} e {@code cor} são opcionais (#185): o que não vier fica como está.
 */
public record AtualizarCategoriaRequest(

        @Schema(description = "Novo nome, único sem diferenciar maiúsculas. Até 50 caracteres.", example = "Animais")
        @NotBlank(message = "O nome é obrigatório.")
        @Size(max = 50, message = "O nome deve ter no máximo 50 caracteres.")
        String nome,

        @Schema(description = "Novo ícone (lista fechada, ADR-0031). Sem ele, o ícone não muda.", example = "paw-print")
        @Pattern(regexp = AparenciaDaCategoria.ICONES, message = "Ícone inválido: use um dos ícones do app.")
        String icone,

        @Schema(description = "Nova cor (uma das 12 do app, ADR-0031). Sem ela, a cor não muda.", example = "laranja")
        @Pattern(regexp = AparenciaDaCategoria.CORES, message = "Cor inválida: use uma das 12 cores do app.")
        String cor
) {

    /** Só renomear: o ícone e a cor ficam como estão. */
    public AtualizarCategoriaRequest(String nome) {
        this(nome, null, null);
    }
}

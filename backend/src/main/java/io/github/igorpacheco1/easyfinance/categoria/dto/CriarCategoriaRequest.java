package io.github.igorpacheco1.easyfinance.categoria.dto;

import io.github.igorpacheco1.easyfinance.categoria.AparenciaDaCategoria;
import io.github.igorpacheco1.easyfinance.categoria.TipoCategoria;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Corpo do {@code POST /api/v1/categorias}. Não tem {@code id} nem {@code sistema}:
 * quem define esses campos é o servidor.
 *
 * <p>{@code icone} e {@code cor} são opcionais (#185): sem eles, a categoria nasce com a aparência
 * padrão. Quando vêm, precisam estar na lista fechada ({@code @Pattern} aceita {@code null}).
 */
public record CriarCategoriaRequest(

        @Schema(description = "Nome único, sem diferenciar maiúsculas. Até 50 caracteres.", example = "Pets")
        @NotBlank(message = "O nome é obrigatório.")
        @Size(max = 50, message = "O nome deve ter no máximo 50 caracteres.")
        String nome,

        @Schema(description = "Se o dinheiro desta categoria entra (RECEITA) ou sai (DESPESA). Não muda depois.",
                example = "DESPESA")
        @NotNull(message = "O tipo é obrigatório (RECEITA ou DESPESA).")
        TipoCategoria tipo,

        @Schema(description = "Nome do ícone (lista fechada, ADR-0031). Sem ele, usa circle-ellipsis.",
                example = "paw-print")
        @Pattern(regexp = AparenciaDaCategoria.ICONES, message = "Ícone inválido: use um dos ícones do app.")
        String icone,

        @Schema(description = "Nome da cor (uma das 12 do app, ADR-0031). Sem ela, usa cinza.", example = "laranja")
        @Pattern(regexp = AparenciaDaCategoria.CORES, message = "Cor inválida: use uma das 12 cores do app.")
        String cor
) {

    /** Categoria sem escolher a aparência: nasce com o ícone e a cor padrão. */
    public CriarCategoriaRequest(String nome, TipoCategoria tipo) {
        this(nome, tipo, null, null);
    }
}

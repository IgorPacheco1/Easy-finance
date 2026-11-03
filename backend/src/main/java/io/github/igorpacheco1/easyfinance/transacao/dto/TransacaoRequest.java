package io.github.igorpacheco1.easyfinance.transacao.dto;

import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Corpo do {@code POST} e do {@code PUT} de {@code /api/v1/transacoes}.
 *
 * <p>Por enquanto só confere o que é obrigatório. As regras de valor (maior que zero,
 * 2 casas decimais), o limite da descrição e o intervalo de datas entram na #20.
 *
 * @param valor       sempre positivo; se é entrada ou saída, quem diz é a categoria
 * @param data        dia do lançamento, no formato {@code "2026-11-03"}
 * @param descricao   opcional
 * @param categoriaId id de uma categoria existente
 */
public record TransacaoRequest(

        @NotNull(message = "O valor é obrigatório.")
        BigDecimal valor,

        @NotNull(message = "A data é obrigatória.")
        LocalDate data,

        String descricao,

        @NotNull(message = "A categoria é obrigatória.")
        UUID categoriaId
) {
}

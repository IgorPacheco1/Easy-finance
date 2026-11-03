package io.github.igorpacheco1.easyfinance.transacao.dto;

import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Corpo do {@code POST} e do {@code PUT} de {@code /api/v1/transacoes}.
 *
 * <p>As regras que dependem só do próprio campo ficam aqui, com Bean Validation. A regra da data
 * (até 1 ano antes ou depois de hoje) fica no {@code TransacaoService}, porque na edição ela
 * precisa comparar com a data que já está gravada.
 *
 * @param valor       sempre positivo; se é entrada ou saída, quem diz é a categoria
 * @param data        dia do lançamento, no formato {@code "2026-11-03"}
 * @param descricao   opcional
 * @param categoriaId id de uma categoria existente
 */
public record TransacaoRequest(

        @NotNull(message = "O valor é obrigatório.")
        @Positive(message = "O valor deve ser maior que zero.")
        // 17 + 2 = 19 dígitos: o tamanho da coluna NUMERIC(19,2). Sem esta regra, o PostgreSQL
        // arredondaria 10.555 para 10.56 sem avisar ninguém.
        @Digits(integer = 17, fraction = 2,
                message = "O valor deve ter no máximo 2 casas decimais e 17 dígitos antes da vírgula.")
        BigDecimal valor,

        @NotNull(message = "A data é obrigatória.")
        LocalDate data,

        @Size(max = 255, message = "A descrição deve ter no máximo 255 caracteres.")
        String descricao,

        @NotNull(message = "A categoria é obrigatória.")
        UUID categoriaId
) {
}

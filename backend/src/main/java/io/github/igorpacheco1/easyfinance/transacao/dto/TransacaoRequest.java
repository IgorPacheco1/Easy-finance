package io.github.igorpacheco1.easyfinance.transacao.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Corpo do {@code PUT /api/v1/transacoes/{id}} (edição). A criação usa o
 * {@link CriarTransacaoRequest}, que tem os mesmos campos e regras, mais o {@code id} opcional.
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

        @Schema(description = "Sempre positivo, com até 2 casas decimais.", example = "52.90")
        @NotNull(message = "O valor é obrigatório.")
        @Positive(message = "O valor deve ser maior que zero.")
        // 17 + 2 = 19 dígitos: o tamanho da coluna NUMERIC(19,2). Sem esta regra, o PostgreSQL
        // arredondaria 10.555 para 10.56 sem avisar ninguém.
        @Digits(integer = 17, fraction = 2,
                message = "O valor deve ter no máximo 2 casas decimais e 17 dígitos antes da vírgula.")
        BigDecimal valor,

        @Schema(description = "Dia do lançamento (AAAA-MM-DD).", example = "2026-11-03")
        @NotNull(message = "A data é obrigatória.")
        LocalDate data,

        @Schema(description = "Opcional. Até 255 caracteres; em branco vira null.", example = "Feira")
        @Size(max = 255, message = "A descrição deve ter no máximo 255 caracteres.")
        String descricao,

        @Schema(description = "Id de uma categoria existente.", example = "3f2b8c1e-7a4d-4c1b-9e2a-5d6f7a8b9c0d")
        @NotNull(message = "A categoria é obrigatória.")
        UUID categoriaId
) {
}

package io.github.igorpacheco1.easyfinance.transacao.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.math.BigDecimal;
import java.time.LocalDate;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

/**
 * Resposta do {@code GET /api/v1/saldo}: os totais do período, para a tela do mês mostrar
 * receitas, despesas e saldo com uma chamada só (decisão da #22). Todos os campos vêm sempre
 * (obrigatórios no OpenAPI, #77).
 *
 * @param de       primeiro dia do período (incluído)
 * @param ate      último dia do período (incluído)
 * @param receitas soma das transações de categorias RECEITA
 * @param despesas soma das transações de categorias DESPESA (positiva)
 * @param saldo    receitas menos despesas; negativo se gastou mais do que recebeu
 */
public record SaldoResponse(
        @Schema(requiredMode = REQUIRED, example = "2026-11-01") LocalDate de,
        @Schema(requiredMode = REQUIRED, example = "2026-11-30") LocalDate ate,
        @Schema(requiredMode = REQUIRED, example = "3200.00") BigDecimal receitas,
        @Schema(requiredMode = REQUIRED, description = "Positivo, como os valores das transações.",
                example = "1300.00") BigDecimal despesas,
        @Schema(requiredMode = REQUIRED,
                description = "Receitas menos despesas; negativo se gastou mais do que recebeu.",
                example = "1900.00") BigDecimal saldo
) {
}

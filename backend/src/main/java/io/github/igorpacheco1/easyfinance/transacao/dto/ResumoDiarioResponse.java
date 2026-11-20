package io.github.igorpacheco1.easyfinance.transacao.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

/**
 * Resposta do {@code GET /api/v1/resumo/diario} (#189): quanto se gastou em cada dia do período,
 * para o gráfico de gasto por dia do Mês. Todos os campos vêm sempre (obrigatórios no OpenAPI,
 * #77).
 *
 * <p>A média diária não vem aqui: no mês atual ela depende de "hoje", e quem sabe que dia é hoje
 * para a pessoa (no fuso dela) é o app. Ele divide o {@code total} pelos dias que já passaram.
 *
 * @param de    primeiro dia do período (incluído)
 * @param ate   último dia do período (incluído)
 * @param total soma das despesas do período (igual às despesas do saldo)
 * @param dias  um item por dia, de {@code de} até {@code ate}, em ordem; dia sem gasto vem com zero
 */
public record ResumoDiarioResponse(
        @Schema(requiredMode = REQUIRED, example = "2026-11-01") LocalDate de,
        @Schema(requiredMode = REQUIRED, example = "2026-11-30") LocalDate ate,
        @Schema(requiredMode = REQUIRED, example = "1300.00") BigDecimal total,
        @Schema(requiredMode = REQUIRED) List<GastoDoDia> dias
) {

    /** As despesas de um dia. */
    public record GastoDoDia(
            @Schema(requiredMode = REQUIRED, example = "2026-11-12") LocalDate data,
            @Schema(requiredMode = REQUIRED, example = "180.00") BigDecimal total
    ) {
    }
}

package io.github.igorpacheco1.easyfinance.estatisticas;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDate;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

/**
 * Resposta do {@code GET /api/v1/eu/estatisticas} (#194): números do perfil, calculados na hora
 * (nada fica guardado). Todos os campos vêm sempre (obrigatórios no OpenAPI, #77).
 *
 * @param desde               dia em que a conta foi criada, no fuso pedido
 * @param sequenciaDeDias     quantos dias seguidos, até hoje (ou até ontem, se hoje ainda não teve
 *                            lançamento), a pessoa lançou algo
 * @param totalDeLancamentos  quantos lançamentos a pessoa tem
 * @param totalDeCategorias   quantas categorias diferentes ela já usou
 */
public record EstatisticasResponse(
        @Schema(requiredMode = REQUIRED, example = "2026-11-01") LocalDate desde,
        @Schema(requiredMode = REQUIRED, example = "5") int sequenciaDeDias,
        @Schema(requiredMode = REQUIRED, example = "42") long totalDeLancamentos,
        @Schema(requiredMode = REQUIRED, example = "7") long totalDeCategorias
) {
}

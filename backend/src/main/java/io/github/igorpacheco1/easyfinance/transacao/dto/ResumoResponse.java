package io.github.igorpacheco1.easyfinance.transacao.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

/**
 * Resposta do {@code GET /api/v1/resumo} (#95): para onde foi (e de onde veio) o dinheiro no
 * período, por categoria, separado em receitas e despesas. Todos os campos vêm sempre
 * (obrigatórios no OpenAPI, #77).
 *
 * @param de       primeiro dia do período (incluído)
 * @param ate      último dia do período (incluído)
 * @param receitas categorias de receita com lançamento no período
 * @param despesas categorias de despesa com lançamento no período
 */
public record ResumoResponse(
        @Schema(requiredMode = REQUIRED, example = "2026-11-01") LocalDate de,
        @Schema(requiredMode = REQUIRED, example = "2026-11-30") LocalDate ate,
        @Schema(requiredMode = REQUIRED) ResumoDoTipo receitas,
        @Schema(requiredMode = REQUIRED) ResumoDoTipo despesas
) {

    /**
     * As categorias de um tipo, da que mais somou para a que menos somou (empate: pelo nome).
     *
     * @param total      soma de todas as categorias do tipo no período (igual ao do saldo)
     * @param categorias só as que tiveram lançamento no período; vazia se nenhuma teve
     */
    public record ResumoDoTipo(
            @Schema(requiredMode = REQUIRED, example = "1300.00") BigDecimal total,
            @Schema(requiredMode = REQUIRED) List<ResumoDaCategoria> categorias
    ) {
    }

    /**
     * Uma categoria no resumo.
     *
     * @param percentual quanto a categoria representa do total do seu tipo, de 0 a 100, com uma
     *                   casa decimal. Por causa do arredondamento, a soma dos percentuais pode
     *                   dar 99,9 ou 100,1.
     */
    public record ResumoDaCategoria(
            @Schema(requiredMode = REQUIRED, example = "3f2b8c1e-7a4d-4c1b-9e2a-5d6f7a8b9c0d") UUID id,
            @Schema(requiredMode = REQUIRED, example = "Mercado") String nome,
            @Schema(requiredMode = REQUIRED, example = "800.00") BigDecimal total,
            @Schema(requiredMode = REQUIRED, description = "Quantos lançamentos a categoria teve no período.",
                    example = "12") long quantidade,
            @Schema(requiredMode = REQUIRED, description = "Parte do total do tipo, de 0 a 100, com uma casa "
                    + "decimal. A soma pode dar 99,9 ou 100,1 por arredondamento.",
                    example = "61.5") BigDecimal percentual
    ) {
    }
}

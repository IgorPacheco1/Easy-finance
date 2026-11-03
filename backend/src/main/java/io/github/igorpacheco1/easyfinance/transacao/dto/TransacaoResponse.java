package io.github.igorpacheco1.easyfinance.transacao.dto;

import io.github.igorpacheco1.easyfinance.categoria.Categoria;
import io.github.igorpacheco1.easyfinance.categoria.TipoCategoria;
import io.github.igorpacheco1.easyfinance.transacao.Transacao;
import io.swagger.v3.oas.annotations.media.Schema;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/**
 * O que a API devolve sobre uma transação. Já traz a categoria resumida, para a tela do mês
 * mostrar nome e tipo sem precisar de outra chamada (decisão da #18).
 */
public record TransacaoResponse(
        @Schema(example = "9b1d4e2a-6c3f-4a8b-b7d5-1e2f3a4b5c6d") UUID id,
        @Schema(description = "Sempre positivo; se é receita ou despesa, veja `categoria.tipo`.",
                example = "52.90") BigDecimal valor,
        @Schema(example = "2026-11-03") LocalDate data,
        @Schema(description = "Pode ser null.", example = "Feira") String descricao,
        CategoriaResumo categoria
) {

    /** Só o que a tela precisa da categoria. */
    public record CategoriaResumo(
            @Schema(example = "3f2b8c1e-7a4d-4c1b-9e2a-5d6f7a8b9c0d") UUID id,
            @Schema(example = "Mercado") String nome,
            @Schema(example = "DESPESA") TipoCategoria tipo
    ) {
    }

    public static TransacaoResponse de(Transacao transacao) {
        Categoria categoria = transacao.getCategoria();
        return new TransacaoResponse(
                transacao.getId(),
                transacao.getValor(),
                transacao.getData(),
                transacao.getDescricao(),
                new CategoriaResumo(categoria.getId(), categoria.getNome(), categoria.getTipo()));
    }
}

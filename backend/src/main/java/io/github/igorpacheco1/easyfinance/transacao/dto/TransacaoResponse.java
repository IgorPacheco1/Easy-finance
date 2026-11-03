package io.github.igorpacheco1.easyfinance.transacao.dto;

import io.github.igorpacheco1.easyfinance.categoria.Categoria;
import io.github.igorpacheco1.easyfinance.categoria.TipoCategoria;
import io.github.igorpacheco1.easyfinance.transacao.Transacao;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/**
 * O que a API devolve sobre uma transação. Já traz a categoria resumida, para a tela do mês
 * mostrar nome e tipo sem precisar de outra chamada (decisão da #18).
 */
public record TransacaoResponse(
        UUID id,
        BigDecimal valor,
        LocalDate data,
        String descricao,
        CategoriaResumo categoria
) {

    /** Só o que a tela precisa da categoria. */
    public record CategoriaResumo(UUID id, String nome, TipoCategoria tipo) {
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

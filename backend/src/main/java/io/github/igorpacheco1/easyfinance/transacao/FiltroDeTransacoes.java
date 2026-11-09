package io.github.igorpacheco1.easyfinance.transacao;

import io.github.igorpacheco1.easyfinance.categoria.TipoCategoria;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Os filtros da listagem de transações (#93). Todos são opcionais: {@code null} quer dizer
 * "não filtrar por isso", e os preenchidos se combinam (todos precisam ser atendidos, como um E).
 *
 * @param de          primeiro dia do período (junto com {@code ate})
 * @param ate         último dia do período (junto com {@code de})
 * @param categoriaId só as transações desta categoria
 * @param tipo        só receitas ou só despesas (o tipo vem da categoria)
 * @param descricao   texto contido na descrição, sem diferenciar maiúsculas de minúsculas
 * @param valorMinimo valor mínimo, incluído
 * @param valorMaximo valor máximo, incluído
 */
public record FiltroDeTransacoes(
        LocalDate de,
        LocalDate ate,
        UUID categoriaId,
        TipoCategoria tipo,
        String descricao,
        BigDecimal valorMinimo,
        BigDecimal valorMaximo
) {

    /** Sem nenhum filtro: todas as transações. */
    public static final FiltroDeTransacoes NENHUM =
            new FiltroDeTransacoes(null, null, null, null, null, null, null);

    /** Só o período, como a tela do mês usa. */
    public static FiltroDeTransacoes doPeriodo(LocalDate de, LocalDate ate) {
        return new FiltroDeTransacoes(de, ate, null, null, null, null, null);
    }

    /** Uma cópia com a descrição trocada (o service usa para guardar a versão já limpa). */
    public FiltroDeTransacoes comDescricao(String novaDescricao) {
        return new FiltroDeTransacoes(de, ate, categoriaId, tipo, novaDescricao, valorMinimo, valorMaximo);
    }
}

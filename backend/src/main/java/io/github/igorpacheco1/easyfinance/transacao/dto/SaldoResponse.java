package io.github.igorpacheco1.easyfinance.transacao.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Resposta do {@code GET /api/v1/saldo}: os totais do período, para a tela do mês mostrar
 * receitas, despesas e saldo com uma chamada só (decisão da #22).
 *
 * @param de       primeiro dia do período (incluído)
 * @param ate      último dia do período (incluído)
 * @param receitas soma das transações de categorias RECEITA
 * @param despesas soma das transações de categorias DESPESA (positiva)
 * @param saldo    receitas menos despesas; negativo se gastou mais do que recebeu
 */
public record SaldoResponse(
        LocalDate de,
        LocalDate ate,
        BigDecimal receitas,
        BigDecimal despesas,
        BigDecimal saldo
) {
}

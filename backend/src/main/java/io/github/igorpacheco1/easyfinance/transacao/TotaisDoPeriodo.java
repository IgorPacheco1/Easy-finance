package io.github.igorpacheco1.easyfinance.transacao;

import java.math.BigDecimal;

/**
 * Resultado da consulta {@link TransacaoRepository#somarPorTipo}. O Spring Data preenche cada
 * método com a coluna de mesmo nome do SQL ({@code receitas} e {@code despesas}).
 */
public interface TotaisDoPeriodo {

    BigDecimal getReceitas();

    BigDecimal getDespesas();
}

package io.github.igorpacheco1.easyfinance.transacao;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Uma linha da consulta {@link TransacaoRepository#somarDespesasPorDia}: quanto se gastou num dia
 * (#189). Só vêm os dias com gasto; os outros o service completa com zero.
 *
 * <p>É um record montado direto pela consulta JPQL ({@code SELECT new ...}), e não uma interface
 * como {@link TotalDaCategoria}: como a consulta lê o campo {@code data} da entidade, o Hibernate
 * já entrega um {@link LocalDate}, sem conversão.
 */
public record TotalDoDia(LocalDate data, BigDecimal total) {
}

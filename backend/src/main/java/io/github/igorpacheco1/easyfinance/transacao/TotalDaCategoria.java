package io.github.igorpacheco1.easyfinance.transacao;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Uma linha da consulta {@link TransacaoRepository#somarPorCategoria}: quanto uma categoria
 * somou no período. O Spring Data preenche cada método com a coluna de mesmo nome do SQL.
 *
 * <p>O tipo vem como texto ({@code 'RECEITA'} ou {@code 'DESPESA'}), como está gravado no banco;
 * o service converte para o enum.
 */
public interface TotalDaCategoria {

    UUID getId();

    String getNome();

    String getTipo();

    BigDecimal getTotal();

    Long getQuantidade();
}

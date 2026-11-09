package io.github.igorpacheco1.easyfinance.categoria;

/**
 * Como a listagem de categorias vem ordenada (#97).
 *
 * <ul>
 *   <li>{@link #ALFABETICA}: por tipo e nome. É o padrão e o que a tela de categorias usa.</li>
 *   <li>{@link #USO}: as mais usadas nos últimos dias primeiro, para a tela de lançamento
 *       mostrar logo as que a pessoa costuma escolher.</li>
 * </ul>
 */
public enum OrdemDasCategorias {
    ALFABETICA,
    USO
}

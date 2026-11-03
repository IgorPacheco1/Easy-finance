package io.github.igorpacheco1.easyfinance.categoria;

/**
 * Se o dinheiro de uma categoria entra ou sai. É o único lugar onde o tipo fica guardado
 * (a transação não tem tipo próprio): ver docs/architecture/domain-model.md e ADR-0008.
 */
public enum TipoCategoria {
    RECEITA,
    DESPESA
}

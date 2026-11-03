package io.github.igorpacheco1.easyfinance.categoria.dto;

import io.github.igorpacheco1.easyfinance.categoria.Categoria;
import io.github.igorpacheco1.easyfinance.categoria.TipoCategoria;

import java.util.UUID;

/**
 * O que a API devolve sobre uma categoria. Separado da entidade: assim um campo novo no banco
 * nunca aparece na API sem querermos.
 */
public record CategoriaResponse(UUID id, String nome, TipoCategoria tipo, boolean sistema) {

    public static CategoriaResponse de(Categoria categoria) {
        return new CategoriaResponse(
                categoria.getId(),
                categoria.getNome(),
                categoria.getTipo(),
                categoria.isSistema());
    }
}

package io.github.igorpacheco1.easyfinance.categoria.dto;

import io.github.igorpacheco1.easyfinance.categoria.Categoria;
import io.github.igorpacheco1.easyfinance.categoria.TipoCategoria;
import io.swagger.v3.oas.annotations.media.Schema;

import java.util.UUID;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

/**
 * O que a API devolve sobre uma categoria. Separado da entidade: assim um campo novo no banco
 * nunca aparece na API sem querermos.
 *
 * <p>Todos os campos vêm sempre: por isso estão marcados como obrigatórios no OpenAPI (#77),
 * e o PWA não precisa tratá-los como opcionais.
 */
public record CategoriaResponse(
        @Schema(requiredMode = REQUIRED, example = "3f2b8c1e-7a4d-4c1b-9e2a-5d6f7a8b9c0d") UUID id,
        @Schema(requiredMode = REQUIRED, example = "Mercado") String nome,
        @Schema(requiredMode = REQUIRED, example = "DESPESA") TipoCategoria tipo,
        @Schema(requiredMode = REQUIRED,
                description = "true para as categorias padrão, que não podem ser alteradas nem excluídas.",
                example = "true") boolean sistema
) {

    public static CategoriaResponse de(Categoria categoria) {
        return new CategoriaResponse(
                categoria.getId(),
                categoria.getNome(),
                categoria.getTipo(),
                categoria.isSistema());
    }
}

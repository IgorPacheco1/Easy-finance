package io.github.igorpacheco1.easyfinance.shared;

import io.swagger.v3.oas.annotations.media.Schema;
import org.springframework.data.domain.Slice;

import java.util.List;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

/**
 * Uma página de uma listagem (#92, ADR-0017). Formato próprio, e não o {@code Slice}/{@code Page}
 * do Spring direto no JSON: assim o contrato com o app não muda se o Spring mudar o dele, e
 * detalhes internos (como {@code pageable} e {@code sort}) não vazam.
 *
 * <p>Na API as páginas começam em 1; no Spring, em 0. A conversão fica só em dois lugares: na
 * entrada (o service pede {@code pagina - 1}) e aqui, na saída.
 *
 * @param itens   os itens desta página, na ordem da listagem
 * @param pagina  número desta página, começando em 1
 * @param tamanho quantos itens foram pedidos por página (a última pode vir com menos)
 * @param temMais se existe uma próxima página; é o que a rolagem infinita precisa saber
 */
public record PaginaResponse<T>(
        @Schema(requiredMode = REQUIRED) List<T> itens,
        @Schema(requiredMode = REQUIRED, example = "1") int pagina,
        @Schema(requiredMode = REQUIRED, example = "20") int tamanho,
        @Schema(requiredMode = REQUIRED, example = "true") boolean temMais
) {

    /** Converte um {@code Slice} do Spring (que conta páginas a partir de 0) para o nosso formato. */
    public static <T> PaginaResponse<T> de(Slice<T> slice) {
        return new PaginaResponse<>(
                slice.getContent(), slice.getNumber() + 1, slice.getSize(), slice.hasNext());
    }
}

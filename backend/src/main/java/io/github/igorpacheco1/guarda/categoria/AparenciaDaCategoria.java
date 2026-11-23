package io.github.igorpacheco1.guarda.categoria;

/**
 * A lista fechada de ícones e cores que uma categoria pode ter (#185, ADR-0031). É a mesma lista
 * do app ({@code web/src/categorias/aparencia.ts}): um ícone ou uma cor nova entra nos dois.
 *
 * <p>As listas estão em forma de expressão regular porque são usadas no {@code @Pattern} dos DTOs,
 * e uma anotação só aceita constantes (valores conhecidos na compilação). O {@code @Pattern}
 * confere o texto inteiro: "verde" passa, "verde-escuro" e "Verde" não.
 */
public final class AparenciaDaCategoria {

    /** Aparência neutra: das categorias criadas sem escolher, e das que já existiam antes da V7. */
    public static final String ICONE_PADRAO = "circle-ellipsis";
    public static final String COR_PADRAO = "cinza";

    /** As 12 cores, pelo nome. O tom de cada uma (nos dois temas) é decisão do app, não da API. */
    public static final String CORES =
            "coral|laranja|amarelo|verde|menta|turquesa|ciano|azul|anil|roxo|rosa|cinza";

    /** Os 32 ícones do lucide-react, pelo nome. */
    public static final String ICONES = "house|zap|shopping-cart|utensils|car|heart-pulse|graduation-cap"
            + "|shirt|sparkles|ticket|repeat|landmark|receipt|circle-ellipsis|wallet|briefcase|gift"
            + "|trending-up|circle-plus|paw-print|plane|dumbbell|baby|gamepad-2|coffee|fuel|smartphone"
            + "|music|bus|wrench|piggy-bank|book-open";

    private AparenciaDaCategoria() {
        // Só constantes: não faz sentido criar um objeto desta classe.
    }
}

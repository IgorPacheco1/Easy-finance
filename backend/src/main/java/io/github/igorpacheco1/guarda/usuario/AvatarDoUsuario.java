package io.github.igorpacheco1.guarda.usuario;

import io.github.igorpacheco1.guarda.categoria.AparenciaDaCategoria;

/**
 * O avatar do usuário (#193, ADR-0032): as iniciais do nome num círculo da cor escolhida.
 *
 * <p>Fica guardado como texto, no formato {@code iniciais:<cor>}, com uma das 12 cores das
 * categorias (ADR-0031). O prefixo deixa espaço para outros tipos de avatar no futuro (como
 * {@code mascote:<id>}) sem mudar a coluna. Por enquanto só {@code iniciais} é aceito. Sem foto:
 * o app não guarda arquivos de ninguém.
 */
public final class AvatarDoUsuario {

    /** O avatar de quem ainda não escolheu (e o das contas criadas antes da V8). */
    public static final String PADRAO = "iniciais:cinza";

    /** Expressão regular dos avatares aceitos, para o {@code @Pattern} dos DTOs. */
    public static final String FORMATO = "iniciais:(" + AparenciaDaCategoria.CORES + ")";

    /** Tamanho máximo do nome, igual à coluna da V8. */
    public static final int TAMANHO_MAXIMO_DO_NOME = 60;

    private AvatarDoUsuario() {
        // Só constantes.
    }
}

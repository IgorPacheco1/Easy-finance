package io.github.igorpacheco1.guarda.transacao;

import io.github.igorpacheco1.guarda.transacao.dto.TransacaoResponse;

/**
 * O que o service devolve ao criar: a transação e se ela foi criada agora ({@code true}) ou se
 * já existia, num reenvio idêntico ({@code false}). O controller usa isso para escolher entre
 * 201 Created e 200 OK.
 */
public record ResultadoDaCriacao(TransacaoResponse transacao, boolean criada) {
}

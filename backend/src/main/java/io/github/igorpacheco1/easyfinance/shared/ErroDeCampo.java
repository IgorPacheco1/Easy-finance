package io.github.igorpacheco1.easyfinance.shared;

/**
 * Um campo inválido na requisição. Vai na lista {@code erros} das respostas 400 de validação,
 * para o PWA mostrar a mensagem embaixo do campo certo.
 *
 * @param campo    nome do campo no JSON (ex.: {@code "nome"})
 * @param mensagem o que está errado, em português, pronto para mostrar ao usuário
 */
public record ErroDeCampo(String campo, String mensagem) {
}

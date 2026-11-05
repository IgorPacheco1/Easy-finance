package io.github.igorpacheco1.easyfinance.shared;

import io.swagger.v3.oas.annotations.media.Schema;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

/**
 * Um campo inválido na requisição. Vai na lista {@code erros} das respostas 400 de validação,
 * para o PWA mostrar a mensagem embaixo do campo certo.
 *
 * @param campo    nome do campo no JSON (ex.: {@code "nome"})
 * @param mensagem o que está errado, em português, pronto para mostrar ao usuário
 *
 * <p>Os dois campos vêm sempre (obrigatórios no OpenAPI, #77).
 */
public record ErroDeCampo(
        @Schema(requiredMode = REQUIRED, example = "valor") String campo,
        @Schema(requiredMode = REQUIRED, example = "O valor deve ser maior que zero.") String mensagem
) {
}

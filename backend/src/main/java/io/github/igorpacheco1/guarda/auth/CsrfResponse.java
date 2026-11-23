package io.github.igorpacheco1.guarda.auth;

import io.swagger.v3.oas.annotations.media.Schema;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

/**
 * O token CSRF da sessão e o cabeçalho em que ele deve voltar nas requisições que alteram dados.
 * Os dois campos vêm sempre: obrigatórios no OpenAPI (#77, #130).
 */
public record CsrfResponse(

        @Schema(requiredMode = REQUIRED, description = "Token CSRF da sessão atual. Guarde só em memória.")
        String token,

        @Schema(requiredMode = REQUIRED, description = "Nome do cabeçalho HTTP em que o token deve ser enviado.", example = "X-XSRF-TOKEN")
        String cabecalho
) {
}

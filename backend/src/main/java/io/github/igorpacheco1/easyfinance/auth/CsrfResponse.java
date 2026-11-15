package io.github.igorpacheco1.easyfinance.auth;

import io.swagger.v3.oas.annotations.media.Schema;

/** O token CSRF da sessão e o cabeçalho em que ele deve voltar nas requisições que alteram dados. */
public record CsrfResponse(

        @Schema(description = "Token CSRF da sessão atual. Guarde só em memória.")
        String token,

        @Schema(description = "Nome do cabeçalho HTTP em que o token deve ser enviado.", example = "X-XSRF-TOKEN")
        String cabecalho
) {
}

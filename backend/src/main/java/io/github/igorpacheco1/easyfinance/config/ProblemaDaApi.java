package io.github.igorpacheco1.easyfinance.config;

import io.github.igorpacheco1.easyfinance.shared.ErroDeCampo;
import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

/**
 * Só para a documentação: descreve o formato das respostas de erro (ProblemDetail, RFC 9457)
 * como o {@code TratadorGlobalDeErros} realmente devolve, incluindo a lista {@code erros}.
 * Nenhum código da aplicação usa esta classe.
 */
@Schema(name = "Problema", description = "Resposta de erro no formato ProblemDetail (RFC 9457), "
        + "com content-type application/problem+json.")
record ProblemaDaApi(

        @Schema(description = "Tipo do problema. Hoje sempre about:blank.", example = "about:blank")
        String type,

        @Schema(description = "Resumo do erro, em português.", example = "Dados inválidos")
        String title,

        @Schema(description = "Status HTTP.", example = "400")
        int status,

        @Schema(description = "Explicação para mostrar ao usuário.", example = "Um ou mais campos estão inválidos.")
        String detail,

        @Schema(description = "Caminho da requisição que falhou.", example = "/api/v1/transacoes")
        String instance,

        @Schema(description = "Só nos erros de dados inválidos: o que está errado em cada campo.",
                requiredMode = Schema.RequiredMode.NOT_REQUIRED)
        List<ErroDeCampo> erros
) {
}

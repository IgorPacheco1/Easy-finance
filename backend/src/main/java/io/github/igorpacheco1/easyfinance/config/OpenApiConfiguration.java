package io.github.igorpacheco1.easyfinance.config;

import io.swagger.v3.core.converter.AnnotatedType;
import io.swagger.v3.core.converter.ModelConverters;
import io.swagger.v3.core.converter.ResolvedSchema;
import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.media.Content;
import io.swagger.v3.oas.models.media.MediaType;
import io.swagger.v3.oas.models.media.Schema;
import io.swagger.v3.oas.models.responses.ApiResponse;
import org.springdoc.core.customizers.OpenApiCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Configuração da documentação OpenAPI gerada pelo springdoc (ADR-0010).
 *
 * <p>A especificação e o Swagger UI só ficam ligados no perfil {@code dev}
 * (ver application.yaml e application-dev.yaml).
 */
@Configuration(proxyBeanMethods = false)
public class OpenApiConfiguration {

    private static final String PROBLEM_JSON = "application/problem+json";

    @Bean
    public OpenAPI easyFinanceOpenApi() {
        return new OpenAPI().info(new Info()
                .title("Easy Finance API")
                .version("v1")
                .description("""
                        API do Easy Finance: registro de receitas e despesas pessoais.

                        - Valores em decimal com 2 casas (`52.90`), sempre positivos; se é receita \
                        ou despesa, quem diz é a categoria.
                        - Datas no formato `AAAA-MM-DD`.
                        - Erros no formato ProblemDetail (RFC 9457), com mensagens em português."""));
    }

    /**
     * Completa todas as respostas de erro (4xx e 5xx) com o formato {@code Problema}, e acrescenta
     * o 500 em todos os endpoints. Assim os controllers só dizem <em>quando</em> cada erro
     * acontece, sem repetir o formato do corpo em cada anotação.
     */
    @Bean
    public OpenApiCustomizer respostasDeErroNoFormatoProblema() {
        return openApi -> {
            ResolvedSchema problema = ModelConverters.getInstance()
                    .resolveAsResolvedSchema(new AnnotatedType(ProblemaDaApi.class));
            if (openApi.getComponents() == null) {
                openApi.setComponents(new Components());
            }
            openApi.getComponents().addSchemas("Problema", problema.schema);
            problema.referencedSchemas.forEach(openApi.getComponents()::addSchemas);

            Content conteudoDeErro = new Content().addMediaType(PROBLEM_JSON,
                    new MediaType().schema(new Schema<>().$ref("#/components/schemas/Problema")));

            if (openApi.getPaths() == null) {
                return;
            }
            openApi.getPaths().values().forEach(caminho -> caminho.readOperations().forEach(operacao -> {
                operacao.getResponses().addApiResponse("500", new ApiResponse()
                        .description("Erro inesperado. O detalhe fica só no log do servidor."));
                operacao.getResponses().forEach((codigo, resposta) -> {
                    if (codigo.startsWith("4") || codigo.startsWith("5")) {
                        resposta.setContent(conteudoDeErro);
                    }
                });
            }));
        };
    }
}

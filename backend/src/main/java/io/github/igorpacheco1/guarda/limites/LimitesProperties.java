package io.github.igorpacheco1.guarda.limites;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

import java.time.Duration;

/**
 * Limites de requisições e de criação de contas (ADR-0035), ajustáveis em {@code guarda.limites.*}
 * sem mexer no código.
 *
 * @param maxRequisicoes       requisições à API aceitas por IP dentro da janela
 * @param janelaDasRequisicoes duração da janela do limite geral
 * @param maxCadastros         contas novas aceitas por IP dentro da janela
 * @param janelaDosCadastros   duração da janela do limite de cadastro
 */
@ConfigurationProperties("guarda.limites")
public record LimitesProperties(
        @DefaultValue("120") int maxRequisicoes,
        @DefaultValue("1m") Duration janelaDasRequisicoes,
        @DefaultValue("3") int maxCadastros,
        @DefaultValue("1h") Duration janelaDosCadastros
) {
}

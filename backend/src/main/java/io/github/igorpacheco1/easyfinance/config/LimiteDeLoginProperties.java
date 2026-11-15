package io.github.igorpacheco1.easyfinance.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

import java.time.Duration;

/**
 * Limites do login (ADR-0022), ajustáveis em {@code easyfinance.login.*} sem mexer no código.
 *
 * @param maxFalhasPorEmail falhas toleradas para o mesmo e-mail dentro da janela (protege uma conta)
 * @param maxFalhasPorIp    falhas toleradas para o mesmo IP dentro da janela (protege contra quem
 *                          testa vários e-mails; é maior para não bloquear uma rede compartilhada)
 * @param janela            por quanto tempo uma falha conta; também é o tempo de bloqueio
 */
@ConfigurationProperties("easyfinance.login")
public record LimiteDeLoginProperties(
        @DefaultValue("5") int maxFalhasPorEmail,
        @DefaultValue("20") int maxFalhasPorIp,
        @DefaultValue("15m") Duration janela
) {
}

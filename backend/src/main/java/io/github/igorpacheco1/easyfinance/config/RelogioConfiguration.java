package io.github.igorpacheco1.easyfinance.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Clock;

/**
 * Relógio da aplicação. Quem precisa saber "que dia é hoje" recebe este {@link Clock} em vez de
 * chamar {@code LocalDate.now()} direto. Assim os testes trocam o relógio por um fixo e não
 * dependem do dia em que rodam.
 */
@Configuration(proxyBeanMethods = false)
public class RelogioConfiguration {

    /** Em UTC, como os demais instantes do sistema. */
    @Bean
    public Clock clock() {
        return Clock.systemUTC();
    }
}

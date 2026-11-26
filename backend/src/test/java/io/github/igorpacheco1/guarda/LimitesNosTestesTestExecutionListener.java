package io.github.igorpacheco1.guarda;

import io.github.igorpacheco1.guarda.limites.JanelaDeContagem;
import org.springframework.test.context.TestContext;
import org.springframework.test.context.support.AbstractTestExecutionListener;

/**
 * Só nos testes: zera os limites em memória (ADR-0035) no começo de cada teste.
 *
 * <p>Todos os testes chamam a API do mesmo IP (127.0.0.1) e o contexto do Spring é reaproveitado
 * entre as classes. Sem isto, um teste "gastaria" a cota do seguinte, e os testes passariam ou
 * falhariam conforme a ordem em que rodam. Zerando, cada um começa do zero, com os limites reais
 * da configuração. Registrado para todos os testes em {@code META-INF/spring.factories}.
 */
public class LimitesNosTestesTestExecutionListener extends AbstractTestExecutionListener {

    @Override
    public void beforeTestMethod(TestContext testContext) {
        if (testContext.hasApplicationContext()) {
            testContext.getApplicationContext().getBeansOfType(JanelaDeContagem.class)
                    .values().forEach(JanelaDeContagem::zerar);
        }
    }
}

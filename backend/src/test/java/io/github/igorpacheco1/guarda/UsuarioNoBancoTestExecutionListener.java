package io.github.igorpacheco1.guarda;

import org.springframework.test.context.TestContext;
import org.springframework.test.context.support.AbstractTestExecutionListener;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import io.github.igorpacheco1.guarda.usuario.UsuarioNoBanco;
import jakarta.persistence.EntityManagerFactory;

/**
 * Só nos testes: no começo de cada teste {@code @Transactional} com pessoa logada (por exemplo
 * {@code @ComoUsuarioDeTeste}), informa a pessoa ao banco (RLS, ADR-0034). Assim os dados que o
 * próprio teste prepara direto no banco, antes da primeira requisição, já são dessa pessoa.
 *
 * <p>Roda depois de o teste abrir a transação e de o Spring Security definir a pessoa
 * ({@code @WithMockUser}). Registrado para todos os testes em {@code META-INF/spring.factories}.
 */
public class UsuarioNoBancoTestExecutionListener extends AbstractTestExecutionListener {

    @Override
    public int getOrder() {
        // Depois do TransactionalTestExecutionListener (4000) e do
        // WithSecurityContextTestExecutionListener (10000).
        return 10_100;
    }

    @Override
    public void beforeTestMethod(TestContext testContext) {
        if (!TransactionSynchronizationManager.isActualTransactionActive()) {
            return;
        }
        UsuarioNoBanco.daSessao().ifPresent(usuario -> UsuarioNoBanco.informarNaTransacao(
                testContext.getApplicationContext().getBean(EntityManagerFactory.class), java.util.Optional.of(usuario)));
    }
}

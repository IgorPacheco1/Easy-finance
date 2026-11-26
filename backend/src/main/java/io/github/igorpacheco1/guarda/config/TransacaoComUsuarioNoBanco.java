package io.github.igorpacheco1.guarda.config;

import org.springframework.orm.jpa.EntityManagerHolder;
import org.springframework.orm.jpa.JpaTransactionManager;
import org.springframework.transaction.CannotCreateTransactionException;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import io.github.igorpacheco1.guarda.usuario.UsuarioNoBanco;
import jakarta.persistence.EntityManagerFactory;

/**
 * O gerenciador de transações do JPA, com um passo a mais: logo depois de abrir cada transação,
 * informa ao banco quem está logado (ADR-0034, #249).
 *
 * <p>É o "ponto central" do RLS. Toda transação do Spring passa por aqui (as dos services e as dos
 * repositories), então nenhum service precisa lembrar de informar a pessoa. O valor some sozinho no
 * commit ou no rollback ({@link UsuarioNoBanco}). Uma consulta fora de transação não passa por
 * aqui, e o banco não mostra nenhuma linha a ela: falha fechada.
 */
public class TransacaoComUsuarioNoBanco extends JpaTransactionManager {

    public TransacaoComUsuarioNoBanco(EntityManagerFactory entityManagerFactory) {
        super(entityManagerFactory);
    }

    @Override
    protected void doBegin(Object transaction, TransactionDefinition definition) {
        super.doBegin(transaction, definition);
        try {
            UsuarioNoBanco.informarNaTransacao(obtainEntityManagerFactory(), UsuarioNoBanco.daSessao());
        } catch (RuntimeException erro) {
            // A transação já foi aberta no banco: desfaz e fecha antes de desistir, senão a conexão
            // fica presa e não volta ao pool.
            desfazer();
            doCleanupAfterCompletion(transaction);
            throw new CannotCreateTransactionException("Não foi possível informar a pessoa ao banco.", erro);
        }
    }

    private void desfazer() {
        EntityManagerHolder holder = (EntityManagerHolder)
                TransactionSynchronizationManager.getResource(obtainEntityManagerFactory());
        if (holder != null && holder.getEntityManager().getTransaction().isActive()) {
            holder.getEntityManager().getTransaction().rollback();
        }
    }
}

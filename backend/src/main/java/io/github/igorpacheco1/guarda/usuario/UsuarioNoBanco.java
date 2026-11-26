package io.github.igorpacheco1.guarda.usuario;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.util.Optional;
import java.util.UUID;

import org.hibernate.Session;
import org.springframework.orm.jpa.EntityManagerHolder;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import jakarta.persistence.EntityManagerFactory;

/**
 * Leva ao PostgreSQL quem está logado, para o RLS saber de quem são as linhas (ADR-0034, #249).
 *
 * <p>O valor é definido com {@code set_config('app.usuario_id', <id>, true)}. O {@code true} faz
 * ele valer só até o fim da transação: a conexão volta limpa para o pool, e a próxima requisição
 * nunca herda a pessoa anterior. Sem pessoa logada, o valor fica vazio, e as políticas do banco
 * não mostram nenhuma linha (falha fechada).
 */
public final class UsuarioNoBanco {

    private static final String DEFINIR = "SELECT set_config('app.usuario_id', ?, true)";

    /**
     * Marca que esta thread está descobrindo quem está logado. Descobrir pode ler a sessão no banco
     * (o Spring Security carrega a pessoa sob demanda, e o Spring Session JDBC abre uma transação
     * para ler a sessão). Essa transação perguntaria de novo quem está logado, e uma chamaria a
     * outra sem fim, pegando uma conexão a cada volta.
     */
    private static final ThreadLocal<Boolean> DESCOBRINDO = ThreadLocal.withInitial(() -> false);

    private UsuarioNoBanco() {
    }

    /**
     * Quem está logado nesta requisição, se houver. Diferente do {@link UsuarioAtual}, não lança
     * erro sem login: o cadastro, o login e a sessão também abrem transações, antes de haver
     * alguém logado. Dentro de uma transação aberta enquanto a própria pessoa está sendo
     * descoberta (ler a sessão), responde "ninguém" (ver {@link #DESCOBRINDO}).
     */
    public static Optional<UUID> daSessao() {
        if (DESCOBRINDO.get()) {
            // Transação aberta para ler a própria sessão: só toca as tabelas de sessão, sem RLS.
            return Optional.empty();
        }
        DESCOBRINDO.set(true);
        try {
            return pessoaDoContexto();
        } finally {
            DESCOBRINDO.remove();
        }
    }

    private static Optional<UUID> pessoaDoContexto() {
        Authentication autenticacao = SecurityContextHolder.getContext().getAuthentication();
        if (autenticacao == null || !autenticacao.isAuthenticated()
                || autenticacao instanceof AnonymousAuthenticationToken) {
            return Optional.empty();
        }
        try {
            return Optional.of(UUID.fromString(autenticacao.getName()));
        } catch (IllegalArgumentException nomeQueNaoEId) {
            return Optional.empty();
        }
    }

    /**
     * Informa a pessoa ao banco na transação aberta para o {@code entityManagerFactory}.
     *
     * @throws IllegalStateException se não houver transação aberta
     */
    public static void informarNaTransacao(EntityManagerFactory entityManagerFactory, Optional<UUID> usuario) {
        EntityManagerHolder holder = (EntityManagerHolder)
                TransactionSynchronizationManager.getResource(entityManagerFactory);
        if (holder == null) {
            throw new IllegalStateException("Não há transação aberta para informar a pessoa ao banco.");
        }
        holder.getEntityManager().unwrap(Session.class).doWork(conexao -> informar(conexao, usuario));
    }

    private static void informar(Connection conexao, Optional<UUID> usuario) throws SQLException {
        try (PreparedStatement comando = conexao.prepareStatement(DEFINIR)) {
            comando.setString(1, usuario.map(UUID::toString).orElse(""));
            comando.execute();
        }
    }
}

package io.github.igorpacheco1.guarda;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * O ponto central do RLS: cada transação informa ao banco quem está logado, e o valor some no fim
 * dela (ADR-0034, #249).
 *
 * <p>Sem {@code @Transactional}: aqui cada transação é aberta e fechada de verdade, como numa
 * requisição em produção, pelo gerenciador de transações do app.
 */
@Import(TestcontainersConfiguration.class)
@SpringBootTest
@ActiveProfiles("test")
class UsuarioNoBancoTests {

    private static final String PESSOA_NO_BANCO = "SELECT current_setting('app.usuario_id', true)";

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private PlatformTransactionManager transacoes;

    @AfterEach
    void sair() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void aTransacaoInformaAoBancoQuemEstaLogado() {
        UUID pessoa = UUID.randomUUID();
        entrarComo(pessoa);

        String noBanco = new TransactionTemplate(transacoes).execute(status -> jdbc.queryForObject(PESSOA_NO_BANCO, String.class));

        assertThat(noBanco).isEqualTo(pessoa.toString());
    }

    @Test
    void aTransacaoSomenteDeLeituraTambemInforma() {
        UUID pessoa = UUID.randomUUID();
        entrarComo(pessoa);
        TransactionTemplate leitura = new TransactionTemplate(transacoes);
        leitura.setReadOnly(true);

        String noBanco = leitura.execute(status -> jdbc.queryForObject(PESSOA_NO_BANCO, String.class));

        assertThat(noBanco).isEqualTo(pessoa.toString());
    }

    @Test
    void aProximaTransacaoNaoHerdaAPessoaAnterior() {
        // Pool com várias conexões: repete para passar pela mesma conexão mais de uma vez.
        for (int vez = 0; vez < 20; vez++) {
            entrarComo(UUID.randomUUID());
            new TransactionTemplate(transacoes).execute(status -> jdbc.queryForObject(PESSOA_NO_BANCO, String.class));
            SecurityContextHolder.clearContext();

            String noBanco = new TransactionTemplate(transacoes)
                    .execute(status -> jdbc.queryForObject(PESSOA_NO_BANCO, String.class));

            assertThat(noBanco).isNullOrEmpty();
        }
    }

    @Test
    void foraDeTransacaoOBancoNaoSabeQuemEstaLogado() {
        entrarComo(UUID.randomUUID());

        String noBanco = jdbc.queryForObject(PESSOA_NO_BANCO, String.class);

        assertThat(noBanco).isNullOrEmpty();
    }

    private static void entrarComo(UUID pessoa) {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(pessoa.toString(), null, List.of()));
    }
}

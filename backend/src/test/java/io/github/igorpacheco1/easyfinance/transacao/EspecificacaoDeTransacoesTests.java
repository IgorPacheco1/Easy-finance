package io.github.igorpacheco1.easyfinance.transacao;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * O escape da busca por texto (#93). O comportamento completo dos filtros é testado com o banco
 * de verdade em {@link TransacaoApiTests}; aqui fica só a regra do escape, que é pura.
 */
class EspecificacaoDeTransacoesTests {

    @Test
    void porcentagemESublinhadoGanhamEscape() {
        assertThat(EspecificacaoDeTransacoes.escaparLike("50%")).isEqualTo("50\\%");
        assertThat(EspecificacaoDeTransacoes.escaparLike("a_b")).isEqualTo("a\\_b");
    }

    @Test
    void oProprioCaractereDeEscapeTambemGanhaEscape() {
        // Senão "c:\%" viraria "c:\\%", e o LIKE leria a barra como texto e o % como curinga.
        assertThat(EspecificacaoDeTransacoes.escaparLike("c:\\pasta")).isEqualTo("c:\\\\pasta");
    }

    @Test
    void textoComumNaoMuda() {
        assertThat(EspecificacaoDeTransacoes.escaparLike("uber")).isEqualTo("uber");
    }
}

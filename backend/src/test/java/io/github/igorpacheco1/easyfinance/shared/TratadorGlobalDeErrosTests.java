package io.github.igorpacheco1.easyfinance.shared;

import org.hibernate.exception.ConstraintViolationException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;

import java.sql.SQLException;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Testes de unidade dos erros 409 e 500, que não têm como ser provocados pelos endpoints de
 * hoje. O foco é a segurança: a resposta nunca pode carregar detalhes internos, e o log nunca
 * pode guardar dados financeiros.
 */
@ExtendWith(OutputCaptureExtension.class)
class TratadorGlobalDeErrosTests {

    private final TratadorGlobalDeErros tratador = new TratadorGlobalDeErros();

    @Test
    void violacaoDeIntegridadeNaoTratadaRetorna409SemDetalhesDoBanco() {
        DataIntegrityViolationException erroDoBanco = new DataIntegrityViolationException(
                "ERROR: new row for relation \"transacao\" violates check constraint \"ck_transacao_valor_positivo\"");

        ResponseEntity<ProblemDetail> resposta = tratador.tratarViolacaoDeIntegridade(erroDoBanco);

        assertThat(resposta.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(resposta.getBody()).isNotNull();
        assertThat(resposta.getBody().getTitle()).isEqualTo("Conflito com dados existentes");
        assertThat(resposta.getBody().getDetail())
                .doesNotContain("transacao")
                .doesNotContain("ck_transacao_valor_positivo");
    }

    @Test
    void erroInesperadoRetorna500SemDetalhesInternos() {
        IllegalStateException erroInterno = new IllegalStateException("detalhe interno que não pode vazar");

        ResponseEntity<ProblemDetail> resposta = tratador.tratarErroInesperado(erroInterno);

        assertThat(resposta.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
        assertThat(resposta.getBody()).isNotNull();
        assertThat(resposta.getBody().getTitle()).isEqualTo("Erro interno");
        assertThat(resposta.getBody().getDetail()).doesNotContain("detalhe interno");
        assertThat(resposta.getBody().getProperties()).isNullOrEmpty();
    }

    @Test
    void logDaViolacaoDeIntegridadeTemSoONomeDaRestricaoSemOsDados(CapturedOutput saida) {
        // A mensagem real do PostgreSQL traz a linha recusada, com valor e descrição.
        SQLException doBanco = new SQLException(
                "ERROR: new row violates check constraint. Failing row contains (feira secreta, -52.90)");
        DataIntegrityViolationException erroDoBanco = new DataIntegrityViolationException("Erro ao gravar",
                new ConstraintViolationException(doBanco.getMessage(), doBanco, "ck_transacao_valor_positivo"));

        tratador.tratarViolacaoDeIntegridade(erroDoBanco);

        assertThat(saida.getOut())
                .contains("restrição: ck_transacao_valor_positivo")
                .doesNotContain("feira secreta")
                .doesNotContain("-52.90");
    }

    @Test
    void semONomeDaRestricaoOLogDizDesconhecida() {
        assertThat(TratadorGlobalDeErros.nomeDaRestricao(new DataIntegrityViolationException("x")))
                .isEqualTo("desconhecida");
    }
}

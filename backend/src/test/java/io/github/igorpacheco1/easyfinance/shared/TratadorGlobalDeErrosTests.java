package io.github.igorpacheco1.easyfinance.shared;

import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Testes de unidade dos erros 409 e 500, que não têm como ser provocados pelos endpoints de
 * hoje. O foco é a segurança: a resposta nunca pode carregar detalhes internos.
 */
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
}

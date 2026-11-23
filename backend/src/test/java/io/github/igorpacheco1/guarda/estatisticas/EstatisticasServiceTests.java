package io.github.igorpacheco1.guarda.estatisticas;

import io.github.igorpacheco1.guarda.shared.CampoInvalidoException;
import io.github.igorpacheco1.guarda.transacao.TransacaoRepository;
import io.github.igorpacheco1.guarda.usuario.Usuario;
import io.github.igorpacheco1.guarda.usuario.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/** Testes de unidade das estatísticas (#194): a sequência de dias e o fuso, sem banco. */
@ExtendWith(MockitoExtension.class)
class EstatisticasServiceTests {

    private static final UUID ID = UUID.fromString("00000000-0000-0000-0000-0000000000aa");

    /** 03/11/2026 às 01:30 em UTC: em São Paulo (UTC-3) ainda é 02/11, às 22:30. */
    private static final Clock MADRUGADA_UTC = Clock.fixed(Instant.parse("2026-11-03T01:30:00Z"), ZoneOffset.UTC);

    @Mock
    private TransacaoRepository transacoes;

    @Mock
    private UsuarioRepository usuarios;

    private EstatisticasService service;

    @BeforeEach
    void preparar() {
        service = new EstatisticasService(transacoes, usuarios, () -> ID, MADRUGADA_UTC);
    }

    // ---------------------------------------------------------------- sequência de dias

    private static int sequencia(String hoje, String... dias) {
        return EstatisticasService.sequenciaDeDias(
                java.util.Arrays.stream(dias).map(LocalDate::parse).toList(), LocalDate.parse(hoje));
    }

    @Test
    void contaOsDiasSeguidosAteHoje() {
        assertThat(sequencia("2026-11-05", "2026-11-05", "2026-11-04", "2026-11-03")).isEqualTo(3);
    }

    @Test
    void hojeSemLancamentoAindaNaoPerdeASequencia() {
        assertThat(sequencia("2026-11-05", "2026-11-04", "2026-11-03")).isEqualTo(2);
    }

    @Test
    void umDiaInteiroSemLancarZeraASequencia() {
        assertThat(sequencia("2026-11-05", "2026-11-03", "2026-11-02")).isZero();
    }

    @Test
    void paraNoPrimeiroBuraco() {
        assertThat(sequencia("2026-11-05", "2026-11-05", "2026-11-04", "2026-11-02", "2026-11-01")).isEqualTo(2);
    }

    @Test
    void atravessaAViradaDoMesEDoAno() {
        assertThat(sequencia("2026-03-01", "2026-03-01", "2026-02-28", "2026-02-27")).isEqualTo(3);
        assertThat(sequencia("2027-01-01", "2027-01-01", "2026-12-31", "2026-12-30")).isEqualTo(3);
    }

    @Test
    void semLancamentoNenhumDaZero() {
        assertThat(sequencia("2026-11-05")).isZero();
    }

    // ---------------------------------------------------------------- fuso

    @Test
    void hojeEODiaDaContaSaoCalculadosNoFusoPedido() {
        Usuario usuario = new Usuario("ana@email.com", "{bcrypt}hash", "Ana");
        ReflectionTestUtils.setField(usuario, "id", ID);
        // Criada em 01/11 às 02:00 UTC: em São Paulo foi 31/10, às 23:00.
        ReflectionTestUtils.setField(usuario, "criadoEm", Instant.parse("2026-11-01T02:00:00Z"));
        when(usuarios.findById(ID)).thenReturn(Optional.of(usuario));
        when(transacoes.diasComLancamento(ID, "America/Sao_Paulo")).thenReturn(List.of("2026-11-02", "2026-11-01"));
        when(transacoes.countByUsuarioId(ID)).thenReturn(4L);
        when(transacoes.contarCategoriasUsadas(ID)).thenReturn(2L);

        EstatisticasResponse resposta = service.calcular("America/Sao_Paulo");

        // Em São Paulo, "hoje" ainda é 02/11: a sequência é de 2 dias.
        assertThat(resposta).isEqualTo(new EstatisticasResponse(LocalDate.parse("2026-10-31"), 2, 4, 2));
    }

    @Test
    void fusoForaDaListaENemConsultaOBanco() {
        for (String fuso : new String[] {"Lugar/Inventado", "+03:00", "Z", ""}) {
            assertThatThrownBy(() -> service.calcular(fuso))
                    .isInstanceOf(CampoInvalidoException.class);
        }
        verifyNoInteractions(transacoes, usuarios);
    }
}

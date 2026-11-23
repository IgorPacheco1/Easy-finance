package io.github.igorpacheco1.guarda.auth;

import io.github.igorpacheco1.guarda.auth.TentativasDeLoginRepository.Tipo;
import io.github.igorpacheco1.guarda.config.LimiteDeLoginProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Testes de unidade do {@link LimiteDeTentativas}: a janela deslizante e o tempo de espera. */
@ExtendWith(MockitoExtension.class)
class LimiteDeTentativasTests {

    private static final Instant AGORA = Instant.parse("2026-11-15T12:00:00Z");
    private static final Duration JANELA = Duration.ofMinutes(15);
    private static final String IP = "203.0.113.7";

    @Mock
    private TentativasDeLoginRepository repository;

    private LimiteDeTentativas limite;

    @BeforeEach
    void montar() {
        limite = new LimiteDeTentativas(repository, new LimiteDeLoginProperties(3, 5, JANELA),
                Clock.fixed(AGORA, ZoneOffset.UTC));
    }

    @Test
    void abaixoDoMaximoPassa() {
        when(repository.falhasDesde(eq(Tipo.EMAIL), any(), eq(AGORA.minus(JANELA))))
                .thenReturn(List.of(AGORA.minusSeconds(60), AGORA.minusSeconds(30)));
        when(repository.falhasDesde(eq(Tipo.IP), any(), any())).thenReturn(List.of());

        assertThatCode(() -> limite.verificar("ana@email.com", IP)).doesNotThrowAnyException();
    }

    @Test
    void noMaximoDeFalhasPorEmailBloqueiaAteAMaisAntigaSairDaJanela() {
        // 3 falhas = máximo. A mais antiga (10 min atrás) sai da janela em 5 min.
        when(repository.falhasDesde(eq(Tipo.EMAIL), any(), any()))
                .thenReturn(List.of(AGORA.minus(Duration.ofMinutes(10)), AGORA.minusSeconds(60), AGORA.minusSeconds(30)));
        when(repository.falhasDesde(eq(Tipo.IP), any(), any())).thenReturn(List.of());

        assertThatThrownBy(() -> limite.verificar("ana@email.com", IP))
                .isInstanceOfSatisfying(MuitasTentativasException.class, e ->
                        assertThat(e.getHeaders().getFirst("Retry-After")).isEqualTo("300"));
    }

    @Test
    void comMaisFalhasQueOMaximoEsperaAteAFalhaQueFazVoltarAbaixoDoLimite() {
        // 4 falhas, máximo 3: só liberta quando a SEGUNDA mais antiga sair (posição 4 - 3 = 1).
        when(repository.falhasDesde(eq(Tipo.EMAIL), any(), any())).thenReturn(List.of(
                AGORA.minus(Duration.ofMinutes(14)), AGORA.minus(Duration.ofMinutes(10)),
                AGORA.minus(Duration.ofMinutes(2)), AGORA.minusSeconds(30)));
        when(repository.falhasDesde(eq(Tipo.IP), any(), any())).thenReturn(List.of());

        assertThatThrownBy(() -> limite.verificar("ana@email.com", IP))
                .isInstanceOfSatisfying(MuitasTentativasException.class, e ->
                        assertThat(e.getHeaders().getFirst("Retry-After")).isEqualTo("300"));
    }

    @Test
    void oLimiteDoIpTambemBloqueiaMesmoComOEmailLimpo() {
        when(repository.falhasDesde(eq(Tipo.EMAIL), any(), any())).thenReturn(List.of());
        when(repository.falhasDesde(eq(Tipo.IP), any(), any())).thenReturn(List.of(
                AGORA.minusSeconds(500), AGORA.minusSeconds(400), AGORA.minusSeconds(300),
                AGORA.minusSeconds(200), AGORA.minusSeconds(100)));

        assertThatThrownBy(() -> limite.verificar("ana@email.com", IP))
                .isInstanceOf(MuitasTentativasException.class);
    }

    @Test
    void registrarFalhaGravaEmailEIpSoComoHashEApagaAsVencidas() {
        limite.registrarFalha("  ANA@Email.com ", IP);

        verify(repository).apagarAnterioresA(AGORA.minus(JANELA));
        ArgumentCaptor<String> chaves = ArgumentCaptor.forClass(String.class);
        verify(repository).registrar(eq(Tipo.EMAIL), chaves.capture(), eq(AGORA));
        verify(repository).registrar(eq(Tipo.IP), chaves.capture(), eq(AGORA));

        assertThat(chaves.getAllValues()).allSatisfy(chave ->
                assertThat(chave).hasSize(64).matches("[0-9a-f]{64}").doesNotContain("ana", IP));
        // A grafia do e-mail não importa: a mesma chave que "ana@email.com" teria.
        limite.registrarFalha("ana@email.com", IP);
        verify(repository, org.mockito.Mockito.times(2)).registrar(eq(Tipo.EMAIL), eq(chaves.getAllValues().get(0)), eq(AGORA));
    }

    @Test
    void loginCertoApagaSoOHistoricoDoEmail() {
        limite.registrarSucesso("ana@email.com");

        verify(repository).apagar(eq(Tipo.EMAIL), any());
        org.mockito.Mockito.verifyNoMoreInteractions(repository);
    }
}

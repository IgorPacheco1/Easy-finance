package io.github.igorpacheco1.easyfinance.auth;

import io.github.igorpacheco1.easyfinance.auth.TentativasDeLoginRepository.Tipo;
import io.github.igorpacheco1.easyfinance.config.LimiteDeLoginProperties;
import io.github.igorpacheco1.easyfinance.usuario.Usuario;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;
import java.util.List;

/**
 * Limite de falhas de login por e-mail e por IP, com janela deslizante (ADR-0022).
 *
 * <p>Uma falha conta durante a {@code janela}. Quem acumula o máximo de falhas dentro dela fica
 * bloqueado até a falha mais antiga "sair" da janela. O bloqueio vale mesmo para a senha certa
 * e para e-mail sem conta: a resposta não pode revelar quais contas existem.
 *
 * <p>Os e-mails e IPs são guardados só como hash (SHA-256).
 */
@Service
@RequiredArgsConstructor
public class LimiteDeTentativas {

    private final TentativasDeLoginRepository repository;
    private final LimiteDeLoginProperties limites;
    private final Clock clock;

    /** Lança {@link MuitasTentativasException} se o e-mail ou o IP já estourou o limite. */
    public void verificar(String email, String ip) {
        Instant agora = clock.instant();
        Duration espera = maior(
                esperaPara(Tipo.EMAIL, chaveDoEmail(email), limites.maxFalhasPorEmail(), agora),
                esperaPara(Tipo.IP, hash(ip), limites.maxFalhasPorIp(), agora));
        if (!espera.isZero()) {
            throw new MuitasTentativasException(espera);
        }
    }

    /** Anota uma falha para o e-mail e outra para o IP, e aproveita para apagar as vencidas. */
    @Transactional
    public void registrarFalha(String email, String ip) {
        Instant agora = clock.instant();
        repository.apagarAnterioresA(agora.minus(limites.janela()));
        repository.registrar(Tipo.EMAIL, chaveDoEmail(email), agora);
        repository.registrar(Tipo.IP, hash(ip), agora);
    }

    /** Login certo: o histórico de falhas do e-mail recomeça. O do IP segue, pois pode ser de outra pessoa. */
    public void registrarSucesso(String email) {
        repository.apagar(Tipo.EMAIL, chaveDoEmail(email));
    }

    private Duration esperaPara(Tipo tipo, String chave, int maximo, Instant agora) {
        List<Instant> falhas = repository.falhasDesde(tipo, chave, agora.minus(limites.janela()));
        if (falhas.size() < maximo) {
            return Duration.ZERO;
        }
        // Para voltar abaixo do máximo, as falhas mais antigas precisam sair da janela: a que
        // decide é a de posição (total - máximo).
        Instant liberaEm = falhas.get(falhas.size() - maximo).plus(limites.janela());
        Duration espera = Duration.between(agora, liberaEm);
        return espera.isNegative() || espera.isZero() ? Duration.ofSeconds(1) : espera;
    }

    private static Duration maior(Duration a, Duration b) {
        return a.compareTo(b) >= 0 ? a : b;
    }

    /** O mesmo e-mail em qualquer grafia (maiúsculas, espaços nas pontas) conta como um só. */
    private static String chaveDoEmail(String email) {
        return hash(Usuario.normalizarEmail(email));
    }

    private static String hash(String texto) {
        try {
            byte[] resumo = MessageDigest.getInstance("SHA-256").digest(texto.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(resumo);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 sempre existe na JVM", e);
        }
    }
}

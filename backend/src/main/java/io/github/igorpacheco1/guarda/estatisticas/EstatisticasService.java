package io.github.igorpacheco1.guarda.estatisticas;

import io.github.igorpacheco1.guarda.shared.CampoInvalidoException;
import io.github.igorpacheco1.guarda.transacao.TransacaoRepository;
import io.github.igorpacheco1.guarda.usuario.Usuario;
import io.github.igorpacheco1.guarda.usuario.UsuarioAtual;
import io.github.igorpacheco1.guarda.usuario.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Collection;
import java.util.HashSet;
import java.util.Set;

/**
 * Estatísticas do perfil (#194), calculadas na hora a partir das transações: sem coluna nova.
 *
 * <p>A sequência de dias depende de "que dia é hoje", e isso depende do fuso de quem usa: o
 * servidor roda em UTC, e o Brasil tem quatro fusos. Por isso o app manda o fuso dele.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EstatisticasService {

    /** Fuso usado quando o app não manda um. */
    public static final String FUSO_PADRAO = "America/Sao_Paulo";

    private final TransacaoRepository transacoes;
    private final UsuarioRepository usuarios;
    private final UsuarioAtual usuarioAtual;
    private final Clock clock;

    public EstatisticasResponse calcular(String fuso) {
        ZoneId zona = validarFuso(fuso);
        Usuario usuario = usuarios.findById(usuarioAtual.id())
                .orElseThrow(() -> new AuthenticationCredentialsNotFoundException("Usuário não existe mais."));
        Set<LocalDate> dias = new HashSet<>();
        for (String dia : transacoes.diasComLancamento(usuario.getId(), zona.getId())) {
            dias.add(LocalDate.parse(dia));
        }
        return new EstatisticasResponse(
                LocalDate.ofInstant(usuario.getCriadoEm(), zona),
                sequenciaDeDias(dias, LocalDate.now(clock.withZone(zona))),
                transacoes.countByUsuarioId(usuario.getId()),
                transacoes.contarCategoriasUsadas(usuario.getId()));
    }

    /**
     * Quantos dias seguidos têm lançamento, contando para trás a partir de hoje. Se hoje ainda não
     * teve, a contagem começa ontem: a sequência só se perde depois de um dia inteiro sem lançar.
     * Como os dias são datas ({@link LocalDate}), {@code minusDays(1)} atravessa a virada do mês
     * e do ano sem conta especial.
     */
    static int sequenciaDeDias(Collection<LocalDate> diasComLancamento, LocalDate hoje) {
        Set<LocalDate> dias = Set.copyOf(diasComLancamento);
        LocalDate dia = dias.contains(hoje) ? hoje : hoje.minusDays(1);
        int sequencia = 0;
        while (dias.contains(dia)) {
            sequencia++;
            dia = dia.minusDays(1);
        }
        return sequencia;
    }

    /**
     * Só nomes da lista de fusos (como "America/Sao_Paulo"). Deslocamentos como "+03:00" ficam de
     * fora: no {@code AT TIME ZONE} do PostgreSQL, o sinal deles funciona ao contrário do Java, e
     * daria o dia errado sem ninguém perceber.
     */
    private static ZoneId validarFuso(String fuso) {
        if (fuso == null || !ZoneId.getAvailableZoneIds().contains(fuso)) {
            throw new CampoInvalidoException("fuso", "Fuso horário inválido. Use um nome como America/Sao_Paulo.");
        }
        return ZoneId.of(fuso);
    }
}

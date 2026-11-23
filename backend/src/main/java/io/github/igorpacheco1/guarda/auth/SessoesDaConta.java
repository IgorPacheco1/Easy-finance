package io.github.igorpacheco1.guarda.auth;

import lombok.RequiredArgsConstructor;
import org.springframework.session.FindByIndexNameSessionRepository;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Encerra as sessões de uma conta no servidor (ADR-0020). Só é possível porque o nome da
 * autenticação na sessão é o <b>id do usuário</b> ({@code PRINCIPAL_NAME}, decidido na #125).
 *
 * <p>Encerrar no servidor é o que importa: um cookie roubado deixa de valer na hora, mesmo que
 * continue guardado em algum navegador.
 */
@Component
@RequiredArgsConstructor
public class SessoesDaConta {

    private final FindByIndexNameSessionRepository<?> sessoes;

    /**
     * Apaga todas as sessões da conta, menos a informada (a de quem está fazendo o pedido).
     *
     * @return quantas sessões foram encerradas
     */
    public int encerrarOutras(UUID usuarioId, String sessaoAtualId) {
        int encerradas = 0;
        for (String id : sessoes.findByPrincipalName(usuarioId.toString()).keySet()) {
            if (!id.equals(sessaoAtualId)) {
                sessoes.deleteById(id);
                encerradas++;
            }
        }
        return encerradas;
    }
}

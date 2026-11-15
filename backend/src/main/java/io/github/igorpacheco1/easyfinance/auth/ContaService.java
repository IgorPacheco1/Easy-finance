package io.github.igorpacheco1.easyfinance.auth;

import io.github.igorpacheco1.easyfinance.usuario.SenhaAtualIncorretaException;
import io.github.igorpacheco1.easyfinance.usuario.UsuarioAtual;
import io.github.igorpacheco1.easyfinance.usuario.UsuarioService;
import io.github.igorpacheco1.easyfinance.usuario.dto.ExcluirContaRequest;
import io.github.igorpacheco1.easyfinance.usuario.dto.TrocarSenhaRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.UUID;

/**
 * Gestão da conta de quem está logado: trocar a senha e excluir a conta (ADR-0024).
 *
 * <p>As duas operações pedem a senha. Errar essa senha conta no mesmo limite de tentativas do
 * login (ADR-0022): sem isso, quem roubasse uma sessão adivinharia a senha por aqui sem limite.
 *
 * <p>Não é {@code @Transactional} de propósito, como o {@link LoginService}: a falha precisa ficar
 * gravada mesmo quando a operação termina em exceção (400).
 */
@Service
@RequiredArgsConstructor
public class ContaService {

    private final UsuarioService usuarioService;
    private final UsuarioAtual usuarioAtual;
    private final LimiteDeTentativas limite;
    private final SessoesDaConta sessoes;

    /**
     * Troca a senha e encerra as <b>outras</b> sessões da conta (a atual continua): se a senha foi
     * trocada porque alguém a descobriu, essa pessoa cai junto.
     *
     * @param sessaoAtualId id da sessão de quem fez o pedido, que não é encerrada
     */
    public void trocarSenha(TrocarSenhaRequest request, String ip, String sessaoAtualId) {
        UUID id = usuarioAtual.id();
        String email = usuarioService.buscar(id).email();
        limite.verificar(email, ip);
        try {
            usuarioService.trocarSenha(id, request.senhaAtual(), request.novaSenha());
        } catch (SenhaAtualIncorretaException e) {
            limite.registrarFalha(email, ip);
            throw e;
        }
        limite.registrarSucesso(email);
        sessoes.encerrarOutras(id, sessaoAtualId);
    }

    /**
     * Exclui a conta com todos os dados e encerra as outras sessões. Quem chama encerra a sessão
     * atual (é ela que leva o cookie de volta para o navegador).
     */
    public void excluir(ExcluirContaRequest request, String ip, String sessaoAtualId) {
        UUID id = usuarioAtual.id();
        String email = usuarioService.buscar(id).email();
        limite.verificar(email, ip);
        try {
            usuarioService.excluir(id, request.senha());
        } catch (SenhaAtualIncorretaException e) {
            limite.registrarFalha(email, ip);
            throw e;
        }
        // A conta não existe mais: o histórico de falhas dela também vai embora.
        limite.registrarSucesso(email);
        sessoes.encerrarOutras(id, sessaoAtualId);
    }
}

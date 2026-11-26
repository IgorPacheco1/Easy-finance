package io.github.igorpacheco1.guarda.auth;

import io.github.igorpacheco1.guarda.limites.LimiteDeCadastros;
import io.github.igorpacheco1.guarda.limites.LimiteExcedidoException;
import io.github.igorpacheco1.guarda.usuario.UsuarioService;
import io.github.igorpacheco1.guarda.usuario.dto.CadastroRequest;
import io.github.igorpacheco1.guarda.usuario.dto.UsuarioResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * Criar conta com limite por IP (ADR-0035): confere o limite, cadastra e só então conta.
 *
 * <p>Conta só o cadastro que deu certo: quem erra o formulário (400) ou usa um e-mail que já tem
 * conta (409) não gasta a cota da rede. O objetivo é barrar quem cria contas em série.
 */
@Service
@RequiredArgsConstructor
public class CadastroService {

    private final UsuarioService usuarioService;
    private final LimiteDeCadastros limite;

    /** @throws LimiteExcedidoException 429, antes de cadastrar, se este IP já criou contas demais */
    public UsuarioResponse cadastrar(CadastroRequest request, String ip) {
        limite.esperaSeCheio(ip).ifPresent(espera -> {
            throw LimiteExcedidoException.deCadastros(espera);
        });
        UsuarioResponse usuario = usuarioService.cadastrar(request);
        limite.contar(ip);
        return usuario;
    }
}

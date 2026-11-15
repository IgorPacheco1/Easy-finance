package io.github.igorpacheco1.easyfinance.usuario;

import java.util.UUID;

/**
 * Quem está usando a API neste pedido: a "fonte da verdade" do dono dos dados (ADR-0020, ADR-0021).
 *
 * <p>Os services só conhecem esta interface. A implementação é o {@link UsuarioDaSessao}, que lê o
 * usuário da sessão de login; nenhum service sabe como isso é feito.
 */
public interface UsuarioAtual {

    /** Id do usuário que fez o pedido. */
    UUID id();
}

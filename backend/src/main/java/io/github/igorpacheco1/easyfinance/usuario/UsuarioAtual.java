package io.github.igorpacheco1.easyfinance.usuario;

import java.util.UUID;

/**
 * Quem está usando a API neste pedido: a "fonte da verdade" do dono dos dados (ADR-0021).
 *
 * <p>Os services só conhecem esta interface. Hoje quem a implementa é o {@link UsuarioProvisorio}
 * (um usuário fixo, só nos perfis dev e test); quando o login existir (issue "entrar, sair e
 * manter a sessão"), a implementação passa a ler o usuário da sessão, e nenhum service muda.
 */
public interface UsuarioAtual {

    /** Id do usuário que fez o pedido. */
    UUID id();
}

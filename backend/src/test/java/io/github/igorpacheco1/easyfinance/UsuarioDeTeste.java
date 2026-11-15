package io.github.igorpacheco1.easyfinance;

import java.util.UUID;

/**
 * O usuário que "está logado" nos testes de API (ADR-0020). Os testes de ponta a ponta o
 * colocam na sessão com {@link ComoUsuarioDeTeste} e o criam no banco com
 * {@link UsuarioDeTesteNoBanco}. O fluxo real de login é testado à parte, em {@code AuthApiTests}.
 */
public final class UsuarioDeTeste {

    /** Texto do id, para usar em anotações (que só aceitam constantes). */
    public static final String ID_TEXTO = "00000000-0000-0000-0000-000000000001";

    public static final UUID ID = UUID.fromString(ID_TEXTO);

    /** O domínio {@code .invalid} nunca existe de verdade (RFC 2606). */
    public static final String EMAIL = "teste@easyfinance.invalid";

    private UsuarioDeTeste() {
    }
}

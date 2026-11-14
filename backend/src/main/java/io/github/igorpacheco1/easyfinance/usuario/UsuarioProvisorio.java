package io.github.igorpacheco1.easyfinance.usuario;

import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * <b>Provisório (ADR-0021):</b> enquanto não há login, todo pedido é do mesmo usuário fixo.
 * Sai na issue "entrar, sair e manter a sessão", que o troca pela sessão de verdade.
 *
 * <p>Só existe nos perfis {@code dev} e {@code test}. Sem esses perfis não há {@link UsuarioAtual},
 * e a aplicação nem sobe: melhor falhar do que atribuir os dados de todo mundo a um usuário
 * fantasma. O usuário em si é criado por {@link UsuarioProvisorioInicializador}.
 */
@Component
@Profile({"dev", "test"})
public class UsuarioProvisorio implements UsuarioAtual {

    /** Id fixo, para os testes e o inicializador falarem do mesmo usuário. */
    public static final UUID ID = UUID.fromString("00000000-0000-0000-0000-000000000001");

    /** E-mail reservado (o domínio {@code .invalid} nunca existe de verdade, RFC 2606). */
    public static final String EMAIL = "provisorio@easyfinance.invalid";

    @Override
    public UUID id() {
        return ID;
    }
}

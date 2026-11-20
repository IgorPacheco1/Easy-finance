package io.github.igorpacheco1.easyfinance.usuario.dto;

import io.github.igorpacheco1.easyfinance.usuario.Usuario;
import io.swagger.v3.oas.annotations.media.Schema;

import java.util.UUID;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

/**
 * O usuário como a API mostra: id, e-mail, nome e avatar (#193). O hash da senha nunca sai.
 *
 * <p>Todos os campos vêm sempre: por isso estão marcados como obrigatórios no OpenAPI (#77, #130),
 * e o PWA não precisa tratá-los como opcionais. Só o nome pode vir {@code null}.
 */
public record UsuarioResponse(

        @Schema(requiredMode = REQUIRED, description = "Id do usuário (UUID).", example = "3f2b8c1e-7a4d-4c1b-9e2a-5d6f7a8b9c0d")
        UUID id,

        @Schema(requiredMode = REQUIRED, description = "E-mail da conta, em minúsculas.", example = "ana@email.com")
        String email,

        @Schema(requiredMode = REQUIRED, nullable = true,
                description = "Nome da pessoa (#193). Sempre vem; é null nas contas criadas antes "
                        + "do nome existir, até a pessoa preencher.", example = "Ana Souza")
        String nome,

        @Schema(requiredMode = REQUIRED, description = "Avatar no formato `iniciais:<cor>` (ADR-0032).",
                example = "iniciais:verde")
        String avatar
) {

    public static UsuarioResponse de(Usuario usuario) {
        return new UsuarioResponse(usuario.getId(), usuario.getEmail(), usuario.getNome(), usuario.getAvatar());
    }
}

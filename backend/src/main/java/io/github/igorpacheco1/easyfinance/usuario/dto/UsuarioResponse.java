package io.github.igorpacheco1.easyfinance.usuario.dto;

import io.github.igorpacheco1.easyfinance.usuario.Usuario;
import io.swagger.v3.oas.annotations.media.Schema;

import java.util.UUID;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

/**
 * O usuário como a API mostra: só o id e o e-mail. O hash da senha nunca sai.
 *
 * <p>Os dois campos vêm sempre: por isso estão marcados como obrigatórios no OpenAPI (#77, #130),
 * e o PWA não precisa tratá-los como opcionais.
 */
public record UsuarioResponse(

        @Schema(requiredMode = REQUIRED, description = "Id do usuário (UUID).", example = "3f2b8c1e-7a4d-4c1b-9e2a-5d6f7a8b9c0d")
        UUID id,

        @Schema(requiredMode = REQUIRED, description = "E-mail da conta, em minúsculas.", example = "ana@email.com")
        String email
) {

    public static UsuarioResponse de(Usuario usuario) {
        return new UsuarioResponse(usuario.getId(), usuario.getEmail());
    }
}

package io.github.igorpacheco1.easyfinance.usuario.dto;

import io.github.igorpacheco1.easyfinance.usuario.Usuario;
import io.swagger.v3.oas.annotations.media.Schema;

import java.util.UUID;

/** O usuário como a API mostra: só o id e o e-mail. O hash da senha nunca sai. */
public record UsuarioResponse(

        @Schema(description = "Id do usuário (UUID).", example = "3f2b8c1e-7a4d-4c1b-9e2a-5d6f7a8b9c0d")
        UUID id,

        @Schema(description = "E-mail da conta, em minúsculas.", example = "ana@email.com")
        String email
) {

    public static UsuarioResponse de(Usuario usuario) {
        return new UsuarioResponse(usuario.getId(), usuario.getEmail());
    }
}

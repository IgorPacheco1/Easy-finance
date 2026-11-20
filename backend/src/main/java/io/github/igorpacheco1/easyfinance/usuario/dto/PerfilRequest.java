package io.github.igorpacheco1.easyfinance.usuario.dto;

import io.github.igorpacheco1.easyfinance.usuario.AvatarDoUsuario;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Corpo do {@code PATCH /api/v1/eu/perfil} (#193): muda o nome e/ou o avatar. O campo que não
 * vier (ou vier {@code null}) fica como está.
 *
 * <p>Os espaços nas pontas do nome são tirados antes da validação (no construtor compacto). Assim
 * "  Ana  " vira "Ana", e um nome só de espaços vira "" e é recusado pelo {@code @Size(min = 1)}.
 */
public record PerfilRequest(

        @Schema(description = "Nome, de 1 a 60 caracteres. Sem ele, o nome não muda.", example = "Ana Souza")
        @Size(min = 1, max = AvatarDoUsuario.TAMANHO_MAXIMO_DO_NOME,
                message = "O nome deve ter de 1 a 60 caracteres.")
        String nome,

        @Schema(description = "Avatar no formato `iniciais:<cor>`, com uma das 12 cores do app "
                + "(ADR-0032). Sem ele, o avatar não muda.", example = "iniciais:verde")
        @Pattern(regexp = AvatarDoUsuario.FORMATO, message = "Escolha um avatar da lista do app.")
        String avatar
) {

    public PerfilRequest {
        nome = (nome == null) ? null : nome.strip();
    }
}

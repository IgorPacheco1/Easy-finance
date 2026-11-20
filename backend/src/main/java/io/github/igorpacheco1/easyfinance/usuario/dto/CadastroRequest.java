package io.github.igorpacheco1.easyfinance.usuario.dto;

import io.github.igorpacheco1.easyfinance.shared.TamanhoMaximoEmBytes;
import io.github.igorpacheco1.easyfinance.usuario.AvatarDoUsuario;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Corpo do {@code POST /api/v1/auth/cadastro}.
 *
 * <p>O {@code toString} de um {@code record} lista todos os campos, o que colocaria a senha num
 * log se alguém imprimisse o objeto. Por isso ele é sobrescrito abaixo.
 */
public record CadastroRequest(

        @Schema(description = "E-mail da conta. Vale sem diferenciar maiúsculas e é único.",
                example = "ana@email.com")
        @NotBlank(message = "O e-mail é obrigatório.")
        @Email(message = "Informe um e-mail válido.")
        @Size(max = 254, message = "O e-mail deve ter no máximo 254 caracteres.")
        String email,

        @Schema(description = "Senha de 8 caracteres a 72 bytes. Não precisa de símbolo ou número: "
                + "uma senha longa protege mais do que uma curta e complicada.",
                example = "uma senha bem longa", format = "password")
        @NotBlank(message = "A senha é obrigatória.")
        @Size(min = 8, message = "A senha deve ter no mínimo 8 caracteres.")
        @TamanhoMaximoEmBytes(value = 72, message = "A senha é grande demais (no máximo 72 bytes; "
                + "letras com acento ocupam 2).")
        String senha,

        @Schema(description = "Nome da pessoa, de 1 a 60 caracteres (#193).", example = "Ana Souza")
        @NotBlank(message = "O nome é obrigatório.")
        @Size(max = AvatarDoUsuario.TAMANHO_MAXIMO_DO_NOME, message = "O nome deve ter no máximo 60 caracteres.")
        String nome
) {

    /**
     * Espaços nas pontas do e-mail (comuns no autocompletar do celular) e do nome não contam. A
     * senha fica como veio.
     */
    public CadastroRequest {
        email = (email == null) ? null : email.strip();
        nome = (nome == null) ? null : nome.strip();
    }

    /** Nunca mostra a senha, nem o nome (dado pessoal que não precisa ir para o log). */
    @Override
    public String toString() {
        return "CadastroRequest[email=" + email + ", senha=***, nome=***]";
    }
}

package io.github.igorpacheco1.easyfinance.auth;

import io.github.igorpacheco1.easyfinance.usuario.UsuarioService;
import io.github.igorpacheco1.easyfinance.usuario.dto.CadastroRequest;
import io.github.igorpacheco1.easyfinance.usuario.dto.UsuarioResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * Endpoints HTTP de autenticação (ADR-0020). Só cuida de HTTP; as regras ficam no
 * {@link UsuarioService}.
 *
 * <p>Por enquanto só o cadastro. Entrar, sair e quem sou eu chegam nas próximas issues, junto com
 * a sessão: o cadastro <b>ainda não deixa a pessoa logada</b>.
 */
@Tag(name = "Autenticação", description = "Criar conta, entrar e sair.")
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UsuarioService usuarioService;

    @Operation(summary = "Cria uma conta",
            description = "O e-mail é único sem diferenciar maiúsculas. A senha tem de 8 caracteres "
                    + "a 72 bytes e é guardada só como hash. A resposta nunca leva a senha.")
    @ApiResponse(responseCode = "201", description = "Conta criada.")
    @ApiResponse(responseCode = "400", description = "Dados inválidos (lista `erros`).")
    @ApiResponse(responseCode = "409", description = "Já existe uma conta com esse e-mail.")
    @PostMapping("/cadastro")
    @ResponseStatus(HttpStatus.CREATED)
    public UsuarioResponse cadastrar(@Valid @RequestBody CadastroRequest request) {
        return usuarioService.cadastrar(request);
    }
}

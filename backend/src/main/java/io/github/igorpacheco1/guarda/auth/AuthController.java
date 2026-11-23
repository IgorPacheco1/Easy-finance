package io.github.igorpacheco1.guarda.auth;

import io.github.igorpacheco1.guarda.usuario.UsuarioService;
import io.github.igorpacheco1.guarda.usuario.dto.CadastroRequest;
import io.github.igorpacheco1.guarda.usuario.dto.EntrarRequest;
import io.github.igorpacheco1.guarda.usuario.dto.UsuarioResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * Endpoints HTTP de autenticação (ADR-0020). Só cuida de HTTP; as regras ficam no
 * {@link UsuarioService}.
 *
 * <p>Cadastrar e entrar deixam a pessoa logada (sessão no servidor, cookie {@code HttpOnly}). Os
 * erros de login são sempre os mesmos, sem pista do que estava errado.
 */
@Tag(name = "Autenticação", description = "Criar conta, entrar e sair.")
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UsuarioService usuarioService;
    private final LoginService loginService;
    private final SessaoDoUsuario sessao;

    @Operation(summary = "Token CSRF",
            description = "Devolve o token CSRF da sessão (criando uma sessão anônima se preciso). "
                    + "O app o guarda só em memória e o envia no cabeçalho indicado em todo POST, PUT e DELETE, "
                    + "inclusive no cadastro e no login. Busque outro após entrar.")
    @ApiResponse(responseCode = "200", description = "Token da sessão atual.")
    @GetMapping("/csrf")
    // O token vem da sessão (Spring Security), não do pedido: escondido da documentação para o
    // OpenAPI não anunciar um parâmetro "token" que não existe (ADR-0028).
    public CsrfResponse csrf(@Parameter(hidden = true) CsrfToken token) {
        return new CsrfResponse(token.getToken(), token.getHeaderName());
    }

    @Operation(summary = "Cria uma conta",
            description = "O e-mail é único sem diferenciar maiúsculas. A senha tem de 8 caracteres "
                    + "a 72 bytes e é guardada só como hash. A resposta nunca leva a senha.")
    @ApiResponse(responseCode = "201", description = "Conta criada e pessoa já logada (cookie de sessão).")
    @ApiResponse(responseCode = "400", description = "Dados inválidos (lista `erros`).")
    @ApiResponse(responseCode = "403", description = "Token CSRF ausente ou inválido.")
    @ApiResponse(responseCode = "409", description = "Já existe uma conta com esse e-mail.")
    @PostMapping("/cadastro")
    @ResponseStatus(HttpStatus.CREATED)
    public UsuarioResponse cadastrar(@Valid @RequestBody CadastroRequest request,
                                     HttpServletRequest httpRequest, HttpServletResponse httpResponse) {
        UsuarioResponse usuario = usuarioService.cadastrar(request);
        sessao.iniciar(usuario.id(), httpRequest, httpResponse);
        return usuario;
    }

    @Operation(summary = "Entra na conta",
            description = "Confere e-mail e senha e abre a sessão (cookie HttpOnly). Para e-mail inexistente "
                    + "e senha errada a resposta é a mesma. Busque um token CSRF novo depois de entrar.")
    @ApiResponse(responseCode = "200", description = "Login feito.")
    @ApiResponse(responseCode = "400", description = "Dados inválidos (lista `erros`).")
    @ApiResponse(responseCode = "401", description = "E-mail ou senha inválidos.")
    @ApiResponse(responseCode = "403", description = "Token CSRF ausente ou inválido.")
    @ApiResponse(responseCode = "429", description = "Falhas demais para este e-mail ou IP. "
            + "O cabeçalho `Retry-After` diz em quantos segundos tentar de novo.")
    @PostMapping("/entrar")
    public UsuarioResponse entrar(@Valid @RequestBody EntrarRequest request,
                                  HttpServletRequest httpRequest, HttpServletResponse httpResponse) {
        UsuarioResponse usuario = loginService.entrar(request, httpRequest.getRemoteAddr());
        sessao.iniciar(usuario.id(), httpRequest, httpResponse);
        return usuario;
    }

    @Operation(summary = "Sai da conta",
            description = "Encerra a sessão no servidor e expira o cookie. Sem sessão, também responde 204.")
    @ApiResponse(responseCode = "204", description = "Sessão encerrada.")
    @ApiResponse(responseCode = "403", description = "Token CSRF ausente ou inválido.")
    @PostMapping("/sair")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void sair(HttpServletRequest httpRequest, HttpServletResponse httpResponse) {
        sessao.encerrar(httpRequest, httpResponse);
    }
}

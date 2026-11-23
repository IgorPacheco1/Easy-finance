package io.github.igorpacheco1.guarda.auth;

import io.github.igorpacheco1.guarda.usuario.dto.ExcluirContaRequest;
import io.github.igorpacheco1.guarda.usuario.dto.TrocarSenhaRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * Gestão da própria conta (ADR-0024). Só cuida de HTTP; as regras ficam no {@link ContaService}.
 * Exige login e token CSRF, como qualquer rota que altera dados.
 */
@Tag(name = "Conta", description = "Trocar a senha e excluir a própria conta.")
@RestController
@RequestMapping("/api/v1/eu")
@RequiredArgsConstructor
public class ContaController {

    private final ContaService conta;
    private final SessaoDoUsuario sessao;

    @Operation(summary = "Troca a senha",
            description = "Confere a senha atual e grava a nova (8 caracteres a 72 bytes, diferente da atual). "
                    + "As outras sessões da conta são encerradas; esta continua, com id novo. "
                    + "Senha atual errada conta no limite de tentativas de login.")
    @ApiResponse(responseCode = "204", description = "Senha trocada.")
    @ApiResponse(responseCode = "400", description = "Dados inválidos ou senha atual incorreta (lista `erros`).")
    @ApiResponse(responseCode = "401", description = "Sem login (ou sessão expirada).")
    @ApiResponse(responseCode = "403", description = "Token CSRF ausente ou inválido.")
    @ApiResponse(responseCode = "429", description = "Falhas demais para esta conta. Veja `Retry-After`.")
    @PutMapping("/senha")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void trocarSenha(@Valid @RequestBody TrocarSenhaRequest request, HttpServletRequest httpRequest) {
        conta.trocarSenha(request, httpRequest.getRemoteAddr(), httpRequest.getSession().getId());
        // Depois de uma mudança de credencial, a sessão ganha um id novo.
        httpRequest.changeSessionId();
    }

    @Operation(summary = "Exclui a conta",
            description = "Pede a senha e apaga a conta com todos os dados (categorias personalizadas e "
                    + "transações). Não tem volta. Encerra todas as sessões, inclusive esta.")
    @ApiResponse(responseCode = "204", description = "Conta excluída.")
    @ApiResponse(responseCode = "400", description = "Dados inválidos ou senha incorreta (lista `erros`).")
    @ApiResponse(responseCode = "401", description = "Sem login (ou sessão expirada).")
    @ApiResponse(responseCode = "403", description = "Token CSRF ausente ou inválido.")
    @ApiResponse(responseCode = "429", description = "Falhas demais para esta conta. Veja `Retry-After`.")
    @DeleteMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void excluir(@Valid @RequestBody ExcluirContaRequest request,
                        HttpServletRequest httpRequest, HttpServletResponse httpResponse) {
        conta.excluir(request, httpRequest.getRemoteAddr(), httpRequest.getSession().getId());
        sessao.encerrar(httpRequest, httpResponse);
    }
}

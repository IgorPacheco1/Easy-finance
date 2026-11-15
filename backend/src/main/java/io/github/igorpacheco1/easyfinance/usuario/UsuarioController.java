package io.github.igorpacheco1.easyfinance.usuario;

import io.github.igorpacheco1.easyfinance.usuario.dto.UsuarioResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Dados de quem está logado. */
@Tag(name = "Autenticação", description = "Criar conta, entrar e sair.")
@RestController
@RequestMapping("/api/v1/eu")
@RequiredArgsConstructor
public class UsuarioController {

    private final UsuarioService service;
    private final UsuarioAtual usuarioAtual;

    @Operation(summary = "Quem sou eu",
            description = "Devolve o usuário da sessão. O app usa para saber, ao abrir, se ainda há login.")
    @ApiResponse(responseCode = "200", description = "Usuário logado.")
    @ApiResponse(responseCode = "401", description = "Sem login (ou sessão expirada).")
    @GetMapping
    public UsuarioResponse eu() {
        return service.buscar(usuarioAtual.id());
    }
}

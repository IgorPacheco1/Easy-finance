package io.github.igorpacheco1.guarda.usuario;

import io.github.igorpacheco1.guarda.usuario.dto.PerfilRequest;
import io.github.igorpacheco1.guarda.usuario.dto.UsuarioResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Dados de quem está logado: "quem sou eu" e o perfil (nome e avatar, #193). Fica em
 * {@code /api/v1/eu}, junto de trocar a senha e excluir a conta ({@code ContaController}).
 */
@Tag(name = "Autenticação", description = "Criar conta, entrar e sair.")
@RestController
@RequestMapping("/api/v1/eu")
@RequiredArgsConstructor
public class UsuarioController {

    private final UsuarioService service;
    private final UsuarioAtual usuarioAtual;

    @Operation(summary = "Quem sou eu",
            description = "Devolve o usuário da sessão, com nome e avatar. O app usa para saber, ao abrir, "
                    + "se ainda há login.")
    @ApiResponse(responseCode = "200", description = "Usuário logado.")
    @ApiResponse(responseCode = "401", description = "Sem login (ou sessão expirada).")
    @GetMapping
    public UsuarioResponse eu() {
        return service.buscar(usuarioAtual.id());
    }

    @Operation(summary = "Muda o nome e o avatar",
            description = "Muda o nome e/ou o avatar de quem está logado. O campo que não vier fica como está.")
    @ApiResponse(responseCode = "200", description = "Perfil atualizado.")
    @ApiResponse(responseCode = "400", description = "Nome em branco ou longo demais, ou avatar fora da lista.")
    @ApiResponse(responseCode = "401", description = "Sem login (ou sessão expirada).")
    @PatchMapping("/perfil")
    public UsuarioResponse atualizarPerfil(@Valid @RequestBody PerfilRequest request) {
        return service.atualizarPerfil(usuarioAtual.id(), request);
    }
}

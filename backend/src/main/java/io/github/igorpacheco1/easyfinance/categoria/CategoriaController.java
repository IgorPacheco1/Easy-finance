package io.github.igorpacheco1.easyfinance.categoria;

import io.github.igorpacheco1.easyfinance.categoria.dto.AtualizarCategoriaRequest;
import io.github.igorpacheco1.easyfinance.categoria.dto.CategoriaResponse;
import io.github.igorpacheco1.easyfinance.categoria.dto.CriarCategoriaRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.List;
import java.util.UUID;

/**
 * Endpoints HTTP de categorias. Só cuida de HTTP (rota, status, validação da entrada);
 * as regras ficam no {@link CategoriaService}.
 *
 * <p>As anotações {@code @Operation}, {@code @ApiResponse} e {@code @Tag} são a documentação
 * OpenAPI (ADR-0010). O formato do corpo dos erros é aplicado a todos pelo
 * {@code OpenApiConfiguration}.
 */
@Tag(name = "Categorias", description = "Categorias que classificam as transações. As do sistema "
        + "já vêm prontas e não podem ser alteradas nem excluídas.")
@RestController
@RequestMapping("/api/v1/categorias")
@RequiredArgsConstructor
public class CategoriaController {

    private final CategoriaService service;

    @Operation(summary = "Lista as categorias",
            description = "Por padrão (`ordem=ALFABETICA`), agrupadas por tipo (DESPESA, depois "
                    + "RECEITA) e em ordem alfabética. Com `ordem=USO`, as mais usadas nos últimos "
                    + "90 dias primeiro; no empate, e para as não usadas, ordem alfabética.")
    @ApiResponse(responseCode = "200", description = "Lista de categorias.")
    @ApiResponse(responseCode = "400", description = "`tipo` ou `ordem` com valor inválido.")
    @GetMapping
    public List<CategoriaResponse> listar(
            @Parameter(description = "Mostra só as categorias deste tipo.", example = "DESPESA")
            @RequestParam(required = false) TipoCategoria tipo,
            @Parameter(description = "ALFABETICA (padrão) ou USO (mais usadas primeiro).", example = "USO")
            @RequestParam(defaultValue = "ALFABETICA") OrdemDasCategorias ordem) {
        return service.listar(tipo, ordem);
    }

    @Operation(summary = "Busca uma categoria pelo id")
    @ApiResponse(responseCode = "200", description = "A categoria.")
    @ApiResponse(responseCode = "400", description = "Id em formato inválido.")
    @ApiResponse(responseCode = "404", description = "Categoria não encontrada.")
    @GetMapping("/{id}")
    public CategoriaResponse buscar(@PathVariable UUID id) {
        return service.buscar(id);
    }

    @Operation(summary = "Cria uma categoria personalizada",
            description = "O nome é único sem diferenciar maiúsculas, inclusive em relação às "
                    + "categorias do sistema. Espaços nas pontas são removidos.")
    @ApiResponse(responseCode = "201", description = "Categoria criada. O cabeçalho `Location` aponta para ela.")
    @ApiResponse(responseCode = "400", description = "Dados inválidos (lista `erros`).")
    @ApiResponse(responseCode = "409", description = "Já existe uma categoria com esse nome.")
    @PostMapping
    public ResponseEntity<CategoriaResponse> criar(@Valid @RequestBody CriarCategoriaRequest request) {
        CategoriaResponse criada = service.criar(request);
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(criada.id())
                .toUri();
        return ResponseEntity.created(location).body(criada);
    }

    @Operation(summary = "Renomeia uma categoria",
            description = "Só o nome pode mudar: o tipo é fixo, porque trocá-lo mudaria o saldo de "
                    + "todo o histórico.")
    @ApiResponse(responseCode = "200", description = "Categoria renomeada.")
    @ApiResponse(responseCode = "400", description = "Dados inválidos (lista `erros`) ou id em formato inválido.")
    @ApiResponse(responseCode = "404", description = "Categoria não encontrada.")
    @ApiResponse(responseCode = "409", description = "Já existe outra categoria com esse nome, "
            + "ou a categoria é do sistema.")
    @PutMapping("/{id}")
    public CategoriaResponse atualizar(@PathVariable UUID id,
                                       @Valid @RequestBody AtualizarCategoriaRequest request) {
        return service.atualizar(id, request);
    }

    @Operation(summary = "Exclui uma categoria personalizada")
    @ApiResponse(responseCode = "204", description = "Categoria excluída.")
    @ApiResponse(responseCode = "400", description = "Id em formato inválido.")
    @ApiResponse(responseCode = "404", description = "Categoria não encontrada.")
    @ApiResponse(responseCode = "409", description = "A categoria é do sistema ou tem transações vinculadas.")
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void excluir(@PathVariable UUID id) {
        service.excluir(id);
    }
}

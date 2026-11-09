package io.github.igorpacheco1.easyfinance.transacao;

import io.github.igorpacheco1.easyfinance.categoria.TipoCategoria;
import io.github.igorpacheco1.easyfinance.shared.PaginaResponse;
import io.github.igorpacheco1.easyfinance.transacao.dto.CriarTransacaoRequest;
import io.github.igorpacheco1.easyfinance.transacao.dto.TransacaoRequest;
import io.github.igorpacheco1.easyfinance.transacao.dto.TransacaoResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
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

import java.math.BigDecimal;
import java.net.URI;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Endpoints HTTP de transações. As regras ficam no {@link TransacaoService}.
 * As anotações do OpenAPI são a documentação da API (ADR-0010).
 */
@Tag(name = "Transações", description = "Receitas e despesas. Se é uma ou outra, quem diz é o "
        + "tipo da categoria; o valor é sempre positivo.")
@RestController
@RequestMapping("/api/v1/transacoes")
@RequiredArgsConstructor
public class TransacaoController {

    private final TransacaoService service;

    @Operation(summary = "Lista as transações (paginado, com filtros)",
            description = "Da mais recente para a mais antiga; no mesmo dia, a criada por último "
                    + "primeiro.\n\n"
                    + "Todos os filtros são opcionais e se combinam (a transação precisa atender a "
                    + "todos os preenchidos). Sem nenhum, todas. `de` e `ate` vão juntos, com os dias "
                    + "das pontas incluídos; `valorMinimo` e `valorMaximo` também incluem as pontas.\n\n"
                    + "A resposta vem em páginas, que começam em 1. Para a rolagem infinita, peça a "
                    + "próxima página enquanto `temMais` for `true` (ADR-0017).")
    @ApiResponse(responseCode = "200", description = "Uma página de transações.")
    @ApiResponse(responseCode = "400", description = "Filtro ou paginação inválidos: só uma das "
            + "datas, `de` depois de `ate`, categoria inexistente, valor negativo, `valorMinimo` "
            + "maior que `valorMaximo`, `pagina` menor que 1, `tamanho` fora de 1 a "
            + TransacaoService.TAMANHO_MAXIMO_DA_PAGINA + " ou parâmetro em formato inválido.")
    @GetMapping
    public PaginaResponse<TransacaoResponse> listar(
            @Parameter(description = "Primeiro dia do período.", example = "2026-11-01")
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate de,
            @Parameter(description = "Último dia do período.", example = "2026-11-30")
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate ate,
            @Parameter(description = "Só as transações desta categoria.")
            @RequestParam(required = false) UUID categoriaId,
            @Parameter(description = "Só receitas ou só despesas.")
            @RequestParam(required = false) TipoCategoria tipo,
            @Parameter(description = "Texto contido na descrição, sem diferenciar maiúsculas.", example = "uber")
            @RequestParam(required = false) String descricao,
            @Parameter(description = "Valor mínimo, incluído.", example = "10.00")
            @RequestParam(required = false) BigDecimal valorMinimo,
            @Parameter(description = "Valor máximo, incluído.", example = "500.00")
            @RequestParam(required = false) BigDecimal valorMaximo,
            @Parameter(description = "Número da página, começando em 1.")
            @RequestParam(defaultValue = "1") int pagina,
            @Parameter(description = "Transações por página, de 1 a "
                    + TransacaoService.TAMANHO_MAXIMO_DA_PAGINA + ".")
            @RequestParam(defaultValue = "20") int tamanho) {
        FiltroDeTransacoes filtro =
                new FiltroDeTransacoes(de, ate, categoriaId, tipo, descricao, valorMinimo, valorMaximo);
        return service.listar(filtro, pagina, tamanho);
    }

    @Operation(summary = "Busca uma transação pelo id")
    @ApiResponse(responseCode = "200", description = "A transação.")
    @ApiResponse(responseCode = "400", description = "Id em formato inválido.")
    @ApiResponse(responseCode = "404", description = "Transação não encontrada.")
    @GetMapping("/{id}")
    public TransacaoResponse buscar(@PathVariable UUID id) {
        return service.buscar(id);
    }

    @Operation(summary = "Cria uma transação (idempotente)",
            description = """
                    O cliente pode enviar o próprio `id` (UUID). Assim, reenviar o mesmo lançamento \
                    (por exemplo, quando a resposta se perdeu na rede) não cria uma cópia:

                    - **201**: a transação foi criada agora.
                    - **200**: já existia uma transação com esse `id` e os mesmos dados; ela é devolvida \
                    e nada é criado.
                    - **409**: já existe uma transação com esse `id`, mas com dados diferentes.
                    - **410**: o `id` é de uma transação que foi excluída; nada é criado.

                    Sem `id`, o servidor gera um e a resposta é sempre 201. A data precisa estar entre \
                    1 ano antes e 1 ano depois de hoje.""")
    @ApiResponse(responseCode = "201", description = "Transação criada. O cabeçalho `Location` aponta para ela.")
    @ApiResponse(responseCode = "200", description = "Reenvio idêntico: devolve a transação que já existia.")
    @ApiResponse(responseCode = "400", description = "Dados inválidos (lista `erros`), inclusive "
            + "categoria inexistente (campo `categoriaId`) e data fora do intervalo (campo `data`).")
    @ApiResponse(responseCode = "409", description = "Já existe uma transação com esse `id` e com dados diferentes.")
    @ApiResponse(responseCode = "410", description = "O `id` é de uma transação que foi excluída: um "
            + "reenvio atrasado não a recria. O app deve perguntar se descarta o lançamento ou se "
            + "lança de novo, com um `id` novo.")
    @PostMapping
    public ResponseEntity<TransacaoResponse> criar(@Valid @RequestBody CriarTransacaoRequest request) {
        ResultadoDaCriacao resultado = service.criar(request);
        if (!resultado.criada()) {
            return ResponseEntity.ok(resultado.transacao());
        }
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(resultado.transacao().id())
                .toUri();
        return ResponseEntity.created(location).body(resultado.transacao());
    }

    @Operation(summary = "Edita uma transação",
            description = "Substitui todos os campos (o corpo traz tudo, como na criação). A categoria "
                    + "pode mudar, inclusive para uma de outro tipo. A data só é conferida se mudar, "
                    + "para lançamentos antigos continuarem editáveis.")
    @ApiResponse(responseCode = "200", description = "Transação editada.")
    @ApiResponse(responseCode = "400", description = "Dados inválidos (lista `erros`) ou id em formato inválido.")
    @ApiResponse(responseCode = "404", description = "Transação não encontrada.")
    @PutMapping("/{id}")
    public TransacaoResponse atualizar(@PathVariable UUID id, @Valid @RequestBody TransacaoRequest request) {
        return service.atualizar(id, request);
    }

    @Operation(summary = "Exclui uma transação")
    @ApiResponse(responseCode = "204", description = "Transação excluída.")
    @ApiResponse(responseCode = "400", description = "Id em formato inválido.")
    @ApiResponse(responseCode = "404", description = "Transação não encontrada.")
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void excluir(@PathVariable UUID id) {
        service.excluir(id);
    }
}

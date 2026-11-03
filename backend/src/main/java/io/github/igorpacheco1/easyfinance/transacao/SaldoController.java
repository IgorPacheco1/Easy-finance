package io.github.igorpacheco1.easyfinance.transacao;

import io.github.igorpacheco1.easyfinance.transacao.dto.SaldoResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

/**
 * Saldo de um período: {@code GET /api/v1/saldo?de=2026-11-01&ate=2026-11-30}.
 *
 * <p>Os dois parâmetros são obrigatórios: quem sabe qual mês o usuário está vendo é o app, e o
 * servidor (em UTC) erraria o "mês atual" perto da virada do mês no Brasil (decisão da #22).
 */
@Tag(name = "Saldo", description = "Totais de receitas, despesas e saldo de um período.")
@RestController
@RequestMapping("/api/v1/saldo")
@RequiredArgsConstructor
public class SaldoController {

    private final TransacaoService service;

    @Operation(summary = "Calcula o saldo de um período",
            description = "Receitas menos despesas das transações do período (dias das pontas incluídos), "
                    + "em decimal exato. Período sem transações dá zero.")
    @ApiResponse(responseCode = "200", description = "Totais do período.")
    @ApiResponse(responseCode = "400", description = "Data ausente, em formato inválido ou `de` depois de `ate`.")
    @GetMapping
    public SaldoResponse calcular(
            @Parameter(description = "Primeiro dia do período.", example = "2026-11-01")
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate de,
            @Parameter(description = "Último dia do período.", example = "2026-11-30")
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate ate) {
        return service.calcularSaldo(de, ate);
    }
}

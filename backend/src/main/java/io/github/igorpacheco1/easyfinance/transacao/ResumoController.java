package io.github.igorpacheco1.easyfinance.transacao;

import io.github.igorpacheco1.easyfinance.transacao.dto.ResumoResponse;
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
 * Resumo por categoria de um período: {@code GET /api/v1/resumo?de=2026-11-01&ate=2026-11-30}
 * (#95). As datas seguem a mesma regra do saldo: as duas obrigatórias, porque quem sabe qual mês
 * o usuário está vendo é o app.
 */
@Tag(name = "Resumo", description = "Totais por categoria de um período.")
@RestController
@RequestMapping("/api/v1/resumo")
@RequiredArgsConstructor
public class ResumoController {

    private final TransacaoService service;

    @Operation(summary = "Resume o período por categoria",
            description = "Para cada categoria com lançamento no período (dias das pontas incluídos): "
                    + "total, quantidade de lançamentos e percentual sobre o total do seu tipo. "
                    + "Receitas e despesas vêm separadas, cada uma da categoria que mais somou para a "
                    + "que menos somou.")
    @ApiResponse(responseCode = "200", description = "Resumo do período.")
    @ApiResponse(responseCode = "400", description = "Data ausente, em formato inválido ou `de` depois de `ate`.")
    @GetMapping
    public ResumoResponse resumir(
            @Parameter(description = "Primeiro dia do período.", example = "2026-11-01")
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate de,
            @Parameter(description = "Último dia do período.", example = "2026-11-30")
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate ate) {
        return service.resumir(de, ate);
    }
}

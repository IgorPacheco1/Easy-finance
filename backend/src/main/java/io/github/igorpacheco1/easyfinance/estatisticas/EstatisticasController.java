package io.github.igorpacheco1.easyfinance.estatisticas;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Estatísticas do perfil de quem está logado (#194), junto do resto da conta em {@code /api/v1/eu}. */
@Tag(name = "Autenticação", description = "Criar conta, entrar e sair.")
@RestController
@RequestMapping("/api/v1/eu/estatisticas")
@RequiredArgsConstructor
public class EstatisticasController {

    private final EstatisticasService service;

    @Operation(summary = "Estatísticas do perfil",
            description = "Desde quando a conta existe, a sequência de dias seguidos lançando, o total de "
                    + "lançamentos e o de categorias usadas. Calculado na hora, no fuso de quem usa.")
    @ApiResponse(responseCode = "200", description = "Estatísticas de quem está logado.")
    @ApiResponse(responseCode = "400", description = "Fuso horário que não é um nome da lista (como America/Sao_Paulo).")
    @ApiResponse(responseCode = "401", description = "Sem login (ou sessão expirada).")
    @GetMapping
    public EstatisticasResponse estatisticas(
            @Parameter(description = "Fuso horário do aparelho, pelo nome. Sem ele, America/Sao_Paulo.",
                    example = "America/Sao_Paulo")
            @RequestParam(defaultValue = EstatisticasService.FUSO_PADRAO) String fuso) {
        return service.calcular(fuso);
    }
}

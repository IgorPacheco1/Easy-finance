package io.github.igorpacheco1.easyfinance.transacao;

import io.github.igorpacheco1.easyfinance.transacao.dto.SaldoResponse;
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
@RestController
@RequestMapping("/api/v1/saldo")
@RequiredArgsConstructor
public class SaldoController {

    private final TransacaoService service;

    @GetMapping
    public SaldoResponse calcular(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate de,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate ate) {
        return service.calcularSaldo(de, ate);
    }
}

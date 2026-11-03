package io.github.igorpacheco1.easyfinance.transacao.dto;

import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Corpo do {@code POST /api/v1/transacoes}. Igual ao {@link TransacaoRequest} (usado no PUT),
 * mais o {@code id} opcional gerado pelo cliente (#19).
 *
 * <p>Com o id, reenviar o mesmo lançamento (por exemplo, quando a resposta se perdeu na rede)
 * não cria uma cópia: o servidor reconhece o id e devolve o que já existe.
 *
 * @param id          opcional; UUID gerado pelo cliente. Se não vier, o servidor gera um.
 * @param valor       sempre positivo; se é entrada ou saída, quem diz é a categoria
 * @param data        dia do lançamento, no formato {@code "2026-11-03"}
 * @param descricao   opcional
 * @param categoriaId id de uma categoria existente
 */
public record CriarTransacaoRequest(

        UUID id,

        @NotNull(message = "O valor é obrigatório.")
        @Positive(message = "O valor deve ser maior que zero.")
        @Digits(integer = 17, fraction = 2,
                message = "O valor deve ter no máximo 2 casas decimais e 17 dígitos antes da vírgula.")
        BigDecimal valor,

        @NotNull(message = "A data é obrigatória.")
        LocalDate data,

        @Size(max = 255, message = "A descrição deve ter no máximo 255 caracteres.")
        String descricao,

        @NotNull(message = "A categoria é obrigatória.")
        UUID categoriaId
) {
}

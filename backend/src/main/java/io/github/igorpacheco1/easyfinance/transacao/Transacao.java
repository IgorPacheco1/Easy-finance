package io.github.igorpacheco1.easyfinance.transacao;

import io.github.igorpacheco1.easyfinance.categoria.Categoria;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Entidade JPA da tabela {@code transacao} (criada na migration V1): uma receita ou despesa.
 *
 * <p>Não tem campo {@code tipo}: se é receita ou despesa, quem diz é a categoria
 * (ver docs/architecture/domain-model.md). Não tem setters: tudo que muda passa por
 * {@link #atualizar}, que também atualiza {@code atualizadoEm}. Assim é impossível esquecer.
 *
 * <p>Não tem construtor público: a criação é feita por
 * {@link TransacaoRepository#inserirSeNaoExistir}, em SQL, por causa da criação idempotente (#19).
 * O JPA é usado para ler, editar e excluir.
 */
@Entity
@Table(name = "transacao")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Transacao {

    /** UUID v4 (ADR-0006), gerado pelo cliente ou, se ele não enviar, pelo service. */
    @Id
    private UUID id;

    /**
     * Muitas transações para uma categoria. LAZY: a categoria só é lida do banco quando alguém
     * usa. Sem isso, toda consulta de transações buscaria as categorias, mesmo sem precisar.
     */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "categoria_id", nullable = false)
    private Categoria categoria;

    /** Sempre positivo, com 2 casas (ADR-0007). */
    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal valor;

    /** Só o dia do lançamento, sem hora e sem fuso. */
    @Column(nullable = false)
    private LocalDate data;

    /** Opcional. */
    @Column(length = 255)
    private String descricao;

    @Column(name = "criado_em", nullable = false, updatable = false)
    private Instant criadoEm;

    @Column(name = "atualizado_em", nullable = false)
    private Instant atualizadoEm;

    /** Substitui todos os dados editáveis. Pode trocar para uma categoria de outro tipo (decisão da #18). */
    public void atualizar(Categoria categoria, BigDecimal valor, LocalDate data, String descricao) {
        this.categoria = categoria;
        this.valor = valor;
        this.data = data;
        this.descricao = descricao;
        this.atualizadoEm = Instant.now();
    }
}

package io.github.igorpacheco1.easyfinance.categoria;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.UuidGenerator;

import java.time.Instant;
import java.util.UUID;

/**
 * Entidade JPA da tabela {@code categoria} (criada na migration V1).
 *
 * <p>Nunca sai da camada de serviço: a API trabalha só com os DTOs do pacote {@code dto}.
 * Regras do Lombok em entidades: ver ADR-0009.
 */
@Entity
@Table(name = "categoria")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED) // o Hibernate precisa; o resto do código usa o construtor abaixo
public class Categoria {

    /** UUID v4 gerado pela aplicação ao salvar (ADR-0006). Assim o id já existe antes do INSERT. */
    @Id
    @UuidGenerator(style = UuidGenerator.Style.RANDOM)
    private UUID id;

    /** Único sem diferenciar maiúsculas (índice uk_categoria_nome). Único campo que pode mudar. */
    @Setter
    @Column(nullable = false, length = 50)
    private String nome;

    /** Grava o nome do enum ("RECEITA"/"DESPESA"), nunca a posição (0/1), que quebraria se a ordem mudasse. */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10, updatable = false)
    private TipoCategoria tipo;

    /** true = categoria padrão, criada pela migration V2. A API nunca cria categoria do sistema. */
    @Column(nullable = false, updatable = false)
    private boolean sistema;

    @Column(name = "criado_em", nullable = false, updatable = false)
    private Instant criadoEm;

    /** Cria uma categoria personalizada (sistema = false). */
    public Categoria(String nome, TipoCategoria tipo) {
        this.nome = nome;
        this.tipo = tipo;
        this.sistema = false;
        this.criadoEm = Instant.now();
    }
}

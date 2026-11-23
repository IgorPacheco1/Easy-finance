package io.github.igorpacheco1.guarda.categoria;

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

    /** Único sem diferenciar maiúsculas para cada dono (índices uk_categoria_nome_*, V4). Pode mudar, como o ícone e a cor. */
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

    /**
     * Dono da categoria (a API só mostra e altera as do próprio usuário, #128): preenchido nas personalizadas, {@code null} nas do sistema (V4, #123).
     * Só o id, e não a entidade Usuario: ninguém precisa carregar o usuário para usar a categoria.
     */
    @Column(name = "usuario_id", updatable = false)
    private UUID usuarioId;

    /** Nome de um ícone da lista fechada ({@link AparenciaDaCategoria#ICONES}, V7, #185). */
    @Setter
    @Column(nullable = false, length = 30)
    private String icone;

    /** Nome de uma das 12 cores ({@link AparenciaDaCategoria#CORES}, V7, #185). Nunca o código da cor. */
    @Setter
    @Column(nullable = false, length = 20)
    private String cor;

    @Column(name = "criado_em", nullable = false, updatable = false)
    private Instant criadoEm;

    /** Cria uma categoria personalizada (sistema = false) do usuário {@code usuarioId}, com a aparência padrão. */
    public Categoria(String nome, TipoCategoria tipo, UUID usuarioId) {
        this(nome, tipo, usuarioId, AparenciaDaCategoria.ICONE_PADRAO, AparenciaDaCategoria.COR_PADRAO);
    }

    /** Cria uma categoria personalizada (sistema = false) com o ícone e a cor escolhidos. */
    public Categoria(String nome, TipoCategoria tipo, UUID usuarioId, String icone, String cor) {
        this.nome = nome;
        this.tipo = tipo;
        this.sistema = false;
        this.usuarioId = usuarioId;
        this.icone = icone;
        this.cor = cor;
        this.criadoEm = Instant.now();
    }
}

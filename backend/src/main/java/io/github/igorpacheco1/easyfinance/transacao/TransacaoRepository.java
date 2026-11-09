package io.github.igorpacheco1.easyfinance.transacao;

import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public interface TransacaoRepository extends JpaRepository<Transacao, UUID> {

    /**
     * Uma página de todas as transações, da mais recente para a mais antiga. No mesmo dia, a
     * criada por último vem primeiro; o {@code id} é o desempate final (#92).
     *
     * <p>Por que o desempate: se duas transações tiverem a mesma data e o mesmo {@code criado_em}
     * (por exemplo, vários lançamentos da fila offline gravados juntos), o banco pode devolvê-las
     * em ordem diferente a cada consulta, e uma delas apareceria em duas páginas enquanto a outra
     * sumiria. O {@code id} nunca se repete, então a ordem fica sempre a mesma.
     *
     * <p>O {@code Pageable} no fim faz o Spring acrescentar {@code LIMIT}/{@code OFFSET}. Com
     * retorno {@code Slice}, ele busca um item a mais que o pedido só para saber se há próxima
     * página, sem a consulta {@code COUNT(*)} que o {@code Page} faria (ADR-0017).
     *
     * <p>{@code @EntityGraph} traz as categorias na mesma consulta (JOIN). Sem ele, com a
     * categoria LAZY, cada transação da lista faria mais uma consulta para buscar a sua
     * categoria: 100 transações = 101 consultas. Esse problema se chama "N+1".
     */
    @EntityGraph(attributePaths = "categoria")
    Slice<Transacao> findAllByOrderByDataDescCriadoEmDescIdDesc(Pageable pageable);

    /** Uma página das transações de um período, com os dois dias das pontas incluídos ({@code BETWEEN}). */
    @EntityGraph(attributePaths = "categoria")
    Slice<Transacao> findByDataBetweenOrderByDataDescCriadoEmDescIdDesc(LocalDate de, LocalDate ate,
                                                                       Pageable pageable);

    /**
     * Soma as receitas e as despesas de um período numa consulta só, direto no banco: assim não
     * é preciso carregar todas as transações para a memória só para somar.
     *
     * <p>{@code FILTER (WHERE ...)} é um recurso do PostgreSQL: soma só as linhas que passam no
     * filtro. {@code COALESCE(..., 0)} transforma "nenhuma linha" (o SUM devolve NULL) em zero.
     * A soma é feita em NUMERIC, sem erro de arredondamento (ADR-0007).
     */
    @Query(value = """
            SELECT COALESCE(SUM(t.valor) FILTER (WHERE c.tipo = 'RECEITA'), 0) AS receitas,
                   COALESCE(SUM(t.valor) FILTER (WHERE c.tipo = 'DESPESA'), 0) AS despesas
            FROM transacao t
            JOIN categoria c ON c.id = t.categoria_id
            WHERE t.data BETWEEN :de AND :ate
            """, nativeQuery = true)
    TotaisDoPeriodo somarPorTipo(@Param("de") LocalDate de, @Param("ate") LocalDate ate);

    /**
     * Grava a transação, a não ser que o id já exista. Devolve 1 se gravou e 0 se o id já existia.
     *
     * <p>Por que SQL e não o {@code save()} do JPA: se duas cópias do mesmo envio chegarem no
     * mesmo instante, as duas veriam "id não existe" e tentariam gravar; a segunda quebraria na
     * chave primária e viraria erro. O {@code ON CONFLICT (id) DO NOTHING} do PostgreSQL faz
     * "verificar e gravar" numa operação só: a segunda cópia simplesmente não grava nada.
     *
     * <p>O {@code CAST} na descrição é porque ela pode ser {@code null}, e sem o tipo explícito o
     * PostgreSQL não sabe de que tipo é um parâmetro nulo.
     */
    @Modifying
    @Query(value = """
            INSERT INTO transacao (id, categoria_id, valor, data, descricao, criado_em, atualizado_em)
            VALUES (:id, :categoriaId, :valor, :data, CAST(:descricao AS VARCHAR), :agora, :agora)
            ON CONFLICT (id) DO NOTHING
            """, nativeQuery = true)
    int inserirSeNaoExistir(@Param("id") UUID id,
                            @Param("categoriaId") UUID categoriaId,
                            @Param("valor") BigDecimal valor,
                            @Param("data") LocalDate data,
                            @Param("descricao") String descricao,
                            @Param("agora") Instant agora);
}

package io.github.igorpacheco1.easyfinance.categoria;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Acesso ao banco para categorias. O Spring Data gera o SQL a partir do nome de cada método.
 */
public interface CategoriaRepository extends JpaRepository<Categoria, UUID> {

    /** Todas as categorias, agrupadas por tipo e em ordem alfabética (DESPESA vem antes de RECEITA). */
    List<Categoria> findAllByOrderByTipoAscNomeAsc();

    List<Categoria> findByTipoOrderByNomeAsc(TipoCategoria tipo);

    /**
     * Todas as categorias, das mais usadas desde {@code desde} para as menos usadas (#97). No
     * empate, e para as que não foram usadas no período, ordem alfabética.
     *
     * <p>O {@code LEFT JOIN} mantém as categorias sem nenhum lançamento (elas contam zero); a
     * condição da data fica no {@code ON}, e não no {@code WHERE}, justamente para não tirá-las
     * da lista. A contagem é feita no banco, sem trazer os lançamentos para a memória.
     *
     * <p>Como a {@link #possuiTransacoes}, lê a tabela transacao direto em SQL, para o pacote
     * categoria não depender do pacote transacao.
     */
    @Query(value = """
            SELECT c.*
            FROM categoria c
            LEFT JOIN transacao t ON t.categoria_id = c.id AND t.data >= :desde
            GROUP BY c.id
            ORDER BY COUNT(t.id) DESC, c.nome
            """, nativeQuery = true)
    List<Categoria> findAllOrdenadasPorUsoDesde(@Param("desde") LocalDate desde);

    /** Usado ao criar: existe alguma categoria com esse nome, ignorando maiúsculas? */
    boolean existsByNomeIgnoreCase(String nome);

    /** Usado ao renomear: ignora a própria categoria, para permitir trocar "pets" por "Pets". */
    boolean existsByNomeIgnoreCaseAndIdNot(String nome, UUID id);

    /**
     * Consulta direta na tabela transacao, em SQL. Fica aqui (e não no TransacaoRepository)
     * para o pacote categoria não depender do pacote transacao: transacao já depende de
     * categoria, e a dependência nos dois sentidos deixaria os pacotes "amarrados" um no outro.
     */
    @Query(value = "SELECT EXISTS (SELECT 1 FROM transacao WHERE categoria_id = :id)", nativeQuery = true)
    boolean possuiTransacoes(@Param("id") UUID id);
}

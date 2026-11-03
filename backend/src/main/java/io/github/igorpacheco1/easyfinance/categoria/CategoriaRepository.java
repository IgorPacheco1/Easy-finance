package io.github.igorpacheco1.easyfinance.categoria;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

/**
 * Acesso ao banco para categorias. O Spring Data gera o SQL a partir do nome de cada método.
 */
public interface CategoriaRepository extends JpaRepository<Categoria, UUID> {

    /** Todas as categorias, agrupadas por tipo e em ordem alfabética (DESPESA vem antes de RECEITA). */
    List<Categoria> findAllByOrderByTipoAscNomeAsc();

    List<Categoria> findByTipoOrderByNomeAsc(TipoCategoria tipo);

    /** Usado ao criar: existe alguma categoria com esse nome, ignorando maiúsculas? */
    boolean existsByNomeIgnoreCase(String nome);

    /** Usado ao renomear: ignora a própria categoria, para permitir trocar "pets" por "Pets". */
    boolean existsByNomeIgnoreCaseAndIdNot(String nome, UUID id);

    /**
     * Consulta direta na tabela transacao, porque a entidade Transacao só chega na #18.
     * Quando ela existir, esta verificação pode passar para o repository de transações.
     */
    @Query(value = "SELECT EXISTS (SELECT 1 FROM transacao WHERE categoria_id = :id)", nativeQuery = true)
    boolean possuiTransacoes(@Param("id") UUID id);
}

package io.github.igorpacheco1.easyfinance.categoria;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Acesso ao banco para categorias. O Spring Data gera o SQL a partir do nome de cada método.
 */
public interface CategoriaRepository extends JpaRepository<Categoria, UUID> {

    /**
     * As categorias que o usuário enxerga: as do sistema (sem dono) e as dele, agrupadas por tipo e
     * em ordem alfabética (DESPESA vem antes de RECEITA). Categoria de outro usuário nunca entra.
     */
    @Query("""
            SELECT c FROM Categoria c
            WHERE c.usuarioId IS NULL OR c.usuarioId = :usuarioId
            ORDER BY c.tipo, c.nome
            """)
    List<Categoria> findVisiveis(@Param("usuarioId") UUID usuarioId);

    @Query("""
            SELECT c FROM Categoria c
            WHERE (c.usuarioId IS NULL OR c.usuarioId = :usuarioId) AND c.tipo = :tipo
            ORDER BY c.nome
            """)
    List<Categoria> findVisiveisPorTipo(@Param("usuarioId") UUID usuarioId, @Param("tipo") TipoCategoria tipo);

    /**
     * Uma categoria pelo id, só se o usuário a enxerga (do sistema ou dele). De outro usuário
     * volta vazio, igual a um id que não existe: quem pergunta não descobre que ela existe (#128).
     */
    @Query("""
            SELECT c FROM Categoria c
            WHERE c.id = :id AND (c.usuarioId IS NULL OR c.usuarioId = :usuarioId)
            """)
    Optional<Categoria> findVisivelPorId(@Param("id") UUID id, @Param("usuarioId") UUID usuarioId);

    /**
     * As categorias que o usuário enxerga, das mais usadas desde {@code desde} para as menos usadas
     * (#97). No empate, e para as que não foram usadas no período, ordem alfabética. Só as
     * transações do próprio usuário contam (#128).
     *
     * <p>O {@code LEFT JOIN} mantém as categorias sem nenhum lançamento (elas contam zero); as
     * condições do usuário e da data ficam no {@code ON}, e não no {@code WHERE}, justamente para
     * não tirá-las da lista. A contagem é feita no banco, sem trazer os lançamentos para a memória.
     *
     * <p>Como a {@link #possuiTransacoes}, lê a tabela transacao direto em SQL, para o pacote
     * categoria não depender do pacote transacao.
     */
    @Query(value = """
            SELECT c.*
            FROM categoria c
            LEFT JOIN transacao t ON t.categoria_id = c.id AND t.usuario_id = :usuarioId AND t.data >= :desde
            WHERE c.usuario_id IS NULL OR c.usuario_id = :usuarioId
            GROUP BY c.id
            ORDER BY COUNT(t.id) DESC, c.nome
            """, nativeQuery = true)
    List<Categoria> findAllOrdenadasPorUsoDesde(@Param("usuarioId") UUID usuarioId, @Param("desde") LocalDate desde);

    /**
     * Usado ao criar: o usuário já enxerga uma categoria com esse nome (do sistema ou dele),
     * ignorando maiúsculas? Evita a lista mostrar dois "Mercado".
     */
    @Query("""
            SELECT COUNT(c) > 0 FROM Categoria c
            WHERE LOWER(c.nome) = LOWER(:nome) AND (c.usuarioId IS NULL OR c.usuarioId = :usuarioId)
            """)
    boolean existeNomeVisivel(@Param("nome") String nome, @Param("usuarioId") UUID usuarioId);

    /** Usado ao renomear: ignora a própria categoria, para permitir trocar "pets" por "Pets". */
    @Query("""
            SELECT COUNT(c) > 0 FROM Categoria c
            WHERE LOWER(c.nome) = LOWER(:nome) AND c.id <> :id
              AND (c.usuarioId IS NULL OR c.usuarioId = :usuarioId)
            """)
    boolean existeNomeVisivelExceto(@Param("nome") String nome, @Param("id") UUID id, @Param("usuarioId") UUID usuarioId);

    /**
     * Consulta direta na tabela transacao, em SQL. Fica aqui (e não no TransacaoRepository)
     * para o pacote categoria não depender do pacote transacao: transacao já depende de
     * categoria, e a dependência nos dois sentidos deixaria os pacotes "amarrados" um no outro.
     */
    @Query(value = "SELECT EXISTS (SELECT 1 FROM transacao WHERE categoria_id = :id)", nativeQuery = true)
    boolean possuiTransacoes(@Param("id") UUID id);
}

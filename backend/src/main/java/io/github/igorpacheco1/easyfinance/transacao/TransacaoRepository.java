package io.github.igorpacheco1.easyfinance.transacao;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Acesso às transações no banco. {@code JpaSpecificationExecutor} acrescenta as consultas por
 * {@code Specification}, usadas na listagem com filtros (#93).
 */
public interface TransacaoRepository extends JpaRepository<Transacao, UUID>, JpaSpecificationExecutor<Transacao> {

    /**
     * Ordem da listagem: da mais recente para a mais antiga; no mesmo dia, a criada por último
     * primeiro; o {@code id} é o desempate final (#92, ADR-0017).
     *
     * <p>Por que o desempate: se duas transações tiverem a mesma data e o mesmo {@code criado_em}
     * (por exemplo, vários lançamentos da fila offline gravados juntos), o banco pode devolvê-las
     * em ordem diferente a cada consulta, e uma delas apareceria em duas páginas enquanto a outra
     * sumiria. O {@code id} nunca se repete, então a ordem fica sempre a mesma.
     */
    Sort ORDEM_DA_LISTAGEM = Sort.by(Sort.Order.desc("data"), Sort.Order.desc("criadoEm"), Sort.Order.desc("id"));

    /**
     * Uma transação pelo id, só se for do usuário (#129). De outra pessoa volta vazio, igual a um
     * id que não existe. Todo acesso por id passa por aqui: o {@code findById} herdado não filtra
     * o dono e não deve ser usado pela API.
     */
    Optional<Transacao> findByIdAndUsuarioId(UUID id, UUID usuarioId);

    /**
     * Uma página das transações do usuário que atendem ao filtro, na {@link #ORDEM_DA_LISTAGEM} (#93).
     *
     * <p>O {@code findBy} recebe a {@code Specification} (o {@code WHERE} montado a partir do
     * filtro, ver {@link EspecificacaoDeTransacoes}) e diz como devolver o resultado: aqui, como
     * {@code Slice}, que busca um item a mais que o pedido só para saber se há próxima página,
     * sem a consulta {@code COUNT(*)} que o {@code Page} faria (ADR-0017).
     *
     * <p>É um método {@code default}: tem corpo dentro da interface, e o Spring Data continua
     * gerando todo o resto. Assim a ordem e a montagem da consulta ficam juntas, aqui na
     * persistência, e o service só pede "esta página com este filtro".
     *
     * @param indiceDaPagina número da página na contagem do Spring, que começa em 0
     * @param tamanho        quantas transações por página
     */
    default Slice<Transacao> buscar(UUID usuarioId, FiltroDeTransacoes filtro, int indiceDaPagina, int tamanho) {
        Pageable pedido = PageRequest.of(indiceDaPagina, tamanho, ORDEM_DA_LISTAGEM);
        return findBy(EspecificacaoDeTransacoes.com(usuarioId, filtro), consulta -> consulta.slice(pedido));
    }

    /**
     * Soma as receitas e as despesas do usuário num período numa consulta só, direto no banco: assim não
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
            WHERE t.usuario_id = :usuarioId AND t.data BETWEEN :de AND :ate
            """, nativeQuery = true)
    TotaisDoPeriodo somarPorTipo(@Param("usuarioId") UUID usuarioId,
                                 @Param("de") LocalDate de, @Param("ate") LocalDate ate);

    /**
     * Soma as transações do usuário num período por categoria, numa consulta só (#95). Cada linha é uma
     * categoria com pelo menos um lançamento no período: o {@code JOIN} só junta categorias que
     * têm transação, e o {@code GROUP BY} faz uma linha por categoria. Já vem da que mais somou
     * para a que menos somou; no empate, pelo nome.
     */
    @Query(value = """
            SELECT c.id AS id, c.nome AS nome, c.tipo AS tipo, c.icone AS icone, c.cor AS cor,
                   SUM(t.valor) AS total, COUNT(*) AS quantidade
            FROM transacao t
            JOIN categoria c ON c.id = t.categoria_id
            WHERE t.usuario_id = :usuarioId AND t.data BETWEEN :de AND :ate
            GROUP BY c.id, c.nome, c.tipo, c.icone, c.cor
            ORDER BY total DESC, c.nome
            """, nativeQuery = true)
    List<TotalDaCategoria> somarPorCategoria(@Param("usuarioId") UUID usuarioId,
                                             @Param("de") LocalDate de, @Param("ate") LocalDate ate);

    /**
     * Guarda o id de uma transação excluída (#98). O {@code ON CONFLICT DO NOTHING} deixa a
     * operação segura se o mesmo id for registrado duas vezes.
     *
     * <p>SQL direto, e não uma entidade JPA: a tabela só tem o id, o dono e a data, e ninguém
     * precisa carregá-la como objeto, só gravar e perguntar se um id está lá. O dono
     * ({@code usuarioId}) é obrigatório desde a V4 (#123).
     */
    @Modifying
    @Query(value = """
            INSERT INTO transacao_excluida (id, usuario_id, excluido_em)
            VALUES (:id, :usuarioId, :agora)
            ON CONFLICT (id) DO NOTHING
            """, nativeQuery = true)
    int registrarExclusao(@Param("id") UUID id,
                          @Param("usuarioId") UUID usuarioId,
                          @Param("agora") Instant agora);

    /**
     * Este id é de uma transação que ESTE usuário excluiu? (#98, #129) Só as exclusões da própria
     * pessoa contam: o {@code 410} de outra pessoa não pode revelar que um id existiu.
     */
    @Query(value = "SELECT EXISTS (SELECT 1 FROM transacao_excluida WHERE id = :id AND usuario_id = :usuarioId)",
            nativeQuery = true)
    boolean foiExcluida(@Param("id") UUID id, @Param("usuarioId") UUID usuarioId);

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
            INSERT INTO transacao (id, usuario_id, categoria_id, valor, data, descricao, criado_em, atualizado_em)
            VALUES (:id, :usuarioId, :categoriaId, :valor, :data, CAST(:descricao AS VARCHAR), :agora, :agora)
            ON CONFLICT (id) DO NOTHING
            """, nativeQuery = true)
    int inserirSeNaoExistir(@Param("id") UUID id,
                            @Param("usuarioId") UUID usuarioId,
                            @Param("categoriaId") UUID categoriaId,
                            @Param("valor") BigDecimal valor,
                            @Param("data") LocalDate data,
                            @Param("descricao") String descricao,
                            @Param("agora") Instant agora);
}

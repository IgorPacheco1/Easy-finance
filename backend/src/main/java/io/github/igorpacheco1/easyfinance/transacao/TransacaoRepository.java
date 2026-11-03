package io.github.igorpacheco1.easyfinance.transacao;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface TransacaoRepository extends JpaRepository<Transacao, UUID> {

    /**
     * Todas as transações, da mais recente para a mais antiga. No mesmo dia, a criada por último
     * vem primeiro. O filtro por período chega na #22 e a paginação no M4.
     *
     * <p>{@code @EntityGraph} traz as categorias na mesma consulta (JOIN). Sem ele, com a
     * categoria LAZY, cada transação da lista faria mais uma consulta para buscar a sua
     * categoria: 100 transações = 101 consultas. Esse problema se chama "N+1".
     */
    @EntityGraph(attributePaths = "categoria")
    List<Transacao> findAllByOrderByDataDescCriadoEmDesc();
}

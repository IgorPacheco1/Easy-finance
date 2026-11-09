package io.github.igorpacheco1.easyfinance.transacao;

import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import org.springframework.data.jpa.domain.Specification;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * Monta a consulta da listagem a partir dos filtros (#93, ADR-0018).
 *
 * <p>Uma {@code Specification} do Spring Data é uma "condição" da consulta escrita em Java, com a
 * Criteria API do JPA. Aqui cada filtro preenchido vira uma condição, e todas entram juntas no
 * {@code WHERE} (com {@code AND}). Filtro vazio simplesmente não entra: a consulta fica só com o
 * que foi pedido, e não com um {@code (:x IS NULL OR ...)} para cada filtro possível.
 *
 * <p>Exemplo: com {@code tipo=DESPESA} e {@code descricao=uber}, o SQL fica mais ou menos
 * <pre>
 * SELECT ... FROM transacao t JOIN categoria c ON c.id = t.categoria_id
 * WHERE c.tipo = 'DESPESA' AND lower(t.descricao) LIKE '%uber%' ESCAPE '\'
 * </pre>
 */
final class EspecificacaoDeTransacoes {

    /** Caractere de escape do LIKE: antes de {@code %} ou {@code _}, faz eles valerem como texto. */
    private static final char ESCAPE = '\\';

    private EspecificacaoDeTransacoes() {
    }

    /** As transações que atendem a todos os filtros preenchidos. O service já validou o filtro. */
    static Specification<Transacao> com(FiltroDeTransacoes filtro) {
        return (root, query, cb) -> {
            // Traz a categoria na mesma consulta (JOIN FETCH), para não cair no "N+1": sem isso,
            // cada transação da página faria mais uma consulta para buscar a sua categoria. Só vale
            // na consulta que lê as transações; numa contagem (resultado Long) não faz sentido.
            if (query != null && query.getResultType() != Long.class) {
                root.fetch("categoria");
            }

            List<Predicate> condicoes = new ArrayList<>();
            if (filtro.de() != null && filtro.ate() != null) {
                condicoes.add(cb.between(root.<LocalDate>get("data"), filtro.de(), filtro.ate()));
            }
            if (filtro.categoriaId() != null) {
                condicoes.add(cb.equal(root.get("categoria").get("id"), filtro.categoriaId()));
            }
            if (filtro.tipo() != null) {
                condicoes.add(cb.equal(root.get("categoria").get("tipo"), filtro.tipo()));
            }
            if (filtro.descricao() != null) {
                condicoes.add(descricaoContem(root, cb, filtro.descricao()));
            }
            if (filtro.valorMinimo() != null) {
                condicoes.add(cb.greaterThanOrEqualTo(root.<BigDecimal>get("valor"), filtro.valorMinimo()));
            }
            if (filtro.valorMaximo() != null) {
                condicoes.add(cb.lessThanOrEqualTo(root.<BigDecimal>get("valor"), filtro.valorMaximo()));
            }
            // Nenhuma condição = "AND" de nada = verdadeiro: todas as transações.
            return cb.and(condicoes.toArray(Predicate[]::new));
        };
    }

    /**
     * {@code lower(descricao) LIKE '%texto%'}. Os dois lados vão para minúsculas, para "Uber",
     * "uber" e "UBER" serem iguais. Transação sem descrição ({@code NULL}) nunca passa no filtro.
     */
    private static Predicate descricaoContem(Root<Transacao> root, CriteriaBuilder cb, String texto) {
        String padrao = "%" + escaparLike(texto.toLowerCase(Locale.ROOT)) + "%";
        return cb.like(cb.lower(root.<String>get("descricao")), padrao, ESCAPE);
    }

    /**
     * No LIKE, {@code %} quer dizer "qualquer texto" e {@code _} "qualquer caractere". Se alguém
     * buscar "50%", o {@code %} precisa valer como o caractere mesmo, e não como curinga. Para
     * isso, cada um ganha o caractere de escape na frente (o próprio escape também).
     */
    static String escaparLike(String texto) {
        return texto
                .replace(String.valueOf(ESCAPE), "" + ESCAPE + ESCAPE)
                .replace("%", ESCAPE + "%")
                .replace("_", ESCAPE + "_");
    }
}
